/**
 * Survey Type Specific Configuration
 * Defines unique behavior for different survey categories
 */

export const SURVEY_TYPE_CONFIG = {
  // Course Feedback Surveys
  course_feedback: {
    name: 'Course Feedback',
    description: 'Gather feedback on courses, training, or educational experiences',
    
    // Question Generation Behavior
    questionGeneration: {
      focusAreas: ['sentiment', 'challenges', 'improvements', 'overall_experience', 'learning_outcomes'],
      sentimentPriority: true,
      conversationalTone: true,
      empathyLevel: 'high',
      questionTypes: ['open_ended', 'reflective', 'suggestive']
    },
    
    // Completion Logic
    completion: {
      threshold: 0.75,
      hasOpenEndedPhase: true,
      openEndedQuestions: 3,
      completionCriteria: ['sentiment_expressed', 'challenges_identified', 'suggestions_provided', 'learning_outcomes_assessed']
    },
    
    // Question Patterns
    questionPatterns: {
      opening: 'Thank you for completing this course! To help us improve future offerings, could you tell us about your overall learning experience?',
      sentiment: 'You mentioned some challenges. Can you tell me more about what made it difficult initially?',
      improvement: 'What specific changes would you suggest to make this course better for future students?',
      learning: 'What were the most valuable skills or knowledge you gained from this course?',
      openEnded: 'Is there anything else about your learning experience that you\'d like to share?'
    },
    
    // Slot Schema
    slotSchema: {
      required: ['overall_experience', 'challenges_faced', 'suggestions', 'learning_outcomes'],
      optional: ['positive_aspects', 'specific_examples', 'comparison_to_others', 'instructor_feedback'],
      critical: ['overall_experience', 'challenges_faced', 'learning_outcomes']
    }
  },

  // Customer Feedback Surveys
  customer_feedback: {
    name: 'Customer Feedback',
    description: 'Gather feedback on products, services, or customer experience',
    
    // Question Generation Behavior
    questionGeneration: {
      focusAreas: ['satisfaction', 'product_quality', 'service_experience', 'recommendations', 'pain_points'],
      sentimentPriority: true,
      conversationalTone: true,
      empathyLevel: 'high',
      questionTypes: ['rating_focused', 'experience_based', 'suggestive']
    },
    
    // Completion Logic
    completion: {
      threshold: 0.70,
      hasOpenEndedPhase: true,
      openEndedQuestions: 2,
      completionCriteria: ['satisfaction_rated', 'experience_described', 'suggestions_provided']
    },
    
    // Question Patterns
    questionPatterns: {
      opening: 'Thank you for being our customer! We\'d love to hear about your experience. How would you rate your overall satisfaction?',
      experience: 'Can you tell us about your experience with our product/service? What worked well and what could be improved?',
      recommendation: 'How likely are you to recommend us to others, and why?',
      improvement: 'What would make your experience even better?',
      openEnded: 'Is there anything else you\'d like us to know about your experience?'
    },
    
    // Slot Schema
    slotSchema: {
      required: ['satisfaction_rating', 'experience_description', 'recommendation_likelihood'],
      optional: ['specific_issues', 'positive_aspects', 'improvement_suggestions', 'competitor_comparison'],
      critical: ['satisfaction_rating', 'experience_description']
    }
  },

  // Employee Feedback Surveys
  employee_feedback: {
    name: 'Employee Feedback',
    description: 'Gather feedback from employees on workplace, management, or company culture',
    
    // Question Generation Behavior
    questionGeneration: {
      focusAreas: ['workplace_satisfaction', 'management_effectiveness', 'culture', 'growth_opportunities', 'concerns'],
      sentimentPriority: true,
      conversationalTone: true,
      empathyLevel: 'high',
      questionTypes: ['confidential', 'reflective', 'constructive']
    },
    
    // Completion Logic
    completion: {
      threshold: 0.80,
      hasOpenEndedPhase: true,
      openEndedQuestions: 2,
      completionCriteria: ['satisfaction_assessed', 'concerns_identified', 'suggestions_provided']
    },
    
    // Question Patterns
    questionPatterns: {
      opening: 'Thank you for participating in this confidential feedback survey. How would you describe your overall experience working here?',
      satisfaction: 'What aspects of your work environment do you find most satisfying?',
      concerns: 'Are there any areas where you feel the company could improve?',
      growth: 'What opportunities for growth and development would you like to see?',
      openEnded: 'Is there anything else you\'d like to share about your experience?'
    },
    
    // Slot Schema
    slotSchema: {
      required: ['workplace_satisfaction', 'concerns_identified', 'suggestions_provided'],
      optional: ['management_feedback', 'culture_assessment', 'growth_opportunities', 'retention_factors'],
      critical: ['workplace_satisfaction', 'concerns_identified']
    }
  },

  // Event Feedback Surveys
  event_feedback: {
    name: 'Event Feedback',
    description: 'Gather feedback on events, conferences, or meetings',
    
    // Question Generation Behavior
    questionGeneration: {
      focusAreas: ['event_quality', 'content_relevance', 'organization', 'networking', 'value'],
      sentimentPriority: true,
      conversationalTone: true,
      empathyLevel: 'medium',
      questionTypes: ['experience_focused', 'rating_based', 'suggestive']
    },
    
    // Completion Logic
    completion: {
      threshold: 0.70,
      hasOpenEndedPhase: true,
      openEndedQuestions: 2,
      completionCriteria: ['event_rated', 'content_evaluated', 'suggestions_provided']
    },
    
    // Question Patterns
    questionPatterns: {
      opening: 'Thank you for attending our event! How would you rate your overall experience?',
      content: 'How relevant and valuable was the content presented?',
      organization: 'How well was the event organized and managed?',
      networking: 'Did you find opportunities to network and connect with others?',
      improvement: 'What would make future events even better?',
      openEnded: 'Any other thoughts or suggestions about the event?'
    },
    
    // Slot Schema
    slotSchema: {
      required: ['event_rating', 'content_evaluation', 'organization_assessment'],
      optional: ['networking_experience', 'speaker_feedback', 'venue_feedback', 'suggestions'],
      critical: ['event_rating', 'content_evaluation']
    }
  },

  // Product Feedback Surveys
  product_feedback: {
    name: 'Product Feedback',
    description: 'Gather feedback on specific products or features',
    
    // Question Generation Behavior
    questionGeneration: {
      focusAreas: ['product_quality', 'usability', 'features', 'value', 'improvements'],
      sentimentPriority: true,
      conversationalTone: true,
      empathyLevel: 'medium',
      questionTypes: ['feature_specific', 'usability_focused', 'suggestive']
    },
    
    // Completion Logic
    completion: {
      threshold: 0.75,
      hasOpenEndedPhase: true,
      openEndedQuestions: 2,
      completionCriteria: ['product_rated', 'usability_assessed', 'improvements_suggested']
    },
    
    // Question Patterns
    questionPatterns: {
      opening: 'Thank you for using our product! How would you rate your overall experience?',
      usability: 'How easy was it to use the product? Were there any confusing or difficult parts?',
      features: 'Which features did you find most useful? Are there any features you\'d like to see added?',
      value: 'How would you rate the value you received from this product?',
      improvement: 'What improvements would make this product even better?',
      openEnded: 'Any other feedback about the product?'
    },
    
    // Slot Schema
    slotSchema: {
      required: ['product_rating', 'usability_assessment', 'feature_evaluation'],
      optional: ['value_assessment', 'improvement_suggestions', 'competitor_comparison', 'use_cases'],
      critical: ['product_rating', 'usability_assessment']
    }
  },

  // Service Feedback Surveys
  service_feedback: {
    name: 'Service Feedback',
    description: 'Gather feedback on customer service or support experiences',
    
    // Question Generation Behavior
    questionGeneration: {
      focusAreas: ['service_quality', 'response_time', 'resolution', 'staff_attitude', 'satisfaction'],
      sentimentPriority: true,
      conversationalTone: true,
      empathyLevel: 'high',
      questionTypes: ['service_focused', 'resolution_based', 'suggestive']
    },
    
    // Completion Logic
    completion: {
      threshold: 0.70,
      hasOpenEndedPhase: true,
      openEndedQuestions: 2,
      completionCriteria: ['service_rated', 'resolution_assessed', 'suggestions_provided']
    },
    
    // Question Patterns
    questionPatterns: {
      opening: 'Thank you for contacting our support team. How would you rate your overall experience?',
      service: 'How would you describe the quality of service you received?',
      resolution: 'Was your issue resolved to your satisfaction?',
      staff: 'How would you rate the attitude and helpfulness of our staff?',
      improvement: 'What could we do to improve our service?',
      openEnded: 'Any other feedback about your service experience?'
    },
    
    // Slot Schema
    slotSchema: {
      required: ['service_rating', 'resolution_satisfaction', 'staff_evaluation'],
      optional: ['response_time', 'communication_quality', 'improvement_suggestions', 'repeat_likelihood'],
      critical: ['service_rating', 'resolution_satisfaction']
    }
  },

  // IT Project Intake Surveys
  requirements: {
    name: 'IT Project Intake',
    description: 'Gather requirements for IT projects and solutions',
    
    // Question Generation Behavior
    questionGeneration: {
      focusAreas: ['business_objectives', 'functional_requirements', 'technical_constraints', 'stakeholders', 'timeline', 'budget'],
      sentimentPriority: false,
      conversationalTone: false,
      empathyLevel: 'low',
      questionTypes: ['structured', 'factual', 'specific']
    },
    
    // Completion Logic
    completion: {
      threshold: 0.90,
      hasOpenEndedPhase: false,
      openEndedQuestions: 0,
      completionCriteria: ['business_objectives_defined', 'functional_requirements_gathered', 'stakeholders_identified', 'timeline_established', 'budget_discussed']
    },
    
    // Question Patterns
    questionPatterns: {
      opening: 'Thank you for meeting with us today. To help us understand your project requirements, could you describe the business problem or opportunity you\'d like to address?',
      requirements: 'What specific functionality does this solution need to provide?',
      constraints: 'Are there any technical constraints or limitations we should be aware of?',
      stakeholders: 'Who are the key stakeholders that will be affected by this project?',
      timeline: 'What is your expected timeline for this project?',
      budget: 'Do you have budget considerations that should influence our approach?'
    },
    
    // Slot Schema
    slotSchema: {
      required: ['business_objectives', 'functional_requirements', 'stakeholders', 'timeline'],
      optional: ['technical_constraints', 'budget', 'success_metrics', 'risks'],
      critical: ['business_objectives', 'functional_requirements', 'stakeholders']
    }
  },

  // IT Support Surveys
  it_support: {
    name: 'IT Support',
    description: 'Gather information for IT support and troubleshooting',
    
    // Question Generation Behavior
    questionGeneration: {
      focusAreas: ['problem_description', 'error_messages', 'system_environment', 'reproduction_steps', 'impact'],
      sentimentPriority: false,
      conversationalTone: false,
      empathyLevel: 'medium',
      questionTypes: ['technical', 'diagnostic', 'factual']
    },
    
    // Completion Logic
    completion: {
      threshold: 0.85,
      hasOpenEndedPhase: false,
      openEndedQuestions: 0,
      completionCriteria: ['problem_clearly_described', 'environment_documented', 'reproduction_steps_provided', 'impact_assessed']
    },
    
    // Question Patterns
    questionPatterns: {
      opening: 'I\'m here to help resolve your technical issue. Can you describe what problem you\'re experiencing?',
      environment: 'What system are you using and what version?',
      reproduction: 'Can you walk me through the steps that lead to this issue?',
      impact: 'How is this affecting your work or productivity?'
    },
    
    // Slot Schema
    slotSchema: {
      required: ['problem_description', 'system_environment', 'reproduction_steps'],
      optional: ['error_messages', 'impact', 'workarounds', 'priority'],
      critical: ['problem_description', 'system_environment']
    }
  },

  // Business Analysis Surveys
  business_analysis: {
    name: 'Business Analysis',
    description: 'Conduct business analysis and planning',
    
    // Question Generation Behavior
    questionGeneration: {
      focusAreas: ['current_state', 'desired_state', 'gap_analysis', 'stakeholders', 'processes', 'metrics'],
      sentimentPriority: false,
      conversationalTone: false,
      empathyLevel: 'medium',
      questionTypes: ['analytical', 'process_focused', 'data_driven']
    },
    
    // Completion Logic
    completion: {
      threshold: 0.90,
      hasOpenEndedPhase: true,
      openEndedQuestions: 2,
      completionCriteria: ['current_state_analyzed', 'desired_state_defined', 'gap_identified', 'stakeholders_mapped']
    },
    
    // Question Patterns
    questionPatterns: {
      opening: 'Thank you for participating in this business analysis. To help us understand your current situation, can you describe your current business processes?',
      current: 'What are the main challenges with your current approach?',
      desired: 'What would the ideal future state look like for your organization?',
      gap: 'What are the main gaps between where you are now and where you want to be?',
      openEnded: 'Is there anything else about your business processes that we should consider?'
    },
    
    // Slot Schema
    slotSchema: {
      required: ['current_state', 'desired_state', 'gap_analysis', 'stakeholders'],
      optional: ['processes', 'metrics', 'constraints', 'risks'],
      critical: ['current_state', 'desired_state', 'gap_analysis']
    }
  },

  // Assessment Surveys
  assessment: {
    name: 'Assessment',
    description: 'Conduct skills assessment or evaluation',
    
    // Question Generation Behavior
    questionGeneration: {
      focusAreas: ['skills_evaluation', 'competency_levels', 'experience_areas', 'learning_needs', 'goals'],
      sentimentPriority: false,
      conversationalTone: true,
      empathyLevel: 'high',
      questionTypes: ['evaluative', 'reflective', 'goal_oriented']
    },
    
    // Completion Logic
    completion: {
      threshold: 0.80,
      hasOpenEndedPhase: true,
      openEndedQuestions: 2,
      completionCriteria: ['skills_assessed', 'competency_levels_identified', 'learning_needs_defined']
    },
    
    // Question Patterns
    questionPatterns: {
      opening: 'Thank you for participating in this assessment. To help us understand your current skills and development needs, can you tell us about your experience level?',
      skills: 'What are your strongest areas of expertise?',
      development: 'What areas would you like to develop further?',
      goals: 'What are your professional development goals?',
      openEnded: 'Is there anything else about your skills or development needs that you\'d like to share?'
    },
    
    // Slot Schema
    slotSchema: {
      required: ['current_skills', 'competency_levels', 'learning_needs'],
      optional: ['experience_areas', 'goals', 'preferences', 'constraints'],
      critical: ['current_skills', 'competency_levels']
    }
  },

  // Troubleshooting Surveys
  troubleshooting: {
    name: 'Troubleshooting',
    description: 'Systematic troubleshooting and problem resolution',
    
    // Question Generation Behavior
    questionGeneration: {
      focusAreas: ['symptoms', 'environment', 'timeline', 'changes', 'testing', 'resolution'],
      sentimentPriority: false,
      conversationalTone: false,
      empathyLevel: 'medium',
      questionTypes: ['diagnostic', 'systematic', 'factual']
    },
    
    // Completion Logic
    completion: {
      threshold: 0.85,
      hasOpenEndedPhase: false,
      openEndedQuestions: 0,
      completionCriteria: ['symptoms_documented', 'environment_analyzed', 'timeline_established', 'testing_completed']
    },
    
    // Question Patterns
    questionPatterns: {
      opening: 'I\'m here to help troubleshoot this issue. Can you describe the specific symptoms you\'re experiencing?',
      environment: 'What is your current system configuration?',
      timeline: 'When did this issue first occur?',
      changes: 'What changes were made recently that might be related?',
      testing: 'What troubleshooting steps have you already tried?'
    },
    
    // Slot Schema
    slotSchema: {
      required: ['symptoms', 'environment', 'timeline'],
      optional: ['changes', 'testing', 'workarounds', 'priority'],
      critical: ['symptoms', 'environment']
    }
  },

  // Market Research Surveys
  market_research: {
    name: 'Market Research',
    description: 'Conduct market research and consumer insights',
    
    questionGeneration: {
      focusAreas: ['market_preferences', 'buying_behavior', 'competitor_analysis', 'demographics', 'trends'],
      sentimentPriority: false,
      conversationalTone: true,
      empathyLevel: 'medium',
      questionTypes: ['analytical', 'behavioral', 'demographic']
    },
    
    completion: {
      threshold: 0.85,
      hasOpenEndedPhase: true,
      openEndedQuestions: 2,
      completionCriteria: ['preferences_identified', 'behavior_analyzed', 'demographics_collected']
    },
    
    questionPatterns: {
      opening: 'Thank you for participating in our market research. We\'d like to understand your preferences and buying behavior.',
      preferences: 'What factors are most important to you when making purchasing decisions?',
      behavior: 'How do you typically research products before buying?',
      competitors: 'What other brands or products do you consider when shopping?',
      openEnded: 'Any other insights about your preferences or market trends?'
    },
    
    slotSchema: {
      required: ['preferences', 'buying_behavior', 'demographics'],
      optional: ['competitor_preferences', 'price_sensitivity', 'brand_loyalty', 'trends'],
      critical: ['preferences', 'buying_behavior']
    }
  },

  // User Research Surveys
  user_research: {
    name: 'User Research',
    description: 'Conduct user research and usability studies',
    
    questionGeneration: {
      focusAreas: ['user_behavior', 'usability', 'pain_points', 'workflows', 'needs'],
      sentimentPriority: true,
      conversationalTone: true,
      empathyLevel: 'high',
      questionTypes: ['behavioral', 'usability_focused', 'needs_based']
    },
    
    completion: {
      threshold: 0.80,
      hasOpenEndedPhase: true,
      openEndedQuestions: 2,
      completionCriteria: ['behavior_understood', 'pain_points_identified', 'needs_assessed']
    },
    
    questionPatterns: {
      opening: 'Thank you for participating in our user research. We\'d like to understand how you use our product and what challenges you face.',
      behavior: 'Can you walk me through how you typically use our product?',
      pain_points: 'What are the biggest challenges or frustrations you experience?',
      needs: 'What would make your experience significantly better?',
      openEnded: 'Any other thoughts about your user experience?'
    },
    
    slotSchema: {
      required: ['user_behavior', 'pain_points', 'needs'],
      optional: ['workflows', 'usability_issues', 'feature_requests', 'satisfaction'],
      critical: ['user_behavior', 'pain_points']
    }
  },

  // NPS Surveys
  nps_survey: {
    name: 'Net Promoter Score',
    description: 'Measure customer loyalty and satisfaction',
    
    questionGeneration: {
      focusAreas: ['satisfaction', 'loyalty', 'recommendation', 'experience', 'improvement'],
      sentimentPriority: true,
      conversationalTone: true,
      empathyLevel: 'medium',
      questionTypes: ['rating_focused', 'loyalty_based', 'suggestive']
    },
    
    completion: {
      threshold: 0.60,
      hasOpenEndedPhase: true,
      openEndedQuestions: 1,
      completionCriteria: ['nps_score', 'reason_provided']
    },
    
    questionPatterns: {
      opening: 'How likely are you to recommend our company/product to a friend or colleague? (0-10 scale)',
      reason: 'What is the primary reason for your score?',
      improvement: 'What could we do to improve your experience?',
      openEnded: 'Any additional feedback?'
    },
    
    slotSchema: {
      required: ['nps_score', 'reason'],
      optional: ['improvement_suggestions', 'positive_feedback', 'specific_issues'],
      critical: ['nps_score', 'reason']
    }
  },

  // Exit Interview Surveys
  exit_interview: {
    name: 'Exit Interview',
    description: 'Conduct exit interviews with departing employees',
    
    questionGeneration: {
      focusAreas: ['departure_reason', 'workplace_satisfaction', 'management', 'culture', 'suggestions'],
      sentimentPriority: true,
      conversationalTone: true,
      empathyLevel: 'high',
      questionTypes: ['confidential', 'reflective', 'constructive']
    },
    
    completion: {
      threshold: 0.80,
      hasOpenEndedPhase: true,
      openEndedQuestions: 2,
      completionCriteria: ['departure_reason_understood', 'feedback_provided']
    },
    
    questionPatterns: {
      opening: 'Thank you for participating in this exit interview. We value your feedback and want to understand your experience.',
      reason: 'What were the main factors that led to your decision to leave?',
      experience: 'How would you describe your overall experience working here?',
      suggestions: 'What suggestions do you have for improving the workplace?',
      openEnded: 'Is there anything else you\'d like to share?'
    },
    
    slotSchema: {
      required: ['departure_reason', 'workplace_feedback'],
      optional: ['management_feedback', 'culture_assessment', 'suggestions', 'retention_factors'],
      critical: ['departure_reason', 'workplace_feedback']
    }
  },

  // General Purpose Surveys
  general: {
    name: 'General Purpose',
    description: 'General purpose surveys with flexible configuration',
    
    questionGeneration: {
      focusAreas: ['general_info', 'preferences', 'opinions', 'suggestions'],
      sentimentPriority: true,
      conversationalTone: true,
      empathyLevel: 'medium',
      questionTypes: ['flexible', 'adaptive', 'contextual']
    },
    
    completion: {
      threshold: 0.75,
      hasOpenEndedPhase: true,
      openEndedQuestions: 2,
      completionCriteria: ['basic_info_gathered', 'preferences_understood']
    },
    
    questionPatterns: {
      opening: 'Thank you for participating in this survey. To help us understand your needs, could you tell us about your current situation?',
      preferences: 'What are your main preferences or requirements?',
      suggestions: 'Do you have any suggestions or recommendations?',
      openEnded: 'Is there anything else you\'d like to share?'
    },
    
    slotSchema: {
      required: ['basic_info', 'preferences'],
      optional: ['suggestions', 'constraints', 'goals'],
      critical: ['basic_info']
    }
  }
};

/**
 * Get configuration for a specific survey type
 */
export function getSurveyTypeConfig(category) {
  return SURVEY_TYPE_CONFIG[category] || SURVEY_TYPE_CONFIG.general;
}

/**
 * Get survey type-specific completion logic
 */
export function getCompletionLogic(category) {
  const config = getSurveyTypeConfig(category);
  return config.completion;
}

/**
 * Get survey type-specific question generation behavior
 */
export function getQuestionGenerationBehavior(category) {
  const config = getSurveyTypeConfig(category);
  return config.questionGeneration;
}

/**
 * Get survey type-specific slot schema
 */
export function getSlotSchema(category) {
  const config = getSurveyTypeConfig(category);
  return config.slotSchema;
}

/**
 * Get survey type-specific question patterns
 */
export function getQuestionPatterns(category) {
  const config = getSurveyTypeConfig(category);
  return config.questionPatterns;
}
