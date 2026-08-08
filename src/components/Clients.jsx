import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, Edit3, Trash2, ShieldAlert, Award } from 'lucide-react';

const localTranslations = {
  en: {
    title: "Client Registry",
    addBtn: "Add Client",
    tableHeaderName: "Client / Brand Name",
    tableHeaderStatus: "Status",
    tableHeaderAdded: "Added Date",
    tableHeaderActions: "Actions",
    active: "Active",
    inactive: "Inactive",
    placeholderChooseName: "e.g. Clean Plus L.T.D.",
    addModalTitle: "Register New Client",
    editModalTitle: "Edit Client Profile",
    labelName: "Brand/Client Name",
    labelStatus: "Account Status",
    save: "Save Client",
    cancel: "Cancel",
    confirmDelete: "Are you sure you want to delete this client? Tasks associated with this client will lose their client association."
  },
  si: {
    title: "සේවාදායක ලේඛනය",
    addBtn: "සේවාදායකයෙකු එක් කරන්න",
    tableHeaderName: "සේවාදායකයා / සන්නාම නාමය",
    tableHeaderStatus: "තත්වය",
    tableHeaderAdded: "එක්කල දිනය",
    tableHeaderActions: "ක්‍රියාවන්",
    active: "ක්‍රියාකාරී",
    inactive: "අක්‍රීය",
    placeholderChooseName: "උදා: Clean Plus L.T.D.",
    addModalTitle: "නව සේවාදායකයෙකු ලියාපදිංචි කිරීම",
    editModalTitle: "සේවාදායක පැතිකඩ සංස්කරණය",
    labelName: "සේවාදායක නාමය",
    labelStatus: "ගිණුම් තත්වය",
    save: "සුරකින්න",
    cancel: "අවලංගු කරන්න",
    confirmDelete: "මෙම සේවාදායකයා ඉවත් කිරීමට අවශ්‍ය බව තහවුරු කරන්න?"
  },
  ta: {
    title: "வாடிக்கையாளர் பதிவேடு",
    addBtn: "வாடிக்கையாளரைச் சேர்",
    tableHeaderName: "வாடிக்கையாளர் / பிராண்ட் பெயர்",
    tableHeaderStatus: "நிலை",
    tableHeaderAdded: "சேர்க்கப்பட்ட தேதி",
    tableHeaderActions: "செயல்கள்",
    active: "செயலில் உள்ளது",
    inactive: "செயலற்றது",
    placeholderChooseName: "உதாரணம்: Clean Plus L.T.D.",
    addModalTitle: "புதிய வாடிக்கையாளர் பதிவு",
    editModalTitle: "வாடிக்கையாளர் விவரம் திருத்து",
    labelName: "வாடிக்கையாளர் பெயர்",
    labelStatus: "கணக்கு நிலை",
    save: "சேமிக்க",
    cancel: "ரத்து செய்",
    confirmDelete: "இந்த வாடிக்கையாளரை நீக்க விரும்புகிறீர்களா?"
  }
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
  const [name, setName] = useState('');
  const [status, setStatus] = useState('Active');

  const userRole = currentUserProfile?.role || 'Employee';
  const canManage = userRole === 'Developer' || userRole === 'Admin';
  const canDelete = userRole === 'Developer';

  const openModal = (client = null) => {
    if (!canManage) {
      alert("Access Denied: Only Admins or Developers can manage clients.");
      return;
    }
    if (client) {
      setEditingClient(client);
      setName(client.name);
      setStatus(client.status);
    } else {
      setEditingClient(null);
      setName('');
      setStatus('Active');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (editingClient) {
        await onSaveClient({ id: editingClient.id, name: name.trim(), status });
      } else {
        await onSaveClient({ name: name.trim(), status });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert("Error saving client details. Name might be duplicate.");
    }
  };

  const handleDelete = async (clientId) => {
    if (!canDelete) {
      alert("Access Denied: Only Developers can delete clients.");
      return;
    }
    if (confirm(t.confirmDelete)) {
      try {
        await onDeleteClient(clientId);
      } catch (err) {
        console.error(err);
      }
    }
  };


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

      <div className="glass-panel" style={{ padding: '8px' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t.tableHeaderName}</th>
                <th>{t.tableHeaderStatus}</th>
                <th>{t.tableHeaderAdded}</th>
                {canManage && <th>{t.tableHeaderActions}</th>}
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: '600', color: 'var(--color-gold)' }}>{c.name}</td>
                  <td>
                    <span className={`badge ${c.status === 'Active' ? 'badge-delivered' : 'badge-cancelled'}`}>
                      {c.status === 'Active' ? t.active : t.inactive}
                    </span>
                  </td>
                  <td style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                  {canManage && (
                    <td>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => openModal(c)} style={styles.actionBtn} title="Edit">
                          <Edit3 size={14} color="var(--color-gold)" />
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
              {clients.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 4 : 3} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '24px' }}>
                    No clients registered yet.
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
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input"
                />
              </div>

              <div>
                <label style={styles.modalLabel}>{t.labelStatus}</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
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
  actionBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center'
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
    maxWidth: '450px',
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
