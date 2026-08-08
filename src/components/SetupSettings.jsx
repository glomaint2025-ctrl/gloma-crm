import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { 
  User, 
  Settings, 
  Folder, 
  Upload, 
  Shield, 
  Check, 
  FileSpreadsheet,
  Palette,
  Type,
  Globe,
  Users
} from 'lucide-react';
import { isUsingMock } from '../supabaseClient';

const localTranslations = {
  en: {
    menuProfile: "My Account Profile",
    menuWorkspace: "G-Drive Workspace",
    menuExcel: "Excel Tracker Import",
    menuTeam: "Team Members",
    menuRoles: "Manage Roles",
    menuDevConsole: "Developer Preferences",
    titleProfile: "My Account Profile",
    titleWorkspace: "Google Drive Workspaces",
    titleExcel: "Excel Spreadsheet Ingest",
    titleTeam: "Team Members Directory",
    titleRoles: "Role Assignment Panel",
    titleDevConsole: "Global CRM Visual Preferences",
    roleLabel: "Security Role Rank:",
    themeMode: "System Color Mode:",
    langLabel: "Active Language Pack:",
    fontLabel: "Baseline Font Scale:",
    primaryColorLabel: "Global Color Accent:",
    saveBtn: "Save Preferences",
    uploadBtn: "Upload Excel Template",
    confirmRoleUpdate: "User role changed successfully!",
    onlyDevWarning: "Only developers can access configuration panels.",
    active: "Active",
    small: "Small (13px)",
    normal: "Normal (15px)",
    large: "Large (18px)",
    gold: "Gloma Gold",
    blue: "Ocean Blue",
    purple: "Vibrant Purple",
    saveSettings: "Preferences updated! Loading shifts..."
  },
  si: {
    menuProfile: "මගේ පැතිකඩ",
    menuWorkspace: "ගූගල් ඩ්‍රයිව් වැඩබිම",
    menuExcel: "එක්සෙල් ගොනු ආනයනය",
    menuTeam: "කණ්ඩායම් සාමාජිකයින්",
    menuRoles: "අවසර මට්ටම් කළමනාකරණය",
    menuDevConsole: "පද්ධති සැකසුම්",
    titleProfile: "මගේ ගිණුම් පැතිකඩ",
    titleWorkspace: "ගූගල් ඩ්‍රයිව් ෆෝල්ඩර",
    titleExcel: "එක්සෙල් දත්ත ඇතුලත් කිරීම",
    titleTeam: "කණ්ඩායම් සාමාජික නාමාවලිය",
    titleRoles: "අවසර මට්ටම් පැවරීම",
    titleDevConsole: "පද්ධති වර්ණ සහ භාෂා සැකසුම්",
    roleLabel: "අවසර මට්ටම:",
    themeMode: "වර්ණ තේමාව (Dark/Light):",
    langLabel: "භාවිතා කරන භාෂාව:",
    fontLabel: "අකුරු වල ප්‍රමාණය:",
    primaryColorLabel: "ප්‍රධාන වර්ණ රටාව:",
    saveBtn: "සැකසුම් සුරකින්න",
    uploadBtn: "එක්සෙල් ගොනුව තෝරන්න",
    confirmRoleUpdate: "සේවක අවසර තත්වය වෙනස් කරන ලදී!",
    onlyDevWarning: "මෙම සැකසුම් වෙනස් කළ හැක්කේ Developer ට පමණි.",
    active: "ක්‍රියාකාරී",
    small: "කුඩා (13px)",
    normal: "සාමාන්‍ය (15px)",
    large: "විශාල (18px)",
    gold: "ග්ලෝමා රන්",
    blue: "සාගර නිල්",
    purple: "දම් වර්ණය",
    saveSettings: "සැකසුම් සුරකින ලදී! වෙනස්කම් සිදු වෙමින් පවතී..."
  },
  ta: {
    menuProfile: "எனது சுயவிவரம்",
    menuWorkspace: "கூகிள் டிரைவ் தளம்",
    menuExcel: "எக்செல் இறக்குமதி",
    menuTeam: "குழு உறுப்பினர்கள்",
    menuRoles: "பாத்திர நிர்வாகம்",
    menuDevConsole: "டெவலப்பர் அமைப்புகள்",
    titleProfile: "எனது கணக்கு சுயவிவரம்",
    titleWorkspace: "கூகிள் டிரைவ் கோப்புகள்",
    titleExcel: "எக்செல் தரவு இறக்குமதி",
    titleTeam: "குழு உறுப்பினர் பட்டியல்",
    titleRoles: "பாத்திர ஒதுக்கீடு",
    titleDevConsole: "கணினி வண்ணங்கள் மற்றும் மொழி அமைப்புகள்",
    roleLabel: "அனுமதி நிலை:",
    themeMode: "தீம் முறைமை (Dark/Light):",
    langLabel: "செயலில் உள்ள மொழி:",
    fontLabel: "எழுத்து அளவு:",
    primaryColorLabel: "முதன்மை வண்ணம்:",
    saveBtn: "அமைப்புகளைச் சேமி",
    uploadBtn: "எக்செல் கோப்பைத் தேர்ந்தெடு",
    confirmRoleUpdate: "அனுமதி நிலை மாற்றப்பட்டது!",
    onlyDevWarning: "டெவலப்பர் மட்டுமே இந்த அமைப்பினை மாற்ற முடியும்.",
    active: "செயலில்",
    small: "சிறியது (13px)",
    normal: "சாதாரண (15px)",
    large: "பெரியது (18px)",
    gold: "க்ளோமா தங்கம்",
    blue: "கடல் நீலம்",
    purple: "ஊதா நிறம்",
    saveSettings: "விருப்பங்கள் சேமிக்கப்பட்டன! மாற்றங்கள் ஏற்றப்படுகின்றன..."
  }
};

