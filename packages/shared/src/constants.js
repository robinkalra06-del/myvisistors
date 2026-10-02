/**
 * LiveTrack Shared Constants
 */

export const VISITOR_STATUS = {
  ONLINE: 'online',
  IDLE: 'idle',
  OFFLINE: 'offline'
};

export const SOCKET_EVENTS = {
  // Visitor events
  VISITOR_NEW: 'visitor:new',
  VISITOR_UPDATE: 'visitor:update',
  VISITOR_PAGEVIEW: 'visitor:pageview',
  VISITOR_IDLE: 'visitor:idle',
  VISITOR_OFFLINE: 'visitor:offline',
  VISITOR_EVENT: 'visitor:event',
  
  // Analytics & Dashboard events
  ANALYTICS_UPDATE: 'analytics:update',
  NOTIFICATION_NEW: 'notification:new',
  WEBSITE_STATUS: 'website:status',
  
  // Client room controls
  JOIN_ROOM: 'join:website',
  LEAVE_ROOM: 'leave:website',
  PING: 'client:ping',
  PONG: 'server:pong'
};

export const USER_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  VIEWER: 'VIEWER'
};

export const DEVICE_TYPES = {
  DESKTOP: 'desktop',
  MOBILE: 'mobile',
  TABLET: 'tablet',
  BOT: 'bot',
  UNKNOWN: 'unknown'
};

export const TIME_RANGES = {
  TODAY: 'today',
  YESTERDAY: 'yesterday',
  LAST_7_DAYS: '7d',
  LAST_30_DAYS: '30d',
  LAST_90_DAYS: '90d',
  CUSTOM: 'custom'
};

export const TIMEOUTS = {
  HEARTBEAT_INTERVAL_MS: 20000, // 20s
  IDLE_THRESHOLD_MS: 45000,      // 45s
  OFFLINE_THRESHOLD_MS: 120000,  // 2m
  SESSION_INACTIVITY_MS: 1800000 // 30m
};

export const NOTIFICATION_CHANNELS = {
  IN_APP: 'IN_APP',
  EMAIL: 'EMAIL',
  WEBHOOK: 'WEBHOOK'
};

export const NOTIFICATION_TYPES = {
  NEW_VISITOR: 'NEW_VISITOR',
  TRAFFIC_SPIKE: 'TRAFFIC_SPIKE',
  TRACKING_ALERT: 'TRACKING_ALERT',
  CUSTOM_EVENT: 'CUSTOM_EVENT',
  SYSTEM: 'SYSTEM'
};
