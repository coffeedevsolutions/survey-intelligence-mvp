import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth.js';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { LoadingSpinner } from '../../../components/ui/loading-spinner.jsx';
import { API_BASE_URL } from '../../../utils/api.js';
import { 
  FileCode, 
  ClipboardList,
  Lightbulb, 
  FileText,
  Settings,
  AlertCircle,
  BarChart3,
  ChevronDown
} from '../../../components/ui/icons.jsx';

// Import subpage components
import { UnifiedTemplatesSubpage } from '../../workflow/templates/UnifiedTemplatesSubpage.jsx';
import { DocumentationTemplatesSubpage } from '../../workflow/templates/DocumentationTemplatesSubpage.jsx';
import { PMTemplatesSubpage } from '../../workflow/templates/PMTemplatesSubpage.jsx';
import { PrioritizationModelsSubpage } from '../../workflow/prioritization/PrioritizationModelsSubpage.jsx';

/**
 * Workflow Management Page - All workflow and template management in one place
 * Renamed from Templates page to better reflect its purpose
 */
export default function WorkflowManagement() {
  const { user, loading: userLoading } = useAuth();
  const [activePage, setActivePage] = useState('unified');
  const [showTemplatesDropdown, setShowTemplatesDropdown] = useState(false);
  const [showPrioritizationDropdown, setShowPrioritizationDropdown] = useState(false);
  
  // KPI data
  const [templatesCount, setTemplatesCount] = useState(0);
  const [pmTemplatesCount, setPmTemplatesCount] = useState(0);
  const [prioritizationCount, setPrioritizationCount] = useState(0);
  const [documentsCount, setDocumentsCount] = useState(0);

  // Fetch KPI data
  useEffect(() => {
    if (!user?.orgId) return;
    
    const fetchKPI = async () => {
      try {
        // Fetch unified templates count
        const templatesResponse = await fetch(`${API_BASE_URL}/api/templates/orgs/${user.orgId}/unified-templates`, {
          credentials: 'include'
        });
        if (templatesResponse.ok) {
          const templatesData = await templatesResponse.json();
          setTemplatesCount(templatesData.templates?.length || 0);
        }
        
        // Fetch PM templates count
        const pmTemplatesResponse = await fetch(`${API_BASE_URL}/api/orgs/${user.orgId}/pm-templates`, {
          credentials: 'include'
        });
        if (pmTemplatesResponse.ok) {
          const pmTemplatesData = await pmTemplatesResponse.json();
          setPmTemplatesCount(pmTemplatesData.length || 0);
        }
        
        // Fetch prioritization frameworks count
        const prioritizationResponse = await fetch(`${API_BASE_URL}/api/orgs/${user.orgId}/prioritization-frameworks`, {
          credentials: 'include'
        });
        if (prioritizationResponse.ok) {
          const prioritizationData = await prioritizationResponse.json();
          setPrioritizationCount(Object.keys(prioritizationData.frameworks || {}).length || 0);
        }
        
        // Documentation templates count (set to 1 for now as it's a single settings page)
        setDocumentsCount(1);
      } catch (error) {
        console.error('Error fetching KPI data:', error);
      }
    };
    
    fetchKPI();
  }, [user?.orgId]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showTemplatesDropdown && !event.target.closest('.workflow-navigation')) {
        setShowTemplatesDropdown(false);
      }
      if (showPrioritizationDropdown && !event.target.closest('.workflow-navigation')) {
        setShowPrioritizationDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTemplatesDropdown, showPrioritizationDropdown]);

  // Loading state
  if (userLoading) {
    return (
      <div className="w-full min-w-0 content-full-width p-6">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
          <span className="ml-3">Loading workflow management...</span>
        </div>
      </div>
    );
  }

  // Access control
  if (!user) {
    return (
      <div className="w-full min-w-0 content-full-width p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600">Please log in to access workflow management.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user.orgId || user.role !== 'admin') {
    return (
      <div className="w-full min-w-0 content-full-width p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600">You need admin privileges to access workflow management.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 content-full-width p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="w-8 h-8 text-gray-600" />
          <h1 className="text-3xl font-bold tracking-tight">Workflow Management</h1>
        </div>
        <p className="text-gray-600 text-lg">
          Manage templates, workflows, and prioritization models for estimations
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Templates</p>
                <p className="text-2xl font-bold text-blue-600">{templatesCount}</p>
                <p className="text-xs text-gray-500 mt-1">Active templates</p>
              </div>
              <FileCode className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Prioritization</p>
                <p className="text-2xl font-bold text-green-600">{prioritizationCount}</p>
                <p className="text-xs text-gray-500 mt-1">Frameworks</p>
              </div>
              <BarChart3 className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Documents</p>
                <p className="text-2xl font-bold text-purple-600">{documentsCount}</p>
                <p className="text-xs text-gray-500 mt-1">Templates</p>
              </div>
              <FileText className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">PM Templates</p>
                <p className="text-2xl font-bold text-orange-600">{pmTemplatesCount}</p>
                <p className="text-xs text-gray-500 mt-1">Active templates</p>
              </div>
              <ClipboardList className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Workflow Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Dropdown Navigation - Similar to Analytics page */}
            <div className="workflow-navigation">
              <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => {
                    setShowTemplatesDropdown(!showTemplatesDropdown);
                    setShowPrioritizationDropdown(false);
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
                    showTemplatesDropdown || activePage === 'unified' || activePage === 'documentation' || activePage === 'pm'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <FileCode className="h-4 w-4" />
                  Templates
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${
                    showTemplatesDropdown ? 'rotate-180' : ''
                  }`} />
                </button>
                <button
                  onClick={() => {
                    setShowPrioritizationDropdown(!showPrioritizationDropdown);
                    setShowTemplatesDropdown(false);
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
                    showPrioritizationDropdown || activePage === 'prioritization'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <BarChart3 className="h-4 w-4" />
                  Prioritization
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${
                    showPrioritizationDropdown ? 'rotate-180' : ''
                  }`} />
                </button>
              </div>

              {/* Templates Dropdown Menu */}
              <div className={`w-full bg-white border border-gray-200 rounded-lg shadow-lg transition-all duration-300 overflow-hidden mt-2 ${
                showTemplatesDropdown ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
              }`}>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={() => {
                        setActivePage('unified');
                        setShowTemplatesDropdown(false);
                      }}
                      className="flex flex-col items-start p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-all"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <FileCode className="w-6 h-6 text-blue-600" />
                        <span className="font-semibold text-gray-900">Survey Templates</span>
                      </div>
                      <p className="text-sm text-gray-600 text-left">
                        Create and manage AI survey templates for your organization
                      </p>
                    </button>

                    <button
                      onClick={() => {
                        setActivePage('documentation');
                        setShowTemplatesDropdown(false);
                      }}
                      className="flex flex-col items-start p-4 border rounded-lg hover:bg-green-50 hover:border-green-200 transition-all"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="w-6 h-6 text-green-600" />
                        <span className="font-semibold text-gray-900">Documentation</span>
                      </div>
                      <p className="text-sm text-gray-600 text-left">
                        Configure document styling, export settings, and preview options
                      </p>
                    </button>

                    <button
                      onClick={() => {
                        setActivePage('pm');
                        setShowTemplatesDropdown(false);
                      }}
                      className="flex flex-col items-start p-4 border rounded-lg hover:bg-purple-50 hover:border-purple-200 transition-all"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <ClipboardList className="w-6 h-6 text-purple-600" />
                        <span className="font-semibold text-gray-900">PM & Solution</span>
                      </div>
                      <p className="text-sm text-gray-600 text-left">
                        Manage story/task patterns and AI solution generation configuration
                      </p>
                    </button>
                  </div>
                </div>
              </div>

              {/* Prioritization Dropdown Menu */}
              <div className={`w-full bg-white border border-gray-200 rounded-lg shadow-lg transition-all duration-300 overflow-hidden mt-2 ${
                showPrioritizationDropdown ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
              }`}>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                    <button
                      onClick={() => {
                        setActivePage('prioritization');
                        setShowPrioritizationDropdown(false);
                      }}
                      className="flex flex-col items-start p-4 border rounded-lg hover:bg-orange-50 hover:border-orange-200 transition-all"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <BarChart3 className="w-6 h-6 text-orange-600" />
                        <span className="font-semibold text-gray-900">Prioritization Models</span>
                      </div>
                      <p className="text-sm text-gray-600 text-left">
                        Configure prioritization frameworks and scoring models for solution estimation
                      </p>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="mt-6">
              {activePage === 'unified' && <UnifiedTemplatesSubpage user={user} />}
              {activePage === 'documentation' && <DocumentationTemplatesSubpage />}
              {activePage === 'pm' && <PMTemplatesSubpage />}
              {activePage === 'prioritization' && <PrioritizationModelsSubpage user={user} />}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


