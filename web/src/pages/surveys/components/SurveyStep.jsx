import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { ArrowLeft, ArrowRight } from '../../../components/ui/icons.jsx';
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
  surveyTemplate,
  onAnswerChange,
  onSubmitAnswer,
  onGoBack
}) {
  // Apply template styling
  console.log('🎨 SurveyStep - Full surveyTemplate object:', surveyTemplate);
  console.log('🎨 SurveyStep - Template settings:', surveyTemplate?.template?.settings);
  
  const template = surveyTemplate?.template?.settings || {};
  const primaryColor = template.survey_primary_color || '#1f2937';
  const backgroundColor = template.survey_background_color || '#f9fafb';
  const fontFamily = template.survey_font_family || 'Inter, Arial, sans-serif';
  const showLogo = template.survey_show_logo !== false;
  
  // Experience settings
  const showProgress = template.survey_show_progress !== false;
  const progressStyle = template.progress_style || 'bar';
  const layoutStyle = template.survey_layout || 'centered';
  const cardStyle = template.survey_card_style || 'floating';

  // Dynamic theme-based styling
  const getThemeStyles = () => {
    const theme = template.survey_theme || 'professional';
    
    switch (theme) {
      case 'modern':
        return {
          background: `linear-gradient(135deg, ${backgroundColor} 0%, #f0f9ff 100%)`,
          cardClass: 'backdrop-blur-sm bg-white/90 border-blue-200'
        };
      case 'minimal':
        return {
          background: '#ffffff',
          cardClass: 'bg-white border-gray-100 shadow-sm'
        };
      case 'friendly':
        return {
          background: `linear-gradient(135deg, ${backgroundColor} 0%, #f0fdf4 100%)`,
          cardClass: 'bg-white border-green-200'
        };
      default: // professional
        return {
          background: backgroundColor,
          cardClass: 'bg-white border-gray-200'
        };
    }
  };

  const themeStyles = getThemeStyles();

  // Get layout-specific styles
  const getLayoutStyles = () => {
    switch (layoutStyle) {
      case 'fullscreen':
        return {
          containerClass: "min-h-screen p-0",
          contentClass: "h-screen px-4 py-8",
          maxWidth: 'none'
        };
      case 'split-screen':
        return {
          containerClass: "min-h-screen py-8",
          contentClass: "max-w-7xl mx-auto px-4",
          maxWidth: 'max-w-7xl'
        };
      case 'wizard':
        return {
          containerClass: "min-h-screen flex flex-col justify-center py-8",
          contentClass: "max-w-2xl mx-auto px-4",
          maxWidth: 'max-w-2xl'
        };
      case 'conversational':
        return {
          containerClass: "min-h-screen py-4",
          contentClass: "max-w-3xl mx-auto px-4",
          maxWidth: 'max-w-3xl'
        };
      default: // centered
        return {
          containerClass: "min-h-screen py-8",
          contentClass: "max-w-4xl mx-auto px-4",
          maxWidth: 'max-w-4xl'
        };
    }
  };

  // Get card style-specific classes
  const getCardStyleClass = () => {
    switch (cardStyle) {
      case 'minimal':
        return 'bg-white border-0 shadow-none';
      case 'fullscreen':
        return 'bg-white rounded-none border-0 shadow-none h-full';
      case 'boxed':
        return 'bg-white border-2 border-gray-300 shadow-lg rounded-lg';
      default: // floating
        return themeStyles.cardClass;
    }
  };

  const layoutStyles = getLayoutStyles();
  const cardStyleClass = getCardStyleClass();

  return (
    <div 
      className={layoutStyles.containerClass}
      style={{ 
        background: themeStyles.background,
        fontFamily: fontFamily
      }}
    >
      <div className={layoutStyles.contentClass}>
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              {showLogo && campaign?.org_logo && (
                <img 
                  src={campaign.org_logo} 
                  alt="Organization Logo" 
                  className="h-8"
                  style={{ maxHeight: '32px' }}
                />
              )}
              <h1 
                className="text-2xl font-bold"
                style={{ color: primaryColor }}
              >
                {campaign?.name}
              </h1>
            </div>
            {showProgress && (
              <Badge variant="outline" style={{ borderColor: primaryColor, color: primaryColor }}>
                {progress.percentage}% Complete
              </Badge>
            )}
          </div>
          
          {/* Progress display */}
          {showProgress && (
            <div>
              {progressStyle === 'bar' && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${progress.percentage}%`,
                      backgroundColor: primaryColor
                    }}
                  ></div>
                </div>
              )}
              {progressStyle === 'percentage' && (
                <div className="text-center text-sm font-medium" style={{ color: primaryColor }}>
                  {progress.percentage}% Complete
                </div>
              )}
              {progressStyle === 'fraction' && (
                <div className="text-center text-sm font-medium" style={{ color: primaryColor }}>
                  {answers.length + 1} of {flow?.completion?.requiredFacts?.length || '?'}
                </div>
              )}
              {progressStyle === 'steps' && (
                <div className="flex justify-center space-x-2">
                  {Array.from({length: Math.min(10, flow?.completion?.requiredFacts?.length || 5)}).map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ${
                        i < answers.length ? 'opacity-100' : 'opacity-30'
                      }`}
                      style={{ backgroundColor: primaryColor }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className={`gap-6 ${
          layoutStyle === 'split-screen' 
            ? 'grid grid-cols-1 lg:grid-cols-2' 
            : layoutStyle === 'wizard' || layoutStyle === 'conversational'
            ? 'flex flex-col items-center'
            : 'grid grid-cols-1 lg:grid-cols-3'
        }`}>
          {/* Main survey area */}
          <div className={
            layoutStyle === 'split-screen' 
              ? 'lg:col-span-1' 
              : layoutStyle === 'wizard' || layoutStyle === 'conversational'
              ? 'w-full max-w-2xl'
              : 'lg:col-span-2'
          }>
            <Card className={cardStyleClass}>
              <CardHeader>
                <CardTitle 
                  className="text-lg"
                  style={{ color: primaryColor }}
                >
                  {currentQuestion?.text}
                </CardTitle>
                <CardDescription>
                  Question {answers.length + 1}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentQuestion?.type === 'text' && (
                  <textarea
                    className="w-full border rounded-md px-3 py-2 h-32 resize-none focus:ring-2 focus:border-transparent"
                    style={{ 
                      borderColor: `${primaryColor}40`,
                      focusRingColor: `${primaryColor}40`
                    }}
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
                    style={{ 
                      borderColor: primaryColor,
                      color: primaryColor
                    }}
                    className="hover:opacity-80"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  
                  <Button 
                    onClick={onSubmitAnswer}
                    disabled={!currentAnswer.trim() || submitting}
                    style={{ 
                      backgroundColor: primaryColor,
                      borderColor: primaryColor
                    }}
                    className="hover:opacity-90 transition-opacity"
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

          {/* Split-screen info panel or Progress sidebar */}
          {layoutStyle === 'split-screen' ? (
            <div className="hidden lg:flex flex-col justify-start p-8 bg-gray-50/50">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3" style={{ color: primaryColor }}>
                    Survey Progress
                  </h3>
                  <SurveyProgressSidebar 
                    flow={flow} 
                    answers={answers} 
                  />
                </div>
                
                {answers.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3" style={{ color: primaryColor }}>
                      Your Responses
                    </h3>
                    <SurveyAnswerHistory answers={answers} />
                  </div>
                )}

                <div className="mt-8 p-4 rounded-lg bg-white border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">What happens next?</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                      <span>AI analyzes your responses</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                      <span>Generate detailed project brief</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                      <span>Prioritize requirements</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : layoutStyle !== 'wizard' && layoutStyle !== 'conversational' && (
            <div className="space-y-6">
              <SurveyProgressSidebar 
                flow={flow} 
                answers={answers} 
              />

              {answers.length > 0 && (
                <SurveyAnswerHistory answers={answers} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
