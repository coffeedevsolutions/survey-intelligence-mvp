import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Settings, Share2, BarChart3 } from '../ui/icons';
import { FlowsTab } from './tabs/FlowsTab.jsx';
import { LinksTab } from './tabs/LinksTab.jsx';
import { ResponsesTab } from './tabs/ResponsesTab.jsx';
import { SettingsTab } from './tabs/SettingsTab.jsx';

/**
 * Campaign detail view with tabs
 */
export function CampaignDetailView({
  selectedCampaign,
  flows,
  surveyLinks,
  responses,
  user,
  onCreateFlow,
  onCreateSurveyLink,
  onViewResponseDetails,
  onViewBrief
}) {
  return (
    <div className="flex flex-col space-y-6 p-6">
      <Tabs defaultValue="flows" className="w-full">
        <CampaignTabs />
        
        <TabsContent value="flows" className="mt-6">
          <FlowsTab
            flows={flows}
            user={user}
            campaign={selectedCampaign}
            onCreateFlow={onCreateFlow}
            onCreateSurveyLink={onCreateSurveyLink}
          />
        </TabsContent>

        <TabsContent value="links" className="mt-6">
          <LinksTab
            surveyLinks={surveyLinks}
            flows={flows}
          />
        </TabsContent>

        <TabsContent value="responses" className="mt-6">
          <ResponsesTab
            responses={responses}
            flows={flows}
            onViewDetails={onViewResponseDetails}
            onViewBrief={onViewBrief}
          />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <SettingsTab selectedCampaign={selectedCampaign} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Campaign navigation tabs
 */
function CampaignTabs() {
  return (
    <div className="tabs-shell">
      <TabsList className="w-full bg-transparent gap-2">
        <TabsTrigger value="flows" className="tabs-trigger">
          <Settings className="w-4 h-4 mr-2" />
          Survey Flows
        </TabsTrigger>
        <TabsTrigger value="links" className="tabs-trigger">
          <Share2 className="w-4 h-4 mr-2" />
          Share Links
        </TabsTrigger>
        <TabsTrigger value="responses" className="tabs-trigger">
          <BarChart3 className="w-4 h-4 mr-2" />
          Responses
        </TabsTrigger>
        <TabsTrigger value="settings" className="tabs-trigger">
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </TabsTrigger>
      </TabsList>
    </div>
  );
}
