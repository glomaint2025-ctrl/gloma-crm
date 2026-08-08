# Gloma CRM — Master Context & Hand-off Document

Paste this entire file as the first message of a new AI chat session to continue work on the Gloma CRM project. Last updated: 2026-08-08.

## 1. System Overview & Architecture

The Gloma CRM is a modern, responsive web portal:

* Frontend: React 19 (functional components, hooks) + Lucide icons.
* Build tool: Vite 8 (uses Rolldown bundler).
* Styling: Premium glassmorphism UI with theme-aware CSS variables (Dark/Light mode), gold branding (`--color-gold: #d4af37`).
* Database & Auth: Supabase (dual-mode: offline browser/localStorage simulator by default; connects to production DB when live keys are added to `.env`). **This deployment is running with live Supabase keys — it is NOT in offline sandbox mode.**
* Local project folder: `D:\Gloma CRM` (Windows).
* GitHub repo: `https://github.com/glomaint2025-ctrl/gloma-crm.git` (remote `origin`, branch `main`).
* Live deployment: `https://gloma-crm.vercel.app` — Vercel auto-deploys from the GitHub repo's `main` branch.

### Key files

* `src/App.jsx` — root app, sidebar navigation, session/auth state, data loading.
* `src/components/Dashboard.jsx`, `Clients.jsx`, `TaskTracker.jsx`, `ContentCalendar.jsx`, `DailyUpdates.jsx`, `DeliveredWork.jsx`, `Login.jsx` — main feature views.
* `src/components/TeamMembers.jsx` — **NEW (this session)**: standalone Team Members directory, own sidebar tab, visible to all users.
* `src/components/ManageRoles.jsx` — **NEW (this session)**: standalone role-assignment + "Add New Team Member Account" panel, own sidebar tab, Admin/Developer only.
* `src/components/SetupSettings.jsx` — now scoped to My Account Profile, G-Drive Workspace, Excel Tracker Import, and Developer Preferences only (Team/Roles tabs were extracted out — see Section 3).
* `src/supabaseClient.js` — Supabase client + offline simulator.
* `public/logo.png` — brand logo (128×128 PNG), used in main sidebar and Settings sidebar.
* `public/favicon.svg` — favicon (real SVG embedding the Gloma gem mark, transparent background).
* `supabase_fix_profiles.sql` — **NEW (this session)**: adds missing `profiles`/`system_settings` columns.
* `supabase_fix_team_visibility.sql` — **NEW (this session)**: backfills profiles, adds signup trigger + RLS policies.

## 2. Implemented Features

### A. Strict Role-Based Access Control (RBAC)

* Roles: `Developer`, `Admin`, `Manager`, `Editor`, `Social Media Executive`, `SMM & Developer`, `Accountant`, `Coordinator`, `Marketing Executive`, `Employee`.
* Developer override: sees all accounts, manages metadata, can view/alter all users' passwords (plain-text "Security Password" column in Manage Roles, Developer-only).
* Admin: manages team members and roles BUT cannot see or modify Developer profiles, and cannot assign the Developer role (UI filtering + RLS policies).

### B. My Account Settings (per-user)

* Full Name editing, avatar upload (< 2MB, Base64 via FileReader → `avatar_url`), self password reset.
* Interface language selector: English (en), Sinhala (si), Tamil (ta) — full translation packs exist for the sidebar, Settings, Team Members, and Manage Roles pages.

### C. Team Members Directory (own sidebar tab — NEW placement)

* Visible to **every logged-in user**, not just Admin/Developer.
* Search box (filter by name, email, or role), live member count badge.
* Developer's own profile is still hidden from non-Developer viewers (privacy rule preserved).

### D. Manage Roles (own sidebar tab, Admin + Developer only — NEW placement)

* Inline "Add New Team Member Account" widget (Full Name, Email, Password, Role).
* Session-safe signups — a secondary non-persisted Supabase client is used so the admin is not logged out.
* Role-assignment table + Developer-only plaintext "Security Password" column with inline edit.

