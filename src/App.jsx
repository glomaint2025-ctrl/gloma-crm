import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase, isUsingMock } from './supabaseClient';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Clients from './components/Clients';
import TaskTracker from './components/TaskTracker';
import ContentCalendar from './components/ContentCalendar';
import DailyUpdates from './components/DailyUpdates';
import DeliveredWork from './components/DeliveredWork';
import TeamMembers from './components/TeamMembers';
import ManageRoles from './components/ManageRoles';
import SetupSettings from './components/SetupSettings';

import { 
  LayoutDashboard, 
  Layers, 
  Send, 
  FileCheck, 
  Settings, 
  LogOut, 
  Cpu,
  User,
  Users,
  Calendar,
  Shield,
  ShieldAlert
} from 'lucide-react';

const sidebarTranslations = {
  en: {
    dashboard: "Dashboard",
    clients: "Clients Registry",
    tasks: "Task Board",
    calendar: "Content Calendar",
    updates: "EOD Updates",
    deliveries: "Final Deliveries",
    team: "Team Members",
    roles: "Manage Roles",
    settings: "System Settings",
    signOut: "Sign Out",
    offlineSandbox: "Offline Sandbox: Synced to local browser. Add Supabase keys to .env to connect."
  },
  si: {
    dashboard: "පාලන පුවරුව",
    clients: "සේවාදායකයින්",
    tasks: "කාර්ය මණ්ඩලය",
    calendar: "දින දර්ශනය",
    updates: "EOD යාවත්කාලීන",
    deliveries: "භාරදීම්",
    team: "කණ්ඩායම් සාමාජිකයින්",
    roles: "අවසර කළමනාකරණය",
    settings: "පද්ධති සැකසුම්",
    signOut: "පද්ධතියෙන් ඉවත් වන්න",
    offlineSandbox: "නොබැඳි Sandbox: බ්‍රව්සරයට සුරැකේ. සජීවී Supabase සඳහා .env යාවත්කාලීන කරන්න."
  },
  ta: {
    dashboard: "டாஷ்போர்டு",
    clients: "வாடிக்கையாளர்கள்",
    tasks: "பணிகள் வாரியம்",
    calendar: "உள்ளடக்க காலெண்டர்",
    updates: "தினசரி புதுப்பிப்புகள்",
    deliveries: "இறுதி வழங்கல்கள்",
    team: "குழு உறுப்பினர்கள்",
    roles: "பாத்திர நிர்வாகம்",
    settings: "அமைப்புகள்",
    signOut: "வெளியேறு",
    offlineSandbox: "ஆஃப்லைன் சாண்ட்பாக்ஸ்: உலாவியில் சேமிக்கப்பட்டது. சජீவ Supabase ஐ இணைக்க .env ஐ திருத்தவும்."
  }
};

