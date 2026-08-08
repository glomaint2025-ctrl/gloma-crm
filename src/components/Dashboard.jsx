import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Trophy, 
  Clock, 
  Hourglass, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  User, 
  PieChart, 
  NotebookPen, 
  Bell, 
  CheckSquare, 
  BookOpen, 
  Timer
} from 'lucide-react';

const localTranslations = {
  en: {
    adminTitle: "Team Work Control Center",
    employeeTitle: "My Private Workspace",
    asOf: "AS OF:",
    totalTasks: "TOTAL TASKS",
    inProgress: "IN PROGRESS",
    pending: "PENDING APPROVAL",
    delivered: "DELIVERED",
    overdue: "OVERDUE",
    rate: "COMPLETION RATE",
    workload: "Employee Workload",
    distribution: "Status Distribution",
    troubleHeading: "Immediate Attention Required",
    troubleDue: "Was due:",
    systemTime: "System Time",
    myNotes: "Personal Scratchpad / Todo Notebook",
    saveNotesBtn: "Save Notes",
    notesEmptyPlaceholder: "Write down your personal ideas, checklist, draft links, or developer instructions here...",
    assignedToMe: "My Assigned Assignments",
    notificationsLabel: "Workspace Notifications Alert Feed",
    noNotifications: "No new notifications",
    emptyNotes: "Saving notepad...",
    markRead: "Dismiss"
  },
  si: {
    adminTitle: "කණ්ඩායම් වැඩ පාලන මධ්‍යස්ථානය",
    employeeTitle: "මගේ පෞද්ගලික වැඩබිම",
    asOf: "යාවත්කාලීන දිනය:",
    totalTasks: "මුළු කාර්යයන්",
    inProgress: "සිදුවෙමින් පවතී",
    pending: "අනුමැතිය සඳහා",
    delivered: "භාර දෙන ලදී",
    overdue: "ප්‍රමාද වූ",
    rate: "නිමකිරීමේ වේගය",
    workload: "සේවක සේවා නියුක්තිය",
    distribution: "ක්‍රියාකාරී තත්ව ව්‍යාප්තිය",
    troubleHeading: "වහාම අවධානය යොමු කරන්න",
    troubleDue: "අවසන් දිනය වූයේ:",
    systemTime: "පද්ධති වේලාව",
    myNotes: "පුද්ගලික සටහන් පොත (Todo List)",
    saveNotesBtn: "සටහන් සුරකින්න",
    notesEmptyPlaceholder: "ඔබගේ පුද්ගලික අදහස්, දෛනික වැඩ ලැයිස්තු හෝ ලින්ක් මෙහි ලියා තබන්න...",
    assignedToMe: "මට පවරන ලද කාර්යයන්",
    notificationsLabel: "පද්ධති දැනුම්දීම්",
    noNotifications: "දැනුම්දීම් නොමැත",
    emptyNotes: "සුරකිමින් පවතී...",
    markRead: "මකන්න"
  },
  ta: {
    adminTitle: "குழு பணி கட்டுப்பாட்டு மையம்",
    employeeTitle: "எனது தனிப்பட்ட பணியிடம்",
    asOf: "புதுப்பிக்கப்பட்ட தேதி:",
    totalTasks: "மொத்த பணிகள்",
    inProgress: "செயல்பாட்டில்",
    pending: "ஒப்புதலுக்காக",
    delivered: "வழங்கப்பட்டது",
    overdue: "காலக்கெடு முடிந்தது",
    rate: "பணி விகிதம்",
    workload: "பணியாளரின் பணிச்சுமை",
    distribution: "பணி நிலை விநியோகம்",
    troubleHeading: "உடனடி கவனம் தேவை",
    troubleDue: "காலக்கெடு முந்தைய தேதி:",
    systemTime: "கணினி நேரம்",
    myNotes: "தனிப்பட்ட குறிப்பேடு மற்றும் செய்ய வேண்டியவை",
    saveNotesBtn: "குறிப்புகளைச் சேமி",
    notesEmptyPlaceholder: "உங்கள் குறிப்புகள் அல்லது வேலைப் பட்டியலை இங்கே எழுதவும்...",
    assignedToMe: "எனக்கு ஒதுக்கப்பட்ட பணிகள்",
    notificationsLabel: "அறிவிப்பு ஓடை",
    noNotifications: "அறிவிப்புகள் இல்லை",
    emptyNotes: "குறிப்பு சேமிக்கப்படுகிறது...",
    markRead: "விலக்கு"
  }
};

