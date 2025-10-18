/**
 * PM Templates Configuration Tab
 * Allows organizations to customize their project management templates
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '../../components/ui/card.jsx';
import { Button } from '../../components/ui/button.jsx';
import { Input } from '../../components/ui/input.jsx';
import { FormTextarea } from '../../components/ui/form-input.jsx';
import { Badge } from '../../components/ui/badge.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs.jsx';
import { RadioGroup } from '../../components/ui/radio.jsx';
import { Label } from '../../components/ui/label.jsx';
import { 
  Plus, 
  Settings, 
  Copy, 
  Trash2, 
  Save, 
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Info
} from '../../components/ui/icons.jsx';
import { useAuth } from '../../hooks/useAuth.js';

export function PMTemplatesTab() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, [user?.orgId]);

  const fetchTemplates = async () => {
    if (!user?.orgId) return;
    
    try {
      const response = await fetch(`/api/orgs/${user.orgId}/pm-templates`, {
        credentials: 'include'
      });
      const data = await response.json();
      setTemplates(data);
      
      // Select default template if none selected
      if (!selectedTemplate && data.length > 0) {
        const defaultTemplate = data.find(t => t.is_default) || data[0];
        setSelectedTemplate(defaultTemplate);
      }
    } catch (error) {
      console.error('Error fetching PM templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async (templateData) => {
    setSaving(true);
    try {
      const url = templateData.id 
        ? `/api/orgs/${user.orgId}/pm-templates/${templateData.id}`
        : `/api/orgs/${user.orgId}/pm-templates`;
      
      const method = templateData.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: templateData.name,
          description: templateData.description,
          isDefault: templateData.isDefault,
          epicConfig: templateData.epicConfig,
          storyPatterns: templateData.storyPatterns,
          taskPatterns: templateData.taskPatterns,
          requirementPatterns: templateData.requirementPatterns,
          aiInstructions: templateData.aiInstructions
        })
      });

      if (response.ok) {
        await fetchTemplates();
        setIsCreating(false);
      } else {
        const error = await response.json();
        alert(`Error saving template: ${error.details || error.error}`);
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error saving template');
    } finally {
      setSaving(false);
    }
  };

  const duplicateTemplate = async (template) => {
    const newName = prompt('Enter name for the duplicated template:', `${template.name} Copy`);
    if (!newName) return;

    try {
      const response = await fetch(`/api/orgs/${user.orgId}/pm-templates/${template.id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newName })
      });

      if (response.ok) {
        await fetchTemplates();
      } else {
        const error = await response.json();
        alert(`Error duplicating template: ${error.details || error.error}`);
      }
    } catch (error) {
      console.error('Error duplicating template:', error);
      alert('Error duplicating template');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading PM templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">PM Templates</h2>
          <p className="text-gray-600 mt-1">
            Customize how project briefs are broken down into work items
          </p>
        </div>
        <Button 
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Template
        </Button>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800">
                <strong>PM Templates</strong> define how your organization breaks down project briefs into structured work items.
                Each template specifies required story patterns (like spikes, functional requirements, technical implementation)
                and task patterns that should be created for every epic.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Templates List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Templates</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className={`p-3 cursor-pointer border-l-4 transition-colors ${
                      selectedTemplate?.id === template.id
                        ? 'bg-blue-50 border-blue-500'
                        : 'border-transparent hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 flex items-center gap-2">
                          {template.name}
                          {template.is_default && (
                            <Badge variant="default" className="text-xs">Default</Badge>
                          )}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {template.story_patterns?.length || 0} story patterns
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateTemplate(template);
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Template Configuration */}
        <div className="lg:col-span-2">
          {selectedTemplate ? (
            <TemplateEditor 
              template={selectedTemplate}
              onSave={saveTemplate}
              saving={saving}
            />
          ) : isCreating ? (
            <TemplateEditor 
              template={null}
              onSave={saveTemplate}
              saving={saving}
              onCancel={() => setIsCreating(false)}
            />
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Select a template to configure</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function TemplateEditor({ template, onSave, saving, onCancel }) {
  const [formData, setFormData] = useState({
    id: template?.id || null,
    name: template?.name || '',
    description: template?.description || '',
    isDefault: template?.is_default || false,
    epicConfig: template?.epic_config || { maxEpics: 6, minEpics: 2, requireBusinessValue: true },
    storyPatterns: template?.story_patterns || [],
    taskPatterns: template?.task_patterns || [],
    requirementPatterns: template?.requirement_patterns || [],
    aiInstructions: template?.ai_instructions || {}
  });

  const addStoryPattern = () => {
    setFormData(prev => ({
      ...prev,
      storyPatterns: [...prev.storyPatterns, {
        id: `pattern_${Date.now()}`,
        name: 'New Story Pattern',
        description: '',
        storyType: 'user_story',
        priority: 1,
        estimatedPoints: 3,
        required: true,
        acceptanceCriteria: []
      }]
    }));
  };

  const updateStoryPattern = (index, updates) => {
    setFormData(prev => ({
      ...prev,
      storyPatterns: prev.storyPatterns.map((pattern, i) => 
        i === index ? { ...pattern, ...updates } : pattern
      )
    }));
  };

  const removeStoryPattern = (index) => {
    setFormData(prev => ({
      ...prev,
      storyPatterns: prev.storyPatterns.filter((_, i) => i !== index)
    }));
  };

  const addTaskPattern = () => {
    setFormData(prev => ({
      ...prev,
      taskPatterns: [...prev.taskPatterns, {
        id: `task_pattern_${Date.now()}`,
        name: 'New Task Pattern',
        description: '',
        taskType: 'development',
        estimatedHours: 4,
        appliesTo: [],
        required: true
      }]
    }));
  };

  const updateTaskPattern = (index, updates) => {
    setFormData(prev => ({
      ...prev,
      taskPatterns: prev.taskPatterns.map((pattern, i) => 
        i === index ? { ...pattern, ...updates } : pattern
      )
    }));
  };

  const removeTaskPattern = (index) => {
    setFormData(prev => ({
      ...prev,
      taskPatterns: prev.taskPatterns.filter((_, i) => i !== index)
    }));
  };

  const addRequirementPattern = () => {
    setFormData(prev => ({
      ...prev,
      requirementPatterns: [...prev.requirementPatterns, {
        id: `req_pattern_${Date.now()}`,
        type: 'functional',
        category: 'Core Functionality',
        description: '',
        priority: 1,
        required: true
      }]
    }));
  };

  const updateRequirementPattern = (index, updates) => {
    setFormData(prev => ({
      ...prev,
      requirementPatterns: prev.requirementPatterns.map((pattern, i) => 
        i === index ? { ...pattern, ...updates } : pattern
      )
    }));
  };

  const removeRequirementPattern = (index) => {
    setFormData(prev => ({
      ...prev,
      requirementPatterns: prev.requirementPatterns.filter((_, i) => i !== index)
    }));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {template ? `Edit: ${template.name}` : 'Create New Template'}
          </CardTitle>
          <div className="flex items-center gap-2">
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button 
              onClick={() => onSave(formData)}
              disabled={saving || !formData.name}
              className="flex items-center gap-2"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Template
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="basic" className="space-y-4">
          <TabsList>
            <TabsTrigger value="basic">Basic Settings</TabsTrigger>
            <TabsTrigger value="stories">Story Patterns</TabsTrigger>
            <TabsTrigger value="tasks">Task Patterns</TabsTrigger>
            <TabsTrigger value="requirements">Requirements</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template Name
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter template name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <FormTextarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe this template and when to use it"
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <label htmlFor="isDefault" className="text-sm text-gray-700">
                Set as default template for this organization
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Epics
                </label>
                <Input
                  type="number"
                  value={formData.epicConfig.maxEpics || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    epicConfig: { ...prev.epicConfig, maxEpics: parseInt(e.target.value) || 6 }
                  }))}
                  min="1"
                  max="20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Epics
                </label>
                <Input
                  type="number"
                  value={formData.epicConfig.minEpics || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    epicConfig: { ...prev.epicConfig, minEpics: parseInt(e.target.value) || 2 }
                  }))}
                  min="1"
                  max="10"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="stories" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Story Patterns</h3>
              <Button onClick={addStoryPattern} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Pattern
              </Button>
            </div>
            
            <div className="space-y-4">
              {formData.storyPatterns.map((pattern, index) => (
                <Card key={index} className="border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Pattern {index + 1}</span>
                        {pattern.required && (
                          <Badge variant="outline" className="text-xs">Required</Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStoryPattern(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Story Name
                        </label>
                        <Input
                          value={pattern.name}
                          onChange={(e) => updateStoryPattern(index, { name: e.target.value })}
                          placeholder="e.g., {{epic_name}} - Research & Analysis"
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Story Type
                        </label>
                        <select
                          value={pattern.storyType}
                          onChange={(e) => updateStoryPattern(index, { storyType: e.target.value })}
                          className="w-full text-sm border border-gray-300 rounded-md px-3 py-2"
                        >
                          <option value="spike">Spike</option>
                          <option value="user_story">User Story</option>
                          <option value="technical_story">Technical Story</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Description Template
                      </label>
                      <FormTextarea
                        value={pattern.description}
                        onChange={(e) => updateStoryPattern(index, { description: e.target.value })}
                        placeholder="Description template (use {{epic_name}} for dynamic values)"
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium">Task Patterns</h3>
                  <p className="text-sm text-gray-600">
                    Define task templates that will be automatically created for applicable story types.
                  </p>
                </div>
                <Button onClick={addTaskPattern} variant="outline" size="sm">
                  Add Pattern
                </Button>
              </div>

              {formData.taskPatterns.map((pattern, index) => (
                <Card key={pattern.id} className="border-gray-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Pattern {index + 1}</span>
                        {pattern.required && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            Required
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTaskPattern(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        ×
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Task Name
                        </label>
                        <Input
                          value={pattern.name}
                          onChange={(e) => updateTaskPattern(index, { name: e.target.value })}
                          placeholder="e.g., Requirements Analysis"
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Task Type
                        </label>
                        <select
                          value={pattern.taskType}
                          onChange={(e) => updateTaskPattern(index, { taskType: e.target.value })}
                          className="w-full text-sm border border-gray-300 rounded-md px-3 py-2"
                        >
                          <option value="development">Development</option>
                          <option value="testing">Testing</option>
                          <option value="documentation">Documentation</option>
                          <option value="research">Research</option>
                          <option value="deployment">Deployment</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Estimated Hours
                        </label>
                        <Input
                          type="number"
                          value={pattern.estimatedHours}
                          onChange={(e) => updateTaskPattern(index, { estimatedHours: Number(e.target.value) })}
                          placeholder="4"
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Required
                        </label>
                        <label className="flex items-center gap-2 mt-2">
                          <input
                            type="checkbox"
                            checked={pattern.required}
                            onChange={(e) => updateTaskPattern(index, { required: e.target.checked })}
                            className="rounded"
                          />
                          <span className="text-sm">This task is mandatory</span>
                        </label>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <FormTextarea
                        value={pattern.description}
                        onChange={(e) => updateTaskPattern(index, { description: e.target.value })}
                        placeholder="Describe what this task involves"
                        rows={2}
                        className="text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Applies to Story Types
                      </label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.storyPatterns.map((storyPattern) => (
                          <label key={storyPattern.id} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={pattern.appliesTo?.includes(storyPattern.id)}
                              onChange={(e) => {
                                const newAppliesTo = e.target.checked
                                  ? [...(pattern.appliesTo || []), storyPattern.id]
                                  : (pattern.appliesTo || []).filter(id => id !== storyPattern.id);
                                updateTaskPattern(index, { appliesTo: newAppliesTo });
                              }}
                              className="rounded"
                            />
                            <span className="text-xs">{storyPattern.name}</span>
                          </label>
                        ))}
                      </div>
                      {formData.storyPatterns.length === 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          Add story patterns first to assign this task to specific story types
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {formData.taskPatterns.length === 0 && (
                <Card className="border-gray-200 border-dashed">
                  <CardContent className="p-8 text-center">
                    <div className="text-gray-400 mb-2">📋</div>
                    <p className="text-gray-600 mb-2">No task patterns defined</p>
                    <p className="text-sm text-gray-500 mb-4">
                      Task patterns define the specific work items that get created for each story type
                    </p>
                    <Button onClick={addTaskPattern} variant="outline" size="sm">
                      Add Your First Task Pattern
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="requirements" className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium">Requirement Patterns</h3>
                  <p className="text-sm text-gray-600">
                    Define what types of requirements should be captured for each solution.
                  </p>
                </div>
                <Button onClick={addRequirementPattern} variant="outline" size="sm">
                  Add Pattern
                </Button>
              </div>

              {formData.requirementPatterns.map((pattern, index) => (
                <Card key={pattern.id} className="border-gray-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Pattern {index + 1}</span>
                        {pattern.required && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            Required
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRequirementPattern(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        ×
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Requirement Type
                        </label>
                        <select
                          value={pattern.type}
                          onChange={(e) => updateRequirementPattern(index, { type: e.target.value })}
                          className="w-full text-sm border border-gray-300 rounded-md px-3 py-2"
                        >
                          <option value="functional">Functional</option>
                          <option value="technical">Technical</option>
                          <option value="performance">Performance</option>
                          <option value="security">Security</option>
                          <option value="compliance">Compliance</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Category
                        </label>
                        <Input
                          value={pattern.category}
                          onChange={(e) => updateRequirementPattern(index, { category: e.target.value })}
                          placeholder="e.g., Core Functionality"
                          className="text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Priority (1-5)
                        </label>
                        <Input
                          type="number"
                          min="1"
                          max="5"
                          value={pattern.priority}
                          onChange={(e) => updateRequirementPattern(index, { priority: Number(e.target.value) })}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Required
                        </label>
                        <label className="flex items-center gap-2 mt-2">
                          <input
                            type="checkbox"
                            checked={pattern.required}
                            onChange={(e) => updateRequirementPattern(index, { required: e.target.checked })}
                            className="rounded"
                          />
                          <span className="text-sm">Must include requirements of this type</span>
                        </label>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Description Template
                      </label>
                      <FormTextarea
                        value={pattern.description}
                        onChange={(e) => updateRequirementPattern(index, { description: e.target.value })}
                        placeholder="Describe what this requirement type should cover..."
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}

              {formData.requirementPatterns.length === 0 && (
                <Card className="border-gray-200 border-dashed">
                  <CardContent className="p-8 text-center">
                    <div className="text-gray-400 mb-2">📋</div>
                    <p className="text-gray-600 mb-2">No requirement patterns defined</p>
                    <p className="text-sm text-gray-500 mb-4">
                      Requirement patterns define the types of requirements that must be captured for each solution
                    </p>
                    <Button onClick={addRequirementPattern} variant="outline" size="sm">
                      Add Your First Requirement Pattern
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default PMTemplatesTab;
