import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Filter, Calendar as CalIcon, Plus, Sparkles } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { sendTaskAssignedEmail } from '../emailService';
import MonthlyPlan from './MonthlyPlan';
import ContentItemModal from './ContentItemModal';
import ContentImportModal from './ContentImportModal';
import {
  CONTENT_TYPES, PLATFORMS, contentTypeOf, parsePlatforms, platformColor, dateKeyOf, statusColor
} from '../contentCalendarUtils';

const localTranslations = {
  en: {
    title: "Content Calendar Feed",
    filterClient: "All Clients",
    filterType: "All Content Types",
    filterEmployee: "All Employees",
    filterPlatform: "All Platforms",
    newContent: "New Content",
    aiImport: "AI Sheet Import"
  },
  si: {
    title: "අන්තර්ගත දින දර්ශනය",
    filterClient: "සියලුම සේවාදායකයින්",
    filterType: "සියලුම වර්ගයන්",
    filterEmployee: "සියලුම සේවකයින්",
    filterPlatform: "සියලුම වේදිකා",
    newContent: "නව අන්තර්ගතය",
    aiImport: "AI ආනයනය"
  },
  ta: {
    title: "உள்ளடக்க காலெண்டர்",
    filterClient: "அனைத்து வாடிக்கையாளர்கள்",
    filterType: "அனைத்து வகைகள்",
    filterEmployee: "அனைத்து ஊழியர்கள்",
    filterPlatform: "அனைத்து தளங்கள்",
    newContent: "புதிய உள்ளடக்கம்",
    aiImport: "AI இறக்குமதி"
  }
};

const pad = (n) => String(n).padStart(2, '0');

