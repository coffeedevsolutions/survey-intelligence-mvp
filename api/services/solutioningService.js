import { OpenAI } from 'openai';
import { pool } from '../config/database.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * AI-powered service for decomposing briefs into structured solutions
 */
export class SolutioningService {
  constructor() {
    this.defaultModel = 'gpt-4o-mini';
  }

  /**
   * Generate a complete solution breakdown from a brief
   */
  async generateSolutionFromBrief(briefId, orgId, createdBy) {
    try {
      console.log(`📋 [SOLUTIONING] Starting generation for brief ${briefId}, org ${orgId}`);
      
      // Get the brief
      console.log('📋 [SOLUTIONING] Fetching brief from database...');
      const briefResult = await pool.query(
        'SELECT * FROM project_briefs WHERE id = $1 AND org_id = $2',
        [briefId, orgId]
      );

      if (!briefResult.rows[0]) {
        console.log('❌ [SOLUTIONING] Brief not found');
        throw new Error('Brief not found');
      }

      const brief = briefResult.rows[0];
      console.log(`📋 [SOLUTIONING] Brief found: "${brief.title}"`);
      
      // Generate solution analysis using AI
      console.log('🤖 [SOLUTIONING] Starting AI analysis...');
      const solutionAnalysis = await this.analyzeBrief(brief);
      console.log('✅ [SOLUTIONING] AI analysis complete');
      
      // Create the solution record
      console.log('💾 [SOLUTIONING] Creating solution record...');
      const solution = await this.createSolution(briefId, orgId, solutionAnalysis, createdBy);
      console.log(`✅ [SOLUTIONING] Solution created with ID: ${solution.id}`);
      
      // Generate and store epics, stories, tasks, and requirements
      console.log('📝 [SOLUTIONING] Generating epics...');
      await this.generateEpics(solution.id, solutionAnalysis.epics);
      
      console.log('📋 [SOLUTIONING] Generating requirements...');
      await this.generateRequirements(solution.id, solutionAnalysis.requirements);
      
      console.log('🏗️ [SOLUTIONING] Generating architecture...');
      await this.generateArchitecture(solution.id, solutionAnalysis.architecture);
      
      console.log('⚠️ [SOLUTIONING] Generating risks...');
      await this.generateRisks(solution.id, solutionAnalysis.risks);
      
      console.log('🎉 [SOLUTIONING] Solution generation complete!');
      return solution;
    } catch (error) {
      console.error('❌ [SOLUTIONING] Error generating solution:', error);
      throw error;
    }
  }

  /**
   * AI analysis of brief to extract solution components
   */
  async analyzeBrief(brief) {
    console.log('🤖 [AI] Starting brief analysis...');
    console.log('🤖 [AI] Brief content length:', JSON.stringify(brief).length);
    
    const systemPrompt = `You are a senior technical architect and project manager. Analyze the provided business brief and create a comprehensive solution breakdown.

Generate a detailed JSON response with the following structure:
{
  "solution": {
    "name": "Solution Name",
    "description": "Brief description",
    "estimatedDurationWeeks": number,
    "estimatedEffortPoints": number,
    "complexityScore": number (1-10)
  },
  "epics": [
    {
      "name": "Epic Name",
      "description": "Epic description",
      "businessValue": "Business value explanation",
      "priority": number (1-5),
      "estimatedStoryPoints": number,
      "stories": [
        {
          "title": "Story title",
          "description": "As a [user] I want [goal] so that [benefit]",
          "storyType": "user_story|technical_story|spike",
          "acceptanceCriteria": ["Criterion 1", "Criterion 2"],
          "storyPoints": number,
          "priority": number (1-5),
          "tasks": [
            {
              "title": "Task title",
              "description": "Task description",
              "taskType": "development|testing|documentation|deployment|research",
              "estimatedHours": number
            }
          ]
        }
      ]
    }
  ],
  "requirements": [
    {
      "type": "functional|technical|performance|security|compliance",
      "category": "Category name",
      "title": "Requirement title",
      "description": "Detailed requirement description",
      "priority": number (1-5),
      "acceptanceCriteria": ["Criterion 1", "Criterion 2"]
    }
  ],
  "architecture": [
    {
      "componentType": "frontend|backend|database|integration|infrastructure",
      "name": "Component name",
      "description": "Component description",
      "technologyStack": ["Technology 1", "Technology 2"],
      "dependencies": ["Dependency 1", "Dependency 2"],
      "complexityNotes": "Complexity considerations"
    }
  ],
  "risks": [
    {
      "type": "technical|business|timeline|resource|integration",
      "title": "Risk title",
      "description": "Risk description",
      "probability": number (1-5),
      "impact": number (1-5),
      "mitigationStrategy": "Mitigation approach"
    }
  ]
}

Guidelines:
- Break down into logical epics (3-7 epics typically)
- Create user stories following standard format
- Include technical stories for infrastructure/architecture
- Add spike stories for research/uncertainty
- Estimate story points using Fibonacci sequence (1,2,3,5,8,13,21)
- Include comprehensive testing tasks
- Consider security, performance, and scalability
- Include deployment and documentation tasks
- Identify integration points and dependencies
- Assess realistic timelines and complexity`;

    const userPrompt = `Analyze this business brief and create a comprehensive solution breakdown:

BRIEF TITLE: ${brief.title || 'Business Solution Request'}

BRIEF CONTENT:
${brief.summary_md}

Focus on creating a realistic, implementable solution with proper work breakdown structure.`;

    let content = null;
    let cleanContent = null;

    try {
      console.log('🤖 [AI] Making OpenAI API call...');
      console.log('🤖 [AI] Model:', this.defaultModel);
      console.log('🤖 [AI] System prompt length:', systemPrompt.length);
      console.log('🤖 [AI] User prompt length:', userPrompt.length);
      
      const response = await openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 4000
      });

