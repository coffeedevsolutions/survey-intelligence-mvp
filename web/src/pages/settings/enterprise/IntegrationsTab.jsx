import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { JiraIntegrationSettings } from '../JiraIntegrationSettings.jsx';

/**
 * Integrations Tab Component for Enterprise Configuration
 * Shows integration options and current integration settings
 */
export function IntegrationsTab() {
  // Future: This could show a menu of available integrations
  const availableIntegrations = [
    { id: 'jira', name: 'Jira', description: 'Export solutions as epics and stories', enabled: true }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Available Integrations</CardTitle>
          <CardDescription>
            Connect your organization's integrations to extend functionality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {availableIntegrations.map((integration) => (
              <div
                key={integration.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{integration.name}</h4>
                    <Badge variant={integration.enabled ? 'default' : 'secondary'}>
                      {integration.enabled ? 'Available' : 'Coming Soon'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{integration.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Jira Integration Settings */}
      <JiraIntegrationSettings />
    </div>
  );
}

