import React from 'react';
import { ExternalLink } from 'lucide-react';

export function TopPagesTable({ pages = [] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-900/60 text-slate-400 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-800">
          <tr>
            <th className="py-2.5 px-3">Page Path</th>
            <th className="py-2.5 px-3">Title</th>
            <th className="py-2.5 px-3 text-right">Views</th>
            <th className="py-2.5 px-3 text-right">Share</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {pages.length === 0 ? (
            <tr>
              <td colSpan="4" className="py-8 text-center text-slate-500">
                No page views recorded yet.
              </td>
            </tr>
          ) : (
            pages.slice(0, 8).map((p, i) => (
              <tr key={i} className="hover:bg-slate-800/40 transition">
                <td className="py-2.5 px-3 font-mono text-blue-400 flex items-center gap-1.5 truncate max-w-[200px]">
                  <span className="truncate">{p.path}</span>
                </td>
                <td className="py-2.5 px-3 text-slate-300 truncate max-w-[180px]">
                  {p.title || 'Untitled'}
                </td>
                <td className="py-2.5 px-3 text-right font-semibold text-slate-200">
                  {p.views}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                  {p.percentage}%
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
