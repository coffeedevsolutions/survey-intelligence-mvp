import { useNavigate } from "react-router-dom";
import { useSurvey } from "../../hooks/useSurvey.js";
import { SurveyStart } from "./SurveyStart.jsx";
import { SurveyQuestion } from "./SurveyQuestion.jsx";
import { SurveyCompletion } from "./SurveyCompletion.jsx";
import { SurveyBrief } from "./SurveyBrief.jsx";

/**
 * Legacy survey interface component (for backward compatibility)
 */
export function LegacySurvey() {
  const navigate = useNavigate();
  const survey = useSurvey();

  return (
    <div className="max-w-4xl mx-auto p-6">
      <SurveyHeader navigate={navigate} />
      
      {/* Survey States */}
      {!survey.sessionId && (
        <SurveyStart onStart={survey.startSession} navigate={navigate} loading={survey.loading} />
      )}
      
      {survey.sessionId && !survey.completed && survey.question && (
        <SurveyQuestion 
          question={survey.question}
          answer={survey.answer}
          onAnswerChange={survey.setAnswer}
          onSubmit={survey.submitAnswer}
          onFinish={survey.finishEarly}
          loading={survey.loading}
          error={survey.error}
        />
      )}

      {survey.completed && !survey.brief && (
        <SurveyCompletion 
          onSubmit={survey.submitSurvey} 
          loading={survey.loading}
          error={survey.error}
        />
      )}

      {survey.brief && (
        <SurveyBrief 
          brief={survey.brief}
          sessionId={survey.sessionId}
          onDownload={survey.downloadBrief}
        />
      )}
    </div>
  );
}

/**
 * Survey page header
 */
function SurveyHeader({ navigate }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Quick Survey</h2>
      <p className="text-gray-600">Create a survey using the classic interface</p>
    </div>
  );
}
