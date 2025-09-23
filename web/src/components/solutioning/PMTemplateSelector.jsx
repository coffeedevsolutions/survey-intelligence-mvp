/**
 * PM Template Selector Component
 * Allows users to select which PM template to use when generating solutions
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card.jsx';
import { Button } from '../ui/button.jsx';
import { Badge } from '../ui/badge.jsx';
import { RadioCardGroup } from '../ui/radio.jsx';
import { Label } from '../ui/label.jsx';
import { 
  Settings, 
  FileText, 
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Info,
  X
} from '../ui/icons.jsx';
import { useAuth } from '../../hooks/useAuth.js';

export function PMTemplateSelector({ 
  isOpen, 
  onClose, 
  onConfirm, 
  briefTitle = "Project Brief"
}) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (isOpen && user?.orgId) {
      fetchTemplates();
    }
  }, [isOpen, user?.orgId]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`/api/orgs/${user.orgId}/pm-templates`, {
        credentials: 'include'
      });
      const data = await response.json();
      setTemplates(data);
      
      // Auto-select default template
      const defaultTemplate = data.find(t => t.is_default);
      if (defaultTemplate) {
        setSelectedTemplateId(defaultTemplate.id);
      } else if (data.length > 0) {
        setSelectedTemplateId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching PM templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setGenerating(true);
    try {
      await onConfirm(selectedTemplateId);
      onClose();
    } catch (error) {
      console.error('Error generating solution:', error);
    } finally {
      setGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Select PM Template</h2>
            <p className="text-gray-600 mt-1">
              Choose how to structure the solution for "{briefTitle}"
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3">Loading templates...</span>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No PM templates found</p>
              <p className="text-sm text-gray-500 mt-2">
                Set up PM templates in Organization Settings first
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-800">
                      <strong>PM Templates</strong> define how this brief will be broken down into epics, 
                      stories, and tasks. Each template has specific patterns for work item creation.
                    </p>
                  </div>
                </div>
              </div>

              <RadioCardGroup
                options={templates.map(template => ({
                  value: template.id,
                  title: (
                    <div className="flex items-center gap-2">
                      {template.name}
                      {template.is_default && (
                        <Badge variant="default" className="text-xs">Default</Badge>
                      )}
                    </div>
                  ),
                  description: (
                    <div className="space-y-3">
                      {template.description && (
                        <p className="text-sm text-gray-600">
                          {template.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          <span>{template.story_patterns?.length || 0} story patterns</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Settings className="h-3 w-3" />
                          <span>{template.task_patterns?.length || 0} task patterns</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          <span>{template.requirement_patterns?.length || 0} requirement types</span>
                        </div>
                      </div>

                      {/* Show story patterns preview */}
                      {template.story_patterns?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-700 mb-1">
                            Story Patterns:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {template.story_patterns.slice(0, 3).map((pattern, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {pattern.name?.split(' - ')[1] || pattern.name}
                              </Badge>
                            ))}
                            {template.story_patterns.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{template.story_patterns.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                }))}
                value={selectedTemplateId}
                onChange={setSelectedTemplateId}
                columns={1}
                className="space-y-3"
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!selectedTemplateId || generating || loading}
            className="flex items-center gap-2"
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Generating...
              </>
            ) : (
              <>
                <ArrowRight className="h-4 w-4" />
                Generate Solution
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default PMTemplateSelector;
