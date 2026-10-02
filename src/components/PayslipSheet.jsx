import React from 'react';
import { COMPANY_PROFILE, formatMoney, amountInWords } from '../invoiceUtils';
import { runTotals, monthLabel, hourlyRate, allowanceItems, DEFAULT_PAYROLL_SETTINGS } from '../payrollUtils';

// Print-ready A4 payslip. Fixed colours so it prints identically in light/dark mode.
const COLORS = {
  navy: '#0F1729',
  gold: '#C9A877',
  border: '#D5DEE9',
  panel: '#F8FAFC',
  head: '#EEF2F7',
  text: '#111827',
  muted: '#52606D',
  soft: '#F5EFE3'
};

export default function PayslipSheet({ run, employee, settings = DEFAULT_PAYROLL_SETTINGS }) {
  const totals = runTotals(run);
  const additions = (Array.isArray(run.additions) ? run.additions : []).filter(a => Number(a.amount));
  const deductions = (Array.isArray(run.deductions) ? run.deductions : []).filter(d => Number(d.amount));
  const loanLines = (Array.isArray(run.loan_details) ? run.loan_details : []).filter(l => Number(l.amount));

  // Show the rates actually applied to this payslip (settings may have changed since).
  const base = Number(run.epf_base) || 0;
  const pct = (amount, fallback) => (base > 0 && Number(amount) > 0 ? Math.round((Number(amount) / base) * 10000) / 100 : fallback);
  const epfEmployeeRate = pct(run.epf_employee, settings.epf_employee_rate);
  const epfEmployerRate = pct(run.epf_employer, settings.epf_employer_rate);
  const etfRate = pct(run.etf_employer, settings.etf_rate);
  const earnings = [
    ['Basic salary', run.basic_salary],
    ...allowanceItems(run).map(a => [a.label, a.amount]),
    [
      `Overtime (${Number(run.ot_hours) || 0} h x ${settings.ot_multiplier} x LKR ${formatMoney(hourlyRate(run.basic_salary, settings))}/h)`,
      run.ot_amount
    ],
    ...additions.map(a => [a.label || 'Addition', a.amount])
  ].filter(([, amount]) => Number(amount));

  const deductionRows = [
    [`No-pay days (${Number(run.no_pay_days) || 0})`, run.no_pay_deduction],
    [`EPF employee contribution (${epfEmployeeRate}%)`, run.epf_employee],
    ['APIT income tax', run.apit],
    ...(loanLines.length
      ? loanLines.map(l => [l.label || 'Loan repayment', l.amount])
      : [['Loan / advance repayment', run.loan_deduction]]),
    ...deductions.map(d => [d.label || 'Deduction', d.amount])
  ].filter(([, amount]) => Number(amount));

  const employerTotal = (Number(run.epf_employer) || 0) + (Number(run.etf_employer) || 0);

  return (
    <div style={s.sheet}>
      <div data-pdf-frame="true" style={s.frame} />

      <div data-pdf-header="true">
        <div style={s.header}>
          <img src="/logo.png" alt="Gloma" style={s.logo} />
          <div style={{ textAlign: 'right' }}>
            <div style={s.heading}>PAYSLIP</div>
            <div style={s.headerSub}>{monthLabel(run.month)}</div>
          </div>
        </div>
        <div style={s.rule} />
      </div>

      <div data-pdf-body="true" style={s.body}>
        <div data-pdf-block="true" style={s.metaRow}>
          <div style={s.metaCell}>
            <div style={s.metaLabel}>EMPLOYEE</div>
            <div style={{ fontWeight: 600 }}>{run.employee_name}</div>
            {employee?.designation && <div style={s.metaSub}>{employee.designation}</div>}
          </div>
          <div style={s.metaCell}>
            <div style={s.metaLabel}>NIC / EPF NO</div>
            <div>{employee?.nic || '-'}</div>
            <div style={s.metaSub}>{employee?.epf_no ? `EPF ${employee.epf_no}` : ''}</div>
          </div>
          <div style={s.metaCell}>
            <div style={s.metaLabel}>PAY PERIOD</div>
            <div>{monthLabel(run.month)}</div>
          </div>
          <div style={{ ...s.metaCell, borderRight: 'none' }}>
            <div style={s.metaLabel}>EMPLOYER</div>
            <div>{COMPANY_PROFILE.name}</div>
          </div>
        </div>

        <table style={s.table}>
          <thead>
            <tr data-pdf-keep="true">
              <th style={{ ...s.th, textAlign: 'left' }}>EARNINGS</th>
              <th style={{ ...s.th, width: '160px' }}>AMOUNT (LKR)</th>
            </tr>
          </thead>
          <tbody>
            {earnings.map(([label, amount], i) => (
              <tr key={`${label}-${i}`}>
                <td style={s.td}>{label}</td>
                <td style={{ ...s.td, textAlign: 'right' }}>{formatMoney(amount)}</td>
              </tr>
            ))}
            <tr style={{ backgroundColor: COLORS.soft }}>
              <td style={{ ...s.td, fontWeight: 700 }}>Gross pay</td>
              <td style={{ ...s.td, textAlign: 'right', fontWeight: 700 }}>{formatMoney(totals.gross)}</td>
            </tr>
          </tbody>
        </table>

        <table style={{ ...s.table, marginTop: '16px' }}>
          <thead>
            <tr data-pdf-keep="true">
              <th style={{ ...s.th, textAlign: 'left' }}>DEDUCTIONS</th>
              <th style={{ ...s.th, width: '160px' }}>AMOUNT (LKR)</th>
            </tr>
          </thead>
          <tbody>
            {deductionRows.length === 0 && (
              <tr>
                <td style={{ ...s.td, color: COLORS.muted }}>None</td>
                <td style={{ ...s.td, textAlign: 'right' }}>0.00</td>
              </tr>
            )}
            {deductionRows.map(([label, amount], i) => (
              <tr key={`${label}-${i}`}>
                <td style={s.td}>{label}</td>
                <td style={{ ...s.td, textAlign: 'right' }}>{formatMoney(amount)}</td>
              </tr>
            ))}
            <tr style={{ backgroundColor: COLORS.soft }}>
              <td style={{ ...s.td, fontWeight: 700 }}>Total deductions</td>
              <td style={{ ...s.td, textAlign: 'right', fontWeight: 700 }}>{formatMoney(totals.totalDeductions)}</td>
            </tr>
          </tbody>
        </table>

        <div data-pdf-block="true" style={s.netBox}>
          <span>NET PAY</span>
          <span>LKR {formatMoney(totals.net)}</span>
        </div>
        <div data-pdf-block="true" style={s.wordsBox}>Amount in Words: {amountInWords(totals.net)}</div>

        {employerTotal > 0 && (
          <div data-pdf-block="true" style={s.employerBox}>
            Employer contributions this month (not deducted from your pay): EPF {epfEmployerRate}% LKR {formatMoney(run.epf_employer)}
            {Number(run.etf_employer) > 0 && `, ETF ${etfRate}% LKR ${formatMoney(run.etf_employer)}`}.
          </div>
        )}

        {run.notes && <div data-pdf-block="true" style={s.noteBox}>{run.notes}</div>}

        <div data-pdf-block="true" style={s.signRow}>
          <div style={s.signCol}>
            <div style={{ marginTop: '34px' }}>______________________________</div>
            <div>Authorized By</div>
            <div>{COMPANY_PROFILE.name}</div>
          </div>
          <div style={{ ...s.signCol, borderLeft: `1px solid ${COLORS.border}` }}>
            <div style={{ marginTop: '34px' }}>______________________________</div>
            <div>Employee Signature</div>
            <div>{run.employee_name}</div>
          </div>
        </div>
      </div>

      <div data-pdf-footer="true" style={s.footer}>
        <span>{COMPANY_PROFILE.name} &nbsp;|&nbsp; {COMPANY_PROFILE.website} &nbsp;|&nbsp; {COMPANY_PROFILE.email} &nbsp;|&nbsp; Confidential</span>
        <span data-pdf-pagenum="true" style={{ minWidth: '70px', textAlign: 'right' }}>&nbsp;</span>
      </div>
    </div>
  );
}

