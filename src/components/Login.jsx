import React, { useState } from 'react';
import { supabase, isUsingMock } from '../supabaseClient';
import { Mail, Lock, UserPlus, LogIn, AlertCircle, Cpu } from 'lucide-react';

export default function Login({ onAuthSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [defaultRole, setDefaultRole] = useState('Employee');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

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
            data: {
              full_name: fullName,
              role: defaultRole
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
      setErrorMsg(error.message || 'Login failed. Please double check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.backgroundGlow}></div>
      <div className="glass-panel" style={styles.card}>
        <div style={styles.logoHeader}>
          {/* Stylized Logo Icon in CSS */}
          <div style={styles.logoIcon}>
            <div style={styles.logoBluePrism}></div>
            <div style={styles.logoGoldPrism}></div>
          </div>
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
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-gold)' }}>LOCAL SANDBOX MODE</div>
              <div style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>
                Supabase not connected. Login with: <strong>glomaint2025@gmail.com</strong> (Developer), 
                <strong>bishwa@gloma.com</strong> (Admin) or <strong>devin@gloma.com</strong> (Employee) using <em>any password</em>.
              </div>
            </div>
          </div>
        )}

        {errorMsg && (
          <div style={styles.errorAlert}>
            <AlertCircle size={18} color="var(--color-cancelled)" />
            <span style={{ fontSize: 13, color: 'var(--color-cancelled)' }}>{errorMsg}</span>
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

          {isSignUp && (
            <div style={styles.formGroup}>
              <label style={styles.label}>Default Role Request</label>
              <select 
                value={defaultRole} 
                onChange={(e) => setDefaultRole(e.target.value)}
                className="form-input"
              >
                <option value="Employee">Employee (Devin/Bishwa/Writer)</option>
                <option value="Admin">Administrator</option>
                <option value="Developer">Developer</option>
              </select>
            </div>
          )}

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
  logoIcon: {
    display: 'flex',
    position: 'relative',
    width: '60px',
    height: '60px',
    marginBottom: '10px'
  },
  logoBluePrism: {
    position: 'absolute',
    top: 5,
    left: 5,
    width: '35px',
    height: '50px',
    backgroundColor: '#0c1a30',
    clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  logoGoldPrism: {
    position: 'absolute',
    top: 15,
    left: 25,
    width: '30px',
    height: '40px',
    backgroundColor: '#D4AF37',
    clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
  },
  logoText: {
    fontFamily: 'var(--font-heading)',
    fontSize: '28px',
    letterSpacing: '0.12em',
    fontWeight: '800',
    color: '#fff',
    lineHeight: 1
  },
  logoSubtext: {
    fontFamily: 'var(--font-heading)',
    fontSize: '9px',
    letterSpacing: '0.3em',
    color: 'var(--color-gold)',
    fontWeight: '600',
    marginTop: '6px'
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: '6px'
  },
  cardSubtitle: {
    fontSize: '13px',
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
    fontSize: '12px',
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
    fontSize: '15px'
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
    fontSize: '13px',
    fontWeight: '500',
    outline: 'none',
    transition: 'color var(--transition-fast)'
  }
};
