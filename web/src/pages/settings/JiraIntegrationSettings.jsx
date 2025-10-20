import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Badge } from '../../components/ui/badge';
import { LoadingSpinner } from '../../components/ui/loading-spinner';
import { useNotifications } from '../../components/ui/notifications';
import { 
  ExternalLink, 
  CheckCircle, 
  AlertCircle, 
  Settings, 
  TestTube2,
  Trash2
} from '../../components/ui/icons';
import { API_BASE_URL } from '../../utils/api';

/**
 * Jira Integration Settings Component
 * Allows admins to configure Jira connection for the organization
 */
export function JiraIntegrationSettings() {
  const [connection, setConnection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [formData, setFormData] = useState({
    baseUrl: '',
    authType: 'basic',
    email: '',
    apiToken: ''
  });
  const [showApiToken, setShowApiToken] = useState(false);
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const { showSuccess, showError } = useNotifications();

  // Fetch connection status
  const fetchConnection = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/jira/connection`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.connected) {
          setConnection(data.connection);
          setFormData({
            baseUrl: data.connection.baseUrl,
            authType: data.connection.authType,
            email: data.connection.email || '',
            apiToken: '' // Don't show stored tokens
          });
          
          // If connection is active, automatically load projects
          if (data.connection.isActive) {
            loadProjects();
          }
        }
      }
    } catch (error) {
      console.error('Error fetching Jira connection:', error);
      showError('Failed to load Jira connection status');
    } finally {
      setLoading(false);
    }
  };

  // Test connection
  const testConnection = async () => {
    try {
      setTesting(true);
      const response = await fetch(`${API_BASE_URL}/api/jira/test-connection`, {
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (result.success) {
        showSuccess(`Connection successful! Connected as ${result.user.displayName}`);
        loadProjects(); // Load projects after successful test
      } else {
        showError(`Connection failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Error testing Jira connection:', error);
      showError('Failed to test connection');
    } finally {
      setTesting(false);
    }
  };

  // Load available projects
  const loadProjects = async () => {
    try {
      setLoadingProjects(true);
      const response = await fetch(`${API_BASE_URL}/api/jira/projects`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const projectsData = await response.json();
        setProjects(projectsData);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoadingProjects(false);
    }
  };

  // Save connection
  const saveConnection = async () => {
    try {
      setSaving(true);
      
      if (!formData.baseUrl || !formData.email || !formData.apiToken) {
        showError('Please fill in all required fields');
        return;
      }

      // Ensure base URL format
      let baseUrl = formData.baseUrl.trim();
      if (!baseUrl.startsWith('http')) {
        baseUrl = `https://${baseUrl}`;
      }
      if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
      }

      const response = await fetch(`${API_BASE_URL}/api/jira/connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          baseUrl,
          authType: formData.authType,
          email: formData.email,
          apiToken: formData.apiToken
        })
      });

      const result = await response.json();

      if (response.ok) {
        showSuccess(result.message);
        await fetchConnection(); // Refresh connection status
        if (result.success) {
          loadProjects(); // Load projects if connection test was successful
        }
      } else {
        showError(result.error || 'Failed to save connection');
      }
    } catch (error) {
      console.error('Error saving Jira connection:', error);
      showError('Failed to save connection');
    } finally {
      setSaving(false);
    }
  };

  // Delete connection
  const deleteConnection = async () => {
    if (!confirm('Are you sure you want to delete the Jira connection? This will disable all Jira exports.')) {
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/api/jira/connection`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        showSuccess('Jira connection deleted successfully');
        setConnection(null);
        setProjects([]);
        setFormData({
          baseUrl: '',
          authType: 'basic',
          email: '',
          apiToken: ''
        });
      } else {
        const result = await response.json();
        showError(result.error || 'Failed to delete connection');
      }
    } catch (error) {
      console.error('Error deleting Jira connection:', error);
      showError('Failed to delete connection');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchConnection();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // fetchConnection is stable, dependency intentionally omitted

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <LoadingSpinner />
          <p className="mt-4 text-sm text-gray-600">Loading Jira integration settings...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ExternalLink className="w-5 h-5 mr-2" />
            Jira Integration
          </CardTitle>
          <p className="text-sm text-gray-600">
            Connect your Jira workspace to export solutions as epics and stories.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connection Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              {connection?.isActive ? (
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              ) : (
                <AlertCircle className="w-5 h-5 text-gray-400 mr-2" />
              )}
              <div>
                <p className="font-medium">
                  {connection?.isActive ? 'Connected' : 'Not Connected'}
                </p>
                {connection?.baseUrl && (
                  <p className="text-sm text-gray-600">{connection.baseUrl}</p>
                )}
              </div>
            </div>
            {connection?.isActive && (
              <Button
                variant="outline"
                size="sm"
                onClick={testConnection}
                disabled={testing}
              >
                {testing ? <LoadingSpinner className="w-4 h-4" /> : <TestTube2 className="w-4 h-4" />}
                Test Connection
              </Button>
            )}
          </div>

          {/* Configuration Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="baseUrl">Jira Instance URL *</Label>
              <Input
                id="baseUrl"
                type="url"
                placeholder="https://your-domain.atlassian.net"
                value={formData.baseUrl}
                onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Your Jira Cloud instance URL
              </p>
            </div>

            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="your-email@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">
                The email address associated with your Jira account
              </p>
            </div>

            <div>
              <Label htmlFor="apiToken">API Token *</Label>
              <div className="flex space-x-2">
                <Input
                  id="apiToken"
                  type={showApiToken ? "text" : "password"}
                  placeholder="Your Jira API token"
                  value={formData.apiToken}
                  onChange={(e) => setFormData({ ...formData, apiToken: e.target.value })}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowApiToken(!showApiToken)}
                >
                  {showApiToken ? 'Hide' : 'Show'}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Create an API token in your{' '}
                <a 
                  href="https://id.atlassian.com/manage-profile/security/api-tokens" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Atlassian Account Settings
                </a>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              onClick={saveConnection}
              disabled={saving}
              className="flex-1"
            >
              {saving ? <LoadingSpinner className="w-4 h-4 mr-2" /> : <Settings className="w-4 h-4 mr-2" />}
              {connection ? 'Update Connection' : 'Connect to Jira'}
            </Button>
            
            {connection && (
              <Button
                variant="outline"
                onClick={deleteConnection}
                disabled={saving}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Projects List */}
      {connection?.isActive && (
        <Card>
          <CardHeader>
            <CardTitle>Available Projects</CardTitle>
            <p className="text-sm text-gray-600">
              Projects you can export solutions to
            </p>
          </CardHeader>
          <CardContent>
            {loadingProjects ? (
              <div className="text-center py-8">
                <LoadingSpinner />
                <p className="mt-2 text-sm text-gray-600">Loading projects...</p>
              </div>
            ) : projects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{project.name}</p>
                        <p className="text-sm text-gray-600">{project.key}</p>
                      </div>
                      <Badge variant="outline">
                        {project.projectTypeKey}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">
                No projects found. Make sure you have access to at least one Jira project.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
