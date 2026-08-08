import React, { useState } from 'react';
import { Calendar, User, BookOpen, Clock, FileText, Send, Trash2, ShieldAlert } from 'lucide-react';

export default function DailyUpdates({ 
  updates = [], 
  tasks = [], 
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
  const [hoursSpent, setHoursSpent] = useState('');
  const [statusAtEnd, setStatusAtEnd] = useState('In Progress');
  const [nextStep, setNextStep] = useState('');
  const [blockers, setBlockers] = useState('');
  const [evidenceLink, setEvidenceLink] = useState('');

  // Filtering states
  const [filterEmployee, setFilterEmployee] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const userRole = currentUserProfile?.role || 'Employee';
  const isAdminOrDev = userRole === 'Developer' || userRole === 'Admin';

  // Get active tasks that are assigned to the current employee (or all active tasks if admin/dev)
  const myTasksList = tasks.filter(t => {
    if (t.status === 'Delivered' || t.status === 'Cancelled') return false;
    if (isAdminOrDev) return true;
    return t.employee_id === currentUserProfile.id || t.employee_name === currentUserProfile.full_name;
  });

  const handleTaskChange = (selectedTaskId) => {
    setTaskId(selectedTaskId);
    const selectedTask = tasks.find(t => t.id === selectedTaskId);
    if (selectedTask) {
      setClientProject(selectedTask.client_project || '');
      setStatusAtEnd(selectedTask.status || 'In Progress');
    } else {
      setClientProject('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!workCompleted.trim()) {
      alert('Please describe what you completed today!');
      return;
    }

    const matchedTask = tasks.find(t => t.id === taskId);
    
    // Package update
    const updateObj = {
      date,
      employee_id: currentUserProfile.id,
      employee_name: currentUserProfile.full_name,
      task_id: taskId || null,
      client_project: clientProject || (matchedTask ? matchedTask.client_project : 'Gloma General'),
      work_completed: workCompleted,
      hours_spent: parseFloat(hoursSpent) || 0,
      status_at_end: statusAtEnd,
      next_step: nextStep,
      blockers: blockers,
      evidence_link: evidenceLink
    };

    onSaveUpdate(updateObj);

    // Reset Form
    setTaskId('');
    setClientProject('');
    setWorkCompleted('');
    setHoursSpent('');
    setNextStep('');
    setBlockers('');
    setEvidenceLink('');
    alert('Daily update submitted successfully!');
  };

  // Filter Updates
  const filteredUpdates = updates.filter(upd => {
    const matchesEmployee = !filterEmployee || upd.employee_id === filterEmployee || upd.employee_name === filterEmployee;
    const matchesSearch = 
      !searchQuery || 
      (upd.work_completed || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (upd.client_project || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (upd.employee_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesEmployee && matchesSearch;
  });

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.grid}>
        
        {/* Left Column: Create EOD Update */}
        <div className="glass-panel" style={styles.formSection}>
          <div style={styles.sectionHeader}>
            <Send size={18} color="var(--color-gold)" />
            <h3 style={styles.sectionTitle}>Log Daily Work Progress</h3>
          </div>

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
                <label style={styles.formLabel}>Hours Spent</label>
                <div style={styles.inputWrapper}>
                  <Clock size={16} style={styles.inputIcon} />
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="e.g. 3.5"
                    value={hoursSpent}
                    onChange={(e) => setHoursSpent(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '38px' }}
                  />
                </div>
              </div>
            </div>

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
                <input
                  type="text"
                  placeholder="e.g. Dimbula Tea"
                  value={clientProject}
                  onChange={(e) => setClientProject(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div>
              <label style={styles.formLabel}>Work Completed Today</label>
              <textarea
                required
                rows={3}
                placeholder="Describe details of work done, clips edited, designs posted..."
                value={workCompleted}
                onChange={(e) => setWorkCompleted(e.target.value)}
                className="form-input"
                style={{ resize: 'none' }}
              />
            </div>

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

            <button type="submit" className="btn-primary" style={styles.submitBtn}>
              <Send size={15} /> Submit EOD Update
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
                      <Clock size={9} /> {upd.hours_spent} hrs
                    </span>
                  )}
                  {upd.task_id && <span style={styles.taskTag}>{upd.task_id}</span>}
                  <span className={`badge badge-${
                    upd.status_at_end === 'Pending' ? 'pending' : 
                    upd.status_at_end === 'In Progress' ? 'progress' :
                    upd.status_at_end === 'Delivered' ? 'delivered' : 'hold'
                  }`} style={{ zoom: 0.8 }}>
                    {upd.status_at_end}
                  </span>
                </div>

                <p style={styles.completedText}>{upd.work_completed}</p>

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
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    alignItems: 'start'
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
    fontSize: '18px',
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
    fontSize: '11px',
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
    fontSize: '14px'
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
    marginBottom: '16px'
  },
  logSearchInput: {
    flex: 1,
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
    fontSize: '13px',
    color: '#fff'
  },
  userBadgeAvatar: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    objectFit: 'cover'
  },
  timelineDate: {
    fontSize: '11px',
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
    fontSize: '11px',
    fontWeight: 'bold',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid var(--border-subtle)',
    padding: '1px 8px',
    borderRadius: 'var(--radius-xs)',
    color: 'var(--color-gold)'
  },
  hoursTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '10px',
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: '1px 6px',
    borderRadius: '2px',
    color: 'var(--color-text-secondary)'
  },
  taskTag: {
    fontSize: '10px',
    fontStyle: 'italic',
    color: 'var(--color-text-muted)'
  },
  completedText: {
    fontSize: '13px',
    lineHeight: '1.4',
    color: 'var(--color-text-primary)',
    marginBottom: '8px'
  },
  notesField: {
    fontSize: '11px',
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
    fontSize: '11px',
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
    fontSize: '10px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px'
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    fontSize: '10px',
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
