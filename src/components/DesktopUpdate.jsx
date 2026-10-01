import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';

const RELEASES_URL = 'https://github.com/glomaint2025-ctrl/gloma-crm/releases/latest';

// Shown only inside the Windows desktop app: lets the user check for, download and
// install updates of the app shell. (Website changes reach the app on their own.)
export default function DesktopUpdate() {
  const desktop = typeof window !== 'undefined' ? window.glomaDesktop : undefined;
  const canUpdateInApp = !!(desktop && typeof desktop.checkForUpdates === 'function');

  const [version, setVersion] = useState('');
  const [status, setStatus] = useState({ state: 'idle' });

  useEffect(() => {
    if (!canUpdateInApp) return;
    let active = true;
    desktop.getVersion().then(v => { if (active) setVersion(v); }).catch(() => {});
    const unsubscribe = desktop.onUpdateStatus(payload => { if (active) setStatus(payload); });
    return () => {
      active = false;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [canUpdateInApp, desktop]);

  if (!desktop || !desktop.isDesktop) return null;

  const handleCheck = async () => {
    setStatus({ state: 'checking' });
    try {
      setStatus(await desktop.checkForUpdates());
    } catch {
      setStatus({ state: 'error', message: 'Could not check for updates.' });
    }
  };

  // An older desktop build cannot update itself from here; point to the installer.
  if (!canUpdateInApp) {
    return (
      <div style={styles.box}>
        <div style={styles.line}>
          <AlertTriangle size={13} color="#F59E0B" /> Desktop app update needed
        </div>
        <button style={styles.btn} onClick={() => window.open(RELEASES_URL, '_blank')}>
          <Download size={13} /> Download latest installer
        </button>
      </div>
    );
  }

  return (
    <div style={styles.box}>
      <div style={styles.line}>
        {status.state === 'up-to-date' && <><CheckCircle2 size={13} color="#10B981" /> Up to date</>}
        {status.state === 'checking' && <>Checking for updates...</>}
        {status.state === 'downloading' && (
          <>Downloading update{status.version ? ` ${status.version}` : ''}{status.percent ? ` ${status.percent}%` : '...'}</>
        )}
        {status.state === 'downloaded' && <><CheckCircle2 size={13} color="#10B981" /> Update {status.version} ready</>}
        {status.state === 'error' && <><AlertTriangle size={13} color="#F59E0B" /> {status.message || 'Update check failed'}</>}
        {(status.state === 'idle' || !status.state) && <>Desktop app{version ? ` v${version}` : ''}</>}
      </div>
      {status.state === 'downloaded' ? (
        <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={() => desktop.installUpdate()}>
          <RefreshCw size={13} /> Restart to update
        </button>
      ) : (
        <button style={styles.btn} onClick={handleCheck} disabled={status.state === 'checking' || status.state === 'downloading'}>
          <RefreshCw size={13} /> Check for updates
        </button>
      )}
    </div>
  );
}

const styles = {
  box: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '8px 10px',
    marginBottom: '8px',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-secondary)'
  },
  line: { display: 'flex', alignItems: 'center', gap: '6px' },
  btn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '5px 8px',
    background: 'transparent',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-primary)',
    fontSize: 'var(--font-size-xs)',
    cursor: 'pointer'
  },
  btnPrimary: { background: 'var(--color-gold)', color: '#0A0F1D', borderColor: 'var(--color-gold)', fontWeight: 700 }
};
