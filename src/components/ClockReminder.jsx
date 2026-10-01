import React, { useState, useEffect, useRef } from 'react';
import { BellRing, Square } from 'lucide-react';
import { getClosingTime, todayStr } from '../workHours';

const CHECK_INTERVAL_MS = 30000;
const SNOOZE_MINUTES = 15;

const storageKey = (userId, date) => `gloma_clock_reminder_${userId}_${date}`;

// Safe localStorage access (it can throw in private windows or when blocked).
const readStore = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const writeStore = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Reminders still work for this session without persistence.
  }
};

// Reminds an employee to press Stop once office hours are over (weekdays 17:00,
// Saturdays 15:30). Shows an in-app banner and, when allowed, a system notification;
// in the desktop app the window is also brought to the front.
export default function ClockReminder({ currentUserProfile = {}, timeLogs = [], onClockOut }) {
  const [visible, setVisible] = useState(false);
  const [stopping, setStopping] = useState(false);
  const snoozedUntilRef = useRef(0);
  const visibleRef = useRef(false);
  const logsRef = useRef(timeLogs);
  logsRef.current = timeLogs;

  const userId = currentUserProfile?.id;

  // Ask for notification permission on the first click anywhere (browsers require a user gesture).
  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'default') return;
    const ask = () => {
      Notification.requestPermission().catch(() => {});
    };
    document.addEventListener('click', ask, { once: true });
    return () => document.removeEventListener('click', ask);
  }, []);

  useEffect(() => {
    if (!userId) return;

    const check = () => {
      const today = todayStr();
      const activeLog = logsRef.current.find(l => l.user_id === userId && !l.clock_out && l.work_date === today);
      const closing = getClosingTime(today);
      if (!activeLog || !closing || readStore(storageKey(userId, today)) === 'overtime') {
        visibleRef.current = false;
        setVisible(false);
        return;
      }

      const now = new Date();
      const closeAt = new Date(`${today}T${closing}:00`);
      if (now < closeAt || now.getTime() < snoozedUntilRef.current) return;

      if (visibleRef.current) return;
      visibleRef.current = true;
      setVisible(true);

      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          new Notification('Time to stop work', {
            body: `Office hours ended at ${closing}. Press Stop on your Gloma CRM clock.`
          });
        } catch {
          // Some environments block the Notification constructor; the banner still shows.
        }
      }
      if (window.glomaDesktop && window.glomaDesktop.bringToFront) {
        window.glomaDesktop.bringToFront();
      }
    };

    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [userId]);

  if (!visible) return null;

  const activeLog = timeLogs.find(l => l.user_id === userId && !l.clock_out);

  const hide = () => {
    visibleRef.current = false;
    setVisible(false);
  };

  const handleStop = async () => {
    if (activeLog) {
      setStopping(true);
      await onClockOut(activeLog.id);
      setStopping(false);
    }
    hide();
  };

  const handleSnooze = () => {
    snoozedUntilRef.current = Date.now() + SNOOZE_MINUTES * 60000;
    hide();
  };

  const handleOvertime = () => {
    writeStore(storageKey(userId, todayStr()), 'overtime');
    hide();
  };

  return (
    <div style={styles.banner} role="alert">
      <div style={styles.header}>
        <BellRing size={18} color="var(--color-gold)" />
        <strong>Office hours are over</strong>
      </div>
      <div style={styles.text}>Your work timer is still running. Stop it if you have finished for the day.</div>
      <div style={styles.actions}>
        <button className="btn-primary" style={styles.btn} onClick={handleStop} disabled={stopping}>
          <Square size={13} /> {stopping ? 'Stopping...' : 'Stop work now'}
        </button>
        <button className="btn-secondary" style={styles.btn} onClick={handleSnooze}>
          Remind me in {SNOOZE_MINUTES} min
        </button>
        <button className="btn-secondary" style={styles.btn} onClick={handleOvertime}>
          I'm working overtime
        </button>
      </div>
    </div>
  );
}

const styles = {
  banner: {
    position: 'fixed',
    top: '16px',
    right: '16px',
    zIndex: 1200,
    width: 'min(360px, calc(100vw - 32px))',
    padding: '14px 16px',
    backgroundColor: 'var(--bg-panel)',
    border: '1px solid var(--color-gold)',
    borderRadius: 'var(--radius-md)',
    boxShadow: '0 8px 30px rgba(0,0,0,0.45)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    color: 'var(--color-text-primary)'
  },
  header: { display: 'flex', alignItems: 'center', gap: '8px' },
  text: { fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' },
  actions: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  btn: { padding: '6px 12px', fontSize: 'var(--font-size-xs)', display: 'inline-flex', alignItems: 'center', gap: '6px' }
};
