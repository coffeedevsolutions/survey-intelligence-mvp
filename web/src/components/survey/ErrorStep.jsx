import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { AlertCircle } from '../ui/icons';

/**
 * Error step component for public survey
 */
export function ErrorStep({ error, onGoHome }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Survey Unavailable</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={onGoHome}>Go Home</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
