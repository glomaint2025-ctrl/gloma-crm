import React, { useState, useMemo, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  FileText,
  Plus,
  Search,
  Pencil,
  Trash2,
  Printer,
  Copy,
  ArrowRightCircle,
  Eye,
  Landmark,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  ShieldAlert,
  AlertTriangle
} from 'lucide-react';
import InvoiceSheet from './InvoiceSheet';
import PdfDownload from './PdfDownload';
import { pdfFileName } from '../pdfExport';
import {
  DOC_TYPES,
  DOC_STATUSES,
  nextDocNumber,
  SHEET_TEXT_GROUPS,
  SHEET_TOGGLES,
  resolveSheetText,
  calcTotals,
  formatMoney
} from '../invoiceUtils';

const SHEET_WIDTH = 794;
const ONE_TIME_CLIENT = '__one_time';
const todayISO = () => new Date().toISOString().substring(0, 10);
const addDaysISO = (days) => new Date(Date.now() + days * 86400000).toISOString().substring(0, 10);
const blankItem = () => ({ description: '', details: '', qty: 1, unit_price: '' });

const STATUS_COLORS = {
  Draft: '#9CA3AF',
  Sent: '#3B82F6',
  Paid: '#10B981',
  Cancelled: '#EF4444'
};

// Renders the A4 sheet shrunk to fit its container (used for the on-screen preview).
function ScaledSheet({ doc }) {
  const wrapRef = useRef(null);
  const innerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState(1123);

  useLayoutEffect(() => {
    const update = () => {
      if (!wrapRef.current || !innerRef.current) return;
      const nextScale = Math.min(1, wrapRef.current.clientWidth / SHEET_WIDTH);
      setScale(nextScale);
      setHeight(innerRef.current.offsetHeight * nextScale);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(wrapRef.current);
    observer.observe(innerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapRef} style={{ width: '100%', height, overflow: 'hidden' }}>
      <div
        ref={innerRef}
        style={{ width: SHEET_WIDTH, transform: `scale(${scale})`, transformOrigin: 'top left', boxShadow: '0 4px 24px rgba(0,0,0,0.35)' }}
      >
        <InvoiceSheet doc={doc} />
      </div>
    </div>
  );
}

function buildBlankForm(docType, existingDocs, createdBy) {
  const config = DOC_TYPES[docType];
  return {
    id: null,
    doc_type: docType,
    doc_number: nextDocNumber(docType, existingDocs),
    status: 'Draft',
    issue_date: todayISO(),
    due_date: docType === 'Quotation' ? '' : addDaysISO(14),
    service_title: '',
    service_period: '',
    client_choice: '',
    client_id: null,
    client_name: '',
    client_address: '',
    client_contact_person: '',
    client_contact: '',
    items: [blankItem()],
    discount: '',
    tax_rate: '',
    advance_paid: '',
    notes: config.defaultNotes,
    custom: {},
    created_by: createdBy
  };
}

function docToForm(doc) {
  return {
    ...doc,
    client_choice: doc.client_id || ONE_TIME_CLIENT,
    due_date: doc.due_date ? String(doc.due_date).substring(0, 10) : '',
    issue_date: doc.issue_date ? String(doc.issue_date).substring(0, 10) : todayISO(),
    items: Array.isArray(doc.items) && doc.items.length ? doc.items : [blankItem()],
    discount: doc.discount || '',
    tax_rate: doc.tax_rate || '',
    advance_paid: doc.advance_paid || '',
    custom: {}
  };
}

export default function Invoices({
  invoices = [],
  clients = [],
  currentUserProfile = {},
  loadError = '',
  onSaveInvoice,
  onDeleteInvoice
}) {
  const userRole = currentUserProfile?.role || 'Employee';
  const hasAccess = ['Developer', 'Admin', 'Manager', 'Coordinator & Accountant'].includes(userRole);
  const canDelete = userRole === 'Developer' || userRole === 'Admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [form, setForm] = useState(null);
  const [viewingDoc, setViewingDoc] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [advanceBase, setAdvanceBase] = useState('');
  const [advancePercent, setAdvancePercent] = useState('50');

  const printDoc = form || viewingDoc;

  const visibleDocs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return invoices
      .filter(doc => (!filterType || doc.doc_type === filterType) && (!filterStatus || doc.status === filterStatus))
      .filter(doc => !q || `${doc.doc_number} ${doc.client_name || ''}`.toLowerCase().includes(q))
      .sort((a, b) => String(b.created_at || b.issue_date).localeCompare(String(a.created_at || a.issue_date)));
  }, [invoices, searchQuery, filterType, filterStatus]);

  const summary = useMemo(() => {
    const billable = invoices.filter(d => d.doc_type !== 'Quotation' && d.status !== 'Cancelled');
    const balanceOf = (doc) => calcTotals(doc).balance;
    return {
      outstanding: billable.filter(d => d.status === 'Sent').reduce((sum, d) => sum + balanceOf(d), 0),
      paid: billable.filter(d => d.status === 'Paid').reduce((sum, d) => sum + calcTotals(d).total, 0),
      openQuotes: invoices.filter(d => d.doc_type === 'Quotation' && (d.status === 'Draft' || d.status === 'Sent')).length,
      drafts: invoices.filter(d => d.status === 'Draft').length
    };
  }, [invoices]);

  if (!hasAccess) {
    return (
      <div className="glass-panel animate-fade-in" style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        <ShieldAlert size={28} style={{ marginBottom: '10px' }} />
        <div>Only Admin, Manager, Coordinator &amp; Accountant, or Developer accounts can use the invoice generator.</div>
      </div>
    );
  }

  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const openEditor = (nextForm) => {
    setFormError('');
    setAdvanceBase('');
    setAdvancePercent('50');
    setForm(nextForm);
  };

  const openNew = (docType) => openEditor(buildBlankForm(docType, invoices, currentUserProfile?.id || null));

  const handleTypeChange = (docType) => {
    setForm(prev => {
      // Keep the number in sync with the type unless this is an already-saved document.
      const number = prev.id ? prev.doc_number : nextDocNumber(docType, invoices);
      const notesWereDefault = !prev.notes || Object.values(DOC_TYPES).some(c => c.defaultNotes === prev.notes);
      return {
        ...prev,
        doc_type: docType,
        doc_number: number,
        notes: notesWereDefault ? DOC_TYPES[docType].defaultNotes : prev.notes,
        due_date: docType === 'Quotation' ? '' : (prev.due_date || addDaysISO(14))
      };
    });
  };

  const handleClientChoice = (choice) => {
    if (choice === '' || choice === ONE_TIME_CLIENT) {
      setForm(prev => ({
        ...prev,
        client_choice: choice,
        client_id: null,
        client_name: '',
        client_address: '',
        client_contact_person: '',
        client_contact: ''
      }));
      return;
    }
    const client = clients.find(c => c.id === choice);
    if (!client) return;
    setForm(prev => ({
      ...prev,
      client_choice: choice,
      client_id: client.id,
      client_name: client.name || '',
      client_address: client.address || '',
      client_contact_person: client.contact_person || '',
      client_contact: [client.contact_number, client.contact_email].filter(Boolean).join(' | ')
    }));
  };

  // Print-only overrides for any text on the sheet (never saved to the database).
  const setCustom = (key, value) => {
    setForm(prev => {
      const custom = { ...(prev.custom || {}) };
      if (value === '' || value === false || value === undefined) delete custom[key];
      else custom[key] = value;
      return { ...prev, custom };
    });
  };

  const defaultText = form ? resolveSheetText(form, false) : {};

  // Payment method & bank details rows. The first edit copies the standard rows into the
  // document so they can be changed, added to, reordered or removed.
  const bankRows = form?.custom?.bankRows?.length ? form.custom.bankRows : defaultText.bankRows;
  const writeBankRows = (rows) => setForm(prev => ({ ...prev, custom: { ...(prev.custom || {}), bankRows: rows } }));
  const updateBankRow = (index, key, value) => writeBankRows(bankRows.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  const addBankRow = () => writeBankRows([...bankRows, { label: '', value: '' }]);
  const removeBankRow = (index) => {
    const next = bankRows.filter((_, i) => i !== index);
    if (next.length) writeBankRows(next);
    else setCustom('bankRows', undefined);
  };
  const moveBankRow = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= bankRows.length) return;
    const next = [...bankRows];
    [next[index], next[target]] = [next[target], next[index]];
    writeBankRows(next);
  };

  const updateItem = (index, key, value) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [key]: value } : item))
    }));
  };

  const addItem = () => setForm(prev => ({ ...prev, items: [...prev.items, blankItem()] }));

  const removeItem = (index) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((_, i) => i !== index) : [blankItem()]
    }));
  };

  // Advance invoices: turn "project total x advance %" into a single priced line.
  const applyAdvanceLine = () => {
    const base = Number(advanceBase);
    const percent = Number(advancePercent);
    if (!(base > 0) || !(percent > 0)) {
      setFormError('Enter the project total and an advance percentage first.');
      return;
    }
    const amount = Math.round(base * percent) / 100;
    setFormError('');
    setForm(prev => ({
      ...prev,
      items: [{
        description: `Advance payment (${percent}% of the LKR ${formatMoney(base)} project total)`,
        details: '',
        qty: 1,
        unit_price: amount
      }]
    }));
  };

  const clientAdvanceDocs = form && form.doc_type === 'Invoice'
    ? invoices.filter(d => d.doc_type === 'Advance Invoice' && d.status !== 'Cancelled' && form.client_id && d.client_id === form.client_id)
    : [];

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');

    const cleanItems = form.items
      .filter(item => item.description.trim())
      .map(item => ({
        description: item.description.trim(),
        details: (item.details || '').trim(),
        qty: Number(item.qty) || 1,
        unit_price: Number(item.unit_price) || 0
      }));

    if (!form.client_name.trim()) {
      setFormError('Select a client or enter the client name.');
      return;
    }
    if (cleanItems.length === 0) {
      setFormError('Add at least one line item with a description.');
      return;
    }

    const payload = {
      doc_type: form.doc_type,
      doc_number: form.doc_number.trim(),
      status: form.status,
      issue_date: form.issue_date,
      due_date: form.due_date || null,
      service_title: form.service_title.trim() || null,
      service_period: form.service_period.trim() || null,
      client_id: form.client_id || null,
      client_name: form.client_name.trim(),
      client_address: form.client_address.trim() || null,
      client_contact_person: form.client_contact_person.trim() || null,
      client_contact: form.client_contact.trim() || null,
      items: cleanItems,
      discount: Number(form.discount) || 0,
      tax_rate: Number(form.tax_rate) || 0,
      advance_paid: Number(form.advance_paid) || 0,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString()
    };
    if (form.id) {
      payload.id = form.id;
    } else {
      payload.created_by = form.created_by;
    }

    setSaving(true);
    const result = await onSaveInvoice(payload);
    setSaving(false);

    if (result && result.success === false) {
      setFormError(
        /duplicate|unique/i.test(result.error || '')
          ? `Document number ${payload.doc_number} already exists. Change the number and save again.`
          : `Could not save: ${result.error || 'unknown error'}`
      );
      return;
    }
    setForm(null);
  };

  const handleStatusChange = async (doc, status) => {
    const result = await onSaveInvoice({ id: doc.id, status, updated_at: new Date().toISOString() });
    if (result && result.success === false) alert(`Could not update status: ${result.error || ''}`);
  };

  const handleDelete = async (doc) => {
    if (!canDelete) {
      alert('Only Admins or Developers can delete documents.');
      return;
    }
    if (!confirm(`Delete ${doc.doc_number}? This cannot be undone.`)) return;
    const result = await onDeleteInvoice(doc.id);
    if (result && result.success === false) alert(`Could not delete: ${result.error || ''}`);
  };

  const handleDuplicate = (doc, targetType) => {
    const type = targetType || doc.doc_type;
    const base = docToForm(doc);
    openEditor({
      ...base,
      id: null,
      created_at: undefined,
      doc_type: type,
      doc_number: nextDocNumber(type, invoices),
      status: 'Draft',
      issue_date: todayISO(),
      due_date: type === 'Quotation' ? '' : addDaysISO(14),
      notes: targetType ? DOC_TYPES[type].defaultNotes : base.notes,
      created_by: currentUserProfile?.id || null
    });
  };

  const totals = form ? calcTotals(form) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="animate-fade-in">
      <div style={s.headerRow}>
        <div>
          <h2 style={s.pageTitle}><FileText size={22} color="var(--color-gold)" /> Invoice &amp; Quotation Generator</h2>
          <p style={s.pageSubtitle}>Create quotations, advance invoices and final invoices for registered or one-time clients.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn-secondary" onClick={() => openNew('Quotation')}><Plus size={15} /> Quotation</button>
          <button className="btn-secondary" onClick={() => openNew('Advance Invoice')}><Plus size={15} /> Advance Invoice</button>
          <button className="btn-primary" onClick={() => openNew('Invoice')}><Plus size={15} /> Invoice</button>
        </div>
      </div>

      {loadError && (
        <div className="glass-panel" style={s.errorBanner}>
          <AlertTriangle size={18} color="#F59E0B" />
          <span>
            Could not load documents ({loadError}). If this is the first time, run{' '}
            <strong>supabase_phase1_clients_invoices_plans.sql</strong> in the Supabase SQL Editor.
          </span>
        </div>
      )}

      <div style={s.summaryRow}>
        <div className="glass-panel" style={s.summaryCard}>
          <div style={s.summaryLabel}>Outstanding (sent)</div>
          <div style={{ ...s.summaryValue, color: '#F59E0B' }}>LKR {formatMoney(summary.outstanding)}</div>
        </div>
        <div className="glass-panel" style={s.summaryCard}>
          <div style={s.summaryLabel}>Paid</div>
          <div style={{ ...s.summaryValue, color: '#10B981' }}>LKR {formatMoney(summary.paid)}</div>
        </div>
        <div className="glass-panel" style={s.summaryCard}>
          <div style={s.summaryLabel}>Open quotations</div>
          <div style={s.summaryValue}>{summary.openQuotes}</div>
        </div>
        <div className="glass-panel" style={s.summaryCard}>
          <div style={s.summaryLabel}>Drafts</div>
          <div style={s.summaryValue}>{summary.drafts}</div>
        </div>
      </div>

      <div className="glass-panel" style={s.filterBar}>
        <div style={s.searchBox}>
          <Search size={16} color="var(--color-text-muted)" />
          <input
            type="text"
            placeholder="Search by number or client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={s.searchInput}
          />
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="form-input" style={s.filterSelect}>
          <option value="">All types</option>
          {Object.keys(DOC_TYPES).map(type => <option key={type} value={type}>{type}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="form-input" style={s.filterSelect}>
          <option value="">All statuses</option>
          {DOC_STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
        </select>
      </div>

      <div className="glass-panel" style={{ padding: '8px' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Number</th>
                <th>Type</th>
                <th>Client</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Total (LKR)</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleDocs.map(doc => {
                const docTotals = calcTotals(doc);
                return (
                  <tr key={doc.id}>
                    <td style={{ fontWeight: 600, color: 'var(--color-gold)' }}>{doc.doc_number}</td>
                    <td>{doc.doc_type}</td>
                    <td>{doc.client_name}</td>
                    <td>{String(doc.issue_date).substring(0, 10)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {formatMoney(docTotals.total)}
                      {docTotals.advance > 0 && (
                        <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 400, color: 'var(--color-text-secondary)' }}>
                          balance {formatMoney(docTotals.balance)}
                        </div>
                      )}
                    </td>
                    <td>
                      <select
                        value={doc.status}
                        onChange={(e) => handleStatusChange(doc, e.target.value)}
                        style={{ ...s.statusSelect, color: STATUS_COLORS[doc.status], borderColor: STATUS_COLORS[doc.status] }}
                      >
                        {DOC_STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
                      </select>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button style={s.iconBtn} title="View / Print" onClick={() => setViewingDoc(doc)}>
                          <Eye size={15} color="var(--color-gold)" />
                        </button>
                        <button style={s.iconBtn} title="Edit" onClick={() => openEditor(docToForm(doc))}>
                          <Pencil size={14} color="var(--color-gold)" />
                        </button>
                        <button style={s.iconBtn} title="Duplicate" onClick={() => handleDuplicate(doc)}>
                          <Copy size={14} color="var(--color-text-secondary)" />
                        </button>
                        {doc.doc_type === 'Quotation' && (
                          <button style={s.iconBtn} title="Convert to invoice" onClick={() => handleDuplicate(doc, 'Invoice')}>
                            <ArrowRightCircle size={15} color="#10B981" />
                          </button>
                        )}
                        {canDelete && (
                          <button style={s.iconBtn} title="Delete" onClick={() => handleDelete(doc)}>
                            <Trash2 size={14} color="var(--color-cancelled)" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {visibleDocs.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)' }}>
                    No documents yet. Create a quotation or invoice with the buttons above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Viewer */}
      {viewingDoc && !form && (
        <div style={s.overlay}>
          <div className="glass-panel" style={{ ...s.modal, maxWidth: '900px' }}>
            <div style={s.modalHeader}>
              <h3>{viewingDoc.doc_number}</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <PdfDownload
                  className="btn-primary"
                  sheets={[<InvoiceSheet key="pdf" doc={viewingDoc} />]}
                  filename={pdfFileName(viewingDoc.doc_number, viewingDoc.client_name)}
                />
                <button className="btn-secondary" onClick={() => window.print()}>
                  <Printer size={15} /> Print
                </button>
                <button
                  className="btn-secondary"
                  title="Change anything on the invoice before printing or downloading"
                  onClick={() => { const doc = viewingDoc; setViewingDoc(null); openEditor(docToForm(doc)); }}
                >
                  <SlidersHorizontal size={15} /> Edit before print
                </button>
                <button className="btn-secondary" onClick={() => setViewingDoc(null)}>Close</button>
              </div>
            </div>
            <ScaledSheet doc={viewingDoc} />
          </div>
        </div>
      )}

      {/* Editor */}
      {form && (
        <div style={s.overlay}>
          <div className="glass-panel" style={s.modal}>
            <div style={s.modalHeader}>
              <h3>{form.id ? `Edit ${form.doc_number}` : `New ${form.doc_type}`}</h3>
              <button onClick={() => setForm(null)} style={s.closeBtn}>&times;</button>
            </div>

            <div className="invoice-editor-grid" style={s.editorGrid}>
              <form onSubmit={handleSave} style={s.form}>
                <div style={s.row}>
                  <div style={s.col}>
                    <label style={s.label}>Document type</label>
                    <select
                      className="form-input"
                      value={form.doc_type}
                      onChange={(e) => handleTypeChange(e.target.value)}
                      disabled={!!form.id}
                    >
                      {Object.keys(DOC_TYPES).map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </div>
                  <div style={s.col}>
                    <label style={s.label}>Number</label>
                    <input
                      className="form-input"
                      required
                      value={form.doc_number}
                      onChange={(e) => setField('doc_number', e.target.value)}
                    />
                  </div>
                </div>

                <div style={s.row}>
                  <div style={s.col}>
                    <label style={s.label}>Issue date</label>
                    <input type="date" required className="form-input" value={form.issue_date} onChange={(e) => setField('issue_date', e.target.value)} />
                  </div>
                  {form.doc_type !== 'Quotation' && (
                    <div style={s.col}>
                      <label style={s.label}>Due date</label>
                      <input type="date" className="form-input" value={form.due_date} onChange={(e) => setField('due_date', e.target.value)} />
                    </div>
                  )}
                  <div style={s.col}>
                    <label style={s.label}>Status</label>
                    <select className="form-input" value={form.status} onChange={(e) => setField('status', e.target.value)}>
                      {DOC_STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
                  </div>
                </div>

                <div style={s.row}>
                  <div style={s.col}>
                    <label style={s.label}>Heading subtitle (optional)</label>
                    <input
                      className="form-input"
                      placeholder="e.g. Social Media Marketing & Management"
                      value={form.service_title}
                      onChange={(e) => setField('service_title', e.target.value)}
                    />
                  </div>
                  <div style={s.col}>
                    <label style={s.label}>Service period (optional)</label>
                    <input
                      className="form-input"
                      placeholder="e.g. Monthly Recurring Package"
                      value={form.service_period}
                      onChange={(e) => setField('service_period', e.target.value)}
                    />
                  </div>
                </div>

                <div style={s.sectionLabel}>Client</div>
                <select className="form-input" value={form.client_choice} onChange={(e) => handleClientChoice(e.target.value)}>
                  <option value="">Select a client...</option>
                  {clients
                    .filter(c => c.status === 'Active' || c.id === form.client_id)
                    .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  <option value={ONE_TIME_CLIENT}>One-time client (type details)</option>
                </select>
                <div style={s.row}>
                  <div style={s.col}>
                    <label style={s.label}>Client name</label>
                    <input className="form-input" value={form.client_name} onChange={(e) => setField('client_name', e.target.value)} />
                  </div>
                  <div style={s.col}>
                    <label style={s.label}>Contact person</label>
                    <input className="form-input" value={form.client_contact_person} onChange={(e) => setField('client_contact_person', e.target.value)} />
                  </div>
                </div>
                <div style={s.row}>
                  <div style={s.col}>
                    <label style={s.label}>Address</label>
                    <textarea rows={2} className="form-input" style={{ resize: 'none' }} value={form.client_address} onChange={(e) => setField('client_address', e.target.value)} />
                  </div>
                  <div style={s.col}>
                    <label style={s.label}>Contact (phone / email)</label>
                    <input className="form-input" value={form.client_contact} onChange={(e) => setField('client_contact', e.target.value)} />
                  </div>
                </div>

                {form.doc_type === 'Advance Invoice' && (
                  <div style={s.helperBox}>
                    <div style={s.helperTitle}>Advance calculator</div>
                    <div style={s.row}>
                      <div style={s.col}>
                        <label style={s.label}>Project total (LKR)</label>
                        <input type="number" min="0" className="form-input" value={advanceBase} onChange={(e) => setAdvanceBase(e.target.value)} />
                      </div>
                      <div style={s.col}>
                        <label style={s.label}>Advance %</label>
                        <input type="number" min="0" max="100" className="form-input" value={advancePercent} onChange={(e) => setAdvancePercent(e.target.value)} />
                      </div>
                      <div style={{ ...s.col, alignSelf: 'flex-end', flex: '0 0 auto' }}>
                        <button type="button" className="btn-secondary" onClick={applyAdvanceLine}>Set advance line</button>
                      </div>
                    </div>
                  </div>
                )}

                <div style={s.sectionLabel}>Line items</div>
                {form.items.map((item, index) => (
                  <div key={index} style={s.itemBox}>
                    <div style={s.row}>
                      <div style={{ ...s.col, flex: 3 }}>
                        <input
                          className="form-input"
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                        />
                      </div>
                      <div style={{ ...s.col, flex: '0 0 70px', minWidth: '70px' }}>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          className="form-input"
                          placeholder="Qty"
                          value={item.qty}
                          onChange={(e) => updateItem(index, 'qty', e.target.value)}
                        />
                      </div>
                      <div style={{ ...s.col, flex: '1 1 110px' }}>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          className="form-input"
                          placeholder="Unit price"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                        />
                      </div>
                      <button type="button" style={s.iconBtn} title="Remove line" onClick={() => removeItem(index)}>
                        <Trash2 size={15} color="var(--color-cancelled)" />
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      className="form-input"
                      style={{ resize: 'vertical', marginTop: '8px' }}
                      placeholder={'Details, one per line (start a line with "-" for a bullet)'}
                      value={item.details}
                      onChange={(e) => updateItem(index, 'details', e.target.value)}
                    />
                  </div>
                ))}
                <button type="button" className="btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={addItem}>
                  <Plus size={14} /> Add line
                </button>

                <div style={s.row}>
                  <div style={s.col}>
                    <label style={s.label}>Discount (LKR)</label>
                    <input type="number" min="0" step="any" className="form-input" value={form.discount} onChange={(e) => setField('discount', e.target.value)} />
                  </div>
                  <div style={s.col}>
                    <label style={s.label}>VAT % (0 = none)</label>
                    <input type="number" min="0" step="any" className="form-input" value={form.tax_rate} onChange={(e) => setField('tax_rate', e.target.value)} />
                  </div>
                  {form.doc_type !== 'Quotation' && (
                    <div style={s.col}>
                      <label style={s.label}>Advance already received</label>
                      <input type="number" min="0" step="any" className="form-input" value={form.advance_paid} onChange={(e) => setField('advance_paid', e.target.value)} />
                    </div>
                  )}
                </div>

                {clientAdvanceDocs.length > 0 && (
                  <div style={s.helperBox}>
                    <label style={s.label}>Use an advance invoice for this client</label>
                    <select
                      className="form-input"
                      value=""
                      onChange={(e) => {
                        const picked = clientAdvanceDocs.find(d => d.id === e.target.value);
                        if (picked) setField('advance_paid', calcTotals(picked).total);
                      }}
                    >
                      <option value="">Choose to fill the advance amount...</option>
                      {clientAdvanceDocs.map(d => (
                        <option key={d.id} value={d.id}>{d.doc_number} - LKR {formatMoney(calcTotals(d).total)} ({d.status})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label style={s.label}>Notes (printed above the signature block)</label>
                  <textarea rows={3} className="form-input" style={{ resize: 'vertical' }} value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
                </div>

                <div style={s.helperBox}>
                  <div style={{ ...s.helperTitle, display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Landmark size={15} color="var(--color-gold)" /> Payment method &amp; bank details
                    </span>
                    <label style={{ ...s.toggleLabel, fontWeight: 400 }}>
                      <input
                        type="checkbox"
                        checked={!!form.custom?.hideBank}
                        onChange={(e) => setCustom('hideBank', e.target.checked)}
                      />
                      Hide this section
                    </label>
                  </div>
                  <div style={s.customHint}>
                    Edit the payment details printed on this document. Add, remove or reorder rows (for example a second
                    bank account or a note). Changes apply to the preview, print and PDF only.
                  </div>
                  <label style={s.label}>Section heading</label>
                  <input
                    className="form-input"
                    placeholder={defaultText.bankTitle}
                    value={form.custom?.bankTitle || ''}
                    onChange={(e) => setCustom('bankTitle', e.target.value)}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                    {bankRows.map((row, index) => (
                      <div key={index} style={s.row}>
                        <div style={{ ...s.col, flex: 1 }}>
                          <input
                            className="form-input"
                            placeholder="Label (e.g. Bank Name)"
                            value={row.label}
                            onChange={(e) => updateBankRow(index, 'label', e.target.value)}
                          />
                        </div>
                        <div style={{ ...s.col, flex: 2 }}>
                          <input
                            className="form-input"
                            placeholder="Value"
                            value={row.value}
                            onChange={(e) => updateBankRow(index, 'value', e.target.value)}
                          />
                        </div>
                        <button type="button" style={s.iconBtn} title="Move up" disabled={index === 0} onClick={() => moveBankRow(index, -1)}>
                          <ArrowUp size={14} color="var(--color-text-secondary)" />
                        </button>
                        <button type="button" style={s.iconBtn} title="Move down" disabled={index === bankRows.length - 1} onClick={() => moveBankRow(index, 1)}>
                          <ArrowDown size={14} color="var(--color-text-secondary)" />
                        </button>
                        <button type="button" style={s.iconBtn} title="Remove row" onClick={() => removeBankRow(index)}>
                          <Trash2 size={14} color="var(--color-cancelled)" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                    <button type="button" className="btn-secondary" onClick={addBankRow}><Plus size={14} /> Add row</button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setForm(prev => {
                        const custom = { ...(prev.custom || {}) };
                        delete custom.bankRows;
                        delete custom.bankTitle;
                        return { ...prev, custom };
                      })}
                    >
                      Reset to standard bank details
                    </button>
                  </div>
                </div>

                <details style={s.customBox}>
                  <summary style={s.customSummary}>
                    <SlidersHorizontal size={14} /> Customize printed text (headings, company, bank, signatures, footer)
                  </summary>
                  <div style={s.customHint}>
                    Change any wording on this document before you print or download it. Leave a field empty to use the
                    standard text. These changes apply to the preview, print and PDF only and are not saved.
                  </div>

                  <div style={s.toggleRow}>
                    {SHEET_TOGGLES.filter(toggle => toggle.key !== 'hideBank').map(toggle => (
                      <label key={toggle.key} style={s.toggleLabel}>
                        <input
                          type="checkbox"
                          checked={!!form.custom?.[toggle.key]}
                          onChange={(e) => setCustom(toggle.key, e.target.checked)}
                        />
                        {toggle.label}
                      </label>
                    ))}
                    <label style={s.toggleLabel}>
                      Qty / unit price columns
                      <select
                        className="form-input"
                        style={{ width: 'auto', padding: '4px 8px' }}
                        value={form.custom?.qtyColumns || ''}
                        onChange={(e) => setCustom('qtyColumns', e.target.value)}
                      >
                        <option value="">Automatic</option>
                        <option value="show">Always show</option>
                        <option value="hide">Always hide</option>
                      </select>
                    </label>
                  </div>

                  {SHEET_TEXT_GROUPS.map(group => (
                    <div key={group.title}>
                      <div style={s.customGroup}>{group.title}</div>
                      <div style={s.customGrid}>
                        {group.fields.map(field => (
                          <div key={field.key} style={field.multiline ? { gridColumn: '1 / -1' } : undefined}>
                            <label style={s.label}>{field.label}</label>
                            {field.multiline ? (
                              <textarea
                                rows={4}
                                className="form-input"
                                style={{ resize: 'vertical' }}
                                placeholder={defaultText[field.key]}
                                value={form.custom?.[field.key] || ''}
                                onChange={(e) => setCustom(field.key, e.target.value)}
                              />
                            ) : (
                              <input
                                className="form-input"
                                placeholder={defaultText[field.key]}
                                value={form.custom?.[field.key] || ''}
                                onChange={(e) => setCustom(field.key, e.target.value)}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ marginTop: '12px' }}
                    onClick={() => setField('custom', {})}
                  >
                    Reset to standard text
                  </button>
                </details>

                <div style={s.totalsBox}>
                  <div>Subtotal: <strong>{formatMoney(totals.subtotal)}</strong></div>
                  {totals.discountAmount > 0 && <div>Discount: <strong>- {formatMoney(totals.discountAmount)}</strong></div>}
                  {totals.taxAmount > 0 && <div>VAT: <strong>{formatMoney(totals.taxAmount)}</strong></div>}
                  <div>Total: <strong>LKR {formatMoney(totals.total)}</strong></div>
                  {totals.advance > 0 && <div>Balance due: <strong>LKR {formatMoney(totals.balance)}</strong></div>}
                </div>

                {formError && <div style={s.formError}>{formError}</div>}

                <div style={s.modalActions}>
                  <button type="button" className="btn-secondary" onClick={() => setForm(null)}>Cancel</button>
                  <PdfDownload
                    sheets={[<InvoiceSheet key="pdf" doc={form} />]}
                    filename={pdfFileName(form.doc_number, form.client_name)}
                  />
                  <button type="button" className="btn-secondary" onClick={() => window.print()}>
                    <Printer size={15} /> Print
                  </button>
                  <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>

              <div style={s.previewPane}>
                <div style={s.label}>Live preview</div>
                <ScaledSheet doc={form} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print-only copy at natural A4 size; the rest of the app is hidden by print CSS. */}
      {printDoc && createPortal(
        <div className="print-only-sheet">
          <InvoiceSheet doc={printDoc} />
        </div>,
        document.body
      )}
    </div>
  );
}

const s = {
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' },
  pageTitle: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' },
  pageSubtitle: { color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' },
  errorBanner: { display: 'flex', gap: '10px', alignItems: 'center', padding: '12px 16px', fontSize: 'var(--font-size-sm)' },
  summaryRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px' },
  summaryCard: { padding: '16px 18px' },
  summaryLabel: { fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' },
  summaryValue: { fontSize: 'var(--font-size-xl)', fontWeight: 700 },
  filterBar: { display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', padding: '12px 16px' },
  searchBox: { display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '200px' },
  searchInput: { flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' },
  filterSelect: { width: 'auto', minWidth: '140px' },
  statusSelect: { background: 'transparent', border: '1px solid', borderRadius: 'var(--radius-sm)', padding: '3px 6px', fontSize: 'var(--font-size-xs)', fontWeight: 600, cursor: 'pointer' },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' },
  overlay: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex',
    alignItems: 'flex-start', justifyContent: 'center', zIndex: 999, backdropFilter: 'blur(4px)',
    padding: '16px', overflowY: 'auto'
  },
  modal: {
    width: '100%', maxWidth: '1280px', padding: 'clamp(14px, 3vw, 24px)', backgroundColor: 'var(--bg-panel)',
    border: '1px solid var(--border-glass)', margin: 'auto'
  },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' },
  closeBtn: { fontSize: 'var(--font-size-2xl)', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' },
  editorGrid: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '24px', alignItems: 'start' },
  form: { display: 'flex', flexDirection: 'column', gap: '14px' },
  previewPane: { position: 'sticky', top: '8px', minWidth: 0 },
  row: { display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start' },
  col: { flex: 1, minWidth: '130px' },
  label: { display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.03em' },
  sectionLabel: { fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-gold)', marginTop: '6px' },
  itemBox: { border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '10px' },
  helperBox: { border: '1px dashed var(--color-gold)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' },
  helperTitle: { fontSize: 'var(--font-size-sm)', fontWeight: 700, marginBottom: '8px' },
  totalsBox: { display: 'flex', gap: '18px', flexWrap: 'wrap', padding: '10px 12px', backgroundColor: 'rgba(212,175,55,0.08)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-sm)' },
  formError: { color: 'var(--color-cancelled)', fontSize: 'var(--font-size-sm)', padding: '8px 12px', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)' },
  customBox: { border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' },
  customSummary: { cursor: 'pointer', fontWeight: 700, fontSize: 'var(--font-size-sm)', color: 'var(--color-gold)', display: 'flex', alignItems: 'center', gap: '8px' },
  customHint: { fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', margin: '10px 0' },
  customGroup: { fontSize: 'var(--font-size-sm)', fontWeight: 700, margin: '14px 0 8px' },
  customGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' },
  toggleRow: { display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', fontSize: 'var(--font-size-sm)' },
  toggleLabel: { display: 'flex', alignItems: 'center', gap: '6px' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }
};
