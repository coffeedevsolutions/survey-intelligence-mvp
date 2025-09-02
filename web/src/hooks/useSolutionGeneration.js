import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../utils/api.js';

/**
 * Custom hook for managing solution generation queue and state
 */
export function useSolutionGeneration(user, onSolutionCompleted) {
  const [generatingItems, setGeneratingItems] = useState([]);
  const [pollInterval, setPollInterval] = useState(null);

  // Start polling for solution completion
  const startPolling = useCallback(() => {
    if (pollInterval || !user?.orgId) return; // Already polling or no user
    
    const interval = setInterval(async () => {
      if (generatingItems.length === 0) {
        clearInterval(interval);
        setPollInterval(null);
        return;
      }

      // Check for completed solutions
      try {
        const response = await fetch(`${API_BASE_URL}/api/orgs/${user.orgId}/solutions`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const solutions = await response.json();
          const now = Date.now();
          
          // Check if any generating items now have corresponding solutions
          const stillGenerating = generatingItems.filter(item => {
            // Look for a solution that was created after this item started generating
            const correspondingSolution = solutions.find(solution => 
              solution.brief_id === item.briefId && 
              new Date(solution.created_at).getTime() >= item.startTime
            );
            
            if (correspondingSolution) {
              // Solution found - remove from queue and notify
              console.log(`✅ Solution generated for brief ${item.briefId}`);
              if (onSolutionCompleted) {
                onSolutionCompleted(correspondingSolution);
              }
              return false;
            }
            
            // Check if item has been generating for too long (fail-safe)
            const timeElapsed = now - item.startTime;
            if (timeElapsed > 60000) { // 60 seconds timeout
              console.log(`⏰ Generation timeout for brief ${item.briefId}`);
              return false;
            }
            
            return true; // Still generating
          });
          
          if (stillGenerating.length !== generatingItems.length) {
            setGeneratingItems(stillGenerating);
            
            // If no items left, stop polling
            if (stillGenerating.length === 0) {
              clearInterval(interval);
              setPollInterval(null);
            }
          }
        }
      } catch (error) {
        console.error('Error polling for solution completion:', error);
      }
    }, 3000); // Poll every 3 seconds
    
    setPollInterval(interval);
  }, [generatingItems, user?.orgId, pollInterval, onSolutionCompleted]);

  // Add an item to the generation queue
  const addGeneratingItem = useCallback((briefId, briefTitle, briefDescription) => {
    if (!user?.orgId) {
      console.warn('Cannot add generating item: user not available');
      return null;
    }

    const newItem = {
      id: `gen_${briefId}_${Date.now()}`,
      briefId,
      briefTitle,
      briefDescription,
      startTime: Date.now(),
      status: 'generating'
    };
    
    setGeneratingItems(prev => [...prev, newItem]);
    
    // Start polling for completion if not already polling
    if (!pollInterval) {
      startPolling();
    }
    
    return newItem.id;
  }, [pollInterval, startPolling, user?.orgId]);

  // Remove an item from the generation queue
  const removeGeneratingItem = useCallback((itemId) => {
    setGeneratingItems(prev => prev.filter(item => item.id !== itemId));
  }, []);

  // Clear all generating items
  const clearGeneratingItems = useCallback(() => {
    setGeneratingItems([]);
    if (pollInterval) {
      clearInterval(pollInterval);
      setPollInterval(null);
    }
  }, [pollInterval]);

  // Stop polling when component unmounts or user changes
  useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [pollInterval]);

  // Auto-start polling when items are added and user is available
  useEffect(() => {
    if (generatingItems.length > 0 && !pollInterval && user?.orgId) {
      startPolling();
    }
  }, [generatingItems.length, pollInterval, startPolling, user?.orgId]);

  return {
    generatingItems,
    addGeneratingItem,
    removeGeneratingItem,
    clearGeneratingItems,
    isGenerating: generatingItems.length > 0
  };
}
