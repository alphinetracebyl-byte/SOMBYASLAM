import { useState, useEffect, useMemo } from 'react';
import {
  Beef, MapPin, Navigation, Activity, FileCheck,
  Tag, Syringe, CheckCircle, XCircle, AlertTriangle,
  Clock, Search, RefreshCw, Home, ShieldOff, ClipboardList, Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth.store';
import s from './activity-center.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

type Category = 'ANIMAL' | 'MOVEMENT' | 'HEALTH' | 'PREMISES' | 'TAGGING' | 'VACCINATION' | 'QUARANTINE' | 'SLAUGHTER' | 'CERTIFICATION';
type EventLevel = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

interface ActivityRow {
  id: string;
  category: string;
  level: EventLevel;
  title: string;
  detail: string | null;
  actor_name: string | null;
  actor_role: string | null;
  region: string | null;
  district: string | null;
  reference_code: string | null;
  created_at: string;
}

// ── Category config ───────────────────────────────────────────────────────────

const CAT_CFG: Record<Category, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  ANIMAL:        { label: 'Animal',      color: '#2563eb', bg: '#eff6ff', Icon: Beef          },
  MOVEMENT:      { label: 'Movement',    color: '#d97706', bg: '#fffbeb', Icon: Navigation    },
  HEALTH:        { label: 'Health',      color: '#dc2626', bg: '#fef2f2', Icon: Activity      },
  PREMISES:      { label: 'Premises',    color: '#475569', bg: '#f8fafc', Icon: Home          },
  TAGGING:       { label: 'Tagging',     color: '#ea580c', bg: '#fff7ed', Icon: Tag           },
  VACCINATION:   { label: 'Vaccination', color: '#0891b2', bg: '#ecfeff', Icon: Syringe      },
  QUARANTINE:    { label: 'Quarantine',  color: '#b91c1c', bg: '#fef2f2', Icon: ShieldOff    },
  SLAUGHTER:     { label: 'Slaughter',   color: '#7c3aed', bg: '#f5f3ff', Icon: ClipboardList },
  CERTIFICATION: { label: 'Certificate', color: '#4f46e5', bg: '#eef2ff', Icon: FileCheck    },
};

const LEVEL_COLOR: Record<EventLevel, string> = {
  INFO: '#64748b', SUCCESS: '#16a34a', WARNING: '#d97706', ERROR: '#dc2626',
};
const LEVEL_ICON: Record<EventLevel, React.ElementType> = {
  SUCCESS: CheckCircle, ERROR: XCircle, WARNING: AlertTriangle, INFO: Clock,
};

