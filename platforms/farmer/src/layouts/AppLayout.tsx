import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useRef, useState, useEffect } from 'react';
import {
  LayoutDashboard, Beef, MapPin, Navigation, Activity, Power,
  CalendarDays, Zap, Plus, ChevronDown, Menu, X,
  Pill, Home, Tag, FileText, AlertTriangle, Database, MessageSquare,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { signOutFarmer } from '@/features/auth/auth.supabase';
import { supabase } from '@/lib/supabase';
import styles from './app.layout.module.css';

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard'        },
  { to: '/premises',  icon: MapPin,           label: 'My Premises'     },
  { to: '/movements', icon: Navigation,       label: 'Movements'       },
  { to: '/markets',   icon: CalendarDays,     label: 'Market Calendar' },
  { to: '/health',    icon: Activity,         label: 'Health Records'  },
  { to: '/database',  icon: Database,         label: 'Database'        },
];

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':         'Dashboard',
  '/premises':          'My Premises',
  '/movements':          'Movements',
  '/premise-movements':  'Premise Movements',
  '/herd-movements':     'Herd Movements',
  '/movement-requests':  'Movement Requests',
  '/health':            'Health Records',
  '/markets':           'Market Calendar',
  '/disease-reporting': 'Disease Reporting',
  '/tags':              'Tag Management',
  '/certificates':      'My Certificates',
  '/map':               'Movement Map',
  '/herds':             'Batch Manager',
  '/settings':          'Settings',
  '/database':          'Database Browser',
  '/activity-center':   'Activity Center',
  '/messenger':         'Messenger',
};

const TODAY = new Date().toLocaleDateString('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
});

const CAT_DOT: Record<string, string> = {
  ANIMAL: '#2563eb', MOVEMENT: '#d97706', HEALTH: '#dc2626',
  PREMISES: '#475569', TAGGING: '#ea580c', VACCINATION: '#0891b2',
  CERTIFICATION: '#4f46e5', QUARANTINE: '#b91c1c',
};

