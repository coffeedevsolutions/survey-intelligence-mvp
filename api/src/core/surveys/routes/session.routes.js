/**
 * Session Routes
 * 
 * Handles session-related API endpoints
 */

import express from 'express';
import { authMiddleware, rlsContextMiddleware, requireRole } from '../../../middleware/index.js';
import { sessionRepository } from '../../../database/repositories/session.repository.js';
import { answerRepository } from '../../../database/repositories/answer.repository.js';
import { factsRepository } from '../../../database/repositories/facts.repository.js';
import { 
  listQuestions, 
  nextGraphQuestion, 
  cheapExtractFacts, 
  isFactCoverageComplete,
  addAnswerToSession,
  updateSessionFacts,
  updateSessionStatus
} from '../services/surveyEngine.js';
import { INTERVIEW_SYSTEM, INTERVIEW_JSON_INSTRUCTION } from '../../../platform/ai/services/prompt.js';
import { OpenAI } from 'openai';

const router = express.Router();
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// Create new session
router.post('/', authMiddleware, rlsContextMiddleware, requireRole("requestor", "reviewer", "admin"), async (req, res) => {
  try {
    const sessionId = Math.random().toString(36).slice(2);
    
    // Create session with organization context
    const session = await sessionRepository.createWithOrg({ 
      id: sessionId, 
      currentQuestionId: "intro", 
      completed: false 
    }, req.user.orgId);
    
    const firstQ = listQuestions().find(q => q.id === "intro");
    res.json({ sessionId: session.id, question: firstQ });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Get session by ID
router.get('/:id', async (req, res) => {
  try {
    const session = await sessionRepository.getSessionWithData(req.params.id);
    if (!session) return res.status(404).json({ error: "not found" });
    res.json(session);
  } catch (error) {
    console.error('Error getting session:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

// Submit answer to session
router.post('/:id/answer', authMiddleware, rlsContextMiddleware, requireRole("requestor", "reviewer", "admin"), async (req, res) => {
  try {
    const session = await sessionRepository.getSessionWithData(req.params.id);
    if (!session) return res.status(404).json({ error: "not found" });

    const { questionId, text } = req.body;
    
    // Add answer to database with org_id
    await answerRepository.addAnswerWithOrg(req.params.id, questionId, text, req.user.orgId);

    // Extract facts offline
    const extractedFacts = cheapExtractFacts(questionId, text);
    await factsRepository.upsertMultipleFactsWithOrg(req.params.id, extractedFacts, req.user.orgId);
    
    // Update session object with new data
    session.answers.push({ questionId, text });
    Object.assign(session.facts, extractedFacts);

    // Pick next question via deterministic graph first
    let nextQ = nextGraphQuestion(session);

    // If AI available, ask it if there's a better next question OR to refine facts
    if (openai) {
      try {
        const history = session.answers.map(a => ({ questionId: a.questionId, text: a.text }));
        const userPrompt = `
Question just answered: ${questionId}
Answer: ${text}

History:
${JSON.stringify(history, null, 2)}

Current extracted facts:
${JSON.stringify(session.facts, null, 2)}

${INTERVIEW_JSON_INSTRUCTION}
Only return JSON.
`;
        const resp = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: INTERVIEW_SYSTEM },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.2
        });
        const raw = resp.choices[0]?.message?.content?.trim() || "{}";
        const parsed = JSON.parse(safeJson(raw));
        
        // Merge facts from AI
        if (Array.isArray(parsed.updated_facts)) {
          const aiFacts = {};
          for (const f of parsed.updated_facts) {
            if (f?.key && typeof f.value !== "undefined") {
              session.facts[f.key] = f.value;
              aiFacts[f.key] = f.value;
            }
          }
          // Update database with AI-refined facts
          if (Object.keys(aiFacts).length > 0) {
            await factsRepository.upsertMultipleFactsWithOrg(req.params.id, aiFacts, req.user.orgId);
          }
        }
        
        // Prefer AI next question if provided
        if (parsed.next_question_text && parsed.next_question_text.length > 5) {
          nextQ = { id: "ai", text: parsed.next_question_text };
        }
      } catch (e) {
        console.warn("AI error (continuing without it):", e.message);
      }
    }

    if (!nextQ || isFactCoverageComplete(session.facts)) {
      await sessionRepository.updateById(req.params.id, { completed: true, currentQuestionId: null });
      return res.json({ next: null, completed: true });
    }
    
    await sessionRepository.updateById(req.params.id, { currentQuestionId: nextQ.id, completed: false });
    res.json({ next: nextQ, completed: false });
    
  } catch (error) {
    console.error('Error handling answer:', error);
    res.status(500).json({ error: 'Failed to process answer' });
  }
});

// List sessions for organization
router.get('/', authMiddleware, rlsContextMiddleware, requireRole("reviewer", "admin"), async (req, res) => {
  try {
    let sessions = await sessionRepository.getSessionsByOrg(req.user.orgId);
    
    // TEMPORARY: If no sessions found for this org, show all sessions (for migration period)
    if (sessions.length === 0) {
      console.log('No sessions found for org', req.user.orgId, '- showing all sessions (migration mode)');
      const allSessionsResult = await sessionRepository.executeQuery(`
        SELECT 
          s.id AS session_id,
          NULL AS org_id,
          s.completed,
          s.created_at,
          COALESCE(MAX(a.created_at), s.created_at) AS last_answer_at,
          (SELECT COUNT(*) FROM answers a2 WHERE a2.session_id = s.id) AS answer_count,
          EXISTS (SELECT 1 FROM project_briefs pb WHERE pb.session_id = s.id) AS has_brief
        FROM sessions s
        LEFT JOIN answers a ON a.session_id = s.id
        WHERE s.org_id IS NULL
        GROUP BY s.id, s.completed, s.created_at
        ORDER BY last_answer_at DESC NULLS LAST
        LIMIT 50
      `);
      sessions = allSessionsResult.rows;
    }
    
    res.json(sessions);
  } catch (error) {
    console.error('Error listing sessions:', error);
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

// Archive session
router.post('/:id/archive', authMiddleware, rlsContextMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const session = await sessionRepository.archiveSession(req.params.id, req.user.orgId);
    res.json({ message: 'Session archived successfully', session });
  } catch (error) {
    console.error('Error archiving session:', error);
    res.status(500).json({ error: error.message || 'Failed to archive session' });
  }
});

// Restore session
router.post('/:id/restore', authMiddleware, rlsContextMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const session = await sessionRepository.restoreSession(req.params.id, req.user.orgId);
    res.json({ message: 'Session restored successfully', session });
  } catch (error) {
    console.error('Error restoring session:', error);
    res.status(500).json({ error: error.message || 'Failed to restore session' });
  }
});

// Delete session permanently
router.delete('/:id', authMiddleware, rlsContextMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const session = await sessionRepository.deleteSessionPermanently(req.params.id, req.user.orgId);
    res.json({ message: 'Session deleted permanently', session });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: error.message || 'Failed to delete session' });
  }
});

function safeJson(s) {
  try { 
    JSON.parse(s); 
    return s; 
  } catch { 
    // Try to clip to first/last curly braces
    const start = s.indexOf("{"), end = s.lastIndexOf("}");
    return start >= 0 && end > start ? s.slice(start, end + 1) : "{}";
  }
}

export default router;
