import { pool } from "./database.js";
import { getShareLink, incrementShareLinkUse } from "./database.js";

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
      const shareLink = await getShareLink(token);
      if (!shareLink) {
        return res.status(401).json({ error: "invalid_token" });
      }

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
      await incrementShareLinkUse(shareLink.id, clientIp, userAgent);

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
    console.log('🔍 requireMember middleware called');
    console.log('🔐 req.user:', req.user);
    console.log('🔐 req.oidc?.isAuthenticated():', req.oidc?.isAuthenticated());
    
    // Check Auth0 authentication first
    if (req.oidc) {
      if (!req.oidc.isAuthenticated()) {
        console.log('❌ Auth0 not authenticated');
        return res.status(401).json({ error: "unauthorized" });
      }
      
      // If no enriched user, create from OIDC
      if (!req.user) {
        console.log('⚠️ No enriched user, using fallback');
        req.user = { 
          email: req.oidc.user?.email, 
          auth0Sub: req.oidc.user?.sub, 
          role: "requestor",
          orgId: null,
          orgSlug: null
        };
      }
    }
    
    if (!req.user?.orgId) {
      console.log('❌ No orgId found. User:', req.user);
      return res.status(401).json({ error: "member_required" });
    }
    
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      console.log('❌ Insufficient role. Required:', roles, 'Got:', req.user.role);
      return res.status(403).json({ error: "insufficient_role" });
    }
    
    console.log('✅ requireMember passed');
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