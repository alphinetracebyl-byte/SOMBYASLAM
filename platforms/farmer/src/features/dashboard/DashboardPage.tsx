import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Beef, Tag, Navigation, Activity, Plus, AlertTriangle,
  ShieldCheck, Globe, Server, KeyRound, Headset,
  Clock, Truck, Syringe, Ban, ArrowRight, CheckCircle,
  CalendarDays, MapPin, Map, Bell, Phone, GripVertical, Loader2, ChevronDown,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase';
import s from './dashboard.module.css';

const registrationData = [
  { month: 'Jan', animals: 0 }, { month: 'Feb', animals: 0 },
  { month: 'Mar', animals: 0 }, { month: 'Apr', animals: 0 },
  { month: 'May', animals: 0 }, { month: 'Jun', animals: 0 },
  { month: 'Jul', animals: 0 },
];

const speciesData = [
  { name: 'Cattle', value: 0, color: '#0f172a', emoji: '🐄' },
  { name: 'Camel',  value: 0, color: '#0f172a', emoji: '🐪' },
  { name: 'Goat',   value: 0, color: '#0f172a', emoji: '🐐' },
  { name: 'Sheep',  value: 0, color: '#0f172a', emoji: '🐑' },
];


interface PremisesTagRow {
  id: string;
  premises_code: string;
  premises_name: string | null;
  farmer_tag_inventory: Array<{ available: number; used: number; delivered: number }>;
}

const healthAlerts = [
  { Icon: Syringe, text: '3 animals overdue for FMD vaccination',        tag: 'Overdue',    tagColor: '#ef4444', tagBg: '#fef2f2', iconBg: '#f1f5f9' },
  { Icon: Ban,     text: 'Premises SOM-MOG-001 under health restriction', tag: 'Restricted', tagColor: '#f97316', tagBg: '#fff7ed', iconBg: '#f1f5f9' },
];

const pendingApprovals = [
  { code: 'MV-2026-00412',        desc: 'Movement: Mogadishu → Kismayo',  since: '2 days ago' },
  { code: 'BAT-SOM001-2026-0003', desc: 'Batch registration — 12 cattle', since: '5 hrs ago'  },
];

const activeMovements = [
  { code: 'MV-2026-00389', from: 'Baidoa', to: 'Mogadishu',  species: 'Cattle × 8', status: 'IN TRANSIT',    statusColor: '#0ea5e9', statusBg: '#f0f9ff' },
  { code: 'MV-2026-00401', from: 'Jowhar', to: 'Beledweyne', species: 'Goat × 15',  status: 'PERMIT ISSUED', statusColor: '#8b5cf6', statusBg: '#f5f3ff' },
];

const marketCalendar = [
  { day: 'Mon', date: 'Aug 4',  name: 'Bakara Livestock Market',  location: 'Mogadishu',  species: ['Cattle', 'Camel'], soon: true  },
  { day: 'Wed', date: 'Aug 6',  name: 'Kismayo Central Market',   location: 'Kismayo',    species: ['Goat', 'Sheep'],   soon: false },
  { day: 'Thu', date: 'Aug 7',  name: 'Baidoa Weekly Market',     location: 'Baidoa',     species: ['Cattle', 'Goat'],  soon: false },
  { day: 'Sat', date: 'Aug 9',  name: 'Garowe Livestock Fair',    location: 'Garowe',     species: ['Camel', 'Sheep'],  soon: false },
  { day: 'Mon', date: 'Aug 11', name: 'Beledweyne Market',        location: 'Beledweyne', species: ['Cattle'],          soon: false },
];

const upcomingEvents = [
  { Icon: Syringe,      iconBg: '#f1f5f9', iconColor: '#0f172a', name: 'FMD Vaccination due',    sub: '3 animals overdue — Aug 7 deadline, Daynile Herd',       date: 'Aug 7' },
  { Icon: Clock,        iconBg: '#f1f5f9', iconColor: '#0f172a', name: 'Batch under review',      sub: 'BAT-SOM001-2026-0003 · 12 cattle — Ministry review',     date: 'Aug 6' },
  { Icon: CalendarDays, iconBg: '#f1f5f9', iconColor: '#0f172a', name: 'Bakara Livestock Market', sub: 'Mogadishu · Cattle & Camel — movement permit needed',    date: 'Aug 4' },
];

