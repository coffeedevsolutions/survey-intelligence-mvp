/**
 * Multi-Factor Authentication (MFA) Service
 * 
 * Implements TOTP (Time-based One-Time Password) MFA for admin and reviewer roles
 * using speakeasy for TOTP generation and validation
 */

import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { pool } from '../config/database.js';
import { encryptForTenant } from '../services/encryption.js';

// MFA configuration
const MFA_CONFIG = {
  issuer: process.env.MFA_ISSUER || 'AI Survey Platform',
  algorithm: 'sha1',
  digits: 6,
  period: 30, // 30 seconds
  window: 1, // Allow 1 window of tolerance
  requiredRoles: ['admin', 'reviewer'],
  backupCodesCount: 10
};

/**
 * MFA Service Class
 */
export class MFAService {
  constructor(config = MFA_CONFIG) {
    this.config = config;
  }

  /**
   * Generate MFA secret for a user
   */
  generateSecret(userId, userEmail) {
    const secret = speakeasy.generateSecret({
      name: userEmail,
      issuer: this.config.issuer,
      length: 32
    });

    return {
      secret: secret.base32,
      qrCodeUrl: secret.otpauth_url,
      manualEntryKey: secret.base32
    };
  }

  /**
   * Generate QR code for MFA setup
   */
  async generateQRCode(secret) {
    try {
      const qrCodeDataURL = await QRCode.toDataURL(secret.qrCodeUrl);
      return qrCodeDataURL;
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Verify TOTP token
   */
  verifyToken(token, secret) {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: this.config.window
    });
  }

  /**
   * Generate backup codes
   */
  generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < this.config.backupCodesCount; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  /**
   * Hash backup code for storage
   */
  hashBackupCode(code) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  /**
   * Verify backup code
   */
  verifyBackupCode(code, hashedCodes) {
    const hashedCode = this.hashBackupCode(code);
    return hashedCodes.includes(hashedCode);
  }

  /**
   * Check if MFA is required for role
   */
  isMFARequired(role) {
    return this.config.requiredRoles.includes(role);
  }

  /**
   * Setup MFA for user
   */
  async setupMFA(userId, orgId, userEmail) {
    const client = await pool.connect();
    try {
      // Check if MFA is already set up
      const existing = await client.query(`
        SELECT mfa_enabled FROM users WHERE id = $1
      `, [userId]);

      if (existing.rows[0]?.mfa_enabled) {
        throw new Error('MFA is already enabled for this user');
      }

      // Generate secret and backup codes
      const secretData = this.generateSecret(userId, userEmail);
      const backupCodes = this.generateBackupCodes();
      const hashedBackupCodes = backupCodes.map(code => this.hashBackupCode(code));

      // Encrypt secret for storage
      const encryptedSecret = await encryptForTenant(orgId.toString(), secretData.secret);

      // Store MFA data
      await client.query(`
        INSERT INTO user_mfa (
          user_id, org_id, secret_encrypted, backup_codes_hashed, 
          qr_code_url, created_at
        ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      `, [
        userId,
        orgId,
        encryptedSecret,
        hashedBackupCodes,
        secretData.qrCodeUrl
      ]);

      return {
        secret: secretData.secret,
        qrCodeUrl: secretData.qrCodeUrl,
        backupCodes: backupCodes,
        manualEntryKey: secretData.manualEntryKey
      };

    } finally {
      client.release();
    }
  }