export default function Dashboard({ 
  tasks = [], 
  profiles = [], 
  currentUserProfile = {}, 
  lang = 'en' 
}) {
  const t = localTranslations[lang] || localTranslations.en;
  
  const userRole = currentUserProfile?.role || 'Employee';
  const isAdminOrDev = userRole === 'Developer' || userRole === 'Admin';
  
  // Real-time Clock Clock
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Notifications State
  const [myNotifications, setMyNotifications] = useState([]);
  const [personalNote, setPersonalNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    fetchNotifications();
    fetchPersonalNote();
  }, [currentUserProfile]);

  const fetchNotifications = async () => {
    if (!currentUserProfile?.id) return;
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUserProfile.id)
        .eq('read', false)
        .order('created_at', { ascending: false });
      setMyNotifications(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPersonalNote = async () => {
    if (!currentUserProfile?.id) return;
    try {
      const { data } = await supabase
        .from('user_notes')
        .select('*')
        .eq('user_id', currentUserProfile.id)
        .order('created_at', { ascending: false });
      if (data && data.length > 0) {
        setPersonalNote(data[0].content);
      } else {
        setPersonalNote('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveNote = async () => {
    if (!currentUserProfile?.id) return;
    setSavingNote(true);
    try {
      // Fetch existing notebook logs
      const { data } = await supabase
        .from('user_notes')
        .select('*')
        .eq('user_id', currentUserProfile.id);

      if (data && data.length > 0) {
        await supabase
          .from('user_notes')
          .update({ content: personalNote })
          .eq('user_id', currentUserProfile.id);
      } else {
        await supabase
          .from('user_notes')
          .insert({ user_id: currentUserProfile.id, content: personalNote });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingNote(false);
    }
  };

  const handleDismissNotification = async (notifId) => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notifId);
      
      setMyNotifications(prev => prev.filter(n => n.id !== notifId));
    } catch (err) {
      console.error(err);
    }
  };

  // KPI Calculations
  const myTasks = tasks.filter(t => t.employee_id === currentUserProfile.id);
  const tasksSource = isAdminOrDev ? tasks : myTasks;

  const totalCount = tasksSource.length;
  const inProgressCount = tasksSource.filter(task => task.status === 'In Progress').length;
  const pendingCount = tasksSource.filter(task => task.status === 'Pending Approval').length;
  const deliveredCount = tasksSource.filter(task => task.status === 'Delivered').length;
  const approvedCount = tasksSource.filter(task => task.status === 'Approved').length;

  const todayStr = new Date().toISOString().split('T')[0];
  const overdueCount = tasksSource.filter(task => {
    if (task.status === 'Delivered') return false;
    return task.due_date && task.due_date < todayStr;
  }).length;

  const completionRate = totalCount > 0 ? (deliveredCount / totalCount) * 100 : 0;

  // Workload distributions
  const employeeStats = profiles.map(profile => {
    const empTasks = tasks.filter(ta => ta.employee_id === profile.id);
    return {
      name: profile.full_name,
      role: profile.role,
      avatar: profile.avatar_url,
      total: empTasks.length,
      inProgress: empTasks.filter(ta => ta.status === 'In Progress').length,
      pending: empTasks.filter(ta => ta.status === 'Pending Approval').length,
      delivered: empTasks.filter(ta => ta.status === 'Delivered').length,
      overdue: empTasks.filter(ta => {
        if (ta.status === 'Delivered') return false;
        return ta.due_date && ta.due_date < todayStr;
      }).length
    };
  });

  const overdueTasksList = tasksSource.filter(task => {
    if (task.status === 'Delivered') return false;
    return task.due_date && task.due_date < todayStr;
  });

  return (
    <div style={styles.container} className="animate-fade-in">
      
      {/* Visual Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>{isAdminOrDev ? t.adminTitle : t.employeeTitle}</h2>
          <p style={styles.subtitle}>
            {currentUserProfile.full_name} ({currentUserProfile.role}) • Gloma CRM Portal
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={styles.clockBadge} className="glass-panel">
            <Timer size={15} color="var(--color-gold)" />
            <span style={{ fontWeight: 'bold' }}>{time.toLocaleTimeString()}</span>
          </div>

          <div style={styles.dateBadge} className="glass-panel">
            <span style={{ color: 'var(--color-gold)', marginRight: '6px', fontWeight: 'bold' }}>{t.asOf}</span>
            <span>{time.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* Main KPI Stats Bar */}
      <div style={styles.statsGrid}>
        <div className="glass-panel" style={styles.statCard}>
          <div style={{ ...styles.iconWrapper, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
            <TrendingUp size={22} color="#fff" />
          </div>
          <div>
            <div style={styles.statLabel}>{t.totalTasks}</div>
            <div style={styles.statValue}>{totalCount}</div>
          </div>
        </div>

        <div className="glass-panel" style={styles.statCard}>
          <div style={{ ...styles.iconWrapper, backgroundColor: 'rgba(59, 130, 246, 0.15)' }}>
            <Clock size={22} color="#3B82F6" />
          </div>
          <div>
            <div style={styles.statLabel}>{t.inProgress}</div>
            <div style={styles.statValue}>{inProgressCount}</div>
          </div>
        </div>

        <div className="glass-panel" style={styles.statCard}>
          <div style={{ ...styles.iconWrapper, backgroundColor: 'rgba(245, 158, 11, 0.15)' }}>
            <Hourglass size={22} color="#F59E0B" />
          </div>
          <div>
            <div style={styles.statLabel}>{t.pending}</div>
            <div style={styles.statValue}>{pendingCount}</div>
          </div>
        </div>

        <div className="glass-panel" style={styles.statCard}>
          <div style={{ ...styles.iconWrapper, backgroundColor: 'rgba(16, 185, 129, 0.15)' }}>
            <CheckCircle2 size={22} color="#10B981" />
          </div>
          <div>
            <div style={styles.statLabel}>{t.delivered}</div>
            <div style={styles.statValue}>{deliveredCount}</div>
          </div>
        </div>

        <div className="glass-panel" style={styles.statCard}>
          <div style={{ ...styles.iconWrapper, backgroundColor: 'rgba(239, 68, 68, 0.15)' }}>
            <AlertTriangle size={22} color="#EF4444" />
          </div>
          <div>
            <div style={styles.statLabel}>{t.overdue}</div>
            <div style={{ ...styles.statValue, color: '#EF4444' }}>{overdueCount}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ ...styles.statCard, border: '1px solid rgba(212, 175, 55, 0.25)' }}>
          <div style={{ ...styles.iconWrapper, backgroundColor: 'rgba(212, 175, 55, 0.15)' }}>
            <Trophy size={22} color="var(--color-gold)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={styles.statLabel}>{t.rate}</div>
            <div style={{ ...styles.statValue, color: 'var(--color-gold)' }}>
              {completionRate.toFixed(1)}%
            </div>
            <div style={styles.progressBarBg}>
              <div style={{ ...styles.progressBarFill, width: `${completionRate}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {isAdminOrDev ? (
        /* ================= ADMIN / DEVELOPER VIEW ================= */
        <div style={styles.mainGrid}>
          {/* Workload */}
          <div className="glass-panel" style={styles.gridSection}>
            <div style={styles.sectionHeader}>
              <User size={18} color="var(--color-gold)" />
              <h3 style={styles.sectionTitle}>{t.workload}</h3>
            </div>
            <div className="table-container" style={{ border: 'none' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th style={{ textAlign: 'center' }}>Total</th>
                    <th style={{ textAlign: 'center' }}>In Progress</th>
                    <th style={{ textAlign: 'center' }}>Pending</th>
                    <th style={{ textAlign: 'center' }}>Delivered</th>
                    <th style={{ textAlign: 'center' }}>Overdue</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeStats.map((emp, i) => (
                    <tr key={i}>
                      <td>
                        <div style={styles.employeeCell}>
                          <img 
                            src={emp.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${emp.name}`} 
                            alt={emp.name} 
                            style={styles.avatarImg} 
                          />
                          <div>
                            <span style={styles.empName}>{emp.name}</span>
                            <span style={styles.empRole}>{emp.role}</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{emp.total}</td>
                      <td style={{ textAlign: 'center', color: '#3B82F6' }}>{emp.inProgress}</td>
                      <td style={{ textAlign: 'center', color: '#F59E0B' }}>{emp.pending}</td>
                      <td style={{ textAlign: 'center', color: '#10B981', fontWeight: 'bold' }}>{emp.delivered}</td>
                      <td style={{ textAlign: 'center', color: '#EF4444', fontWeight: emp.overdue > 0 ? 'bold' : 'normal' }}>
                        {emp.overdue}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right column: statuses and danger ticker */}
          <div style={styles.sideColumn}>
            <div className="glass-panel" style={styles.gridSection}>
              <div style={styles.sectionHeader}>
                <PieChart size={18} color="var(--color-gold)" />
                <h3 style={styles.sectionTitle}>{t.distribution}</h3>
              </div>
              <div style={styles.statusMixContainer}>
                {totalCount === 0 ? (
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>No stats to build profile</div>
                ) : (
                  <>
                    <div style={styles.mixLegendRow}>
                      <span style={styles.legendDot('#F59E0B')}></span>
                      <span style={styles.legendLabel}>Pending ({pendingCount})</span>
                      <span style={styles.legendValue}>{((pendingCount / totalCount) * 100).toFixed(0)}%</span>
                    </div>
                    <div style={styles.mixLegendRow}>
                      <span style={styles.legendDot('#8B5CF6')}></span>
                      <span style={styles.legendLabel}>Approved ({approvedCount})</span>
                      <span style={styles.legendValue}>{((approvedCount / totalCount) * 100).toFixed(0)}%</span>
                    </div>
                    <div style={styles.mixLegendRow}>
                      <span style={styles.legendDot('#3B82F6')}></span>
                      <span style={styles.legendLabel}>In Progress ({inProgressCount})</span>
                      <span style={styles.legendValue}>{((inProgressCount / totalCount) * 100).toFixed(0)}%</span>
                    </div>
                    <div style={styles.mixLegendRow}>
                      <span style={styles.legendDot('#10B981')}></span>
                      <span style={styles.legendLabel}>Delivered ({deliveredCount})</span>
                      <span style={styles.legendValue}>{((deliveredCount / totalCount) * 100).toFixed(0)}%</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Overdue alert ticker */}
            {overdueTasksList.length > 0 && (
              <div className="glass-panel" style={styles.dangerNotice}>
                <div style={styles.dangerHeader}>
                  <AlertTriangle size={18} color="#EF4444" />
                  <h4 style={{ color: '#EF4444', fontWeight: 'bold' }}>{t.troubleHeading}</h4>
                </div>
                <div style={styles.troubleList}>
                  {overdueTasksList.map((task, index) => (
                    <div key={index} style={styles.troubleItem}>
                      <div style={{ fontWeight: '600', fontSize: 13, color: '#fff' }}>
                        {task.id} &bull; {task.client_project}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{task.title}</div>
                      <div style={{ fontSize: 11, color: '#EF4444', marginTop: '2px' }}>
                        {t.troubleDue} {new Date(task.due_date).toLocaleDateString()} ({task.employee_name})
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ================= EMPLOYEE PERSONAL DASHBOARD ================= */
        <div style={styles.mainGrid}>
          
          {/* Left panel: assigned tasks list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="glass-panel" style={styles.gridSection}>
              <div style={styles.sectionHeader}>
                <CheckSquare size={18} color="var(--color-gold)" />
                <h3 style={styles.sectionTitle}>{t.assignedToMe}</h3>
              </div>
              
              <div className="table-container" style={{ border: 'none' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Client</th>
                      <th>Task Title</th>
                      <th>Work Type</th>
                      <th>Due Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myTasks.map(task => (
                      <tr key={task.id}>
                        <td style={{ fontWeight: 'bold', color: 'var(--color-gold)' }}>{task.id}</td>
                        <td>{task.client_project}</td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</td>
                        <td style={{ fontSize: '11px', fontWeight: 'bold' }}>{task.work_type}</td>
                        <td style={{ color: task.due_date < todayStr ? '#EF4444' : 'inherit' }}>{task.due_date}</td>
                        <td>
                          <span className="badge" style={{
                            backgroundColor: 
                              task.status === 'Delivered' ? 'rgba(16,185,129,0.15)' :
                              task.status === 'In Progress' ? 'rgba(59,130,246,0.15)' : 'rgba(245,158,11,0.15)',
                            color:
                              task.status === 'Delivered' ? '#10B981' :
                              task.status === 'In Progress' ? '#3B82F6' : '#F59E0B'
                          }}>
                            {task.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {myTasks.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '24px' }}>
                          No assignments currently assigned to you!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notebook widgets */}
            <div className="glass-panel" style={styles.gridSection}>
              <div style={styles.sectionHeader}>
                <NotebookPen size={18} color="var(--color-gold)" />
                <h3 style={styles.sectionTitle}>{t.myNotes}</h3>
              </div>
              <textarea
                style={styles.notesTextarea}
                rows={5}
                placeholder={t.notesEmptyPlaceholder}
                value={personalNote}
                onChange={(e) => setPersonalNote(e.target.value)}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button onClick={handleSaveNote} className="btn-primary" disabled={savingNote}>
                  {savingNote ? t.emptyNotes : t.saveNotesBtn}
                </button>
              </div>
            </div>
          </div>

          {/* Right panel: alerts and notifications */}
          <div style={styles.sideColumn}>
            
            <div className="glass-panel" style={styles.gridSection}>
              <div style={styles.sectionHeader}>
                <Bell size={18} color="var(--color-gold)" />
                <h3 style={styles.sectionTitle}>{t.notificationsLabel}</h3>
              </div>

              <div style={styles.alertsContainer}>
                {myNotifications.map(n => (
                  <div key={n.id} style={styles.alertCard}>
                    <p style={{ fontSize: '13px', color: '#fff', margin: 0 }}>{n.message}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>
                        {new Date(n.created_at).toLocaleTimeString()}
                      </span>
                      <button onClick={() => handleDismissNotification(n.id)} style={styles.dismissBtn}>
                        {t.markRead}
                      </button>
                    </div>
                  </div>
                ))}

                {myNotifications.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px', padding: '16px' }}>
                    {t.noNotifications}
                  </div>
                )}
              </div>
            </div>

            {overdueTasksList.length > 0 && (
              <div className="glass-panel" style={styles.dangerNotice}>
                <div style={styles.dangerHeader}>
                  <AlertTriangle size={18} color="#EF4444" />
                  <h4 style={{ color: '#EF4444', fontWeight: 'bold' }}>{t.troubleHeading}</h4>
                </div>
                <div style={styles.troubleList}>
                  {overdueTasksList.map((task, index) => (
                    <div key={index} style={styles.troubleItem}>
                      <div style={{ fontWeight: '600', fontSize: 13, color: '#fff' }}>
                        {task.id} &bull; {task.client_project}
                      </div>
                      <div style={{ fontSize: 11, color: '#EF4444', marginTop: '2px' }}>
                        {t.troubleDue} {new Date(task.due_date).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
    gap: '24px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px'
  },
  title: {
    fontSize: '24px',
    fontWeight: '800',
    letterSpacing: '-0.02em',
    color: '#fff'
  },
  subtitle: {
    fontSize: '13px',
    color: 'var(--color-text-secondary)',
    marginTop: '2px'
  },
  dateBadge: {
    padding: '8px 16px',
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: 'rgba(17, 24, 39, 0.4)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center'
  },
  clockBadge: {
    padding: '8px 16px',
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: 'rgba(17, 24, 39, 0.4)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#fff'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px'
  },
  statCard: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: 'var(--bg-glass)'
  },
  iconWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    borderRadius: '8px'
  },
  statLabel: {
    fontSize: '10px',
    fontWeight: '700',
    color: 'var(--color-text-secondary)',
    letterSpacing: '0.05em'
  },
  statValue: {
    fontSize: '22px',
    fontWeight: '850',
    marginTop: '2px',
    lineHeight: 1
  },
  progressBarBg: {
    width: '100%',
    height: '5px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 'var(--radius-full)',
    marginTop: '6px',
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: 'var(--color-gold)',
    borderRadius: 'var(--radius-full)',
    transition: 'width var(--transition-slow)'
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1.5fr 1fr',
    gap: '20px',
    alignItems: 'start'
  },
  gridSection: {
    padding: '20px',
    backgroundColor: 'var(--bg-glass)',
    border: '1px solid var(--border-glass)',
    borderRadius: 'var(--radius-md)'
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px'
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#fff'
  },
  employeeCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  avatarImg: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '1px solid var(--border-glass)',
    objectFit: 'cover'
  },
  empName: {
    display: 'block',
    fontWeight: '600',
    fontSize: '13px',
    color: '#fff'
  },
  empRole: {
    display: 'block',
    fontSize: '10px',
    color: 'var(--color-text-secondary)',
    textTransform: 'uppercase'
  },
  sideColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  statusMixContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  mixLegendRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: 'rgba(17, 24, 39, 0.2)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)'
  },
  legendDot: (color) => ({
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: color
  }),
  legendLabel: {
    flex: 1,
    fontSize: '12px',
    color: 'var(--color-text-primary)'
  },
  legendValue: {
    fontWeight: 'bold',
    fontSize: '12px',
    color: 'var(--color-text-secondary)'
  },
  dangerNotice: {
    padding: '16px',
    backgroundColor: 'rgba(239, 68, 68, 0.04)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: 'var(--radius-md)'
  },
  dangerHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px'
  },
  troubleList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '200px',
    overflowY: 'auto'
  },
  troubleItem: {
    padding: '8px 12px',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: '4px',
    borderLeft: '3px solid #EF4444'
  },
  notesTextarea: {
    width: '100%',
    padding: '12px',
    backgroundColor: 'rgba(17, 24, 39, 0.6)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)',
    color: '#fff',
    fontFamily: 'inherit',
    fontSize: '14px',
    resize: 'none',
    outline: 'none',
    lineHeight: '1.4'
  },
  alertsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxHeight: '200px',
    overflowY: 'auto'
  },
  alertCard: {
    padding: '10px 14px',
    backgroundColor: 'rgba(212,175,55,0.06)',
    borderLeft: '3.5px solid var(--color-gold)',
    borderRadius: '4px',
    border: '1px solid rgba(255,255,255,0.05)'
  },
  dismissBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-gold)',
    fontSize: '11px',
    fontWeight: 'bold',
    cursor: 'pointer',
    padding: 0
  }
};
