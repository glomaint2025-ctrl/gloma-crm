import React, { useState } from 'react';
import { Target, Plus, Trash2, Pencil, Check, ChevronDown, ChevronUp } from 'lucide-react';

const WORK_TYPES = [
  { value: 'Post', label: 'Posts' },
  { value: 'Reel', label: 'Reels / Videos' },
  { value: 'Website', label: 'Website work' },
  { value: 'Other', label: 'Other' }
];

const workTypeLabel = (value) => (WORK_TYPES.find(w => w.value === value) || { label: value }).label;

const monthKeyOf = (dateStr) => String(dateStr || '').substring(0, 7);

// Monthly content targets, e.g. "10 posts for Russel's personal page, 5 for Russel Dimbula".
// Progress is counted from the tasks that employees schedule on the content calendar.
export default function MonthlyPlan({
  monthKey,
  monthLabel,
  plans = [],
  tasks = [],
  clients = [],
  profiles = [],
  currentUserProfile = {},
  filterEmployeeId = '',
  onSavePlan,
  onDeletePlan
}) {
  const userRole = currentUserProfile?.role || 'Employee';
  const canManageAll = ['Developer', 'Admin', 'Manager', 'Coordinator & Accountant'].includes(userRole);

  const [expanded, setExpanded] = useState(true);
  const [clientId, setClientId] = useState('');
  const [workType, setWorkType] = useState('Post');
  const [targetCount, setTargetCount] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTarget, setEditTarget] = useState('');

  const visiblePlans = plans.filter(plan => {
    if (plan.month !== monthKey) return false;
    if (!canManageAll) return plan.employee_id === currentUserProfile.id;
    return !filterEmployeeId || plan.employee_id === filterEmployeeId;
  });

  const progressFor = (plan) => {
    const matching = tasks.filter(task =>
      task.employee_id === plan.employee_id &&
      task.work_type === plan.work_type &&
      monthKeyOf(task.due_date) === monthKey &&
      (task.client_id ? task.client_id === plan.client_id : task.client_project === plan.client_name)
    );
    return {
      scheduled: matching.length,
      delivered: matching.filter(task => task.status === 'Delivered').length
    };
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');

    const client = clients.find(c => c.id === clientId);
    const count = parseInt(targetCount, 10);
    if (!client) {
      setError('Choose the client or page this target is for.');
      return;
    }
    if (!(count > 0)) {
      setError('Enter how many items you plan to deliver this month.');
      return;
    }

    const ownerId = canManageAll && employeeId ? employeeId : currentUserProfile.id;
    const owner = profiles.find(p => p.id === ownerId) || currentUserProfile;

    setSaving(true);
    const result = await onSavePlan({
      month: monthKey,
      employee_id: ownerId,
      employee_name: owner.full_name,
      client_id: client.id,
      client_name: client.name,
      work_type: workType,
      target_count: count
    });
    setSaving(false);

    if (result && result.success === false) {
      setError(`Could not save target: ${result.error || 'unknown error'}`);
      return;
    }
    setTargetCount('');
  };

  const handleSaveEdit = async (plan) => {
    const count = parseInt(editTarget, 10);
    if (!(count > 0)) return;
    const result = await onSavePlan({ id: plan.id, target_count: count });
    if (result && result.success === false) {
      alert(`Could not update target: ${result.error || ''}`);
      return;
    }
    setEditingId(null);
  };

  const handleDelete = async (plan) => {
    if (!confirm(`Remove the target for ${plan.client_name} (${workTypeLabel(plan.work_type)})?`)) return;
    const result = await onDeletePlan(plan.id);
    if (result && result.success === false) alert(`Could not remove target: ${result.error || ''}`);
  };

  return (
    <div className="glass-panel" style={styles.panel}>
      <button type="button" style={styles.headerBtn} onClick={() => setExpanded(v => !v)}>
        <span style={styles.headerTitle}>
          <Target size={18} color="var(--color-gold)" /> Monthly targets - {monthLabel}
        </span>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {expanded && (
        <div style={styles.content}>
          <form onSubmit={handleAdd} style={styles.addRow}>
            {canManageAll && (
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="form-input"
                style={styles.field}
              >
                <option value="">For me ({currentUserProfile.full_name})</option>
                {profiles.filter(p => p.id !== currentUserProfile.id).map(p => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </select>
            )}
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="form-input" style={styles.field}>
              <option value="">Client / page...</option>
              {clients.filter(c => c.status === 'Active').map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select value={workType} onChange={(e) => setWorkType(e.target.value)} className="form-input" style={styles.field}>
              {WORK_TYPES.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
            </select>
            <input
              type="number"
              min="1"
              placeholder="How many?"
              value={targetCount}
              onChange={(e) => setTargetCount(e.target.value)}
              className="form-input"
              style={{ ...styles.field, maxWidth: '120px' }}
            />
            <button type="submit" className="btn-primary" disabled={saving}>
              <Plus size={14} /> Add target
            </button>
          </form>
          {error && <div style={styles.error}>{error}</div>}

          {visiblePlans.length === 0 ? (
            <div style={styles.empty}>
              No targets for this month yet. Add what you plan to deliver (for example 10 posts for one page and 5 for another),
              then schedule each item on the calendar below.
            </div>
          ) : (
            <div style={styles.list}>
              {visiblePlans.map(plan => {
                const { scheduled, delivered } = progressFor(plan);
                const target = plan.target_count || 1;
                const scheduledPct = Math.min(100, Math.round((scheduled / target) * 100));
                const deliveredPct = Math.min(100, Math.round((delivered / target) * 100));
                const isOwner = plan.employee_id === currentUserProfile.id;
                return (
                  <div key={plan.id} style={styles.planRow}>
                    <div style={styles.planInfo}>
                      <div style={{ fontWeight: 600 }}>
                        {plan.client_name} <span style={styles.type}>{workTypeLabel(plan.work_type)}</span>
                      </div>
                      {(canManageAll || !isOwner) && (
                        <div style={styles.owner}>{plan.employee_name}</div>
                      )}
                    </div>

                    <div style={styles.barWrap}>
                      <div style={styles.barTrack}>
                        <div style={{ ...styles.barScheduled, width: `${scheduledPct}%` }} />
                        <div style={{ ...styles.barDelivered, width: `${deliveredPct}%` }} />
                      </div>
                      <div style={styles.barLabel}>
                        {scheduled} scheduled / {target} target - {delivered} delivered
                      </div>
                    </div>

                    {(isOwner || canManageAll) && (
                      <div style={styles.actions}>
                        {editingId === plan.id ? (
                          <>
                            <input
                              type="number"
                              min="1"
                              value={editTarget}
                              onChange={(e) => setEditTarget(e.target.value)}
                              className="form-input"
                              style={{ width: '70px', padding: '4px 8px' }}
                            />
                            <button type="button" style={styles.iconBtn} title="Save" onClick={() => handleSaveEdit(plan)}>
                              <Check size={15} color="#10B981" />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            style={styles.iconBtn}
                            title="Change target"
                            onClick={() => { setEditingId(plan.id); setEditTarget(String(plan.target_count)); }}
                          >
                            <Pencil size={14} color="var(--color-gold)" />
                          </button>
                        )}
                        <button type="button" style={styles.iconBtn} title="Remove" onClick={() => handleDelete(plan)}>
                          <Trash2 size={14} color="var(--color-cancelled)" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  panel: { padding: 0, overflow: 'hidden' },
  headerBtn: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 20px',
    background: 'none',
    border: 'none',
    color: 'var(--color-text-primary)',
    cursor: 'pointer'
  },
  headerTitle: { display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, fontSize: 'var(--font-size-md)' },
  content: { padding: '0 20px 18px', display: 'flex', flexDirection: 'column', gap: '12px' },
  addRow: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' },
  field: { flex: '1 1 150px', minWidth: '130px', width: 'auto' },
  error: { color: 'var(--color-cancelled)', fontSize: 'var(--font-size-sm)' },
  empty: { color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' },
  list: { display: 'flex', flexDirection: 'column', gap: '10px' },
  planRow: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    flexWrap: 'wrap',
    padding: '10px 12px',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)'
  },
  planInfo: { flex: '1 1 180px', minWidth: '160px' },
  type: {
    fontSize: 'var(--font-size-xs)',
    fontWeight: 600,
    color: 'var(--color-gold)',
    marginLeft: '6px'
  },
  owner: { fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' },
  barWrap: { flex: '2 1 240px', minWidth: '200px' },
  barTrack: {
    position: 'relative',
    height: '8px',
    borderRadius: '4px',
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden'
  },
  barScheduled: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(59,130,246,0.55)' },
  barDelivered: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#10B981' },
  barLabel: { fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: '5px' },
  actions: { display: 'flex', alignItems: 'center', gap: '6px' },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }
};
