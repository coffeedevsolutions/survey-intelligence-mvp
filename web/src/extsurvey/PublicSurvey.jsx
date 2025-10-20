import React from 'react';
import { usePublicSurvey } from '../hooks/usePublicSurvey.js';

// Step Components
import { LoadingStep } from '../pages/surveys/components/LoadingStep.jsx';
import { ErrorStep } from '../pages/surveys/components/ErrorStep.jsx';
import { StartStep } from '../pages/surveys/components/StartStep.jsx';
import { SurveyStep } from '../pages/surveys/components/SurveyStep.jsx';
import { EmailCaptureStep } from '../pages/surveys/components/EmailCaptureStep.jsx';
import { CompletedStep } from '../pages/surveys/components/CompletedStep.jsx';

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
    surveyTemplate,
    
    // Actions
    setCurrentAnswer,
    startSurvey,
    submitAnswer,
    goBack,
    navigate,
    handleEmailSubmit,
    handleSkipEmail
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
          surveyTemplate={surveyTemplate}
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
          surveyTemplate={surveyTemplate}
          onAnswerChange={setCurrentAnswer}
          onSubmitAnswer={submitAnswer}
          onGoBack={goBack}
        />
      );
      
    case 'email-capture':
      return (
        <EmailCaptureStep
          onEmailSubmit={handleEmailSubmit}
          onSkip={handleSkipEmail}
          surveyTemplate={surveyTemplate}
          loading={submitting}
        />
      );
      
    case 'completed':
      return (
        <CompletedStep
          answers={answers}
          sessionId={sessionId}
          finalBrief={finalBrief}
          surveyTemplate={surveyTemplate}
        />
      );
      
    default:
      return null;
  }
}
