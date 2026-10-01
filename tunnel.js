/**
 * VisitorPulse HTTPS Tunnel Helper
 * Provides a 1-click free public HTTPS URL using Cloudflare / Localtunnel
 * Completely eliminates Chrome's "access other apps" warning & enables tracking on all mobile phones!
 */
const { spawn } = require('node:child_process');

console.log('===========================================================');
console.log('🚀 Starting VisitorPulse HTTPS Tunnel (Port 3030)...');
console.log('===========================================================\n');

// Try localtunnel via npx
const tunnel = spawn('npx', ['-y', 'localtunnel', '--port', '3030'], {
  stdio: ['ignore', 'pipe', 'pipe']
});

tunnel.stdout.on('data', data => {
  const output = data.toString();
  const match = output.match(/https:\/\/[^\s]+/);
  if (match) {
    const httpsUrl = match[0];
    console.log('✅ Public HTTPS Tunnel Active:');
    console.log('👉 Dashboard: ' + httpsUrl + '/');
    console.log('\n📋 Embed this script on your website (Works on Mobile + Desktop, Zero Popups):');
    console.log('-----------------------------------------------------------');
    console.log(`<script src="${httpsUrl}/tracker.js" data-site-id="production" async></script>`);
    console.log('-----------------------------------------------------------');
    console.log('\n💡 Note: Keep this terminal window open while using the tunnel.');
  } else {
    process.stdout.write(output);
  }
});

tunnel.stderr.on('data', data => {
  process.stderr.write(data);
});

tunnel.on('close', code => {
  console.log(`\nTunnel closed (exit code: ${code})`);
});
