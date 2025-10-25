/**
 * Feature Flags Configuration
 * 
 * Manages feature flags for different tiers and environments
 */

import { getConfig } from './index.js';

/**
 * Feature flag definitions
 */
export const FEATURES = {
  // Core features (always enabled)
  CORE_SURVEYS: true,
  CORE_BRIEFS: true,
  CORE_CAMPAIGNS: true,
  CORE_ANALYTICS: true,
  
  // Platform features (enabled by default)
  AI_INTEGRATION: !!getConfig('OPENAI_API_KEY'),
  EMAIL_NOTIFICATIONS: !!getConfig('SENDGRID_API_KEY'),
  DOCUMENT_EXPORT: true,
  TEMPLATE_SYSTEM: true,
  
  // Enterprise features (configurable)
  SOC2_COMPLIANCE: getConfig('SOC2_ENABLED') === true,
  MFA_AUTHENTICATION: getConfig('MFA_ENABLED') === true,
  SCIM_PROVISIONING: getConfig('SCIM_ENABLED') === true,
  COST_OPTIMIZATION: getConfig('COST_OPT_ENABLED') === true,
  ADVANCED_MONITORING: getConfig('OTEL_ENABLE_METRICS') === true,
  ENCRYPTION_KMS: getConfig('ENCRYPTION_MODE') === 'kms',
  
  // Integration features
  JIRA_INTEGRATION: true,
  AUTH0_INTEGRATION: getConfig('AUTH_PROVIDER') === 'auth0',
  
  // Development features
  DEBUG_MODE: getConfig('NODE_ENV') === 'development',
  HOT_RELOAD: getConfig('NODE_ENV') === 'development',
};

/**
 * Tier definitions
 */
export const TIERS = {
  STARTER: {
    name: 'Starter',
    features: [
      'CORE_SURVEYS',
      'CORE_BRIEFS', 
      'CORE_CAMPAIGNS',
      'CORE_ANALYTICS',
      'AI_INTEGRATION',
      'EMAIL_NOTIFICATIONS',
      'DOCUMENT_EXPORT',
      'TEMPLATE_SYSTEM',
      'JIRA_INTEGRATION'
    ],
    limits: {
      maxSurveys: 10,
      maxUsers: 5,
      maxCampaigns: 3
    }
  },
  
  PROFESSIONAL: {
    name: 'Professional',
    features: [
      'CORE_SURVEYS',
      'CORE_BRIEFS',
      'CORE_CAMPAIGNS', 
      'CORE_ANALYTICS',
      'AI_INTEGRATION',
      'EMAIL_NOTIFICATIONS',
      'DOCUMENT_EXPORT',
      'TEMPLATE_SYSTEM',
      'JIRA_INTEGRATION',
      'AUTH0_INTEGRATION',
      'ADVANCED_MONITORING'
    ],
    limits: {
      maxSurveys: 100,
      maxUsers: 25,
      maxCampaigns: 20
    }
  },
  
  ENTERPRISE: {
    name: 'Enterprise',
    features: [
      'CORE_SURVEYS',
      'CORE_BRIEFS',
      'CORE_CAMPAIGNS',
      'CORE_ANALYTICS', 
      'AI_INTEGRATION',
      'EMAIL_NOTIFICATIONS',
      'DOCUMENT_EXPORT',
      'TEMPLATE_SYSTEM',
      'JIRA_INTEGRATION',
      'AUTH0_INTEGRATION',
      'ADVANCED_MONITORING',
      'SOC2_COMPLIANCE',
      'MFA_AUTHENTICATION',
      'SCIM_PROVISIONING',
      'COST_OPTIMIZATION',
      'ENCRYPTION_KMS'
    ],
    limits: {
      maxSurveys: -1, // unlimited
      maxUsers: -1,   // unlimited
      maxCampaigns: -1 // unlimited
    }
  }
};

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(featureName) {
  return FEATURES[featureName] === true;
}

/**
 * Check if multiple features are enabled
 */
export function areFeaturesEnabled(featureNames) {
  return featureNames.every(name => isFeatureEnabled(name));
}

/**
 * Get enabled features for current configuration
 */
export function getEnabledFeatures() {
  return Object.entries(FEATURES)
    .filter(([_, enabled]) => enabled)
    .map(([name, _]) => name);
}

/**
 * Get disabled features for current configuration
 */
export function getDisabledFeatures() {
  return Object.entries(FEATURES)
    .filter(([_, enabled]) => !enabled)
    .map(([name, _]) => name);
}

/**
 * Determine current tier based on enabled features
 */
export function getCurrentTier() {
  const enabledFeatures = getEnabledFeatures();
  
  for (const [tierName, tier] of Object.entries(TIERS)) {
    if (tier.features.every(feature => enabledFeatures.includes(feature))) {
      return tierName;
    }
  }
  
  return 'STARTER'; // Default fallback
}

/**
 * Check if current tier supports a feature
 */
export function tierSupportsFeature(tierName, featureName) {
  const tier = TIERS[tierName];
  return tier && tier.features.includes(featureName);
}

/**
 * Get tier limits
 */
export function getTierLimits(tierName) {
  const tier = TIERS[tierName];
  return tier ? tier.limits : TIERS.STARTER.limits;
}

/**
 * Validate feature access for organization
 */
export function validateFeatureAccess(orgTier, featureName) {
  if (!tierSupportsFeature(orgTier, featureName)) {
    throw new Error(`Feature ${featureName} not available in ${orgTier} tier`);
  }
  
  return true;
}

/**
 * Get feature configuration summary
 */
export function getFeatureSummary() {
  const enabledFeatures = getEnabledFeatures();
  const disabledFeatures = getDisabledFeatures();
  const currentTier = getCurrentTier();
  
  return {
    currentTier,
    enabledFeatures,
    disabledFeatures,
    totalFeatures: Object.keys(FEATURES).length,
    enabledCount: enabledFeatures.length,
    disabledCount: disabledFeatures.length
  };
}

export default FEATURES;
