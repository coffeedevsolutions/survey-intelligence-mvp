import { marked } from "marked";

/**
 * Survey brief display component
 */
export function SurveyBrief({ brief, sessionId, onDownload }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <BriefHeader onDownload={onDownload} />
      <BriefContent brief={brief} />
    </div>
  );
}

/**
 * Brief header with download button
 */
function BriefHeader({ onDownload }) {
  return (
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-lg font-medium">Generated Brief</h3>
      <button 
        onClick={onDownload}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm transition-colors"
      >
        Download .md
      </button>
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
