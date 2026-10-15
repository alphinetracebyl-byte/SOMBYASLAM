import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { authApi } from '@/api/auth.api';
import styles from './auth.module.css';

const schema = z
  .object({
    fullName: z
      .string()
      .min(3, 'Name must be at least 3 characters')
      .max(100, 'Name is too long'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export function InvitationAcceptPage(): JSX.Element {
  const navigate = useNavigate();
  const { code = '' } = useParams<{ code: string }>();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async ({ fullName, password }: FormData) => {
    setServerError(null);
    try {
      await authApi.acceptInvitation(code, { fullName, password });
      navigate('/login?invited=1');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setServerError(
          (err.response?.data as { message?: string })?.message ??
            'Could not accept invitation. The link may have expired.',
        );
      } else {
        setServerError('Could not accept invitation. Please try again.');
      }
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>SL</span>
        </div>
        <h1 className={styles.title}>Accept Invitation</h1>
        <p className={styles.subtitle}>Set up your QXLITS account</p>

        {serverError && (
          <div className={`${styles.alert} ${styles.alertError}`} role="alert">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="fullName">
              Full Name
            </label>
            <input
              id="fullName"
              className={`${styles.input}${errors.fullName ? ` ${styles.inputError}` : ''}`}
              type="text"
              autoComplete="name"
              placeholder="Your full name"
              {...register('fullName')}
            />
            {errors.fullName && (
              <p className={styles.fieldError} role="alert">
                {errors.fullName.message}
              </p>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className={`${styles.input}${errors.password ? ` ${styles.inputError}` : ''}`}
              type="password"
              autoComplete="new-password"
              placeholder="Minimum 8 characters"
              {...register('password')}
            />
            {errors.password && (
              <p className={styles.fieldError} role="alert">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="confirmPassword">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              className={`${styles.input}${errors.confirmPassword ? ` ${styles.inputError}` : ''}`}
              type="password"
              autoComplete="new-password"
              placeholder="Repeat password"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className={styles.fieldError} role="alert">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
            {isSubmitting ? 'Creating Account…' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default InvitationAcceptPage;
