import React, { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth.js';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { LoadingSpinner } from '../../../components/ui/loading-spinner.jsx';
import { 
  FileCode, 
  ClipboardList, 
  Lightbulb, 
  FileText,
  Settings,
  AlertCircle
} from '../../../components/ui/icons.jsx';

// Import existing templates component
import { UnifiedTemplatesTab } from '../../settings/UnifiedTemplatesTab.jsx';

/**
 * Templates Page - All template management in one place
 * Houses survey templates, solution templates, document templates, and PM templates
 */
export default function Templates() {
  const { user, loading: userLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('unified');

  // Loading state
  if (userLoading) {
    return (
      <div className="w-full min-w-0 content-full-width p-6">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
          <span className="ml-3">Loading templates...</span>
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
            <p className="text-gray-600">Please log in to access templates.</p>
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
            <p className="text-gray-600">You need admin privileges to access templates.</p>
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
          <FileCode className="w-8 h-8 text-gray-600" />
          <h1 className="text-3xl font-bold tracking-tight">Template Management</h1>
        </div>
        <p className="text-gray-600 text-lg">
          Create, customize, and manage all your organization's templates
        </p>
      </div>

      {/* Template Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Survey Templates</p>
                <p className="text-2xl font-bold text-blue-600">-</p>
                <p className="text-xs text-gray-500 mt-1">Active templates</p>
              </div>
              <ClipboardList className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Solution Templates</p>
                <p className="text-2xl font-bold text-green-600">-</p>
                <p className="text-xs text-gray-500 mt-1">Active templates</p>
              </div>
              <Lightbulb className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Document Templates</p>
                <p className="text-2xl font-bold text-purple-600">-</p>
                <p className="text-xs text-gray-500 mt-1">Active templates</p>
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
                <p className="text-2xl font-bold text-orange-600">-</p>
                <p className="text-xs text-gray-500 mt-1">Active templates</p>
              </div>
              <Settings className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Template Management Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCode className="w-5 h-5" />
            Template Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="unified" className="flex items-center gap-2">
                <FileCode className="w-4 h-4" />
                Unified Templates
              </TabsTrigger>
              <TabsTrigger value="surveys" className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                Survey Templates
              </TabsTrigger>
              <TabsTrigger value="solutions" className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Solution Templates
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Document Templates
              </TabsTrigger>
            </TabsList>

            <TabsContent value="unified" className="mt-6">
              <UnifiedTemplatesTab user={user} />
            </TabsContent>

            <TabsContent value="surveys" className="mt-6">
              <div className="text-center py-12">
                <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Survey Templates
                </h3>
                <p className="text-gray-600 mb-6">
                  Create and manage custom survey templates for your organization
                </p>
                <Badge variant="outline" className="text-xs">
                  Coming Soon
                </Badge>
              </div>
            </TabsContent>

            <TabsContent value="solutions" className="mt-6">
              <div className="text-center py-12">
                <Lightbulb className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Solution Templates
                </h3>
                <p className="text-gray-600 mb-6">
                  Design and customize solution generation templates
                </p>
                <Badge variant="outline" className="text-xs">
                  Coming Soon
                </Badge>
              </div>
            </TabsContent>

            <TabsContent value="documents" className="mt-6">
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Document Templates
                </h3>
                <p className="text-gray-600 mb-6">
                  Manage document templates for reports and deliverables
                </p>
                <Badge variant="outline" className="text-xs">
                  Coming Soon
                </Badge>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
