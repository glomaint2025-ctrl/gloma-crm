import React, { useState, useMemo } from 'react';
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
  CheckCircle2,
  RotateCcw,
  History,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { formatMoney } from '../invoiceUtils';
import {
  currentMonthKey,
  shiftMonthKey,
  monthLabel,
  computePayroll,
  runTotals,
  runCompanyCost,
  round2,
  toLocalDateStr,
  AUTO_RUN_KEYS,
  allowanceItems
} from '../payrollUtils';
import PayslipSheet from './PayslipSheet';

const STATUS_COLORS = { Draft: '#9CA3AF', Finalized: '#3B82F6', Paid: '#10B981' };

const blankLine = () => ({ label: '', amount: '' });

export default function Payroll({
  employees = [],
  salaries = [],
  marks = [],
  runs = [],
  loans = [],
  repayments = [],
  settings,
  timeLogs = [],
  currentUserProfile = {},
  onReload
}) {
  const [month, setMonth] = useState(currentMonthKey());
  const [busy, setBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [runForm, setRunForm] = useState(null);
  const [printRuns, setPrintRuns] = useState(null);
  const [formError, setFormError] = useState('');

  const today = toLocalDateStr();
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-31`;

  // Employees who were on the payroll at some point during the month.
  const payrollEmployees = useMemo(() => employees.filter(e => {
    const joined = e.join_date ? String(e.join_date).substring(0, 10) : '';
    const ended = e.end_date ? String(e.end_date).substring(0, 10) : '';
    if (joined && joined > monthEnd) return false;
    if (e.status !== 'Active' && ended && ended < monthStart) return false;
    if (e.status !== 'Active' && !ended) return runs.some(r => r.month === month && r.employee_id === e.id);
    return true;
  }), [employees, runs, month, monthStart, monthEnd]);

  const rows = useMemo(() => payrollEmployees.map(employee => {
    const salary = salaries.find(sal => sal.employee_id === employee.id) || null;
    const run = runs.find(r => r.month === month && r.employee_id === employee.id) || null;
    const auto = salary
      ? computePayroll({
          employee, salary, settings, monthKey: month, timeLogs, marks, loans, repayments, runs,
          excludeRunId: run ? run.id : null, today
        })
      : null;
    const stale = !!(run && auto && run.status === 'Draft' &&
      AUTO_RUN_KEYS.some(key => Math.abs((Number(run[key]) || 0) - (Number(auto[key]) || 0)) > 0.005));
    return { employee, salary, run, auto, stale };
  }), [payrollEmployees, salaries, runs, marks, timeLogs, loans, repayments, settings, month, today]);

  const monthRuns = runs.filter(r => r.month === month);
  const sums = monthRuns.reduce((acc, r) => {
    const t = runTotals(r);
    acc.gross += t.gross;
    acc.deductions += t.totalDeductions;
    acc.net += t.net;
    acc.employer += (Number(r.epf_employer) || 0) + (Number(r.etf_employer) || 0);
    acc.cost += runCompanyCost(r);
    return acc;
  }, { gross: 0, deductions: 0, net: 0, employer: 0, cost: 0 });
  const attentionCount = rows.filter(r => r.auto && (r.auto.unmarkedDays > 0 || r.auto.openLogs > 0)).length;
  const missingSalary = rows.filter(r => !r.salary).length;
  const draftCount = monthRuns.filter(r => r.status === 'Draft').length;
  const finalizedCount = monthRuns.filter(r => r.status === 'Finalized').length;

  const history = useMemo(() => {
    const byMonth = {};
    runs.forEach(r => {
      const entry = byMonth[r.month] || { month: r.month, count: 0, gross: 0, deductions: 0, net: 0, cost: 0, draft: 0, finalized: 0, paid: 0 };
      const t = runTotals(r);
      entry.count += 1;
      entry.gross += t.gross;
      entry.deductions += t.totalDeductions;
      entry.net += t.net;
      entry.cost += runCompanyCost(r);
      if (r.status === 'Draft') entry.draft += 1;
      else if (r.status === 'Finalized') entry.finalized += 1;
      else if (r.status === 'Paid') entry.paid += 1;
      byMonth[r.month] = entry;
    });
    return Object.values(byMonth).sort((a, b) => b.month.localeCompare(a.month));
  }, [runs]);

  const buildRunPayload = (row, existing) => {
    const base = {
      month,
      employee_id: row.employee.id,
      employee_name: row.employee.full_name,
      basic_salary: row.auto.basic_salary,
      fixed_allowance: row.auto.fixed_allowance,
      allowances: row.auto.allowances,
      ot_hours: row.auto.ot_hours,
      ot_amount: row.auto.ot_amount,
      no_pay_days: row.auto.no_pay_days,
      no_pay_deduction: row.auto.no_pay_deduction,
      epf_base: row.auto.epf_base,
      epf_employee: row.auto.epf_employee,
      epf_employer: row.auto.epf_employer,
      etf_employer: row.auto.etf_employer,
      apit: row.auto.apit,
      loan_deduction: row.auto.loan_deduction,
      loan_details: row.auto.loan_details,
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

  // Keep the loan repayment rows of a payslip in step with what it deducts.
  const syncLoanRepayments = async (runId, details) => {
    await supabase.from('loan_repayments').delete().eq('run_id', runId);
    if (details.length) {
      await supabase.from('loan_repayments').insert(
        details.map(d => ({ loan_id: d.loan_id, run_id: runId, month, amount: d.amount }))
      );
    }
  };

  const saveRunFor = async (row, status = 'Draft') => {
    const payload = buildRunPayload(row, row.run);
    let runId = row.run ? row.run.id : null;
    let error;
    if (row.run) {
      ({ error } = await supabase.from('payroll_runs').update(payload).eq('id', row.run.id));
    } else {
      const res = await supabase
        .from('payroll_runs')
        .insert({ ...payload, status, created_by: currentUserProfile.id })
        .select()
        .single();
      error = res.error;
      runId = res.data ? res.data.id : null;
    }
    if (!error && runId) await syncLoanRepayments(runId, row.auto.loan_details);
    return error;
  };

  // Create or refresh a Draft payslip for every employee that has a salary.
  const handleCalculate = async () => {
    setBusy(true);
    let failure = '';
    for (const row of rows) {
      if (!row.salary || !row.auto) continue;
      if (row.run && row.run.status !== 'Draft') continue;
      const error = await saveRunFor(row);
      if (error) failure = error.message;
    }
    await onReload();
    setBusy(false);
    if (failure) alert(`Some payslips could not be saved: ${failure}`);
  };

  // Removes this month's unpaid payslips so the month can be calculated again.
  const handleResetMonth = async () => {
    const resettable = monthRuns.filter(r => r.status !== 'Paid');
    const keptPaid = monthRuns.length - resettable.length;
    if (resettable.length === 0) {
      alert(keptPaid ? 'Every payslip this month is already Paid. Use "Undo paid" on a row first.' : 'Nothing to reset for this month.');
      return;
    }
    const proceed = confirm(
      `Delete ${resettable.length} unpaid payslip(s) for ${monthLabel(month)}?` +
      (keptPaid ? ` ${keptPaid} paid payslip(s) will be kept.` : '') +
      ' Manual additions, deductions and notes on them are lost, and loan instalments on them are released. Salaries are not affected.'
    );
    if (!proceed) return;
    setBusy(true);
    const { error } = await supabase.from('payroll_runs').delete().eq('month', month).neq('status', 'Paid');
    await onReload();
    setBusy(false);
    if (error) alert(`Could not reset the month: ${error.message}`);
  };

  const setStatus = async (row, nextStatus, skipConfirm = false) => {
    const { run, auto } = row;
    const finalizing = nextStatus === 'Finalized' && run.status === 'Draft';
    if (finalizing && !skipConfirm && auto && (auto.unmarkedDays > 0 || auto.openLogs > 0)) {
      const proceed = confirm(
        `${row.employee.full_name} has ${auto.unmarkedDays} unmarked day(s) and ${auto.openLogs} open time log(s) this month. ` +
        'Unmarked days are NOT deducted. Finalize anyway?'
      );
      if (!proceed) return false;
    }
    // Finalizing re-reads attendance, salary and loans so the payslip is current.
    const payload = finalizing && auto ? buildRunPayload(row, run) : {};
    const { error } = await supabase.from('payroll_runs').update({
      ...payload,
      status: nextStatus,
      paid_date: nextStatus === 'Paid' ? today : null,
      updated_at: new Date().toISOString()
    }).eq('id', run.id);
    if (!error && finalizing && auto) await syncLoanRepayments(run.id, auto.loan_details);
    if (error) alert(`Could not update payslip: ${error.message}`);
    return !error;
  };

  const handleSetStatus = async (row, nextStatus) => {
    setBusy(true);
    await setStatus(row, nextStatus);
    await onReload();
    setBusy(false);
  };

  const handleFinalizeAll = async () => {
    const drafts = rows.filter(r => r.run && r.run.status === 'Draft');
    if (drafts.length === 0) return;
    const flagged = drafts.filter(r => r.auto && (r.auto.unmarkedDays > 0 || r.auto.openLogs > 0)).length;
    const proceed = confirm(
      `Finalize ${drafts.length} payslip(s) for ${monthLabel(month)}?` +
      (flagged ? ` ${flagged} of them still have unmarked days or open time logs (unmarked days are not deducted).` : '')
    );
    if (!proceed) return;
    setBusy(true);
    for (const row of drafts) await setStatus(row, 'Finalized', true);
    await onReload();
    setBusy(false);
  };

  const handleMarkAllPaid = async () => {
    const finalized = rows.filter(r => r.run && r.run.status === 'Finalized');
    if (finalized.length === 0) return;
    if (!confirm(`Mark ${finalized.length} payslip(s) as paid today (${today})?`)) return;
    setBusy(true);
    for (const row of finalized) await setStatus(row, 'Paid', true);
    await onReload();
    setBusy(false);
  };

  // ---- manual additions / deductions ----
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
    const merged = { ...row.run, additions: cleanLines(runForm.additions), deductions: cleanLines(runForm.deductions) };
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
    await onReload();
  };

  const formTotals = runForm
    ? runTotals({ ...runForm.row.run, additions: cleanLines(runForm.additions), deductions: cleanLines(runForm.deductions) })
    : null;

  const printPayload = (list) => list.map(run => ({
    run,
    employee: employees.find(e => e.id === run.employee_id) || null
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={s.toolbar}>
        <div style={s.monthNav}>
          <button style={s.navBtn} onClick={() => setMonth(shiftMonthKey(month, -1))}><ChevronLeft size={16} /></button>
          <span style={{ fontWeight: 700, minWidth: '140px', textAlign: 'center' }}>{monthLabel(month)}</span>
          <button style={s.navBtn} onClick={() => setMonth(shiftMonthKey(month, 1))}><ChevronRight size={16} /></button>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn-secondary" onClick={() => setShowHistory(v => !v)}>
            <History size={15} /> {showHistory ? 'Hide history' : 'History'}
          </button>
          <button className="btn-secondary" onClick={handleResetMonth} disabled={busy}>
            <RotateCcw size={15} /> Reset month
          </button>
          <button className="btn-primary" onClick={handleCalculate} disabled={busy}>
            <Calculator size={15} /> {busy ? 'Working...' : 'Calculate month'}
          </button>
        </div>
      </div>

      {showHistory && (
        <div className="glass-panel" style={{ padding: '8px' }}>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th style={{ textAlign: 'right' }}>Payslips</th>
                  <th style={{ textAlign: 'right' }}>Gross</th>
                  <th style={{ textAlign: 'right' }}>Deductions</th>
                  <th style={{ textAlign: 'right' }}>Net pay</th>
                  <th style={{ textAlign: 'right' }}>Cost to company</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {history.map(entry => (
                  <tr key={entry.month}>
                    <td style={{ fontWeight: 600 }}>{monthLabel(entry.month)}</td>
                    <td style={{ textAlign: 'right' }}>{entry.count}</td>
                    <td style={{ textAlign: 'right' }}>{formatMoney(entry.gross)}</td>
                    <td style={{ textAlign: 'right' }}>{formatMoney(entry.deductions)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatMoney(entry.net)}</td>
                    <td style={{ textAlign: 'right' }}>{formatMoney(entry.cost)}</td>
                    <td style={{ fontSize: 'var(--font-size-xs)' }}>
                      {entry.paid > 0 && <span style={{ color: STATUS_COLORS.Paid }}>{entry.paid} paid </span>}
                      {entry.finalized > 0 && <span style={{ color: STATUS_COLORS.Finalized }}>{entry.finalized} finalized </span>}
                      {entry.draft > 0 && <span style={{ color: STATUS_COLORS.Draft }}>{entry.draft} draft</span>}
                    </td>
                    <td>
                      <button className="btn-secondary" style={s.smallBtn} onClick={() => { setMonth(entry.month); setShowHistory(false); }}>Open</button>
                    </td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)' }}>No payroll has been calculated yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={s.summaryRow}>
        <div className="glass-panel" style={s.summaryCard}>
          <div style={s.summaryLabel}>Gross pay</div>
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
          <div style={s.summaryLabel}>Employer EPF + ETF</div>
          <div style={s.summaryValue}>LKR {formatMoney(sums.employer)}</div>
        </div>
        <div className="glass-panel" style={s.summaryCard}>
          <div style={s.summaryLabel}>Cost to company</div>
          <div style={s.summaryValue}>LKR {formatMoney(sums.cost)}</div>
        </div>
      </div>

      {(attentionCount > 0 || missingSalary > 0) && (
        <div className="glass-panel" style={s.warning}>
          <AlertTriangle size={18} color="#F59E0B" />
          <span>
            {missingSalary > 0 && `${missingSalary} employee(s) have no salary yet (set it under Employees). `}
            {attentionCount > 0 && `${attentionCount} employee(s) have unmarked days or open time logs (fix them under Attendance & leave).`}
          </span>
        </div>
      )}

      <div style={s.bulkRow}>
        <button className="btn-secondary" style={s.smallBtn} disabled={busy || draftCount === 0} onClick={handleFinalizeAll}>
          <CheckCircle2 size={13} /> Finalize all drafts ({draftCount})
        </button>
        <button className="btn-secondary" style={s.smallBtn} disabled={busy || finalizedCount === 0} onClick={handleMarkAllPaid}>
          <Banknote size={13} /> Mark all paid ({finalizedCount})
        </button>
        <button className="btn-secondary" style={s.smallBtn} disabled={monthRuns.length === 0} onClick={() => setPrintRuns(printPayload(monthRuns))}>
          <Printer size={13} /> Print all payslips ({monthRuns.length})
        </button>
        <span style={s.rule}>
          OT = hours x {settings.ot_multiplier} x (basic / {settings.ot_hourly_divisor}); no-pay day = basic / {settings.no_pay_divisor}. Change rules under Settings.
        </span>
      </div>

      <div className="glass-panel" style={{ padding: '8px' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th style={{ textAlign: 'right' }}>Gross</th>
                <th style={{ textAlign: 'right' }}>Deductions</th>
                <th style={{ textAlign: 'right' }}>Net pay</th>
                <th style={{ textAlign: 'right' }}>Employer EPF/ETF</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const { employee, salary, run, auto, stale } = row;
                const totals = run ? runTotals(run) : null;
                return (
                  <tr key={employee.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{employee.full_name}</div>
                      <div style={s.subText}>
                        {employee.designation || employee.employment_type}
                        {!employee.profile_id && ' - no login (attendance marked by HR)'}
                      </div>
                    </td>
                    {!salary ? (
                      <td colSpan={4} style={{ color: 'var(--color-text-muted)' }}>No salary set yet - add it under Employees</td>
                    ) : !run ? (
                      <td colSpan={4} style={{ color: 'var(--color-text-muted)' }}>
                        Not calculated (basic {formatMoney(salary.basic_salary)}
                        {allowanceItems(salary).length > 0 && ` + ${formatMoney(allowanceItems(salary).reduce((sum, a) => sum + a.amount, 0))} allowances`})
                      </td>
                    ) : (
                      <>
                        <td style={{ textAlign: 'right' }}>
                          {formatMoney(totals.gross)}
                          {Number(run.ot_amount) > 0 && <div style={s.subText}>OT {run.ot_hours} h</div>}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {formatMoney(totals.totalDeductions)}
                          {Number(run.loan_deduction) > 0 && <div style={s.subText}>incl. loan {formatMoney(run.loan_deduction)}</div>}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatMoney(totals.net)}</td>
                        <td style={{ textAlign: 'right' }}>{formatMoney((Number(run.epf_employer) || 0) + (Number(run.etf_employer) || 0))}</td>
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
                        {run && run.status !== 'Paid' && (
                          <button style={s.iconBtn} title="Breakdown, additions and deductions" onClick={() => openRunEditor(row)}>
                            <Pencil size={14} color="var(--color-gold)" />
                          </button>
                        )}
                        {run && (
                          <button style={s.iconBtn} title="Print payslip" onClick={() => setPrintRuns(printPayload([run]))}>
                            <Printer size={15} color="var(--color-gold)" />
                          </button>
                        )}
                        {run && run.status === 'Draft' && (
                          <button className="btn-secondary" style={s.smallBtn} disabled={busy} onClick={() => handleSetStatus(row, 'Finalized')}>
                            <CheckCircle2 size={13} /> Finalize
                          </button>
                        )}
                        {run && run.status === 'Finalized' && (
                          <>
                            <button className="btn-secondary" style={s.smallBtn} disabled={busy} onClick={() => handleSetStatus(row, 'Paid')}>
                              <Banknote size={13} /> Mark paid
                            </button>
                            <button className="btn-secondary" style={s.smallBtn} disabled={busy} onClick={() => handleSetStatus(row, 'Draft')}>
                              Reopen
                            </button>
                          </>
                        )}
                        {run && run.status === 'Paid' && (
                          <button className="btn-secondary" style={s.smallBtn} disabled={busy} onClick={() => handleSetStatus(row, 'Finalized')}>
                            Undo paid
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)' }}>
                  No employees for this month. Add them under Employees.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Breakdown + manual additions/deductions */}
      {runForm && (
        <div style={s.overlay}>
          <div className="glass-panel" style={{ ...s.modal, maxWidth: '640px' }}>
            <div style={s.modalHeader}>
              <h3>{runForm.row.employee.full_name} - {monthLabel(month)}</h3>
              <button style={s.closeBtn} onClick={() => setRunForm(null)}>&times;</button>
            </div>
            <form onSubmit={handleSaveRun} style={s.form}>
              <div style={s.autoBox}>
                <div>Basic: <strong>{formatMoney(runForm.row.run.basic_salary)}</strong></div>
                {allowanceItems(runForm.row.run).map((a, i) => (
                  <div key={i}>{a.label}: <strong>{formatMoney(a.amount)}</strong></div>
                ))}
                <div>Overtime: <strong>{runForm.row.run.ot_hours} h = {formatMoney(runForm.row.run.ot_amount)}</strong></div>
                <div>No-pay: <strong>{runForm.row.run.no_pay_days} day(s) = -{formatMoney(runForm.row.run.no_pay_deduction)}</strong></div>
                {Number(runForm.row.run.epf_employee) > 0 && <div>EPF {settings.epf_employee_rate}%: <strong>-{formatMoney(runForm.row.run.epf_employee)}</strong></div>}
                {Number(runForm.row.run.apit) > 0 && <div>APIT: <strong>-{formatMoney(runForm.row.run.apit)}</strong></div>}
                {Number(runForm.row.run.loan_deduction) > 0 && <div>Loan / advance: <strong>-{formatMoney(runForm.row.run.loan_deduction)}</strong></div>}
              </div>

              {[['additions', 'Additions (bonus, commission, reimbursements...)'], ['deductions', 'Other deductions (fines, welfare, other...)']].map(([listKey, title]) => (
                <div key={listKey}>
                  <div style={s.sectionLabel}>{title}</div>
                  {runForm[listKey].map((line, index) => (
                    <div key={index} style={s.lineRow}>
                      <input className="form-input" placeholder="Label" value={line.label} onChange={(e) => updateLine(listKey, index, 'label', e.target.value)} style={{ flex: 2 }} />
                      <input type="number" min="0" step="any" className="form-input" placeholder="Amount" value={line.amount} onChange={(e) => updateLine(listKey, index, 'amount', e.target.value)} style={{ flex: 1 }} />
                      <button type="button" style={s.iconBtn} onClick={() => removeLine(listKey, index)}>
                        <Trash2 size={14} color="var(--color-cancelled)" />
                      </button>
                    </div>
                  ))}
                  <button type="button" className="btn-secondary" style={s.smallBtn} onClick={() => setRunForm(prev => ({ ...prev, [listKey]: [...prev[listKey], blankLine()] }))}>
                    <Plus size={12} /> Add line
                  </button>
                </div>
              ))}

              <div>
                <label style={s.label}>Notes (printed on the payslip)</label>
                <input className="form-input" value={runForm.notes} onChange={(e) => setRunForm({ ...runForm, notes: e.target.value })} />
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

      {/* Payslip viewer (one or all) */}
      {printRuns && (
        <div style={s.overlay}>
          <div className="glass-panel" style={{ ...s.modal, maxWidth: '640px' }}>
            <div style={s.modalHeader}>
              <h3>{printRuns.length === 1 ? `Payslip - ${printRuns[0].run.employee_name}` : `${printRuns.length} payslips - ${monthLabel(month)}`}</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-primary" onClick={() => window.print()}><Printer size={15} /> Print / Save as PDF</button>
                <button className="btn-secondary" onClick={() => setPrintRuns(null)}>Close</button>
              </div>
            </div>
            <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
              <div style={{ width: '556px', height: '786px', overflow: 'hidden' }}>
                <div style={{ width: '794px', transform: 'scale(0.7)', transformOrigin: 'top left' }}>
                  <PayslipSheet run={printRuns[0].run} employee={printRuns[0].employee} settings={settings} />
                </div>
              </div>
              {printRuns.length > 1 && (
                <div style={s.subText}>Preview shows the first payslip; printing includes all {printRuns.length}, one per page.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {printRuns && createPortal(
        <div className="print-only-sheet">
          {printRuns.map(({ run, employee }) => (
            <div key={run.id} style={{ pageBreakAfter: 'always', breakAfter: 'page' }}>
              <PayslipSheet run={run} employee={employee} settings={settings} />
            </div>
          ))}
        </div>,
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
  summaryRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' },
  summaryCard: { padding: '14px 16px' },
  summaryLabel: { fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' },
  summaryValue: { fontSize: 'var(--font-size-lg)', fontWeight: 800 },
  bulkRow: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' },
  rule: { fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginLeft: 'auto' },
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
