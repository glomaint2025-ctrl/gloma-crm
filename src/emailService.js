import emailjs from '@emailjs/browser';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

export const isEmailConfigured = !!(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY);

// Fires the "you were assigned a task" email via EmailJS. Silently no-ops
// (with a console warning) if EmailJS keys haven't been added to .env yet,
// so task saving never breaks because of this.
export async function sendTaskAssignedEmail({
  toEmail,
  toName,
  taskId,
  taskTitle,
  clientName,
  workType,
  priority,
  dueDate,
  assignedBy
}) {
  if (!toEmail) return;

  if (!isEmailConfigured) {
    console.warn('EmailJS is not configured — skipping task-assignment email. Add VITE_EMAILJS_SERVICE_ID / VITE_EMAILJS_TEMPLATE_ID / VITE_EMAILJS_PUBLIC_KEY to .env.');
    return;
  }

  try {
    await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        to_email: toEmail,
        to_name: toName || 'Teammate',
        task_id: taskId || '',
        task_title: taskTitle || '',
        client_name: clientName || 'Gloma Internal',
        work_type: workType || '',
        priority: priority || 'Normal',
        due_date: dueDate || 'Not set',
        assigned_by: assignedBy || 'Gloma CRM Portal',
        portal_url: 'https://gloma-crm.vercel.app'
      },
      { publicKey: PUBLIC_KEY }
    );
  } catch (err) {
    console.error('Failed to send task-assignment email:', err);
  }
}
