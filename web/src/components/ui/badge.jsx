import React from 'react';

const badgeVariants = {
  default: "border-transparent bg-gray-900 text-white hover:bg-gray-800",
  secondary: "border-transparent bg-gray-100 text-gray-900 hover:bg-gray-200",
  destructive: "border-transparent bg-red-500 text-white hover:bg-red-600",
  outline: "text-gray-950 border-gray-200 bg-white hover:bg-gray-50"
};

export const Badge = ({ className = '', variant = 'default', children, ...props }) => {
  return (
    <div
      className={`
        inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold 
        transition-colors focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2
        ${badgeVariants[variant]} 
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};
