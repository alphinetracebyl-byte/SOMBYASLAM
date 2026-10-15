import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import {
  Beef, Tag, MapPin, Activity, Navigation,
  ShieldOff, ClipboardList, ShieldCheck, Globe,
  Server, KeyRound, CheckSquare, Users, Stethoscope,
  Syringe, AlertTriangle, Eye, Headset, ClipboardCheck, Biohazard, UserCheck,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase';
import s from './dashboard.module.css';

// ── Supervisor pending counts (FIELD_INSPECTOR sees approval queues) ──────────

interface PendingCounts {
  farmers:   number;
  premises:  number;
  animals:   number;
  movements: number;
}

function usePendingCounts(enabled: boolean): PendingCounts {
  const [counts, setCounts] = useState<PendingCounts>({ farmers: 0, premises: 0, animals: 0, movements: 0 });

  useEffect(() => {
    if (!enabled) return;
    const q = async () => {
      const [fa, pr, an, mv] = await Promise.all([
        supabase.from('farmer_registrations').select('id', { count: 'exact', head: true }).eq('status', 'PENDING'),
        supabase.from('farmer_premises').select('id', { count: 'exact', head: true }).eq('status', 'PENDING'),
        supabase.from('animals').select('id', { count: 'exact', head: true }).eq('submission_status', 'PENDING'),
        supabase.from('movement_requests').select('id', { count: 'exact', head: true }).eq('status', 'PENDING'),
      ]);
      setCounts({
        farmers:   fa.count  ?? 0,
        premises:  pr.count  ?? 0,
        animals:   an.count  ?? 0,
        movements: mv.count  ?? 0,
      });
    };
    void q();
  }, [enabled]);

  return counts;
}

function SupervisorStats({ counts }: { counts: PendingCounts }) {
  const items = [
    { label: 'Pending Farmers',   value: counts.farmers,   to: '/farmers',   Icon: UserCheck    },
    { label: 'Pending Premises',  value: counts.premises,  to: '/premises',  Icon: MapPin       },
    { label: 'Pending Animals',   value: counts.animals,   to: '/animals',   Icon: Beef         },
    { label: 'Pending Movements', value: counts.movements, to: '/movements', Icon: Navigation   },
  ];

  return (
    <div>
      <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', marginBottom: '0.75rem' }}>
        Approval Queue
      </div>
      <div className={s.statsRow}>
        {items.map(({ label, value, to, Icon }) => (
          <Link key={label} to={to} className={s.statCard} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className={s.statTop}>
              <Icon size={20} strokeWidth={1.5} color="#111827" />
            </div>
            <div className={s.statValue}>{value}</div>
            <div className={s.statLabel}>{label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

const TODAY = new Date().toLocaleDateString('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
});

type Role =
  | 'FIELD_INSPECTOR'
  | 'VETERINARY_OFFICER'
  | 'SLAUGHTERHOUSE_OFFICER'
  | 'QUARANTINE_OFFICER'
  | 'SOCIAL_WORKER'
  | 'CHECKPOINT_OFFICER';

interface KpiConfig {
  Icon: React.ElementType;
  label: string;
  value: string;
  to?: string;
}

interface ActionConfig {
  to: string;
  Icon: React.ElementType;
  label: string;
  sub: string;
}

interface ActivityItem {
  text: string;
  time: string;
  color: string;
}

function getKpis(role: Role): KpiConfig[] {
  const base: KpiConfig[] = [
    { Icon: Beef,          label: 'Animals Verified Today', value: '0', to: '/tasks'     },
    { Icon: Navigation,    label: 'Movements Checked',      value: '0', to: '/movements' },
    { Icon: AlertTriangle, label: 'Active Alerts',          value: '0', to: '/health'    },
    { Icon: MapPin,        label: 'Premises Visited',       value: '0', to: '/premises'  },
  ];

  const extras: Record<Role, KpiConfig[]> = {
    VETERINARY_OFFICER: [
      { Icon: Stethoscope, label: 'Health Events', value: '0', to: '/health' },
      { Icon: Syringe,     label: 'Vaccinations',  value: '0', to: '/health' },
    ],
    SLAUGHTERHOUSE_OFFICER: [
      { Icon: ClipboardList, label: 'Slaughters Today', value: '0', to: '/slaughter' },
      { Icon: Eye,           label: 'Inspections',      value: '0', to: '/slaughter' },
    ],
    QUARANTINE_OFFICER: [
      { Icon: ShieldOff,  label: 'Quarantine Zones',      value: '0', to: '/quarantine' },
      { Icon: Navigation, label: 'Restricted Movements',  value: '0', to: '/movements'  },
    ],
    SOCIAL_WORKER: [
      { Icon: Users,       label: 'Farmers Assisted',        value: '0', to: '/animals' },
      { Icon: CheckSquare, label: 'Registrations Supported', value: '0', to: '/tasks'   },
    ],
    FIELD_INSPECTOR: [
      { Icon: CheckSquare, label: 'Checkpoints Cleared', value: '0', to: '/checkpoint' },
      { Icon: Tag,         label: 'Permits Verified',    value: '0', to: '/movements'  },
    ],
    CHECKPOINT_OFFICER: [
      { Icon: CheckSquare, label: 'Checkpoints Cleared', value: '0', to: '/checkpoint' },
      { Icon: Tag,         label: 'Permits Verified',    value: '0', to: '/movements'  },
    ],
  };

  return [...base, ...(extras[role] ?? extras.FIELD_INSPECTOR)];
}

function getActivity(role: Role): ActivityItem[] {
  const map: Record<Role, ActivityItem[]> = {
    FIELD_INSPECTOR: [
      { text: 'Checkpoint opened for the day',              time: 'Today, 06:00',  color: '#3b82f6' },
      { text: 'Movement permit #MP-00412 verified',         time: 'Today, 07:34',  color: '#10b981' },
      { text: 'Untagged cattle reported — Bay checkpoint',  time: 'Today, 09:12',  color: '#f59e0b' },
      { text: 'Movement permit #MP-00415 rejected',         time: 'Today, 10:45',  color: '#ef4444' },
      { text: 'Checkpoint record synced to national system', time: 'Today, 11:00', color: '#3b82f6' },
    ],
    VETERINARY_OFFICER: [
      { text: 'FMD vaccination completed — Hiraan herd',    time: 'Today, 08:00',  color: '#10b981' },
      { text: 'Health inspection — premises PR-0082',        time: 'Today, 09:30',  color: '#3b82f6' },
      { text: 'Disease alert raised — suspected CBPP',       time: 'Today, 10:15',  color: '#ef4444' },
      { text: 'Vaccination batch VB-0041 recorded',          time: 'Today, 11:00',  color: '#10b981' },
      { text: 'Post-treatment follow-up scheduled',          time: 'Today, 11:30',  color: '#6366f1' },
    ],
    SLAUGHTERHOUSE_OFFICER: [
      { text: 'Slaughter batch SB-0018 ante-mortem passed',  time: 'Today, 06:30',  color: '#10b981' },
      { text: '12 cattle inspected — 11 cleared',            time: 'Today, 07:00',  color: '#3b82f6' },
      { text: 'Carcass condemned — pathology noted',         time: 'Today, 07:45',  color: '#ef4444' },
      { text: 'Slaughter certificate SC-0204 issued',        time: 'Today, 08:30',  color: '#10b981' },
      { text: 'Post-mortem report submitted',                 time: 'Today, 09:00',  color: '#3b82f6' },
    ],
    QUARANTINE_OFFICER: [
      { text: 'Quarantine zone QZ-003 status reviewed',      time: 'Today, 07:00',  color: '#3b82f6' },
      { text: 'Movement restriction lifted — zone QZ-001',   time: 'Today, 08:00',  color: '#10b981' },
      { text: 'New restriction imposed — Bay district',      time: 'Today, 09:00',  color: '#ef4444' },
      { text: 'Zone surveillance report filed',               time: 'Today, 10:00',  color: '#3b82f6' },
      { text: '3 border points confirmed restricted',         time: 'Today, 11:00',  color: '#f59e0b' },
    ],
    SOCIAL_WORKER: [
      { text: 'Assisted 4 farmers with account setup',       time: 'Today, 08:30',  color: '#10b981' },
      { text: 'Group registration session — Bakool',         time: 'Today, 09:00',  color: '#3b82f6' },
      { text: 'Livestock owner ID verified — Omar A.',       time: 'Today, 09:45',  color: '#6366f1' },
      { text: 'Farmer training session completed',            time: 'Today, 10:30',  color: '#10b981' },
      { text: 'Two pending registrations flagged for review', time: 'Today, 11:00', color: '#f59e0b' },
    ],
    CHECKPOINT_OFFICER: [
      { text: 'Checkpoint opened for the day',               time: 'Today, 06:00',  color: '#3b82f6' },
      { text: 'Movement permit #MP-00412 verified',          time: 'Today, 07:34',  color: '#10b981' },
      { text: 'Untagged cattle reported — Bay checkpoint',   time: 'Today, 09:12',  color: '#f59e0b' },
      { text: 'Movement permit #MP-00415 rejected',          time: 'Today, 10:45',  color: '#ef4444' },
      { text: 'Checkpoint record synced to national system', time: 'Today, 11:00',  color: '#3b82f6' },
    ],
  };
  return map[role] ?? map.FIELD_INSPECTOR;
}

function getActions(role: Role): ActionConfig[] {
  const map: Record<Role, ActionConfig[]> = {
    FIELD_INSPECTOR: [
      { to: '/tasks',              Icon: ClipboardCheck, label: 'My Verification Tasks', sub: 'Pending animal verifications' },
      { to: '/animals',            Icon: Beef,           label: 'Verify Animal',         sub: 'Scan or search by tag' },
      { to: '/movements',          Icon: Navigation,     label: 'Check Movement',        sub: 'Verify permit at checkpoint' },
      { to: '/disease-reporting',  Icon: Biohazard,      label: 'Report Disease',        sub: 'Log suspected outbreak' },
    ],
    VETERINARY_OFFICER: [
      { to: '/health',             Icon: Activity,       label: 'Record Health Event',   sub: 'Vaccination / Treatment' },
      { to: '/animals',            Icon: Beef,           label: 'Inspect Animal',        sub: 'Clinical examination' },
      { to: '/premises',           Icon: MapPin,         label: 'Inspect Premises',      sub: 'Herd health visit' },
      { to: '/disease-reporting',  Icon: Biohazard,      label: 'Report Disease',        sub: 'Log clinical case' },
    ],
    SLAUGHTERHOUSE_OFFICER: [
      { to: '/slaughter', Icon: ClipboardList, label: 'Record Slaughter',    sub: 'Ante and post-mortem' },
      { to: '/animals',   Icon: Beef,          label: 'Verify Animal',       sub: 'Check tag before slaughter' },
      { to: '/health',    Icon: Activity,      label: 'Log Health Finding',  sub: 'Pathology or condition' },
    ],
    QUARANTINE_OFFICER: [
      { to: '/quarantine', Icon: ShieldOff,  label: 'Manage Zones',       sub: 'View or update restrictions' },
      { to: '/movements',  Icon: Navigation, label: 'Block Movement',     sub: 'Restrict in-zone transit' },
      { to: '/premises',   Icon: MapPin,     label: 'Inspect Premises',   sub: 'Zone compliance check' },
    ],
    SOCIAL_WORKER: [
      { to: '/tasks',             Icon: ClipboardCheck, label: 'My Verification Tasks', sub: 'Pending animal verifications' },
      { to: '/animals',           Icon: Beef,           label: 'Register Animal',       sub: 'Assist farmer with entry' },
      { to: '/premises',          Icon: MapPin,         label: 'Register Premises',     sub: 'New farm or holding' },
      { to: '/disease-reporting', Icon: Biohazard,      label: 'Report Disease',        sub: 'Community disease tip' },
    ],
    CHECKPOINT_OFFICER: [
      { to: '/animals',   Icon: Beef,        label: 'Verify Animal',     sub: 'Scan or search by tag' },
      { to: '/movements', Icon: Navigation,  label: 'Check Movement',    sub: 'Verify permit at checkpoint' },
      { to: '/premises',  Icon: MapPin,      label: 'Log Premises Visit', sub: 'Record on-site inspection' },
    ],
  };
  return map[role] ?? map.FIELD_INSPECTOR;
}

const ROLE_LABELS: Record<string, string> = {
  FIELD_INSPECTOR:       'Field Inspector',
  VETERINARY_OFFICER:    'Veterinary Officer',
  SLAUGHTERHOUSE_OFFICER:'Slaughterhouse Officer',
  QUARANTINE_OFFICER:    'Quarantine Officer',
  SOCIAL_WORKER:         'Social Worker',
  CHECKPOINT_OFFICER:    'Checkpoint Officer',
};

export function DashboardPage(): JSX.Element {
  const { userId, roles, territoryType, regionCode, districtCode } = useAuthStore();
  const role = (roles[0] ?? 'FIELD_INSPECTOR') as Role;

  const kpis     = getKpis(role);
  const activity = getActivity(role);
  const actions  = getActions(role);

  const territory = [regionCode, districtCode].filter(Boolean).join(' / ') || 'Somalia';

  const isSupervisor = role === 'FIELD_INSPECTOR' || role === 'SOCIAL_WORKER';
  const pendingCounts = usePendingCounts(isSupervisor);

  const [pendingTasks, setPendingTasks] = useState<number>(0);
  const [dockVisible,  setDockVisible]  = useState(true);
  const lastY = useRef(0);

  useEffect(() => {
    if ((role === 'FIELD_INSPECTOR' || role === 'SOCIAL_WORKER') && regionCode) {
      supabase
        .from('movement_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('region_code', regionCode)
        .eq('task_role', role)
        .eq('status', 'PENDING')
        .then(({ count }) => setPendingTasks(count ?? 0));
    }
  }, [role, regionCode]);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setDockVisible(y < lastY.current || y < 20);
      lastY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className={s.page}>

      <div className={s.welcomeRow}>
        <div>
          <h1 className={s.pageTitle}>Field Operations Dashboard</h1>
          <p className={s.pageSub}>
            {territory} — {TODAY}
          </p>
        </div>
        <div className={s.roleTag}>
          <div className={s.roleTagAvatar}>
            {(ROLE_LABELS[role] ?? role).split(' ').map(w => w[0]).join('').slice(0, 2)}
          </div>
          {ROLE_LABELS[role] ?? role}
        </div>
      </div>

      {(role === 'FIELD_INSPECTOR' || role === 'SOCIAL_WORKER') && pendingTasks > 0 && (
        <Link to="/tasks" style={{ textDecoration: 'none' }}>
          <div className={s.tasksBanner}>
            <ClipboardCheck size={18} strokeWidth={1.75} color="#0b5ed7" />
            <span className={s.tasksBannerText}>
              <strong>{pendingTasks}</strong> pending task{pendingTasks !== 1 ? 's' : ''} assigned to you in your region
            </span>
            <span className={s.tasksBannerCta}>View Tasks →</span>
          </div>
        </Link>
      )}

      {isSupervisor && <SupervisorStats counts={pendingCounts} />}

      <div className={s.statsRow} style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
        {kpis.map(({ Icon, label, value, to }) => (
          <StatCard key={label} Icon={Icon} label={label} value={value} to={to} />
        ))}
      </div>

      <div className={s.mainGrid}>
        <div className={s.leftCol}>
          <div className={s.card}>
            <div className={s.cardHeader}>
              <div className={s.cardTitle}>Recent Activity</div>
              <span style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>Today</span>
            </div>
            <div className={s.activityList}>
              {activity.map((item, i) => (
                <div key={i} className={s.activityItem}>
                  <div className={s.activityDot} style={{ background: item.color }} />
                  <div className={s.activityText}>{item.text}</div>
                  <div className={s.activityTime}>{item.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={s.rightCol}>
          <div className={s.card}>
            <div className={s.cardTitle} style={{ marginBottom: '0.875rem' }}>Quick Actions</div>
            <div className={s.actionList}>
              {actions.map(({ to, Icon, label, sub }) => (
                <Link key={to + label} to={to} className={s.actionItem}>
                  <span className={s.actionIcon}>
                    <Icon size={16} strokeWidth={1.75} color="#374151" />
                  </span>
                  <div>
                    <div className={s.actionLabel}>{label}</div>
                    <div className={s.actionSub}>{sub}</div>
                  </div>
                  <span className={s.actionArrow}>›</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={`${s.statsBar}${dockVisible ? '' : ' ' + s.statsBarHidden}`}>
        <BarStat Icon={ShieldCheck} label="Officer ID"  value={userId ? userId.slice(0, 12) + '…' : '—'} />
        <BarStat Icon={KeyRound}    label="Role"        value={ROLE_LABELS[role] ?? role} />
        <BarStat Icon={MapPin}      label="Territory"   value={`${territoryType ?? '—'} / ${territory}`} />
        <BarStat Icon={Globe}       label="System"      value="QXLITS v1.0" />
        <BarStat Icon={Server}      label="Auth"        value="Keycloak OIDC" />
        <div className={s.dockDivider} />
        <button className={s.supportBtn} title="Support Chat">
          <Headset size={26} strokeWidth={1.5} color="#0b5ed7" />
        </button>
      </div>

    </div>
  );
}

function StatCard({ Icon, label, value, to }: { Icon: React.ElementType; label: string; value: string; to?: string }) {
  const inner = (
    <>
      <div className={s.statTop}>
        <Icon size={20} strokeWidth={1.5} color="#111827" />
      </div>
      <div className={s.statValue}>{value}</div>
      <div className={s.statLabel}>{label}</div>
    </>
  );
  return to
    ? <Link to={to} className={s.statCard}>{inner}</Link>
    : <div className={s.statCard}>{inner}</div>;
}

function BarStat({ Icon, label, value }: { Icon: React.ElementType; label: string; value: string }) {
  return (
    <div className={s.bottomStat}>
      <Icon size={18} strokeWidth={1.5} color="#0b5ed7" />
      <div>
        <div className={s.bottomStatValue}>{value}</div>
        <div className={s.bottomStatLabel}>{label}</div>
      </div>
    </div>
  );
}

export default DashboardPage;
