/**
 * Shared Type Signatures & JSDoc Declarations
 */

/**
 * @typedef {Object} LiveVisitorRecord
 * @property {string} id - Visitor UUID
 * @property {string} sessionId - Active session UUID
 * @property {string} websiteId - Monitored website ID
 * @property {'online' | 'idle' | 'offline'} status - Current status
 * @property {string} ip - Masked or permitted IP address
 * @property {string} country - Country name
 * @property {string} countryCode - ISO 2-letter country code
 * @property {string} city - City name
 * @property {string} region - Region/State name
 * @property {string} browser - Browser name
 * @property {string} browserVersion - Browser version
 * @property {string} os - Operating system
 * @property {string} deviceType - desktop, mobile, tablet
 * @property {string} screenResolution - e.g. 1920x1080
 * @property {string} language - e.g. en-US
 * @property {string} timezone - e.g. America/New_York
 * @property {string} currentPage - Current pathname or URL
 * @property {string} pageTitle - Document title
 * @property {string} landingPage - Initial landing path
 * @property {string} exitPage - Last known path
 * @property {string} referrer - Raw or parsed referrer
 * @property {string} channel - Direct, Search, Social, Referral
 * @property {boolean} isReturning - Whether visitor has previous sessions
 * @property {number} totalSessions - Historical session count
 * @property {number} pageViews - Total page views in this session
 * @property {string} firstSeenAt - UTC ISO timestamp
 * @property {string} lastActivityAt - UTC ISO timestamp
 * @property {number} sessionDurationMs - Real-time session duration
 */

export const DefaultVisitorRecord = {};
