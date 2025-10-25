import { OpenAI } from 'openai';
import { validateAIResponse } from '../../../platform/ai/validators/aiResponseValidator.js';
import { pool } from '../../../database/connection.js';
import { pmTemplateService } from './pmTemplateService.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * AI-powered service for decomposing briefs into structured solutions
 */
export class SolutioningService {
  constructor() {
    this.defaultModel = 'gpt-4o-mini';
  }

  /**
   * Build dynamic system prompt based on organization configuration
   */
  buildSystemPrompt(orgConfig) {
    const epicsConfig = orgConfig.epics || {};
    const requirementsConfig = orgConfig.requirements || {};
    const aiInstructions = orgConfig.aiInstructions || {};
    
    let prompt = `You are a senior technical architect and project manager. Analyze the provided business brief and create a comprehensive solution breakdown.

Generate a detailed JSON response with the following structure:
{
  "title": "Project Title",
  "summary": "Comprehensive project summary (50-2000 characters)",
  "epics": [
    {
      "id": "epic_1",
      "title": "Epic Title",
      "description": "Epic description (20-1000 characters)",
      "priority": "critical|high|medium|low",
      "estimated_effort": "small|medium|large|extra-large",
      "dependencies": ["dependency1", "dependency2"],
      "acceptance_criteria": ["Criterion 1", "Criterion 2"],
      "stakeholders": ["stakeholder1", "stakeholder2"]
    }
  ],
  "requirements": [
    {
      "id": "req_1",
      "description": "Requirement description (10-500 characters)",
      "type": "functional|non-functional|technical|business|compliance",
      "priority": "must-have|should-have|could-have|won't-have",
      "epic_id": "epic_1",
      "acceptance_criteria": ["Criterion 1", "Criterion 2"],
      "dependencies": ["dependency1"],
      "estimated_effort": "small|medium|large|extra-large"
    }
  ],
  "technical_stack": {
    "frontend": ["React", "TypeScript"],
    "backend": ["Node.js", "Express"],
    "database": ["PostgreSQL"],
    "infrastructure": ["AWS", "Docker"]
  },
  "risks": [
    {
      "description": "Risk description (10-500 characters)",
      "impact": "low|medium|high|critical",
      "probability": "low|medium|high",
      "mitigation": "Mitigation strategy"
    }
  ],
  "timeline": {
    "estimated_duration": "12 weeks",
    "phases": [
      {
        "name": "Phase 1",
        "duration": "4 weeks",
        "description": "Phase description"
      }
    ]
  },
  "success_metrics": [
    {
      "metric": "User satisfaction",
      "target": "90%",
      "measurement_method": "User survey"
    }
  ],
  "confidence_score": 0.85,
  "metadata": {
    "analysis_version": "1.0",
    "generated_at": "2024-01-01T00:00:00Z",
    "model_used": "gpt-4o-mini",
    "processing_time_ms": 1500
  }
}

Focus on creating a realistic, implementable solution with proper work breakdown structure.`;
    return prompt;
  }

  /**
   * Get allowed requirement types based on configuration
   */
  getAllowedRequirementTypes(requirementsConfig) {
    const categories = requirementsConfig.categories || {};
    const allowedTypes = [];
    
    if (categories.functional !== false) allowedTypes.push('functional');
    if (categories.technical !== false) allowedTypes.push('technical');
    if (categories.performance !== false) allowedTypes.push('performance');
    if (categories.security !== false) allowedTypes.push('security');
    if (categories.compliance !== false) allowedTypes.push('compliance');
    
    return allowedTypes.join('|') || 'functional|technical|performance|security|compliance';
  }

