// Shared constants + helpers for the Content Calendar and its AI sheet import.

export const PLATFORMS = [
  { value: 'Facebook', short: 'FB', color: '#1877F2' },
  { value: 'Instagram', short: 'IG', color: '#E1306C' },
  { value: 'TikTok', short: 'TT', color: '#14B8A6' },
  { value: 'LinkedIn', short: 'IN', color: '#0A66C2' }
];

export const platformColor = (name) => (PLATFORMS.find(p => p.value === name) || { color: '#94A3B8' }).color;

// kind decides the legacy work_type that the Task Board / Monthly Plan understand.
export const CONTENT_TYPES = [
  { value: 'Static Post', kind: 'Post' },
  { value: 'Carousel', kind: 'Post' },
  { value: 'Story', kind: 'Post' },
  { value: 'Poster / Flyer', kind: 'Post' },
  { value: 'Reel / Short Video', kind: 'Reel' },
  { value: 'General Video', kind: 'Reel' },
  { value: 'Cinematic Ad', kind: 'Reel' },
  { value: 'BTS Series', kind: 'Reel' },
  { value: 'Client Testimonial', kind: 'Reel' },
  { value: 'Blog / Article', kind: 'Other' },
  { value: 'Website', kind: 'Website' },
  { value: 'Other', kind: 'Other' }
];

const LEGACY_TYPE_LABEL = {
  Post: 'Static Post',
  Reel: 'Reel / Short Video',
  Website: 'Website',
  Other: 'Other'
};

// Calendar items are still rows of the tasks table, so every content type maps back to a
// work_type of Post / Reel / Website / Other (Monthly Plan progress + Task Board rely on it).
export const workTypeFor = (contentType) => {
  const preset = CONTENT_TYPES.find(c => c.value.toLowerCase() === String(contentType || '').toLowerCase());
  if (preset) return preset.kind;
  const text = String(contentType || '').toLowerCase();
  if (/video|reel|ad\b|ads\b|bts|testimonial|short|series|cinematic|film|clip/.test(text)) return 'Reel';
  if (/web/.test(text)) return 'Website';
  return 'Post';
};

// The content type to show / filter on, falling back to the old work_type for older tasks.
export const contentTypeOf = (task) => task.content_type || LEGACY_TYPE_LABEL[task.work_type] || task.work_type || 'Other';

// platforms may come back from Postgres as an array or (mock / hand-edited rows) as text.
export const parsePlatforms = (value) => {
  const list = Array.isArray(value) ? value : String(value || '').split(/[,/&|+]|\band\b/i);
  const found = [];
  list.forEach(raw => {
    const text = String(raw || '').trim().toLowerCase();
    if (!text) return;
    let match = null;
    if (/^(fb|face\s?book|meta)/.test(text)) match = 'Facebook';
    else if (/^(ig|insta)/.test(text)) match = 'Instagram';
    else if (/^(tt|tik\s?-?tok)/.test(text)) match = 'TikTok';
    else if (/^(in|linked\s?-?in)$|^linked/.test(text)) match = 'LinkedIn';
    else if (/^all/.test(text)) PLATFORMS.forEach(p => { if (!found.includes(p.value)) found.push(p.value); });
    if (match && !found.includes(match)) found.push(match);
  });
  return found;
};

export const dateKeyOf = (value) => String(value || '').substring(0, 10);

// GLM-YYMMDD-XXX, unique against everything already used (and ids made in the same batch).
export const makeTaskId = (dateKey, usedIds) => {
  const codeDate = dateKeyOf(dateKey).replace(/-/g, '').substring(2);
  for (let tries = 0; tries < 2000; tries++) {
    const width = tries < 800 ? 3 : 4;
    const min = width === 3 ? 100 : 1000;
    const id = `GLM-${codeDate}-${Math.floor(min + Math.random() * (width === 3 ? 900 : 9000))}`;
    if (!usedIds.has(id)) {
      usedIds.add(id);
      return id;
    }
  }
  const fallback = `GLM-${codeDate}-${Date.now()}`;
  usedIds.add(fallback);
  return fallback;
};

export const statusColor = (status) => (
  status === 'Delivered' ? '#10B981' :
  status === 'In Progress' ? '#3B82F6' :
  status === 'Approved' ? '#8B5CF6' : '#F59E0B'
);

export const CONTENT_FIELD_RE = /content_type|platforms|content_id|concept|caption|image_wording|reference_link|admin_reply/i;
