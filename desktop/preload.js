const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('PulseMeetDesktop', {
  isElectron: true,
  platform: process.platform,
  getScreenSources: async (options = { types: ['screen', 'window'] }) => {
    return await ipcRenderer.invoke('get-desktop-sources', options);
  },
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
});
