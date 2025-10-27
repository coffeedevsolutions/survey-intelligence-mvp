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
      completionCriteria: ['sentiment_expressed', 'challenges_identified', 'suggestions_provided', 'learning_outcomes_assessed'],
      maxQuestions: 12  // Allow more questions for detailed feedback
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
    },

    // Prompt Enhancement for AI Generation
    promptEnhancement: {
      roleDescription: 'an empathetic educational feedback analyst who understands the learning journey',
      keyPriorities: [
        'Identify and explore emotional responses to the learning experience',
        'Discover specific challenges and pain points in the course',
        'Gather actionable suggestions for improvement',
        'Understand the learning outcomes and knowledge gained',
        'Maintain a supportive and encouraging tone'
      ],
      avoidancePatterns: [
        'Avoid technical jargon when asking about course structure',
        'Don\'t ask about external factors outside the course\'s control',
        'Avoid repetitive questions about the same topic'
      ],
      languageTone: 'empathetic',
      fatigueThreshold: 6
    },

    // Analysis Directives
    analysisDirectives: {
      sentimentHandling: 'When negative sentiment appears, immediately explore the specific challenges. When positive sentiment appears, understand what worked well and how to replicate it.',
      keywordFocus: ['difficult', 'confusing', 'challenging', 'helpful', 'valuable', 'learned', 'improve', 'struggle', 'confused', 'clear', 'enjoyed', 'useful'],
      followUpTriggers: [
        'Negative emotion words → Drill into specific challenges',
        'Knowledge claims → Verify understanding and application',
        'Suggestion mentions → Ask for specific examples'
      ],
      completionSignals: ['Sentiment fully explored', 'Challenges identified with details', 'Suggestions provided', 'Learning outcomes assessed']
    },

    // Validation Rules
    validationRules: {
      requiredInsights: ['overall_sentiment', 'key_challenges', 'main_suggestions', 'learning_outcomes'],
      criticalPaths: ['overall_experience', 'challenges_faced'],
      redundancyChecks: {
        similarityThreshold: 0.85,
        maxRepeatsPerTopic: 2
      }
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
    },

    // Prompt Enhancement for AI Generation
    promptEnhancement: {
      roleDescription: 'an empathetic customer experience analyst focused on understanding satisfaction and loyalty',
      keyPriorities: [
        'Measure overall satisfaction levels and sentiment',
        'Identify specific pain points or issues experienced',
        'Understand what drives positive experiences',
        'Gather actionable improvement suggestions',
        'Assess likelihood to recommend'
      ],
      avoidancePatterns: [
        'Avoid asking about internal company processes',
        'Don\'t ask technical questions beyond user experience',
        'Avoid repetitive satisfaction questions'
      ],
      languageTone: 'empathetic',
      fatigueThreshold: 5
    },

    // Analysis Directives
    analysisDirectives: {
      sentimentHandling: 'Prioritize negative sentiment first - address concerns and dissatisfaction before exploring positives. For positive sentiment, understand what creates delight.',
      keywordFocus: ['satisfied', 'frustrated', 'love', 'hate', 'broken', 'amazing', 'terrible', 'easy', 'difficult', 'recommend', 'disappointed', 'wedge'],
      followUpTriggers: [
        'Negative sentiment → Drill into specific problems and impact',
        'Positive sentiment → Understand what creates value',
        'Moderate ratings → Explore what would improve experience'
      ],
      completionSignals: ['Satisfaction level clearly expressed', 'Specific issues or positives identified', 'Improvement suggestions gathered', 'Recommendation likelihood assessed']
    },

    // Validation Rules
    validationRules: {
      requiredInsights: ['satisfaction_level', 'key_experiences', 'improvement_suggestions'],
      criticalPaths: ['satisfaction_rating', 'experience_description'],
      redundancyChecks: {
        similarityThreshold: 0.85,
        maxRepeatsPerTopic: 2
      }
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
    },

    // Prompt Enhancement for AI Generation
    promptEnhancement: {
      roleDescription: 'a confidential and empathetic workplace culture analyst',
      keyPriorities: [
        'Understand workplace satisfaction and concerns',
        'Identify areas for organizational improvement',
        'Assess management effectiveness and culture',
        'Gather constructive feedback on workplace experience',
        'Maintain strict confidentiality and trust'
      ],
      avoidancePatterns: [
        'Avoid asking about specific individuals by name',
        'Don\'t ask for gossip or personal opinions about colleagues',
        'Avoid repeating questions about the same topic'
      ],
      languageTone: 'empathetic',
      fatigueThreshold: 7
    },

    // Analysis Directives
    analysisDirectives: {
      sentimentHandling: 'Handle both positive and negative sentiment carefully. For concerns, explore impact and urgency. For positives, understand what creates satisfaction.',
      keywordFocus: ['satisfied', 'concerned', 'frustrated', 'happy', 'supportive', 'challenging', 'toxic', 'great culture', 'micromanagement', 'supportive management', 'growth opportunities'],
      followUpTriggers: [
        'Negative workplace mentions → Explore impact and frequency',
        'Management concerns → Understand specifics without names',
        'Growth interest → Discuss opportunities'
      ],
      completionSignals: ['Workplace satisfaction assessed', 'Concerns or positive aspects identified', 'Suggestions provided for improvement']
    },

    // Validation Rules
    validationRules: {
      requiredInsights: ['workplace_satisfaction', 'concerns_or_positives', 'improvement_suggestions'],
      criticalPaths: ['workplace_satisfaction', 'concerns_identified'],
      redundancyChecks: {
        similarityThreshold: 0.85,
        maxRepeatsPerTopic: 2
      }
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
    },

    // Prompt Enhancement for AI Generation
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

    // Analysis Directives
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

    // Validation Rules
    validationRules: {
      requiredInsights: ['event_rating', 'content_assessment', 'suggestions'],
      criticalPaths: ['event_rating', 'content_evaluation'],
      redundancyChecks: {
        similarityThreshold: 0.85,
        maxRepeatsPerTopic: 2
      }
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
    },

    // Prompt Enhancement for AI Generation
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

    // Analysis Directives
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

    // Validation Rules
    validationRules: {
      requiredInsights: ['product_rating', 'usability_assessment', 'improvement_suggestions'],
      criticalPaths: ['product_rating', 'usability_assessment'],
      redundancyChecks: {
        similarityThreshold: 0.85,
        maxRepeatsPerTopic: 2
      }
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
    },

    // Prompt Enhancement for AI Generation
    promptEnhancement: {
      roleDescription: 'a customer service quality analyst focused on support experience',
      keyPriorities: [
        'Assess service quality and resolution satisfaction',
        'Evaluate staff attitude and communication',
        'Understand response time impact',
        'Gather actionable service improvement suggestions',
        'Address dissatisfaction immediately and fully'
      ],
      avoidancePatterns: [
        'Avoid asking about internal support processes',
        'Don\'t ask for staff names or blame assignment',
        'Avoid repetitive questions about same issue'
      ],
      languageTone: 'empathetic',
      fatigueThreshold: 5
    },

    // Analysis Directives
    analysisDirectives: {
      sentimentHandling: 'Negative service experiences require immediate attention and detailed follow-up. Positive experiences should clarify what worked well.',
      keywordFocus: ['helpful', 'unhelpful', 'professional', 'rude', 'fast', 'slow', 'resolved', 'not resolved', 'patient', 'frustrating'],
      followUpTriggers: [
        'Resolution mentions → Clarify satisfaction',
        'Staff attitude mentions → Understand specifics',
        'Time mentions → Assess impact'
      ],
      completionSignals: ['Service rated', 'Resolution assessed', 'Improvement suggestions gathered']
    },

    // Validation Rules
    validationRules: {
      requiredInsights: ['service_rating', 'resolution_satisfaction', 'improvement_suggestions'],
      criticalPaths: ['service_rating', 'resolution_satisfaction'],
      redundancyChecks: {
        similarityThreshold: 0.85,
        maxRepeatsPerTopic: 2
      }
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
    },

    // Prompt Enhancement for AI Generation
    promptEnhancement: {
      roleDescription: 'a structured requirements analyst focused on comprehensive project understanding',
      keyPriorities: [
        'Define clear business objectives and success criteria',
        'Gather detailed functional requirements',
        'Identify technical constraints and stakeholders',
        'Establish timeline and budget expectations',
        'Avoid repetition and fatigue while ensuring completeness'
      ],
      avoidancePatterns: [
        'Avoid asking about feelings or emotions',
        'Don\'t repeat questions about already-covered topics',
        'Avoid vague or open-ended exploration',
        'Focus on facts and specific requirements'
      ],
      languageTone: 'professional',
      fatigueThreshold: 12
    },

    // Analysis Directives
    analysisDirectives: {
      sentimentHandling: 'Focus on facts, not feelings. For any ambiguous requirements, ask for clarification and specifics.',
      keywordFocus: ['requirement', 'must have', 'nice to have', 'stakeholder', 'budget', 'timeline', 'constraint', 'integration', 'security', 'performance'],
      followUpTriggers: [
        'Vague requirements → Ask for specifics and examples',
        'Constraint mentions → Explore implications',
        'Stakeholder mentions → Identify all affected parties'
      ],
      completionSignals: ['Business objectives defined', 'Functional requirements clear', 'Stakeholders identified', 'Timeline and budget discussed']
    },

    // Validation Rules
    validationRules: {
      requiredInsights: ['business_objectives', 'functional_requirements', 'stakeholders', 'timeline', 'budget'],
      criticalPaths: ['business_objectives', 'functional_requirements', 'stakeholders'],
      redundancyChecks: {
        similarityThreshold: 0.80,
        maxRepeatsPerTopic: 3
      }
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
    },

    // Prompt Enhancement for AI Generation
    promptEnhancement: {
      roleDescription: 'a systematic technical troubleshooter focused on efficient problem resolution',
      keyPriorities: [
        'Document symptoms and timeline',
        'Identify environment configuration and changes',
        'Understand reproduction steps',
        'Assess testing and workarounds already attempted',
        'Be methodical and avoid asking redundant questions'
      ],
      avoidancePatterns: [
        'Avoid asking about feelings or impact unless relevant to priority',
        'Don\'t repeat environment questions',
        'Avoid vague troubleshooting questions',
        'Focus on specific, actionable technical details'
      ],
      languageTone: 'technical',
      fatigueThreshold: 9
    },

    // Analysis Directives
    analysisDirectives: {
      sentimentHandling: 'Stay technical and solution-focused. Acknowledge frustration briefly but return to diagnosis.',
      keywordFocus: ['symptom', 'error', 'crash', 'freeze', 'slow', 'version', 'update', 'installation', 'config', 'log', 'when', 'how often', 'always', 'sometimes'],
      followUpTriggers: [
        'Symptom mentions → Get specific details and timing',
        'Error mentions → Request exact messages',
        'Timing mentions → Understand onset and patterns',
        'Change mentions → Explore before/after'
      ],
      completionSignals: ['Symptoms documented', 'Environment analyzed', 'Timeline established', 'Testing completed']
    },

    // Validation Rules
    validationRules: {
      requiredInsights: ['symptoms', 'environment', 'timeline'],
      criticalPaths: ['symptoms', 'environment'],
      redundancyChecks: {
        similarityThreshold: 0.80,
        maxRepeatsPerTopic: 3
      }
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
    },

    // Prompt Enhancement for AI Generation
    promptEnhancement: {
      roleDescription: 'a strategic business analyst focused on process improvement and gap analysis',
      keyPriorities: [
        'Understand current state and pain points',
        'Define desired future state and goals',
        'Identify gaps and improvement opportunities',
        'Map stakeholders and processes',
        'Ensure comprehensive analysis before completion'
      ],
      avoidancePatterns: [
        'Avoid emotional language unless discussing stakeholder concerns',
        'Don\'t ask about implementation details yet',
        'Avoid repeating process questions',
        'Focus on business value and outcomes'
      ],
      languageTone: 'professional',
      fatigueThreshold: 10
    },

    // Analysis Directives
    analysisDirectives: {
      sentimentHandling: 'Recognize pain points and concerns but stay analytical. Focus on business impact, not emotions.',
      keywordFocus: ['pain point', 'challenge', 'gap', 'inefficient', 'automation', 'improve', 'process', 'workflow', 'bottleneck', 'current state', 'future state'],
      followUpTriggers: [
        'Pain point mentions → Explore impact and frequency',
        'Gap mentions → Understand desired state',
        'Process mentions → Map details and stakeholders'
      ],
      completionSignals: ['Current state analyzed', 'Desired state defined', 'Gaps identified', 'Stakeholders mapped']
    },

    // Validation Rules
    validationRules: {
      requiredInsights: ['current_state', 'desired_state', 'gap_analysis', 'stakeholders'],
      criticalPaths: ['current_state', 'desired_state', 'gap_analysis'],
      redundancyChecks: {
        similarityThreshold: 0.80,
        maxRepeatsPerTopic: 3
      }
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
    },

    // Prompt Enhancement for AI Generation
    promptEnhancement: {
      roleDescription: 'a supportive skills and competency assessor',
      keyPriorities: [
        'Evaluate current skill levels accurately',
        'Identify strengths and development areas',
        'Understand learning needs and goals',
        'Gather information for development planning',
        'Maintain encouraging and supportive tone'
      ],
      avoidancePatterns: [
        'Avoid comparisons with others',
        'Don\'t ask judgmental questions',
        'Avoid repetitive skill questions',
        'Keep assessment positive and growth-oriented'
      ],
      languageTone: 'empathetic',
      fatigueThreshold: 8
    },

    // Analysis Directives
    analysisDirectives: {
      sentimentHandling: 'Keep assessment positive and growth-focused. Address any self-doubt or confidence issues with support.',
      keywordFocus: ['experienced', 'beginner', 'intermediate', 'expert', 'confident', 'comfortable', 'skill', 'competency', 'develop', 'improve', 'strong'],
      followUpTriggers: [
        'Skill level mentions → Understand scope and depth',
        'Development mentions → Explore learning interests',
        'Strength mentions → Validate and expand'
      ],
      completionSignals: ['Skills assessed', 'Competency levels identified', 'Learning needs defined']
    },

    // Validation Rules
    validationRules: {
      requiredInsights: ['current_skills', 'competency_levels', 'learning_needs'],
      criticalPaths: ['current_skills', 'competency_levels'],
      redundancyChecks: {
        similarityThreshold: 0.85,
        maxRepeatsPerTopic: 2
      }
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
    },

    // Prompt Enhancement for AI Generation  
    promptEnhancement: {
      roleDescription: 'a systematic technical troubleshooter focused on efficient problem resolution',
      keyPriorities: [
        'Document symptoms and timeline',
        'Identify environment configuration and changes',
        'Understand reproduction steps',
        'Assess testing and workarounds already attempted',
        'Be methodical and avoid asking redundant questions'
      ],
      avoidancePatterns: [
        'Avoid asking about feelings or impact unless relevant to priority',
        'Don\'t repeat environment questions',
        'Avoid vague troubleshooting questions',
        'Focus on specific, actionable technical details'
      ],
      languageTone: 'technical',
      fatigueThreshold: 9
    },

    // Analysis Directives
    analysisDirectives: {
      sentimentHandling: 'Stay technical and solution-focused. Acknowledge frustration briefly but return to diagnosis.',
      keywordFocus: ['symptom', 'error', 'crash', 'freeze', 'slow', 'version', 'update', 'installation', 'config', 'log', 'when', 'how often', 'always', 'sometimes'],
      followUpTriggers: [
        'Symptom mentions → Get specific details and timing',
        'Error mentions → Request exact messages',
        'Timing mentions → Understand onset and patterns',
        'Change mentions → Explore before/after'
      ],
      completionSignals: ['Symptoms documented', 'Environment analyzed', 'Timeline established', 'Testing completed']
    },

    // Validation Rules
    validationRules: {
      requiredInsights: ['symptoms', 'environment', 'timeline'],
      criticalPaths: ['symptoms', 'environment'],
      redundancyChecks: {
        similarityThreshold: 0.80,
        maxRepeatsPerTopic: 3
      }
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
    },

    // Prompt Enhancement for AI Generation
    promptEnhancement: {
      roleDescription: 'a market insights researcher focused on consumer behavior and preferences',
      keyPriorities: [
        'Understand buying behavior and decision factors',
        'Identify preferences and priorities',
        'Map competitor landscape',
        'Gather demographic insights',
        'Keep conversational and engaging'
      ],
      avoidancePatterns: [
        'Avoid asking about internal business processes',
        'Don\'t ask for sensitive financial information',
        'Avoid repetitive preference questions',
        'Keep focused on external market factors'
      ],
      languageTone: 'conversational',
      fatigueThreshold: 7
    },

    // Analysis Directives
    analysisDirectives: {
      sentimentHandling: 'Explore preferences neutrally. Understand motivations without judgment.',
      keywordFocus: ['usually', 'prefer', 'consider', 'price', 'quality', 'brand', 'competitor', 'alternatives', 'decision', 'factors'],
      followUpTriggers: [
        'Preference mentions → Understand reasoning and weight',
        'Competitor mentions → Explore comparison factors',
        'Behavior mentions → Understand patterns and triggers'
      ],
      completionSignals: ['Preferences identified', 'Behavior analyzed', 'Demographics collected']
    },

    // Validation Rules
    validationRules: {
      requiredInsights: ['preferences', 'buying_behavior', 'demographics'],
      criticalPaths: ['preferences', 'buying_behavior'],
      redundancyChecks: {
        similarityThreshold: 0.85,
        maxRepeatsPerTopic: 2
      }
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
    },

    // Prompt Enhancement for AI Generation
    promptEnhancement: {
      roleDescription: 'an empathetic user experience researcher focused on behavior and needs',
      keyPriorities: [
        'Understand user behavior and workflows',
        'Identify pain points and frustrations',
        'Map user needs and desires',
        'Gather insights for product improvement',
        'Maintain empathy and understanding'
      ],
      avoidancePatterns: [
        'Avoid asking about internal processes',
        'Don\'t ask leading questions',
        'Avoid repetitive behavior questions',
        'Keep exploration natural and unforced'
      ],
      languageTone: 'empathetic',
      fatigueThreshold: 7
    },

    // Analysis Directives
    analysisDirectives: {
      sentimentHandling: 'For negative experiences, dig deep into root causes and impact. For positive experiences, understand what creates value.',
      keywordFocus: ['usually', 'typically', 'pain', 'frustration', 'confusion', 'difficult', 'easy', 'wish', 'want', 'need', 'workflow', 'habit'],
      followUpTriggers: [
        'Behavior mentions → Explore patterns and motivations',
        'Pain point mentions → Understand frequency and impact',
        'Wish/need mentions → Explore desired state'
      ],
      completionSignals: ['Behavior understood', 'Pain points identified', 'Needs assessed']
    },

    // Validation Rules
    validationRules: {
      requiredInsights: ['user_behavior', 'pain_points', 'needs'],
      criticalPaths: ['user_behavior', 'pain_points'],
      redundancyChecks: {
        similarityThreshold: 0.85,
        maxRepeatsPerTopic: 2
      }
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

  // Satisfaction Surveys
  satisfaction_survey: {
    name: 'Satisfaction Survey',
    description: 'General satisfaction measurement and experience quality assessment',
    
    questionGeneration: {
      focusAreas: ['satisfaction_levels', 'experience_quality', 'expectations_vs_reality', 'overall_impression'],
      sentimentPriority: true,
      conversationalTone: true,
      empathyLevel: 'high',
      questionTypes: ['rating_focused', 'experience_based', 'suggestive']
    },
    
    completion: {
      threshold: 0.70,
      hasOpenEndedPhase: true,
      openEndedQuestions: 2,
      completionCriteria: ['satisfaction_measured', 'experience_evaluated', 'feedback_provided']
    },
    
    questionPatterns: {
      opening: 'Thank you for your time! We\'d love to understand how satisfied you are with your experience.',
      satisfaction: 'Overall, how satisfied are you with [service/product/experience]?',
      expectations: 'How did your experience compare to your expectations?',
      improvement: 'What would have made you more satisfied?',
      openEnded: 'Is there anything else you\'d like to share about your experience?'
    },
    
    slotSchema: {
      required: ['satisfaction_rating', 'experience_assessment'],
      optional: ['expectations_comparison', 'improvement_suggestions', 'positive_aspects', 'negative_aspects'],
      critical: ['satisfaction_rating', 'experience_assessment']
    }
  },

  // Onboarding Feedback Surveys
  onboarding_feedback: {
    name: 'Onboarding Feedback',
    description: 'New employee/user onboarding experience feedback',
    
    questionGeneration: {
      focusAreas: ['onboarding_process', 'clarity', 'support', 'first_impressions', 'readiness'],
      sentimentPriority: true,
      conversationalTone: true,
      empathyLevel: 'high',
      questionTypes: ['supportive', 'reflective', 'constructive']
    },
    
    completion: {
      threshold: 0.75,
      hasOpenEndedPhase: true,
      openEndedQuestions: 2,
      completionCriteria: ['process_evaluated', 'support_assessed', 'first_impressions_captured']
    },
    
    questionPatterns: {
      opening: 'Welcome! We\'d love to hear about your onboarding experience so far. How is everything going?',
      process: 'How well did the onboarding process prepare you for your role?',
      support: 'Did you receive the support you needed during onboarding?',
      impression: 'What was your first impression of the organization?',
      readiness: 'How confident do you feel about starting your work?',
      openEnded: 'Is there anything else about your onboarding experience you\'d like to share?'
    },
    
    slotSchema: {
      required: ['process_evaluation', 'support_assessment', 'readiness_level'],
      optional: ['first_impressions', 'confusion_areas', 'improvement_suggestions', 'positive_aspects'],
      critical: ['process_evaluation', 'support_assessment']
    }
  },

  // Training Evaluation Surveys
  training_evaluation: {
    name: 'Training Evaluation',
    description: 'Training program effectiveness and knowledge retention assessment',
    
    questionGeneration: {
      focusAreas: ['content_quality', 'delivery', 'applicability', 'knowledge_retention', 'instructor'],
      sentimentPriority: true,
      conversationalTone: true,
      empathyLevel: 'high',
      questionTypes: ['evaluative', 'reflective', 'developmental']
    },
    
    completion: {
      threshold: 0.80,
      hasOpenEndedPhase: true,
      openEndedQuestions: 3,
      completionCriteria: ['content_evaluated', 'delivery_assessed', 'applicability_determined', 'retention_measured']
    },
    
    questionPatterns: {
      opening: 'Thank you for participating in the training! Let\'s discuss how valuable the training was for you.',
      content: 'How relevant and valuable was the training content?',
      delivery: 'How effective was the delivery method and instructor?',
      application: 'How likely are you to apply what you learned?',
      retention: 'What are the key takeaways you\'ll remember?',
      openEnded: 'What additional thoughts do you have about the training?'
    },
    
    slotSchema: {
      required: ['content_rating', 'delivery_rating', 'applicability_assessment'],
      optional: ['key_learnings', 'improvement_areas', 'instructor_feedback', 'follow_up_needs'],
      critical: ['content_rating', 'delivery_rating', 'applicability_assessment']
    }
  },

  // Performance Review Surveys
  performance_review: {
    name: 'Performance Review',
    description: 'Employee performance assessment and competency evaluation',
    
    questionGeneration: {
      focusAreas: ['achievements', 'goals', 'development_areas', 'competencies', 'future_objectives'],
      sentimentPriority: false,
      conversationalTone: true,
      empathyLevel: 'medium',
      questionTypes: ['evaluative', 'goal_oriented', 'developmental']
    },
    
    completion: {
      threshold: 0.85,
      hasOpenEndedPhase: true,
      openEndedQuestions: 2,
      completionCriteria: ['achievements_recognized', 'goals_discussed', 'development_identified']
    },
    
    questionPatterns: {
      opening: 'Thank you for participating in this performance review. Let\'s discuss your accomplishments and development.',
      achievements: 'What are your main achievements over this period?',
      goals: 'How would you assess your progress toward your goals?',
      development: 'What areas would you like to develop further?',
      objectives: 'What are your objectives for the upcoming period?',
      openEnded: 'Is there anything else you\'d like to discuss about your performance?'
    },
    
    slotSchema: {
      required: ['achievements', 'goals_progress', 'development_areas'],
      optional: ['competencies', 'future_objectives', 'support_needs', 'strengths'],
      critical: ['achievements', 'goals_progress', 'development_areas']
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

/**
 * Get survey type-specific prompt enhancement configuration
 */
export function getPromptEnhancement(category) {
  const config = getSurveyTypeConfig(category);
  return config.promptEnhancement || {
    roleDescription: 'a professional survey conductor',
    keyPriorities: ['Gather comprehensive information'],
    avoidancePatterns: [],
    languageTone: 'professional',
    fatigueThreshold: 8
  };
}

/**
 * Get survey type-specific analysis directives
 */
export function getAnalysisDirectives(category) {
  const config = getSurveyTypeConfig(category);
  return config.analysisDirectives || {
    sentimentHandling: 'Handle sentiment appropriately based on context',
    keywordFocus: [],
    followUpTriggers: [],
    completionSignals: []
  };
}

/**
 * Get survey type-specific validation rules
 */
export function getValidationRules(category) {
  const config = getSurveyTypeConfig(category);
  return config.validationRules || {
    requiredInsights: [],
    criticalPaths: [],
    redundancyChecks: {
      similarityThreshold: 0.85,
      maxRepeatsPerTopic: 2
    }
  };
}
