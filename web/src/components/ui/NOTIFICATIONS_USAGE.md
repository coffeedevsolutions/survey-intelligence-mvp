# Enterprise Notification System Usage

This notification system replaces all `alert()` and `confirm()` calls with modern, enterprise-grade UI components that follow SaaS design best practices.

## Components Included

1. **Toast Notifications** - For success, error, warning, and info messages
2. **Confirmation Dialogs** - For destructive actions requiring user confirmation
3. **Unified Provider** - Combines both systems for easy integration

## Setup

The notification system is already integrated into the main App component. No additional setup required.

## Basic Usage

```jsx
import { useNotifications } from '../ui/notifications.jsx';

function MyComponent() {
  const { showSuccess, showError, showWarning, showInfo, confirmArchive, confirmDelete } = useNotifications();

  // Toast notifications
  const handleSuccess = () => {
    showSuccess('Operation completed successfully!');
  };

  const handleError = () => {
    showError('Something went wrong. Please try again.');
  };

  const handleWarning = () => {
    showWarning('This action may have unintended consequences.');
  };

  const handleInfo = () => {
    showInfo('New feature available in settings.');
  };

  // Confirmation dialogs
  const handleDelete = async () => {
    await confirmDelete('this item', () => {
      // Delete logic here
      showSuccess('Item deleted successfully!');
    });
  };

  const handleArchive = async () => {
    await confirmArchive('this survey', () => {
      // Archive logic here
      showSuccess('Survey archived!');
    });
  };
}
```

## Advanced Usage

### Custom Toast Options

```jsx
const { toast } = useNotifications();

// Custom duration
toast.success('Quick message', { duration: 2000 });

// With title
toast.error('Operation failed', { 
  title: 'Database Error',
  duration: 8000 
});
```

### Custom Confirmation Dialogs

```jsx
const { confirm } = useNotifications();

const handleCustomAction = async () => {
  const confirmed = await confirm({
    title: 'Proceed with export?',
    message: 'This will export all user data to a CSV file. This may take several minutes.',
    confirmText: 'Start Export',
    cancelText: 'Cancel',
    variant: 'default', // 'destructive', 'warning', or 'default'
    onConfirm: () => {
      // Export logic
    }
  });

  if (confirmed) {
    console.log('User confirmed the action');
  }
};
```

## Migration from alert() and confirm()

### Before (old way):
```jsx
// ❌ Old alert notifications
alert('Success!');
alert('Error occurred');

if (confirm('Are you sure?')) {
  // do something
}
```

### After (new way):
```jsx
// ✅ New notification system
showSuccess('Success!');
showError('Error occurred');

await confirmDelete('this item', () => {
  // do something
});
```

## Notification Types

### Toast Notifications
- **Success**: Green gradient, checkmark icon
- **Error**: Red gradient, X icon  
- **Warning**: Amber gradient, warning triangle icon
- **Info**: Blue gradient, info icon

### Confirmation Dialogs
- **Destructive**: Red styling for delete actions
- **Warning**: Amber styling for archive actions
- **Default**: Blue styling for general confirmations

## Features

### Toast Notifications
- ✅ Auto-dismiss with customizable duration
- ✅ Manual dismiss with X button
- ✅ Smooth enter/exit animations
- ✅ Portal rendering (appears above all content)
- ✅ Responsive design
- ✅ Gradient backgrounds with proper contrast
- ✅ Icon indicators for message type

### Confirmation Dialogs
- ✅ Modal overlay with backdrop blur
- ✅ Keyboard accessible (ESC to close)
- ✅ Click outside to cancel
- ✅ Promise-based API for async handling
- ✅ Custom styling per action type
- ✅ Portal rendering for proper z-index

## Design Principles

This notification system follows enterprise SaaS UX best practices:

1. **Non-intrusive**: Toasts appear in top-right corner
2. **Contextual**: Different colors/icons for different message types
3. **Accessible**: Proper contrast ratios and keyboard navigation
4. **Consistent**: Unified design language across all notifications
5. **Performant**: Portal rendering prevents layout issues
6. **Responsive**: Works across all screen sizes
7. **Professional**: Subtle animations and modern gradients

## Browser Support

- Modern browsers with React 18+ support
- Uses React Portals and modern CSS features
- Graceful fallbacks for older browsers
