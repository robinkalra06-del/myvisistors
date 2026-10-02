/**
 * LiveTrack Dashboard API Client
 */

/**
 * Resolves the backend API base URL with protocol handling and environment fallback
 */
export function getApiBase() {
  let base = (import.meta.env.VITE_API_URL || '').trim();

  // If not explicitly set at build time, detect dynamically from browser location
  if (!base && typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:4000';
    }
    // Auto-detect Render deployment: livetrack-dashboard -> livetrack-api
    if (host.includes('onrender.com')) {
      const apiHost = host.replace('livetrack-dashboard', 'livetrack-api');
      return `https://${apiHost}`;
    }
    return '';
  }

  // Ensure protocol is present (Render Blueprint property: host does not include https://)
  if (base && !base.startsWith('http://') && !base.startsWith('https://')) {
    base = `https://${base}`;
  }

  return base.replace(/\/+$/, '');
}

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('livetrack_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const apiBase = getApiBase();
  const url = `${apiBase}/api${endpoint}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers
    });

    if (res.status === 401) {
      // Clear token if invalid
      localStorage.removeItem('livetrack_token');
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
    }

    // Handle CSV or text exports
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/csv')) {
      return await res.text();
    }

    // Safely read response text first to prevent "Unexpected end of JSON input"
    const rawText = await res.text();
    let data = null;

    if (rawText && rawText.trim().length > 0) {
      try {
        data = JSON.parse(rawText);
      } catch (jsonErr) {
        // Response was not JSON (e.g. HTML 502/503 from gateway during cold boot)
        if (!res.ok) {
          if (res.status === 502 || res.status === 503) {
            throw new Error('API server is waking up (Render free tier spin-up). Please wait ~20 seconds and click Sign In again.');
          }
          throw new Error(`Server returned HTTP ${res.status}: ${res.statusText || 'Unexpected error'}`);
        }
        data = { message: rawText };
      }
    }

    if (!res.ok) {
      const errMsg =
        data?.error?.message ||
        data?.message ||
        data?.error ||
        (res.status === 404
          ? `API route not found: ${endpoint}`
          : res.status === 502 || res.status === 503
          ? 'API server is waking up. Please wait ~20 seconds and try again.'
          : `Request failed with status ${res.status}`);
      throw new Error(errMsg);
    }

    return data || {};
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Unable to reach the LiveTrack API. If the server is on Render free tier, it may take 20-40 seconds to wake up. Please retry.');
    }
    throw err;
  }
}

export const api = {
  get: (endpoint, options) => apiRequest(endpoint, { method: 'GET', ...options }),
  post: (endpoint, body, options) => apiRequest(endpoint, { method: 'POST', body: JSON.stringify(body), ...options }),
  patch: (endpoint, body, options) => apiRequest(endpoint, { method: 'PATCH', body: JSON.stringify(body), ...options }),
  delete: (endpoint, options) => apiRequest(endpoint, { method: 'DELETE', ...options })
};