  /**
   * Verify MFA setup
   */
  async verifyMFASetup(userId, token) {
    const client = await pool.connect();
    try {
      // Get user's MFA data
      const mfaData = await client.query(`
        SELECT um.*, u.org_id 
        FROM user_mfa um
        JOIN users u ON u.id = um.user_id
        WHERE um.user_id = $1 AND um.verified = FALSE
      `, [userId]);

      if (mfaData.rows.length === 0) {
        throw new Error('No pending MFA setup found');
      }

      const mfa = mfaData.rows[0];

      // Decrypt secret
      const secret = await decryptForTenant(mfa.org_id.toString(), mfa.secret_encrypted);

      // Verify token
      const isValid = this.verifyToken(token, secret);

      if (!isValid) {
        throw new Error('Invalid MFA token');
      }

      // Mark as verified and enable MFA
      await client.query('BEGIN');

      await client.query(`
        UPDATE user_mfa 
        SET verified = TRUE, verified_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
      `, [userId]);

      await client.query(`
        UPDATE users 
        SET mfa_enabled = TRUE
        WHERE id = $1
      `, [userId]);

      await client.query('COMMIT');

      return { success: true };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Authenticate with MFA
   */
  async authenticateMFA(userId, token, isBackupCode = false) {
    const client = await pool.connect();
    try {
      // Get user's MFA data
      const mfaData = await client.query(`
        SELECT um.*, u.org_id, u.mfa_enabled
        FROM user_mfa um
        JOIN users u ON u.id = um.user_id
        WHERE um.user_id = $1 AND um.verified = TRUE
      `, [userId]);

      if (mfaData.rows.length === 0) {
        throw new Error('MFA not set up for this user');
      }

      const mfa = mfaData.rows[0];

      if (!mfa.mfa_enabled) {
        throw new Error('MFA is disabled for this user');
      }

      let isValid = false;

      if (isBackupCode) {
        // Verify backup code
        isValid = this.verifyBackupCode(token, mfa.backup_codes_hashed);
        
        if (isValid) {
          // Remove used backup code
          const hashedToken = this.hashBackupCode(token);
          const updatedCodes = mfa.backup_codes_hashed.filter(code => code !== hashedToken);
          
          await client.query(`
            UPDATE user_mfa 
            SET backup_codes_hashed = $1, last_backup_code_used = CURRENT_TIMESTAMP
            WHERE user_id = $2
          `, [updatedCodes, userId]);
        }
      } else {
        // Verify TOTP token
        const secret = await decryptForTenant(mfa.org_id.toString(), mfa.secret_encrypted);
        isValid = this.verifyToken(token, secret);
      }

      if (!isValid) {
        // Log failed attempt
        await client.query(`
          INSERT INTO mfa_attempts (user_id, success, attempt_type, created_at)
          VALUES ($1, FALSE, $2, CURRENT_TIMESTAMP)
        `, [userId, isBackupCode ? 'backup_code' : 'totp']);

        throw new Error('Invalid MFA token');
      }

      // Log successful attempt
      await client.query(`
        INSERT INTO mfa_attempts (user_id, success, attempt_type, created_at)
        VALUES ($1, TRUE, $2, CURRENT_TIMESTAMP)
      `, [userId, isBackupCode ? 'backup_code' : 'totp']);

      return { success: true };

    } finally {
      client.release();
    }
  }

  /**
   * Disable MFA for user
   */
  async disableMFA(userId, adminUserId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Disable MFA
      await client.query(`
        UPDATE users 
        SET mfa_enabled = FALSE
        WHERE id = $1
      `, [userId]);

      // Archive MFA data
      await client.query(`
        UPDATE user_mfa 
        SET disabled = TRUE, disabled_at = CURRENT_TIMESTAMP, disabled_by = $2
        WHERE user_id = $1
      `, [userId, adminUserId]);

      await client.query('COMMIT');

      return { success: true };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get MFA status for user
   */
  async getMFAStatus(userId) {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          u.mfa_enabled,
          um.verified,
          um.created_at as mfa_setup_date,
          um.verified_at,
          um.backup_codes_hashed,
          COUNT(ma.id) as total_attempts,
          COUNT(CASE WHEN ma.success = FALSE THEN 1 END) as failed_attempts
        FROM users u
        LEFT JOIN user_mfa um ON um.user_id = u.id
        LEFT JOIN mfa_attempts ma ON ma.user_id = u.id
        WHERE u.id = $1
        GROUP BY u.id, u.mfa_enabled, um.verified, um.created_at, um.verified_at, um.backup_codes_hashed
      `, [userId]);

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const data = result.rows[0];
      
      return {
        enabled: data.mfa_enabled,
        verified: data.verified,
        setupDate: data.mfa_setup_date,
        verifiedDate: data.verified_at,
        backupCodesRemaining: data.backup_codes_hashed?.length || 0,
        totalAttempts: parseInt(data.total_attempts) || 0,
        failedAttempts: parseInt(data.failed_attempts) || 0
      };

    } finally {
      client.release();
    }
  }

  /**
   * Get MFA statistics for organization
   */
  async getMFAStats(orgId) {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN u.mfa_enabled = TRUE THEN 1 END) as mfa_enabled_users,
          COUNT(CASE WHEN uor.role IN ('admin', 'reviewer') THEN 1 END) as required_role_users,
          COUNT(CASE WHEN uor.role IN ('admin', 'reviewer') AND u.mfa_enabled = TRUE THEN 1 END) as required_role_mfa_enabled
        FROM users u
        JOIN user_org_roles uor ON uor.user_id = u.id
        WHERE uor.org_id = $1
      `, [orgId]);

      const stats = result.rows[0];
      
      return {
        totalUsers: parseInt(stats.total_users),
        mfaEnabledUsers: parseInt(stats.mfa_enabled_users),
        requiredRoleUsers: parseInt(stats.required_role_users),
        requiredRoleMFAEnabled: parseInt(stats.required_role_mfa_enabled),
        mfaComplianceRate: stats.required_role_users > 0 
          ? (stats.required_role_mfa_enabled / stats.required_role_users) * 100 
          : 100
      };

    } finally {
      client.release();
    }
  }
}

// Export default MFA service
export default MFAService;
