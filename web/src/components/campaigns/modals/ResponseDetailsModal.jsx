import { Button } from '../../ui/button';

/**
 * Response details modal component
 */
export function ResponseDetailsModal({
  isOpen,
  selectedResponse,
  responseDetails,
  loading,
  onClose
}) {
  if (!isOpen || !selectedResponse) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700">
        <ModalHeader selectedResponse={selectedResponse} onClose={onClose} />
        <ModalContent 
          loading={loading}
          responseDetails={responseDetails}
          selectedResponse={selectedResponse}
        />
      </div>
    </div>
  );
}

/**
 * Modal header component
 */
function ModalHeader({ selectedResponse, onClose }) {
  return (
    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Response Details</h2>
        <p className="text-sm text-muted-foreground text-gray-900 dark:text-white">
          Response #{selectedResponse?.id.slice(-8)}
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="rounded-xl text-gray-900 dark:text-white"
      >
        ✕
      </Button>
    </div>
  );
}

/**
 * Modal content component
 */
function ModalContent({ loading, responseDetails, selectedResponse }) {
  return (
    <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
      {loading ? (
        <LoadingState />
      ) : responseDetails ? (
        <ResponseDetailsContent 
          responseDetails={responseDetails}
          selectedResponse={selectedResponse}
        />
      ) : (
        <ErrorState />
      )}
    </div>
  );
}

/**
 * Loading state component
 */
function LoadingState() {
  return (
    <div className="text-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
      <p>Loading response details...</p>
    </div>
  );
}

/**
 * Error state component
 */
function ErrorState() {
  return (
    <div className="text-center py-8 text-muted-foreground">
      Failed to load response details
    </div>
  );
}

/**
 * Response details content component
 */
function ResponseDetailsContent({ responseDetails, selectedResponse }) {
  return (
    <div className="space-y-6">
      <ResponseSummary selectedResponse={selectedResponse} />
      <ResponseAnswers answers={responseDetails.answers} />
      {responseDetails.facts && Object.keys(responseDetails.facts).length > 0 && (
        <ExtractedFacts facts={responseDetails.facts} />
      )}
    </div>
  );
}

/**
 * Response summary component
 */
function ResponseSummary({ selectedResponse }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="surface card-pad">
        <h4 className="font-medium text-foreground mb-1">Status</h4>
        <p className="text-sm text-muted-foreground">
          {selectedResponse?.completed ? '✅ Completed' : '🟡 In Progress'}
        </p>
      </div>
      <div className="surface card-pad">
        <h4 className="font-medium text-foreground mb-1">Answers</h4>
        <p className="text-sm text-muted-foreground">
          {selectedResponse?.answer_count} responses
        </p>
      </div>
      <div className="surface card-pad">
        <h4 className="font-medium text-foreground mb-1">Brief</h4>
        <p className="text-sm text-muted-foreground">
          {selectedResponse?.has_brief ? '✅ Generated' : '❌ Not generated'}
        </p>
      </div>
    </div>
  );
}

/**
 * Response answers component
 */
function ResponseAnswers({ answers = [] }) {
  return (
    <div className="surface card-pad">
      <h4 className="font-medium text-foreground mb-4">Survey Answers</h4>
      <div className="space-y-4">
        {answers.map((answer, index) => (
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
  );
}

/**
 * Extracted facts component
 */
function ExtractedFacts({ facts }) {
  return (
    <div className="surface card-pad">
      <h4 className="font-medium text-foreground mb-4">Extracted Information</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(facts).map(([key, value]) => (
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
  );
}
