import React from 'react';
import { Badge } from '../ui/Badge.jsx';

export function ReferrersTable({ channels = [], referrers = [] }) {
  return (
    <div className="space-y-4">
      {/* Acquisition Channels */}
      <div className="space-y-2">
        <h5 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Traffic Channels</h5>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {channels.map((ch, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-2.5">
              <div className="text-[11px] text-slate-400 font-medium truncate">{ch.channel}</div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-sm font-bold text-slate-200">{ch.count}</span>
                <span className="text-xs text-slate-500 font-mono">{ch.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Referrers */}
      <div className="pt-3 border-t border-slate-800">
        <h5 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Top Referrers</h5>
        <div className="space-y-1.5">
          {referrers.slice(0, 5).map((r, i) => (
            <div key={i} className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-slate-800/40">
              <span className="truncate max-w-[200px] text-slate-300 font-mono">{r.source}</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">{r.count}</span>
                <span className="text-slate-500 font-mono text-[11px]">{r.percentage}%</span>
              </div>
            </div>
          ))}

          {referrers.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-3">No external referrers recorded.</p>
          )}
        </div>
      </div>
    </div>
  );
}
