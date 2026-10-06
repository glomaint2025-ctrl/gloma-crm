import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, FileDown, FileSpreadsheet, TrendingUp, TrendingDown, PiggyBank, Percent, Hourglass, AlertTriangle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { COMPANY_PROFILE, calcTotals, formatMoney, formatLongDate } from '../invoiceUtils';
import { currentMonthKey, shiftMonthKey, monthLabel, runCompanyCost, round2 } from '../payrollUtils';
import { pdfFileName } from '../pdfExport';
import { downloadHtmlPdf } from '../letterExport';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const esc = (v) => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sum = (items) => round2(items.reduce((t, i) => t + (Number(i.amount) || 0), 0));
const groupBy = (items, keyFn) => {
  const map = new Map();
  items.forEach(i => map.set(keyFn(i), round2((map.get(keyFn(i)) || 0) + (Number(i.amount) || 0))));
  return [...map.entries()].map(([label, amount]) => ({ label, amount })).sort((a, b) => b.amount - a.amount);
};

// Everything one statement needs for a period key ('YYYY-MM' or 'YYYY').
function buildModel({ key, invoices, expenses, runs, tasks, includeTasks, includePayroll }) {
  const inPeriod = (date) => String(date || '').startsWith(key);

  const invoiceIncome = invoices
    .filter(i => i.doc_type !== 'Quotation' && i.status === 'Paid' && inPeriod(i.issue_date))
    .map(i => ({ date: String(i.issue_date).substring(0, 10), label: `${i.doc_type} ${i.doc_number}`, who: i.client_name || '', amount: calcTotals(i).total, group: i.doc_type === 'Advance Invoice' ? 'Advance invoices' : 'Invoices' }));

  const taskIncome = includeTasks
    ? tasks
        .filter(t => t.work_type === 'Website' && t.payment_status === 'Paid' && Number(t.payment_amount) && inPeriod(t.last_updated))
        .map(t => ({ date: String(t.last_updated).substring(0, 10), label: `Website project ${t.id}`, who: t.client_project || '', amount: Number(t.payment_amount), group: 'Website project payments' }))
    : [];

  const income = [...invoiceIncome, ...taskIncome].sort((a, b) => a.date.localeCompare(b.date));

  const expenseItems = expenses
    .filter(e => inPeriod(e.expense_date))
    .map(e => ({ date: String(e.expense_date).substring(0, 10), label: e.description || e.vendor || e.category, who: e.vendor || '', amount: Number(e.amount) || 0, group: e.category || 'Other' }));

  const payrollItems = includePayroll
    ? runs
        .filter(r => (r.status === 'Finalized' || r.status === 'Paid') && inPeriod(r.month))
        .map(r => ({ date: `${r.month}-28`, label: `Payroll ${r.employee_name || ''}`, who: r.employee_name || '', amount: runCompanyCost(r), group: 'Salaries & payroll (incl. EPF/ETF)' }))
    : [];

  const expense = [...expenseItems, ...payrollItems].sort((a, b) => a.date.localeCompare(b.date));

  const totalIncome = sum(income);
  const totalExpense = sum(expense);
  const net = round2(totalIncome - totalExpense);
  const outstanding = round2(invoices
    .filter(i => i.doc_type !== 'Quotation' && (i.status === 'Sent') && inPeriod(i.issue_date))
    .reduce((t, i) => t + calcTotals(i).balance, 0));

  return {
    income, expense, totalIncome, totalExpense, net, outstanding,
    margin: totalIncome > 0 ? round2((net / totalIncome) * 100) : 0,
    incomeGroups: groupBy(income, i => i.group),
    expenseGroups: groupBy(expense, i => i.group)
  };
}

