import { Button } from '../ui/button';
import { Plus, FileText, BarChart3, CheckCircle2, Users } from '../ui/icons';
import { CampaignCard } from './CampaignCard.jsx';
import { CampaignStats } from './CampaignStats.jsx';

/**
 * Main campaigns list component
 */
export function CampaignsList({ 
  campaigns, 
  user, 
  onSelectCampaign, 
  onCreateCampaign,
  onArchiveCampaign 
}) {
  if (campaigns.length === 0) {
    return <EmptyState user={user} onCreateCampaign={onCreateCampaign} />;
  }

  return (
    <>
      <CampaignStats campaigns={campaigns} />
      <CampaignsGrid 
        campaigns={campaigns} 
        onSelectCampaign={onSelectCampaign}
        onArchiveCampaign={onArchiveCampaign}
        user={user} 
      />
    </>
  );
}

/**
 * Empty state component
 */
function EmptyState({ user, onCreateCampaign }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <FileText className="w-10 h-10 text-muted-foreground" />
      </div>
      <h3 className="empty-title">No campaigns yet</h3>
      <p className="empty-sub mb-8">
        Create your first survey campaign to get started collecting responses and generating briefs
      </p>
      {user.role === 'admin' && (
        <Button 
          onClick={onCreateCampaign}
          className="rounded-xl"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Your First Campaign
        </Button>
      )}
    </div>
  );
}

/**
 * Campaigns grid component
 */
function CampaignsGrid({ campaigns, onSelectCampaign, onArchiveCampaign, user }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
      {campaigns.map((campaign) => (
        <CampaignCard
          key={campaign.id}
          campaign={campaign}
          onClick={() => onSelectCampaign(campaign)}
          onArchive={onArchiveCampaign}
          user={user}
        />
      ))}
    </div>
  );
}
