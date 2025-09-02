import { useContext } from 'react';
import { SolutionGenerationContext } from '../contexts/SolutionGenerationContext.js';

/**
 * Hook to use solution generation context
 */
export function useSolutionGenerationContext() {
  const context = useContext(SolutionGenerationContext);
  if (!context) {
    throw new Error('useSolutionGenerationContext must be used within a SolutionGenerationProvider');
  }
  return context;
}
