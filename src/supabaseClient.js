import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isRealSupabaseConfigured = 
  supabaseUrl.trim() !== '' && 
  supabaseUrl !== 'YOUR_SUPABASE_URL' && 
  supabaseAnonKey.trim() !== '' && 
  supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY';

export const isUsingMock = !isRealSupabaseConfigured;

// Real Supabase Client
const realClient = isRealSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// ====================================================
// MOCK DATA SEED FILES (Upgraded ClickUp CRM Structure)
// ====================================================
const defaultProfiles = [
  {
    id: 'dev-master-uuid',
    email: 'capcutproforeveryone@gmail.com',
    full_name: 'Lead Developer',
    role: 'Developer',
    avatar_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&h=100&fit=crop&crop=faces',
    password: 'password123',
    language: 'en'
  },
  {
    id: 'admin-uuid-1',
    email: 'admin@gloma.com',
    full_name: 'Bishwa Admin',
    role: 'Admin',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces',
    password: 'password123',
    language: 'en'
  },
  {
    id: 'editor-uuid-1',
    email: 'devin@gloma.com',
    full_name: 'Devin Editor',
    role: 'Editor',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
    password: 'password123',
    language: 'en'
  },
  {
    id: 'sme-uuid-1',
    email: 'sme@gloma.com',
    full_name: 'Sanjeewa SME',
    role: 'Social Media Executive',
    avatar_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop&crop=faces',
    password: 'password123',
    language: 'en'
  }
];

const defaultClients = [
  { id: 'client-uuid-1', name: "Russel's Dimbula Tea", status: 'Active', created_at: '2026-08-01T00:00:00Z' },
  { id: 'client-uuid-2', name: 'Clean Plus', status: 'Active', created_at: '2026-08-02T00:00:00Z' },
  { id: 'client-uuid-3', name: 'Gloma International', status: 'Active', created_at: '2026-08-03T00:00:00Z' }
];

const defaultTasks = [
  {
    id: 'GLM-260805-001',
    date_assigned: '2026-08-05',
    start_date: '2026-08-05',
    due_date: '2026-08-10',
    employee_id: 'editor-uuid-1',
    employee_name: 'Devin Editor',
    client_id: 'client-uuid-1',
    client_project: "Russel's Dimbula Tea",
    work_type: 'Reel',
    title: 'Edit 15-sec promotional agent recruitment reel',
    priority: 'High',
    status: 'In Progress',
    progress: 0.45,
    todays_update: 'Gathered clips; starting sound mixing.',
    blockers_notes: '',
    work_folder_link: 'https://drive.google.com/drive/folders/representative1',
    final_delivery_link: '',
    last_updated: '2026-08-05T12:00:00Z'
  },
  {
    id: 'GLM-260805-002',
    date_assigned: '2026-08-05',
    start_date: '2026-08-06',
    due_date: '2026-08-12',
    employee_id: 'sme-uuid-1',
    employee_name: 'Sanjeewa SME',
    client_id: 'client-uuid-2',
    client_project: 'Clean Plus',
    work_type: 'Post',
    title: 'Design static Facebook carousel post',
    priority: 'Normal',
    status: 'Pending Approval',
    progress: 0.0,
    todays_update: '',
    blockers_notes: '',
    work_folder_link: '',
    final_delivery_link: '',
    last_updated: '2026-08-05T12:00:00Z'
  }
];

const defaultNotifications = [
  {
    id: 'notif-1',
    user_id: 'editor-uuid-1',
    message: 'New task assigned to you: Edit 15-sec promotional agent recruitment reel',
    read: false,
    created_at: '2026-08-05T12:05:00Z'
  }
];

const defaultUserNotes = [
  {
    id: 'note-1',
    user_id: 'editor-uuid-1',
    content: 'Check dynamic captions font settings for Russel\'s reels.\nFix color grading exports in Premiere.',
    created_at: '2026-08-05T12:00:00Z'
  }
];

const defaultSystemSettings = [
  { key: 'language', value: 'en' },
  { key: 'theme', value: 'dark' },
  { key: 'primary_color', value: '#d4af37' }, // Gold
  { key: 'font_size', value: 'normal' } // small, normal, large
];

