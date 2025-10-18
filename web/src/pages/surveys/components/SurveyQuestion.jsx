import { InlineSpinner } from "../../../components/layout/LoadingSpinner.jsx";

/**
 * Survey question component
 */
export function SurveyQuestion({ 
  question, 
  answer, 
  onAnswerChange, 
  onSubmit, 
  onFinish, 
  loading, 
  error 
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <h3 className="text-lg font-medium mb-4">{question.text}</h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <textarea
          value={answer}
          onChange={(e) => onAnswerChange(e.target.value)}
          rows={5}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Type your answer..."
          disabled={loading}
        />
        
        <div className="flex justify-between mt-4">
          <button 
            type="button"
            onClick={onFinish}
            disabled={loading}
            className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-md"
          >
            Finish Now
          </button>
          
          <button 
            type="submit"
            disabled={loading || !answer.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md flex items-center min-w-[120px] justify-center"
          >
            {loading ? (
              <>
                <InlineSpinner className="mr-2" />
                Submitting...
              </>
            ) : (
              "Next Question"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
