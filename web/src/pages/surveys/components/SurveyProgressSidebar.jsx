import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card.jsx';
import { CheckCircle } from '../../../components/ui/icons.jsx';
import { publicSurveyUtils } from '../../../utils/publicSurveyApi.js';

/**
 * Survey progress sidebar component
 */
export function SurveyProgressSidebar({ flow, answers }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {flow?.completion?.requiredFacts?.map((fact, index) => (
            <div key={fact} className="flex items-center space-x-2">
              <CheckCircle className={`w-4 h-4 ${index < answers.length ? 'text-green-500' : 'text-gray-300'}`} />
              <span className={`text-sm ${index < answers.length ? 'text-green-700' : 'text-gray-500'}`}>
                {publicSurveyUtils.formatFactName(fact)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
