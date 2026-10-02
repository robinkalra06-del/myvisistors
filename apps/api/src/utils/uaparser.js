/**
 * Lightweight, zero-dependency User-Agent & Device Parser
 */

export function parseUserAgent(uaString = '') {
  const ua = uaString.toLowerCase();

  // 1. Detect Bots
  if (
    ua.includes('bot') ||
    ua.includes('crawler') ||
    ua.includes('spider') ||
    ua.includes('googlebot') ||
    ua.includes('bingbot') ||
    ua.includes('slurp') ||
    ua.includes('duckduckbot') ||
    ua.includes('baiduspider') ||
    ua.includes('yandexbot')
  ) {
    return {
      deviceType: 'bot',
      browser: 'Bot / Crawler',
      browserVersion: '1.0',
      os: 'Search Engine Bot'
    };
  }

  // 2. Detect Device Type
  let deviceType = 'desktop';
  if (ua.includes('tablet') || ua.includes('ipad') || (ua.includes('android') && !ua.includes('mobile'))) {
    deviceType = 'tablet';
  } else if (
    ua.includes('mobile') ||
    ua.includes('iphone') ||
    ua.includes('ipod') ||
    ua.includes('android') ||
    ua.includes('blackberry') ||
    ua.includes('windows phone')
  ) {
    deviceType = 'mobile';
  }

  // 3. Detect Operating System
  let os = 'Unknown';
  if (ua.includes('macintosh') || ua.includes('mac os x')) {
    os = 'macOS';
  } else if (ua.includes('windows nt 10.0')) {
    os = 'Windows 10/11';
  } else if (ua.includes('windows nt 6.3')) {
    os = 'Windows 8.1';
  } else if (ua.includes('windows nt 6.1')) {
    os = 'Windows 7';
  } else if (ua.includes('windows')) {
    os = 'Windows';
  } else if (ua.includes('android')) {
    os = 'Android';
  } else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
    os = 'iOS';
  } else if (ua.includes('linux')) {
    os = 'Linux';
  } else if (ua.includes('cros')) {
    os = 'ChromeOS';
  }

  // 4. Detect Browser & Major Version
  let browser = 'Unknown';
  let browserVersion = '';

  if (ua.includes('edg/')) {
    browser = 'Microsoft Edge';
    const match = uaString.match(/Edg\/([\d.]+)/);
    browserVersion = match ? match[1] : '';
  } else if (ua.includes('opr/') || ua.includes('opera/')) {
    browser = 'Opera';
    const match = uaString.match(/(?:OPR|Opera)\/([\d.]+)/);
    browserVersion = match ? match[1] : '';
  } else if (ua.includes('chrome/') || ua.includes('crios/')) {
    browser = 'Google Chrome';
    const match = uaString.match(/(?:Chrome|CriOS)\/([\d.]+)/);
    browserVersion = match ? match[1] : '';
  } else if (ua.includes('firefox/') || ua.includes('fxios/')) {
    browser = 'Mozilla Firefox';
    const match = uaString.match(/(?:Firefox|FxiOS)\/([\d.]+)/);
    browserVersion = match ? match[1] : '';
  } else if (ua.includes('safari/') && !ua.includes('chrome')) {
    browser = 'Apple Safari';
    const match = uaString.match(/Version\/([\d.]+)/);
    browserVersion = match ? match[1] : '';
  } else if (ua.includes('msie') || ua.includes('trident/')) {
    browser = 'Internet Explorer';
    browserVersion = '11.0';
  }

  return {
    deviceType,
    browser,
    browserVersion,
    os
  };
}
