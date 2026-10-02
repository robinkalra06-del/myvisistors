import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('\x1b[36m%s\x1b[0m', `
====================================================================
  🚀 LiveTrack — Real-Time Visitor Analytics & Monitoring Platform
====================================================================
`);

console.log('Starting LiveTrack API Server...\n');

const apiProcess = spawn('node', ['apps/api/src/server.js'], {
  cwd: rootDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: process.env.PORT || '10000',
    NODE_ENV: 'development'
  }
});

apiProcess.on('error', (err) => {
  console.error('\x1b[31mFailed to start LiveTrack API:\x1b[0m', err.message);
});

process.on('SIGINT', () => {
  apiProcess.kill('SIGINT');
  process.exit(0);
});
