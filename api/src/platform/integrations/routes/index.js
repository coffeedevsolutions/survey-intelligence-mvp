/**
 * Integrations Routes Index
 * 
 * Exports all integration-related routes
 */

import express from 'express';
import jiraRoutes from './jira.routes.js';

const router = express.Router();

router.use('/jira', jiraRoutes);

export { router as integrationRoutes };
export default router;
