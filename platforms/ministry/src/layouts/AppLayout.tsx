import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, Navigation,
  Users, MapPin, Syringe, Zap, Tag,
  Map, Beef, LayoutGrid, Power, UserCheck, Settings, ChevronDown, MessageSquare, Building2, BarChart2,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase';
import styles from './app.layout.module.css';

const NAV = [
  { to: '/dashboard',        icon: LayoutDashboard, label: 'Dashboard'    },
  { to: '/farmers',          icon: UserCheck,       label: 'Farmers'      },
  { to: '/map',              icon: Map,             label: 'Farm Premises' },
  { to: '/facilities',       icon: Building2,       label: 'Facilities'   },
  { to: '/movements',        icon: Navigation,      label: 'Movements'    },
  { to: '/vaccination-plan', icon: Syringe,         label: 'Vaccination'  },
  { to: '/tags',             icon: Tag,             label: 'Tags'         },
  { to: '/analytics',       icon: BarChart2,       label: 'Analytics'    },
];

const QUICK_ACCESS = [
  { to: '/animals',    icon: Beef,     label: 'Animals Database' },
  { to: '/regions',    icon: MapPin,   label: 'Region Settings'  },
  { to: '/users',      icon: Users,    label: 'Users'            },
  { to: '/settings',   icon: Settings, label: 'Settings'         },
];

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':        'Dashboard',
  '/farmers':          'Farmer Review',
  '/settings':         'Settings',
  '/map':              'Farm Premises',
  '/premises':         'Premises',
  '/batches':          'Herd Batches',
  '/animals':          'Animals',
  '/movements':        'Movement Control',
  '/vaccination-plan': 'National Vaccination Plan',
  '/activities':       'Recent Activities',
  '/certification':    'Certification',
  '/regions':          'Regional Assignments',
  '/users':            'User Management',
  '/users/register':   'Register User',
  '/audit':            'Audit Log',
  '/disease-cases':    'Disease Cases',
  '/tags':             'Tag Management',
  '/facilities':          'Facilities',
  '/facilities/register': 'Register Facility',
  '/messenger':        'Messenger',
  '/analytics':        'Analytics',
};

const TODAY = new Date().toLocaleDateString('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
});

const CAT_DOT: Record<string, string> = {
  ANIMAL: '#2563eb', MOVEMENT: '#d97706', HEALTH: '#dc2626',
  PREMISES: '#475569', TAGGING: '#ea580c', VACCINATION: '#0891b2',
  CERTIFICATION: '#4f46e5', QUARANTINE: '#b91c1c', USER: '#7c3aed',
};

