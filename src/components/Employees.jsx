import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
  KeyRound,
  Link2,
  Paperclip,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { supabase, isUsingMock } from '../supabaseClient';
import { formatMoney } from '../invoiceUtils';
import {
  allowanceItems,
  daysUntil,
  formatService,
  gratuityEstimate,
  toLocalDateStr,
  round2
} from '../payrollUtils';

const BUCKET = 'finance-docs';
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const EMPLOYMENT_TYPES = ['Permanent', 'Probation', 'Contract', 'Part-time', 'Intern'];
const DOC_TYPES = ['Contract', 'NIC', 'Certificate', 'Resume', 'Other'];
const ACCOUNT_ROLES = [
  'Employee',
  'Editor',
  'Social Media Executive',
  'SMM & Developer',
  'Coordinator & Accountant',
  'Coordinator',
  'Marketing Executive',
  'Manager',
  'Admin'
];

const blankLine = () => ({ label: '', amount: '', epf: false });

const blankForm = (settings) => ({
  id: null,
  profile_id: null,
  full_name: '',
  nic: '',
  date_of_birth: '',
  phone: '',
  email: '',
  address: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  designation: '',
  department: '',
  employment_type: 'Permanent',
  join_date: toLocalDateStr(),
  probation_end_date: '',
  contract_end_date: '',
  status: 'Active',
  end_date: '',
  end_reason: '',
  bank_name: '',
  bank_branch: '',
  bank_account_no: '',
  bank_account_name: '',
  epf_no: '',
  notes: '',
  basic_salary: '',
  allowances: [blankLine()],
  epf_enabled: !!settings?.default_epf_enabled,
  etf_enabled: !!settings?.default_etf_enabled,
  apit_enabled: !!settings?.default_apit_enabled,
  salary_id: null
});

const EMPLOYEE_COLUMNS = [
  'full_name', 'nic', 'date_of_birth', 'phone', 'email', 'address', 'emergency_contact_name',
  'emergency_contact_phone', 'designation', 'department', 'employment_type', 'join_date',
  'probation_end_date', 'contract_end_date', 'status', 'end_date', 'end_reason', 'bank_name',
  'bank_branch', 'bank_account_no', 'bank_account_name', 'epf_no', 'notes'
];

const DATE_COLUMNS = ['date_of_birth', 'join_date', 'probation_end_date', 'contract_end_date', 'end_date'];

function Field({ label, children, wide }) {
  return (
    <div style={{ flex: wide ? '2 1 260px' : '1 1 180px', minWidth: '150px' }}>
      <label style={s.label}>{label}</label>
      {children}
    </div>
  );
}

