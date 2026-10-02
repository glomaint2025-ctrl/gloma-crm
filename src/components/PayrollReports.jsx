import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Download, AlertTriangle } from 'lucide-react';
import { formatMoney } from '../invoiceUtils';
import {
  currentMonthKey,
  shiftMonthKey,
  monthLabel,
  runTotals,
  runCompanyCost,
  epfDueDate,
  allowanceItems,
  round2
} from '../payrollUtils';

const csvCell = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

function downloadCsv(filename, rows) {
  const content = rows.map(row => row.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const TABS = [
  { key: 'register', label: 'Payroll register' },
  { key: 'bank', label: 'Bank transfer list' },
  { key: 'epf', label: 'EPF / ETF' },
  { key: 'year', label: 'Yearly summary' }
];

const sumList = (list) => (Array.isArray(list) ? list : []).reduce((total, item) => total + (Number(item.amount) || 0), 0);

export default function PayrollReports({ employees = [], runs = [], settings }) {
  const [tab, setTab] = useState('register');
  const [month, setMonth] = useState(currentMonthKey());
  const [year, setYear] = useState(new Date().getFullYear());

  const employeeOf = (id) => employees.find(e => e.id === id) || {};
  const monthRuns = useMemo(
    () => runs.filter(r => r.month === month).sort((a, b) => (a.employee_name || '').localeCompare(b.employee_name || '')),
    [runs, month]
  );
  const settledRuns = monthRuns.filter(r => r.status === 'Finalized' || r.status === 'Paid');
  const total = (list, pick) => round2(list.reduce((acc, r) => acc + (Number(pick(r)) || 0), 0));

  const exportRegister = () => downloadCsv(`payroll-register-${month}.csv`, [
    ['Employee', 'Designation', 'Basic', 'Allowances', 'OT hours', 'OT pay', 'Additions', 'Gross', 'No-pay deduction', 'EPF employee', 'APIT', 'Loan', 'Other deductions', 'Total deductions', 'Net pay', 'Employer EPF', 'Employer ETF', 'Status'],
    ...monthRuns.map(r => {
      const t = runTotals(r);
      return [
        r.employee_name, employeeOf(r.employee_id).designation || '', r.basic_salary,
        allowanceItems(r).reduce((acc, a) => acc + a.amount, 0), r.ot_hours, r.ot_amount, sumList(r.additions),
        t.gross, r.no_pay_deduction, r.epf_employee || 0, r.apit || 0, r.loan_deduction || 0, sumList(r.deductions),
        t.totalDeductions, t.net, r.epf_employer || 0, r.etf_employer || 0, r.status
      ];
    })
  ]);

  const exportBank = () => downloadCsv(`bank-transfers-${month}.csv`, [
    ['Employee', 'Bank', 'Branch', 'Account number', 'Account name', 'Net pay (LKR)'],
    ...settledRuns.map(r => {
      const e = employeeOf(r.employee_id);
      return [r.employee_name, e.bank_name || '', e.bank_branch || '', e.bank_account_no || '', e.bank_account_name || r.employee_name, runTotals(r).net];
    }),
    ['', '', '', '', 'Total', total(settledRuns, r => runTotals(r).net)]
  ]);

  const epfRuns = monthRuns.filter(r => Number(r.epf_employee) > 0 || Number(r.epf_employer) > 0 || Number(r.etf_employer) > 0);
  const exportEpf = () => downloadCsv(`epf-etf-${month}.csv`, [
    ['Employee', 'NIC', 'EPF number', 'Total earnings', 'Employee EPF', 'Employer EPF', 'Total EPF', 'Employer ETF'],
    ...epfRuns.map(r => {
      const e = employeeOf(r.employee_id);
      return [r.employee_name, e.nic || '', e.epf_no || '', r.epf_base, r.epf_employee, r.epf_employer, round2(Number(r.epf_employee) + Number(r.epf_employer)), r.etf_employer];
    }),
    ['Total', '', '', total(epfRuns, r => r.epf_base), total(epfRuns, r => r.epf_employee), total(epfRuns, r => r.epf_employer), total(epfRuns, r => Number(r.epf_employee) + Number(r.epf_employer)), total(epfRuns, r => r.etf_employer)]
  ]);

  const yearRows = useMemo(() => {
    const byEmployee = {};
    runs
      .filter(r => r.month.startsWith(String(year)) && (r.status === 'Finalized' || r.status === 'Paid'))
      .forEach(r => {
        const entry = byEmployee[r.employee_id] || { name: r.employee_name, months: 0, gross: 0, deductions: 0, net: 0, epfEmp: 0, epfEr: 0, etf: 0, apit: 0, cost: 0 };
        const t = runTotals(r);
        entry.months += 1;
        entry.gross += t.gross;
        entry.deductions += t.totalDeductions;
        entry.net += t.net;
        entry.epfEmp += Number(r.epf_employee) || 0;
        entry.epfEr += Number(r.epf_employer) || 0;
        entry.etf += Number(r.etf_employer) || 0;
        entry.apit += Number(r.apit) || 0;
        entry.cost += runCompanyCost(r);
        byEmployee[r.employee_id] = entry;
      });
    return Object.values(byEmployee).sort((a, b) => a.name.localeCompare(b.name));
  }, [runs, year]);

  const exportYear = () => downloadCsv(`payroll-year-${year}.csv`, [
    ['Employee', 'Months', 'Gross', 'Deductions', 'Net pay', 'Employee EPF', 'Employer EPF', 'Employer ETF', 'APIT', 'Cost to company'],
    ...yearRows.map(r => [r.name, r.months, round2(r.gross), round2(r.deductions), round2(r.net), round2(r.epfEmp), round2(r.epfEr), round2(r.etf), round2(r.apit), round2(r.cost)])
  ]);

  const missingBank = settledRuns.filter(r => !employeeOf(r.employee_id).bank_account_no).length;
  const missingEpfNo = epfRuns.filter(r => !employeeOf(r.employee_id).epf_no).length;

  const monthNav = (
    <div style={s.monthNav}>
      <button style={s.navBtn} onClick={() => setMonth(shiftMonthKey(month, -1))}><ChevronLeft size={16} /></button>
      <span style={{ fontWeight: 700, minWidth: '140px', textAlign: 'center' }}>{monthLabel(month)}</span>
      <button style={s.navBtn} onClick={() => setMonth(shiftMonthKey(month, 1))}><ChevronRight size={16} /></button>
    </div>
  );

  const right = (value) => <td style={{ textAlign: 'right' }}>{value}</td>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={s.tabBar}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{ ...s.tabBtn, backgroundColor: tab === t.key ? 'var(--color-gold)' : 'transparent', color: tab === t.key ? '#0A0F1D' : 'var(--color-text-primary)' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'register' && (
        <>
          <div style={s.toolbar}>
            {monthNav}
            <button className="btn-secondary" onClick={exportRegister} disabled={!monthRuns.length}><Download size={14} /> Download CSV</button>
          </div>
          <div className="glass-panel" style={{ padding: '8px' }}>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th style={{ textAlign: 'right' }}>Gross</th>
                    <th style={{ textAlign: 'right' }}>EPF employee</th>
                    <th style={{ textAlign: 'right' }}>APIT</th>
                    <th style={{ textAlign: 'right' }}>Loan</th>
                    <th style={{ textAlign: 'right' }}>Total deductions</th>
                    <th style={{ textAlign: 'right' }}>Net pay</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {monthRuns.map(r => {
                    const t = runTotals(r);
                    return (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600 }}>{r.employee_name}</td>
                        {right(formatMoney(t.gross))}
                        {right(formatMoney(r.epf_employee))}
                        {right(formatMoney(r.apit))}
                        {right(formatMoney(r.loan_deduction))}
                        {right(formatMoney(t.totalDeductions))}
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatMoney(t.net)}</td>
                        <td>{r.status}</td>
                      </tr>
                    );
                  })}
                  {monthRuns.length === 0 && <tr><td colSpan={8} style={s.empty}>No payslips for this month.</td></tr>}
                  {monthRuns.length > 0 && (
                    <tr style={{ fontWeight: 800 }}>
                      <td>Total</td>
                      {right(formatMoney(total(monthRuns, r => runTotals(r).gross)))}
                      {right(formatMoney(total(monthRuns, r => r.epf_employee)))}
                      {right(formatMoney(total(monthRuns, r => r.apit)))}
                      {right(formatMoney(total(monthRuns, r => r.loan_deduction)))}
                      {right(formatMoney(total(monthRuns, r => runTotals(r).totalDeductions)))}
                      {right(formatMoney(total(monthRuns, r => runTotals(r).net)))}
                      <td></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'bank' && (
        <>
          <div style={s.toolbar}>
            {monthNav}
            <button className="btn-secondary" onClick={exportBank} disabled={!settledRuns.length}><Download size={14} /> Download CSV</button>
          </div>
          <div style={s.note}>Lists finalized and paid payslips only. Use it to prepare the bank transfer or a bulk-payment file.</div>
          {missingBank > 0 && (
            <div className="glass-panel" style={s.warning}>
              <AlertTriangle size={16} color="#F59E0B" /> {missingBank} employee(s) have no bank account saved (add it under Employees).
            </div>
          )}
          <div className="glass-panel" style={{ padding: '8px' }}>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr><th>Employee</th><th>Bank / branch</th><th>Account number</th><th style={{ textAlign: 'right' }}>Net pay</th></tr>
                </thead>
                <tbody>
                  {settledRuns.map(r => {
                    const e = employeeOf(r.employee_id);
                    return (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600 }}>{r.employee_name}</td>
                        <td>{[e.bank_name, e.bank_branch].filter(Boolean).join(' / ') || <span style={{ color: '#F59E0B' }}>missing</span>}</td>
                        <td>{e.bank_account_no || <span style={{ color: '#F59E0B' }}>missing</span>}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatMoney(runTotals(r).net)}</td>
                      </tr>
                    );
                  })}
                  {settledRuns.length === 0 && <tr><td colSpan={4} style={s.empty}>Finalize this month's payslips first.</td></tr>}
                  {settledRuns.length > 0 && (
                    <tr style={{ fontWeight: 800 }}>
                      <td colSpan={3}>Total</td>
                      {right(formatMoney(total(settledRuns, r => runTotals(r).net)))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'epf' && (
        <>
          <div style={s.toolbar}>
            {monthNav}
            <button className="btn-secondary" onClick={exportEpf} disabled={!epfRuns.length}><Download size={14} /> Download CSV</button>
          </div>
          <div style={s.note}>
            EPF and ETF for {monthLabel(month)} must reach the funds before <strong>{epfDueDate(month)}</strong> (last working day of the
            following month). Late payment attracts surcharges. Use this sheet to fill Form C (EPF) and the ETF return.
          </div>
          {missingEpfNo > 0 && (
            <div className="glass-panel" style={s.warning}>
              <AlertTriangle size={16} color="#F59E0B" /> {missingEpfNo} employee(s) have no EPF number saved.
            </div>
          )}
          <div className="glass-panel" style={{ padding: '8px' }}>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>EPF no</th>
                    <th style={{ textAlign: 'right' }}>Earnings</th>
                    <th style={{ textAlign: 'right' }}>Employee {settings.epf_employee_rate}%</th>
                    <th style={{ textAlign: 'right' }}>Employer {settings.epf_employer_rate}%</th>
                    <th style={{ textAlign: 'right' }}>ETF {settings.etf_rate}%</th>
                  </tr>
                </thead>
                <tbody>
                  {epfRuns.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.employee_name}</td>
                      <td>{employeeOf(r.employee_id).epf_no || <span style={{ color: '#F59E0B' }}>missing</span>}</td>
                      {right(formatMoney(r.epf_base))}
                      {right(formatMoney(r.epf_employee))}
                      {right(formatMoney(r.epf_employer))}
                      {right(formatMoney(r.etf_employer))}
                    </tr>
                  ))}
                  {epfRuns.length === 0 && (
                    <tr><td colSpan={6} style={s.empty}>No EPF/ETF this month. Switch EPF/ETF on per employee under Employees, then recalculate.</td></tr>
                  )}
                  {epfRuns.length > 0 && (
                    <tr style={{ fontWeight: 800 }}>
                      <td colSpan={2}>Total payable</td>
                      {right(formatMoney(total(epfRuns, r => r.epf_base)))}
                      {right(formatMoney(total(epfRuns, r => r.epf_employee)))}
                      {right(formatMoney(total(epfRuns, r => r.epf_employer)))}
                      {right(formatMoney(total(epfRuns, r => r.etf_employer)))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'year' && (
        <>
          <div style={s.toolbar}>
            <div style={s.monthNav}>
              <button style={s.navBtn} onClick={() => setYear(year - 1)}><ChevronLeft size={16} /></button>
              <span style={{ fontWeight: 700, minWidth: '80px', textAlign: 'center' }}>{year}</span>
              <button style={s.navBtn} onClick={() => setYear(year + 1)}><ChevronRight size={16} /></button>
            </div>
            <button className="btn-secondary" onClick={exportYear} disabled={!yearRows.length}><Download size={14} /> Download CSV</button>
          </div>
          <div style={s.note}>Totals of finalized and paid payslips in the calendar year. Handy for tax filings and year-end reviews.</div>
          <div className="glass-panel" style={{ padding: '8px' }}>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th style={{ textAlign: 'right' }}>Months</th>
                    <th style={{ textAlign: 'right' }}>Gross</th>
                    <th style={{ textAlign: 'right' }}>Net pay</th>
                    <th style={{ textAlign: 'right' }}>EPF (both)</th>
                    <th style={{ textAlign: 'right' }}>ETF</th>
                    <th style={{ textAlign: 'right' }}>APIT</th>
                    <th style={{ textAlign: 'right' }}>Cost to company</th>
                  </tr>
                </thead>
                <tbody>
                  {yearRows.map(r => (
                    <tr key={r.name}>
                      <td style={{ fontWeight: 600 }}>{r.name}</td>
                      {right(r.months)}
                      {right(formatMoney(r.gross))}
                      {right(formatMoney(r.net))}
                      {right(formatMoney(r.epfEmp + r.epfEr))}
                      {right(formatMoney(r.etf))}
                      {right(formatMoney(r.apit))}
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatMoney(r.cost)}</td>
                    </tr>
                  ))}
                  {yearRows.length === 0 && <tr><td colSpan={8} style={s.empty}>No finalized payslips in {year}.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const s = {
  tabBar: { display: 'flex', gap: '4px', flexWrap: 'wrap', padding: '4px', alignSelf: 'flex-start', backgroundColor: 'var(--bg-badge-dark)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' },
  tabBtn: { padding: '6px 12px', border: 'none', borderRadius: 'var(--radius-xs)', fontSize: 'var(--font-size-sm)', fontWeight: 600, cursor: 'pointer' },
  toolbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' },
  monthNav: { display: 'flex', alignItems: 'center', gap: '8px' },
  navBtn: { background: 'var(--bg-badge-dark)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--color-gold)', cursor: 'pointer', padding: '6px', display: 'flex' },
  note: { fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' },
  warning: { display: 'flex', gap: '10px', alignItems: 'center', padding: '10px 14px', fontSize: 'var(--font-size-sm)' },
  empty: { textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)' }
};
