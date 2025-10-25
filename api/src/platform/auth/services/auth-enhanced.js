import { pool } from "../../../database/connection.js";

// Enhanced middleware that accepts either org member OR valid share token
export function allowMemberOrShare(scopeNeeded = 'view') {
  return async (req, res, next) => {
    // Path A: Check if user is authenticated org member
    if (req.user?.orgId) {
      return next();
    }

    // Path B: Check for share token
    const token = (req.query.token || req.params.token || req.body.token || '').trim();
    if (!token) {
      return res.status(401).json({ error: "unauthorized" });
    }

    try {
      const shareLinkResult = await pool.query(
        'SELECT * FROM share_links WHERE token = $1 AND expires_at > NOW()',
        [token]
      );
      
      if (!shareLinkResult.rows.length) {
        return res.status(401).json({ error: "invalid_token" });
      }
      
      const shareLink = shareLinkResult.rows[0];

      // Check max uses
      if (shareLink.max_uses && shareLink.uses >= shareLink.max_uses) {
        return res.status(403).json({ error: "link_expired" });
      }

      // Check scope permissions
      if (scopeNeeded === 'comment' && shareLink.scope !== 'comment') {
        return res.status(403).json({ error: "insufficient_permissions" });
      }

      // Check artifact access (basic validation)
      const artifactId = req.params.id || req.params.sessionId || req.params.briefId;
      if (artifactId && shareLink.artifact_id !== artifactId) {
        return res.status(403).json({ error: "artifact_mismatch" });
      }

      // Attach guest identity to request
      req.guest = {
        shareLinkId: shareLink.id,
        orgId: shareLink.org_id,
        artifactType: shareLink.artifact_type,
        artifactId: shareLink.artifact_id,
        scope: shareLink.scope
      };

      // Log the access
      const clientIp = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');
      await pool.query(
        'UPDATE share_links SET uses = uses + 1 WHERE id = $1',
        [shareLink.id]
      );

      next();
    } catch (error) {
      console.error('Share link validation error:', error);
      return res.status(500).json({ error: "internal_error" });
    }
  };
}

// Require authenticated member only (no guest access)
export function requireMember(...roles) {
  return (req, res, next) => {
    console.log('🔒 [RequireMember] Middleware started for path:', req.path);
    console.log('🔒 [RequireMember] Required roles:', roles);
    console.log('🔒 [RequireMember] req.oidc exists:', !!req.oidc);
    console.log('🔒 [RequireMember] req.user:', req.user);
    
    // Check Auth0 authentication first
    if (req.oidc) {
      console.log('🔒 [RequireMember] Using Auth0 flow');
      if (!req.oidc.isAuthenticated()) {
        console.log('🔒 [RequireMember] Auth0 not authenticated');
        return res.status(401).json({ error: "unauthorized" });
      }
      
      // If no enriched user, create from OIDC
      if (!req.user) {
        console.log('🔒 [RequireMember] Creating fallback user from OIDC');
        req.user = { 
          email: req.oidc.user?.email, 
          auth0Sub: req.oidc.user?.sub, 
          role: "requestor",
          orgId: null,
          orgSlug: null
        };
      }
    }
    
    console.log('🔒 [RequireMember] Final user object:', req.user);
    
    if (!req.user?.orgId) {
      console.log('🔒 [RequireMember] No orgId, returning member_required');
      return res.status(401).json({ error: "member_required" });
    }
    
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      console.log('🔒 [RequireMember] Insufficient role');
      return res.status(403).json({ error: "insufficient_role" });
    }
    
    console.log('🔒 [RequireMember] Success, calling next()');
    next();
  };
}

// Helper to get org ID from either member or guest context
export function getRequestOrgId(req) {
  return req.user?.orgId || req.guest?.orgId;
}

// Helper to check if request has specific permission
export function hasPermission(req, permission) {
  // Members have full permissions within their org
  if (req.user?.orgId) {
    return true;
  }
  
  // Guests only have the scope they were granted
  if (req.guest?.scope) {
    if (permission === 'view') return true;
    if (permission === 'comment') return req.guest.scope === 'comment';
  }
  
  return false;
}