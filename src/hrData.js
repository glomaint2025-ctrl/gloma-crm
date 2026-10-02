import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { resolveSettings } from './payrollUtils';

// Loads everything the HR & Payroll screens share, once, and exposes a reload().
export function useHrData() {
  const [data, setData] = useState({
    employees: [],
    salaries: [],
    marks: [],
    runs: [],
    loans: [],
    repayments: [],
    settingsRow: null
  });
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [emp, sal, marks, runs, loans, reps, settings] = await Promise.all([
      supabase.from('employees').select('*'),
      supabase.from('employee_salaries').select('*'),
      supabase.from('attendance_marks').select('*'),
      supabase.from('payroll_runs').select('*'),
      supabase.from('employee_loans').select('*'),
      supabase.from('loan_repayments').select('*'),
      supabase.from('payroll_settings').select('*')
    ]);

    const firstError = [emp, sal, marks, runs, loans, reps, settings].find(r => r.error)?.error;
    setLoadError(firstError ? firstError.message : '');
    setData({
      employees: (emp.data || []).slice().sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '')),
      salaries: sal.data || [],
      marks: marks.data || [],
      runs: runs.data || [],
      loans: loans.data || [],
      repayments: reps.data || [],
      settingsRow: (settings.data || [])[0] || null
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ...data, settings: resolveSettings(data.settingsRow), loadError, loading, reload };
}
