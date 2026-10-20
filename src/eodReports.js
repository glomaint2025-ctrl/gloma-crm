// Role-specific End-of-Day report types. Every report is stored as one daily_updates row:
// `report_type` + the numbers in `report_data` (jsonb), with a readable summary in
// `work_completed` so older screens and exports keep working.

export const REPORT_TYPES = {
  general: {
    label: 'General / Other employees',
    hint: 'For editors, coordinators, managers and anyone whose work is not listed in the other reports.',
    fields: []
  },
  marketing: {
    label: 'Marketing',
    hint: 'Daily messages, calls and orders. Reported to HR every evening.',
    fields: [
      { key: 'messages_received', label: 'Messages received' },
      { key: 'messages_replied', label: 'Messages replied' },
      { key: 'calls_received', label: 'Calls received' },
      { key: 'calls_replied', label: 'Calls replied' },
      { key: 'pending_replies', label: 'Pending replies' },
      { key: 'orders_today', label: "Today's orders" },
      { key: 'orders_completed', label: 'Completed orders' },
      { key: 'orders_processing', label: 'Processing orders' },
      { key: 'orders_returned', label: 'Returned orders' }
    ]
  },
  developer: {
    label: 'Developer',
    hint: 'Development work done today.',
    fields: [
      { key: 'tasks_completed', label: 'Tasks completed' },
      { key: 'features_built', label: 'Features built' },
      { key: 'bugs_fixed', label: 'Bugs fixed' },
      { key: 'deployments', label: 'Deployments / releases' },
      { key: 'code_reviews', label: 'Code reviews' }
    ]
  },
  smm_developer: {
    label: 'SMM & Developer',
    hint: 'Social media management plus web development work done today.',
    fields: [
      { key: 'posts_published', label: 'Posts published' },
      { key: 'stories_reels', label: 'Stories / reels' },
      { key: 'ads_running', label: 'Ad campaigns running' },
      { key: 'leads_inquiries', label: 'Leads / inquiries' },
      { key: 'sites_updated', label: 'Websites updated' },
      { key: 'bugs_fixed', label: 'Bugs fixed' },
      { key: 'deployments', label: 'Deployments / releases' }
    ]
  },
  accountant: {
    label: 'Accountant',
    hint: 'Accounts and billing work done today.',
    fields: [
      { key: 'invoices_issued', label: 'Invoices issued' },
      { key: 'quotations_sent', label: 'Quotations sent' },
      { key: 'payments_received', label: 'Payments received (LKR)', money: true },
      { key: 'payments_made', label: 'Payments made (LKR)', money: true },
      { key: 'expenses_recorded', label: 'Expenses recorded' },
      { key: 'pending_collections', label: 'Pending collections (LKR)', money: true },
      { key: 'payslips_processed', label: 'Payslips processed' }
    ]
  }
};

// Which report a person sees first, based on their role. They can switch to any other.
export function defaultReportType(role) {
  switch (role) {
    case 'Marketing Executive':
      return 'marketing';
    case 'Developer':
      return 'developer';
    case 'SMM & Developer':
      return 'smm_developer';
    case 'Coordinator & Accountant':
      return 'accountant';
    default:
      return 'general';
  }
}

export function reportTypeOf(update) {
  return REPORT_TYPES[update?.report_type] ? update.report_type : 'general';
}

const formatValue = (field, value) => (field.money
  ? Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 })
  : String(value));

// Readable lines such as "Messages received: 42" for the fields that were filled in.
export function metricsSummary(type, data = {}) {
  const config = REPORT_TYPES[type];
  if (!config) return '';
  return config.fields
    .filter(field => data[field.key] !== undefined && data[field.key] !== '')
    .map(field => `${field.label}: ${formatValue(field, data[field.key])}`)
    .join('\n');
}

// Keeps only the numbers the person typed; blank fields are left out.
export function cleanMetrics(type, raw = {}) {
  const config = REPORT_TYPES[type];
  const out = {};
  if (!config) return out;
  config.fields.forEach(field => {
    const value = raw[field.key];
    if (value === '' || value === undefined || value === null) return;
    const num = Number(value);
    if (Number.isFinite(num) && num >= 0) out[field.key] = num;
  });
  return out;
}
