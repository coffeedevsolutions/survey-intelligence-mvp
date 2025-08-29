import { useState, useEffect } from 'react';
import { dashboardApi } from '../utils/dashboardApi.js';
import { useNotifications } from '../components/ui/notifications.jsx';

/**
 * Custom hook for managing tech stack data
 */
export function useStack(user) {
  const [stackData, setStackData] = useState({ systems: [], capabilities: [], policies: [] });
  const [loading, setLoading] = useState(false);
  const [editingSystem, setEditingSystem] = useState(null);
  const [editingCapability, setEditingCapability] = useState(null);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [selectedSystemForCapability, setSelectedSystemForCapability] = useState(null);
  const { showSuccess, showError, confirmDelete } = useNotifications();

  const fetchStackData = async () => {
    if (!user?.orgId || user.role !== 'admin') return;
    
    setLoading(true);
    try {
      const data = await dashboardApi.fetchStackData(user.orgId);
      setStackData(data);
    } catch (error) {
      console.error('Error fetching stack data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSystem = async () => {
    await fetchStackData();
  };

  const handleDeleteSystem = async (systemId) => {
    await confirmDelete('this system (and all associated capabilities)', async () => {
      try {
        await dashboardApi.deleteSystem(user.orgId, systemId);
        await fetchStackData();
        showSuccess('System deleted successfully');
      } catch (err) {
        showError(`Error: ${err.message}`);
      }
    });
  };

  const handleSaveCapability = async () => {
    await fetchStackData();
  };

  const handleDeleteCapability = async (capabilityId) => {
    await confirmDelete('this capability', async () => {
      try {
        await dashboardApi.deleteCapability(user.orgId, capabilityId);
        await fetchStackData();
        showSuccess('Capability deleted successfully');
      } catch (err) {
        showError(`Error: ${err.message}`);
      }
    });
  };

  const handleSavePolicy = async () => {
    await fetchStackData();
  };

  const handleDeletePolicy = async (policyId) => {
    await confirmDelete('this policy', async () => {
      try {
        await dashboardApi.deletePolicy(user.orgId, policyId);
        await fetchStackData();
        showSuccess('Policy deleted successfully');
      } catch (err) {
        showError(`Error: ${err.message}`);
      }
    });
  };

  useEffect(() => {
    if (user?.orgId && user.role === 'admin') {
      fetchStackData();
    }
  }, [user]);

  return {
    stackData,
    loading,
    editingSystem,
    setEditingSystem,
    editingCapability,
    setEditingCapability,
    editingPolicy,
    setEditingPolicy,
    selectedSystemForCapability,
    setSelectedSystemForCapability,
    handleSaveSystem,
    handleDeleteSystem,
    handleSaveCapability,
    handleDeleteCapability,
    handleSavePolicy,
    handleDeletePolicy,
    refetchStackData: fetchStackData
  };
}
