const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell, session, dialog, powerMonitor } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

const APP_URL = 'https://gloma-crm.vercel.app';
const APP_HOST = new URL(APP_URL).host;
const APP_ID = 'lk.gloma.crm';

let mainWindow = null;
let tray = null;
let isQuitting = false;

// The CRM itself is the live website, so every Vercel deploy reaches the desktop
// app automatically; this shell only adds the window, tray, startup and reminders.
app.setAppUserModelId(APP_ID);

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

app.on('second-instance', () => showWindow());

function showWindow() {
  if (!mainWindow) {
    createWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: 'Gloma CRM',
    icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true,
    backgroundColor: '#0a0f1d',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Keep timers (work-hours reminder) running while the window is hidden in the tray.
      backgroundThrottling: false
    }
  });

  mainWindow.loadURL(APP_URL);

  // Offline / unreachable: show a friendly page with a retry button.
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, _desc, validatedURL, isMainFrame) => {
    if (isMainFrame && errorCode !== -3 && validatedURL.startsWith('http')) {
      mainWindow.loadFile(path.join(__dirname, 'offline.html'));
    }
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('app://retry')) {
      event.preventDefault();
      mainWindow.loadURL(APP_URL);
      return;
    }
    // Anything outside the CRM (receipts, external links) opens in the normal browser.
    if (url.startsWith('http') && new URL(url).host !== APP_HOST) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });

  // Closing the window hides it to the tray so reminders keep working.
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // Windows is shutting down / logging off: stop the work timer before the PC goes off.
  mainWindow.on('session-end', () => notifyPcOff());

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Tells the CRM page the PC is going off (shutdown, log off or sleep) so it can stop
// the employee's work timer. If the page cannot finish in time, it closes the session
// at the last moment it was alive the next time the app starts.
function notifyPcOff() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('gloma:pc-off');
  }
}

// The CRM website updates itself on every deploy. This updates the desktop shell
// (tray, icon, startup, reminders) from the newest GitHub Release of the repo.
function sendUpdateStatus(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('gloma:update-status', payload);
  }
}

function setupAutoUpdate() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('download-progress', (progress) => {
    sendUpdateStatus({ state: 'downloading', percent: Math.round(progress.percent) });
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendUpdateStatus({ state: 'downloaded', version: info.version });
    // If nobody is looking at the window, ask with a system dialog instead.
    if (!mainWindow || !mainWindow.isVisible()) {
      dialog.showMessageBox({
        type: 'info',
        buttons: ['Restart now', 'Later'],
        defaultId: 0,
        cancelId: 1,
        title: 'Gloma CRM update',
        message: `Version ${info.version} is ready to install.`,
        detail: 'Restart to finish updating. It will also install automatically the next time the app quits.'
      }).then((result) => {
        if (result.response === 0) installUpdateNow();
      });
    }
  });

  autoUpdater.on('error', (err) => {
    console.error('Auto-update error:', err && err.message);
    sendUpdateStatus({ state: 'error', message: err && err.message });
  });

  ipcMain.handle('gloma:get-version', () => app.getVersion());
  ipcMain.on('gloma:install-update', () => installUpdateNow());
  ipcMain.handle('gloma:check-updates', () => runUpdateCheck());

  if (!app.isPackaged) return;
  runUpdateCheck();
  setInterval(runUpdateCheck, 4 * 60 * 60 * 1000);
}

function installUpdateNow() {
  isQuitting = true;
  autoUpdater.quitAndInstall();
}

// Resolves with { state: 'up-to-date' | 'downloading' | 'error', version?, message? }.
async function runUpdateCheck() {
  if (!app.isPackaged) {
    return { state: 'error', message: 'Updates are only checked in the installed app.' };
  }
  try {
    const result = await autoUpdater.checkForUpdates();
    if (result && result.isUpdateAvailable) {
      return { state: 'downloading', version: result.updateInfo.version };
    }
    return { state: 'up-to-date', version: app.getVersion() };
  } catch (err) {
    console.error('Update check failed:', err && err.message);
    return { state: 'error', message: 'Could not check for updates. Check your internet connection.' };
  }
}

async function checkForUpdatesFromTray() {
  const result = await runUpdateCheck();
  if (result.state === 'up-to-date') {
    dialog.showMessageBox({ type: 'info', message: 'Gloma CRM is up to date.', detail: `Version ${app.getVersion()}` });
  } else if (result.state === 'downloading') {
    dialog.showMessageBox({ type: 'info', message: `Downloading version ${result.version}...`, detail: 'You will be asked to restart when it is ready.' });
  } else {
    dialog.showMessageBox({ type: 'warning', message: 'Could not check for updates.', detail: result.message || '' });
  }
}

function startsWithWindows() {
  return app.getLoginItemSettings().openAtLogin;
}

function buildTrayMenu() {
  return Menu.buildFromTemplate([
    { label: 'Open Gloma CRM', click: () => showWindow() },
    {
      label: 'Start with Windows',
      type: 'checkbox',
      checked: startsWithWindows(),
      click: (item) => {
        app.setLoginItemSettings({ openAtLogin: item.checked, args: ['--hidden'] });
      }
    },
    { label: `Check for updates (v${app.getVersion()})`, click: () => checkForUpdatesFromTray() },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'icon.png')).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  tray.setToolTip('Gloma CRM');
  tray.setContextMenu(buildTrayMenu());
  tray.on('click', () => showWindow());
}

// On the very first run, start with Windows so the 08:30 auto-start and the evening
// reminder work without the employee remembering to open the app. The tray menu
// lets them turn it off.
function applyFirstRunDefaults() {
  const flagFile = path.join(app.getPath('userData'), 'first-run-done');
  if (fs.existsSync(flagFile)) return;
  app.setLoginItemSettings({ openAtLogin: true, args: ['--hidden'] });
  try {
    fs.writeFileSync(flagFile, new Date().toISOString());
  } catch {
    // Not fatal: the setting is simply re-applied on the next first-run check.
  }
}

app.whenReady().then(() => {
  applyFirstRunDefaults();

  // Allow web notifications (the stop-work reminder) for the CRM only.
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const origin = webContents.getURL();
    callback(permission === 'notifications' && origin.startsWith(APP_URL));
  });

  powerMonitor.on('suspend', () => notifyPcOff());
  powerMonitor.on('shutdown', () => notifyPcOff());

  createTray();
  createWindow();
  setupAutoUpdate();

  // Launched by Windows at login: stay in the tray until the reminder needs the window.
  if (process.argv.includes('--hidden') && mainWindow) {
    mainWindow.hide();
  }

  ipcMain.on('gloma:bring-to-front', () => showWindow());
});

app.on('before-quit', () => {
  isQuitting = true;
});

// Keep running in the tray when every window is closed.
app.on('window-all-closed', () => {});

app.on('activate', () => showWindow());
