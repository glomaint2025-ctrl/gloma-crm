import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Clock, AlertTriangle, CheckCheck, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { splitWorkedMinutes, isHoliday, formatMinutes } from '../workHours';
import {
  ATTENDANCE_STATUSES,
  LEAVE_ENTITLEMENT,
  currentMonthKey,
  shiftMonthKey,
  monthLabel,
  buildAttendance,
  leaveUsage,
  toLocalDateStr
} from '../payrollUtils';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STATUS_COLORS = {
  Present: '#10B981',
  Absent: '#EF4444',
  'Annual Leave': '#8B5CF6',
  'Casual Leave': '#3B82F6',
  'Sick Leave': '#F59E0B',
  'No Pay Leave': '#EF4444',
  'Half Day': '#F59E0B',
  Unmarked: '#F59E0B',
  Holiday: '#9CA3AF',
  Upcoming: '#9CA3AF'
};

const timeOf = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// Builds a local-time ISO string from a YYYY-MM-DD date and an HH:MM time.
const toISO = (date, time) => new Date(`${date}T${time}:00`).toISOString();

export default function Attendance({ profiles = [], timeLogs = [], currentUserProfile = {}, onRefreshData }) {
  const [employeeId, setEmployeeId] = useState('');
  const [month, setMonth] = useState(currentMonthKey());
  const [marks, setMarks] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [busyDate, setBusyDate] = useState('');
  const [timeForm, setTimeForm] = useState(null);
  const [formError, setFormError] = useState('');

  const today = toLocalDateStr();
  const year = Number(month.split('-')[0]);

  const selectedId = employeeId || profiles[0]?.id || '';

  const loadMarks = useCallback(async () => {
    const { data, error } = await supabase.from('attendance_marks').select('*');
    setLoadError(error ? error.message : '');
    setMarks(data || []);
  }, []);

  useEffect(() => {
    loadMarks();
  }, [loadMarks]);

  const days = useMemo(
    () => (selectedId ? buildAttendance({ employeeId: selectedId, monthKey: month, timeLogs, marks, today }) : []),
    [selectedId, month, timeLogs, marks, today]
  );

  const usage = selectedId ? leaveUsage(marks, selectedId, year) : {};
  const totalWorked = days.reduce((sum, d) => sum + d.regularMinutes, 0);
  const totalOvertime = days.reduce((sum, d) => sum + d.overtimeMinutes, 0);
  const unmarkedDays = days.filter(d => d.status === 'Unmarked');

  const setMark = async (day, status) => {
    setBusyDate(day.date);
    let error = null;
    if (!status) {
      if (day.mark) ({ error } = await supabase.from('attendance_marks').delete().eq('id', day.mark.id));
    } else if (day.mark) {
      ({ error } = await supabase.from('attendance_marks').update({ status, marked_by: currentUserProfile.id }).eq('id', day.mark.id));
    } else {
      ({ error } = await supabase.from('attendance_marks').insert({
        employee_id: selectedId,
        work_date: day.date,
        status,
        marked_by: currentUserProfile.id
      }));
    }
    await loadMarks();
    setBusyDate('');
    if (error) alert(`Could not save attendance: ${error.message}`);
  };

  const markAllPresent = async () => {
    if (!confirm(`Mark ${unmarkedDays.length} unmarked day(s) as Present?`)) return;
    setBusyDate('all');
    const { error } = await supabase.from('attendance_marks').insert(
      unmarkedDays.map(d => ({
        employee_id: selectedId,
        work_date: d.date,
        status: 'Present',
        marked_by: currentUserProfile.id
      }))
    );
    await loadMarks();
    setBusyDate('');
    if (error) alert(`Could not save attendance: ${error.message}`);
  };

  const openTimeEditor = (day) => {
    const log = day.logs[0] || null;
    setFormError('');
    setTimeForm({
      date: day.date,
      logId: log ? log.id : null,
      clockIn: log ? timeOf(log.clock_in) : '08:30',
      clockOut: log && log.clock_out ? timeOf(log.clock_out) : '',
      extraLogs: Math.max(0, day.logs.length - 1)
    });
  };

  const handleSaveTime = async (e) => {
    e.preventDefault();
    if (!timeForm.clockIn) {
      setFormError('Enter the start time.');
      return;
    }
    const clockInISO = toISO(timeForm.date, timeForm.clockIn);
    let clockOutISO = null;
    let split = { regularMinutes: null, overtimeMinutes: null };
    if (timeForm.clockOut) {
      clockOutISO = toISO(timeForm.date, timeForm.clockOut);
      if (new Date(clockOutISO) <= new Date(clockInISO)) {
        setFormError('End time must be after the start time.');
        return;
      }
      split = splitWorkedMinutes(clockInISO, clockOutISO, timeForm.date);
    }

    const fields = {
      clock_in: clockInISO,
      clock_out: clockOutISO,
      regular_minutes: split.regularMinutes,
      overtime_minutes: split.overtimeMinutes,
      is_holiday: isHoliday(timeForm.date),
      auto_closed: false
    };

    const { error } = timeForm.logId
      ? await supabase.from('time_logs').update(fields).eq('id', timeForm.logId)
      : await supabase.from('time_logs').insert({
          ...fields,
          user_id: selectedId,
          employee_name: profiles.find(p => p.id === selectedId)?.full_name,
          work_date: timeForm.date,
          source: 'manual'
        });

    if (error) {
      setFormError(`Could not save: ${error.message}`);
      return;
    }
    setTimeForm(null);
    if (onRefreshData) await onRefreshData();
  };

  const handleDeleteLog = async () => {
    if (!timeForm.logId || !confirm('Delete this time log?')) return;
    const { error } = await supabase.from('time_logs').delete().eq('id', timeForm.logId);
    if (error) {
      setFormError(`Could not delete: ${error.message}`);
      return;
    }
    setTimeForm(null);
    if (onRefreshData) await onRefreshData();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={s.toolbar}>
        <select
          className="form-input"
          style={{ width: 'auto', minWidth: '220px' }}
          value={selectedId}
          onChange={(e) => setEmployeeId(e.target.value)}
        >
          {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name} ({p.role})</option>)}
        </select>
        <div style={s.monthNav}>
          <button style={s.navBtn} onClick={() => setMonth(shiftMonthKey(month, -1))}><ChevronLeft size={16} /></button>
          <span style={{ fontWeight: 700, minWidth: '140px', textAlign: 'center' }}>{monthLabel(month)}</span>
          <button style={s.navBtn} onClick={() => setMonth(shiftMonthKey(month, 1))}><ChevronRight size={16} /></button>
        </div>
        {unmarkedDays.length > 0 && (
          <button className="btn-secondary" onClick={markAllPresent} disabled={busyDate === 'all'}>
            <CheckCheck size={15} /> Mark {unmarkedDays.length} unmarked as Present
          </button>
        )}
      </div>

      {loadError && (
        <div className="glass-panel" style={s.warning}>
          <AlertTriangle size={18} color="#F59E0B" />
          <span>
            Could not load attendance ({loadError}). Run <strong>supabase_phase2_payroll_finance.sql</strong> in the Supabase SQL Editor.
          </span>
        </div>
      )}

      <div style={s.summaryRow}>
        <div className="glass-panel" style={s.summaryCard}>
          <div style={s.summaryLabel}>Regular hours</div>
          <div style={s.summaryValue}>{formatMinutes(totalWorked)}</div>
        </div>
        <div className="glass-panel" style={s.summaryCard}>
          <div style={s.summaryLabel}>Overtime</div>
          <div style={{ ...s.summaryValue, color: '#F59E0B' }}>{formatMinutes(totalOvertime)}</div>
        </div>
        {Object.entries(LEAVE_ENTITLEMENT).map(([type, allowed]) => (
          <div key={type} className="glass-panel" style={s.summaryCard}>
            <div style={s.summaryLabel}>{type} {year}</div>
            <div style={s.summaryValue}>
              {usage[type] || 0} <span style={s.of}>/ {allowed} used</span>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-panel" style={{ padding: '8px' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time clock</th>
                <th>Hours</th>
                <th>Attendance</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {days.map(day => {
                const weekday = DAY_NAMES[new Date(`${day.date}T00:00:00`).getDay()];
                const nonWorking = !day.isWorkingDay;
                const log = day.logs[0];
                return (
                  <tr key={day.date} style={{ opacity: nonWorking && !day.logs.length ? 0.55 : 1 }}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{day.date.substring(8)} {weekday}</div>
                      {day.holidayName && <div style={s.subText}>{day.holidayName}</div>}
                    </td>
                    <td style={{ fontSize: 'var(--font-size-sm)' }}>
                      {log ? (
                        <>
                          {timeOf(log.clock_in)} - {log.clock_out ? timeOf(log.clock_out) : <span style={{ color: '#F59E0B' }}>still open</span>}
                          {log.source === 'auto' && <span style={s.tag}>auto</span>}
                          {log.auto_closed && <span style={{ ...s.tag, color: '#F59E0B' }}>auto-closed</span>}
                          {day.logs.length > 1 && <span style={s.tag}>+{day.logs.length - 1}</span>}
                        </>
                      ) : '-'}
                    </td>
                    <td style={{ fontSize: 'var(--font-size-sm)' }}>
                      {day.regularMinutes || day.overtimeMinutes ? (
                        <>
                          {formatMinutes(day.regularMinutes)}
                          {day.overtimeMinutes > 0 && <span style={{ color: '#F59E0B' }}> + {formatMinutes(day.overtimeMinutes)} OT</span>}
                        </>
                      ) : '-'}
                    </td>
                    <td>
                      <select
                        value={day.mark ? day.mark.status : ''}
                        disabled={busyDate === day.date}
                        onChange={(e) => setMark(day, e.target.value)}
                        style={{ ...s.statusSelect, color: STATUS_COLORS[day.status], borderColor: STATUS_COLORS[day.status] }}
                      >
                        <option value="">{day.mark ? 'Auto' : `Auto (${day.status})`}</option>
                        {ATTENDANCE_STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
                      </select>
                    </td>
                    <td>
                      <button style={s.iconBtn} title="Edit time clock" onClick={() => openTimeEditor(day)}>
                        <Clock size={15} color="var(--color-gold)" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {timeForm && (
        <div style={s.overlay}>
          <div className="glass-panel" style={s.modal}>
            <div style={s.modalHeader}>
              <h3>Time clock - {timeForm.date}</h3>
              <button style={s.closeBtn} onClick={() => setTimeForm(null)}>&times;</button>
            </div>
            <form onSubmit={handleSaveTime} style={s.form}>
              {timeForm.extraLogs > 0 && (
                <div style={s.subText}>This day has {timeForm.extraLogs + 1} sessions; the first one is edited here.</div>
              )}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={s.label}>Start</label>
                  <input type="time" required className="form-input" value={timeForm.clockIn} onChange={(e) => setTimeForm({ ...timeForm, clockIn: e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={s.label}>End (blank = still open)</label>
                  <input type="time" className="form-input" value={timeForm.clockOut} onChange={(e) => setTimeForm({ ...timeForm, clockOut: e.target.value })} />
                </div>
              </div>
              {formError && <div style={s.formError}>{formError}</div>}
              <div style={{ ...s.modalActions, justifyContent: 'space-between' }}>
                {timeForm.logId ? (
                  <button type="button" className="btn-secondary" onClick={handleDeleteLog}>
                    <Trash2 size={14} color="var(--color-cancelled)" /> Delete
                  </button>
                ) : <span />}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setTimeForm(null)}>Cancel</button>
                  <button type="submit" className="btn-primary">Save</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  toolbar: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  monthNav: { display: 'flex', alignItems: 'center', gap: '8px' },
  navBtn: { background: 'var(--bg-badge-dark)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--color-gold)', cursor: 'pointer', padding: '6px', display: 'flex' },
  warning: { display: 'flex', gap: '10px', alignItems: 'center', padding: '12px 16px', fontSize: 'var(--font-size-sm)' },
  summaryRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' },
  summaryCard: { padding: '14px 16px' },
  summaryLabel: { fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' },
  summaryValue: { fontSize: 'var(--font-size-lg)', fontWeight: 800 },
  of: { fontSize: 'var(--font-size-xs)', fontWeight: 500, color: 'var(--color-text-secondary)' },
  subText: { fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: '2px' },
  tag: { marginLeft: '6px', fontSize: '10px', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0 5px', color: 'var(--color-text-secondary)' },
  statusSelect: { background: 'transparent', border: '1px solid', borderRadius: 'var(--radius-sm)', padding: '3px 6px', fontSize: 'var(--font-size-xs)', fontWeight: 600, cursor: 'pointer' },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, backdropFilter: 'blur(4px)', padding: '16px' },
  modal: { width: '100%', maxWidth: '420px', padding: 'clamp(14px, 3vw, 24px)', backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-glass)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  closeBtn: { fontSize: 'var(--font-size-2xl)', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' },
  form: { display: 'flex', flexDirection: 'column', gap: '14px' },
  label: { display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.03em' },
  formError: { color: 'var(--color-cancelled)', fontSize: 'var(--font-size-sm)' },
  modalActions: { display: 'flex', gap: '10px', alignItems: 'center' }
};
