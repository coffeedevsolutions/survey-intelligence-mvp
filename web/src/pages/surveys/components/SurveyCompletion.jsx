import { InlineSpinner } from "../../../layout/LoadingSpinner.jsx";

/**
 * Survey completion component
 */
export function SurveyCompletion({ onSubmit, loading, error }) {
  return (
    <div className="text-center py-12">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm max-w-md mx-auto">
          {error}
        </div>
      )}
      
      <button 
        onClick={onSubmit}
        disabled={loading}
        className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-3 px-6 rounded-lg flex items-center justify-center mx-auto min-w-[200px]"
      >
        {loading ? (
          <>
            <InlineSpinner className="mr-2" />
            Generating...
          </>
        ) : (
          "Generate Project Brief"
        )}
      </button>
    </div>
  );
}