      console.log('✅ [AI] OpenAI API call successful');
      content = response.choices[0]?.message?.content?.trim();
      console.log('🤖 [AI] Response content length:', content?.length || 0);
      
      if (!content) {
        throw new Error('No content received from AI');
      }

      console.log('🤖 [AI] Parsing JSON response...');
      
      // Clean the content to handle markdown-wrapped JSON
      cleanContent = content.trim();
      
      // Remove markdown code blocks if present
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      console.log('🤖 [AI] Cleaned content length:', cleanContent.length);
      console.log('🤖 [AI] First 100 chars:', cleanContent.substring(0, 100));
      
      // Parse JSON response
      const analysis = JSON.parse(cleanContent);
      console.log('✅ [AI] JSON parsing successful');
      console.log('🤖 [AI] Analysis has epics:', analysis.epics?.length || 0);
      console.log('🤖 [AI] Analysis has requirements:', analysis.requirements?.length || 0);
      
      return analysis;
    } catch (error) {
      console.error('❌ [AI] AI analysis failed:', error);
      if (error.message.includes('JSON') || error.name === 'SyntaxError') {
        console.error('❌ [AI] JSON parsing error');
        console.error('❌ [AI] Raw OpenAI response (first 500 chars):');
        console.error(content?.substring(0, 500) || 'No content');
        console.error('❌ [AI] Cleaned content (first 500 chars):');
        console.error(cleanContent?.substring(0, 500) || 'No cleaned content');
      }
      throw new Error(`Failed to analyze brief: ${error.message}`);
    }
  }

  /**
   * Create solution record in database
   */
  async createSolution(briefId, orgId, analysis, createdBy) {
    const { solution } = analysis;
    
    const result = await pool.query(`
      INSERT INTO solutions (
        brief_id, org_id, name, description, 
        estimated_duration_weeks, estimated_effort_points, 
        complexity_score, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      briefId, orgId, solution.name, solution.description,
      solution.estimatedDurationWeeks, solution.estimatedEffortPoints,
      solution.complexityScore, createdBy
    ]);

    return result.rows[0];
  }

  /**
   * Generate epics and their stories/tasks
   */
  async generateEpics(solutionId, epics) {
    for (let i = 0; i < epics.length; i++) {
      const epic = epics[i];
      
      // Create epic
      const epicResult = await pool.query(`
        INSERT INTO solution_epics (
          solution_id, name, description, business_value, 
          priority, estimated_story_points, sort_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        solutionId, epic.name, epic.description, epic.businessValue,
        epic.priority, epic.estimatedStoryPoints, i
      ]);

      const epicId = epicResult.rows[0].id;

      // Create stories for this epic
      await this.generateStories(epicId, epic.stories || []);
    }
  }

  /**
   * Generate stories and their tasks
   */
  async generateStories(epicId, stories) {
    for (let i = 0; i < stories.length; i++) {
      const story = stories[i];
      
      // Create story
      const storyResult = await pool.query(`
        INSERT INTO solution_stories (
          epic_id, story_type, title, description, 
          acceptance_criteria, story_points, priority, sort_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        epicId, story.storyType, story.title, story.description,
        story.acceptanceCriteria, story.storyPoints, story.priority, i
      ]);

      const storyId = storyResult.rows[0].id;

      // Create tasks for this story
      await this.generateTasks(storyId, story.tasks || []);
    }
  }

  /**
   * Generate tasks for a story
   */
  async generateTasks(storyId, tasks) {
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      
      await pool.query(`
        INSERT INTO solution_tasks (
          story_id, title, description, task_type, 
          estimated_hours, sort_order
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        storyId, task.title, task.description, task.taskType,
        task.estimatedHours, i
      ]);
    }
  }

  /**
   * Generate requirements
   */
  async generateRequirements(solutionId, requirements) {
    for (const req of requirements) {
      await pool.query(`
        INSERT INTO solution_requirements (
          solution_id, requirement_type, category, title, 
          description, priority, acceptance_criteria
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        solutionId, req.type, req.category, req.title,
        req.description, req.priority, req.acceptanceCriteria
      ]);
    }
  }

  /**
   * Generate architecture components
   */
  async generateArchitecture(solutionId, architecture) {
    for (const comp of architecture) {
      await pool.query(`
        INSERT INTO solution_architecture (
          solution_id, component_type, name, description,
          technology_stack, dependencies, complexity_notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        solutionId, comp.componentType, comp.name, comp.description,
        comp.technologyStack, comp.dependencies, comp.complexityNotes
      ]);
    }
  }

  /**
   * Generate risks
   */
  async generateRisks(solutionId, risks) {
    for (const risk of risks) {
      await pool.query(`
        INSERT INTO solution_risks (
          solution_id, risk_type, title, description,
          probability, impact, mitigation_strategy
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        solutionId, risk.type, risk.title, risk.description,
        risk.probability, risk.impact, risk.mitigationStrategy
      ]);
    }
  }

  /**
   * Get complete solution with all components
   */
  async getSolutionById(solutionId, orgId) {
    // Get solution
    const solutionResult = await pool.query(
      'SELECT * FROM solutions WHERE id = $1 AND org_id = $2',
      [solutionId, orgId]
    );

    if (!solutionResult.rows[0]) {
      return null;
    }

    const solution = solutionResult.rows[0];

    // Get epics with stories and tasks
    const epicsResult = await pool.query(`
      SELECT e.*, 
        json_agg(
          json_build_object(
            'id', s.id,
            'story_type', s.story_type,
            'title', s.title,
            'description', s.description,
            'acceptance_criteria', s.acceptance_criteria,
            'story_points', s.story_points,
            'priority', s.priority,
            'tasks', (
              SELECT json_agg(
                json_build_object(
                  'id', t.id,
                  'title', t.title,
                  'description', t.description,
                  'task_type', t.task_type,
                  'estimated_hours', t.estimated_hours
                ) ORDER BY t.sort_order
              ) FROM solution_tasks t WHERE t.story_id = s.id
            )
          ) ORDER BY s.sort_order
        ) as stories
      FROM solution_epics e
      LEFT JOIN solution_stories s ON e.id = s.epic_id
      WHERE e.solution_id = $1
      GROUP BY e.id
      ORDER BY e.sort_order
    `, [solutionId]);

    // Get requirements
    const requirementsResult = await pool.query(
      'SELECT * FROM solution_requirements WHERE solution_id = $1 ORDER BY priority, category',
      [solutionId]
    );

    // Get architecture
    const architectureResult = await pool.query(
      'SELECT * FROM solution_architecture WHERE solution_id = $1 ORDER BY component_type',
      [solutionId]
    );

    // Get risks
    const risksResult = await pool.query(
      'SELECT * FROM solution_risks WHERE solution_id = $1 ORDER BY probability * impact DESC',
      [solutionId]
    );

    return {
      ...solution,
      epics: epicsResult.rows,
      requirements: requirementsResult.rows,
      architecture: architectureResult.rows,
      risks: risksResult.rows
    };
  }

  /**
   * Export solution in Jira-compatible format
   */
  async exportToJira(solutionId, orgId) {
    const solution = await this.getSolutionById(solutionId, orgId);
    
    if (!solution) {
      throw new Error('Solution not found');
    }

    const jiraExport = {
      project: {
        name: solution.name,
        description: solution.description,
        estimatedDuration: `${solution.estimated_duration_weeks} weeks`
      },
      epics: solution.epics.map(epic => ({
        summary: epic.name,
        description: epic.description,
        businessValue: epic.business_value,
        issueType: 'Epic',
        priority: this.mapPriorityToJira(epic.priority),
        storyPointsEstimate: epic.estimated_story_points,
        stories: epic.stories?.map(story => ({
          summary: story.title,
          description: story.description,
          issueType: this.mapStoryTypeToJira(story.story_type),
          storyPoints: story.story_points,
          priority: this.mapPriorityToJira(story.priority),
          acceptanceCriteria: story.acceptance_criteria?.join('\n'),
          tasks: story.tasks?.map(task => ({
            summary: task.title,
            description: task.description,
            issueType: 'Task',
            originalEstimate: `${task.estimated_hours}h`,
            taskType: task.task_type
          }))
        }))
      })),
      requirements: solution.requirements,
      architecture: solution.architecture,
      risks: solution.risks
    };

    return jiraExport;
  }

  mapPriorityToJira(priority) {
    const priorityMap = {
      1: 'Highest',
      2: 'High', 
      3: 'Medium',
      4: 'Low',
      5: 'Lowest'
    };
    return priorityMap[priority] || 'Medium';
  }

  mapStoryTypeToJira(storyType) {
    const typeMap = {
      'user_story': 'Story',
      'technical_story': 'Story',
      'spike': 'Spike',
      'bug': 'Bug'
    };
    return typeMap[storyType] || 'Story';
  }
}

export const solutioningService = new SolutioningService();
