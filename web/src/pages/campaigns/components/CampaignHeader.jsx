import { Button } from '../../../components/ui/button';
import { Plus, BarChart3, FileText, ArrowLeft, CheckCircle2, XCircle } from '../../../components/ui/icons';

/**
 * Campaign page header component
 */
export function CampaignHeader({ 
  user, 
  selectedCampaign = null, 
  onBack, 
  onCreateCampaign 
}) {
  if (selectedCampaign) {
    return (
      <CampaignDetailHeader 
        campaign={selectedCampaign}
        onBack={onBack}
      />
    );
  }

  return (
    <CampaignListHeader 
      user={user}
      onCreateCampaign={onCreateCampaign}
    />
  );
}

/**
 * Header for campaign list view
 */
function CampaignListHeader({ user, onCreateCampaign }) {
  return (
    <div className="page-header">
      <div className="page-header-inner">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-primary text-primary-foreground grid place-items-center shadow-lg">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Campaigns</h1>
            <p className="text-sm text-muted-foreground">Create and manage survey campaigns</p>
          </div>
        </div>

        {user.role === 'admin' && (
          <Button 
            size="lg" 
            onClick={onCreateCampaign}
            className="rounded-xl"
          >
            <Plus className="w-5 h-5 mr-2" /> New Campaign
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Header for campaign detail view
 */
function CampaignDetailHeader({ campaign, onBack }) {
  const statusIcon = campaign.is_active ? CheckCircle2 : XCircle;
  const StatusIcon = statusIcon;

  return (
    <div className="page-header">
      <div className="page-header-inner">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onBack} 
            className="rounded-xl"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div className="w-11 h-11 rounded-2xl bg-primary text-primary-foreground grid place-items-center shadow-lg">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{campaign.name}</h1>
            <p className="text-sm text-muted-foreground">{campaign.purpose}</p>
          </div>
        </div>

        <div className="toolbar">
          <span className={`status-dot ${campaign.is_active ? 'bg-green-500' : 'bg-muted-foreground/60'}`} />
          <span className="chip">
            <StatusIcon className="w-4 h-4" /> 
            {campaign.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
    </div>
  );
}
