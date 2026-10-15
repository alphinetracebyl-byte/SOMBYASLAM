import { useState } from 'react';
import { Outlet, NavLink, useNavigate, Navigate, useLocation } from 'react-router-dom';
import {
  Power, MessageSquare, Activity,
  Truck, Archive, Stethoscope, FlaskConical, Pill,
  ShieldCheck, Zap, Package, FileCheck, Microscope, LayoutGrid, LayoutDashboard,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase';
import styles from './app.layout.module.css';

interface NavTab { id: string; label: string; Icon: React.ElementType; }

const QUARANTINE_TABS: NavTab[] = [
  { id: 'movements',   label: 'Incoming Movements', Icon: Truck        },
  { id: 'batches',     label: 'Batches',            Icon: Archive      },
  { id: 'inspections', label: 'Health Inspections', Icon: Stethoscope  },
  { id: 'lab',         label: 'Lab Samples',        Icon: FlaskConical },
  { id: 'monitoring',  label: 'Daily Monitoring',   Icon: Activity     },
  { id: 'treatments',  label: 'Treatments',         Icon: Pill         },
  { id: 'capacity',    label: 'Facility Capacity',  Icon: LayoutGrid   },
];

const SLAUGHTER_TABS: NavTab[] = [
  { id: 'overview',   label: 'Overview',           Icon: LayoutDashboard },
  { id: 'receiving',  label: 'Receiving',          Icon: Truck           },
  { id: 'antemortem', label: 'Ante-Mortem',        Icon: Stethoscope     },
  { id: 'halal',      label: 'Halal Verification', Icon: ShieldCheck     },
  { id: 'events',     label: 'Slaughter Events',   Icon: Zap             },
  { id: 'postmortem', label: 'Post-Mortem',        Icon: Microscope      },
  { id: 'dispatch',   label: 'Export Dispatch',    Icon: Package         },
  { id: 'certs',      label: 'Certificates',       Icon: FileCheck       },
];

const QUARANTINE_ROLES = ['QUARANTINE_SUPERVISOR', 'VETERINARY_OFFICER', 'LAB_TECHNICIAN'];
const SLAUGHTER_ROLES  = ['SLAUGHTER_SUPERVISOR',  'HALAL_SUPERVISOR',   'MEAT_INSPECTOR'];

function roleLabel(role: string): string {
  return role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function facilityTypeLabel(type: string): string {
  const map: Record<string, string> = {
    QUARANTINE_STATION: 'Quarantine Station',
    SLAUGHTERHOUSE:     'Slaughterhouse',
    CHECKPOINT:         'Checkpoint',
  };
  return map[type] ?? type;
}

export function AppLayout(): JSX.Element {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { isAuthenticated, staffName, staffRole, facilityCode, facilityName, facilityType, clearSession } = useAuthStore();

  const tabs: NavTab[] = QUARANTINE_ROLES.includes(staffRole ?? '')
    ? QUARANTINE_TABS
    : SLAUGHTER_ROLES.includes(staffRole ?? '')
    ? SLAUGHTER_TABS
    : [];

  const [activeTab, setActiveTab] = useState<string>(tabs[0]?.id ?? '');

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clearSession();
    void navigate('/login');
  };

  const initials = (staffName ?? 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const rLabel   = roleLabel(staffRole ?? '');
  const fLabel   = facilityTypeLabel(facilityType ?? '');
  const isDashboard = location.pathname === '/dashboard';

  return (
    <div className={styles.shell}>
      <nav className={styles.navbar}>
        <div className={styles.brand}>
          <div className={styles.brandLogo}>EF</div>
          <div>
            <div className={styles.brandName}>QXLITS</div>
            <div className={styles.brandSub}>Export &amp; Facilities Portal</div>
          </div>
        </div>

        <div className={styles.navLinks}>
          {isDashboard && tabs.map(t => (
            <button
              key={t.id}
              className={`${styles.navTab}${t.id === activeTab ? ' ' + styles.navTabActive : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              <t.Icon size={14} strokeWidth={1.75} />
              {t.label}
            </button>
          ))}
        </div>

        <div className={styles.navRight}>
          <div className={styles.facilityBadge}>
            <span className={styles.facilityCode}>{facilityCode}</span>
            <span className={styles.facilityName}>{facilityName}</span>
          </div>
          <div className={styles.navSep} />
          <NavLink
            to="/actions"
            className={({ isActive }) => `${styles.navItem}${isActive ? ' ' + styles.active : ''}`}
            title="Messenger"
          >
            <MessageSquare size={15} strokeWidth={1.75} />
          </NavLink>
          <NavLink
            to="/activity"
            className={({ isActive }) => `${styles.navItem}${isActive ? ' ' + styles.active : ''}`}
            title="Activity"
          >
            <Activity size={15} strokeWidth={1.75} />
          </NavLink>
          <div className={styles.navSep} />
          <button className={styles.userCard} onClick={() => void navigate('/profile')} title="My Profile">
            <div className={styles.userAvatar}>{initials}</div>
            <div className={styles.userMeta}>
              <span className={styles.userRoleLabel}>{rLabel}</span>
              <span className={styles.userPortal}>{fLabel}</span>
            </div>
          </button>
          <div className={styles.navSep} />
          <button className={styles.logoutBtn} onClick={() => void handleLogout()} title="Sign out">
            <Power size={16} strokeWidth={1.75} />
          </button>
        </div>
      </nav>

      <main className={styles.content}>
        <Outlet context={{ activeTab, setActiveTab }} />
      </main>
    </div>
  );
}

export default AppLayout;
