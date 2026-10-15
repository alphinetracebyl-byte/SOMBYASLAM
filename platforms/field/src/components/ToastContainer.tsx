import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import type { ToastKind } from '@/hooks/useToast';

const CFG: Record<ToastKind, { bg: string; border: string; icon: React.ElementType }> = {
  success: { bg: '#166534', border: '#14532d', icon: CheckCircle  },
  error:   { bg: '#991b1b', border: '#7f1d1d', icon: XCircle      },
  warning: { bg: '#92400e', border: '#78350f', icon: AlertTriangle },
  info:    { bg: '#1e40af', border: '#1e3a8a', icon: Info          },
};

interface Props {
  toasts: { id: number; msg: string; kind: ToastKind }[];
  dismiss: (id: number) => void;
}

export function ToastContainer({ toasts, dismiss }: Props) {
  if (toasts.length === 0) return null;
  return (
    <div style={{ position: 'fixed', top: 20, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.5rem', pointerEvents: 'none' }}>
      {toasts.map(t => {
        const c = CFG[t.kind];
        const Icon = c.icon;
        return (
          <div key={t.id} style={{ background: c.bg, color: '#fff', padding: '0.75rem 1rem 0.75rem 1.125rem', borderRadius: 10, fontSize: '0.875rem', fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,.22)', display: 'flex', alignItems: 'center', gap: '0.625rem', pointerEvents: 'all', minWidth: 260, maxWidth: 400, border: `1px solid ${c.border}` }}>
            <Icon size={15} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{t.msg}</span>
            <button onClick={() => dismiss(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', opacity: 0.75, padding: '0.125rem', display: 'flex' }}>
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
