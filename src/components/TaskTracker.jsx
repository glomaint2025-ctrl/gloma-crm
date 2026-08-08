import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Search, 
  Filter, 
  Plus, 
  Columns, 
  Table2, 
  Layers, 
  AlertCircle, 
  Edit3, 
  Trash2, 
  ExternalLink,
  ChevronRight,
  UserCheck,
  Calendar,
  Tag
} from 'lucide-react';

const localTranslations = {
  en: {
    searchPlaceholder: "Search by ID, title, client Name...",
    allEmployees: "All Teammates",
    allPriorities: "All Priorities",
    viewBoard: "Kanban Board",
    viewTable: "List View",
    newTask: "New Task",
    colPendingApproval: "Pending Approval",
    colApproved: "Approved",
    colInProgress: "In Progress",
    colDelivered: "Delivered",
    unassigned: "Unassigned",
    dueDate: "Due Date:",
    startDate: "Start Date:",
    progressLabel: "Progress",
    editTask: "Edit Task Details",
    createTask: "Create Task Assignment",
    taskId: "Task ID Code",
    clientLabel: "Client Company Name",
    workTypeLabel: "Content Work Type",
    assigneeLabel: "Assign Teammate",
    titleLabel: "Deliverable title (Details)",
    priorityLabel: "Urgency Level",
    statusLabel: "Job Workflow Status",
    todaysUpdateLabel: "EOD Workflow Update notes",
    blockersLabel: "Bottlenecks / Blockers",
    linkFolderLabel: "Google Drive links",
    linkFinalLabel: "Final Delivery links",
    saveBtn: "Save Assignment",
    cancelBtn: "Cancel",
    confirmDelete: "Are you sure you want to delete this task?",
    emptyTasks: "No tasks found matching current filters."
  },
  si: {
    searchPlaceholder: "කාර්ය කේතය, නම හෝ සේවාදායකයාගෙන් සොයන්න...",
    allEmployees: "සියලුම සේවකයින්",
    allPriorities: "සියලුම ප්‍රමුඛතාවයන්",
    viewBoard: "බෝඩ් දසුන",
    viewTable: "ලැයිස්තු දසුන",
    newTask: "නව කාර්යයක්",
    colPendingApproval: "අනුමැතිය සඳහා",
    colApproved: "අනුමතයි",
    colInProgress: "සිදුවෙමින් පවතී",
    colDelivered: "භාර දෙන ලදී",
    unassigned: "නොපැවරුණු",
    dueDate: "අවසන් දිනය:",
    startDate: "ආරම්භක දිනය:",
    progressLabel: "ප්‍රගතිය",
    editTask: "කාර්යයේ විස්තර වෙනස් කරන්න",
    createTask: "නව කාර්යයක් නිර්මාණය කරන්න",
    taskId: "කාර්ය කේතය",
    clientLabel: "සේවාදායක සමාගමේ නම",
    workTypeLabel: "අන්තර්ගත මාදිලිය",
    assigneeLabel: "සේවකයා තෝරන්න",
    titleLabel: "කාර්යයේ මාතෘකාව හෝ විස්තර",
    priorityLabel: "ප්‍රමුඛතාවය",
    statusLabel: "ක්‍රියාකාරී තත්වය",
    todaysUpdateLabel: "අද දවසේ යාවත්කාලීන සටහන්",
    blockersLabel: "බාධා කිරීම් / සටහන්",
    linkFolderLabel: "ගූගල් ඩ්‍රයිව් ෆෝල්ඩර ලිංක් එක",
    linkFinalLabel: "නිමකල ගොනු ලිංක් එක",
    saveBtn: "සුරකින්න",
    cancelBtn: "අවලංගු කරන්න",
    confirmDelete: "මෙම කාර්යය සම්පූර්ණයෙන්ම ඉවත් කිරීමට අවශ්‍යද?",
    emptyTasks: "සොයන ලද පෙරහන් වලට ගැළපෙන කාර්යයන් කිසිවක් නැත."
  },
  ta: {
    searchPlaceholder: "குறியீடு, பெயர் அல்லது வாடிக்கையாளர் மூலம் தேடுக...",
    allEmployees: "அனைத்து ஊழியர்கள்",
    allPriorities: "அனைத்து முன்னுரிமை",
    viewBoard: "போர்டு காட்சி",
    viewTable: "பட்டியல் காட்சி",
    newTask: "புதிய பணி",
    colPendingApproval: "ஒப்புதலுக்காகக் காத்திருக்கிறது",
    colApproved: "அங்கீகரிக்கப்பட்டது",
    colInProgress: "செயல்பாட்டில் உள்ளது",
    colDelivered: "வழங்கப்பட்டது",
    unassigned: "ஒதுக்கப்படாதது",
    dueDate: "முடிவு தேதி:",
    startDate: "துவக்க தேதி:",
    progressLabel: "முன்னேற்றம்",
    editTask: "பணி விவரங்களைத் திருத்து",
    createTask: "புதிய பணியை உருவாக்கு",
    taskId: "பணி குறியீடு",
    clientLabel: "வாடிக்கையாளர் பெயர்",
    workTypeLabel: "பணி வகை",
    assigneeLabel: "ஊழியரைத் தேர்ந்தெடுக்கவும்",
    titleLabel: "பணியின் தலைப்பு மற்றும் விவரம்",
    priorityLabel: "முன்னுரிமை",
    statusLabel: "பணி செயல்நிலை",
    todaysUpdateLabel: "இன்றைய புதுப்பிப்பு குறிப்புகள்",
    blockersLabel: "தடைகள் மற்றும் குறிப்புகள்",
    linkFolderLabel: "கூகுள் டிரைவ் இணைப்பு",
    linkFinalLabel: "இறுதி வழங்கல் இணைப்பு",
    saveBtn: "சேமிக்க",
    cancelBtn: "ரத்து செய்",
    confirmDelete: "இந்தப் பணியை நீக்க விரும்புகிறீர்களா?",
    emptyTasks: "வடிகட்டிகளுக்குப் பொருத்தமான பணிகள் எதுவும் காணப்படவில்லை."
  }
};

