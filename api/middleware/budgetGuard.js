/**
 * Budget Guard Middleware
 * 
 * Enforces per-tenant and global cost budgets for AI calls
 * Prevents budget overruns and provides cost tracking
 */

import { pool } from '../config/database.js';

// Cost tracking per request
const requestCosts = new Map();

/**
 * Estimate cost for AI call based on model and tokens
 */
function estimateAICost(model, inputTokens, outputTokens) {
  // OpenAI pricing (as of 2024, in cents per 1K tokens)
  const pricing = {
    'gpt-4o': { input: 0.5, output: 1.5 },
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
    'gpt-3.5-turbo': { input: 0.1, output: 0.2 },
    'gpt-4': { input: 3.0, output: 6.0 },
  };
  
  const modelPricing = pricing[model] || pricing['gpt-4o-mini'];
  
  const inputCost = (inputTokens / 1000) * modelPricing.input;
  const outputCost = (outputTokens / 1000) * modelPricing.output;
  
  return Math.ceil(inputCost + outputCost);
}

/**
 * Check if AI call would exceed budget
 */
async function checkBudgetLimit(orgId, estimatedCost) {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT * FROM check_budget_limit($1, $2)
    `, [orgId, estimatedCost]);
    
    return result.rows[0];
  } finally {
    client.release();
  }
}

/**
 * Update budget spending after AI call
 */
async function updateBudgetSpending(orgId, actualCost, tokens, calls = 1) {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT update_budget_spending($1, $2, $3, $4)
    `, [orgId, actualCost, tokens, calls]);
    
    return result.rows[0].update_budget_spending;
  } finally {
    client.release();
  }
}

/**
 * Get budget status for organization
 */
async function getBudgetStatus(orgId) {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT * FROM get_budget_status($1)
    `, [orgId]);
    
    return result.rows[0];
  } finally {
    client.release();
  }
}

/**
 * Budget guard middleware
 */
export function budgetGuard(options = {}) {
  const {
    enforceBudget = true,
    logCosts = true,
    allowOverrun = false,
    globalBudgetLimit = 1000000 // $10,000 global limit
  } = options;
  
  return async (req, res, next) => {
    // Skip budget checks for non-AI endpoints
    if (!req.path.includes('/ai') && !req.path.includes('/openai')) {
      return next();
    }
    
    // Skip if no user context
    if (!req.user?.orgId) {
      return next();
    }
    
    const orgId = req.user.orgId;
    const requestId = `${req.method}-${req.path}-${Date.now()}`;
    
    // Initialize request cost tracking
    requestCosts.set(requestId, {
      orgId,
      startTime: Date.now(),
      estimatedCost: 0,
      actualCost: 0,
      tokens: 0,
      calls: 0
    });
    
    // Add budget info to request
    req.budget = {
      orgId,
      requestId,
      enforceBudget,
      allowOverrun
    };
    
    // Override res.json to track actual costs
    const originalJson = res.json;
    res.json = function(data) {
      const requestCost = requestCosts.get(requestId);
      if (requestCost) {
        // Update session cost tracking
        updateSessionCost(req, requestCost);
        
        if (logCosts) {
          console.log(`💰 [Budget] Request ${requestId}: ${requestCost.actualCost} cents, ${requestCost.tokens} tokens`);
        }
        
        // Clean up request tracking
        requestCosts.delete(requestId);
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
}

/**
 * Check budget before AI call
 */
export async function checkBudgetBeforeAICall(orgId, model, estimatedTokens) {
  const estimatedCost = estimateAICost(model, estimatedTokens.input || 0, estimatedTokens.output || 0);
  
  const budgetCheck = await checkBudgetLimit(orgId, estimatedCost);
  
  if (!budgetCheck.within_budget) {
    throw new Error(`Budget exceeded: ${budgetCheck.usage_percentage}% usage (${budgetCheck.remaining_budget_cents} cents remaining)`);
  }
  
  return {
    estimatedCost,
    withinBudget: budgetCheck.within_budget,
    remainingBudget: budgetCheck.remaining_budget_cents,
    usagePercentage: budgetCheck.usage_percentage,
    shouldAlert: budgetCheck.should_alert
  };
}

/**
 * Track AI call cost
 */
export async function trackAICallCost(orgId, model, inputTokens, outputTokens, actualCost = null) {
  const estimatedCost = actualCost || estimateAICost(model, inputTokens, outputTokens);
  const totalTokens = inputTokens + outputTokens;
  
  const success = await updateBudgetSpending(orgId, estimatedCost, totalTokens, 1);
  
  if (!success) {
    console.warn(`⚠️ [Budget] Failed to update budget for org ${orgId}: ${estimatedCost} cents`);
  }
  
  return {
    cost: estimatedCost,
    tokens: totalTokens,
    success
  };
}

/**
 * Update session cost tracking
 */
async function updateSessionCost(req, requestCost) {
  if (!req.sessionId) return;
  
  const client = await pool.connect();
  try {
    await client.query(`
      UPDATE sessions 
      SET 
        ai_cost_cents = ai_cost_cents + $1,
        ai_tokens_used = ai_tokens_used + $2,
        ai_calls_count = ai_calls_count + $3
      WHERE id = $4 AND org_id = $5
    `, [
      requestCost.actualCost,
      requestCost.tokens,
      requestCost.calls,
      req.sessionId,
      requestCost.orgId
    ]);
  } catch (error) {
    console.error('Failed to update session cost:', error);
  } finally {
    client.release();
  }
}

/**
 * Get budget alerts for organization
 */
export async function getBudgetAlerts(orgId, limit = 10) {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT 
        id,
        alert_type,
        threshold_percentage,
        current_usage_cents,
        budget_limit_cents,
        message,
        sent_at,
        acknowledged
      FROM budget_alerts 
      WHERE org_id = $1 
      ORDER BY sent_at DESC 
      LIMIT $2
    `, [orgId, limit]);
    
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Acknowledge budget alert
 */