export default function ContentCalendar({
  tasks = [],
  clients = [],
  profiles = [],
  currentUserProfile = {},
  lang = 'en',
  monthlyPlans = [],
  onSaveTask,
  onSaveTasks,
  onDeleteTask,
  onSavePlan,
  onDeletePlan
}) {
  const t = { ...localTranslations.en, ...(localTranslations[lang] || {}) };

  // Filters
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');

  // Date states
  const [currentDate, setCurrentDate] = useState(new Date());

  // Editor / import modals
  const [editor, setEditor] = useState(null); // { task, date }
  const [importOpen, setImportOpen] = useState(false);

  const userRole = currentUserProfile?.role || 'Employee';
  const hasAssignPrivilege = ['Developer', 'Admin', 'Manager', 'Coordinator & Accountant'].includes(userRole);

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const startDayIdx = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Preset types plus any custom ones already in use.
  const typeOptions = useMemo(() => {
    const names = CONTENT_TYPES.map(c => c.value);
    tasks.forEach(task => {
      const type = contentTypeOf(task);
      if (type && !names.includes(type)) names.push(type);
    });
    return names;
  }, [tasks]);

  const calendarTasks = tasks.filter(task => {
    const matchesClient = !selectedClient || task.client_project === selectedClient
      || task.client_id === clients.find(c => c.name === selectedClient)?.id;
    const matchesType = !selectedType || contentTypeOf(task) === selectedType;
    const matchesEmployee = !selectedEmployee || task.employee_id === selectedEmployee;
    const matchesPlatform = !selectedPlatform || parsePlatforms(task.platforms).includes(selectedPlatform);
    return matchesClient && matchesType && matchesEmployee && matchesPlatform;
  });

  const getTasksForDay = (dayNum) => {
    const key = `${year}-${pad(month + 1)}-${pad(dayNum)}`;
    return calendarTasks.filter(task => dateKeyOf(task.due_date) === key);
  };

  const openNew = (dayNum) => {
    setEditor({ task: null, date: `${year}-${pad(month + 1)}-${pad(dayNum)}` });
  };

  const notifyAssignee = async (taskObj, profile, previous) => {
    const changed = !previous || previous.employee_id !== profile?.id;
    if (!profile || profile.id === currentUserProfile?.id || !changed) return;
    try {
      await supabase.from('notifications').insert({
        user_id: profile.id,
        message: `New task assigned to you [${taskObj.id}]: ${taskObj.title} (${taskObj.content_type || taskObj.work_type})`,
        read: false
      });
    } catch (err) {
      console.error('Notification logging failed:', err);
    }
    sendTaskAssignedEmail({
      toEmail: profile.email,
      toName: profile.full_name,
      taskId: taskObj.id,
      taskTitle: taskObj.title,
      clientName: taskObj.client_project,
      workType: taskObj.content_type || taskObj.work_type,
      priority: taskObj.priority,
      dueDate: taskObj.due_date,
      assignedBy: currentUserProfile?.full_name,
      assignedByEmail: currentUserProfile?.email
    });
  };

  const handleSubmit = async (taskObj, { previous, profile }) => {
    const result = await onSaveTask(taskObj);
    if (result && result.success === false) return result;
    setEditor(null);
    await notifyAssignee(taskObj, profile, previous);
    return { success: true };
  };

  const handleImport = async (items) => {
    const result = await onSaveTasks(items);
    if (result && result.success === false) return result;

    // One in-app notification per teammate instead of one per item.
    const perPerson = {};
    items.forEach(item => {
      if (item.employee_id && item.employee_id !== currentUserProfile?.id) {
        perPerson[item.employee_id] = (perPerson[item.employee_id] || 0) + 1;
      }
    });
    for (const [userId, count] of Object.entries(perPerson)) {
      try {
        await supabase.from('notifications').insert({
          user_id: userId,
          message: `${count} content item${count === 1 ? '' : 's'} assigned to you on the content calendar by ${currentUserProfile?.full_name || 'a teammate'}.`,
          read: false
        });
      } catch (err) {
        console.error('Notification logging failed:', err);
      }
    }
    return { success: true };
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const defaultClient = selectedClient;
  const todayDate = new Date();

  // Render Calendar Grid
  const calendarCells = [];
  for (let i = 0; i < startDayIdx; i++) {
    calendarCells.push(<div key={`empty-${i}`} className="calendar-day empty-day" style={styles.emptyDay}></div>);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dayTasks = getTasksForDay(day);
    const isToday = todayDate.getDate() === day && todayDate.getMonth() === month && todayDate.getFullYear() === year;

    calendarCells.push(
      <div
        key={`day-${day}`}
        style={{
          ...styles.dayCell,
          border: isToday ? '1px solid var(--color-gold)' : '1px solid var(--border-subtle)',
          backgroundColor: isToday ? 'rgba(212,175,55,0.05)' : 'rgba(17,24,39,0.3)'
        }}
        onClick={() => openNew(day)}
        className="calendar-day"
      >
        <span style={{
          ...styles.dayNumber,
          color: isToday ? 'var(--color-gold)' : 'var(--color-text-primary)',
          fontWeight: isToday ? 'bold' : 'normal'
        }}>
          {day}
        </span>
        <div style={styles.dayTasksContainer}>
          {dayTasks.map(task => {
            const platforms = parsePlatforms(task.platforms);
            const color = statusColor(task.status);
            const label = task.content_id || contentTypeOf(task);
            return (
              <div
                key={task.id}
                onClick={(e) => { e.stopPropagation(); setEditor({ task, date: dateKeyOf(task.due_date) }); }}
                style={{
                  ...styles.taskTag,
                  backgroundColor: `${color}26`,
                  color,
                  borderLeft: `2.5px solid ${color}`
                }}
                title={[
                  `[${task.id}] ${task.client_project}`,
                  `${contentTypeOf(task)}${platforms.length ? ` · ${platforms.join(', ')}` : ''}`,
                  task.title,
                  task.employee_name && task.employee_name !== 'Unassigned' ? `Assigned: ${task.employee_name}` : ''
                ].filter(Boolean).join('\n')}
              >
                <div style={styles.taskTagText}>
                  <strong>{label}:</strong> {task.title}
                  {task.employee_name && task.employee_name !== 'Unassigned' && (
                    <span style={{ opacity: 0.8 }}> - {task.employee_name.split(' ')[0]}</span>
                  )}
                </div>
                {platforms.length > 0 && (
                  <div style={styles.dotRow}>
                    {platforms.map(p => <span key={p} style={{ ...styles.dot, backgroundColor: platformColor(p) }} title={p} />)}
                  </div>
                )}
              </div>
            );
          })}
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

        <div style={styles.filterMenu}>
          <div style={styles.filterItem}>
            <Filter size={13} color="var(--color-gold)" />
            <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)} style={styles.selectFilter}>
              <option value="">{t.filterClient}</option>
              {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>

          <div style={styles.filterItem}>
            <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} style={styles.selectFilter}>
              <option value="">{t.filterEmployee}</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>

          <div style={styles.filterItem}>
            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} style={styles.selectFilter}>
              <option value="">{t.filterType}</option>
              {typeOptions.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>

          <div style={styles.filterItem}>
            <select value={selectedPlatform} onChange={(e) => setSelectedPlatform(e.target.value)} style={styles.selectFilter}>
              <option value="">{t.filterPlatform}</option>
              {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.value}</option>)}
            </select>
          </div>

          <div style={styles.pagination}>
            <button onClick={handlePrevMonth} style={styles.pagBtn}><ChevronLeft size={16} /></button>
            <span style={styles.monthDisplay}>{monthNames[month]} {year}</span>
            <button onClick={handleNextMonth} style={styles.pagBtn}><ChevronRight size={16} /></button>
          </div>

          <button type="button" className="btn-secondary" style={styles.headerBtn} onClick={() => setImportOpen(true)}>
            <Sparkles size={14} /> {t.aiImport}
          </button>
          <button type="button" className="btn-primary" style={styles.headerBtn} onClick={() => openNew(
            todayDate.getMonth() === month && todayDate.getFullYear() === year ? todayDate.getDate() : 1
          )}>
            <Plus size={14} /> {t.newContent}
          </button>
        </div>
      </div>

      <MonthlyPlan
        monthKey={`${year}-${pad(month + 1)}`}
        monthLabel={`${monthNames[month]} ${year}`}
        plans={monthlyPlans}
        tasks={tasks}
        clients={clients}
        profiles={profiles}
        currentUserProfile={currentUserProfile}
        filterEmployeeId={selectedEmployee}
        onSavePlan={onSavePlan}
        onDeletePlan={onDeletePlan}
      />

      {/* Legend */}
      <div style={styles.legend}>
        {PLATFORMS.map(p => (
          <span key={p.value} style={styles.legendItem}>
            <span style={{ ...styles.dot, width: '8px', height: '8px', backgroundColor: p.color }} /> {p.value}
          </span>
        ))}
        <span style={styles.legendSep} />
        {['Pending Approval', 'Approved', 'In Progress', 'Delivered'].map(status => (
          <span key={status} style={styles.legendItem}>
            <span style={{ ...styles.statusSwatch, backgroundColor: statusColor(status) }} /> {status}
          </span>
        ))}
      </div>

      {/* Week Header + Calendar Grid (horizontally scrollable on narrow screens) */}
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: '640px' }}>
          <div style={styles.weekGrid}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} style={styles.weekLabel}>{d}</div>
            ))}
          </div>
          <div style={styles.calendarGrid}>{calendarCells}</div>
        </div>
      </div>

      {editor && (
        <ContentItemModal
          key={editor.task ? editor.task.id : `new-${editor.date}`}
          task={editor.task}
          defaultDate={editor.date}
          defaultClient={defaultClient}
          defaultType={selectedType}
          tasks={tasks}
          clients={clients}
          profiles={profiles}
          currentUserProfile={currentUserProfile}
          hasAssignPrivilege={hasAssignPrivilege}
          onSubmit={handleSubmit}
          onDelete={onDeleteTask}
          onClose={() => setEditor(null)}
        />
      )}

      {importOpen && (
        <ContentImportModal
          clients={clients}
          profiles={profiles}
          tasks={tasks}
          currentUserProfile={currentUserProfile}
          hasAssignPrivilege={hasAssignPrivilege}
          defaultClient={defaultClient}
          year={year}
          month={month}
          monthLabel={`${monthNames[month]} ${year}`}
          onImport={handleImport}
          onClose={() => setImportOpen(false)}
        />
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
  headerBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px'
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
  legend: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    flexWrap: 'wrap',
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-secondary)'
  },
  legendItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px'
  },
  legendSep: {
    width: '1px',
    height: '14px',
    backgroundColor: 'var(--border-subtle)'
  },
  statusSwatch: {
    width: '10px',
    height: '10px',
    borderRadius: '3px'
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
    transition: 'all 0.15s ease',
    minWidth: 0
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
    cursor: 'pointer'
  },
  taskTagText: {
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    wordBreak: 'break-word'
  },
  dotRow: {
    display: 'flex',
    gap: '3px',
    marginTop: '3px'
  },
  dot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    display: 'inline-block'
  }
};
