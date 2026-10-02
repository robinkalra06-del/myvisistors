/**
 * LiveTrack Lightweight Real-Time Tracking Script (v1.0.0)
 * Privacy-focused, zero-dependency, SPA-aware, asynchronous website monitoring.
 * (c) LiveTrack Platform
 */
(function (window, document) {
  'use strict';

  // Do Not Track respect
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') {
    // Respect user DNT preference unless explicitly disabled
    var forceTrack = window.LiveTrackConfig && window.LiveTrackConfig.ignoreDnt;
    if (!forceTrack) {
      console.info('[LiveTrack] Do Not Track is active. Tracking disabled.');
      window.LiveTrack = { track: function () {}, pageView: function () {}, optOut: function () {}, optIn: function () {} };
      return;
    }
  }

  // Check manual opt-out
  try {
    if (localStorage.getItem('lt_opt_out') === 'true') {
      window.LiveTrack = { track: function () {}, pageView: function () {}, optOut: function () {}, optIn: function () { localStorage.removeItem('lt_opt_out'); location.reload(); } };
      return;
    }
  } catch (e) {}

  // Resolve Configuration
  var currentScript = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      if (scripts[i].src && scripts[i].src.indexOf('tracker.js') !== -1) {
        return scripts[i];
      }
    }
    return null;
  })();

  var userConfig = window.LiveTrackConfig || {};
  var siteId = userConfig.siteId || (currentScript ? currentScript.getAttribute('data-site-id') : null);

  if (!siteId) {
    console.warn('[LiveTrack] Missing siteId. Please configure window.LiveTrackConfig.siteId or data-site-id attribute.');
    return;
  }

  // Derive API endpoint
  var scriptSrc = currentScript ? currentScript.src : '';
  var defaultApiUrl = scriptSrc ? scriptSrc.replace(/\/tracker\.js.*$/, '') : window.location.origin;
  var apiUrl = (userConfig.apiUrl || defaultApiUrl).replace(/\/$/, '');

  // Persistent Anonymous Visitor ID
  function getVisitorId() {
    var vidKey = 'lt_vid_' + siteId;
    var vid = null;
    try {
      vid = localStorage.getItem(vidKey);
      if (!vid) {
        vid = 'vid_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
        localStorage.setItem(vidKey, vid);
      }
    } catch (e) {
      vid = 'vid_temp_' + Math.random().toString(36).substring(2, 10);
    }
    return vid;
  }

  // Session Management (30m inactivity rolling expiration)
  var SESSION_TIMEOUT_MS = 30 * 60 * 1000;
  function getSessionId() {
    var sidKey = 'lt_sid_' + siteId;
    var sTimeKey = 'lt_stime_' + siteId;
    var now = Date.now();
    var sid = null;
    try {
      var lastTime = parseInt(localStorage.getItem(sTimeKey) || '0', 10);
      if (now - lastTime > SESSION_TIMEOUT_MS || !localStorage.getItem(sidKey)) {
        sid = 'sid_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
        localStorage.setItem(sidKey, sid);
        localStorage.setItem('lt_slanding_' + siteId, window.location.pathname || '/');
      } else {
        sid = localStorage.getItem(sidKey);
      }
      localStorage.setItem(sTimeKey, now.toString());
    } catch (e) {
      sid = 'sid_temp_' + Math.random().toString(36).substring(2, 10);
    }
    return sid;
  }

  var visitorId = getVisitorId();
  var sessionId = getSessionId();
  var landingPage = (function () {
    try { return localStorage.getItem('lt_slanding_' + siteId) || window.location.pathname || '/'; }
    catch (e) { return window.location.pathname || '/'; }
  })();

  // Device & Screen details
  function getScreenResolution() {
    try {
      return (window.screen.width || 0) + 'x' + (window.screen.height || 0);
    } catch (e) {
      return '1920x1080';
    }
  }

  // Offline event queue
  var eventQueue = [];
  var isFlushing = false;

  function sendRequest(endpoint, payload, isBeacon) {
    var fullUrl = apiUrl + '/api/track' + endpoint;
    var bodyStr = JSON.stringify(payload);

    // Try Beacon API for exit events
    if (isBeacon && navigator.sendBeacon) {
      try {
        var blob = new Blob([bodyStr], { type: 'application/json' });
        if (navigator.sendBeacon(fullUrl, blob)) {
          return;
        }
      } catch (e) {}
    }

    // Standard fetch
    if (window.fetch) {
      fetch(fullUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyStr,
        keepalive: Boolean(isBeacon)
      }).catch(function (err) {
        if (!isBeacon) {
          eventQueue.push({ endpoint: endpoint, payload: payload });
        }
      });
    } else {
      // Fallback XMLHttpRequest
      try {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', fullUrl, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(bodyStr);
      } catch (e) {}
    }
  }

  // Flush queued events when back online
  function flushQueue() {
    if (isFlushing || eventQueue.length === 0) return;
    isFlushing = true;
    while (eventQueue.length > 0) {
      var item = eventQueue.shift();
      sendRequest(item.endpoint, item.payload, false);
    }
    isFlushing = false;
  }

  window.addEventListener('online', flushQueue);

  // Check URL exclusion
  function isExcludedUrl(url) {
    if (!userConfig.excludedPaths || !userConfig.excludedPaths.length) return false;
    for (var i = 0; i < userConfig.excludedPaths.length; i++) {
      var pattern = userConfig.excludedPaths[i];
      if (url.indexOf(pattern) !== -1) return true;
    }
    return false;
  }

  // 1. Send Initial Session Ping
  function initSession() {
    sessionId = getSessionId();
    sendRequest('/session', {
      websiteId: siteId,
      visitorId: visitorId,
      sessionId: sessionId,
      referrer: document.referrer || 'Direct',
      landingPage: landingPage,
      currentPage: window.location.pathname + window.location.search,
      pageTitle: document.title || 'Untitled',
      screenResolution: getScreenResolution(),
      language: navigator.language || 'en',
      timezone: (Intl && Intl.DateTimeFormat) ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC'
    });
  }

  // 2. Track Page View
  var lastTrackedUrl = null;
  function trackPageView(customTitle, customUrl) {
    var currentUrl = customUrl || (window.location.pathname + window.location.search);
    if (isExcludedUrl(currentUrl)) return;
    if (lastTrackedUrl === currentUrl) return; // Prevent immediate duplicates
    lastTrackedUrl = currentUrl;

    sessionId = getSessionId(); // Keep session alive
    sendRequest('/pageview', {
      websiteId: siteId,
      visitorId: visitorId,
      sessionId: sessionId,
      url: window.location.href,
      path: currentUrl,
      title: customTitle || document.title || 'Untitled',
      referrer: document.referrer || 'Direct'
    });
  }

  // 3. Heartbeat (Every 20 seconds while active)
  var heartbeatInterval = null;
  function startHeartbeat() {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(function () {
      if (document.visibilityState === 'visible') {
        sessionId = getSessionId();
        sendRequest('/heartbeat', {
          websiteId: siteId,
          sessionId: sessionId,
          visitorId: visitorId,
          currentPage: window.location.pathname + window.location.search,
          pageTitle: document.title || 'Untitled'
        });
      }
    }, 20000);
  }

  // 4. Session End / Exit Event
  function trackSessionEnd() {
    sendRequest('/session-end', {
      websiteId: siteId,
      sessionId: sessionId,
      visitorId: visitorId,
      exitPage: window.location.pathname + window.location.search
    }, true);
  }

  // Listen to visibility & exit
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      sendRequest('/heartbeat', {
        websiteId: siteId,
        sessionId: sessionId,
        visitorId: visitorId,
        status: 'idle'
      }, true);
    } else {
      sendRequest('/heartbeat', {
        websiteId: siteId,
        sessionId: sessionId,
        visitorId: visitorId,
        status: 'online'
      });
    }
  });

  window.addEventListener('beforeunload', trackSessionEnd);
  window.addEventListener('pagehide', trackSessionEnd);

  // 5. Single Page Application (SPA) Routing Hook
  (function monitorSpaNavigation() {
    var pushState = history.pushState;
    var replaceState = history.replaceState;

    history.pushState = function () {
      pushState.apply(history, arguments);
      setTimeout(function () { trackPageView(); }, 50);
    };

    history.replaceState = function () {
      replaceState.apply(history, arguments);
      setTimeout(function () { trackPageView(); }, 50);
    };

    window.addEventListener('popstate', function () {
      setTimeout(function () { trackPageView(); }, 50);
    });

    window.addEventListener('hashchange', function () {
      setTimeout(function () { trackPageView(); }, 50);
    });
  })();

  // 6. Public Global API
  window.LiveTrack = {
    /**
     * Track a custom business event (e.g. signup, purchase, button click)
     * @param {string} eventName
     * @param {Object} properties
     */
    track: function (eventName, properties) {
      if (!eventName || typeof eventName !== 'string') return;
      sessionId = getSessionId();

      // Sanitize properties: allow only numbers, booleans, strings; strip potential password fields
      var cleanProps = {};
      if (properties && typeof properties === 'object') {
        var banned = ['password', 'card', 'cvv', 'token', 'secret', 'ssn'];
        for (var key in properties) {
          if (Object.prototype.hasOwnProperty.call(properties, key)) {
            var lowerKey = key.toLowerCase();
            var isBanned = banned.some(function (b) { return lowerKey.indexOf(b) !== -1; });
            if (!isBanned) {
              var val = properties[key];
              if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
                cleanProps[key] = val;
              }
            }
          }
        }
      }

      sendRequest('/event', {
        websiteId: siteId,
        visitorId: visitorId,
        sessionId: sessionId,
        eventName: eventName.substring(0, 80),
        properties: cleanProps
      });
    },

    pageView: function (title, url) {
      trackPageView(title, url);
    },

    optOut: function () {
      try {
        localStorage.setItem('lt_opt_out', 'true');
        console.info('[LiveTrack] Opted out of tracking.');
      } catch (e) {}
    },

    optIn: function () {
      try {
        localStorage.removeItem('lt_opt_out');
        console.info('[LiveTrack] Opted into tracking.');
      } catch (e) {}
    },

    getSessionId: function () { return sessionId; },
    getVisitorId: function () { return visitorId; }
  };

  // Kick off tracking
  initSession();
  trackPageView();
  startHeartbeat();

  console.info('[LiveTrack] Tracking initialized for site: ' + siteId);
})(window, document);
