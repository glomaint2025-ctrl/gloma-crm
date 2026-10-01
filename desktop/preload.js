const { contextBridge, ipcRenderer } = require('electron');

// Small, fixed API the web app can use to detect the desktop shell and to pop the
// window to the front (used by the "stop your work timer" reminder).
contextBridge.exposeInMainWorld('glomaDesktop', {
  isDesktop: true,
  bringToFront: () => ipcRenderer.send('gloma:bring-to-front')
});
