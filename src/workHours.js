// Gloma office hours: Mon-Fri 08:30-17:00, Saturday 08:30-15:30, Sunday off.
// Any time worked past the day's closing time (or on a non-working day) counts
// as overtime. Used by the Dashboard clock widget, the Work Hours history page,
// and the Content Calendar's holiday overlay.

export const OFFICE_OPEN_TIME = '08:30';
export const WEEKDAY_CLOSE_TIME = '17:00';
export const SATURDAY_CLOSE_TIME = '15:30';

// Best-effort 2026 Sri Lanka public/bank/mercantile holiday + Poya list, compiled
// from published 2026 calendar sources. Five of these (Islamic feasts and the
// Sinhala/Tamil New Year) are moon-sighting-dependent and can shift by a day --
// double check against the official government gazette if exact accuracy matters
// for payroll.
export const SRI_LANKA_HOLIDAYS_2026 = [
  { date: '2026-01-03', name: 'Duruthu Full Moon Poya Day' },
  { date: '2026-01-14', name: 'Tamil Thai Pongal Day' },
  { date: '2026-02-02', name: 'Navam Full Moon Poya Day' },
  { date: '2026-02-04', name: 'National Day' },
  { date: '2026-02-17', name: 'Mahasivarathri Day' },
  { date: '2026-03-03', name: 'Madin Full Moon Poya Day' },
  { date: '2026-03-20', name: 'Id Ul-Fitr (Ramazan Festival)' },
  { date: '2026-04-02', name: 'Bak Full Moon Poya Day' },
  { date: '2026-04-03', name: 'Good Friday' },
  { date: '2026-04-13', name: 'Day Prior to Sinhala & Tamil New Year' },
  { date: '2026-04-14', name: 'Sinhala & Tamil New Year Day' },
  { date: '2026-05-01', name: 'May Day & Vesak Full Moon Poya' },
  { date: '2026-05-02', name: 'Day Following Vesak Poya' },
  { date: '2026-05-27', name: 'Id Ul-Alha (Hajj Festival)' },
  { date: '2026-06-01', name: 'Poson Full Moon Poya Day' },
  { date: '2026-06-30', name: 'Esala Full Moon Poya Day' },
  { date: '2026-07-29', name: 'Nikini Full Moon Poya Day' },
  { date: '2026-08-25', name: "Milad un-Nabi (Prophet's Birthday)" },
  { date: '2026-08-27', name: 'Binara Full Moon Poya Day' },
  { date: '2026-09-26', name: 'Vap Full Moon Poya Day' },
  { date: '2026-10-25', name: 'Il Full Moon Poya Day' },
  { date: '2026-11-09', name: 'Deepavali Festival Day' },
  { date: '2026-11-24', name: 'Unduvap Full Moon Poya Day' },
  { date: '2026-12-25', name: 'Christmas Day' }
];

const holidayMap = new Map(SRI_LANKA_HOLIDAYS_2026.map(h => [h.date, h.name]));

export function isSunday(dateStr) {
  return new Date(`${dateStr}T00:00:00`).getDay() === 0;
}

export function isSaturday(dateStr) {
  return new Date(`${dateStr}T00:00:00`).getDay() === 6;
}

// Returns { date, name } if dateStr (YYYY-MM-DD) is a Sunday or a gazetted
// holiday, otherwise null.
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

export function todayStr() {
  return new Date().toISOString().substring(0, 10);
}
