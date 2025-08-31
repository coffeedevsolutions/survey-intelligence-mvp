import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { OpenAI } from "openai";
import { listQuestions, nextGraphQuestion, cheapExtractFacts, isFactCoverageComplete } from "../services/surveyEngine.js";
import {
  initializeDatabase, createSession, getSession,
  addAnswer, addAnswerWithOrg, upsertMultipleFacts, upsertMultipleFactsWithOrg, updateSession, pool
} from "./database.js";
import { buildAuth } from "../auth/auth-provider.js";
import { INTERVIEW_SYSTEM, INTERVIEW_JSON_INSTRUCTION, BRIEF_SYSTEM, briefUserPrompt } from "../services/prompt.js";
import { 
  allowMemberOrShare, 
  requireMember, 
  getRequestOrgId, 
  hasPermission 
} from "../auth/auth-enhanced.js";

import campaignRoutes from "../routes/campaigns.routes.js";
import publicSurveyRoutes from "../routes/public-survey.routes.js";
import enhancedSurveyRoutes from "../routes/enhanced-survey.routes.js";
import aiSurveyTemplatesRoutes from "../routes/ai-survey-templates.routes.js";
import briefsRoutes from "../routes/briefs.routes.js";
import organizationRoutes from "../routes/organization.routes.js";
import stackRoutes from "../routes/stack.routes.js";
import briefTemplatesRoutes from "../routes/brief-templates.routes.js";
import { emailService } from "../services/emailService.js";

import {
  createShareLink,
  revokeShareLink,
  createInvite,
  getInvite,
  acceptInvite,
  checkSeatsAvailable,
  getSessionsByOrg,
  getBriefByIdAndOrg,
  createSessionWithOrg
} from "./database.js";

dotenv.config();
const app = express();
app.use(cors({ 
  origin: process.env.WEB_ORIGIN || "http://localhost:5173", 
  credentials: true // cookie-based auth needs this
}));
app.use(express.json());

// Initialize auth adapter (handles local or Auth0)
const auth = buildAuth(app);

// Campaign and public survey routes (with auth middleware)
app.use('/api', authMiddleware, campaignRoutes);
app.use('/api', authMiddleware, briefsRoutes);
app.use('/api', authMiddleware, briefTemplatesRoutes);
app.use('/api', authMiddleware, organizationRoutes);
app.use('/api', authMiddleware, stackRoutes);
app.use('/public', publicSurveyRoutes);
app.use('/api/ai-survey', enhancedSurveyRoutes);
app.use('/api', authMiddleware, aiSurveyTemplatesRoutes);

const useAI = !!process.env.OPENAI_API_KEY;
const openai = useAI ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// --- Auth endpoints ---
app.post("/auth/register-org", async (req, res) => {
  try {
    const { slug, name, email, password } = req.body;
    if (!slug || !name || !email || !password) return res.status(400).json({ error: "missing_fields" });
    const { org } = await auth.registerOrgAndAdmin({ slug, name, email, password });
    // auto-login admin
    const { token, role, expiresAt } = await auth.login({ orgSlug: slug, email, password });
    auth.setCookie(res, token);
    res.json({ ok: true, role, org, expiresAt });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { orgSlug, email, password } = req.body;
    const { token, role, org, userId, expiresAt } = await auth.login({ orgSlug, email, password });
    auth.setCookie(res, token);
    res.json({ ok: true, role, org, userId, expiresAt });
  } catch (e) {
    res.status(401).json({ error: e.message || "invalid_credentials" });
  }
});

// Auth middleware - works with both local and Auth0
async function authMiddleware(req, res, next) {
  // Check if using Auth0 (session-based)
  if (req.oidc) {
    if (!req.oidc.isAuthenticated()) return res.status(401).json({ error: "unauthorized" });
    // User enrichment should have happened in Auth0 middleware
    if (!req.user) {
      // Fallback: create basic user from OIDC info
      req.user = { 
        email: req.oidc.user?.email, 
        auth0Sub: req.oidc.user?.sub, 
        role: "requestor",
        orgId: null,
        orgSlug: null
      };
    }
    return next();
  }
  
  // Local auth (JWT-based)
  try {
    const result = await auth.verifyRequest(req);
    if (!result) return res.status(401).json({ error: "unauthorized" });
    req.user = result.user;
    req.tokenJti = result.tokenJti;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({ error: "unauthorized" });
  }
}

