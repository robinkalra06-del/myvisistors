/**
 * Geo-Location Resolution Service
 * Resolves IP to Country, City, Region, Lat/Long
 */

const LOCAL_IPS = ['127.0.0.1', '::1', 'localhost', '::ffff:127.0.0.1'];

// Country code to Country Name map
const COUNTRY_MAP = {
  US: 'United States',
  GB: 'United Kingdom',
  CA: 'Canada',
  DE: 'Germany',
  FR: 'France',
  IN: 'India',
  AU: 'Australia',
  JP: 'Japan',
  BR: 'Brazil',
  NL: 'Netherlands',
  SG: 'Singapore',
  SE: 'Sweden',
  ES: 'Spain',
  IT: 'Italy',
  CH: 'Switzerland',
  AE: 'United Arab Emirates'
};

export class GeoService {
  /**
   * Resolve location from request headers or IP
   * @param {import('express').Request} req
   * @param {string} ip
   * @returns {Object}
   */
  static resolveLocation(req, ip) {
    // 1. Check Reverse-Proxy Headers (Cloudflare, Render, AWS, Fastly)
    const cfCountry = req.headers['cf-ipcountry'];
    const cfCity = req.headers['cf-ipcity'];
    const cfRegion = req.headers['cf-region'];
    const cfLat = req.headers['cf-iplatitude'];
    const cfLong = req.headers['cf-iplongitude'];

    if (cfCountry && cfCountry !== 'XX' && cfCountry !== 'T1') {
      return {
        country: COUNTRY_MAP[cfCountry] || cfCountry,
        countryCode: cfCountry.toUpperCase(),
        city: cfCity ? decodeURIComponent(cfCity) : 'Unknown',
        region: cfRegion || '',
        latitude: cfLat ? parseFloat(cfLat) : null,
        longitude: cfLong ? parseFloat(cfLong) : null
      };
    }

    // 2. Handle Localhost / Development IP
    if (!ip || LOCAL_IPS.includes(ip) || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return {
        country: 'United States',
        countryCode: 'US',
        city: 'San Francisco',
        region: 'California',
        latitude: 37.7749,
        longitude: -122.4194
      };
    }

    // 3. Fallback to IP hash deterministic resolution if offline/free mode
    return this.fallbackGeoFromIp(ip);
  }

  /**
   * Deterministic simulated fallback for demo/offline IPs
   * @param {string} ip
   */
  static fallbackGeoFromIp(ip) {
    const countries = [
      { code: 'US', name: 'United States', city: 'New York', region: 'New York', lat: 40.7128, lon: -74.006 },
      { code: 'GB', name: 'United Kingdom', city: 'London', region: 'Greater London', lat: 51.5074, lon: -0.1278 },
      { code: 'DE', name: 'Germany', city: 'Berlin', region: 'Berlin', lat: 52.52, lon: 13.405 },
      { code: 'IN', name: 'India', city: 'Bengaluru', region: 'Karnataka', lat: 12.9716, lon: 77.5946 },
      { code: 'CA', name: 'Canada', city: 'Toronto', region: 'Ontario', lat: 43.6532, lon: -79.3832 },
      { code: 'JP', name: 'Japan', city: 'Tokyo', region: 'Tokyo', lat: 35.6762, lon: 139.6503 },
      { code: 'FR', name: 'France', city: 'Paris', region: 'Île-de-France', lat: 48.8566, lon: 2.3522 },
      { code: 'AU', name: 'Australia', city: 'Sydney', region: 'New South Wales', lat: -33.8688, lon: 151.2093 }
    ];

    let hash = 0;
    for (let i = 0; i < ip.length; i++) {
      hash = (hash << 5) - hash + ip.charCodeAt(i);
      hash |= 0;
    }
    const index = Math.abs(hash) % countries.length;
    const loc = countries[index];

    return {
      country: loc.name,
      countryCode: loc.code,
      city: loc.city,
      region: loc.region,
      latitude: loc.lat,
      longitude: loc.lon
    };
  }
}