function statementHtml({ title, periodLabel, model, monthly }) {
  const cell = 'border:1px solid #333;padding:5px 8px;';
  const rows = (groups) => groups.length
    ? groups.map(g => `<tr><td style="${cell}">${esc(g.label)}</td><td style="${cell}text-align:right;">${formatMoney(g.amount)}</td></tr>`).join('')
    : `<tr><td style="${cell}color:#777;" colspan="2">None</td></tr>`;
  const total = (label, value, bg = '#F5EFE3') => `<tr style="background:${bg};font-weight:700;"><td style="${cell}">${label}</td><td style="${cell}text-align:right;">${formatMoney(value)}</td></tr>`;

  let html = `<h2 style="text-align:center;margin:0 0 2px;">${esc(title)}</h2>`;
  html += `<p style="text-align:center;margin:0 0 14px;color:#444;">${esc(COMPANY_PROFILE.name)} &mdash; ${esc(periodLabel)}</p>`;
  html += `<table><thead><tr><th style="${cell}text-align:left;background:#EEF2F7;">Income</th><th style="${cell}width:150px;text-align:right;background:#EEF2F7;">LKR</th></tr></thead><tbody>${rows(model.incomeGroups)}${total('Total income', model.totalIncome)}</tbody></table>`;
  html += `<p style="margin:0;height:8px;"></p>`;
  html += `<table><thead><tr><th style="${cell}text-align:left;background:#EEF2F7;">Expenses</th><th style="${cell}width:150px;text-align:right;background:#EEF2F7;">LKR</th></tr></thead><tbody>${rows(model.expenseGroups)}${total('Total expenses', model.totalExpense)}</tbody></table>`;
  html += `<p style="margin:0;height:8px;"></p>`;
  html += `<table><tbody>${total(model.net >= 0 ? 'NET PROFIT' : 'NET LOSS', model.net, '#E6EEF9')}<tr><td style="${cell}">Net profit margin</td><td style="${cell}text-align:right;">${model.margin}%</td></tr>${model.outstanding ? `<tr><td style="${cell}">Invoices sent, not yet paid (outstanding)</td><td style="${cell}text-align:right;">${formatMoney(model.outstanding)}</td></tr>` : ''}</tbody></table>`;

  if (monthly) {
    html += `<p style="margin:14px 0 6px;"><strong>Month by month</strong></p>`;
    html += `<table><thead><tr>${['Month', 'Income', 'Expenses', 'Net profit'].map((h, i) => `<th style="${cell}background:#EEF2F7;${i ? 'text-align:right;' : 'text-align:left;'}">${h}</th>`).join('')}</tr></thead><tbody>`;
    monthly.forEach(m => {
      html += `<tr><td style="${cell}">${m.label}</td><td style="${cell}text-align:right;">${formatMoney(m.totalIncome)}</td><td style="${cell}text-align:right;">${formatMoney(m.totalExpense)}</td><td style="${cell}text-align:right;">${formatMoney(m.net)}</td></tr>`;
    });
    html += `</tbody></table>`;
  }
  html += `<p style="margin-top:12px;color:#666;font-size:11px;">Prepared ${esc(formatLongDate(new Date().toISOString().substring(0, 10)))}. Income counts paid invoices (by issue date); expenses are recorded company expenses plus finalized payroll cost.</p>`;
  return html;
}

