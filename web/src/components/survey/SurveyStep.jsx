import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ArrowLeft, ArrowRight } from '../ui/icons';
import { SurveyProgressSidebar } from './SurveyProgressSidebar.jsx';
import { SurveyAnswerHistory } from './SurveyAnswerHistory.jsx';

/**
 * Survey step component for public survey
 */
export function SurveyStep({
  campaign,
  currentQuestion,
  answers,
  progress,
  currentAnswer,
  submitting,
  flow,
  onAnswerChange,
  onSubmitAnswer,
  onGoBack
}) {
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
                    onChange={(e) => onAnswerChange(e.target.value)}
                    placeholder="Type your answer here..."
                    autoFocus
                  />
                )}
                
                <div className="flex justify-between">
                  <Button 
                    variant="outline" 
                    onClick={onGoBack}
                    disabled={answers.length === 0}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  
                  <Button 
                    onClick={onSubmitAnswer}
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
            <SurveyProgressSidebar 
              flow={flow} 
              answers={answers} 
            />

            {answers.length > 0 && (
              <SurveyAnswerHistory answers={answers} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
