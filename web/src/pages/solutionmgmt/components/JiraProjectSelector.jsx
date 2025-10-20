import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { LoadingSpinner } from '../../../components/ui/loading-spinner';
import { 
  X, 
  ExternalLink, 
  CheckCircle,
  AlertCircle,
  Settings
} from '../../../components/ui/icons';
import { API_BASE_URL } from '../../../utils/api';

/**
 * JIRA Project Selection Modal
 * Allows users to select a JIRA project for exporting solutions
 */
export function JiraProjectSelector({ 
  isOpen, 
  onClose, 
  onSelectProject,
  solutionName 
}) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [createEpic, setCreateEpic] = useState(true);

  // Fetch available JIRA projects
  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/api/jira/projects`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const projectsData = await response.json();
        setProjects(projectsData);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load projects');
      }
    } catch (error) {
      console.error('Error loading JIRA projects:', error);
      setError('Failed to connect to JIRA. Please check your integration settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
      setSelectedProject(null);
      setCreateEpic(true);
    }
  }, [isOpen]);

  const handleExport = () => {
    if (selectedProject) {
      onSelectProject({
        projectKey: selectedProject.key,
        projectName: selectedProject.name,
        createEpic
      });
      onClose();
    }
  };

  const getProjectTypeIcon = (type) => {
    if (type === 'software') return '💻';
    if (type === 'business') return '📊';
    if (type === 'service_desk') return '🎧';
    return '📁';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <CardHeader className="border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">
                Export to JIRA
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Select a project to export "{solutionName}"
              </p>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">
              <LoadingSpinner />
              <p className="mt-2 text-sm text-gray-600">Loading JIRA projects...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Unable to Load Projects
              </h3>
              <p className="text-sm text-gray-600 mb-4">{error}</p>
              <Button 
                onClick={fetchProjects} 
                variant="outline"
                size="sm"
              >
                Try Again
              </Button>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-8">
              <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Projects Found
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                No JIRA projects are available. Please check your JIRA integration settings.
              </p>
              <Button 
                onClick={onClose} 
                variant="outline"
                size="sm"
              >
                <Settings className="w-4 h-4 mr-2" />
                Go to Settings
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Project Selection */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  Select Project
                </h3>
                <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() => setSelectedProject(project)}
                      className={`
                        p-4 border rounded-lg cursor-pointer transition-all
                        ${selectedProject?.id === project.id
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">
                            {getProjectTypeIcon(project.projectTypeKey)}
                          </span>
                          <div>
                            <p className="font-medium text-gray-900">
                              {project.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              {project.key}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {project.projectTypeKey}
                          </Badge>
                          {selectedProject?.id === project.id && (
                            <CheckCircle className="w-5 h-5 text-blue-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Export Options */}
              {selectedProject && (
                <div className="border-t pt-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    Export Options
                  </h3>
                  <div className="space-y-3">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={createEpic}
                        onChange={(e) => setCreateEpic(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Create Epic
                        </p>
                        <p className="text-xs text-gray-600">
                          Group all user stories under a single Epic
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>

        {/* Footer */}
        {!loading && !error && projects.length > 0 && (
          <div className="border-t border-gray-200 p-6 flex justify-end space-x-3">
            <Button 
              onClick={onClose} 
              variant="outline"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleExport}
              disabled={!selectedProject}
              className="min-w-[120px]"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Export to JIRA
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
