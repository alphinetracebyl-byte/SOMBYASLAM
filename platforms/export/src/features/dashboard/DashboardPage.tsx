import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { ShieldOff, Beef, Navigation, FileText, ClipboardCheck, TrendingUp, Truck, Microscope, Package } from 'lucide-react';
import s from './dashboard.module.css';

type ModuleItem = { icon: typeof ShieldOff; title: string; body: string; path: string };

const TYPE_CONFIG: Record<string, {
  label: string; icon: typeof ShieldOff; color: string; description: string;
  rootPath: string; modules: ModuleItem[];
}> = {
  QUARANTINE_STATION: {
    label: 'Quarantine Station', icon: ShieldOff, color: '#b91c1c',
    description: 'Manage animal health inspections, quarantine periods, lab tests and release certificates.',
    rootPath: '/quarantine',
    modules: [
      { icon: Truck,         title: 'Movement Requests', body: 'Accept and process inbound livestock movement permits.',          path: '/quarantine/movements'  },
      { icon: ClipboardCheck,title: 'Quarantine Batches', body: 'Track active quarantine batches and animal status.',             path: '/quarantine/batches'    },
      { icon: Microscope,    title: 'Lab Samples',       body: 'Record sample collection and enter diagnostic results.',          path: '/quarantine/lab'        },
      { icon: FileText,      title: 'Health Inspections', body: 'Periodic and admission health inspection records.',              path: '/quarantine/inspections' },
      { icon: TrendingUp,    title: 'Daily Monitoring',  body: 'Daily animal welfare and pen condition records.',                 path: '/quarantine/monitoring' },
      { icon: Package,       title: 'Treatment Records', body: 'Medicine administration and withdrawal period tracking.',         path: '/quarantine/treatments' },
    ],
  },
  SLAUGHTERHOUSE: {
    label: 'Slaughterhouse', icon: Beef, color: '#7c3aed',
    description: 'Record daily slaughter operations, halal certification and meat hygiene inspection results.',
    rootPath: '/slaughter',
    modules: [
      { icon: Truck,         title: 'Animal Receiving',       body: 'Accept animals from movement permits and assign pens.',     path: '/slaughter/receiving'    },
      { icon: ClipboardCheck,title: 'Ante-mortem Inspection', body: 'Pre-slaughter health assessment and fitness decisions.',    path: '/slaughter/antemortem'   },
      { icon: FileText,      title: 'Halal Verification',     body: 'Halal compliance verification per slaughter operation.',    path: '/slaughter/halal'        },
      { icon: TrendingUp,    title: 'Slaughter Events',       body: 'Record slaughter line activity and assign carcass codes.',  path: '/slaughter/events'       },
      { icon: Microscope,    title: 'Post-mortem Inspection', body: 'Carcass and organ inspection, condemnation recording.',     path: '/slaughter/postmortem'   },
      { icon: Package,       title: 'Export Dispatch',        body: 'Build and manage export consignments for cleared meat.',    path: '/slaughter/dispatch'     },
    ],
  },
  CHECKPOINT: {
    label: 'Border Checkpoint', icon: Navigation, color: '#0891b2',
    description: 'Verify movement permits, inspect livestock at border points and issue clearances.',
    rootPath: '/checkpoint',
    modules: [
      { icon: ClipboardCheck, title: 'Permit Verification',    body: 'Verify animal movement permits at the checkpoint.',       path: '/checkpoint' },
      { icon: FileText,       title: 'Inspection Records',     body: 'Record animal counts and health spot-checks.',            path: '/checkpoint' },
      { icon: TrendingUp,     title: 'Crossing Reports',       body: 'Daily livestock crossing summaries by species.',          path: '/checkpoint' },
    ],
  },
};

export function DashboardPage(): JSX.Element {
  const navigate = useNavigate();
  const { staffName, staffRole, facilityCode, facilityName, facilityType } = useAuthStore();

  const cfg = TYPE_CONFIG[facilityType ?? ''] ?? TYPE_CONFIG['QUARANTINE_STATION'];
  const FacIcon = cfg.icon;
  const roleFormatted = (staffRole ?? '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className={s.page}>
      <div className={s.welcomeBanner}>
        <div className={s.welcomeIcon}>
          <FacIcon size={22} strokeWidth={1.5} color="#fff" />
        </div>
        <div>
          <div className={s.welcomeTitle}>Welcome, {staffName ?? 'Officer'}</div>
          <div className={s.welcomeSub}>
            {roleFormatted} · {facilityName} ({facilityCode}) · {cfg.label}
          </div>
          <div className={s.welcomeDesc}>{cfg.description}</div>
        </div>
      </div>

      <div className={s.sectionTitle}>QUICK ACCESS</div>
      <div className={s.moduleGrid}>
        {cfg.modules.map((mod) => {
          const ModIcon = mod.icon;
          return (
            <button key={mod.title} className={s.moduleCard} onClick={() => void navigate(mod.path)}
              style={{ textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', border: '1px solid #e2e8f0', background: '#fff' }}>
              <div className={s.moduleCardIcon}>
                <ModIcon size={22} strokeWidth={1.5} />
              </div>
              <div className={s.moduleCardTitle}>{mod.title}</div>
              <div className={s.moduleCardBody}>{mod.body}</div>
              <div className={s.moduleCardFooter}>Open →</div>
            </button>
          );
        })}
      </div>

      <div className={s.infoNote}>
        Navigate using the <strong>{cfg.label}</strong> section in the top menu for the full module view.
      </div>
    </div>
  );
}

export default DashboardPage;
