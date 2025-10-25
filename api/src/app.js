/**
 * Express Application Setup
 * 
 * Configures Express app with middleware stack and route mounting
 */

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { initializeAuth } from './middleware/index.js';

const app = express();

// CORS configuration
const corsOrigins = process.env.CLIENT_ORIGIN ?
  process.env.CLIENT_ORIGIN.split(',').map(origin => origin.trim()) :
  [process.env.WEB_ORIGIN || "http://localhost:5173"];

app.use(cors({
  origin: corsOrigins,
  credentials: true // cookie-based auth needs this
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check endpoint (required by Render)
app.get('/health', async (req, res) => {
  try {
    const { pool } = await import('./database/connection.js');
    await pool.query("SELECT 1");
    res.status(200).json({
      ok: true,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (e) {
    console.error('Health check failed:', e);
    res.status(500).json({
      ok: false,
      error: e.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Mount routes
await mountRoutes(app);

export default app;

/**
 * Mount all application routes
 */
async function mountRoutes(app) {
  // Import route modules
  const { createAuthRoutes } = await import('./platform/auth/routes/index.js');
  const organizationRoutes = await import('./platform/auth/routes/organization.routes.js');
  const { sessionRoutes, enhancedSurveyRoutes } = await import('./core/surveys/routes/index.js');
  const publicSurveyRoutes = await import('./core/surveys/routes/public-survey-unified.routes.js');
  const briefRoutes = await import('./core/briefs/routes/index.js');
  const campaignRoutes = await import('./core/campaigns/routes/index.js');
  const solutioningRoutes = await import('./core/solutioning/routes/index.js');
  const analyticsRoutes = await import('./core/analytics/routes/index.js');
  const stackRoutes = await import('./core/stack/routes/index.js');
  const { templateRoutes, pmTemplateRoutes } = await import('./platform/templates/routes/index.js');
  const integrationRoutes = await import('./platform/integrations/routes/index.js');
  const jiraRoutes = await import('./platform/integrations/routes/jira.routes.js');
  const aiRoutes = await import('./routes/ai.routes.js');
  
  // Create auth routes with app instance
  const authRoutes = createAuthRoutes(app);
  
  // Auth middleware is already initialized by createAuthRoutes
  // No need to call initializeAuth again
  
  // Public routes (no auth required)
  app.use('/public', sessionRoutes);
  app.use('/public', publicSurveyRoutes.default);
  
  // API routes with auth middleware
  app.use('/api/auth', authRoutes);
  app.use('/api/orgs', organizationRoutes.default);
  app.use('/api/orgs', pmTemplateRoutes);
  app.use('/api/sessions', sessionRoutes);
  app.use('/api/briefs', briefRoutes.default);
  app.use('/api/campaigns', campaignRoutes.default);
  app.use('/api/solutioning', solutioningRoutes.default);
  app.use('/api/analytics', analyticsRoutes.default);
  app.use('/api/stack', stackRoutes.default);
  app.use('/api/templates', templateRoutes);
  app.use('/api/integrations', integrationRoutes.default);
  app.use('/api/ai', aiRoutes.default);
  
  // Legacy Jira routes for backward compatibility
  app.use('/api/jira', jiraRoutes.default);

  // Legacy routes for backward compatibility
  app.use('/api/ai-survey', enhancedSurveyRoutes);

  console.log('✅ All routes mounted successfully');
}
