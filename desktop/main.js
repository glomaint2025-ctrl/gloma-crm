const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell, session, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

const APP_URL = 'https://gloma-crm.vercel.app';
const APP_HOST = new URL(APP_URL).host;
const APP_ID = 'lk.gloma.crm';

let mainWindow = null;
let tray = null;
let isQuitting = false;
let manualUpdateCheck = false;

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

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// The CRM website updates itself on every deploy. This updates the desktop shell
// (tray, icon, startup, reminders) from the newest GitHub Release of the repo.
function setupAutoUpdate() {
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-downloaded', (info) => {
    manualUpdateCheck = false;
    dialog.showMessageBox({
      type: 'info',
      buttons: ['Restart now', 'Later'],
      defaultId: 0,
      cancelId: 1,
      title: 'Gloma CRM update',
      message: `Version ${info.version} is ready to install.`,
      detail: 'Restart to finish updating. It will also install automatically the next time the app quits.'
    }).then((result) => {
      if (result.response === 0) {
        isQuitting = true;
        autoUpdater.quitAndInstall();
      }
    });
  });

  autoUpdater.on('update-not-available', () => {
    if (manualUpdateCheck) {
      manualUpdateCheck = false;
      dialog.showMessageBox({ type: 'info', message: 'Gloma CRM is up to date.', detail: `Version ${app.getVersion()}` });
    }
  });

  autoUpdater.on('error', (err) => {
    console.error('Auto-update error:', err && err.message);
    if (manualUpdateCheck) {
      manualUpdateCheck = false;
      dialog.showMessageBox({ type: 'warning', message: 'Could not check for updates.', detail: 'Check your internet connection and try again.' });
    }
  });

  const check = () => autoUpdater.checkForUpdates().catch((err) => {
    console.error('Update check failed:', err && err.message);
  });

  check();
  setInterval(check, 4 * 60 * 60 * 1000);
}

function checkForUpdatesNow() {
  if (!app.isPackaged) {
    dialog.showMessageBox({ type: 'info', message: 'Updates are only checked in the installed app.' });
    return;
  }
  manualUpdateCheck = true;
  autoUpdater.checkForUpdates().catch(() => {});
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
    { label: `Check for updates (v${app.getVersion()})`, click: () => checkForUpdatesNow() },
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
