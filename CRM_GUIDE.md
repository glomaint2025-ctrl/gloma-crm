# Gloma International CRM & Task Management System - Guide

Welcome to the **Gloma International CRM Portal**, a supreme, ClickUp-inspired management suite designed for tracking workflows, client assignments, daily progress logs, and final creative assets. This guide explains all components, roles, tabs, and customization features.

---

## 1. System Roles and Access Levels

The portal utilizes a secure, role-based access control roster. The interface adapts dynamically according to your role.

### A. Developer (`Developer`)
* **Assigned Email:** `capcutproforeveryone@gmail.com`
* **Access Scope:** Full control of the system.
* **Special Rules:** 
  * Only the Developer has access to the **Developer Preferences Console** to set visual parameters globally.
  * The Developer's profile is completely hidden from the user lists and directories viewed by Admin or Employee profiles to maintain strict code authority privacy.
  * Can assign/promote any member to any role, including Developer or Admin.

### B. Administrator (`Admin`)
* **Access Scope:** Management and oversight of all business assets.
* **Special Rules:**
  * Access to the management analytics dashboard (KPI cards, overdue alerts, workloads, and task summaries).
  * Can manage user roles for all profiles except Developer (cannot see or edit the Developer account).
  * Can import bulk task logs via Excel spreadsheets.
  * Full access to create, assign, and update any task.

### C. Team Members (`Editor`, `Social Media Executive`, `SMM & Developer`, etc.)
* **Access Scope:** Focused private workspace environment.
* **Special Rules:**
  * Dashboard is customized as a personal workplace: displays welcome banners with clock widgets, custom task checklists, internal notifications logs, and a synced notebook to write draft updates.
  * Can log their EOD (End of Day) daily updates and submit deliverables.
  * Restricted from altering administrative roles or uploading bulk spreadsheets.

---

## 2. Navigation Tabs and Features

### 📅 1. Dashboard
Renders visual data streams based on who is logged in:
* **Admin / Developer View:**
  * **Work Completion Progress:** Circular gauge showing percentage of tasks completed.
  * **Overdue Alerts Card:** Displays tasks that have passed their due date but are not yet delivered.
  * **Team Workload Breakdown:** Breakdown showing how many tasks are active under each worker.
  * **Status Distribution:** Kanban counts representation (Pending, Approved, In Progress, Delivered).
* **Employee View:**
  * **Assigned Task Board Checklist:** Interactive checklist of tasks specifically assigned to the employee.
  * **Notification Center:** List of notifications triggered whenever the employee gets assigned new work or when deliverables change status.
  * **Scratchpad Sticky Notebook:** Real-time synced notepad to draft notes and keep temporary logs.

### 👥 2. Clients Registry
* **Purpose:** Centralized business directory.
* **Features:**
  * Create, update, or search client profiles by name, company, email, and phone.
  * Active/Inactive status toggle for clients.
  * Integrates with the Task Tracker to ensure tasks are assigned to valid company profiles.

### 📋 3. Task Board
* **Kanban View:** ClickUp-style board where cards are categorized into four columns:
  * *Pending Approval* — Initial drafts awaiting admin review.
  * *Approved* — Verified tasks ready to be worked on.
  * *In Progress* — Work actively being developed.
  * *Delivered* — Completed assets with links.
* **Table List View:** Grid view allowing quick text search, status filters, and priority filtering (High/Normal/Low).
* **Task Card Properties:** Every task references Assigned Date, Due Date, Client, Work Type (Post, Reel, Website, Other), Priority, Progress tracker, and Google Drive links.

### 📆 4. Content Calendar
* **Monthly Grid View:** Visual monthly calendar displaying content tasks colored by work type (e.g. reels, posts).
* **Work Type & Client Filters:** Instantly filters calendar assets by client or media channel.
* **Quick Create Modal:** Click directly on an empty calendar day cell to instantly open a pre-filled task creation draft for that specific date.

### 📤 5. EOD Updates
* **Purpose:** Daily logging of work hours.
* **Features:**
  * Employees submit hours spent on specific tasks, update percentage progress, and note any blocking issues.
  * Updates are logged on a central timeline visible to Admin.

### 💾 6. Final Deliveries
* **Purpose:** Output registries.
* **Features:**
  * Log creative delivery files, draft/final URLs, and platforms (TikTok, Facebook, Web, etc.).
  * Admin can approve or request revisions, automatically updating the linked task status.

### ⚙️ 7. System Settings
* **Category Tabs:**
  * *My Account Profile*: Displays user avatar and active role.
  * *G-Drive Workspace*: Lists shared team folder directories.
  * *Excel Ingest*: Admin uploads spreadsheets to bulk-create tasks.
  * *Member Role Roster*: Admin/Developer assigns authority levels.
  * *Developer Preferences*: Configure visual parameters.

---

## 3. Global Visual & Language Customization

Only the **Developer** can configure these settings globally in System Settings:

1. **Active Language Pack:** Switch interface strings between English, Sinhala (සිංහල), and Tamil (தமிழ்).
2. **System Color Mode:** Switch between Dark Theme (neon navy) and Light Theme (clean slate).
3. **Baseline Font Scale:** Set baseline text sizes (Small, Normal, Large) for readability.
4. **Primary Color Accent:** Set primary gold accents to Gold (`#D4AF37`), Ocean Blue (`#3B82F6`), or Vivid Purple (`#8B5CF6`).

---

## 4. Sandbox vs. Live Database Modes

* **Offline Sandbox:** If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are not set in `.env.local` inside the host environment, the system utilizes simulated databases in localStorage.
* **Sujivi Supabase:** Once env configuration keys are active on Vercel/Localhost, the portal syncs automatically to the PostgreSQL cloud backend, enabling real-time workspace collaboration.
