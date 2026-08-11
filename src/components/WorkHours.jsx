import React, { useState } from 'react';
import { Clock, Filter, Sun, Table2, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatMinutes, getHoliday } from '../workHours';

const localTranslations = {
  en: {
    title: "Work Hours",
    subtitle: "Clock-in / clock-out history, overtime, and the Sri Lanka holiday calendar.",
    allEmployees: "All Teammates",
    date: "Date",
    employee: "Employee",
    clockIn: "Clock In",
    clockOut: "Clock Out",
    regular: "Regular",
    overtime: "Overtime",
    holiday: "Holiday",
    active: "Still working",
    empty: "No work-hour records found.",
    totalRegular: "Total Regular",
    totalOvertime: "Total Overtime",
    holidayNote: "Worked on a holiday",
    historyView: "History",
    calendarView: "Holiday Calendar",
    workedOn: "Worked:"
  },
  si: {
    title: "වැඩ කරන වේලාවන්",
    subtitle: "පැමිණීම / පිටවීම ඉතිහාසය, අතිකාල, සහ ශ්‍රී ලංකා නිවාඩු දින දර්ශනය.",
    allEmployees: "සියලුම සේවකයින්",
    date: "දිනය",
    employee: "සේවකයා",
    clockIn: "පටන් ගත් වේලාව",
    clockOut: "නැවතුණු වේලාව",
    regular: "සාමාන්‍ය",
    overtime: "අතිකාල",
    holiday: "නිවාඩු",
    active: "තවමත් වැඩ කරයි",
    empty: "වාර්තා කිසිවක් හමු නොවීය.",
    totalRegular: "මුළු සාමාන්‍ය වේලාව",
    totalOvertime: "මුළු අතිකාල වේලාව",
    holidayNote: "නිවාඩු දිනයක වැඩ කර ඇත",
    historyView: "ඉතිහාසය",
    calendarView: "නිවාඩු දින දර්ශනය",
    workedOn: "වැඩ කළා:"
  },
  ta: {
    title: "பணி நேரங்கள்",
    subtitle: "வருகை / புறப்பாடு வரலாறு, கூடுதல் நேரம், மற்றும் இலங்கை விடுமுறை காலெண்டர்.",
    allEmployees: "அனைத்து ஊழியர்கள்",
    date: "தேதி",
    employee: "ஊழியர்",
    clockIn: "தொடங்கிய நேரம்",
    clockOut: "முடிந்த நேரம்",
    regular: "வழக்கமான",
    overtime: "கூடுதல் நேரம்",
    holiday: "விடுமுறை",
    active: "இன்னும் பணியில்",
    empty: "பதிவுகள் எதுவும் இல்லை.",
    totalRegular: "மொத்த வழக்கமான நேரம்",
    totalOvertime: "மொத்த கூடுதல் நேரம்",
    holidayNote: "விடுமுறை நாளில் பணியாற்றியது",
    historyView: "வரலாறு",
    calendarView: "விடுமுறை காலெண்டர்",
    workedOn: "பணியாற்றியவர்:"
  }
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const WEEK_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad2 = (n) => String(n).padStart(2, '0');

export default function WorkHours({
  timeLogs = [],
  profiles = [],
  currentUserProfile = {},
  lang = 'en'
}) {
  const t = localTranslations[lang] || localTranslations.en;

  const userRole = currentUserProfile?.role || 'Employee';
  const canSeeAll = userRole === 'Developer' || userRole === 'Admin' || userRole === 'Manager';

  const [filterEmployee, setFilterEmployee] = useState('');
  const [view, setView] = useState('history'); // 'history' | 'calendar'
  const [calendarDate, setCalendarDate] = useState(new Date());

  const baseLogs = canSeeAll
    ? timeLogs
    : timeLogs.filter(l => l.user_id === currentUserProfile.id);

  const visibleLogs = baseLogs.filter(l => !filterEmployee || l.user_id === filterEmployee);

  const totalRegular = visibleLogs.reduce((sum, l) => sum + (l.regular_minutes || 0), 0);
  const totalOvertime = visibleLogs.reduce((sum, l) => sum + (l.overtime_minutes || 0), 0);

  // ===== Holiday calendar view =====
  const calYear = calendarDate.getFullYear();
  const calMonth = calendarDate.getMonth();
  const startDayIdx = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startDayIdx; i++) {
    cells.push(<div key={`empty-${i}`} style={styles.emptyDay}></div>);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${calYear}-${pad2(calMonth + 1)}-${pad2(day)}`;
    const holiday = getHoliday(dateStr);
    const isToday = new Date().toISOString().substring(0, 10) === dateStr;
    const workedNames = holiday
      ? [...new Set(
          visibleLogs
            .filter(l => l.work_date === dateStr && l.is_holiday)
            .map(l => l.employee_name)
        )]
      : [];

    cells.push(
      <div
        key={dateStr}
        style={{
          ...styles.dayCell,
          border: isToday ? '1px solid var(--color-gold)' : holiday ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-subtle)',
          backgroundColor: isToday ? 'rgba(212,175,55,0.06)' : holiday ? 'rgba(239, 68, 68, 0.05)' : 'rgba(17,24,39,0.3)'
        }}
      >
        <span style={{
          ...styles.dayNumber,
          color: isToday ? 'var(--color-gold)' : holiday ? '#EF4444' : 'var(--color-text-primary)',
          fontWeight: isToday || holiday ? 'bold' : 'normal'
        }}>
          {day}
        </span>
        {holiday && (
          <span style={styles.holidayTag} title={holiday.name}>{holiday.name}</span>
        )}
        {workedNames.length > 0 && (
          <span style={styles.workedTag} title={`${t.workedOn} ${workedNames.join(', ')}`}>
            {t.workedOn} {workedNames.join(', ')}
          </span>
        )}
      </div>
    );
  }

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.headerRow}>
        <div>
          <h2 style={styles.pageTitle}>
            <Clock size={22} color="var(--color-gold)" /> {t.title}
          </h2>
          <p style={styles.pageSubtitle}>{t.subtitle}</p>
        </div>

        <div style={styles.toggleGroup}>
          <button
            onClick={() => setView('history')}
            style={{
              ...styles.toggleBtn,
              backgroundColor: view === 'history' ? 'var(--color-gold)' : 'transparent',
              color: view === 'history' ? '#0A0F1D' : 'var(--color-text-primary)'
            }}
          >
            <Table2 size={14} /> {t.historyView}
          </button>
          <button
            onClick={() => setView('calendar')}
            style={{
              ...styles.toggleBtn,
              backgroundColor: view === 'calendar' ? 'var(--color-gold)' : 'transparent',
              color: view === 'calendar' ? '#0A0F1D' : 'var(--color-text-primary)'
            }}
          >
            <CalendarDays size={14} /> {t.calendarView}
          </button>
        </div>
      </div>

      <div style={styles.summaryRow}>
        <div className="glass-panel" style={styles.summaryCard}>
          <div style={styles.summaryLabel}>{t.totalRegular}</div>
          <div style={{ ...styles.summaryValue, color: 'var(--color-gold)' }}>{formatMinutes(totalRegular)}</div>
        </div>
        <div className="glass-panel" style={styles.summaryCard}>
          <div style={styles.summaryLabel}>{t.totalOvertime}</div>
          <div style={{ ...styles.summaryValue, color: '#EF4444' }}>{formatMinutes(totalOvertime)}</div>
        </div>

        {canSeeAll && (
          <div style={styles.filterItem} className="glass-panel">
            <Filter size={13} color="var(--color-gold)" />
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              style={styles.selectFilter}
            >
              <option value="">{t.allEmployees}</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {view === 'history' && (
        <div className="glass-panel" style={{ padding: '8px' }}>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t.date}</th>
                  {canSeeAll && <th>{t.employee}</th>}
                  <th>{t.clockIn}</th>
                  <th>{t.clockOut}</th>
                  <th>{t.regular}</th>
                  <th>{t.overtime}</th>
                </tr>
              </thead>
              <tbody>
                {visibleLogs.map(log => {
                  const holiday = getHoliday(log.work_date);
                  return (
                    <tr key={log.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {log.work_date}
                          {(holiday || log.is_holiday) && (
                            <span title={t.holidayNote} style={styles.holidayBadge}>
                              <Sun size={10} /> {holiday?.name || t.holiday}
                            </span>
                          )}
                        </div>
                      </td>
                      {canSeeAll && <td>{log.employee_name}</td>}
                      <td>{new Date(log.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td>
                        {log.clock_out
                          ? new Date(log.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : <span style={styles.activeTag}>{t.active}</span>}
                      </td>
                      <td style={{ color: 'var(--color-gold)', fontWeight: 600 }}>
                        {log.clock_out ? formatMinutes(log.regular_minutes || 0) : '—'}
                      </td>
                      <td style={{ color: (log.overtime_minutes || 0) > 0 ? '#EF4444' : 'var(--color-text-secondary)', fontWeight: (log.overtime_minutes || 0) > 0 ? 700 : 400 }}>
                        {log.clock_out ? formatMinutes(log.overtime_minutes || 0) : '—'}
                      </td>
                    </tr>
                  );
                })}
                {visibleLogs.length === 0 && (
                  <tr>
                    <td colSpan={canSeeAll ? 6 : 5} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                      {t.empty}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'calendar' && (
        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={styles.calendarNav}>
            <button onClick={() => setCalendarDate(new Date(calYear, calMonth - 1, 1))} style={styles.pagBtn}>
              <ChevronLeft size={18} />
            </button>
            <span style={styles.monthDisplay}>{MONTH_NAMES[calMonth]} {calYear}</span>
            <button onClick={() => setCalendarDate(new Date(calYear, calMonth + 1, 1))} style={styles.pagBtn}>
              <ChevronRight size={18} />
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: '640px' }}>
              <div style={styles.weekGrid}>
                {WEEK_LABELS.map(d => <div key={d} style={styles.weekLabel}>{d}</div>)}
              </div>
              <div style={styles.calendarGrid}>
                {cells}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px'
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '12px'
  },
  pageTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: 'var(--font-size-xl)',
    fontWeight: '800',
    color: 'var(--color-text-primary)'
  },
  pageSubtitle: {
    color: 'var(--color-text-secondary)',
    fontSize: 'var(--font-size-sm)',
    marginTop: '6px'
  },
  toggleGroup: {
    display: 'flex',
    backgroundColor: 'var(--bg-badge-dark)',
    padding: '3px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-subtle)'
  },
  toggleBtn: {
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: 'var(--font-size-sm)',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all var(--transition-fast)'
  },
  summaryRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  summaryCard: {
    padding: '14px 20px',
    minWidth: '160px'
  },
  summaryLabel: {
    fontSize: 'var(--font-size-xs)',
    fontWeight: '700',
    color: 'var(--color-text-secondary)',
    letterSpacing: '0.05em',
    textTransform: 'uppercase'
  },
  summaryValue: {
    fontSize: 'var(--font-size-xl)',
    fontWeight: '800',
    marginTop: '2px'
  },
  filterItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'var(--bg-badge-dark)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)',
    padding: '6px 12px'
  },
  selectFilter: {
    background: 'none',
    border: 'none',
    outline: 'none',
    color: 'var(--color-text-primary)',
    fontSize: 'var(--font-size-sm)',
    cursor: 'pointer'
  },
  holidayBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: 'var(--font-size-xs)',
    fontWeight: '700',
    color: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    border: '1px solid rgba(245, 158, 11, 0.25)',
    borderRadius: 'var(--radius-full)',
    padding: '1px 8px'
  },
  activeTag: {
    fontSize: 'var(--font-size-xs)',
    fontWeight: '700',
    color: '#10B981'
  },
  calendarNav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    marginBottom: '14px'
  },
  pagBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-gold)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px'
  },
  monthDisplay: {
    fontSize: 'var(--font-size-md)',
    fontWeight: 'bold',
    color: 'var(--color-text-primary)',
    minWidth: '140px',
    textAlign: 'center'
  },
  weekGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '1px',
    textAlign: 'center',
    backgroundColor: 'var(--bg-translucent-white)',
    borderRadius: 'var(--radius-xs)',
    padding: '8px 0'
  },
  weekLabel: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'bold',
    color: 'var(--color-text-secondary)',
    textTransform: 'uppercase'
  },
  calendarGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gridAutoRows: 'minmax(80px, auto)',
    gap: '6px',
    marginTop: '6px'
  },
  emptyDay: {
    backgroundColor: 'transparent'
  },
  dayCell: {
    padding: '8px',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minHeight: '80px'
  },
  dayNumber: {
    fontSize: 'var(--font-size-xs)',
    alignSelf: 'flex-end'
  },
  holidayTag: {
    fontSize: '9px',
    fontWeight: '700',
    color: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    borderRadius: '3px',
    padding: '1px 4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  workedTag: {
    fontSize: '9px',
    fontWeight: '700',
    color: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    border: '1px dashed rgba(245, 158, 11, 0.35)',
    borderRadius: '3px',
    padding: '1px 4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  }
};