export default function Statements({ tasks = [], currentUserProfile = {} }) {
  const [mode, setMode] = useState('month'); // 'month' | 'year'
  const [month, setMonth] = useState(currentMonthKey());
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [includeTasks, setIncludeTasks] = useState(true);
  const [includePayroll, setIncludePayroll] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [runs, setRuns] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const canSeePayroll = ['Developer', 'Admin', 'Coordinator & Accountant'].includes(currentUserProfile?.role);

  useEffect(() => {
    let active = true;
    (async () => {
      const [inv, exp, pay] = await Promise.all([
        supabase.from('invoices').select('*'),
        supabase.from('expenses').select('*'),
        canSeePayroll ? supabase.from('payroll_runs').select('*') : Promise.resolve({ data: [] })
      ]);
      if (!active) return;
      const firstError = inv.error || exp.error || pay.error;
      setError(firstError ? firstError.message : '');
      setInvoices(inv.data || []);
      setExpenses(exp.data || []);
      setRuns(pay.data || []);
    })();
    return () => { active = false; };
  }, [canSeePayroll]);

  const key = mode === 'month' ? month : year;
  const periodLabel = mode === 'month' ? monthLabel(month) : `Year ${year}`;
  const common = { invoices, expenses, runs, tasks, includeTasks, includePayroll: includePayroll && canSeePayroll };

  const model = useMemo(
    () => buildModel({ key, ...common }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, invoices, expenses, runs, tasks, includeTasks, includePayroll, canSeePayroll]
  );

  const monthly = useMemo(() => {
    if (mode !== 'year') return null;
    return MONTH_SHORT.map((name, i) => {
      const m = buildModel({ key: `${year}-${String(i + 1).padStart(2, '0')}`, ...common });
      return { label: `${name} ${year}`, ...m };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, year, invoices, expenses, runs, tasks, includeTasks, includePayroll, canSeePayroll]);

  const title = mode === 'month' ? 'Monthly Income Statement' : 'Annual Income Statement';

  const handlePdf = async () => {
    setBusy('pdf');
    try {
      const html = statementHtml({ title, periodLabel, model, monthly });
      await downloadHtmlPdf(html, pdfFileName('Statement', key), { letterhead: true });
    } catch (err) {
      console.error(err);
      alert('Could not create the PDF.');
    } finally {
      setBusy('');
    }
  };

  const handleExcel = async () => {
    setBusy('xlsx');
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      const summary = [
        [COMPANY_PROFILE.name], [title], [periodLabel], [],
        ['Income', 'LKR'], ...model.incomeGroups.map(g => [g.label, g.amount]), ['Total income', model.totalIncome], [],
        ['Expenses', 'LKR'], ...model.expenseGroups.map(g => [g.label, g.amount]), ['Total expenses', model.totalExpense], [],
        [model.net >= 0 ? 'Net profit' : 'Net loss', model.net], ['Net profit margin %', model.margin], ['Outstanding (sent, unpaid)', model.outstanding]
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Statement');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(model.income.map(i => ({ Date: i.date, Description: i.label, Client: i.who, Type: i.group, 'Amount (LKR)': i.amount }))), 'Income');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(model.expense.map(i => ({ Date: i.date, Description: i.label, Vendor: i.who, Category: i.group, 'Amount (LKR)': i.amount }))), 'Expenses');
      if (monthly) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(monthly.map(m => ({ Month: m.label, Income: m.totalIncome, Expenses: m.totalExpense, 'Net profit': m.net }))), 'Month by month');
      }
      XLSX.writeFile(wb, `Statement_${key}.xlsx`);
    } catch (err) {
      console.error(err);
      alert('Could not create the Excel file.');
    } finally {
      setBusy('');
    }
  };

  const years = (() => {
    const now = new Date().getFullYear();
    return [now - 3, now - 2, now - 1, now, now + 1].map(String);
  })();
  const maxGroup = Math.max(1, ...model.expenseGroups.map(g => g.amount));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {error && (
        <div className="glass-panel" style={s.warning}>
          <AlertTriangle size={18} color="#F59E0B" />
          <span>Some data could not be loaded ({error}). The statement only includes what loaded.</span>
        </div>
      )}

      <div style={s.toolbar}>
        <div style={s.seg}>
          {[['month', 'Monthly'], ['year', 'Yearly']].map(([k, label]) => (
            <button key={k} type="button" onClick={() => setMode(k)} style={{ ...s.segBtn, backgroundColor: mode === k ? 'var(--color-gold)' : 'transparent', color: mode === k ? '#0A0F1D' : 'var(--color-text-primary)' }}>{label}</button>
          ))}
        </div>

        {mode === 'month' ? (
          <div style={s.monthNav}>
            <button type="button" style={s.navBtn} onClick={() => setMonth(shiftMonthKey(month, -1))}><ChevronLeft size={16} /></button>
            <strong style={{ minWidth: '140px', textAlign: 'center' }}>{monthLabel(month)}</strong>
            <button type="button" style={s.navBtn} onClick={() => setMonth(shiftMonthKey(month, 1))}><ChevronRight size={16} /></button>
          </div>
        ) : (
          <select className="form-input" style={{ width: '110px' }} value={year} onChange={(e) => setYear(e.target.value)}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        )}

        <label style={s.check}><input type="checkbox" checked={includeTasks} onChange={(e) => setIncludeTasks(e.target.checked)} /> Include paid website projects</label>
        {canSeePayroll && (
          <label style={s.check}><input type="checkbox" checked={includePayroll} onChange={(e) => setIncludePayroll(e.target.checked)} /> Include payroll cost</label>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button type="button" className="btn-primary" style={s.actionBtn} onClick={handlePdf} disabled={!!busy}><FileDown size={14} /> {busy === 'pdf' ? 'Creating...' : 'Download PDF'}</button>
          <button type="button" className="btn-secondary" style={s.actionBtn} onClick={handleExcel} disabled={!!busy}><FileSpreadsheet size={14} /> {busy === 'xlsx' ? 'Creating...' : 'Download Excel'}</button>
        </div>
      </div>

      <div style={s.summaryRow}>
        <Card icon={<TrendingUp size={20} color="#10B981" />} label="Total income" value={`LKR ${formatMoney(model.totalIncome)}`} color="#10B981" />
        <Card icon={<TrendingDown size={20} color="#EF4444" />} label="Total expenses" value={`LKR ${formatMoney(model.totalExpense)}`} color="#EF4444" />
        <Card icon={<PiggyBank size={20} color="var(--color-gold)" />} label={model.net >= 0 ? 'Net profit' : 'Net loss'} value={`LKR ${formatMoney(model.net)}`} color={model.net >= 0 ? 'var(--color-gold)' : '#EF4444'} />
        <Card icon={<Percent size={20} color="#3B82F6" />} label="Profit margin" value={`${model.margin}%`} color="#3B82F6" />
        <Card icon={<Hourglass size={20} color="#F59E0B" />} label="Outstanding" value={`LKR ${formatMoney(model.outstanding)}`} color="#F59E0B" />
      </div>

      <div style={s.twoCol}>
        <div className="glass-panel" style={s.panel}>
          <div style={s.panelTitle}>Income by type</div>
          <table className="data-table"><tbody>
            {model.incomeGroups.map(g => (
              <tr key={g.label}><td>{g.label}</td><td style={{ textAlign: 'right' }}>{formatMoney(g.amount)}</td></tr>
            ))}
            {model.incomeGroups.length === 0 && <tr><td style={s.empty}>No paid income in this period.</td></tr>}
            <tr><td style={{ fontWeight: 700 }}>Total</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{formatMoney(model.totalIncome)}</td></tr>
          </tbody></table>
        </div>
        <div className="glass-panel" style={s.panel}>
          <div style={s.panelTitle}>Expenses by category</div>
          <table className="data-table"><tbody>
            {model.expenseGroups.map(g => (
              <tr key={g.label}>
                <td>
                  <div>{g.label}</div>
                  <div style={{ height: '4px', marginTop: '4px', borderRadius: '2px', backgroundColor: 'rgba(239,68,68,0.55)', width: `${Math.max(3, (g.amount / maxGroup) * 100)}%` }} />
                </td>
                <td style={{ textAlign: 'right' }}>{formatMoney(g.amount)}</td>
              </tr>
            ))}
            {model.expenseGroups.length === 0 && <tr><td style={s.empty}>No expenses in this period.</td></tr>}
            <tr><td style={{ fontWeight: 700 }}>Total</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{formatMoney(model.totalExpense)}</td></tr>
          </tbody></table>
        </div>
      </div>

      {monthly && (
        <div className="glass-panel" style={s.panel}>
          <div style={s.panelTitle}>Month by month &mdash; {year}</div>
          <div className="table-container">
            <table className="data-table">
              <thead><tr><th>Month</th><th style={{ textAlign: 'right' }}>Income</th><th style={{ textAlign: 'right' }}>Expenses</th><th style={{ textAlign: 'right' }}>Net profit</th></tr></thead>
              <tbody>
                {monthly.map(m => (
                  <tr key={m.label}>
                    <td>{m.label}</td>
                    <td style={{ textAlign: 'right' }}>{formatMoney(m.totalIncome)}</td>
                    <td style={{ textAlign: 'right' }}>{formatMoney(m.totalExpense)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: m.net < 0 ? '#EF4444' : 'inherit' }}>{formatMoney(m.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={s.note}>
        Income counts <strong>paid invoices</strong> (by issue date){includeTasks ? ' and paid website projects (by last update)' : ''}; expenses are the company expenses you record
        {canSeePayroll ? ' plus the cost of finalized payroll (salaries, EPF 12% and ETF 3%)' : ''}. If a website project is also invoiced, untick &ldquo;Include paid website projects&rdquo; to avoid counting it twice.
      </div>
    </div>
  );
}

function Card({ icon, label, value, color }) {
  return (
    <div className="glass-panel" style={s.card}>
      <div style={s.cardIcon}>{icon}</div>
      <div>
        <div style={s.cardLabel}>{label}</div>
        <div style={{ ...s.cardValue, color }}>{value}</div>
      </div>
    </div>
  );
}

const s = {
  warning: { display: 'flex', gap: '10px', alignItems: 'center', padding: '12px 16px', fontSize: 'var(--font-size-sm)' },
  toolbar: { display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' },
  seg: { display: 'flex', padding: '3px', gap: '3px', backgroundColor: 'var(--bg-badge-dark)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' },
  segBtn: { border: 'none', padding: '6px 14px', borderRadius: 'var(--radius-xs)', fontSize: 'var(--font-size-sm)', fontWeight: 600, cursor: 'pointer' },
  monthNav: { display: 'flex', alignItems: 'center', gap: '8px' },
  navBtn: { background: 'var(--bg-badge-dark)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--color-gold)', cursor: 'pointer', padding: '6px', display: 'flex' },
  check: { display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-xs)' },
  actionBtn: { padding: '6px 12px', fontSize: 'var(--font-size-xs)', display: 'inline-flex', alignItems: 'center', gap: '6px' },
  summaryRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' },
  card: { display: 'flex', alignItems: 'center', gap: '12px', padding: '14px' },
  cardIcon: { width: '38px', height: '38px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-translucent-white)', flexShrink: 0 },
  cardLabel: { fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' },
  cardValue: { fontSize: 'var(--font-size-md)', fontWeight: 800, marginTop: '2px' },
  twoCol: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' },
  panel: { padding: '14px' },
  panelTitle: { fontWeight: 700, marginBottom: '8px', color: 'var(--color-gold)' },
  empty: { color: 'var(--color-text-muted)', padding: '16px' },
  note: { fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }
};
