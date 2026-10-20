import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CalendarCheck, CheckCircle2, ChevronLeft, ChevronRight, Plus, Info } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { splitWorkedMinutes, isHoliday, formatMinutes } from '../workHours';
import {
  ATTENDANCE_STATUSES,
  currentMonthKey,
  shiftMonthKey,
  monthLabel,
  buildAttendance,
  toLocalDateStr
} from '../payrollUtils';

const PAYROLL_ROLES = ['Developer', 'Admin', 'Coordinator & Accountant'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STATUS_COLORS = {
  Present: '#10B981',
  Absent: '#EF4444',
  'Annual Leave': '#8B5CF6',
  'Casual Leave': '#3B82F6',
  'Sick Leave': '#F59E0B',
  'No Pay Leave': '#EF4444',
  'Half Day': '#F59E0B',
  'Not employed': '#9CA3AF',
  Unmarked: '#F59E0B',
  Holiday: '#9CA3AF',
  Upcoming: '#9CA3AF'
};

const timeOf = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const toISO = (date, time) => new Date(`${date}T${time}:00`).toISOString();
const dateKey = (value) => String(value).substring(0, 10);

// Dates from `from` to `to` inclusive (YYYY-MM-DD), capped to guard against typos.
function dateRange(from, to) {
  const out = [];
  const cursor = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  while (cursor <= end && out.length < 62) {
    out.push(toLocalDateStr(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export default function AttendanceMark({ timeLogs = [], currentUserProfile = {}, onRefreshData }) {
  const isHr = PAYROLL_ROLES.includes(currentUserProfile?.role);
  const today = toLocalDateStr();

  const [employees, setEmployees] = useState([]);
  const [marks, setMarks] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState('mine');
  const [month, setMonth] = useState(currentMonthKey());
  const [marking, setMarking] = useState(false);
  const [message, setMessage] = useState('');
  const [boardDate, setBoardDate] = useState(today);
  const [busyKey, setBusyKey] = useState('');
  const [addForm, setAddForm] = useState(null);
  const [addError, setAddError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [emp, mk] = await Promise.all([
      supabase.from('employees').select('*'),
      supabase.from('attendance_marks').select('*')
    ]);
    const firstError = [emp, mk].find(r => r.error)?.error;
    setLoadError(firstError ? firstError.message : '');
    setEmployees((emp.data || []).slice().sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '')));
    setMarks(mk.data || []);
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const me = employees.find(e => e.profile_id === currentUserProfile?.id) || null;
  const activeEmployees = useMemo(() => employees.filter(e => e.status === 'Active'), [employees]);

  const myDays = useMemo(
    () => (me ? buildAttendance({ employee: me, monthKey: month, timeLogs, marks, today }) : []),
    [me, month, timeLogs, marks, today]
  );
  const myToday = useMemo(
    () => (me ? buildAttendance({ employee: me, monthKey: today.substring(0, 7), timeLogs, marks, today }).find(d => d.date === today) : null),
    [me, timeLogs, marks, today]
  );

  const markMePresent = async () => {
    if (!me) return;
    setMarking(true);
    setMessage('');
    const { error } = await supabase.from('attendance_marks').insert({
      employee_id: me.id,
      work_date: today,
      status: 'Present',
      notes: 'Self-marked',
      marked_by: currentUserProfile.id
    });
    if (error) {
      setMessage(
        /row-level security|policy|permission/i.test(error.message)
          ? 'Self-marking is not enabled yet. Ask the admin to run supabase_add_self_attendance.sql in Supabase.'
          : `Could not mark attendance: ${error.message}`
      );
    }
    await load();
    setMarking(false);
  };

  // HR / admin: create or replace the mark for one employee on one date.
  const upsertMark = async ({ employeeId, date, status, notes }) => {
    const existing = marks.find(m => m.employee_id === employeeId && dateKey(m.work_date) === date);
    if (existing) {
      return supabase.from('attendance_marks')
        .update({ status, notes: notes || existing.notes || null, marked_by: currentUserProfile.id })
        .eq('id', existing.id);
    }
    return supabase.from('attendance_marks').insert({
      employee_id: employeeId,
      work_date: date,
      status,
      notes: notes || null,
      marked_by: currentUserProfile.id
    });
  };

  const setBoardStatus = async (employee, status) => {
    const key = `${employee.id}|${boardDate}`;
    setBusyKey(key);
    const existing = marks.find(m => m.employee_id === employee.id && dateKey(m.work_date) === boardDate);
    let error = null;
    if (!status) {
      if (existing) ({ error } = await supabase.from('attendance_marks').delete().eq('id', existing.id));
    } else {
      ({ error } = await upsertMark({ employeeId: employee.id, date: boardDate, status }));
    }
    await load();
    setBusyKey('');
    if (error) alert(`Could not save attendance: ${error.message}`);
  };

  const openAdd = (employeeId = '') => {
    setAddError('');
    setAddForm({
      employeeId: employeeId || activeEmployees[0]?.id || '',
      from: boardDate,
      to: boardDate,
      status: 'Present',
      skipNonWorking: true,
      clockIn: '',
      clockOut: '',
      notes: ''
    });
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setAddError('');
    const employee = employees.find(x => x.id === addForm.employeeId);
    if (!employee) {
      setAddError('Choose an employee.');
      return;
    }
    if (addForm.to < addForm.from) {
      setAddError('The end date must be on or after the start date.');
      return;
    }
    let dates = dateRange(addForm.from, addForm.to);
    if (addForm.skipNonWorking && dates.length > 1) dates = dates.filter(d => !isHoliday(d));
    if (!dates.length) {
      setAddError('No working days in that range.');
      return;
    }
    const withTimes = !!addForm.clockIn && dates.length === 1 && !!employee.profile_id;
    if (withTimes && addForm.clockOut && addForm.clockOut <= addForm.clockIn) {
      setAddError('End time must be after the start time.');
      return;
    }

    setSaving(true);
    for (const date of dates) {
      const { error } = await upsertMark({ employeeId: employee.id, date, status: addForm.status, notes: addForm.notes.trim() });
      if (error) {
        setSaving(false);
        setAddError(`Could not save ${date}: ${error.message}`);
        await load();
        return;
      }
    }

    // Optional time-clock entry (single day, employees with a login only).
    if (withTimes) {
      const date = dates[0];
      const clockInISO = toISO(date, addForm.clockIn);
      const clockOutISO = addForm.clockOut ? toISO(date, addForm.clockOut) : null;
      const split = clockOutISO
        ? splitWorkedMinutes(clockInISO, clockOutISO, date)
        : { regularMinutes: null, overtimeMinutes: null };
      const { error } = await supabase.from('time_logs').insert({
        user_id: employee.profile_id,
        employee_name: employee.full_name,
        work_date: date,
        clock_in: clockInISO,
        clock_out: clockOutISO,
        regular_minutes: split.regularMinutes,
        overtime_minutes: split.overtimeMinutes,
        is_holiday: isHoliday(date),
        source: 'manual'
      });
      if (error) {
        setSaving(false);
        setAddError(`Attendance saved, but the time entry failed: ${error.message}`);
        await load();
        return;
      }
      if (onRefreshData) await onRefreshData();
    }

    setSaving(false);
    setAddForm(null);
    await load();
  };

  // One row per active employee for the selected date.
  const boardRows = useMemo(() => {
    const monthKey = boardDate.substring(0, 7);
    return activeEmployees.map(employee => {
      const days = buildAttendance({ employee, monthKey, timeLogs, marks, today });
      return { employee, day: days.find(d => d.date === boardDate) };
    });
  }, [activeEmployees, boardDate, timeLogs, marks, today]);

  const boardSummary = boardRows.reduce((acc, { day }) => {
    if (!day) return acc;
    if (day.status === 'Present') acc.present += 1;
    else if (day.status === 'Unmarked') acc.unmarked += 1;
    else if (!['Upcoming', 'Holiday', 'Not employed'].includes(day.status)) acc.away += 1;
    return acc;
  }, { present: 0, away: 0, unmarked: 0 });

  const markedToday = !!myToday && (!!myToday.mark || myToday.logs.length > 0);
  const addEmployee = addForm ? employees.find(x => x.id === addForm.employeeId) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
      <div style={s.headerRow}>
        <div>
          <h2 style={s.title}><CalendarCheck size={22} color="var(--color-gold)" /> Attendance</h2>
          <p style={s.subtitle}>
            Mark your attendance each day{isHr ? ', and add or correct attendance for other employees' : ''}.
          </p>
        </div>
        {isHr && (
          <div style={s.tabs}>
            <button className={tab === 'mine' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('mine')}>My attendance</button>
            <button className={tab === 'team' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('team')}>Team attendance (HR)</button>
          </div>
        )}
      </div>

      {loadError && (
        <div className="glass-panel" style={s.notice}>
          <Info size={16} color="#F59E0B" /> Could not load attendance ({loadError}).
        </div>
      )}

      {tab === 'mine' && (
        <>
          {loaded && !me && (
            <div className="glass-panel" style={s.notice}>
              <Info size={16} color="var(--color-gold)" />
              No employee record is linked to your account yet, so attendance cannot be marked. Ask HR to add you under HR &amp; Payroll.
            </div>
          )}

          {me && myToday && (
            <div className="glass-panel" style={s.todayCard}>
              <div>
                <div style={s.smallLabel}>Today - {today} ({DAY_NAMES[new Date(`${today}T00:00:00`).getDay()]})</div>
                {markedToday ? (
                  <div style={{ ...s.bigStatus, color: STATUS_COLORS[myToday.status] || 'inherit' }}>
                    <CheckCircle2 size={22} /> {myToday.status}
                    {myToday.mark?.notes === 'Self-marked' && <span style={s.tag}>self-marked</span>}
                  </div>
                ) : (
                  <div style={{ ...s.bigStatus, color: '#F59E0B' }}>Not marked yet</div>
                )}
                {myToday.holidayName && <div style={s.subText}>{myToday.holidayName}</div>}
                {message && <div style={s.errorText}>{message}</div>}
              </div>
              {!markedToday && (
                <button className="btn-primary" onClick={markMePresent} disabled={marking}>
                  <CheckCircle2 size={16} /> {marking ? 'Marking...' : 'Mark me present'}
                </button>
              )}
            </div>
          )}

          {me && (
            <>
              <div style={s.monthNav}>
                <button style={s.navBtn} onClick={() => setMonth(shiftMonthKey(month, -1))}><ChevronLeft size={16} /></button>
                <span style={{ fontWeight: 700, minWidth: '150px', textAlign: 'center' }}>{monthLabel(month)}</span>
                <button style={s.navBtn} onClick={() => setMonth(shiftMonthKey(month, 1))}><ChevronRight size={16} /></button>
              </div>
              <div className="glass-panel" style={{ padding: '8px' }}>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr><th>Date</th><th>Time clock</th><th>Hours</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {myDays.map(day => {
                        const log = day.logs[0];
                        const weekday = DAY_NAMES[new Date(`${day.date}T00:00:00`).getDay()];
                        return (
                          <tr key={day.date} style={{ opacity: !day.isWorkingDay && !day.logs.length ? 0.55 : 1 }}>
                            <td>
                              <div style={{ fontWeight: 600 }}>{day.date.substring(8)} {weekday}</div>
                              {day.holidayName && <div style={s.subText}>{day.holidayName}</div>}
                            </td>
                            <td style={s.cell}>
                              {log ? (
                                <>{timeOf(log.clock_in)} - {log.clock_out ? timeOf(log.clock_out) : <span style={{ color: '#F59E0B' }}>open</span>}</>
                              ) : '-'}
                            </td>
                            <td style={s.cell}>
                              {day.regularMinutes || day.overtimeMinutes ? (
                                <>
                                  {formatMinutes(day.regularMinutes)}
                                  {day.overtimeMinutes > 0 && <span style={{ color: '#F59E0B' }}> + {formatMinutes(day.overtimeMinutes)} OT</span>}
                                </>
                              ) : '-'}
                            </td>
                            <td>
                              <span style={{ ...s.statusPill, color: STATUS_COLORS[day.status], borderColor: STATUS_COLORS[day.status] }}>{day.status}</span>
                              {day.mark?.notes && <div style={s.subText}>{day.mark.notes}</div>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {tab === 'team' && isHr && (
        <>
          <div style={s.toolbar}>
            <input
              type="date"
              className="form-input"
              style={{ width: 'auto' }}
              value={boardDate}
              onChange={(e) => e.target.value && setBoardDate(e.target.value)}
            />
            <button className="btn-secondary" onClick={() => setBoardDate(today)}>Today</button>
            <button className="btn-primary" onClick={() => openAdd()}><Plus size={15} /> Add attendance</button>
          </div>

          <div style={s.summaryRow}>
            <div className="glass-panel" style={s.summaryCard}>
              <div style={s.smallLabel}>Present</div>
              <div style={{ ...s.summaryValue, color: '#10B981' }}>{boardSummary.present}</div>
            </div>
            <div className="glass-panel" style={s.summaryCard}>
              <div style={s.smallLabel}>Away / leave</div>
              <div style={{ ...s.summaryValue, color: '#8B5CF6' }}>{boardSummary.away}</div>
            </div>
            <div className="glass-panel" style={s.summaryCard}>
              <div style={s.smallLabel}>Not marked</div>
              <div style={{ ...s.summaryValue, color: '#F59E0B' }}>{boardSummary.unmarked}</div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '8px' }}>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr><th>Employee</th><th>Time clock</th><th>Attendance</th><th></th></tr>
                </thead>
                <tbody>
                  {boardRows.map(({ employee, day }) => {
                    if (!day) return null;
                    const log = day.logs[0];
                    const key = `${employee.id}|${boardDate}`;
                    return (
                      <tr key={employee.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{employee.full_name}</div>
                          {employee.designation && <div style={s.subText}>{employee.designation}</div>}
                        </td>
                        <td style={s.cell}>
                          {log ? (
                            <>{timeOf(log.clock_in)} - {log.clock_out ? timeOf(log.clock_out) : <span style={{ color: '#F59E0B' }}>open</span>}</>
                          ) : '-'}
                        </td>
                        <td>
                          <select
                            value={day.mark ? day.mark.status : ''}
                            disabled={busyKey === key}
                            onChange={(e) => setBoardStatus(employee, e.target.value)}
                            style={{ ...s.statusSelect, color: STATUS_COLORS[day.status], borderColor: STATUS_COLORS[day.status] }}
                          >
                            <option value="">{day.mark ? 'Auto' : `Auto (${day.status}${day.assumed ? ', assumed' : ''})`}</option>
                            {ATTENDANCE_STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
                          </select>
                          {day.mark?.notes && <div style={s.subText}>{day.mark.notes}</div>}
                        </td>
                        <td>
                          <button style={s.iconBtn} title="Add attendance for a date range or with times" onClick={() => openAdd(employee.id)}>
                            <Plus size={15} color="var(--color-gold)" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {boardRows.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)' }}>No active employees.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {addForm && (
        <div style={s.overlay}>
          <div className="glass-panel" style={s.modal}>
            <div style={s.modalHeader}>
              <h3>Add attendance</h3>
              <button style={s.closeBtn} onClick={() => setAddForm(null)}>&times;</button>
            </div>
            <form onSubmit={handleAdd} style={s.form}>
              <div>
                <label style={s.label}>Employee</label>
                <select
                  className="form-input"
                  required
                  value={addForm.employeeId}
                  onChange={(e) => setAddForm({ ...addForm, employeeId: e.target.value })}
                >
                  {activeEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.full_name}{emp.designation ? ` (${emp.designation})` : ''}</option>
                  ))}
                </select>
              </div>
              <div style={s.row}>
                <div style={{ flex: 1 }}>
                  <label style={s.label}>From</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={addForm.from}
                    onChange={(e) => setAddForm({ ...addForm, from: e.target.value, to: addForm.to < e.target.value ? e.target.value : addForm.to })}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={s.label}>To</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    min={addForm.from}
                    value={addForm.to}
                    onChange={(e) => setAddForm({ ...addForm, to: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label style={s.label}>Status</label>
                <select className="form-input" value={addForm.status} onChange={(e) => setAddForm({ ...addForm, status: e.target.value })}>
                  {ATTENDANCE_STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
                </select>
              </div>
              {addForm.from !== addForm.to && (
                <label style={s.check}>
                  <input
                    type="checkbox"
                    checked={addForm.skipNonWorking}
                    onChange={(e) => setAddForm({ ...addForm, skipNonWorking: e.target.checked })}
                  />
                  Skip Sundays and holidays
                </label>
              )}
              {addForm.from === addForm.to && addEmployee?.profile_id && (
                <div style={s.row}>
                  <div style={{ flex: 1 }}>
                    <label style={s.label}>Start time (optional)</label>
                    <input type="time" className="form-input" value={addForm.clockIn} onChange={(e) => setAddForm({ ...addForm, clockIn: e.target.value })} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={s.label}>End time</label>
                    <input
                      type="time"
                      className="form-input"
                      disabled={!addForm.clockIn}
                      value={addForm.clockOut}
                      onChange={(e) => setAddForm({ ...addForm, clockOut: e.target.value })}
                    />
                  </div>
                </div>
              )}
              <div>
                <label style={s.label}>Note (optional)</label>
                <input
                  className="form-input"
                  placeholder="e.g. Forgot to mark, client visit"
                  value={addForm.notes}
                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                />
              </div>
              <div style={s.subText}>Existing marks for these dates are replaced. Times add a manual time-clock entry for the day.</div>
              {addError && <div style={s.errorText}>{addError}</div>}
              <div style={s.modalActions}>
                <button type="button" className="btn-secondary" onClick={() => setAddForm(null)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save attendance'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' },
  title: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' },
  subtitle: { color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' },
  tabs: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  notice: { display: 'flex', gap: '10px', alignItems: 'center', padding: '12px 16px', fontSize: 'var(--font-size-sm)' },
  todayCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', padding: '18px 20px' },
  smallLabel: { fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' },
  bigStatus: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--font-size-xl)', fontWeight: 800 },
  monthNav: { display: 'flex', alignItems: 'center', gap: '8px' },
  navBtn: { background: 'var(--bg-badge-dark)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--color-gold)', cursor: 'pointer', padding: '6px', display: 'flex' },
  toolbar: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  summaryRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' },
  summaryCard: { padding: '14px 16px' },
  summaryValue: { fontSize: 'var(--font-size-xl)', fontWeight: 800 },
  cell: { fontSize: 'var(--font-size-sm)' },
  subText: { fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: '2px' },
  tag: { marginLeft: '6px', fontSize: '10px', fontWeight: 500, border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0 5px', color: 'var(--color-text-secondary)' },
  statusPill: { border: '1px solid', borderRadius: 'var(--radius-sm)', padding: '2px 8px', fontSize: 'var(--font-size-xs)', fontWeight: 600 },
  statusSelect: { background: 'transparent', border: '1px solid', borderRadius: 'var(--radius-sm)', padding: '3px 6px', fontSize: 'var(--font-size-xs)', fontWeight: 600, cursor: 'pointer' },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, backdropFilter: 'blur(4px)', padding: '16px' },
  modal: { width: '100%', maxWidth: '460px', padding: 'clamp(14px, 3vw, 24px)', backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-glass)', maxHeight: '92vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  closeBtn: { fontSize: 'var(--font-size-2xl)', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' },
  form: { display: 'flex', flexDirection: 'column', gap: '14px' },
  row: { display: 'flex', gap: '12px' },
  check: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--font-size-sm)' },
  label: { display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.03em' },
  errorText: { color: 'var(--color-cancelled)', fontSize: 'var(--font-size-sm)', marginTop: '6px' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px' }
};