### E. Corporate Branding

* Sidebar logo: `<img src="/logo.png">` in `src/App.jsx` (main sidebar) and `src/components/SetupSettings.jsx` (settings sidebar).
* Favicon: `/favicon.svg` referenced from `index.html`.

## 3. Work done in this session (2026-08-08)

### Problem 1 — "Could not find the 'language' column of 'profiles' in the schema cache"

* **Cause**: the app writes `language`, `avatar_url`, `password`, `full_name` etc. to `public.profiles` on every profile save, but the live Supabase table was created without some of these columns. PostgREST rejected the update with a schema-cache error. (This confirmed the deployment is on **live Supabase**, not the offline simulator — the simulator never validates columns.)
* **Fix**: `supabase_fix_profiles.sql` — adds `language`, `avatar_url`, `password`, `full_name`, `email`, `role` to `profiles`, and `language`/`theme`/`font_size`/`primary_color` to `system_settings`, all with `IF NOT EXISTS` guards, ending with `notify pgrst, 'reload schema';`.
* **Status**: ✅ User confirmed the SQL ran successfully in Supabase SQL Editor. Profile save now works.

### Problem 2 — Team Members tab showed only the Developer account

* **Cause** (three possible, all handled): (1) the previously-seen team members (Bishwa Admin, Devin Editor, Sanjeewa SME) were **offline-simulator demo data only** — they were never in the live DB; (2) users who signed up via Supabase Auth had no matching row in `public.profiles`; (3) RLS policies may have restricted visibility to only the caller's own row.
* **Fix**: `supabase_fix_team_visibility.sql` — backfills a `profiles` row for every `auth.users` row missing one, adds an `on_auth_user_created` trigger so every future signup auto-creates a profile, and adds RLS SELECT/UPDATE/INSERT policies matching the app's RBAC (Developer sees all, everyone else sees all except the Developer row).
* **Status**: ✅ Delivered to user; SQL file placed in project folder. User should run the diagnostic query (`select count(*) from auth.users;`) first — if it returns 1, the live DB genuinely has only the Developer account and real teammates must be added via **Manage Roles → Add New Team Member Account** (the old sandbox names will not reappear on their own, they were never real accounts).

### Problem 3 — User request: move "Team" and "Manage Roles" out of System Settings into the main left sidebar

Reasoning given by user: every team member needs to be able to see who's on the team, and that shouldn't be buried inside System Settings (which not everyone opens).

* Created **`src/components/TeamMembers.jsx`** — new standalone page, added as its own left-sidebar nav item (`Users` icon), visible to **all roles**. Includes a search box and member count badge; Developer profile still hidden from non-Developer viewers.
* Created **`src/components/ManageRoles.jsx`** — new standalone page, added as its own left-sidebar nav item (`Shield` icon), visible **only to Admin/Developer** (conditionally rendered in the sidebar). Contains the "Add New Team Member Account" form and the role-assignment table (including the Developer-only plaintext password column), extracted verbatim from the old Settings tab.
* Updated **`src/App.jsx`**: imports the two new components, adds `team` / `roles` sidebar translations (en/si/ta), renders two new nav buttons between "Final Deliveries" and "System Settings", and routes `activeView === 'team'` / `'roles'` to the new components.
* Updated **`src/components/SetupSettings.jsx`**: removed the `team` and `roles` tabs, all their state (`newMemberEmail/Name/Password/Role`, `editingUserId/Password`, `visibleProfiles`, `getSelectableRoles`, `handleRoleChange`, `allRolesList`/`adminRolesList`), and unused icon imports (`Users`, `UserPlus`, `Key`). Settings now only has: My Account Profile, G-Drive Workspace, Excel Tracker Import, Developer Preferences.
* Verified: brace/paren/bracket balance checked programmatically on all four edited/new files (no syntax errors); no dangling references to removed state/functions remained in `SetupSettings.jsx`.
* **Status**: ✅ Done and committed locally. Not yet pushed to GitHub (see Section 4).