app.post("/auth/logout", authMiddleware, async (req, res) => {
  try {
    const result = await auth.logout({ req, res, tokenJti: req.tokenJti });
    if (result) return; // Auth0 handles the redirect
  } catch {}
  auth.clearCookie(res);
  res.json({ ok: true });
});

// Auth middleware will handle /auth/me route registration to avoid conflicts

function requireRole(...roles) {
  return (req, res, next) => {
    // Auth0 session check
    if (req.oidc) {
      if (!req.oidc.isAuthenticated()) return res.status(401).json({ error: "unauthorized" });
      // Check enriched user role, or default to requestor
      const userRole = req.user?.role || "requestor";
      if (!roles.includes(userRole)) return res.status(403).json({ error: "forbidden" });
      return next();
    }
    
    // Local auth check
    if (!req.user) return res.status(401).json({ error: "unauthorized" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "forbidden" });
    next();
  };
}

// --- Protected Routes ---
// Requestor (or higher) can run surveys:
app.post("/api/sessions", authMiddleware, requireRole("requestor","reviewer","admin"), async (req, res) => {
  try {
    const sessionId = Math.random().toString(36).slice(2);
    
    // For backward compatibility, create session without campaign (legacy mode)
    const s = await createSessionWithOrg({ 
      id: sessionId, 
      currentQuestionId: "intro", 
      completed: false 
    }, req.user.orgId);
    
    const firstQ = listQuestions().find(q => q.id === "intro");
    res.json({ sessionId: s.id, question: firstQ });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

app.get("/api/sessions/:id", async (req, res) => {
  try {
    const s = await getSession(req.params.id);
    if (!s) return res.status(404).json({ error: "not found" });
    res.json(s);
  } catch (error) {
    console.error('Error getting session:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

app.post("/api/sessions/:id/answer", authMiddleware, requireRole("requestor","reviewer","admin"), async (req, res) => {
  try {
    const s = await getSession(req.params.id);
    if (!s) return res.status(404).json({ error: "not found" });

    const { questionId, text } = req.body;
    
    // Add answer to database with org_id
    await addAnswerWithOrg(req.params.id, questionId, text, req.user.orgId);

    // offline cheap extraction
    const extractedFacts = cheapExtractFacts(questionId, text);
    await upsertMultipleFactsWithOrg(req.params.id, extractedFacts, req.user.orgId);
    
    // Update session object with new data
    s.answers.push({ questionId, text });
    Object.assign(s.facts, extractedFacts);

    // pick next via deterministic graph first
    let nextQ = nextGraphQuestion(s);

  // If AI available, ask it if there's a better next question OR to refine facts
  if (useAI) {
    try {
      const history = s.answers.map(a => ({ questionId: a.questionId, text: a.text }));
      const userPrompt = `
Question just answered: ${questionId}
Answer: ${text}

History:
${JSON.stringify(history, null, 2)}

Current extracted facts:
${JSON.stringify(s.facts, null, 2)}

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
            s.facts[f.key] = f.value;
            aiFacts[f.key] = f.value;
          }
        }
        // Update database with AI-refined facts
        if (Object.keys(aiFacts).length > 0) {
          await upsertMultipleFactsWithOrg(req.params.id, aiFacts, req.user.orgId);
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

  if (!nextQ || isFactCoverageComplete(s.facts)) {
    await updateSession(req.params.id, { completed: true, currentQuestionId: null });
    return res.json({ next: null, completed: true });
  }
  
  await updateSession(req.params.id, { currentQuestionId: nextQ.id, completed: false });
  res.json({ next: nextQ, completed: false });
  
  } catch (error) {
    console.error('Error handling answer:', error);
    res.status(500).json({ error: 'Failed to process answer' });
  }
});

app.post("/api/sessions/:id/submit", authMiddleware, requireRole("requestor","reviewer","admin"), async (req, res) => {
  try {
    const s = await getSession(req.params.id);
    if (!s) return res.status(404).json({ error: "not found" });

  const prompt = briefUserPrompt({ answers: s.answers, facts: s.facts });

  if (!useAI) {
    // offline brief (template fill)
    const md = `# Project Brief (Draft)

**Problem**  
${s.facts.problem_statement || "(captured in transcript)"}

**Who is affected**  
${s.facts.affected_users || "-"}

**Impact**  
${s.facts.impact_metric || "-"}

**Desired outcomes**  
${s.facts.desired_outcomes || "-"}

**Data sources/systems**  
${s.facts.data_sources || "-"}

**Current workaround**  
${s.facts.current_workaround || "-"}

**Constraints (security/compliance)**  
-

**Risks & assumptions**  
- (to be refined)

**Deadline/dependencies**  
${s.facts.deadline || "-"}

**Acceptance criteria**  
- Captures the problem and impacted users
- Lists data sources and desired outputs
- Defines success in measurable terms

**Effort (T-shirt)**  
M (initial guess)
`;
    
    // Store brief in database
    await pool.query(
      "INSERT INTO project_briefs (session_id, title, summary_md, org_id) VALUES ($1,$2,$3,$4)",
      [req.params.id, s.facts.problem_statement || "Project Brief", md, req.user.orgId]
    );
    
    return res.json({ briefMarkdown: md, stored: true });
  }

  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: BRIEF_SYSTEM },
        { role: "user", content: prompt }
      ],
      temperature: 0.2
    });
    const md = resp.choices[0]?.message?.content || "# Brief\n(Empty)";
    
    // Store brief in database
    await pool.query(
      "INSERT INTO project_briefs (session_id, title, summary_md, org_id) VALUES ($1,$2,$3,$4)",
      [req.params.id, s.facts.problem_statement || "Project Brief", md, req.user.orgId]
    );
    
    res.json({ briefMarkdown: md, stored: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "brief_generation_failed", detail: e.message });
  }
  
  } catch (error) {
    console.error('Error generating brief:', error);
    res.status(500).json({ error: 'Failed to generate brief' });
  }
});

// Reviewer (or admin) can view results:
app.get("/api/sessions", authMiddleware, requireRole("reviewer","admin"), async (req, res) => {
  try {
    let sessions = await getSessionsByOrg(req.user.orgId);
    
    // TEMPORARY: If no sessions found for this org, show all sessions (for migration period)
    if (sessions.length === 0) {
      console.log('No sessions found for org', req.user.orgId, '- showing all sessions (migration mode)');
      const allSessionsResult = await pool.query(`
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

app.get("/api/sessions/:id/brief", authMiddleware, requireRole("reviewer","admin"), async (req, res) => {
  try {
    // First try with org filter
    let { rows } = await pool.query(
      "SELECT id, title, summary_md, created_at FROM project_briefs WHERE session_id=$1 AND org_id=$2 ORDER BY created_at DESC LIMIT 1",
      [req.params.id, req.user.orgId]
    );
    
    // TEMPORARY: If not found and might be a legacy session, try without org filter
    if (!rows.length) {
      const legacyResult = await pool.query(
        "SELECT id, title, summary_md, created_at FROM project_briefs WHERE session_id=$1 AND org_id IS NULL ORDER BY created_at DESC LIMIT 1",
        [req.params.id]
      );
      rows = legacyResult.rows;
    }
    
    if (!rows.length) return res.status(404).json({ error: "no_brief" });
    res.json(rows[0]);
  } catch (error) {
    console.error('Error getting brief:', error);
    res.status(500).json({ error: 'Failed to get brief' });
  }
});

// Enhanced brief endpoint that supports share links
app.get("/api/briefs/:id", allowMemberOrShare("view"), async (req, res) => {
  try {
    const orgId = getRequestOrgId(req);
    const brief = await getBriefByIdAndOrg(req.params.id, orgId);
    
    if (!brief) {
      return res.status(404).json({ error: "no_brief" });
    }
    
    res.json(brief);
  } catch (error) {
    console.error('Error getting brief:', error);
    res.status(500).json({ error: 'Failed to get brief' });
  }
});

// ENTERPRISE ROUTES

// Seat Management
app.get("/api/org/seats", authMiddleware, requireMember("admin"), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT plan, seats_total, seats_used, billing_customer_id FROM organizations WHERE id = $1',
      [req.user.orgId]
    );
    
    if (!result.rowCount) {
      return res.status(404).json({ error: "organization_not_found" });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting seat info:', error);
    res.status(500).json({ error: 'Failed to get seat information' });
  }
});

app.put("/api/org/seats", authMiddleware, requireMember("admin"), async (req, res) => {
  try {
    const { seats_total } = req.body;
    
    if (!Number.isInteger(seats_total) || seats_total < 1) {
      return res.status(400).json({ error: "Invalid seat count" });
    }
    
    // Check if reducing seats below current usage
    const currentResult = await pool.query(
      'SELECT seats_used FROM organizations WHERE id = $1',
      [req.user.orgId]
    );
    
    if (seats_total < currentResult.rows[0].seats_used) {
      return res.status(400).json({ error: "Cannot reduce seats below current usage" });
    }
    
    await pool.query(
      'UPDATE organizations SET seats_total = $1 WHERE id = $2',
      [seats_total, req.user.orgId]
    );
    
    res.json({ message: "Seats updated successfully", seats_total });
  } catch (error) {
    console.error('Error updating seats:', error);
    res.status(500).json({ error: 'Failed to update seats' });
  }
});

// Invitation Management
app.post("/api/org/invites", authMiddleware, requireMember("admin"), async (req, res) => {
  try {
    const { email, role } = req.body;
    
    if (!email || !role) {
      return res.status(400).json({ error: "Email and role are required" });
    }
    
    if (!['admin', 'reviewer', 'requestor'].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    
    // Check if we have available seats
    const hasSeats = await checkSeatsAvailable(req.user.orgId, 1);
    if (!hasSeats) {
      return res.status(400).json({ error: "No available seats" });
    }
    
    // Check if user is already a member
    const existingMember = await pool.query(
      `SELECT 1 FROM users u 
       JOIN user_org_roles r ON r.user_id = u.id 
       WHERE u.email = $1 AND r.org_id = $2`,
      [email.toLowerCase(), req.user.orgId]
    );
    
    if (existingMember.rowCount > 0) {
      return res.status(400).json({ error: "User is already a member" });
    }
    
    const invite = await createInvite({
      orgId: req.user.orgId,
      email,
      role,
      createdBy: req.user.id
    });

    // Get organization and inviter details for email
    const orgResult = await pool.query('SELECT name FROM organizations WHERE id = $1', [req.user.orgId]);
    const inviterResult = await pool.query('SELECT email FROM users WHERE id = $1', [req.user.id]);
    
    const orgName = orgResult.rows[0]?.name || 'Your Organization';
    const inviterName = inviterResult.rows[0]?.email || 'Admin';

    // Send invitation email
    const emailResult = await emailService.sendInvitationEmail({
      email: invite.email,
      token: invite.token,
      role: invite.role,
      orgName,
      inviterName
    });

    const response = { 
      message: "Invitation created",
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expires_at: invite.expires_at
      }
    };

    // Include email status in response
    if (emailResult.success) {
      response.message = "Invitation created and email sent";
      response.emailSent = true;
    } else {
      response.emailSent = false;
      response.emailError = emailResult.reason || emailResult.error;
      // Include token for manual sharing if email failed
      response.invite.token = invite.token;
    }
    
    res.json(response);
  } catch (error) {
    console.error('Error creating invite:', error);
    res.status(500).json({ error: 'Failed to create invitation' });
  }
});

app.get("/api/org/invites", authMiddleware, requireMember("admin"), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, role, expires_at, accepted, created_at 
       FROM invites 
       WHERE org_id = $1 
       ORDER BY created_at DESC`,
      [req.user.orgId]
    );
    
    res.json({ invites: result.rows });
  } catch (error) {
    console.error('Error listing invites:', error);
    res.status(500).json({ error: 'Failed to list invitations' });
  }
});

// Accept invitation endpoint
app.post("/api/auth/accept-invite", async (req, res) => {
  try {
    const { token, email, password } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: "Invite token required" });
    }
    
    const invite = await getInvite(token);
    if (!invite) {
      return res.status(400).json({ error: "Invalid or expired invitation" });
    }
    
    // Create or get user
    let user;
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (existingUser.rowCount > 0) {
      user = existingUser.rows[0];
    } else {
      // Create new user
      const hashedPassword = await bcrypt.hash(password, 12);
      const newUser = await pool.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
        [email.toLowerCase(), hashedPassword]
      );
      user = newUser.rows[0];
    }
    
    // Accept the invitation
    const acceptedInvite = await acceptInvite(token, user.id);
    
    // Auto-login the user
    const loginResult = await auth.login({
      orgSlug: acceptedInvite.org_slug,
      email,
      password
    });
    
    auth.setCookie(res, loginResult.token);
    
    res.json({
      message: "Invitation accepted successfully",
      user: { email, role: acceptedInvite.role },
      org: { id: acceptedInvite.org_id, name: acceptedInvite.org_name },
      token: loginResult.token
    });
    
  } catch (error) {
    console.error('Error accepting invite:', error);
    res.status(500).json({ error: error.message || 'Failed to accept invitation' });
  }
});

// Share Link Management
app.post("/api/org/shares", authMiddleware, requireMember("admin"), async (req, res) => {
  try {
    const { artifactType, artifactId, scope, expiresAt, maxUses } = req.body;
    
    if (!artifactType || !artifactId || !scope) {
      return res.status(400).json({ error: "artifactType, artifactId, and scope are required" });
    }
    
    if (!['session', 'brief', 'dashboard'].includes(artifactType)) {
      return res.status(400).json({ error: "Invalid artifactType" });
    }
    
    if (!['view', 'comment'].includes(scope)) {
      return res.status(400).json({ error: "Invalid scope" });
    }
    
    // Validate that the artifact exists in this org
    let artifactExists = false;
    if (artifactType === 'brief') {
      const brief = await getBriefByIdAndOrg(artifactId, req.user.orgId);
      artifactExists = !!brief;
    } else if (artifactType === 'session') {
      const session = await pool.query(
        'SELECT 1 FROM sessions WHERE id = $1 AND org_id = $2',
        [artifactId, req.user.orgId]
      );
      artifactExists = session.rowCount > 0;
    }
    
    if (!artifactExists) {
      return res.status(404).json({ error: "Artifact not found" });
    }
    
    const shareLink = await createShareLink({
      orgId: req.user.orgId,
      artifactType,
      artifactId,
      scope,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      maxUses: maxUses || null,
      createdBy: req.user.id
    });
    
    res.json({
      message: "Share link created",
      shareLink: {
        id: shareLink.id,
        token: shareLink.token,
        artifactType: shareLink.artifact_type,
        artifactId: shareLink.artifact_id,
        scope: shareLink.scope,
        expiresAt: shareLink.expires_at,
        maxUses: shareLink.max_uses,
        url: `${process.env.WEB_ORIGIN || 'http://localhost:5173'}/review/${shareLink.token}`
      }
    });
    
  } catch (error) {
    console.error('Error creating share link:', error);
    res.status(500).json({ error: 'Failed to create share link' });
  }
});

app.get("/api/org/shares", authMiddleware, requireMember("admin"), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.id, s.artifact_type, s.artifact_id, s.scope, s.token,
        s.expires_at, s.max_uses, s.uses, s.created_at, s.revoked,
        u.email as created_by_email
      FROM share_links s
      LEFT JOIN users u ON s.created_by = u.id
      WHERE s.org_id = $1
      ORDER BY s.created_at DESC
    `, [req.user.orgId]);
    
    res.json({ shareLinks: result.rows });
  } catch (error) {
    console.error('Error listing share links:', error);
    res.status(500).json({ error: 'Failed to list share links' });
  }
});

app.delete("/api/org/shares/:id", authMiddleware, requireMember("admin"), async (req, res) => {
  try {
    await revokeShareLink(req.params.id, req.user.orgId);
    res.json({ message: "Share link revoked" });
  } catch (error) {
    console.error('Error revoking share link:', error);
    res.status(500).json({ error: 'Failed to revoke share link' });
  }
});

// Guest review route (accessible via share token)
app.get("/api/review/:token", allowMemberOrShare("view"), async (req, res) => {
  try {
    const orgId = getRequestOrgId(req);
    const shareLink = req.guest;
    
    if (!shareLink) {
      return res.status(403).json({ error: "Share link required" });
    }
    
    let data = null;
    
    if (shareLink.artifactType === 'brief') {
      data = await getBriefByIdAndOrg(shareLink.artifactId, orgId);
    } else if (shareLink.artifactType === 'session') {
      const session = await getSession(shareLink.artifactId);
      data = session;
    }
    
    if (!data) {
      return res.status(404).json({ error: "Content not found" });
    }
    
    res.json({
      type: shareLink.artifactType,
      scope: shareLink.scope,
      data
    });
    
  } catch (error) {
    console.error('Error accessing shared content:', error);
    res.status(500).json({ error: 'Failed to access shared content' });
  }
});

// Admin-only: manage user roles
app.put("/api/users/:email/role", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const { email } = req.params;
    const { role } = req.body;
    const orgId = req.user.orgId;
    
    // Validate role
    const validRoles = ['requestor', 'reviewer', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: "Invalid role. Must be one of: " + validRoles.join(', ') });
    }
    
    // Update role
    const result = await pool.query(
      `UPDATE user_org_roles 
       SET role = $1
       FROM users u
       WHERE user_org_roles.user_id = u.id
         AND user_org_roles.org_id = $2 
         AND u.email = $3
       RETURNING user_org_roles.role`,
      [role, orgId, email.toLowerCase()]
    );
    
    if (!result.rowCount) {
      return res.status(404).json({ error: "User not found in your organization" });
    }
    
    res.json({ 
      message: "Role updated successfully",
      email,
      newRole: role
    });
    
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Admin-only: list users in organization
app.get("/api/users", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const orgId = req.user.orgId;
    
    const result = await pool.query(
      `SELECT u.email, r.role, u.email_verified, u.created_at
       FROM users u
       JOIN user_org_roles r ON r.user_id = u.id
       WHERE r.org_id = $1
       ORDER BY u.email`,
      [orgId]
    );
    
    res.json({ users: result.rows });
    
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

// Admin-only: delete user from organization
app.delete("/api/users/:email", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const { email } = req.params;
    const orgId = req.user.orgId;
    
    // Prevent self-deletion
    if (email.toLowerCase() === req.user.email.toLowerCase()) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }
    
    // Check if user exists in the organization
    const userCheck = await pool.query(
      `SELECT u.id, r.role
       FROM users u
       JOIN user_org_roles r ON r.user_id = u.id
       WHERE u.email = $1 AND r.org_id = $2`,
      [email.toLowerCase(), orgId]
    );
    
    if (!userCheck.rowCount) {
      return res.status(404).json({ error: "User not found in your organization" });
    }
    
    const userId = userCheck.rows[0].id;
    
    // Start transaction to ensure data integrity
    await pool.query('BEGIN');
    
    try {
      // Remove user from organization (this will cascade delete related records)
      await pool.query(
        'DELETE FROM user_org_roles WHERE user_id = $1 AND org_id = $2',
        [userId, orgId]
      );
      
      // Update organization seat count
      await pool.query(
        'UPDATE organizations SET seats_used = seats_used - 1 WHERE id = $1',
        [orgId]
      );
      
      // Check if user has any other organization memberships
      const otherMemberships = await pool.query(
        'SELECT 1 FROM user_org_roles WHERE user_id = $1 LIMIT 1',
        [userId]
      );
      
      // If user has no other organization memberships, delete the user record entirely
      if (!otherMemberships.rowCount) {
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);
      }
      
      await pool.query('COMMIT');
      
      res.json({ 
        message: "User removed successfully",
        email,
        deletedCompletely: !otherMemberships.rowCount
      });
      
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Admin-only: manage templates (example placeholders)
app.get("/api/templates", authMiddleware, requireRole("admin"), (req, res) => {
  res.json({ templates: [], message: "Template management coming soon" });
});

app.post("/api/templates", authMiddleware, requireRole("admin"), (req, res) => {
  res.json({ message: "Template creation endpoint - coming soon" });
});

function safeJson(s) {
  try { JSON.parse(s); return s; } catch { 
    // Try to clip to first/last curly braces
    const start = s.indexOf("{"), end = s.lastIndexOf("}");
    return start >= 0 && end > start ? s.slice(start, end + 1) : "{}";
  }
}

const PORT = 8787;

// Initialize database and start server
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  });
