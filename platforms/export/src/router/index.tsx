import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';

const LoginPage            = lazy(() => import('@/features/auth/LoginPage'));
const RegisterSelectPage   = lazy(() => import('@/features/auth/RegisterSelectPage'));
const ExporterRegisterPage = lazy(() => import('@/features/auth/ExporterRegisterPage'));
const FacilityRegisterPage = lazy(() => import('@/features/auth/FacilityRegisterPage'));
const AppLayout    = lazy(() => import('@/layouts/AppLayout'));
const NotFoundPage = lazy(() => import('@/features/errors/NotFoundPage'));

// Single home page (replaces Dashboard + module dashboards)
const HomePage = lazy(() => import('@/features/home/HomePage'));

// Profile
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage'));

// Action & Activity Center
const ActionCenterPage   = lazy(() => import('@/features/actions/ActionCenterPage'));
const ActivityCenterPage = lazy(() => import('@/features/activity/ActivityCenterPage'));

// Quarantine — detail pages only (list pages are tabs in HomePage)
const AnimalArrivalPage = lazy(() => import('@/features/quarantine/AnimalArrivalPage'));
const BatchDetailPage   = lazy(() => import('@/features/quarantine/BatchDetailPage'));
const ClearancePage     = lazy(() => import('@/features/quarantine/ClearancePage'));

function Loading(): JSX.Element {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#0b5ed7', fontFamily: 'Inter, sans-serif' }}>Loading…</div>;
}

function S({ children }: { children: React.ReactNode }): JSX.Element {
  return <Suspense fallback={<Loading />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  { path: '/',      element: <Navigate to="/login" replace /> },
  { path: '/login',              element: <S><LoginPage /></S> },
  { path: '/register/select',   element: <S><RegisterSelectPage /></S> },
  { path: '/register/exporter', element: <S><ExporterRegisterPage /></S> },
  { path: '/register/facility', element: <S><FacilityRegisterPage /></S> },

  {
    element: <S><AppLayout /></S>,
    children: [
      { path: '/dashboard', element: <S><HomePage /></S> },
      { path: '/profile',   element: <S><ProfilePage /></S>          },
      { path: '/actions',   element: <S><ActionCenterPage /></S>   },
      { path: '/activity',  element: <S><ActivityCenterPage /></S> },

      // Quarantine detail pages (list pages are rendered inline in HomePage tabs)
      { path: '/quarantine/movements/:id/arrival', element: <S><AnimalArrivalPage /></S> },
      { path: '/quarantine/batches/:id',           element: <S><BatchDetailPage /></S>   },
      { path: '/quarantine/clearance/:id',         element: <S><ClearancePage /></S>     },
    ],
  },

  { path: '/404', element: <S><NotFoundPage /></S> },
  { path: '*',    element: <Navigate to="/404" replace /> },
]);
