import { BarChart3, Users } from '../../ui/icons';
import { ResponseCard } from './ResponseCard.jsx';

/**
 * Responses tab component
 */
export function ResponsesTab({ 
  responses, 
  flows,
  onViewDetails, 
  onViewBrief 
}) {
  return (
    <div className="surface card-pad">
      <ResponsesHeader responses={responses} />
      <ResponsesContent 
        responses={responses}
        flows={flows}
        onViewDetails={onViewDetails}
        onViewBrief={onViewBrief}
      />
    </div>
  );
}

/**
 * Responses section header
 */
function ResponsesHeader({ responses }) {
  return (
    <div className="flex justify-between items-center mb-6">
      <div>
        <h3 className="text-lg font-medium">Survey Responses</h3>
        <p className="text-sm text-muted-foreground">
          {responses.length} response{responses.length !== 1 ? 's' : ''} collected
        </p>
      </div>
    </div>
  );
}

/**
 * Responses content area
 */
function ResponsesContent({ responses, flows, onViewDetails, onViewBrief }) {
  if (responses.length === 0) {
    return <EmptyResponsesState />;
  }

  return (
    <div className="space-y-4">
      {responses.map((response) => {
        const flowName = flows.find(f => f.id === response.flow_id)?.title || `Flow ${response.flow_id}`;
        
        return (
          <ResponseCard
            key={response.id}
            response={response}
            flowName={flowName}
            onViewDetails={onViewDetails}
            onViewBrief={onViewBrief}
          />
        );
      })}
    </div>
  );
}

/**
 * Empty responses state
 */
function EmptyResponsesState() {
  return (
    <div className="empty">
      <div className="empty-icon">
        <BarChart3 className="w-8 h-8 text-muted-foreground" />
      </div>
      <h4 className="empty-title">No responses yet</h4>
      <p className="empty-sub">Responses will appear here once people complete your survey</p>
    </div>
  );
}
