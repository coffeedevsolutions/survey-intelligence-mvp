import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Mail, ArrowRight, Skip } from '../../../components/ui/icons';

/**
 * Email capture step component for public survey
 * Optional step to capture user email for resubmit functionality
 */
export function EmailCaptureStep({ 
  onEmailSubmit, 
  onSkip, 
  surveyTemplate,
  loading = false 
}) {
  const [email, setEmail] = useState('');
  const [isValidEmail, setIsValidEmail] = useState(false);

  // Apply template styling
  const template = surveyTemplate?.template?.settings || {};
  const primaryColor = template.survey_primary_color || '#1f2937';
  const backgroundColor = template.survey_background_color || '#f9fafb';
  const fontFamily = template.survey_font_family || 'Inter, Arial, sans-serif';

  // Email validation
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    setIsValidEmail(validateEmail(newEmail));
  };

  const handleSubmitEmail = () => {
    if (isValidEmail) {
      onEmailSubmit(email);
    }
  };

  const handleSkipEmail = () => {
    onSkip();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && isValidEmail && !loading) {
      handleSubmitEmail();
    }
  };

  // Dynamic theme-based styling
  const getThemeStyles = () => {
    return {
      fontFamily,
      backgroundColor,
      color: primaryColor
    };
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={getThemeStyles()}
    >
      <div className="w-full max-w-md">
        <Card className="shadow-lg border-0" style={{ 
          borderTop: `4px solid ${primaryColor}`,
          backgroundColor: 'white'
        }}>
          <CardHeader className="text-center pb-6">
            <div className="mx-auto mb-4 w-12 h-12 rounded-full flex items-center justify-center" 
                 style={{ backgroundColor: `${primaryColor}20` }}>
              <Mail className="w-6 h-6" style={{ color: primaryColor }} />
            </div>
            <CardTitle className="text-xl" style={{ color: primaryColor }}>
              Stay Connected (Optional)
            </CardTitle>
            <CardDescription className="text-sm text-gray-600 mt-2">
              Provide your email address so we can contact you if we need any clarifications about your submission.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={handleEmailChange}
                onKeyPress={handleKeyPress}
                placeholder="your.email@example.com"
                className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:border-transparent"
                style={{ 
                  borderColor: isValidEmail ? `${primaryColor}40` : '#d1d5db',
                  focusRingColor: `${primaryColor}40`
                }}
                disabled={loading}
                autoFocus
              />
              {email && !isValidEmail && (
                <p className="text-sm text-red-600 mt-1">
                  Please enter a valid email address
                </p>
              )}
              {isValidEmail && (
                <p className="text-sm text-green-600 mt-1">
                  ✓ Valid email address
                </p>
              )}
            </div>
            
            <div className="space-y-3 pt-4">
              <Button 
                onClick={handleSubmitEmail}
                disabled={!isValidEmail || loading}
                className="w-full"
                style={{ 
                  backgroundColor: primaryColor,
                  borderColor: primaryColor
                }}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    Continue with Email
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline"
                onClick={handleSkipEmail}
                disabled={loading}
                className="w-full"
                style={{ 
                  borderColor: primaryColor,
                  color: primaryColor
                }}
              >
                <Skip className="w-4 h-4 mr-2" />
                Skip - Continue Without Email
              </Button>
            </div>
            
            <div className="text-xs text-gray-500 text-center pt-2">
              <p>
                <strong>Why we ask:</strong> Your email allows us to request clarifications 
                if needed, helping us provide better assistance with your submission.
              </p>
              <p className="mt-1">
                We will not use your email for marketing purposes.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
