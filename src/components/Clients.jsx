import React, { useState } from 'react';
import { Plus, Edit3, Trash2, Search, Power } from 'lucide-react';

const localTranslations = {
  en: {
    title: "Client Registry",
    addBtn: "Add Client",
    search: "Search name, contact, package...",
    allStatus: "All statuses",
    tableHeaderName: "Client / Brand Name",
    tableHeaderContact: "Contact",
    tableHeaderPackage: "Website Package",
    tableHeaderStatus: "Status",
    tableHeaderActions: "Actions",
    active: "Active",
    inactive: "Inactive",
    placeholderChooseName: "e.g. Clean Plus L.T.D.",
    addModalTitle: "Register New Client",
    editModalTitle: "Edit Client Profile",
    labelName: "Brand/Client Name",
    labelAddress: "Address",
    labelContactPerson: "Contact Person",
    labelContactNumber: "Contact Number",
    labelContactEmail: "Contact Email",
    labelPackage: "Website Package",
    placeholderPackage: "e.g. Business Website - 5 pages",
    labelStatus: "Account Status",
    save: "Save Client",
    saving: "Saving...",
    cancel: "Cancel",
    activate: "Activate",
    deactivate: "Deactivate",
    empty: "No clients match.",
    noAccess: "Access Denied: you cannot manage clients.",
    deleteDenied: "Access Denied: only Admins or Developers can delete clients.",
    saveFailed: "Could not save the client",
    confirmDelete: "Are you sure you want to delete this client? Tasks and invoices linked to this client will lose their client link."
  },
  si: {
    title: "සේවාදායක ලේඛනය",
    addBtn: "සේවාදායකයෙකු එක් කරන්න",
    search: "නම, සම්බන්ධතා, පැකේජය සොයන්න...",
    allStatus: "සියලු තත්ව",
    tableHeaderName: "සේවාදායකයා / සන්නාම නාමය",
    tableHeaderContact: "සම්බන්ධතා",
    tableHeaderPackage: "වෙබ් පැකේජය",
    tableHeaderStatus: "තත්වය",
    tableHeaderActions: "ක්‍රියාවන්",
    active: "ක්‍රියාකාරී",
    inactive: "අක්‍රීය",
    placeholderChooseName: "උදා: Clean Plus L.T.D.",
    addModalTitle: "නව සේවාදායකයෙකු ලියාපදිංචි කිරීම",
    editModalTitle: "සේවාදායක පැතිකඩ සංස්කරණය",
    labelName: "සේවාදායක නාමය",
    labelAddress: "ලිපිනය",
    labelContactPerson: "සම්බන්ධ කරගත යුත්තා",
    labelContactNumber: "දුරකථන අංකය",
    labelContactEmail: "විද්‍යුත් ලිපිනය",
    labelPackage: "වෙබ් පැකේජය",
    placeholderPackage: "උදා: Business Website - 5 pages",
    labelStatus: "ගිණුම් තත්වය",
    save: "සුරකින්න",
    saving: "සුරකිමින්...",
    cancel: "අවලංගු කරන්න",
    activate: "ක්‍රියාත්මක කරන්න",
    deactivate: "අක්‍රීය කරන්න",
    empty: "ගැළපෙන සේවාදායකයින් නැත.",
    noAccess: "ප්‍රවේශය ප්‍රතික්ෂේප කරන ලදී.",
    deleteDenied: "සේවාදායකයින් ඉවත් කළ හැක්කේ Admin හෝ Developer ට පමණි.",
    saveFailed: "සේවාදායකයා සුරැකීමට නොහැකි විය",
    confirmDelete: "මෙම සේවාදායකයා ඉවත් කිරීමට අවශ්‍ය බව තහවුරු කරන්න?"
  },
  ta: {
    title: "வாடிக்கையாளர் பதிவேடு",
    addBtn: "வாடிக்கையாளரைச் சேர்",
    search: "பெயர், தொடர்பு, தொகுப்பு தேடு...",
    allStatus: "அனைத்து நிலைகள்",
    tableHeaderName: "வாடிக்கையாளர் / பிராண்ட் பெயர்",
    tableHeaderContact: "தொடர்பு",
    tableHeaderPackage: "வலைத்தள தொகுப்பு",
    tableHeaderStatus: "நிலை",
    tableHeaderActions: "செயல்கள்",
    active: "செயலில் உள்ளது",
    inactive: "செயலற்றது",
    placeholderChooseName: "உதாரணம்: Clean Plus L.T.D.",
    addModalTitle: "புதிய வாடிக்கையாளர் பதிவு",
    editModalTitle: "வாடிக்கையாளர் விவரம் திருத்து",
    labelName: "வாடிக்கையாளர் பெயர்",
    labelAddress: "முகவரி",
    labelContactPerson: "தொடர்பு நபர்",
    labelContactNumber: "தொடர்பு எண்",
    labelContactEmail: "மின்னஞ்சல்",
    labelPackage: "வலைத்தள தொகுப்பு",
    placeholderPackage: "உதாரணம்: Business Website - 5 pages",
    labelStatus: "கணக்கு நிலை",
    save: "சேமிக்க",
    saving: "சேமிக்கிறது...",
    cancel: "ரத்து செய்",
    activate: "செயல்படுத்து",
    deactivate: "செயலிழக்கச் செய்",
    empty: "பொருந்தும் வாடிக்கையாளர்கள் இல்லை.",
    noAccess: "அணுகல் மறுக்கப்பட்டது.",
    deleteDenied: "நிர்வாகி அல்லது டெவலப்பர் மட்டுமே வாடிக்கையாளரை நீக்கலாம்.",
    saveFailed: "வாடிக்கையாளரைச் சேமிக்க முடியவில்லை",
    confirmDelete: "இந்த வாடிக்கையாளரை நீக்க விரும்புகிறீர்களா?"
  }
};

