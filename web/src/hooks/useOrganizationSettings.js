import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../utils/api.js';

/**
 * Custom hook for managing organization settings
 */
export function useOrganizationSettings(user) {
  const [settings, setSettings] = useState(null);
  const [themes, setThemes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch organization settings
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/api/orgs/${user.orgId}/settings/branding`,
        {
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch organization settings');
      }

      const data = await response.json();
      setSettings(data.settings);
    } catch (err) {
      console.error('Error fetching organization settings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch available themes
  const fetchThemes = async () => {
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
  };

  // Update organization settings
  const updateSettings = async (newSettings) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/orgs/${user.orgId}/settings/branding`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ settings: newSettings })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update settings');
      }

      const data = await response.json();
      setSettings(data.settings);
      return data;
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
  }, [user?.orgId]);

  return {
    settings,
    themes,
    loading,
    error,
    updateSettings,
    previewBrief,
    refetch: fetchSettings
  };
}
