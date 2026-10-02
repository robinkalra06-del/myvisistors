/**
 * LiveTrack Traffic Simulator
 * Generates realistic concurrent visitors, pageviews, heartbeats, and custom events.
 * Perfect for observing live visitor monitoring on the dashboard.
 */

const API_BASE = process.env.API_URL || 'http://localhost:10000';
const SITE_ID = process.env.SITE_ID || 'site_demo_store_101';

const COUNTRIES = [
  { code: 'US', name: 'United States', city: 'San Francisco', ip: '198.51.100.12' },
  { code: 'GB', name: 'United Kingdom', city: 'London', ip: '198.51.100.25' },
  { code: 'DE', name: 'Germany', city: 'Berlin', ip: '198.51.100.44' },
  { code: 'IN', name: 'India', city: 'Bengaluru', ip: '198.51.100.58' },
  { code: 'JP', name: 'Japan', city: 'Tokyo', ip: '198.51.100.73' },
  { code: 'CA', name: 'Canada', city: 'Toronto', ip: '198.51.100.89' },
  { code: 'FR', name: 'France', city: 'Paris', ip: '198.51.100.104' },
  { code: 'AU', name: 'Australia', city: 'Sydney', ip: '198.51.100.119' }
];

const DEVICES = [
  { type: 'desktop', os: 'macOS', browser: 'Google Chrome', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
  { type: 'desktop', os: 'Windows 10/11', browser: 'Microsoft Edge', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0' },
  { type: 'mobile', os: 'iOS', browser: 'Apple Safari', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' },
  { type: 'mobile', os: 'Android', browser: 'Google Chrome', ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36' }
];

const PAGES = [
  { path: '/', title: 'Home - Online Store' },
  { path: '/products', title: 'Products Catalog - Online Store' },
  { path: '/pricing', title: 'Pricing & Plans - Online Store' },
  { path: '/features', title: 'Features & Architecture - Online Store' },
  { path: '/contact', title: 'Contact Support - Online Store' },
  { path: '/checkout', title: 'Secure Checkout - Online Store' }
];

const REFERRERS = [
  'https://www.google.com/search?q=best+analytics+tool',
  'https://github.com/trending',
  'https://news.ycombinator.com/',
  'https://twitter.com/LiveTrack/status/12345',
  'https://www.linkedin.com/feed/',
  'Direct'
];

async function postJson(endpoint, data, customHeaders = {}) {
  try {
    const res = await fetch(`${API_BASE}/api/track${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...customHeaders
      },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (err) {
    console.error(`[Sim] Request to ${endpoint} failed:`, err.message);
    return null;
  }
}

class SimulatedVisitor {
  constructor(index) {
    this.index = index;
    this.visitorId = 'vid_sim_' + Math.random().toString(36).substring(2, 10);
    this.sessionId = 'sid_sim_' + Math.random().toString(36).substring(2, 10);
    this.country = COUNTRIES[index % COUNTRIES.length];
    this.device = DEVICES[index % DEVICES.length];
    this.referrer = REFERRERS[index % REFERRERS.length];
    this.currentStep = 0;
    this.timer = null;
    this.active = false;
  }

  async start() {
    this.active = true;
    console.log(`\x1b[32m[+ Visitor ${this.index + 1}]\x1b[0m Arriving from ${this.country.name} (${this.country.city}) on ${this.device.browser} (${this.device.type})`);

    const headers = {
      'User-Agent': this.device.ua,
      'cf-ipcountry': this.country.code,
      'cf-ipcity': encodeURIComponent(this.country.city),
      'x-forwarded-for': this.country.ip
    };

    // 1. Initial Session
    await postJson('/session', {
      websiteId: SITE_ID,
      visitorId: this.visitorId,
      sessionId: this.sessionId,
      referrer: this.referrer,
      landingPage: PAGES[0].path,
      currentPage: PAGES[0].path,
      pageTitle: PAGES[0].title,
      screenResolution: this.device.type === 'desktop' ? '1920x1080' : '390x844',
      language: 'en-US'
    }, headers);

    // 2. Initial Pageview
    await postJson('/pageview', {
      websiteId: SITE_ID,
      visitorId: this.visitorId,
      sessionId: this.sessionId,
      url: `https://demo.mystore.com${PAGES[0].path}`,
      path: PAGES[0].path,
      title: PAGES[0].title,
      referrer: this.referrer
    }, headers);

    // Schedule navigation and heartbeats
    this.scheduleNextAction(headers);
  }

  scheduleNextAction(headers) {
    if (!this.active) return;

    const delay = 4000 + Math.random() * 6000; // 4 to 10s
    this.timer = setTimeout(async () => {
      this.currentStep++;

      if (this.currentStep < PAGES.length) {
        const page = PAGES[this.currentStep];
        console.log(`\x1b[36m[Visitor ${this.index + 1} Page]\x1b[0m Navigated to ${page.path} ("${page.title}")`);

        // Send pageview
        await postJson('/pageview', {
          websiteId: SITE_ID,
          visitorId: this.visitorId,
          sessionId: this.sessionId,
          url: `https://demo.mystore.com${page.path}`,
          path: page.path,
          title: page.title,
          referrer: `https://demo.mystore.com${PAGES[this.currentStep - 1].path}`
        }, headers);

        // Randomly trigger custom event
        if (Math.random() > 0.5) {
          const events = [
            { name: 'button_click', props: { button_name: 'View Pricing Details' } },
            { name: 'newsletter_signup', props: { plan: 'Free', source: 'modal' } },
            { name: 'cart_added', props: { item_id: 'prod_99', price: 49.99, currency: 'USD' } }
          ];
          const evt = events[Math.floor(Math.random() * events.length)];
          console.log(`\x1b[35m[Visitor ${this.index + 1} Event]\x1b[0m Triggered event: ${evt.name}`);
          await postJson('/event', {
            websiteId: SITE_ID,
            visitorId: this.visitorId,
            sessionId: this.sessionId,
            eventName: evt.name,
            properties: evt.props
          }, headers);
        }

        this.scheduleNextAction(headers);
      } else {
        // Leave website
        console.log(`\x1b[31m[- Visitor ${this.index + 1}]\x1b[0m Leaving website from ${this.country.city}`);
        await postJson('/session-end', {
          websiteId: SITE_ID,
          visitorId: this.visitorId,
          sessionId: this.sessionId,
          exitPage: PAGES[PAGES.length - 1].path
        }, headers);
        this.active = false;

        // Restart simulation loop for new visitor after delay
        setTimeout(() => this.start(), 5000 + Math.random() * 5000);
      }
    }, delay);
  }

  stop() {
    this.active = false;
    if (this.timer) clearTimeout(this.timer);
  }
}

async function main() {
  console.log(`=======================================================`);
  console.log(`  LiveTrack Traffic Simulator Starting`);
  console.log(`  Target API: ${API_BASE}`);
  console.log(`  Target Website ID: ${SITE_ID}`);
  console.log(`  Spawning 5 concurrent live visitors...`);
  console.log(`=======================================================\n`);

  const visitors = [];
  for (let i = 0; i < 5; i++) {
    const v = new SimulatedVisitor(i);
    visitors.push(v);
    setTimeout(() => v.start(), i * 2000);
  }

  process.on('SIGINT', () => {
    console.log('\nStopping simulation...');
    visitors.forEach(v => v.stop());
    process.exit(0);
  });
}

main();
