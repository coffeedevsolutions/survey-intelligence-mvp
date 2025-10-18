import { InlineSpinner } from "../../../components/layout/LoadingSpinner.jsx";

/**
 * Survey start screen component
 */
export function SurveyStart({ onStart, navigate, loading }) {
  return (
    <div className="text-center py-12">
      <button 
        onClick={onStart}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-6 rounded-lg flex items-center justify-center mx-auto min-w-[160px]"
      >
        {loading ? (
          <>
            <InlineSpinner className="mr-2" />
            Starting...
          </>
        ) : (
          "Start New Survey"
        )}
      </button>
      <p className="mt-4 text-sm text-gray-600">
        Or{" "}
        <button 
          onClick={() => navigate('/campaigns')} 
          className="text-blue-600 hover:underline"
        >
          create a campaign
        </button>{" "}
        for more advanced features
      </p>
    </div>
  );
}
