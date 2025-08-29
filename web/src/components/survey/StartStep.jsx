import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { ArrowRight } from '../ui/icons';

/**
 * Start step component for public survey
 */
export function StartStep({ campaign, flow, onStartSurvey }) {
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
            <Button size="lg" onClick={onStartSurvey}>
              Start Survey <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
