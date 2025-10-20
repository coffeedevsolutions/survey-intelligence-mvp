import React, { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth.js';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { LoadingSpinner } from '../../../components/ui/loading-spinner.jsx';
import { 
  Building2, 
  Settings, 
  Shield, 
  CreditCard,
  Users,
  Globe,
  AlertCircle
} from '../../../components/ui/icons.jsx';

// Import existing organization settings component
import { OrganizationSettingsTab } from '../../settings/OrganizationSettingsTab.jsx';

/**
 * Enterprise Settings Page - High-level organizational configuration
 * Houses organization settings, enterprise policies, and billing
 */
export default function Enterprise() {
  const { user, loading: userLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('organization');

  // Loading state
  if (userLoading) {
    return (
      <div className="w-full min-w-0 content-full-width p-6">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
          <span className="ml-3">Loading enterprise settings...</span>
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
            <p className="text-gray-600">Please log in to access enterprise settings.</p>
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
            <p className="text-gray-600">You need admin privileges to access enterprise settings.</p>
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
          <Building2 className="w-8 h-8 text-gray-600" />
          <h1 className="text-3xl font-bold tracking-tight">Enterprise Settings</h1>
        </div>
        <p className="text-gray-600 text-lg">
          Manage enterprise-level configurations, organization settings, and billing
        </p>
      </div>

      {/* Enterprise Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Organization</p>
                <p className="text-2xl font-bold text-blue-600">Active</p>
                <p className="text-xs text-gray-500 mt-1">Status</p>
              </div>
              <Building2 className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Users</p>
                <p className="text-2xl font-bold text-green-600">-</p>
                <p className="text-xs text-gray-500 mt-1">Total users</p>
              </div>
              <Users className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Billing</p>
                <p className="text-2xl font-bold text-purple-600">-</p>
                <p className="text-xs text-gray-500 mt-1">Plan status</p>
              </div>
              <CreditCard className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Security</p>
                <p className="text-2xl font-bold text-orange-600">-</p>
                <p className="text-xs text-gray-500 mt-1">Policies active</p>
              </div>
              <Shield className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enterprise Settings Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Enterprise Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="organization" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Organization
              </TabsTrigger>
              <TabsTrigger value="billing" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Billing
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Security
              </TabsTrigger>
              <TabsTrigger value="integrations" className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Integrations
              </TabsTrigger>
            </TabsList>

            <TabsContent value="organization" className="mt-6">
              <OrganizationSettingsTab user={user} />
            </TabsContent>

            <TabsContent value="billing" className="mt-6">
              <div className="text-center py-12">
                <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Billing & Subscription
                </h3>
                <p className="text-gray-600 mb-6">
                  Manage your subscription, billing information, and usage limits
                </p>
                <Badge variant="outline" className="text-xs">
                  Coming Soon
                </Badge>
              </div>
            </TabsContent>

            <TabsContent value="security" className="mt-6">
              <div className="text-center py-12">
                <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Security Policies
                </h3>
                <p className="text-gray-600 mb-6">
                  Configure enterprise security policies, SSO, and access controls
                </p>
                <Badge variant="outline" className="text-xs">
                  Coming Soon
                </Badge>
              </div>
            </TabsContent>

            <TabsContent value="integrations" className="mt-6">
              <div className="text-center py-12">
                <Globe className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Enterprise Integrations
                </h3>
                <p className="text-gray-600 mb-6">
                  Manage enterprise-level integrations and API configurations
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
