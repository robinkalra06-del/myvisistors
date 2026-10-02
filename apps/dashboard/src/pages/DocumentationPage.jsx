import React from 'react';
import { Card } from '../components/ui/Card.jsx';
import { BookOpen, Code2, ShieldCheck, Zap, Server, Globe } from 'lucide-react';

export function DocumentationPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="pb-2 border-b border-slate-800">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-400" />
          Documentation & API Reference
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Complete guide for integrating, customizing, and scaling LiveTrack.
        </p>
      </div>

      {/* Section 1: JavaScript Tracking API */}
      <Card title="1. JavaScript Client API Reference">
        <div className="space-y-4 text-xs text-slate-300">
          <p>
            When <code className="text-blue-400">tracker.js</code> loads, it exposes a global <code className="text-blue-400">window.LiveTrack</code> object with the following methods:
          </p>

          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
              <div className="font-mono font-bold text-blue-300 mb-1">LiveTrack.track(eventName, properties)</div>
              <p className="text-slate-400 mb-2">Track custom business actions like purchases, signup clicks, and modal opens.</p>
              <pre className="p-2 rounded bg-black/50 text-purple-300 overflow-x-auto">{`LiveTrack.track("purchase_completed", {
  currency: "USD",
  value: 99.00,
  plan: "Enterprise"
});`}</pre>
            </div>

            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
              <div className="font-mono font-bold text-blue-300 mb-1">LiveTrack.pageView(customTitle, customUrl)</div>
              <p className="text-slate-400 mb-2">Manually trigger a pageview event if your router does not use the browser History API.</p>
              <pre className="p-2 rounded bg-black/50 text-purple-300 overflow-x-auto">{`LiveTrack.pageView("Custom Modal View", "/modal/checkout");`}</pre>
            </div>

            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
              <div className="font-mono font-bold text-blue-300 mb-1">LiveTrack.optOut() & LiveTrack.optIn()</div>
              <p className="text-slate-400 mb-2">Allows your visitors to opt out of tracking, respecting privacy and consent management.</p>
              <pre className="p-2 rounded bg-black/50 text-purple-300 overflow-x-auto">{`// To opt-out visitor
LiveTrack.optOut();

// To re-enable
LiveTrack.optIn();`}</pre>
            </div>
          </div>
        </div>
      </Card>

      {/* Section 2: Real-time Socket.IO Events */}
      <Card title="2. Real-Time Socket.IO Events">
        <div className="space-y-3 text-xs text-slate-300">
          <p>The dashboard connects via WebSocket and subscribes to website rooms (<code className="text-blue-400">website:{"{siteId}"}</code>). Events emitted by the server include:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono">
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
              <span className="text-emerald-400 font-bold">visitor:new</span>
              <p className="text-slate-400 font-sans text-[11px] mt-0.5">Emitted when a new visitor arrives.</p>
            </div>
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
              <span className="text-blue-400 font-bold">visitor:pageview</span>
              <p className="text-slate-400 font-sans text-[11px] mt-0.5">Emitted when a visitor navigates pages.</p>
            </div>
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
              <span className="text-amber-400 font-bold">visitor:idle</span>
              <p className="text-slate-400 font-sans text-[11px] mt-0.5">Emitted when a visitor becomes inactive for &gt; 45s.</p>
            </div>
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
              <span className="text-slate-400 font-bold">visitor:offline</span>
              <p className="text-slate-400 font-sans text-[11px] mt-0.5">Emitted on tab close or after 2m of inactivity.</p>
            </div>
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
              <span className="text-purple-400 font-bold">visitor:event</span>
              <p className="text-slate-400 font-sans text-[11px] mt-0.5">Emitted when a custom event is triggered.</p>
            </div>
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
              <span className="text-indigo-400 font-bold">analytics:update</span>
              <p className="text-slate-400 font-sans text-[11px] mt-0.5">Emitted with updated live visitor totals.</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Section 3: Privacy & Security */}
      <Card title="3. Privacy, Security & GDPR Compliance">
        <div className="space-y-2 text-xs text-slate-300">
          <ul className="list-disc list-inside space-y-1 text-slate-400">
            <li><strong>No Fingerprinting:</strong> LiveTrack does not use canvas, audio, or battery fingerprinting.</li>
            <li><strong>IP Anonymization:</strong> Automatically zeros the last octet of IPv4 addresses (`192.168.1.0`).</li>
            <li><strong>Do Not Track:</strong> Honors the browser's `navigator.doNotTrack` setting by default.</li>
            <li><strong>No Sensitive Form Data:</strong> Keystrokes, passwords, and payment inputs are never captured.</li>
            <li><strong>Automated Data Retention:</strong> Configurable data retention sweeps purge historical records automatically.</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
