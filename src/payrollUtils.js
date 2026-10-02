import { isHoliday, getHoliday, getClosingTime } from './workHours';

// ---- Default payroll rules ------------------------------------------------------
// Editable from HR & Payroll -> Settings (stored in payroll_settings). These defaults
// follow the common Sri Lankan setup:
//  - Overtime: hours x 1.5 x (basic / 240), on every overtime minute (Sundays and Poya days too).
//  - No-pay day: basic / 30.
//  - EPF 8% employee + 12% employer, ETF 3% employer, on "total earnings", which exclude
//    overtime, incentives/bonuses and reimbursements. Mark each allowance as EPF-able or not.
//  - Leave: 14 annual, 7 casual, 7 sick days per year.
export const DEFAULT_PAYROLL_SETTINGS = {
  epf_employee_rate: 8,
  epf_employer_rate: 12,
  etf_rate: 3,
  ot_multiplier: 1.5,
  ot_hourly_divisor: 240,
  no_pay_divisor: 30,
  annual_leave_days: 14,
  casual_leave_days: 7,
  sick_leave_days: 7
};

// Merge a stored settings row over the defaults (numbers arrive as numbers or strings).
export function resolveSettings(row) {
  const merged = { ...DEFAULT_PAYROLL_SETTINGS };
  if (row) {
    Object.keys(DEFAULT_PAYROLL_SETTINGS).forEach(key => {
      const value = Number(row[key]);
      if (row[key] !== null && row[key] !== undefined && Number.isFinite(value)) merged[key] = value;
    });
    merged.id = row.id;
  }
  return merged;
}

export const ATTENDANCE_STATUSES = [
  'Present',
  'Absent',
  'Annual Leave',
  'Casual Leave',
  'Sick Leave',
  'No Pay Leave',
  'Half Day'
];

export function leaveEntitlement(settings) {
  return {
    'Annual Leave': settings.annual_leave_days,
    'Casual Leave': settings.casual_leave_days,
    'Sick Leave': settings.sick_leave_days
  };
}

// Statuses that cost the employee pay, and how many days each one removes.
const NO_PAY_WEIGHT = { Absent: 1, 'No Pay Leave': 1, 'Half Day': 0.5 };
// Days on which worked time is not counted (the employee was marked away).
const AWAY_STATUSES = ['Absent', 'Annual Leave', 'Casual Leave', 'Sick Leave', 'No Pay Leave'];

const pad2 = (n) => String(n).padStart(2, '0');

