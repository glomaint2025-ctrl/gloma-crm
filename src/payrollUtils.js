import { isHoliday, getHoliday, getClosingTime } from './workHours';

// ---- Payroll rules (adjust here if company policy or the law changes) ----------
// Overtime: 1.5x the ordinary hourly rate, where hourly = basic salary / 240
// (the usual Sri Lankan Shop & Office convention). Applied to every overtime
// minute, including Sundays and gazetted holidays.
export const OT_MULTIPLIER = 1.5;
export const OT_HOURLY_DIVISOR = 240;
// Value of one unpaid day when deducting no-pay leave: monthly basic / 30.
export const NO_PAY_DAY_DIVISOR = 30;

// Yearly leave entitlement shown in the Attendance tab.
export const LEAVE_ENTITLEMENT = {
  'Annual Leave': 14,
  'Casual Leave': 7,
  'Sick Leave': 7
};

export const ATTENDANCE_STATUSES = [
  'Present',
  'Absent',
  'Annual Leave',
  'Casual Leave',
  'Sick Leave',
  'No Pay Leave',
  'Half Day'
];

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

export function hourlyRate(basicSalary) {
  return (Number(basicSalary) || 0) / OT_HOURLY_DIVISOR;
}

const sumItems = (items) => (Array.isArray(items) ? items : [])
  .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

// Gross / deductions / net for a saved payroll run (or one being edited).
export function runTotals(run) {
  const gross = round2(
    (Number(run.basic_salary) || 0) +
    (Number(run.fixed_allowance) || 0) +
    (Number(run.ot_amount) || 0) +
    sumItems(run.additions)
  );
  const totalDeductions = round2((Number(run.no_pay_deduction) || 0) + sumItems(run.deductions));
  return { gross, totalDeductions, net: round2(gross - totalDeductions) };
}

// One row per day of the month for an employee: what the time clock and any
// manual mark say, and the status payroll will use.
export function buildAttendance({ employeeId, monthKey, timeLogs = [], marks = [], today = toLocalDateStr() }) {
  const myLogs = timeLogs.filter(l => l.user_id === employeeId);
  const myMarks = marks.filter(m => m.employee_id === employeeId);

  return daysInMonthKey(monthKey).map(date => {
    const logs = myLogs.filter(l => l.work_date === date);
    const mark = myMarks.find(m => String(m.work_date).substring(0, 10) === date) || null;
    const holiday = getHoliday(date);
    const hasOpenLog = logs.some(l => !l.clock_out);

    let status;
    if (mark) status = mark.status;
    else if (date > today) status = 'Upcoming';
    else if (holiday) status = logs.length ? 'Present' : 'Holiday';
    else if (logs.length) status = 'Present';
    else status = 'Unmarked';

    const countsTime = !AWAY_STATUSES.includes(status);
    const regularMinutes = countsTime ? logs.reduce((s, l) => s + (l.regular_minutes || 0), 0) : 0;
    const overtimeMinutes = countsTime ? logs.reduce((s, l) => s + (l.overtime_minutes || 0), 0) : 0;

    return {
      date,
      holidayName: holiday ? holiday.name : '',
      isWorkingDay: !isHoliday(date),
      closingTime: getClosingTime(date),
      logs,
      mark,
      status,
      regularMinutes,
      overtimeMinutes,
      hasOpenLog
    };
  });
}

// Automatic part of a payslip, derived from attendance + the salary profile.
export function computePayrollAutoFields({ salary, employeeId, monthKey, timeLogs, marks, today }) {
  const days = buildAttendance({ employeeId, monthKey, timeLogs, marks, today });
  const basic = Number(salary?.basic_salary) || 0;

  const noPayDays = days.reduce((sum, d) => sum + (d.isWorkingDay ? (NO_PAY_WEIGHT[d.status] || 0) : 0), 0);
  const otMinutes = days.reduce((sum, d) => sum + d.overtimeMinutes, 0);
  const otHours = round2(otMinutes / 60);

  return {
    basic_salary: basic,
    fixed_allowance: Number(salary?.fixed_allowance) || 0,
    ot_hours: otHours,
    ot_amount: round2(otHours * hourlyRate(basic) * OT_MULTIPLIER),
    no_pay_days: noPayDays,
    no_pay_deduction: round2((basic / NO_PAY_DAY_DIVISOR) * noPayDays),
    unmarkedDays: days.filter(d => d.status === 'Unmarked').length,
    openLogs: days.filter(d => d.hasOpenLog).length
  };
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
