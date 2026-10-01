import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

const CHECK_INTERVAL_MS = 5 * 60 * 1000;

// Tells the user when a newer version of the CRM has been deployed. Works in the
// browser and in the desktop app (which loads the same live site).
export default function UpdateBanner() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    // Only production builds carry a build id and a version.json file.
    if (typeof __BUILD_ID__ === 'undefined' || __BUILD_ID__ === 'dev') return;

    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.buildId && data.buildId !== __BUILD_ID__) {
          setUpdateReady(true);
        }
      } catch {
        // Offline or not JSON (e.g. a dev server): ignore and try again later.
      }
    };

    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    window.addEventListener('focus', check);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('focus', check);
    };
  }, []);

  if (!updateReady) return null;

  return (
    <div style={styles.banner} role="status">
      <RefreshCw size={16} color="var(--color-gold)" />
      <span style={{ flex: 1, fontSize: 'var(--font-size-sm)' }}>A new version of Gloma CRM is available.</span>
      <button className="btn-primary" style={styles.btn} onClick={() => window.location.reload()}>
        Reload to update
      </button>
    </div>
  );
}

const styles = {
  banner: {
    position: 'fixed',
    bottom: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1300,
    width: 'min(520px, calc(100vw - 32px))',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    backgroundColor: 'var(--bg-panel)',
    border: '1px solid var(--color-gold)',
    borderRadius: 'var(--radius-md)',
    boxShadow: '0 8px 30px rgba(0,0,0,0.45)',
    color: 'var(--color-text-primary)'
  },
  btn: { padding: '6px 12px', fontSize: 'var(--font-size-xs)' }
};
