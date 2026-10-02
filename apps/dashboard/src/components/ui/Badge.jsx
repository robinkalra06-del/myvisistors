import React from 'react';

export function Badge({ children, variant = 'default', size = 'sm', className = '' }) {
  const variants = {
    default: 'bg-slate-800 text-slate-300 border-slate-700',
    primary: 'bg-blue-950/60 text-blue-400 border-blue-800/60',
    online: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60',
    idle: 'bg-amber-950/60 text-amber-400 border-amber-800/60',
    offline: 'bg-slate-900 text-slate-400 border-slate-800',
    purple: 'bg-purple-950/60 text-purple-400 border-purple-800/60',
    danger: 'bg-red-950/60 text-red-400 border-red-800/60'
  };

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1'
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </span>
  );
}
