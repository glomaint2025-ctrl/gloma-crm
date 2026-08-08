# Gloma CRM — Master Context & Hand-off Document

> Paste this entire file as the first message of a new AI chat session to continue work on the Gloma CRM project. Last updated: 2026-08-08.

---

## 1. System Overview & Architecture

The Gloma CRM is a modern, responsive web portal:

*   **Frontend**: React 19 (functional components, hooks) + Lucide icons.
*   **Build tool**: Vite 8 (uses Rolldown bundler).
*   **Styling**: Premium glassmorphism UI with theme-aware CSS variables (Dark/Light mode), gold branding (`--color-gold: #d4af37`).
*   **Database & Auth**: Supabase (dual-mode: offline browser/localStorage simulator by default; connects to production DB when live keys are added to `.env`).
*   **Local project folder**: `D:\Gloma CRM` (Windows).
*   **GitHub repo**: `https://github.com/glomaint2025-ctrl/gloma-crm.git` (remote `origin`, branch `main`).
*   **Live deployment**: `https://gloma-crm.vercel.app` — Vercel auto-deploys from the GitHub repo's `main` branch.

### Key files
*   `src/App.jsx` — root app, sidebar navigation, session/auth state, data loading.
*   `src/components/` — `Dashboard`, `Clients`, `TaskTracker`, `ContentCalendar`, `DailyUpdates`, `DeliveredWork`, `Login`, `SetupSettings` (settings + roles + team management).
*   `src/supabaseClient.js` — Supabase client + offline simulator.
*   `public/logo.png` — brand logo (128×128 PNG), used in main sidebar and Settings sidebar.
*   `public/favicon.svg` — favicon (real SVG embedding the Gloma gem mark, transparent background).
*   `supabase_setup.md` — SQL migration scripts.

---

## 2. Implemented Features

### A. Strict Role-Based Access Control (RBAC)
*   Roles: `Developer`, `Admin`, `Manager`, `Editor`, `Social Media Executive`, `SMM & Developer`, `Accountant`, `Coordinator`, `Marketing Executive`, `Employee`.
*   **Developer override**: sees all accounts, manages metadata, can view/alter all users' passwords (plain-text "Security Password" column in Manage Roles, Developer-only).
*   **Admin**: manages team members and roles BUT cannot see or modify Developer profiles, and cannot assign the Developer role (UI filtering + RLS policies).

### B. My Account Settings (per-user)
*   Full Name editing, avatar upload (< 2MB, Base64 via FileReader → `avatar_url`), self password reset.
*   Interface language selector: **English (en)**, **Sinhala (si)**, **Tamil (ta)** — full translation packs exist for the sidebar and Settings.

### C. Administrative Actions (Manage Roles tab)
*   Inline "Add New Team Member Account" widget (Full Name, Email, Password, Role).
*   Session-safe signups — a secondary non-persisted Supabase client is used so the admin is not logged out.

### D. Corporate Branding
*   Sidebar logo: `<img src="/logo.png">` in `src/App.jsx` (main sidebar) and `src/components/SetupSettings.jsx` (settings sidebar).
*   Favicon: `/favicon.svg` referenced from `index.html`.

---

## 3. Issues found & fixed in the last session (2026-08-08)

1.  **Favicon never rendered (FIXED, committed)**: `public/favicon.svg` was actually a **PNG file renamed to .svg** — browsers could not parse it as SVG, so no favicon appeared anywhere (local dev or production). It was replaced with a valid SVG that embeds the Gloma gem mark (64×64, transparent background). Commit: `Fix favicon: replace mislabeled PNG with valid SVG (Gloma gem mark)`.
2.  **Sidebar logo missing on the live site (root cause identified)**: the sidebar `<img>` code and `public/logo.png` are correct locally. The live site was missing the logo **only because the GitHub repo is 3+ commits behind** — the push that contained `logo.png` was rejected (403: `bishwaww` has no write access to `glomaint2025-ctrl/gloma-crm`), so Vercel kept serving an old build. **Once the push goes through, Vercel redeploys and both logo + favicon appear.** (Hard-refresh with Ctrl+F5 after deploy — favicons cache aggressively.)
3.  **Broken `npm run build` inside Linux VMs**: node_modules was installed on Windows, so the Rolldown native binding is win32-only. Build works fine on Windows and on Vercel; don't try to build in a Linux sandbox without reinstalling deps.
4.  **Stale git lock files**: cloud-session git operations on the mounted folder can leave `.git/*.lock` files that can't be unlinked. Any stale locks were moved to `.git/_stale_locks/` — that folder can be deleted manually anytime.

---

## 4. Git status (as of last session)

*   Local `main` (in `D:\Gloma CRM`), newest first:
    *   `5498d27` Fix favicon: replace mislabeled PNG with valid SVG (Gloma gem mark)
    *   `1432a5e` Add CRM summary hand-off documentation
    *   `8aa6c40` Update Gloma logo, favicon, profile settings, and administrative permissions
    *   `a6ffb66` Fix lite mode fonts, sidebar navigation alignment, and color contrast accessibility variables
*   Remote `origin/main` on GitHub: still at **`a6ffb66`** → **the last 3+ local commits have NOT been pushed yet.**
*   Git identity on this machine: `Gloma Developer <capcutproforeveryone@gmail.com>`.

### ⚠️ PENDING ACTION — push to GitHub
*   Pushing as GitHub user `bishwaww` fails with 403 (no write access to the org repo). The push must authenticate as **`glomaint2025-ctrl`**.
*   A one-click script **`PUSH_TO_GITHUB.bat`** exists in `D:\Gloma CRM`. It contains a `glomaint2025-ctrl` Personal Access Token and pushes `main` directly. **Double-click it to push. It deletes itself after running** (so the token isn't left on disk).
*   If the .bat is gone or the token expired: create a new PAT (glomaint2025-ctrl → GitHub Settings → Developer settings → Personal access tokens → classic, `repo` scope) and run in the project folder:
    `git push https://x-access-token:YOUR_TOKEN@github.com/glomaint2025-ctrl/gloma-crm.git main:main`
*   **Security**: the previous PAT was shared in a chat — revoke it on GitHub after the push succeeds.

### Note for AI assistants in cloud sandboxes
Claude's cloud environment routes GitHub through a proxy restricted to the session's authorized repos — it **cannot push to this repo** even with a valid token, and typing into local terminals via computer-use is blocked. The working pattern is: make changes on the mounted `D:\Gloma CRM` folder, commit locally via the device shell, and let the user run a push script (or push themselves) on Windows.

---

## 5. Next steps / open items

1.  Run `PUSH_TO_GITHUB.bat` → verify GitHub `main` is at `5498d27` or newer → wait for Vercel deploy → Ctrl+F5 → confirm logo + favicon on https://gloma-crm.vercel.app.
2.  Revoke the shared PAT on GitHub after a successful push.
3.  Optional: add real Supabase production keys to `.env` (currently the live site runs in offline-simulator mode; the dashboard shows the sandbox banner and localStorage data).
4.  Optional cleanup: delete `.git/_stale_locks/` and `dist/gloma-repo.bundle` in `D:\Gloma CRM`.

---

## 6. Template prompt for a new AI chat

```text
Hi, I am working on the Gloma CRM project (React + Vite + Supabase, deployed on Vercel from github.com/glomaint2025-ctrl/gloma-crm, local folder D:\Gloma CRM). Below is the master hand-off document with the full project state, recent fixes, and pending actions:

[Paste the contents of CRM_SUMMARY.md here]

Please continue from the "Next steps / open items" section.
```