export default function App() {
  const [sessionUser, setSessionUser] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [activeView, setActiveView] = useState('dashboard');
  
  // Database tables states
  const [profiles, setProfiles] = useState([]);
  const [clients, setClients] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [dailyUpdates, setDailyUpdates] = useState([]);
  const [deliveredWork, setDeliveredWork] = useState([]);
  
  const [globalSettings, setGlobalSettings] = useState({
    language: 'en',
    theme: 'dark',
    font_size: 'normal',
    primary_color: '#d4af37'
  });
  
  const [loading, setLoading] = useState(true);

  const lang = currentUserProfile?.language || globalSettings?.language || 'en';
  const sbT = sidebarTranslations[lang] || sidebarTranslations.en;

  // Authenticate and load session
  useEffect(() => {
    const initAuth = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setSessionUser(data.user);
        await loadUserProfile(data.user.id, data.user.email);
      } else {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const applyVisualSettings = (settings) => {
    if (!settings) return;
    
    // Theme Mode
    if (settings.theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }

    // Font Scale
    document.body.classList.remove('font-small', 'font-normal', 'font-large');
    if (settings.font_size === 'small') {
      document.body.classList.add('font-small');
    } else if (settings.font_size === 'large') {
      document.body.classList.add('font-large');
    } else {
      document.body.classList.add('font-normal');
    }

    // Primary accent color
    if (settings.primary_color) {
      document.documentElement.style.setProperty('--color-gold', settings.primary_color);
    }
  };

  const loadUserProfile = async (userId, email) => {
    try {
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId);
        
      if (data && data.length > 0) {
        setCurrentUserProfile(data[0]);
      } else {
        const fallbackProfile = {
          id: userId,
          email: email,
          full_name: email.split('@')[0],
          role: email === 'capcutproforeveryone@gmail.com' ? 'Developer' : 'Employee'
        };
        setCurrentUserProfile(fallbackProfile);
      }
      
      // Load configurations
      const { data: sData } = await supabase.from('system_settings').select('*');
      if (sData && sData.length > 0) {
        setGlobalSettings(sData[0]);
        applyVisualSettings(sData[0]);
      } else {
        const defaults = { language: 'en', theme: 'dark', font_size: 'normal', primary_color: '#d4af37' };
        setGlobalSettings(defaults);
        applyVisualSettings(defaults);
      }

      await refreshData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      // 1. Fetch profiles
      const { data: pData } = await supabase.from('profiles').select('*');
      setProfiles(pData || []);

      // 2. Fetch clients
      const { data: cData } = await supabase.from('clients').select('*');
      setClients(cData || []);

      // 3. Fetch tasks
      const { data: qTasks } = await supabase.from('tasks').select('*');
      const sortedTasks = (qTasks || []).sort((a,b) => b.last_updated.localeCompare(a.last_updated));
      setTasks(sortedTasks);

      // 4. Fetch updates
      const { data: qUpdates } = await supabase.from('daily_updates').select('*');
      const sortedUpdates = (qUpdates || []).sort((a,b) => b.date.localeCompare(a.date));
      setDailyUpdates(sortedUpdates);

      // 5. Fetch deliveries
      const { data: qDeliveries } = await supabase.from('delivered_work').select('*');
      const sortedDeliveries = (qDeliveries || []).sort((a,b) => b.delivery_date.localeCompare(a.delivery_date));
      setDeliveredWork(sortedDeliveries);
    } catch (err) {
      console.error('Error fetching tables data:', err);
    }
  };

  const handleAuthSuccess = async (user) => {
    setSessionUser(user);
    setLoading(true);
    await loadUserProfile(user.id, user.email);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSessionUser(null);
    setCurrentUserProfile(null);
    setActiveView('dashboard');
  };

  const handleUpdateProfileRole = async (profileId, newRole) => {
    try {
      await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', profileId);
      
      await refreshData();
    } catch (err) {
      console.error('Error updating role:', err);
    }
  };

  const handleUpdateProfileDetails = async (profileId, updates) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profileId);

      if (error) throw error;

      if (updates.password && !isUsingMock && currentUserProfile?.id === profileId) {
        const { error: authErr } = await supabase.auth.updateUser({ password: updates.password });
        if (authErr) throw authErr;
      }

      if (currentUserProfile?.id === profileId) {
        await loadUserProfile(profileId, currentUserProfile.email);
      } else {
        await refreshData();
      }
      return { success: true };
    } catch (err) {
      console.error('Error updating profile details:', err);
      return { success: false, error: err.message };
    }
  };

  const handleCreateMemberAccount = async ({ email, fullName, password, role }) => {
    try {
      if (isUsingMock) {
        const localStorageProfiles = JSON.parse(localStorage.getItem('gloma_profiles') || '[]');
        const emailExists = localStorageProfiles.some(p => p.email.toLowerCase() === email.toLowerCase());
        if (emailExists) {
          throw new Error('User already exists in profiles system.');
        }
        
        const newUserId = 'mock-user-' + Math.random().toString(36).substr(2, 9);
        const newProfile = {
          id: newUserId,
          email: email.toLowerCase(),
          full_name: fullName,
          role: role,
          password: password,
          language: 'en',
          avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${fullName}`
        };
        
        localStorageProfiles.push(newProfile);
        localStorage.setItem('gloma_profiles', JSON.stringify(localStorageProfiles));
        await refreshData();
        return { success: true };
      } else {
        const tempSupabase = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY,
          {
            auth: {
              persistSession: false,
              autoRefreshToken: false
            }
          }
        );
        
        const { data, error } = await tempSupabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: role
            }
          }
        });
        
        if (error) throw error;
        
        if (data.user) {
          const { error: profileErr } = await supabase
            .from('profiles')
            .update({ password: password, language: 'en' })
            .eq('id', data.user.id);
          
          if (profileErr) {
             await supabase.from('profiles').insert({
               id: data.user.id,
               email: email.toLowerCase(),
               full_name: fullName,
               role: role,
               password: password,
               language: 'en',
               avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${fullName}`
             });
          }
        }
        
        await refreshData();
        return { success: true };
      }
    } catch (err) {
      console.error('Error creating member account:', err);
      return { success: false, error: err.message };
    }
  };

  const handleSaveGlobalSettings = async (settingsObj) => {
    try {
      const { data } = await supabase.from('system_settings').select('*');
      if (data && data.length > 0) {
        await supabase
          .from('system_settings')
          .update(settingsObj)
          .eq('id', data[0].id);
      } else {
        await supabase
          .from('system_settings')
          .insert(settingsObj);
      }
      setGlobalSettings(settingsObj);
      applyVisualSettings(settingsObj);
    } catch (err) {
      console.error('Error updating theme settings:', err);
    }
  };

  const handleSaveClient = async (clientObj) => {
    try {
      const existing = clientObj.id && clients.some(c => c.id === clientObj.id);
      if (existing) {
        await supabase.from('clients').update(clientObj).eq('id', clientObj.id);
      } else {
        await supabase.from('clients').insert(clientObj);
      }
      await refreshData();
    } catch (err) {
      console.error("Error saving client:", err);
    }
  };

  const handleDeleteClient = async (clientId) => {
    try {
      await supabase.from('clients').delete().eq('id', clientId);
      await refreshData();
    } catch (err) {
      console.error("Error deleting client:", err);
    }
  };

  const handleSaveTask = async (taskObj) => {
    try {
      const existing = tasks.some(t => t.id === taskObj.id);
      
      if (existing) {
        await supabase
          .from('tasks')
          .update(taskObj)
          .eq('id', taskObj.id);
      } else {
        await supabase
          .from('tasks')
          .insert(taskObj);
      }
      
      await refreshData();
    } catch (err) {
      console.error('Error saving task:', err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await supabase.from('tasks').delete().eq('id', taskId);
      await refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveUpdate = async (updateObj) => {
    try {
      await supabase.from('daily_updates').insert(updateObj);
      
      // Update corresponding task details automatically
      if (updateObj.task_id) {
        const associatedTask = tasks.find(t => t.id === updateObj.task_id);
        if (associatedTask) {
          const updatedPercentage = updateObj.status_at_end === 'Delivered' ? 1.0 : associatedTask.progress;
          await supabase
            .from('tasks')
            .update({
              status: updateObj.status_at_end,
              todays_update: updateObj.work_completed,
              progress: updatedPercentage,
              blockers_notes: updateObj.blockers || associatedTask.blockers_notes
            })
            .eq('id', updateObj.task_id);
        }
      }
      
      await refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUpdate = async (updateId) => {
    try {
      await supabase.from('daily_updates').delete().eq('id', updateId);
      await refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveDelivery = async (deliveryObj) => {
    try {
      const existing = deliveryObj.id && deliveredWork.some(d => d.id === deliveryObj.id);
      
      if (existing) {
        await supabase
          .from('delivered_work')
          .update(deliveryObj)
          .eq('id', deliveryObj.id);
      } else {
        await supabase
          .from('delivered_work')
          .insert(deliveryObj);
          
        if (deliveryObj.task_id) {
          await supabase
            .from('tasks')
            .update({
              status: 'Delivered',
              progress: 1.0,
              final_delivery_link: deliveryObj.final_drive_link,
              todays_update: `Delivered: ${deliveryObj.deliverable_name}`
            })
            .eq('id', deliveryObj.task_id);
        }
      }
      
      await refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteDelivery = async (delId) => {
    try {
      await supabase.from('delivered_work').delete().eq('id', delId);
      await refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleImportBulkData = async (bulkObj) => {
    try {
      if (bulkObj.tasks && bulkObj.tasks.length > 0) {
        for (const t of bulkObj.tasks) {
          const exists = tasks.some(x => x.id === t.id);
          if (exists) {
            await supabase.from('tasks').update(t).eq('id', t.id);
          } else {
            await supabase.from('tasks').insert(t);
          }
        }
      }
      await refreshData();
    } catch (err) {
      console.error('Error importing bulk data:', err);
    }
  };

  if (loading) {
    return (
      <div style={styles.loaderContainer}>
        <div style={styles.loaderPrism}></div>
        <div style={styles.loaderText}>LOADING GLOMA CRM...</div>
      </div>
    );
  }

  if (!sessionUser) {
    return <Login onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="app-container">
      
      {/* Sidebar Navigation */}
      <div className="glass-panel" style={styles.sidebar}>
        
        {/* Branding header */}
        <div style={styles.sidebarBrand}>
          <img src="/logo.png" alt="Gloma Logo" style={styles.logoImage} />
          <div>
            <div style={styles.brandTitle}>GLOMA</div>
            <div style={styles.brandSubtitle}>CRM PORTAL</div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={styles.navMenu}>
          
          <button 
            onClick={() => setActiveView('dashboard')} 
            className={`nav-btn ${activeView === 'dashboard' ? 'active' : ''}`}
          >
            <LayoutDashboard size={18} /> {sbT.dashboard}
          </button>
          
          <button 
            onClick={() => setActiveView('clients')} 
            className={`nav-btn ${activeView === 'clients' ? 'active' : ''}`}
          >
            <Users size={18} /> {sbT.clients}
          </button>
          
          <button 
            onClick={() => setActiveView('tasks')} 
            className={`nav-btn ${activeView === 'tasks' ? 'active' : ''}`}
          >
            <Layers size={18} /> {sbT.tasks}
          </button>

          <button 
            onClick={() => setActiveView('calendar')} 
            className={`nav-btn ${activeView === 'calendar' ? 'active' : ''}`}
          >
            <Calendar size={18} /> {sbT.calendar}
          </button>

          <button 
            onClick={() => setActiveView('updates')} 
            className={`nav-btn ${activeView === 'updates' ? 'active' : ''}`}
          >
            <Send size={18} /> {sbT.updates}
          </button>

          <button 
            onClick={() => setActiveView('deliveries')} 
            className={`nav-btn ${activeView === 'deliveries' ? 'active' : ''}`}
          >
            <FileCheck size={18} /> {sbT.deliveries}
          </button>

          {/* Team directory: visible to ALL team members */}
          <button
            onClick={() => setActiveView('team')}
            className={`nav-btn ${activeView === 'team' ? 'active' : ''}`}
          >
            <Users size={18} /> {sbT.team}
          </button>

          {/* Manage Roles: Admin + Developer only */}
          {(currentUserProfile?.role === 'Admin' || currentUserProfile?.role === 'Developer') && (
            <button
              onClick={() => setActiveView('roles')}
              className={`nav-btn ${activeView === 'roles' ? 'active' : ''}`}
            >
              <Shield size={18} /> {sbT.roles}
            </button>
          )}

          <button
            onClick={() => setActiveView('settings')}
            className={`nav-btn ${activeView === 'settings' ? 'active' : ''}`}
          >
            <Settings size={18} /> {sbT.settings}
          </button>
        </nav>

        {/* User profile footer */}
        <div style={styles.sidebarFooter}>
          <div style={styles.profileBadge}>
            <div style={styles.avatarMiniOuter}>
              <img 
                src={currentUserProfile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUserProfile?.full_name}`} 
                alt="" 
                style={styles.avatarMini} 
              />
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={styles.profileName}>{currentUserProfile?.full_name}</div>
              <div style={styles.profileRole}>{currentUserProfile?.role}</div>
            </div>
          </div>
          <button onClick={handleSignOut} style={styles.logoutBtn}>
            <LogOut size={14} /> {sbT.signOut}
          </button>
        </div>

      </div>

      {/* Main Area */}
      <div className="main-content">
        
        {/* Connection Notice Banner */}
        {isUsingMock && (
          <div className="glass-panel" style={styles.sandboxBanner}>
            <Cpu size={16} color="var(--color-gold)" />
            <span style={{ fontSize: 'var(--font-size-xs)', flex: 1 }}>
              {sbT.offlineSandbox}
            </span>
          </div>
        )}

        {/* Routed views */}
        {activeView === 'dashboard' && (
          <Dashboard 
            tasks={tasks} 
            profiles={profiles} 
            currentUserProfile={currentUserProfile}
            lang={lang}
          />
        )}

        {activeView === 'clients' && (
          <Clients
            clients={clients}
            onSaveClient={handleSaveClient}
            onDeleteClient={handleDeleteClient}
            lang={lang}
            currentUserProfile={currentUserProfile}
          />
        )}

        {activeView === 'tasks' && (
          <TaskTracker 
            tasks={tasks} 
            profiles={profiles} 
            clients={clients}
            currentUserProfile={currentUserProfile}
            onSaveTask={handleSaveTask}
            onDeleteTask={handleDeleteTask}
            lang={lang}
          />
        )}

        {activeView === 'calendar' && (
          <ContentCalendar
            tasks={tasks}
            clients={clients}
            profiles={profiles}
            currentUserProfile={currentUserProfile}
            lang={lang}
            onSaveTask={handleSaveTask}
          />
        )}

        {activeView === 'updates' && (
          <DailyUpdates 
            updates={dailyUpdates} 
            tasks={tasks} 
            profiles={profiles} 
            currentUserProfile={currentUserProfile}
            onSaveUpdate={handleSaveUpdate}
            onDeleteUpdate={handleDeleteUpdate}
            lang={lang}
          />
        )}

        {activeView === 'deliveries' && (
          <DeliveredWork 
            deliveries={deliveredWork} 
            tasks={tasks} 
            profiles={profiles} 
            currentUserProfile={currentUserProfile}
            onSaveDelivery={handleSaveDelivery}
            onDeleteDelivery={handleDeleteDelivery}
            lang={lang}
          />
        )}

        {activeView === 'team' && (
          <TeamMembers
            profiles={profiles}
            currentUserProfile={currentUserProfile}
            lang={lang}
          />
        )}

        {activeView === 'roles' && (
          <ManageRoles
            profiles={profiles}
            currentUserProfile={currentUserProfile}
            onUpdateProfileRole={handleUpdateProfileRole}
            onUpdateProfileDetails={handleUpdateProfileDetails}
            onCreateMemberAccount={handleCreateMemberAccount}
            lang={lang}
          />
        )}

        {activeView === 'settings' && (
          <SetupSettings
            profiles={profiles} 
            currentUserProfile={currentUserProfile}
            globalSettings={globalSettings}
            onUpdateProfileRole={handleUpdateProfileRole}
            onSaveGlobalSettings={handleSaveGlobalSettings}
            onImportBulkData={handleImportBulkData}
            onUpdateProfileDetails={handleUpdateProfileDetails}
            onCreateMemberAccount={handleCreateMemberAccount}
            lang={lang}
          />
        )}

      </div>
    </div>
  );
}

const styles = {
  loaderContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: '#0A0F1D',
    gap: '24px'
  },
  loaderPrism: {
    width: '50px',
    height: '50px',
    backgroundColor: 'var(--color-gold)',
    clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
    animation: 'spin 1.5s linear infinite'
  },
  loaderText: {
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'bold',
    color: '#D4AF37',
    letterSpacing: '0.25em'
  },
  sidebar: {
    border: 'none',
    borderRight: '1px solid var(--border-glass)',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: 0,
    height: '100vh',
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    transition: 'background-color 0.3s ease'
  },
  sidebarBrand: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 8px',
    gap: '12px'
  },
  logoImage: {
    width: '38px',
    height: '38px',
    objectFit: 'contain'
  },
  brandTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--font-size-xl)',
    fontWeight: '800',
    letterSpacing: '0.08em',
    color: 'var(--color-text-primary)',
    lineHeight: 1
  },
  brandSubtitle: {
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'bold',
    color: 'var(--color-gold)',
    letterSpacing: '0.2em',
    marginTop: '4px'
  },
  navMenu: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1
  },
  navBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
    padding: '11px 16px',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: '600',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all var(--transition-fast)'
  },
  sidebarFooter: {
    borderTop: '1px solid var(--border-subtle)',
    paddingTop: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  profileBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '4px'
  },
  avatarMiniOuter: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '1px solid var(--color-gold)',
    overflow: 'hidden'
  },
  avatarMini: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  profileName: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: '600',
    color: 'var(--color-text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  profileRole: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-secondary)',
    textTransform: 'uppercase'
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '8px',
    backgroundColor: 'var(--bg-translucent-white)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--color-text-secondary)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    fontSize: 'var(--font-size-sm)',
    fontWeight: '600',
    transition: 'all var(--transition-fast)'
  },
  sandboxBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 18px',
    backgroundColor: 'rgba(212, 175, 55, 0.04)',
    border: '1px solid rgba(212, 175, 55, 0.15)',
    borderRadius: 'var(--radius-sm)',
    marginBottom: '20px',
    color: 'var(--color-text-primary)'
  }
};
