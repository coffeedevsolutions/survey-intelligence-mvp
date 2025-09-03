/**
 * Atlassian Document Format (ADF) utilities
 * For creating rich content in Jira issues and comments
 */

/**
 * Convert plain text to ADF format
 */
export const adfFromText = (text) => ({
  type: 'doc',
  version: 1,
  content: [
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: text || ''
        }
      ]
    }
  ]
});

/**
 * Create ADF with multiple paragraphs from text with line breaks
 */
export const adfFromMultilineText = (text) => {
  if (!text) return adfFromText('');
  
  const lines = text.split('\n').filter(line => line.trim() !== '');
  
  return {
    type: 'doc',
    version: 1,
    content: lines.map(line => ({
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: line
        }
      ]
    }))
  };
};

/**
 * Create ADF with a heading and content
 */
export const adfWithHeading = (heading, content) => ({
  type: 'doc',
  version: 1,
  content: [
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [
        {
          type: 'text',
          text: heading
        }
      ]
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: content || ''
        }
      ]
    }
  ]
});

/**
 * Create ADF with bullet points
 */
export const adfWithBulletList = (items) => ({
  type: 'doc',
  version: 1,
  content: [
    {
      type: 'bulletList',
      content: items.map(item => ({
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: item
              }
            ]
          }
        ]
      }))
    }
  ]
});

/**
 * Create rich ADF for solution export
 */
export const adfForSolution = (solution) => {
  const content = [];
  
  // Description
  if (solution.description) {
    content.push({
      type: 'heading',
      attrs: { level: 3 },
      content: [{ type: 'text', text: 'Description' }]
    });
    content.push({
      type: 'paragraph',
      content: [{ type: 'text', text: solution.description }]
    });
  }
  
  // Architecture overview
  if (solution.architecture?.length > 0) {
    content.push({
      type: 'heading',
      attrs: { level: 3 },
      content: [{ type: 'text', text: 'Architecture Overview' }]
    });
    
    solution.architecture.forEach(arch => {
      content.push({
        type: 'paragraph',
        content: [
          { type: 'text', text: `${arch.component}: `, marks: [{ type: 'strong' }] },
          { type: 'text', text: arch.description || '' }
        ]
      });
    });
  }
  
  // Technical Requirements
  if (solution.requirements?.length > 0) {
    const techReqs = solution.requirements.filter(req => req.type === 'technical');
    if (techReqs.length > 0) {
      content.push({
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: 'Technical Requirements' }]
      });
      
      content.push({
        type: 'bulletList',
        content: techReqs.map(req => ({
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: req.description }]
          }]
        }))
      });
    }
  }
  
  return {
    type: 'doc',
    version: 1,
    content
  };
};
