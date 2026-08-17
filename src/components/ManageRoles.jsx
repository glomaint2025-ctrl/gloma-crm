import React, { useState, useEffect } from 'react';
import { Shield, UserPlus, Lock } from 'lucide-react';

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000; // must stay in sync with the ~60s heartbeat in App.jsx

const localTranslations = {
  en: {
    title: "Manage Roles",
    subtitle: "Assign authority levels and credentials to team members.",
    adminNote: " Developer accounts are restricted and hidden from this view.",
    confirmRoleUpdate: "User role changed successfully!",
    noAccess: "Only Admin or Developer accounts can manage security roles.",
    addMemberTitle: "Add New Team Member Account",
    lastSeenCol: "Presence",
    onlineLabel: "Online now",
    offlineLabel: "Offline",
    neverLabel: "Never logged in",
    agoSuffix: "ago"
  },
  si: {
    title: "අවසර මට්ටම් කළමනාකරණය",
    subtitle: "කණ්ඩායම් සාමාජිකයින්ට තනතුරු සහ අවසර මට්ටම් පවරන්න.",
    adminNote: " Developer ගිණුම් මෙම පිටුවෙන් සඟවා ඇත.",
    confirmRoleUpdate: "සේවක අවසර තත්වය වෙනස් කරන ලදී!",
    noAccess: "අවසර මට්ටම් වෙනස් කළ හැක්කේ Admin හෝ Developer ගිණුම් වලට පමණි.",
    addMemberTitle: "නව කණ්ඩායම් සාමාජික ගිණුමක් එක් කරන්න",
    lastSeenCol: "සබැඳි තත්වය",
    onlineLabel: "දැන් සබැඳිව",
    offlineLabel: "විසන්ධිව",
    neverLabel: "කිසිදා login වී නැත",
    agoSuffix: "පෙර"
  },
  ta: {
    title: "பாத்திர நிர்வாகம்",
    subtitle: "குழு உறுப்பினர்களுக்கு அனுமதி நிலைகளை ஒதுக்கவும்.",
    adminNote: " டெவலப்பர் கணக்குகள் இந்தப் பக்கத்தில் மறைக்கப்பட்டுள்ளன.",
    confirmRoleUpdate: "அனுமதி நிலை மாற்றப்பட்டது!",
    noAccess: "நிர்வாகி அல்லது டெவலப்பர் கணக்குகள் மட்டுமே பாத்திரங்களை நிர்வகிக்க முடியும்.",
    addMemberTitle: "புதிய குழு உறுப்பினர் கணக்கைச் சேர்க்கவும்",
    lastSeenCol: "இணைப்பு நிலை",
    onlineLabel: "தற்போது ஆன்லைனில்",
    offlineLabel: "ஆஃப்லைன்",
    neverLabel: "இதுவரை உள்நுழையவில்லை",
    agoSuffix: "முன்பு"
  }
};

