import React from 'react';
import { COMPANY_PROFILE, amountInWords } from '../invoiceUtils';
import { runTotals, monthLabel, allowanceItems, daysInMonthKey, DEFAULT_PAYROLL_SETTINGS } from '../payrollUtils';
import { isHoliday } from '../workHours';

// Print-ready payslip on HALF of an A4 sheet (794 x 561 px at 96 dpi): the top half of the
// page, so two payslips can be cut from one sheet. Fixed colours so it prints identically in
// light/dark mode. The PDF export keeps it on the top half of an A4 page (no page frame).
const COLORS = { text: '#111111', line: '#222222', muted: '#444444' };

// 35000 -> "35 000", 1250.5 -> "1 250.50", zero -> "-"
const fmt = (value) => {
  const n = Number(value) || 0;
  if (!n) return '-';
  const fixed = Number.isInteger(n) ? String(n) : n.toFixed(2);
  const [whole, dec] = fixed.split('.');
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}${dec ? `.${dec}` : ''}`;
};

// Working days in the month (Mon-Sat, excluding Sundays and Poya days) less unpaid days.
const workedDays = (run) => {
  if (Number.isFinite(Number(run.worked_days)) && run.worked_days !== null && run.worked_days !== undefined) {
    return Number(run.worked_days);
  }
  const working = daysInMonthKey(run.month).filter(d => !isHoliday(d)).length;
  return Math.max(0, working - (Number(run.no_pay_days) || 0));
};

export default function PayslipSheet({ run, employee, settings = DEFAULT_PAYROLL_SETTINGS }) {
  const totals = runTotals(run);
  const additions = (Array.isArray(run.additions) ? run.additions : []).filter(a => Number(a.amount));
  const deductions = (Array.isArray(run.deductions) ? run.deductions : []).filter(d => Number(d.amount));
  const loanLines = (Array.isArray(run.loan_details) ? run.loan_details : []).filter(l => Number(l.amount));

  const base = Number(run.epf_base) || 0;
  const pct = (amount, fallback) => (base > 0 && Number(amount) > 0 ? Math.round((Number(amount) / base) * 10000) / 100 : fallback);
  const epfEmployeeRate = pct(run.epf_employee, settings.epf_employee_rate);

  const earnings = [
    ['Basic Pay', run.basic_salary],
    ...allowanceItems(run).map(a => [a.label, a.amount]),
    [`Overtime (${Number(run.ot_hours) || 0} h)`, run.ot_amount],
    ...additions.map(a => [a.label || 'Addition', a.amount])
  ].filter(([, amount]) => Number(amount));

  const deductionRows = [
    [`No Pay Deductions${Number(run.no_pay_days) ? ` (${Number(run.no_pay_days)} d)` : ''}`, run.no_pay_deduction],
    [`EPF (${epfEmployeeRate}%)`, run.epf_employee],
    ['APIT Income Tax', run.apit],
    ...(loanLines.length
      ? loanLines.map(l => [l.label || 'Salary Advance', l.amount])
      : [['Salary Advance', run.loan_deduction]]),
    ...deductions.map(d => [d.label || 'Deduction', d.amount])
  ].filter(([, amount]) => Number(amount));

  const rowCount = Math.max(5, earnings.length, deductionRows.length);
  const rows = Array.from({ length: rowCount }, (_, i) => [earnings[i], deductionRows[i]]);
  const netRounded = Math.round(totals.net * 100) / 100;

  return (
    <div style={s.sheet} data-pdf-noframe="true" data-pdf-body="true">
      <div style={s.title}>Payslip</div>
      <div style={s.company}>{COMPANY_PROFILE.name}</div>
      <div style={s.empId}>Employee ID : {employee?.epf_no || employee?.nic || '-'}</div>

      <div style={s.meta}>
        <div style={s.metaCol}>
          <div style={s.metaRow}><span style={s.metaKey}>Date of Joining</span><span>: {employee?.join_date ? String(employee.join_date).substring(0, 10) : '-'}</span></div>
          <div style={s.metaRow}><span style={s.metaKey}>Pay Period</span><span>: {monthLabel(run.month)}</span></div>
          <div style={s.metaRow}><span style={s.metaKey}>Worked Days</span><span>: {workedDays(run)}</span></div>
        </div>
        <div style={s.metaCol}>
          <div style={s.metaRow}><span style={s.metaKey}>Employee Name</span><span>: {run.employee_name}</span></div>
          <div style={s.metaRow}><span style={s.metaKey}>Designation</span><span>: {employee?.designation || '-'}</span></div>
          <div style={s.metaRow}><span style={s.metaKey}>Department</span><span>: {employee?.department || '-'}</span></div>
        </div>
      </div>

      <table style={s.table} data-pdf-block="true">
        <thead>
          <tr>
            <th style={{ ...s.th, width: '31%' }}>Earnings</th>
            <th style={{ ...s.th, width: '19%' }}>Amount</th>
            <th style={{ ...s.th, width: '31%' }}>Deductions</th>
            <th style={{ ...s.th, width: '19%' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([e, d], i) => (
            <tr key={i}>
              <td style={s.td}>{e ? e[0] : ''}</td>
              <td style={{ ...s.td, ...s.num }}>{e ? fmt(e[1]) : ''}</td>
              <td style={s.td}>{d ? d[0] : ''}</td>
              <td style={{ ...s.td, ...s.num }}>{d ? fmt(d[1]) : ''}</td>
            </tr>
          ))}
          <tr>
            <td style={{ ...s.td, ...s.totalLabel }}>Total Earnings</td>
            <td style={{ ...s.td, ...s.num }}>{fmt(totals.gross)}</td>
            <td style={{ ...s.td, ...s.totalLabel }}>Total Deductions</td>
            <td style={{ ...s.td, ...s.num }}>{fmt(totals.totalDeductions)}</td>
          </tr>
          <tr>
            <td style={s.td}></td>
            <td style={s.td}></td>
            <td style={{ ...s.td, ...s.totalLabel, fontWeight: 700 }}>Net Pay</td>
            <td style={{ ...s.td, ...s.num, fontWeight: 700 }}>{fmt(netRounded)}</td>
          </tr>
        </tbody>
      </table>

      <div style={s.netLine}>Rs. {netRounded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/,/g, ' ')}</div>
      <div style={s.words}>{amountInWords(netRounded)}</div>
      {run.notes && <div style={s.notes}>{run.notes}</div>}

      <div style={s.signRow}>
        <div style={s.signCol}>
          <div>Approved Signature</div>
          <div style={s.signLine} />
        </div>
        <div style={s.signCol}>
          <div>Employee Signature</div>
          <div style={s.signLine} />
        </div>
      </div>
    </div>
  );
}

const s = {
  sheet: {
    position: 'relative',
    width: '794px',
    minHeight: '561px',
    backgroundColor: '#FFFFFF',
    color: COLORS.text,
    fontFamily: "Arial, 'Helvetica Neue', 'DejaVu Sans', sans-serif",
    fontSize: '12.5px',
    lineHeight: 1.4,
    boxSizing: 'border-box',
    padding: '26px 48px 22px',
    WebkitPrintColorAdjust: 'exact',
    printColorAdjust: 'exact'
  },
  title: { textAlign: 'center', fontSize: '15px', textDecoration: 'underline' },
  company: { textAlign: 'center', fontSize: '19px', fontWeight: 700, marginTop: '2px' },
  empId: { textAlign: 'center', fontSize: '11.5px', marginBottom: '14px' },
  meta: { display: 'flex', gap: '24px', marginBottom: '22px' },
  metaCol: { flex: 1 },
  metaRow: { display: 'flex', gap: '4px', lineHeight: 1.65 },
  metaKey: { display: 'inline-block', width: '105px' },
  table: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' },
  th: { border: `1px solid ${COLORS.line}`, padding: '4px 8px', fontSize: '15px', fontWeight: 400, textAlign: 'center' },
  td: { border: `1px solid ${COLORS.line}`, padding: '3px 8px', height: '19px', fontSize: '12px' },
  num: { textAlign: 'right' },
  totalLabel: { textAlign: 'right' },
  netLine: { textAlign: 'center', textDecoration: 'underline', marginTop: '16px', fontSize: '13px' },
  words: { textAlign: 'center', marginTop: '3px', fontSize: '11px', color: COLORS.muted },
  notes: { marginTop: '8px', fontSize: '11px', color: COLORS.muted },
  signRow: { display: 'flex', justifyContent: 'space-around', gap: '40px', marginTop: '22px' },
  signCol: { flex: 1, textAlign: 'center' },
  signLine: { borderTop: `2px solid #cfcfcf`, marginTop: '30px' }
};
