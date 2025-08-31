import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { CheckCircle, Download } from '../ui/icons';
import { SimpleEnhancedDownload } from '../ui/enhanced-download';
import { InlineStyledBrief } from '../ui/styled-brief-viewer';

/**
 * Completed step component for public survey
 */
export function CompletedStep({ answers, sessionId, finalBrief, surveyTemplate }) {
  // Apply template styling
  console.log('🎨 CompletedStep - Full surveyTemplate object:', surveyTemplate);
  console.log('🎨 CompletedStep - Template settings:', surveyTemplate?.template?.settings);
  
  const template = surveyTemplate?.template?.settings || {};
  const primaryColor = template.survey_primary_color || '#1f2937';
  const backgroundColor = template.survey_background_color || '#f9fafb';
  const fontFamily = template.survey_font_family || 'Inter, Arial, sans-serif';
  const completionMessage = template.survey_completion_message || 
    "Thank you for your responses. We've generated your project brief below.";
  
  // Experience settings
  const showBriefToUser = template.show_brief_to_user !== false;

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

  return (
    <div 
      className="min-h-screen py-8"
      style={{ 
        background: themeStyles.background,
        fontFamily: fontFamily
      }}
    >
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <CheckCircle 
            className="w-16 h-16 mx-auto mb-4" 
            style={{ color: primaryColor }}
          />
          <h1 
            className="text-3xl font-bold mb-2"
            style={{ color: primaryColor }}
          >
            Survey Completed!
          </h1>
          <p className="text-lg text-gray-600">
            {completionMessage}
          </p>
        </div>

        <div className={`grid gap-6 ${showBriefToUser ? 'grid-cols-1 lg:grid-cols-4' : 'grid-cols-1 max-w-2xl mx-auto'}`}>
          {showBriefToUser && (
            <div className="lg:col-span-3">
              <Card className={themeStyles.cardClass}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle style={{ color: primaryColor }}>Generated Brief</CardTitle>
                      <CardDescription>
                        Based on your survey responses
                      </CardDescription>
                    </div>
                    <div className="flex space-x-2">
                      <SimpleEnhancedDownload 
                        briefContent={finalBrief?.briefMarkdown}
                        sessionId={sessionId}
                      />
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
          )}

          <div className="space-y-6">
            <Card className={themeStyles.cardClass}>
              <CardHeader>
                <CardTitle className="text-base" style={{ color: primaryColor }}>Summary</CardTitle>
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

            <Card className={themeStyles.cardClass}>
              <CardHeader>
                <CardTitle className="text-base" style={{ color: primaryColor }}>What's Next?</CardTitle>
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