function relTime(ts: string): string {
  const mins = Math.floor((Date.now() - new Date(ts).getTime()) / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function toLabel(role?: string) {
  return (role ?? 'MINISTRY_OFFICER').replace(/_/g, ' ').toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function toInitials(label: string) {
  return label.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export function AppLayout(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { clearSession, roles, territoryType, isAuthenticated } = useAuthStore();
  const title = PAGE_TITLES[location.pathname]
    ?? (location.pathname.startsWith('/animals/profile') ? 'Animal Profile'
      : location.pathname.startsWith('/farmers/') ? 'Farmer Details'
      : 'Ministry Portal');

  const handleLogout = () => { clearSession(); void navigate('/login'); };

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const roleLabel  = toLabel(roles[0]);
  const initials   = toInitials(roleLabel);
  const subtitle   = territoryType ?? 'Ministry Portal';

  const [quickOpen,    setQuickOpen]    = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityItems, setActivityItems] = useState<{ id: string; title: string; category: string; created_at: string }[]>([]);
  const quickRef    = useRef<HTMLDivElement>(null);
  const activityRef = useRef<HTMLDivElement>(null);

  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const userRole = roles[0] ?? 'MINISTRY_STAFF';

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id;
      if (!uid) return;
      const { count } = await supabase
        .from('action_messages')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'UNREAD')
        .or(`to_user_id.eq.${uid},and(to_user_id.is.null,to_role.eq.${userRole})`);
      setUnreadMsgCount(count ?? 0);
    });
  }, [location.pathname]); // refresh when navigating back from messenger

  useEffect(() => {
    if (!quickOpen) return;
    function handleClick(e: MouseEvent) {
      if (quickRef.current && !quickRef.current.contains(e.target as Node)) setQuickOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [quickOpen]);

  useEffect(() => {
    if (!activityOpen) return;
    function handleClick(e: MouseEvent) {
      if (activityRef.current && !activityRef.current.contains(e.target as Node)) setActivityOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [activityOpen]);

  useEffect(() => {
    if (!activityOpen) return;
    void supabase.from('activity_log')
      .select('id,title,category,created_at')
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => setActivityItems((data ?? []) as typeof activityItems));
  }, [activityOpen]);

  return (
    <div className={styles.shell}>
      <nav className={styles.navbar}>
        <div className={styles.brand}>
          <div className={styles.brandLogo}>MO</div>
          <div>
            <div className={styles.brandName}>QXLITS</div>
            <div className={styles.brandSub}>Ministry Portal</div>
          </div>
        </div>

        <div className={styles.navLinks}>
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={to === '/map' && location.pathname === '/map' ? () => window.location.reload() : undefined}
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
          <NavLink
            to="/messenger"
            className={({ isActive }) => `${styles.navItem}${isActive ? ' ' + styles.active : ''}`}
          >
            <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <MessageSquare size={15} strokeWidth={1.75} className={styles.navIcon} />
              {unreadMsgCount > 0 && (
                <span className={styles.msgBadge}>{unreadMsgCount > 99 ? '99+' : unreadMsgCount}</span>
              )}
            </span>
            Messenger
          </NavLink>

          {/* Activity Center dropdown */}
          <div className={styles.activityWrap} ref={activityRef}>
            <button
              className={`${styles.activityBtn}${activityOpen ? ' ' + styles.activityBtnOpen : ''}`}
              onClick={() => setActivityOpen(v => !v)}
              title="Activity Center"
            >
              <Zap size={14} strokeWidth={2} />
              <span>Activity Center</span>
              <ChevronDown size={12} strokeWidth={2} className={activityOpen ? styles.chevronUp : ''} />
            </button>
            {activityOpen && (
              <div className={styles.activityDropdown}>
                <div className={styles.activityDropHeader}>Activity Center</div>
                {activityItems.length === 0
                  ? <div className={styles.activityDropItem} style={{ color: '#9ca3af', fontSize: '0.8rem' }}>No recent activity</div>
                  : activityItems.map(a => (
                    <div key={a.id} className={styles.activityDropItem} onClick={() => setActivityOpen(false)}>
                      <span className={styles.activityDot} style={{ background: CAT_DOT[a.category] ?? '#94a3b8' }} />
                      <div className={styles.activityDropText}>{a.title}</div>
                      <span className={styles.activityDropTime}>{relTime(a.created_at)}</span>
                    </div>
                  ))
                }
                <Link to="/activities" className={styles.activityDropFooter} onClick={() => setActivityOpen(false)}>
                  View all activity →
                </Link>
              </div>
            )}
          </div>

          {/* Quick-access dropdown */}
          <div className={styles.quickMenuWrap} ref={quickRef}>
            <button
              className={`${styles.quickBtn}${quickOpen ? ' ' + styles.quickBtnOpen : ''}`}
              onClick={() => setQuickOpen(v => !v)}
              title="Quick access"
            >
              <LayoutGrid size={16} strokeWidth={1.75} />
            </button>
            {quickOpen && (
              <div className={styles.quickMenu}>
                <div className={styles.quickMenuTitle}>Quick Access</div>
                <div className={styles.quickMenuGrid}>
                  {QUICK_ACCESS.map(({ to, icon: Icon, label }) => (
                    <Link
                      key={to}
                      to={to}
                      className={styles.quickMenuItem}
                      onClick={() => setQuickOpen(false)}
                    >
                      <div className={styles.quickMenuItemIcon}><Icon size={18} /></div>
                      <span>{label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className={styles.navSep} />

          <Link to="/profile" className={styles.userCard} title="My Profile">
            <div className={styles.userAvatar}>{initials}</div>
            <div className={styles.userMeta}>
              <span className={styles.userRoleLabel}>{roleLabel}</span>
              <span className={styles.userPortal}>{subtitle}</span>
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
              <Link to="/dashboard" style={{ color: 'inherit', textDecoration: 'none', opacity: 0.7 }}>Ministry</Link>
              {' / '}
              <span>{title}</span>
            </div>
          </div>
        </div>
        <div className={styles.subheaderRight}>{TODAY}</div>
      </div>

      <main
        className={`${styles.content}${(location.pathname === '/analytics' || location.pathname === '/map') ? ' ' + styles.contentFull : ''}`}
        style={location.pathname === '/map' ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' } : undefined}
      >
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