const ALL_CATS = Object.keys(CAT_CFG) as Category[];
const KNOWN_CATS = new Set(ALL_CATS);
function safeCategory(raw: string): Category {
  return KNOWN_CATS.has(raw as Category) ? (raw as Category) : 'ANIMAL';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(ts: string): string {
  const mins = Math.floor((Date.now() - new Date(ts).getTime()) / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function isToday(ts: string): boolean {
  const d = new Date(ts);
  const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ActivityCenterPage(): JSX.Element {
  const { roles, regionCode, districtCode } = useAuthStore();
  const role = roles[0] ?? 'FIELD_INSPECTOR';

  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [activeCats, setActiveCats] = useState<Category[]>([]);
  const [myOnly,     setMyOnly]     = useState(false);

  async function fetchActivities() {
    setLoading(true);
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    let q = supabase
      .from('activity_log')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(200);

    if (regionCode) q = q.eq('region', regionCode);

    const { data } = await q;
    setActivities((data ?? []) as ActivityRow[]);
    setLoading(false);
  }

  useEffect(() => { void fetchActivities(); }, [regionCode]);

  const filtered = useMemo(() => {
    let list = activities;
    if (myOnly && districtCode) list = list.filter(a => a.district === districtCode);
    if (activeCats.length > 0)  list = list.filter(a => activeCats.includes(safeCategory(a.category)));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.title.toLowerCase().includes(q) ||
        (a.detail ?? '').toLowerCase().includes(q) ||
        (a.actor_name ?? '').toLowerCase().includes(q) ||
        (a.district ?? '').toLowerCase().includes(q) ||
        (a.reference_code ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [activities, myOnly, districtCode, activeCats, search]);

  const todayItems     = filtered.filter(a =>  isToday(a.created_at));
  const yesterdayItems = filtered.filter(a => !isToday(a.created_at));

  const stats = {
    total:    activities.length,
    today:    activities.filter(a => isToday(a.created_at)).length,
    warnings: activities.filter(a => a.level === 'WARNING').length,
    errors:   activities.filter(a => a.level === 'ERROR').length,
  };

  const catCounts = ALL_CATS.reduce<Record<Category, number>>((acc, cat) => {
    acc[cat] = activities.filter(a => safeCategory(a.category) === cat).length;
    return acc;
  }, {} as Record<Category, number>);

  const roleLabel  = role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  const scopeLabel = `${roleLabel} — ${regionCode ?? 'All Regions'}`;

  return (
    <div className={s.page}>
      <div className={s.statRow}>
        <div className={s.statCard}><div className={s.statNum}>{stats.total}</div><div className={s.statLabel}>Total Events</div><div className={s.statSub}>Last 48 hours</div></div>
        <div className={s.statCard}><div className={s.statNum}>{stats.today}</div><div className={s.statLabel}>Today</div><div className={s.statSub}>Since midnight</div></div>
        <div className={s.statCard}><div className={s.statNum}>{stats.warnings}</div><div className={s.statLabel}>Warnings</div><div className={s.statSub}>Require attention</div></div>
        <div className={s.statCard}><div className={s.statNum}>{stats.errors}</div><div className={s.statLabel}>Errors / Alerts</div><div className={s.statSub}>Critical events</div></div>
      </div>

      <div className={s.scopeRow}>
        <div className={s.scopeBadge}><MapPin size={11} />{scopeLabel}</div>
        {districtCode && (
          <button className={`${s.mineBtn}${myOnly ? ' ' + s.mineBtnOn : ''}`} onClick={() => setMyOnly(v => !v)}>
            {myOnly ? `My district (${districtCode})` : 'All region activities'}
          </button>
        )}
      </div>

      <div className={s.toolbar}>
        <div className={s.searchWrap}>
          <Search size={14} className={s.searchIcon} />
          <input className={s.searchInput} placeholder="Search by title, actor, district, reference…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className={s.refreshBtn} onClick={() => void fetchActivities()}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className={s.catBar}>
        <button className={`${s.catChip}${activeCats.length === 0 ? ' ' + s.catChipAll : ''}`} onClick={() => setActiveCats([])}>All categories</button>
        {ALL_CATS.map(cat => {
          const cfg = CAT_CFG[cat];
          const on  = activeCats.includes(cat);
          return (
            <button key={cat} className={`${s.catChip}${on ? ' ' + s.catChipOn : ''}`}
              style={on ? { background: cfg.bg, color: cfg.color, borderColor: cfg.color } : {}}
              onClick={() => setActiveCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])}>
              <cfg.Icon size={11} />{cfg.label}<span className={s.catCount}>{catCounts[cat]}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className={s.empty}><Loader2 size={32} color="#e2e8f0" className={s.spinner} /><div>Loading activities…</div></div>
      ) : filtered.length === 0 ? (
        <div className={s.empty}><Clock size={40} color="#e2e8f0" /><div>No activities found</div></div>
      ) : (
        <div className={s.feed}>
          {todayItems.length > 0 && (
            <section>
              <div className={s.dayHeading}><span className={s.dayLabel}>Today</span><span className={s.dayCount}>{todayItems.length} events</span><div className={s.dayLine} /></div>
              <div className={s.eventList}>{todayItems.map((a, i) => <ActivityItem key={a.id} a={a} last={i === todayItems.length - 1} />)}</div>
            </section>
          )}
          {yesterdayItems.length > 0 && (
            <section>
              <div className={s.dayHeading}><span className={s.dayLabel}>Yesterday</span><span className={s.dayCount}>{yesterdayItems.length} events</span><div className={s.dayLine} /></div>
              <div className={s.eventList}>{yesterdayItems.map((a, i) => <ActivityItem key={a.id} a={a} last={i === yesterdayItems.length - 1} />)}</div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function ActivityItem({ a, last }: { a: ActivityRow; last: boolean }) {
  const cat   = CAT_CFG[safeCategory(a.category)];
  const lc    = LEVEL_COLOR[a.level] ?? LEVEL_COLOR.INFO;
  const LIcon = LEVEL_ICON[a.level] ?? Clock;
  const location = [a.district, a.region].filter(Boolean).join(', ');

  return (
    <div className={s.row}>
      <div className={s.spineCol}>
        <div className={s.dot} style={{ background: cat.color }}><cat.Icon size={11} color="#fff" /></div>
        {!last && <div className={s.spine} />}
      </div>
      <div className={s.timeCol}>
        <span className={s.timeAbs}>{formatTime(a.created_at)}</span>
        <span className={s.timeRel}>{relativeTime(a.created_at)}</span>
      </div>
      <div className={s.card}>
        <div className={s.cardTop}>
          <span className={s.catBadge} style={{ background: cat.bg, color: cat.color }}><cat.Icon size={9} /> {cat.label}</span>
          <span className={s.levelDot} style={{ color: lc }}><LIcon size={11} /></span>
          {a.reference_code && <span className={s.ref}>{a.reference_code}</span>}
        </div>
        <div className={s.cardTitle}>{a.title}</div>
        {a.detail && <div className={s.cardDetail}>{a.detail}</div>}
        <div className={s.cardMeta}>
          {a.actor_name && <><span className={s.actor}>{a.actor_name}</span><span className={s.dot2}>·</span></>}
          {a.actor_role && <><span className={s.role}>{a.actor_role}</span><span className={s.dot2}>·</span></>}
          {location && <><MapPin size={10} color="#94a3b8" /><span className={s.region}>{location}</span></>}
        </div>
      </div>
    </div>
  );
}

export default ActivityCenterPage;
