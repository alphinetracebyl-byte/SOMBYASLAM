import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { supabase } from '@/lib/supabase';
import { authApi } from '@/api/auth.api';
import styles from './auth.module.css';

const pwSchema = z
  .object({
    newPassword:     z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine(d => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path:    ['confirmPassword'],
  });

const otpSchema = z
  .object({
    otp:             z.string().length(6, 'Enter the 6-digit code').regex(/^\d+$/, 'Digits only'),
    newPassword:     z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine(d => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path:    ['confirmPassword'],
  });

type PwForm  = z.infer<typeof pwSchema>;
type OtpForm = z.infer<typeof otpSchema>;

export function ResetPasswordPage(): JSX.Element {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const phoneE164 = params.get('phone') ?? '';

  // Detect Supabase email-link recovery session
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [serverError,  setServerError]  = useState<string | null>(null);
  const [done,         setDone]         = useState(false);

  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY when the user lands via the reset email link
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  /* ── Email-link recovery form ── */
  const pwForm = useForm<PwForm>({ resolver: zodResolver(pwSchema) });

  const onEmailReset = async ({ newPassword }: PwForm) => {
    setServerError(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { setServerError(error.message); return; }
    setDone(true);
    setTimeout(() => navigate('/login?reset=1'), 2000);
  };

  /* ── Phone OTP form ── */
  const otpForm = useForm<OtpForm>({ resolver: zodResolver(otpSchema) });

  const onPhoneReset = async ({ otp, newPassword }: OtpForm) => {
    setServerError(null);
    try {
      await authApi.resetPassword({ phoneE164, otp, newPassword });
      navigate('/login?reset=1');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setServerError(
          (err.response?.data as { message?: string })?.message ??
          'Reset failed. The code may have expired.',
        );
      } else {
        setServerError('Reset failed. Please try again.');
      }
    }
  };

  if (done) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.brand}><span className={styles.brandMark}>SL</span></div>
          <h1 className={styles.title}>Password Updated</h1>
          <p className={styles.subtitle}>Your password has been changed. Redirecting to login…</p>
        </div>
      </div>
    );
  }

  /* ── Email recovery (Supabase link) ── */
  if (recoveryMode) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.brand}><span className={styles.brandMark}>SL</span></div>
          <h1 className={styles.title}>Set New Password</h1>
          <p className={styles.subtitle}>Enter a new password for your account</p>

          {serverError && (
            <div className={`${styles.alert} ${styles.alertError}`} role="alert">{serverError}</div>
          )}

          <form onSubmit={pwForm.handleSubmit(onEmailReset)} noValidate>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="newPassword">New Password</label>
              <input
                id="newPassword"
                className={`${styles.input}${pwForm.formState.errors.newPassword ? ` ${styles.inputError}` : ''}`}
                type="password"
                autoComplete="new-password"
                placeholder="Minimum 8 characters"
                {...pwForm.register('newPassword')}
              />
              {pwForm.formState.errors.newPassword && (
                <p className={styles.fieldError} role="alert">{pwForm.formState.errors.newPassword.message}</p>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                className={`${styles.input}${pwForm.formState.errors.confirmPassword ? ` ${styles.inputError}` : ''}`}
                type="password"
                autoComplete="new-password"
                placeholder="Repeat new password"
                {...pwForm.register('confirmPassword')}
              />
              {pwForm.formState.errors.confirmPassword && (
                <p className={styles.fieldError} role="alert">{pwForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>

            <button type="submit" className={styles.submitBtn} disabled={pwForm.formState.isSubmitting}>
              {pwForm.formState.isSubmitting ? 'Saving…' : 'Set New Password'}
            </button>
          </form>

          <div className={styles.footer}>
            <Link to="/login" className={styles.link}>Back to Login</Link>
          </div>
        </div>
      </div>
    );
  }

  /* ── Phone OTP reset ── */
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}><span className={styles.brandMark}>SL</span></div>
        <h1 className={styles.title}>Reset Password</h1>
        <p className={styles.subtitle}>Enter the code you received and your new password</p>

        {serverError && (
          <div className={`${styles.alert} ${styles.alertError}`} role="alert">{serverError}</div>
        )}

        <form onSubmit={otpForm.handleSubmit(onPhoneReset)} noValidate>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="otp">Reset Code</label>
            <input
              id="otp"
              className={`${styles.input} ${styles.otpInput}${otpForm.formState.errors.otp ? ` ${styles.inputError}` : ''}`}
              type="text"
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              placeholder="000000"
              {...otpForm.register('otp')}
            />
            {otpForm.formState.errors.otp && (
              <p className={styles.fieldError} role="alert">{otpForm.formState.errors.otp.message}</p>
            )}
          </div>

          <hr className={styles.divider} />

          <div className={styles.field}>
            <label className={styles.label} htmlFor="newPassword">New Password</label>
            <input
              id="newPassword"
              className={`${styles.input}${otpForm.formState.errors.newPassword ? ` ${styles.inputError}` : ''}`}
              type="password"
              autoComplete="new-password"
              placeholder="Minimum 8 characters"
              {...otpForm.register('newPassword')}
            />
            {otpForm.formState.errors.newPassword && (
              <p className={styles.fieldError} role="alert">{otpForm.formState.errors.newPassword.message}</p>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              className={`${styles.input}${otpForm.formState.errors.confirmPassword ? ` ${styles.inputError}` : ''}`}
              type="password"
              autoComplete="new-password"
              placeholder="Repeat new password"
              {...otpForm.register('confirmPassword')}
            />
            {otpForm.formState.errors.confirmPassword && (
              <p className={styles.fieldError} role="alert">{otpForm.formState.errors.confirmPassword.message}</p>
            )}
          </div>

          <button type="submit" className={styles.submitBtn} disabled={otpForm.formState.isSubmitting}>
            {otpForm.formState.isSubmitting ? 'Resetting…' : 'Reset Password'}
          </button>
        </form>

        <div className={styles.footer}>
          <Link to="/login" className={styles.link}>Back to Login</Link>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
