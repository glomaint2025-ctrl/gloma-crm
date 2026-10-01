# Gloma CRM desktop app

A thin Windows wrapper (Electron) around the live CRM at https://gloma-crm.vercel.app.
Because it loads the live site, every deploy reaches the desktop app automatically;
there is nothing to reinstall when the CRM changes.

What the wrapper adds:

- Desktop and Start-menu shortcut, own window and taskbar icon.
- System tray icon. Closing the window hides it to the tray so the end-of-day
  "stop your work timer" reminder keeps working. Use the tray menu to quit.
- Starts with Windows (enabled on first run; toggle it from the tray menu).
- Native notifications and bringing the window to the front for reminders.
- A friendly "can't reach Gloma CRM" page with a retry button when offline.

## Build the installer

```bash
cd desktop
npm install
npm run dist
```

The installer is written to `desktop/dist-installer/Gloma CRM Setup <version>.exe`.
It is not code-signed, so Windows SmartScreen shows "Unknown publisher" the first time:
choose "More info" then "Run anyway".

## Run without building

```bash
cd desktop
npm start
```

To point the app at a different URL (for example a staging deploy), change `APP_URL`
at the top of `main.js`.
