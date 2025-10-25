/**
 * Enterprise Features Index
 * 
 * Conditional loading and feature flag management for enterprise features
 */

import { isFeatureEnabled } from '../config/features.js';

/**
 * Enterprise feature detection
 */
export const ENTERPRISE_FEATURES = {
  SOC2_COMPLIANCE: isFeatureEnabled('SOC2_COMPLIANCE'),
  MFA_AUTHENTICATION: isFeatureEnabled('MFA_AUTHENTICATION'),
  SCIM_PROVISIONING: isFeatureEnabled('SCIM_PROVISIONING'),
  COST_OPTIMIZATION: isFeatureEnabled('COST_OPTIMIZATION'),
  ADVANCED_MONITORING: isFeatureEnabled('ADVANCED_MONITORING'),
  ENCRYPTION_KMS: isFeatureEnabled('ENCRYPTION_KMS'),
};

/**
 * Conditionally load enterprise services
 */
export async function loadEnterpriseServices() {
  const services = {};
  
  // Load SOC2 compliance services
  if (ENTERPRISE_FEATURES.SOC2_COMPLIANCE) {
    try {
      const soc2Module = await import('./compliance/soc2/soc2Compliance.js');
      services.soc2Compliance = soc2Module.soc2Compliance;
    } catch (error) {
      console.warn('SOC2 compliance service not available:', error.message);
    }
  }
  
  // Load MFA services
  if (ENTERPRISE_FEATURES.MFA_AUTHENTICATION) {
    try {
      const mfaModule = await import('./security/mfa/mfaService.js');
      services.mfaService = mfaModule.mfaService;
    } catch (error) {
      console.warn('MFA service not available:', error.message);
    }
  }
  
  // Load SCIM services
  if (ENTERPRISE_FEATURES.SCIM_PROVISIONING) {
    try {
      const scimModule = await import('./security/scim/scimService.js');
      services.scimService = scimModule.scimService;
    } catch (error) {
      console.warn('SCIM service not available:', error.message);
    }
  }
  
  // Load cost optimization services
  if (ENTERPRISE_FEATURES.COST_OPTIMIZATION) {
    try {
      const costModule = await import('./optimization/cost/costOptimization.js');
      services.costOptimization = costModule.costOptimization;
    } catch (error) {
      console.warn('Cost optimization service not available:', error.message);
    }
  }
  
  // Load advanced monitoring
  if (ENTERPRISE_FEATURES.ADVANCED_MONITORING) {
    try {
      const monitoringModule = await import('./compliance/audit/advancedMonitoring.js');
      services.advancedMonitoring = monitoringModule.advancedMonitoring;
    } catch (error) {
      console.warn('Advanced monitoring service not available:', error.message);
    }
  }
  
  // Load encryption services
  if (ENTERPRISE_FEATURES.ENCRYPTION_KMS) {
    try {
      const encryptionModule = await import('./security/encryption/encryption.js');
      services.encryption = encryptionModule.encryption;
    } catch (error) {
      console.warn('Encryption service not available:', error.message);
    }
  }
  
  return services;
}

/**
 * Check if enterprise feature is available
 */
export function isEnterpriseFeatureAvailable(feature) {
  return ENTERPRISE_FEATURES[feature] === true;
}

/**
 * Get enterprise feature summary
 */
export function getEnterpriseFeatureSummary() {
  const enabled = Object.entries(ENTERPRISE_FEATURES)
    .filter(([_, enabled]) => enabled)
    .map(([name, _]) => name);
    
  const disabled = Object.entries(ENTERPRISE_FEATURES)
    .filter(([_, enabled]) => !enabled)
    .map(([name, _]) => name);
    
  return {
    enabled,
    disabled,
    totalFeatures: Object.keys(ENTERPRISE_FEATURES).length,
    enabledCount: enabled.length,
    disabledCount: disabled.length
  };
}

/**
 * Initialize enterprise middleware
 */
export function initializeEnterpriseMiddleware(app) {
  // Load enterprise middleware conditionally
  if (ENTERPRISE_FEATURES.COST_OPTIMIZATION) {
    try {
      const budgetGuard = require('./middleware/budgetGuard.js');
      app.use('/api', budgetGuard.budgetGuardMiddleware);
      console.log('✅ Enterprise budget guard middleware loaded');
    } catch (error) {
      console.warn('Budget guard middleware not available:', error.message);
    }
  }
  
  if (ENTERPRISE_FEATURES.ADVANCED_MONITORING) {
    try {
      const policyEngine = require('./middleware/policyEngine.js');
      app.use('/api', policyEngine.policyEngineMiddleware);
      console.log('✅ Enterprise policy engine middleware loaded');
    } catch (error) {
      console.warn('Policy engine middleware not available:', error.message);
    }
  }
}

export default {
  ENTERPRISE_FEATURES,
  loadEnterpriseServices,
  isEnterpriseFeatureAvailable,
  getEnterpriseFeatureSummary,
  initializeEnterpriseMiddleware
};