function relTime(ts: string): string {
  const mins = Math.floor((Date.now() - new Date(ts).getTime()) / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const QUICK_ACTIONS = [
  { to: '/animals',          Icon: Beef,           label: 'Register Animal',        sub: 'Add to your herd'          },
  { to: '/movements',        Icon: Navigation,     label: 'Request Animal Movement', sub: 'Move animals with permit'  },
  { to: '/health',           Icon: Pill,           label: 'Log Health Event',       sub: 'Vaccination / treatment'   },
  { to: '/premises',         Icon: Home,           label: 'Register Premises',      sub: 'Add farm location'         },
  { to: '/tags',             Icon: Tag,            label: 'Request Tags',           sub: 'RFID or ear tags'          },
  { to: '/disease-reporting',Icon: AlertTriangle,  label: 'Report Disease',         sub: 'Flag an outbreak alert'    },
  { to: '/certificates',     Icon: FileText,       label: 'My Certificates',        sub: 'Health & export certs'     },
];

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
  const { region } = useAuthStore();
  const [open,   setOpen]   = useState(false);
  const [items,  setItems]  = useState<{ id: string; title: string; category: string; created_at: string }[]>([]);
  const ref = useRef<HTMLDivElement>(null!);
  useClickOutside(ref, () => setOpen(false));

  useEffect(() => {
    if (!open) return;
    let q = supabase.from('activity_log').select('id,title,category,created_at')
      .order('created_at', { ascending: false }).limit(6);
    if (region) q = q.eq('region', region);
    void q.then(({ data }) => setItems((data ?? []) as typeof items));
  }, [open, region]);

  return (
    <div className={styles.dropWrap} ref={ref}>
      <button className={styles.quickBtn} onClick={() => setOpen(o => !o)} title="Activity Center">
        <Zap size={14} strokeWidth={2} />
        <span className={styles.quickLabel}>Activity Center</span>
        <ChevronDown size={12} strokeWidth={2} className={`${styles.quickChevron} ${open ? styles.chevronUp : ''}`} />
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

function QuickActionsDropdown({ onNavigate }: { onNavigate: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null!);
  useClickOutside(ref, () => setOpen(false));

  return (
    <div className={styles.dropWrap} ref={ref}>
      <button
        className={styles.quickBtn}
        onClick={() => setOpen(o => !o)}
        title="Quick Actions"
      >
        <Plus size={14} strokeWidth={2.5} />
        <span className={styles.quickLabel}>Quick Actions</span>
        <ChevronDown size={12} strokeWidth={2} className={`${styles.quickChevron} ${open ? styles.chevronUp : ''}`} />
      </button>

      {open && (
        <div className={`${styles.dropdown} ${styles.dropdownRight}`}>
          <div className={styles.dropHeader}>Quick Actions</div>
          {QUICK_ACTIONS.map(a => (
            <Link
              key={a.to}
              to={a.to}
              className={styles.dropAction}
              onClick={() => { setOpen(false); onNavigate(); }}
            >
              <span className={styles.dropActionIcon}>
                <a.Icon size={14} strokeWidth={1.75} color="#374151" />
              </span>
              <div>
                <div className={styles.dropActionLabel}>{a.label}</div>
                <div className={styles.dropActionSub}>{a.sub}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function toInitials(label: string) {
  return label.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export function AppLayout(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { clearSession, farmerName } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const title = (() => {
    if (PAGE_TITLES[location.pathname]) return PAGE_TITLES[location.pathname];
    if (location.pathname.startsWith('/premises/')) return 'Farm Detail';
    if (location.pathname.startsWith('/animals/')) return 'Animal Detail';
    return 'QXLITS';
  })();

  const handleLogout = () => {
    void signOutFarmer().finally(() => {
      clearSession();
      void navigate('/login');
    });
  };

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => { closeMenu(); }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const displayName = farmerName ?? 'Farmer';
  const initials = toInitials(displayName);

  return (
    <div className={styles.shell}>
      <nav className={styles.navbar}>
        <div className={styles.brand}>
          <div className={styles.brandLogo}>SL</div>
          <div>
            <div className={styles.brandName}>QXLITS</div>
            <div className={styles.brandSub}>Farmer Portal</div>
          </div>
        </div>

        {/* Desktop nav links */}
        <div className={styles.navLinks}>
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `${styles.navItem}${isActive ? ' ' + styles.active : ''}`
              }
            >
              <Icon size={15} strokeWidth={1.75} className={styles.navIcon} />
              <span className={styles.navLabel}>{label}</span>
            </NavLink>
          ))}
        </div>

        {/* Desktop right side */}
        <div className={styles.navRight}>
          <NavLink
            to="/messenger"
            className={({ isActive }) => `${styles.navItem}${isActive ? ' ' + styles.active : ''}`}
          >
            <MessageSquare size={15} strokeWidth={1.75} className={styles.navIcon} />
            <span className={styles.navLabel}>Messenger</span>
          </NavLink>
          <ActivityDropdown />
          <QuickActionsDropdown onNavigate={() => {}} />
          <div className={styles.navSep} />
          <Link to="/profile" className={styles.userCard} title="My Profile">
            <div className={styles.userAvatar}>{initials}</div>
            <div className={styles.userMeta}>
              <span className={styles.userRoleLabel}>{displayName}</span>
              <span className={styles.userPortal}>Farmer Portal</span>
            </div>
          </Link>
          <div className={styles.navSep} />
          <button className={styles.logoutBtn} onClick={handleLogout} title="Sign out" aria-label="Sign out">
            <Power size={16} strokeWidth={1.75} />
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className={styles.hamburgerBtn}
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Open menu"
        >
          <Menu size={22} strokeWidth={1.75} />
        </button>
      </nav>

      {/* Mobile drawer overlay */}
      {menuOpen && (
        <div className={styles.drawerOverlay} onClick={closeMenu} />
      )}

      {/* Mobile side drawer */}
      <aside className={`${styles.drawer} ${menuOpen ? styles.drawerOpen : ''}`}>
        {/* Drawer header */}
        <div className={styles.drawerHeader}>
          <div className={styles.drawerBrand}>
            <div className={styles.drawerBrandLogo}>SL</div>
            <div>
              <div className={styles.drawerBrandName}>QXLITS</div>
              <div className={styles.drawerBrandSub}>Farmer Portal</div>
            </div>
          </div>
          <button className={styles.drawerClose} onClick={closeMenu} aria-label="Close menu">
            <X size={20} strokeWidth={1.75} />
          </button>
        </div>

        {/* User info */}
        <div className={styles.drawerUser}>
          <div className={styles.drawerUserAvatar}>{initials}</div>
          <div>
            <div className={styles.drawerUserName}>{displayName}</div>
            <div className={styles.drawerUserRole}>Registered Farmer</div>
          </div>
        </div>

        {/* Nav items */}
        <div className={styles.drawerSection}>
          <div className={styles.drawerSectionLabel}>Navigation</div>
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `${styles.drawerNavItem}${isActive ? ' ' + styles.drawerNavActive : ''}`
              }
              onClick={closeMenu}
            >
              <span className={styles.drawerNavIcon}>
                <Icon size={18} strokeWidth={1.75} />
              </span>
              {label}
            </NavLink>
          ))}
          <NavLink
            to="/messenger"
            className={({ isActive }) =>
              `${styles.drawerNavItem}${isActive ? ' ' + styles.drawerNavActive : ''}`
            }
            onClick={closeMenu}
          >
            <span className={styles.drawerNavIcon}>
              <MessageSquare size={18} strokeWidth={1.75} />
            </span>
            Messenger
          </NavLink>
        </div>

        {/* Quick actions */}
        <div className={styles.drawerSection}>
          <div className={styles.drawerSectionLabel}>Quick Actions</div>
          {QUICK_ACTIONS.map(a => (
            <Link
              key={a.to}
              to={a.to}
              className={styles.drawerActionItem}
              onClick={closeMenu}
            >
              <span className={styles.drawerActionIcon}>
                <a.Icon size={15} strokeWidth={1.75} color="#0f2170" />
              </span>
              <div>
                <div className={styles.drawerActionLabel}>{a.label}</div>
                <div className={styles.drawerActionSub}>{a.sub}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Drawer footer */}
        <div className={styles.drawerFooter}>
          <button className={styles.drawerLogout} onClick={() => { closeMenu(); handleLogout(); }}>
            <Power size={16} strokeWidth={1.75} />
            Sign Out
          </button>
        </div>
      </aside>

      <div className={styles.subheader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {location.pathname.split('/').filter(Boolean).length > 1 && (
            <button onClick={() => window.history.back()} style={{ border: 'none', background: '#f1f5f9', borderRadius: 8, padding: '0.3rem 0.6rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>&#8592; Back</button>
          )}
          <div>
            <div className={styles.pageTitle}>{title}</div>
            <div className={styles.breadcrumb}>
              <Link to="/dashboard" style={{ color: 'inherit', textDecoration: 'none', opacity: 0.7 }}>Farmer</Link>
              {' / '}
              <span>{title}</span>
            </div>
          </div>
        </div>
        <div className={styles.subheaderRight}>{TODAY}</div>
      </div>

      <main
        className={styles.content}
        style={location.pathname === '/premises' ? { paddingLeft: 0, paddingRight: 0 } : undefined}
      >
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
