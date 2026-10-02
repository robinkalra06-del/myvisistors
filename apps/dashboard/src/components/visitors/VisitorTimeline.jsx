import React from 'react';
import { FileText, Zap, Compass, Clock, ArrowRight } from 'lucide-react';

export function VisitorTimeline({ timeline = [] }) {
  if (!timeline.length) {
    return (
      <div className="py-8 text-center text-slate-400 text-sm">
        No recorded activity events for this session yet.
      </div>
    );
  }

  const formatTime = (ts) => {
    try {
      return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
      {timeline.map((step, idx) => {
        const isEvent = step.type === 'event';
        const Icon = isEvent ? Zap : FileText;

        return (
          <div key={step.id || idx} className="relative flex items-start gap-3 group">
            {/* Step icon node */}
            <div
              className={`absolute -left-6 mt-0.5 h-5 w-5 rounded-full border flex items-center justify-center text-[10px] z-10 transition-transform group-hover:scale-110
                ${
                  isEvent
                    ? 'bg-purple-950/80 border-purple-500 text-purple-400'
                    : 'bg-blue-950/80 border-blue-500 text-blue-400'
                }
              `}
            >
              <Icon className="w-2.5 h-2.5" />
            </div>

            {/* Content card */}
            <div className="flex-1 bg-slate-900/60 border border-slate-800 rounded-lg p-3 hover:border-slate-700 transition">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <span className="text-slate-500 font-mono">#{idx + 1}</span>
                  {step.title}
                </span>
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {formatTime(step.timestamp)}
                </span>
              </div>

              {step.path && (
                <div className="text-xs text-blue-400 font-mono flex items-center gap-1 mt-1">
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                  {step.path}
                </div>
              )}

              {/* Event custom metadata */}
              {isEvent && step.properties && Object.keys(step.properties).length > 0 && (
                <div className="mt-2 bg-slate-950/80 rounded p-2 text-[11px] font-mono text-slate-300 border border-slate-850">
                  <span className="text-slate-500 block mb-0.5">Parameters:</span>
                  <pre className="overflow-x-auto">{JSON.stringify(step.properties, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
