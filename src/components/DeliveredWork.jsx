import React, { useState } from 'react';
import { 
  CheckSquare, 
  HelpCircle, 
  RefreshCw, 
  ExternalLink, 
  Trash2, 
  Plus, 
  Calendar,
  CheckCircle,
  FileCheck,
  Send
} from 'lucide-react';

export default function DeliveredWork({ 
  deliveries = [], 
  tasks = [], 
  profiles = [], 
  currentUserProfile = {}, 
  onSaveDelivery, 
  onDeleteDelivery 
}) {
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form states
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [taskId, setTaskId] = useState('');
  const [clientProject, setClientProject] = useState('');
  const [deliverableName, setDeliverableName] = useState('');
  const [finalDriveLink, setFinalDriveLink] = useState('');
  const [platformChannel, setPlatformChannel] = useState('Facebook / Instagram');
  const [notes, setNotes] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');

  const userRole = currentUserProfile?.role || 'Employee';
  const isAdminOrDev = userRole === 'Developer' || userRole === 'Admin';
  // Admin, Developer and Manager can see every teammate's completion history;
  // everyone else only sees their own.
  const canSeeAllHistory = isAdminOrDev || userRole === 'Manager';

  // Get tasks that are complete or marked delivered by matching current user
  const myCompletedTasks = tasks.filter(t => {
    if (canSeeAllHistory) return true;
    return t.employee_id === currentUserProfile.id || t.employee_name === currentUserProfile.full_name;
  });

  const handleTaskChange = (selectedTaskId) => {
    setTaskId(selectedTaskId);
    const selectedTask = tasks.find(t => t.id === selectedTaskId);
    if (selectedTask) {
      setClientProject(selectedTask.client_project || '');
      setDeliverableName(selectedTask.title || '');
      setFinalDriveLink(selectedTask.final_delivery_link || '');
    } else {
      setClientProject('');
      setDeliverableName('');
      setFinalDriveLink('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!deliverableName.trim() || !finalDriveLink.trim()) {
      alert('Deliverable name and Final Drive link are required!');
      return;
    }

    const deliveryObj = {
      delivery_date: deliveryDate,
      employee_id: currentUserProfile.id,
      employee_name: currentUserProfile.full_name,
      task_id: taskId || null,
      client_project: clientProject || 'Gloma General',
      deliverable_name: deliverableName,
      final_drive_link: finalDriveLink,
      platform_channel: platformChannel,
      client_approval: 'Awaiting',
      revision_status: 'No revision requested',
      notes
    };

    onSaveDelivery(deliveryObj);

    // Reset Form
    setTaskId('');
    setClientProject('');
    setDeliverableName('');
    setFinalDriveLink('');
    setNotes('');
    setIsFormOpen(false);
    alert('Delivery entry registered!');
  };

  const handleStatusChange = (delivery, approvalStatus) => {
    let revStatus = delivery.revision_status;
    if (approvalStatus === 'Revision Requested') {
      const msg = prompt('Please specify requested revision details:', delivery.revision_status);
      if (msg === null) return; // cancel
      revStatus = msg || 'Revision requested';
    } else if (approvalStatus === 'Approved') {
      revStatus = 'Approved by Client';
    }

    onSaveDelivery({
      ...delivery,
      client_approval: approvalStatus,
      revision_status: revStatus
    });
  };

  // Filter Delivery
  const filteredDeliveries = deliveries.filter(del => {
    const matchesSearch =
      del.deliverable_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      del.client_project.toLowerCase().includes(searchQuery.toLowerCase()) ||
      del.employee_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOwnership = canSeeAllHistory ||
      del.employee_id === currentUserProfile.id ||
      del.employee_name === currentUserProfile.full_name;
    return matchesSearch && matchesOwnership;
  });

  return (
    <div style={styles.container} className="animate-fade-in">
      
      {/* Header filter & create row */}
      <div style={styles.controlsRow} className="glass-panel">
        <div style={styles.searchBox}>
          <input
            type="text"
            placeholder="Search delivered register..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <button 
          onClick={() => setIsFormOpen(!isFormOpen)} 
          className="btn-primary" 
          style={styles.addBtn}
        >
          <Plus size={16} /> Log New Delivery
        </button>
      </div>

      {/* Log Delivery Form Drawer */}
      {isFormOpen && (
        <div className="glass-panel" style={styles.formContainer}>
          <div style={styles.formHeader}>
            <FileCheck size={18} color="var(--color-gold)" />
            <h3 style={{ fontSize: 'var(--font-size-lg)' }}>Register Final Work Submission</h3>
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formRow}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Delivery Date</label>
                <input
                  type="date"
                  required
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="form-input"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Associate Task</label>
                <select
                  value={taskId}
                  onChange={(e) => handleTaskChange(e.target.value)}
                  className="form-input"
                >
                  <option value="">None (General Deliverable)</option>
                  {myCompletedTasks.map(t => (
                    <option key={t.id} value={t.id}>{t.id} - {t.title} ({t.client_project})</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={styles.formRow}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Client / Project</label>
                <input
                  type="text"
                  required
                  value={clientProject}
                  onChange={(e) => setClientProject(e.target.value)}
                  className="form-input"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Deliverable Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dimbula Tea recruitment reel final"
                  value={deliverableName}
                  onChange={(e) => setDeliverableName(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div style={styles.formRow}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Final Drive sharing Link</label>
                <input
                  type="url"
                  required
                  placeholder="https://drive.google.com/..."
                  value={finalDriveLink}
                  onChange={(e) => setFinalDriveLink(e.target.value)}
                  className="form-input"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Platform / Destination Channel</label>
                <select
                  value={platformChannel}
                  onChange={(e) => setPlatformChannel(e.target.value)}
                  className="form-input"
                >
                  <option value="Facebook / Instagram">Facebook / Instagram</option>
                  <option value="TikTok">TikTok</option>
                  <option value="YouTube">YouTube</option>
                  <option value="Google Drive Delivery">Google Drive Delivery</option>
                  <option value="Website Client Portal">Website Client Portal</option>
                  <option value="WhatsApp Group">WhatsApp Group</option>
                </select>
              </div>
            </div>

            <div>
              <label style={styles.label}>Notes</label>
              <input
                type="text"
                placeholder="Details for review, passwords, files etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="form-input"
              />
            </div>

            <div style={styles.formActions}>
              <button 
                type="button" 
                onClick={() => setIsFormOpen(false)} 
                className="btn-secondary"
              >
                Close
              </button>
              <button type="submit" className="btn-primary">
                <Send size={14} /> Submit Registry
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Registry Table List */}
      <div className="glass-panel" style={{ padding: '4px' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Delivery Date</th>
                <th>Employee</th>
                <th>Client / Project</th>
                <th>Deliverable Name</th>
                <th>Platform</th>
                <th>Google Drive Link</th>
                <th style={{ textAlign: 'center' }}>Client Approval</th>
                <th>Notes / Revision status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeliveries.map((del) => (
                <tr key={del.id}>
                  <td>{new Date(del.delivery_date).toLocaleDateString()}</td>
                  <td style={{ fontWeight: '600' }}>{del.employee_name}</td>
                  <td><span style={styles.clientTag}>{del.client_project}</span></td>
                  <td style={{ fontWeight: '500', maxWidth: '280px', whiteSpace: 'normal', wordWrap: 'break-word' }}>
                    {del.deliverable_name}
                  </td>
                  <td><span style={styles.platformBadge}>{del.platform_channel}</span></td>
                  <td>
                    {del.final_drive_link ? (
                      <a 
                        href={del.final_drive_link} 
                        target="_blank" 
                        rel="noreferrer" 
                        style={styles.driveLinkBtn}
                      >
                        <ExternalLink size={13} /> Open File
                      </a>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>No link</span>
                    )}
                  </td>
                  <td>
                    <div style={styles.approvalColumn}>
                      <span style={styles.approvalStatusLabel(del.client_approval)}>
                        {del.client_approval === 'Approved' && <CheckCircle size={12} style={{ marginRight: 3 }} />}
                        {del.client_approval}
                      </span>
                      
                      {/* Admin Actions */}
                      {isAdminOrDev && (
                        <div style={styles.adminActionButtonGroup}>
                          <button 
                            onClick={() => handleStatusChange(del, 'Approved')}
                            style={styles.miniApproveBtn}
                            title="Approve Work"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => handleStatusChange(del, 'Revision Requested')}
                            style={styles.miniRejectBtn}
                            title="Request Revision"
                          >
                            Revision
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={styles.notesBlock}>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>{del.notes}</div>
                      {del.client_approval === 'Revision Requested' && (
                        <div style={styles.revisionAlert}>
                          <strong>Revision details:</strong> {del.revision_status}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    {(isAdminOrDev || del.employee_id === currentUserProfile.id) && (
                      <button 
                        onClick={() => {
                          if (confirm('Delete this delivery register?')) {
                            onDeleteDelivery(del.id);
                          }
                        }}
                        style={styles.deleteBtn}
                        title="Delete entry"
                      >
                        <Trash2 size={14} color="var(--color-cancelled)" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredDeliveries.length === 0 && (
          <div style={styles.emptyTableMessage}>No final work submissions registered.</div>
        )}
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
  controlsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: 'var(--bg-glass)',
    gap: '16px',
    flexWrap: 'wrap'
  },
  searchBox: {
    flex: '1 1 300px'
  },
  searchInput: {
    width: '100%',
    padding: '8px 12px'
  },
  addBtn: {
    padding: '8px 16px',
    fontSize: 'var(--font-size-sm)'
  },
  formContainer: {
    padding: '24px',
    backgroundColor: 'var(--bg-glass)',
    animation: 'fadeIn 0.3s ease'
  },
  formHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '16px',
    borderBottom: '1px solid var(--border-subtle)',
    paddingBottom: '10px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  formRow: {
    display: 'flex',
    gap: '16px',
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  label: {
    display: 'block',
    fontSize: 'var(--font-size-xs)',
    fontWeight: '750',
    color: 'var(--color-text-secondary)',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    marginBottom: '6px'
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '10px'
  },
  clientTag: {
    padding: '2px 6px',
    fontSize: 'var(--font-size-sm)',
    backgroundColor: 'rgba(212, 175, 55, 0.05)',
    border: '1px solid rgba(212, 175, 55, 0.15)',
    borderRadius: '4px',
    color: 'var(--color-gold)',
    fontWeight: 'bold',
    whiteSpace: 'nowrap'
  },
  platformBadge: {
    fontSize: 'var(--font-size-sm)',
    padding: '2px 8px',
    backgroundColor: 'var(--bg-translucent-white)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '4px',
    color: 'var(--color-text-secondary)'
  },
  driveLinkBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'bold',
    color: 'var(--color-gold)'
  },
  approvalColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px'
  },
  approvalStatusLabel: (status) => {
    const isApp = status === 'Approved';
    const isRev = status === 'Revision Requested';
    return {
      fontSize: 'var(--font-size-xs)',
      fontWeight: 'bold',
      padding: '4px 10px',
      borderRadius: 'var(--radius-full)',
      display: 'inline-flex',
      alignItems: 'center',
      backgroundColor: isApp ? 'rgba(16, 185, 129, 0.15)' : isRev ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
      color: isApp ? '#10B981' : isRev ? '#EF4444' : '#F59E0B',
      textAlign: 'center'
    };
  },
  adminActionButtonGroup: {
    display: 'flex',
    gap: '4px'
  },
  miniApproveBtn: {
    padding: '3px 8px',
    fontSize: 'var(--font-size-xs)',
    fontWeight: '600',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    border: '1px solid #10B981',
    color: 'var(--color-text-primary)',
    borderRadius: '3px',
    cursor: 'pointer'
  },
  miniRejectBtn: {
    padding: '3px 8px',
    fontSize: 'var(--font-size-xs)',
    fontWeight: '600',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid #EF4444',
    color: 'var(--color-text-primary)',
    borderRadius: '3px',
    cursor: 'pointer'
  },
  notesBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  revisionAlert: {
    fontSize: 'var(--font-size-xs)',
    padding: '6px 10px',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '4px',
    color: '#F87171'
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px'
  },
  emptyTableMessage: {
    padding: '40px 0',
    textAlign: 'center',
    color: 'var(--color-text-muted)'
  }
};
