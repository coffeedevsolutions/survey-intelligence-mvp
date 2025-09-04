import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../utils/api.js';

/**
 * Custom hook for managing organization settings
 */
export function useOrganizationSettings(user) {
  const [settings, setSettings] = useState(null);
  const [solutionConfig, setSolutionConfig] = useState(null);
  const [themes, setThemes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch organization settings (both branding and solution generation)
  const fetchSettings = useCallback(async () => {
    if (!user?.orgId) {
      console.warn('Cannot fetch organization settings: user or orgId is null');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch branding settings and solution generation config in parallel
      const [brandingResponse, solutionResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/orgs/${user.orgId}/settings/branding`, {
          credentials: 'include'
        }),
        fetch(`${API_BASE_URL}/api/orgs/${user.orgId}/settings/solution-generation`, {
          credentials: 'include'
        })
      ]);

      if (!brandingResponse.ok) {
        throw new Error('Failed to fetch organization settings');
      }

      const brandingData = await brandingResponse.json();
      setSettings(brandingData.settings);

      // Solution config is optional, don't fail if it doesn't exist
      if (solutionResponse.ok) {
        const solutionData = await solutionResponse.json();
        setSolutionConfig(solutionData.config);
      } else {
        setSolutionConfig(getDefaultSolutionConfig());
      }
    } catch (err) {
      console.error('Error fetching organization settings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.orgId]);

  // Default solution generation configuration
  const getDefaultSolutionConfig = () => ({
    epics: {
      maxCount: 5,
      minCount: 1,
      enforceLimit: false,
      includeTechnicalEpics: true,
      includeInfrastructureEpics: true
    },
    requirements: {
      categories: {
        functional: true,
        technical: true,
        performance: true,
        security: true,
        compliance: false
      }
    },
    aiInstructions: {
      customPromptAdditions: "",
      focusAreas: [],
      constraintsAndGuidelines: [],
      organizationContext: ""
    },
    templates: {
      userStoryTemplate: "As a [user] I want [goal] so that [benefit]",
      technicalStoryTemplate: "Technical: [technical requirement or infrastructure need]",
      taskTemplate: "[action verb] [specific task description]",
      requirementTemplate: "[system/feature] must/should [requirement description]"
    }
  });

  // Fetch available themes
  const fetchThemes = useCallback(async () => {
    if (!user?.orgId) {
      console.warn('Cannot fetch themes: user or orgId is null');
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/orgs/${user.orgId}/themes`,
        {
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch themes');
      }

      const data = await response.json();
      setThemes(data.themes);
    } catch (err) {
      console.error('Error fetching themes:', err);
    }
  }, [user?.orgId]);

  // Update organization settings (branding and solution generation)
  const updateSettings = async (newSettings, newSolutionConfig = null) => {
    if (!user?.orgId) {
      throw new Error('Cannot update organization settings: user or orgId is null');
    }

    try {
      const promises = [];
      
      // Update branding settings
      promises.push(
        fetch(`${API_BASE_URL}/api/orgs/${user.orgId}/settings/branding`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ settings: newSettings })
        })
      );

      // Update solution generation config if provided
      if (newSolutionConfig) {
        promises.push(
          fetch(`${API_BASE_URL}/api/orgs/${user.orgId}/settings/solution-generation`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ config: newSolutionConfig })
          })
        );
      }

      const responses = await Promise.all(promises);
      
      // Check if branding update was successful
      if (!responses[0].ok) {
        const errorData = await responses[0].json();
        throw new Error(errorData.error || 'Failed to update settings');
      }

      // Check if solution config update was successful (if attempted)
      if (newSolutionConfig && !responses[1].ok) {
        const errorData = await responses[1].json();
        throw new Error(errorData.error || 'Failed to update solution generation settings');
      }

      // Update local state
      const brandingData = await responses[0].json();
      setSettings(brandingData.settings);

      if (newSolutionConfig && responses[1]) {
        const solutionData = await responses[1].json();
        setSolutionConfig(solutionData.config);
      }

      return { settings: brandingData.settings, solutionConfig: newSolutionConfig };
    } catch (err) {
      console.error('Error updating organization settings:', err);
      throw err;
    }
  };

  // Preview brief with current settings
  const previewBrief = async (previewSettings = settings) => {
    try {
      // For preview, we'll use a sample brief
      const sampleBrief = `# Sample Project Brief

**Problem Statement**  
Improve user onboarding experience for new customers

**Who is affected**  
New customers and support team (approximately 500 new signups per month)

**Impact**  
Currently 40% of new users drop off during onboarding, leading to revenue loss

**Data sources/systems**  
- Analytics dashboard
- Customer support tickets
- User feedback surveys

**Current workaround**  
Manual email follow-ups from support team

**Deadline/dependencies**  
Target completion by end of Q2 to align with marketing campaign

**Acceptance criteria**  
- Reduce drop-off rate to under 20%
- Implement automated email sequences
- Create interactive tutorial system`;

      // Generate preview URL with settings
      const params = new URLSearchParams({
        settings: JSON.stringify(previewSettings),
        content: sampleBrief
      });

      if (!user?.orgId) {
        throw new Error('Cannot generate preview: user or orgId is null');
      }

      const previewUrl = `${API_BASE_URL}/api/orgs/${user.orgId}/briefs/preview?${params}`;
      
      // Open preview in new window
      const newWindow = window.open('', '_blank', 'width=800,height=600');
      newWindow.location.href = previewUrl;
      
    } catch (err) {
      console.error('Error generating preview:', err);
      throw err;
    }
  };

  // Initialize data on mount
  useEffect(() => {
    if (user?.orgId) {
      fetchSettings();
      fetchThemes();
    }
  }, [user?.orgId, fetchSettings, fetchThemes]);

  return {
    settings,
    solutionConfig,
    themes,
    loading,
    error,
    updateSettings,
    previewBrief,
    refetch: fetchSettings
  };
}
