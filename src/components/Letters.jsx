import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Undo2, Redo2, Table, Image as ImageIcon, Link2, Minus, Eraser,
  Indent, Outdent, FileDown, Printer, Save, FilePlus, Trash2, Eye, Mail, AlertTriangle, CalendarDays
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { pdfFileName } from '../pdfExport';
import { COMPANY_PROFILE, formatLongDate } from '../invoiceUtils';
import { toLocalDateStr } from '../payrollUtils';
import { CONTENT_W, CONTENT_H, CONTENT_TOP, PAGE_W, PAGE_H, downloadLetterPdf, letterToPageCanvases } from '../letterExport';

const FONTS = ['Arial', 'Calibri', 'Cambria', 'Georgia', 'Times New Roman', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Courier New'];
const SIZES = [10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 40];
const COLORS = ['#000000', '#0F1729', '#C9A877', '#B91C1C', '#15803D', '#1D4ED8', '#7C3AED', '#6B7280'];
const HIGHLIGHTS = ['#FFF59D', '#C8E6C9', '#BBDEFB', '#F8BBD0', '#FFFFFF'];
const BLOCKS = [
  ['p', 'Normal text'],
  ['h1', 'Heading 1'],
  ['h2', 'Heading 2'],
  ['h3', 'Heading 3'],
  ['blockquote', 'Quote']
];
const LINE_SPACINGS = ['1', '1.15', '1.5', '2'];

const today = () => formatLongDate(toLocalDateStr());

const TEMPLATES = [
  {
    name: 'Blank letter',
    html: () => `<p>${today()}</p><p><br></p><p>Dear Sir / Madam,</p><p><br></p><p><br></p><p>Yours faithfully,</p><p><br></p><p><br></p><p><strong>[Name]</strong><br>[Designation]<br>${COMPANY_PROFILE.name}</p>`
  },
  {
    name: 'To whom it may concern',
    html: () => `<p>${today()}</p><p><br></p><p><strong>TO WHOM IT MAY CONCERN</strong></p><p><br></p><p>This is to certify that <strong>[Full name]</strong> (NIC: [NIC number]) is employed at ${COMPANY_PROFILE.name} as <strong>[Designation]</strong> since [Date of joining]. [He/She] is a permanent member of our staff and [his/her] monthly basic salary is LKR [amount].</p><p>This letter is issued upon the request of the employee for [purpose], and without any liability on the part of the company.</p><p><br></p><p>Yours faithfully,</p><p><br></p><p><br></p><p><strong>[Name]</strong><br>[Designation]<br>${COMPANY_PROFILE.name}</p>`
  },
  {
    name: 'Employment offer',
    html: () => `<p>${today()}</p><p><br></p><p><strong>[Candidate name]</strong><br>[Address]</p><p><br></p><p>Dear [Candidate name],</p><p><strong>Offer of Employment &ndash; [Designation]</strong></p><p>We are pleased to offer you the position of <strong>[Designation]</strong> at ${COMPANY_PROFILE.name}, commencing on <strong>[Start date]</strong>.</p><ul><li>Monthly basic salary: LKR [amount]</li><li>Working hours: Monday to Friday 8.30 a.m. &ndash; 5.00 p.m., Saturday 8.30 a.m. &ndash; 3.30 p.m.</li><li>Probation period: [3] months</li></ul><p>Please sign and return a copy of this letter to confirm your acceptance. We look forward to welcoming you to the team.</p><p><br></p><p>Yours sincerely,</p><p><br></p><p><br></p><p><strong>[Name]</strong><br>[Designation]<br>${COMPANY_PROFILE.name}</p><p><br></p><p>I accept the above offer.<br><br>Signature: ______________________ &nbsp;&nbsp; Date: ______________</p>`
  },
  {
    name: 'Appointment letter',
    html: () => `<p>${today()}</p><p><br></p><p><strong>[Employee name]</strong></p><p><br></p><p>Dear [Employee name],</p><p><strong>Letter of Appointment</strong></p><p>Further to your acceptance of our offer, we confirm your appointment as <strong>[Designation]</strong> in the <strong>[Department]</strong> department with effect from <strong>[Date]</strong>.</p><p>Your terms of employment, salary and benefits are as set out in your contract. You will be subject to the policies and procedures of ${COMPANY_PROFILE.name}.</p><p><br></p><p>Yours sincerely,</p><p><br></p><p><br></p><p><strong>[Name]</strong><br>[Designation]<br>${COMPANY_PROFILE.name}</p>`
  },
  {
    name: 'Warning letter',
    html: () => `<p>${today()}</p><p><br></p><p><strong>[Employee name]</strong><br>[Designation]</p><p><br></p><p><strong>Subject: Formal warning</strong></p><p>Dear [Employee name],</p><p>It has been brought to our attention that on [date] you [describe the issue]. This conduct is not in line with the standards expected at ${COMPANY_PROFILE.name}.</p><p>Please treat this letter as a formal warning. Any repetition may lead to further disciplinary action.</p><p><br></p><p>Yours sincerely,</p><p><br></p><p><br></p><p><strong>[Name]</strong><br>[Designation]</p>`
  },
  {
    name: 'Payment reminder',
    html: () => `<p>${today()}</p><p><br></p><p><strong>[Client name]</strong><br>[Client address]</p><p><br></p><p><strong>Subject: Payment reminder &ndash; Invoice [INV-0000-000]</strong></p><p>Dear [Contact person],</p><p>This is a friendly reminder that invoice <strong>[INV-0000-000]</strong> for <strong>LKR [amount]</strong>, issued on [date], was due on [due date] and remains unpaid.</p><p>Please arrange the payment to the account below at your earliest convenience.</p><p>${COMPANY_PROFILE.bank.bankName} &ndash; ${COMPANY_PROFILE.bank.branch}<br>Account name: ${COMPANY_PROFILE.bank.accountName}<br>Account number: ${COMPANY_PROFILE.bank.accountNumber}</p><p>If you have already made the payment, please disregard this letter.</p><p><br></p><p>Yours faithfully,</p><p><br></p><p><strong>[Name]</strong><br>${COMPANY_PROFILE.authorizedByTitle}<br>${COMPANY_PROFILE.name}</p>`
  }
];

const EDITOR_CSS = `
.letter-body { font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #111; word-wrap: break-word; }
.letter-body p { margin: 0 0 8px; }
.letter-body h1 { font-size: 26px; margin: 12px 0 8px; line-height: 1.25; }
.letter-body h2 { font-size: 21px; margin: 10px 0 6px; line-height: 1.25; }
.letter-body h3 { font-size: 17px; margin: 8px 0 6px; line-height: 1.25; }
.letter-body ul, .letter-body ol { margin: 0 0 8px; padding-left: 26px; }
.letter-body blockquote { margin: 6px 0 10px; padding: 4px 14px; border-left: 3px solid #C9A877; color: #444; }
.letter-body table { border-collapse: collapse; width: 100%; margin: 6px 0 10px; }
.letter-body td, .letter-body th { border: 1px solid #333; padding: 5px 8px; vertical-align: top; min-width: 30px; }
.letter-body img { max-width: 100%; height: auto; }
.letter-body a { color: #1D4ED8; }
.letter-body:focus { outline: none; }
`;

const ROLES = ['Developer', 'Admin', 'Manager', 'Coordinator & Accountant'];

export default function Letters({ currentUserProfile = {} }) {
  const editorRef = useRef(null);
  const savedRange = useRef(null);
  const fileInput = useRef(null);

  const [letters, setLetters] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [current, setCurrent] = useState({ id: null, title: 'Untitled letter', use_letterhead: true });
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState('');
  const [pages, setPages] = useState(1);
  const [preview, setPreview] = useState(null);
  const [printPages, setPrintPages] = useState(null);

  const allowed = ROLES.includes(currentUserProfile?.role);

  const loadLetters = useCallback(async () => {
    const { data, error } = await supabase.from('letters').select('*');
    setLoadError(error ? error.message : '');
    setLetters((data || []).sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || ''))));
  }, []);

  useEffect(() => {
    if (allowed) loadLetters();
  }, [allowed, loadLetters]);

  const setHtml = (html) => {
    if (editorRef.current) editorRef.current.innerHTML = html;
    measure();
  };

  // Start from the first template.
  useEffect(() => {
    if (allowed && editorRef.current && !editorRef.current.innerHTML.trim()) {
      setHtml(TEMPLATES[0].html());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  const measure = () => {
    const el = editorRef.current;
    if (!el) return;
    setPages(Math.max(1, Math.ceil(el.scrollHeight / CONTENT_H)));
  };

  // ---- selection handling (toolbar selects steal focus) ----
  useEffect(() => {
    const onSel = () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount && editorRef.current && editorRef.current.contains(sel.anchorNode)) {
        savedRange.current = sel.getRangeAt(0).cloneRange();
      }
    };
    document.addEventListener('selectionchange', onSel);
    return () => document.removeEventListener('selectionchange', onSel);
  }, []);

  const focusEditor = () => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (savedRange.current) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
  };

  const exec = (command, value = null) => {
    focusEditor();
    document.execCommand('styleWithCSS', false, true);
    document.execCommand(command, false, value);
    measure();
  };

  const applyFontSize = (px) => {
    focusEditor();
    document.execCommand('styleWithCSS', false, false);
    document.execCommand('fontSize', false, '7');
    editorRef.current.querySelectorAll('font[size="7"]').forEach(font => {
      const span = document.createElement('span');
      span.style.fontSize = `${px}px`;
      span.innerHTML = font.innerHTML;
      font.replaceWith(span);
    });
    measure();
  };

  const applyLineSpacing = (value) => {
    focusEditor();
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const root = editorRef.current;
    const range = sel.getRangeAt(0);
    root.querySelectorAll('p, h1, h2, h3, li, blockquote, div').forEach(el => {
      if (el !== root && range.intersectsNode(el)) el.style.lineHeight = value;
    });
    measure();
  };

  const insertHtml = (html) => exec('insertHTML', html);

  const insertTable = () => {
    const rowsRaw = window.prompt('Number of rows', '3');
    if (!rowsRaw) return;
    const colsRaw = window.prompt('Number of columns', '3');
    if (!colsRaw) return;
    const rows = Math.min(30, Math.max(1, parseInt(rowsRaw, 10) || 0));
    const cols = Math.min(8, Math.max(1, parseInt(colsRaw, 10) || 0));
    const cell = '<td><br></td>';
    insertHtml(`<table><tbody>${`<tr>${cell.repeat(cols)}</tr>`.repeat(rows)}</tbody></table><p><br></p>`);
  };

  const insertLink = () => {
    const url = window.prompt('Link address (https://...)');
    if (url) exec('createLink', url);
  };

  const handleImageFile = (file) => {
    if (!file) return;
    if (!/^image\//.test(file.type) || file.size > 3 * 1024 * 1024) {
      alert('Choose an image file up to 3 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => insertHtml(`<img src="${reader.result}" alt="" style="max-width:100%">`);
    reader.readAsDataURL(file);
  };

  // ---- documents ----
  const newFromTemplate = (template) => {
    if (!window.confirm('Start a new letter? Unsaved changes in the current one will be lost.')) return;
    setCurrent({ id: null, title: template.name === 'Blank letter' ? 'Untitled letter' : template.name, use_letterhead: true });
    setHtml(template.html());
    setStatus('');
  };

  const openLetter = (letter) => {
    setCurrent({ id: letter.id, title: letter.title, use_letterhead: letter.use_letterhead !== false });
    setHtml(letter.html || '');
    setStatus('');
  };

  const save = async () => {
    setBusy('save');
    setStatus('');
    try {
      const payload = {
        title: current.title.trim() || 'Untitled letter',
        html: editorRef.current.innerHTML,
        use_letterhead: current.use_letterhead,
        updated_at: new Date().toISOString()
      };
      let error;
      if (current.id) {
        ({ error } = await supabase.from('letters').update(payload).eq('id', current.id));
      } else {
        const result = await supabase.from('letters').insert({ ...payload, created_by: currentUserProfile.id }).select();
        error = result.error;
        if (!error && result.data && result.data[0]) setCurrent(c => ({ ...c, id: result.data[0].id }));
      }
      if (error) throw error;
      setStatus('Saved.');
      await loadLetters();
    } catch (err) {
      setStatus(`Could not save: ${err.message}. Run supabase_add_letters.sql in the Supabase SQL Editor.`);
    } finally {
      setBusy('');
    }
  };

  const remove = async (letter) => {
    if (!window.confirm(`Delete "${letter.title}"?`)) return;
    const { error } = await supabase.from('letters').delete().eq('id', letter.id);
    if (error) {
      alert(`Could not delete: ${error.message}`);
      return;
    }
    if (current.id === letter.id) setCurrent(c => ({ ...c, id: null }));
    await loadLetters();
  };

  // ---- export ----
  const withExportNode = async (fn) => {
    const el = document.createElement('div');
    el.className = 'letter-body';
    el.style.cssText = `position:fixed;left:-10000px;top:0;width:${CONTENT_W}px;background:transparent;`;
    el.innerHTML = editorRef.current.innerHTML;
    document.body.appendChild(el);
    try {
      return await fn(el);
    } finally {
      el.remove();
    }
  };

  const handlePdf = async () => {
    setBusy('pdf');
    try {
      await withExportNode(el => downloadLetterPdf(el, pdfFileName(current.title), { letterhead: current.use_letterhead }));
    } catch (err) {
      console.error(err);
      alert('Could not create the PDF.');
    } finally {
      setBusy('');
    }
  };

  const handlePreview = async () => {
    setBusy('preview');
    try {
      const urls = await withExportNode(async el => {
        const canvases = await letterToPageCanvases(el, { letterhead: current.use_letterhead });
        return canvases.map(c => c.toDataURL('image/jpeg', 0.85));
      });
      setPreview(urls);
    } catch (err) {
      console.error(err);
      alert('Could not build the preview.');
    } finally {
      setBusy('');
    }
  };

  const handlePrint = async () => {
    setBusy('print');
    try {
      const urls = await withExportNode(async el => {
        const canvases = await letterToPageCanvases(el, { letterhead: current.use_letterhead });
        return canvases.map(c => c.toDataURL('image/jpeg', 0.95));
      });
      setPrintPages(urls);
      setTimeout(() => {
        window.print();
        setTimeout(() => setPrintPages(null), 500);
      }, 300);
    } catch (err) {
      console.error(err);
      alert('Could not prepare the print.');
    } finally {
      setBusy('');
    }
  };

  if (!allowed) {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        Only Admin, Manager, Coordinator &amp; Accountant, or Developer accounts can write official letters.
      </div>
    );
  }

  const keep = (e) => e.preventDefault(); // keep the text selection when a toolbar button is pressed
  const Btn = ({ title, onClick, children, disabled }) => (
    <button type="button" title={title} onMouseDown={keep} onClick={onClick} disabled={disabled} style={s.tbBtn}>
      {children}
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
      <style>{EDITOR_CSS}</style>

      <div>
        <h2 style={s.title}><Mail size={22} color="var(--color-gold)" /> Letters &amp; Letterheads</h2>
        <p style={s.subtitle}>Write official letters on the Gloma letterhead, then download or print them.</p>
      </div>

      {loadError && (
        <div className="glass-panel" style={s.warning}>
          <AlertTriangle size={18} color="#F59E0B" />
          <span>Saved letters could not be loaded ({loadError}). Run <strong>supabase_add_letters.sql</strong> in the Supabase SQL Editor. You can still write, download and print letters.</span>
        </div>
      )}

      <div style={s.layout}>
        {/* Side panel: templates + saved letters */}
        <div style={s.side}>
          <div className="glass-panel" style={s.sidePanel}>
            <div style={s.sideTitle}><FilePlus size={14} /> New from template</div>
            {TEMPLATES.map(t => (
              <button key={t.name} type="button" className="btn-secondary" style={s.sideBtn} onClick={() => newFromTemplate(t)}>{t.name}</button>
            ))}
          </div>
          <div className="glass-panel" style={s.sidePanel}>
            <div style={s.sideTitle}><Save size={14} /> Saved letters</div>
            {letters.length === 0 && <div style={s.muted}>Nothing saved yet.</div>}
            {letters.map(l => (
              <div key={l.id} style={{ ...s.savedRow, borderColor: current.id === l.id ? 'var(--color-gold)' : 'var(--border-subtle)' }}>
                <button type="button" style={s.savedName} onClick={() => openLetter(l)} title={l.title}>{l.title}</button>
                <button type="button" style={s.iconBtn} onClick={() => remove(l)} title="Delete"><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div style={s.main}>
          <div className="glass-panel" style={s.docBar}>
            <input
              className="form-input"
              style={{ flex: 1, minWidth: '180px' }}
              value={current.title}
              onChange={(e) => setCurrent(c => ({ ...c, title: e.target.value }))}
              placeholder="Letter title"
            />
            <label style={s.check}>
              <input type="checkbox" checked={current.use_letterhead} onChange={(e) => setCurrent(c => ({ ...c, use_letterhead: e.target.checked }))} />
              Use letterhead
            </label>
            <button type="button" className="btn-primary" style={s.actionBtn} onClick={save} disabled={busy === 'save'}><Save size={14} /> {busy === 'save' ? 'Saving...' : 'Save'}</button>
            <button type="button" className="btn-secondary" style={s.actionBtn} onClick={handlePreview} disabled={!!busy}><Eye size={14} /> {busy === 'preview' ? 'Building...' : 'Preview pages'}</button>
            <button type="button" className="btn-secondary" style={s.actionBtn} onClick={handlePdf} disabled={!!busy}><FileDown size={14} /> {busy === 'pdf' ? 'Creating...' : 'Download PDF'}</button>
            <button type="button" className="btn-secondary" style={s.actionBtn} onClick={handlePrint} disabled={!!busy}><Printer size={14} /> Print</button>
          </div>
          {status && <div style={{ ...s.muted, color: status.startsWith('Saved') ? '#10B981' : '#F59E0B' }}>{status}</div>}

          <div className="glass-panel" style={s.toolbar}>
            <Btn title="Undo" onClick={() => exec('undo')}><Undo2 size={15} /></Btn>
            <Btn title="Redo" onClick={() => exec('redo')}><Redo2 size={15} /></Btn>
            <span style={s.sep} />
            <select style={s.select} defaultValue="p" onChange={(e) => { exec('formatBlock', e.target.value); e.target.value = 'p'; }} title="Paragraph style">
              {BLOCKS.map(([tag, label]) => <option key={tag} value={tag}>{label}</option>)}
            </select>
            <select style={s.select} defaultValue="Arial" onChange={(e) => exec('fontName', e.target.value)} title="Font">
              {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <select style={{ ...s.select, width: '62px' }} defaultValue="14" onChange={(e) => applyFontSize(e.target.value)} title="Font size">
              {SIZES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span style={s.sep} />
            <Btn title="Bold (Ctrl+B)" onClick={() => exec('bold')}><Bold size={15} /></Btn>
            <Btn title="Italic (Ctrl+I)" onClick={() => exec('italic')}><Italic size={15} /></Btn>
            <Btn title="Underline (Ctrl+U)" onClick={() => exec('underline')}><Underline size={15} /></Btn>
            <Btn title="Strikethrough" onClick={() => exec('strikeThrough')}><Strikethrough size={15} /></Btn>
            <span style={s.sep} />
            <span style={s.swatchGroup} title="Text colour">
              {COLORS.map(c => (
                <button key={c} type="button" onMouseDown={keep} onClick={() => exec('foreColor', c)} style={{ ...s.swatch, backgroundColor: c }} aria-label={`Text colour ${c}`} />
              ))}
            </span>
            <span style={s.swatchGroup} title="Highlight">
              {HIGHLIGHTS.map(c => (
                <button key={c} type="button" onMouseDown={keep} onClick={() => exec('hiliteColor', c)} style={{ ...s.swatch, backgroundColor: c, borderRadius: '3px' }} aria-label={`Highlight ${c}`} />
              ))}
            </span>
            <span style={s.sep} />
            <Btn title="Align left" onClick={() => exec('justifyLeft')}><AlignLeft size={15} /></Btn>
            <Btn title="Centre" onClick={() => exec('justifyCenter')}><AlignCenter size={15} /></Btn>
            <Btn title="Align right" onClick={() => exec('justifyRight')}><AlignRight size={15} /></Btn>
            <Btn title="Justify" onClick={() => exec('justifyFull')}><AlignJustify size={15} /></Btn>
            <select style={{ ...s.select, width: '70px' }} defaultValue="" onChange={(e) => { if (e.target.value) applyLineSpacing(e.target.value); e.target.value = ''; }} title="Line spacing">
              <option value="">Spacing</option>
              {LINE_SPACINGS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <span style={s.sep} />
            <Btn title="Bulleted list" onClick={() => exec('insertUnorderedList')}><List size={15} /></Btn>
            <Btn title="Numbered list" onClick={() => exec('insertOrderedList')}><ListOrdered size={15} /></Btn>
            <Btn title="Decrease indent" onClick={() => exec('outdent')}><Outdent size={15} /></Btn>
            <Btn title="Increase indent" onClick={() => exec('indent')}><Indent size={15} /></Btn>
            <span style={s.sep} />
            <Btn title="Insert table" onClick={insertTable}><Table size={15} /></Btn>
            <Btn title="Insert image" onClick={() => fileInput.current && fileInput.current.click()}><ImageIcon size={15} /></Btn>
            <Btn title="Insert link" onClick={insertLink}><Link2 size={15} /></Btn>
            <Btn title="Horizontal line" onClick={() => exec('insertHorizontalRule')}><Minus size={15} /></Btn>
            <Btn title="Insert today's date" onClick={() => insertHtml(today())}><CalendarDays size={15} /></Btn>
            <Btn title="Clear formatting" onClick={() => exec('removeFormat')}><Eraser size={15} /></Btn>
            <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => { handleImageFile(e.target.files[0]); e.target.value = ''; }} />
          </div>

          <div style={s.paperScroll}>
            <div style={{ ...s.paper, width: `${PAGE_W}px` }}>
              {current.use_letterhead && <div style={{ ...s.lhTop, height: `${CONTENT_TOP}px` }} />}
              <div
                ref={editorRef}
                className="letter-body"
                contentEditable
                suppressContentEditableWarning
                spellCheck
                onInput={measure}
                onBlur={measure}
                style={{
                  ...s.editor,
                  padding: current.use_letterhead ? '12px 64px 0' : '72px 64px 0',
                  minHeight: `${CONTENT_H}px`
                }}
              />
              {current.use_letterhead && <div style={{ ...s.lhBottom, height: `${PAGE_H - 1065}px` }} />}
            </div>
          </div>
          <div style={s.muted}>
            About {pages} page{pages > 1 ? 's' : ''}. Every page is placed on the letterhead when you download or print; use &ldquo;Preview pages&rdquo; to check where the pages break.
          </div>
        </div>
      </div>

      {preview && (
        <div style={s.overlay} onClick={() => setPreview(null)}>
          <div className="glass-panel" style={s.previewBox} onClick={(e) => e.stopPropagation()}>
            <div style={s.previewHead}>
              <h3>Page preview ({preview.length} page{preview.length > 1 ? 's' : ''})</h3>
              <button type="button" className="btn-secondary" onClick={() => setPreview(null)}>Close</button>
            </div>
            <div style={s.previewPages}>
              {preview.map((url, i) => (
                <img key={i} src={url} alt={`Page ${i + 1}`} style={s.previewImg} />
              ))}
            </div>
          </div>
        </div>
      )}

      {printPages && createPortal(
        <div className="print-only-sheet">
          {printPages.map((url, i) => (
            <img key={i} src={url} alt="" style={{ display: 'block', width: '210mm', height: '297mm', pageBreakAfter: 'always', breakAfter: 'page' }} />
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

const s = {
  title: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: 'var(--font-size-xl)', fontWeight: 800 },
  subtitle: { color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: '6px' },
  warning: { display: 'flex', gap: '10px', alignItems: 'center', padding: '12px 16px', fontSize: 'var(--font-size-sm)' },
  layout: { display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' },
  side: { width: '220px', display: 'flex', flexDirection: 'column', gap: '12px', flexShrink: 0 },
  sidePanel: { padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' },
  sideTitle: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-gold)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' },
  sideBtn: { textAlign: 'left', padding: '6px 10px', fontSize: 'var(--font-size-xs)' },
  savedRow: { display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid', borderRadius: 'var(--radius-xs)', padding: '2px 4px' },
  savedName: { flex: 1, background: 'none', border: 'none', color: 'var(--color-text-primary)', textAlign: 'left', cursor: 'pointer', fontSize: 'var(--font-size-xs)', padding: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  iconBtn: { background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: '4px', display: 'flex' },
  muted: { fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' },
  main: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '10px' },
  docBar: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', padding: '10px 12px' },
  check: { display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-sm)' },
  actionBtn: { padding: '6px 12px', fontSize: 'var(--font-size-xs)', display: 'inline-flex', alignItems: 'center', gap: '6px' },
  toolbar: { display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap', padding: '8px 10px', position: 'sticky', top: 0, zIndex: 5 },
  tbBtn: { background: 'var(--bg-badge-dark)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xs)', color: 'var(--color-text-primary)', cursor: 'pointer', padding: '5px 7px', display: 'inline-flex', alignItems: 'center' },
  select: { background: 'var(--bg-badge-dark)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xs)', color: 'var(--color-text-primary)', padding: '5px 6px', fontSize: 'var(--font-size-xs)', maxWidth: '130px' },
  sep: { width: '1px', height: '22px', backgroundColor: 'var(--border-subtle)', margin: '0 4px' },
  swatchGroup: { display: 'inline-flex', gap: '3px', alignItems: 'center' },
  swatch: { width: '16px', height: '16px', borderRadius: '50%', border: '1px solid rgba(128,128,128,0.6)', cursor: 'pointer', padding: 0 },
  paperScroll: { overflow: 'auto', padding: '12px', backgroundColor: 'var(--bg-badge-dark)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' },
  paper: { margin: '0 auto', backgroundColor: '#FFFFFF', boxShadow: '0 4px 24px rgba(0,0,0,0.35)', color: '#111' },
  lhTop: { backgroundImage: 'url(/letterhead.jpg)', backgroundSize: `${PAGE_W}px ${PAGE_H}px`, backgroundPosition: 'top left', backgroundRepeat: 'no-repeat' },
  lhBottom: { backgroundImage: 'url(/letterhead.jpg)', backgroundSize: `${PAGE_W}px ${PAGE_H}px`, backgroundPosition: 'bottom left', backgroundRepeat: 'no-repeat' },
  editor: {
    outline: 'none',
    boxSizing: 'border-box',
    // faint dashed line wherever a new page starts
    backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${CONTENT_H - 1}px, rgba(201,168,119,0.7) ${CONTENT_H - 1}px, rgba(201,168,119,0.7) ${CONTENT_H}px)`
  },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', zIndex: 999, padding: '16px', overflowY: 'auto' },
  previewBox: { width: '100%', maxWidth: '760px', padding: '16px', backgroundColor: 'var(--bg-panel)', margin: 'auto' },
  previewHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  previewPages: { display: 'flex', flexDirection: 'column', gap: '12px' },
  previewImg: { width: '100%', border: '1px solid var(--border-subtle)', backgroundColor: '#fff' }
};
