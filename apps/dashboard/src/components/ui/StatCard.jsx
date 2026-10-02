import React from 'react';

export function StatCard({ title, value, change, isPositive, icon: Icon, live = false, unit = '', className = '' }) {
  return (
    <div className={`bg-[#111827]/90 border border-slate-800 rounded-xl p-5 relative overflow-hidden transition-all hover:border-slate-700/80 shadow-sm ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">{title}</span>
        {Icon && (
          <div className="p-2 rounded-lg bg-slate-800/80 text-blue-400">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl lg:text-3xl font-bold tracking-tight text-white">
          {value}
        </span>
        {unit && <span className="text-xs text-slate-400 font-medium">{unit}</span>}
      </div>

      {change !== undefined && (
        <div className="mt-2.5 flex items-center gap-1.5 text-xs">
          <span className={`font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isPositive ? '↑' : '↓'} {change}
          </span>
          <span className="text-slate-500">vs yesterday</span>
        </div>
      )}

      {live && (
        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-medium">Live Active</span>
        </div>
      )}
    </div>
  );
}
