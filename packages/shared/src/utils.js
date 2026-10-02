/**
 * Shared Utilities for LiveTrack
 */

/**
 * Anonymize IP address by masking the last octet (IPv4) or last 80 bits (IPv6)
 * Respects privacy and GDPR requirements.
 * @param {string} ip
 * @returns {string}
 */
export function anonymizeIp(ip) {
  if (!ip) return '0.0.0.0';
  // Check IPv4
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
  }
  // Check IPv6
  if (ip.includes(':')) {
    const parts = ip.split(':');
    return `${parts.slice(0, 3).join(':')}::`;
  }
  return ip;
}

/**
 * Format milliseconds into human-readable duration (e.g., 2m 14s)
 * @param {number} ms
 * @returns {string}
 */
export function formatDuration(ms) {
  if (!ms || ms < 1000) return '< 1s';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMins = minutes % 60;
    return `${hours}h ${remainingMins}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Clean and normalize URL (remove hashes, sensitive query params like token, password, etc.)
 * @param {string} rawUrl
 * @returns {string}
 */
export function sanitizeUrl(rawUrl) {
  if (!rawUrl) return '/';
  try {
    const parsed = new URL(rawUrl, 'https://example.com');
    const sensitiveParams = ['password', 'pwd', 'token', 'key', 'secret', 'auth', 'cvv', 'card'];
    sensitiveParams.forEach(param => {
      if (parsed.searchParams.has(param)) {
        parsed.searchParams.set(param, '[REDACTED]');
      }
    });
    // Return relative or pathname + sanitized search
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      return parsed.toString();
    }
    return parsed.pathname + (parsed.search ? parsed.search : '');
  } catch {
    return rawUrl.substring(0, 500);
  }
}

/**
 * Parse referrer domain safely
 * @param {string} referrer
 * @returns {string}
 */
export function parseReferrerDomain(referrer) {
  if (!referrer || referrer === 'direct' || referrer === 'Direct') return 'Direct';
  try {
    const parsed = new URL(referrer);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return referrer.substring(0, 100);
  }
}

/**
 * Classify referral traffic into channels
 * @param {string} referrer
 * @param {string} url
 * @returns {'Direct' | 'Organic Search' | 'Social' | 'Referral' | 'Campaign'}
 */
export function classifyTrafficChannel(referrer, url = '') {
  if (url && (url.includes('utm_source') || url.includes('utm_medium') || url.includes('utm_campaign'))) {
    return 'Campaign';
  }
  if (!referrer || referrer === 'direct' || referrer === 'Direct' || referrer.trim() === '') {
    return 'Direct';
  }

  const domain = parseReferrerDomain(referrer).toLowerCase();

  const searchEngines = ['google.', 'bing.', 'yahoo.', 'duckduckgo.', 'baidu.', 'yandex.', 'ecosia.'];
  if (searchEngines.some(se => domain.includes(se))) {
    return 'Organic Search';
  }

  const socialNetworks = ['facebook.', 'twitter.', 't.co', 'x.com', 'instagram.', 'linkedin.', 'reddit.', 'youtube.', 'tiktok.', 'pinterest.'];
  if (socialNetworks.some(sn => domain.includes(sn))) {
    return 'Social';
  }

  return 'Referral';
}
