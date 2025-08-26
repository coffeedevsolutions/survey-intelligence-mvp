import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { ScrollArea } from './components/ui/scroll-area';
import { CheckCircle, ArrowRight, ArrowLeft, AlertCircle, FileText, Download } from './components/ui/icons';

const API_BASE = 'http://localhost:8787';

export default function PublicSurvey() {
  const { token } = useParams();
  const navigate = useNavigate();
  
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
      const response = await fetch(`${API_BASE}/public/surveys/${token}/bootstrap`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Survey not available');
      }
      
      const data = await response.json();
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

  // Bootstrap survey on load
  useEffect(() => {
    if (!token) {
      setError('Invalid survey link');
      setStep('error');
      return;
    }
    
    bootstrapSurvey();
  }, [token, bootstrapSurvey]);

  const startSurvey = async () => {
    try {
      const response = await fetch(`${API_BASE}/public/surveys/${token}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start survey');
      }
      
      const data = await response.json();
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
      alert('Please provide an answer before continuing');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const response = await fetch(`${API_BASE}/public/sessions/${sessionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          text: currentAnswer.trim()
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit answer');
      }
      
      const data = await response.json();
      
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
      alert('Failed to submit answer: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitSurvey = async () => {
    try {
      const response = await fetch(`${API_BASE}/public/sessions/${sessionId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit survey');
      }
      
      const data = await response.json();
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
      alert('Going back to previous questions is not yet fully implemented. You can continue with the current question.');
    }
  };

  const downloadBrief = () => {
    if (!finalBrief?.briefMarkdown) return;
    
    const blob = new Blob([finalBrief.briefMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `survey-brief-${sessionId}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Loading survey...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Survey Unavailable</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={() => navigate('/')}>Go Home</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'start') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{campaign?.name}</CardTitle>
            <CardDescription className="text-base mt-2">
              You've been invited to participate in this survey. Your responses will help generate a detailed project brief.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">What to expect:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Answer {flow?.completion?.requiredFacts?.length || 'several'} questions about your project</li>
                <li>• Questions may adapt based on your answers</li>
                <li>• Your responses will generate a structured brief at the end</li>
                <li>• Takes approximately 5-10 minutes to complete</li>
              </ul>
            </div>
            
            <div className="text-center">
              <Button size="lg" onClick={startSurvey}>
                Start Survey <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'survey') {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold">{campaign?.name}</h1>
              <Badge variant="outline">
                {progress.percentage}% Complete
              </Badge>
            </div>
            
            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.percentage}%` }}
              ></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main survey area */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{currentQuestion?.text}</CardTitle>
                  <CardDescription>
                    Question {answers.length + 1}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {currentQuestion?.type === 'text' && (
                    <textarea
                      className="w-full border rounded-md px-3 py-2 h-32 resize-none"
                      value={currentAnswer}
                      onChange={(e) => setCurrentAnswer(e.target.value)}
                      placeholder="Type your answer here..."
                      autoFocus
                    />
                  )}
                  
                  <div className="flex justify-between">
                    <Button 
                      variant="outline" 
                      onClick={goBack}
                      disabled={answers.length === 0}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    
                    <Button 
                      onClick={submitAnswer}
                      disabled={!currentAnswer.trim() || submitting}
                    >
                      {submitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          Continue
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Progress sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Your Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {flow?.completion?.requiredFacts?.map((fact, index) => (
                      <div key={fact} className="flex items-center space-x-2">
                        <CheckCircle className={`w-4 h-4 ${index < answers.length ? 'text-green-500' : 'text-gray-300'}`} />
                        <span className={`text-sm ${index < answers.length ? 'text-green-700' : 'text-gray-500'}`}>
                          {fact.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {answers.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Your Answers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-48">
                      <div className="space-y-3">
                        {answers.map((answer, index) => (
                          <div key={index} className="border-l-2 border-blue-200 pl-3">
                            <p className="text-sm font-medium text-gray-700">
                              {answer.question}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {answer.answer.length > 100 
                                ? answer.answer.substring(0, 100) + '...' 
                                : answer.answer
                              }
                            </p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'completed') {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-green-900 mb-2">Survey Completed!</h1>
            <p className="text-lg text-gray-600">
              Thank you for your responses. We've generated your project brief below.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Generated Brief</CardTitle>
                      <CardDescription>
                        Based on your survey responses
                      </CardDescription>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" onClick={downloadBrief}>
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96 w-full">
                    <div className="prose prose-sm max-w-none">
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                        {finalBrief?.briefMarkdown}
                      </pre>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Questions answered:</span>
                    <span className="font-medium">{answers.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Session ID:</span>
                    <span className="font-mono text-xs">{sessionId}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Completed:</span>
                    <span className="font-medium">{new Date().toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">What's Next?</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-600 space-y-2">
                    <p>Your brief has been saved and shared with the project team.</p>
                    <p>They will review your responses and may follow up with additional questions.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
