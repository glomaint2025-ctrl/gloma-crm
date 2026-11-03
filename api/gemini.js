// Vercel serverless function: the Content Calendar's AI import calls this instead of Gemini
// directly, so the Gemini API key never reaches a browser. It checks the caller is a logged-in
// CRM user, reads the key from the locked app_secrets table, and forwards the request.
//
// Vercel environment variables: SUPABASE_SERVICE_ROLE_KEY (required), SUPABASE_URL (optional,
// falls back to VITE_SUPABASE_URL), GEMINI_API_KEY (optional fallback if no key is saved in the CRM).

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL_RE = /^gemini-[a-z0-9.-]{1,60}$/i;

const send = (res, status, body) => res.status(status).json(body);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { error: { message: 'Method not allowed.' } });
  }

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceKey) {
    return send(res, 500, { error: { code: 'server_not_configured', message: 'The server is missing SUPABASE_SERVICE_ROLE_KEY. Add it in Vercel environment variables and redeploy.' } });
  }

  // 1. Only logged-in CRM users.
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return send(res, 401, { error: { message: 'Please sign in again.' } });

  try {
    const who = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${token}` }
    });
    if (!who.ok) return send(res, 401, { error: { message: 'Your session has expired. Sign in again.' } });

    // 2. The key, from the table browsers cannot read.
    let apiKey = '';
    const secret = await fetch(`${supabaseUrl}/rest/v1/app_secrets?name=eq.gemini_api_key&select=value`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
    });
    if (secret.ok) {
      const rows = await secret.json();
      apiKey = String(rows?.[0]?.value || '').trim();
    }
    if (!apiKey) apiKey = String(process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
      return send(res, 503, { error: { code: 'key_not_configured', message: 'The Gemini API key has not been set up yet. Ask the Developer to add it in the Content Calendar.' } });
    }

    // 3. Forward to Gemini.
    const { model, payload } = req.body || {};
    if (!MODEL_RE.test(String(model || '')) || !payload || typeof payload !== 'object') {
      return send(res, 400, { error: { message: 'Bad request.' } });
    }

    const gemini = await fetch(`${GEMINI_ENDPOINT}/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(payload)
    });
    const text = await gemini.text();
    res.status(gemini.status).setHeader('Content-Type', 'application/json').send(text);
  } catch (err) {
    console.error('gemini proxy failed:', err);
    return send(res, 502, { error: { message: 'Could not reach the AI service. Try again in a moment.' } });
  }
}
