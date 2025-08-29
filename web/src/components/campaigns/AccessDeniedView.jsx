import { Users, Shield } from '../ui/icons';

/**
 * Access denied view for users without permissions
 */
export function AccessDeniedView({ user }) {
  if (!user.orgId) {
    return <NoOrganizationView />;
  }

  if (user.role === 'requestor') {
    return <InsufficientRoleView user={user} />;
  }

  return null;
}

/**
 * No organization view
 */
function NoOrganizationView() {
  return (
    <div className="page-gradient flex items-center justify-center">
      <div className="max-w-md mx-auto text-center space-y-6">
        <div className="empty-state-icon">
          <Users className="w-8 h-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">No Organization</h2>
          <p className="text-muted-foreground">
            You need to be a member of an organization to manage campaigns.
          </p>
        </div>
        <div className="info-card">
          <p className="text-sm text-muted-foreground">
            Please contact your administrator to be added to an organization.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Insufficient role view
 */
function InsufficientRoleView({ user }) {
  return (
    <div className="page-gradient flex items-center justify-center">
      <div className="max-w-md mx-auto text-center space-y-6">
        <div className="access-restricted-icon">
          <Shield className="w-8 h-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">Access Restricted</h2>
          <p className="text-muted-foreground">
            Campaign management requires reviewer or admin role.
          </p>
        </div>
        <div className="info-card">
          <p className="text-sm text-muted-foreground">
            Current role: <span className="font-medium text-foreground">{user.role}</span>
          </p>
        </div>
      </div>
    </div>
  );
}