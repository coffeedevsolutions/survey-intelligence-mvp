import { useState } from 'react';
import { api } from '../utils/api.js';

/**
 * Custom hook for managing survey state
 */
export function useSurvey() {
  const [sessionId, setSessionId] = useState(null);
  const [question, setQuestion] = useState(null);
  const [answer, setAnswer] = useState("");
  const [completed, setCompleted] = useState(false);
  const [brief, setBrief] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const startSession = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.createSession();
      setSessionId(data.sessionId);
      setQuestion(data.question);
    } catch (err) {
      setError('Failed to start session');
      console.error('Error starting session:', err);
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!answer.trim()) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await api.submitAnswer(sessionId, question.id, answer);
      
      setAnswer("");
      if (data.completed) { 
        setCompleted(true); 
        setQuestion(null); 
      } else {
        setQuestion(data.next);
      }
    } catch (err) {
      setError('Failed to submit answer');
      console.error('Error submitting answer:', err);
    } finally {
      setLoading(false);
    }
  };

  const submitSurvey = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.submitSurvey(sessionId);
      setBrief(data.briefMarkdown || "");
    } catch (err) {
      setError('Failed to generate brief');
      console.error('Error generating brief:', err);
    } finally {
      setLoading(false);
    }
  };

  const finishEarly = () => {
    setCompleted(true);
    setQuestion(null);
  };

  const downloadBrief = () => {
    if (!brief) return;
    
    const blob = new Blob([brief], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `project-brief-${sessionId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return {
    // State
    sessionId,
    question,
    answer,
    completed,
    brief,
    loading,
    error,
    
    // Actions
    setAnswer,
    startSession,
    submitAnswer,
    submitSurvey,
    finishEarly,
    downloadBrief
  };
}
