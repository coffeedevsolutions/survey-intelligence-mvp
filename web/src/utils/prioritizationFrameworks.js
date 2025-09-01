/**
 * Prioritization Framework Utilities
 * Manages different prioritization methods for organizations
 */

export const PRIORITIZATION_FRAMEWORKS = {
  // Simple 1-5 priority scale (current default)
  SIMPLE: {
    id: 'simple',
    name: '1-5 Priority Scale',
    description: 'Simple numeric scale from 1 (highest) to 5 (lowest)',
    type: 'numeric',
    values: [
      { value: 1, label: 'Critical', color: '#dc2626', bgColor: '#fef2f2', borderColor: '#fca5a5' },
      { value: 2, label: 'High', color: '#d97706', bgColor: '#fffbeb', borderColor: '#fbbf24' },
      { value: 3, label: 'Medium', color: '#059669', bgColor: '#ecfdf5', borderColor: '#6ee7b7' },
      { value: 4, label: 'Low', color: '#2563eb', bgColor: '#eff6ff', borderColor: '#93c5fd' },
      { value: 5, label: 'Backlog', color: '#6b7280', bgColor: '#f9fafb', borderColor: '#d1d5db' }
    ]
  },

  // ICE Framework (Impact, Confidence, Ease)
  ICE: {
    id: 'ice',
    name: 'ICE Framework',
    description: 'Impact × Confidence × Ease scoring (1-10 each, total 1-1000)',
    type: 'composite',
    fields: [
      { 
        key: 'impact', 
        label: 'Impact', 
        description: 'How much will this move the needle?',
        min: 1, 
        max: 10 
      },
      { 
        key: 'confidence', 
        label: 'Confidence', 
        description: 'How confident are we this will work?',
        min: 1, 
        max: 10 
      },
      { 
        key: 'ease', 
        label: 'Ease', 
        description: 'How easy is this to implement?',
        min: 1, 
        max: 10 
      }
    ],
    scoreCalculation: (values) => (values.impact || 1) * (values.confidence || 1) * (values.ease || 1),
    getScoreLabel: (score) => {
      if (score >= 800) return { label: 'Critical', color: '#dc2626' };
      if (score >= 500) return { label: 'High', color: '#d97706' };
      if (score >= 200) return { label: 'Medium', color: '#059669' };
      if (score >= 50) return { label: 'Low', color: '#2563eb' };
      return { label: 'Backlog', color: '#6b7280' };
    }
  },

  // RICE Framework (Reach, Impact, Confidence, Effort)
  RICE: {
    id: 'rice',
    name: 'RICE Framework',
    description: 'Reach × Impact × Confidence ÷ Effort scoring',
    type: 'composite',
    fields: [
      { 
        key: 'reach', 
        label: 'Reach', 
        description: 'How many people will this affect?',
        min: 1, 
        max: 1000,
        unit: 'people/month'
      },
      { 
        key: 'impact', 
        label: 'Impact', 
        description: 'How much impact per person?',
        min: 0.25, 
        max: 3,
        step: 0.25,
        options: [
          { value: 3, label: 'Massive (3x)' },
          { value: 2, label: 'High (2x)' },
          { value: 1, label: 'Medium (1x)' },
          { value: 0.5, label: 'Low (0.5x)' },
          { value: 0.25, label: 'Minimal (0.25x)' }
        ]
      },
      { 
        key: 'confidence', 
        label: 'Confidence', 
        description: 'How confident are we in our estimates?',
        min: 10, 
        max: 100,
        unit: '%'
      },
      { 
        key: 'effort', 
        label: 'Effort', 
        description: 'How much work will this take?',
        min: 1, 
        max: 52,
        unit: 'person-weeks'
      }
    ],
    scoreCalculation: (values) => {
      const reach = values.reach || 1;
      const impact = values.impact || 1;
      const confidence = (values.confidence || 100) / 100;
      const effort = values.effort || 1;
      return Math.round((reach * impact * confidence) / effort * 100) / 100;
    },
    getScoreLabel: (score) => {
      if (score >= 1000) return { label: 'Critical', color: '#dc2626' };
      if (score >= 300) return { label: 'High', color: '#d97706' };
      if (score >= 100) return { label: 'Medium', color: '#059669' };
      if (score >= 30) return { label: 'Low', color: '#2563eb' };
      return { label: 'Backlog', color: '#6b7280' };
    }
  },

  // MoSCoW Framework
  MOSCOW: {
    id: 'moscow',
    name: 'MoSCoW Framework',
    description: 'Must have, Should have, Could have, Won\'t have',
    type: 'categorical',
    values: [
      { value: 'must', label: 'Must Have', color: '#dc2626', bgColor: '#fef2f2', borderColor: '#fca5a5', description: 'Critical, non-negotiable requirements' },
      { value: 'should', label: 'Should Have', color: '#d97706', bgColor: '#fffbeb', borderColor: '#fbbf24', description: 'Important but not critical' },
      { value: 'could', label: 'Could Have', color: '#059669', bgColor: '#ecfdf5', borderColor: '#6ee7b7', description: 'Nice to have if time permits' },
      { value: 'wont', label: 'Won\'t Have', color: '#6b7280', bgColor: '#f9fafb', borderColor: '#d1d5db', description: 'Not planned for this iteration' }
    ]
  },

  // Value vs Effort Matrix
  VALUE_EFFORT: {
    id: 'value_effort',
    name: 'Value vs Effort Matrix',
    description: 'Plot initiatives on Value (1-10) vs Effort (1-10) matrix',
    type: 'matrix',
    fields: [
      { 
        key: 'value', 
        label: 'Business Value', 
        description: 'How much business value will this deliver?',
        min: 1, 
        max: 10 
      },
      { 
        key: 'effort', 
        label: 'Implementation Effort', 
        description: 'How much effort will this require?',
        min: 1, 
        max: 10 
      }
    ],
    getQuadrant: (values) => {
      const value = values.value || 5;
      const effort = values.effort || 5;
      
      if (value >= 7 && effort <= 4) return { label: 'Quick Wins', color: '#059669', priority: 1 };
      if (value >= 7 && effort >= 7) return { label: 'Major Projects', color: '#d97706', priority: 2 };
      if (value <= 4 && effort <= 4) return { label: 'Fill-ins', color: '#2563eb', priority: 3 };
      if (value <= 4 && effort >= 7) return { label: 'Thankless Tasks', color: '#6b7280', priority: 4 };
      
      // Default to medium priority for middle values
      return { label: 'Evaluate', color: '#059669', priority: 2 };
    },
    getScoreLabel: (values) => {
      return this.getQuadrant(values);
    }
  },

  // Story Points (Fibonacci)
  STORY_POINTS: {
    id: 'story_points',
    name: 'Story Points (Fibonacci)',
    description: 'Fibonacci sequence for relative sizing (1, 2, 3, 5, 8, 13, 21)',
    type: 'numeric',
    values: [
      { value: 1, label: '1 - Trivial', color: '#059669', bgColor: '#ecfdf5', borderColor: '#6ee7b7' },
      { value: 2, label: '2 - Minor', color: '#059669', bgColor: '#ecfdf5', borderColor: '#6ee7b7' },
      { value: 3, label: '3 - Small', color: '#2563eb', bgColor: '#eff6ff', borderColor: '#93c5fd' },
      { value: 5, label: '5 - Medium', color: '#d97706', bgColor: '#fffbeb', borderColor: '#fbbf24' },
      { value: 8, label: '8 - Large', color: '#dc2626', bgColor: '#fef2f2', borderColor: '#fca5a5' },
      { value: 13, label: '13 - X-Large', color: '#7c2d12', bgColor: '#fef2f2', borderColor: '#f87171' },
      { value: 21, label: '21 - Epic', color: '#6b7280', bgColor: '#f9fafb', borderColor: '#d1d5db' }
    ]
  },

  // T-Shirt Sizes
  TSHIRT: {
    id: 'tshirt',
    name: 'T-Shirt Sizes',
    description: 'XS, S, M, L, XL, XXL sizing for relative estimation',
    type: 'categorical',
    values: [
      { value: 'xs', label: 'XS - Extra Small', color: '#059669', bgColor: '#ecfdf5', borderColor: '#6ee7b7' },
      { value: 's', label: 'S - Small', color: '#2563eb', bgColor: '#eff6ff', borderColor: '#93c5fd' },
      { value: 'm', label: 'M - Medium', color: '#d97706', bgColor: '#fffbeb', borderColor: '#fbbf24' },
      { value: 'l', label: 'L - Large', color: '#dc2626', bgColor: '#fef2f2', borderColor: '#fca5a5' },
      { value: 'xl', label: 'XL - Extra Large', color: '#7c2d12', bgColor: '#fef2f2', borderColor: '#f87171' },
      { value: 'xxl', label: 'XXL - Extra Extra Large', color: '#6b7280', bgColor: '#f9fafb', borderColor: '#d1d5db' }
    ]
  }
};

