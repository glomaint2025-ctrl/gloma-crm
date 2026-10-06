const { contextBridge, ipcRenderer } = require('electron');

// Small, fixed API the web app can use to detect the desktop shell, pop the window to
// the front (end-of-day reminder) and check for / install shell updates.
contextBridge.exposeInMainWorld('glomaDesktop', {
  isDesktop: true,
  bringToFront: () => ipcRenderer.send('gloma:bring-to-front'),
  getVersion: () => ipcRenderer.invoke('gloma:get-version'),
  checkForUpdates: () => ipcRenderer.invoke('gloma:check-updates'),
  installUpdate: () => ipcRenderer.send('gloma:install-update'),
  // Fires when the PC shuts down, logs off or goes to sleep; returns an unsubscribe function.
  onPcOff: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('gloma:pc-off', handler);
    return () => ipcRenderer.removeListener('gloma:pc-off', handler);
  },
  // Subscribe to update progress; returns an unsubscribe function.
  onUpdateStatus: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('gloma:update-status', handler);
    return () => ipcRenderer.removeListener('gloma:update-status', handler);
  }
});
