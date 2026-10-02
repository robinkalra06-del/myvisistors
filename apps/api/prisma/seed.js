import { db } from '../src/config/database.js';
import { hashPassword } from '../src/utils/crypto.js';
import { logger } from '../src/utils/logger.js';

async function seed() {
  logger.info('Starting LiveTrack database seeding...');
  await db.init();

  // 1. Create Default Admin User
  const adminEmail = 'admin@livetrack.io';
  let admin = await db.user.findUnique({ where: { email: adminEmail } });

  if (!admin) {
    const passwordHash = await hashPassword('Password123!');
    admin = await db.user.create({
      data: {
        id: 'usr_admin_master',
        email: adminEmail,
        passwordHash,
        name: 'Master Admin',
        role: 'SUPER_ADMIN',
        isEmailVerified: true
      }
    });
    logger.info('Created master admin user: ' + adminEmail);
  }

  // 2. Create Organization
  let org = await db.organization.findFirst({ where: { ownerId: admin.id } });
  if (!org) {
    org = await db.organization.create({
      data: {
        id: 'org_acme_corp',
        name: 'Acme Global Ventures',
        slug: 'acme-global',
        ownerId: admin.id
      }
    });
    await db.organizationMember.create({
      data: {
        organizationId: org.id,
        userId: admin.id,
        role: 'OWNER'
      }
    });
    logger.info('Created organization: Acme Global Ventures');
  }

  // 3. Create Sample Websites
  const demoSiteId = 'site_demo_store_101';
  let demoSite = await db.website.findFirst({
    where: {
      OR: [
        { id: demoSiteId },
        { publicId: demoSiteId }
      ]
    }
  });

  // If demoSite exists with mismatched ID (e.g. 'web_store_101' from earlier run), clean it up
  if (demoSite && demoSite.id !== demoSiteId) {
    logger.info(`Detected existing demo site with legacy ID '${demoSite.id}'. Recreating with '${demoSiteId}'...`);
    try {
      await db.trackingKey.deleteMany({ where: { websiteId: demoSite.id } });
      await db.visitorEvent.deleteMany({ where: { websiteId: demoSite.id } });
      await db.pageView.deleteMany({ where: { websiteId: demoSite.id } });
      await db.visitorSession.deleteMany({ where: { websiteId: demoSite.id } });
      await db.visitor.deleteMany({ where: { websiteId: demoSite.id } });
      await db.website.delete({ where: { id: demoSite.id } });
    } catch (e) {
      logger.warn('Cleanup warning: ' + e.message);
    }
    demoSite = null;
  }

  if (!demoSite) {
    demoSite = await db.website.create({
      data: {
        id: demoSiteId,
        publicId: demoSiteId,
        organizationId: org.id,
        name: 'Acme E-Commerce Store',
        domain: 'store.acme.com',
        allowedOrigins: '*',
        isTrackingActive: true,
        anonymizeIp: true,
        retentionDays: 90,
        installedAt: new Date().toISOString(),
        lastPingAt: new Date().toISOString()
      }
    });

    await db.trackingKey.create({
      data: {
        websiteId: demoSite.id,
        key: 'tk_live_demostore101key',
        name: 'Production Store Key'
      }
    });
    logger.info(`Created demo website: ${demoSite.name} (${demoSite.id})`);
  }

  // 4. Create Seed Historical Visitors & Sessions
  const mockVisitors = [
    { country: 'United States', countryCode: 'US', city: 'San Francisco', browser: 'Google Chrome', os: 'macOS', device: 'desktop' },
    { country: 'United Kingdom', countryCode: 'GB', city: 'London', browser: 'Apple Safari', os: 'macOS', device: 'desktop' },
    { country: 'Germany', countryCode: 'DE', city: 'Berlin', browser: 'Mozilla Firefox', os: 'Linux', device: 'desktop' },
    { country: 'India', countryCode: 'IN', city: 'Bengaluru', browser: 'Google Chrome', os: 'Android', device: 'mobile' },
    { country: 'Japan', countryCode: 'JP', city: 'Tokyo', browser: 'Apple Safari', os: 'iOS', device: 'mobile' },
    { country: 'Canada', countryCode: 'CA', city: 'Toronto', browser: 'Microsoft Edge', os: 'Windows 10/11', device: 'desktop' }
  ];

  const now = Date.now();
  for (let i = 0; i < mockVisitors.length; i++) {
    const item = mockVisitors[i];
    const vid = `vid_seed_${i + 1}`;
    const sid = `sid_seed_${i + 1}`;
    const timestamp = new Date(now - (i * 3600000 * 4)).toISOString();

    let visitor = await db.visitor.findFirst({
      where: { anonymousId: vid, websiteId: demoSite.id }
    });

    if (!visitor) {
      visitor = await db.visitor.create({
        data: {
          anonymousId: vid,
          websiteId: demoSite.id,
          firstSeenAt: timestamp,
          lastSeenAt: timestamp,
          totalSessions: i % 2 === 0 ? 3 : 1,
          isReturning: i % 2 === 0,
          lastIp: `198.51.100.${10 + i}`,
          country: item.country,
          countryCode: item.countryCode,
          city: item.city,
          region: 'Capital Region',
          deviceType: item.device,
          browser: item.browser,
          os: item.os,
          language: 'en'
        }
      });
    }

    let session = await db.visitorSession.findFirst({
      where: { sessionToken: sid, websiteId: demoSite.id }
    });

    if (!session) {
      session = await db.visitorSession.create({
        data: {
          sessionToken: sid,
          visitorId: visitor.id,
          websiteId: demoSite.id,
          status: i === 0 ? 'ONLINE' : 'OFFLINE',
          startedAt: timestamp,
          lastActivityAt: timestamp,
          durationSeconds: 180 + i * 45,
          pageViewCount: 2 + (i % 3),
          landingPage: '/',
          exitPage: i % 2 === 0 ? '/pricing' : '/products',
          referrer: i % 2 === 0 ? 'https://google.com' : 'Direct',
          channel: i % 2 === 0 ? 'Organic Search' : 'Direct',
          country: item.country,
          countryCode: item.countryCode,
          city: item.city,
          browser: item.browser,
          os: item.os,
          deviceType: item.device
        }
      });

      // Create pageviews
      await db.pageView.create({
        data: {
          websiteId: demoSite.id,
          sessionId: session.id,
          visitorId: visitor.id,
          url: 'https://store.acme.com/',
          path: '/',
          title: 'Home Page',
          referrer: session.referrer,
          durationSeconds: 60,
          timestamp
        }
      });

      await db.pageView.create({
        data: {
          websiteId: demoSite.id,
          sessionId: session.id,
          visitorId: visitor.id,
          url: 'https://store.acme.com/pricing',
          path: '/pricing',
          title: 'Pricing Plans',
          referrer: 'https://store.acme.com/',
          durationSeconds: 120,
          timestamp: new Date(new Date(timestamp).getTime() + 60000).toISOString()
        }
      });

      // Create event
      if (i % 2 === 0) {
        await db.visitorEvent.create({
          data: {
            websiteId: demoSite.id,
            sessionId: session.id,
            visitorId: visitor.id,
            eventName: 'pricing_view',
            properties: JSON.stringify({ plan: 'Pro', currency: 'USD' }),
            timestamp: new Date(new Date(timestamp).getTime() + 90000).toISOString()
          }
        });
      }
    }
  }

  // 5. Create Sample Notification (idempotent)
  const existingNotification = await db.notification.findFirst({
    where: { userId: admin.id, type: 'TRAFFIC_SPIKE' }
  });

  if (!existingNotification) {
    await db.notification.create({
      data: {
        userId: admin.id,
        websiteId: demoSite.id,
        type: 'TRAFFIC_SPIKE',
        title: 'Traffic Surge Detected',
        message: 'Your website store.acme.com received a 45% increase in live visitors today.',
        data: JSON.stringify({ increasePercentage: 45 })
      }
    });
  }

  logger.info('Database seeding completed successfully!');
}

seed().catch(err => {
  logger.error('Seeding error: ' + err.message);
  process.exit(1);
});
