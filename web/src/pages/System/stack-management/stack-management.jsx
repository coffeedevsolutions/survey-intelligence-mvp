import React, { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth.js';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { LoadingSpinner } from '../../../components/ui/loading-spinner.jsx';
import { 
  Layers, 
  Settings, 
  Shield, 
  Zap,
  AlertCircle
} from '../../../components/ui/icons.jsx';

// Import existing stack management component
import { StackTab } from '../../settings/admin/StackTab.jsx';

/**
 * Stack Management Page - Technical stack and system management
 * Houses current stack management functionality and system integrations
 */
export default function StackManagement() {
  const { user, loading: userLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('stack');

  // Loading state
  if (userLoading) {
    return (
      <div className="w-full min-w-0 content-full-width p-6">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
          <span className="ml-3">Loading stack management...</span>
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
            <p className="text-gray-600">Please log in to access stack management.</p>
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
            <p className="text-gray-600">You need admin privileges to access stack management.</p>
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
          <Layers className="w-8 h-8 text-gray-600" />
          <h1 className="text-3xl font-bold tracking-tight">Stack Management</h1>
        </div>
        <p className="text-gray-600 text-lg">
          Manage your technical stack, systems, capabilities, and policies
        </p>
      </div>

      {/* Stack Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Systems</p>
                <p className="text-2xl font-bold text-blue-600">-</p>
                <p className="text-xs text-gray-500 mt-1">Total systems</p>
              </div>
              <Layers className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Capabilities</p>
                <p className="text-2xl font-bold text-green-600">-</p>
                <p className="text-xs text-gray-500 mt-1">Total capabilities</p>
              </div>
              <Zap className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Policies</p>
                <p className="text-2xl font-bold text-purple-600">-</p>
                <p className="text-xs text-gray-500 mt-1">Active policies</p>
              </div>
              <Shield className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Integrations</p>
                <p className="text-2xl font-bold text-orange-600">-</p>
                <p className="text-xs text-gray-500 mt-1">Connected systems</p>
              </div>
              <Settings className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stack Management Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Stack Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="stack" className="flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Stack Management
              </TabsTrigger>
              <TabsTrigger value="integrations" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Integrations
              </TabsTrigger>
              <TabsTrigger value="monitoring" className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Monitoring
              </TabsTrigger>
            </TabsList>

            <TabsContent value="stack" className="mt-6">
              <StackTab
                stackData={{ systems: [], capabilities: [], policies: [] }}
                loading={false}
                onAddSystem={() => {}}
                onEditSystem={() => {}}
                onDeleteSystem={() => {}}
                onAddCapability={() => {}}
                onEditCapability={() => {}}
                onDeleteCapability={() => {}}
                onAddPolicy={() => {}}
                onEditPolicy={() => {}}
                onDeletePolicy={() => {}}
              />
            </TabsContent>

            <TabsContent value="integrations" className="mt-6">
              <div className="text-center py-12">
                <Settings className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  System Integrations
                </h3>
                <p className="text-gray-600 mb-6">
                  Manage integrations with external systems and APIs
                </p>
                <Badge variant="outline" className="text-xs">
                  Coming Soon
                </Badge>
              </div>
            </TabsContent>

            <TabsContent value="monitoring" className="mt-6">
              <div className="text-center py-12">
                <Zap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  System Monitoring
                </h3>
                <p className="text-gray-600 mb-6">
                  Monitor system health, performance, and usage metrics
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
