import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Receipt } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { formatMoney } from '../invoiceUtils';
import { monthLabel, runTotals } from '../payrollUtils';
import PayslipSheet from './PayslipSheet';

// An employee's own finalized and paid payslips (the database only returns their own).
export default function MyPayslips({ currentUserProfile = {} }) {
  const [employee, setEmployee] = useState(null);
  const [runs, setRuns] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data: empRows } = await supabase.from('employees').select('*').eq('profile_id', currentUserProfile.id);
      const me = empRows && empRows[0] ? empRows[0] : null;
      let myRuns = [];
      if (me) {
        const { data } = await supabase.from('payroll_runs').select('*').eq('employee_id', me.id);
        myRuns = (data || []).filter(r => r.status === 'Finalized' || r.status === 'Paid');
      }
      if (active) {
        setEmployee(me);
        setRuns(myRuns.sort((a, b) => b.month.localeCompare(a.month)));
        setLoaded(true);
      }
    };
    load();
    return () => { active = false; };
  }, [currentUserProfile.id]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
      <div>
        <h2 style={s.title}><Receipt size={22} color="var(--color-gold)" /> My Payslips</h2>
        <p style={s.subtitle}>Your finalized payslips. A payslip appears here once the accountant finalizes the month.</p>
      </div>

      <div className="glass-panel" style={{ padding: '8px' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Month</th>
                <th style={{ textAlign: 'right' }}>Gross</th>
                <th style={{ textAlign: 'right' }}>Deductions</th>
                <th style={{ textAlign: 'right' }}>Net pay</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {runs.map(run => {
                const t = runTotals(run);
                return (
                  <tr key={run.id}>
                    <td style={{ fontWeight: 600 }}>{monthLabel(run.month)}</td>
                    <td style={{ textAlign: 'right' }}>{formatMoney(t.gross)}</td>
                    <td style={{ textAlign: 'right' }}>{formatMoney(t.totalDeductions)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatMoney(t.net)}</td>
                    <td>{run.status === 'Paid' ? `Paid ${run.paid_date ? String(run.paid_date).substring(0, 10) : ''}` : 'Finalized'}</td>
                    <td>
                      <button className="btn-secondary" style={s.btn} onClick={() => setViewing(run)}>
                        <Printer size={13} /> View / Print
                      </button>
                    </td>
                  </tr>
                );
              })}
              {loaded && runs.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)' }}>
                    {employee ? 'No finalized payslips yet.' : 'Your account is not linked to an employee record yet. Ask HR to link it.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewing && (
        <div style={s.overlay}>
          <div className="glass-panel" style={s.modal}>
            <div style={s.modalHeader}>
              <h3>Payslip - {monthLabel(viewing.month)}</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-primary" onClick={() => window.print()}><Printer size={15} /> Print / Save as PDF</button>
                <button className="btn-secondary" onClick={() => setViewing(null)}>Close</button>
              </div>
            </div>
            <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
              <div style={{ width: '556px', height: '786px', overflow: 'hidden' }}>
                <div style={{ width: '794px', transform: 'scale(0.7)', transformOrigin: 'top left' }}>
                  <PayslipSheet run={viewing} employee={employee} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewing && createPortal(
        <div className="print-only-sheet"><PayslipSheet run={viewing} employee={employee} /></div>,
        document.body
      )}
    </div>
  );
}

const s = {
  title: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: 'var(--font-size-xl)', fontWeight: 800 },
  subtitle: { color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: '6px' },
  btn: { padding: '4px 10px', fontSize: 'var(--font-size-xs)', display: 'inline-flex', alignItems: 'center', gap: '4px' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 999, backdropFilter: 'blur(4px)', padding: '16px', overflowY: 'auto' },
  modal: { width: '100%', maxWidth: '640px', padding: 'clamp(14px, 3vw, 24px)', backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-glass)', margin: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }
};
