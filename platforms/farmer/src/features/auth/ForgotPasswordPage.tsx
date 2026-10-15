import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { authApi } from '@/api/auth.api';
import styles from './auth.module.css';

export function ForgotPasswordPage(): JSX.Element {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [mode, setMode] = useState<'email' | 'phone' | null>(null);

  const isEmail = (v: string) => v.includes('@');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const val = identifier.trim();
    if (!val) { setError('Enter your email address or phone number.'); return; }

    setLoading(true);
    try {
      if (isEmail(val)) {
        const { error: err } = await supabase.auth.resetPasswordForEmail(val.toLowerCase(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (err) throw err;
        setMode('email');
      } else {
        // Phone-based OTP via backend
        await authApi.forgotPassword({ phoneE164: val }).catch(() => {
          // Anti-enumeration: swallow errors
        });
        setMode('phone');
      }
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.brand}><span className={styles.brandMark}>SL</span></div>
          <h1 className={styles.title}>
            {mode === 'email' ? 'Check Your Email' : 'Check Your Phone'}
          </h1>
          <p className={styles.subtitle}>
            {mode === 'email'
              ? 'A password reset link has been sent to your email address. Click the link to set a new password.'
              : 'If that number is registered, a reset code has been sent via SMS.'}
          </p>
          {mode === 'phone' && (
            <button
              className={styles.submitBtn}
              onClick={() => navigate(`/reset-password?phone=${encodeURIComponent(identifier.trim())}`)}
            >
              Enter Code
            </button>
          )}
          <div className={styles.footer}>
            <Link to="/login" className={styles.link}>Back to Login</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}><span className={styles.brandMark}>SL</span></div>
        <h1 className={styles.title}>Forgot Password</h1>
        <p className={styles.subtitle}>Enter your email address or phone number to reset your password</p>

        {error && (
          <div className={`${styles.alert} ${styles.alertError}`} role="alert">{error}</div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="identifier">
              Email address or phone number
            </label>
            <input
              id="identifier"
              className={styles.input}
              type="text"
              placeholder="your@email.com or +252612345678"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              autoComplete="email"
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Sending…' : 'Send Reset Link'}
          </button>
        </form>

        <div className={styles.footer}>
          <Link to="/login" className={styles.link}>Back to Login</Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
