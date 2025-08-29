import React from 'react';
import { usePublicSurvey } from './hooks/usePublicSurvey.js';

// Step Components
import { LoadingStep } from './components/survey/LoadingStep.jsx';
import { ErrorStep } from './components/survey/ErrorStep.jsx';
import { StartStep } from './components/survey/StartStep.jsx';
import { SurveyStep } from './components/survey/SurveyStep.jsx';
import { CompletedStep } from './components/survey/CompletedStep.jsx';

/**
 * Main Public Survey component
 */
export default function PublicSurvey() {
  const {
    // State
    step,
    campaign,
    flow,
    sessionId,
    currentQuestion,
    answers,
    progress,
    currentAnswer,
    finalBrief,
    error,
    submitting,
    
    // Actions
    setCurrentAnswer,
    startSurvey,
    submitAnswer,
    goBack,
    navigate
  } = usePublicSurvey();

  // Render appropriate step based on current state
  switch (step) {
    case 'loading':
      return <LoadingStep />;
      
    case 'error':
      return (
        <ErrorStep 
          error={error} 
          onGoHome={() => navigate('/')} 
        />
      );
      
    case 'start':
      return (
        <StartStep 
          campaign={campaign}
          flow={flow}
          onStartSurvey={startSurvey}
        />
      );
      
    case 'survey':
      return (
        <SurveyStep
          campaign={campaign}
          currentQuestion={currentQuestion}
          answers={answers}
          progress={progress}
          currentAnswer={currentAnswer}
          submitting={submitting}
          flow={flow}
          onAnswerChange={setCurrentAnswer}
          onSubmitAnswer={submitAnswer}
          onGoBack={goBack}
        />
      );
      
    case 'completed':
      return (
        <CompletedStep
          answers={answers}
          sessionId={sessionId}
          finalBrief={finalBrief}
        />
      );
      
    default:
      return null;
  }
}