// Initialize LocalStorage if empty/outdated
if (isUsingMock) {
  // Always reload key stores if profiles are old layout to prevent crashes
  const forceReload = !localStorage.getItem('gloma_profiles') || 
                      !localStorage.getItem('gloma_profiles').includes('capcutproforeveryone') ||
                      !localStorage.getItem('gloma_profiles').includes('password');
  
  if (forceReload) {
    localStorage.setItem('gloma_profiles', JSON.stringify(defaultProfiles));
    localStorage.setItem('gloma_clients', JSON.stringify(defaultClients));
    localStorage.setItem('gloma_tasks', JSON.stringify(defaultTasks));
    localStorage.setItem('gloma_notifications', JSON.stringify(defaultNotifications));
    localStorage.setItem('gloma_user_notes', JSON.stringify(defaultUserNotes));
    localStorage.setItem('gloma_system_settings', JSON.stringify(defaultSystemSettings));
  } else {
    if (!localStorage.getItem('gloma_profiles')) localStorage.setItem('gloma_profiles', JSON.stringify(defaultProfiles));
    if (!localStorage.getItem('gloma_clients')) localStorage.setItem('gloma_clients', JSON.stringify(defaultClients));
    if (!localStorage.getItem('gloma_tasks')) localStorage.setItem('gloma_tasks', JSON.stringify(defaultTasks));
    if (!localStorage.getItem('gloma_notifications')) localStorage.setItem('gloma_notifications', JSON.stringify(defaultNotifications));
    if (!localStorage.getItem('gloma_user_notes')) localStorage.setItem('gloma_user_notes', JSON.stringify(defaultUserNotes));
    if (!localStorage.getItem('gloma_system_settings')) localStorage.setItem('gloma_system_settings', JSON.stringify(defaultSystemSettings));
  }
}

// Helper to simulate network latency
const delay = (ms = 120) => new Promise(res => setTimeout(res, ms));

