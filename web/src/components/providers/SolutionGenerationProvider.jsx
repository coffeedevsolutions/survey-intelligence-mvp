import React from 'react';
import { useSolutionGeneration } from '../../hooks/useSolutionGeneration';
import { SolutionGenerationContext } from '../../contexts/SolutionGenerationContext.js';

/**
 * Solution Generation Context Provider
 * Provides solution generation state and methods across the app
 */
export function SolutionGenerationProvider({ children, user, onSolutionCompleted }) {
  // Always call the hook, but pass user (which might be null)
  const solutionGeneration = useSolutionGeneration(user, onSolutionCompleted);

  return (
    <SolutionGenerationContext.Provider value={solutionGeneration}>
      {children}
    </SolutionGenerationContext.Provider>
  );
}
