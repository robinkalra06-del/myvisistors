import React from 'react';
import { Monitor, Smartphone, Tablet } from 'lucide-react';

export function DeviceBreakdown({ devices = [], browsers = [], operatingSystems = [] }) {
  const getIcon = (name) => {
    switch (name.toLowerCase()) {
      case 'mobile': return Smartphone;
      case 'tablet': return Tablet;
      default: return Monitor;
    }
  };

  return (
    <div className="space-y-6">
      {/* Devices Progress Bars */}
      <div>
        <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Device Types</h5>
        <div className="space-y-3">
          {devices.map((d, i) => {
            const Icon = getIcon(d.name);
            return (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-200">
                    <Icon className="w-3.5 h-3.5 text-blue-400" />
                    {d.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">{d.count}</span>
                    <span className="font-mono text-slate-300 w-8 text-right">{d.percentage}%</span>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${d.percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Browsers & OS Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-800">
        <div>
          <h5 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Browsers</h5>
          <div className="space-y-1.5">
            {browsers.slice(0, 4).map((b, i) => (
              <div key={i} className="flex justify-between text-xs text-slate-300">
                <span className="truncate">{b.name}</span>
                <span className="text-slate-500 font-mono">{b.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h5 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Operating Systems</h5>
          <div className="space-y-1.5">
            {operatingSystems.slice(0, 4).map((o, i) => (
              <div key={i} className="flex justify-between text-xs text-slate-300">
                <span className="truncate">{o.name}</span>
                <span className="text-slate-500 font-mono">{o.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
