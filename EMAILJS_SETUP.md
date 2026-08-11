# EmailJS setup — task-assignment email notifications

The app code is already wired up (`src/emailService.js`, called from `TaskTracker.jsx` and
`ContentCalendar.jsx` whenever a task is newly assigned to someone). It stays silent
(console warning only, nothing breaks) until you provide the 3 EmailJS keys below.

This part has to be done by you in the EmailJS dashboard — I can't create accounts on your behalf.

## Step 1 — Create an EmailJS account

1. Go to https://www.emailjs.com/ → Sign Up (free tier: 200 emails/month, enough for a small team).
2. Verify your email.

## Step 2 — Connect an email service

1. Dashboard → **Email Services** → **Add New Service**.
2. Pick **Gmail** (simplest) or any provider you already use → follow the OAuth/connect flow.
3. Copy the **Service ID** shown after connecting (looks like `service_abc1234`).

## Step 3 — Create the email template

1. Dashboard → **Email Templates** → **Create New Template**.
2. **Settings tab** → set **"To Email"** to `{{to_email}}` (this is what actually routes the email —
   easy to miss).
3. **Content tab** → Subject:
   ```
   New Task Assigned: {{task_title}}
   ```
4. **Content tab** → Body (paste as-is, EmailJS renders `{{variable}}` placeholders):
   ```
   Hi {{to_name}},

   You've been assigned a new task on Gloma CRM.

   Task ID:      {{task_id}}
   Client:       {{client_name}}
   Task:         {{task_title}}
   Work Type:    {{work_type}}
   Priority:     {{priority}}
   Due Date:     {{due_date}}
   Assigned by:  {{assigned_by}}

   Open Gloma CRM: {{portal_url}}

   — Gloma CRM Portal
   ```
5. Save. Copy the **Template ID** shown at the top (looks like `template_xyz9876`).

## Step 4 — Get your Public Key

1. Dashboard → **Account** → **General**.
2. Copy the **Public Key** (safe to use in browser code — this is what it's designed for, unlike
   Supabase's service-role key or a GitHub token).

## Step 5 — Give me the 3 values (or set them yourself)

I need:
- `VITE_EMAILJS_SERVICE_ID`
- `VITE_EMAILJS_TEMPLATE_ID`
- `VITE_EMAILJS_PUBLIC_KEY`

Either paste them here and I'll wire them in, or add them yourself:

**Locally** (`D:\Gloma CRM\.env` — create it from `.env.example`, it's gitignored so it never
gets pushed):
```
VITE_EMAILJS_SERVICE_ID=service_abc1234
VITE_EMAILJS_TEMPLATE_ID=template_xyz9876
VITE_EMAILJS_PUBLIC_KEY=your_public_key_here
```

**On Vercel** (required for the live site — a local `.env` only affects your machine):
Vercel dashboard → this project → **Settings → Environment Variables** → add the same 3 names/values
→ **Redeploy** (env var changes need a fresh deploy to take effect, since Vite bakes them in at build time).

## What already works without any of this

The Dashboard's **notification bell/feed** (unread task-assignment alerts) already works today —
it doesn't depend on EmailJS at all, it's a separate Supabase `notifications` row created at the
same time. EmailJS only adds the *email* on top of that.