export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// Local calendar date as YYYY-MM-DD (never UTC, so late-night/early-morning dates stay correct).
export function toLocalDateStr(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function currentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

export function shiftMonthKey(monthKey, delta) {
  const [y, m] = monthKey.split('-').map(Number);
  return currentMonthKey(new Date(y, m - 1 + delta, 1));
}

export function monthLabel(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function daysInMonthKey(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  const count = new Date(y, m, 0).getDate();
  return Array.from({ length: count }, (_, i) => `${y}-${pad2(m)}-${pad2(i + 1)}`);
}

export function hourlyRate(basicSalary, settings = DEFAULT_PAYROLL_SETTINGS) {
  return (Number(basicSalary) || 0) / settings.ot_hourly_divisor;
}

// EPF/ETF contributions are due before the last working day of the following month.
export function epfDueDate(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  const due = new Date(y, m + 1, 0); // last day of the next month
  while (due.getDay() === 0 || due.getDay() === 6) due.setDate(due.getDate() - 1);
  return toLocalDateStr(due);
}

// ---- Allowances ---------------------------------------------------------------
// [{ label, amount, epf }]. Older salary rows only have a single fixed_allowance number.
export function allowanceItems(source) {
  if (Array.isArray(source?.allowances) && source.allowances.length) {
    return source.allowances
      .map(a => ({ label: a.label || 'Allowance', amount: Number(a.amount) || 0, epf: !!a.epf }))
      .filter(a => a.amount);
  }
  const fixed = Number(source?.fixed_allowance) || 0;
  return fixed ? [{ label: 'Allowance', amount: fixed, epf: false }] : [];
}

const sumAmounts = (items) => (Array.isArray(items) ? items : [])
  .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

// ---- APIT (monthly PAYE) ------------------------------------------------------
// IRD Table 01 for the 2025/26 year of assessment: tax = rate x monthly gross - constant,
// with the first Rs 150,000 a month tax-free. Verify against the current IRD table.
const APIT_BANDS = [
  { upTo: 150000, rate: 0, constant: 0 },
  { upTo: 233333.33, rate: 0.06, constant: 9000 },
  { upTo: 275000, rate: 0.18, constant: 37000 },
  { upTo: 316666.67, rate: 0.24, constant: 53500 },
  { upTo: 358333.33, rate: 0.30, constant: 72500 },
  { upTo: Infinity, rate: 0.36, constant: 94000 }
];

export function calcApit(monthlyTaxable) {
  const income = Number(monthlyTaxable) || 0;
  const band = APIT_BANDS.find(b => income <= b.upTo);
  return round2(Math.max(0, income * band.rate - band.constant));
}

// ---- Payslip totals -----------------------------------------------------------
// Works for saved payroll_runs rows (older rows simply lack the newer fields).
export function runTotals(run) {
  const allowances = allowanceItems(run).reduce((sum, a) => sum + a.amount, 0);
  const gross = round2(
    (Number(run.basic_salary) || 0) +
    allowances +
    (Number(run.ot_amount) || 0) +
    sumAmounts(run.additions)
  );
  const totalDeductions = round2(
    (Number(run.no_pay_deduction) || 0) +
    (Number(run.epf_employee) || 0) +
    (Number(run.apit) || 0) +
    (Number(run.loan_deduction) || 0) +
    sumAmounts(run.deductions)
  );
  return { gross, totalDeductions, net: round2(gross - totalDeductions) };
}

// What the payslip costs the company: earnings actually paid plus employer contributions.
export function runCompanyCost(run) {
  const { gross } = runTotals(run);
  return round2(
    gross - (Number(run.no_pay_deduction) || 0) +
    (Number(run.epf_employer) || 0) +
    (Number(run.etf_employer) || 0)
  );
}

// ---- Attendance ---------------------------------------------------------------
// One row per day of the month for an employee: what the time clock and any manual
// mark say, and the status payroll will use. Employees without a login account have no
// time clock, so a working day with no mark is assumed Present.
export function buildAttendance({ employee, monthKey, timeLogs = [], marks = [], today = toLocalDateStr() }) {
  const tracked = !!employee.profile_id;
  const myLogs = tracked ? timeLogs.filter(l => l.user_id === employee.profile_id) : [];
  const myMarks = marks.filter(m => m.employee_id === employee.id);
  const joined = employee.join_date ? String(employee.join_date).substring(0, 10) : '';
  const ended = employee.end_date ? String(employee.end_date).substring(0, 10) : '';

  return daysInMonthKey(monthKey).map(date => {
    const logs = myLogs.filter(l => l.work_date === date);
    const mark = myMarks.find(m => String(m.work_date).substring(0, 10) === date) || null;
    const holiday = getHoliday(date);
    const hasOpenLog = logs.some(l => !l.clock_out);

    let status;
    let assumed = false;
    if (date > today) status = 'Upcoming';
    else if ((joined && date < joined) || (ended && date > ended)) status = 'Not employed';
    else if (mark) status = mark.status;
    else if (holiday) status = logs.length ? 'Present' : 'Holiday';
    else if (logs.length) status = 'Present';
    else if (!tracked) {
      status = 'Present';
      assumed = true;
    } else status = 'Unmarked';

    const countsTime = !AWAY_STATUSES.includes(status) && status !== 'Not employed';
    return {
      date,
      holidayName: holiday ? holiday.name : '',
      isWorkingDay: !isHoliday(date) && status !== 'Not employed',
      closingTime: getClosingTime(date),
      logs,
      mark,
      status,
      assumed,
      regularMinutes: countsTime ? logs.reduce((s, l) => s + (l.regular_minutes || 0), 0) : 0,
      overtimeMinutes: countsTime ? logs.reduce((s, l) => s + (l.overtime_minutes || 0), 0) : 0,
      hasOpenLog
    };
  });
}

// Leave taken so far in a calendar year, per leave type.
export function leaveUsage(marks, employeeId, year) {
  const usage = { 'Annual Leave': 0, 'Casual Leave': 0, 'Sick Leave': 0 };
  marks.forEach(m => {
    if (m.employee_id !== employeeId) return;
    if (!String(m.work_date).startsWith(String(year))) return;
    if (usage[m.status] !== undefined) usage[m.status] += 1;
  });
  return usage;
}

// ---- Loans and salary advances --------------------------------------------------
// A loan without a status counts as Active (the database default).
export const isLoanActive = (loan) => (loan.status || 'Active') === 'Active';

// Only repayments that belong to a Finalized/Paid payslip count as repaid.
export function loanRepaid(loan, repayments, runs, excludeRunId = null) {
  const settledRuns = new Map(runs.filter(r => r.status === 'Finalized' || r.status === 'Paid').map(r => [r.id, r]));
  return round2(repayments
    .filter(rp => rp.loan_id === loan.id && rp.run_id !== excludeRunId && settledRuns.has(rp.run_id))
    .reduce((sum, rp) => sum + (Number(rp.amount) || 0), 0));
}

export function loanOutstanding(loan, repayments, runs, excludeRunId = null) {
  return round2(Math.max(0, (Number(loan.principal) || 0) - loanRepaid(loan, repayments, runs, excludeRunId)));
}

// Installments due on the payslip for `monthKey` (never more than what is still owed).
export function loanDeductionsFor({ employeeId, monthKey, loans, repayments, runs, excludeRunId = null }) {
  const details = [];
  loans
    .filter(l => l.employee_id === employeeId && isLoanActive(l) && l.start_month <= monthKey)
    .forEach(loan => {
      const outstanding = loanOutstanding(loan, repayments, runs, excludeRunId);
      const amount = round2(Math.min(Number(loan.installment) || 0, outstanding));
      if (amount > 0) details.push({ loan_id: loan.id, label: `${loan.loan_type} repayment`, amount });
    });
  return { total: round2(details.reduce((s, d) => s + d.amount, 0)), details };
}

// ---- The automatic part of a payslip ---------------------------------------------
export function computePayroll({
  employee,
  salary,
  settings = DEFAULT_PAYROLL_SETTINGS,
  monthKey,
  timeLogs = [],
  marks = [],
  loans = [],
  repayments = [],
  runs = [],
  excludeRunId = null,
  today = toLocalDateStr()
}) {
  const days = buildAttendance({ employee, monthKey, timeLogs, marks, today });
  const basic = Number(salary?.basic_salary) || 0;
  const allowances = allowanceItems(salary);
  const allowanceTotal = allowances.reduce((s, a) => s + a.amount, 0);

  const noPayDays = days.reduce((sum, d) => sum + (d.isWorkingDay ? (NO_PAY_WEIGHT[d.status] || 0) : 0), 0);
  const noPayDeduction = round2((basic / settings.no_pay_divisor) * noPayDays);

  const otHours = round2(days.reduce((sum, d) => sum + d.overtimeMinutes, 0) / 60);
  const otAmount = round2(otHours * hourlyRate(basic, settings) * settings.ot_multiplier);

  // EPF/ETF base: basic (less unpaid days) plus the allowances flagged EPF-able; never overtime.
  const epfBase = round2(Math.max(0, basic - noPayDeduction + allowances.filter(a => a.epf).reduce((s, a) => s + a.amount, 0)));
  const epfOn = !!salary?.epf_enabled;
  const etfOn = !!salary?.etf_enabled;
  const epfEmployee = epfOn ? round2(epfBase * settings.epf_employee_rate / 100) : 0;
  const epfEmployer = epfOn ? round2(epfBase * settings.epf_employer_rate / 100) : 0;
  const etfEmployer = etfOn ? round2(epfBase * settings.etf_rate / 100) : 0;

  // APIT is charged on the month's gross cash pay (earnings actually paid, overtime included).
  const taxableGross = round2(basic - noPayDeduction + allowanceTotal + otAmount);
  const apit = salary?.apit_enabled ? calcApit(taxableGross) : 0;

  const loan = loanDeductionsFor({ employeeId: employee.id, monthKey, loans, repayments, runs, excludeRunId });

  return {
    basic_salary: basic,
    fixed_allowance: round2(allowanceTotal),
    allowances,
    ot_hours: otHours,
    ot_amount: otAmount,
    no_pay_days: noPayDays,
    no_pay_deduction: noPayDeduction,
    epf_base: epfBase,
    epf_employee: epfEmployee,
    epf_employer: epfEmployer,
    etf_employer: etfEmployer,
    apit,
    loan_deduction: loan.total,
    loan_details: loan.details,
    unmarkedDays: days.filter(d => d.status === 'Unmarked').length,
    openLogs: days.filter(d => d.hasOpenLog).length
  };
}

// Keys compared to decide whether a Draft payslip is out of date.
export const AUTO_RUN_KEYS = [
  'basic_salary', 'fixed_allowance', 'ot_hours', 'ot_amount', 'no_pay_days', 'no_pay_deduction',
  'epf_employee', 'epf_employer', 'etf_employer', 'apit', 'loan_deduction'
];

// ---- HR helpers ------------------------------------------------------------------
export function daysUntil(dateStr, today = toLocalDateStr()) {
  if (!dateStr) return null;
  const a = new Date(`${String(dateStr).substring(0, 10)}T00:00:00`);
  const b = new Date(`${today}T00:00:00`);
  return Math.round((a - b) / 86400000);
}

export function serviceYears(joinDate, asOf = toLocalDateStr()) {
  if (!joinDate) return 0;
  const start = new Date(`${String(joinDate).substring(0, 10)}T00:00:00`);
  const end = new Date(`${asOf}T00:00:00`);
  let years = end.getFullYear() - start.getFullYear();
  const anniversary = new Date(end.getFullYear(), start.getMonth(), start.getDate());
  if (end < anniversary) years -= 1;
  return Math.max(0, years);
}

export function formatService(joinDate, asOf = toLocalDateStr()) {
  if (!joinDate) return '-';
  const start = new Date(`${String(joinDate).substring(0, 10)}T00:00:00`);
  const end = new Date(`${asOf}T00:00:00`);
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) months -= 1;
  months = Math.max(0, months);
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y ? `${y} yr` : '', m ? `${m} mo` : ''].filter(Boolean).join(' ') || 'under 1 mo';
}

// Payment of Gratuity Act: half a month's last salary for each completed year, once the
// employee has completed 5 years (applies to employers with 15 or more employees).
export function gratuityEstimate(joinDate, basicSalary, asOf = toLocalDateStr()) {
  const years = serviceYears(joinDate, asOf);
  if (years < 5) return { eligible: false, years, amount: 0 };
  return { eligible: true, years, amount: round2(years * (Number(basicSalary) || 0) / 2) };
}
