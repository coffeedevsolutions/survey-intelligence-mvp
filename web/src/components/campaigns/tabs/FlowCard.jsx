import { Button } from '../../ui/button';
import { Settings, Share2 } from '../../ui/icons';

/**
 * Individual flow card component
 */
export function FlowCard({ flow, onCreateSurveyLink }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow duration-200 h-full flex flex-col">
      <FlowCardHeader flow={flow} onCreateSurveyLink={onCreateSurveyLink} />
      <FlowSpecPreview flow={flow} />
    </div>
  );
}

/**
 * Flow card header with info and actions
 */
function FlowCardHeader({ flow, onCreateSurveyLink }) {
  return (
    <div className="flex justify-between items-start mb-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
          <Settings className="w-5 h-5 text-white" />
        </div>
        <FlowInfo flow={flow} />
      </div>
      <Button 
        size="sm" 
        onClick={() => onCreateSurveyLink(flow.id)}
        className="rounded-xl"
      >
        <Share2 className="w-4 h-4 mr-2" />
        Create Link
      </Button>
    </div>
  );
}

/**
 * Flow information display
 */
function FlowInfo({ flow }) {
  return (
    <div>
      <h4 className="text-lg font-semibold">
        {flow.title} <span className="text-muted-foreground text-sm font-normal">(v{flow.version})</span>
      </h4>
      <div className="flex items-center gap-4 mt-1">
        <span className="text-muted-foreground text-sm">
          {flow.spec_json.questions?.length || 0} questions
        </span>
        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${flow.use_ai ? 'bg-blue-500' : 'bg-muted-foreground'}`}></div>
          <span className="text-muted-foreground text-sm">
            AI {flow.use_ai ? 'enabled' : 'disabled'}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Flow specification preview
 */
function FlowSpecPreview({ flow }) {
  return (
    <div className="mt-4 p-4 bg-muted/20 rounded-xl border border-dashed border-border/30">
      <h5 className="text-sm font-medium text-muted-foreground mb-2">Flow Configuration</h5>
      <div className="max-h-32 overflow-y-auto">
        <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
          {JSON.stringify(flow.spec_json, null, 2)}
        </pre>
      </div>
    </div>
  );
}
