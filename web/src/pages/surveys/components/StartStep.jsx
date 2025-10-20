import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { ArrowRight } from '../../../components/ui/icons';

/**
 * Start step component for public survey
 */
export function StartStep({ campaign, flow, surveyTemplate, onStartSurvey }) {
  // Apply template styling
  console.log('🎨 StartStep - Full surveyTemplate object:', surveyTemplate);
  console.log('🎨 StartStep - Template settings:', surveyTemplate?.template?.settings);
  
  const template = surveyTemplate?.template?.settings || {};
  const primaryColor = template.survey_primary_color || '#1f2937';
  const backgroundColor = template.survey_background_color || '#f9fafb';
  const fontFamily = template.survey_font_family || 'Inter, Arial, sans-serif';
  const showLogo = template.survey_show_logo !== false;
  const welcomeMessage = template.survey_welcome_message || 
    "You've been invited to participate in this survey. Your responses will help generate a detailed project brief.";
  
  // Experience settings
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
    const baseContainerClass = "min-h-screen";
    const baseCardClass = "w-full";
    
    switch (layoutStyle) {
      case 'fullscreen':
        return {
          containerClass: `${baseContainerClass} p-0`,
          cardClass: `${baseCardClass} h-screen rounded-none border-0`,
          maxWidth: 'none'
        };
      case 'split-screen':
        return {
          containerClass: `${baseContainerClass} grid grid-cols-1 lg:grid-cols-2`,
          cardClass: `${baseCardClass} lg:col-span-1`,
          maxWidth: 'none'
        };
      case 'wizard':
        return {
          containerClass: `${baseContainerClass} flex flex-col justify-center px-4`,
          cardClass: `${baseCardClass} max-w-lg mx-auto`,
          maxWidth: 'max-w-lg'
        };
      case 'conversational':
        return {
          containerClass: `${baseContainerClass} flex items-start justify-center pt-20 px-4`,
          cardClass: `${baseCardClass} max-w-2xl`,
          maxWidth: 'max-w-2xl'
        };
      default: // centered
        return {
          containerClass: `${baseContainerClass} flex items-center justify-center`,
          cardClass: `${baseCardClass} max-w-2xl`,
          maxWidth: 'max-w-2xl'
        };
    }
  };

  // Get card style-specific classes
  const getCardStyleClass = () => {
    switch (cardStyle) {
      case 'minimal':
        return 'bg-white border-0 shadow-none';
      case 'fullscreen':
        return 'bg-white rounded-none border-0 shadow-none';
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
      {layoutStyle === 'split-screen' && (
        <div className="hidden lg:flex flex-col justify-center p-12" style={{ backgroundColor: `${primaryColor}08`, borderRight: `1px solid ${primaryColor}20` }}>
          <div className="max-w-md">
            {showLogo && campaign?.org_logo && (
              <img 
                src={campaign.org_logo} 
                alt="Organization Logo" 
                className="h-12 mb-8"
                style={{ maxHeight: '48px' }}
              />
            )}
            <div className="space-y-6">
              <div>
                <h1 className="text-4xl font-bold mb-3" style={{ color: primaryColor }}>
                  {campaign?.name || 'Survey'}
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed">
                  {welcomeMessage}
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-gray-700">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }}></div>
                  <span>Takes 5-10 minutes to complete</span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }}></div>
                  <span>AI-powered adaptive questions</span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }}></div>
                  <span>Generates detailed project brief</span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }}></div>
                  <span>Your responses are secure & confidential</span>
                </div>
              </div>

              {flow?.description && (
                <div className="mt-8 p-4 rounded-lg bg-white/50 border border-gray-200">
                  <h3 className="font-medium text-gray-900 mb-2">About this survey:</h3>
                  <p className="text-gray-600 text-sm">{flow.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      <div className={layoutStyle === 'split-screen' ? 'flex items-center justify-center p-8' : ''}>
        <Card className={`${layoutStyles.cardClass} ${cardStyleClass}`}>
        <CardHeader className="text-center">
          {showLogo && campaign?.org_logo && (
            <div className="mb-4">
              <img 
                src={campaign.org_logo} 
                alt="Organization Logo" 
                className="h-12 mx-auto"
                style={{ maxHeight: '48px' }}
              />
            </div>
          )}
          <CardTitle 
            className="text-2xl"
            style={{ color: primaryColor }}
          >
            {campaign?.name}
          </CardTitle>
          <CardDescription className="text-base mt-2">
            {welcomeMessage}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div 
            className="border rounded-lg p-4"
            style={{ 
              backgroundColor: `${primaryColor}10`,
              borderColor: `${primaryColor}30`
            }}
          >
            <h4 
              className="font-medium mb-2"
              style={{ color: primaryColor }}
            >
              What to expect:
            </h4>
            <ul className="text-sm space-y-1" style={{ color: primaryColor }}>
              <li>• Answer {flow?.completion?.requiredFacts?.length || 'several'} questions about your project</li>
              <li>• Questions may adapt based on your answers</li>
              <li>• Your responses will generate a structured brief at the end</li>
              <li>• Takes approximately 5-10 minutes to complete</li>
            </ul>
          </div>
          
          <div className="text-center">
            <Button 
              size="lg" 
              onClick={onStartSurvey}
              style={{ 
                backgroundColor: primaryColor,
                borderColor: primaryColor
              }}
              className="hover:opacity-90 transition-opacity"
            >
              Start Survey <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
        </Card>
      </div>
    </div>
  );
}
