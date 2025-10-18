import { marked } from "marked";
import { SimpleEnhancedDownload } from "../../../components/ui/enhanced-download";

/**
 * Survey brief display component
 */
export function SurveyBrief({ brief, sessionId, briefContent }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <BriefHeader sessionId={sessionId} briefContent={briefContent || brief} />
      <BriefContent brief={brief} />
    </div>
  );
}

/**
 * Brief header with enhanced download button
 */
function BriefHeader({ sessionId, briefContent }) {
  return (
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-lg font-medium">Generated Brief</h3>
      <SimpleEnhancedDownload 
        briefContent={briefContent}
        sessionId={sessionId}
        className="ml-auto"
      />
    </div>
  );
}

/**
 * Brief content display
 */
function BriefContent({ brief }) {
  return (
    <div
      className="prose max-w-none"
      dangerouslySetInnerHTML={{ __html: marked.parse(brief) }}
    />
  );
}
