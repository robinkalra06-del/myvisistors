const { app, BrowserWindow, session, desktopCapturer, ipcMain, Menu } = require('electron');
const path = require('path');

let mainWindow = null;

const PRODUCTION_URL = 'https://pulsemeet-frontend-lj4y.onrender.com';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: 'PulseMeet - Secure Video Conferencing & Presentations',
    backgroundColor: '#0a0f1d',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
    icon: path.join(__dirname, 'icons/icon.png'),
  });

  // Graceful show on ready-to-show
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 1. Auto-grant Camera, Microphone, and Screen Sharing permissions in Electron
  session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    return true;
  });

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true);
  });

  // 2. Native Screen Capture Handler for WebRTC getDisplayMedia
  session.defaultSession.setDisplayMediaRequestHandler(async (request, callback) => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: 400, height: 225 },
        fetchWindowIcons: true,
      });

      if (sources && sources.length > 0) {
        // Default to the entire primary screen
        const streamResponse = { video: sources[0] };
        if (request.audioRequested) {
          streamResponse.audio = 'loopback';
        }
        callback(streamResponse);
      } else {
        callback({});
      }
    } catch (err) {
      console.error('[PulseMeetDesktop] Error in display media request handler:', err);
      callback({});
    }
  });

  // Load live application
  mainWindow.loadURL(PRODUCTION_URL);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 3. Expose IPC for custom screen selection if the web UI requests specific windows
ipcMain.handle('get-desktop-sources', async (event, options) => {
  try {
    const sources = await desktopCapturer.getSources(options || {
      types: ['screen', 'window'],
      thumbnailSize: { width: 320, height: 180 },
    });
    return sources.map((s) => ({
      id: s.id,
      name: s.name,
      thumbnail: s.thumbnail.toDataURL(),
    }));
  } catch (err) {
    console.error('[PulseMeetDesktop] getSources error:', err);
    return [];
  }
});

ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

// App Lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