export default function Employees({
  employees = [],
  salaries = [],
  runs = [],
  profiles = [],
  settings,
  currentUserProfile = {},
  onCreateMemberAccount,
  onReload
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [documents, setDocuments] = useState([]);
  const [docForm, setDocForm] = useState({ doc_type: DOC_TYPES[0], file: null });
  const [accountForm, setAccountForm] = useState(null);
  const [linkChoice, setLinkChoice] = useState('');

  const salaryOf = (employeeId) => salaries.find(sal => sal.employee_id === employeeId) || null;
  const profileOf = (profileId) => profiles.find(p => p.id === profileId) || null;

  const visible = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return employees
      .filter(e => !statusFilter || e.status === statusFilter)
      .filter(e => !q || [e.full_name, e.designation, e.department, e.nic, e.phone, e.email]
        .map(v => (v || '').toLowerCase()).join(' ').includes(q));
  }, [employees, searchQuery, statusFilter]);

  const counts = useMemo(() => ({
    active: employees.filter(e => e.status === 'Active').length,
    withLogin: employees.filter(e => e.status === 'Active' && e.profile_id).length,
    noSalary: employees.filter(e => e.status === 'Active' && !salaries.some(sal => sal.employee_id === e.id)).length
  }), [employees, salaries]);

  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const loadDocuments = async (employeeId) => {
    const { data } = await supabase.from('employee_documents').select('*').eq('employee_id', employeeId);
    setDocuments((data || []).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))));
  };

  const openNew = () => {
    setFormError('');
    setDocuments([]);
    setAccountForm(null);
    setForm(blankForm(settings));
  };

  const openEdit = (employee) => {
    const salary = salaryOf(employee.id);
    const items = allowanceItems(salary);
    setFormError('');
    setAccountForm(null);
    setLinkChoice('');
    setForm({
      ...blankForm(settings),
      ...Object.fromEntries(EMPLOYEE_COLUMNS.map(col => [col, employee[col] === null || employee[col] === undefined ? '' : String(employee[col])])),
      id: employee.id,
      profile_id: employee.profile_id,
      basic_salary: salary ? String(salary.basic_salary) : '',
      allowances: items.length ? items.map(a => ({ label: a.label, amount: String(a.amount), epf: a.epf })) : [blankLine()],
      epf_enabled: salary ? !!salary.epf_enabled : !!settings?.default_epf_enabled,
      etf_enabled: salary ? !!salary.etf_enabled : !!settings?.default_etf_enabled,
      apit_enabled: salary ? !!salary.apit_enabled : !!settings?.default_apit_enabled,
      salary_id: salary ? salary.id : null
    });
    loadDocuments(employee.id);
  };

  const updateLine = (index, key, value) => {
    setForm(prev => ({
      ...prev,
      allowances: prev.allowances.map((line, i) => (i === index ? { ...line, [key]: value } : line))
    }));
  };

  const removeLine = (index) => {
    setForm(prev => {
      const next = prev.allowances.filter((_, i) => i !== index);
      return { ...prev, allowances: next.length ? next : [blankLine()] };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.full_name.trim()) {
      setFormError('Enter the employee name.');
      return;
    }
    if (form.basic_salary !== '' && !(Number(form.basic_salary) >= 0)) {
      setFormError('Basic salary must be a number.');
      return;
    }

    const payload = {};
    EMPLOYEE_COLUMNS.forEach(col => {
      const raw = typeof form[col] === 'string' ? form[col].trim() : form[col];
      payload[col] = raw === '' ? null : raw;
    });
    payload.full_name = form.full_name.trim();
    DATE_COLUMNS.forEach(col => { payload[col] = form[col] || null; });
    if (form.status === 'Active') {
      payload.end_date = null;
      payload.end_reason = null;
    }

    setSaving(true);
    let employeeId = form.id;
    let error = null;
    if (employeeId) {
      ({ error } = await supabase.from('employees').update(payload).eq('id', employeeId));
    } else {
      const res = await supabase.from('employees').insert(payload).select().single();
      error = res.error;
      employeeId = res.data ? res.data.id : null;
    }

    if (!error && employeeId && form.basic_salary !== '') {
      const lines = form.allowances
        .filter(a => a.label.trim() && Number(a.amount))
        .map(a => ({ label: a.label.trim(), amount: round2(Number(a.amount)), epf: !!a.epf }));
      const salaryPayload = {
        employee_id: employeeId,
        basic_salary: Number(form.basic_salary),
        allowances: lines,
        fixed_allowance: round2(lines.reduce((sum, a) => sum + a.amount, 0)),
        epf_enabled: form.epf_enabled,
        etf_enabled: form.etf_enabled,
        apit_enabled: form.apit_enabled,
        updated_at: new Date().toISOString()
      };
      const res = form.salary_id
        ? await supabase.from('employee_salaries').update(salaryPayload).eq('id', form.salary_id)
        : await supabase.from('employee_salaries').insert(salaryPayload);
      error = res.error;
    }

    setSaving(false);
    if (error) {
      setFormError(`Could not save: ${error.message}`);
      return;
    }
    await onReload();
    // Keep the modal open after creating so documents/login can be added right away.
    if (!form.id && employeeId) {
      setForm(prev => ({ ...prev, id: employeeId }));
    } else {
      setForm(null);
    }
  };

  const handleDeleteEmployee = async (employee) => {
    const payslips = runs.filter(r => r.employee_id === employee.id).length;
    const warning = payslips
      ? `${employee.full_name} has ${payslips} saved payslip(s). Deleting removes them, their salary and attendance marks permanently. Consider archiving instead. Delete anyway?`
      : `Delete ${employee.full_name}? Their salary and attendance records are removed too.`;
    if (!confirm(warning)) return;
    const { error } = await supabase.from('employees').delete().eq('id', employee.id);
    if (error) {
      alert(`Could not delete: ${error.message}`);
      return;
    }
    await onReload();
  };

  const handleSetStatus = async (employee, status) => {
    let endDate = null;
    if (status !== 'Active') {
      endDate = prompt(`Last working day for ${employee.full_name} (YYYY-MM-DD):`, toLocalDateStr());
      if (!endDate) return;
    }
    const { error } = await supabase.from('employees').update({
      status,
      end_date: status === 'Active' ? null : endDate
    }).eq('id', employee.id);
    if (error) {
      alert(`Could not update: ${error.message}`);
      return;
    }
    await onReload();
  };

  // ---- login account ----
  const linkProfile = async (profileId, email) => {
    const update = { profile_id: profileId };
    if (email && !form.email) update.email = email;
    const { error } = await supabase.from('employees').update(update).eq('id', form.id);
    if (error) {
      setFormError(`Could not link the account: ${error.message}`);
      return false;
    }
    setForm(prev => ({ ...prev, profile_id: profileId, email: prev.email || email || '' }));
    await onReload();
    return true;
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setFormError('');
    const email = accountForm.email.trim().toLowerCase();
    if (!email || accountForm.password.length < 6) {
      setFormError('Enter an email and a password of at least 6 characters.');
      return;
    }
    setSaving(true);
    const result = await onCreateMemberAccount({
      email,
      fullName: form.full_name.trim(),
      password: accountForm.password,
      role: accountForm.role
    });
    if (!result || result.success === false) {
      setSaving(false);
      setFormError(`Could not create the account: ${result?.error || 'unknown error'}`);
      return;
    }
    const { data } = await supabase.from('profiles').select('id').eq('email', email);
    const profileId = data && data[0] ? data[0].id : null;
    if (!profileId) {
      setSaving(false);
      setFormError('The account was created but could not be found to link. Use "Link existing account".');
      return;
    }
    await linkProfile(profileId, email);
    setSaving(false);
    setAccountForm(null);
  };

  const handleLinkExisting = async () => {
    if (!linkChoice) return;
    const profile = profileOf(linkChoice);
    await linkProfile(linkChoice, profile?.email);
    setLinkChoice('');
  };

  // ---- documents ----
  const handleUploadDoc = async () => {
    const file = docForm.file;
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setFormError('The file must be 10 MB or smaller.');
      return;
    }
    if (isUsingMock) {
      setFormError('Document upload needs the live Supabase connection.');
      return;
    }
    setFormError('');
    const objectPath = `employees/${form.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]+/g, '_')}`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(objectPath, file, { contentType: file.type });
    if (uploadError) {
      setFormError(`Upload failed: ${uploadError.message}`);
      return;
    }
    const { error } = await supabase.from('employee_documents').insert({
      employee_id: form.id,
      doc_type: docForm.doc_type,
      title: file.name,
      file_path: objectPath,
      file_name: file.name,
      uploaded_by: currentUserProfile.id
    });
    if (error) {
      setFormError(`Could not save the document: ${error.message}`);
      return;
    }
    setDocForm({ doc_type: DOC_TYPES[0], file: null });
    await loadDocuments(form.id);
  };

  const handleOpenDoc = async (doc) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(doc.file_path, 120);
    if (error || !data?.signedUrl) {
      alert(`Could not open the file: ${error ? error.message : 'unknown error'}`);
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener');
  };

  const handleDeleteDoc = async (doc) => {
    if (!confirm(`Delete ${doc.file_name || 'this document'}?`)) return;
    const { error } = await supabase.from('employee_documents').delete().eq('id', doc.id);
    if (error) {
      alert(`Could not delete: ${error.message}`);
      return;
    }
    if (!isUsingMock) await supabase.storage.from(BUCKET).remove([doc.file_path]);
    await loadDocuments(form.id);
  };

  const linkedProfileIds = new Set(employees.map(e => e.profile_id).filter(Boolean));
  const linkableProfiles = profiles.filter(p => !linkedProfileIds.has(p.id));
  const linkedProfile = form ? profileOf(form.profile_id) : null;
  const gratuity = form && form.join_date ? gratuityEstimate(form.join_date, form.basic_salary) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={s.toolbar}>
        <div style={s.searchBox}>
          <Search size={16} color="var(--color-text-muted)" />
          <input
            type="text"
            placeholder="Search name, role, NIC, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={s.searchInput}
          />
        </div>
        <select className="form-input" style={{ width: 'auto', minWidth: '150px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="Active">Active</option>
          <option value="Resigned">Resigned</option>
          <option value="Terminated">Terminated</option>
          <option value="">All</option>
        </select>
        <button className="btn-primary" onClick={openNew}><Plus size={15} /> Add employee</button>
      </div>

      <div style={s.chips}>
        <span style={s.chip}>{counts.active} active</span>
        <span style={s.chip}>{counts.withLogin} with a login account</span>
        {counts.noSalary > 0 && <span style={{ ...s.chip, color: '#F59E0B', borderColor: '#F59E0B' }}>{counts.noSalary} without a salary</span>}
      </div>

      <div className="glass-panel" style={{ padding: '8px' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Contact</th>
                <th>Joined</th>
                <th style={{ textAlign: 'right' }}>Basic + allowances</th>
                <th>Login</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(emp => {
                const salary = salaryOf(emp.id);
                const allowances = allowanceItems(salary).reduce((sum, a) => sum + a.amount, 0);
                const probationDays = emp.status === 'Active' ? daysUntil(emp.probation_end_date) : null;
                const contractDays = emp.status === 'Active' ? daysUntil(emp.contract_end_date) : null;
                return (
                  <tr key={emp.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{emp.full_name}</div>
                      <div style={s.subText}>{[emp.designation, emp.department].filter(Boolean).join(' - ') || emp.employment_type}</div>
                      {probationDays !== null && probationDays >= 0 && probationDays <= 30 && (
                        <div style={{ ...s.subText, color: '#F59E0B' }}>Probation ends in {probationDays} day(s)</div>
                      )}
                      {contractDays !== null && contractDays >= 0 && contractDays <= 30 && (
                        <div style={{ ...s.subText, color: '#F59E0B' }}>Contract ends in {contractDays} day(s)</div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: 'var(--font-size-sm)' }}>{emp.phone || '-'}</div>
                      <div style={s.subText}>{emp.email || ''}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: 'var(--font-size-sm)' }}>{emp.join_date ? String(emp.join_date).substring(0, 10) : '-'}</div>
                      <div style={s.subText}>{formatService(emp.join_date)}</div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {salary ? (
                        <>
                          <div style={{ fontWeight: 600 }}>{formatMoney(Number(salary.basic_salary) + allowances)}</div>
                          <div style={s.subText}>{formatMoney(salary.basic_salary)} + {formatMoney(allowances)}</div>
                        </>
                      ) : <span style={{ color: '#F59E0B', fontSize: 'var(--font-size-xs)' }}>not set</span>}
                    </td>
                    <td>
                      <span style={{ ...s.pill, color: emp.profile_id ? '#10B981' : 'var(--color-text-secondary)', borderColor: emp.profile_id ? '#10B981' : 'var(--border-subtle)' }}>
                        {emp.profile_id ? 'Has login' : 'No login'}
                      </span>
                    </td>
                    <td>
                      <span style={{ ...s.pill, color: emp.status === 'Active' ? '#10B981' : '#9CA3AF', borderColor: emp.status === 'Active' ? '#10B981' : '#9CA3AF' }}>
                        {emp.status}
                      </span>
                    </td>
                    <td>
                      <div style={s.actions}>
                        <button style={s.iconBtn} title="Edit" onClick={() => openEdit(emp)}>
                          <Pencil size={14} color="var(--color-gold)" />
                        </button>
                        {emp.status === 'Active' ? (
                          <button style={s.iconBtn} title="Mark as resigned / left" onClick={() => handleSetStatus(emp, 'Resigned')}>
                            <UserX size={15} color="#F59E0B" />
                          </button>
                        ) : (
                          <button style={s.iconBtn} title="Reactivate" onClick={() => handleSetStatus(emp, 'Active')}>
                            <UserCheck size={15} color="#10B981" />
                          </button>
                        )}
                        <button style={s.iconBtn} title="Delete" onClick={() => handleDeleteEmployee(emp)}>
                          <Trash2 size={14} color="var(--color-cancelled)" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {visible.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)' }}>
                  No employees here yet. Use "Add employee"; a login account is optional.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {form && (
        <div style={s.overlay}>
          <div className="glass-panel" style={s.modal}>
            <div style={s.modalHeader}>
              <h3>{form.id ? form.full_name || 'Employee' : 'New employee'}</h3>
              <button style={s.closeBtn} onClick={() => setForm(null)}>&times;</button>
            </div>

            <form onSubmit={handleSave} style={s.form}>
              <div style={s.section}>Personal details</div>
              <div style={s.row}>
                <Field label="Full name *" wide>
                  <input className="form-input" required value={form.full_name} onChange={(e) => setField('full_name', e.target.value)} />
                </Field>
                <Field label="NIC number">
                  <input className="form-input" value={form.nic} onChange={(e) => setField('nic', e.target.value)} />
                </Field>
                <Field label="Date of birth">
                  <input type="date" className="form-input" value={form.date_of_birth} onChange={(e) => setField('date_of_birth', e.target.value)} />
                </Field>
              </div>
              <div style={s.row}>
                <Field label="Phone">
                  <input className="form-input" value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
                </Field>
                <Field label="Email">
                  <input type="email" className="form-input" value={form.email} onChange={(e) => setField('email', e.target.value)} />
                </Field>
              </div>
              <Field label="Address" wide>
                <textarea rows={2} className="form-input" style={{ resize: 'none' }} value={form.address} onChange={(e) => setField('address', e.target.value)} />
              </Field>
              <div style={s.row}>
                <Field label="Emergency contact name">
                  <input className="form-input" value={form.emergency_contact_name} onChange={(e) => setField('emergency_contact_name', e.target.value)} />
                </Field>
                <Field label="Emergency contact phone">
                  <input className="form-input" value={form.emergency_contact_phone} onChange={(e) => setField('emergency_contact_phone', e.target.value)} />
                </Field>
              </div>

              <div style={s.section}>Employment</div>
              <div style={s.row}>
                <Field label="Designation">
                  <input className="form-input" value={form.designation} onChange={(e) => setField('designation', e.target.value)} />
                </Field>
                <Field label="Department">
                  <input className="form-input" value={form.department} onChange={(e) => setField('department', e.target.value)} />
                </Field>
                <Field label="Type">
                  <select className="form-input" value={form.employment_type} onChange={(e) => setField('employment_type', e.target.value)}>
                    {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
              </div>
              <div style={s.row}>
                <Field label="Joined on">
                  <input type="date" className="form-input" value={form.join_date} onChange={(e) => setField('join_date', e.target.value)} />
                </Field>
                {form.employment_type === 'Probation' && (
                  <Field label="Probation ends">
                    <input type="date" className="form-input" value={form.probation_end_date} onChange={(e) => setField('probation_end_date', e.target.value)} />
                  </Field>
                )}
                {(form.employment_type === 'Contract' || form.employment_type === 'Intern') && (
                  <Field label="Contract ends">
                    <input type="date" className="form-input" value={form.contract_end_date} onChange={(e) => setField('contract_end_date', e.target.value)} />
                  </Field>
                )}
                <Field label="Status">
                  <select className="form-input" value={form.status} onChange={(e) => setField('status', e.target.value)}>
                    <option value="Active">Active</option>
                    <option value="Resigned">Resigned</option>
                    <option value="Terminated">Terminated</option>
                  </select>
                </Field>
              </div>
              {form.status !== 'Active' && (
                <div style={s.row}>
                  <Field label="Last working day">
                    <input type="date" className="form-input" value={form.end_date} onChange={(e) => setField('end_date', e.target.value)} />
                  </Field>
                  <Field label="Reason" wide>
                    <input className="form-input" value={form.end_reason} onChange={(e) => setField('end_reason', e.target.value)} />
                  </Field>
                </div>
              )}

              <div style={s.section}>Pay structure</div>
              <div style={s.row}>
                <Field label="Monthly basic salary (LKR)">
                  <input type="number" min="0" step="any" className="form-input" value={form.basic_salary} onChange={(e) => setField('basic_salary', e.target.value)} />
                </Field>
              </div>
              <div>
                <label style={s.label}>Allowances (fixed, paid every month)</label>
                {form.allowances.map((line, index) => (
                  <div key={index} style={s.lineRow}>
                    <input className="form-input" placeholder="e.g. Incentive, Travel" value={line.label} onChange={(e) => updateLine(index, 'label', e.target.value)} style={{ flex: 2 }} />
                    <input type="number" min="0" step="any" className="form-input" placeholder="Amount" value={line.amount} onChange={(e) => updateLine(index, 'amount', e.target.value)} style={{ flex: 1 }} />
                    <label style={s.check} title="Counts towards EPF/ETF earnings">
                      <input type="checkbox" checked={line.epf} onChange={(e) => updateLine(index, 'epf', e.target.checked)} /> EPF
                    </label>
                    <button type="button" style={s.iconBtn} onClick={() => removeLine(index)}>
                      <Trash2 size={14} color="var(--color-cancelled)" />
                    </button>
                  </div>
                ))}
                <button type="button" className="btn-secondary" style={s.smallBtn} onClick={() => setForm(prev => ({ ...prev, allowances: [...prev.allowances, blankLine()] }))}>
                  <Plus size={12} /> Add allowance
                </button>
                <div style={s.hint}>
                  EPF/ETF is worked out on basic salary plus the allowances ticked "EPF". Overtime and incentives are normally not EPF earnings.
                </div>
              </div>
              <div style={s.toggles}>
                <label style={s.check}><input type="checkbox" checked={form.epf_enabled} onChange={(e) => setField('epf_enabled', e.target.checked)} /> EPF (employee {settings.epf_employee_rate}% / employer {settings.epf_employer_rate}%)</label>
                <label style={s.check}><input type="checkbox" checked={form.etf_enabled} onChange={(e) => setField('etf_enabled', e.target.checked)} /> ETF (employer {settings.etf_rate}%)</label>
                <label style={s.check}><input type="checkbox" checked={form.apit_enabled} onChange={(e) => setField('apit_enabled', e.target.checked)} /> APIT income tax</label>
              </div>

              <div style={s.section}>Bank &amp; statutory</div>
              <div style={s.row}>
                <Field label="Bank">
                  <input className="form-input" value={form.bank_name} onChange={(e) => setField('bank_name', e.target.value)} />
                </Field>
                <Field label="Branch">
                  <input className="form-input" value={form.bank_branch} onChange={(e) => setField('bank_branch', e.target.value)} />
                </Field>
              </div>
              <div style={s.row}>
                <Field label="Account number">
                  <input className="form-input" value={form.bank_account_no} onChange={(e) => setField('bank_account_no', e.target.value)} />
                </Field>
                <Field label="Account name">
                  <input className="form-input" value={form.bank_account_name} onChange={(e) => setField('bank_account_name', e.target.value)} />
                </Field>
                <Field label="EPF number">
                  <input className="form-input" value={form.epf_no} onChange={(e) => setField('epf_no', e.target.value)} />
                </Field>
              </div>
              <Field label="Notes" wide>
                <input className="form-input" value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
              </Field>

              {gratuity && (
                <div style={s.infoBox}>
                  Service: {formatService(form.join_date)}.{' '}
                  {gratuity.eligible
                    ? `Gratuity estimate: LKR ${formatMoney(gratuity.amount)} (half a month's basic for each of ${gratuity.years} completed years; applies to employers with 15+ staff).`
                    : 'Gratuity applies after 5 completed years of service.'}
                </div>
              )}

              {formError && <div style={s.formError}>{formError}</div>}
              <div style={s.modalActions}>
                <button type="button" className="btn-secondary" onClick={() => setForm(null)}>Close</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save employee'}</button>
              </div>
            </form>

            {form.id && (
              <>
                <div style={{ ...s.section, marginTop: '20px' }}>Login account</div>
                {form.profile_id ? (
                  <div style={s.infoBox}>
                    <UserCheck size={14} color="#10B981" /> This employee can log in
                    {linkedProfile ? ` as ${linkedProfile.email} (${linkedProfile.role}).` : '.'}
                  </div>
                ) : accountForm ? (
                  <form onSubmit={handleCreateAccount} style={s.form}>
                    <div style={s.row}>
                      <Field label="Login email">
                        <input type="email" required className="form-input" value={accountForm.email} onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })} />
                      </Field>
                      <Field label="Password (min 6)">
                        <input type="text" required className="form-input" value={accountForm.password} onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })} />
                      </Field>
                      <Field label="Role">
                        <select className="form-input" value={accountForm.role} onChange={(e) => setAccountForm({ ...accountForm, role: e.target.value })}>
                          {ACCOUNT_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </Field>
                    </div>
                    <div style={s.modalActions}>
                      <button type="button" className="btn-secondary" onClick={() => setAccountForm(null)}>Cancel</button>
                      <button type="submit" className="btn-primary" disabled={saving}>Create account</button>
                    </div>
                  </form>
                ) : (
                  <div style={s.row}>
                    <button type="button" className="btn-secondary" onClick={() => setAccountForm({ email: form.email || '', password: '', role: 'Employee' })}>
                      <KeyRound size={14} /> Create login account
                    </button>
                    {linkableProfiles.length > 0 && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <select className="form-input" style={{ width: 'auto', minWidth: '220px' }} value={linkChoice} onChange={(e) => setLinkChoice(e.target.value)}>
                          <option value="">Link an existing account...</option>
                          {linkableProfiles.map(p => <option key={p.id} value={p.id}>{p.full_name} ({p.email})</option>)}
                        </select>
                        <button type="button" className="btn-secondary" onClick={handleLinkExisting} disabled={!linkChoice}>
                          <Link2 size={14} /> Link
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <div style={s.hint}>
                  A login lets the employee use the CRM, clock in and see their own payslips. Creating one later links it to this record automatically.
                </div>

                <div style={{ ...s.section, marginTop: '20px' }}>Documents</div>
                {documents.map(doc => (
                  <div key={doc.id} style={s.docRow}>
                    <FileText size={14} color="var(--color-gold)" />
                    <span style={{ flex: 1, fontSize: 'var(--font-size-sm)' }}>{doc.doc_type}: {doc.file_name}</span>
                    <button type="button" style={s.linkBtn} onClick={() => handleOpenDoc(doc)}>View</button>
                    <button type="button" style={s.iconBtn} onClick={() => handleDeleteDoc(doc)}>
                      <Trash2 size={14} color="var(--color-cancelled)" />
                    </button>
                  </div>
                ))}
                {documents.length === 0 && <div style={s.hint}>No documents uploaded yet.</div>}
                <div style={{ ...s.row, marginTop: '8px', alignItems: 'center' }}>
                  <select className="form-input" style={{ width: 'auto' }} value={docForm.doc_type} onChange={(e) => setDocForm({ ...docForm, doc_type: e.target.value })}>
                    {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input
                    type="file"
                    className="form-input"
                    style={{ flex: 1, minWidth: '200px' }}
                    disabled={isUsingMock}
                    onChange={(e) => setDocForm({ ...docForm, file: e.target.files[0] || null })}
                    key={docForm.file ? 'has-file' : 'no-file'}
                  />
                  <button type="button" className="btn-secondary" onClick={handleUploadDoc} disabled={!docForm.file}>
                    <Paperclip size={14} /> Upload
                  </button>
                </div>
              </>
            )}
            {!form.id && (
              <div style={{ ...s.hint, marginTop: '12px' }}>
                <AlertTriangle size={12} /> Save the employee first, then add a login account and documents.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  toolbar: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  searchBox: { display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '200px' },
  searchInput: { flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' },
  chips: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  chip: { fontSize: 'var(--font-size-xs)', padding: '4px 10px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-subtle)', color: 'var(--color-text-secondary)' },
  subText: { fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: '2px' },
  pill: { border: '1px solid', borderRadius: 'var(--radius-full)', padding: '2px 10px', fontSize: 'var(--font-size-xs)', fontWeight: 600 },
  actions: { display: 'flex', alignItems: 'center', gap: '8px' },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' },
  linkBtn: { background: 'none', border: 'none', color: 'var(--color-gold)', cursor: 'pointer', fontSize: 'var(--font-size-sm)' },
  smallBtn: { padding: '4px 10px', fontSize: 'var(--font-size-xs)', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 999, backdropFilter: 'blur(4px)', padding: '16px', overflowY: 'auto' },
  modal: { width: '100%', maxWidth: '820px', padding: 'clamp(14px, 3vw, 24px)', backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-glass)', margin: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  closeBtn: { fontSize: 'var(--font-size-2xl)', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  row: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  section: { fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-gold)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px', marginTop: '8px' },
  label: { display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.03em' },
  lineRow: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' },
  check: { display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-sm)', cursor: 'pointer' },
  toggles: { display: 'flex', gap: '18px', flexWrap: 'wrap' },
  hint: { fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: '6px' },
  infoBox: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', backgroundColor: 'rgba(212,175,55,0.08)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-sm)' },
  docRow: { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' },
  formError: { color: 'var(--color-cancelled)', fontSize: 'var(--font-size-sm)' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px' }
};
