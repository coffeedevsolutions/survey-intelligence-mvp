import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { Button } from '../../components/ui/button.jsx';
import { Badge } from '../../components/ui/badge.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card.jsx';
import { Input, Textarea } from '../../components/ui/input.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select.jsx';
import { LoadingSpinner } from '../../components/ui/loading-spinner.jsx';
import { LoadingSkeleton } from '../../components/ui/loading-skeleton.jsx';
import { 
  ArrowLeft,
  Target, 
  FileText, 
  CheckSquare, 
  AlertTriangle, 
  Settings,
  Download,
  Clock,
  TrendingUp,
  Users,
  Star,
  ExternalLink,
  Save,
  XCircle
} from '../../components/ui/icons';
import { Edit2, Save as SaveIcon, X } from 'lucide-react';
import { useNotifications } from '../../components/ui/notifications';
import { JiraProjectSelector } from './components/JiraProjectSelector.jsx';
import { JiraExportProgress } from './components/JiraExportProgress.jsx';
import { API_BASE_URL } from '../../utils/api';

/**
 * Solution Details Page Component
 * Displays detailed view of a solution with its own URL
 */
export default function SolutionDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, loading: userLoading } = useAuth();
  
  const [solution, setSolution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Editing state
  const [editingItem, setEditingItem] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [saving, setSaving] = useState(false);
  
  // Jira export state
  const [showJiraProjectSelector, setShowJiraProjectSelector] = useState(false);
  const [exportingState, setExportingState] = useState(null); // { progress: 0, currentItem: 'Starting...', status: 'exporting' }

  // Get notifications hook - moved after state declarations
  const { showSuccess, showError } = useNotifications();

  // Fetch solution by slug
  useEffect(() => {
    const fetchSolution = async () => {
      if (!slug || !user?.orgId) return;
      
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/orgs/${user.orgId}/solutions/slug/${slug}`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Solution not found');
          } else {
            setError('Failed to load solution');
          }
          return;
        }
        
        const solutionData = await response.json();
        setSolution(solutionData);
      } catch (err) {
        console.error('Error fetching solution:', err);
        setError('Failed to load solution');
      } finally {
        setLoading(false);
      }
    };

    fetchSolution();
  }, [slug, user?.orgId]);

  // Loading states
  if (userLoading) {
    return <LoadingSkeleton />;
  }

  // Access control
  if (!user) {
    return (
      <div className="page-gradient flex items-center justify-center">
        <LoadingSpinner>Loading user information...</LoadingSpinner>
      </div>
    );
  }

  if (!user.orgId || (user.role !== 'admin' && user.role !== 'reviewer')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-destructive mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to view solution details.</p>
        </div>
      </div>
    );
  }

  // Loading solution
  if (loading) {
    return (
      <div className="w-full min-w-0 content-full-width p-6">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
          <span className="ml-3">Loading solution details...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !solution) {
    return (
      <div className="w-full min-w-0 content-full-width p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load solution</h3>
            <p className="text-gray-600 mb-4">{error || 'Solution not found'}</p>
            <Button onClick={() => navigate('/solution-management')}>
              Back to Solutions
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleExportJira = async () => {
    if (!solution) {
      showError('Solution not found');
      return;
    }
    
    // Open project selector modal
    setShowJiraProjectSelector(true);
  };

  const handleProjectSelected = async ({ projectKey, createEpic }) => {
    const solutionId = solution.id;
    
    try {
      // Start the export process
      setExportingState({ 
        progress: 0, 
        currentItem: 'Starting export...', 
        status: 'exporting' 
      });
      
      // Start polling for progress updates
      const pollInterval = setInterval(async () => {
        try {
          const progressResponse = await fetch(`${API_BASE_URL}/api/jira/export-progress/${solutionId}`, {
            credentials: 'include'
          });
          
          if (progressResponse.ok) {
            const progressData = await progressResponse.json();
            setExportingState({
              progress: progressData.progress || 0,
              currentItem: progressData.currentItem || 'Processing...',
              status: progressData.status || 'exporting'
            });
            
            // Stop polling when complete or failed
            if (progressData.status === 'completed' || progressData.status === 'failed') {
              clearInterval(pollInterval);
              
              // Keep the progress bar visible for a few seconds to show completion
              setTimeout(() => {
                setExportingState(null);
              }, 3000);
              
              if (progressData.status === 'completed') {
                showSuccess('Solution exported to Jira successfully!');
                // Refresh solution data to update export status
                const fetchSolution = async () => {
                  try {
                    const response = await fetch(`${API_BASE_URL}/api/orgs/${user.orgId}/solutions/${solutionId}`, {
                      credentials: 'include'
                    });
                    if (response.ok) {
                      const updatedSolution = await response.json();
                      setSolution(updatedSolution);
                    }
                  } catch (error) {
                    console.error('Error refreshing solution:', error);
                  }
                };
                fetchSolution();
              } else {
                showError(`Export failed: ${progressData.currentItem}`);
              }
            }
          }
        } catch (pollError) {
          console.error('Error polling progress:', pollError);
        }
      }, 1000); // Poll every second
      
      // Initiate the export
      const response = await fetch(`${API_BASE_URL}/api/jira/export-solution`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          solutionId: solutionId,
          projectKey: projectKey.toUpperCase(),
          createEpic
        })
      });
      
      if (!response.ok) {
        clearInterval(pollInterval);
        setExportingState({
          progress: 0,
          currentItem: 'Export failed',
          status: 'failed'
        });
        
        const error = await response.json();
        showError(`Export failed: ${error.error}`);
        
        // Hide progress bar after showing error
        setTimeout(() => {
          setExportingState(null);
        }, 3000);
      }
      
    } catch (error) {
      console.error('Error exporting to Jira:', error);
      setExportingState({
        progress: 0,
        currentItem: 'Export failed',
        status: 'failed'
      });
      showError('Failed to export solution to Jira');
      
      // Hide progress bar after showing error
      setTimeout(() => {
        setExportingState(null);
      }, 3000);
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

  // Editing functions
  const startEditing = (item, type) => {
    setEditingItem({ ...item, type });
    
    // Only include fields that should be editable for each type
    let editableFields = {};
    switch (type) {
      case 'epic':
        editableFields = {
          name: item.name,
          description: item.description,
          business_value: item.business_value,
          priority: item.priority,
          estimated_story_points: item.estimated_story_points,
          sort_order: item.sort_order
        };
        break;
      case 'story':
        editableFields = {
          story_type: item.story_type,
          title: item.title,
          description: item.description,
          acceptance_criteria: item.acceptance_criteria,
          story_points: item.story_points,
          priority: item.priority,
          sort_order: item.sort_order
        };
        break;
      case 'task':
        editableFields = {
          title: item.title,
          description: item.description,
          task_type: item.task_type,
          estimated_hours: item.estimated_hours,
          sort_order: item.sort_order
        };
        break;
      case 'requirement':
        editableFields = {
          title: item.title,
          description: item.description,
          priority: item.priority,
          category: item.category,
          acceptance_criteria: item.acceptance_criteria
        };
        break;
      case 'architecture':
        editableFields = {
          component_name: item.name, // Map name to component_name for backend
          description: item.description,
          technology_stack: item.technology_stack,
          dependencies: item.dependencies,
          notes: item.complexity_notes // Map complexity_notes to notes for backend
        };
        break;
      case 'risk':
        editableFields = {
          risk_description: item.description, // Map description to risk_description for backend
          probability: item.probability,
          impact: item.impact,
          mitigation_strategy: item.mitigation_strategy,
          contingency_plan: item.contingency_plan
        };
        break;
      default:
        editableFields = { ...item };
    }
    
    setEditValues(editableFields);
  };

  const cancelEditing = () => {
    setEditingItem(null);
    setEditValues({});
  };

  const updateEditValue = (field, value) => {
    setEditValues(prev => ({ ...prev, [field]: value }));
  };

  const saveEdit = async () => {
    if (!editingItem || !solution) return;

    setSaving(true);
    try {
      const { type, id } = editingItem;
      let endpoint = '';
      
      switch (type) {
        case 'epic':
          endpoint = `/api/orgs/${user.orgId}/solutions/${solution.id}/epics/${id}`;
          break;
        case 'story':
          endpoint = `/api/orgs/${user.orgId}/solutions/${solution.id}/stories/${id}`;
          break;
        case 'task':
          endpoint = `/api/orgs/${user.orgId}/solutions/${solution.id}/tasks/${id}`;
          break;
        case 'requirement':
          endpoint = `/api/orgs/${user.orgId}/solutions/${solution.id}/requirements/${id}`;
          break;
        case 'architecture':
          endpoint = `/api/orgs/${user.orgId}/solutions/${solution.id}/architecture/${id}`;
          break;
        case 'risk':
          endpoint = `/api/orgs/${user.orgId}/solutions/${solution.id}/risks/${id}`;
          break;
        default:
          throw new Error('Unknown item type');
      }

      // Validate that we're not sending nested objects that could cause issues
      const sanitizedEditValues = {};
      Object.keys(editValues).forEach(key => {
        const value = editValues[key];
        if (value !== null && value !== undefined && typeof value !== 'object') {
          sanitizedEditValues[key] = value;
        } else if (Array.isArray(value)) {
          sanitizedEditValues[key] = value;
        } else if (typeof value === 'object' && value !== null) {
          console.warn(`Skipping nested object field: ${key}`, value);
        }
      });

      console.log('Sending update request:', {
        endpoint: `${API_BASE_URL}${endpoint}`,
        editValues: sanitizedEditValues,
        type,
        id,
        originalItem: editingItem
      });

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(sanitizedEditValues)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
          endpoint,
          editValues: sanitizedEditValues,
          type,
          id
        });
        throw new Error(errorData.error || `Failed to update ${type}`);
      }

      // Update the solution state with the new data
      const updatedItem = await response.json();
      setSolution(prev => {
        const newSolution = { ...prev };
        switch (type) {
          case 'epic':
            newSolution.epics = newSolution.epics.map(epic => 
              epic.id === id ? { ...epic, ...updatedItem } : epic
            );
            break;
          case 'story':
            newSolution.epics = newSolution.epics.map(epic => ({
              ...epic,
              stories: epic.stories.map(story => 
                story.id === id ? { ...story, ...updatedItem } : story
              )
            }));
            break;
          case 'task':
            newSolution.epics = newSolution.epics.map(epic => ({
              ...epic,
              stories: epic.stories.map(story => ({
                ...story,
                tasks: story.tasks.map(task => 
                  task.id === id ? { ...task, ...updatedItem } : task
                )
              }))
            }));
            break;
          case 'requirement':
            newSolution.requirements = newSolution.requirements.map(req => 
              req.id === id ? { ...req, ...updatedItem } : req
            );
            break;
          case 'architecture':
            newSolution.architecture = newSolution.architecture.map(arch => 
              arch.id === id ? { ...arch, ...updatedItem } : arch
            );
            break;
          case 'risk':
            newSolution.risks = newSolution.risks.map(risk => 
              risk.id === id ? { ...risk, ...updatedItem } : risk
            );
            break;
        }
        return newSolution;
      });

      setEditingItem(null);
      setEditValues({});
      showSuccess(`${type.charAt(0).toUpperCase() + type.slice(1)} updated successfully!`);
    } catch (error) {
      console.error('Error updating item:', error);
      showError(`Failed to update ${editingItem.type}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full min-w-0 content-full-width p-6">
      {/* Enhanced Header */}
      <div className="mb-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
          <button
            onClick={() => navigate('/solution-management')}
            className="hover:text-gray-700 transition-colors"
          >
            Solutions
          </button>
          <span>/</span>
          <span className="text-gray-900 font-medium">{solution.name}</span>
        </nav>

        {/* Main Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="mb-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/solution-management')}
                className="text-gray-600 hover:text-gray-900 -ml-2 mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">{solution.name}</h1>
                <Badge 
                  variant="outline" 
                  className={`text-xs px-3 py-1 ${
                    solution.jira_exported_at ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                  }`}
                >
                  {solution.jira_exported_at ? (
                    <>
                      <CheckSquare className="w-3 h-3 mr-1" />
                      Exported to Jira
                    </>
                  ) : (
                    <>
                      <Clock className="w-3 h-3 mr-1" />
                      Ready to Export
                    </>
                  )}
                </Badge>
              </div>
            </div>
            <p className="text-gray-600 text-lg mb-4 max-w-3xl">{solution.description}</p>
            
            {/* Metadata */}
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Updated {new Date(solution.updated_at).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{solution.epics?.length || 0} Epics • {solution.epics?.reduce((total, epic) => total + (epic.stories?.length || 0), 0) || 0} Stories</span>
              </div>
              {solution.jira_exported_at && (
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-green-600" />
                  <span className="text-green-600">Exported to Jira</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-3 ml-6">
            <Button
              onClick={handleExportJira}
              variant="outline"
              size="sm"
              className="bg-white hover:bg-gray-50 border-gray-300"
              disabled={exportingState !== null}
            >
              {exportingState ? (
                <>
                  <LoadingSpinner className="w-4 h-4 mr-2" />
                  Exporting... ({exportingState.progress}%)
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Export to Jira
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="w-full justify-start px-6 bg-gray-50/50 border-b border-gray-200 h-14">
            <TabsTrigger 
              value="overview" 
              className="flex items-center gap-2 px-4 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-gray-200"
            >
              <Target className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="epics" 
              className="flex items-center gap-2 px-4 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-gray-200"
            >
              <FileText className="w-4 h-4" />
              Epics & Stories
              {solution.epic_count > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs bg-blue-100 text-blue-700">
                  {solution.epic_count}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="requirements" 
              className="flex items-center gap-2 px-4 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-gray-200"
            >
              <CheckSquare className="w-4 h-4" />
              Requirements
              {solution.requirements?.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs bg-green-100 text-green-700">
                  {solution.requirements.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="architecture" 
              className="flex items-center gap-2 px-4 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-gray-200"
            >
              <Settings className="w-4 h-4" />
              Architecture
              {solution.architecture?.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs bg-purple-100 text-purple-700">
                  {solution.architecture.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="risks" 
              className="flex items-center gap-2 px-4 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-gray-200"
            >
              <AlertTriangle className="w-4 h-4" />
              Risks
              {solution.risks?.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs bg-red-100 text-red-700">
                  {solution.risks.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="p-8 overflow-y-auto" style={{ minHeight: '600px' }}>
            {/* Enhanced Overview Tab */}
            <TabsContent value="overview" className="mt-0">
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Duration Card */}
                <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-600 mb-1">Duration</p>
                        <p className="text-2xl font-bold text-blue-900">{solution.estimated_duration_weeks}</p>
                        <p className="text-xs text-blue-600">weeks</p>
                      </div>
                      <div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center">
                        <Clock className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Story Points Card */}
                <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100/50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-600 mb-1">Story Points</p>
                        <p className="text-2xl font-bold text-green-900">{solution.estimated_effort_points}</p>
                        <p className="text-xs text-green-600">total points</p>
                      </div>
                      <div className="w-12 h-12 bg-green-200 rounded-lg flex items-center justify-center">
                        <Target className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Complexity Card */}
                <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100/50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-600 mb-1">Complexity</p>
                        <p className="text-2xl font-bold text-purple-900">{solution.complexity_score}/10</p>
                        <div className="w-full bg-purple-200 rounded-full h-2 mt-2">
                          <div 
                            className="bg-purple-600 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${(solution.complexity_score / 10) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="w-12 h-12 bg-purple-200 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Epics Count Card */}
                <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-orange-100/50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-orange-600 mb-1">Epics</p>
                        <p className="text-2xl font-bold text-orange-900">{solution.epics?.length || 0}</p>
                        <p className="text-xs text-orange-600">workstreams</p>
                      </div>
                      <div className="w-12 h-12 bg-orange-200 rounded-lg flex items-center justify-center">
                        <FileText className="w-6 h-6 text-orange-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Additional Information Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Work Breakdown */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <FileText className="w-5 h-5 text-gray-600" />
                      Work Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <FileText className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="font-medium text-gray-700">Epics</span>
                      </div>
                      <span className="text-lg font-bold text-gray-900">{solution.epics?.length || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <CheckSquare className="w-4 h-4 text-green-600" />
                        </div>
                        <span className="font-medium text-gray-700">Stories</span>
                      </div>
                      <span className="text-lg font-bold text-gray-900">
                        {solution.epics?.reduce((total, epic) => total + (epic.stories?.length || 0), 0) || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Settings className="w-4 h-4 text-purple-600" />
                        </div>
                        <span className="font-medium text-gray-700">Tasks</span>
                      </div>
                      <span className="text-lg font-bold text-gray-900">
                        {solution.epics?.reduce((total, epic) => 
                          total + (epic.stories?.reduce((storyTotal, story) => 
                            storyTotal + (story.tasks?.length || 0), 0) || 0), 0) || 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Project Timeline */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Clock className="w-5 h-5 text-gray-600" />
                      Project Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <CheckSquare className="w-4 h-4 text-green-600" />
                        </div>
                        <span className="font-medium text-gray-700">Created</span>
                      </div>
                      <span className="text-sm font-medium text-gray-600">{new Date(solution.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <TrendingUp className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="font-medium text-gray-700">Last Updated</span>
                      </div>
                      <span className="text-sm font-medium text-gray-600">{new Date(solution.updated_at).toLocaleDateString()}</span>
                    </div>
                    {solution.jira_exported_at && (
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-green-200 rounded-lg flex items-center justify-center">
                            <ExternalLink className="w-4 h-4 text-green-700" />
                          </div>
                          <span className="font-medium text-green-700">Exported to Jira</span>
                        </div>
                        <span className="text-sm font-medium text-green-600">{new Date(solution.jira_exported_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Epics & Stories Tab */}
            <TabsContent value="epics" className="mt-0">
              <div className="space-y-6">
                {solution.epics?.map((epic) => (
                  <Card key={epic.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {editingItem?.id === epic.id && editingItem?.type === 'epic' ? (
                            <div className="space-y-3">
                              <Input
                                value={editValues.name || ''}
                                onChange={(e) => updateEditValue('name', e.target.value)}
                                placeholder="Epic name"
                                className="text-lg font-semibold"
                              />
                              <Textarea
                                value={editValues.description || ''}
                                onChange={(e) => updateEditValue('description', e.target.value)}
                                placeholder="Epic description"
                                className="text-sm"
                                rows={2}
                              />
                              <Input
                                value={editValues.business_value || ''}
                                onChange={(e) => updateEditValue('business_value', e.target.value)}
                                placeholder="Business value"
                                className="text-sm"
                              />
                              <div className="flex items-center gap-2">
                                <Select
                                  value={editValues.priority?.toString() || '3'}
                                  onValueChange={(value) => updateEditValue('priority', parseInt(value))}
                                >
                                  <SelectTrigger className="w-24">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="1">P1</SelectItem>
                                    <SelectItem value="2">P2</SelectItem>
                                    <SelectItem value="3">P3</SelectItem>
                                    <SelectItem value="4">P4</SelectItem>
                                    <SelectItem value="5">P5</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Input
                                  type="number"
                                  value={editValues.estimated_story_points || ''}
                                  onChange={(e) => updateEditValue('estimated_story_points', parseInt(e.target.value) || 0)}
                                  placeholder="Story points"
                                  className="w-20"
                                />
                              </div>
                            </div>
                          ) : (
                            <div>
                              <CardTitle className="text-lg">{epic.name}</CardTitle>
                              <p className="text-sm text-gray-600 mt-1">{epic.description}</p>
                              {epic.business_value && (
                                <p className="text-sm text-blue-600 mt-2 font-medium">
                                  💡 {epic.business_value}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {editingItem?.id === epic.id && editingItem?.type === 'epic' ? (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                onClick={saveEdit}
                                disabled={saving}
                                className="h-8 w-8 p-0"
                              >
                                <SaveIcon className="w-5 h-5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEditing}
                                className="h-8 w-8 p-0"
                              >
                                <X className="w-5 h-5" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <Badge className={`text-xs ${getPriorityLabel(epic.priority).color}`}>
                                P{epic.priority}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {epic.estimated_story_points} pts
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEditing(epic, 'epic')}
                                className="h-10 w-10 p-0 border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                              >
                                <Edit2 className="w-5 h-5 text-gray-600" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {epic.stories?.map((story) => {
                          const StoryIcon = getStoryTypeIcon(story.story_type);
                          return (
                            <div key={story.id} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2 flex-1">
                                  <StoryIcon className="w-4 h-4 text-gray-500" />
                                  {editingItem?.id === story.id && editingItem?.type === 'story' ? (
                                    <div className="flex-1 space-y-2">
                                      <Input
                                        value={editValues.title || ''}
                                        onChange={(e) => updateEditValue('title', e.target.value)}
                                        placeholder="Story title"
                                        className="text-sm font-medium"
                                      />
                                      <Textarea
                                        value={editValues.description || ''}
                                        onChange={(e) => updateEditValue('description', e.target.value)}
                                        placeholder="Story description"
                                        className="text-sm"
                                        rows={2}
                                      />
                                      <div className="flex items-center gap-2">
                                        <Select
                                          value={editValues.story_type || 'user_story'}
                                          onValueChange={(value) => updateEditValue('story_type', value)}
                                        >
                                          <SelectTrigger className="w-32">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="user_story">User Story</SelectItem>
                                            <SelectItem value="technical_story">Technical Story</SelectItem>
                                            <SelectItem value="spike">Spike</SelectItem>
                                            <SelectItem value="bug">Bug</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <Select
                                          value={editValues.priority?.toString() || '3'}
                                          onValueChange={(value) => updateEditValue('priority', parseInt(value))}
                                        >
                                          <SelectTrigger className="w-20">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="1">P1</SelectItem>
                                            <SelectItem value="2">P2</SelectItem>
                                            <SelectItem value="3">P3</SelectItem>
                                            <SelectItem value="4">P4</SelectItem>
                                            <SelectItem value="5">P5</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <Input
                                          type="number"
                                          value={editValues.story_points || ''}
                                          onChange={(e) => updateEditValue('story_points', parseInt(e.target.value) || 0)}
                                          placeholder="Points"
                                          className="w-16"
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex-1">
                                      <h4 className="font-medium text-sm">{story.title}</h4>
                                      <p className="text-sm text-gray-600 mt-1">{story.description}</p>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                  {editingItem?.id === story.id && editingItem?.type === 'story' ? (
                                    <div className="flex gap-1">
                                      <Button
                                        size="sm"
                                        onClick={saveEdit}
                                        disabled={saving}
                                        className="h-7 w-7 p-0"
                                      >
                                        <SaveIcon className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={cancelEditing}
                                        className="h-7 w-7 p-0"
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <>
                                      <Badge className={`text-xs ${getPriorityLabel(story.priority).color}`}>
                                        P{story.priority}
                                      </Badge>
                                      <Badge variant="outline" className="text-xs">
                                        {story.story_points} pts
                                      </Badge>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => startEditing(story, 'story')}
                                        className="h-9 w-9 p-0 border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                                      >
                                        <Edit2 className="w-5 h-5 text-gray-600" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                              
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
                                    {story.tasks.map((task) => (
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
                        <div className="flex-1">
                          {editingItem?.id === req.id && editingItem?.type === 'requirement' ? (
                            <div className="space-y-3">
                              <Input
                                value={editValues.title || ''}
                                onChange={(e) => updateEditValue('title', e.target.value)}
                                placeholder="Requirement title"
                                className="font-medium"
                              />
                              <Textarea
                                value={editValues.description || ''}
                                onChange={(e) => updateEditValue('description', e.target.value)}
                                placeholder="Requirement description"
                                className="text-sm"
                                rows={2}
                              />
                              <div className="flex items-center gap-2">
                                <Select
                                  value={editValues.category || 'functional'}
                                  onValueChange={(value) => updateEditValue('category', value)}
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="functional">Functional</SelectItem>
                                    <SelectItem value="non-functional">Non-Functional</SelectItem>
                                    <SelectItem value="technical">Technical</SelectItem>
                                    <SelectItem value="business">Business</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Select
                                  value={editValues.priority?.toString() || '3'}
                                  onValueChange={(value) => updateEditValue('priority', parseInt(value))}
                                >
                                  <SelectTrigger className="w-20">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="1">P1</SelectItem>
                                    <SelectItem value="2">P2</SelectItem>
                                    <SelectItem value="3">P3</SelectItem>
                                    <SelectItem value="4">P4</SelectItem>
                                    <SelectItem value="5">P5</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <h4 className="font-medium">{req.title}</h4>
                              <p className="text-sm text-gray-600 mt-1">{req.description}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {editingItem?.id === req.id && editingItem?.type === 'requirement' ? (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                onClick={saveEdit}
                                disabled={saving}
                                className="h-8 w-8 p-0"
                              >
                                <SaveIcon className="w-5 h-5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEditing}
                                className="h-8 w-8 p-0"
                              >
                                <X className="w-5 h-5" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <Badge variant="outline" className="text-xs">
                                {req.category || req.requirement_type}
                              </Badge>
                              <Badge className={`text-xs ${getPriorityLabel(req.priority).color}`}>
                                P{req.priority}
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEditing(req, 'requirement')}
                                className="h-10 w-10 p-0 border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                              >
                                <Edit2 className="w-5 h-5 text-gray-600" />
                              </Button>
                            </>
                          )}
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

      {/* JIRA Project Selector Modal */}
      <JiraProjectSelector
        isOpen={showJiraProjectSelector}
        onClose={() => {
          setShowJiraProjectSelector(false);
        }}
        onSelectProject={handleProjectSelected}
        solutionName={solution?.name || ''}
      />

      {/* JIRA Export Progress */}
      <JiraExportProgress
        isVisible={exportingState !== null}
        progress={exportingState?.progress || 0}
        currentItem={exportingState?.currentItem || 'Starting export...'}
        status={exportingState?.status || 'exporting'}
        solutionName={solution?.name || ''}
        onClose={() => setExportingState(null)}
      />
    </div>
  );
}