const overviewInsights = [
  { Icon: Tag,           iconColor: '#334155', text: '8 animals in HRD-2026-BAY-002 approved — field officer visit pending for tag application' },
  { Icon: Syringe,       iconColor: '#334155', text: '3 animals overdue FMD vaccination — Aug 7 Ministry deadline, Daynile Herd'               },
  { Icon: AlertTriangle, iconColor: '#334155', text: 'SOM-MOG-001 under health restriction — movement blocked until cleared'                   },
  { Icon: CheckCircle,   iconColor: '#334155', text: 'HRD-2026-MOG-001 fully tagged — eligible to apply for export certificate'                },
];

const overviewKpis = [
  { lbl: 'Tags Pending',        sub: 'awaiting field officer', num: 8,  iconBg: '#f1f5f9', iconColor: '#0f172a', Icon: Tag,        to: '/animals',   linkLbl: 'View animals'   },
  { lbl: 'Untagged Animals',    sub: 'no tag assigned',        num: 12, iconBg: '#f1f5f9', iconColor: '#0f172a', Icon: Beef,       to: '/animals',   linkLbl: 'Register tags'  },
  { lbl: 'Vaccination Due',     sub: 'overdue or upcoming',    num: 3,  iconBg: '#f1f5f9', iconColor: '#0f172a', Icon: Syringe,    to: '/health',    linkLbl: 'View health'    },
  { lbl: 'Active Movements',    sub: 'this month',             num: 4,  iconBg: '#f1f5f9', iconColor: '#0f172a', Icon: Navigation, to: '/movements', linkLbl: 'View movements' },
];

const MINISTRY_CALLS_INIT = [
  {
    id: 'VC-2026-001',
    campaign: 'FMD National Vaccination Campaign',
    disease: 'Foot & Mouth Disease',
    deadline: 'Aug 15, 2026',
    region: 'Banaadir, Bay, Hiiraan',
    species: ['Cattle', 'Goat', 'Sheep'],
    urgent: true,
    desc: 'Ministry of Livestock mandates FMD vaccination for all ruminants in affected regions before the deadline. Non-compliance may result in movement restrictions.',
    vet: { name: 'Dr. Abdi Hassan', phone: '+252 61 234 5678' },
  },
  {
    id: 'VC-2026-002',
    campaign: 'PPR Control Programme',
    disease: 'Peste des Petits Ruminants',
    deadline: 'Sep 1, 2026',
    region: 'All Regions',
    species: ['Goat', 'Sheep'],
    urgent: false,
    desc: 'National PPR eradication drive. All goats and sheep must be vaccinated. Vaccination certificates required for market access after Sep 1.',
    vet: { name: 'Dr. Faadumo Ali', phone: '+252 61 876 5432' },
  },
];

