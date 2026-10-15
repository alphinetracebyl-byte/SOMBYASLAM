import { useState, useCallback } from 'react';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

interface Toast { id: number; msg: string; kind: ToastKind }

let _id = 0;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((msg: string, kind: ToastKind = 'success', durationMs = 3200) => {
    const id = ++_id;
    setToasts(prev => [...prev, { id, msg, kind }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), durationMs);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, show, dismiss };
}