const EMPTY_FORM = {
  name: '',
  address: '',
  contact_person: '',
  contact_number: '',
  contact_email: '',
  website_package: '',
  status: 'Active'
};

export default function Clients({
  clients = [],
  currentUserProfile = {},
  lang = 'en',
  onSaveClient,
  onDeleteClient
}) {
  const t = localTranslations[lang] || localTranslations.en;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const userRole = currentUserProfile?.role || 'Employee';
  // Client details feed invoices, so finance roles maintain them too.
  const canManage = ['Developer', 'Admin', 'Manager', 'Coordinator & Accountant'].includes(userRole);
  const canDelete = userRole === 'Developer' || userRole === 'Admin';

  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const openModal = (client = null) => {
    if (!canManage) {
      alert(t.noAccess);
      return;
    }
    if (client) {
      setEditingClient(client);
      setForm({
        name: client.name || '',
        address: client.address || '',
        contact_person: client.contact_person || '',
        contact_number: client.contact_number || '',
        contact_email: client.contact_email || '',
        website_package: client.website_package || '',
        status: client.status || 'Active'
      });
    } else {
      setEditingClient(null);
      setForm(EMPTY_FORM);
    }
    setIsModalOpen(true);
  };

  const buildPayload = (source) => ({
    name: source.name.trim(),
    address: source.address.trim(),
    contact_person: source.contact_person.trim(),
    contact_number: source.contact_number.trim(),
    contact_email: source.contact_email.trim(),
    website_package: source.website_package.trim(),
    status: source.status
  });

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setSaving(true);
    const payload = buildPayload(form);
    const result = await onSaveClient(editingClient ? { id: editingClient.id, ...payload } : payload);
    setSaving(false);

    if (result && result.success === false) {
      alert(`${t.saveFailed}: ${result.error || ''}`);
      return;
    }
    setIsModalOpen(false);
  };

  const handleToggleStatus = async (client) => {
    if (!canManage) return;
    const nextStatus = client.status === 'Active' ? 'Inactive' : 'Active';
    const result = await onSaveClient({ id: client.id, status: nextStatus });
    if (result && result.success === false) {
      alert(`${t.saveFailed}: ${result.error || ''}`);
    }
  };

  const handleDelete = async (clientId) => {
    if (!canDelete) {
      alert(t.deleteDenied);
      return;
    }
    if (!confirm(t.confirmDelete)) return;
    const result = await onDeleteClient(clientId);
    if (result && result.success === false) {
      alert(`${t.saveFailed}: ${result.error || ''}`);
    }
  };

  const query = searchQuery.trim().toLowerCase();
  const visibleClients = clients.filter(c => {
    const matchesStatus = !filterStatus || c.status === filterStatus;
    const haystack = [c.name, c.contact_person, c.contact_number, c.contact_email, c.website_package, c.address]
      .map(v => (v || '').toLowerCase())
      .join(' ');
    return matchesStatus && (!query || haystack.includes(query));
  });

  const columnCount = canManage ? 5 : 4;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <h2>{t.title}</h2>
        {canManage && (
          <button onClick={() => openModal(null)} className="btn-primary">
            <Plus size={16} /> {t.addBtn}
          </button>
        )}
      </div>

      <div className="glass-panel" style={styles.filterBar}>
        <div style={styles.searchBox}>
          <Search size={16} color="var(--color-text-muted)" />
          <input
            type="text"
            placeholder={t.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="form-input"
          style={{ width: 'auto', minWidth: '150px' }}
        >
          <option value="">{t.allStatus}</option>
          <option value="Active">{t.active}</option>
          <option value="Inactive">{t.inactive}</option>
        </select>
      </div>

      <div className="glass-panel" style={{ padding: '8px' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t.tableHeaderName}</th>
                <th>{t.tableHeaderContact}</th>
                <th>{t.tableHeaderPackage}</th>
                <th>{t.tableHeaderStatus}</th>
                {canManage && <th>{t.tableHeaderActions}</th>}
              </tr>
            </thead>
            <tbody>
              {visibleClients.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: '600', color: 'var(--color-gold)' }}>{c.name}</div>
                    {c.address && (
                      <div style={styles.subText}>{c.address}</div>
                    )}
                  </td>
                  <td>
                    {c.contact_person && <div style={{ fontWeight: 500 }}>{c.contact_person}</div>}
                    {c.contact_number && <div style={styles.subText}>{c.contact_number}</div>}
                    {c.contact_email && <div style={styles.subText}>{c.contact_email}</div>}
                    {!c.contact_person && !c.contact_number && !c.contact_email && (
                      <span style={styles.subText}>-</span>
                    )}
                  </td>
                  <td style={{ fontSize: 'var(--font-size-sm)' }}>{c.website_package || '-'}</td>
                  <td>
                    <span className={`badge ${c.status === 'Active' ? 'badge-delivered' : 'badge-cancelled'}`}>
                      {c.status === 'Active' ? t.active : t.inactive}
                    </span>
                  </td>
                  {canManage && (
                    <td>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => openModal(c)} style={styles.actionBtn} title="Edit">
                          <Edit3 size={14} color="var(--color-gold)" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(c)}
                          style={styles.actionBtn}
                          title={c.status === 'Active' ? t.deactivate : t.activate}
                        >
                          <Power size={14} color={c.status === 'Active' ? '#F59E0B' : '#10B981'} />
                        </button>
                        {canDelete && (
                          <button onClick={() => handleDelete(c.id)} style={styles.actionBtn} title="Delete">
                            <Trash2 size={14} color="var(--color-cancelled)" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {visibleClients.length === 0 && (
                <tr>
                  <td colSpan={columnCount} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '24px' }}>
                    {t.empty}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3>{editingClient ? t.editModalTitle : t.addModalTitle}</h3>
              <button onClick={() => setIsModalOpen(false)} style={styles.closeBtn}>&times;</button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={styles.modalLabel}>{t.labelName}</label>
                <input
                  type="text"
                  required
                  placeholder={t.placeholderChooseName}
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  className="form-input"
                />
              </div>

              <div>
                <label style={styles.modalLabel}>{t.labelAddress}</label>
                <textarea
                  rows={2}
                  value={form.address}
                  onChange={(e) => setField('address', e.target.value)}
                  className="form-input"
                  style={{ resize: 'none' }}
                />
              </div>

              <div style={styles.formRow}>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label style={styles.modalLabel}>{t.labelContactPerson}</label>
                  <input
                    type="text"
                    value={form.contact_person}
                    onChange={(e) => setField('contact_person', e.target.value)}
                    className="form-input"
                  />
                </div>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label style={styles.modalLabel}>{t.labelContactNumber}</label>
                  <input
                    type="tel"
                    value={form.contact_number}
                    onChange={(e) => setField('contact_number', e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label style={styles.modalLabel}>{t.labelContactEmail}</label>
                <input
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => setField('contact_email', e.target.value)}
                  className="form-input"
                />
              </div>

              <div>
                <label style={styles.modalLabel}>{t.labelPackage}</label>
                <input
                  type="text"
                  placeholder={t.placeholderPackage}
                  value={form.website_package}
                  onChange={(e) => setField('website_package', e.target.value)}
                  className="form-input"
                />
              </div>

              <div>
                <label style={styles.modalLabel}>{t.labelStatus}</label>
                <select
                  value={form.status}
                  onChange={(e) => setField('status', e.target.value)}
                  className="form-input"
                >
                  <option value="Active">{t.active}</option>
                  <option value="Inactive">{t.inactive}</option>
                </select>
              </div>

              <div style={styles.modalActions}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
                  {t.cancel}
                </button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? t.saving : t.save}
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
  filterBar: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap',
    padding: '12px 16px'
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    minWidth: '200px'
  },
  searchInput: {
    flex: 1,
    background: 'none',
    border: 'none',
    outline: 'none',
    color: 'var(--color-text-primary)',
    fontSize: 'var(--font-size-sm)'
  },
  subText: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-secondary)',
    marginTop: '2px'
  },
  actionBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center'
  },
  formRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
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
    maxWidth: '520px',
    padding: 'clamp(16px, 4vw, 24px)',
    backgroundColor: 'var(--bg-panel)',
    border: '1px solid var(--border-glass)',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  closeBtn: {
    fontSize: 'var(--font-size-2xl)',
    background: 'none',
    border: 'none',
    color: 'var(--color-text-muted)',
    cursor: 'pointer'
  },
  modalLabel: {
    display: 'block',
    fontSize: 'var(--font-size-sm)',
    fontWeight: '600',
    color: 'var(--color-text-secondary)',
    marginBottom: '6px'
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '10px'
  }
};
