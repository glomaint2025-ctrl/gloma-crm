import React, { useState } from 'react';
import { Calendar, User, BookOpen, Clock, FileText, Send, Trash2, ShieldAlert } from 'lucide-react';
import {
  REPORT_TYPES,
  defaultReportType,
  reportTypeOf,
  metricsSummary,
  cleanMetrics
} from '../eodReports';

const OTHER_CLIENT = '__other';

export default function DailyUpdates({ 
  updates = [], 
  tasks = [], 
  clients = [],
  profiles = [], 
  currentUserProfile = {}, 
  onSaveUpdate, 
  onDeleteUpdate 
}) {
  const todayStr = new Date().toISOString().split('T')[0];

  // Form states
  const [date, setDate] = useState(todayStr);
  const [taskId, setTaskId] = useState('');
  const [clientProject, setClientProject] = useState('');
  const [workCompleted, setWorkCompleted] = useState('');
  const [hoursPart, setHoursPart] = useState('');
  const [minutesPart, setMinutesPart] = useState('');
  const [isOtherClient, setIsOtherClient] = useState(false);
  const [statusAtEnd, setStatusAtEnd] = useState('In Progress');
  const [nextStep, setNextStep] = useState('');
  const [blockers, setBlockers] = useState('');
  const [evidenceLink, setEvidenceLink] = useState('');
  const [reportType, setReportType] = useState(defaultReportType(currentUserProfile?.role));
  const [metrics, setMetrics] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Filtering states
  const [filterType, setFilterType] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const userRole = currentUserProfile?.role || 'Employee';
  const isAdminOrDev = userRole === 'Developer' || userRole === 'Admin';

  const reportConfig = REPORT_TYPES[reportType];
  const hasMetrics = reportConfig.fields.length > 0;
  // Marketing and accountant reports are number-based; they have no task, client or status.
  const usesTaskFields = reportType === 'general' || reportType === 'developer' || reportType === 'smm_developer';

  // Get active tasks that are assigned to the current employee (or all active tasks if admin/dev)
  const myTasksList = tasks.filter(t => {
    if (t.status === 'Delivered' || t.status === 'Cancelled') return false;
    if (isAdminOrDev) return true;
    return t.employee_id === currentUserProfile.id || t.employee_name === currentUserProfile.full_name;
  });

  // Registered active clients, plus the internal bucket and any client name already
  // on the selected task (e.g. a client that was later deactivated).
  const clientOptions = [
    ...clients.filter(c => c.status === 'Active').map(c => c.name),
    'Gloma General'
  ];
  if (!isOtherClient && clientProject && !clientOptions.includes(clientProject)) {
    clientOptions.push(clientProject);
  }

  // "5 h 30 m" style display for the stored decimal hours.
  const formatHoursSpent = (decimalHours) => {
    const totalMinutes = Math.round((Number(decimalHours) || 0) * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return [h ? `${h}h` : '', m ? `${m}m` : ''].filter(Boolean).join(' ') || '0m';
  };

  const handleClientChange = (value) => {
    if (value === OTHER_CLIENT) {
      setIsOtherClient(true);
      setClientProject('');
    } else {
      setIsOtherClient(false);
      setClientProject(value);
    }
  };

  const handleTaskChange = (selectedTaskId) => {
    setTaskId(selectedTaskId);
    setIsOtherClient(false);
    const selectedTask = tasks.find(t => t.id === selectedTaskId);
    if (selectedTask) {
      setClientProject(selectedTask.client_project || '');
      setStatusAtEnd(selectedTask.status || 'In Progress');
    } else {
      setClientProject('');
    }
  };

  const switchReportType = (type) => {
    setReportType(type);
    setMetrics({});
    if (type === 'marketing' || type === 'accountant') {
      setTaskId('');
      setClientProject('');
      setIsOtherClient(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanedMetrics = cleanMetrics(reportType, metrics);
    const hasNumbers = Object.keys(cleanedMetrics).length > 0;
    if (hasMetrics && !usesTaskFields && !hasNumbers) {
      alert('Please fill in at least one number for your report.');
      return;
    }
    if (!hasMetrics && !workCompleted.trim()) {
      alert('Please describe what you completed today!');
      return;
    }
    if (hasMetrics && usesTaskFields && !hasNumbers && !workCompleted.trim()) {
      alert('Please fill in your numbers or describe what you completed today.');
      return;
    }

    if (usesTaskFields && isOtherClient && !clientProject.trim()) {
      alert('Please type the client or project name.');
      return;
    }

    const totalMinutes = (parseInt(hoursPart, 10) || 0) * 60 + (parseInt(minutesPart, 10) || 0);
    const matchedTask = tasks.find(t => t.id === taskId);

    // Number-based reports keep a readable summary in work_completed as well.
    const summaryText = metricsSummary(reportType, cleanedMetrics);
    const fullText = hasMetrics
      ? [`${reportConfig.label} report`, summaryText, workCompleted.trim() ? `Notes: ${workCompleted.trim()}` : ''].filter(Boolean).join('\n')
      : workCompleted;
    
    // Package update
    const updateObj = {
      date,
      employee_id: currentUserProfile.id,
      employee_name: currentUserProfile.full_name,
      task_id: usesTaskFields ? (taskId || null) : null,
      client_project: usesTaskFields
        ? (clientProject.trim() || (matchedTask ? matchedTask.client_project : 'Gloma General'))
        : 'Gloma General',
      work_completed: fullText,
      hours_spent: Math.round((totalMinutes / 60) * 100) / 100,
      status_at_end: usesTaskFields ? statusAtEnd : 'Delivered',
      next_step: nextStep,
      blockers: blockers,
      evidence_link: evidenceLink,
      report_type: reportType,
      report_data: hasMetrics ? cleanedMetrics : null
    };

    setSubmitting(true);
    const result = await onSaveUpdate(updateObj);
    setSubmitting(false);
    if (result && result.success === false) {
      alert(`Could not submit your update: ${result.error || 'unknown error'}`);
      return;
    }

    // Reset Form
    setMetrics({});
    setTaskId('');
    setClientProject('');
    setWorkCompleted('');
    setHoursPart('');
    setMinutesPart('');
    setIsOtherClient(false);
    setNextStep('');
    setBlockers('');
    setEvidenceLink('');
    alert('Daily update submitted successfully!');
  };

  // Filter Updates
  const filteredUpdates = updates.filter(upd => {
    const matchesType = !filterType || reportTypeOf(upd) === filterType;
    const matchesDate = !filterDate || String(upd.date).substring(0, 10) === filterDate;
    const matchesEmployee = !filterEmployee || upd.employee_id === filterEmployee || upd.employee_name === filterEmployee;
    const matchesSearch = 
      !searchQuery || 
      (upd.work_completed || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (upd.client_project || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (upd.employee_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesDate && matchesEmployee && matchesSearch;
  });

  // Totals table for the number-based reports (e.g. the marketing team's daily numbers).
  const summaryType = filterType && REPORT_TYPES[filterType].fields.length ? filterType : '';
  const summaryRows = summaryType ? filteredUpdates.filter(upd => upd.report_data) : [];
  const summaryTotals = summaryType
    ? REPORT_TYPES[summaryType].fields.map(field =>
        summaryRows.reduce((sum, upd) => sum + (Number(upd.report_data?.[field.key]) || 0), 0))
    : [];

  return (
    <div style={styles.container} className="animate-fade-in">
      <div className="grid-2col-1-1">
        
        {/* Left Column: Create EOD Update */}
        <div className="glass-panel" style={styles.formSection}>
          <div style={styles.sectionHeader}>
            <Send size={18} color="var(--color-gold)" />
            <h3 style={styles.sectionTitle}>Log Daily Work Progress</h3>
          </div>

          <div style={styles.typeTabs}>
            {Object.entries(REPORT_TYPES).map(([key, config]) => (
              <button
                key={key}
                type="button"
                className={reportType === key ? 'btn-primary' : 'btn-secondary'}
                style={styles.typeTab}
                onClick={() => switchReportType(key)}
              >
                {config.label}
              </button>
            ))}
          </div>
          <div style={styles.typeHint}>{reportConfig.hint}</div>

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formRow}>
              <div style={{ flex: 1 }}>
                <label style={styles.formLabel}>Date</label>
                <div style={styles.inputWrapper}>
                  <Calendar size={16} style={styles.inputIcon} />
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '38px' }}
                  />
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <label style={styles.formLabel}>Time Spent</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ ...styles.inputWrapper, flex: 1 }}>
                    <Clock size={16} style={styles.inputIcon} />
                    <input
                      type="number"
                      min="0"
                      max="24"
                      placeholder="Hours"
                      value={hoursPart}
                      onChange={(e) => setHoursPart(e.target.value)}
                      className="form-input"
                      style={{ paddingLeft: '38px' }}
                    />
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    placeholder="Minutes"
                    value={minutesPart}
                    onChange={(e) => setMinutesPart(e.target.value)}
                    className="form-input"
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
            </div>

            {hasMetrics && (
              <div style={styles.metricsGrid}>
                {reportConfig.fields.map(field => (
                  <div key={field.key}>
                    <label style={styles.formLabel}>{field.label}</label>
                    <input
                      type="number"
                      min="0"
                      step={field.money ? 'any' : '1'}
                      placeholder="0"
                      value={metrics[field.key] ?? ''}
                      onChange={(e) => setMetrics({ ...metrics, [field.key]: e.target.value })}
                      className="form-input"
                    />
                  </div>
                ))}
              </div>
            )}

            {usesTaskFields && (
            <div style={styles.formRow}>
              <div style={{ flex: 1 }}>
                <label style={styles.formLabel}>Associate with Task</label>
                <select
                  value={taskId}
                  onChange={(e) => handleTaskChange(e.target.value)}
                  className="form-input"
                >
                  <option value="">General Work (No specific task)</option>
                  {myTasksList.map((t) => (
                    <option key={t.id} value={t.id}>{t.id} - {t.title} ({t.client_project})</option>
                  ))}
                </select>
              </div>

              <div style={{ flex: 1 }}>
                <label style={styles.formLabel}>Client / Project</label>
                <select
                  value={isOtherClient ? OTHER_CLIENT : clientProject}
                  onChange={(e) => handleClientChange(e.target.value)}
                  className="form-input"
                >
                  <option value="">Select client...</option>
                  {clientOptions.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                  <option value={OTHER_CLIENT}>Other...</option>
                </select>
                {isOtherClient && (
                  <input
                    type="text"
                    required
                    placeholder="Type the client or project name"
                    value={clientProject}
                    onChange={(e) => setClientProject(e.target.value)}
                    className="form-input"
                    style={{ marginTop: '8px' }}
                  />
                )}
              </div>
            </div>
            )}

            <div>
              <label style={styles.formLabel}>{hasMetrics ? 'Notes (optional)' : 'Work Completed Today'}</label>
              <textarea
                required={!hasMetrics}
                rows={3}
                placeholder="Describe details of work done, clips edited, designs posted..."
                value={workCompleted}
                onChange={(e) => setWorkCompleted(e.target.value)}
                className="form-input"
                style={{ resize: 'none' }}
              />
            </div>

            {usesTaskFields && (
            <div style={styles.formRow}>
              <div style={{ flex: 1 }}>
                <label style={styles.formLabel}>Next Step</label>
                <input
                  type="text"
                  placeholder="What will you work on next?"
                  value={nextStep}
                  onChange={(e) => setNextStep(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ flex: 1 }}>
                <label style={styles.formLabel}>Status at End of Day</label>
                <select
                  value={statusAtEnd}
                  onChange={(e) => setStatusAtEnd(e.target.value)}
                  className="form-input"
                >
                  <option value="In Progress">In Progress</option>
                  <option value="Pending">Pending</option>
                  <option value="Delivered">Delivered (Done)</option>
                  <option value="On Hold">On Hold</option>
                </select>
              </div>
            </div>
            )}

            <div style={styles.formRow}>
              <div style={{ flex: 1 }}>
                <label style={styles.formLabel}>Blockers (Optional)</label>
                <input
                  type="text"
                  placeholder="Describe details of any bottlenecks..."
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ flex: 1 }}>
                <label style={styles.formLabel}>Evidence / G-Drive Link</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={evidenceLink}
                  onChange={(e) => setEvidenceLink(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" style={styles.submitBtn} disabled={submitting}>
              <Send size={15} /> {submitting ? 'Submitting...' : `Submit ${hasMetrics ? reportConfig.label + ' ' : ''}EOD Update`}
            </button>
          </form>
        </div>

        {/* Right Column: Timeline / Logs */}
        <div className="glass-panel" style={styles.logsSection}>
          <div style={styles.sectionHeader}>
            <FileText size={18} color="var(--color-gold)" />
            <h3 style={styles.sectionTitle}>EOD Updates Log Registry</h3>
          </div>

          <div style={styles.logFilters}>
            <input
              type="text"
              placeholder="Search logs by keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.logSearchInput}
              className="form-input"
            />

            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              style={{ ...styles.logEmpSelect, width: '130px' }}
              className="form-input"
            >
              <option value="">All Team</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </select>
          </div>

          <div style={styles.logFilters}>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{ ...styles.logEmpSelect, flex: 1 }}
              className="form-input"
            >
              <option value="">All report types</option>
              {Object.entries(REPORT_TYPES).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              style={{ ...styles.logEmpSelect, width: '150px' }}
              className="form-input"
              title="Show one day only"
            />
            {filterDate && (
              <button type="button" className="btn-secondary" onClick={() => setFilterDate('')}>All dates</button>
            )}
          </div>

          {summaryType && (
            <div style={styles.summaryWrap}>
              <div style={styles.summaryTitle}>
                {REPORT_TYPES[summaryType].label} numbers {filterDate ? `- ${filterDate}` : '- all dates'}
              </div>
              {summaryRows.length === 0 ? (
                <div style={styles.emptyLogsMessage}>No numbers reported for this selection.</div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Date</th>
                        {REPORT_TYPES[summaryType].fields.map(field => <th key={field.key} style={{ textAlign: 'right' }}>{field.label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {summaryRows.map(upd => (
                        <tr key={upd.id}>
                          <td>{upd.employee_name}</td>
                          <td>{String(upd.date).substring(0, 10)}</td>
                          {REPORT_TYPES[summaryType].fields.map(field => (
                            <td key={field.key} style={{ textAlign: 'right' }}>{upd.report_data?.[field.key] ?? '-'}</td>
                          ))}
                        </tr>
                      ))}
                      <tr style={{ fontWeight: 700 }}>
                        <td colSpan={2}>Total</td>
                        {summaryTotals.map((total, i) => (
                          <td key={i} style={{ textAlign: 'right' }}>{total.toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div style={styles.logsTimeline}>
            {filteredUpdates.map((upd) => (
              <div key={upd.id} style={styles.timelineItem} className="glass-card-interactive">
                <div style={styles.timelineHeader}>
                  <div style={styles.userBadge}>
                    <img 
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=${upd.employee_name}`} 
                      alt="" 
                      style={styles.userBadgeAvatar} 
                    />
                    <span>{upd.employee_name}</span>
                  </div>
                  <span style={styles.timelineDate}>
                    {new Date(upd.date).toLocaleDateString()}
                  </span>
                </div>

                <div style={styles.timelineProjectRow}>
                  <span style={styles.projectTag}>{upd.client_project}</span>
                  {upd.hours_spent > 0 && (
                    <span style={styles.hoursTag}>
                      <Clock size={9} /> {formatHoursSpent(upd.hours_spent)}
                    </span>
                  )}
                  {upd.task_id && <span style={styles.taskTag}>{upd.task_id}</span>}
                  {REPORT_TYPES[reportTypeOf(upd)].fields.length === 0 ? (
                    <span className={`badge badge-${
                      upd.status_at_end === 'Pending' ? 'pending' :
                      upd.status_at_end === 'In Progress' ? 'progress' :
                      upd.status_at_end === 'Delivered' ? 'delivered' : 'hold'
                    }`} style={{ zoom: 0.8 }}>
                      {upd.status_at_end}
                    </span>
                  ) : (
                    <span style={styles.typeBadge}>{REPORT_TYPES[reportTypeOf(upd)].label}</span>
                  )}
                </div>

                <p style={{ ...styles.completedText, whiteSpace: 'pre-line' }}>{upd.work_completed}</p>

                {upd.next_step && (
                  <div style={styles.notesField}>
                    <strong>Next Step:</strong> {upd.next_step}
                  </div>
                )}

                {upd.blockers && (
                  <div style={{ ...styles.notesField, backgroundColor: 'rgba(239, 68, 68, 0.05)', color: '#FF7b7b' }}>
                    <strong>Blocker:</strong> {upd.blockers}
                  </div>
                )}

                {upd.evidence_link && (
                  <div style={styles.evidenceRow}>
                    <a 
                      href={upd.evidence_link} 
                      target="_blank" 
                      rel="noreferrer" 
                      style={styles.evidenceLink}
                    >
                      View evidence drive files &rarr;
                    </a>
                  </div>
                )}

                {/* Admins & Developers (or matching employee) can delete logs */}
                {(isAdminOrDev || upd.employee_id === currentUserProfile.id) && (
                  <div style={styles.deleteRow}>
                    <button 
                      onClick={() => {
                        if (confirm('Delete this work log permanently?')) {
                          onDeleteUpdate(upd.id);
                        }
                      }} 
                      style={styles.deleteBtn}
                    >
                      <Trash2 size={12} /> Delete Log
                    </button>
                  </div>
                )}
              </div>
            ))}
            {filteredUpdates.length === 0 && (
              <div style={styles.emptyLogsMessage}>No daily updates logged.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

const styles = {
  typeTabs: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' },
  typeTab: { padding: '6px 12px', fontSize: 'var(--font-size-xs)' },
  typeHint: { fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: '14px' },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' },
  summaryWrap: { marginBottom: '14px', overflowX: 'auto' },
  summaryTitle: { fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-gold)', marginBottom: '6px' },
  typeBadge: { fontSize: '10px', fontWeight: 700, border: '1px solid var(--color-gold)', color: 'var(--color-gold)', borderRadius: '8px', padding: '1px 7px' },
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  formSection: {
    padding: '24px',
    backgroundColor: 'var(--bg-glass)'
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '20px'
  },
  sectionTitle: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: '700'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  formRow: {
    display: 'flex',
    gap: '14px',
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  formLabel: {
    display: 'block',
    fontSize: 'var(--font-size-xs)',
    fontWeight: '700',
    color: 'var(--color-text-secondary)',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    marginBottom: '4px'
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  inputIcon: {
    position: 'absolute',
    left: '12px',
    color: 'var(--color-text-muted)',
    pointerEvents: 'none'
  },
  submitBtn: {
    padding: '12px',
    marginTop: '10px',
    fontSize: 'var(--font-size-md)'
  },
  logsSection: {
    padding: '24px',
    backgroundColor: 'var(--bg-glass)',
    height: '80vh',
    display: 'flex',
    flexDirection: 'column'
  },
  logFilters: {
    display: 'flex',
    gap: '10px',
    marginBottom: '16px',
    flexWrap: 'wrap'
  },
  logSearchInput: {
    flex: '1 1 200px',
    padding: '8px 12px'
  },
  logEmpSelect: {
    padding: '8px 12px'
  },
  logsTimeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    overflowY: 'auto',
    flex: 1,
    paddingRight: '4px'
  },
  timelineItem: {
    padding: '16px',
    borderRadius: 'var(--radius-md)'
  },
  timelineHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  userBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontWeight: '600',
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-primary)'
  },
  userBadgeAvatar: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    objectFit: 'cover'
  },
  timelineDate: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-muted)'
  },
  timelineProjectRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: '10px'
  },
  projectTag: {
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'bold',
    backgroundColor: 'var(--bg-translucent-white)',
    border: '1px solid var(--border-subtle)',
    padding: '1px 8px',
    borderRadius: 'var(--radius-xs)',
    color: 'var(--color-gold)'
  },
  hoursTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: 'var(--font-size-xs)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: '1px 6px',
    borderRadius: '2px',
    color: 'var(--color-text-secondary)'
  },
  taskTag: {
    fontSize: 'var(--font-size-xs)',
    fontStyle: 'italic',
    color: 'var(--color-text-muted)'
  },
  completedText: {
    fontSize: 'var(--font-size-sm)',
    lineHeight: '1.4',
    color: 'var(--color-text-primary)',
    marginBottom: '8px'
  },
  notesField: {
    fontSize: 'var(--font-size-xs)',
    padding: '6px 8px',
    backgroundColor: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-xs)',
    marginBottom: '6px',
    lineHeight: '1.3',
    color: 'var(--color-text-secondary)'
  },
  evidenceRow: {
    marginTop: '6px'
  },
  evidenceLink: {
    fontSize: 'var(--font-size-xs)',
    fontWeight: '600',
    color: 'var(--color-gold)',
    display: 'inline-block'
  },
  deleteRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '10px',
    paddingTop: '6px',
    borderTop: '1px solid var(--border-subtle)'
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    fontSize: 'var(--font-size-xs)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px'
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    fontSize: 'var(--font-size-xs)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px'
  },
  emptyLogsMessage: {
    padding: '40px 0',
    color: 'var(--color-text-muted)',
    textAlign: 'center'
  }
};
