/**
 * Loading spinner component
 */
export function LoadingSpinner({ size = "8", className = "" }) {
  return (
    <div className={`min-h-screen bg-gray-50 flex items-center justify-center ${className}`}>
      <div className={`animate-spin rounded-full h-${size} w-${size} border-b-2 border-blue-600`}></div>
    </div>
  );
}

/**
 * Inline loading spinner for buttons and smaller areas
 */
export function InlineSpinner({ size = "4", className = "" }) {
  return (
    <div className={`animate-spin rounded-full h-${size} w-${size} border-b-2 border-current ${className}`}></div>
  );
}
