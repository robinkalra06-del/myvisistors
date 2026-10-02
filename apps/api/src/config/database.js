import { config } from './index.js';
import { logger } from '../utils/logger.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbClient = null;

// Determine if we should attempt Prisma or use the built-in SQLite/Memory engine
const isPostgresUrl = config.databaseUrl && (
  config.databaseUrl.startsWith('postgresql://') || 
  config.databaseUrl.startsWith('postgres://')
);

import { DatabaseSync } from 'node:sqlite';

// We will implement an asynchronous/synchronous unified DB proxy
class DatabaseProxy {
  constructor() {
    this.isPrisma = false;
    this.client = null;
    this.sqliteDb = null;
  }

  async init() {
    // Try Prisma Client first if in PostgreSQL mode
    if (isPostgresUrl && config.isProduction) {
      try {
        const { PrismaClient } = await import('@prisma/client');
        this.client = new PrismaClient();
        await this.client.$connect();
        this.isPrisma = true;
        logger.info('Connected to PostgreSQL via Prisma Client');
        return;
      } catch (err) {
        logger.warn('Prisma Client not available or failed to connect, falling back to local storage engine:', err.message);
      }
    }

    // Fallback: Built-in SQLite database
    try {
      const { DatabaseSync } = await import('node:sqlite');
      const dbPath = path.resolve(__dirname, '../../dev.db');
      this.sqliteDb = new DatabaseSync(dbPath);
      this.initSqliteTables();
      logger.info(`Initialized local database storage at: ${dbPath}`);
    } catch (err) {
      logger.warn('Failed to load node:sqlite, using memory fallback:', err.message);
      this.initMemoryFallback();
    }
  }

