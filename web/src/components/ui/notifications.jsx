import React from 'react';
import { ToastProvider, useToast } from './toast';
import { ConfirmationProvider, useConfirmation } from './confirmation-dialog';

// Combined notifications provider
export function NotificationsProvider({ children }) {
  return (
    <ToastProvider>
      <ConfirmationProvider>
        {children}
      </ConfirmationProvider>
    </ToastProvider>
  );
}

// Combined hook for easy access to all notification methods
export function useNotifications() {
  const { toast } = useToast();
  const { confirm } = useConfirmation();

  return {
    // Toast notifications
    toast,
    
    // Confirmation dialogs
    confirm,

    // Convenience methods for common use cases
    showSuccess: (message, title) => toast.success(message, { title }),
    showError: (message, title) => toast.error(message, { title }),
    showWarning: (message, title) => toast.warning(message, { title }),
    showInfo: (message, title) => toast.info(message, { title }),

    // Convenience method for destructive actions
    confirmDelete: (itemName, onConfirm) => {
      return confirm({
        title: `Delete ${itemName}?`,
        message: `Are you sure you want to delete ${itemName}? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        variant: 'destructive',
        onConfirm
      });
    },

    // Convenience method for archive actions
    confirmArchive: (itemName, onConfirm) => {
      return confirm({
        title: `Archive ${itemName}?`,
        message: `Are you sure you want to archive ${itemName}? This will move it to the archived section.`,
        confirmText: 'Archive',
        cancelText: 'Cancel',
        variant: 'warning',
        onConfirm
      });
    }
  };
}

// Export individual hooks for specific use cases
export { useToast, useConfirmation };
