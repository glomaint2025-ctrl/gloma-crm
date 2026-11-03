// AI import for the Content Calendar: reads a pasted sheet or an uploaded
// .txt / .csv / .xlsx file, asks Gemini to turn it into content-calendar items,
// then matches clients and team members against what the CRM already knows.
import { CONTENT_TYPES, PLATFORMS, parsePlatforms } from './contentCalendarUtils';

const KEY_STORAGE = 'gloma_gemini_key';
const DEFAULT_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';
const FALLBACK_MODEL = 'gemini-flash-latest';
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

const CHUNK_CHARS = 7000;
const MAX_CHARS = 120000;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

export const getStoredGeminiKey = () => {
  try { return localStorage.getItem(KEY_STORAGE) || ''; } catch { return ''; }
};

export const setStoredGeminiKey = (key) => {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key.trim());
    else localStorage.removeItem(KEY_STORAGE);
  } catch { /* storage blocked: key just won't be remembered */ }
};

// A key typed into the app wins over the one baked in from .env.
export const getGeminiKey = () => getStoredGeminiKey() || (import.meta.env.VITE_GEMINI_API_KEY || '').trim();

export const hasEnvGeminiKey = () => !!(import.meta.env.VITE_GEMINI_API_KEY || '').trim();

// ---- reading files ---------------------------------------------------------

export const readSheetFile = async (file) => {
  if (file.size > MAX_FILE_BYTES) throw new Error('That file is larger than 5 MB. Split it into smaller sheets.');
  const name = file.name.toLowerCase();

  if (/\.(xlsx|xlsm|xls|ods)$/.test(name)) {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
    // Date cells are written as YYYY-MM-DD: the default 11/9/26 is ambiguous (9 Nov or 11 Sep?).
    const cellText = (cell) => {
      if (cell instanceof Date) {
        return `${cell.getFullYear()}-${String(cell.getMonth() + 1).padStart(2, '0')}-${String(cell.getDate()).padStart(2, '0')}`;
      }
      return String(cell ?? '').replace(/[\t\r\n]+/g, ' ').trim();
    };
    const parts = workbook.SheetNames.map(sheetName => {
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: true, defval: '', blankrows: false });
      const lines = rows.map(row => row.map(cellText).join('\t')).filter(line => line.replace(/\t/g, '').trim());
      return lines.length ? `### Sheet: ${sheetName}\n${lines.join('\n')}` : '';
    }).filter(Boolean);
    if (!parts.length) throw new Error('No data found in that workbook.');
    return parts.join('\n\n');
  }

  if (/\.(txt|csv|tsv|md|text)$/.test(name) || file.type.startsWith('text/')) {
    const text = (await file.text()).replace(/^﻿/, '');
    if (!text.trim()) throw new Error('That file is empty.');
    return text;
  }

  throw new Error('Unsupported file type. Use .xlsx, .csv or .txt.');
};

// ---- talking to Gemini -----------------------------------------------------

const ITEM_SCHEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      date: { type: 'STRING' },
      content_type: { type: 'STRING' },
      platforms: { type: 'ARRAY', items: { type: 'STRING' } },
      content_id: { type: 'STRING' },
      title: { type: 'STRING' },
      concept: { type: 'STRING' },
      caption: { type: 'STRING' },
      image_wording: { type: 'STRING' },
      reference_link: { type: 'STRING' },
      assigned_to: { type: 'STRING' },
      client: { type: 'STRING' },
      admin_note: { type: 'STRING' }
    },
    required: ['date', 'title']
  }
};

const buildPrompt = ({ chunk, monthLabel, year, month, today, memberNames, clientNames }) => `
You convert a social-media content plan (pasted from Google Sheets, CSV, Excel or free text) into structured content-calendar items for a marketing agency.

Return ONLY a JSON array. One element per planned post / video / piece of content. Never invent items that are not in the data. Skip header rows, totals and empty rows.

Context:
- Today is ${today}. The plan is for ${monthLabel}. When a date has no year, use ${year}. When it has no month, use month ${String(month + 1).padStart(2, '0')}.
- Dates may be written like "15th Sep", "Sep 15", "15/09", "15-09-2026" or in Sinhala; always output YYYY-MM-DD. If a row truly has no date, output an empty string.
- Content types the agency uses: ${CONTENT_TYPES.map(c => c.value).join(', ')}. Pick the closest one; if the sheet names a clearly different type (e.g. "Gentleman's Guide"), keep the sheet's wording.
- Platforms are only: ${PLATFORMS.map(p => p.value).join(', ')}. A row can have several ("FB/IG/TikTok", "Instagram & TikTok"). "All platforms" means all four. Output full names in the platforms array.
- Team members: ${memberNames.length ? memberNames.join(', ') : '(none known)'}. In assigned_to put the name exactly as written in the sheet (it may be a nickname or first name); empty if none.
- Clients: ${clientNames.length ? clientNames.join(', ') : '(none known)'}. Fill client only if the sheet has a client/page column; otherwise leave it empty.

Field rules:
- title: a short headline (max ~80 chars). Use the concept or content ID text if no title exists.
- content_id: the sheet's own code (e.g. POST-001, REEL-004) or empty.
- concept: the concept / idea / description. Append other useful details (duration, hashtags, notes) to the end.
- caption: the post caption text, kept in its original language.
- image_wording: the text to appear on an image, or the video script / voice-over / scene breakdown.
- reference_link: any URL given as a reference.
- admin_note: any comment or note meant for the admin / manager.
Keep the original language (Sinhala, Tamil, English) of every text field. Do not translate.

DATA:
"""
${chunk}
"""`.trim();

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const callGemini = async ({ prompt, key, model }) => {
  const response = await fetch(`${ENDPOINT}/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 16384,
        responseMimeType: 'application/json',
        responseSchema: ITEM_SCHEMA
      }
    })
  });

  if (!response.ok) {
    let detail = '';
    try { detail = (await response.json())?.error?.message || ''; } catch { /* non-JSON body */ }
    const error = new Error(detail || `Gemini request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }

  const body = await response.json();
  const candidate = body?.candidates?.[0];
  const text = (candidate?.content?.parts || []).map(p => p.text || '').join('').trim();
  if (!text) {
    const reason = body?.promptFeedback?.blockReason || candidate?.finishReason || 'empty response';
    throw new Error(`Gemini returned nothing (${reason}).`);
  }
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const parsed = JSON.parse(cleaned);
  return Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.items) ? parsed.items : []);
};

