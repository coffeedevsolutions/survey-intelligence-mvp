/**
 * Script to add promptEnhancement, analysisDirectives, and validationRules
 * to all survey categories in surveyTypeConfig.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const enhancements = {
  event_feedback: {
    promptEnhancement: {
      roleDescription: 'an event experience evaluator focused on understanding attendee satisfaction',
      keyPriorities: [
        'Assess overall event quality and organization',
        'Evaluate content relevance and value',
        'Understand networking and engagement opportunities',
        'Gather suggestions for future events',
        'Maintain engagement with fresh topics'
      ],
      avoidancePatterns: [
        'Avoid asking about logistics unless relevant',
        'Don\'t ask negative questions repeatedly',
        'Avoid technical details unless user is technical'
      ],
      languageTone: 'conversational',
      fatigueThreshold: 6
    },
    analysisDirectives: {
      sentimentHandling: 'Quickly pivot from negatives to positives. Understand what made events successful and what to improve.',
      keywordFocus: ['organized', 'disorganized', 'valuable', 'waste of time', 'networking', 'great speakers', 'poor content', 'engaging', 'boring'],
      followUpTriggers: [
        'Content mentions → Explore specific value or issues',
        'Networking mentions → Understand quality of connections',
        'Rating mentions → Explore reasons'
      ],
      completionSignals: ['Event rated', 'Content evaluated', 'Suggestions gathered for improvement']
    },
    validationRules: {
      requiredInsights: ['event_rating', 'content_assessment', 'suggestions'],
      criticalPaths: ['event_rating', 'content_evaluation'],
      redundancyChecks: { similarityThreshold: 0.85, maxRepeatsPerTopic: villa}
    }
  },

  product_feedback: {
    promptEnhancement: {
      roleDescription: 'a user experience researcher focused on product usability and value',
      keyPriorities: [
        'Assess product quality and usability',
        'Identify pain points and improvement opportunities',
        'Understand feature value and gaps',
        'Gather actionable product improvement suggestions',
        'Keep users engaged by showing their input matters'
      ],
      avoidancePatterns: [
        'Avoid asking about internal company processes',
        'Don\'t ask for competitor details unless relevant',
        'Avoid repetitive usability questions'
      ],
      languageTone: 'empathetic',
      fatigueThreshold: 6
    },
    analysisDirectives: {
      sentimentHandling: 'For negative feedback, drill deep into usability issues and impact. For positive feedback, understand what creates value.',
      keywordFocus: ['easy', 'difficult', 'confusing', 'intuitive', 'useful', 'broken', 'bugs', 'features', 'missing', 'love'],
      followUpTriggers: [
        'Usability mentions → Explore specific issues',
        'Feature requests → Understand use case',
        'Bug mentions → Get details and impact'
      ],
      completionSignals: ['Product rated', 'Usability assessed', 'Improvements suggested']
    },
 важныеRules: {
      requiredInsights: ['product_rating', 'usability_assessment', 'improvement_suggestions'],
      criticalPaths: ['product_rating', 'usability_assessment'],
      redundancyChecks: { similarityThreshold: 0.85, maxRepeatsPerTopic: 2 }
    }
  },

  // Add remaining categories as needed...
};

console.log('Configuration enhancements prepared');
console.log('Categories with enhancements:', Object.keys(enhancements));

