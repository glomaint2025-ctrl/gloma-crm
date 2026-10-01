// Gloma office hours: Mon-Fri 08:30-17:00, Saturday 08:30-15:30, Sunday off.
// Any time worked past the day's closing time (or on a non-working day) counts
// as overtime. Used by the Dashboard clock widget, the Work Hours history page,
// and the Content Calendar's holiday overlay.

export const OFFICE_OPEN_TIME = '08:30';
export const WEEKDAY_CLOSE_TIME = '17:00';
export const SATURDAY_CLOSE_TIME = '15:30';

// Company holidays are Sundays and Poya (full moon) days only; other mercantile and
// public holidays are normal working days. Poya dates for 2026-2027 are taken from
// the published Sri Lanka Poya calendar (publicholidays.lk). Add the next year's list
// here before January, otherwise only Sundays will count as holidays.
export const POYA_DAYS = [
  { date: '2026-01-03', name: 'Duruthu Full Moon Poya Day' },
  { date: '2026-02-01', name: 'Navam Full Moon Poya Day' },
  { date: '2026-03-02', name: 'Madin Full Moon Poya Day' },
  { date: '2026-04-01', name: 'Bak Full Moon Poya Day' },
  { date: '2026-05-01', name: 'Vesak Full Moon Poya Day' },
  { date: '2026-05-30', name: 'Adhi Poson Full Moon Poya Day' },
  { date: '2026-06-29', name: 'Poson Full Moon Poya Day' },
  { date: '2026-07-29', name: 'Esala Full Moon Poya Day' },
  { date: '2026-08-27', name: 'Nikini Full Moon Poya Day' },
  { date: '2026-09-26', name: 'Binara Full Moon Poya Day' },
  { date: '2026-10-25', name: 'Vap Full Moon Poya Day' },
  { date: '2026-11-24', name: 'Ill Full Moon Poya Day' },
  { date: '2026-12-23', name: 'Unduvap Full Moon Poya Day' },
  { date: '2027-01-22', name: 'Duruthu Full Moon Poya Day' },
  { date: '2027-02-20', name: 'Navam Full Moon Poya Day' },
  { date: '2027-03-21', name: 'Madin Full Moon Poya Day' },
  { date: '2027-04-20', name: 'Bak Full Moon Poya Day' },
  { date: '2027-05-20', name: 'Vesak Full Moon Poya Day' },
  { date: '2027-06-18', name: 'Poson Full Moon Poya Day' },
  { date: '2027-07-18', name: 'Esala Full Moon Poya Day' },
  { date: '2027-08-16', name: 'Nikini Full Moon Poya Day' },
  { date: '2027-09-15', name: 'Binara Full Moon Poya Day' },
  { date: '2027-10-15', name: 'Vap Full Moon Poya Day' },
  { date: '2027-11-13', name: 'Ill Full Moon Poya Day' },
  { date: '2027-12-13', name: 'Unduvap Full Moon Poya Day' }
];

const holidayMap = new Map(POYA_DAYS.map(h => [h.date, h.name]));

export function isSunday(dateStr) {
  return new Date(`${dateStr}T00:00:00`).getDay() === 0;
}

export function isSaturday(dateStr) {
  return new Date(`${dateStr}T00:00:00`).getDay() === 6;
}

// Returns { date, name } if dateStr (YYYY-MM-DD) is a Sunday or a Poya day,
// otherwise null.
export function getHoliday(dateStr) {
  if (isSunday(dateStr)) return { date: dateStr, name: 'Sunday' };
  const name = holidayMap.get(dateStr);
  return name ? { date: dateStr, name } : null;
}

export function isHoliday(dateStr) {
  return !!getHoliday(dateStr);
}

// Office closing time for a given date, or null on a non-working day (Sunday) --
// every minute worked on a non-working day / holiday counts as overtime.
export function getClosingTime(dateStr) {
  if (isSunday(dateStr)) return null;
  return isSaturday(dateStr) ? SATURDAY_CLOSE_TIME : WEEKDAY_CLOSE_TIME;
}

// Splits a clock-in/out pair into { regularMinutes, overtimeMinutes }, honoring
// holidays (all overtime) and the Saturday/weekday closing-time split.
export function splitWorkedMinutes(clockInISO, clockOutISO, workDate) {
  const clockIn = new Date(clockInISO);
  const clockOut = new Date(clockOutISO);
  const totalMinutes = Math.max(0, Math.round((clockOut - clockIn) / 60000));

  if (isHoliday(workDate)) {
    return { regularMinutes: 0, overtimeMinutes: totalMinutes };
  }

  const closing = getClosingTime(workDate);
  if (!closing) {
    return { regularMinutes: 0, overtimeMinutes: totalMinutes };
  }

  const [ch, cm] = closing.split(':').map(Number);
  const closingDate = new Date(clockIn);
  closingDate.setHours(ch, cm, 0, 0);

  if (clockOut <= closingDate) {
    return { regularMinutes: totalMinutes, overtimeMinutes: 0 };
  }
  if (clockIn >= closingDate) {
    return { regularMinutes: 0, overtimeMinutes: totalMinutes };
  }
  const regularMinutes = Math.max(0, Math.round((closingDate - clockIn) / 60000));
  return { regularMinutes, overtimeMinutes: totalMinutes - regularMinutes };
}

export function formatMinutes(mins) {
  const safeMins = Math.max(0, Math.round(mins));
  const h = Math.floor(safeMins / 60);
  const m = safeMins % 60;
  return `${h}h ${m}m`;
}

// Today's date in the device's local timezone (not UTC), as YYYY-MM-DD.
export function todayStr() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
