import React, { useState } from 'react';
import { Save, Info } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { DEFAULT_PAYROLL_SETTINGS } from '../payrollUtils';

const FIELDS = [
  { group: 'Statutory contributions (percent of EPF earnings)', items: [
    { key: 'epf_employee_rate', label: 'EPF - employee', suffix: '%' },
    { key: 'epf_employer_rate', label: 'EPF - employer', suffix: '%' },
    { key: 'etf_rate', label: 'ETF - employer', suffix: '%' }
  ] },
  { group: 'Overtime and unpaid days', items: [
    { key: 'ot_multiplier', label: 'Overtime multiplier', suffix: 'x' },
    { key: 'ot_hourly_divisor', label: 'Hourly rate = basic salary divided by', suffix: 'hours' },
    { key: 'no_pay_divisor', label: 'Daily rate = basic salary divided by', suffix: 'days' }
  ] },
  { group: 'Leave entitlement per year', items: [
    { key: 'annual_leave_days', label: 'Annual leave', suffix: 'days' },
    { key: 'casual_leave_days', label: 'Casual leave', suffix: 'days' },
    { key: 'sick_leave_days', label: 'Sick / medical leave', suffix: 'days' }
  ] }
];

export default function PayrollSettings({ settings, onReload }) {
  const [values, setValues] = useState(() => Object.fromEntries(
    Object.keys(DEFAULT_PAYROLL_SETTINGS).map(key => [key, String(settings[key])])
  ));
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage('');
    const payload = {};
    for (const key of Object.keys(DEFAULT_PAYROLL_SETTINGS)) {
      const n = Number(values[key]);
      if (!Number.isFinite(n) || n < 0) {
        setMessage(`Check the value for ${key.replace(/_/g, ' ')}.`);
        return;
      }
      payload[key] = n;
    }
    if (payload.ot_hourly_divisor === 0 || payload.no_pay_divisor === 0) {
      setMessage('Divisors cannot be zero.');
      return;
    }
    payload.updated_at = new Date().toISOString();

    setSaving(true);
    const { error } = settings.id
      ? await supabase.from('payroll_settings').update(payload).eq('id', settings.id)
      : await supabase.from('payroll_settings').insert(payload);
    setSaving(false);
    if (error) {
      setMessage(`Could not save: ${error.message}`);
      return;
    }
    setMessage('Saved. Recalculate the month to apply the new rules to draft payslips.');
    await onReload();
  };

  return (
    <form onSubmit={handleSave} className="glass-panel" style={s.panel}>
      {FIELDS.map(group => (
        <div key={group.group}>
          <div style={s.groupTitle}>{group.group}</div>
          <div style={s.grid}>
            {group.items.map(item => (
              <div key={item.key}>
                <label style={s.label}>{item.label}</label>
                <div style={s.inputWrap}>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="form-input"
                    value={values[item.key]}
                    onChange={(e) => setValues({ ...values, [item.key]: e.target.value })}
                  />
                  <span style={s.suffix}>{item.suffix}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={s.notes}>
        <Info size={15} color="var(--color-gold)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <p>EPF and ETF apply to "total earnings": salary and regular allowances. Overtime, bonuses/incentives and expense reimbursements are normally excluded, so tick "EPF" only on the allowances that count.</p>
          <p>EPF and ETF must reach the funds before the last working day of the following month. Late payment carries surcharges.</p>
          <p>APIT income tax uses the Inland Revenue 2025/26 monthly table (Rs 150,000 a month tax-free, then 6% to 36%). Switch it on per employee under Employees. Confirm the figures with your accountant before relying on them.</p>
          <p>Gratuity (half a month of basic salary per completed year after 5 years) is shown as an estimate on each employee; it applies to employers with 15 or more employees.</p>
        </div>
      </div>

      {message && (
        <div style={{ fontSize: 'var(--font-size-sm)', color: message.startsWith('Saved') ? '#10B981' : 'var(--color-cancelled)' }}>{message}</div>
      )}
      <div>
        <button type="submit" className="btn-primary" disabled={saving}>
          <Save size={15} /> {saving ? 'Saving...' : 'Save settings'}
        </button>
      </div>
    </form>
  );
}

const s = {
  panel: { padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '820px' },
  groupTitle: { fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-gold)', marginBottom: '10px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' },
  label: { display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '5px' },
  inputWrap: { display: 'flex', alignItems: 'center', gap: '8px' },
  suffix: { fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', minWidth: '34px' },
  notes: { display: 'flex', gap: '10px', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }
};