const friendlyError = (error) => {
  if (error.status === 400 && /api key/i.test(error.message)) return 'The Gemini API key is not valid. Check it and try again.';
  if (error.status === 403) return 'Gemini refused this key (permission denied). Make sure the Generative Language API is enabled for it and that it has no website restriction that blocks this app.';
  if (error.status === 429) return 'Gemini rate limit / free quota reached. Wait a minute and try again.';
  if (error instanceof SyntaxError) return 'Gemini replied with something that was not valid data. Try again, or import a smaller sheet.';
  return error.message || 'Gemini request failed.';
};

const requestWithRetry = async (args) => {
  let model = args.model;
  let triedFallback = false;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await callGemini({ ...args, model });
    } catch (error) {
      if (error.status === 404 && !triedFallback) {
        triedFallback = true;
        model = FALLBACK_MODEL;
        continue;
      }
      const retryable = error.status === 429 || error.status === 503 || error instanceof SyntaxError;
      if (!retryable || attempt === 3) throw new Error(friendlyError(error));
      await sleep(2000 * (attempt + 1));
    }
  }
  return [];
};

export const splitIntoChunks = (text) => {
  const lines = text.split(/\r?\n/);
  const header = lines.find(line => line.trim() && !line.startsWith('### Sheet')) || '';
  const chunks = [];
  let current = [];
  let size = 0;
  lines.forEach(line => {
    if (size + line.length > CHUNK_CHARS && current.length) {
      chunks.push(current.join('\n'));
      current = chunks.length && header ? [`(column header of this sheet, repeated) ${header}`] : [];
      size = 0;
    }
    current.push(line);
    size += line.length + 1;
  });
  if (current.length) chunks.push(current.join('\n'));
  return chunks.filter(chunk => chunk.trim());
};

// Runs every chunk through Gemini. onProgress(done, total) lets the UI show a bar.
export const extractContentItems = async ({ text, key, monthLabel, year, month, memberNames, clientNames, onProgress }) => {
  if (!key) throw new Error('Add your Gemini API key first.');
  const trimmed = text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text;
  const chunks = splitIntoChunks(trimmed);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const all = [];
  for (let i = 0; i < chunks.length; i++) {
    onProgress?.(i, chunks.length);
    const prompt = buildPrompt({ chunk: chunks[i], monthLabel, year, month, today, memberNames, clientNames });
    all.push(...await requestWithRetry({ prompt, key, model: DEFAULT_MODEL }));
  }
  onProgress?.(chunks.length, chunks.length);
  return { items: all, truncated: text.length > MAX_CHARS };
};

// ---- matching Gemini's output to the CRM ------------------------------------

const norm = (value) => String(value || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

export const matchProfile = (name, profiles) => {
  const wanted = norm(name);
  if (!wanted) return null;
  const exact = profiles.filter(p => norm(p.full_name) === wanted);
  if (exact.length === 1) return exact[0];
  const loose = profiles.filter(p => {
    const full = norm(p.full_name);
    return full.includes(wanted) || wanted.includes(full) || full.split(' ').includes(wanted);
  });
  return loose.length === 1 ? loose[0] : null;
};

export const matchClient = (name, clients) => {
  const wanted = norm(name);
  if (!wanted) return null;
  return clients.find(c => norm(c.name) === wanted)
    || clients.find(c => norm(c.name).includes(wanted) || wanted.includes(norm(c.name)))
    || null;
};

const validDate = (value) => {
  const text = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return '';
  const parsed = new Date(`${text}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().substring(0, 10) !== text ? '' : text;
};

const clean = (value) => String(value ?? '').trim();

export const normalizeExtracted = (rawItems, { profiles, clients }) => rawItems.map((raw, index) => {
  const profile = matchProfile(raw.assigned_to, profiles);
  const client = matchClient(raw.client, clients);
  const platforms = parsePlatforms(raw.platforms);
  return {
    key: `row-${index}`,
    selected: true,
    date: validDate(raw.date),
    content_type: clean(raw.content_type) || 'Static Post',
    platforms,
    content_id: clean(raw.content_id),
    title: clean(raw.title) || clean(raw.concept).slice(0, 80) || clean(raw.content_id) || 'Untitled content',
    concept: clean(raw.concept),
    caption: clean(raw.caption),
    image_wording: clean(raw.image_wording),
    reference_link: clean(raw.reference_link),
    admin_reply: clean(raw.admin_note),
    assignee_hint: clean(raw.assigned_to),
    employee_id: profile ? profile.id : '',
    client_name: client ? client.name : ''
  };
});
