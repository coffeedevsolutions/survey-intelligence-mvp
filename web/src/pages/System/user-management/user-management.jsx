import React, { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth.js';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { LoadingSpinner } from '../../../components/ui/loading-spinner.jsx';
import { 
  Users, 
  UserPlus, 
  Share2, 
  Shield,
  AlertCircle
} from '../../../components/ui/icons.jsx';

// Import existing user management components
import { UsersTab } from '../../settings/users/UsersTab.jsx';
import { InvitesTab } from '../../settings/users/InvitesTab.jsx';
import { SharesTab } from '../../settings/users/SharesTab.jsx';

/**
 * User Management Page - Complete user administration
 * Houses user management, invites, share links, and role management
 */
export default function UserManagement() {
  const { user, loading: userLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('users');

  // Loading state
  if (userLoading) {
    return (
      <div className="w-full min-w-0 content-full-width p-6">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
          <span className="ml-3">Loading user management...</span>
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
            <p className="text-gray-600">Please log in to access user management.</p>
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
            <p className="text-gray-600">You need admin privileges to access user management.</p>
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
          <Users className="w-8 h-8 text-gray-600" />
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        </div>
        <p className="text-gray-600 text-lg">
          Manage users, invites, share links, and access permissions
        </p>
      </div>

      {/* User Management Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-blue-600">-</p>
                <p className="text-xs text-gray-500 mt-1">Total users</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Invites</p>
                <p className="text-2xl font-bold text-green-600">-</p>
                <p className="text-xs text-gray-500 mt-1">Awaiting response</p>
              </div>
              <UserPlus className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Share Links</p>
                <p className="text-2xl font-bold text-purple-600">-</p>
                <p className="text-xs text-gray-500 mt-1">Active links</p>
              </div>
              <Share2 className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Admin Users</p>
                <p className="text-2xl font-bold text-orange-600">-</p>
                <p className="text-xs text-gray-500 mt-1">With admin access</p>
              </div>
              <Shield className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Management Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            User Administration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="invites" className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Invites
              </TabsTrigger>
              <TabsTrigger value="shares" className="flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                Share Links
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="mt-6">
              <UsersTab
                users={[]} // This will need to be passed from parent or fetched here
                seatInfo={{}}
                onUpdateUserRole={() => {}}
                onDeleteUser={() => {}}
                onCreateInvite={() => {}}
                currentUser={user}
              />
            </TabsContent>

            <TabsContent value="invites" className="mt-6">
              <InvitesTab invites={[]} />
            </TabsContent>

            <TabsContent value="shares" className="mt-6">
              <SharesTab
                shareLinks={[]}
                onCreateShareLink={() => {}}
                onRevokeShareLink={() => {}}
                user={user}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
