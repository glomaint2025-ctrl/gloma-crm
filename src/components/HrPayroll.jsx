import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  Users,
  Banknote,
  CalendarCheck,
  HandCoins,
  FileBarChart,
  Settings2,
  AlertTriangle,
  CheckCircle2,
  Cake,
  ArrowRight
} from 'lucide-react';
import { useHrData } from '../hrData';
import { formatMoney } from '../invoiceUtils';
import {
  currentMonthKey,
  shiftMonthKey,
  monthLabel,
  buildAttendance,
  runTotals,
  epfDueDate,
  daysUntil,
  loanOutstanding,
  isLoanActive,
  toLocalDateStr
} from '../payrollUtils';
import Employees from './Employees';
import Payroll from './Payroll';
import Attendance from './Attendance';
import Loans from './Loans';
import PayrollReports from './PayrollReports';
import PayrollSettings from './PayrollSettings';

const TABS = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'employees', label: 'Employees', icon: Users },
  { key: 'payroll', label: 'Payroll', icon: Banknote },
  { key: 'attendance', label: 'Attendance & leave', icon: CalendarCheck },
  { key: 'loans', label: 'Loans & advances', icon: HandCoins },
  { key: 'reports', label: 'Reports', icon: FileBarChart },
  { key: 'settings', label: 'Settings', icon: Settings2 }
];

