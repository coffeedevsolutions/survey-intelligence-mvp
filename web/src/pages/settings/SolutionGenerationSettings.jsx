import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { FormInput, FormTextarea } from '../../components/ui/form-input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Settings, FileText, Shield, AlertTriangle } from '../../components/ui/icons';

/**
 * Solution Generation Settings Component
 * Integrated into the main organization settings system
 */
export function SolutionGenerationSettings({ 
  config, 
  onConfigChange, 
  loading = false 
}) {

  const getDefaultConfig = () => ({
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

  // Initialize config if not provided
  const currentConfig = config || getDefaultConfig();

  const updateConfig = (path, value) => {
    const newConfig = { ...currentConfig };
    const keys = path.split('.');
    let current = newConfig;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = { ...current[keys[i]] };
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    onConfigChange?.(newConfig);
  };

  const addFocusArea = () => {
    const newArea = prompt('Enter a focus area for solution generation:');
    if (newArea && newArea.trim()) {
      updateConfig('aiInstructions.focusAreas', [...(currentConfig.aiInstructions.focusAreas || []), newArea.trim()]);
    }
  };

  const removeFocusArea = (index) => {
    const newAreas = [...(currentConfig.aiInstructions.focusAreas || [])];
    newAreas.splice(index, 1);
    updateConfig('aiInstructions.focusAreas', newAreas);
  };

  const addConstraint = () => {
    const newConstraint = prompt('Enter a constraint or guideline:');
    if (newConstraint && newConstraint.trim()) {
      updateConfig('aiInstructions.constraintsAndGuidelines', [...(currentConfig.aiInstructions.constraintsAndGuidelines || []), newConstraint.trim()]);
    }
  };

  const removeConstraint = (index) => {
    const newConstraints = [...(currentConfig.aiInstructions.constraintsAndGuidelines || [])];
    newConstraints.splice(index, 1);
    updateConfig('aiInstructions.constraintsAndGuidelines', newConstraints);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3">Loading configuration...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">

      <Tabs defaultValue="epics" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="epics">Epics & Stories</TabsTrigger>
          <TabsTrigger value="requirements">Requirements</TabsTrigger>
          <TabsTrigger value="ai-instructions">AI Instructions</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="epics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Epic Configuration
              </CardTitle>
              <CardDescription>
                Control how epics are generated and structured
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="maxEpics">Maximum Number of Epics</Label>
                  <FormInput
                    id="maxEpics"
                    type="number"
                    min="1"
                    max="20"
                    value={currentConfig.epics.maxCount}
                    onChange={(e) => updateConfig('epics.maxCount', parseInt(e.target.value))}
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Limit the maximum number of epics generated (1-20)
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="minEpics">Minimum Number of Epics</Label>
                  <FormInput
                    id="minEpics"
                    type="number"
                    min="1"
                    max={currentConfig.epics.maxCount}
                    value={currentConfig.epics.minCount}
                    onChange={(e) => updateConfig('epics.minCount', parseInt(e.target.value))}
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Require minimum number of epics
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enforce Epic Limits</Label>
                    <p className="text-sm text-gray-600">
                      Strictly enforce minimum and maximum epic counts
                    </p>
                  </div>
                  <Switch
                    checked={currentConfig.epics.enforceLimit}
                    onCheckedChange={(checked) => updateConfig('epics.enforceLimit', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Include Technical Epics</Label>
                    <p className="text-sm text-gray-600">
                      Generate epics for technical infrastructure and architecture
                    </p>
                  </div>
                  <Switch
                    checked={currentConfig.epics.includeTechnicalEpics}
                    onCheckedChange={(checked) => updateConfig('epics.includeTechnicalEpics', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Include Infrastructure Epics</Label>
                    <p className="text-sm text-gray-600">
                      Generate epics for deployment, monitoring, and infrastructure
                    </p>
                  </div>
                  <Switch
                    checked={currentConfig.epics.includeInfrastructureEpics}
                    onCheckedChange={(checked) => updateConfig('epics.includeInfrastructureEpics', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requirements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Requirement Types
              </CardTitle>
              <CardDescription>
                Choose which types of requirements to include in solution generation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(currentConfig.requirements.categories).map(([type, enabled]) => (
                <div key={type} className="flex items-center justify-between">
                  <div>
                    <Label className="capitalize">{type} Requirements</Label>
                    <p className="text-sm text-gray-600">
                      {getRequirementDescription(type)}
                    </p>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(checked) => updateConfig(`requirements.categories.${type}`, checked)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-instructions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                AI Instructions & Context
              </CardTitle>
              <CardDescription>
                Provide context and constraints to guide AI solution generation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="orgContext">Organization Context</Label>
                <FormTextarea
                  id="orgContext"
                  value={currentConfig.aiInstructions.organizationContext}
                  onChange={(e) => updateConfig('aiInstructions.organizationContext', e.target.value)}
                  placeholder="Describe your organization's technology stack, industry, or specific context that should inform solution generation..."
                  rows={4}
                  className="mt-1"
                />
                <p className="text-sm text-gray-600 mt-1">
                  Help AI understand your organization's unique context
                </p>
              </div>

              <div>
                <Label>Focus Areas</Label>
                <p className="text-sm text-gray-600 mb-2">
                  Areas that should receive special attention in solution generation
                </p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(currentConfig.aiInstructions.focusAreas || []).map((area, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="cursor-pointer hover:bg-red-100"
                      onClick={() => removeFocusArea(index)}
                    >
                      {area} ×
                    </Badge>
                  ))}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={addFocusArea}
                >
                  Add Focus Area
                </Button>
              </div>

              <div>
                <Label>Constraints & Guidelines</Label>
                <p className="text-sm text-gray-600 mb-2">
                  Specific constraints or guidelines for solution generation
                </p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(currentConfig.aiInstructions.constraintsAndGuidelines || []).map((constraint, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="cursor-pointer hover:bg-red-100"
                      onClick={() => removeConstraint(index)}
                    >
                      {constraint} ×
                    </Badge>
                  ))}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={addConstraint}
                >
                  Add Constraint
                </Button>
              </div>

              <div>
                <Label htmlFor="customPrompt">Custom AI Instructions</Label>
                <FormTextarea
                  id="customPrompt"
                  value={currentConfig.aiInstructions.customPromptAdditions}
                  onChange={(e) => updateConfig('aiInstructions.customPromptAdditions', e.target.value)}
                  placeholder="Additional specific instructions for the AI when generating solutions..."
                  rows={4}
                  className="mt-1"
                />
                <p className="text-sm text-gray-600 mt-1">
                  Additional instructions that will be included in AI prompts
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Story & Task Templates</CardTitle>
              <CardDescription>
                Customize templates for user stories, technical stories, and tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="userStoryTemplate">User Story Template</Label>
                <FormInput
                  id="userStoryTemplate"
                  value={currentConfig.templates?.userStoryTemplate || "As a [user] I want [goal] so that [benefit]"}
                  onChange={(e) => updateConfig('templates.userStoryTemplate', e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="technicalStoryTemplate">Technical Story Template</Label>
                <FormInput
                  id="technicalStoryTemplate"
                  value={currentConfig.templates?.technicalStoryTemplate || "Technical: [technical requirement or infrastructure need]"}
                  onChange={(e) => updateConfig('templates.technicalStoryTemplate', e.target.value)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function getRequirementDescription(type) {
  const descriptions = {
    functional: "Business logic and feature requirements",
    technical: "Technical constraints and architecture requirements", 
    performance: "Speed, scalability, and performance requirements",
    security: "Security, privacy, and data protection requirements",
    compliance: "Regulatory and compliance requirements"
  };
  return descriptions[type] || "";
}
