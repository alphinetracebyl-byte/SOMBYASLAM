import { Suspense, lazy } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Truck, Archive, Stethoscope, FlaskConical, Activity, Pill,
  Package, FileCheck, ShieldCheck, Zap, Microscope, Navigation,
  Loader2, LayoutGrid, LayoutDashboard,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import s from './home.module.css';

/* ── Lazy-load page components ───────────────────────────────── */
const MovementRequestsPage  = lazy(() => import('@/features/quarantine/MovementRequestsPage'));
const BatchListPage         = lazy(() => import('@/features/quarantine/BatchListPage'));
const HealthInspectionsPage = lazy(() => import('@/features/quarantine/HealthInspectionsPage'));
const LabSamplesPage        = lazy(() => import('@/features/quarantine/LabSamplesPage'));
const DailyMonitoringPage   = lazy(() => import('@/features/quarantine/DailyMonitoringPage'));
const TreatmentRecordsPage  = lazy(() => import('@/features/quarantine/TreatmentRecordsPage'));
const CapacityWidgetPage    = lazy(() => import('@/features/quarantine/CapacityWidget').then(m => ({ default: m.CapacityWidget })));

const SlaughterDashboard    = lazy(() => import('@/features/slaughter/SlaughterDashboard').then(m => ({ default: m.SlaughterDashboard })));
const AnimalReceivingPage   = lazy(() => import('@/features/slaughter/AnimalReceivingPage'));
const AnteMortemPage        = lazy(() => import('@/features/slaughter/AnteMortemPage'));
const HalalVerificationPage = lazy(() => import('@/features/slaughter/HalalVerificationPage'));
const SlaughterEventPage    = lazy(() => import('@/features/slaughter/SlaughterEventPage'));
const PostMortemPage        = lazy(() => import('@/features/slaughter/PostMortemPage'));
const ExportDispatchPage    = lazy(() => import('@/features/slaughter/ExportDispatchPage'));
const CertificatesPage      = lazy(() => import('@/features/slaughter/CertificatesPage'));

/* ── Role constants ──────────────────────────────────────────── */
const QUARANTINE_ROLES = ['QUARANTINE_SUPERVISOR', 'VETERINARY_OFFICER', 'LAB_TECHNICIAN'];
const SLAUGHTER_ROLES  = ['SLAUGHTER_SUPERVISOR', 'HALAL_SUPERVISOR', 'MEAT_INSPECTOR'];
const CHECKPOINT_ROLES = ['INSPECTOR'];

interface TabDef {
  id:        string;
  label:     string;
  Icon:      React.ElementType;
  Component: React.LazyExoticComponent<() => JSX.Element>;
}

const QUARANTINE_TABS: TabDef[] = [
  { id: 'movements',   label: 'Incoming Movements', Icon: Truck,        Component: MovementRequestsPage  },
  { id: 'batches',     label: 'Batches',            Icon: Archive,      Component: BatchListPage         },
  { id: 'inspections', label: 'Health Inspections', Icon: Stethoscope,  Component: HealthInspectionsPage },
  { id: 'lab',         label: 'Lab Samples',        Icon: FlaskConical, Component: LabSamplesPage        },
  { id: 'monitoring',  label: 'Daily Monitoring',   Icon: Activity,     Component: DailyMonitoringPage   },
  { id: 'treatments',  label: 'Treatments',         Icon: Pill,         Component: TreatmentRecordsPage  },
  { id: 'capacity',    label: 'Facility Capacity',  Icon: LayoutGrid,   Component: CapacityWidgetPage    },
];

const SLAUGHTER_TABS: TabDef[] = [
  { id: 'overview',   label: 'Overview',           Icon: LayoutDashboard, Component: SlaughterDashboard    },
  { id: 'receiving',  label: 'Receiving',          Icon: Truck,           Component: AnimalReceivingPage   },
  { id: 'antemortem', label: 'Ante-Mortem',        Icon: Stethoscope,     Component: AnteMortemPage        },
  { id: 'halal',      label: 'Halal Verification', Icon: ShieldCheck,     Component: HalalVerificationPage },
  { id: 'events',     label: 'Slaughter Events',   Icon: Zap,             Component: SlaughterEventPage    },
  { id: 'postmortem', label: 'Post-Mortem',        Icon: Microscope,      Component: PostMortemPage        },
  { id: 'dispatch',   label: 'Export Dispatch',    Icon: Package,         Component: ExportDispatchPage    },
  { id: 'certs',      label: 'Certificates',       Icon: FileCheck,       Component: CertificatesPage      },
];

function TabSpinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', color: '#94a3b8' }}>
      <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );
}

export function HomePage(): JSX.Element {
  const { staffRole } = useAuthStore();
  const { activeTab } = useOutletContext<{ activeTab: string }>();

  const isQuarantine = QUARANTINE_ROLES.includes(staffRole ?? '');
  const isSlaughter  = SLAUGHTER_ROLES.includes(staffRole ?? '');
  const isCheckpoint = CHECKPOINT_ROLES.includes(staffRole ?? '');

  const tabs: TabDef[] = isQuarantine
    ? QUARANTINE_TABS
    : isSlaughter
    ? SLAUGHTER_TABS
    : [];

  const active = tabs.find(t => t.id === activeTab) ?? tabs[0];

  if (isCheckpoint) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        <Navigation size={40} strokeWidth={1.5} style={{ margin: '0 auto 1rem' }} />
        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' }}>Checkpoint Portal</div>
        <div style={{ fontSize: '0.875rem' }}>Checkpoint flows coming soon.</div>
      </div>
    );
  }

  if (tabs.length === 0) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        No workflows assigned to your role.
      </div>
    );
  }

  return (
    <div className={s.page}>
      <div className={s.panel}>
        <Suspense fallback={<TabSpinner />}>
          {active && <active.Component />}
        </Suspense>
      </div>
    </div>
  );
}

export default HomePage;
