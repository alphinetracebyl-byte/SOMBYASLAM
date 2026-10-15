import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export function NotFoundPage(): JSX.Element {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      gap: '1.25rem',
      background: '#f8fafc',
      fontFamily: "'Inter', system-ui, sans-serif",
      textAlign: 'center',
      padding: '2rem',
    }}>
      <AlertCircle size={52} strokeWidth={1.5} color="#94a3b8" />
      <div>
        <div style={{ fontSize: '3rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>404</div>
        <div style={{ fontSize: '1.125rem', fontWeight: 600, color: '#334155', marginTop: '0.5rem' }}>
          Page not found
        </div>
        <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.375rem' }}>
          The page you are looking for does not exist or has been moved.
        </div>
      </div>
      <button
        onClick={() => navigate('/dashboard')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.625rem 1.25rem',
          background: '#0f2170',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          fontSize: '0.875rem',
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        <ArrowLeft size={15} /> Back to Dashboard
      </button>
    </div>
  );
}

export default NotFoundPage;
