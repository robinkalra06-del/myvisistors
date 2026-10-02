import React from 'react';

export function Card({ children, className = '', title, subtitle, action, ...props }) {
  return (
    <div
      className={`bg-[#111827]/80 backdrop-blur-sm border border-slate-800 rounded-xl p-5 shadow-sm transition-all hover:border-slate-700/80 ${className}`}
      {...props}
    >
      {(title || subtitle || action) && (
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800/60">
          <div>
            {title && <h3 className="text-base font-semibold text-slate-100">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
