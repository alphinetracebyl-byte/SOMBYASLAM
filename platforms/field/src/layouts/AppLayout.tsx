import { NavLink, Outlet, useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { useRef, useState, useEffect } from 'react';
import {
  LayoutDashboard, Beef, MapPin, Navigation, Activity,
  Tag, ShieldOff, ClipboardList, Power, ClipboardCheck, Users, ScanLine, Package, UserCheck,
  Zap, ChevronDown, MessageSquare,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase';
import styles from './app.layout.module.css';

const ALL_NAV = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard'    },
  { to: '/farmers',      icon: UserCheck,       label: 'Farmers'      },
  { to: '/animals',      icon: Beef,            label: 'Animals'      },
  { to: '/movements',    icon: Navigation,      label: 'Movements'    },
  { to: '/health',       icon: Activity,        label: 'Health Events'},
  { to: '/tagging',      icon: Tag,             label: 'Tagging'      },
  { to: '/tag-requests', icon: Package,         label: 'Tag Requests' },
  { to: '/quarantine',   icon: ShieldOff,       label: 'Quarantine'   },
  { to: '/slaughter',    icon: ClipboardList,   label: 'Slaughter'    },
  { to: '/premises',     icon: MapPin,          label: 'Premises'     },
  { to: '/tasks',           icon: ClipboardCheck, label: 'My Tasks'         },
  { to: '/messenger',     icon: MessageSquare,  label: 'Messenger'        },
  { to: '/herds',        icon: Users,           label: 'Herd Batches' },
  { to: '/checkpoint',   icon: ScanLine,        label: 'Checkpoint'   },
];

const NAV_PATHS: Record<string, string[]> = {
  FIELD_INSPECTOR:             ['/dashboard', '/farmers', '/tasks', '/animals', '/herds', '/movements', '/premises', '/tagging', '/tag-requests'],
  VETERINARY_OFFICER:          ['/dashboard', '/tasks', '/animals', '/herds', '/health', '/premises'],
  SLAUGHTERHOUSE_OFFICER:      ['/slaughter'],
  QUARANTINE_OFFICER:          ['/quarantine'],
  SOCIAL_WORKER:          ['/dashboard', '/tasks', '/animals', '/herds', '/premises', '/tagging', '/tag-requests'],
  CHECKPOINT_OFFICER:     ['/dashboard', '/checkpoint', '/animals', '/herds', '/movements', '/tagging', '/tag-requests'],
};

function getNav(role: string) {
  const paths = NAV_PATHS[role] ?? NAV_PATHS.FIELD_INSPECTOR;
  return paths.map(p => ALL_NAV.find(n => n.to === p)!).filter(Boolean);
}

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':  'Dashboard',
  '/farmers':    'Farmer Registrations',
  '/animals':    'Animals',
  '/movements':  'Movements',
  '/health':     'Health Events',
  '/tagging':      'Tag Application',
  '/tag-requests': 'Tag Requests',
  '/quarantine': 'Quarantine',
  '/slaughter':  'Slaughter',
  '/premises':          'Premises',
  '/disease-reporting': 'Disease Reporting',
  '/herds':             'Herd Batches',
  '/checkpoint':        'Checkpoint Scanner',
  '/tasks':             'My Tasks',
  '/inspections':       'Pre-Movement Inspections',
  '/inspections/:id':   'Inspection Workflow',
  '/activity-center':   'Activity Center',
  '/messenger':         'Messenger',
};

const TODAY = new Date().toLocaleDateString('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
});

const CAT_DOT: Record<string, string> = {
  ANIMAL: '#2563eb', MOVEMENT: '#d97706', HEALTH: '#dc2626',
  PREMISES: '#475569', TAGGING: '#ea580c', VACCINATION: '#0891b2',
  CERTIFICATION: '#4f46e5', QUARANTINE: '#b91c1c', SLAUGHTER: '#7c3aed',
};

function relTime(ts: string): string {
  const mins = Math.floor((Date.now() - new Date(ts).getTime()) / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function useClickOutside(ref: React.RefObject<HTMLElement>, cb: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cb();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, cb]);
}