export default function HrPayroll({
  profiles = [],
  timeLogs = [],
  currentUserProfile = {},
  onCreateMemberAccount,
  onRefreshData
}) {
  const hr = useHrData();
  const [tab, setTab] = useState('overview');

  const today = toLocalDateStr();
  const thisMonth = currentMonthKey();
  const lastMonth = shiftMonthKey(thisMonth, -1);

  const todo = useMemo(() => {
    const items = [];
    const active = hr.employees.filter(e => e.status === 'Active');

    const noSalary = active.filter(e => !hr.salaries.some(s => s.employee_id === e.id));
    if (noSalary.length) {
      items.push({ tone: 'warn', text: `${noSalary.length} employee(s) have no salary set: ${noSalary.map(e => e.full_name).slice(0, 4).join(', ')}${noSalary.length > 4 ? '...' : ''}`, go: 'employees' });
    }

    const lastMonthRuns = hr.runs.filter(r => r.month === lastMonth);
    const withSalary = active.filter(e => hr.salaries.some(s => s.employee_id === e.id));
    if (withSalary.length && lastMonthRuns.length === 0) {
      items.push({ tone: 'warn', text: `Payroll for ${monthLabel(lastMonth)} has not been calculated yet.`, go: 'payroll' });
    }

    [lastMonth, thisMonth].forEach(m => {
      const monthRuns = hr.runs.filter(r => r.month === m);
      const drafts = monthRuns.filter(r => r.status === 'Draft').length;
      const unpaid = monthRuns.filter(r => r.status === 'Finalized').length;
      if (drafts) items.push({ tone: 'info', text: `${drafts} draft payslip(s) for ${monthLabel(m)} still need to be finalized.`, go: 'payroll' });
      if (unpaid) items.push({ tone: 'info', text: `${unpaid} finalized payslip(s) for ${monthLabel(m)} are not marked as paid.`, go: 'payroll' });
    });

    const epfRuns = hr.runs.filter(r => r.month === lastMonth && (Number(r.epf_employee) > 0 || Number(r.epf_employer) > 0 || Number(r.etf_employer) > 0));
    if (epfRuns.length) {
      const due = epfDueDate(lastMonth);
      const left = daysUntil(due, today);
      const amount = epfRuns.reduce((s, r) => s + (Number(r.epf_employee) || 0) + (Number(r.epf_employer) || 0) + (Number(r.etf_employer) || 0), 0);
      items.push({
        tone: left < 0 ? 'bad' : left <= 7 ? 'warn' : 'info',
        text: `EPF + ETF for ${monthLabel(lastMonth)} (LKR ${formatMoney(amount)}) ${left < 0 ? `was due on ${due}` : `is due by ${due} (${left} day(s))`}.`,
        go: 'reports'
      });
    }

    const unmarked = active.filter(e => e.profile_id).filter(e =>
      buildAttendance({ employee: e, monthKey: thisMonth, timeLogs, marks: hr.marks, today })
        .some(d => d.status === 'Unmarked' || d.hasOpenLog)
    );
    if (unmarked.length) {
      items.push({ tone: 'info', text: `${unmarked.length} employee(s) have unmarked days or open time logs this month.`, go: 'attendance' });
    }

    active.forEach(e => {
      const p = daysUntil(e.probation_end_date, today);
      const c = daysUntil(e.contract_end_date, today);
      if (p !== null && p >= 0 && p <= 30) items.push({ tone: 'warn', text: `${e.full_name}'s probation ends in ${p} day(s).`, go: 'employees' });
      if (c !== null && c >= 0 && c <= 30) items.push({ tone: 'warn', text: `${e.full_name}'s contract ends in ${c} day(s).`, go: 'employees' });
    });

    const noBank = active.filter(e => !e.bank_account_no).length;
    const noEpfNo = active.filter(e => !e.epf_no && hr.salaries.some(s => s.employee_id === e.id && s.epf_enabled)).length;
    if (noBank) items.push({ tone: 'info', text: `${noBank} active employee(s) have no bank account saved.`, go: 'employees' });
    if (noEpfNo) items.push({ tone: 'info', text: `${noEpfNo} EPF member(s) have no EPF number saved.`, go: 'employees' });

    return items;
  }, [hr.employees, hr.salaries, hr.runs, hr.marks, timeLogs, lastMonth, thisMonth, today]);

  const birthdays = useMemo(() => {
    const monthNumber = thisMonth.slice(5);
    return hr.employees
      .filter(e => e.status === 'Active' && e.date_of_birth && String(e.date_of_birth).substring(5, 7) === monthNumber)
      .map(e => ({ name: e.full_name, day: String(e.date_of_birth).substring(8, 10) }))
      .sort((a, b) => a.day.localeCompare(b.day));
  }, [hr.employees, thisMonth]);

  const thisMonthRuns = hr.runs.filter(r => r.month === thisMonth);
  const activeCount = hr.employees.filter(e => e.status === 'Active').length;
  const netThisMonth = thisMonthRuns.reduce((s, r) => s + runTotals(r).net, 0);
  const outstandingLoans = hr.loans
    .filter(isLoanActive)
    .reduce((s, l) => s + loanOutstanding(l, hr.repayments, hr.runs), 0);
  const lastMonthEmployer = hr.runs
    .filter(r => r.month === lastMonth)
    .reduce((s, r) => s + (Number(r.epf_employee) || 0) + (Number(r.epf_employer) || 0) + (Number(r.etf_employer) || 0), 0);

  const shared = {
    employees: hr.employees,
    salaries: hr.salaries,
    marks: hr.marks,
    runs: hr.runs,
    loans: hr.loans,
    repayments: hr.repayments,
    settings: hr.settings,
    timeLogs,
    currentUserProfile,
    onReload: hr.reload
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={s.tabBar}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{ ...s.tabBtn, backgroundColor: tab === key ? 'var(--color-gold)' : 'transparent', color: tab === key ? '#0A0F1D' : 'var(--color-text-primary)' }}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {hr.loadError && (
        <div className="glass-panel" style={s.warning}>
          <AlertTriangle size={18} color="#F59E0B" />
          <span>
            Could not load HR data ({hr.loadError}). Run <strong>supabase_phase3_hr_payroll.sql</strong> in the Supabase SQL Editor
            (after the phase 1 and phase 2 files).
          </span>
        </div>
      )}

      {tab === 'overview' && (
        <>
          <div style={s.cards}>
            <div className="glass-panel" style={s.card}>
              <div style={s.cardLabel}>Active employees</div>
              <div style={s.cardValue}>{activeCount}</div>
            </div>
            <div className="glass-panel" style={s.card}>
              <div style={s.cardLabel}>Net payroll - {monthLabel(thisMonth)}</div>
              <div style={{ ...s.cardValue, color: '#10B981' }}>
                {thisMonthRuns.length ? `LKR ${formatMoney(netThisMonth)}` : 'not calculated'}
              </div>
            </div>
            <div className="glass-panel" style={s.card}>
              <div style={s.cardLabel}>EPF + ETF for {monthLabel(lastMonth)}</div>
              <div style={s.cardValue}>{lastMonthEmployer ? `LKR ${formatMoney(lastMonthEmployer)}` : '-'}</div>
            </div>
            <div className="glass-panel" style={s.card}>
              <div style={s.cardLabel}>Loans outstanding</div>
              <div style={{ ...s.cardValue, color: outstandingLoans ? '#F59E0B' : 'var(--color-text-primary)' }}>LKR {formatMoney(outstandingLoans)}</div>
            </div>
          </div>

          <div className="glass-panel" style={s.todoPanel}>
            <div style={s.todoTitle}>To do</div>
            {todo.length === 0 ? (
              <div style={s.allGood}><CheckCircle2 size={16} color="#10B981" /> Everything is up to date.</div>
            ) : todo.map((item, index) => (
              <button key={index} style={s.todoRow} onClick={() => setTab(item.go)}>
                <AlertTriangle size={15} color={item.tone === 'bad' ? '#EF4444' : item.tone === 'warn' ? '#F59E0B' : 'var(--color-text-secondary)'} />
                <span style={{ flex: 1, textAlign: 'left' }}>{item.text}</span>
                <ArrowRight size={14} color="var(--color-text-muted)" />
              </button>
            ))}
          </div>

          {birthdays.length > 0 && (
            <div className="glass-panel" style={s.todoPanel}>
              <div style={s.todoTitle}><Cake size={15} color="var(--color-gold)" /> Birthdays in {monthLabel(thisMonth)}</div>
              <div style={{ fontSize: 'var(--font-size-sm)' }}>
                {birthdays.map(b => `${b.name} (${b.day})`).join(', ')}
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'employees' && (
        <Employees {...shared} profiles={profiles} onCreateMemberAccount={onCreateMemberAccount} />
      )}
      {tab === 'payroll' && <Payroll {...shared} />}
      {tab === 'attendance' && <Attendance {...shared} onRefreshData={onRefreshData} />}
      {tab === 'loans' && <Loans {...shared} />}
      {tab === 'reports' && <PayrollReports employees={hr.employees} runs={hr.runs} settings={hr.settings} />}
      {tab === 'settings' && <PayrollSettings key={hr.settingsRow?.id || 'defaults'} settings={hr.settings} onReload={hr.reload} />}
    </div>
  );
}

const s = {
  tabBar: { display: 'flex', gap: '4px', flexWrap: 'wrap', padding: '4px', alignSelf: 'flex-start', backgroundColor: 'var(--bg-badge-dark)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' },
  tabBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', border: 'none', borderRadius: 'var(--radius-xs)', fontSize: 'var(--font-size-sm)', fontWeight: 600, cursor: 'pointer' },
  warning: { display: 'flex', gap: '10px', alignItems: 'center', padding: '12px 16px', fontSize: 'var(--font-size-sm)' },
  cards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' },
  card: { padding: '16px 18px' },
  cardLabel: { fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' },
  cardValue: { fontSize: 'var(--font-size-xl)', fontWeight: 800 },
  todoPanel: { padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '6px' },
  todoTitle: { display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, marginBottom: '4px' },
  todoRow: { display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)', cursor: 'pointer' },
  allGood: { display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }
};
