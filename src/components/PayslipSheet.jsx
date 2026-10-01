import React from 'react';
import { COMPANY_PROFILE, formatMoney, amountInWords } from '../invoiceUtils';
import { runTotals, monthLabel, hourlyRate, OT_MULTIPLIER } from '../payrollUtils';

// Print-ready A4 payslip. Fixed colours so it prints identically in light/dark mode.
const COLORS = {
  navy: '#0F1729',
  gold: '#C9A877',
  border: '#D5DEE9',
  panel: '#F8FAFC',
  text: '#111827',
  muted: '#52606D'
};

export default function PayslipSheet({ run }) {
  const totals = runTotals(run);
  const additions = (Array.isArray(run.additions) ? run.additions : []).filter(a => Number(a.amount));
  const deductions = (Array.isArray(run.deductions) ? run.deductions : []).filter(d => Number(d.amount));

  const earnings = [
    ['Basic salary', run.basic_salary],
    ['Fixed allowance', run.fixed_allowance],
    [
      `Overtime (${Number(run.ot_hours) || 0} h x ${OT_MULTIPLIER} x LKR ${formatMoney(hourlyRate(run.basic_salary))}/h)`,
      run.ot_amount
    ],
    ...additions.map(a => [a.label || 'Addition', a.amount])
  ].filter(([, amount]) => Number(amount));

  const deductionRows = [
    [`No-pay days (${Number(run.no_pay_days) || 0})`, run.no_pay_deduction],
    ...deductions.map(d => [d.label || 'Deduction', d.amount])
  ].filter(([, amount]) => Number(amount));

  return (
    <div style={s.sheet}>
      <div style={s.header}>
        <div style={s.logoBox}><img src="/logo.png" alt="Gloma" style={s.logo} /></div>
        <div style={{ textAlign: 'right' }}>
          <div style={s.heading}>PAYSLIP</div>
          <div style={s.headerSub}>{monthLabel(run.month)}</div>
        </div>
      </div>
      <div style={s.goldBar} />

      <div style={s.body}>
        <div style={s.metaRow}>
          <div style={s.metaCell}>
            <div style={s.metaLabel}>EMPLOYEE</div>
            <div style={{ fontWeight: 600 }}>{run.employee_name}</div>
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
            <tr>
              <th style={{ ...s.th, textAlign: 'left' }}>EARNINGS</th>
              <th style={{ ...s.th, width: '160px' }}>AMOUNT (LKR)</th>
            </tr>
          </thead>
          <tbody>
            {earnings.map(([label, amount]) => (
              <tr key={label}>
                <td style={s.td}>{label}</td>
                <td style={{ ...s.td, textAlign: 'right' }}>{formatMoney(amount)}</td>
              </tr>
            ))}
            <tr style={{ backgroundColor: s.totalBg }}>
              <td style={{ ...s.td, fontWeight: 700 }}>Gross pay</td>
              <td style={{ ...s.td, textAlign: 'right', fontWeight: 700 }}>{formatMoney(totals.gross)}</td>
            </tr>
          </tbody>
        </table>

        <table style={{ ...s.table, marginTop: '16px' }}>
          <thead>
            <tr>
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
            {deductionRows.map(([label, amount]) => (
              <tr key={label}>
                <td style={s.td}>{label}</td>
                <td style={{ ...s.td, textAlign: 'right' }}>{formatMoney(amount)}</td>
              </tr>
            ))}
            <tr style={{ backgroundColor: s.totalBg }}>
              <td style={{ ...s.td, fontWeight: 700 }}>Total deductions</td>
              <td style={{ ...s.td, textAlign: 'right', fontWeight: 700 }}>{formatMoney(totals.totalDeductions)}</td>
            </tr>
          </tbody>
        </table>

        <div style={s.netBox}>
          <span>NET PAY</span>
          <span>LKR {formatMoney(totals.net)}</span>
        </div>
        <div style={s.wordsBox}>Amount in Words: {amountInWords(totals.net)}</div>

        {run.notes && <div style={s.noteBox}>{run.notes}</div>}

        <div style={s.signRow}>
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

      <div style={s.footer}>
        <span>{COMPANY_PROFILE.name} &nbsp;|&nbsp; {COMPANY_PROFILE.website} &nbsp;|&nbsp; {COMPANY_PROFILE.email}</span>
        <span>Confidential</span>
      </div>
    </div>
  );
}

const s = {
  totalBg: '#F5EFE3',
  sheet: {
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
  header: {
    backgroundColor: COLORS.navy,
    padding: '34px 56px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logoBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: '14px',
    padding: '8px 16px',
    width: '170px',
    height: '82px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  logo: { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' },
  heading: { color: '#FFFFFF', fontSize: '34px', fontWeight: 800, letterSpacing: '1px', lineHeight: 1.1 },
  headerSub: { color: COLORS.gold, fontWeight: 700, fontSize: '14px', marginTop: '8px' },
  goldBar: { height: '5px', backgroundColor: COLORS.gold },
  body: { padding: '28px 56px 20px', flex: 1 },
  metaRow: { display: 'flex', border: `1px solid ${COLORS.border}`, marginBottom: '20px' },
  metaCell: { flex: 1, padding: '9px 12px', borderRight: `1px solid ${COLORS.border}` },
  metaLabel: { fontSize: '10.5px', fontWeight: 700, color: COLORS.muted, letterSpacing: '0.4px', marginBottom: '4px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    backgroundColor: COLORS.navy,
    color: '#FFFFFF',
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
    backgroundColor: COLORS.navy,
    color: '#FFFFFF',
    fontWeight: 800,
    fontSize: '16px'
  },
  wordsBox: { border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.panel, padding: '10px 12px', marginTop: '10px' },
  noteBox: {
    marginTop: '14px',
    padding: '10px 12px',
    backgroundColor: '#F5EFE3',
    border: `1px solid ${COLORS.gold}`,
    color: COLORS.muted,
    fontSize: '11.5px'
  },
  signRow: { display: 'flex', border: `1px solid ${COLORS.border}`, marginTop: '28px' },
  signCol: { flex: 1, padding: '14px 12px 12px' },
  footer: {
    backgroundColor: COLORS.navy,
    color: '#FFFFFF',
    fontSize: '11px',
    padding: '18px 56px',
    display: 'flex',
    justifyContent: 'space-between'
  }
};
