import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Paperclip, Trash2, FileText, AlertTriangle } from 'lucide-react';
import { supabase, isUsingMock } from '../supabaseClient';
import { formatMoney } from '../invoiceUtils';
import { currentMonthKey, shiftMonthKey, monthLabel, toLocalDateStr } from '../payrollUtils';

const BUCKET = 'finance-docs';
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const CATEGORIES = [
  'Rent & Utilities',
  'Software & Subscriptions',
  'Advertising',
  'Equipment',
  'Transport',
  'Office Supplies',
  'Meals & Refreshments',
  'Professional Fees',
  'Other'
];
const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Card', 'Online'];

const safeFileName = (name) => name.replace(/[^a-zA-Z0-9._-]+/g, '_');

const blankForm = () => ({
  expense_date: toLocalDateStr(),
  category: CATEGORIES[0],
  vendor: '',
  description: '',
  amount: '',
  payment_method: PAYMENT_METHODS[0],
  file: null
});

export default function Expenses({ currentUserProfile = {} }) {
  const [month, setMonth] = useState(currentMonthKey());
  const [expenses, setExpenses] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [form, setForm] = useState(blankForm());
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [attachingId, setAttachingId] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('expenses').select('*');
    setLoadError(error ? error.message : '');
    setExpenses(data || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const monthExpenses = useMemo(
    () => expenses
      .filter(e => String(e.expense_date).startsWith(month))
      .sort((a, b) => String(b.expense_date).localeCompare(String(a.expense_date))),
    [expenses, month]
  );
  const visible = monthExpenses.filter(e => !filterCategory || e.category === filterCategory);

  const total = monthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const byCategory = monthExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + (Number(e.amount) || 0);
    return acc;
  }, {});

  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const validateFile = (file) => {
    if (!file) return '';
    if (file.size > MAX_FILE_BYTES) return 'The receipt file must be 10 MB or smaller.';
    if (!/^(image\/|application\/pdf)/.test(file.type)) return 'Receipts must be an image or a PDF.';
    return '';
  };

  const uploadReceipt = async (file) => {
    const objectPath = `receipts/${new Date().getFullYear()}/${Date.now()}-${safeFileName(file.name)}`;
    const { error } = await supabase.storage.from(BUCKET).upload(objectPath, file, { contentType: file.type });
    if (error) throw error;
    return { receipt_path: objectPath, receipt_name: file.name };
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setFormError('');

    const amount = Number(form.amount);
    if (!(amount > 0)) {
      setFormError('Enter the expense amount.');
      return;
    }
    const fileProblem = validateFile(form.file);
    if (fileProblem) {
      setFormError(fileProblem);
      return;
    }

    setSaving(true);
    try {
      const receipt = form.file && !isUsingMock ? await uploadReceipt(form.file) : {};
      const { error } = await supabase.from('expenses').insert({
        expense_date: form.expense_date,
        category: form.category,
        vendor: form.vendor.trim() || null,
        description: form.description.trim() || null,
        amount,
        payment_method: form.payment_method,
        created_by: currentUserProfile.id,
        ...receipt
      });
      if (error) throw error;
      setForm(blankForm());
      await load();
    } catch (err) {
      setFormError(`Could not save the expense: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAttach = async (expense, file) => {
    const fileProblem = validateFile(file);
    if (fileProblem) {
      alert(fileProblem);
      return;
    }
    setAttachingId(expense.id);
    try {
      const receipt = await uploadReceipt(file);
      const { error } = await supabase.from('expenses').update(receipt).eq('id', expense.id);
      if (error) throw error;
      await load();
    } catch (err) {
      alert(`Could not attach the receipt: ${err.message}`);
    } finally {
      setAttachingId('');
    }
  };

  const handleOpenReceipt = async (expense) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(expense.receipt_path, 120);
    if (error || !data?.signedUrl) {
      alert(`Could not open the receipt: ${error ? error.message : 'unknown error'}`);
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener');
  };

  const handleDelete = async (expense) => {
    if (!confirm(`Delete this expense (LKR ${formatMoney(expense.amount)})?`)) return;
    const { error } = await supabase.from('expenses').delete().eq('id', expense.id);
    if (error) {
      alert(`Could not delete: ${error.message}`);
      return;
    }
    // Best effort: the row is already gone, so a leftover file is harmless.
    if (expense.receipt_path && !isUsingMock) {
      await supabase.storage.from(BUCKET).remove([expense.receipt_path]);
    }
    await load();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {loadError && (
        <div className="glass-panel" style={s.warning}>
          <AlertTriangle size={18} color="#F59E0B" />
          <span>
            Could not load expenses ({loadError}). Run <strong>supabase_phase2_payroll_finance.sql</strong> in the Supabase SQL Editor.
          </span>
        </div>
      )}

      <form onSubmit={handleAdd} className="glass-panel" style={s.addPanel}>
        <div style={s.panelTitle}><Plus size={16} color="var(--color-gold)" /> Record an expense</div>
        <div style={s.row}>
          <div style={s.col}>
            <label style={s.label}>Date</label>
            <input type="date" required className="form-input" value={form.expense_date} onChange={(e) => setField('expense_date', e.target.value)} />
          </div>
          <div style={s.col}>
            <label style={s.label}>Category</label>
            <select className="form-input" value={form.category} onChange={(e) => setField('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={s.col}>
            <label style={s.label}>Amount (LKR)</label>
            <input type="number" min="0" step="any" required className="form-input" value={form.amount} onChange={(e) => setField('amount', e.target.value)} />
          </div>
          <div style={s.col}>
            <label style={s.label}>Paid by</label>
            <select className="form-input" value={form.payment_method} onChange={(e) => setField('payment_method', e.target.value)}>
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div style={s.row}>
          <div style={{ ...s.col, flex: 1 }}>
            <label style={s.label}>Vendor / payee</label>
            <input className="form-input" value={form.vendor} onChange={(e) => setField('vendor', e.target.value)} />
          </div>
          <div style={{ ...s.col, flex: 2 }}>
            <label style={s.label}>Description</label>
            <input className="form-input" value={form.description} onChange={(e) => setField('description', e.target.value)} />
          </div>
          <div style={{ ...s.col, flex: 1 }}>
            <label style={s.label}>Receipt (image or PDF)</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              disabled={isUsingMock}
              className="form-input"
              onChange={(e) => setField('file', e.target.files[0] || null)}
              key={form.file ? 'has-file' : 'no-file'}
            />
          </div>
        </div>
        {isUsingMock && <div style={s.subText}>Receipt upload needs the live Supabase connection (not available in sandbox mode).</div>}
        {formError && <div style={s.formError}>{formError}</div>}
        <div>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Add expense'}
          </button>
        </div>
      </form>

      <div style={s.toolbar}>
        <div style={s.monthNav}>
          <button style={s.navBtn} onClick={() => setMonth(shiftMonthKey(month, -1))}><ChevronLeft size={16} /></button>
          <span style={{ fontWeight: 700, minWidth: '140px', textAlign: 'center' }}>{monthLabel(month)}</span>
          <button style={s.navBtn} onClick={() => setMonth(shiftMonthKey(month, 1))}><ChevronRight size={16} /></button>
        </div>
        <select className="form-input" style={{ width: 'auto', minWidth: '180px' }} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', fontWeight: 800, fontSize: 'var(--font-size-lg)' }}>
          Total: <span style={{ color: '#EF4444' }}>LKR {formatMoney(total)}</span>
        </div>
      </div>

      {Object.keys(byCategory).length > 0 && (
        <div style={s.chips}>
          {Object.entries(byCategory).map(([cat, amount]) => (
            <span key={cat} style={s.chip}>{cat}: <strong>{formatMoney(amount)}</strong></span>
          ))}
        </div>
      )}

      <div className="glass-panel" style={{ padding: '8px' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Vendor / description</th>
                <th>Paid by</th>
                <th style={{ textAlign: 'right' }}>Amount (LKR)</th>
                <th>Receipt</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map(expense => (
                <tr key={expense.id}>
                  <td>{String(expense.expense_date).substring(0, 10)}</td>
                  <td>{expense.category}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{expense.vendor || '-'}</div>
                    {expense.description && <div style={s.subText}>{expense.description}</div>}
                  </td>
                  <td>{expense.payment_method || '-'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatMoney(expense.amount)}</td>
                  <td>
                    {expense.receipt_path ? (
                      <button type="button" style={s.linkBtn} onClick={() => handleOpenReceipt(expense)} title={expense.receipt_name}>
                        <FileText size={14} /> View
                      </button>
                    ) : (
                      <label style={{ ...s.linkBtn, cursor: isUsingMock ? 'not-allowed' : 'pointer' }}>
                        <Paperclip size={14} /> {attachingId === expense.id ? 'Uploading...' : 'Attach'}
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          style={{ display: 'none' }}
                          disabled={isUsingMock || attachingId === expense.id}
                          onChange={(e) => e.target.files[0] && handleAttach(expense, e.target.files[0])}
                        />
                      </label>
                    )}
                  </td>
                  <td>
                    <button type="button" style={s.iconBtn} title="Delete" onClick={() => handleDelete(expense)}>
                      <Trash2 size={14} color="var(--color-cancelled)" />
                    </button>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)' }}>No expenses recorded for this month.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const s = {
  warning: { display: 'flex', gap: '10px', alignItems: 'center', padding: '12px 16px', fontSize: 'var(--font-size-sm)' },
  addPanel: { padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' },
  panelTitle: { display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 },
  row: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  col: { flex: '1 1 150px', minWidth: '140px' },
  label: { display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.03em' },
  formError: { color: 'var(--color-cancelled)', fontSize: 'var(--font-size-sm)' },
  subText: { fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: '2px' },
  toolbar: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  monthNav: { display: 'flex', alignItems: 'center', gap: '8px' },
  navBtn: { background: 'var(--bg-badge-dark)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--color-gold)', cursor: 'pointer', padding: '6px', display: 'flex' },
  chips: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  chip: { fontSize: 'var(--font-size-xs)', padding: '4px 10px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-subtle)', color: 'var(--color-text-secondary)' },
  linkBtn: { display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: 'var(--color-gold)', cursor: 'pointer', fontSize: 'var(--font-size-sm)', padding: 0 },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }
};
