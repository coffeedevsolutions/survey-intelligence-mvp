import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { useNotifications } from '../../ui/notifications';
import { API_BASE_URL } from '../../../utils/api';

/**
 * Prioritization Framework Settings Section
 */
export function PrioritizationSettings({ formData, onInputChange, user }) {
  const [frameworks, setFrameworks] = React.useState({});
  const [loading, setLoading] = React.useState(true);
  const [currentFramework, setCurrentFramework] = React.useState(null);
  const { showError } = useNotifications();

  React.useEffect(() => {
    const fetchFrameworks = async () => {
      if (!user?.orgId) return;
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/orgs/${user.orgId}/prioritization-frameworks`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setFrameworks(data.frameworks || {});
        } else {
          showError('Failed to load prioritization frameworks');
        }
      } catch (error) {
        console.error('Error fetching frameworks:', error);
        showError('Failed to load prioritization frameworks');
      } finally {
        setLoading(false);
      }
    };

    fetchFrameworks();
  }, [user?.orgId, showError]);

  React.useEffect(() => {
    if (frameworks && formData.prioritization_framework) {
      setCurrentFramework(frameworks[formData.prioritization_framework]);
    }
  }, [frameworks, formData.prioritization_framework]);

  const handleFrameworkChange = (frameworkId) => {
    onInputChange('prioritization_framework', frameworkId);
    onInputChange('prioritization_framework_config', {});
  };

  const handleEnabledFrameworksChange = (frameworkId, enabled) => {
    const currentEnabled = formData.enabled_prioritization_frameworks || ['simple', 'ice', 'moscow'];
    let newEnabled;
    
    if (enabled) {
      if (!currentEnabled.includes(frameworkId)) {
        newEnabled = [...currentEnabled, frameworkId];
      } else {
        newEnabled = currentEnabled;
      }
    } else {
      newEnabled = currentEnabled.filter(id => id !== frameworkId);
      // Ensure at least one framework is enabled
      if (newEnabled.length === 0) {
        newEnabled = ['simple'];
      }
      // If we're disabling the default framework, switch to the first enabled one
      if (frameworkId === formData.prioritization_framework && newEnabled.length > 0) {
        onInputChange('prioritization_framework', newEnabled[0]);
      }
    }
    
    onInputChange('enabled_prioritization_frameworks', newEnabled);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3">Loading prioritization frameworks...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Available Prioritization Frameworks</CardTitle>
          <CardDescription>
            Enable the frameworks your team wants to use. Reviewers can choose from enabled frameworks when setting priorities.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            {Object.values(frameworks).map((framework) => {
              const isEnabled = (formData.enabled_prioritization_frameworks || ['simple', 'ice', 'moscow']).includes(framework.id);
              const isDefault = formData.prioritization_framework === framework.id;
              
              return (
                <div
                  key={framework.id}
                  className={`border rounded-lg p-4 transition-all ${
                    isEnabled 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className={`font-medium ${isEnabled ? 'text-gray-900' : 'text-gray-500'}`}>
                          {framework.name}
                        </h4>
                        {isDefault && isEnabled && (
                          <Badge variant="default">Default</Badge>
                        )}
                        {framework.isDefault && (
                          <Badge variant="outline">Recommended</Badge>
                        )}
                      </div>
                      <p className={`text-sm mb-2 ${isEnabled ? 'text-muted-foreground' : 'text-gray-400'}`}>
                        {framework.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="capitalize">Type: {framework.type}</span>
                        {framework.type === 'composite' && (
                          <span>Multiple scoring factors</span>
                        )}
                        {framework.type === 'categorical' && (
                          <span>Predefined categories</span>
                        )}
                        {framework.type === 'numeric' && (
                          <span>Numeric scale</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {isEnabled && (
                        <Button
                          size="sm"
                          variant={isDefault ? "default" : "outline"}
                          onClick={() => handleFrameworkChange(framework.id)}
                          disabled={!isEnabled}
                        >
                          {isDefault ? "Default" : "Set Default"}
                        </Button>
                      )}
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={(e) => handleEnabledFrameworksChange(framework.id, e.target.checked)}
                          className="w-4 h-4 text-primary"
                        />
                        <span className="text-sm">Enable</span>
                      </label>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {currentFramework && (
        <Card>
          <CardHeader>
            <CardTitle>Framework Preview: {currentFramework.name}</CardTitle>
            <CardDescription>
              How this framework will look when setting priorities during brief reviews
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-gray-50">
                <h5 className="font-medium mb-2">Review Interface Preview</h5>
                <p className="text-sm text-gray-600 mb-3">
                  This is how reviewers will see the priority options:
                </p>
                
                {/* Simple framework preview */}
                {currentFramework.type === 'numeric' && (
                  <div className="flex gap-2">
                    {currentFramework.id === 'simple' && (
                      <>
                        {[1, 2, 3, 4, 5].map((priority) => (
                          <Button
                            key={priority}
                            size="sm"
                            variant="outline"
                            className="min-w-[32px]"
                            disabled
                          >
                            {priority}
                          </Button>
                        ))}
                      </>
                    )}
                    {currentFramework.id === 'story_points' && (
                      <>
                        {[1, 2, 3, 5, 8, 13, 21].map((points) => (
                          <Button
                            key={points}
                            size="sm"
                            variant="outline"
                            className="min-w-[32px]"
                            disabled
                          >
                            {points}
                          </Button>
                        ))}
                      </>
                    )}
                  </div>
                )}

                {/* Categorical framework preview */}
                {currentFramework.type === 'categorical' && (
                  <div className="flex gap-2">
                    {currentFramework.id === 'moscow' && (
                      <>
                        {['Must', 'Should', 'Could', "Won't"].map((category) => (
                          <Button
                            key={category}
                            size="sm"
                            variant="outline"
                            disabled
                          >
                            {category}
                          </Button>
                        ))}
                      </>
                    )}
                    {currentFramework.id === 'tshirt' && (
                      <>
                        {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((size) => (
                          <Button
                            key={size}
                            size="sm"
                            variant="outline"
                            disabled
                          >
                            {size}
                          </Button>
                        ))}
                      </>
                    )}
                  </div>
                )}

                {/* Composite framework preview */}
                {(currentFramework.type === 'composite' || currentFramework.type === 'matrix') && (
                  <div className="space-y-2">
                    <Button size="sm" variant="outline" disabled>
                      Set Priority (Opens detailed form)
                    </Button>
                    <p className="text-xs text-gray-500">
                      {currentFramework.id === 'ice' && 'Reviewers will input Impact, Confidence, and Ease scores (1-10 each)'}
                      {currentFramework.id === 'rice' && 'Reviewers will input Reach, Impact, Confidence, and Effort values'}
                      {currentFramework.id === 'value_effort' && 'Reviewers will plot on Value vs Effort matrix (1-10 each)'}
                    </p>
                  </div>
                )}
              </div>

              <div className="text-sm text-muted-foreground">
                <strong>Note:</strong> Changing the prioritization framework will only affect new priority assignments. 
                Existing priorities will continue to display using their original framework until re-reviewed.
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