export function DashboardPage(): JSX.Element {
  const { userId, farmerName, farmerCode } = useAuthStore();

  const [premisesTags,    setPremisesTags]    = useState<PremisesTagRow[]>([]);
  const [tagsLoading,     setTagsLoading]     = useState(true);
  const [selectedPremId,  setSelectedPremId]  = useState<string>('');
  const [speciesCounts,   setSpeciesCounts]   = useState<Record<string, number>>({});
  const [heroTotals,      setHeroTotals]      = useState({ animals: 0, tags: 0, movements: 0, health: 0 });

  useEffect(() => {
    if (!userId) { setTagsLoading(false); return; }
    void (async () => {
      const { data } = await supabase
        .from('farmer_premises')
        .select('id, premises_code, premises_name, farmer_tag_inventory(available, used, delivered)')
        .eq('user_id', userId)
        .neq('status', 'REJECTED')
        .order('premises_code');
      const rows = (data ?? []) as PremisesTagRow[];
      setPremisesTags(rows);
      if (rows.length > 0) setSelectedPremId(rows[0].id);
      setTagsLoading(false);

      const premisesCodes = rows.map(r => r.premises_code);
      const premisesIds   = rows.map(r => r.id);

      if (premisesCodes.length > 0) {
        const [
          { data: animalRows },
          { count: movCount },
          { count: healthCount },
        ] = await Promise.all([
          supabase.from('animals').select('species').in('current_premises_id', premisesCodes),
          supabase.from('farmer_movement_requests').select('id', { count: 'exact', head: true }).eq('user_id', userId),
          supabase.from('health_events').select('id', { count: 'exact', head: true }).in('premises_id', premisesIds),
        ]);

        const counts: Record<string, number> = {};
        (animalRows ?? []).forEach((a: { species: string }) => {
          const sp = a.species?.toUpperCase();
          if (sp) counts[sp] = (counts[sp] ?? 0) + 1;
        });
        setSpeciesCounts(counts);

        const totalAnimals = Object.values(counts).reduce((s, n) => s + n, 0);
        const totalTags = rows.reduce((s, r) => {
          const inv = r.farmer_tag_inventory?.[0];
          return s + (inv ? (inv.available + inv.used) : 0);
        }, 0);
        setHeroTotals({
          animals:   totalAnimals,
          tags:      totalTags,
          movements: movCount ?? 0,
          health:    healthCount ?? 0,
        });
      }
    })();
  }, [userId]);

  const [ministryCalls, setMinistryCalls] = useState(MINISTRY_CALLS_INIT);
  const dragIdx = useRef<number | null>(null);

  function onDragStart(i: number) { dragIdx.current = i; }
  function onDragOver(e: React.DragEvent) { e.preventDefault(); }
  function onDrop(i: number) {
    if (dragIdx.current === null || dragIdx.current === i) return;
    const next = [...ministryCalls];
    const [moved] = next.splice(dragIdx.current, 1);
    next.splice(i, 0, moved);
    setMinistryCalls(next);
    dragIdx.current = null;
  }

  const [dockVisible, setDockVisible] = useState(true);
  const lastY = useRef(0);
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

      {/* Hero Banner */}
      <div className={s.heroBanner}>
        <div className={s.heroContent}>
          <div className={s.heroGreeting}>Welcome back, Farmer</div>
          <div className={s.heroSub}>Here is an overview of your livestock operations today.</div>
          <div className={s.heroStats}>
            <div className={s.heroStat}><Beef size={13} strokeWidth={2} /> <span>{heroTotals.animals}</span> Animals</div>
            <div className={s.heroStat}><Tag size={13} strokeWidth={2} /> <span>{heroTotals.tags}</span> Tags</div>
            <div className={s.heroStat}><Navigation size={13} strokeWidth={2} /> <span>{heroTotals.movements}</span> Movements</div>
            <div className={s.heroStat}><Activity size={13} strokeWidth={2} /> <span>{heroTotals.health}</span> Health Records</div>
          </div>
        </div>
        <div className={s.heroRight}>
          <div className={s.heroSpecies}>
            {speciesData.map(sp => {
              const spKey = sp.name.toUpperCase();
              const total = speciesCounts[spKey] ?? 0;
              return (
                <div key={sp.name} className={s.heroSpeciesItem}>
                  <div className={s.heroSpeciesEmoji}>{sp.emoji}</div>
                  <div className={s.heroSpeciesName}>{sp.name}</div>
                  <div className={s.heroSpeciesNum}>{total.toLocaleString()}</div>
                </div>
              );
            })}
          </div>
          <div className={s.heroActions}>
            <Link to="/animals/register" className={`${s.heroCta} ${s.heroCtaHideMobile}`}>
              <Plus size={14} strokeWidth={2.5} /> Register Animal
            </Link>
            <Link to="/map" className={`${s.heroSecondary} ${s.heroCtaHideMobile}`}>
              <Map size={13} strokeWidth={2} /> View Movement Map
            </Link>
          </div>
        </div>
      </div>

      {/* Operations Overview + Tag Inventory row */}
      <div className={s.overviewRow}>
      <div className={s.overviewWidget}>
        <div className={s.overviewHead}>
          <div className={s.overviewTitle}>Operations Overview</div>
          <div className={s.overviewDate}>Aug 5, 2026</div>
        </div>

        <div className={s.overviewKpisRow}>
          {overviewKpis.map(k => (
            <div key={k.lbl} className={s.overviewKpi}>
              <div className={s.overviewKpiLbl}>
                {k.lbl} <span style={{ color: '#94a3b8', fontWeight: 400 }}>({k.sub})</span>
              </div>
              <div className={s.overviewKpiMain}>
                <div className={s.overviewKpiIcon} style={{ background: k.iconBg }}>
                  <k.Icon size={22} color={k.iconColor} strokeWidth={1.75} />
                </div>
                <div className={s.overviewKpiNum}>{k.num}</div>
              </div>
              <Link to={k.to} className={s.overviewKpiLink}>{k.linkLbl} →</Link>
            </div>
          ))}
        </div>

        <div className={s.overviewBottom}>
          <div className={s.overviewSection}>
            <div className={s.overviewSectionTitle}>Upcoming Events</div>
            {upcomingEvents.map((ev, i) => (
              <div key={i} className={s.overviewListItem}>
                <div className={s.overviewIconBox} style={{ background: ev.iconBg }}>
                  <ev.Icon size={14} color={ev.iconColor} strokeWidth={2} />
                </div>
                <div className={s.overviewItemBody}>
                  <div className={s.overviewItemName}>{ev.name}</div>
                  <div className={s.overviewItemSub}>{ev.sub}</div>
                </div>
                <div className={s.overviewItemDate}>{ev.date}</div>
              </div>
            ))}
            <Link to="/health" className={s.overviewViewAll}>View all events <ArrowRight size={10} /></Link>
          </div>

          <div className={s.overviewSection}>
            <div className={s.overviewSectionTitle}>Quick Insights</div>
            {overviewInsights.map((ins, i) => (
              <div key={i} className={s.overviewInsightItem}>
                <ins.Icon size={15} color={ins.iconColor} strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} />
                <div className={s.overviewInsightText}>{ins.text}</div>
              </div>
            ))}
            <Link to="/health" className={s.overviewViewAll}>View all insights <ArrowRight size={10} /></Link>
          </div>
        </div>
      </div>

      {/* Tag Inventory card */}
      {(() => {
        const sel   = premisesTags.find(p => p.id === selectedPremId);
        const inv   = sel?.farmer_tag_inventory?.[0];
        const avail = inv?.available ?? 0;
        const used  = inv?.used      ?? 0;
        const total = inv?.delivered ?? 0;
        const pct   = total > 0 ? Math.round((used / total) * 100) : 0;
        const isLow = total > 0 && avail / total < 0.2;
        return (
          <div className={s.tagInvCard}>
            <div className={s.tagInvCardHead}>
              <div>
                <div className={s.tagInvCardTitle}>Tag Inventory</div>
                <div className={s.tagInvCardSub}>RFID ear tag stock</div>
              </div>
              {!tagsLoading && premisesTags.length > 0 && (
                <PremisesDropdown
                  items={premisesTags}
                  selected={selectedPremId}
                  onSelect={setSelectedPremId}
                />
              )}
              {!tagsLoading && isLow && <span className={s.tagLowBadge}>LOW</span>}
            </div>

            {tagsLoading ? (
              <div className={s.tagInvLoading}><Loader2 size={22} color="#cbd5e1" className={s.tagInvSpinner} /></div>
            ) : premisesTags.length === 0 ? (
              <div className={s.tagInvEmpty}>
                <Tag size={28} color="#e2e8f0" strokeWidth={1.5} />
                <div>No premises registered</div>
              </div>
            ) : (
              <>
                <div className={s.tagInvVisual}>
                  <svg width="90" height="82" viewBox="0 0 110 100" style={{ display: 'block' }}>
                    <rect x="40" y="2" width="30" height="18" rx="6" fill="#eab308" stroke="#713f12" strokeWidth="2" />
                    <circle cx="55" cy="11" r="4.5" fill="#e5e7eb" stroke="#713f12" strokeWidth="1.5" />
                    <circle cx="55" cy="11" r="2" fill="white" />
                    <rect x="2" y="14" width="106" height="84" rx="14" fill="#eab308" stroke="#713f12" strokeWidth="2" />
                    <rect x="10" y="22" width="90" height="68" rx="9" fill="none" stroke="#713f12" strokeWidth="1" opacity="0.35" />
                    <rect x="14" y="27" width="18" height="13" rx="2" fill="rgba(0,0,0,0.3)" />
                    <rect x="16" y="29" width="14" height="9" rx="1" fill="#1e293b" />
                    <line x1="12" y1="30" x2="14" y2="30" stroke="#422006" strokeWidth="1" />
                    <line x1="12" y1="36" x2="14" y2="36" stroke="#422006" strokeWidth="1" />
                    <line x1="32" y1="30" x2="34" y2="30" stroke="#422006" strokeWidth="1" />
                    <line x1="32" y1="36" x2="34" y2="36" stroke="#422006" strokeWidth="1" />
                    <path d="M76,28 Q81,34 76,40" fill="none" stroke="#422006" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
                    <path d="M81,25 Q89,34 81,43" fill="none" stroke="#422006" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
                    <path d="M86,22 Q97,34 86,46" fill="none" stroke="#422006" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
                    <text x="55" y="57" fontSize="6.5" fill="#422006" fontFamily="monospace" textAnchor="middle" letterSpacing="1.5">ID NUMBER</text>
                    <text x="55" y="70" fontSize="11" fill="#1c1917" fontFamily="monospace" fontWeight="bold" textAnchor="middle">9001000441</text>
                    <text x="55" y="83" fontSize="8" fill="#422006" fontFamily="monospace" textAnchor="middle">9001000441</text>
                  </svg>
                </div>

                <div className={s.tagInvRows}>
                  <div className={s.tagInvRow}>
                    <span className={s.tagInvRowLbl}>Available</span>
                    <span className={s.tagInvRowNum} style={{ color: '#16a34a' }}>{avail}</span>
                  </div>
                  <div className={s.tagInvRow}>
                    <span className={s.tagInvRowLbl}>Used</span>
                    <span className={s.tagInvRowNum}>{used}</span>
                  </div>
                  <div className={s.tagInvRow}>
                    <span className={s.tagInvRowLbl}>Allocated</span>
                    <span className={s.tagInvRowNum}>{total}</span>
                  </div>
                </div>

                {total > 0 ? (
                  <>
                    <div className={s.tagInvProgressBar}>
                      <div className={s.tagInvProgressFill} style={{ width: `${pct}%`, background: isLow ? '#ef4444' : '#3b82f6' }} />
                    </div>
                    <div className={s.tagInvProgressLbl}>{used} of {total} used ({pct}%)</div>
                  </>
                ) : (
                  <div className={s.tagInvProgressLbl} style={{ marginTop: '0.75rem' }}>No tags allocated to this premises yet</div>
                )}
              </>
            )}

            <Link
              to={sel ? `/premises/${sel.premises_code}/tags` : '/premises'}
              className={s.cardLink}
              style={{ marginTop: 'auto' }}
            >
              Manage tags <ArrowRight size={12} />
            </Link>
          </div>
        );
      })()}

      </div>{/* end overviewRow */}

      {/* Ministry Vaccination Calls + Health Alerts row */}
      <div className={s.ministryRow}>
      <div className={s.ministrySection}>
        <div className={s.ministrySectionHead}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div className={s.ministryHeadIcon}>
              <Bell size={15} color="#7c3aed" strokeWidth={2} />
            </div>
            <div>
              <div className={s.ministrySectionTitle}>Ministry Vaccination Calls</div>
              <div className={s.ministrySectionSub}>Active campaigns requiring your action</div>
            </div>
          </div>
          <span className={s.ministryBadge}>{ministryCalls.length} Active</span>
        </div>
        <div className={s.ministryCalls}>
          {ministryCalls.map((c, i) => (
            <div
              key={c.id}
              className={`${s.ministryCard}${c.urgent ? ' ' + s.ministryCardUrgent : ''}`}
              draggable
              onDragStart={() => onDragStart(i)}
              onDragOver={onDragOver}
              onDrop={() => onDrop(i)}
            >
              <div className={s.ministryCardHeader}>
                <div className={s.ministryCardHeaderLeft}>
                  <GripVertical size={14} color="#cbd5e1" strokeWidth={2} className={s.ministryDragHandle} />
                  <span className={s.ministryCallId}>{c.id}</span>
                  {c.urgent && <span className={s.ministryUrgentBadge}>⚠ URGENT</span>}
                </div>
                <div className={s.ministryClock}>
                  <Clock size={12} strokeWidth={2} />
                  <span>Deadline: <strong>{c.deadline}</strong></span>
                </div>
              </div>
              <div className={s.ministryCardBody}>
                <div className={s.ministryCallName}>{c.campaign}</div>
                <div className={s.ministryCallDisease}>{c.disease}</div>
                <div className={s.ministryCallDesc}>{c.desc}</div>
                <div className={s.ministryVetRow}>
                  <div className={s.ministryVetIcon}><Phone size={12} color="#16a34a" strokeWidth={2} /></div>
                  <div>
                    <div className={s.ministryVetName}>{c.vet.name}</div>
                    <a href={`tel:${c.vet.phone}`} className={s.ministryVetPhone}>{c.vet.phone}</a>
                  </div>
                </div>
                <div className={s.ministryCardFooter}>
                  <div className={s.ministrySpeciesChips}>
                    {c.species.map(sp => <span key={sp} className={s.ministrySpeciesChip}>{sp}</span>)}
                  </div>
                  <span className={s.ministryRegion}><MapPin size={11} strokeWidth={2} />{c.region}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>{/* end ministrySection */}

      {/* Health Alerts — right of ministry section */}
      <div className={`${s.card} ${s.ministryHealthCard}`}>
        <div className={s.cardHeader}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
            <div className={s.cardIconBox} style={{ background: '#f1f5f9' }}>
              <Activity size={16} color="#0f172a" strokeWidth={2} />
            </div>
            <div>
              <div className={s.cardTitle}>Health Alerts</div>
              <div className={s.cardSub}>Animals requiring attention</div>
            </div>
          </div>
          <span className={s.alertBadge}>2 Active</span>
        </div>
        <div className={s.infoList}>
          {healthAlerts.map((a, i) => (
            <div key={i} className={s.infoRow}>
              <span className={s.infoIcon} style={{ background: a.iconBg }}>
                <a.Icon size={17} color="#0f172a" strokeWidth={2} />
              </span>
              <span className={s.infoText}>{a.text}</span>
              <span className={s.infoTag} style={{ color: a.tagColor, background: a.tagBg }}>{a.tag}</span>
            </div>
          ))}
        </div>
        <Link to="/health" className={s.cardLink}>View health records <ArrowRight size={12} /></Link>
      </div>

      </div>{/* end ministryRow */}


      {/* Main Grid */}
      <div className={s.mainGrid}>

        {/* Registration Chart */}
        <div className={`${s.card} ${s.chartCard}`}>
          <div className={s.cardHeader}>
            <div>
              <div className={s.cardTitle}>Animal Registrations</div>
              <div className={s.cardSub}>Monthly trend this year</div>
            </div>
            <span className={s.cardBadge}>2026</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={registrationData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorAnimals" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', fontSize: 12 }} />
              <Area type="monotone" dataKey="animals" stroke="#3b82f6" strokeWidth={2} fill="url(#colorAnimals)" dot={{ fill: '#3b82f6', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Market Calendar */}
        <div className={`${s.card} ${s.calCard}`}>
          <div className={s.cardHeader}>
            <div>
              <div className={s.cardTitle}>Market Calendar</div>
              <div className={s.cardSub}>Upcoming livestock markets</div>
            </div>
            <CalendarDays size={16} color="#64748b" strokeWidth={1.75} />
          </div>
          <div className={s.marketList}>
            {marketCalendar.map((m, i) => (
              <div key={i} className={`${s.marketRow}${m.soon ? ' ' + s.marketRowSoon : ''}`}>
                <div className={s.marketDate}>
                  <div className={s.marketDayLabel}>{m.day}</div>
                  <div className={s.marketDateNum}>{m.date.split(' ')[1]}</div>
                </div>
                <div className={s.marketBody}>
                  <div className={s.marketName}>{m.name}</div>
                  <div className={s.marketLoc}><MapPin size={10} strokeWidth={2} /> {m.location}</div>
                </div>
                <div className={s.marketChips}>
                  {m.species.map(sp => <span key={sp} className={s.marketChip}>{sp}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Bottom Stats Bar */}
      <div className={`${s.statsBar}${dockVisible ? '' : ' ' + s.statsBarHidden}`}>
        <BarStat Icon={ShieldCheck} label="Farmer Code" value={farmerCode ?? '—'} />
        <BarStat Icon={KeyRound}    label="Name"        value={farmerName ?? 'Farmer'} />
        <BarStat Icon={Globe}       label="System"      value="QXLITS v1.0" />
        <BarStat Icon={Server}      label="Backend"     value="Supabase" />
        <BarStat Icon={Activity}    label="Auth"        value="Supabase Auth" />
        <div className={s.dockDivider} />
        <button className={s.supportBtn} title="Support Chat">
          <Headset size={26} strokeWidth={1.5} color="#0b5ed7" />
        </button>
      </div>
    </div>
  );
}

function PremisesDropdown({ items, selected, onSelect }: {
  items: PremisesTagRow[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const sel = items.find(p => p.id === selected);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  return (
    <div ref={ref} className={s.premDrop} style={{ marginLeft: 'auto' }}>
      <button className={s.premDropTrigger} onClick={() => setOpen(o => !o)}>
        <span className={s.premDropCode}>{sel?.premises_code ?? '—'}</span>
        {sel?.premises_name && <span className={s.premDropName}>{sel.premises_name}</span>}
        <ChevronDown size={11} className={`${s.premDropChevron}${open ? ' ' + s.premDropChevronOpen : ''}`} />
      </button>
      {open && (
        <div className={s.premDropPanel}>
          {items.map(p => (
            <button
              key={p.id}
              className={`${s.premDropOption}${p.id === selected ? ' ' + s.premDropOptionSel : ''}`}
              onClick={() => { onSelect(p.id); setOpen(false); }}
            >
              <span className={s.premDropCode}>{p.premises_code}</span>
              {p.premises_name && <span className={s.premDropName}>{p.premises_name}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
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