function ActivityDropdown() {
  const { regionCode } = useAuthStore();
  const [open,  setOpen]  = useState(false);
  const [items, setItems] = useState<{ id: string; title: string; category: string; created_at: string }[]>([]);
  const ref = useRef<HTMLDivElement>(null!);
  useClickOutside(ref, () => setOpen(false));

  useEffect(() => {
    if (!open) return;
    let q = supabase.from('activity_log').select('id,title,category,created_at')
      .order('created_at', { ascending: false }).limit(6);
    if (regionCode) q = q.eq('region', regionCode);
    void q.then(({ data }) => setItems((data ?? []) as typeof items));
  }, [open, regionCode]);

  return (
    <div className={styles.dropWrap} ref={ref}>
      <button className={styles.activityBtn} onClick={() => setOpen(o => !o)} title="Activity Center">
        <Zap size={14} strokeWidth={2} />
        <span>Activity Center</span>
        <ChevronDown size={12} strokeWidth={2} className={open ? styles.chevronUp : ''} />
      </button>
      {open && (
        <div className={styles.dropdown}>
          <div className={styles.dropHeader}>Activity Center</div>
          {items.length === 0
            ? <div className={styles.dropActivity} style={{ color: '#9ca3af', fontSize: '0.8rem' }}>No recent activity</div>
            : items.map(a => (
              <div key={a.id} className={styles.dropActivity} onClick={() => setOpen(false)}>
                <span className={styles.dropDot} style={{ background: CAT_DOT[a.category] ?? '#94a3b8' }} />
                <div className={styles.dropActivityText}>{a.title}</div>
                <span className={styles.dropTime}>{relTime(a.created_at)}</span>
              </div>
            ))
          }
          <Link to="/activity-center" className={styles.dropFooter} onClick={() => setOpen(false)}>
            View all activity →
          </Link>
        </div>
      )}
    </div>
  );
}

function toLabel(role?: string) {
  return (role ?? 'FIELD_INSPECTOR').replace(/_/g, ' ').toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function toInitials(label: string) {
  return label.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export function AppLayout(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { clearSession, roles, territoryType, regionCode, isAuthenticated } = useAuthStore();
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id;
      if (!uid) return;
      const { count } = await supabase
        .from('action_messages')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'UNREAD')
        .or(`to_user_id.eq.${uid},to_user_id.is.null`);
      setUnreadMsgCount(count ?? 0);
    });
  }, [location.pathname]);

  const titlePath = location.pathname.startsWith('/inspections/') ? '/inspections/:id' : location.pathname;
  const title = PAGE_TITLES[titlePath] ?? PAGE_TITLES[location.pathname] ?? 'QXLITS Field';

  const handleLogout = () => { clearSession(); void navigate('/login'); };

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const roleLabel = toLabel(roles[0]);
  const initials = toInitials(roleLabel);
  const territory = [territoryType, regionCode].filter(Boolean).join(' · ');
  const nav = getNav(roles[0] ?? 'FIELD_INSPECTOR');

  return (
    <div className={styles.shell}>
      <nav className={styles.navbar}>
        <div className={styles.brand}>
          <div className={styles.brandLogo}>FO</div>
          <div>
            <div className={styles.brandName}>QXLITS</div>
            <div className={styles.brandSub}>Field Portal</div>
          </div>
        </div>

        <div className={styles.navLinks}>
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `${styles.navItem}${isActive ? ' ' + styles.active : ''}`
              }
            >
              <Icon size={15} strokeWidth={1.75} className={styles.navIcon} />
              {label}
            </NavLink>
          ))}
        </div>

        <div className={styles.navRight}>
          <ActivityDropdown />
          <NavLink
            to="/messenger"
            className={({ isActive }) =>
              `${styles.actionCenterBtn}${isActive ? ' ' + styles.actionCenterBtnActive : ''}`
            }
            title="Messenger"
          >
            <MessageSquare size={14} strokeWidth={2} />
            <span>Messages</span>
            {unreadMsgCount > 0 && (
              <span className={styles.msgBadge}>{unreadMsgCount > 99 ? '99+' : unreadMsgCount}</span>
            )}
          </NavLink>
          <div className={styles.navSep} />
          <Link to="/profile" className={styles.userCard} title="My Profile">
            <div className={styles.userAvatar}>{initials}</div>
            <div className={styles.userMeta}>
              <span className={styles.userRoleLabel}>{roleLabel}</span>
              <span className={styles.userPortal}>{territory || 'Field Portal'}</span>
            </div>
          </Link>
          <div className={styles.navSep} />
          <button className={styles.logoutBtn} onClick={handleLogout} title="Sign out" aria-label="Sign out">
            <Power size={16} strokeWidth={1.75} />
          </button>
        </div>
      </nav>

      <div className={styles.subheader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {location.pathname.split('/').filter(Boolean).length > 1 && (
            <button onClick={() => window.history.back()} style={{ border: 'none', background: '#f1f5f9', borderRadius: 8, padding: '0.3rem 0.6rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>&#8592; Back</button>
          )}
          <div>
            <div className={styles.pageTitle}>{title}</div>
            <div className={styles.breadcrumb}>
              <Link to="/dashboard" style={{ color: 'inherit', textDecoration: 'none', opacity: 0.7 }}>Field</Link>
              {' / '}
              <span>{title}</span>
            </div>
          </div>
        </div>
        <div className={styles.subheaderRight}>{TODAY}</div>
      </div>

      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
