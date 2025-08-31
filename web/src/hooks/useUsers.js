import { useState, useEffect } from 'react';
import { dashboardApi } from '../utils/dashboardApi.js';
import { useNotifications } from '../components/ui/notifications.jsx';

/**
 * Custom hook for managing users and organization data
 */
export function useUsers(user) {
  const [users, setUsers] = useState([]);
  const [seatInfo, setSeatInfo] = useState(null);
  const [invites, setInvites] = useState([]);
  const [shareLinks, setShareLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError, confirm } = useNotifications();

  const fetchUsers = async () => {
    if (!user || user.role !== 'admin') return;
    
    try {
      const data = await dashboardApi.fetchUsers();
      setUsers(data.users);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchSeatInfo = async () => {
    if (!user || user.role !== 'admin') return;
    
    try {
      const data = await dashboardApi.fetchSeatInfo();
      setSeatInfo(data);
    } catch (err) {
      console.error('Error fetching seat info:', err);
    }
  };

  const fetchInvites = async () => {
    if (!user || user.role !== 'admin') return;
    
    try {
      const data = await dashboardApi.fetchInvites();
      setInvites(data.invites);
    } catch (err) {
      console.error('Error fetching invites:', err);
    }
  };

  const fetchShareLinks = async () => {
    if (!user || user.role !== 'admin') return;
    
    try {
      const data = await dashboardApi.fetchShareLinks();
      setShareLinks(data.shareLinks);
    } catch (err) {
      console.error('Error fetching share links:', err);
    }
  };

  const updateUserRole = async (email, newRole) => {
    try {
      await dashboardApi.updateUserRole(email, newRole);
      await Promise.all([fetchUsers(), fetchSeatInfo()]);
      showSuccess(`Successfully updated ${email} to ${newRole}`);
    } catch (err) {
      showError(`Error: ${err.message}`);
    }
  };

  const createInvite = async (inviteForm) => {
    try {
      await dashboardApi.createInvite(inviteForm);
      await Promise.all([fetchInvites(), fetchSeatInfo()]);
      showSuccess(`Invitation sent to ${inviteForm.email}`);
      return true;
    } catch (err) {
      showError(`Error: ${err.message}`);
      return false;
    }
  };

  const createShareLink = async (shareForm) => {
    try {
      const payload = {
        artifactType: shareForm.artifactType,
        artifactId: shareForm.artifactId,
        scope: shareForm.scope
      };
      
      if (shareForm.expiresAt) {
        payload.expiresAt = new Date(shareForm.expiresAt).toISOString();
      }
      
      if (shareForm.maxUses) {
        payload.maxUses = parseInt(shareForm.maxUses);
      }

      const data = await dashboardApi.createShareLink(payload);
      await fetchShareLinks();
      
      // Copy link to clipboard
      navigator.clipboard.writeText(data.shareLink.url);
      showSuccess('Share link created and copied to clipboard!');
      return true;
    } catch (err) {
      showError(`Error: ${err.message}`);
      return false;
    }
  };

  const revokeShareLink = async (linkId) => {
    await confirm({
      title: 'Revoke share link?',
      message: 'Are you sure you want to revoke this share link? Anyone with this link will no longer be able to access the shared content.',
      confirmText: 'Revoke',
      variant: 'warning',
      onConfirm: async () => {
        try {
          await dashboardApi.revokeShareLink(linkId);
          await fetchShareLinks();
          showSuccess('Share link revoked successfully');
        } catch (err) {
          showError(`Error: ${err.message}`);
        }
      }
    });
  };

  const deleteUser = async (email) => {
    await confirm({
      title: 'Delete user?',
      message: `Are you sure you want to remove ${email} from your organization? This action cannot be undone. The user will lose access to all organization data and their seat will be freed up.`,
      confirmText: 'Delete User',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await dashboardApi.deleteUser(email);
          await Promise.all([fetchUsers(), fetchSeatInfo()]);
          showSuccess(`Successfully removed ${email} from organization`);
        } catch (err) {
          showError(`Error: ${err.message}`);
        }
      }
    });
  };

  useEffect(() => {
    if (user && user.role === 'admin') {
      setLoading(true);
      Promise.all([
        fetchUsers(),
        fetchSeatInfo(),
        fetchInvites(),
        fetchShareLinks()
      ]).finally(() => setLoading(false));
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    users,
    seatInfo,
    invites,
    shareLinks,
    loading,
    updateUserRole,
    deleteUser,
    createInvite,
    createShareLink,
    revokeShareLink,
    refetchUsers: fetchUsers,
    refetchInvites: fetchInvites,
    refetchShareLinks: fetchShareLinks
  };
}
