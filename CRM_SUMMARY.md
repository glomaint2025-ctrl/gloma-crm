# Gloma CRM - System Overview & Implementation Report

This document summarizes the current status, architecture, visual customization, and security structures of the Gloma CRM portal. It serves as a master context document to feed directly into new AI sessions/chats.

---

## 1. System Overview & Architecture
The Gloma CRM is a modern, responsive web portal developed with:
*   **Frontend**: React (functional components, hook state) + Lucide Icons.
*   **Build Tool**: Vite (configured for rapid builds).
*   **Styling**: Premium Glassmorphism UI using theme-aware CSS variables for seamless Dark Mode / Light Mode styling, typography settings, and gold branding.
*   **Database & Auth**: Supabase (dual-mode environment: runs on local/browser storage simulator by default; connects to production database when live keys are added to `.env`).

---

## 2. Implemented Features & Upgrades
Here is the checklist of the features completed and coded:

### A. Strict Role-Based Access Control (RBAC)
*   **Multi-tier Roles**: `Developer`, `Admin`, `Manager`, `Editor`, `SMM & Developer`, `Accountant`, `Coordinator`, `Marketing Executive`, and `Employee`.
*   **Developer override**: Developers can see all accounts, manage metadata, and view/alter all users' passwords.
*   **Admin privileges**: Admins can manage team members and allocate roles BUT cannot view, select, or modify any Developer profile (enforced via UI filtering and RLS policies).

### B. Individual User Customizations (My Account Settings)
*   **Identity Modification**: Users can update their Full Name.
*   **Avatar Picture Upload**: Supports user profile photo selection with a strict `< 2MB` size validator, converting the file to Base64 data URLs via `FileReader` to submit to `avatar_url` database fields.
*   **Interface Language Selection**: Integrated a dropdown list supporting **English (en)**, **Sinhala (si)**, and **Tamil (ta)**. Selecting a language changes the active interface translation pack.
*   **Self Password resetting**: Secure password update form synced with Auth triggers.

### C. Advanced Administrative Actions ("Manage Roles")
*   **Team Member Registration Widget**: Installed a creation panel to add accounts inline (Full Name, Email, Password, Role).
*   **Session-Safe Signups**: Uses a secondary non-persisted client to sign up new accounts so administrators are not logged out of their own active session.
*   **Developer Credentials Overlay**: Renders a dedicated "Security Password" column inside the profiles table *only* when the active user is a `Developer`, showing passwords in plain-text with inline change credentials fields.

### D. Corporate Branding
*   **Logo & Favicon**: Replaced generic shape divs with your brand logo (`/logo.png`) inside the main sidebar and Settings navigation area, and aligned the browser favicon (`favicon.svg`).

---

## 3. Current Git & File Status
All source files have been changed, verified via production build compilation (`npm run build`), and committed successfully *locally* under:
*   **Commit Message**: `Update Gloma logo, favicon, profile settings, and administrative permissions`
*   **Modified Files**:
    *   `src/App.jsx`
    *   `src/components/SetupSettings.jsx`
    *   `src/supabaseClient.js`
    *   `public/favicon.svg` (New asset)
    *   `public/logo.png` (New asset)
    *   `supabase_setup.md` (SQL migration scripts)

---

## 4. Git Push & Vercel Deploy Troubleshooting
Your push to `glomaint2025-ctrl/gloma-crm.git` was rejected with the following error:
> `remote: Permission to glomaint2025-ctrl/gloma-crm.git denied to bishwaww.`
> `fatal: unable to access ... returned error: 403`

### How to Fix & Deploy:
Since `bishwaww` does not have write/push access to that specific organization repository, you can push the code to your own GitHub repository:

1. **Create a new repository** on your personal GitHub account (e.g. `gloma-crm`).
2. **Point your local repo to the new URL** in your command line:
   ```bash
   # Remove the old remote
   git remote remove origin
   
   # Add your new repository remote URL
   git remote add origin https://github.com/bishwaww/YOUR_NEW_REPO_NAME.git
   ```
3. **Push the committed code**:
   ```bash
   git push -u origin main
   ```
4. **Connect Vercel**: Connect your new personal GitHub repository inside Vercel Dashboard to build and deploy it live automatically.

---

## 5. Template Prompt for your next Claude Chat
When starting a new session in Claude, copy and paste the prompt below as the first message:

```text
Hi Claude, I am working on the Gloma CRM project. Here is the master overview and update file for the CRM:

[Copy-paste the contents of CRM_SUMMARY.md here]

All the code modifications are fully written, built, and committed locally in my workspace. Please help me review the current codebase, fix repository push issues, or implement further features from here.
```
