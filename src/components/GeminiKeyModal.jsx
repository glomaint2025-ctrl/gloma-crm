import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff, Trash2 } from 'lucide-react';
import { hasEnvGeminiKey, maskKey } from '../geminiImport';

// Developer-only: saves the Gemini API key once for the whole team (system_settings.gemini_api_key).
export default function GeminiKeyModal({ savedKey = '', onSave, onClose }) {
  const [draft, setDraft] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const run = async (key, message) => {
    setBusy(true);
    setError('');
    setDone('');
    const result = await onSave(key);
    setBusy(false);
    if (result && result.success === false) {
      setError(result.error || 'Could not save the key.');
      return;
    }
    setDraft('');
    setDone(message);
  };

  const handleSave = () => {
    const key = draft.trim();
    if (!key) { setError('Paste the Gemini API key first.'); return; }
    if (/\s/.test(key)) { setError('A Gemini key has no spaces. Copy it again from Google AI Studio.'); return; }
    run(key, 'Saved. Everyone on the team can now use the AI Sheet Import.');
  };

  const status = savedKey
    ? <>Shared key saved: <strong>{maskKey(savedKey)}</strong></>
    : hasEnvGeminiKey()
      ? 'Using the key from the app settings (.env). Save a key here to override it.'
      : 'No key yet. The AI Sheet Import is disabled until you add one.';

  return (
    <div style={s.overlay}>
      <div className="glass-panel" style={s.modal}>
        <div style={s.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={s.iconBox}><KeyRound size={20} color="var(--color-gold)" /></div>
            <div>
              <h3 style={{ margin: 0 }}>Gemini API Key</h3>
              <div style={s.sub}>Shared with the whole team</div>
            </div>
          </div>
          <button type="button" onClick={onClose} style={s.closeBtn} disabled={busy}>&times;</button>
        </div>

        <div style={s.status}>{status}</div>

        <div>
          <label style={s.label}>{savedKey ? 'Replace key' : 'New key'}</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type={show ? 'text' : 'password'}
              className="form-input"
              style={{ flex: 1 }}
              placeholder="Paste your key from aistudio.google.com/apikey"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              autoComplete="off"
              autoFocus
            />
            <button type="button" className="btn-secondary" onClick={() => setShow(v => !v)} title={show ? 'Hide' : 'Show'} style={{ padding: '0 10px' }}>
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <div style={s.hint}>
            Only the Developer role sees this screen. Other users never type a key, but their browser does use it,
            so restrict it and set a quota in Google AI Studio.
          </div>
        </div>

        {error && <div style={s.error}>{error}</div>}
        {done && <div style={s.ok}>{done}</div>}

        <div style={s.footer}>
          {savedKey ? (
            <button
              type="button"
              className="btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#EF4444' }}
              disabled={busy}
              onClick={() => { if (window.confirm('Remove the shared Gemini key? The AI Sheet Import stops working for everyone until a new key is saved.')) run('', 'Key removed.'); }}
            >
              <Trash2 size={14} /> Remove key
            </button>
          ) : <span />}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>Close</button>
            <button type="button" className="btn-primary" onClick={handleSave} disabled={busy || !draft.trim()}>
              {busy ? 'Saving...' : 'Save key'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '16px'
  },
  modal: {
    width: '100%', maxWidth: '480px', padding: 'clamp(16px, 4vw, 24px)', backgroundColor: 'var(--bg-panel)',
    borderColor: 'var(--border-glass)', maxHeight: '92vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px'
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  iconBox: {
    width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', backgroundColor: 'rgba(212,175,55,0.12)'
  },
  sub: { fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '2px' },
  closeBtn: { fontSize: 'var(--font-size-2xl)', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' },
  status: {
    padding: '10px 12px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-sm)',
    border: '1px dashed rgba(212,175,55,0.35)', backgroundColor: 'rgba(212,175,55,0.06)'
  },
  label: {
    display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'bold', color: 'var(--color-text-secondary)',
    marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em'
  },
  hint: { fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '6px' },
  error: {
    padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-sm)',
    color: '#EF4444', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)'
  },
  ok: {
    padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-sm)',
    color: '#10B981', backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)'
  },
  footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }
};
