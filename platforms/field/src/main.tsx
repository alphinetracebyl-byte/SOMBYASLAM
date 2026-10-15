import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/router/index';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth.store';
import '@/i18n';
import './index.css';

async function boot() {
  // Restore the Supabase session from persisted tokens on every page load.
  // If the stored tokens are invalid (e.g. stale mock tokens), clear the store
  // so the user is redirected to login rather than seeing empty data as anon.
  const { accessToken, refreshToken } = useAuthStore.getState();
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token:  accessToken,
      refresh_token: refreshToken,
    });
    if (error) {
      useAuthStore.getState().clearSession();
    }
  }

  const rootEl = document.getElementById('root');
  if (!rootEl) throw new Error('Root element not found');

  createRoot(rootEl).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
}

void boot();
