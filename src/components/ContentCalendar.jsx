import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Filter, Calendar as CalIcon, Plus } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { sendTaskAssignedEmail } from '../emailService';
import { getHoliday } from '../workHours';

const localTranslations = {
  en: {
    title: "Content Calendar Feed",
    filterClient: "All Clients",
    filterType: "All Content Types",
    quickAdd: "Quick Add Assignment",
    prefilledDate: "Pre-filled Date:",
    save: "Create Task",
    cancel: "Cancel",
    workType: "Work Type",
    client: "Client / Project",
    taskDetail: "Task Details",
    employee: "Assign Teammate",
    priority: "Priority",
    dueDate: "Due Date",
    startDate: "Start Date"
  },
  si: {
    title: "අන්තර්ගත දින දර්ශනය",
    filterClient: "සියලුම සේවාදායකයින්",
    filterType: "සියලුම වර්ගයන්",
    quickAdd: "කෙටි ක්‍රමයකින් එක් කරන්න",
    prefilledDate: "තෝරාගත් දිනය:",
    save: "සුරකින්න",
    cancel: "අවලංගු කරන්න",
    workType: "කාර්ය මාදිලිය",
    client: "සේවාදායකයා",
    taskDetail: "කාර්ය විස්තරය",
    employee: "සේවකයා පවරන්න",
    priority: "ප්‍රමුඛතාවය",
    dueDate: "අවසන් දිනය",
    startDate: "ආරම්භක දිනය"
  },
  ta: {
    title: "உள்ளடக்க காலெண்டர்",
    filterClient: "அனைத்து வாடிக்கையாளர்கள்",
    filterType: "அனைத்து வகைகள்",
    quickAdd: "விரைவாகச் சேர்க்கவும்",
    prefilledDate: "தேர்ந்தெடுக்கப்பட்ட தேதி:",
    save: "பணியை உருவாக்கு",
    cancel: "ரத்து செய்",
    workType: "பணி வகை",
    client: "வாடிக்கையாளர்",
    taskDetail: "விவரங்கள்",
    employee: "சக ஊழியரைப் பணியமர்த்துக",
    priority: "முன்னுரிமை",
    dueDate: "முடிவு தேதி",
    startDate: "துவக்க தேதி"
  }
};

