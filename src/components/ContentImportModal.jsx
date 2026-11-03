import React, { useRef, useState } from 'react';
import { Sparkles, Upload, ClipboardPaste, KeyRound, Download, ArrowLeft } from 'lucide-react';
import { extractContentItems, normalizeExtracted, readSheetFile, resolveGeminiKey } from '../geminiImport';
import { makeTaskId, workTypeFor, platformColor } from '../contentCalendarUtils';

const SAMPLE_TEMPLATE = [
  'Date\tType\tPlatform\tContent ID\tConcept\tCaption\tImage Wording / Script\tAssigned To\tAdmin Note',
  '2026-11-06\tReel / Short Video\tFacebook/Instagram/TikTok\tREEL-001\tBehind the scenes of our office\tA day with the team! #behindthescenes\tScene 1: arrival. Scene 2: team stand-up.\t\tUse the brand intro',
  '2026-11-09\tStatic Post\tInstagram & TikTok\tPOST-001\tMonthly offer announcement\t20% off this week only\t20% OFF - THIS WEEK ONLY\t\t'
].join('\n');

// Paste a sheet or upload .txt/.csv/.xlsx -> Gemini builds the calendar items -> review -> import.
export default function ContentImportModal({
  clients = [],
  profiles = [],
  tasks = [],
  currentUserProfile = {},
  hasAssignPrivilege,
  defaultClient = '',
  geminiKey = '',
  isDeveloper = false,
  year,
  month,
  monthLabel,
  onImport,
  onOpenKeySettings,
  onClose
}) {
  const fileInput = useRef(null);
  const [tab, setTab] = useState('paste');
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [clientName, setClientName] = useState(defaultClient);
  const [defaultAssignee, setDefaultAssignee] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [rows, setRows] = useState(null);
  const [truncated, setTruncated] = useState(false);

  const effectiveKey = resolveGeminiKey(geminiKey);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    try {
      setText(await readSheetFile(file));
      setFileName(file.name);
    } catch (err) {
      setFileName('');
      setError(err.message);
    }
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_TEMPLATE], { type: 'text/tab-separated-values' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'content-calendar-sample.tsv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAnalyze = async () => {
    setError('');
    if (!text.trim()) { setError('Paste your content plan or upload a file first.'); return; }
    if (!effectiveKey) { setError('The Gemini API key has not been set up yet.'); return; }

    setBusy(true);
    setProgress('Reading your sheet with Gemini...');
    try {
      const { items, truncated: wasTruncated } = await extractContentItems({
        text,
        key: effectiveKey,
        monthLabel,
        year,
        month,
        memberNames: profiles.map(p => p.full_name).filter(Boolean),
        clientNames: clients.map(c => c.name),
        onProgress: (done, total) => setProgress(total > 1 ? `Analysing part ${Math.min(done + 1, total)} of ${total}...` : 'Analysing...')
      });
      const normalized = normalizeExtracted(items, { profiles, clients });
      if (!normalized.length) {
        setError('Gemini could not find any content items in that data. Check the sheet has dates and concepts.');
      } else {
        setRows(normalized);
        setTruncated(wasTruncated);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  const updateRow = (key, patch) => setRows(prev => prev.map(r => r.key === key ? { ...r, ...patch } : r));

  const importable = (rows || []).filter(r => r.selected && r.date);
  const missingDate = (rows || []).filter(r => r.selected && !r.date).length;
  const needsClient = importable.some(r => !r.client_name) && !clientName;

  const handleImport = async () => {
    if (!importable.length) return;
    if (needsClient) { setError('Choose which client these items are for.'); return; }
    setError('');

    const used = new Set(tasks.map(t => t.id));
    const now = new Date().toISOString();
    const built = importable.map(r => {
      const client = clients.find(c => c.name === (r.client_name || clientName));
      const assigneeId = hasAssignPrivilege ? (r.employee_id || defaultAssignee) : currentUserProfile.id;
      const profile = profiles.find(p => p.id === assigneeId);
      const task = {
        id: makeTaskId(r.date, used),
        created_at: now,
        date_assigned: r.date,
        start_date: r.date,
        due_date: r.date,
        employee_id: profile ? profile.id : null,
        employee_name: profile ? profile.full_name : 'Unassigned',
        client_id: client ? client.id : null,
        client_project: r.client_name || clientName,
        work_type: workTypeFor(r.content_type),
        title: r.title,
        priority: 'Normal',
        status: hasAssignPrivilege ? 'Pending Approval' : 'In Progress',
        progress: 0.0,
        last_updated: now,
        content_type: r.content_type,
        platforms: r.platforms,
        content_id: r.content_id,
        concept: r.concept,
        caption: r.caption,
        image_wording: r.image_wording,
        reference_link: r.reference_link
      };
      if (hasAssignPrivilege) task.admin_reply = r.admin_reply;
      else task.created_by = currentUserProfile.id;
      return task;
    });

    setBusy(true);
    const result = await onImport(built);
    setBusy(false);
    if (result && result.success === false) {
      setError(result.error || 'Import failed.');
      return;
    }
    onClose();
  };

  return (
    <div style={s.overlay}>
      <div className="glass-panel" style={s.modal}>
        <div style={s.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={s.iconBox}><Sparkles size={20} color="var(--color-gold)" /></div>
            <div>
              <h3 style={{ margin: 0 }}>AI Content Sheet Import <span style={s.badge}>Powered by Gemini</span></h3>
              <div style={s.sub}>Target month: <strong>{monthLabel}</strong></div>
            </div>
          </div>
          <button type="button" onClick={onClose} style={s.closeBtn} disabled={busy}>&times;</button>
        </div>

        {!rows ? (
          <>
            <div style={s.row}>
              <div style={s.tabs}>
                <button type="button" onClick={() => setTab('paste')} style={{ ...s.tab, ...(tab === 'paste' ? s.tabOn : {}) }}>
                  <ClipboardPaste size={14} /> Paste data
                </button>
                <button type="button" onClick={() => setTab('file')} style={{ ...s.tab, ...(tab === 'file' ? s.tabOn : {}) }}>
                  <Upload size={14} /> Upload file
                </button>
              </div>
              <button type="button" onClick={downloadSample} style={s.linkBtn}><Download size={13} /> Sample template</button>
            </div>

            {!effectiveKey && (
              <div style={s.keyBox}>
                <div style={{ fontSize: 'var(--font-size-sm)', marginBottom: isDeveloper ? '8px' : 0 }}>
                  <KeyRound size={13} style={{ verticalAlign: '-2px', marginRight: '6px' }} />
                  The Gemini API key has not been set up yet.
                  {!isDeveloper && ' Ask the Developer to add it from the Content Calendar.'}
                </div>
                {isDeveloper && onOpenKeySettings && (
                  <button type="button" className="btn-primary" style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)' }} onClick={onOpenKeySettings}>
                    Add Gemini key
                  </button>
                )}
              </div>
            )}

            <div style={s.row}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={s.label}>Client</label>
                <select className="form-input" value={clientName} onChange={(e) => setClientName(e.target.value)}>
                  <option value="">Choose client</option>
                  {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  <option value="Gloma Internal">Gloma Internal</option>
                </select>
              </div>
              {hasAssignPrivilege && (
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={s.label}>Assign unmatched items to</label>
                  <select className="form-input" value={defaultAssignee} onChange={(e) => setDefaultAssignee(e.target.value)}>
                    <option value="">Unassigned</option>
                    {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                  </select>
                </div>
              )}
            </div>

            {tab === 'file' && (
              <div style={s.drop} onClick={() => fileInput.current?.click()}>
                <Upload size={24} color="var(--color-gold)" />
                <strong>{fileName || 'Click to select an Excel (.xlsx), CSV or TXT file'}</strong>
                <span style={s.hint}>Google Sheets exports, Excel spreadsheets, CSV and plain text all work.</span>
                <input ref={fileInput} type="file" accept=".xlsx,.xls,.csv,.tsv,.txt" style={{ display: 'none' }} onChange={handleFile} />
              </div>
            )}

            <div>
              <label style={s.label}>{tab === 'file' ? 'Extracted sheet content (editable)' : 'Paste data below (from Google Sheets, CSV or AI output)'}</label>
              <textarea
                className="form-input"
                rows={tab === 'file' ? 7 : 11}
                style={{ fontFamily: 'monospace', fontSize: '12px' }}
                placeholder={'Copy columns from your sheet and paste here...\n\nExample columns:\nDate | Type | Platform | Content ID | Concept | Caption | Image Wording / Script | Assigned To | Admin Note'}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>

            <div style={s.infoBox}>
              Columns can be in any order and written in Sinhala, Tamil or English, with dates like "15th Sep". Gemini maps
              everything to content type, platforms, assignee, caption and script. You review the result before anything is saved.
            </div>
          </>
        ) : (
          <>
            <div style={s.row}>
              <button type="button" onClick={() => { setRows(null); setError(''); }} style={s.linkBtn}><ArrowLeft size={13} /> Back to data</button>
              <span style={s.hint}>
                {importable.length} of {rows.length} ready to import
                {missingDate > 0 && <strong style={{ color: '#EF4444' }}> · {missingDate} need a date</strong>}
              </span>
            </div>

            {truncated && <div style={s.warn}>That sheet was very long, so only the first part was analysed. Import it in smaller sections for the rest.</div>}

            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>
                      <input
                        type="checkbox"
                        checked={rows.every(r => r.selected)}
                        onChange={(e) => setRows(prev => prev.map(r => ({ ...r, selected: e.target.checked })))}
                      />
                    </th>
                    <th style={s.th}>Date</th>
                    <th style={s.th}>Content</th>
                    <th style={s.th}>Platforms</th>
                    {hasAssignPrivilege && <th style={s.th}>Assignee</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.key} style={{ opacity: r.selected ? 1 : 0.45 }}>
                      <td style={s.td}>
                        <input type="checkbox" checked={r.selected} onChange={(e) => updateRow(r.key, { selected: e.target.checked })} />
                      </td>
                      <td style={s.td}>
                        <input
                          type="date"
                          value={r.date}
                          onChange={(e) => updateRow(r.key, { date: e.target.value })}
                          className="form-input"
                          style={{ padding: '4px 6px', minWidth: '130px', borderColor: r.date ? undefined : '#EF4444' }}
                        />
                      </td>
                      <td style={s.td}>
                        <div style={{ fontWeight: 600 }}>{r.content_id && <span style={s.code}>{r.content_id}</span>}{r.title}</div>
                        <div style={s.hint}>{r.content_type}{r.concept ? ` · ${r.concept.slice(0, 90)}` : ''}</div>
                      </td>
                      <td style={s.td}>
                        {r.platforms.length ? r.platforms.map(p => (
                          <span key={p} style={{ ...s.chip, color: platformColor(p), borderColor: platformColor(p) }}>{p}</span>
                        )) : <span style={s.hint}>none</span>}
                      </td>
                      {hasAssignPrivilege && (
                        <td style={s.td}>
                          <select
                            className="form-input"
                            style={{ padding: '4px 6px', minWidth: '130px' }}
                            value={r.employee_id}
                            onChange={(e) => updateRow(r.key, { employee_id: e.target.value })}
                          >
                            <option value="">{r.assignee_hint ? `No match: "${r.assignee_hint}"` : 'Default'}</option>
                            {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                          </select>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {error && <div style={s.error}>{error}</div>}
        {busy && progress && <div style={s.hint}>{progress}</div>}

        <div style={s.actions}>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          {!rows ? (
            <button type="button" className="btn-primary" onClick={handleAnalyze} disabled={busy || !text.trim()}>
              <Sparkles size={14} style={{ verticalAlign: '-2px' }} /> {busy ? 'Analysing...' : 'Analyze with AI'}
            </button>
          ) : (
            <button type="button" className="btn-primary" onClick={handleImport} disabled={busy || !importable.length}>
              {busy ? 'Importing...' : `Import ${importable.length} item${importable.length === 1 ? '' : 's'}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 999, backdropFilter: 'blur(4px)', padding: '16px'
  },
  modal: {
    width: '100%', maxWidth: '860px', padding: 'clamp(16px, 4vw, 24px)', backgroundColor: 'var(--bg-panel)',
    borderColor: 'var(--border-glass)', maxHeight: '92vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px'
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  iconBox: {
    width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', backgroundColor: 'rgba(212,175,55,0.12)'
  },
  badge: {
    marginLeft: '8px', padding: '2px 8px', fontSize: '10px', textTransform: 'uppercase', borderRadius: '999px',
    backgroundColor: 'rgba(139,92,246,0.15)', color: '#8B5CF6', verticalAlign: 'middle'
  },
  sub: { fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '2px' },
  closeBtn: { fontSize: 'var(--font-size-2xl)', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' },
  row: { display: 'flex', gap: '12px', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap' },
  tabs: {
    display: 'inline-flex', gap: '4px', padding: '4px', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-subtle)', backgroundColor: 'rgba(17,24,39,0.3)'
  },
  tab: {
    display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', border: 'none', background: 'none',
    color: 'var(--color-text-secondary)', cursor: 'pointer', borderRadius: '6px', fontSize: 'var(--font-size-sm)', fontWeight: 600
  },
  tabOn: { backgroundColor: 'rgba(212,175,55,0.15)', color: 'var(--color-gold)' },
  linkBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none',
    color: 'var(--color-gold)', cursor: 'pointer', fontSize: 'var(--font-size-xs)', fontWeight: 600
  },
  label: {
    display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'bold', color: 'var(--color-text-secondary)',
    marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em'
  },
  hint: { fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' },
  keyBox: { padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px dashed rgba(212,175,55,0.35)', backgroundColor: 'rgba(212,175,55,0.06)' },
  drop: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '22px',
    border: '2px dashed var(--border-glass)', borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'center'
  },
  infoBox: {
    padding: '10px 12px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-secondary)', backgroundColor: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)'
  },
  warn: { padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-xs)', color: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.1)' },
  error: { padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-sm)', color: '#EF4444', backgroundColor: 'rgba(239,68,68,0.1)' },
  tableWrap: { maxHeight: '48vh', overflow: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' },
  th: {
    position: 'sticky', top: 0, textAlign: 'left', padding: '8px', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase',
    color: 'var(--color-text-secondary)', backgroundColor: 'var(--bg-panel)', borderBottom: '1px solid var(--border-subtle)'
  },
  td: { padding: '6px 8px', verticalAlign: 'top', borderBottom: '1px solid var(--border-subtle)' },
  code: { fontFamily: 'monospace', fontSize: '10px', marginRight: '6px', padding: '1px 5px', borderRadius: '4px', backgroundColor: 'var(--bg-badge-dark)' },
  chip: { display: 'inline-block', margin: '0 4px 4px 0', padding: '1px 7px', fontSize: '10px', fontWeight: 700, borderRadius: '999px', border: '1px solid' },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '12px' }
};
