# LiveTrack Tracker Integration Guide

This guide details how to install and configure the lightweight `tracker.js` tracking snippet on any website, CMS, or Single Page Application framework.

---

## 1. Quick Install (Standard HTML / PHP)

Paste the following snippet right before the closing `</head>` tag or right before `</body>`:

```html
<!-- LiveTrack Web Analytics -->
<script>
  window.LiveTrackConfig = {
    siteId: "YOUR_SITE_ID", // Replace with your Website ID from LiveTrack dashboard
    endpoint: "https://your-livetrack-api.onrender.com" // Your API endpoint
  };
</script>
<script
  async
  src="https://your-livetrack-api.onrender.com/tracker.js">
</script>
```

---

## 2. Single Page Applications (React, Next.js, Vue, Nuxt, Angular)

`tracker.js` automatically listens to HTML5 History API changes (`pushState`, `replaceState`, and `popstate`), so client-side route changes in React Router, Next.js, Vue Router, etc. are tracked automatically.

### React / Next.js Setup
Add the snippet in your root layout:

```jsx
// app/layout.jsx (Next.js App Router) or index.html (Vite)
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.LiveTrackConfig = {
                siteId: "${process.env.NEXT_PUBLIC_LIVETRACK_SITE_ID}",
                endpoint: "${process.env.NEXT_PUBLIC_LIVETRACK_API_URL}"
              };
            `
          }}
        />
        <script
          async
          src={`${process.env.NEXT_PUBLIC_LIVETRACK_API_URL}/tracker.js`}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

---

## 3. Custom Event Tracking (`LiveTrack.track`)

You can track user conversions, button clicks, form submissions, and purchases using the `LiveTrack.track` global method:

```javascript
// 1. Button click
document.getElementById('cta-btn').addEventListener('click', () => {
  if (window.LiveTrack) {
    window.LiveTrack.track('cta_click', {
      buttonName: 'Get Started Free',
      position: 'hero'
    });
  }
});

// 2. Signup Completed
window.LiveTrack?.track('signup_completed', {
  plan: 'pro_annual',
  source: 'landing_page'
});

// 3. E-commerce Purchase
window.LiveTrack?.track('purchase_completed', {
  orderId: 'ord_9941',
  currency: 'USD',
  total: 89.99,
  itemCount: 2
});
```

> **Privacy Warning**: Never pass personal identifiable information (PII) such as passwords, credit card numbers, or email addresses into event properties. The LiveTrack backend automatically sanitizes incoming event objects.

---

## 4. CMS Integrations

### WordPress
1. Log into your WordPress Admin Dashboard.
2. Go to **Appearance** -> **Theme File Editor** (or use an "Insert Headers and Footers" plugin).
3. Open `header.php` and paste the snippet right before `</head>`.
4. Click **Update File**.

### Shopify
1. In Shopify Admin, navigate to **Online Store** -> **Themes**.
2. Click **...** (Actions) -> **Edit code**.
3. Under **Layout**, select `theme.liquid`.
4. Paste the snippet immediately before `</head>`.
5. Click **Save**.

### Webflow / Squarespace / Wix
1. Navigate to **Site Settings** -> **Custom Code**.
2. Paste the snippet into the **Head Code** input field.
3. Save and publish your website.

---

## 5. Privacy & User Opt-Out

LiveTrack is designed for privacy:
- If a user has `Do Not Track` (DNT) enabled in their browser (`navigator.doNotTrack === '1'`), tracking can optionally be disabled.
- Website owners can respect cookie consent banners:
```javascript
// Only initialize LiveTrack after user grants analytics consent
function onCookieConsentGranted() {
  window.LiveTrackConfig = {
    siteId: "YOUR_SITE_ID",
    endpoint: "https://your-livetrack-api.onrender.com"
  };
  const script = document.createElement('script');
  script.async = true;
  script.src = "https://your-livetrack-api.onrender.com/tracker.js";
  document.head.appendChild(script);
}
```
