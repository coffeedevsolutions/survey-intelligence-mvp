import { FileText, Calendar, ArrowLeft, Archive } from '../../../components/ui/icons.jsx';
import { campaignUtils } from '../../../utils/campaignsApi.js';

/**
 * Individual campaign card component
 */
export function CampaignCard({ campaign, onClick, onArchive, user }) {
  const statusInfo = campaignUtils.getStatusInfo(campaign.is_active);

  const handleArchiveClick = (e) => {
    e.stopPropagation(); // Prevent card click
    if (onArchive) {
      onArchive(campaign);
    }
  };

  return (
    <div className="campaign-tile group cursor-pointer">
      <div onClick={onClick}>
        <CampaignCardHeader campaign={campaign} statusInfo={statusInfo} />
        <CampaignCardContent campaign={campaign} />
        <CampaignCardFooter campaign={campaign} />
      </div>
      {user?.role === 'admin' && onArchive && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <button
            onClick={handleArchiveClick}
            className="flex items-center gap-2 text-xs text-red-600 hover:text-red-700 transition-colors"
          >
            <Archive className="w-3 h-3" />
            Archive Campaign
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Campaign card header with icon and status
 */
function CampaignCardHeader({ campaign, statusInfo }) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="campaign-title group-hover:text-blue-700 transition-colors">
            {campaign.name}
          </h3>
          <p className="campaign-sub">{campaign.slug}</p>
        </div>
      </div>
      <div className="chip">
        <span className={`status-dot ${statusInfo.color}`} />
        {statusInfo.text}
      </div>
    </div>
  );
}

/**
 * Campaign card content
 */
function CampaignCardContent({ campaign }) {
  return (
    <p className="text-muted-foreground text-sm leading-relaxed mb-4 line-clamp-2">
      {campaign.purpose}
    </p>
  );
}

/**
 * Campaign card footer with metadata
 */
function CampaignCardFooter({ campaign }) {
  return (
    <div className="flex items-center justify-between text-xs text-muted-foreground">
      <div className="flex items-center gap-1">
        <Calendar className="w-3 h-3" />
        Created {campaignUtils.formatDate(campaign.created_at)}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowLeft className="w-3 h-3 rotate-180 group-hover:translate-x-1 transition-transform" />
        <span>View Details</span>
      </div>
    </div>
  );
}
