import { useNavigate } from 'react-router-dom';

export function NotFoundPage(): JSX.Element {
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem', textAlign: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ fontSize: '3rem', fontWeight: 800, color: '#064e3b' }}>404</div>
      <div style={{ fontSize: '1.1rem', color: '#374151' }}>Page not found</div>
      <button
        onClick={() => void navigate('/dashboard')}
        style={{ marginTop: '0.5rem', background: '#064e3b', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 1.5rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}
      >
        Go to Dashboard
      </button>
    </div>
  );
}

export default NotFoundPage;
