import React, { useState, useEffect } from 'react';
import { supabase, isUsingMock, checkBackendReachable } from '../supabaseClient';
import { Mail, Lock, UserPlus, LogIn, AlertCircle, Cpu, WifiOff } from 'lucide-react';

// Turn raw Supabase/network errors into something an employee can act on.
const friendlyAuthError = (error) => {
  const msg = (error?.message || '').toLowerCase();
  if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('network request failed')) {
    return 'Cannot reach the login server. Check your internet connection; if it keeps happening, tell the Developer.';
  }
  if (msg.includes('invalid login credentials') || msg.includes('invalid email or password')) {
    return 'Incorrect email or password.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Your email is not verified yet. Open the verification link we emailed you, then sign in.';
  }
  if (msg.includes('rate limit') || msg.includes('too many')) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  if (msg.includes('already registered') || msg.includes('already exists')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (msg.includes('password should be')) {
    return error.message;
  }
  return error?.message || 'Login failed. Please double check credentials.';
};

export default function Login({ onAuthSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [backendDown, setBackendDown] = useState(false);

  useEffect(() => {
    let cancelled = false;
    checkBackendReachable().then((ok) => {
      if (!cancelled) setBackendDown(!ok);
    });
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // Role is never self-assigned: new accounts start as Employee and an
            // Admin/Developer promotes them from Manage Roles.
            data: {
              full_name: fullName
            }
          }
        });
        if (error) throw error;
        if (isUsingMock) {
          alert('Sign up successful (Mock Sandbox)! Logging you in.');
          onAuthSuccess(data.user);
        } else {
          alert('Sign up successful! Please check your email for verification link.');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        onAuthSuccess(data.user);
      }
    } catch (error) {
      console.error(error);
      setErrorMsg(friendlyAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.backgroundGlow}></div>
      <div className="glass-panel" style={styles.card}>
        <div style={styles.logoHeader}>
          <img src="/logo.png" alt="Gloma Logo" style={styles.logoImage} />
          <h1 style={styles.logoText}>GLOMA</h1>
          <span style={styles.logoSubtext}>INTERNATIONAL</span>
        </div>

        <h2 style={styles.cardTitle}>{isSignUp ? 'Create Corporate Account' : 'Employee Work Portal'}</h2>
        <p style={styles.cardSubtitle}>
          {isSignUp 
            ? 'Sign up to log daily work and track team tasks.' 
            : 'Access ClickUp-style dashboard & tasks'}
        </p>

        {isUsingMock && (
          <div style={styles.sandBoxNotice}>
            <Cpu size={16} color="var(--color-gold)" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-gold)' }}>LOCAL SANDBOX MODE</div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                Supabase not connected. Login with <strong>capcutproforeveryone@gmail.com</strong> (Developer),
                <strong>admin@gloma.com</strong> (Admin) or <strong>devin@gloma.com</strong> (Editor), password <strong>password123</strong>.
              </div>
            </div>
          </div>
        )}

        {backendDown && !isUsingMock && (
          <div style={styles.errorAlert}>
            <WifiOff size={18} color="var(--color-cancelled)" />
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-cancelled)' }}>
              The Gloma database server is not responding, so nobody can sign in right now.
              If your internet is fine, the Supabase project is probably paused or deleted. Please tell the Developer.
            </span>
          </div>
        )}

        {errorMsg && (
          <div style={styles.errorAlert}>
            <AlertCircle size={18} color="var(--color-cancelled)" />
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-cancelled)' }}>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          {isSignUp && (
            <div style={styles.formGroup}>
              <label style={styles.label}>Full Name</label>
              <div style={styles.inputWrapper}>
                <input
                  type="text"
                  required
                  placeholder="Enter your name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '38px' }}
                />
                <Mail size={16} style={styles.inputIcon} />
              </div>
            </div>
          )}

          <div style={styles.formGroup}>
            <label style={styles.label}>Email Address</label>
            <div style={styles.inputWrapper}>
              <input
                type="email"
                required
                placeholder="email@gloma.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '38px' }}
              />
              <Mail size={16} style={styles.inputIcon} />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrapper}>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '38px' }}
              />
              <Lock size={16} style={styles.inputIcon} />
            </div>
          </div>


          <button type="submit" disabled={loading} className="btn-primary" style={styles.submitBtn}>
            {loading ? (
              <span className="spinner">Processing...</span>
            ) : isSignUp ? (
              <>
                <UserPlus size={18} /> Register Account
              </>
            ) : (
              <>
                <LogIn size={18} /> Sign In
              </>
            )}
          </button>
        </form>

        <div style={styles.footerLinkContainer}>
          <button 
            type="button" 
            style={styles.toggleBtn} 
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg('');
            }}
          >
            {isSignUp ? 'Already registered? Log In' : 'Need an employee account? Register'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Inline CSS styles for Login Component
const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: 'var(--bg-primary)',
    position: 'relative',
    overflow: 'hidden',
    padding: '20px'
  },
  backgroundGlow: {
    position: 'absolute',
    width: '450px',
    height: '450px',
    borderRadius: 'var(--radius-full)',
    background: 'radial-gradient(circle, var(--color-gold-glow) 0%, transparent 60%)',
    top: '30%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    filter: 'blur(30px)',
    pointerEvents: 'none',
    zIndex: 0
  },
  card: {
    width: '100%',
    maxWidth: '430px',
    padding: '40px 30px',
    zIndex: 1,
    boxShadow: 'var(--shadow-lg)',
    animation: 'fadeIn 0.5s ease'
  },
  logoHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '28px'
  },
  logoImage: {
    width: '64px',
    height: '64px',
    objectFit: 'contain',
    marginBottom: '10px'
  },
  logoText: {
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--font-size-2xl)',
    letterSpacing: '0.12em',
    fontWeight: '800',
    color: 'var(--color-text-primary)',
    lineHeight: 1
  },
  logoSubtext: {
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--font-size-xs)',
    letterSpacing: '0.3em',
    color: 'var(--color-gold)',
    fontWeight: '600',
    marginTop: '6px'
  },
  cardTitle: {
    fontSize: 'var(--font-size-xl)',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: '6px'
  },
  cardSubtitle: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-secondary)',
    textAlign: 'center',
    marginBottom: '20px'
  },
  sandBoxNotice: {
    display: 'flex',
    gap: '10px',
    padding: '12px',
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    border: '1px solid rgba(212, 175, 55, 0.25)',
    borderRadius: 'var(--radius-sm)',
    marginBottom: '20px',
    lineHeight: '1.4'
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: 'var(--radius-sm)',
    marginBottom: '20px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: '600',
    color: 'var(--color-text-secondary)',
    letterSpacing: '0.02em',
    textTransform: 'uppercase'
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  inputIcon: {
    position: 'absolute',
    left: '12px',
    color: 'var(--color-text-muted)',
    pointerEvents: 'none'
  },
  submitBtn: {
    marginTop: '10px',
    padding: '12px',
    fontSize: 'var(--font-size-md)'
  },
  footerLinkContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '20px'
  },
  toggleBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-gold)',
    cursor: 'pointer',
    fontSize: 'var(--font-size-sm)',
    fontWeight: '500',
    outline: 'none',
    transition: 'color var(--transition-fast)'
  }
};
