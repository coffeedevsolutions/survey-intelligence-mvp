import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

dotenv.config();

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export class EmailService {
  constructor() {
    this.enabled = !!process.env.SENDGRID_API_KEY;
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@yourapp.com';
    this.appName = process.env.APP_NAME || 'AI Survey App';
    this.webOrigin = process.env.WEB_ORIGIN || 'http://localhost:5173';
  }

  /**
   * Send invitation email to new user
   */
  async sendInvitationEmail({ email, token, role, orgName, inviterName }) {
    if (!this.enabled) {
      console.log('Email service not configured - would send invitation to:', email);
      return { success: false, reason: 'Email service not configured' };
    }

    const inviteUrl = `${this.webOrigin}/accept-invite?token=${encodeURIComponent(token)}`;
    
    const msg = {
      to: email,
      from: {
        email: this.fromEmail,
        name: this.appName
      },
      subject: `Invitation to join ${orgName} on ${this.appName}`,
      html: this.generateInvitationHTML({
        email,
        role,
        orgName,
        inviterName,
        inviteUrl,
        expiresInDays: 7
      }),
      text: this.generateInvitationText({
        email,
        role,
        orgName,
        inviterName,
        inviteUrl,
        expiresInDays: 7
      })
    };

    try {
      await sgMail.send(msg);
      console.log(`Invitation email sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error('Error sending invitation email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail({ email, token, orgName }) {
    if (!this.enabled) {
      console.log('Email service not configured - would send password reset to:', email);
      return { success: false, reason: 'Email service not configured' };
    }

    const resetUrl = `${this.webOrigin}/reset-password?token=${encodeURIComponent(token)}`;
    
    const msg = {
      to: email,
      from: {
        email: this.fromEmail,
        name: this.appName
      },
      subject: `Password Reset for ${this.appName}`,
      html: this.generatePasswordResetHTML({ email, resetUrl, orgName }),
      text: this.generatePasswordResetText({ email, resetUrl, orgName })
    };

    try {
      await sgMail.send(msg);
      console.log(`Password reset email sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate HTML template for invitation email
   */
  generateInvitationHTML({ email, role, orgName, inviterName, inviteUrl, expiresInDays }) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invitation to ${orgName}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .content { padding: 20px 0; }
        .button { 
            display: inline-block; 
            background: #007bff; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 20px 0;
        }
        .footer { border-top: 1px solid #eee; padding-top: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${this.appName}</h1>
            <h2>You're invited to join ${orgName}</h2>
        </div>
        
        <div class="content">
            <p>Hello,</p>
            
            <p>${inviterName} has invited you to join <strong>${orgName}</strong> on ${this.appName} with the role of <strong>${role}</strong>.</p>
            
            <p>Click the button below to accept your invitation and create your account:</p>
            
            <div style="text-align: center;">
                <a href="${inviteUrl}" class="button">Accept Invitation</a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 4px;">
                ${inviteUrl}
            </p>
            
            <p><strong>Important:</strong> This invitation will expire in ${expiresInDays} days.</p>
            
            <p>If you have any questions, please contact your organization administrator.</p>
        </div>
        
        <div class="footer">
            <p>This email was sent to ${email}. If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate plain text template for invitation email
   */
  generateInvitationText({ email, role, orgName, inviterName, inviteUrl, expiresInDays }) {
    return `
${this.appName} - Invitation to join ${orgName}

Hello,

${inviterName} has invited you to join ${orgName} on ${this.appName} with the role of ${role}.

To accept your invitation and create your account, visit:
${inviteUrl}

Important: This invitation will expire in ${expiresInDays} days.

If you have any questions, please contact your organization administrator.

---
This email was sent to ${email}. If you didn't expect this invitation, you can safely ignore this email.
`;
  }

  /**
   * Generate HTML template for password reset email
   */
  generatePasswordResetHTML({ email, resetUrl, orgName }) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .content { padding: 20px 0; }
        .button { 
            display: inline-block; 
            background: #dc3545; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 20px 0;
        }
        .footer { border-top: 1px solid #eee; padding-top: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${this.appName}</h1>
            <h2>Password Reset Request</h2>
        </div>
        
        <div class="content">
            <p>Hello,</p>
            
            <p>We received a request to reset your password for your ${this.appName} account.</p>
            
            <p>Click the button below to reset your password:</p>
            
            <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 4px;">
                ${resetUrl}
            </p>
            
            <p><strong>Important:</strong> This link will expire in 1 hour for security reasons.</p>
            
            <p>If you didn't request a password reset, you can safely ignore this email.</p>
        </div>
        
        <div class="footer">
            <p>This email was sent to ${email}.</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate plain text template for password reset email
   */
  generatePasswordResetText({ email, resetUrl, orgName }) {
    return `
${this.appName} - Password Reset Request

Hello,

We received a request to reset your password for your ${this.appName} account.

To reset your password, visit:
${resetUrl}

Important: This link will expire in 1 hour for security reasons.

If you didn't request a password reset, you can safely ignore this email.

---
This email was sent to ${email}.
`;
  }
}

// Export singleton instance
export const emailService = new EmailService();
