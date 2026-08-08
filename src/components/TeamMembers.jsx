import React, { useState } from 'react';
import { Shield, Users, Search } from 'lucide-react';

const localTranslations = {
  en: {
    title: "Team Members",
    subtitle: "Overview of all registered team members and their current roles.",
    searchPlaceholder: "Search by name, email or role...",
    empty: "No team members registered yet.",
    membersCount: "members"
  },
  si: {
    title: "කණ්ඩායම් සාමාජිකයින්",
    subtitle: "ලියාපදිංචි වූ සියලුම කණ්ඩායම් සාමාජිකයින් සහ ඔවුන්ගේ තනතුරු.",
    searchPlaceholder: "නම, ඊමේල් හෝ තනතුර අනුව සොයන්න...",
    empty: "තවම කණ්ඩායම් සාමාජිකයින් ලියාපදිංචි වී නොමැත.",
    membersCount: "සාමාජිකයින්"
  },
  ta: {
    title: "குழு உறுப்பினர்கள்",
    subtitle: "பதிவுசெய்யப்பட்ட அனைத்து குழு உறுப்பினர்களும் அவர்களின் பாத்திரங்களும்.",
    searchPlaceholder: "பெயர், மின்னஞ்சல் அல்லது பாத்திரம் மூலம் தேடவும்...",
    empty: "இன்னும் குழு உறுப்பினர்கள் பதிவு செய்யப்படவில்லை.",
    membersCount: "உறுப்பினர்கள்"
  }
};

export default function TeamMembers({ profiles = [], currentUserProfile = {}, lang = 'en' }) {
  const t = localTranslations[lang] || localTranslations.en;
  const [search, setSearch] = useState('');

  const isDev = (currentUserProfile?.role || 'Employee') === 'Developer';

  // Developer profile stays hidden from everyone except the Developer
  const visibleProfiles = profiles.filter(p => (isDev ? true : p.role !== 'Developer'));

  const filtered = visibleProfiles.filter(p => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (p.full_name || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q) ||
      (p.role || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="animate-fade-in" style={styles.container}>
      <div style={styles.headerRow}>
        <div>
          <h2 style={styles.pageTitle}>
            <Users size={22} color="var(--color-gold)" /> {t.title}
          </h2>
          <p style={styles.pageSubtitle}>{t.subtitle}</p>
        </div>
        <div style={styles.countBadge}>
          {visibleProfiles.length} {t.membersCount}
        </div>
      </div>

      <div style={styles.searchBox}>
        <Search size={16} color="var(--color-text-muted)" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="form-input"
          style={{ border: 'none', background: 'transparent', flex: 1, outline: 'none' }}
        />
      </div>

      <div className="glass-panel" style={styles.listPanel}>
        <div style={styles.teamGrid}>
          {filtered.map((p) => (
            <div key={p.id} style={styles.teamCard} className="glass-card-interactive">
              <img
                src={p.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${p.full_name}`}
                alt=""
                style={styles.teamAvatar}
              />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontWeight: '600', fontSize: 'var(--font-size-md)' }}>
                  {p.full_name}
                  {p.id === currentUserProfile?.id && (
                    <span style={{ color: 'var(--color-gold)', fontSize: 'var(--font-size-xs)', marginLeft: 8 }}>(You)</span>
                  )}
                </div>
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {p.email}
                </div>
              </div>
              <div style={styles.roleTag(p.role)}>
                <Shield size={10} /> {p.role}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              {t.empty}
            </div>
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
    gap: '18px'
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    flexWrap: 'wrap'
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
  countBadge: {
    padding: '6px 14px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    border: '1px solid rgba(212, 175, 55, 0.25)',
    color: 'var(--color-gold)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: '700',
    whiteSpace: 'nowrap'
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 14px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-subtle)',
    backgroundColor: 'var(--bg-translucent-white)'
  },
  listPanel: {
    padding: '18px'
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
  }
};
