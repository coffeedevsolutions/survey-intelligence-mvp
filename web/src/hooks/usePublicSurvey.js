import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { publicSurveyApi } from '../utils/publicSurveyApi.js';
import { useNotifications } from '../components/ui/notifications.jsx';

/**
 * Custom hook for managing public survey state and operations
 */
export function usePublicSurvey() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { showError, showWarning } = useNotifications();
  
  const [step, setStep] = useState('loading'); // loading, start, survey, completed, error
  const [campaign, setCampaign] = useState(null);
  const [flow, setFlow] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [progress, setProgress] = useState({ percentage: 0, completed: false });
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [finalBrief, setFinalBrief] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const bootstrapSurvey = useCallback(async () => {
    try {
      const data = await publicSurveyApi.bootstrapSurvey(token);
      setCampaign(data.campaign);
      setFlow(data.flow);
      setCurrentQuestion(data.firstQuestion);
      setStep('start');
    } catch (error) {
      console.error('Failed to bootstrap survey:', error);
      setError(error.message);
      setStep('error');
    }
  }, [token]);

  const startSurvey = async () => {
    try {
      const data = await publicSurveyApi.startSurvey(token);
      setSessionId(data.sessionId);
      setCurrentQuestion(data.question);
      setProgress(data.progress);
      setStep('survey');
    } catch (error) {
      console.error('Failed to start survey:', error);
      setError(error.message);
      setStep('error');
    }
  };

  const submitAnswer = async () => {
    if (!currentAnswer.trim()) {
      showWarning('Please provide an answer before continuing');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const data = await publicSurveyApi.submitAnswer(
        sessionId, 
        currentQuestion.id, 
        currentAnswer
      );
      
      // Store the answer
      setAnswers(prev => [...prev, {
        questionId: currentQuestion.id,
        question: currentQuestion.text,
        answer: currentAnswer.trim()
      }]);
      
      setProgress(data.progress);
      setCurrentAnswer('');
      
      if (data.completed) {
        // Survey completed, submit for brief generation
        await submitSurvey();
      } else {
        // Continue to next question
        setCurrentQuestion(data.next);
      }
    } catch (error) {
      console.error('Failed to submit answer:', error);
      showError('Failed to submit answer: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitSurvey = async () => {
    try {
      const data = await publicSurveyApi.submitSurvey(sessionId);
      setFinalBrief(data);
      setStep('completed');
    } catch (error) {
      console.error('Failed to submit survey:', error);
      setError('Failed to submit survey: ' + error.message);
      setStep('error');
    }
  };

  const goBack = () => {
    if (answers.length > 0) {
      // Remove last answer and go back to previous question
      setAnswers(prev => prev.slice(0, -1));
      setCurrentAnswer('');
      
      // For simplicity, we'll just show a message that going back is not fully implemented
      showWarning('Going back to previous questions is not yet fully implemented. You can continue with the current question.');
    }
  };

  // Bootstrap survey on load
  useEffect(() => {
    if (!token) {
      setError('Invalid survey link');
      setStep('error');
      return;
    }
    
    bootstrapSurvey();
  }, [token, bootstrapSurvey]);

  return {
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
  };
}