export default function SetupSettings({ 
  profiles = [], 
  currentUserProfile = {}, 
  globalSettings = {},
  onUpdateProfileRole, 
  onSaveGlobalSettings,
  onImportBulkData,
  lang = 'en'
}) {
  const t = localTranslations[lang] || localTranslations.en;
  
  const [activeTab, setActiveTab] = useState('profile');
  const [importing, setImporting] = useState(false);
  const [importStats, setImportStats] = useState(null);

  const [selLang, setSelLang] = useState(globalSettings.language || 'en');
  const [selTheme, setSelTheme] = useState(globalSettings.theme || 'dark');
  const [selFont, setSelFont] = useState(globalSettings.font_size || 'normal');
  const [selColor, setSelColor] = useState(globalSettings.primary_color || '#d4af37');

  const userRole = currentUserProfile?.role || 'Employee';
  const isDev = userRole === 'Developer';
  const isAdmin = userRole === 'Admin';
  const isAdminOrDev = isDev || isAdmin;

  // Full list available to Developer only
  const allRolesList = [
    { value: 'Employee', label: 'Employee (Logs only)' },
    { value: 'Editor', label: 'Editor' },
    { value: 'Social Media Executive', label: 'Social Media Executive' },
    { value: 'SMM & Developer', label: 'SMM & Developer' },
    { value: 'Accountant', label: 'Accountant' },
    { value: 'Coordinator', label: 'Coordinator' },
    { value: 'Marketing Executive', label: 'Marketing Executive' },
    { value: 'Manager', label: 'Manager' },
    { value: 'Admin', label: 'Admin' },
    { value: 'Developer', label: 'Developer' }
  ];

  // Admin restricted list: no Developer option
  const adminRolesList = [
    { value: 'Employee', label: 'Employee (Logs only)' },
    { value: 'Editor', label: 'Editor' },
    { value: 'Social Media Executive', label: 'Social Media Executive' },
    { value: 'SMM & Developer', label: 'SMM & Developer' },
    { value: 'Accountant', label: 'Accountant' },
    { value: 'Coordinator', label: 'Coordinator' },
    { value: 'Marketing Executive', label: 'Marketing Executive' },
    { value: 'Manager', label: 'Manager' },
    { value: 'Admin', label: 'Admin' }
  ];

  const getSelectableRoles = (currentRole) => {
    let list = [];
    if (isDev) {
      list = [...allRolesList];
    } else if (isAdmin) {
      list = [...adminRolesList];
    }
    if (!list.some(r => r.value === currentRole)) {
      list.unshift({ value: currentRole, label: currentRole });
    }
    return list;
  };

  // Filter profiles: hide Developer from non-Developer users
  const visibleProfiles = profiles.filter(p => {
    if (isDev) return true;
    return p.role !== 'Developer';
  });

  const driveWorkspace = {
    rootName: "Gloma International \u2013 Team Work Tracker Workspace",
    rootLink: "https://drive.google.com/open?id=1gvnXgvKWVV_SfsrSCIj5jeO1ysO_uI8k",
    devinWorks: "https://drive.google.com/open?id=1ntEUrorN4r3IzAU_G-aaSIGOpVbexE8T",
    bishwaWorks: "https://drive.google.com/open?id=1VJZjDb4lzJhJ5GPb9ygyZpevEd8fZJ94"
  };

  const handleRoleChange = (profileId, newRole) => {
    if (!isAdminOrDev) {
      alert('Only Admins or Developers can manage security roles.');
      return;
    }
    if (isAdmin && newRole === 'Developer') {
      alert('Admin accounts cannot assign the Developer role.');
      return;
    }
    onUpdateProfileRole(profileId, newRole);
    alert(t.confirmRoleUpdate);
  };

  const handleSaveDevPrefs = (e) => {
    e.preventDefault();
    if (!isDev) {
      alert(t.onlyDevWarning);
      return;
    }
    onSaveGlobalSettings({
      language: selLang,
      theme: selTheme,
      font_size: selFont,
      primary_color: selColor
    });
    alert(t.saveSettings);
  };

  const formatExcelDate = (serial) => {
    if (!serial) return new Date().toISOString().split('T')[0];
    if (typeof serial === 'string') {
      if (serial.includes('-') || serial.includes('/')) return serial;
    }
    try {
      const dateNum = Number(serial);
      if (isNaN(dateNum)) return new Date().toISOString().split('T')[0];
      const date = new Date((dateNum - 25567) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    setImportStats(null);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        let parsedTasks = [];

        if (workbook.SheetNames.includes('Task Tracker')) {
          const sheet = workbook.Sheets['Task Tracker'];
          const raw = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          let headerRowIndex = -1;
          for (let i = 0; i < raw.length; i++) {
            if (raw[i] && raw[i].includes('Task ID')) {
              headerRowIndex = i;
              break;
            }
          }

          if (headerRowIndex !== -1) {
            const headers = raw[headerRowIndex];
            const rows = raw.slice(headerRowIndex + 1);

            rows.forEach((row) => {
              if (!row || row.length === 0 || !row[0]) return;
              
              const taskObj = {};
              headers.forEach((h, colIdx) => {
                const val = row[colIdx];
                if (h === 'Task ID') taskObj.id = String(val);
                else if (h === 'Date Assigned') taskObj.date_assigned = formatExcelDate(val);
                else if (h === 'Due Date') taskObj.due_date = formatExcelDate(val);
                else if (h === 'Employee') taskObj.employee_name = val;
                else if (h === 'Client / Project') taskObj.client_project = val;
                else if (h === 'Work Type') taskObj.work_type = val || 'Other';
                else if (h === 'Task / Deliverable') taskObj.title = val;
                else if (h === 'Priority') taskObj.priority = val || 'Normal';
                else if (h === 'Status') taskObj.status = val || 'Pending Approval';
                else if (h === 'Progress %') taskObj.progress = parseFloat(val) || 0;
                else if (h === 'Today\'s Update') taskObj.todays_update = val || '';
                else if (h === 'Blockers / Notes') taskObj.blockers_notes = val || '';
                else if (h === 'Work Folder Link') taskObj.work_folder_link = val || '';
                else if (h === 'Final Delivery Link') taskObj.final_delivery_link = val || '';
              });

              const empProfile = profiles.find(p => p.full_name?.toLowerCase() === (taskObj.employee_name || '').toLowerCase());
              if (empProfile) {
                taskObj.employee_id = empProfile.id;
              }

              parsedTasks.push(taskObj);
            });
          }
        }

        onImportBulkData({ tasks: parsedTasks });
        setImportStats({ tasksCount: parsedTasks.length });
      } catch (err) {
        console.error(err);
        alert('Failed parsing spreadsheet.');
      } finally {
        setImporting(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const renderMenuItem = (tabKey, icon, label) => (
    <div 
      onClick={() => setActiveTab(tabKey)} 
      style={{ 
        ...styles.menuItem, 
        color: activeTab === tabKey ? 'var(--color-gold)' : 'var(--color-text-primary)',
        backgroundColor: activeTab === tabKey ? 'rgba(212, 175, 55, 0.08)' : 'transparent',
        borderLeft: activeTab === tabKey ? '3px solid var(--color-gold)' : '3px solid transparent'
      }}
    >
      {icon} {label}
    </div>
  );

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.tabGrid}>
        
        {/* Settings Left-Sidebar */}
        <div className="glass-panel" style={styles.sidebar}>
          {renderMenuItem('profile', <User size={16} />, t.menuProfile)}
          {renderMenuItem('drive', <Folder size={16} />, t.menuWorkspace)}
          
          {isAdminOrDev && renderMenuItem('excel', <Upload size={16} />, t.menuExcel)}

          {/* Team tab: visible to Developer + Admin */}
          {isAdminOrDev && renderMenuItem('team', <Users size={16} />, t.menuTeam)}

          {/* Roles tab: visible to Developer + Admin */}
          {isAdminOrDev && renderMenuItem('roles', <Shield size={16} />, t.menuRoles)}

          {/* Developer Preferences: visible only to Developer */}
          {isDev && renderMenuItem('devprefs', <Settings size={16} />, t.menuDevConsole)}
        </div>

        {/* Settings Body area */}
        <div className="glass-panel" style={styles.contentBody}>
          
          {/* PROFILE view */}
          {activeTab === 'profile' && (
            <div>
              <h3 style={styles.tabTitle}>{t.titleProfile}</h3>
              <div style={styles.profileCard}>
                <img 
                  src={currentUserProfile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUserProfile?.full_name}`} 
                  alt="" 
                  style={styles.profileAvatar} 
                />
                <div>
                  <h4 style={{ fontSize: 18, color: 'var(--color-gold)', fontWeight: 'bold' }}>{currentUserProfile?.full_name}</h4>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>{currentUserProfile?.email}</p>
                  
                  <div style={styles.roleTag(currentUserProfile?.role)}>
                    <Shield size={11} /> {currentUserProfile?.role}
                  </div>
                </div>
              </div>

              <div style={styles.profileDetailsRow}>
                <div style={styles.detailBox}>
                  <strong>Connected Environment:</strong>
                  <p>{isUsingMock ? 'Offline Simulator database storage' : 'Live Supabase API production server'}</p>
                </div>
              </div>
            </div>
          )}

          {/* G-DRIVE view */}
          {activeTab === 'drive' && (
            <div>
              <h3 style={styles.tabTitle}>{t.titleWorkspace}</h3>
              
              <div style={styles.driveList}>
                <div style={styles.driveCard} className="glass-card-interactive">
                  <div>
                    <strong>{driveWorkspace.rootName}</strong>
                    <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 4 }}>Gloma company master cloud files</p>
                  </div>
                  <a href={driveWorkspace.rootLink} target="_blank" rel="noreferrer" className="btn-primary" style={{ padding: '6px 12px', fontSize: 12 }}>
                    Open directory
                  </a>
                </div>

                <div style={styles.driveCard} className="glass-card-interactive">
                  <div>
                    <strong>Devin share directory link</strong>
                  </div>
                  <a href={driveWorkspace.devinWorks} target="_blank" rel="noreferrer" className="btn-primary" style={{ padding: '6px 12px', fontSize: 12 }}>
                    Open directory
                  </a>
                </div>

                <div style={styles.driveCard} className="glass-card-interactive">
                  <div>
                    <strong>Bishwa share directory link</strong>
                  </div>
                  <a href={driveWorkspace.bishwaWorks} target="_blank" rel="noreferrer" className="btn-primary" style={{ padding: '6px 12px', fontSize: 12 }}>
                    Open directory
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* EXCEL INGEST view */}
          {activeTab === 'excel' && (
            <div>
              <h3 style={styles.tabTitle}>{t.titleExcel}</h3>
              
              <div style={styles.uploadArea}>
                <FileSpreadsheet size={42} color="var(--color-gold)" style={{ marginBottom: 12 }} />
                
                <label className="btn-primary" style={{ cursor: 'pointer', padding: '10px 20px' }}>
                  {importing ? 'Syncing...' : t.uploadBtn}
                  <input
                    type="file"
                    accept=".xlsx"
                    onChange={handleExcelUpload}
                    disabled={importing}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              {importStats && (
                <div style={styles.importSuccessBox}>
                  <Check size={18} color="var(--color-delivered)" />
                  <div>
                    <strong>Excel import parsed successfully!</strong>
                    <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                      Loaded <strong>{importStats.tasksCount} tasks</strong>.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TEAM MEMBERS view (read-only directory) */}
          {activeTab === 'team' && (
            <div>
              <h3 style={styles.tabTitle}>{t.titleTeam}</h3>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 16 }}>
                Overview of all registered team members and their current roles.
              </p>
              
              <div style={styles.teamGrid}>
                {visibleProfiles.map((p) => (
                  <div key={p.id} style={styles.teamCard} className="glass-card-interactive">
                    <img 
                      src={p.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${p.full_name}`} 
                      alt="" 
                      style={styles.teamAvatar} 
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: 14 }}>{p.full_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{p.email}</div>
                    </div>
                    <div style={styles.roleTag(p.role)}>
                      <Shield size={10} /> {p.role}
                    </div>
                  </div>
                ))}
                {visibleProfiles.length === 0 && (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No team members registered yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ROLES ASSIGNMENT view (Admin + Developer) */}
          {activeTab === 'roles' && isAdminOrDev && (
            <div>
              <h3 style={styles.tabTitle}>{t.titleRoles}</h3>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 16 }}>
                Assign authority levels to team members.
                {isAdmin && ' Developer accounts are hidden from this view.'}
              </p>
              
              <div className="table-container" style={{ border: 'none' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Profile Member</th>
                      <th>Email ID</th>
                      <th>Current Role</th>
                      <th>Assign Role Authority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleProfiles.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img 
                              src={p.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${p.full_name}`} 
                              alt="" 
                              style={{ width: 30, height: 30, borderRadius: 'var(--radius-full)', border: '2px solid var(--border-subtle)' }} 
                            />
                            <span style={{ fontWeight: '600' }}>{p.full_name}</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--color-text-secondary)' }}>{p.email}</td>
                        <td>
                          <div style={styles.roleTag(p.role)}>
                            <Shield size={10} /> {p.role}
                          </div>
                        </td>
                        <td>
                          {p.id === currentUserProfile.id ? (
                            <span style={{ fontWeight: 'bold', color: 'var(--color-gold)', fontSize: 13 }}>
                              (Your Account)
                            </span>
                          ) : (
                            <select
                              value={p.role}
                              onChange={(e) => handleRoleChange(p.id, e.target.value)}
                              style={styles.roleSelect}
                            >
                              {getSelectableRoles(p.role).map((roleOpt) => (
                                <option key={roleOpt.value} value={roleOpt.value}>
                                  {roleOpt.label}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DEVELOPER PREFERENCES CONSOLE */}
          {activeTab === 'devprefs' && isDev && (
            <form onSubmit={handleSaveDevPrefs} style={styles.consoleForm}>
              <h3 style={styles.tabTitle}>{t.titleDevConsole}</h3>

              <div style={styles.consoleGrid}>
                
                <div style={styles.prefField}>
                  <div style={styles.prefLabelBox}>
                    <Globe size={16} color="var(--color-gold)" />
                    <label style={styles.prefLabel}>{t.langLabel}</label>
                  </div>
                  <select
                    className="form-input"
                    value={selLang}
                    onChange={(e) => setSelLang(e.target.value)}
                  >
                    <option value="en">English Pack</option>
                    <option value="si">Sinhala Pack (සිංහල)</option>
                    <option value="ta">Tamil Pack (தமிழ்)</option>
                  </select>
                </div>

                <div style={styles.prefField}>
                  <div style={styles.prefLabelBox}>
                    <Palette size={16} color="var(--color-gold)" />
                    <label style={styles.prefLabel}>{t.themeMode}</label>
                  </div>
                  <select
                    className="form-input"
                    value={selTheme}
                    onChange={(e) => setSelTheme(e.target.value)}
                  >
                    <option value="dark">Dark Theme Mode</option>
                    <option value="light">Light Theme Mode</option>
                  </select>
                </div>

                <div style={styles.prefField}>
                  <div style={styles.prefLabelBox}>
                    <Type size={16} color="var(--color-gold)" />
                    <label style={styles.prefLabel}>{t.fontLabel}</label>
                  </div>
                  <select
                    className="form-input"
                    value={selFont}
                    onChange={(e) => setSelFont(e.target.value)}
                  >
                    <option value="small">{t.small}</option>
                    <option value="normal">{t.normal}</option>
                    <option value="large">{t.large}</option>
                  </select>
                </div>

                <div style={styles.prefField}>
                  <div style={styles.prefLabelBox}>
                    <Palette size={16} color="var(--color-gold)" />
                    <label style={styles.prefLabel}>{t.primaryColorLabel}</label>
                  </div>
                  <select
                    className="form-input"
                    value={selColor}
                    onChange={(e) => setSelColor(e.target.value)}
                  >
                    <option value="#d4af37">{t.gold}</option>
                    <option value="#3b82f6">{t.blue}</option>
                    <option value="#8b5cf6">{t.purple}</option>
                  </select>
                </div>

              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="submit" className="btn-primary">
                  {t.saveBtn}
                </button>
              </div>
            </form>
          )}

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
  tabGrid: {
    display: 'grid',
    gridTemplateColumns: '250px 1fr',
    gap: '20px',
    alignItems: 'start'
  },
  sidebar: {
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  menuItem: {
    padding: '12px 14px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    transition: 'all var(--transition-fast)'
  },
  contentBody: {
    padding: '28px',
    minHeight: '500px'
  },
  tabTitle: {
    fontSize: '17px',
    fontWeight: '700',
    marginBottom: '10px',
    borderBottom: '1px solid var(--border-subtle)',
    paddingBottom: '12px'
  },
  profileCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    padding: '20px',
    backgroundColor: 'rgba(17,24,39,0.3)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-md)',
    marginBottom: '20px'
  },
  profileAvatar: {
    width: '60px',
    height: '60px',
    borderRadius: 'var(--radius-full)',
    objectFit: 'cover',
    border: '2px solid var(--color-gold)'
  },
  roleTag: (role) => {
    const isDevRole = role === 'Developer';
    const isAdminRole = role === 'Admin';
    return {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '11px',
      fontWeight: 'bold',
      backgroundColor: isDevRole ? 'rgba(212, 175, 55, 0.15)' : isAdminRole ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)',
      color: isDevRole ? 'var(--color-gold)' : isAdminRole ? '#3B82F6' : 'var(--color-text-secondary)',
      padding: '3px 10px',
      borderRadius: 'var(--radius-full)',
      marginTop: '4px'
    };
  },
  profileDetailsRow: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap'
  },
  detailBox: {
    flex: 1,
    minWidth: '200px',
    padding: '16px',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-subtle)'
  },
  driveList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  driveCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    borderRadius: 'var(--radius-md)'
  },
  uploadArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    border: '2px dashed var(--border-glass)',
    backgroundColor: 'rgba(212, 175, 55, 0.02)',
    borderRadius: 'var(--radius-md)',
    textAlign: 'center',
    marginBottom: '20px'
  },
  importSuccessBox: {
    display: 'flex',
    gap: '12px',
    padding: '16px',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    border: '1px solid rgba(16, 185, 129, 0.25)',
    borderRadius: 'var(--radius-sm)',
    marginBottom: '20px',
    alignItems: 'center'
  },
  teamGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  teamCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '14px 18px',
    borderRadius: 'var(--radius-md)'
  },
  teamAvatar: {
    width: '38px',
    height: '38px',
    borderRadius: 'var(--radius-full)',
    objectFit: 'cover',
    border: '2px solid var(--border-subtle)'
  },
  roleSelect: {
    padding: '7px 12px',
    backgroundColor: 'var(--bg-panel)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-primary)',
    fontSize: '12px',
    lineHeight: 1.4,
    cursor: 'pointer',
    minWidth: '180px'
  },
  consoleForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  consoleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px'
  },
  prefField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  prefLabelBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  prefLabel: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: 'var(--color-text-secondary)'
  }
};
