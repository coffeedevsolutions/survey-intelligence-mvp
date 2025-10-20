import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth.js';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { LoadingSpinner } from '../../../components/ui/loading-spinner.jsx';
import { 
  Archive, 
  FileText, 
  Megaphone, 
  ClipboardList,
  Lightbulb,
  AlertCircle,
  Filter,
  X
} from '../../../components/ui/icons.jsx';
import { useArchive } from '../../../hooks/useArchive.js';

// Import existing archive components
import { ArchivedSurveysTab } from '../../settings/admin/ArchivedSurveysTab.jsx';
import { ArchivedCampaignsTab } from '../../settings/admin/ArchivedCampaignsTab.jsx';

/**
 * Archive Page - Centralized archive management
 * Houses archived surveys, campaigns, documents, and solutions
 */
export default function ArchivePage() {
  const { user, loading: userLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('campaigns');
  const [showFilters, setShowFilters] = useState(false);
  const [campaignCount, setCampaignCount] = useState(0);
  const [surveyCount, setSurveyCount] = useState(0);
  const [totalResponses, setTotalResponses] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const { getArchivedSessions, getArchivedCampaigns } = useArchive(user);

  const fetchArchiveData = useCallback(async () => {
    if (!user?.orgId) return;
    
    setLoading(true);
    try {
      // Fetch both surveys and campaigns data
      const [sessions, campaigns] = await Promise.all([
        getArchivedSessions(),
        getArchivedCampaigns()
      ]);

      // Update survey metrics
      const surveyCount = sessions?.length || 0;
      const totalResponses = sessions?.reduce((sum, session) => sum + (session.answer_count || 0), 0) || 0;
      setSurveyCount(surveyCount);
      setTotalResponses(totalResponses);

      // Update campaign metrics
      const campaignCount = campaigns?.length || 0;
      const totalSessions = campaigns?.reduce((sum, campaign) => sum + (campaign.survey_count || 0), 0) || 0;
      setCampaignCount(campaignCount);
      setTotalSessions(totalSessions);

    } catch (error) {
      console.error('Failed to fetch archive data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.orgId, getArchivedSessions, getArchivedCampaigns]);

  useEffect(() => {
    fetchArchiveData();
  }, [fetchArchiveData]);

  const getActiveFilterCount = () => {
    return 0; // Placeholder - individual tabs will handle their own filter counts
  };

  const clearAllFilters = () => {
    // Placeholder - individual tabs will handle their own filter clearing
  };

  const handleCountUpdate = (type, count, additionalData = {}) => {
    if (type === 'campaigns') {
      setCampaignCount(count);
      if (additionalData.totalSessions) {
        setTotalSessions(additionalData.totalSessions);
      }
    } else if (type === 'surveys') {
      setSurveyCount(count);
      if (additionalData.totalResponses) {
        setTotalResponses(additionalData.totalResponses);
      }
    }
  };

  // Loading state
  if (userLoading || loading) {
    return (
      <div className="w-full min-w-0 content-full-width p-6">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
          <span className="ml-3">Loading archive...</span>
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
            <p className="text-gray-600">Please log in to access the archive.</p>
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
            <p className="text-gray-600">You need admin privileges to access the archive.</p>
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
          <Archive className="w-8 h-8 text-gray-600" />
          <h1 className="text-3xl font-bold tracking-tight">Archive Management</h1>
        </div>
        <p className="text-gray-600 text-lg">
          Manage and restore archived surveys, campaigns, documents, and solutions
        </p>
      </div>

      {/* Archive Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Archived Surveys</p>
                <p className="text-2xl font-bold text-blue-600">{surveyCount}</p>
                <p className="text-xs text-gray-500 mt-1">{totalResponses} total responses</p>
              </div>
              <ClipboardList className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Archived Campaigns</p>
                <p className="text-2xl font-bold text-green-600">{campaignCount}</p>
                <p className="text-xs text-gray-500 mt-1">{totalSessions} total sessions</p>
              </div>
              <Megaphone className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Archived</p>
                <p className="text-2xl font-bold text-purple-600">{campaignCount + surveyCount}</p>
                <p className="text-xs text-gray-500 mt-1">Campaigns + Surveys</p>
              </div>
              <Archive className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Archive Health</p>
                <p className="text-2xl font-bold text-orange-600">
                  {campaignCount + surveyCount > 0 ? 'Active' : 'Empty'}
                </p>
                <p className="text-xs text-gray-500 mt-1">Storage status</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Tab Navigation */}
      <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden mb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="w-full justify-start px-2 bg-gray-50/50 border-b border-gray-200 h-14">
            <TabsTrigger 
              value="campaigns" 
              className="flex items-center gap-2 px-4 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <Megaphone className="w-4 h-4" />
              Campaigns
              <Badge variant="secondary" className="ml-1 text-xs bg-blue-100 text-blue-700">
                {campaignCount}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="surveys" 
              className="flex items-center gap-2 px-4 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <ClipboardList className="w-4 h-4" />
              Surveys
              <Badge variant="secondary" className="ml-1 text-xs bg-green-100 text-green-700">
                {surveyCount}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="documents" 
              className="flex items-center gap-2 px-4 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Documents
              <Badge variant="secondary" className="ml-1 text-xs bg-gray-100 text-gray-700">
                0
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="solutions" 
              className="flex items-center gap-2 px-4 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <Lightbulb className="w-4 h-4" />
              Solutions
              <Badge variant="secondary" className="ml-1 text-xs bg-gray-100 text-gray-700">
                0
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tab Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsContent value="campaigns">
          <ArchivedCampaignsTab 
            user={user} 
            onRefresh={() => {}} 
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            getActiveFilterCount={getActiveFilterCount}
            clearAllFilters={clearAllFilters}
            onCountUpdate={handleCountUpdate}
          />
        </TabsContent>

        <TabsContent value="surveys">
          <ArchivedSurveysTab 
            user={user} 
            onRefresh={() => {}} 
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            getActiveFilterCount={getActiveFilterCount}
            clearAllFilters={clearAllFilters}
            onCountUpdate={handleCountUpdate}
          />
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Archived Documents
              </h3>
              <p className="text-gray-500 mb-4">
                Document archiving functionality will be available soon.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="solutions">
          <Card>
            <CardContent className="text-center py-12">
              <Lightbulb className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Archived Solutions
              </h3>
              <p className="text-gray-500 mb-4">
                Solution archiving functionality will be available soon.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
