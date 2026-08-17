import React, { useState } from 'react';
import { Wallet, TrendingUp, TrendingDown, CheckCircle2, XCircle, Filter, Pencil } from 'lucide-react';

const localTranslations = {
  en: {
    title: "Company Finance",
    subtitle: "Website project payments — revenue collected and outstanding.",
    noAccess: "Only Admin, Manager, Coordinator & Accountant, or Developer accounts can view company finances.",
    totalCollected: "Total Collected",
    totalOutstanding: "Total Outstanding",
    paidCount: "Paid Projects",
    unpaidCount: "Unpaid Projects",
    allClients: "All Clients",
    allStatus: "All Payment Status",
    paid: "Paid",
    notPaid: "Not Paid",
    taskId: "Task ID",
    client: "Client",
    title2: "Website Project",
    assignee: "Assignee",
    status: "Job Status",
    payment: "Payment",
    amount: "Amount (LKR)",
    markPaid: "Mark Paid",
    markNotPaid: "Mark Not Paid",
    editAmount: "Edit",
    save: "Save",
    cancel: "Cancel",
    empty: "No website projects found."
  },
  si: {
    title: "සමාගමේ ගිණුම්කරණය",
    subtitle: "වෙබ්සයිට් ව්‍යාපෘති ගෙවීම් — එකතු කළ මුදල් සහ ගෙවීමට ඇති මුදල්.",
    noAccess: "Company Finance බලන්න පුළුවන් Admin, Manager, Coordinator & Accountant, හෝ Developer ගිණුම් වලට පමණි.",
    totalCollected: "එකතු කළ මුළු මුදල",
    totalOutstanding: "ගෙවීමට ඇති මුළු මුදල",
    paidCount: "ගෙවූ ව්‍යාපෘති",
    unpaidCount: "නොගෙවූ ව්‍යාපෘති",
    allClients: "සියලුම සේවාදායකයින්",
    allStatus: "සියලුම ගෙවීම් තත්ව",
    paid: "ගෙවා ඇත",
    notPaid: "ගෙවා නැත",
    taskId: "කාර්ය කේතය",
    client: "සේවාදායකයා",
    title2: "වෙබ්සයිට් ව්‍යාපෘතිය",
    assignee: "පවරන ලද්දේ",
    status: "වැඩ තත්වය",
    payment: "ගෙවීම",
    amount: "මුදල (LKR)",
    markPaid: "ගෙවා ඇති බව සලකුණු කරන්න",
    markNotPaid: "ගෙවා නැති බව සලකුණු කරන්න",
    editAmount: "සංස්කරණය",
    save: "සුරකින්න",
    cancel: "අවලංගු කරන්න",
    empty: "වෙබ්සයිට් ව්‍යාපෘති කිසිවක් හමු නොවීය."
  },
  ta: {
    title: "நிறுவன நிதி",
    subtitle: "வலைத்தள திட்ட கட்டணங்கள் — வசூலிக்கப்பட்ட வருவாய் மற்றும் நிலுவை.",
    noAccess: "நிர்வாகி, மேலாளர், Coordinator & Accountant, அல்லது டெவலப்பர் கணக்குகள் மட்டுமே நிறுவன நிதியைப் பார்க்க முடியும்.",
    totalCollected: "மொத்த வசூலிக்கப்பட்டது",
    totalOutstanding: "மொத்த நிலுவை",
    paidCount: "செலுத்தப்பட்ட திட்டங்கள்",
    unpaidCount: "செலுத்தப்படாத திட்டங்கள்",
    allClients: "அனைத்து வாடிக்கையாளர்கள்",
    allStatus: "அனைத்து கட்டண நிலை",
    paid: "செலுத்தப்பட்டது",
    notPaid: "செலுத்தப்படவில்லை",
    taskId: "பணி குறியீடு",
    client: "வாடிக்கையாளர்",
    title2: "வலைத்தள திட்டம்",
    assignee: "ஒதுக்கப்பட்டவர்",
    status: "பணி நிலை",
    payment: "கட்டணம்",
    amount: "தொகை (LKR)",
    markPaid: "செலுத்தப்பட்டதாகக் குறி",
    markNotPaid: "செலுத்தப்படவில்லை எனக் குறி",
    editAmount: "திருத்து",
    save: "சேமி",
    cancel: "ரத்து செய்",
    empty: "வலைத்தள திட்டங்கள் எதுவும் இல்லை."
  }
};

