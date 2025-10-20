import { useState } from 'react';
import { Button } from '../../../components/ui/button.jsx';
import { Plus, Settings, Share2 } from '../../../components/ui/icons.jsx';
import { FlowCard } from './FlowCard.jsx';
import { CreateFlowForm } from './CreateFlowForm.jsx';

/**
 * Flows tab component
 */
export function FlowsTab({ 
  flows, 
  user, 
  campaign,
  onCreateFlow, 
  onCreateSurveyLink 
}) {
  const [showCreateFlow, setShowCreateFlow] = useState(false);

  const handleCreateFlow = async (flowData) => {
    const success = await onCreateFlow(flowData);
    if (success) {
      setShowCreateFlow(false);
    }
    return success;
  };

  return (
    <div className="w-full">
      <FlowsHeader 
        user={user}
        onShowCreateFlow={() => setShowCreateFlow(true)}
      />
      
      {showCreateFlow && (
        <div className="mb-6">
          <CreateFlowForm
            onSubmit={handleCreateFlow}
            onCancel={() => setShowCreateFlow(false)}
            user={user}
            campaign={campaign}
          />
        </div>
      )}
      
      <FlowsContent 
        flows={flows}
        onCreateSurveyLink={onCreateSurveyLink}
      />
    </div>
  );
}

/**
 * Flows section header
 */
function FlowsHeader({ user, onShowCreateFlow }) {
  return (
    <div className="flex justify-between items-center mb-6">
      <div>
        <h3 className="text-xl font-semibold text-foreground mb-1">Survey Flows</h3>
        <p className="text-muted-foreground text-sm">Manage question flows and survey logic</p>
      </div>
      {user.role === 'admin' && (
        <Button 
          onClick={onShowCreateFlow}
          className="rounded-xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Flow
        </Button>
      )}
    </div>
  );
}

/**
 * Flows content area
 */
function FlowsContent({ flows, onCreateSurveyLink }) {
  if (flows.length === 0) {
    return <EmptyFlowsState />;
  }

  return (
    <div className="space-y-4">
      {flows.map((flow) => (
        <FlowCard
          key={flow.id}
          flow={flow}
          onCreateSurveyLink={onCreateSurveyLink}
        />
      ))}
    </div>
  );
}

/**
 * Empty flows state
 */
function EmptyFlowsState() {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Settings className="w-8 h-8 text-muted-foreground" />
      </div>
      <h4 className="empty-title">No survey flows yet</h4>
      <p className="empty-sub mb-6">Create your first flow to start collecting responses</p>
    </div>
  );
}
