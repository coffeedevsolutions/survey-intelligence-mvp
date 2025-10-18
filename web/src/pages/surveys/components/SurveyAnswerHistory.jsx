import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card.jsx';
import { ScrollArea } from '../../../components/ui/scroll-area.jsx';
import { publicSurveyUtils } from '../../../utils/publicSurveyApi.js';

/**
 * Survey answer history component
 */
export function SurveyAnswerHistory({ answers }) {
  return (
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
                  {publicSurveyUtils.truncateAnswer(answer.answer)}
                </p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
