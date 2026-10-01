import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft,
  ChevronRight,
  Calculator,
  Pencil,
  Printer,
  Plus,
  Trash2,
  Banknote,
  AlertTriangle,
  CheckCircle2,
  Settings2
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { formatMoney } from '../invoiceUtils';
import {
  currentMonthKey,
  shiftMonthKey,
  monthLabel,
  computePayrollAutoFields,
  runTotals,
  hourlyRate,
  round2,
  toLocalDateStr,
  OT_MULTIPLIER,
  OT_HOURLY_DIVISOR,
  NO_PAY_DAY_DIVISOR
} from '../payrollUtils';
import PayslipSheet from './PayslipSheet';

const STATUS_COLORS = { Draft: '#9CA3AF', Finalized: '#3B82F6', Paid: '#10B981' };

const blankLine = () => ({ label: '', amount: '' });

// Fields that come from attendance + salary; a Draft is "out of date" when these drift.
const AUTO_KEYS = ['basic_salary', 'fixed_allowance', 'ot_hours', 'ot_amount', 'no_pay_days', 'no_pay_deduction'];

export default function Payroll({ profiles = [], timeLogs = [], currentUserProfile = {} }) {
  const [month, setMonth] = useState(currentMonthKey());
  const [salaries, setSalaries] = useState([]);
  const [marks, setMarks] = useState([]);
  const [runs, setRuns] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);

  const [salaryForm, setSalaryForm] = useState(null);
  const [runForm, setRunForm] = useState(null);
  const [printRun, setPrintRun] = useState(null);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    const [salRes, markRes, runRes] = await Promise.all([
      supabase.from('employee_salaries').select('*'),
      supabase.from('attendance_marks').select('*'),
      supabase.from('payroll_runs').select('*')
    ]);
    const firstError = salRes.error || markRes.error || runRes.error;
    setLoadError(firstError ? firstError.message : '');
    setSalaries(salRes.data || []);
    setMarks(markRes.data || []);
    setRuns(runRes.data || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const today = toLocalDateStr();

  const rows = useMemo(() => profiles.map(profile => {
    const salary = salaries.find(s => s.employee_id === profile.id) || null;
    const run = runs.find(r => r.month === month && r.employee_id === profile.id) || null;
    const auto = salary
      ? computePayrollAutoFields({ salary, employeeId: profile.id, monthKey: month, timeLogs, marks, today })
      : null;
    const stale = !!(run && auto && run.status === 'Draft' &&
      AUTO_KEYS.some(key => Math.abs((Number(run[key]) || 0) - (Number(auto[key]) || 0)) > 0.005));
    return { profile, salary, run, auto, stale };
  }), [profiles, salaries, runs, marks, timeLogs, month, today]);

  const monthRuns = runs.filter(r => r.month === month);
  const sums = monthRuns.reduce((acc, r) => {
    acc.gross += Number(r.gross_pay) || 0;
    acc.deductions += Number(r.total_deductions) || 0;
    acc.net += Number(r.net_pay) || 0;
    return acc;
  }, { gross: 0, deductions: 0, net: 0 });
  const attentionCount = rows.filter(r => r.auto && (r.auto.unmarkedDays > 0 || r.auto.openLogs > 0)).length;

  const buildRunPayload = (row, existing) => {
    const base = {
      month,
      employee_id: row.profile.id,
      employee_name: row.profile.full_name,
      basic_salary: row.auto.basic_salary,
      fixed_allowance: row.auto.fixed_allowance,
      ot_hours: row.auto.ot_hours,
      ot_amount: row.auto.ot_amount,
      no_pay_days: row.auto.no_pay_days,
      no_pay_deduction: row.auto.no_pay_deduction,
      additions: existing?.additions || [],
      deductions: existing?.deductions || [],
      notes: existing?.notes || null
    };
    const totals = runTotals(base);
    return {
      ...base,
      gross_pay: totals.gross,
      total_deductions: totals.totalDeductions,
      net_pay: totals.net,
      updated_at: new Date().toISOString()
    };
  };

  // Create or refresh a Draft payslip for every employee that has a salary profile.
  const handleCalculate = async () => {
    setBusy(true);
    let failure = '';
    for (const row of rows) {
      if (!row.salary || !row.auto) continue;
      if (row.run && row.run.status !== 'Draft') continue;
      const payload = buildRunPayload(row, row.run);
      const { error } = row.run
        ? await supabase.from('payroll_runs').update(payload).eq('id', row.run.id)
        : await supabase.from('payroll_runs').insert({ ...payload, status: 'Draft', created_by: currentUserProfile.id });
      if (error) failure = error.message;
    }
    await load();
    setBusy(false);
    if (failure) alert(`Some payslips could not be saved: ${failure}`);
  };

  const handleSetStatus = async (row, nextStatus) => {
    const { run, auto } = row;
    if (nextStatus === 'Finalized' && auto && (auto.unmarkedDays > 0 || auto.openLogs > 0)) {
      const proceed = confirm(
        `${row.profile.full_name} has ${auto.unmarkedDays} unmarked day(s) and ${auto.openLogs} open time log(s) this month. ` +
        'Unmarked days are NOT deducted. Finalize anyway?'
      );
      if (!proceed) return;
    }
    setBusy(true);
    // Finalizing re-reads attendance so the payslip matches the latest marks.
    const payload = nextStatus === 'Finalized' && auto ? buildRunPayload(row, run) : {};
    const update = {
      ...payload,
      status: nextStatus,
      paid_date: nextStatus === 'Paid' ? today : null,
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from('payroll_runs').update(update).eq('id', run.id);
    await load();
    setBusy(false);
    if (error) alert(`Could not update payslip: ${error.message}`);
  };

  const openSalary = (row) => {
    setFormError('');
    setSalaryForm({
      employee: row.profile,
      id: row.salary?.id || null,
      basic_salary: row.salary ? String(row.salary.basic_salary) : '',
      fixed_allowance: row.salary ? String(row.salary.fixed_allowance || '') : '',
      notes: row.salary?.notes || ''
    });
  };

  const handleSaveSalary = async (e) => {
    e.preventDefault();
    const basic = Number(salaryForm.basic_salary);
    if (!(basic >= 0) || salaryForm.basic_salary === '') {
      setFormError('Enter the monthly basic salary.');
      return;
    }
    const payload = {
      employee_id: salaryForm.employee.id,
      basic_salary: basic,
      fixed_allowance: Number(salaryForm.fixed_allowance) || 0,
      notes: salaryForm.notes.trim() || null,
      updated_at: new Date().toISOString()
    };
    const { error } = salaryForm.id
      ? await supabase.from('employee_salaries').update(payload).eq('id', salaryForm.id)
      : await supabase.from('employee_salaries').insert(payload);
    if (error) {
      setFormError(`Could not save salary: ${error.message}`);
      return;
    }
    setSalaryForm(null);
    await load();
  };

  const openRunEditor = (row) => {
    setFormError('');
    setRunForm({
      row,
      additions: (row.run.additions || []).length ? row.run.additions.map(a => ({ ...a })) : [blankLine()],
      deductions: (row.run.deductions || []).length ? row.run.deductions.map(d => ({ ...d })) : [blankLine()],
      notes: row.run.notes || ''
    });
  };

  const updateLine = (listKey, index, key, value) => {
    setRunForm(prev => ({
      ...prev,
      [listKey]: prev[listKey].map((line, i) => (i === index ? { ...line, [key]: value } : line))
    }));
  };

  const removeLine = (listKey, index) => {
    setRunForm(prev => {
      const next = prev[listKey].filter((_, i) => i !== index);
      return { ...prev, [listKey]: next.length ? next : [blankLine()] };
    });
  };

  const cleanLines = (lines) => lines
    .filter(line => line.label.trim() && Number(line.amount))
    .map(line => ({ label: line.label.trim(), amount: round2(Number(line.amount)) }));

  const handleSaveRun = async (e) => {
    e.preventDefault();
    const { row } = runForm;
    const merged = {
      ...row.run,
      additions: cleanLines(runForm.additions),
      deductions: cleanLines(runForm.deductions)
    };
    const totals = runTotals(merged);
    const { error } = await supabase.from('payroll_runs').update({
      additions: merged.additions,
      deductions: merged.deductions,
      notes: runForm.notes.trim() || null,
      gross_pay: totals.gross,
      total_deductions: totals.totalDeductions,
      net_pay: totals.net,
      updated_at: new Date().toISOString()
    }).eq('id', row.run.id);
    if (error) {
      setFormError(`Could not save: ${error.message}`);
      return;
    }
    setRunForm(null);
    await load();
  };

  const formTotals = runForm
    ? runTotals({
        ...runForm.row.run,
        additions: cleanLines(runForm.additions),
        deductions: cleanLines(runForm.deductions)
      })
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={s.toolbar}>
        <div style={s.monthNav}>
          <button style={s.navBtn} onClick={() => setMonth(shiftMonthKey(month, -1))}><ChevronLeft size={16} /></button>
          <span style={{ fontWeight: 700, minWidth: '140px', textAlign: 'center' }}>{monthLabel(month)}</span>
          <button style={s.navBtn} onClick={() => setMonth(shiftMonthKey(month, 1))}><ChevronRight size={16} /></button>
        </div>
        <button className="btn-primary" onClick={handleCalculate} disabled={busy}>
          <Calculator size={15} /> {busy ? 'Working...' : 'Calculate month'}
        </button>
      </div>

      {loadError && (
        <div className="glass-panel" style={s.warning}>
          <AlertTriangle size={18} color="#F59E0B" />
          <span>
            Could not load payroll data ({loadError}). Run <strong>supabase_phase2_payroll_finance.sql</strong> in
            the Supabase SQL Editor (after the Phase 1 file).
          </span>
        </div>
      )}

      <div style={s.summaryRow}>
        <div className="glass-panel" style={s.summaryCard}>
          <div style={s.summaryLabel}>Gross</div>
          <div style={s.summaryValue}>LKR {formatMoney(sums.gross)}</div>
        </div>
        <div className="glass-panel" style={s.summaryCard}>
          <div style={s.summaryLabel}>Deductions</div>
          <div style={{ ...s.summaryValue, color: '#EF4444' }}>LKR {formatMoney(sums.deductions)}</div>
        </div>
        <div className="glass-panel" style={s.summaryCard}>
          <div style={s.summaryLabel}>Net payable</div>
          <div style={{ ...s.summaryValue, color: '#10B981' }}>LKR {formatMoney(sums.net)}</div>
        </div>
        <div className="glass-panel" style={s.summaryCard}>
          <div style={s.summaryLabel}>Need attention</div>
          <div style={{ ...s.summaryValue, color: attentionCount ? '#F59E0B' : 'var(--color-text-primary)' }}>{attentionCount}</div>
        </div>
      </div>

      <div style={s.ruleNote}>
        Overtime = hours x {OT_MULTIPLIER} x (basic / {OT_HOURLY_DIVISOR}). No-pay day = basic / {NO_PAY_DAY_DIVISOR}.
        EPF/ETF, tax and loan recoveries are entered by hand under Edit.
      </div>

      <div className="glass-panel" style={{ padding: '8px' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th style={{ textAlign: 'right' }}>Basic</th>
                <th style={{ textAlign: 'right' }}>OT (h / LKR)</th>
                <th style={{ textAlign: 'right' }}>No-pay days</th>
                <th style={{ textAlign: 'right' }}>Net pay</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ profile, salary, run, auto, stale }) => (
                <tr key={profile.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{profile.full_name}</div>
                    <div style={s.subText}>{profile.role}</div>
                  </td>
                  {!salary ? (
                    <td colSpan={4} style={{ color: 'var(--color-text-muted)' }}>No salary set yet</td>
                  ) : (
                    <>
                      <td style={{ textAlign: 'right' }}>{formatMoney(salary.basic_salary)}</td>
                      <td style={{ textAlign: 'right' }}>
                        {run ? `${run.ot_hours} / ${formatMoney(run.ot_amount)}` : `${auto.ot_hours} / ${formatMoney(auto.ot_amount)}`}
                      </td>
                      <td style={{ textAlign: 'right' }}>{run ? run.no_pay_days : auto.no_pay_days}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>
                        {run ? formatMoney(run.net_pay) : <span style={s.subText}>not calculated</span>}
                      </td>
                    </>
                  )}
                  <td>
                    {run && (
                      <span style={{ ...s.statusPill, color: STATUS_COLORS[run.status], borderColor: STATUS_COLORS[run.status] }}>
                        {run.status}
                      </span>
                    )}
                    {stale && <div style={{ ...s.subText, color: '#F59E0B' }}>Out of date - recalculate</div>}
                    {auto && (auto.unmarkedDays > 0 || auto.openLogs > 0) && (
                      <div style={{ ...s.subText, color: '#F59E0B' }}>
                        {auto.unmarkedDays > 0 && `${auto.unmarkedDays} unmarked day(s)`}
                        {auto.unmarkedDays > 0 && auto.openLogs > 0 && ', '}
                        {auto.openLogs > 0 && `${auto.openLogs} open log(s)`}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={s.actions}>
                      <button style={s.iconBtn} title="Salary setup" onClick={() => openSalary({ profile, salary })}>
                        <Settings2 size={15} color="var(--color-text-secondary)" />
                      </button>
                      {run && run.status !== 'Paid' && (
                        <button style={s.iconBtn} title="Edit additions / deductions" onClick={() => openRunEditor({ profile, salary, run, auto })}>
                          <Pencil size={14} color="var(--color-gold)" />
                        </button>
                      )}
                      {run && (
                        <button style={s.iconBtn} title="Print payslip" onClick={() => setPrintRun(run)}>
                          <Printer size={15} color="var(--color-gold)" />
                        </button>
                      )}
                      {run && run.status === 'Draft' && (
                        <button className="btn-secondary" style={s.smallBtn} disabled={busy} onClick={() => handleSetStatus({ profile, salary, run, auto }, 'Finalized')}>
                          <CheckCircle2 size={13} /> Finalize
                        </button>
                      )}
                      {run && run.status === 'Finalized' && (
                        <>
                          <button className="btn-secondary" style={s.smallBtn} disabled={busy} onClick={() => handleSetStatus({ profile, salary, run, auto }, 'Paid')}>
                            <Banknote size={13} /> Mark paid
                          </button>
                          <button className="btn-secondary" style={s.smallBtn} disabled={busy} onClick={() => handleSetStatus({ profile, salary, run, auto }, 'Draft')}>
                            Reopen
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)' }}>No employees found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Salary setup */}
      {salaryForm && (
        <div style={s.overlay}>
          <div className="glass-panel" style={s.modal}>
            <div style={s.modalHeader}>
              <h3>Salary - {salaryForm.employee.full_name}</h3>
              <button style={s.closeBtn} onClick={() => setSalaryForm(null)}>&times;</button>
            </div>
            <form onSubmit={handleSaveSalary} style={s.form}>
              <div>
                <label style={s.label}>Monthly basic salary (LKR)</label>
                <input
                  type="number" min="0" step="any" required className="form-input"
                  value={salaryForm.basic_salary}
                  onChange={(e) => setSalaryForm({ ...salaryForm, basic_salary: e.target.value })}
                />
                {Number(salaryForm.basic_salary) > 0 && (
                  <div style={s.subText}>
                    Overtime rate: LKR {formatMoney(hourlyRate(salaryForm.basic_salary) * OT_MULTIPLIER)} per hour
                  </div>
                )}
              </div>
              <div>
                <label style={s.label}>Fixed monthly allowance (LKR, optional)</label>
                <input
                  type="number" min="0" step="any" className="form-input"
                  value={salaryForm.fixed_allowance}
                  onChange={(e) => setSalaryForm({ ...salaryForm, fixed_allowance: e.target.value })}
                />
              </div>
              <div>
                <label style={s.label}>Notes (optional)</label>
                <input
                  className="form-input" value={salaryForm.notes}
                  onChange={(e) => setSalaryForm({ ...salaryForm, notes: e.target.value })}
                />
              </div>
              {formError && <div style={s.formError}>{formError}</div>}
              <div style={s.modalActions}>
                <button type="button" className="btn-secondary" onClick={() => setSalaryForm(null)}>Cancel</button>
                <button type="submit" className="btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payslip editor */}
      {runForm && (
        <div style={s.overlay}>
          <div className="glass-panel" style={{ ...s.modal, maxWidth: '620px' }}>
            <div style={s.modalHeader}>
              <h3>{runForm.row.profile.full_name} - {monthLabel(month)}</h3>
              <button style={s.closeBtn} onClick={() => setRunForm(null)}>&times;</button>
            </div>
            <form onSubmit={handleSaveRun} style={s.form}>
              <div style={s.autoBox}>
                <div>Basic: <strong>{formatMoney(runForm.row.run.basic_salary)}</strong></div>
                <div>Allowance: <strong>{formatMoney(runForm.row.run.fixed_allowance)}</strong></div>
                <div>Overtime: <strong>{runForm.row.run.ot_hours} h = {formatMoney(runForm.row.run.ot_amount)}</strong></div>
                <div>No-pay: <strong>{runForm.row.run.no_pay_days} day(s) = -{formatMoney(runForm.row.run.no_pay_deduction)}</strong></div>
              </div>

              {[['additions', 'Additions (bonus, commission...)'], ['deductions', 'Deductions (EPF, advance, loan...)']].map(([listKey, title]) => (
                <div key={listKey}>
                  <div style={s.sectionLabel}>{title}</div>
                  {runForm[listKey].map((line, index) => (
                    <div key={index} style={s.lineRow}>
                      <input
                        className="form-input" placeholder="Label" value={line.label}
                        onChange={(e) => updateLine(listKey, index, 'label', e.target.value)}
                        style={{ flex: 2 }}
                      />
                      <input
                        type="number" min="0" step="any" className="form-input" placeholder="Amount" value={line.amount}
                        onChange={(e) => updateLine(listKey, index, 'amount', e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button type="button" style={s.iconBtn} onClick={() => removeLine(listKey, index)}>
                        <Trash2 size={14} color="var(--color-cancelled)" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button" className="btn-secondary" style={s.smallBtn}
                    onClick={() => setRunForm(prev => ({ ...prev, [listKey]: [...prev[listKey], blankLine()] }))}
                  >
                    <Plus size={12} /> Add line
                  </button>
                </div>
              ))}

              <div>
                <label style={s.label}>Notes (printed on the payslip)</label>
                <input
                  className="form-input" value={runForm.notes}
                  onChange={(e) => setRunForm({ ...runForm, notes: e.target.value })}
                />
              </div>

              <div style={s.autoBox}>
                <div>Gross: <strong>{formatMoney(formTotals.gross)}</strong></div>
                <div>Deductions: <strong>{formatMoney(formTotals.totalDeductions)}</strong></div>
                <div>Net pay: <strong>LKR {formatMoney(formTotals.net)}</strong></div>
              </div>

              {formError && <div style={s.formError}>{formError}</div>}
              <div style={s.modalActions}>
                <button type="button" className="btn-secondary" onClick={() => setRunForm(null)}>Cancel</button>
                <button type="submit" className="btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payslip viewer */}
      {printRun && (
        <div style={s.overlay}>
          <div className="glass-panel" style={{ ...s.modal, maxWidth: '640px' }}>
            <div style={s.modalHeader}>
              <h3>Payslip - {printRun.employee_name}</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-primary" onClick={() => window.print()}><Printer size={15} /> Print / Save as PDF</button>
                <button className="btn-secondary" onClick={() => setPrintRun(null)}>Close</button>
              </div>
            </div>
            <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
              <div style={{ width: '556px', height: '786px', overflow: 'hidden' }}>
                <div style={{ width: '794px', transform: 'scale(0.7)', transformOrigin: 'top left' }}>
                  <PayslipSheet run={printRun} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {printRun && createPortal(
        <div className="print-only-sheet"><PayslipSheet run={printRun} /></div>,
        document.body
      )}
    </div>
  );
}

const s = {
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  monthNav: { display: 'flex', alignItems: 'center', gap: '8px' },
  navBtn: { background: 'var(--bg-badge-dark)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--color-gold)', cursor: 'pointer', padding: '6px', display: 'flex' },
  warning: { display: 'flex', gap: '10px', alignItems: 'center', padding: '12px 16px', fontSize: 'var(--font-size-sm)' },
  summaryRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' },
  summaryCard: { padding: '14px 16px' },
  summaryLabel: { fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' },
  summaryValue: { fontSize: 'var(--font-size-lg)', fontWeight: 800 },
  ruleNote: { fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' },
  subText: { fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: '2px' },
  statusPill: { border: '1px solid', borderRadius: 'var(--radius-full)', padding: '2px 10px', fontSize: 'var(--font-size-xs)', fontWeight: 700 },
  actions: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' },
  smallBtn: { padding: '4px 10px', fontSize: 'var(--font-size-xs)', display: 'inline-flex', alignItems: 'center', gap: '4px' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 999, backdropFilter: 'blur(4px)', padding: '16px', overflowY: 'auto' },
  modal: { width: '100%', maxWidth: '460px', padding: 'clamp(14px, 3vw, 24px)', backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-glass)', margin: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' },
  closeBtn: { fontSize: 'var(--font-size-2xl)', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' },
  form: { display: 'flex', flexDirection: 'column', gap: '14px' },
  label: { display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.03em' },
  sectionLabel: { fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-gold)', marginBottom: '8px' },
  lineRow: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' },
  autoBox: { display: 'flex', gap: '16px', flexWrap: 'wrap', padding: '10px 12px', backgroundColor: 'rgba(212,175,55,0.08)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-sm)' },
  formError: { color: 'var(--color-cancelled)', fontSize: 'var(--font-size-sm)' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px' }
};
