import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';

const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const AppLayout = lazy(() => import('@/layouts/AppLayout'));
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
const PremisesPage = lazy(() => import('@/features/animals/AnimalsPage'));
const AnimalsPage       = lazy(() => import('@/features/animals/AnimalsListPage'));
const AnimalProfilePage = lazy(() => import('@/features/animals/AnimalProfilePage'));
const SubmissionReviewPage = lazy(() => import('@/features/animals/SubmissionReviewPage'));
const MovementsPage = lazy(() => import('@/features/movements/MovementsPage'));
const CertificationPage = lazy(() => import('@/features/certification/CertificationPage'));
const ReportingPage = lazy(() => import('@/features/reporting/ReportingPage'));
const TraceabilityPage = lazy(() => import('@/features/traceability/TraceabilityPage'));
const UsersPage          = lazy(() => import('@/features/users/UsersPage'));
const RegisterUserPage   = lazy(() => import('@/features/users/RegisterUserPage'));
const RegionalAssignmentPage = lazy(() => import('@/features/regions/RegionalAssignmentPage'));
const AuditPage = lazy(() => import('@/features/audit/AuditPage'));
const MapPage = lazy(() => import('@/features/map/SomaliaMapPage'));
const VaccinationPlanPage    = lazy(() => import('@/features/vaccination/VaccinationPlanPage'));
const RecentActivitiesPage   = lazy(() => import('@/features/activity/RecentActivitiesPage'));
const DiseaseCasesPage       = lazy(() => import('@/features/disease-cases/DiseaseCasesPage'));
const TagManagementPage      = lazy(() => import('@/features/tags/TagManagementPage'));
const BatchRegistryPage      = lazy(() => import('@/features/batches/BatchRegistryPage'));
const FarmerReviewPage  = lazy(() => import('@/features/farmers/FarmerReviewPage'));
const FarmerDetailPage  = lazy(() => import('@/features/farmers/FarmerDetailPage'));
const PublicFarmerPage  = lazy(() => import('@/features/farmers/PublicFarmerPage'));
const SettingsPage      = lazy(() => import('@/features/settings/SettingsPage'));
const NotFoundPage = lazy(() => import('@/features/errors/NotFoundPage'));
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage'));
const ActionCenterPage  = lazy(() => import('@/features/action-center/ActionCenterPage'));
const FacilitiesPage         = lazy(() => import('@/features/facilities/FacilitiesPage'));
const RegisterFacilityPage   = lazy(() => import('@/features/facilities/RegisterFacilityPage'));
const FacilityDetailPage     = lazy(() => import('@/features/facilities/FacilityDetailPage'));
const AnalyticsPage          = lazy(() => import('@/features/analytics/AnalyticsPage'));
const PermitPrintPage        = lazy(() => import('@/features/movements/PermitPrintPage'));

function Loading(): JSX.Element {
  return <div aria-busy="true" aria-label="Loading…" />;
}

function S({ children }: { children: React.ReactNode }): JSX.Element {
  return <Suspense fallback={<Loading />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <S><LoginPage /></S> },

  {
    element: <S><AppLayout /></S>,
    children: [
      { path: '/dashboard', element: <S><DashboardPage /></S> },
      { path: '/premises', element: <S><PremisesPage /></S> },
      { path: '/animals',  element: <S><AnimalsPage /></S> },
      { path: '/animals/profile/:id', element: <S><AnimalProfilePage /></S> },
      { path: '/animals/submission/:submissionId', element: <S><SubmissionReviewPage /></S> },
      { path: '/movements', element: <S><MovementsPage /></S> },
      { path: '/vaccination-plan',  element: <S><VaccinationPlanPage /></S>  },
      { path: '/activities',        element: <S><RecentActivitiesPage /></S>  },
      { path: '/certification', element: <S><CertificationPage /></S> },
      { path: '/reporting', element: <S><ReportingPage /></S> },
      { path: '/traceability', element: <S><TraceabilityPage /></S> },
      { path: '/regions', element: <S><RegionalAssignmentPage /></S> },
      { path: '/users',             element: <S><UsersPage /></S>        },
      { path: '/users/register',   element: <S><RegisterUserPage /></S> },
      { path: '/users/:id/edit',   element: <S><RegisterUserPage /></S> },
      { path: '/users/:id',        element: <S><UsersPage /></S>        },
      { path: '/audit', element: <S><AuditPage /></S> },
      { path: '/disease-cases', element: <S><DiseaseCasesPage /></S> },
      { path: '/tags',    element: <S><TagManagementPage /></S>   },
      { path: '/batches', element: <S><BatchRegistryPage /></S> },
      { path: '/map', element: <S><MapPage /></S> },
      { path: '/farmers',     element: <S><FarmerReviewPage /></S> },
      { path: '/farmers/:id', element: <S><FarmerDetailPage /></S> },
      { path: '/settings',      element: <S><SettingsPage /></S>     },
      { path: '/profile',       element: <S><ProfilePage /></S>      },
      { path: '/messenger',     element: <S><ActionCenterPage /></S> },
      { path: '/facilities',          element: <S><FacilitiesPage /></S>         },
      { path: '/facilities/register', element: <S><RegisterFacilityPage /></S>  },
      { path: '/facilities/:id',      element: <S><FacilityDetailPage /></S>    },
      { path: '/analytics',          element: <S><AnalyticsPage /></S>          },
    ],
  },

  { path: '/movements/permit/:permitNumber', element: <S><PermitPrintPage /></S> },
  { path: '/f/:code', element: <S><PublicFarmerPage /></S> },

  { path: '/404', element: <S><NotFoundPage /></S> },
  { path: '*', element: <Navigate to="/404" replace /> },
]);