export default function ContentCalendar({
  tasks = [],
  clients = [],
  profiles = [],
  timeLogs = [],
  currentUserProfile = {},
  lang = 'en',
  onSaveTask
}) {
  const t = localTranslations[lang] || localTranslations.en;
  
  // Filters
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedType, setSelectedType] = useState('');
  
  // Date states
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Click-to-add modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState('');
  const [clientProject, setClientProject] = useState('');
  const [workType, setWorkType] = useState('Post');
  const [taskDetail, setTaskDetail] = useState('');
  const [assignedEmployee, setAssignedEmployee] = useState('');
  const [priority, setPriority] = useState('Normal');

  const userRole = currentUserProfile?.role || 'Employee';
  const hasAssignPrivilege = userRole === 'Developer' || userRole === 'Admin';

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const tempFirstDay = new Date(year, month, 1);
  const startDayIdx = tempFirstDay.getDay(); // 0 is Sunday, 1 is Monday

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Filter tasks
  const calendarTasks = tasks.filter(task => {
    const matchesClient = !selectedClient || task.client_id === selectedClient || task.client_project === selectedClient;
    const matchesType = !selectedType || task.work_type === selectedType;
    return matchesClient && matchesType;
  });

  const getTasksForDay = (dayNum) => {
    return calendarTasks.filter(task => {
      if (!task.due_date) return false;
      const tDate = new Date(task.due_date);
      return tDate.getDate() === dayNum && tDate.getMonth() === month && tDate.getFullYear() === year;
    });
  };

  const handleDayClick = (dayNum) => {
    if (!hasAssignPrivilege) return;
    const pad = (n) => String(n).padStart(2, '0');
    const formattedDate = `${year}-${pad(month + 1)}-${pad(dayNum)}`;
    setSelectedCalendarDate(formattedDate);
    
    // Set default client if filtered
    setClientProject(selectedClient ? (clients.find(c => c.id === selectedClient)?.name || '') : '');
    setWorkType(selectedType || 'Post');
    setTaskDetail('');
    setAssignedEmployee('');
    setPriority('Normal');
    setIsModalOpen(true);
  };

  const handleQuickSave = async (e) => {
    e.preventDefault();
    if (!clientProject.trim() || !taskDetail.trim()) {
      alert("Client & Task Detail are required.");
      return;
    }

    let selectedEmpId = null;
    let selectedEmpName = '';
    const foundProfile = profiles.find(p => p.id === assignedEmployee);
    if (foundProfile) {
      selectedEmpId = foundProfile.id;
      selectedEmpName = foundProfile.full_name;
    }

    const assignedClientObj = clients.find(c => c.name === clientProject || c.id === clientProject);

    // Generate ID: GLM-YYMMDD-XXX
    const codeDate = selectedCalendarDate.replace(/-/g, '').substring(2);
    const randCode = Math.floor(100 + Math.random() * 900);
    const taskId = `GLM-${codeDate}-${randCode}`;

    const newTask = {
      id: taskId,
      created_at: new Date().toISOString(),
      date_assigned: selectedCalendarDate,
      start_date: selectedCalendarDate,
      due_date: selectedCalendarDate,
      employee_id: selectedEmpId,
      employee_name: selectedEmpName || 'Unassigned',
      client_id: assignedClientObj ? assignedClientObj.id : null,
      client_project: assignedClientObj ? assignedClientObj.name : clientProject,
      work_type: workType,
      title: taskDetail,
      priority: priority,
      status: 'Pending Approval',
      progress: 0.0,
      last_updated: new Date().toISOString()
    };

    onSaveTask(newTask);
    setIsModalOpen(false);

    // Same assignment notification + email as the Task Board's "New Task" flow.
    if (selectedEmpId) {
      try {
        await supabase.from('notifications').insert({
          user_id: selectedEmpId,
          message: `New task assigned to you [${taskId}]: ${taskDetail} (${workType})`,
          read: false
        });
      } catch (err) {
        console.error('Notification logging failed:', err);
      }

      sendTaskAssignedEmail({
        toEmail: foundProfile?.email,
        toName: selectedEmpName,
        taskId,
        taskTitle: taskDetail,
        clientName: newTask.client_project,
        workType,
        priority,
        dueDate: selectedCalendarDate,
        assignedBy: currentUserProfile?.full_name,
        assignedByEmail: currentUserProfile?.email
      });
    }
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Render Calendar Grid
  const calendarCells = [];
  // Empty slots at beginning
  for (let i = 0; i < startDayIdx; i++) {
    calendarCells.push(<div key={`empty-${i}`} className="calendar-day empty-day" style={styles.emptyDay}></div>);
  }
  // Month days
  const pad2 = (n) => String(n).padStart(2, '0');
  for (let day = 1; day <= daysInMonth; day++) {
    const dayTasks = getTasksForDay(day);
    const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
    const dateStr = `${year}-${pad2(month + 1)}-${pad2(day)}`;
    const holiday = getHoliday(dateStr);
    const workedOnHoliday = holiday
      ? timeLogs.filter(l => l.work_date === dateStr && l.is_holiday)
      : [];

    calendarCells.push(
      <div
        key={`day-${day}`}
        style={{
          ...styles.dayCell,
          border: isToday ? '1px solid var(--color-gold)' : holiday ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-subtle)',
          backgroundColor: isToday ? 'rgba(212,175,55,0.05)' : holiday ? 'rgba(239, 68, 68, 0.05)' : 'rgba(17,24,39,0.3)'
        }}
        onClick={() => handleDayClick(day)}
        className="calendar-day"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '4px' }}>
          {holiday && (
            <span style={styles.holidayTag} title={holiday.name}>{holiday.name}</span>
          )}
          <span style={{
            ...styles.dayNumber,
            marginLeft: 'auto',
            color: isToday ? 'var(--color-gold)' : holiday ? '#EF4444' : 'var(--color-text-primary)',
            fontWeight: isToday || holiday ? 'bold' : 'normal'
          }}>
            {day}
          </span>
        </div>
        {workedOnHoliday.length > 0 && (
          <span style={styles.workedHolidayTag}>
            Worked: {workedOnHoliday.map(l => l.employee_name).join(', ')}
          </span>
        )}
        <div style={styles.dayTasksContainer}>
          {dayTasks.map(task => (
            <div 
              key={task.id} 
              style={{
                ...styles.taskTag,
                backgroundColor: 
                  task.status === 'Delivered' ? 'rgba(16,185,129,0.15)' :
                  task.status === 'In Progress' ? 'rgba(59,130,246,0.15)' :
                  task.status === 'Approved' ? 'rgba(139,92,246,0.15)' : 'rgba(245,158,11,0.15)',
                color:
                  task.status === 'Delivered' ? '#10B981' :
                  task.status === 'In Progress' ? '#3B82F6' :
                  task.status === 'Approved' ? '#8B5CF6' : '#F59E0B',
                borderLeft: `2.5px solid ${
                  task.status === 'Delivered' ? '#10B981' :
                  task.status === 'In Progress' ? '#3B82F6' :
                  task.status === 'Approved' ? '#8b5cf6' : '#F59E0B'
                }`
              }}
              title={`[${task.id}] ${task.client_project}: ${task.title}`}
            >
              <div style={styles.taskTagText}>
                <strong>{task.work_type}:</strong> {task.title}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="animate-fade-in">
      
      {/* Header and filters bar */}
      <div style={styles.headerBar} className="glass-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <CalIcon size={22} color="var(--color-gold)" />
          <h3>{t.title}</h3>
        </div>

        {/* Filters and Month pagination */}
        <div style={styles.filterMenu}>
          
          {/* Client Filter */}
          <div style={styles.filterItem}>
            <Filter size={13} color="var(--color-gold)" />
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              style={styles.selectFilter}
            >
              <option value="">{t.filterClient}</option>
              {clients.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div style={styles.filterItem}>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              style={styles.selectFilter}
            >
              <option value="">{t.filterType}</option>
              <option value="Post">Post (Facebook/Instagram)</option>
              <option value="Reel">Reel / Short Video</option>
              <option value="Website">Website Development</option>
              <option value="Other">Other Content Type</option>
            </select>
          </div>

          {/* Month Pagination */}
          <div style={styles.pagination}>
            <button onClick={handlePrevMonth} style={styles.pagBtn}>
              <ChevronLeft size={16} />
            </button>
            <span style={styles.monthDisplay}>
              {monthNames[month]} {year}
            </span>
            <button onClick={handleNextMonth} style={styles.pagBtn}>
              <ChevronRight size={16} />
            </button>
          </div>

        </div>
      </div>

      {/* Week Header + Calendar Grid (horizontally scrollable on narrow screens) */}
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: '640px' }}>
          <div style={styles.weekGrid}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} style={styles.weekLabel}>{d}</div>
            ))}
          </div>

          <div style={styles.calendarGrid}>
            {calendarCells}
          </div>
        </div>
      </div>

      {/* Quick Add Modal */}
      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3>{t.quickAdd}</h3>
              <button onClick={() => setIsModalOpen(false)} style={styles.closeBtn}>&times;</button>
            </div>

            <form onSubmit={handleQuickSave} style={styles.modalForm}>
              <div style={styles.formDateNotice}>
                <span>{t.prefilledDate} <strong>{selectedCalendarDate}</strong></span>
              </div>

              <div>
                <label style={styles.label}>{t.client}</label>
                <select
                  required
                  value={clientProject}
                  onChange={(e) => setClientProject(e.target.value)}
                  className="form-input"
                >
                  <option value="">Choose Client</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                  <option value="Gloma Internal">Gloma Internal Task</option>
                </select>
              </div>

              <div style={styles.formRow}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>{t.workType}</label>
                  <select
                    value={workType}
                    onChange={(e) => setWorkType(e.target.value)}
                    className="form-input"
                  >
                    <option value="Post">Post (Facebook/Insta)</option>
                    <option value="Reel">Reel / Video</option>
                    <option value="Website">Website</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>{t.priority}</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="form-input"
                  >
                    <option value="High">High</option>
                    <option value="Normal">Normal</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={styles.label}>{t.employee}</label>
                <select
                  value={assignedEmployee}
                  onChange={(e) => setAssignedEmployee(e.target.value)}
                  className="form-input"
                >
                  <option value="">Unassigned Teammate</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name} ({p.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={styles.label}>{t.taskDetail}</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Draft caption, description, website features..."
                  value={taskDetail}
                  onChange={(e) => setTaskDetail(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={styles.modalActions}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
                  {t.cancel}
                </button>
                <button type="submit" className="btn-primary">
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  headerBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    flexWrap: 'wrap',
    gap: '12px'
  },
  filterMenu: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap'
  },
  filterItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'rgba(17,24,39,0.3)',
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
  pagination: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: 'var(--bg-badge-dark)',
    padding: '4px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-subtle)'
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
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'bold',
    color: 'var(--color-text-primary)',
    minWidth: '100px',
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
    gridAutoRows: 'minmax(110px, auto)',
    gap: '6px'
  },
  dayCell: {
    padding: '8px',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minHeight: '110px',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  emptyDay: {
    backgroundColor: 'transparent',
    border: '1px solid transparent',
    pointerEvents: 'none'
  },
  dayNumber: {
    fontSize: 'var(--font-size-xs)',
    alignSelf: 'flex-end'
  },
  holidayTag: {
    fontSize: '8.5px',
    fontWeight: '700',
    color: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    borderRadius: '3px',
    padding: '1px 4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%'
  },
  workedHolidayTag: {
    fontSize: '8.5px',
    fontWeight: '700',
    color: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    border: '1px dashed rgba(245, 158, 11, 0.35)',
    borderRadius: '3px',
    padding: '1px 4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  dayTasksContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flexGrow: 1,
    overflowY: 'auto'
  },
  taskTag: {
    padding: '3px 6px',
    borderRadius: '4px',
    fontSize: '9.5px',
    lineHeight: 1.2,
    fontWeight: '600',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  taskTagText: {
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    backdropFilter: 'blur(4px)',
    padding: '16px'
  },
  modalContent: {
    width: '100%',
    maxWidth: '480px',
    padding: 'clamp(16px, 4vw, 24px)',
    backgroundColor: 'var(--bg-panel)',
    borderColor: 'var(--border-glass)',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px'
  },
  closeBtn: {
    fontSize: 'var(--font-size-2xl)',
    background: 'none',
    border: 'none',
    color: 'var(--color-text-muted)',
    cursor: 'pointer'
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  formDateNotice: {
    padding: '8px 12px',
    backgroundColor: 'rgba(212,175,55,0.08)',
    border: '1px dashed rgba(212,175,55,0.3)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-primary)'
  },
  label: {
    display: 'block',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'bold',
    color: 'var(--color-text-secondary)',
    marginBottom: '4px'
  },
  formRow: {
    display: 'flex',
    gap: '12px'
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '10px'
  }
};
