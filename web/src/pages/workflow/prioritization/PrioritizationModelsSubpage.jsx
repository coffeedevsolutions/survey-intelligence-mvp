/**
 * Prioritization Models Subpage for Workflow Management
 * Wraps PrioritizationSettings component
 */

import React, { useState, useEffect } from 'react';
import { PrioritizationSettings } from '../../settings/PrioritizationSettings';
import { useOrganizationSettings } from '../../../hooks/useOrganizationSettings.js';
import { useNotifications } from '../../../components/ui/notifications.jsx';

export function PrioritizationModelsSubpage({ user }) {
  const { settings, loading, updateSettings } = useOrganizationSettings(user);
  const { showSuccess } = useNotifications();
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      await updateSettings(formData, null);
      showSuccess('Prioritization settings updated successfully!');
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  return (
    <div className="space-y-6">
      <PrioritizationSettings 
        formData={formData}
        onInputChange={handleInputChange}
        user={user}
      />
    </div>
  );
}

