import { Card, CardContent } from '../../../components/ui/card';

/**
 * Loading step component for public survey
 */
export function LoadingStep() {
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