export default function TaskTracker({ 
  tasks = [], 
  profiles = [], 
  clients = [], 
  currentUserProfile = {}, 
  onSaveTask, 
  onDeleteTask,
  lang = 'en'
}) {
  const t = localTranslations[lang] || localTranslations.en;

  const [viewMode, setViewMode] = useState('board'); // 'board' or 'table'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterClient, setFilterClient] = useState('');

  // Editing & modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Form states
  const [taskIdField, setTaskIdField] = useState('');
  const [clientProject, setClientProject] = useState('');
  const [workType, setWorkType] = useState('Post');
  const [taskDetail, setTaskDetail] = useState('');
  const [assignedEmployee, setAssignedEmployee] = useState('');
  const [taskPriority, setTaskPriority] = useState('Normal');
  const [taskStatus, setTaskStatus] = useState('Pending Approval');
  const [taskProgress, setTaskProgress] = useState(0);
  const [todaysUpdate, setTodaysUpdate] = useState('');
  const [blockersNotes, setBlockersNotes] = useState('');
  const [workFolderLink, setWorkFolderLink] = useState('');
  const [finalDeliveryLink, setFinalDeliveryLink] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');

  const userRole = currentUserProfile?.role || 'Employee';
  const hasAssignPrivilege = userRole === 'Developer' || userRole === 'Admin' || userRole === 'Manager';
  const hasDeletePrivilege = userRole === 'Developer';

  // Apply filters
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = 
      task.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.client_project || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesEmployee = !filterEmployee || task.employee_id === filterEmployee;
    const matchesPriority = !filterPriority || task.priority === filterPriority;
    const matchesClient = !filterClient || task.client_id === filterClient || task.client_project === filterClient;

    return matchesSearch && matchesEmployee && matchesPriority && matchesClient;
  });

  const columns = [
    { title: t.colPendingApproval, status: 'Pending Approval', color: '#F59E0B' },
    { title: t.colApproved, status: 'Approved', color: '#8B5CF6' },
    { title: t.colInProgress, status: 'In Progress', color: '#3B82F6' },
    { title: t.colDelivered, status: 'Delivered', color: '#10B981' }
  ];

  // Drag & Drop
  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (!hasAssignPrivilege && task.employee_id !== currentUserProfile.id) {
      alert("Permission Denied: You can only move your own assigned tasks.");
      return;
    }

    const updatedTask = {
      ...task,
      status: targetStatus,
      progress: targetStatus === 'Delivered' ? 1.0 : task.progress
    };

    onSaveTask(updatedTask);

    // Notify employee about status changes if someone else moved it
    if (task.employee_id && task.employee_id !== currentUserProfile.id) {
      await supabase.from('notifications').insert({
        user_id: task.employee_id,
        message: `Task [${task.id}] status changed to "${targetStatus}" by ${currentUserProfile.full_name}.`,
        read: false
      });
    }
  };

  // Open modal
  const openTaskModal = (task = null) => {
    if (task) {
      setEditingTask(task);
      setTaskIdField(task.id);
      setClientProject(task.client_id || task.client_project || '');
      setWorkType(task.work_type || 'Post');
      setTaskDetail(task.title || '');
      setAssignedEmployee(task.employee_id || '');
      setTaskPriority(task.priority || 'Normal');
      setTaskStatus(task.status || 'Pending Approval');
      setTaskProgress(Math.round((task.progress || 0) * 100));
      setTodaysUpdate(task.todays_update || '');
      setBlockersNotes(task.blockers_notes || '');
      setWorkFolderLink(task.work_folder_link || '');
      setFinalDeliveryLink(task.final_delivery_link || '');
      setStartDate(task.start_date ? task.start_date.substring(0, 10) : '');
      setDueDate(task.due_date ? task.due_date.substring(0, 10) : '');
    } else {
      if (!hasAssignPrivilege) {
        alert("Only Administrators or Developers can create new tasks.");
        return;
      }
      setEditingTask(null);
      const datePart = new Date().toISOString().substring(2, 10).replace(/-/g, '');
      const randPart = Math.floor(100 + Math.random() * 900);
      setTaskIdField(`GLM-${datePart}-${randPart}`);
      setClientProject('');
      setWorkType('Post');
      setTaskDetail('');
      setAssignedEmployee('');
      setTaskPriority('Normal');
      setTaskStatus('Pending Approval');
      setTaskProgress(0);
      setTodaysUpdate('');
      setBlockersNotes('');
      setWorkFolderLink('');
      setFinalDeliveryLink('');
      setStartDate(new Date().toISOString().substring(0, 10));
      setDueDate(new Date(Date.now() + 86400000 * 3).toISOString().substring(0, 10));
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!taskIdField.trim()) {
      alert('Task ID is required.');
      return;
    }

    let selectedEmpId = null;
    let selectedEmpName = '';
    const foundProfile = profiles.find(p => p.id === assignedEmployee);
    if (foundProfile) {
      selectedEmpId = foundProfile.id;
      selectedEmpName = foundProfile.full_name;
    }

    // Resolve client registry link
    let resolvedClientId = null;
    let resolvedClientName = clientProject;
    const foundClient = clients.find(c => c.id === clientProject || c.name === clientProject);
    if (foundClient) {
      resolvedClientId = foundClient.id;
      resolvedClientName = foundClient.name;
    }

    const taskObj = {
      id: taskIdField,
      client_id: resolvedClientId,
      client_project: resolvedClientName,
      work_type: workType,
      title: taskDetail,
      employee_id: selectedEmpId,
      employee_name: selectedEmpName || 'Unassigned',
      priority: taskPriority,
      status: taskStatus,
      progress: parseFloat(taskProgress) / 100,
      todays_update: todaysUpdate,
      blockers_notes: blockersNotes,
      work_folder_link: workFolderLink,
      final_delivery_link: finalDeliveryLink,
      start_date: startDate || new Date().toISOString().substring(0,10),
      due_date: dueDate,
      last_updated: new Date().toISOString()
    };

    onSaveTask(taskObj);
    setIsModalOpen(false);

    // Automation: if task is assigned/updated to a teammate, issue notification log in supabase
    if (selectedEmpId && (!editingTask || editingTask.employee_id !== selectedEmpId)) {
      try {
        await supabase.from('notifications').insert({
          user_id: selectedEmpId,
          message: `New task assigned to you [${taskIdField}]: ${taskDetail} (${workType})`,
          read: false
        });
      } catch (err) {
        console.error("Notification logging failed:", err);
      }
    }
  };

  const handleMoveStatus = async (task, dir) => {
    const statusOrder = ['Pending Approval', 'Approved', 'In Progress', 'Delivered'];
    const currIndex = statusOrder.indexOf(task.status);
    let nextIndex = currIndex + dir;
    if (nextIndex < 0 || nextIndex >= statusOrder.length) return;

    if (!hasAssignPrivilege && task.employee_id !== currentUserProfile.id) {
      alert("Permission Denied: You cannot move status of other employee's tasks.");
      return;
    }

    const nextStatus = statusOrder[nextIndex];
    const updated = {
      ...task,
      status: nextStatus,
      progress: nextStatus === 'Delivered' ? 1.0 : task.progress
    };

    onSaveTask(updated);

    // Notify employee about status shift
    if (task.employee_id && task.employee_id !== currentUserProfile.id) {
      await supabase.from('notifications').insert({
        user_id: task.employee_id,
        message: `Task [${task.id}] moved to status "${nextStatus}" by ${currentUserProfile.full_name}.`,
        read: false
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="animate-fade-in">
      
      {/* Search and Filters Bar */}
      <div style={styles.controlsBar} className="glass-panel">
        
        {/* Search Input */}
        <div style={styles.searchBox}>
          <Search size={18} color="var(--color-text-muted)" />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        {/* Filters Group */}
        <div style={styles.filtersGroup}>
          
          {/* Client Filter */}
          <div style={styles.filterItem}>
            <Tag size={13} color="var(--color-gold)" />
            <select
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              style={styles.selectFilter}
            >
              <option value="">All Clients</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* User Filter */}
          <div style={styles.filterItem}>
            <Filter size={13} color="var(--color-gold)" />
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              style={styles.selectFilter}
            >
              <option value="">{t.allEmployees}</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.full_name} ({p.role})</option>
              ))}
            </select>
          </div>

          {/* Priority filter */}
          <div style={styles.filterItem}>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              style={styles.selectFilter}
            >
              <option value="">{t.allPriorities}</option>
              <option value="High">High</option>
              <option value="Normal">Normal</option>
              <option value="Low">Low</option>
            </select>
          </div>

        </div>

        {/* View Mode Switcher */}
        <div style={styles.toggleGroup}>
          <button 
            onClick={() => setViewMode('board')} 
            style={{ 
              ...styles.toggleBtn, 
              backgroundColor: viewMode === 'board' ? 'var(--color-gold)' : 'transparent',
              color: viewMode === 'board' ? '#0A0F1D' : 'var(--color-text-primary)'
            }}
          >
            <Layers size={14} /> {t.viewBoard}
          </button>
          
          <button 
            onClick={() => setViewMode('table')} 
            style={{ 
              ...styles.toggleBtn, 
              backgroundColor: viewMode === 'table' ? 'var(--color-gold)' : 'transparent',
              color: viewMode === 'table' ? '#0A0F1D' : 'var(--color-text-primary)'
            }}
          >
            <Table2 size={14} /> {t.viewTable}
          </button>
        </div>

        {hasAssignPrivilege && (
          <button onClick={() => openTaskModal(null)} className="btn-primary">
            <Plus size={16} /> {t.newTask}
          </button>
        )}
      </div>

      {/* Kanban Board View */}
      {viewMode === 'board' && (
        <div style={styles.boardGrid}>
          {columns.map(col => {
            const columnTasks = filteredTasks.filter(t => t.status === col.status);
            return (
              <div 
                key={col.status} 
                className="glass-panel" 
                style={styles.boardColumn}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.status)}
              >
                {/* Column header */}
                <div style={{ ...styles.columnHeader, borderBottom: `2.5px solid ${col.color}` }}>
                  <span style={{ fontWeight: '700', fontSize: 'var(--font-size-sm)' }}>{col.title}</span>
                  <span style={styles.columnCount}>{columnTasks.length}</span>
                </div>

                {/* Column Tasks */}
                <div style={styles.columnCardsList}>
                  {columnTasks.map(task => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onClick={() => openTaskModal(task)}
                      className="glass-card-interactive"
                      style={styles.taskCard}
                    >
                      <div style={styles.cardHeader}>
                        <span style={styles.cardId}>{task.id}</span>
                        <span style={{ 
                          ...styles.cardPriority, 
                          color: task.priority === 'High' ? 'var(--color-priority-high)' : task.priority === 'Normal' ? 'var(--color-priority-normal)' : 'var(--color-priority-low)'
                        }}>
                          {task.priority}
                        </span>
                      </div>

                      <div style={styles.cardClient}>{task.client_project}</div>
                      <div style={styles.cardTitle}>{task.title}</div>
                      
                      <div style={styles.cardInfoRow}>
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gold)', fontWeight: 'bold' }}>
                          {task.work_type}
                        </span>
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                          {task.employee_name || t.unassigned}
                        </span>
                      </div>

                      {/* Dates visualization */}
                      <div style={styles.cardDates}>
                        <Calendar size={10} />
                        <span>
                          {task.start_date ? task.start_date.substring(5) : ''} → {task.due_date ? task.due_date.substring(5) : ''}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div style={styles.progressContainer}>
                        <div style={styles.progressBarBg}>
                          <div style={{ ...styles.progressBarFill, width: `${Math.round((task.progress || 0) * 100)}%` }}></div>
                        </div>
                        <span style={styles.progressPercent}>{Math.round((task.progress || 0) * 100)}%</span>
                      </div>

                      {/* Left/Right quick arrows for tablet touch screens */}
                      <div style={styles.cardTouchNav} onClick={e => e.stopPropagation()}>
                        <button onClick={() => handleMoveStatus(task, -1)} style={styles.touchBtn}>&larr;</button>
                        <button onClick={() => handleMoveStatus(task, 1)} style={styles.touchBtn}>&rarr;</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List Table View */}
      {viewMode === 'table' && (
        <div className="glass-panel" style={{ padding: '8px' }}>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Client</th>
                  <th>Work Type</th>
                  <th>Task Title</th>
                  <th>Assignee</th>
                  <th>Start Date</th>
                  <th>Due Date</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map(task => (
                  <tr key={task.id}>
                    <td style={{ fontWeight: 'bold', color: 'var(--color-gold)' }}>{task.id}</td>
                    <td>{task.client_project}</td>
                    <td style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'bold' }}>{task.work_type}</td>
                    <td style={{ maxWidth: '280px', textOverflow: 'ellipsis', overflow: 'hidden' }}>{task.title}</td>
                    <td>{task.employee_name || t.unassigned}</td>
                    <td>{task.start_date || 'N/A'}</td>
                    <td>{task.due_date}</td>
                    <td>
                      <span style={{ 
                        color: task.priority === 'High' ? 'var(--color-priority-high)' : task.priority === 'Normal' ? 'var(--color-priority-normal)' : 'var(--color-priority-low)',
                        fontWeight: 'bold',
                        fontSize: 'var(--font-size-sm)'
                      }}>
                        {task.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`badge`} style={{
                        backgroundColor: 
                          task.status === 'Delivered' ? 'rgba(16,185,129,0.15)' :
                          task.status === 'In Progress' ? 'rgba(59,130,246,0.15)' :
                          task.status === 'Approved' ? 'rgba(139,92,246,0.15)' : 'rgba(245,158,11,0.15)',
                        color:
                          task.status === 'Delivered' ? '#10B981' :
                          task.status === 'In Progress' ? '#3B82F6' :
                          task.status === 'Approved' ? '#8B5CF6' : '#F59E0B'
                      }}>
                        {task.status}
                      </span>
                    </td>
                    <td style={{ fontWeight: '600' }}>{Math.round((task.progress || 0) * 100)}%</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => openTaskModal(task)} style={styles.gridActionBtn} title="Edit">
                          <Edit3 size={13} color="var(--color-gold)" />
                        </button>
                        {hasDeletePrivilege && (
                          <button 
                            onClick={async () => {
                              if (confirm(t.confirmDelete)) {
                                onDeleteTask(task.id);
                              }
                            }} 
                            style={styles.gridActionBtn} 
                            title="Delete"
                          >
                            <Trash2 size={13} color="var(--color-cancelled)" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredTasks.length === 0 && (
            <div style={styles.tableEmptyMessage}>{t.emptyTasks}</div>
          )}
        </div>
      )}

      {/* Detail Creator / Editor modal */}
      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={styles.modalContent}>
            
            <div style={styles.modalHeader}>
              <h3>{editingTask ? t.editTask : t.createTask}</h3>
              <button onClick={() => setIsModalOpen(false)} style={styles.closeBtn}>&times;</button>
            </div>

            <form onSubmit={handleSave} style={styles.modalForm}>
              
              <div style={styles.formRow}>
                <div style={{ flex: 1 }}>
                  <label style={styles.modalLabel}>{t.taskId}</label>
                  <input
                    type="text"
                    required
                    readOnly={editingTask !== null || !hasAssignPrivilege}
                    value={taskIdField}
                    onChange={(e) => setTaskIdField(e.target.value)}
                    className="form-input"
                    style={{ opacity: editingTask ? 0.7 : 1 }}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <label style={styles.modalLabel}>{t.clientLabel}</label>
                  {hasAssignPrivilege ? (
                    <select
                      required
                      value={clientProject}
                      onChange={(e) => setClientProject(e.target.value)}
                      className="form-input"
                    >
                      <option value="">Select client registry</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                      <option value="Gloma Internal">Gloma Internal Task</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="form-input"
                      readOnly
                      value={clientProject}
                    />
                  )}
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={{ flex: 1 }}>
                  <label style={styles.modalLabel}>{t.workTypeLabel}</label>
                  {hasAssignPrivilege ? (
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
                  ) : (
                    <input
                      type="text"
                      className="form-input"
                      readOnly
                      value={workType}
                    />
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <label style={styles.modalLabel}>{t.assigneeLabel}</label>
                  {hasAssignPrivilege ? (
                    <select
                      value={assignedEmployee}
                      onChange={(e) => setAssignedEmployee(e.target.value)}
                      className="form-input"
                    >
                      <option value="">Unassigned</option>
                      {profiles.map(p => (
                        <option key={p.id} value={p.id}>{p.full_name} ({p.role})</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      readOnly
                      className="form-input"
                      value={profiles.find(p => p.id === assignedEmployee)?.full_name || 'Unassigned'}
                      style={{ opacity: 0.7 }}
                    />
                  )}
                </div>
              </div>

              <div>
                <label style={styles.modalLabel}>{t.titleLabel}</label>
                <textarea
                  required
                  rows={2}
                  readOnly={!hasAssignPrivilege}
                  placeholder="Insert captions description, links specifications or developers instruction"
                  value={taskDetail}
                  onChange={(e) => setTaskDetail(e.target.value)}
                  className="form-input"
                  style={{ resize: 'none' }}
                />
              </div>

              <div style={styles.formRow}>
                <div style={{ flex: 1 }}>
                  <label style={styles.modalLabel}>{t.priorityLabel}</label>
                  {hasAssignPrivilege ? (
                    <select
                      value={taskPriority}
                      onChange={(e) => setTaskPriority(e.target.value)}
                      className="form-input"
                    >
                      <option value="High">High</option>
                      <option value="Normal">Normal</option>
                      <option value="Low">Low</option>
                    </select>
                  ) : (
                    <input type="text" readOnly className="form-input" value={taskPriority} />
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <label style={styles.modalLabel}>{t.startDate}</label>
                  <input
                    type="date"
                    readOnly={!hasAssignPrivilege}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <label style={styles.modalLabel}>{t.dueDate}</label>
                  <input
                    type="date"
                    required
                    readOnly={!hasAssignPrivilege}
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <hr style={{ borderColor: 'var(--border-subtle)', margin: '8px 0' }} />

              <div style={styles.formRow}>
                <div style={{ flex: 1 }}>
                  <label style={styles.modalLabel}>{t.statusLabel}</label>
                  <select
                    value={taskStatus}
                    onChange={(e) => {
                      setTaskStatus(e.target.value);
                      if (e.target.value === 'Delivered') setTaskProgress(100);
                    }}
                    className="form-input"
                  >
                    <option value="Pending Approval">Pending Approval</option>
                    <option value="Approved">Approved</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Delivered">Delivered</option>
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label style={styles.modalLabel}>{t.progressLabel} ({taskProgress}%)</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={taskProgress}
                    onChange={(e) => setTaskProgress(e.target.value)}
                    style={{ width: '100%', marginTop: '10px', accentColor: 'var(--color-gold)' }}
                  />
                </div>
              </div>

              <div>
                <label style={styles.modalLabel}>{t.todaysUpdateLabel}</label>
                <input
                  type="text"
                  placeholder="e.g. Exported rough cut review video"
                  value={todaysUpdate}
                  onChange={(e) => setTodaysUpdate(e.target.value)}
                  className="form-input"
                />
              </div>

              <div>
                <label style={styles.modalLabel}>{t.blockersLabel}</label>
                <input
                  type="text"
                  placeholder="State any dependencies or questions..."
                  value={blockersNotes}
                  onChange={(e) => setBlockersNotes(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={styles.formRow}>
                <div style={{ flex: 1 }}>
                  <label style={styles.modalLabel}>{t.linkFolderLabel}</label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/..."
                    value={workFolderLink}
                    onChange={(e) => setWorkFolderLink(e.target.value)}
                    className="form-input"
                  />
                </div>
                
                <div style={{ flex: 1 }}>
                  <label style={styles.modalLabel}>{t.linkFinalLabel}</label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/..."
                    value={finalDeliveryLink}
                    onChange={(e) => setFinalDeliveryLink(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={styles.modalActions}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
                  {t.cancelBtn}
                </button>
                <button type="submit" className="btn-primary">
                  {t.saveBtn}
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
  controlsBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 20px',
    flexWrap: 'wrap'
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: 'var(--bg-badge-dark)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 12px',
    flex: 1,
    minWidth: '220px'
  },
  searchInput: {
    background: 'none',
    border: 'none',
    outline: 'none',
    color: 'var(--color-text-primary)',
    width: '100%',
    fontSize: 'var(--font-size-sm)'
  },
  filtersGroup: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
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
  boardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '16px',
    alignItems: 'start'
  },
  boardColumn: {
    minHeight: '450px',
    backgroundColor: 'var(--bg-badge-dark)',
    borderColor: 'var(--border-subtle)',
    padding: '12px',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  columnHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '8px',
    marginBottom: '4px'
  },
  columnCount: {
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'bold',
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: '2px 8px',
    borderRadius: 'var(--radius-full)',
    color: 'var(--color-text-secondary)'
  },
  columnCardsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    overflowY: 'auto',
    flexGrow: 1,
    padding: '2px'
  },
  taskCard: {
    backgroundColor: 'var(--bg-panel)',
    borderColor: 'var(--border-subtle)',
    borderRadius: 'var(--radius-sm)',
    padding: '12px',
    cursor: 'grab',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  cardId: {
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'bold',
    color: 'var(--color-text-secondary)'
  },
  cardPriority: {
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  cardClient: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: '700',
    color: 'var(--color-gold)'
  },
  cardTitle: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: '500',
    lineHeight: 1.4,
    color: 'var(--color-text-primary)'
  },
  cardInfoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '4px',
    borderTop: '1px dashed var(--border-subtle)'
  },
  cardDates: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-secondary)'
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: '2px'
  },
  progressBarBg: {
    flexGrow: 1,
    height: '4px',
    backgroundColor: 'var(--bg-translucent-white)',
    borderRadius: 'var(--radius-full)',
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: 'var(--color-gold)',
    borderRadius: 'var(--radius-full)'
  },
  progressPercent: {
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'bold',
    color: 'var(--color-text-secondary)',
    minWidth: '24px',
    textAlign: 'right'
  },
  cardTouchNav: {
    display: 'none', // Shown only on touch devices if styled, fallback arrows included
    justifyContent: 'space-between',
    marginTop: '6px'
  },
  touchBtn: {
    fontSize: 'var(--font-size-xs)',
    background: 'var(--bg-translucent-white)',
    border: '1px solid var(--border-subtle)',
    cursor: 'pointer',
    padding: '2px 8px',
    color: 'var(--color-text-primary)',
    borderRadius: '4px'
  },
  gridActionBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center'
  },
  tableEmptyMessage: {
    textAlign: 'center',
    padding: '30px',
    color: 'var(--color-text-muted)',
    fontSize: 'var(--font-size-md)'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    backdropFilter: 'blur(4px)'
  },
  modalContent: {
    width: '100%',
    maxWidth: '560px',
    padding: '24px',
    backgroundColor: 'var(--bg-panel)',
    borderColor: 'var(--border-glass)',
    overflowY: 'auto',
    maxHeight: '90vh'
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
  formRow: {
    display: 'flex',
    gap: '12px'
  },
  modalLabel: {
    display: 'block',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'bold',
    color: 'var(--color-text-secondary)',
    marginBottom: '4px'
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '10px'
  }
};
