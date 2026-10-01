/**
 * VisitorPulse Intelligence & Live Chatbot Widget
 * Enterprise Edition - Lightweight, zero external dependencies, no permissions requested.
 */
(function () {
  'use strict';

  if (window.__VISITOR_PULSE_INITIALIZED__) return;
  window.__VISITOR_PULSE_INITIALIZED__ = true;

  // Determine server origin from currentScript
  var currentScript = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  var scriptSrc = currentScript ? currentScript.src : '';
  var serverOrigin = '';
  try {
    var parsedUrl = new URL(scriptSrc);
    serverOrigin = parsedUrl.origin;
  } catch (e) {
    serverOrigin = window.location.origin;
  }

  var siteId = (currentScript && currentScript.getAttribute('data-site-id')) || 'production';
  // Check if chatbot should be hidden on mobile devices (as requested)
  var hideBotOnMobile = (currentScript && currentScript.getAttribute('data-hide-mobile') === 'true') || false;

  var apiBase = serverOrigin + '/api';

  function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function getStorage(storageType, key) {
    try {
      return window[storageType].getItem(key);
    } catch (e) {
      return null;
    }
  }

  function setStorage(storageType, key, val) {
    try {
      window[storageType].setItem(key, val);
    } catch (e) {}
  }

  // Parse UTM campaign parameters
  function getUtmParams() {
    var params = {};
    try {
      var searchParams = new URLSearchParams(window.location.search);
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(function (k) {
        if (searchParams.has(k)) {
          params[k] = searchParams.get(k);
        }
      });
    } catch (e) {}
    return params;
  }

  // Determine device details
  function getDeviceDetails() {
    var ua = navigator.userAgent || '';
    var isMobile = /mobile|iphone|ipod|android/i.test(ua) || (window.innerWidth <= 768);
    var isTablet = /ipad|tablet/i.test(ua);
    var deviceType = isTablet ? 'Tablet' : (isMobile ? 'Mobile' : 'Desktop');

    var deviceDetail = '💻 Laptop / PC';
    if (/iphone/i.test(ua)) deviceDetail = '📱 Mobile (iOS)';
    else if (/android/i.test(ua)) deviceDetail = '📱 Mobile (Android)';
    else if (/ipad/i.test(ua)) deviceDetail = '📟 Tablet (iPad)';
    else if (/macintosh|mac os x/i.test(ua)) deviceDetail = '💻 Laptop (macOS)';
    else if (/windows/i.test(ua)) deviceDetail = '💻 Laptop (Windows)';
    else if (/linux/i.test(ua)) deviceDetail = '💻 Laptop (Linux)';

    return {
      device: deviceType,
      deviceDetail: deviceDetail,
      isMobileScreen: isMobile
    };
  }

  // Persistent IDs
  var VISITOR_KEY = '__vp_vid';
  var visitorId = getStorage('localStorage', VISITOR_KEY);
  if (!visitorId) {
    visitorId = 'vis_' + generateUUID().replace(/-/g, '').slice(0, 12);
    setStorage('localStorage', VISITOR_KEY, visitorId);
  }

  var SESSION_KEY = '__vp_sid';
  var LAST_ACTIVITY_KEY = '__vp_last_act';
  var now = Date.now();
  var lastActivity = parseInt(getStorage('sessionStorage', LAST_ACTIVITY_KEY) || '0', 10);
  var sessionId = getStorage('sessionStorage', SESSION_KEY);

  if (!sessionId || (now - lastActivity > 30 * 60 * 1000)) {
    sessionId = 'ses_' + generateUUID().replace(/-/g, '').slice(0, 12);
    setStorage('sessionStorage', SESSION_KEY, sessionId);
  }
  setStorage('sessionStorage', LAST_ACTIVITY_KEY, now.toString());

  // State
  var pageStartTime = Date.now();
  var currentPageUrl = window.location.href;
  var currentPagePath = window.location.pathname + window.location.search;
  var currentPageTitle = document.title;
  var lastUserInteraction = Date.now();
  var clientPublicIp = null;
  var clientGeo = null;
  var utmParams = getUtmParams();
  var deviceMeta = getDeviceDetails();

  // Resolve Real Public IP Client-Side (Non-blocking, 0 permissions)
  function resolvePublicIpClientSide(callback) {
    var timeout = setTimeout(function () {
      if (callback) callback();
    }, 2000);

    fetch('https://api.ipify.org?format=json')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        clearTimeout(timeout);
        if (data && data.ip) {
          clientPublicIp = data.ip;
        }
        if (callback) callback();
      })
      .catch(function () {
        clearTimeout(timeout);
        if (callback) callback();
      });
  }

  function getClientMeta() {
    return {
      screen: window.screen ? window.screen.width + 'x' + window.screen.height : 'unknown',
      viewport: window.innerWidth + 'x' + window.innerHeight,
      language: navigator.language || navigator.userLanguage || 'en',
      timezone: (Intl && Intl.DateTimeFormat) ? Intl.DateTimeFormat().resolvedOptions().timeZone : '',
      userAgent: navigator.userAgent
    };
  }

  function sendPayload(endpoint, data, useBeacon) {
    var payloadString = JSON.stringify(data);
    var targetUrl = apiBase + endpoint;

    if (useBeacon && navigator.sendBeacon) {
      try {
        var blob = new Blob([payloadString], { type: 'application/json' });
        if (navigator.sendBeacon(targetUrl, blob)) {
          return;
        }
      } catch (err) {}
    }

    try {
      fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payloadString,
        keepalive: !!useBeacon
      }).catch(function () {});
    } catch (e) {}
  }

  function trackPageView(isNavigation) {
    pageStartTime = Date.now();
    currentPageUrl = window.location.href;
    currentPagePath = window.location.pathname + window.location.search;
    currentPageTitle = document.title || currentPagePath;
    utmParams = getUtmParams();

    var payload = {
      siteId: siteId,
      visitorId: visitorId,
      sessionId: sessionId,
      url: currentPageUrl,
      pathname: currentPagePath,
      title: currentPageTitle,
      referrer: document.referrer || '',
      isNavigation: !!isNavigation,
      utm: utmParams,
      clientPublicIp: clientPublicIp,
      clientGeo: clientGeo,
      meta: getClientMeta(),
      timestamp: Date.now()
    };

    sendPayload('/track', payload, false);
  }

  function sendHeartbeat() {
    var nowTime = Date.now();
    var tabVisible = document.visibilityState === 'visible';
    var idleTime = nowTime - lastUserInteraction;
    var status = (!tabVisible || idleTime > 45000) ? 'idle' : 'active';

    var payload = {
      siteId: siteId,
      visitorId: visitorId,
      sessionId: sessionId,
      url: currentPageUrl,
      pathname: currentPagePath,
      title: document.title || currentPagePath,
      status: status,
      timeOnPageSeconds: Math.floor((nowTime - pageStartTime) / 1000),
      timestamp: nowTime
    };

    sendPayload('/heartbeat', payload, false);
  }

  function sendLeave() {
    var nowTime = Date.now();
    var payload = {
      siteId: siteId,
      visitorId: visitorId,
      sessionId: sessionId,
      url: currentPageUrl,
      pathname: currentPagePath,
      durationSeconds: Math.floor((nowTime - pageStartTime) / 1000),
      timestamp: nowTime
    };

    sendPayload('/leave', payload, true);
  }

  function recordInteraction() {
    lastUserInteraction = Date.now();
    setStorage('sessionStorage', LAST_ACTIVITY_KEY, lastUserInteraction.toString());
  }

  ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'].forEach(function (evt) {
    window.addEventListener(evt, recordInteraction, { passive: true });
  });

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
      recordInteraction();
      sendHeartbeat();
    } else {
      sendHeartbeat();
    }
  });

  // SPA Route interceptors
  function hookHistory() {
    var pushState = history.pushState;
    if (pushState) {
      history.pushState = function () {
        pushState.apply(this, arguments);
        setTimeout(function () {
          if (window.location.href !== currentPageUrl) {
            trackPageView(true);
          }
        }, 50);
      };
    }

    var replaceState = history.replaceState;
    if (replaceState) {
      history.replaceState = function () {
        replaceState.apply(this, arguments);
        setTimeout(function () {
          if (window.location.href !== currentPageUrl) {
            trackPageView(true);
          }
        }, 50);
      };
    }

    window.addEventListener('popstate', function () {
      setTimeout(function () {
        if (window.location.href !== currentPageUrl) {
          trackPageView(true);
        }
      }, 50);
    });

    window.addEventListener('hashchange', function () {
      if (window.location.href !== currentPageUrl) {
        trackPageView(true);
      }
    });
  }

  window.addEventListener('pagehide', sendLeave);
  window.addEventListener('beforeunload', sendLeave);

  // ==========================================
  // 💬 Interactive On-Page Chatbot Widget
  // ==========================================
  function initChatbotWidget() {
    var isMobile = (window.innerWidth <= 768) || /mobile|android|iphone|ipad/i.test(navigator.userAgent || '');
    
    // If hideOnMobile is requested AND user is on mobile, do not inject widget
    if (hideBotOnMobile && isMobile) {
      return;
    }

    // Styles for on-page widget
    var style = document.createElement('style');
    style.innerHTML = `
      #vp-chat-launcher {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: linear-gradient(135deg, #2563eb, #1d4ed8);
        box-shadow: 0 8px 24px rgba(37, 99, 235, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 999990;
        transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s;
        border: none;
        outline: none;
      }
      #vp-chat-launcher:hover {
        transform: scale(1.08);
        box-shadow: 0 12px 30px rgba(37, 99, 235, 0.5);
      }
      #vp-chat-launcher svg {
        width: 26px;
        height: 26px;
        fill: #ffffff;
      }
      #vp-chat-unread {
        position: absolute;
        top: -2px;
        right: -2px;
        width: 14px;
        height: 14px;
        background-color: #10b981;
        border: 2px solid #ffffff;
        border-radius: 50%;
      }
      #vp-chat-window {
        position: fixed;
        bottom: 92px;
        right: 24px;
        width: 360px;
        max-width: calc(100vw - 32px);
        height: 520px;
        max-height: calc(100vh - 120px);
        background: #111827;
        border: 1px solid #1f2937;
        border-radius: 16px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        display: none;
        flex-direction: column;
        overflow: hidden;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #f3f4f6;
        animation: vpSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes vpSlideUp {
        from { opacity: 0; transform: translateY(16px) scale(0.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      #vp-chat-window.vp-open {
        display: flex;
      }
      .vp-chat-header {
        padding: 14px 18px;
        background: linear-gradient(135deg, #1e293b, #0f172a);
        border-bottom: 1px solid #1f2937;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .vp-header-info {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .vp-bot-avatar {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: linear-gradient(135deg, #3b82f6, #10b981);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
      }
      .vp-header-title {
        font-size: 14px;
        font-weight: 700;
        color: #ffffff;
      }
      .vp-header-sub {
        font-size: 11px;
        color: #34d399;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .vp-header-dot {
        width: 6px;
        height: 6px;
        background-color: #10b981;
        border-radius: 50%;
      }
      .vp-close-btn {
        background: none;
        border: none;
        color: #9ca3af;
        font-size: 18px;
        cursor: pointer;
        padding: 4px;
      }
      .vp-close-btn:hover { color: #ffffff; }
      .vp-chat-body {
        flex: 1;
        padding: 16px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 12px;
        background: #090d16;
      }
      .vp-msg {
        max-width: 82%;
        padding: 10px 14px;
        border-radius: 12px;
        font-size: 13px;
        line-height: 1.45;
        word-break: break-word;
      }
      .vp-msg-bot {
        background: #1f2937;
        color: #f3f4f6;
        align-self: flex-start;
        border-bottom-left-radius: 3px;
      }
      .vp-msg-admin {
        background: #1e3a8a;
        color: #ffffff;
        align-self: flex-start;
        border-bottom-left-radius: 3px;
        border: 1px solid #2563eb;
      }
      .vp-msg-user {
        background: linear-gradient(135deg, #2563eb, #1d4ed8);
        color: #ffffff;
        align-self: flex-end;
        border-bottom-right-radius: 3px;
      }
      .vp-prompt-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 4px;
      }
      .vp-chip {
        background: #1e293b;
        border: 1px solid #334155;
        color: #93c5fd;
        padding: 5px 10px;
        border-radius: 999px;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.15s;
      }
      .vp-chip:hover {
        background: #2563eb;
        color: #ffffff;
        border-color: #2563eb;
      }
      .vp-chat-footer {
        padding: 12px 14px;
        background: #111827;
        border-top: 1px solid #1f2937;
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .vp-chat-input {
        flex: 1;
        background: #090d16;
        border: 1px solid #1f2937;
        border-radius: 20px;
        padding: 8px 14px;
        font-size: 13px;
        color: #ffffff;
        outline: none;
      }
      .vp-chat-input:focus { border-color: #3b82f6; }
      .vp-send-btn {
        background: #2563eb;
        border: none;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        color: #ffffff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .vp-send-btn:hover { background: #1d4ed8; }
    `;
    document.head.appendChild(style);

    // Create launcher button
    var launcher = document.createElement('button');
    launcher.id = 'vp-chat-launcher';
    launcher.setAttribute('aria-label', 'Open support chat');
    launcher.innerHTML = `
      <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
      <div id="vp-chat-unread"></div>
    `;

    // Create chat window
    var chatWindow = document.createElement('div');
    chatWindow.id = 'vp-chat-window';
    chatWindow.innerHTML = `
      <div class="vp-chat-header">
        <div class="vp-header-info">
          <div class="vp-bot-avatar">🤖</div>
          <div>
            <div class="vp-header-title">Live Assistant</div>
            <div class="vp-header-sub"><span class="vp-header-dot"></span>Online</div>
          </div>
        </div>
        <button class="vp-close-btn" id="vp-close-btn" aria-label="Close chat">✕</button>
      </div>
      <div class="vp-chat-body" id="vp-chat-body">
        <div class="vp-msg vp-msg-bot">
          👋 Hello! Welcome to our website. Have any questions? Ask us below!
        </div>
        <div class="vp-prompt-chips">
          <button class="vp-chip" data-prompt="What products or services do you offer?">📦 Services</button>
          <button class="vp-chip" data-prompt="Can you give me pricing details?">💳 Pricing</button>
          <button class="vp-chip" data-prompt="How do I contact customer support?">💬 Contact Support</button>
        </div>
      </div>
      <div class="vp-chat-footer">
        <input type="text" class="vp-chat-input" id="vp-chat-input" placeholder="Type a message...">
        <button class="vp-send-btn" id="vp-send-btn">➤</button>
      </div>
    `;

    document.body.appendChild(launcher);
    document.body.appendChild(chatWindow);

    var isOpen = false;
    launcher.addEventListener('click', function () {
      isOpen = !isOpen;
      if (isOpen) {
        chatWindow.classList.add('vp-open');
        document.getElementById('vp-chat-input').focus();
        document.getElementById('vp-chat-unread').style.display = 'none';
      } else {
        chatWindow.classList.remove('vp-open');
      }
    });

    document.getElementById('vp-close-btn').addEventListener('click', function () {
      isOpen = false;
      chatWindow.classList.remove('vp-open');
    });

    // Chat messaging
    function appendMessage(text, type) {
      var body = document.getElementById('vp-chat-body');
      var div = document.createElement('div');
      div.className = 'vp-msg ' + (type === 'user' ? 'vp-msg-user' : (type === 'admin' ? 'vp-msg-admin' : 'vp-msg-bot'));
      div.textContent = text;
      body.appendChild(div);
      body.scrollTop = body.scrollHeight;
    }

    function sendMessage(text) {
      if (!text || !text.trim()) return;
      var trimmed = text.trim();
      appendMessage(trimmed, 'user');

      // Send to server
      sendPayload('/chat/send', {
        sessionId: sessionId,
        visitorId: visitorId,
        sender: 'visitor',
        message: trimmed,
        timestamp: Date.now()
      }, false);

      // Automated helpful instant response if user uses common inquiries
      setTimeout(function () {
        var lower = trimmed.toLowerCase();
        if (lower.includes('price') || lower.includes('cost') || lower.includes('pricing')) {
          appendMessage('Our plans start with transparent pricing and customizable tiers. An agent has also been notified of your inquiry!', 'bot');
        } else if (lower.includes('service') || lower.includes('product') || lower.includes('offer')) {
          appendMessage('We provide real-time cloud analytics, live presence telemetry, and instant visitor intelligence. Let us know what specific features you need!', 'bot');
        } else if (lower.includes('contact') || lower.includes('support') || lower.includes('help')) {
          appendMessage('Our support team is online and has received your message. Someone will reply shortly right here in this chat!', 'bot');
        } else {
          appendMessage('Thank you for reaching out! Your message was received by our team. Please stay on this page for a live reply.', 'bot');
        }
      }, 700);
    }

    document.getElementById('vp-send-btn').addEventListener('click', function () {
      var input = document.getElementById('vp-chat-input');
      sendMessage(input.value);
      input.value = '';
    });

    document.getElementById('vp-chat-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        sendMessage(this.value);
        this.value = '';
      }
    });

    // Prompt chips click
    document.querySelectorAll('.vp-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var promptText = this.getAttribute('data-prompt');
        sendMessage(promptText);
      });
    });

    // Poll for admin replies every 4s
    var lastCheckedMsgCount = 0;
    setInterval(function () {
      fetch(apiBase + '/chat/history?sessionId=' + encodeURIComponent(sessionId))
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data && data.messages && data.messages.length > lastCheckedMsgCount) {
            var newMsgs = data.messages.slice(lastCheckedMsgCount);
            lastCheckedMsgCount = data.messages.length;
            newMsgs.forEach(function (m) {
              if (m.sender === 'admin') {
                appendMessage('👤 Support: ' + m.message, 'admin');
                if (!isOpen) {
                  document.getElementById('vp-chat-unread').style.display = 'block';
                }
              }
            });
          }
        })
        .catch(function () {});
    }, 4000);
  }

  // Startup initialization
  resolvePublicIpClientSide(function () {
    trackPageView(false);
    hookHistory();
    setInterval(sendHeartbeat, 5000);

    // Initialize chatbot widget when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initChatbotWidget);
    } else {
      initChatbotWidget();
    }
  });

  window.VisitorPulse = {
    getVisitorId: function () { return visitorId; },
    getSessionId: function () { return sessionId; }
  };
})();
