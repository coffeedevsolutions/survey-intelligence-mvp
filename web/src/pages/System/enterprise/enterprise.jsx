import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth.js';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { LoadingSpinner } from '../../../components/ui/loading-spinner.jsx';
import { 
  Building2, 
  Settings, 
  Shield, 
  CreditCard,
  Users,
  Globe,
  AlertCircle,
  ChevronDown,
  Sparkles
} from '../../../components/ui/icons.jsx';

// Import new enterprise tab components
import { BrandingTab } from '../../settings/enterprise/BrandingTab.jsx';
import { ComplianceTab } from '../../settings/enterprise/ComplianceTab.jsx';
import { UserManagementTab } from '../../settings/enterprise/UserManagementTab.jsx';
import { IntegrationsTab } from '../../settings/enterprise/IntegrationsTab.jsx';
import { useUsers } from '../../../hooks/useUsers.js';
import { useOrganizationSettings } from '../../../hooks/useOrganizationSettings.js';

/**
 * Enterprise Settings Page - High-level organizational configuration
 * Houses organization settings, enterprise policies, and billing
 */
export default function Enterprise() {
  const { user, loading: userLoading } = useAuth();
  const [activePage, setActivePage] = useState('branding');
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [showIntegrationsDropdown, setShowIntegrationsDropdown] = useState(false);
  
  // Fetch organization settings for branding/compliance
  const { settings, loading: settingsLoading, updateSettings, themes } = useOrganizationSettings(user);
  const [formData, setFormData] = useState({});
  
  // Fetch user data for user management
  const {
    users,
    seatInfo,
    invites,
    shareLinks,
    loading: usersLoading,
    updateUserRole,
    deleteUser,
    createInvite,
    createShareLink,
    revokeShareLink
  } = useUsers(user);

  // Update form data when settings load
  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      await updateSettings(formData, null);
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showOrgDropdown && !event.target.closest('.enterprise-navigation')) {
        setShowOrgDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showOrgDropdown]);

  // Loading state
  if (userLoading || settingsLoading || usersLoading) {
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
                <p className="text-2xl font-bold text-green-600">
                  {seatInfo ? `${seatInfo.seats_used}/${seatInfo.seats_total}` : '-'}
                </p>
                <p className="text-xs text-gray-500 mt-1">Active users</p>
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

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Enterprise Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Dropdown Navigation */}
            <div className="enterprise-navigation">
              <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => {
                    setShowOrgDropdown(!showOrgDropdown);
                    setShowIntegrationsDropdown(false);
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
                    showOrgDropdown || activePage === 'branding' || activePage === 'compliance' || activePage === 'users'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Building2 className="h-4 w-4" />
                  Organization
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${
                    showOrgDropdown ? 'rotate-180' : ''
                  }`} />
                </button>

                <button
                  onClick={() => {
                    setActivePage('billing');
                    setShowOrgDropdown(false);
                    setShowIntegrationsDropdown(false);
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
                    activePage === 'billing'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <CreditCard className="h-4 w-4" />
                  Billing
                </button>

                <button
                  onClick={() => {
                    setActivePage('security');
                    setShowOrgDropdown(false);
                    setShowIntegrationsDropdown(false);
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
                    activePage === 'security'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Shield className="h-4 w-4" />
                  Security
                </button>

                <button
                  onClick={() => {
                    setShowIntegrationsDropdown(!showIntegrationsDropdown);
                    setShowOrgDropdown(false);
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
                    showIntegrationsDropdown || activePage === 'integrations'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Globe className="h-4 w-4" />
                  Integrations
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${
                    showIntegrationsDropdown ? 'rotate-180' : ''
                  }`} />
                </button>
              </div>

              {/* Organization Dropdown Menu */}
              <div className={`w-full bg-white border border-gray-200 rounded-lg shadow-lg transition-all duration-300 overflow-hidden mt-2 ${
                showOrgDropdown ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
              }`}>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={() => {
                        setActivePage('branding');
                        setShowOrgDropdown(false);
                      }}
                      className="flex flex-col items-start p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-all"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <Sparkles className="w-6 h-6 text-blue-600" />
                        <span className="font-semibold text-gray-900">Branding</span>
                      </div>
                      <p className="text-sm text-gray-600 text-left">
                        Customize company information, logos, headers, and footers
                      </p>
                    </button>

                    <button
                      onClick={() => {
                        setActivePage('compliance');
                        setShowOrgDropdown(false);
                      }}
                      className="flex flex-col items-start p-4 border rounded-lg hover:bg-green-50 hover:border-green-200 transition-all"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <Shield className="w-6 h-6 text-green-600" />
                        <span className="font-semibold text-gray-900">Compliance</span>
                      </div>
                      <p className="text-sm text-gray-600 text-left">
                        Configure GDPR, data retention, access control, and security policies
                      </p>
                    </button>

                    <button
                      onClick={() => {
                        setActivePage('users');
                        setShowOrgDropdown(false);
                      }}
                      className="flex flex-col items-start p-4 border rounded-lg hover:bg-purple-50 hover:border-purple-200 transition-all"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <Users className="w-6 h-6 text-purple-600" />
                        <span className="font-semibold text-gray-900">User Management</span>
                      </div>
                      <p className="text-sm text-gray-600 text-left">
                        Manage users, invites, share links, and role permissions
                      </p>
                    </button>
                  </div>
                </div>
              </div>

              {/* Integrations Dropdown Menu */}
              <div className={`w-full bg-white border border-gray-200 rounded-lg shadow-lg transition-all duration-300 overflow-hidden mt-2 ${
                showIntegrationsDropdown ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
              }`}>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                    <button
                      onClick={() => {
                        setActivePage('integrations');
                        setShowIntegrationsDropdown(false);
                      }}
                      className="flex flex-col items-start p-4 border rounded-lg hover:bg-indigo-50 hover:border-indigo-200 transition-all"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <Globe className="w-6 h-6 text-indigo-600" />
                        <span className="font-semibold text-gray-900">Jira</span>
                      </div>
                      <p className="text-sm text-gray-600 text-left">
                        Connect with Jira for exporting solutions as epics and stories
                      </p>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="mt-6">
              {activePage === 'branding' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold">Branding Settings</h3>
                    <button 
                      onClick={handleSave}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Save Changes
                    </button>
                  </div>
                  <BrandingTab formData={formData} onInputChange={handleInputChange} />
                </div>
              )}
              
              {activePage === 'compliance' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold">Compliance Settings</h3>
                    <button 
                      onClick={handleSave}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Save Changes
                    </button>
                  </div>
                  <ComplianceTab formData={formData} onInputChange={handleInputChange} />
                </div>
              )}
              
              {activePage === 'users' && (
                <UserManagementTab
                  user={user}
                  users={users}
                  seatInfo={seatInfo}
                  invites={invites}
                  shareLinks={shareLinks}
                  updateUserRole={updateUserRole}
                  deleteUser={deleteUser}
                  createInvite={createInvite}
                  createShareLink={createShareLink}
                  revokeShareLink={revokeShareLink}
                />
              )}

              {activePage === 'billing' && (
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
              )}

              {activePage === 'security' && (
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
              )}

              {activePage === 'integrations' && <IntegrationsTab />}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
