/**
 * PM Templates Subpage for Workflow Management
 * Merges PM Templates and Solution Generation functionality
 * Integrates PMTemplatesTab and SolutionGenerationSettings into a unified interface
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '../../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Button } from '../../../components/ui/button';
import { ClipboardList, Settings } from '../../../components/ui/icons';
import { PMTemplatesTab } from '../../settings/PMTemplatesTab';
import { SolutionGenerationSettings } from '../../settings/SolutionGenerationSettings';
import { useAuth } from '../../../hooks/useAuth';
import { useOrganizationSettings } from '../../../hooks/useOrganizationSettings.js';
import { useNotifications } from '../../../components/ui/notifications';

export function PMTemplatesSubpage() {
  const { user } = useAuth();
  const { solutionConfig, loading, updateSettings } = useOrganizationSettings(user);
  const { showSuccess } = useNotifications();
  const [solutionConfigData, setSolutionConfigData] = useState({});
  const [activeTab, setActiveTab] = useState('templates');

  useEffect(() => {
    if (solutionConfig) {
      setSolutionConfigData(solutionConfig);
    }
  }, [solutionConfig]);

  const handleSolutionConfigChange = (newConfig) => {
    setSolutionConfigData(newConfig);
  };

  const handleSave = async () => {
    try {
      await updateSettings({}, solutionConfigData);
      showSuccess('Solution generation settings updated successfully!');
    } catch (error) {
      console.error('Failed to update solution config:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">PM & Solution Templates</h2>
          <p className="text-muted-foreground">
            Manage story/task templates and configure AI solution generation
          </p>
        </div>
        {activeTab === 'ai' && (
          <Button onClick={handleSave}>
            Save AI Configuration
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="templates">
            <ClipboardList className="w-4 h-4 mr-2" />
            PM Templates
          </TabsTrigger>
          <TabsTrigger value="ai">
            <Settings className="w-4 h-4 mr-2" />
            AI Solution Configuration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-6">
          <PMTemplatesTab />
        </TabsContent>

        <TabsContent value="ai" className="mt-6">
          <SolutionGenerationSettings
            config={solutionConfigData}
            onConfigChange={handleSolutionConfigChange}
            loading={loading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
