import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { 
  X, 
  Target, 
  FileText, 
  CheckSquare, 
  AlertTriangle, 
  Settings,
  Download,
  Clock,
  TrendingUp,
  Users,
  Star
} from '../ui/icons';

/**
 * Detailed solution view modal with tabbed interface
 */
export function SolutionDetailsModal({ solution, isOpen, onClose, onExportJira }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab('overview');
    }
  }, [isOpen]);

  if (!isOpen || !solution) return null;

  const handleExport = async () => {
    setExportLoading(true);
    try {
      await onExportJira(solution.id);
    } finally {
      setExportLoading(false);
    }
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      1: { text: 'Critical', color: 'bg-red-100 text-red-700 border-red-200' },
      2: { text: 'High', color: 'bg-orange-100 text-orange-700 border-orange-200' },
      3: { text: 'Medium', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
      4: { text: 'Low', color: 'bg-blue-100 text-blue-700 border-blue-200' },
      5: { text: 'Lowest', color: 'bg-gray-100 text-gray-700 border-gray-200' }
    };
    return labels[priority] || labels[3];
  };

  const getStoryTypeIcon = (type) => {
    const icons = {
      'user_story': Users,
      'technical_story': Settings,
      'spike': TrendingUp,
      'bug': AlertTriangle
    };
    return icons[type] || Users;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{solution.name}</h2>
            <p className="text-sm text-gray-600 mt-1">{solution.description}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleExport}
              disabled={exportLoading}
              variant="outline"
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              {exportLoading ? 'Exporting...' : 'Export to Jira'}
            </Button>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <TabsList className="w-full justify-start px-6 bg-gray-50 border-b">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="epics" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Epics & Stories
              </TabsTrigger>
              <TabsTrigger value="requirements" className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4" />
                Requirements
              </TabsTrigger>
              <TabsTrigger value="architecture" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Architecture
              </TabsTrigger>
              <TabsTrigger value="risks" className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Risks
              </TabsTrigger>
            </TabsList>

            <div className="p-6 overflow-y-auto" style={{ height: 'calc(90vh - 140px)' }}>
              {/* Overview Tab */}
              <TabsContent value="overview" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Key Metrics */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Effort Estimation</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Duration:</span>
                        <span className="font-medium">{solution.estimated_duration_weeks} weeks</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Story Points:</span>
                        <span className="font-medium">{solution.estimated_effort_points}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Complexity:</span>
                        <span className="font-medium">{solution.complexity_score}/10</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Work Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Work Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Epics:</span>
                        <span className="font-medium">{solution.epics?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Stories:</span>
                        <span className="font-medium">
                          {solution.epics?.reduce((total, epic) => total + (epic.stories?.length || 0), 0) || 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Tasks:</span>
                        <span className="font-medium">
                          {solution.epics?.reduce((total, epic) => 
                            total + (epic.stories?.reduce((storyTotal, story) => 
                              storyTotal + (story.tasks?.length || 0), 0) || 0), 0) || 0}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Documentation */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Documentation</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Requirements:</span>
                        <span className="font-medium">{solution.requirements?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Architecture:</span>
                        <span className="font-medium">{solution.architecture?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Risks:</span>
                        <span className="font-medium">{solution.risks?.length || 0}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Epics & Stories Tab */}
              <TabsContent value="epics" className="mt-0">
                <div className="space-y-6">
                  {solution.epics?.map((epic, epicIndex) => (
                    <Card key={epic.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{epic.name}</CardTitle>
                            <p className="text-sm text-gray-600 mt-1">{epic.description}</p>
                            {epic.business_value && (
                              <p className="text-sm text-blue-600 mt-2 font-medium">
                                💡 {epic.business_value}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`text-xs ${getPriorityLabel(epic.priority).color}`}>
                              P{epic.priority}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {epic.estimated_story_points} pts
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {epic.stories?.map((story, storyIndex) => {
                            const StoryIcon = getStoryTypeIcon(story.story_type);
                            return (
                              <div key={story.id} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <StoryIcon className="w-4 h-4 text-gray-500" />
                                    <h4 className="font-medium text-sm">{story.title}</h4>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge className={`text-xs ${getPriorityLabel(story.priority).color}`}>
                                      P{story.priority}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      {story.story_points} pts
                                    </Badge>
                                  </div>
                                </div>
                                <p className="text-sm text-gray-600 mb-3">{story.description}</p>
                                
                                {story.acceptance_criteria?.length > 0 && (
                                  <div className="mb-3">
                                    <h5 className="text-xs font-medium text-gray-700 mb-1">Acceptance Criteria:</h5>
                                    <ul className="text-xs text-gray-600 space-y-1">
                                      {story.acceptance_criteria.map((criteria, index) => (
                                        <li key={index} className="flex items-start gap-2">
                                          <span className="text-green-500 mt-0.5">✓</span>
                                          {criteria}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {story.tasks?.length > 0 && (
                                  <div>
                                    <h5 className="text-xs font-medium text-gray-700 mb-2">Tasks:</h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      {story.tasks.map((task, taskIndex) => (
                                        <div key={task.id} className="bg-gray-50 rounded p-2">
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium">{task.title}</span>
                                            <Badge variant="outline" className="text-xs">
                                              {task.estimated_hours}h
                                            </Badge>
                                          </div>
                                          <p className="text-xs text-gray-600 mt-1">{task.description}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Requirements Tab */}
              <TabsContent value="requirements" className="mt-0">
                <div className="space-y-4">
                  {solution.requirements?.map((req) => (
                    <Card key={req.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium">{req.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{req.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {req.requirement_type}
                            </Badge>
                            <Badge className={`text-xs ${getPriorityLabel(req.priority).color}`}>
                              P{req.priority}
                            </Badge>
                          </div>
                        </div>
                        {req.acceptance_criteria?.length > 0 && (
                          <div className="mt-3">
                            <h5 className="text-xs font-medium text-gray-700 mb-1">Acceptance Criteria:</h5>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {req.acceptance_criteria.map((criteria, index) => (
                                <li key={index} className="flex items-start gap-2">
                                  <span className="text-green-500 mt-0.5">✓</span>
                                  {criteria}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Architecture Tab */}
              <TabsContent value="architecture" className="mt-0">
                <div className="space-y-4">
                  {solution.architecture?.map((comp) => (
                    <Card key={comp.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium">{comp.name}</h4>
                            <p className="text-sm text-gray-600 mt-1">{comp.description}</p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {comp.component_type}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                          {comp.technology_stack?.length > 0 && (
                            <div>
                              <h5 className="text-xs font-medium text-gray-700 mb-1">Technology Stack:</h5>
                              <div className="flex flex-wrap gap-1">
                                {comp.technology_stack.map((tech, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {tech}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {comp.dependencies?.length > 0 && (
                            <div>
                              <h5 className="text-xs font-medium text-gray-700 mb-1">Dependencies:</h5>
                              <div className="flex flex-wrap gap-1">
                                {comp.dependencies.map((dep, index) => (
                                  <Badge key={index} variant="outline" className="text-xs bg-amber-50 text-amber-700">
                                    {dep}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        {comp.complexity_notes && (
                          <p className="text-sm text-orange-600 mt-3 italic">
                            💡 {comp.complexity_notes}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Risks Tab */}
              <TabsContent value="risks" className="mt-0">
                <div className="space-y-4">
                  {solution.risks?.map((risk) => (
                    <Card key={risk.id} className={`border-l-4 ${
                      risk.probability * risk.impact >= 15 ? 'border-l-red-500' :
                      risk.probability * risk.impact >= 9 ? 'border-l-orange-500' :
                      'border-l-yellow-500'
                    }`}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium">{risk.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{risk.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {risk.risk_type}
                            </Badge>
                            <Badge className={`text-xs ${
                              risk.probability * risk.impact >= 15 ? 'bg-red-100 text-red-700' :
                              risk.probability * risk.impact >= 9 ? 'bg-orange-100 text-orange-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              Risk Score: {risk.probability * risk.impact}
                            </Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                          <div>
                            <span className="text-gray-600">Probability:</span>
                            <span className="ml-2 font-medium">{risk.probability}/5</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Impact:</span>
                            <span className="ml-2 font-medium">{risk.impact}/5</span>
                          </div>
                        </div>
                        {risk.mitigation_strategy && (
                          <div className="mt-3 p-3 bg-blue-50 rounded">
                            <h5 className="text-xs font-medium text-blue-700 mb-1">Mitigation Strategy:</h5>
                            <p className="text-sm text-blue-600">{risk.mitigation_strategy}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
