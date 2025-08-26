import { 
  createSession as dbCreateSession, 
  getSession as dbGetSession,
  updateSession as dbUpdateSession,
  addAnswer as dbAddAnswer,
  upsertMultipleFacts as dbUpsertMultipleFacts
} from './database.js';

// A tiny deterministic graph; the LLM can override/skip when needed.
const QUESTION_GRAPH = [
  { id: "intro", text: "What problem are you trying to solve?" },
  { id: "impact", text: "Who is affected and how do you measure impact today?" },
  { id: "data", text: "Which systems or data sources are involved (ERP, CRM, sheets, etc.)?" },
  { id: "workaround", text: "What workaround do you use today?" },
  { id: "outcome", text: "What does success look like (specific outputs/behaviors)?" },
  { id: "deadline", text: "Is there a deadline or external dependency?" },
];

const REQUIRED_FACT_KEYS = [
  "problem_statement",
  "affected_users",
  "impact_metric",
  "data_sources",
  "current_workaround",
  "desired_outcomes",
  "deadline"
];

export async function startSession() {
  const id = Math.random().toString(36).slice(2);
  const sessionData = {
    id,
    currentQuestionId: "intro",
    completed: false
  };
  
  await dbCreateSession(sessionData);
  
  return {
    id,
    answers: [],        // [{questionId, text}]
    facts: {},          // { key: value }
    currentQuestionId: "intro",
    completed: false
  };
}

export async function getSession(id) {
  return await dbGetSession(id);
}

export function listQuestions() {
  return QUESTION_GRAPH;
}

// Greedy next-question via graph; if all answered → null
export function nextGraphQuestion(session) {
  const answered = new Set(session.answers.map(a => a.questionId));
  for (const q of QUESTION_GRAPH) {
    if (!answered.has(q.id)) return q;
  }
  return null;
}

// Simple rules extractor to seed facts without LLM (offline mode)
export function cheapExtractFacts(questionId, text) {
  const t = text.trim();
  switch (questionId) {
    case "intro": return { problem_statement: t };
    case "impact": return { affected_users: t, impact_metric: t };
    case "data": return { data_sources: t };
    case "workaround": return { current_workaround: t };
    case "outcome": return { desired_outcomes: t };
    case "deadline": return { deadline: t };
    default: return {};
  }
}

export function isFactCoverageComplete(facts) {
  return REQUIRED_FACT_KEYS.every(k => facts[k] && String(facts[k]).trim().length > 0);
}

// New database-aware functions
export async function addAnswerToSession(sessionId, questionId, text) {
  await dbAddAnswer(sessionId, questionId, text);
}

export async function updateSessionFacts(sessionId, factsObject) {
  await dbUpsertMultipleFacts(sessionId, factsObject);
}

export async function updateSessionStatus(sessionId, updates) {
  await dbUpdateSession(sessionId, updates);
}
