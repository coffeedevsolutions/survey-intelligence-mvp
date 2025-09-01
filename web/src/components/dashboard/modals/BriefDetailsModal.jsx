import { Button } from '../../ui/button';
import { EnhancedDownloadButton } from '../../ui/enhanced-download';

/**
 * Brief Response Details Modal component
 */
export function BriefDetailsModal({ 
  isOpen, 
  selectedBrief, 
  briefResponseDetails, 
  loading, 
  onClose 
}) {
  if (!isOpen || !selectedBrief) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Brief Response Details</h2>
            <p className="text-sm text-muted-foreground text-gray-900 dark:text-white">
              {selectedBrief.title || 'Untitled Brief'} - Brief #{selectedBrief.id}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <EnhancedDownloadButton
              briefId={selectedBrief?.id}
              orgId={selectedBrief?.org_id}
              briefContent={selectedBrief?.summary_md}
              sessionId={selectedBrief?.session_id}
              variant="outline"
              size="sm"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="rounded-xl text-gray-900 dark:text-white"
            >
              ✕
            </Button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Loading response details...</p>
            </div>
          ) : briefResponseDetails ? (
            <div className="space-y-6">
              {/* Response Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="surface card-pad">
                  <h4 className="font-medium text-foreground mb-1">Campaign</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedBrief.campaign_name || 'Unknown Campaign'}
                  </p>
                </div>
                <div className="surface card-pad">
                  <h4 className="font-medium text-foreground mb-1">Answers</h4>
                  <p className="text-sm text-muted-foreground">
                    {briefResponseDetails.answers?.length || 0} responses
                  </p>
                </div>
                <div className="surface card-pad">
                  <h4 className="font-medium text-foreground mb-1">Review Status</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedBrief.review_status === 'pending' ? '🟡 Pending Review' : '✅ Reviewed'}
                  </p>
                </div>
              </div>

              {/* Answers */}
              <div className="surface card-pad">
                <h4 className="font-medium text-foreground mb-4">Survey Answers</h4>
                <div className="space-y-4">
                  {briefResponseDetails.answers?.map((answer, index) => (
                    <div key={index} className="border-l-2 border-primary/20 pl-4">
                      <h5 className="font-medium text-sm text-foreground mb-2">
                        Question {index + 1}: {answer.question_text || `Question ${answer.question_id}`}
                      </h5>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {answer.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Extracted Facts */}
              {briefResponseDetails.facts && Object.keys(briefResponseDetails.facts).length > 0 && (
                <div className="surface card-pad">
                  <h4 className="font-medium text-foreground mb-4">Extracted Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(briefResponseDetails.facts).map(([key, value]) => (
                      <div key={key} className="bg-muted/20 p-3 rounded-lg">
                        <h5 className="font-medium text-xs text-muted-foreground uppercase mb-1">
                          {key.replace(/_/g, ' ')}
                        </h5>
                        <p className="text-sm text-foreground">
                          {value || 'Not provided'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Failed to load response details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
