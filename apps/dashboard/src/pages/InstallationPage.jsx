import React, { useState } from 'react';
import { useWebsite } from '../context/WebsiteContext.jsx';
import { websiteService } from '../services/website.service.js';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import {
  Code2,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  HelpCircle,
  Play
} from 'lucide-react';

export function InstallationPage() {
  const { currentWebsite } = useWebsite();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('html'); // html | react | wordpress | php | laravel
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);

  if (!currentWebsite) {
    return (
      <div className="py-24 text-center text-slate-400">
        Please register or select a website to view tracking code installation.
      </div>
    );
  }

  const trackerApiUrl = window.location.origin;
  const siteId = currentWebsite.publicId;

  const htmlSnippet = `<!-- LiveTrack Real-Time Analytics -->
<script>
  window.LiveTrackConfig = {
    siteId: "${siteId}"
  };
</script>
<script async src="${trackerApiUrl}/tracker.js"></script>`;

  const reactSnippet = `// In your React / Next.js index.html or App root component:
import { useEffect } from 'react';

export default function App() {
  useEffect(() => {
    window.LiveTrackConfig = {
      siteId: "${siteId}"
    };
    const script = document.createElement('script');
    script.src = '${trackerApiUrl}/tracker.js';
    script.async = true;
    document.head.appendChild(script);
  }, []);

  return <YourComponents />;
}`;

  const wordpressSnippet = `// Add to your active WordPress theme's functions.php file:
function add_livetrack_analytics() {
    ?>
    <script>
      window.LiveTrackConfig = { siteId: "${siteId}" };
    </script>
    <script async src="${trackerApiUrl}/tracker.js"></script>
    <?php
}
add_action('wp_head', 'add_livetrack_analytics');`;

  const phpSnippet = `<!-- Paste right before </head> in your header.php or master layout -->
<script>
  window.LiveTrackConfig = {
    siteId: "<?php echo '${siteId}'; ?>"
  };
</script>
<script async src="${trackerApiUrl}/tracker.js"></script>`;

  const laravelSnippet = `{{-- In resources/views/layouts/app.blade.php before </head> --}}
<script>
  window.LiveTrackConfig = {
    siteId: "{{ config('services.livetrack.site_id', '${siteId}') }}"
  };
</script>
<script async src="${trackerApiUrl}/tracker.js"></script>`;

  const snippets = {
    html: htmlSnippet,
    react: reactSnippet,
    wordpress: wordpressSnippet,
    php: phpSnippet,
    laravel: laravelSnippet
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(snippets[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = async () => {
    try {
      setVerifying(true);
      const res = await websiteService.verifyInstallation(currentWebsite.id);
      setVerifyResult(res);
    } catch (err) {
      alert('Verification failed: ' + err.message);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="pb-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Code2 className="w-5 h-5 text-blue-400" />
            Tracking Script Installation
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Install this asynchronous snippet on <strong className="text-slate-200">{currentWebsite.name}</strong> to begin real-time tracking.
          </p>
        </div>

        {/* Verification Status Banner */}
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={handleVerify} isLoading={verifying}>
            <CheckCircle2 className="w-4 h-4 mr-1.5 text-blue-400" />
            Verify Installation
          </Button>

          <a href="/test-site.html" target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline">
              <Play className="w-3.5 h-3.5 mr-1 text-emerald-400" />
              Launch Test Visitor
            </Button>
          </a>
        </div>
      </div>

      {/* Verify result toast */}
      {verifyResult && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-xs animate-fade-in
            ${
              verifyResult.isInstalled
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                : 'bg-amber-950/40 border-amber-800 text-amber-300'
            }
          `}
        >
          {verifyResult.isInstalled ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
          )}
          <div>
            <div className="font-bold text-sm">
              {verifyResult.isInstalled ? 'Tracking Script Verified!' : 'No Traffic Detected Yet'}
            </div>
            <div>
              {verifyResult.isInstalled
                ? `Last tracked ping received at ${new Date(verifyResult.lastPingAt).toLocaleString()}.`
                : 'Make sure you have installed the snippet on your site and loaded the page in your browser.'}
            </div>
          </div>
        </div>
      )}

      {/* Code Snippet Box */}
      <Card
        title="Installation Snippet"
        subtitle="Choose your framework or platform"
        action={
          <Button size="sm" variant="secondary" onClick={handleCopy}>
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
            {copied ? 'Copied!' : 'Copy Code'}
          </Button>
        }
      >
        {/* Framework Tabs */}
        <div className="flex gap-2 border-b border-slate-800 pb-3 mb-4 overflow-x-auto">
          {[
            { id: 'html', label: 'HTML / Static' },
            { id: 'react', label: 'React / Next.js' },
            { id: 'wordpress', label: 'WordPress' },
            { id: 'php', label: 'PHP' },
            { id: 'laravel', label: 'Laravel' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0
                ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Snippet Display */}
        <div className="relative rounded-lg bg-[#070b14] border border-slate-800/80 p-4 font-mono text-xs text-blue-200 overflow-x-auto">
          <pre>{snippets[activeTab]}</pre>
        </div>
      </Card>

      {/* Feature & Privacy Guarantees */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <div className="font-bold text-white mb-1 flex items-center gap-1.5">
            <span className="text-blue-400">⚡</span> Ultra Lightweight
          </div>
          <p className="text-slate-400">
            Less than 3KB gzipped. Asynchronous loading ensures zero impact on your website performance or Google Core Web Vitals.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <div className="font-bold text-white mb-1 flex items-center gap-1.5">
            <span className="text-emerald-400">🛡️</span> Privacy-First & GDPR Safe
          </div>
          <p className="text-slate-400">
            Zero invasive device fingerprinting, automatic IP anonymization, respects Do Not Track (DNT) flags, and never records form inputs or passwords.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <div className="font-bold text-white mb-1 flex items-center gap-1.5">
            <span className="text-purple-400">🔄</span> Single-Page App (SPA) Ready
          </div>
          <p className="text-slate-400">
            Automatically intercepts History API (`pushState`, `replaceState`, `popstate`) for React, Vue, Angular, Next.js, and Nuxt routes without extra configuration.
          </p>
        </div>
      </div>

      {/* Troubleshooting Guide */}
      <Card title="Troubleshooting Guide">
        <div className="space-y-3 text-xs text-slate-300">
          <div>
            <h5 className="font-semibold text-white">1. Script not tracking?</h5>
            <p className="text-slate-400 mt-0.5">
              Check your browser's Developer Tools Console (`F12`) to verify that `tracker.js` is loaded with status `200`. Check whether ad-blockers are blocking your local domain.
            </p>
          </div>
          <div>
            <h5 className="font-semibold text-white">2. Testing locally?</h5>
            <p className="text-slate-400 mt-0.5">
              Launch our pre-configured local test page using the "Launch Test Visitor" button above. It comes with `tracker.js` pre-installed.
            </p>
          </div>
          <div>
            <h5 className="font-semibold text-white">3. Allowed Origins configuration</h5>
            <p className="text-slate-400 mt-0.5">
              If you specified allowed origins in website settings, make sure the domain you are testing from matches the configured origin list.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