export default function ManageRoles({
  profiles = [],
  currentUserProfile = {},
  onUpdateProfileRole,
  onUpdateProfileDetails,
  onCreateMemberAccount,
  onRefreshProfiles,
  lang = 'en'
}) {
  const t = localTranslations[lang] || localTranslations.en;

  const userRole = currentUserProfile?.role || 'Employee';
  const isDev = userRole === 'Developer';
  const isAdmin = userRole === 'Admin';
  const isAdminOrDev = isDev || isAdmin;

  // Developer-only presence: poll for fresh last_seen values while this page is open
  useEffect(() => {
    if (!isDev || !onRefreshProfiles) return;
    const interval = setInterval(onRefreshProfiles, 20000);
    return () => clearInterval(interval);
  }, [isDev, onRefreshProfiles]);

  const isOnline = (lastSeen) => !!lastSeen && (Date.now() - new Date(lastSeen).getTime()) < ONLINE_THRESHOLD_MS;

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return t.neverLabel;
    if (isOnline(lastSeen)) return t.onlineLabel;
    const diffMs = Date.now() - new Date(lastSeen).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${mins}m ${t.agoSuffix}`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ${t.agoSuffix}`;
    const days = Math.floor(hours / 24);
    return `${days}d ${t.agoSuffix}`;
  };

  // New member account registration states
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPassword, setNewMemberPassword] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Employee');
  const [newMemberMsg, setNewMemberMsg] = useState({ text: '', type: '' });
  const [isCreatingMember, setIsCreatingMember] = useState(false);

  // Password editing states for Developer
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingUserPassword, setEditingUserPassword] = useState('');

  // 'Developer' is intentionally NOT in this list — it's the single full-control
  // owner account (capcutproforeveryone@gmail.com) and must never be assignable
  // to anyone else, not even by another Developer, via this UI. 'SMM & Developer'
  // is an unrelated normal-tier role (Web Developer), below Admin and Manager.
  const allRolesList = [
    { value: 'Employee', label: 'Employee (Logs only)' },
    { value: 'Editor', label: 'Editor' },
    { value: 'Social Media Executive', label: 'Social Media Executive' },
    { value: 'SMM & Developer', label: 'SMM & Developer (Web Developer)' },
    { value: 'Coordinator & Accountant', label: 'Coordinator & Accountant' },
    { value: 'Coordinator', label: 'Coordinator' },
    { value: 'Marketing Executive', label: 'Marketing Executive' },
    { value: 'Manager', label: 'Manager' },
    { value: 'Admin', label: 'Admin' }
  ];

  // Admin restricted list: same as above (Developer already excluded)
  const adminRolesList = allRolesList;

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

  // Hide Developer profiles from non-Developer users
  const visibleProfiles = profiles.filter(p => (isDev ? true : p.role !== 'Developer'));

  const handleRoleChange = (profileId, newRole) => {
    if (!isAdminOrDev) {
      alert(t.noAccess);
      return;
    }
    if (isAdmin && newRole === 'Developer') {
      alert('Admin accounts cannot assign the Developer role.');
      return;
    }
    onUpdateProfileRole(profileId, newRole);
    alert(t.confirmRoleUpdate);
  };

  const handleCreateMemberSubmit = async (e) => {
    e.preventDefault();
    if (!newMemberEmail || !newMemberName || !newMemberPassword) {
      setNewMemberMsg({ text: 'Please fill out all fields.', type: 'error' });
      return;
    }
    if (newMemberPassword.length < 6) {
      setNewMemberMsg({ text: 'Password must be at least 6 characters long.', type: 'error' });
      return;
    }

    setIsCreatingMember(true);
    setNewMemberMsg({ text: '', type: '' });

    if (onCreateMemberAccount) {
      const res = await onCreateMemberAccount({
        email: newMemberEmail,
        fullName: newMemberName,
        password: newMemberPassword,
        role: newMemberRole
      });
      if (res && res.success) {
        setNewMemberMsg({ text: 'Account created and profile initialized successfully!', type: 'success' });
        setNewMemberEmail('');
        setNewMemberName('');
        setNewMemberPassword('');
        setNewMemberRole('Employee');
      } else {
        setNewMemberMsg({ text: `Creation failed: ${res?.error || 'Unknown error code'}`, type: 'error' });
      }
    } else {
      setNewMemberMsg({ text: 'Account creator callback function not verified.', type: 'error' });
    }
    setIsCreatingMember(false);
  };

  if (!isAdminOrDev) {
    return (
      <div className="animate-fade-in glass-panel" style={{ padding: '48px', textAlign: 'center' }}>
        <Lock size={36} color="var(--color-gold)" style={{ marginBottom: 12 }} />
        <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: 8 }}>{t.title}</h3>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>{t.noAccess}</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={styles.container}>
      <div>
        <h2 style={styles.pageTitle}>
          <Shield size={22} color="var(--color-gold)" /> {t.title}
        </h2>
        <p style={styles.pageSubtitle}>
          {t.subtitle}
          {isAdmin && t.adminNote}
        </p>
      </div>

      {/* Add New Member Account Form */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h4 style={{ fontSize: 'var(--font-size-md)', color: 'var(--color-gold)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <UserPlus size={18} /> {t.addMemberTitle}
        </h4>

        <form onSubmit={handleCreateMemberSubmit} className="grid-2col-1-1">
          <div>
            <label style={styles.fieldLabel}>Full Name</label>
            <input
              type="text"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              className="form-input"
              placeholder="e.g. John Doe"
              required
            />
          </div>

          <div>
            <label style={styles.fieldLabel}>Email Address</label>
            <input
              type="email"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              className="form-input"
              placeholder="e.g. member@gloma.com"
              required
            />
          </div>

          <div>
            <label style={styles.fieldLabel}>Login Password</label>
            <input
              type="password"
              value={newMemberPassword}
              onChange={(e) => setNewMemberPassword(e.target.value)}
              className="form-input"
              placeholder="At least 6 characters"
              required
            />
          </div>

          <div>
            <label style={styles.fieldLabel}>Assign Security Role</label>
            <select
              value={newMemberRole}
              onChange={(e) => setNewMemberRole(e.target.value)}
              className="form-input"
            >
              {getSelectableRoles('Employee').filter(r => isDev || r.value !== 'Developer').map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
            <div>
              {newMemberMsg.text && (
                <span style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: '600',
                  color: newMemberMsg.type === 'success' ? '#10b981' : '#ef4444'
                }}>
                  {newMemberMsg.text}
                </span>
              )}
            </div>
            <button type="submit" className="btn-primary" disabled={isCreatingMember}>
              {isCreatingMember ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>

      {/* Roles table */}
      <div className="glass-panel" style={{ padding: '8px' }}>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Profile Member</th>
                <th>Email ID</th>
                <th>Current Role</th>
                {isDev && <th>{t.lastSeenCol}</th>}
                <th>Assign Role Authority</th>
                {isDev && <th>Security Password</th>}
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
                  {isDev && (
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--font-size-sm)' }}>
                        <span style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          flexShrink: 0,
                          backgroundColor: isOnline(p.last_seen) ? '#10B981' : 'var(--color-text-muted)',
                          boxShadow: isOnline(p.last_seen) ? '0 0 6px #10B981' : 'none'
                        }} />
                        <span style={{ color: isOnline(p.last_seen) ? '#10B981' : 'var(--color-text-secondary)', fontWeight: isOnline(p.last_seen) ? '600' : '400' }}>
                          {formatLastSeen(p.last_seen)}
                        </span>
                      </div>
                    </td>
                  )}
                  <td>
                    {p.id === currentUserProfile.id ? (
                      <span style={{ fontWeight: 'bold', color: 'var(--color-gold)', fontSize: 'var(--font-size-sm)' }}>
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
                  {isDev && (
                    <td>
                      {editingUserId === p.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type="text"
                            value={editingUserPassword}
                            onChange={(e) => setEditingUserPassword(e.target.value)}
                            className="form-input"
                            style={{ width: '130px', padding: '4px 8px', fontSize: 'var(--font-size-sm)' }}
                          />
                          <button
                            onClick={async () => {
                              if (!editingUserPassword.trim() || editingUserPassword.length < 6) {
                                alert('Password must be at least 6 characters.');
                                return;
                              }
                              const res = await onUpdateProfileDetails(p.id, { password: editingUserPassword });
                              if (res && res.success) {
                                alert('Password updated successfully!');
                                setEditingUserId(null);
                              } else {
                                alert(`Failed to save: ${res?.error || 'Unknown error'}`);
                              }
                            }}
                            className="btn-primary"
                            style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)' }}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingUserId(null)}
                            className="btn-secondary"
                            style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)' }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <code style={{
                            backgroundColor: 'rgba(212, 175, 55, 0.1)',
                            padding: '3px 6px',
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                            color: 'var(--color-gold)',
                            fontSize: 'var(--font-size-sm)',
                            border: '1px solid rgba(212, 175, 55, 0.2)'
                          }}>
                            {p.password || 'password123'}
                          </code>
                          <button
                            onClick={() => {
                              setEditingUserId(p.id);
                              setEditingUserPassword(p.password || 'password123');
                            }}
                            className="btn-secondary"
                            style={{ padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: 'var(--font-size-xs)' }}
                          >
                            Change
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {visibleProfiles.length === 0 && (
                <tr>
                  <td colSpan={isDev ? 6 : 4} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No team members registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
  pageTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: 'var(--font-size-xl)',
    fontWeight: '800',
    color: 'var(--color-text-primary)'
  },
  pageSubtitle: {
    color: 'var(--color-text-secondary)',
    fontSize: 'var(--font-size-sm)',
    marginTop: '6px'
  },
  fieldLabel: {
    display: 'block',
    fontSize: 'var(--font-size-xs)',
    fontWeight: '600',
    color: 'var(--color-text-secondary)',
    marginBottom: '4px'
  },
  roleTag: (role) => {
    const isDevRole = role === 'Developer';
    const isAdminRole = role === 'Admin';
    return {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: 'var(--font-size-xs)',
      fontWeight: 'bold',
      backgroundColor: isDevRole ? 'rgba(212, 175, 55, 0.15)' : isAdminRole ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-translucent-white)',
      color: isDevRole ? 'var(--color-gold)' : isAdminRole ? '#3B82F6' : 'var(--color-text-secondary)',
      padding: '3px 10px',
      borderRadius: 'var(--radius-full)'
    };
  },
  roleSelect: {
    padding: '7px 12px',
    backgroundColor: 'var(--bg-panel)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-primary)',
    fontSize: 'var(--font-size-sm)',
    lineHeight: 1.4,
    cursor: 'pointer',
    minWidth: '180px'
  }
};
