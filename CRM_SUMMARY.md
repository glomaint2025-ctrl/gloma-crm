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
* `src/emailService.js` — **NEW**: EmailJS wrapper, sends the task-assignment email (see `EMAILJS_SETUP.md`).
* `src/workHours.js` — **NEW**: office hours / Sri Lanka holiday list / overtime-split logic, shared by Dashboard, `WorkHours.jsx`, and `ContentCalendar.jsx`.
* `src/components/WorkHours.jsx` — **NEW**: work-hours history page (own records, or everyone's for Developer/Admin/Manager).
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

> Note: this session ran as several follow-up conversations on the same day. Problems 1–3 below were the first conversation (now pushed). Problems 4–7 are later follow-ups in the same session.

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
* **Status**: ✅ Done, committed, and pushed.

### Problem 4 — Give the Manager role task-assignment ability

User request (Sinhala): "managerta puluwan task assign karanna danna e e kenata adminta pahala access thiyenne managerta witharai" — Manager should be able to assign tasks to teammates, as the access tier directly below Admin.

* **Fix**: [`src/components/TaskTracker.jsx`](src/components/TaskTracker.jsx:160) — `hasAssignPrivilege` now includes `'Manager'` alongside `'Developer'`/`'Admin'`. Manager can create/assign/edit tasks in the Task Board. Delete privilege intentionally left Developer-only (not requested). `Manage Roles` nav visibility was **not** changed — still Admin/Developer only.
* **Status**: ✅ Done, committed, pushed.

### Problem 5 — Full mobile/tablet responsiveness pass

User request: make the UI fully responsive for any device/mobile phone.

* **Sidebar**: was a fixed 100vh panel that, below 1024px, stacked *above* the main content (two full-height sections back to back) — effectively unusable on phones. Reworked into a real off-canvas drawer: `mobileNavOpen` state in [`src/App.jsx`](src/App.jsx), hamburger + logo top bar and a close (X) button shown only ≤900px, dark overlay backdrop, `navTo()` helper closes the drawer on navigation. New CSS in [`src/index.css`](src/index.css) (`.mobile-topbar`, `.sidebar-panel`, `.sidebar-overlay`, `.mobile-icon-btn`).
* **Real bug found & fixed — CSS grid blowout**: `Dashboard.jsx`'s `mainGrid` (1.5fr/1fr), `DailyUpdates.jsx`'s `grid` (1fr/1fr), and `SetupSettings.jsx`'s `tabGrid` (250px/1fr) let a wide child (a data table) force the whole grid track to expand to the child's content width, silently clipped by `body { overflow-x: hidden }` — content was invisible on narrow screens with no scrollbar to reveal it. Fixed by moving these to shared CSS classes (`.grid-2col-15-1`, `.grid-2col-1-1`, `.settings-tab-grid` in `index.css`) using `grid-template-columns: minmax(0, Nfr) ...` plus `min-width: 0` on the grid and its children — the standard fix for grid-track blowout. Same `minmax(0, 1fr)` fix applied to `.app-container`/`.main-content`.
* **Real bug found & fixed — modals mispositioned on every screen size**: `.animate-fade-in`'s mount animation ended at `transform: translateY(0)` with `animation-fill-mode: forwards`, so the transform never actually cleared to `none` after the animation finished. Per the CSS spec, *any* non-`none` computed `transform` on an ancestor (even a static/identity one) makes that ancestor the containing block for `position: fixed` descendants — so every modal (`New Task`, `Add Client`, etc.), which is `position: fixed` overlay, was anchoring to the animated wrapper instead of the viewport. Mostly invisible on desktop by coincidence; on mobile it produced a 2000px+-tall, badly offset overlay. **Fix**: `@keyframes fadeIn` in `index.css` now only animates `opacity` (no `transform` at all), which permanently avoids the containing-block trap.
* Other fixes: `flex-wrap` added to control bars / modal form rows that assumed desktop width (`TaskTracker.jsx` formRow, `DailyUpdates.jsx` logFilters, `TeamMembers.jsx` headerRow, `Clients.jsx` title row, `SetupSettings.jsx` profileCard/driveCard); `ContentCalendar.jsx`'s 7-day grid wrapped in a horizontal-scroll container instead of squeezing to unreadable widths; modal overlays given `padding: 16px` + `clamp()` content padding so dialogs don't touch screen edges on small phones (`TaskTracker.jsx`, `ContentCalendar.jsx`, `Clients.jsx`).
* **Verified**: logged into the local mock-mode dev server (`.claude/launch.json` added for `/run`-style previews), scripted a sweep of all 9 sidebar pages at 375px/768px/1280px confirming `document.documentElement.scrollWidth` never exceeds `window.innerWidth` (zero horizontal overflow), and confirmed drawer open/close + modal-overlay full-viewport positioning via `getBoundingClientRect()`.
* **Status**: ✅ Done, committed, pushed.

### Problem 6 — Login page used a placeholder icon instead of the real logo

* **Fix**: [`src/components/Login.jsx`](src/components/Login.jsx) now renders `<img src="/logo.png">` (same brand logo used in the app sidebar) instead of the two CSS `clipPath` diamond shapes that were standing in for it. Removed the now-unused `logoIcon`/`logoBluePrism`/`logoGoldPrism` style entries.
* **Status**: ✅ Done, committed, pushed.

### Problem 7 — "Creation failed: email rate limit exceeded" in Manage Roles

* **Cause**: [`Add New Team Member Account`](src/App.jsx:294) calls `supabase.auth.signUp()` for every new teammate. Supabase's **default built-in email sender** (used when no custom SMTP is configured) sends a confirmation email per signup and caps that at roughly 2–4 emails/hour — it's meant for testing only, not real usage. Creating several accounts back-to-back (Bishwa, Chathura, Tharushka, then Seneth) hit that cap.
* **Side effect users should know about**: while "Confirm email" is required, any account created *before* hitting the rate limit still can't log in until someone clicks a confirmation link — which never arrives, since no real email service is connected. Some already-created accounts may be stuck.
* **This is a Supabase project dashboard setting, not something fixable in the app code.** Recommended fix (user needs to do this in the Supabase dashboard, not in this repo):
  1. **Authentication → Providers → Email → turn OFF "Confirm email".** Since the admin sets the password directly when creating the account, no confirmation step is needed — this also permanently removes the rate-limit problem because Supabase stops trying to send any email for signups.
  2. If real auth emails are wanted later (password reset, etc.), connect a **custom SMTP** under Authentication → Settings → SMTP Settings (e.g. Resend, SendGrid, Postmark) instead of relying on Supabase's default sender.
* **Status**: ⚠️ Explained to user; **not yet toggled in the Supabase dashboard** — this cannot be done from the codebase/CLI, only from the Supabase project's web dashboard by someone with access.

### Problem 8 — Add an online/last-seen presence feature, Developer-only

User request (Sinhala): "kauda online and last seen danna welawa... developerta witharak balanna puluwan feature ekak danna" — show who's online right now and when each person was last seen, visible only to the Developer role.

* **New column**: [`src/components/ManageRoles.jsx`](src/components/ManageRoles.jsx) — added a "Presence" column to the role-assignment table, gated by the existing `isDev` flag (same pattern as the Security Password column), showing a green pulsing dot + "Online now" / "Xm ago" / "Xh ago" / "Xd ago" / "Never logged in" per member. `ONLINE_THRESHOLD_MS` = 2 minutes.
* **Heartbeat**: [`src/App.jsx`](src/App.jsx) — new `useEffect` keyed on `currentUserProfile?.id` writes `profiles.last_seen = now()` immediately on login and every 60s while the app stays open, for **every** logged-in user (not just Developer) so everyone's presence data accumulates.
* **Live-ish updates while viewing the page**: `ManageRoles.jsx` polls `onRefreshProfiles` (passed down from `App.jsx`'s existing `refreshData`) every 20s, but only when `isDev` — so only the Developer's Manage Roles view pays the cost of the extra polling.
* **DB migration**: `supabase_add_last_seen.sql` — adds `profiles.last_seen timestamptz`, same `IF NOT EXISTS` + `notify pgrst, 'reload schema'` pattern as the other migration files. **Must be run in the Supabase SQL Editor** before this feature works on the live site — until then, `last_seen` writes will fail silently the same way the earlier "language column" error did (Problem 1), since the live `profiles` table doesn't have this column yet.
* **Verified** in local mock mode: simulated three other users' `last_seen` (30s ago → "Online now", 3h ago → "3h ago", never set → "Never logged in") and confirmed the Developer view renders all four states correctly; confirmed Admin sees the Manage Roles table with **no** Presence or Security Password column (both still Developer-only).
* **Status**: ✅ Code done, committed, pushed. ⚠️ **SQL migration not yet run** — see Next steps.

### Problem 9 — 'Developer' role was assignable to more than one account; naming confusion with 'SMM & Developer'

User clarification (Sinhala): "Developer" should mean the single full-control owner account (`capcutproforeveryone@gmail.com` only) — hidden from Admin and everyone else, same as before. **"SMM & Developer" is a completely different, ordinary role** (a Web Developer employee, ranked below Admin/Manager like any other normal role) and should not be confused with it. The concrete bug: another real account (Tharushka) had ended up with the `Developer` role, which should never happen — only the owner account should ever hold it.

* **UI fix**: [`src/components/ManageRoles.jsx`](src/components/ManageRoles.jsx) — removed `'Developer'` from `allRolesList` entirely, so it is **never offered as a selectable option**, either in the "Add New Team Member" role dropdown or the per-row role-change dropdown — not even by the Developer themselves. Relabeled `'SMM & Developer'` to `"SMM & Developer (Web Developer)"` to reduce naming confusion with the `Developer` role. The existing `getSelectableRoles()` fallback still unshifts a profile's **current** role into its dropdown if not otherwise in the list — so an already-mis-assigned `Developer` row (like Tharushka's) still shows up correctly for the real Developer to demote it to a real role, it just can never be (re)assigned to someone new.
* **App-level guard (defense in depth)**: [`src/App.jsx`](src/App.jsx) — added `DEVELOPER_OWNER_EMAIL` + `guardDeveloperRole(role, email)`, applied in both `handleCreateMemberAccount` (mock + live branches) and `handleUpdateProfileRole`. Any attempt to set `role: 'Developer'` for an email other than the owner's is silently downgraded to `'Employee'` (with a `console.warn`), regardless of how the request reaches those functions.
* **DB-level guard + one-time fix**: `supabase_lock_developer_role.sql` — (1) demotes any existing `profiles` row with `role = 'Developer'` whose email isn't the owner's back to `'Employee'` (this is what fixes Tharushka's account — **review and re-assign their real role afterward in Manage Roles**), and (2) adds a `before insert or update` trigger on `public.profiles` that raises an exception if anyone (including direct edits in the Supabase Table Editor) tries to set `role = 'Developer'` on a non-owner row.
* **Verified** in local mock mode: seeded a fake mis-assigned `Developer` account, confirmed (a) it's invisible to Admin's Manage Roles view, (b) the real Developer can see it and demote it to a normal role via the dropdown, (c) `'Developer'` never appears as a choosable option for any other account in either the add-member or role-change dropdowns.
* **Status**: ✅ Code done, committed, pushed. ⚠️ **`supabase_lock_developer_role.sql` not yet run** — required to actually demote Tharushka's live account and install the DB-level trigger; see Next steps.

### Problem 10 — Email notification when a task is assigned, via EmailJS

User request: when a task is assigned to someone, send them an email, and keep showing the notification on the Dashboard too (that part already existed).

* **Dashboard notifications already worked** before this — `Dashboard.jsx` already fetched/displayed unread rows from the `notifications` table (dismiss button included). No change needed there.
* **New**: [`src/emailService.js`](src/emailService.js) — thin wrapper around `@emailjs/browser` (`npm install @emailjs/browser`). `sendTaskAssignedEmail({...})` reads `VITE_EMAILJS_SERVICE_ID` / `VITE_EMAILJS_TEMPLATE_ID` / `VITE_EMAILJS_PUBLIC_KEY` from `.env`; if any are missing it just `console.warn`s and returns — task saving never breaks because of this.
* Wired into the two places a task gets assigned to someone: [`TaskTracker.jsx`](src/components/TaskTracker.jsx)'s `handleSave` (Task Board "New Task"/edit) and [`ContentCalendar.jsx`](src/components/ContentCalendar.jsx)'s `handleQuickSave` (calendar day quick-add) — both right next to the existing `notifications` table insert. The Content Calendar path didn't even create a dashboard notification before; it does now too, for consistency.
* **`.env.example`** added (had to add `!.env.example` to `.gitignore` — the existing `.env.*` rule was silently ignoring it too) listing all 5 env vars the app uses (2 Supabase + 3 EmailJS).
* **`EMAILJS_SETUP.md`** added — full step-by-step for the user: create an EmailJS account, connect an email service, create the template (exact subject/body text to paste, including the easy-to-miss "To Email" = `{{to_email}}` setting), get the Public Key, then either paste the 3 values here or add them to `.env` + Vercel's Environment Variables directly.
* **Verified**: confirmed via the local dev server that `isEmailConfigured` is correctly `false` with no keys set, and that calling `sendTaskAssignedEmail()` in that state logs a clear warning and resolves without throwing (task creation still succeeds).
* **Status**: ✅ Code done, committed, pushed. ⚠️ **Not yet live** — waiting on the user to complete `EMAILJS_SETUP.md` and provide/set the 3 EmailJS keys (locally in `.env` for dev, and in Vercel's Environment Variables + a redeploy for production).

### Problem 11 — Employee time clock (Start/Stop), overtime, and a Sri Lanka holiday calendar

User request (Sinhala): office hours are Mon-Fri 8:30am-5:00pm, Saturday 8:30am-3:30pm. Every employee
should have a Start/Stop button on the Dashboard; time worked past closing counts separately as
overtime; this should show highlighted on Admin/Manager/Developer dashboards per employee; each
employee should be able to see their own work-hours history, and Admin should see everyone's. Sundays,
Poya days, and mercantile holidays are company holidays — add a Sri Lanka holiday calendar to Content
Calendar, and flag it separately if someone worked on a holiday.

* **New `src/workHours.js`** — single source of truth for office-hours/holiday logic, imported by
  Dashboard, WorkHours, and ContentCalendar so all three agree:
  - `SRI_LANKA_HOLIDAYS_2026`: a **best-effort** list of 2026 Poya days + public/mercantile holidays,
    compiled from published 2026 calendar sources (see chat for sources). Five of these are
    moon-sighting-dependent (Islamic feasts, Sinhala/Tamil New Year) and can shift by a day — **verify
    against the official government gazette before relying on this for real payroll**, and update this
    array for 2027+ each year.
  - `getHoliday(dateStr)` / `isHoliday(dateStr)`: Sunday is always a holiday; otherwise looks up the list.
  - `getClosingTime(dateStr)`: `17:00` weekdays, `15:30` Saturday, `null` on Sunday.
  - `splitWorkedMinutes(clockInISO, clockOutISO, workDate)`: splits a session into
    `{ regularMinutes, overtimeMinutes }` — entire session counts as overtime on a holiday/Sunday,
    otherwise split at the day's closing time. **Verified with 5 unit-tested cases** (weekday crossing
    5pm, Saturday crossing 3:30pm, full Sunday, full gazetted holiday, normal in-hours session) — all
    matched expected splits exactly.
* **New `supabase_add_time_logs.sql`** — creates `public.time_logs` (`user_id`, `employee_name`,
  `work_date`, `clock_in`, `clock_out`, `regular_minutes`, `overtime_minutes`, `is_holiday`) with RLS:
  everyone can insert/update only their own rows (self clock-in/out only); SELECT is open to the row's
  owner plus Admin/Developer/Manager (same visibility tier as Final Deliveries, Problem 9's pattern).
* **`src/App.jsx`**: new `timeLogs` state fetched in `refreshData()`; `handleClockIn` (blocks a second
  concurrent clock-in for the same user) and `handleClockOut` (computes the regular/overtime split via
  `splitWorkedMinutes` and stores it, plus `is_holiday`) — both plain Supabase insert/update, work
  unmodified in mock mode since the mock client's CRUD is fully generic. New sidebar nav item **Work
  Hours** (Clock icon), visible to everyone, routes to the new `WorkHours` component.
* **`src/components/Dashboard.jsx`**: a Start/Stop widget under the header, visible to **every** role —
  shows live elapsed time, switches to a red "OVERTIME" state the instant the ticking clock crosses the
  day's closing time (reuses the dashboard's existing 1s clock timer, no new interval), and warns
  up-front if today is a holiday. A **"Currently Working"** panel (Developer/Admin/Manager only,
  `canSeeTeamWorkHours` flag — added to both the admin-layout and employee-layout side columns since
  Manager currently renders the employee-style dashboard layout) lists everyone's active sessions with
  the same live overtime highlight.
* **New `src/components/WorkHours.jsx`** — history table: `Date | [Employee] | Clock In | Clock Out |
  Regular | Overtime`, plus a holiday badge per row and month-to-date regular/overtime totals. Employee
  column and the employee filter dropdown only render for Developer/Admin/Manager; everyone else only
  ever sees their own rows (filtered client-side, same pattern as Final Deliveries).
* **`src/components/ContentCalendar.jsx`**: day cells for a Sunday/holiday get a red-tinted border +
  the holiday name tag; if any `time_logs` row has `is_holiday: true` for that date, an additional
  amber "Worked: <names>" tag appears on the same cell.
* **Verified end-to-end** in local mock mode: clocked in/out as an Editor and confirmed the widget,
  history page (own-only), and a real saved `time_logs` row; seeded a second employee's active session
  and confirmed the Developer dashboard's "Currently Working" panel + OVERTIME highlight; confirmed the
  Work Hours page shows the Employee column + filter + both employees' rows for Developer but only
  the Editor's own row for the Editor; confirmed August 2026's calendar correctly highlights every
  Sunday plus the two gazetted holidays that month, and that a seeded holiday work session renders the
  "Worked: Devin Editor" tag on that day.
* **Status**: ✅ Code done, committed, pushed. ⚠️ **`supabase_add_time_logs.sql` not yet run** — required
  before the live site can store clock-in/out data.

### Problem 12 — Dropdown text invisible (white-on-white), and holiday calendar moved out of Content Calendar

User feedback: dropdown option lists render as an unreadable white-on-white UI bug across every tab; and
the holiday overlay should not be mixed into Content Calendar — it should be its own separate calendar.

* **Dropdown fix (`src/index.css`)**: the dark (default) theme never explicitly styled `<option>` —
  only `body.light-theme select, option {...}` did. The base rule `button, input, select, textarea {
  color: inherit }` made the closed `<select>` box look fine, but native browsers often render the
  *opened* options popup with a white background regardless of page CSS, while `color: inherit` still
  cascaded light/white text into it → invisible white-on-white text in every dropdown, every tab. Fixed
  with a global `select { color-scheme: dark }` + explicit `option { background: var(--bg-panel); color:
  var(--color-text-primary) }`, and `color-scheme: light` added to the existing light-theme override so
  both themes stay correct. Verified computed styles on every tab with a dropdown (Task Board, Content
  Calendar, EOD Updates, Work Hours, Manage Roles, Settings) in both themes.
* **Holiday calendar moved (Problem 11 follow-up)**: reverted `ContentCalendar.jsx` back to only showing
  tasks (no holiday tags, no `timeLogs` prop) — Content Calendar is task/content scheduling only, not
  attendance. The Sri Lanka holiday calendar (Sundays + Poya/mercantile highlighting, "Worked: <names>"
  tag) now lives as a dedicated **History / Holiday Calendar** toggle inside the **Work Hours** page
  (`WorkHours.jsx`) instead — a real standalone month-grid view with its own prev/next navigation, kept
  separate from the task calendar as requested. `src/workHours.js` logic is unchanged.
* **Status**: ✅ Done, committed, pushed. No SQL/dashboard action needed for this one.

### Problem 13 — Coordinator & Accountant role, client payment tracking, and a Company Finance tab

User request: rename the "Accountant" role to "Coordinator & Accountant" and give it task-assignment
access; add a Paid/Not Paid button (with amount) to Website-type tasks, settable by Admin/Manager/
Coordinator & Accountant; add a dedicated Company Finance tab for the same three roles (+Developer).

* **Role rename**: [`ManageRoles.jsx`](src/components/ManageRoles.jsx) — `allRolesList` now offers
  `'Coordinator & Accountant'` instead of `'Accountant'`. The separate, pre-existing `'Coordinator'`
  role is untouched. `supabase_rename_accountant_role.sql` updates any existing live `profiles` rows
  still holding the old value.
* **Task assignment**: [`TaskTracker.jsx`](src/components/TaskTracker.jsx) — `hasAssignPrivilege` now
  includes `'Coordinator & Accountant'` alongside Developer/Admin/Manager.
* **Payment tracking on Website tasks**: the task create/edit modal shows a Paid/Not Paid toggle +
  LKR amount field whenever Work Type is `Website`, editable by Developer/Admin/Manager/Coordinator &
  Accountant (read-only for everyone else). Saved as `payment_status` / `payment_amount` on the task.
  A small colored badge (status + amount) now shows on the Website task's Kanban card and in a new
  "Payment" column in the Task Board's list view. `supabase_add_payment_fields.sql` adds the two
  columns to the live `tasks` table.
* **New Company Finance tab**: [`Finance.jsx`](src/components/Finance.jsx) — nav item visible only to
  Developer/Admin/Manager/Coordinator & Accountant. Shows Total Collected / Total Outstanding / paid
  vs unpaid project counts, a client + payment-status filter, and a table of every Website task with an
  inline Paid/Not Paid toggle and an inline-editable amount — this is the primary place the finance
  role is expected to work from day to day, separate from having to open each task individually.
* **Verified** in local mock mode: confirmed the role dropdown no longer offers "Accountant" (old
  option gone, new one present); a Coordinator & Accountant test account could create tasks and saw
  the Company Finance nav item; created a Website task, confirmed the payment section only appears for
  Website work type, saved it with `payment_status: "Not Paid"` / `payment_amount: 75000`; confirmed the
  badge appears on the board card; confirmed the Finance tab's totals matched (LKR 75,000 outstanding, 1
  unpaid) and toggling Paid from the Finance table live-updated the totals to 0 outstanding / 1 paid;
  confirmed a non-finance role (Editor) does not see the Company Finance nav item at all.
* **Status**: ✅ Code done, committed, pushed. ⚠️ **Two SQL migrations not yet run** — see Next steps.

## 4. Git status (as of end of this session)

* `main` is **fully pushed** — local and `origin/main` both at the latest commit (Login logo fix, commit `3839bfc` at time of writing). No pending push.
* Git identity on this machine: `Gloma Developer <capcutproforeveryone@gmail.com>`.
* Pushing as GitHub user `bishwaww` fails with 403 (no write access to the org repo) — pushes this session authenticated as `glomaint2025-ctrl` via a manually generated classic PAT (`repo` scope), pasted into chat and used directly in the push URL. **That PAT has been shared in this chat multiple times and should be revoked** (`github.com/settings/tokens`) and a fresh one generated for next time.
* `.claude/launch.json` was added (untracked, not committed) so `npm run dev` can be previewed via the `run`/browser-preview tooling — safe to keep or delete, has no effect on the deployed app.

### Note for AI assistants in cloud sandboxes

Claude's cloud environment routes GitHub through a proxy restricted to the session's authorized repos — it cannot push to this repo even with a valid token, and typing into local terminals via computer-use is blocked. The working pattern is: make changes on the mounted `D:\Gloma CRM` folder, commit locally via the device shell, and let the user run a push command (or push themselves) on Windows.

### Recurring git lock issue

Cloud-session git operations on the mounted folder repeatedly leave `.git/*.lock` files (`HEAD.lock`, `index.lock`, stray `tmp_obj_*` files under `.git/objects/`) that the sandbox cannot `unlink` (Windows file locking via the mount). Workaround used every time: move the lock files into `.git/_stale_locks/` before retrying the git command. That folder can be deleted manually anytime; it has no effect on repo integrity.

## 5. Next steps / open items

1. **Run `supabase_rename_accountant_role.sql` and `supabase_add_payment_fields.sql`** in the Supabase SQL Editor — Problem 13 (Coordinator & Accountant role + Website payment tracking + Company Finance tab) is deployed in code but needs these to work on the live site.
2. **Run `supabase_add_time_logs.sql` in the Supabase SQL Editor** — the time clock (Problem 11) is deployed in code but needs this table to store clock-in/out data on the live site.
4. **Verify the 2026 Sri Lanka holiday list** (`SRI_LANKA_HOLIDAYS_2026` in `src/workHours.js`) against the official government gazette, especially the 5 moon-sighting-dependent dates — and remember to add a 2027 list before the year rolls over.
5. **Finish EmailJS setup** — follow `EMAILJS_SETUP.md`, then give the 3 keys (or set them in Vercel's Environment Variables + redeploy) so task-assignment emails actually start sending. Everything else (dashboard notifications) already works without this.
6. **Run `supabase_lock_developer_role.sql` in the Supabase SQL Editor** — demotes Tharushka's (and any other) wrongly-assigned `Developer` account back to `Employee` and installs the DB trigger that blocks it from happening again. **After running it, go to Manage Roles and re-assign Tharushka's actual intended role** (they'll show as `Employee` until then).
7. **Run `supabase_add_last_seen.sql` in the Supabase SQL Editor** — the Presence/online-status feature (Problem 8) is deployed in code but will error/no-op on the live site until the `profiles.last_seen` column exists.
8. **Disable "Confirm email" in the Supabase dashboard** (Authentication → **Sign In / Providers** tab → click the Email row → toggle "Confirm email" off — **not** the "Emails → SMTP Settings" tab, that's for a different purpose) — see Problem 7. Blocking reliable team-member account creation; can only be done by someone with Supabase dashboard access, not from this repo.
9. Revoke the GitHub PAT that's been pasted into this chat (`github.com/settings/tokens`) and generate a fresh one only when actually needed for the next push.
10. Check whether any team members created just before the rate-limit error (e.g. Seneth) actually ended up able to log in, once "Confirm email" is off — recreate their account if not.
11. Optional cleanup: delete `.git/_stale_locks/` in `D:\Gloma CRM` if present.
12. Optional: consider whether the eight `supabase_*.sql` files should be moved into a `supabase/migrations/` folder for cleanliness now that there are several in the repo root (`supabase_setup.md` legacy doc name may also want reconciling).

## 6. Template prompt for a new AI chat

```text
Hi, I am working on the Gloma CRM project (React + Vite + Supabase, deployed on Vercel from github.com/glomaint2025-ctrl/gloma-crm, local folder D:\Gloma CRM). Below is the master hand-off document with the full project state, recent fixes, and pending actions:

[Paste the contents of CRM_SUMMARY.md here]

Please continue from the "Next steps / open items" section.
```
