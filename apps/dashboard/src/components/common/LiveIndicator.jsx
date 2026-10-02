import React from 'react';

export function LiveIndicator({ count = 0, connected = true }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 shadow-inner">
      <span className="relative flex h-2.5 w-2.5">
        {connected ? (
          <>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </>
        ) : (
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
        )}
      </span>

      <span className="text-xs font-semibold text-slate-200 uppercase tracking-wide">
        {connected ? 'LIVE' : 'Connecting'}
      </span>

      <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
        {count}
      </span>
    </div>
  );
}
