import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Ban, History, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { formatMoney } from '../invoiceUtils';
import { currentMonthKey, shiftMonthKey, monthLabel, loanOutstanding, loanRepaid, isLoanActive, toLocalDateStr } from '../payrollUtils';

const blankForm = (employeeId = '') => ({
  employee_id: employeeId,
  loan_type: 'Salary Advance',
  principal: '',
  installment: '',
  start_month: shiftMonthKey(currentMonthKey(), 1),
  issued_date: toLocalDateStr(),
  reason: ''
});

// Salary advances and staff loans. Each payslip deducts the instalment automatically until
// the balance reaches zero.
export default function Loans({ employees = [], loans = [], repayments = [], runs = [], currentUserProfile = {}, onReload }) {
  const [form, setForm] = useState(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [historyLoan, setHistoryLoan] = useState(null);
  const [filter, setFilter] = useState('open');

  const employeeName = (id) => employees.find(e => e.id === id)?.full_name || 'Unknown';

  const rows = useMemo(() => loans
    .map(loan => {
      const repaid = loanRepaid(loan, repayments, runs);
      const outstanding = loanOutstanding(loan, repayments, runs);
      const state = !isLoanActive(loan) ? 'Cancelled' : outstanding <= 0 ? 'Settled' : 'Active';
      return { loan, repaid, outstanding, state };
    })
    .filter(r => (filter === 'open' ? r.state === 'Active' : filter === 'all' ? true : r.state === filter))
    .sort((a, b) => String(b.loan.created_at).localeCompare(String(a.loan.created_at))),
  [loans, repayments, runs, filter]);

  const totalOutstanding = loans
    
    .filter(isLoanActive)
    .reduce((sum, l) => sum + loanOutstanding(l, repayments, runs), 0);
  const activeCount = loans.filter(l => isLoanActive(l) && loanOutstanding(l, repayments, runs) > 0).length;

  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    const principal = Number(form.principal);
    const installment = Number(form.installment);
    if (!form.employee_id) return setFormError('Choose the employee.');
    if (!(principal > 0)) return setFormError('Enter the amount given.');
    if (!(installment > 0)) return setFormError('Enter the monthly deduction.');

    setSaving(true);
    const { error } = await supabase.from('employee_loans').insert({
      employee_id: form.employee_id,
      loan_type: form.loan_type,
      principal,
      installment: Math.min(installment, principal),
      start_month: form.start_month,
      issued_date: form.issued_date,
      reason: form.reason.trim() || null,
      created_by: currentUserProfile.id
    });
    setSaving(false);
    if (error) {
      setFormError(`Could not save: ${error.message}`);
      return;
    }
    setForm(null);
    await onReload();
  };

  const handleCancel = async (loan) => {
    if (!confirm('Stop deducting this loan? Instalments already taken stay on the paid payslips.')) return;
    const { error } = await supabase.from('employee_loans').update({ status: 'Cancelled' }).eq('id', loan.id);
    if (error) alert(`Could not cancel: ${error.message}`);
    await onReload();
  };

  const handleDelete = async (loan) => {
    if (repayments.some(rp => rp.loan_id === loan.id)) {
      alert('This loan already has repayments on payslips. Cancel it instead of deleting.');
      return;
    }
    if (!confirm('Delete this loan record?')) return;
    const { error } = await supabase.from('employee_loans').delete().eq('id', loan.id);
    if (error) alert(`Could not delete: ${error.message}`);
    await onReload();
  };

  const monthsLeft = (loan, outstanding) => (Number(loan.installment) > 0 ? Math.ceil(outstanding / Number(loan.installment)) : 0);

  const historyRows = historyLoan
    ? repayments
        .filter(rp => rp.loan_id === historyLoan.id)
        .map(rp => ({ ...rp, run: runs.find(r => r.id === rp.run_id) }))
        .sort((a, b) => a.month.localeCompare(b.month))
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={s.toolbar}>
        <div style={s.summary}>
          <div className="glass-panel" style={s.card}>
            <div style={s.label}>Outstanding</div>
            <div style={{ ...s.value, color: '#F59E0B' }}>LKR {formatMoney(totalOutstanding)}</div>
          </div>
          <div className="glass-panel" style={s.card}>
            <div style={s.label}>Active loans</div>
            <div style={s.value}>{activeCount}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <select className="form-input" style={{ width: 'auto' }} value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="open">Active</option>
            <option value="Settled">Settled</option>
            <option value="Cancelled">Cancelled</option>
            <option value="all">All</option>
          </select>
          <button className="btn-primary" onClick={() => { setFormError(''); setForm(blankForm(employees.find(e => e.status === 'Active')?.id)); }}>
            <Plus size={15} /> New advance / loan
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '8px' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Type</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th style={{ textAlign: 'right' }}>Monthly</th>
                <th style={{ textAlign: 'right' }}>Repaid</th>
                <th style={{ textAlign: 'right' }}>Outstanding</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ loan, repaid, outstanding, state }) => {
                const pct = Math.min(100, Math.round((repaid / (Number(loan.principal) || 1)) * 100));
                return (
                  <tr key={loan.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{employeeName(loan.employee_id)}</div>
                      <div style={s.subText}>{loan.reason || `Issued ${String(loan.issued_date).substring(0, 10)}`}</div>
                    </td>
                    <td>{loan.loan_type}</td>
                    <td style={{ textAlign: 'right' }}>{formatMoney(loan.principal)}</td>
                    <td style={{ textAlign: 'right' }}>
                      {formatMoney(loan.installment)}
                      <div style={s.subText}>from {monthLabel(loan.start_month)}</div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {formatMoney(repaid)}
                      <div style={s.bar}><div style={{ ...s.barFill, width: `${pct}%` }} /></div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                      {formatMoney(outstanding)}
                      {state === 'Active' && <div style={s.subText}>~{monthsLeft(loan, outstanding)} month(s) left</div>}
                    </td>
                    <td>
                      <span style={{ ...s.pill, color: state === 'Active' ? '#F59E0B' : state === 'Settled' ? '#10B981' : '#9CA3AF', borderColor: state === 'Active' ? '#F59E0B' : state === 'Settled' ? '#10B981' : '#9CA3AF' }}>
                        {state}
                      </span>
                    </td>
                    <td>
                      <div style={s.actions}>
                        <button style={s.iconBtn} title="Repayment history" onClick={() => setHistoryLoan(loan)}>
                          <History size={15} color="var(--color-gold)" />
                        </button>
                        {state === 'Active' && (
                          <button style={s.iconBtn} title="Stop deductions" onClick={() => handleCancel(loan)}>
                            <Ban size={14} color="#F59E0B" />
                          </button>
                        )}
                        <button style={s.iconBtn} title="Delete" onClick={() => handleDelete(loan)}>
                          <Trash2 size={14} color="var(--color-cancelled)" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)' }}>
                  Nothing here. Record a salary advance or loan and the payslips will deduct it automatically.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {form && (
        <div style={s.overlay}>
          <div className="glass-panel" style={s.modal}>
            <div style={s.modalHeader}>
              <h3>New advance / loan</h3>
              <button style={s.closeBtn} onClick={() => setForm(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} style={s.form}>
              <div>
                <label style={s.label}>Employee</label>
                <select className="form-input" value={form.employee_id} onChange={(e) => setField('employee_id', e.target.value)}>
                  {employees.filter(e => e.status === 'Active').map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                </select>
              </div>
              <div style={s.row}>
                <div style={{ flex: 1 }}>
                  <label style={s.label}>Type</label>
                  <select className="form-input" value={form.loan_type} onChange={(e) => setField('loan_type', e.target.value)}>
                    <option value="Salary Advance">Salary advance</option>
                    <option value="Loan">Loan</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={s.label}>Given on</label>
                  <input type="date" className="form-input" value={form.issued_date} onChange={(e) => setField('issued_date', e.target.value)} />
                </div>
              </div>
              <div style={s.row}>
                <div style={{ flex: 1 }}>
                  <label style={s.label}>Amount (LKR)</label>
                  <input type="number" min="0" step="any" className="form-input" value={form.principal} onChange={(e) => setField('principal', e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={s.label}>Deduct per month (LKR)</label>
                  <input type="number" min="0" step="any" className="form-input" value={form.installment} onChange={(e) => setField('installment', e.target.value)} />
                </div>
              </div>
              <div style={s.row}>
                <div style={{ flex: 1 }}>
                  <label style={s.label}>First deduction month</label>
                  <input type="month" className="form-input" value={form.start_month} onChange={(e) => setField('start_month', e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={s.label}>Reason (optional)</label>
                  <input className="form-input" value={form.reason} onChange={(e) => setField('reason', e.target.value)} />
                </div>
              </div>
              {Number(form.principal) > 0 && Number(form.installment) > 0 && (
                <div style={s.hint}>
                  Repaid over about {Math.ceil(Number(form.principal) / Number(form.installment))} month(s), starting {monthLabel(form.start_month)}.
                </div>
              )}
              {formError && <div style={s.formError}>{formError}</div>}
              <div style={s.modalActions}>
                <button type="button" className="btn-secondary" onClick={() => setForm(null)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {historyLoan && (
        <div style={s.overlay}>
          <div className="glass-panel" style={s.modal}>
            <div style={s.modalHeader}>
              <h3>Repayments - {employeeName(historyLoan.employee_id)}</h3>
              <button style={s.closeBtn} onClick={() => setHistoryLoan(null)}><X size={18} /></button>
            </div>
            <table className="data-table">
              <thead><tr><th>Month</th><th style={{ textAlign: 'right' }}>Amount</th><th>Payslip</th></tr></thead>
              <tbody>
                {historyRows.map(rp => (
                  <tr key={rp.id}>
                    <td>{monthLabel(rp.month)}</td>
                    <td style={{ textAlign: 'right' }}>{formatMoney(rp.amount)}</td>
                    <td>{rp.run ? rp.run.status : '-'}</td>
                  </tr>
                ))}
                {historyRows.length === 0 && (
                  <tr><td colSpan={3} style={{ textAlign: 'center', padding: '16px', color: 'var(--color-text-muted)' }}>No payslip has deducted this yet.</td></tr>
                )}
              </tbody>
            </table>
            <div style={s.hint}>Only Finalized and Paid payslips reduce the outstanding balance.</div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  summary: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  card: { padding: '12px 16px', minWidth: '170px' },
  label: { display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.03em' },
  value: { fontSize: 'var(--font-size-lg)', fontWeight: 800 },
  subText: { fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: '2px' },
  bar: { height: '4px', borderRadius: '2px', backgroundColor: 'rgba(255,255,255,0.1)', marginTop: '4px', overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#10B981' },
  pill: { border: '1px solid', borderRadius: 'var(--radius-full)', padding: '2px 10px', fontSize: 'var(--font-size-xs)', fontWeight: 600 },
  actions: { display: 'flex', alignItems: 'center', gap: '8px' },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, backdropFilter: 'blur(4px)', padding: '16px', overflowY: 'auto' },
  modal: { width: '100%', maxWidth: '520px', padding: 'clamp(14px, 3vw, 24px)', backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-glass)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  closeBtn: { background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' },
  form: { display: 'flex', flexDirection: 'column', gap: '14px' },
  row: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  hint: { fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' },
  formError: { color: 'var(--color-cancelled)', fontSize: 'var(--font-size-sm)' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px' }
};