  /**
   * Get enabled requirement types as array
   */
  getEnabledRequirementTypes(requirementsConfig) {
    const categories = requirementsConfig.categories || {};
    const enabledTypes = [];
    
    if (categories.functional !== false) enabledTypes.push('functional');
    if (categories.technical !== false) enabledTypes.push('technical');
    if (categories.performance !== false) enabledTypes.push('performance');
    if (categories.security !== false) enabledTypes.push('security');
    if (categories.compliance !== false) enabledTypes.push('compliance');
    
    return enabledTypes;
  }

  /**
   * Generate a complete solution breakdown from a brief
   */
  async generateSolutionFromBrief(briefId, orgId, createdBy, templateId = null) {
    try {
      console.log(`📋 [SOLUTIONING] Starting generation for brief ${briefId}, org ${orgId}`);
      
      // Get the brief, organization configuration, and PM template
      console.log('📋 [SOLUTIONING] Fetching brief, organization config, and PM template from database...');
      const [briefResult, orgResult] = await Promise.all([
        pool.query(
          'SELECT * FROM project_briefs WHERE id = $1 AND org_id = $2',
          [briefId, orgId]
        ),
        pool.query(
          'SELECT solution_generation_config, pm_template_config FROM organizations WHERE id = $1',
          [orgId]
        )
      ]);

      if (!briefResult.rows[0]) {
        console.log('❌ [SOLUTIONING] Brief not found');
        throw new Error('Brief not found');
      }

      const brief = briefResult.rows[0];
      const orgConfig = orgResult.rows[0]?.solution_generation_config || {};
      const pmTemplateConfig = orgResult.rows[0]?.pm_template_config || {};
      
      console.log(`📋 [SOLUTIONING] Brief found: "${brief.title}"`);
      console.log('⚙️ [SOLUTIONING] Using organization config:', Object.keys(orgConfig).length > 0 ? 'Custom' : 'Default');
      
      // Get PM template
      let pmTemplate = null;
      if (templateId) {
        console.log(`🎯 [SOLUTIONING] Using specified PM template ID: ${templateId}`);
        pmTemplate = await pmTemplateService.getTemplateById(templateId, orgId);
      } else if (pmTemplateConfig.defaultTemplateId) {
        console.log(`🎯 [SOLUTIONING] Using default PM template ID: ${pmTemplateConfig.defaultTemplateId}`);
        pmTemplate = await pmTemplateService.getTemplateById(pmTemplateConfig.defaultTemplateId, orgId);
      } else {
        console.log('🎯 [SOLUTIONING] Using fallback default PM template');
        pmTemplate = await pmTemplateService.getDefaultTemplate(orgId);
      }
      
      if (pmTemplate) {
        console.log(`✅ [SOLUTIONING] PM Template found: "${pmTemplate.name}"`);
        console.log(`🎯 [SOLUTIONING] Template has ${pmTemplate.story_patterns?.length || 0} story patterns`);
      } else {
        console.log('⚠️ [SOLUTIONING] No PM template found, using legacy configuration');
      }
      
      // Generate solution analysis using AI with PM template and organization configuration
      console.log('🤖 [SOLUTIONING] Starting AI analysis...');
      const solutionAnalysis = await this.analyzeBrief(brief, orgConfig, pmTemplate);
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
      await this.generateArchitecture(solution.id, solutionAnalysis.technical_stack);
      
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
  async analyzeBrief(brief, orgConfig = {}, pmTemplate = null) {
    console.log('🤖 [AI] Starting brief analysis...');
    console.log('🤖 [AI] Brief content length:', JSON.stringify(brief).length);
    console.log('🤖 [AI] Organization config applied:', Object.keys(orgConfig).length > 0);
    console.log('🎯 [AI] PM Template applied:', pmTemplate ? `"${pmTemplate.name}"` : 'None');
    
    // Build dynamic system prompt based on PM template or fallback to organization configuration
    let systemPrompt;
    try {
      systemPrompt = pmTemplate 
        ? pmTemplateService.buildTemplatePrompt(pmTemplate, orgConfig)
        : this.buildSystemPrompt(orgConfig);
    } catch (templateError) {
      console.error('❌ [AI] Error building template prompt:', templateError);
      console.log('🔄 [AI] Falling back to default system prompt');
      systemPrompt = this.buildSystemPrompt(orgConfig);
    }

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
        temperature: 0.2,
        max_tokens: 4000,
        response_format: { type: "json_object" }
      });

      console.log('✅ [AI] OpenAI API call successful');
      content = response.choices[0]?.message?.content?.trim();
      console.log('🤖 [AI] Response content length:', content?.length || 0);
      
      if (!content) {
        throw new Error('No content received from AI');
      }

      console.log('🤖 [AI] Validating JSON response...');
      
      // Validate response against schema
      const validation = await validateAIResponse(content, 'brief-analysis', {
        maxRetries: 1,
        enableRepair: true,
        enableFallback: true,
        logErrors: true
      });
      
      if (!validation.success) {
        console.error('❌ [AI] Response validation failed:', validation.error);
        throw new Error(`AI response validation failed: ${validation.error}`);
      }
      
      const analysis = validation.data;
      console.log('✅ [AI] Response validation successful');
      console.log('🤖 [AI] Analysis has epics:', analysis.epics?.length || 0);
      console.log('🤖 [AI] Analysis has requirements:', analysis.requirements?.length || 0);
      
      if (validation.repaired) {
        console.log('🔧 [AI] Response was repaired during validation');
      }
      
      if (validation.fallback) {
        console.warn('⚠️ [AI] Using fallback response due to validation failure');
      }
      
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
    // Generate a unique slug from the solution title
    const baseSlug = analysis.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    
    // Ensure slug is unique by appending ID if needed
    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const existingSlug = await pool.query(
        'SELECT id FROM solutions WHERE slug = $1',
        [slug]
      );
      if (existingSlug.rows.length === 0) {
        break;
      }
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const result = await pool.query(`
      INSERT INTO solutions (
        brief_id, org_id, name, description, 
        estimated_duration_weeks, estimated_effort_points, 
        complexity_score, created_by, slug
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      briefId, orgId, analysis.title, analysis.summary,
      analysis.timeline?.estimated_duration_weeks || 12, 
      analysis.epics?.length * 5 || 20, // Rough estimate
      Math.round((analysis.confidence_score || 0.8) * 10), // Convert 0.0-1.0 to 1-10 scale
      createdBy, slug
    ]);

    return result.rows[0];
  }

  /**
   * Generate epics and their stories/tasks
   */
  async generateEpics(solutionId, epics) {
    for (let i = 0; i < epics.length; i++) {
      const epic = epics[i];
      
      // Convert string priority to integer (1-5 scale)
      const priorityMap = {
        'critical': 5,
        'high': 4,
        'medium': 3,
        'low': 2,
        'minimal': 1
      };
      const priorityInt = priorityMap[epic.priority?.toLowerCase()] || 3;
      
      // Create epic
      const epicResult = await pool.query(`
        INSERT INTO solution_epics (
          solution_id, name, description, business_value, 
          priority, estimated_story_points, sort_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        solutionId, epic.title, epic.description, epic.businessValue || epic.description,
        priorityInt, epic.estimatedStoryPoints || 5, i
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
      // Validate required fields
      if (!req.description || req.description.trim() === '') {
        console.warn('⚠️ [SOLUTIONING] Skipping requirement with missing description:', req);
        continue;
      }
      
      // Map AI response types to database constraint types
      const typeMap = {
        'functional': 'functional',
        'non-functional': 'technical', // Map non-functional to technical
        'technical': 'technical',
        'business': 'functional', // Map business to functional
        'compliance': 'compliance'
      };
      const requirementType = typeMap[req.type?.toLowerCase()] || 'functional';
      
      // Convert string priority to integer (1-5 scale)
      const priorityMap = {
        'must-have': 5,
        'should-have': 4,
        'could-have': 3,
        'won\'t-have': 2,
        'critical': 5,
        'high': 4,
        'medium': 3,
        'low': 2,
        'minimal': 1
      };
      const priorityInt = priorityMap[req.priority?.toLowerCase()] || 3;
      
      await pool.query(`
        INSERT INTO solution_requirements (
          solution_id, requirement_type, category, title, 
          description, priority, acceptance_criteria
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        solutionId, requirementType, req.category || 'General', req.description,
        req.description, priorityInt, req.acceptance_criteria || []
      ]);
    }
  }

  /**
   * Generate architecture components from technical_stack
   */
  async generateArchitecture(solutionId, technicalStack) {
    if (!technicalStack || typeof technicalStack !== 'object') {
      console.log('⚠️ [SOLUTIONING] No technical stack provided, skipping architecture generation');
      return;
    }

    const architectureComponents = [];
    
    // Convert technical_stack object to architecture components
    Object.entries(technicalStack).forEach(([componentType, technologies]) => {
      if (Array.isArray(technologies) && technologies.length > 0) {
        architectureComponents.push({
          componentType: componentType,
          name: `${componentType.charAt(0).toUpperCase() + componentType.slice(1)} Stack`,
          description: `${componentType} technologies and frameworks`,
          technologyStack: technologies,
          dependencies: [],
          complexityNotes: `${technologies.length} technologies selected`
        });
      }
    });

    for (const comp of architectureComponents) {
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
    if (!risks || !Array.isArray(risks)) {
      console.log('⚠️ [SOLUTIONING] No risks provided, skipping risk generation');
      return;
    }

    for (const risk of risks) {
      // Convert string impact to integer (1-5 scale)
      const impactMap = {
        'low': 1,
        'medium': 3,
        'high': 4,
        'critical': 5
      };
      const impactInt = impactMap[risk.impact?.toLowerCase()] || 3;
      
      // Convert string probability to integer (1-5 scale)
      const probabilityMap = {
        'low': 1,
        'medium': 3,
        'high': 5
      };
      const probabilityInt = probabilityMap[risk.probability?.toLowerCase()] || 3;
      
      // Generate a title from the description (first 50 chars)
      const title = risk.description?.substring(0, 50) || 'Risk';
      
      // Default risk type to 'technical' since AI doesn't provide it
      const riskType = 'technical';
      
      await pool.query(`
        INSERT INTO solution_risks (
          solution_id, risk_type, title, description,
          probability, impact, mitigation_strategy
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        solutionId, riskType, title, risk.description,
        probabilityInt, impactInt, risk.mitigation || 'To be determined'
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
   * Get complete solution with all components by slug
   */
  async getSolutionBySlug(slug, orgId) {
    // Get solution by slug
    const solutionResult = await pool.query(
      'SELECT * FROM solutions WHERE slug = $1 AND org_id = $2',
      [slug, orgId]
    );

    if (!solutionResult.rows[0]) {
      return null;
    }

    const solution = solutionResult.rows[0];
    const solutionId = solution.id;

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
                ) ORDER BY t.sort_order, t.created_at
              )
              FROM solution_tasks t
              WHERE t.story_id = s.id
            )
          )
        ) FILTER (WHERE s.id IS NOT NULL) as stories
      FROM solution_epics e
      LEFT JOIN solution_stories s ON e.id = s.epic_id
      WHERE e.solution_id = $1
      GROUP BY e.id, e.name, e.description, e.business_value, e.priority, e.estimated_story_points, e.sort_order, e.created_at
      ORDER BY e.sort_order, e.created_at
    `, [solutionId]);

    // Get requirements
    const requirementsResult = await pool.query(
      'SELECT * FROM solution_requirements WHERE solution_id = $1 ORDER BY priority, created_at',
      [solutionId]
    );

    // Get architecture
    const architectureResult = await pool.query(
      'SELECT * FROM solution_architecture WHERE solution_id = $1 ORDER BY created_at',
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

  /**
   * Update epic
   */
  async updateEpic(epicId, updateData) {
    const { name, description, business_value, priority, estimated_story_points, sort_order } = updateData;
    
    console.log('Updating epic:', { epicId, updateData });
    console.log('Extracted fields:', { name, description, business_value, priority, estimated_story_points, sort_order });
    
    const result = await pool.query(`
      UPDATE solution_epics 
      SET name = $1, description = $2, business_value = $3, priority = $4, 
          estimated_story_points = $5, sort_order = $6
      WHERE id = $7
      RETURNING *
    `, [name, description, business_value, priority, estimated_story_points, sort_order, epicId]);
    
    console.log('Epic update result:', result.rows[0]);
    console.log('Number of rows affected:', result.rowCount);
    
    if (result.rowCount === 0) {
      throw new Error(`Epic with id ${epicId} not found`);
    }
    
    return result.rows[0];
  }

  /**
   * Update story
   */
  async updateStory(storyId, updateData) {
    const { story_type, title, description, acceptance_criteria, story_points, priority, sort_order } = updateData;
    
    console.log('Updating story:', { storyId, updateData });
    console.log('Extracted fields:', { story_type, title, description, acceptance_criteria, story_points, priority, sort_order });
    
    const result = await pool.query(`
      UPDATE solution_stories 
      SET story_type = $1, title = $2, description = $3, acceptance_criteria = $4, 
          story_points = $5, priority = $6, sort_order = $7
      WHERE id = $8
      RETURNING *
    `, [story_type, title, description, acceptance_criteria, story_points, priority, sort_order, storyId]);
    
    console.log('Story update result:', result.rows[0]);
    console.log('Number of rows affected:', result.rowCount);
    
    if (result.rowCount === 0) {
      throw new Error(`Story with id ${storyId} not found`);
    }
    
    return result.rows[0];
  }

  /**
   * Update task
   */
  async updateTask(taskId, updateData) {
    const { title, description, task_type, estimated_hours, sort_order } = updateData;
    
    const result = await pool.query(`
      UPDATE solution_tasks 
      SET title = $1, description = $2, task_type = $3, estimated_hours = $4, 
          sort_order = $5
      WHERE id = $6
      RETURNING *
    `, [title, description, task_type, estimated_hours, sort_order, taskId]);
    
    return result.rows[0];
  }

  /**
   * Update requirement
   */
  async updateRequirement(requirementId, updateData) {
    const { title, description, priority, category, acceptance_criteria } = updateData;
    
    const result = await pool.query(`
      UPDATE solution_requirements 
      SET title = $1, description = $2, priority = $3, category = $4, 
          acceptance_criteria = $5
      WHERE id = $6
      RETURNING *
    `, [title, description, priority, category, acceptance_criteria, requirementId]);
    
    return result.rows[0];
  }

  /**
   * Update architecture component
   */
  async updateArchitecture(architectureId, updateData) {
    const { component_name, description, technology_stack, dependencies, notes } = updateData;
    
    const result = await pool.query(`
      UPDATE solution_architecture 
      SET name = $1, description = $2, technology_stack = $3, 
          dependencies = $4, complexity_notes = $5
      WHERE id = $6
      RETURNING *
    `, [component_name, description, technology_stack, dependencies, notes, architectureId]);
    
    return result.rows[0];
  }

  /**
   * Update risk
   */
  async updateRisk(riskId, updateData) {
    const { risk_description, probability, impact, mitigation_strategy, contingency_plan } = updateData;
    
    const result = await pool.query(`
      UPDATE solution_risks 
      SET description = $1, probability = $2, impact = $3, 
          mitigation_strategy = $4
      WHERE id = $5
      RETURNING *
    `, [risk_description, probability, impact, mitigation_strategy, riskId]);
    
    return result.rows[0];
  }
}

export const solutioningService = new SolutioningService();