export default function Finance({
  tasks = [],
  clients = [],
  currentUserProfile = {},
  onSaveTask,
  lang = 'en'
}) {
  const t = localTranslations[lang] || localTranslations.en;

  const userRole = currentUserProfile?.role || 'Employee';
  const hasAccess = ['Developer', 'Admin', 'Manager', 'Coordinator & Accountant'].includes(userRole);

  const [filterClient, setFilterClient] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingAmount, setEditingAmount] = useState('');

  if (!hasAccess) {
    return (
      <div className="glass-panel animate-fade-in" style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        {t.noAccess}
      </div>
    );
  }

  const websiteTasks = tasks.filter(task => task.work_type === 'Website');

  const visibleTasks = websiteTasks.filter(task => {
    const matchesClient = !filterClient || task.client_id === filterClient || task.client_project === filterClient;
    const matchesStatus = !filterStatus || (task.payment_status || 'Not Paid') === filterStatus;
    return matchesClient && matchesStatus;
  });

  const totalCollected = websiteTasks
    .filter(t2 => t2.payment_status === 'Paid')
    .reduce((sum, t2) => sum + (Number(t2.payment_amount) || 0), 0);

  const totalOutstanding = websiteTasks
    .filter(t2 => t2.payment_status !== 'Paid')
    .reduce((sum, t2) => sum + (Number(t2.payment_amount) || 0), 0);

  const paidCount = websiteTasks.filter(t2 => t2.payment_status === 'Paid').length;
  const unpaidCount = websiteTasks.length - paidCount;

  const togglePayment = (task) => {
    onSaveTask({
      ...task,
      payment_status: task.payment_status === 'Paid' ? 'Not Paid' : 'Paid'
    });
  };

  const startEditAmount = (task) => {
    setEditingId(task.id);
    setEditingAmount(task.payment_amount != null ? String(task.payment_amount) : '');
  };

  const saveAmount = (task) => {
    onSaveTask({
      ...task,
      payment_amount: editingAmount !== '' ? parseFloat(editingAmount) : null
    });
    setEditingId(null);
    setEditingAmount('');
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      <div>
        <h2 style={styles.pageTitle}>
          <Wallet size={22} color="var(--color-gold)" /> {t.title}
        </h2>
        <p style={styles.pageSubtitle}>{t.subtitle}</p>
      </div>

      <div style={styles.summaryRow}>
        <div className="glass-panel" style={styles.summaryCard}>
          <div style={styles.summaryIconWrap}>
            <TrendingUp size={20} color="#10B981" />
          </div>
          <div>
            <div style={styles.summaryLabel}>{t.totalCollected}</div>
            <div style={{ ...styles.summaryValue, color: '#10B981' }}>LKR {totalCollected.toLocaleString()}</div>
          </div>
        </div>
        <div className="glass-panel" style={styles.summaryCard}>
          <div style={styles.summaryIconWrap}>
            <TrendingDown size={20} color="#EF4444" />
          </div>
          <div>
            <div style={styles.summaryLabel}>{t.totalOutstanding}</div>
            <div style={{ ...styles.summaryValue, color: '#EF4444' }}>LKR {totalOutstanding.toLocaleString()}</div>
          </div>
        </div>
        <div className="glass-panel" style={styles.summaryCard}>
          <div style={styles.summaryIconWrap}>
            <CheckCircle2 size={20} color="var(--color-gold)" />
          </div>
          <div>
            <div style={styles.summaryLabel}>{t.paidCount}</div>
            <div style={{ ...styles.summaryValue, color: 'var(--color-gold)' }}>{paidCount}</div>
          </div>
        </div>
        <div className="glass-panel" style={styles.summaryCard}>
          <div style={styles.summaryIconWrap}>
            <XCircle size={20} color="var(--color-text-secondary)" />
          </div>
          <div>
            <div style={styles.summaryLabel}>{t.unpaidCount}</div>
            <div style={{ ...styles.summaryValue, color: 'var(--color-text-primary)' }}>{unpaidCount}</div>
          </div>
        </div>
      </div>

      <div style={styles.filtersRow}>
        <div style={styles.filterItem} className="glass-panel">
          <Filter size={13} color="var(--color-gold)" />
          <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)} style={styles.selectFilter}>
            <option value="">{t.allClients}</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div style={styles.filterItem} className="glass-panel">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={styles.selectFilter}>
            <option value="">{t.allStatus}</option>
            <option value="Paid">{t.paid}</option>
            <option value="Not Paid">{t.notPaid}</option>
          </select>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '8px' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t.taskId}</th>
                <th>{t.client}</th>
                <th>{t.title2}</th>
                <th>{t.assignee}</th>
                <th>{t.status}</th>
                <th>{t.amount}</th>
                <th>{t.payment}</th>
              </tr>
            </thead>
            <tbody>
              {visibleTasks.map(task => {
                const isPaid = task.payment_status === 'Paid';
                return (
                  <tr key={task.id}>
                    <td style={{ fontWeight: 'bold', color: 'var(--color-gold)' }}>{task.id}</td>
                    <td>{task.client_project}</td>
                    <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</td>
                    <td>{task.employee_name || '—'}</td>
                    <td>
                      <span className="badge" style={{
                        backgroundColor:
                          task.status === 'Delivered' ? 'rgba(16,185,129,0.15)' :
                          task.status === 'In Progress' ? 'rgba(59,130,246,0.15)' :
                          task.status === 'Approved' ? 'rgba(139,92,246,0.15)' : 'rgba(245,158,11,0.15)',
                        color:
                          task.status === 'Delivered' ? '#10B981' :
                          task.status === 'In Progress' ? '#3B82F6' :
                          task.status === 'Approved' ? '#8B5CF6' : '#F59E0B'
                      }}>
                        {task.status}
                      </span>
                    </td>
                    <td>
                      {editingId === task.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editingAmount}
                            onChange={(e) => setEditingAmount(e.target.value)}
                            className="form-input"
                            style={{ width: '110px', padding: '4px 8px', fontSize: 'var(--font-size-sm)' }}
                          />
                          <button onClick={() => saveAmount(task)} className="btn-primary" style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)' }}>
                            {t.save}
                          </button>
                          <button onClick={() => setEditingId(null)} className="btn-secondary" style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)' }}>
                            {t.cancel}
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 600 }}>
                            {task.payment_amount != null ? `LKR ${Number(task.payment_amount).toLocaleString()}` : '—'}
                          </span>
                          <button onClick={() => startEditAmount(task)} style={styles.iconBtn} title={t.editAmount}>
                            <Pencil size={12} color="var(--color-text-secondary)" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => togglePayment(task)}
                        style={{
                          ...styles.paymentToggle,
                          backgroundColor: isPaid ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                          color: isPaid ? '#10B981' : '#EF4444',
                          borderColor: isPaid ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'
                        }}
                        title={isPaid ? t.markNotPaid : t.markPaid}
                      >
                        {isPaid ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                        {isPaid ? t.paid : t.notPaid}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {visibleTasks.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    {t.empty}
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
    gap: '18px'
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
  summaryRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px'
  },
  summaryCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px'
  },
  summaryIconWrap: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--bg-translucent-white)',
    flexShrink: 0
  },
  summaryLabel: {
    fontSize: 'var(--font-size-xs)',
    fontWeight: '700',
    color: 'var(--color-text-secondary)',
    letterSpacing: '0.05em',
    textTransform: 'uppercase'
  },
  summaryValue: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: '800',
    marginTop: '2px'
  },
  filtersRow: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  filterItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'var(--bg-badge-dark)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)',
    padding: '6px 12px'
  },
  selectFilter: {
    background: 'none',
    border: 'none',
    outline: 'none',
    color: 'var(--color-text-primary)',
    fontSize: 'var(--font-size-sm)',
    cursor: 'pointer'
  },
  paymentToggle: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '5px 10px',
    borderRadius: 'var(--radius-full)',
    border: '1px solid',
    fontSize: 'var(--font-size-xs)',
    fontWeight: '700',
    cursor: 'pointer'
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px',
    display: 'flex',
    alignItems: 'center'
  }
};
