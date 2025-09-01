import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Users, Calendar, Clock, Eye, FileText, Download } from '../../ui/icons';
import { campaignUtils } from '../../../utils/campaignsApi.js';
import { useNotifications } from '../../ui/notifications.jsx';
import { useAuth } from '../../../hooks/useAuth.js';

/**
 * Individual response card component
 */
export function ResponseCard({ 
  response, 
  flowName, 
  onViewDetails, 
  onViewBrief 
}) {
  return (
    <div className="surface card-pad">
      <ResponseCardHeader 
        response={response}
        flowName={flowName}
      />
      <ResponseCardFooter 
        response={response}
        onViewDetails={onViewDetails}
        onViewBrief={onViewBrief}
      />
    </div>
  );
}

/**
 * Response card header with info and badges
 */
function ResponseCardHeader({ response, flowName }) {
  return (
    <div className="flex justify-between items-start mb-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-sm">
          <Users className="w-5 h-5 text-white" />
        </div>
        <ResponseInfo response={response} flowName={flowName} />
      </div>
      <ResponseBadges response={response} />
    </div>
  );
}

/**
 * Response information display
 */
function ResponseInfo({ response, flowName }) {
  return (
    <div>
      <h4 className="text-lg font-semibold">Response #{response.id.slice(-8)}</h4>
      <div className="flex items-center gap-4 mt-1">
        <span className="text-muted-foreground text-sm">
          {flowName}
        </span>
        <span className="text-muted-foreground text-sm">
          {response.answer_count} answers
        </span>
        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${response.completed ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
          <span className="text-muted-foreground text-sm">
            {response.completed ? 'Completed' : 'In Progress'}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Response status badges
 */
function ResponseBadges({ response }) {
  return (
    <div className="flex items-center gap-2">
      {response.has_brief && (
        <Badge variant="secondary" className="text-xs">
          Brief Generated
        </Badge>
      )}
      <Badge variant="outline" className="text-xs">
        {campaignUtils.formatDate(response.created_at)}
      </Badge>
    </div>
  );
}

/**
 * Response card footer with metadata and actions
 */
function ResponseCardFooter({ response, onViewDetails, onViewBrief }) {
  return (
    <div className="flex items-center justify-between pt-2 border-t border-border/50">
      <ResponseMetadata response={response} />
      <ResponseActions 
        response={response}
        onViewDetails={onViewDetails}
        onViewBrief={onViewBrief}
      />
    </div>
  );
}

/**
 * Response metadata display
 */
function ResponseMetadata({ response }) {
  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <div className="flex items-center gap-1">
        <Calendar className="w-3 h-3" />
        <span>Started {campaignUtils.formatDate(response.created_at)}</span>
      </div>
      {response.last_answer_at && (
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>Last activity {campaignUtils.formatDate(response.last_answer_at)}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Response action buttons
 */
function ResponseActions({ response, onViewDetails, onViewBrief }) {
  const { showError } = useNotifications();
  const { user } = useAuth();
  
  const handleViewBrief = async () => {
    try {
      await onViewBrief(response);
    } catch (error) {
      showError(error.message);
    }
  };

  const handleDownloadBrief = async () => {
    try {
      // Get brief content and download as markdown
      const briefData = await campaignUtils.getBrief(user.orgId, response.id);
      const briefContent = briefData.summary_md || briefData.briefMarkdown;
      campaignUtils.downloadBrief(briefContent, response.id);
    } catch (error) {
      showError('Failed to download brief: ' + error.message);
    }
  };

  return (
    <div className="flex gap-2">
      <Button 
        size="sm" 
        variant="outline" 
        className="rounded-xl"
        onClick={() => onViewDetails(response)}
      >
        <Eye className="w-4 h-4 mr-1" />
        View Details
      </Button>
      {response.has_brief && (
        <>
          <Button 
            size="sm" 
            className="rounded-xl"
            onClick={handleViewBrief}
          >
            <FileText className="w-4 h-4 mr-1" />
            View Brief
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            className="rounded-xl"
            onClick={handleDownloadBrief}
          >
            <Download className="w-4 h-4 mr-1" />
            Download
          </Button>
        </>
      )}
    </div>
  );
}