  initSqliteTables() {
    this.sqliteDb.exec(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS User (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        passwordHash TEXT,
        name TEXT,
        role TEXT DEFAULT 'OWNER',
        avatarUrl TEXT,
        isEmailVerified INTEGER DEFAULT 0,
        verificationToken TEXT,
        resetToken TEXT,
        resetTokenExpires TEXT,
        twoFactorEnabled INTEGER DEFAULT 0,
        twoFactorSecret TEXT,
        isSuspended INTEGER DEFAULT 0,
        createdAt TEXT,
        updatedAt TEXT
      );

      CREATE TABLE IF NOT EXISTS Organization (
        id TEXT PRIMARY KEY,
        name TEXT,
        slug TEXT UNIQUE,
        ownerId TEXT,
        createdAt TEXT,
        updatedAt TEXT
      );

      CREATE TABLE IF NOT EXISTS OrganizationMember (
        id TEXT PRIMARY KEY,
        organizationId TEXT,
        userId TEXT,
        role TEXT DEFAULT 'VIEWER',
        createdAt TEXT,
        updatedAt TEXT,
        UNIQUE(organizationId, userId)
      );

      CREATE TABLE IF NOT EXISTS Website (
        id TEXT PRIMARY KEY,
        publicId TEXT UNIQUE,
        organizationId TEXT,
        name TEXT,
        domain TEXT,
        allowedOrigins TEXT DEFAULT '*',
        isTrackingActive INTEGER DEFAULT 1,
        anonymizeIp INTEGER DEFAULT 1,
        retentionDays INTEGER DEFAULT 90,
        excludedUrls TEXT DEFAULT '[]',
        installedAt TEXT,
        lastPingAt TEXT,
        createdAt TEXT,
        updatedAt TEXT
      );

      CREATE TABLE IF NOT EXISTS TrackingKey (
        id TEXT PRIMARY KEY,
        websiteId TEXT,
        key TEXT UNIQUE,
        name TEXT DEFAULT 'Production Key',
        isRevoked INTEGER DEFAULT 0,
        lastUsedAt TEXT,
        createdAt TEXT,
        updatedAt TEXT
      );

      CREATE TABLE IF NOT EXISTS Visitor (
        id TEXT PRIMARY KEY,
        anonymousId TEXT,
        websiteId TEXT,
        firstSeenAt TEXT,
        lastSeenAt TEXT,
        totalSessions INTEGER DEFAULT 1,
        isReturning INTEGER DEFAULT 0,
        lastIp TEXT,
        country TEXT DEFAULT 'Unknown',
        countryCode TEXT DEFAULT 'XX',
        city TEXT DEFAULT 'Unknown',
        region TEXT,
        deviceType TEXT DEFAULT 'desktop',
        browser TEXT DEFAULT 'Unknown',
        browserVersion TEXT,
        os TEXT DEFAULT 'Unknown',
        language TEXT DEFAULT 'en',
        timezone TEXT,
        UNIQUE(websiteId, anonymousId)
      );

      CREATE TABLE IF NOT EXISTS VisitorSession (
        id TEXT PRIMARY KEY,
        sessionToken TEXT UNIQUE,
        visitorId TEXT,
        websiteId TEXT,
        status TEXT DEFAULT 'ONLINE',
        startedAt TEXT,
        endedAt TEXT,
        lastActivityAt TEXT,
        durationSeconds INTEGER DEFAULT 0,
        pageViewCount INTEGER DEFAULT 1,
        landingPage TEXT DEFAULT '/',
        exitPage TEXT DEFAULT '/',
        referrer TEXT DEFAULT 'Direct',
        channel TEXT DEFAULT 'Direct',
        utmSource TEXT,
        utmMedium TEXT,
        utmCampaign TEXT,
        screenResolution TEXT DEFAULT '1920x1080',
        ip TEXT,
        country TEXT DEFAULT 'Unknown',
        countryCode TEXT DEFAULT 'XX',
        city TEXT DEFAULT 'Unknown',
        region TEXT,
        browser TEXT DEFAULT 'Unknown',
        browserVersion TEXT,
        os TEXT DEFAULT 'Unknown',
        deviceType TEXT DEFAULT 'desktop'
      );

      CREATE TABLE IF NOT EXISTS PageView (
        id TEXT PRIMARY KEY,
        websiteId TEXT,
        sessionId TEXT,
        visitorId TEXT,
        url TEXT,
        path TEXT DEFAULT '/',
        title TEXT DEFAULT 'Untitled',
        referrer TEXT,
        durationSeconds INTEGER DEFAULT 0,
        timestamp TEXT
      );

      CREATE TABLE IF NOT EXISTS VisitorEvent (
        id TEXT PRIMARY KEY,
        websiteId TEXT,
        sessionId TEXT,
        visitorId TEXT,
        eventName TEXT,
        properties TEXT DEFAULT '{}',
        timestamp TEXT
      );

      CREATE TABLE IF NOT EXISTS VisitorLocation (
        id TEXT PRIMARY KEY,
        visitorId TEXT,
        ip TEXT,
        country TEXT,
        countryCode TEXT,
        region TEXT,
        city TEXT,
        latitude REAL,
        longitude REAL,
        createdAt TEXT
      );

      CREATE TABLE IF NOT EXISTS Referral (
        id TEXT PRIMARY KEY,
        websiteId TEXT,
        domain TEXT,
        fullUrl TEXT,
        channel TEXT DEFAULT 'Referral',
        count INTEGER DEFAULT 1,
        lastSeenAt TEXT,
        UNIQUE(websiteId, domain)
      );

      CREATE TABLE IF NOT EXISTS Notification (
        id TEXT PRIMARY KEY,
        userId TEXT,
        websiteId TEXT,
        type TEXT,
        title TEXT,
        message TEXT,
        data TEXT DEFAULT '{}',
        isRead INTEGER DEFAULT 0,
        createdAt TEXT
      );

      CREATE TABLE IF NOT EXISTS UserPreference (
        id TEXT PRIMARY KEY,
        userId TEXT UNIQUE,
        theme TEXT DEFAULT 'dark',
        timezone TEXT DEFAULT 'UTC',
        emailAlerts INTEGER DEFAULT 1,
        trafficSpikeThreshold INTEGER DEFAULT 100,
        soundAlerts INTEGER DEFAULT 0,
        createdAt TEXT,
        updatedAt TEXT
      );

      CREATE TABLE IF NOT EXISTS AuditLog (
        id TEXT PRIMARY KEY,
        userId TEXT,
        action TEXT,
        resourceType TEXT,
        resourceId TEXT,
        ipAddress TEXT,
        userAgent TEXT,
        details TEXT DEFAULT '{}',
        createdAt TEXT
      );

      CREATE TABLE IF NOT EXISTS Subscription (
        id TEXT PRIMARY KEY,
        organizationId TEXT UNIQUE,
        plan TEXT DEFAULT 'FREE',
        status TEXT DEFAULT 'ACTIVE',
        currentPeriodEnd TEXT,
        visitorLimit INTEGER DEFAULT 10000,
        createdAt TEXT,
        updatedAt TEXT
      );
    `);
  }

  initMemoryFallback() {
    this.memoryStore = {
      User: [],
      Organization: [],
      OrganizationMember: [],
      Website: [],
      TrackingKey: [],
      Visitor: [],
      VisitorSession: [],
      PageView: [],
      VisitorEvent: [],
      VisitorLocation: [],
      Referral: [],
      Notification: [],
      UserPreference: [],
      AuditLog: [],
      Subscription: []
    };
  }

  // Helper SQLite runner
  query(sql, params = []) {
    if (!this.sqliteDb) return [];
    try {
      const stmt = this.sqliteDb.prepare(sql);
      return stmt.all(...params);
    } catch (err) {
      logger.error('SQLite Query error: ' + err.message + ' | SQL: ' + sql);
      return [];
    }
  }

  run(sql, params = []) {
    if (!this.sqliteDb) return { changes: 0, lastInsertRowid: 0 };
    try {
      const stmt = this.sqliteDb.prepare(sql);
      return stmt.run(...params);
    } catch (err) {
      logger.error('SQLite Run error: ' + err.message + ' | SQL: ' + sql);
      throw err;
    }
  }

  // Universal models adapter
  get user() {
    if (this.isPrisma) return this.client.user;
    return {
      findUnique: async ({ where }) => {
        if (where.id) {
          const rows = this.query('SELECT * FROM User WHERE id = ? LIMIT 1', [where.id]);
          return rows[0] || null;
        }
        if (where.email) {
          const rows = this.query('SELECT * FROM User WHERE email = ? LIMIT 1', [where.email.toLowerCase()]);
          return rows[0] || null;
        }
        return null;
      },
      findFirst: async ({ where = {} }) => {
        let sql = 'SELECT * FROM User WHERE 1=1';
        const params = [];
        if (where.email) {
          sql += ' AND email = ?';
          params.push(where.email.toLowerCase());
        }
        if (where.resetToken) {
          sql += ' AND resetToken = ?';
          params.push(where.resetToken);
        }
        sql += ' LIMIT 1';
        const rows = this.query(sql, params);
        return rows[0] || null;
      },
      findMany: async () => this.query('SELECT * FROM User ORDER BY createdAt DESC'),
      count: async () => {
        const rows = this.query('SELECT COUNT(*) as count FROM User');
        return rows[0]?.count || 0;
      },
      create: async ({ data }) => {
        const now = new Date().toISOString();
        const id = data.id || ('usr_' + Math.random().toString(36).substring(2, 10));
        this.run(`
          INSERT INTO User (id, email, passwordHash, name, role, avatarUrl, isEmailVerified, twoFactorEnabled, isSuspended, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          id,
          data.email.toLowerCase(),
          data.passwordHash,
          data.name,
          data.role || 'OWNER',
          data.avatarUrl || null,
          data.isEmailVerified ? 1 : 0,
          data.twoFactorEnabled ? 1 : 0,
          data.isSuspended ? 1 : 0,
          data.createdAt || now,
          data.updatedAt || now
        ]);
        return this.user.findUnique({ where: { id } });
      },
      update: async ({ where, data }) => {
        const updates = [];
        const params = [];
        for (const [key, val] of Object.entries(data)) {
          updates.push(`${key} = ?`);
          params.push(typeof val === 'boolean' ? (val ? 1 : 0) : val);
        }
        updates.push('updatedAt = ?');
        params.push(new Date().toISOString());
        params.push(where.id);
        this.run(`UPDATE User SET ${updates.join(', ')} WHERE id = ?`, params);
        return this.user.findUnique({ where });
      },
      delete: async ({ where }) => {
        this.run('DELETE FROM User WHERE id = ?', [where.id]);
        return { id: where.id };
      }
    };
  }

  get organization() {
    if (this.isPrisma) return this.client.organization;
    return {
      findUnique: async ({ where }) => {
        const rows = this.query('SELECT * FROM Organization WHERE id = ? OR slug = ? LIMIT 1', [where.id || '', where.slug || '']);
        return rows[0] || null;
      },
      findFirst: async ({ where = {} }) => {
        if (where.ownerId) {
          const rows = this.query('SELECT * FROM Organization WHERE ownerId = ? LIMIT 1', [where.ownerId]);
          return rows[0] || null;
        }
        const rows = this.query('SELECT * FROM Organization LIMIT 1');
        return rows[0] || null;
      },
      findMany: async () => this.query('SELECT * FROM Organization'),
      create: async ({ data }) => {
        const id = data.id || ('org_' + Math.random().toString(36).substring(2, 10));
        const now = new Date().toISOString();
        this.run(`INSERT INTO Organization (id, name, slug, ownerId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)`, [
          id, data.name, data.slug, data.ownerId, now, now
        ]);
        return { id, ...data, createdAt: now, updatedAt: now };
      }
    };
  }

  get organizationMember() {
    if (this.isPrisma) return this.client.organizationMember;
    return {
      findMany: async ({ where = {} }) => {
        if (where.organizationId) {
          return this.query(`
            SELECT om.*, u.name as userName, u.email as userEmail, u.avatarUrl
            FROM OrganizationMember om
            JOIN User u ON om.userId = u.id
            WHERE om.organizationId = ?
          `, [where.organizationId]);
        }
        if (where.userId) {
          return this.query('SELECT * FROM OrganizationMember WHERE userId = ?', [where.userId]);
        }
        return this.query('SELECT * FROM OrganizationMember');
      },
      create: async ({ data }) => {
        const id = 'mem_' + Math.random().toString(36).substring(2, 10);
        const now = new Date().toISOString();
        this.run(`INSERT INTO OrganizationMember (id, organizationId, userId, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)`, [
          id, data.organizationId, data.userId, data.role || 'VIEWER', now, now
        ]);
        return { id, ...data, createdAt: now, updatedAt: now };
      },
      delete: async ({ where }) => {
        if (where.id) this.run('DELETE FROM OrganizationMember WHERE id = ?', [where.id]);
        return { success: true };
      }
    };
  }

  get website() {
    if (this.isPrisma) return this.client.website;
    return {
      findUnique: async ({ where }) => {
        const rows = this.query('SELECT * FROM Website WHERE id = ? OR publicId = ? LIMIT 1', [where.id || '', where.publicId || '']);
        return rows[0] || null;
      },
      findFirst: async ({ where = {} }) => {
        if (where.id && where.publicId) {
          const rows = this.query('SELECT * FROM Website WHERE id = ? OR publicId = ? LIMIT 1', [where.id, where.publicId]);
          return rows[0] || null;
        }
        if (where.publicId) {
          const rows = this.query('SELECT * FROM Website WHERE publicId = ? LIMIT 1', [where.publicId]);
          return rows[0] || null;
        }
        if (where.id) {
          const rows = this.query('SELECT * FROM Website WHERE id = ? LIMIT 1', [where.id]);
          return rows[0] || null;
        }
        const rows = this.query('SELECT * FROM Website LIMIT 1');
        return rows[0] || null;
      },
      findMany: async ({ where = {} }) => {
        if (where.organizationId) {
          return this.query('SELECT * FROM Website WHERE organizationId = ? ORDER BY createdAt DESC', [where.organizationId]);
        }
        return this.query('SELECT * FROM Website ORDER BY createdAt DESC');
      },
      count: async () => {
        const rows = this.query('SELECT COUNT(*) as count FROM Website');
        return rows[0]?.count || 0;
      },
      create: async ({ data }) => {
        const id = data.id || ('web_' + Math.random().toString(36).substring(2, 10));
        const publicId = data.publicId || ('site_' + Math.random().toString(36).substring(2, 12));
        const now = new Date().toISOString();
        this.run(`
          INSERT INTO Website (id, publicId, organizationId, name, domain, allowedOrigins, isTrackingActive, anonymizeIp, retentionDays, excludedUrls, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          id, publicId, data.organizationId, data.name, data.domain,
          data.allowedOrigins || '*', data.isTrackingActive !== false ? 1 : 0,
          data.anonymizeIp !== false ? 1 : 0, data.retentionDays || 90,
          JSON.stringify(data.excludedUrls || []), now, now
        ]);
        return this.website.findUnique({ where: { id } });
      },
      update: async ({ where, data }) => {
        const updates = [];
        const params = [];
        for (const [key, val] of Object.entries(data)) {
          updates.push(`${key} = ?`);
          params.push(typeof val === 'boolean' ? (val ? 1 : 0) : typeof val === 'object' ? JSON.stringify(val) : val);
        }
        updates.push('updatedAt = ?');
        params.push(new Date().toISOString());
        params.push(where.id || where.publicId || '');
        params.push(where.publicId || where.id || '');
        this.run(`UPDATE Website SET ${updates.join(', ')} WHERE id = ? OR publicId = ?`, params);
        return this.website.findUnique({ where });
      },
      delete: async ({ where }) => {
        const target = await this.website.findUnique({ where });
        if (target) {
          this.run('DELETE FROM Website WHERE id = ?', [target.id]);
          this.run('DELETE FROM TrackingKey WHERE websiteId = ?', [target.id]);
          this.run('DELETE FROM Visitor WHERE websiteId = ?', [target.id]);
          this.run('DELETE FROM VisitorSession WHERE websiteId = ?', [target.id]);
          this.run('DELETE FROM PageView WHERE websiteId = ?', [target.id]);
          this.run('DELETE FROM VisitorEvent WHERE websiteId = ?', [target.id]);
        }
        return { success: true };
      }
    };
  }

  get trackingKey() {
    if (this.isPrisma) return this.client.trackingKey;
    return {
      findUnique: async ({ where }) => {
        const rows = this.query('SELECT * FROM TrackingKey WHERE key = ? OR id = ? LIMIT 1', [where.key || '', where.id || '']);
        return rows[0] || null;
      },
      findFirst: async ({ where = {} }) => {
        if (where.websiteId && where.isRevoked !== undefined) {
          const rows = this.query('SELECT * FROM TrackingKey WHERE websiteId = ? AND isRevoked = ? ORDER BY createdAt DESC LIMIT 1', [where.websiteId, where.isRevoked ? 1 : 0]);
          return rows[0] || null;
        }
        if (where.websiteId) {
          const rows = this.query('SELECT * FROM TrackingKey WHERE websiteId = ? ORDER BY createdAt DESC LIMIT 1', [where.websiteId]);
          return rows[0] || null;
        }
        if (where.key) {
          const rows = this.query('SELECT * FROM TrackingKey WHERE key = ? LIMIT 1', [where.key]);
          return rows[0] || null;
        }
        return null;
      },
      create: async ({ data }) => {
        const id = 'key_' + Math.random().toString(36).substring(2, 10);
        const now = new Date().toISOString();
        this.run(`INSERT INTO TrackingKey (id, websiteId, key, name, isRevoked, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`, [
          id, data.websiteId, data.key, data.name || 'Production Key', data.isRevoked ? 1 : 0, now, now
        ]);
        return { id, ...data, isRevoked: false, createdAt: now, updatedAt: now };
      },
      update: async ({ where, data }) => {
        this.run('UPDATE TrackingKey SET isRevoked = ?, updatedAt = ? WHERE id = ? OR websiteId = ?', [data.isRevoked ? 1 : 0, new Date().toISOString(), where.id || '', where.websiteId || '']);
        return { success: true };
      }
    };
  }

  get visitor() {
    if (this.isPrisma) return this.client.visitor;
    return {
      findUnique: async ({ where }) => {
        if (where.websiteId_anonymousId) {
          const rows = this.query('SELECT * FROM Visitor WHERE websiteId = ? AND anonymousId = ? LIMIT 1', [where.websiteId_anonymousId.websiteId, where.websiteId_anonymousId.anonymousId]);
          return rows[0] || null;
        }
        if (where.id) {
          const rows = this.query('SELECT * FROM Visitor WHERE id = ? LIMIT 1', [where.id]);
          return rows[0] || null;
        }
        return null;
      },
      findFirst: async ({ where = {} }) => {
        if (where.anonymousId && where.websiteId) {
          const rows = this.query('SELECT * FROM Visitor WHERE websiteId = ? AND anonymousId = ? LIMIT 1', [where.websiteId, where.anonymousId]);
          return rows[0] || null;
        }
        return null;
      },
      findMany: async ({ where = {}, orderBy = {}, take = 100, skip = 0 }) => {
        let sql = 'SELECT * FROM Visitor WHERE 1=1';
        const params = [];
        if (where.websiteId) {
          sql += ' AND websiteId = ?';
          params.push(where.websiteId);
        }
        sql += ' ORDER BY lastSeenAt DESC LIMIT ? OFFSET ?';
        params.push(take, skip);
        return this.query(sql, params);
      },
      count: async ({ where = {} } = {}) => {
        let sql = 'SELECT COUNT(*) as count FROM Visitor WHERE 1=1';
        const params = [];
        if (where.websiteId) {
          sql += ' AND websiteId = ?';
          params.push(where.websiteId);
        }
        const rows = this.query(sql, params);
        return rows[0]?.count || 0;
      },
      create: async ({ data }) => {
        const id = data.id || ('vst_' + Math.random().toString(36).substring(2, 10));
        const now = new Date().toISOString();
        this.run(`
          INSERT INTO Visitor (id, anonymousId, websiteId, firstSeenAt, lastSeenAt, totalSessions, isReturning, lastIp, country, countryCode, city, region, deviceType, browser, browserVersion, os, language, timezone)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          id, data.anonymousId, data.websiteId, data.firstSeenAt || now, data.lastSeenAt || now,
          data.totalSessions || 1, data.isReturning ? 1 : 0, data.lastIp || '',
          data.country || 'Unknown', data.countryCode || 'XX', data.city || 'Unknown',
          data.region || '', data.deviceType || 'desktop', data.browser || 'Unknown',
          data.browserVersion || '', data.os || 'Unknown', data.language || 'en', data.timezone || 'UTC'
        ]);
        return this.visitor.findUnique({ where: { id } });
      },
      update: async ({ where, data }) => {
        const updates = [];
        const params = [];
        for (const [key, val] of Object.entries(data)) {
          updates.push(`${key} = ?`);
          params.push(typeof val === 'boolean' ? (val ? 1 : 0) : val);
        }
        params.push(where.id);
        this.run(`UPDATE Visitor SET ${updates.join(', ')} WHERE id = ?`, params);
        return this.visitor.findUnique({ where });
      }
    };
  }

  get visitorSession() {
    if (this.isPrisma) return this.client.visitorSession;
    return {
      findUnique: async ({ where }) => {
        if (where.sessionToken) {
          const rows = this.query('SELECT * FROM VisitorSession WHERE sessionToken = ? LIMIT 1', [where.sessionToken]);
          return rows[0] || null;
        }
        if (where.id) {
          const rows = this.query('SELECT * FROM VisitorSession WHERE id = ? LIMIT 1', [where.id]);
          return rows[0] || null;
        }
        return null;
      },
      findFirst: async ({ where = {} }) => {
        let sql = 'SELECT * FROM VisitorSession WHERE 1=1';
        const params = [];
        if (where.sessionToken) {
          sql += ' AND sessionToken = ?';
          params.push(where.sessionToken);
        }
        if (where.visitorId) {
          sql += ' AND visitorId = ?';
          params.push(where.visitorId);
        }
        if (where.websiteId) {
          sql += ' AND websiteId = ?';
          params.push(where.websiteId);
        }
        if (where.status) {
          sql += ' AND status = ?';
          params.push(where.status);
        }
        sql += ' ORDER BY startedAt DESC LIMIT 1';
        const rows = this.query(sql, params);
        return rows[0] || null;
      },
      findMany: async ({ where = {}, orderBy = {}, take = 100, skip = 0 } = {}) => {
        let sql = 'SELECT * FROM VisitorSession WHERE 1=1';
        const params = [];
        if (where.websiteId) {
          sql += ' AND websiteId = ?';
          params.push(where.websiteId);
        }
        if (where.visitorId) {
          sql += ' AND visitorId = ?';
          params.push(where.visitorId);
        }
        if (where.status) {
          sql += ' AND status = ?';
          params.push(where.status);
        }
        sql += ' ORDER BY lastActivityAt DESC LIMIT ? OFFSET ?';
        params.push(take, skip);
        return this.query(sql, params);
      },
      count: async ({ where = {} } = {}) => {
        let sql = 'SELECT COUNT(*) as count FROM VisitorSession WHERE 1=1';
        const params = [];
        if (where.websiteId) {
          sql += ' AND websiteId = ?';
          params.push(where.websiteId);
        }
        if (where.status) {
          sql += ' AND status = ?';
          params.push(where.status);
        }
        const rows = this.query(sql, params);
        return rows[0]?.count || 0;
      },
      create: async ({ data }) => {
        const id = data.id || ('ses_' + Math.random().toString(36).substring(2, 10));
        const now = new Date().toISOString();
        this.run(`
          INSERT INTO VisitorSession (
            id, sessionToken, visitorId, websiteId, status, startedAt, lastActivityAt,
            durationSeconds, pageViewCount, landingPage, exitPage, referrer, channel,
            utmSource, utmMedium, utmCampaign, screenResolution, ip, country,
            countryCode, city, region, browser, browserVersion, os, deviceType
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          id, data.sessionToken, data.visitorId, data.websiteId, data.status || 'ONLINE',
          data.startedAt || now, data.lastActivityAt || now, data.durationSeconds || 0,
          data.pageViewCount || 1, data.landingPage || '/', data.exitPage || '/',
          data.referrer || 'Direct', data.channel || 'Direct', data.utmSource || null,
          data.utmMedium || null, data.utmCampaign || null, data.screenResolution || '1920x1080',
          data.ip || '', data.country || 'Unknown', data.countryCode || 'XX',
          data.city || 'Unknown', data.region || '', data.browser || 'Unknown',
          data.browserVersion || '', data.os || 'Unknown', data.deviceType || 'desktop'
        ]);
        return this.visitorSession.findUnique({ where: { id } });
      },
      update: async ({ where, data }) => {
        const updates = [];
        const params = [];
        for (const [key, val] of Object.entries(data)) {
          updates.push(`${key} = ?`);
          params.push(val);
        }
        params.push(where.id || where.sessionToken || '');
        params.push(where.sessionToken || where.id || '');
        this.run(`UPDATE VisitorSession SET ${updates.join(', ')} WHERE id = ? OR sessionToken = ?`, params);
        return this.visitorSession.findUnique({ where });
      }
    };
  }

  get pageView() {
    if (this.isPrisma) return this.client.pageView;
    return {
      findMany: async ({ where = {}, orderBy = {}, take = 100, skip = 0 } = {}) => {
        let sql = 'SELECT * FROM PageView WHERE 1=1';
        const params = [];
        if (where.websiteId) {
          sql += ' AND websiteId = ?';
          params.push(where.websiteId);
        }
        if (where.sessionId) {
          sql += ' AND sessionId = ?';
          params.push(where.sessionId);
        }
        if (where.visitorId) {
          sql += ' AND visitorId = ?';
          params.push(where.visitorId);
        }
        sql += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
        params.push(take, skip);
        return this.query(sql, params);
      },
      count: async ({ where = {} } = {}) => {
        let sql = 'SELECT COUNT(*) as count FROM PageView WHERE 1=1';
        const params = [];
        if (where.websiteId) {
          sql += ' AND websiteId = ?';
          params.push(where.websiteId);
        }
        const rows = this.query(sql, params);
        return rows[0]?.count || 0;
      },
      create: async ({ data }) => {
        const id = data.id || ('pv_' + Math.random().toString(36).substring(2, 10));
        const now = new Date().toISOString();
        this.run(`
          INSERT INTO PageView (id, websiteId, sessionId, visitorId, url, path, title, referrer, durationSeconds, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          id, data.websiteId, data.sessionId, data.visitorId, data.url,
          data.path || '/', data.title || 'Untitled', data.referrer || '',
          data.durationSeconds || 0, data.timestamp || now
        ]);
        return { id, ...data, timestamp: data.timestamp || now };
      }
    };
  }

  get visitorEvent() {
    if (this.isPrisma) return this.client.visitorEvent;
    return {
      findMany: async ({ where = {}, take = 100 } = {}) => {
        let sql = 'SELECT * FROM VisitorEvent WHERE 1=1';
        const params = [];
        if (where.websiteId) {
          sql += ' AND websiteId = ?';
          params.push(where.websiteId);
        }
        if (where.sessionId) {
          sql += ' AND sessionId = ?';
          params.push(where.sessionId);
        }
        if (where.visitorId) {
          sql += ' AND visitorId = ?';
          params.push(where.visitorId);
        }
        sql += ' ORDER BY timestamp DESC LIMIT ?';
        params.push(take);
        return this.query(sql, params);
      },
      count: async ({ where = {} } = {}) => {
        let sql = 'SELECT COUNT(*) as count FROM VisitorEvent WHERE 1=1';
        const params = [];
        if (where.websiteId) {
          sql += ' AND websiteId = ?';
          params.push(where.websiteId);
        }
        const rows = this.query(sql, params);
        return rows[0]?.count || 0;
      },
      create: async ({ data }) => {
        const id = data.id || ('evt_' + Math.random().toString(36).substring(2, 10));
        const now = new Date().toISOString();
        this.run(`
          INSERT INTO VisitorEvent (id, websiteId, sessionId, visitorId, eventName, properties, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          id, data.websiteId, data.sessionId, data.visitorId, data.eventName,
          typeof data.properties === 'object' ? JSON.stringify(data.properties) : (data.properties || '{}'),
          data.timestamp || now
        ]);
        return { id, ...data, timestamp: data.timestamp || now };
      }
    };
  }

  get notification() {
    if (this.isPrisma) return this.client.notification;
    return {
      findMany: async ({ where = {}, take = 50 } = {}) => {
        let sql = 'SELECT * FROM Notification WHERE 1=1';
        const params = [];
        if (where.userId) {
          sql += ' AND userId = ?';
          params.push(where.userId);
        }
        sql += ' ORDER BY createdAt DESC LIMIT ?';
        params.push(take);
        return this.query(sql, params);
      },
      create: async ({ data }) => {
        const id = 'notif_' + Math.random().toString(36).substring(2, 10);
        const now = new Date().toISOString();
        this.run(`
          INSERT INTO Notification (id, userId, websiteId, type, title, message, data, isRead, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          id, data.userId, data.websiteId || null, data.type, data.title,
          data.message, JSON.stringify(data.data || {}), 0, now
        ]);
        return { id, ...data, isRead: false, createdAt: now };
      },
      update: async ({ where, data }) => {
        this.run('UPDATE Notification SET isRead = ? WHERE id = ?', [data.isRead ? 1 : 0, where.id]);
        return { success: true };
      }
    };
  }

  get userPreference() {
    if (this.isPrisma) return this.client.userPreference;
    return {
      findUnique: async ({ where }) => {
        const rows = this.query('SELECT * FROM UserPreference WHERE userId = ? LIMIT 1', [where.userId]);
        return rows[0] || null;
      },
      upsert: async ({ where, update, create }) => {
        const existing = await this.userPreference.findUnique({ where });
        const now = new Date().toISOString();
        if (existing) {
          this.run(`
            UPDATE UserPreference
            SET theme = ?, timezone = ?, emailAlerts = ?, trafficSpikeThreshold = ?, soundAlerts = ?, updatedAt = ?
            WHERE userId = ?
          `, [
            update.theme || existing.theme,
            update.timezone || existing.timezone,
            update.emailAlerts !== undefined ? (update.emailAlerts ? 1 : 0) : existing.emailAlerts,
            update.trafficSpikeThreshold || existing.trafficSpikeThreshold,
            update.soundAlerts !== undefined ? (update.soundAlerts ? 1 : 0) : existing.soundAlerts,
            now,
            where.userId
          ]);
          return this.userPreference.findUnique({ where });
        } else {
          const id = 'pref_' + Math.random().toString(36).substring(2, 10);
          this.run(`
            INSERT INTO UserPreference (id, userId, theme, timezone, emailAlerts, trafficSpikeThreshold, soundAlerts, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            id, where.userId, create.theme || 'dark', create.timezone || 'UTC',
            create.emailAlerts !== false ? 1 : 0, create.trafficSpikeThreshold || 100,
            create.soundAlerts ? 1 : 0, now, now
          ]);
          return this.userPreference.findUnique({ where });
        }
      }
    };
  }

  get auditLog() {
    if (this.isPrisma) return this.client.auditLog;
    return {
      findMany: async ({ take = 50 } = {}) => {
        return this.query('SELECT * FROM AuditLog ORDER BY createdAt DESC LIMIT ?', [take]);
      },
      create: async ({ data }) => {
        const id = 'aud_' + Math.random().toString(36).substring(2, 10);
        const now = new Date().toISOString();
        this.run(`
          INSERT INTO AuditLog (id, userId, action, resourceType, resourceId, ipAddress, userAgent, details, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          id, data.userId || null, data.action, data.resourceType || '',
          data.resourceId || '', data.ipAddress || '', data.userAgent || '',
          JSON.stringify(data.details || {}), now
        ]);
        return { id, ...data, createdAt: now };
      }
    };
  }
}

export const db = new DatabaseProxy();