## 4. Git status (as of end of this session)

* Local `main` (in `D:\Gloma CRM`), newest first:
  * `c641632` Move Team Members and Manage Roles out of System Settings into main sidebar tabs (Team visible to all users)
  * `2e0691a` Add SQL: backfill profiles, signup trigger, and RLS policies for team directory visibility
  * `92333f7` Add SQL migration: missing profiles/system_settings columns (fixes language column schema-cache error)
  * `0a25914` Update CRM_SUMMARY.md with full session hand-off context
  * `5498d27` Fix favicon: replace mislabeled PNG with valid SVG (Gloma gem mark)
* Remote `origin/main` on GitHub: still at `5498d27` → **4 local commits have NOT been pushed yet.**
* Git identity on this machine: `Gloma Developer <capcutproforeveryone@gmail.com>`.

### ⚠️ PENDING ACTION — push to GitHub

* Pushing as GitHub user `bishwaww` fails with 403 (no write access to the org repo). The push must authenticate as `glomaint2025-ctrl`.
* The earlier `PUSH_TO_GITHUB.bat` one-click script (with an embedded PAT) has already been used and self-deleted — it is **no longer in the folder**.
* To push now: create a new PAT (glomaint2025-ctrl → GitHub Settings → Developer settings → Personal access tokens → classic, `repo` scope) and run in the project folder:
  ```
  git push https://x-access-token:YOUR_TOKEN@github.com/glomaint2025-ctrl/gloma-crm.git main:main
  ```
* Security: any previously shared PAT should be revoked on GitHub once no longer needed.

### Note for AI assistants in cloud sandboxes

Claude's cloud environment routes GitHub through a proxy restricted to the session's authorized repos — it cannot push to this repo even with a valid token, and typing into local terminals via computer-use is blocked. The working pattern is: make changes on the mounted `D:\Gloma CRM` folder, commit locally via the device shell, and let the user run a push command (or push themselves) on Windows.

### Recurring git lock issue

Cloud-session git operations on the mounted folder repeatedly leave `.git/*.lock` files (`HEAD.lock`, `index.lock`, stray `tmp_obj_*` files under `.git/objects/`) that the sandbox cannot `unlink` (Windows file locking via the mount). Workaround used every time: move the lock files into `.git/_stale_locks/` before retrying the git command. That folder can be deleted manually anytime; it has no effect on repo integrity.

## 5. Next steps / open items

1. **Push to GitHub** — generate a fresh PAT for `glomaint2025-ctrl` and run the push command in Section 4 → verify GitHub `main` reaches `c641632` or newer → wait for Vercel deploy → hard refresh (Ctrl+F5) → confirm the new Team/Manage Roles sidebar tabs appear on https://gloma-crm.vercel.app.
2. Run the diagnostic query in `supabase_fix_team_visibility.sql` (`select count(*) from auth.users;`) to confirm whether real teammates exist yet; if the count is 1, add real accounts via **Manage Roles → Add New Team Member Account** (not by trying to "restore" the old sandbox demo names — those were never real accounts).
3. Revoke any shared PAT on GitHub after a successful push.
4. Optional cleanup: delete `.git/_stale_locks/` in `D:\Gloma CRM`.
5. Optional: consider whether `supabase_fix_profiles.sql` / `supabase_fix_team_visibility.sql` should be moved into a `supabase/migrations/` folder for cleanliness now that there are three SQL files in the repo root (`supabase_setup.md` legacy doc name may also want reconciling).

## 6. Template prompt for a new AI chat

```text
Hi, I am working on the Gloma CRM project (React + Vite + Supabase, deployed on Vercel from github.com/glomaint2025-ctrl/gloma-crm, local folder D:\Gloma CRM). Below is the master hand-off document with the full project state, recent fixes, and pending actions:

[Paste the contents of CRM_SUMMARY.md here]

Please continue from the "Next steps / open items" section.
```
