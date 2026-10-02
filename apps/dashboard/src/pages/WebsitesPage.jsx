import React, { useState } from 'react';
import { useWebsite } from '../context/WebsiteContext.jsx';
import { websiteService } from '../services/website.service.js';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import {
  Globe,
  Plus,
  Key,
  Trash2,
  PauseCircle,
  PlayCircle,
  Code2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function WebsitesPage() {
  const { websites, fetchWebsites, selectWebsite } = useWebsite();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [targetSite, setTargetSite] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [allowedOrigins, setAllowedOrigins] = useState('*');
  const [retentionDays, setRetentionDays] = useState('90');
  const [anonymizeIp, setAnonymizeIp] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    if (!name || !domain) {
      setError('Please provide a website name and domain.');
      return;
    }

    try {
      setSubmitting(true);
      await websiteService.createWebsite({
        name,
        domain,
        allowedOrigins,
        retentionDays: parseInt(retentionDays, 10),
        anonymizeIp
      });
      await fetchWebsites();
      setIsAddModalOpen(false);
      setName('');
      setDomain('');
    } catch (err) {
      setError(err.message || 'Failed to create website');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleTracking = async (site) => {
    try {
      await websiteService.updateWebsite(site.id, {
        isTrackingActive: !site.isTrackingActive
      });
      await fetchWebsites();
    } catch (err) {
      alert('Failed to update tracking state: ' + err.message);
    }
  };

  const handleRegenerateKey = async (site) => {
    if (!confirm(`Are you sure you want to regenerate the tracking key for ${site.name}? Old keys will be revoked.`)) return;
    try {
      const res = await websiteService.regenerateKey(site.id);
      alert(`New tracking key generated: ${res.key}`);
      await fetchWebsites();
    } catch (err) {
      alert('Failed to regenerate key: ' + err.message);
    }
  };

  const handleDelete = async () => {
    if (!targetSite) return;
    try {
      await websiteService.deleteWebsite(targetSite.id);
      await fetchWebsites();
      setIsDeleteModalOpen(false);
      setTargetSite(null);
    } catch (err) {
      alert('Failed to delete website: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-400" />
            Monitored Websites
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Register and manage the websites you monitor with LiveTrack.
          </p>
        </div>

        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add New Website
        </Button>
      </div>

      {/* Website Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {websites.map((site) => (
          <Card key={site.id} className="relative group">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400 shrink-0">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    {site.name}
                    <Badge variant={site.isTrackingActive ? 'online' : 'offline'} size="sm">
                      {site.isTrackingActive ? 'Tracking Active' : 'Paused'}
                    </Badge>
                  </h3>
                  <a
                    href={`http://${site.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-400 hover:text-blue-400 flex items-center gap-1 mt-0.5"
                  >
                    <span>{site.domain}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Status pill */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                <span className="font-bold text-slate-200">{site.activeVisitors || 0}</span>
                <span className="text-slate-500">live</span>
              </div>
            </div>

            {/* Public Site ID & Settings info */}
            <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs text-slate-400">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">Site ID</span>
                <span className="font-mono text-slate-200">{site.publicId}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">Data Retention</span>
                <span className="text-slate-200">{site.retentionDays || 90} Days</span>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Link to="/installation">
                  <Button size="sm" variant="secondary">
                    <Code2 className="w-3.5 h-3.5 mr-1" />
                    Setup Script
                  </Button>
                </Link>
                <button
                  onClick={() => handleToggleTracking(site)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  title={site.isTrackingActive ? 'Pause Tracking' : 'Resume Tracking'}
                >
                  {site.isTrackingActive ? <PauseCircle className="w-4 h-4 text-amber-400" /> : <PlayCircle className="w-4 h-4 text-emerald-400" />}
                </button>
                <button
                  onClick={() => handleRegenerateKey(site)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  title="Regenerate Tracking Secret Key"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => {
                  setTargetSite(site);
                  setIsDeleteModalOpen(true);
                }}
                className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 transition"
                title="Delete Website"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Website Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Register New Website">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-950/50 border border-red-800/60 rounded-lg text-xs text-red-300">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Website Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My Online Store"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Domain Name
            </label>
            <input
              type="text"
              required
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="e.g. store.mydomain.com"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">Do not include https:// or trailing slashes.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Allowed Origins
              </label>
              <input
                type="text"
                value={allowedOrigins}
                onChange={(e) => setAllowedOrigins(e.target.value)}
                placeholder="* or comma-separated domains"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Data Retention (Days)
              </label>
              <select
                value={retentionDays}
                onChange={(e) => setRetentionDays(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="30">30 Days</option>
                <option value="60">60 Days</option>
                <option value="90">90 Days (Recommended)</option>
                <option value="180">180 Days</option>
                <option value="365">365 Days (1 Year)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="anonymizeIp"
              checked={anonymizeIp}
              onChange={(e) => setAnonymizeIp(e.target.checked)}
              className="h-4 w-4 rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="anonymizeIp" className="text-xs text-slate-300">
              Anonymize IP addresses (masks last octet for GDPR compliance)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Register Website
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Website">
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Are you sure you want to delete <strong className="text-white">{targetSite?.name}</strong>?
            This will permanently remove all tracked visitors, sessions, pageviews, and custom events for this site.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete Website
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