export async function acknowledgeBudgetAlert(alertId, userId) {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      UPDATE budget_alerts 
      SET 
        acknowledged = TRUE,
        acknowledged_at = CURRENT_TIMESTAMP,
        acknowledged_by = $2
      WHERE id = $1
      RETURNING *
    `, [alertId, userId]);
    
    return result.rows[0];
  } finally {
    client.release();
  }
}

/**
 * Reset budget for organization
 */
export async function resetOrganizationBudget(orgId) {
  const client = await pool.connect();
  try {
    await client.query('SELECT reset_budget($1)', [orgId]);
    console.log(`🔄 [Budget] Reset budget for organization ${orgId}`);
  } finally {
    client.release();
  }
}

/**
 * Get budget dashboard data
 */
export async function getBudgetDashboard(orgId) {
  const client = await pool.connect();
  try {
    // Get current budget status
    const budgetStatus = await getBudgetStatus(orgId);
    
    // Get recent spending history
    const spendingHistory = await client.query(`
      SELECT 
        date,
        spent_cents,
        budget_cents,
        sessions_count,
        ai_calls_count,
        tokens_used
      FROM budget_history 
      WHERE org_id = $1 
      ORDER BY date DESC 
      LIMIT 30
    `, [orgId]);
    
    // Get recent alerts
    const recentAlerts = await getBudgetAlerts(orgId, 5);
    
    return {
      budget: budgetStatus,
      spendingHistory: spendingHistory.rows,
      recentAlerts
    };
  } finally {
    client.release();
  }
}

/**
 * Middleware to add budget info to response
 */
export function addBudgetInfo(req, res, next) {
  if (!req.user?.orgId) {
    return next();
  }
  
  // Add budget info to response headers
  res.setHeader('X-Budget-Check', 'enabled');
  
  next();
}

/**
 * Express middleware for budget enforcement
 */
export function budgetMiddleware(options = {}) {
  return [
    budgetGuard(options),
    addBudgetInfo
  ];
}

// Export default middleware
export default budgetMiddleware;