const s = {
  sheet: {
    position: 'relative',
    width: '794px',
    minHeight: '1123px',
    backgroundColor: '#FFFFFF',
    color: COLORS.text,
    fontFamily: "'Segoe UI', 'DejaVu Sans', Arial, sans-serif",
    fontSize: '13px',
    lineHeight: 1.45,
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    WebkitPrintColorAdjust: 'exact',
    printColorAdjust: 'exact'
  },
  frame: {
    position: 'absolute',
    top: '14px',
    left: '14px',
    right: '14px',
    bottom: '14px',
    border: `1.5px solid ${COLORS.navy}`,
    pointerEvents: 'none'
  },
  header: {
    padding: '34px 56px 14px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logo: { height: '62px', maxWidth: '180px', objectFit: 'contain' },
  rule: {
    margin: '0 56px',
    borderTop: `1.5px solid ${COLORS.navy}`,
    borderBottom: `3px solid ${COLORS.gold}`,
    height: '4px',
    boxSizing: 'content-box'
  },
  heading: { color: COLORS.navy, fontSize: '34px', fontWeight: 800, letterSpacing: '1px', lineHeight: 1.1 },
  headerSub: { color: '#A9834F', fontWeight: 700, fontSize: '14px', marginTop: '8px' },
  body: { padding: '20px 56px 16px', flex: 1 },
  metaRow: { display: 'flex', border: `1px solid ${COLORS.navy}`, marginBottom: '20px' },
  metaCell: { flex: 1, padding: '9px 12px', borderRight: `1px solid ${COLORS.border}` },
  metaLabel: { fontSize: '10.5px', fontWeight: 700, color: COLORS.muted, letterSpacing: '0.4px', marginBottom: '4px' },
  metaSub: { fontSize: '11.5px', color: COLORS.muted },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    backgroundColor: COLORS.head,
    color: COLORS.navy,
    fontSize: '11.5px',
    fontWeight: 700,
    padding: '10px 12px',
    border: `1px solid ${COLORS.navy}`
  },
  td: { padding: '9px 12px', border: `1px solid ${COLORS.border}` },
  netBox: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '18px',
    padding: '14px 16px',
    backgroundColor: COLORS.soft,
    border: `2px solid ${COLORS.navy}`,
    color: COLORS.navy,
    fontWeight: 800,
    fontSize: '16px'
  },
  wordsBox: { border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.panel, padding: '10px 12px', marginTop: '10px' },
  employerBox: { marginTop: '10px', fontSize: '11.5px', color: COLORS.muted },
  noteBox: {
    marginTop: '14px',
    padding: '10px 12px',
    backgroundColor: COLORS.soft,
    border: `1px solid ${COLORS.gold}`,
    color: COLORS.muted,
    fontSize: '11.5px'
  },
  signRow: { display: 'flex', border: `1px solid ${COLORS.border}`, marginTop: '28px' },
  signCol: { flex: 1, padding: '14px 12px 12px' },
  footer: {
    margin: '0 56px',
    padding: '10px 0 26px',
    borderTop: `1.5px solid ${COLORS.navy}`,
    color: COLORS.navy,
    fontSize: '11px',
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px'
  }
};
