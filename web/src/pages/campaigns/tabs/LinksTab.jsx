import { Share2, Copy, ExternalLink } from '../../../components/ui/icons.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { campaignUtils } from '../../../utils/campaignsApi.js';
import { useNotifications } from '../../../components/ui/notifications.jsx';

/**
 * Links tab component
 */
export function LinksTab({ surveyLinks, flows }) {
  return (
    <div className="surface card-pad">
      <LinksHeader />
      <LinksContent surveyLinks={surveyLinks} flows={flows} />
    </div>
  );
}

/**
 * Links section header
 */
function LinksHeader() {
  return (
    <h3 className="text-lg font-medium mb-6">Survey Links</h3>
  );
}

/**
 * Links content area
 */
function LinksContent({ surveyLinks, flows }) {
  if (surveyLinks.length === 0) {
    return <EmptyLinksState />;
  }

  return (
    <div className="space-y-4">
      {surveyLinks.map((link) => {
        const flowName = flows.find(f => f.id === link.flow_id)?.title || `Flow ${link.flow_id}`;
        
        return (
          <LinkCard
            key={link.id}
            link={link}
            flowName={flowName}
          />
        );
      })}
    </div>
  );
}

/**
 * Empty links state
 */
function EmptyLinksState() {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Share2 className="w-8 h-8 text-muted-foreground" />
      </div>
      <h4 className="empty-title">No survey links created yet</h4>
      <p className="empty-sub">Create a survey flow first, then generate shareable links</p>
    </div>
  );
}

/**
 * Individual link card component
 */
function LinkCard({ link, flowName }) {
  const surveyUrl = `${window.location.origin}/reply/${link.token}`;
  const { showSuccess } = useNotifications();

  const handleCopyLink = () => {
    campaignUtils.copyLinkToClipboard(link.token);
    showSuccess('Survey link copied to clipboard!');
  };

  const handleOpenLink = () => {
    window.open(surveyUrl, '_blank');
  };

  return (
    <div className="surface card-pad">
      <LinkCardHeader 
        link={link}
        flowName={flowName}
        onCopy={handleCopyLink}
        onOpen={handleOpenLink}
      />
      <LinkUrlDisplay 
        surveyUrl={surveyUrl}
        onCopy={handleCopyLink}
      />
    </div>
  );
}

/**
 * Link card header with info and actions
 */
function LinkCardHeader({ link, flowName, onCopy, onOpen }) {
  return (
    <div className="flex justify-between items-start mb-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-sm">
          <Share2 className="w-5 h-5 text-white" />
        </div>
        <LinkInfo link={link} flowName={flowName} />
      </div>
      <LinkActions onCopy={onCopy} onOpen={onOpen} />
    </div>
  );
}

/**
 * Link information display
 */
function LinkInfo({ link, flowName }) {
  return (
    <div>
      <h4 className="text-lg font-semibold">{flowName}</h4>
      <div className="flex items-center gap-4 mt-1">
        <span className="text-muted-foreground text-sm">
          Created {campaignUtils.formatDate(link.created_at)}
        </span>
        {link.max_uses && (
          <span className="text-muted-foreground text-sm">
            {link.used_count || 0}/{link.max_uses} uses
          </span>
        )}
        {link.expires_at && (
          <span className="text-muted-foreground text-sm">
            Expires {campaignUtils.formatDate(link.expires_at)}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Link action buttons
 */
function LinkActions({ onCopy, onOpen }) {
  return (
    <div className="flex gap-2">
      <Button 
        size="sm" 
        variant="outline"
        onClick={onCopy}
        className="rounded-xl"
      >
        <Copy className="w-4 h-4 mr-1" />
        Copy
      </Button>
      <Button 
        size="sm" 
        onClick={onOpen}
        className="rounded-xl"
      >
        <ExternalLink className="w-4 h-4 mr-1" />
        Open
      </Button>
    </div>
  );
}

/**
 * Link URL display component
 */
function LinkUrlDisplay({ surveyUrl, onCopy }) {
  return (
    <div className="mt-4 p-3 bg-muted/20 rounded-xl border border-dashed border-border/30">
      <h5 className="text-sm font-medium text-muted-foreground mb-2">Survey URL</h5>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-sm text-foreground bg-background px-3 py-2 rounded-lg border text-ellipsis overflow-hidden">
          {surveyUrl}
        </code>
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={onCopy}
          className="flex-shrink-0"
        >
          <Copy className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