/**
 * Get framework by ID
 */
export function getFramework(frameworkId) {
  return PRIORITIZATION_FRAMEWORKS[frameworkId.toUpperCase()] || PRIORITIZATION_FRAMEWORKS.SIMPLE;
}

/**
 * Get all available frameworks
 */
export function getAllFrameworks() {
  return Object.values(PRIORITIZATION_FRAMEWORKS);
}

/**
 * Calculate priority score for a framework
 */
export function calculatePriorityScore(frameworkId, values) {
  const framework = getFramework(frameworkId);
  
  if (framework.scoreCalculation) {
    return framework.scoreCalculation(values);
  }
  
  // For simple numeric or categorical frameworks, return the value directly
  if (typeof values === 'object' && values.value !== undefined) {
    return values.value;
  }
  
  return values;
}

/**
 * Get priority label and styling for a score
 */
export function getPriorityLabel(frameworkId, scoreOrValues) {
  const framework = getFramework(frameworkId);
  
  if (framework.getScoreLabel) {
    if (framework.type === 'composite' || framework.type === 'matrix') {
      return framework.getScoreLabel(scoreOrValues);
    } else {
      const score = calculatePriorityScore(frameworkId, scoreOrValues);
      return framework.getScoreLabel(score);
    }
  }
  
  // For frameworks with predefined values, find the matching value
  if (framework.values) {
    const value = typeof scoreOrValues === 'object' ? scoreOrValues.value : scoreOrValues;
    const match = framework.values.find(v => v.value === value);
    if (match) {
      return {
        label: match.label,
        color: match.color,
        bgColor: match.bgColor,
        borderColor: match.borderColor
      };
    }
  }
  
  // Default fallback
  return { label: 'Unknown', color: '#6b7280' };
}