// ====================================================
// MOCK CLIENT IMPLEMENTATION (Simulates Selective Developer RLS Rules)
// ====================================================
const mockClient = {
  auth: {
    getUser: async () => {
      const stored = localStorage.getItem('gloma_current_user');
      await delay(80);
      if (stored) {
        return { data: { user: JSON.parse(stored) }, error: null };
      }
      return { data: { user: null }, error: null };
    },
    signUp: async ({ email, password, options }) => {
      await delay(200);
      const profiles = JSON.parse(localStorage.getItem('gloma_profiles') || '[]');
      const emailExists = profiles.some(p => p.email.toLowerCase() === email.toLowerCase());
      if (emailExists) {
        return { data: null, error: new Error('User already exists in profiles system') };
      }
      
      const newUserId = 'mock-user-' + Math.random().toString(36).substr(2, 9);
      const fullName = options?.data?.full_name || email.split('@')[0];
      
      // Developer email automatically gets Dev role, otherwise Employee
      const role = email.toLowerCase() === 'capcutproforeveryone@gmail.com' 
        ? 'Developer' 
        : (options?.data?.role || 'Employee');
      
      const newProfile = {
        id: newUserId,
        email,
        full_name: fullName,
        role,
        avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${fullName}`,
        password: password || 'password123',
        language: 'en'
      };
      
      profiles.push(newProfile);
      localStorage.setItem('gloma_profiles', JSON.stringify(profiles));
      
      const userObj = { id: newUserId, email, user_metadata: { full_name: fullName, role } };
      localStorage.setItem('gloma_current_user', JSON.stringify(userObj));
      return { data: { user: userObj }, error: null };
    },
    signInWithPassword: async ({ email, password }) => {
      await delay(200);
      const profiles = JSON.parse(localStorage.getItem('gloma_profiles') || '[]');
      const user = profiles.find(p => p.email.toLowerCase() === email.toLowerCase());
      
      if (!user) {
        return { data: null, error: new Error('Invalid email or password') };
      }

      const matchPassword = user.password || 'password123';
      if (password && password !== matchPassword) {
        return { data: null, error: new Error('Invalid email or password') };
      }

      const userObj = { id: user.id, email: user.email, user_metadata: { full_name: user.full_name, role: user.role } };
      localStorage.setItem('gloma_current_user', JSON.stringify(userObj));
      return { data: { user: userObj }, error: null };
    },
    signOut: async () => {
      await delay(80);
      localStorage.removeItem('gloma_current_user');
      return { error: null };
    }
  },

  from: (tableName) => {
    const getStorageKey = (tbl) => {
      if (tbl === 'profiles') return 'gloma_profiles';
      if (tbl === 'clients') return 'gloma_clients';
      if (tbl === 'tasks') return 'gloma_tasks';
      if (tbl === 'notifications') return 'gloma_notifications';
      if (tbl === 'user_notes') return 'gloma_user_notes';
      if (tbl === 'system_settings') return 'gloma_system_settings';
      return tbl;
    };

    const key = getStorageKey(tableName);
    let tableData = JSON.parse(localStorage.getItem(key) || '[]');
    
    // Simulate RLS profile visibility policies:
    // If table is profiles, hide anyone with Developer role if the logged-in user is not the developer himself
    if (tableName === 'profiles') {
      const loggedUser = JSON.parse(localStorage.getItem('gloma_current_user') || 'null');
      const isDevLoggedIn = loggedUser && loggedUser.email === 'capcutproforeveryone@gmail.com';
      if (!isDevLoggedIn) {
        tableData = tableData.filter(p => p.role !== 'Developer' && p.email !== 'capcutproforeveryone@gmail.com');
      }
    }

    return {
      select: (fields = '*') => {
        return {
          order: function(col, { ascending = true } = {}) {
            tableData.sort((a, b) => {
              if (a[col] < b[col]) return ascending ? -1 : 1;
              if (a[col] > b[col]) return ascending ? 1 : -1;
              return 0;
            });
            return this;
          },
          eq: function(col, val) {
            tableData = tableData.filter(item => item[col] === val);
            return this;
          },
          then: async function(resolve) {
            await delay(80);
            resolve({ data: tableData, error: null });
          }
        };
      },
      insert: (records) => {
        const recordsArr = Array.isArray(records) ? records : [records];
        const newRecords = recordsArr.map(r => ({
          id: r.id || 'gen-' + Math.random().toString(36).substr(2, 9),
          created_at: new Date().toISOString(),
          ...r
        }));
        
        // Re-read storage directly to avoid RLS-filtered profiles array conflicts on save
        const fullTableData = JSON.parse(localStorage.getItem(key) || '[]');
        fullTableData.push(...newRecords);
        localStorage.setItem(key, JSON.stringify(fullTableData));
        
        return {
          select: () => ({
            single: async () => {
              await delay(80);
              return { data: newRecords[0], error: null };
            },
            then: async (resolve) => {
              await delay(80);
              resolve({ data: newRecords, error: null });
            }
          }),
          then: async (resolve) => {
            await delay(80);
            resolve({ data: newRecords, error: null });
          }
        };
      },
      update: (updates) => {
        let matchedCol = '';
        let matchedVal = null;
        
        const updaterObj = {
          eq: function(col, val) {
            matchedCol = col;
            matchedVal = val;
            return this;
          },
          then: async function(resolve) {
            await delay(100);
            const fullTableData = JSON.parse(localStorage.getItem(key) || '[]');
            const updatedRawData = fullTableData.map(item => {
              if (item[matchedCol] === matchedVal) {
                return { ...item, ...updates, last_updated: new Date().toISOString() };
              }
              return item;
            });
            localStorage.setItem(key, JSON.stringify(updatedRawData));
            resolve({ data: updatedRawData.filter(item => item[matchedCol] === matchedVal), error: null });
          }
        };
        return updaterObj;
      },
      delete: () => {
        let matchedCol = '';
        let matchedVal = null;
        
        const deleterObj = {
          eq: function(col, val) {
            matchedCol = col;
            matchedVal = val;
            return this;
          },
          then: async function(resolve) {
            await delay(100);
            const fullTableData = JSON.parse(localStorage.getItem(key) || '[]');
            const deleted = fullTableData.filter(item => item[matchedCol] === matchedVal);
            const filteredTableData = fullTableData.filter(item => item[matchedCol] !== matchedVal);
            localStorage.setItem(key, JSON.stringify(filteredTableData));
            resolve({ data: deleted, error: null });
          }
        };
        return deleterObj;
      }
    };
  }
};

export const supabase = isRealSupabaseConfigured ? realClient : mockClient;
