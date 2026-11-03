import React, { useState } from 'react';
import { Trash2, Link as LinkIcon } from 'lucide-react';
import {
  CONTENT_TYPES, PLATFORMS, contentTypeOf, parsePlatforms, workTypeFor,
  dateKeyOf, makeTaskId, statusColor
} from '../contentCalendarUtils';

const CUSTOM = '__custom__';
const ALL_STATUSES = ['Pending Approval', 'Approved', 'In Progress', 'Delivered'];

// Create / edit one content-calendar item (a row of the tasks table).
export default function ContentItemModal({
  task = null,
  defaultDate,
  defaultClient = '',
  defaultType = '',
  tasks = [],
  clients = [],
  profiles = [],
  currentUserProfile = {},
  hasAssignPrivilege,
  onSubmit,
  onDelete,
  onClose
}) {
  const isNew = !task;
  const presetType = (value) => CONTENT_TYPES.some(c => c.value === value);
  const initialType = task ? contentTypeOf(task) : (defaultType || 'Static Post');

  const [clientName, setClientName] = useState(task ? (task.client_project || '') : defaultClient);
  const [typeChoice, setTypeChoice] = useState(presetType(initialType) ? initialType : CUSTOM);
  const [customType, setCustomType] = useState(presetType(initialType) ? '' : initialType);
  const [platforms, setPlatforms] = useState(task ? parsePlatforms(task.platforms) : []);
  const [referenceLink, setReferenceLink] = useState(task?.reference_link || '');
  const [status, setStatus] = useState(task?.status || (hasAssignPrivilege ? 'Pending Approval' : 'In Progress'));
  const [priority, setPriority] = useState(task?.priority || 'Normal');
  const [assignee, setAssignee] = useState(task ? (task.employee_id || '') : (hasAssignPrivilege ? '' : currentUserProfile.id));
  const [contentId, setContentId] = useState(task?.content_id || '');
  const [title, setTitle] = useState(task?.title || '');
  const [concept, setConcept] = useState(task?.concept || '');
  const [caption, setCaption] = useState(task?.caption || '');
  const [imageWording, setImageWording] = useState(task?.image_wording || '');
  const [date, setDate] = useState(task ? dateKeyOf(task.due_date) : defaultDate);
  const [adminReply, setAdminReply] = useState(task?.admin_reply || '');
  const [saving, setSaving] = useState(false);

  const isCreator = !!task?.created_by && task.created_by === currentUserProfile?.id;
  const isAssignee = !!task && task.employee_id === currentUserProfile?.id;
  const canEditCore = hasAssignPrivilege || isNew || isCreator;
  const canChangeStatus = canEditCore || isAssignee;
  const canDelete = !isNew && (hasAssignPrivilege || isCreator);
  const readOnly = !canEditCore && !canChangeStatus;

  const statusChoices = hasAssignPrivilege
    ? ALL_STATUSES
    : Array.from(new Set(['In Progress', 'Delivered', status]));

  const effectiveType = typeChoice === CUSTOM ? customType.trim() : typeChoice;

  const togglePlatform = (name) => {
    setPlatforms(prev => prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clientName.trim()) { alert('Choose a client.'); return; }
    if (!effectiveType) { alert('Enter the content type.'); return; }
    if (!title.trim()) { alert('Title is required.'); return; }
    if (!date) { alert('Pick a date.'); return; }

    const clientObj = clients.find(c => c.name === clientName);
    const effectiveAssignee = hasAssignPrivilege ? assignee : (task ? task.employee_id : currentUserProfile.id);
    const profile = profiles.find(p => p.id === effectiveAssignee);
    const progress = status === 'Delivered' ? 1.0 : (task?.progress || 0);

    const content = {
      content_type: effectiveType,
      platforms,
      content_id: contentId.trim(),
      concept,
      caption,
      image_wording: imageWording,
      reference_link: referenceLink.trim()
    };
    if (hasAssignPrivilege) content.admin_reply = adminReply;

    let taskObj;
    if (isNew) {
      const used = new Set(tasks.map(t => t.id));
      taskObj = {
        id: makeTaskId(date, used),
        created_at: new Date().toISOString(),
        date_assigned: date,
        start_date: date,
        due_date: date,
        employee_id: profile ? profile.id : null,
        employee_name: profile ? profile.full_name : 'Unassigned',
        client_id: clientObj ? clientObj.id : null,
        client_project: clientName,
        work_type: workTypeFor(effectiveType),
        title: title.trim(),
        priority,
        status,
        progress,
        last_updated: new Date().toISOString(),
        ...content
      };
      if (!hasAssignPrivilege) taskObj.created_by = currentUserProfile.id;
    } else if (canEditCore) {
      taskObj = {
        id: task.id,
        employee_id: profile ? profile.id : null,
        employee_name: profile ? profile.full_name : 'Unassigned',
        client_id: clientObj ? clientObj.id : null,
        client_project: clientName,
        work_type: workTypeFor(effectiveType),
        title: title.trim(),
        priority,
        status,
        progress,
        due_date: date,
        last_updated: new Date().toISOString(),
        ...content
      };
      if (!task.start_date || dateKeyOf(task.start_date) > date) taskObj.start_date = date;
    } else {
      // Assignee on someone else's item: status only.
      taskObj = { id: task.id, status, progress, last_updated: new Date().toISOString() };
    }

    setSaving(true);
    const result = await onSubmit(taskObj, { isNew, previous: task, profile });
    setSaving(false);
    if (result && result.success === false) {
      alert(result.error || 'Could not save this content item.');
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    await onDelete(task.id);
    onClose();
  };

  const lock = !canEditCore;

  return (
    <div style={s.overlay} onClick={onClose}>
      <div className="glass-panel" style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.header}>
          <div>
            <h3 style={{ margin: 0 }}>{isNew ? 'Create Content' : 'Edit Content'}</h3>
            <span style={{ ...s.statusPill, color: statusColor(status), borderColor: statusColor(status) }}>{status}</span>
            {!isNew && <span style={s.idTag}>{task.id}</span>}
          </div>
          <button type="button" onClick={onClose} style={s.closeBtn}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} style={s.form}>
          <div>
            <label style={s.label}>Client</label>
            <select className="form-input" required disabled={lock} value={clientName} onChange={(e) => setClientName(e.target.value)}>
              <option value="">Choose client</option>
              {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              <option value="Gloma Internal">Gloma Internal</option>
            </select>
          </div>

          <div style={s.row}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label style={s.label}>Content type</label>
              <select className="form-input" disabled={lock} value={typeChoice} onChange={(e) => setTypeChoice(e.target.value)}>
                {CONTENT_TYPES.map(c => <option key={c.value} value={c.value}>{c.value}</option>)}
                <option value={CUSTOM}>Custom type…</option>
              </select>
              {typeChoice === CUSTOM && (
                <input
                  className="form-input"
                  style={{ marginTop: '6px' }}
                  disabled={lock}
                  placeholder="e.g. Gentleman's Guide"
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label style={s.label}>Priority</label>
              <select className="form-input" disabled={lock} value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="High">High</option>
                <option value="Normal">Normal</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label style={s.label}>Platforms <span style={s.hint}>(pick one or more)</span></label>
            <div style={s.platformRow}>
              {PLATFORMS.map(p => {
                const on = platforms.includes(p.value);
                return (
                  <button
                    key={p.value}
                    type="button"
                    disabled={lock}
                    onClick={() => togglePlatform(p.value)}
                    style={{
                      ...s.platformBtn,
                      borderColor: on ? p.color : 'var(--border-subtle)',
                      backgroundColor: on ? `${p.color}26` : 'transparent',
                      color: on ? p.color : 'var(--color-text-secondary)'
                    }}
                  >
                    <span style={{ ...s.platformDot, backgroundColor: p.color }} />
                    {p.value}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label style={s.label}><LinkIcon size={11} style={{ verticalAlign: '-1px' }} /> Reference / referral link</label>
            <input className="form-input" disabled={lock} placeholder="https://youtube.com/..." value={referenceLink} onChange={(e) => setReferenceLink(e.target.value)} />
          </div>

          <div style={s.row}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label style={s.label}>Status</label>
              <select className="form-input" disabled={!canChangeStatus} value={status} onChange={(e) => setStatus(e.target.value)}>
                {statusChoices.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label style={s.label}>Assign task to</label>
              {hasAssignPrivilege ? (
                <select className="form-input" disabled={lock} value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                  <option value="">Unassigned</option>
                  {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name} ({p.role})</option>)}
                </select>
              ) : (
                <div className="form-input" style={{ opacity: 0.8 }}>
                  {(profiles.find(p => p.id === effectiveAssigneeId(task, assignee, currentUserProfile)) || currentUserProfile).full_name || 'Me'}
                </div>
              )}
            </div>
          </div>

          <div style={s.row}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label style={s.label}>Title</label>
              <input className="form-input" required disabled={lock} placeholder="Short headline" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label style={s.label}>Content ID</label>
              <input className="form-input" disabled={lock} placeholder="POST-001" value={contentId} onChange={(e) => setContentId(e.target.value)} />
            </div>
          </div>

          <div>
            <label style={s.label}>Concept overview</label>
            <textarea className="form-input" rows={3} disabled={lock} placeholder="Concept..." value={concept} onChange={(e) => setConcept(e.target.value)} />
          </div>

          <div>
            <label style={s.label}>Caption</label>
            <textarea className="form-input" rows={3} disabled={lock} placeholder="Caption..." value={caption} onChange={(e) => setCaption(e.target.value)} />
          </div>

          <div>
            <label style={s.label}>Image wording / video script</label>
            <textarea className="form-input" rows={3} disabled={lock} placeholder="Text on image or script..." value={imageWording} onChange={(e) => setImageWording(e.target.value)} />
          </div>

          <div>
            <label style={s.label}>Date</label>
            <input type="date" className="form-input" required disabled={lock} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div style={s.adminBox}>
            <label style={{ ...s.label, color: 'var(--color-gold)' }}>Admin reply</label>
            {hasAssignPrivilege ? (
              <textarea className="form-input" rows={2} placeholder="Admin: reply here..." value={adminReply} onChange={(e) => setAdminReply(e.target.value)} />
            ) : (
              <div style={{ fontSize: 'var(--font-size-sm)', color: adminReply ? 'var(--color-text-primary)' : 'var(--color-text-muted)', whiteSpace: 'pre-wrap' }}>
                {adminReply || 'No reply from admin yet.'}
              </div>
            )}
          </div>

          <div style={s.actions}>
            {canDelete && (
              <button type="button" onClick={handleDelete} style={s.deleteBtn}>
                <Trash2 size={14} /> Delete
              </button>
            )}
            <span style={{ flex: 1 }} />
            <button type="button" onClick={onClose} className="btn-secondary">Close</button>
            {!readOnly && <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>}
          </div>
        </form>
      </div>
    </div>
  );
}

const effectiveAssigneeId = (task, assignee, me) => (task ? task.employee_id : (assignee || me?.id));

const s = {
  overlay: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 999, backdropFilter: 'blur(4px)', padding: '16px'
  },
  modal: {
    width: '100%', maxWidth: '560px', padding: 'clamp(16px, 4vw, 24px)',
    backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-glass)', maxHeight: '92vh', overflowY: 'auto'
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' },
  closeBtn: { fontSize: 'var(--font-size-2xl)', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' },
  statusPill: {
    display: 'inline-block', marginTop: '6px', padding: '2px 8px', fontSize: '10px', fontWeight: 'bold',
    textTransform: 'uppercase', border: '1px solid', borderRadius: '999px'
  },
  idTag: { marginLeft: '8px', fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'monospace' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  row: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  label: {
    display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'bold', color: 'var(--color-text-secondary)',
    marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em'
  },
  hint: { fontWeight: 'normal', textTransform: 'none', letterSpacing: 0, color: 'var(--color-text-muted)' },
  platformRow: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  platformBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '999px',
    border: '1px solid', cursor: 'pointer', fontSize: 'var(--font-size-sm)', fontWeight: 600, background: 'none'
  },
  platformDot: { width: '8px', height: '8px', borderRadius: '50%' },
  adminBox: {
    padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px dashed rgba(212,175,55,0.35)',
    backgroundColor: 'rgba(212,175,55,0.06)'
  },
  actions: { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' },
  deleteBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: '1px solid rgba(239,68,68,0.5)',
    color: '#EF4444', borderRadius: 'var(--radius-sm)', padding: '8px 12px', cursor: 'pointer', fontSize: 'var(--font-size-sm)'
  }
};