/**
 * Format priority for display
 */
export function formatPriorityDisplay(frameworkId, scoreOrValues) {
  const framework = getFramework(frameworkId);
  const label = getPriorityLabel(frameworkId, scoreOrValues);
  
  if (framework.type === 'composite') {
    const score = calculatePriorityScore(frameworkId, scoreOrValues);
    return {
      ...label,
      displayText: `${label.label} (${score})`,
      score
    };
  }
  
  return {
    ...label,
    displayText: label.label,
    score: typeof scoreOrValues === 'object' ? scoreOrValues.value : scoreOrValues
  };
}

/**
 * Validate priority values for a framework
 */
export function validatePriorityValues(frameworkId, values) {
  const framework = getFramework(frameworkId);
  const errors = [];
  
  if (framework.type === 'composite' || framework.type === 'matrix') {
    framework.fields.forEach(field => {
      const value = values[field.key];
      if (value === undefined || value === null || value === '') {
        errors.push(`${field.label} is required`);
      } else if (typeof value === 'number') {
        if (value < field.min || value > field.max) {
          errors.push(`${field.label} must be between ${field.min} and ${field.max}`);
        }
      }
    });
  } else if (framework.type === 'numeric' || framework.type === 'categorical') {
    if (!values || (typeof values === 'object' && values.value === undefined)) {
      errors.push('Priority value is required');
    }
  }
  
  return errors;
}
