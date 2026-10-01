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

## Two kinds of updates

1. **Website changes** (almost everything): push to `main`, Vercel deploys, and the app shows a
   "A new version of Gloma CRM is available - Reload to update" banner within a few minutes
   (or on the next launch). Nothing to install.
2. **Desktop shell changes** (this `desktop/` folder: tray, icon, startup, reminders): publish a
   new GitHub Release. Installed apps check on start and every 4 hours, download the update in
   the background and ask the user to restart. Tray menu -> "Check for updates" does it on demand.

### Publish a shell update

1. Raise `version` in `desktop/package.json` (for example 1.1.0 -> 1.1.1) and commit/push.
2. Build: `cd desktop && npm run dist`.
3. On GitHub create a Release for the repo with tag `v1.1.1` and upload these three files from
   `desktop/dist-installer/`: `Gloma CRM Setup 1.1.1.exe`, `Gloma CRM Setup 1.1.1.exe.blockmap`
   and `latest.yml`. Publish it (not as draft or pre-release).

Or let the build upload them for you: create a GitHub token with repo access, then run
`set GH_TOKEN=<token>` and `npm run release` (creates a draft release; publish it on GitHub).

The repository is public, so the updater needs no token. Employees who still have version 1.0.0
(no updater) must install a newer installer once by hand.

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
