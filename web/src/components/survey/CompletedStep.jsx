import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { CheckCircle, Download } from '../ui/icons';
import { publicSurveyUtils } from '../../utils/publicSurveyApi.js';

/**
 * Completed step component for public survey
 */
export function CompletedStep({ answers, sessionId, finalBrief }) {
  const handleDownloadBrief = () => {
    publicSurveyUtils.downloadBrief(finalBrief?.briefMarkdown, sessionId);
  };

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
                    <Button variant="outline" onClick={handleDownloadBrief}>
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
