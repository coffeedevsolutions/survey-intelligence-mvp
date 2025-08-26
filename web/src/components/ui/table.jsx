import React from 'react';

export const Table = ({ className = '', children, ...props }) => {
  return (
    <div className="relative w-full overflow-auto">
      <table className={`w-full caption-bottom text-sm ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
};

export const TableHeader = ({ className = '', children, ...props }) => {
  return (
    <thead className={`[&_tr]:border-b ${className}`} {...props}>
      {children}
    </thead>
  );
};

export const TableBody = ({ className = '', children, ...props }) => {
  return (
    <tbody className={`[&_tr:last-child]:border-0 ${className}`} {...props}>
      {children}
    </tbody>
  );
};

export const TableRow = ({ className = '', children, ...props }) => {
  return (
    <tr
      className={`
        border-b transition-colors hover:bg-gray-50/50 
        data-[state=selected]:bg-gray-100
        ${className}
      `}
      {...props}
    >
      {children}
    </tr>
  );
};

export const TableHead = ({ className = '', children, ...props }) => {
  return (
    <th
      className={`
        h-12 px-4 text-left align-middle font-medium text-gray-500 
        [&:has([role=checkbox])]:pr-0
        ${className}
      `}
      {...props}
    >
      {children}
    </th>
  );
};

export const TableCell = ({ className = '', children, ...props }) => {
  return (
    <td
      className={`
        p-4 align-middle [&:has([role=checkbox])]:pr-0
        ${className}
      `}
      {...props}
    >
      {children}
    </td>
  );
};
