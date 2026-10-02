import React from 'react';
import { CountryFlag } from '../common/CountryFlag.jsx';

export function GeoDistribution({ countries = [], cities = [] }) {
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {countries.slice(0, 6).map((item, idx) => (
          <div key={item.code || idx} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <CountryFlag countryCode={item.code} countryName={item.country} />
                <span className="font-medium text-slate-200">{item.country}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-300">{item.visitors}</span>
                <span className="text-slate-500 font-mono w-9 text-right">{item.percentage}%</span>
              </div>
            </div>
            {/* Percentage progress bar */}
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(item.percentage, 3))}%` }}
              ></div>
            </div>
          </div>
        ))}

        {countries.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-6">No geographic data recorded yet.</p>
        )}
      </div>

      {cities.length > 0 && (
        <div className="pt-3 border-t border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            Top Cities
          </span>
          <div className="flex flex-wrap gap-1.5">
            {cities.slice(0, 6).map((c, i) => (
              <span key={i} className="text-xs bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-300">
                {c.city} ({c.visitors})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
