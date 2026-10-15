import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useAuthStore } from '@/store/auth.store';

function RoleRedirect() {
  const role = useAuthStore(s => s.roles[0] ?? '');
  if (role === 'QUARANTINE_OFFICER')   return <Navigate to="/quarantine" replace />;
  if (role === 'SLAUGHTERHOUSE_OFFICER') return <Navigate to="/slaughter" replace />;
  return <Navigate to="/dashboard" replace />;
}

const S = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div aria-busy="true" aria-label="Loading…" />}>{children}</Suspense>
);

const LoginPage                 = lazy(() => import('@/features/auth/LoginPage'));
const AppLayout                 = lazy(() => import('@/layouts/AppLayout'));
const DashboardPage             = lazy(() => import('@/features/dashboard/DashboardPage'));
const FarmersPage               = lazy(() => import('@/features/farmers/FarmersPage'));
const RegionAnimalsPage         = lazy(() => import('@/features/animals/RegionAnimalsPage'));
const AnimalRegistrationPage    = lazy(() => import('@/features/animals/AnimalRegistrationPage'));
const TaggingPage               = lazy(() => import('@/features/tagging/TaggingPage'));
const TagRequestsPage           = lazy(() => import('@/features/tagging/TagRequestsPage'));
const MovementsPage             = lazy(() => import('@/features/movements/MovementsPage'));
const HealthEventsPage          = lazy(() => import('@/features/health/HealthEventsPage'));
const PremisesPage              = lazy(() => import('@/features/premises/PremisesPage'));
const QuarantinePage            = lazy(() => import('@/features/quarantine/QuarantinePage'));
const SlaughterPage             = lazy(() => import('@/features/slaughter/SlaughterPage'));
const VerificationTasksPage     = lazy(() => import('@/features/tasks/VerificationTasksPage'));
const NotFoundPage              = lazy(() => import('@/features/errors/NotFoundPage'));
const ProfilePage               = lazy(() => import('@/features/profile/ProfilePage'));
const DiseaseReportingPage      = lazy(() => import('@/features/disease-reporting/DiseaseReportingPage'));
const HerdBatchFieldPage        = lazy(() => import('@/features/herds/HerdBatchFieldPage'));
const CheckpointScanPage        = lazy(() => import('@/features/checkpoint/CheckpointScanPage'));
const AnimalProfilePage         = lazy(() => import('@/features/animals/AnimalProfilePage'));
const ActivityCenterPage        = lazy(() => import('@/features/activity/ActivityCenterPage'));
const InspectionsPage                = lazy(() => import('@/features/inspections/InspectionsPage'));
const InspectionWorkflowPage         = lazy(() => import('@/features/inspections/InspectionWorkflowPage'));
const DestinationCheckWorkflowPage   = lazy(() => import('@/features/inspections/DestinationCheckWorkflowPage'));
const ActionCenterPage               = lazy(() => import('@/features/action-center/ActionCenterPage'));

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <S><LoginPage /></S>,
  },
  {
    element: <S><AppLayout /></S>,
    children: [
      { path: '/',              element: <RoleRedirect /> },
      { path: '/dashboard',     element: <S><DashboardPage /></S> },
      { path: '/farmers',       element: <S><FarmersPage /></S> },
      { path: '/animals',                     element: <S><RegionAnimalsPage /></S> },
      { path: '/animals/register',            element: <S><AnimalRegistrationPage /></S> },
      { path: '/animals/profile/:animalId',   element: <S><AnimalProfilePage /></S> },
      { path: '/tagging',        element: <S><TaggingPage /></S> },
      { path: '/tag-requests',   element: <S><TagRequestsPage /></S> },
      { path: '/movements',     element: <S><MovementsPage /></S> },
      { path: '/health',        element: <S><HealthEventsPage /></S> },
      { path: '/premises',      element: <S><PremisesPage /></S> },
      { path: '/quarantine',    element: <S><QuarantinePage /></S> },
      { path: '/slaughter',     element: <S><SlaughterPage /></S> },
      { path: '/tasks',              element: <S><VerificationTasksPage /></S> },
      { path: '/disease-reporting', element: <S><DiseaseReportingPage /></S> },
      { path: '/herds',             element: <S><HerdBatchFieldPage /></S>   },
      { path: '/checkpoint',        element: <S><CheckpointScanPage /></S>   },
      { path: '/profile',           element: <S><ProfilePage /></S> },
      { path: '/activity-center',   element: <S><ActivityCenterPage /></S> },
      { path: '/messenger',          element: <S><ActionCenterPage /></S> },
      { path: '/inspections',               element: <S><InspectionsPage /></S> },
      { path: '/inspections/:inspectionId', element: <S><InspectionWorkflowPage /></S> },
      { path: '/destination-checks/:checkId', element: <S><DestinationCheckWorkflowPage /></S> },
    ],
  },
  {
    path: '/404',
    element: <S><NotFoundPage /></S>,
  },
  { path: '*', element: <Navigate to="/404" replace /> },
]);
