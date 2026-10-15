import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useAuthStore } from '@/store/auth.store';

const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/features/auth/RegisterPage'));
const RegisterSelectPage = lazy(() => import('@/features/auth/RegisterSelectPage'));
const ExporterRegisterPage = lazy(() => import('@/features/auth/ExporterRegisterPage'));
const FacilityRegisterPage = lazy(() => import('@/features/auth/FacilityRegisterPage'));
const VerifyOtpPage = lazy(() => import('@/features/auth/VerifyOtpPage'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/features/auth/ResetPasswordPage'));
const InvitationAcceptPage = lazy(() => import('@/features/auth/InvitationAcceptPage'));
const TermsPage = lazy(() => import('@/features/auth/TermsPage'));
const AppLayout = lazy(() => import('@/layouts/AppLayout'));
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
const AnimalDetailPage    = lazy(() => import('@/features/animals/AnimalDetailPage'));
const AnimalProfilePage   = lazy(() => import('@/features/animals/AnimalProfilePage'));
const RegisterAnimalPage  = lazy(() => import('@/features/animals/RegisterAnimalPage'));
const PremisesPage = lazy(() => import('@/features/premises/PremisesPage'));
const PremisesDetailPage = lazy(() => import('@/features/premises/PremisesDetailPage'));
const PremisesInfoPage      = lazy(() => import('@/features/premises/PremisesInfoPage'));
const TagInventoryPage      = lazy(() => import('@/features/premises/TagInventoryPage'));
const MovementsPage = lazy(() => import('@/features/movements/MovementsPage'));
const HealthPage = lazy(() => import('@/features/health/HealthPage'));
const NotFoundPage = lazy(() => import('@/features/errors/NotFoundPage'));
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage'));
const MarketCalendarPage = lazy(() => import('@/features/markets/MarketCalendarPage'));
const MovementRequestsPage = lazy(() => import('@/features/movements/MovementRequestsPage'));
const PremiseMovementsPage = lazy(() => import('@/features/movements/PremiseMovementsPage'));
const HerdMovementsPage       = lazy(() => import('@/features/movements/HerdMovementsPage'));
const DiseaseReportingPage    = lazy(() => import('@/features/disease-reporting/DiseaseReportingPage'));
const TagRequestPage          = lazy(() => import('@/features/tags/TagRequestPage'));
const MovementMapPage         = lazy(() => import('@/features/map/MovementMapPage'));
const CertificatesPage        = lazy(() => import('@/features/certificates/CertificatesPage'));
const HerdBatchPage           = lazy(() => import('@/features/herds/HerdBatchPage'));
const BatchDetailPage         = lazy(() => import('@/features/herds/BatchDetailPage'));
const SettingsPage            = lazy(() => import('@/features/settings/SettingsPage'));
const DatabasePage            = lazy(() => import('@/features/database/DatabasePage'));
const ActivityCenterPage      = lazy(() => import('@/features/activity/ActivityCenterPage'));
const ActionCenterPage        = lazy(() => import('@/features/action-center/ActionCenterPage'));

function Loading(): JSX.Element {
  return <div aria-busy="true" aria-label="Loading…" />;
}

function S({ children }: { children: React.ReactNode }): JSX.Element {
  return <Suspense fallback={<Loading />}>{children}</Suspense>;
}

function RequireAuth({ children }: { children: React.ReactNode }): JSX.Element {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },

  { path: '/login', element: <S><LoginPage /></S> },
  { path: '/register/select', element: <S><RegisterSelectPage /></S> },
  { path: '/register', element: <S><RegisterPage /></S> },
  { path: '/register/exporter', element: <S><ExporterRegisterPage /></S> },
  { path: '/register/facility', element: <S><FacilityRegisterPage /></S> },
  { path: '/verify-otp', element: <S><VerifyOtpPage /></S> },
  { path: '/forgot-password', element: <S><ForgotPasswordPage /></S> },
  { path: '/reset-password', element: <S><ResetPasswordPage /></S> },
  { path: '/invitations/:code/accept', element: <S><InvitationAcceptPage /></S> },
  { path: '/terms', element: <S><TermsPage /></S> },

  {
    element: <RequireAuth><S><AppLayout /></S></RequireAuth>,
    children: [
      { path: '/dashboard', element: <S><DashboardPage /></S> },
      { path: '/premises', element: <S><PremisesPage /></S> },
      { path: '/premises/:code', element: <S><PremisesDetailPage /></S> },
      { path: '/premises/:code/info', element: <S><PremisesInfoPage /></S> },
      { path: '/premises/:code/tags', element: <S><TagInventoryPage /></S> },
      { path: '/animals/register', element: <S><RegisterAnimalPage /></S> },
      { path: '/animals/:animalId', element: <S><AnimalDetailPage /></S> },
      { path: '/animals/profile/:animalId', element: <S><AnimalProfilePage /></S> },
      { path: '/movements',          element: <S><MovementsPage /></S>         },
      { path: '/movement-requests',  element: <S><MovementRequestsPage /></S>  },
      { path: '/premise-movements', element: <S><PremiseMovementsPage /></S>   },
      { path: '/herd-movements',    element: <S><HerdMovementsPage /></S>      },
      { path: '/markets',            element: <S><MarketCalendarPage /></S>     },
      { path: '/health', element: <S><HealthPage /></S> },
      { path: '/disease-reporting', element: <S><DiseaseReportingPage /></S> },
      { path: '/tags', element: <S><TagRequestPage /></S> },
      { path: '/map',           element: <S><MovementMapPage /></S>  },
      { path: '/certificates', element: <S><CertificatesPage /></S> },
      { path: '/herds',             element: <S><HerdBatchPage /></S>     },
      { path: '/herds/:batchId',   element: <S><BatchDetailPage /></S>   },
      { path: '/profile', element: <S><ProfilePage /></S> },
      { path: '/settings', element: <S><SettingsPage /></S> },
      { path: '/database', element: <S><DatabasePage /></S> },
      { path: '/activity-center', element: <S><ActivityCenterPage /></S> },
      { path: '/messenger',        element: <S><ActionCenterPage /></S>   },
    ],
  },

  { path: '/404', element: <S><NotFoundPage /></S> },
  { path: '*', element: <Navigate to="/404" replace /> },
]);
