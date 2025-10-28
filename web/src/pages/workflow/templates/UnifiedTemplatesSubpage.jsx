import React from 'react';
import { UnifiedTemplatesTab } from '../../settings/UnifiedTemplatesTab';

/**
 * Unified Templates Subpage for Workflow Management
 * Wraps the existing UnifiedTemplatesTab component
 */
export function UnifiedTemplatesSubpage({ user }) {
  return (
    <UnifiedTemplatesTab user={user} />
  );
}
