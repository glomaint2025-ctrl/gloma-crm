import React, { useState } from 'react';
import { Clock, Filter, AlertTriangle, Sun } from 'lucide-react';
import { formatMinutes, getHoliday } from '../workHours';

const localTranslations = {
  en: {
    title: "Work Hours",
    subtitle: "Clock-in / clock-out history and overtime.",
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
    holidayNote: "Worked on a holiday"
  },
  si: {
    title: "වැඩ කරන වේලාවන්",
    subtitle: "පැමිණීම / පිටවීම ඉතිහාසය සහ අතිකාල.",
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
    holidayNote: "නිවාඩු දිනයක වැඩ කර ඇත"
  },
  ta: {
    title: "பணி நேரங்கள்",
    subtitle: "வருகை / புறப்பாடு வரலாறு மற்றும் கூடுதல் நேரம்.",
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
    holidayNote: "விடுமுறை நாளில் பணியாற்றியது"
  }
};

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

  const baseLogs = canSeeAll
    ? timeLogs
    : timeLogs.filter(l => l.user_id === currentUserProfile.id);

  const visibleLogs = baseLogs.filter(l => !filterEmployee || l.user_id === filterEmployee);

  const totalRegular = visibleLogs.reduce((sum, l) => sum + (l.regular_minutes || 0), 0);
  const totalOvertime = visibleLogs.reduce((sum, l) => sum + (l.overtime_minutes || 0), 0);

  return (
    <div style={styles.container} className="animate-fade-in">
      <div>
        <h2 style={styles.pageTitle}>
          <Clock size={22} color="var(--color-gold)" /> {t.title}
        </h2>
        <p style={styles.pageSubtitle}>{t.subtitle}</p>
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
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px'
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
  }
};
