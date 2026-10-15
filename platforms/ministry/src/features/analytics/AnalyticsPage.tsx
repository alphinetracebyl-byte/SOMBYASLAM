import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Beef, Navigation, Building2, Tag, MapPin, RefreshCw,
  Activity, BarChart2, Shield, TrendingUp, CheckCircle,
  Clock, XCircle, Layers, Zap,
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/lib/supabase';
import s from './analytics.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RawAnimal    { species: string; breed: string; gender: string; status: string; premises_code: string; date_of_birth: string | null; }
interface RawMovement  { status: string; created_at: string; origin_region_code: string | null; destination_region_code: string | null; animal_count: number | null; movement_type_code: string | null; }
interface RawPremises  { premises_type: string; status: string; region_code: string; created_at: string; premises_code?: string; premises_name?: string; gps_latitude?: number | null; gps_longitude?: number | null; user_id?: string | null; }
interface RawFarmerOwner { id: string; user_id: string; full_name: string; phone_e164: string; farmer_code: string; }
interface RawFacility  { facility_type: string; status: string; region_code: string; capacity: number | null; created_at: string; }
interface RawTagReq    { status: string; quantity: number | null; tag_type: string; requested_at: string; }
interface RawBatch     { species: string; count: number | null; status: string; created_at: string; }

// ── Constants ─────────────────────────────────────────────────────────────────

const SPECIES_COLOR: Record<string, string> = {
  CATTLE: '#1d4ed8', CAMEL: '#0891b2', GOAT: '#7c3aed', SHEEP: '#0d9488',
  cattle: '#1d4ed8', camel: '#0891b2', goat: '#7c3aed', sheep: '#0d9488',
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: '#16a34a', DEAD: '#6b7280', SLAUGHTERED: '#9ca3af',
  EXPORTED: '#0891b2', MISSING: '#dc2626', RESTRICTED: '#f59e0b',
  SUBMITTED: '#f59e0b', PENDING: '#f59e0b', UNDER_REVIEW: '#3b82f6',
  APPROVED: '#16a34a', COMPLETED: '#059669', REJECTED: '#dc2626',
  IN_TRANSIT: '#8b5cf6', PERMIT_ISSUED: '#0d9488',
  INSPECTION_ASSIGNED: '#6366f1', DEPARTURE_CONFIRMED: '#0891b2',
  ARRIVAL_CONFIRMED: '#059669', INSPECTION_FAILED: '#ef4444',
  DESTINATION_CHECK: '#d97706', DESTINATION_REJECTED: '#b91c1c',
  INACTIVE: '#6b7280', SUSPENDED: '#f59e0b',
  DISPATCHED: '#2563eb', DELIVERED: '#16a34a',
  FARM: '#1d4ed8', RANCH: '#0891b2', FEEDLOT: '#7c3aed',
  QUARANTINE_STATION: '#b91c1c', SLAUGHTERHOUSE: '#7c3aed', CHECKPOINT: '#0891b2',
};

const CHART_BLUES = ['#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];
const PIE_COLORS  = ['#1d4ed8', '#7c3aed', '#0891b2', '#0d9488', '#d97706', '#dc2626', '#6366f1', '#f59e0b'];

const TABS = [
  { key: 'overview',   label: 'Overview',   Icon: BarChart2  },
  { key: 'livestock',  label: 'Livestock',  Icon: Beef       },
  { key: 'movements',  label: 'Movements',  Icon: Navigation },
  { key: 'facilities', label: 'Facilities', Icon: Building2  },
  { key: 'tags',       label: 'Tags',       Icon: Tag        },
];

const TIME_RANGES = [
  { key: 30,  label: '30D' },
  { key: 90,  label: '90D' },
  { key: 180, label: '6M'  },
  { key: 365, label: '1Y'  },
  { key: 0,   label: 'All' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function monthKey(date: string): string {
  return (date ?? '').slice(0, 7);
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  if (!y || !m) return key;
  return new Date(+y, +m - 1, 1).toLocaleDateString('en', { month: 'short', year: '2-digit' });
}

function getMonths(n: number): string[] {
  const months: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    months.push(d.toISOString().slice(0, 7));
  }
  return months;
}

function countBy<T>(arr: T[], key: keyof T): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of arr) {
    const k = String(item[key] ?? 'UNKNOWN');
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

function applyRange<T extends { created_at?: string; requested_at?: string }>(arr: T[], days: number): T[] {
  if (days === 0) return arr;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return arr.filter(item => {
    const d = item.created_at ?? item.requested_at ?? '';
    return d ? new Date(d) >= cutoff : false;
  });
}

function fmtNum(n: number): string {
  return n.toLocaleString();
}

function shortLabel(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────

function ChartTip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className={s.tip}>
      {label && <p className={s.tipLabel}>{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className={s.tipRow}>
          <span className={s.tipDot} style={{ background: p.color }} />
          <span className={s.tipName}>{p.name}:</span>
          <strong className={s.tipVal}>{fmtNum(p.value)}</strong>
        </div>
      ))}
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, Icon }: { label: string; value: number | string; sub?: string; Icon: React.ElementType }) {
  return (
    <div className={s.kpiCard}>
      <div className={s.kpiIconWrap}><Icon size={20} /></div>
      <div className={s.kpiBody}>
        <p className={s.kpiValue}>{typeof value === 'number' ? fmtNum(value) : value}</p>
        <p className={s.kpiLabel}>{label}</p>
        {sub && <p className={s.kpiSub}>{sub}</p>}
      </div>
    </div>
  );
}

// ── Farms Map ─────────────────────────────────────────────────────────────────

const MAP_STATUS_COLOR: Record<string, string> = {
  APPROVED: '#16a34a', ACTIVE: '#16a34a',
  PENDING:  '#f59e0b',
  REJECTED: '#dc2626', SUSPENDED: '#dc2626',
};

function FarmsMap({ premises, ownerMap }: { premises: RawPremises[]; ownerMap: Map<string, RawFarmerOwner> }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);
  const pinned = premises.filter(p => p.gps_latitude != null && p.gps_longitude != null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

    const map = L.map(containerRef.current, {
      center: [6.5, 46.2],
      zoom: 5,
      scrollWheelZoom: true,
      attributionControl: false,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    pinned.forEach(p => {
      const color  = MAP_STATUS_COLOR[p.status] ?? '#6b7280';
      const owner  = p.user_id ? ownerMap.get(p.user_id) : undefined;
      const farmerId = owner?.id ?? '';

      const viewBtn = farmerId
        ? `<a href="/farmers/${farmerId}" style="display:inline-block;margin-top:8px;padding:5px 12px;background:#1d4ed8;color:#fff;border-radius:6px;font-size:11px;font-weight:600;text-decoration:none;">View Premises →</a>`
        : '';

      const label = `<div style="font-family:Inter,sans-serif;font-size:12px;line-height:1.7;min-width:190px">
        <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:4px">${p.premises_name ?? p.premises_code ?? '—'}</div>
        <div style="color:#64748b;margin-bottom:6px">${(p.premises_type ?? '').replace(/_/g, ' ')} · ${p.region_code ?? ''}</div>
        <div style="color:#64748b;margin-bottom:2px">Code: <strong style="color:#1e293b">${p.premises_code ?? '—'}</strong></div>
        ${owner ? `
        <div style="color:#64748b;margin-bottom:2px">Owner: <strong style="color:#1e293b">${owner.full_name}</strong></div>
        <div style="color:#64748b;margin-bottom:2px">Farmer ID: <strong style="color:#1e293b">${owner.farmer_code}</strong></div>
        <div style="color:#64748b;margin-bottom:4px">Phone: <strong style="color:#1e293b">${owner.phone_e164}</strong></div>
        ` : ''}
        <div style="display:inline-block;padding:2px 8px;border-radius:4px;background:${color}22;color:${color};font-weight:700;font-size:11px">${p.status}</div>
        ${viewBtn}
      </div>`;
      const circle = L.circleMarker(
        [p.gps_latitude as number, p.gps_longitude as number],
        { radius: 7, fillColor: color, color: '#fff', weight: 1.5, fillOpacity: 0.9 }
      ).addTo(map);
      circle.bindPopup(label, { maxWidth: 230 });
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [premises, ownerMap]);

  return (
    <div className={s.mapCard}>
      <div className={s.mapCardHeader}>
        <p className={s.chartTitle}>Farm Locations</p>
        <div className={s.mapLegend}>
          <span className={s.mapDot} style={{ background: '#16a34a' }} /> Approved
          <span className={s.mapDot} style={{ background: '#f59e0b', marginLeft: '0.75rem' }} /> Pending
          <span className={s.mapDot} style={{ background: '#dc2626', marginLeft: '0.75rem' }} /> Other
        </div>
      </div>
      <div className={s.mapWrap}>
        <div ref={containerRef} className={s.mapContainer} />
        {pinned.length === 0 && (
          <div className={s.mapEmpty}>No farms with GPS coordinates</div>
        )}
      </div>
      <div className={s.mapFooter}>
        {pinned.length} of {premises.length} farms mapped
      </div>
    </div>
  );
}

// ── Chart Card ────────────────────────────────────────────────────────────────

function ChartCard({ title, children, span }: { title: string; children: React.ReactNode; span?: '2' | '3' }) {
  const cls = [s.chartCard, span === '2' ? s.span2 : span === '3' ? s.span3 : ''].filter(Boolean).join(' ');
  return (
    <div className={cls}>
      <p className={s.chartTitle}>{title}</p>
      <div className={s.chartBody}>{children}</div>
    </div>
  );
}

// ── Empty chart placeholder ────────────────────────────────────────────────────

function EmptyChart() {
  return <div className={s.emptyChart}>No data available for this period</div>;
}

// ── Pie legend ────────────────────────────────────────────────────────────────

function PieLegend({ data }: { data: Array<{ name: string; value: number; color: string }> }) {
  const total = data.reduce((a, b) => a + b.value, 0);
  return (
    <div className={s.pieLegend}>
      {data.map((d, i) => (
        <div key={i} className={s.pieLegendRow}>
          <span className={s.pieLegendDot} style={{ background: d.color }} />
          <span className={s.pieLegendName}>{shortLabel(d.name)}</span>
          <span className={s.pieLegendVal}>{d.value}</span>
          <span className={s.pieLegendPct}>{total > 0 ? Math.round(d.value / total * 100) : 0}%</span>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function AnalyticsPage(): JSX.Element {
  const [tab,         setTab]         = useState('overview');
  const [range,       setRange]       = useState(365);
  const [loading,     setLoading]     = useState(true);
  const [animals,     setAnimals]     = useState<RawAnimal[]>([]);
  const [movements,   setMovements]   = useState<RawMovement[]>([]);
  const [premises,    setPremises]    = useState<RawPremises[]>([]);
  const [facilities,  setFacilities]  = useState<RawFacility[]>([]);
  const [tagReqs,     setTagReqs]     = useState<RawTagReq[]>([]);
  const [batches,     setBatches]     = useState<RawBatch[]>([]);
  const [ownerMap,    setOwnerMap]    = useState<Map<string, RawFarmerOwner>>(new Map());
  const [updatedAt,   setUpdatedAt]   = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [aR, mR, pR, fR, tR, bR, owR] = await Promise.all([
      supabase.from('farmer_animals').select('species, breed, gender, status, premises_code, date_of_birth'),
      supabase.from('farmer_movement_requests').select('status, created_at, origin_region_code, destination_region_code, animal_count, movement_type_code'),
      supabase.from('farmer_premises').select('premises_type, status, region_code, created_at, premises_code, premises_name, gps_latitude, gps_longitude, user_id'),
      supabase.from('facilities').select('facility_type, status, region_code, capacity, created_at'),
      supabase.from('farmer_tag_requests').select('status, quantity, tag_type, requested_at'),
      supabase.from('batches').select('species, count, status, created_at'),
      supabase.rpc('get_all_farmers', { p_status: null, p_region: null }),
    ]);
    setAnimals((aR.data ?? []) as RawAnimal[]);
    setMovements((mR.data ?? []) as RawMovement[]);
    setPremises((pR.data ?? []) as RawPremises[]);
    setFacilities((fR.data ?? []) as RawFacility[]);
    setTagReqs((tR.data ?? []) as RawTagReq[]);
    setBatches((bR.data ?? []) as RawBatch[]);
    const oMap = new Map<string, RawFarmerOwner>();
    ((owR.data ?? []) as Array<Record<string, unknown>>).forEach(r => {
      const uid = r.user_id as string | null;
      if (uid) oMap.set(uid, { id: r.id as string, user_id: uid, full_name: r.full_name as string, phone_e164: r.phone_e164 as string, farmer_code: r.farmer_code as string });
    });
    setOwnerMap(oMap);
    setUpdatedAt(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  // ── Filtered slices ───────────────────────────────────────────────────────

  const filtMovements  = applyRange(movements,  range);
  const filtTagReqs    = applyRange(tagReqs,     range);
  const filtPremises   = applyRange(premises,    range);
  const filtFacilities = applyRange(facilities.map(f => ({ ...f, created_at: f.created_at })), range);

  // ── Global KPIs ───────────────────────────────────────────────────────────

  const totalAnimals   = animals.length;
  const activePremises = premises.filter(p => ['APPROVED', 'ACTIVE'].includes(p.status)).length;
  const activeMovs     = movements.filter(m => ['SUBMITTED', 'UNDER_REVIEW', 'INSPECTION_ASSIGNED',
    'PERMIT_ISSUED', 'IN_TRANSIT', 'DEPARTURE_CONFIRMED'].includes(m.status)).length;
  const activeFacs     = facilities.filter(f => f.status === 'ACTIVE').length;
  const pendingTags    = tagReqs.filter(t => t.status === 'PENDING').length;

  // ── Overview analytics ────────────────────────────────────────────────────

  // Movement trend – last 12 months
  const last12 = getMonths(12);
  const movMonthMap: Record<string, number> = Object.fromEntries(last12.map(m => [m, 0]));
  for (const m of movements) {
    const k = monthKey(m.created_at);
    if (k in movMonthMap) movMonthMap[k]++;
  }
  const movTrend = last12.map(k => ({ month: monthLabel(k), Movements: movMonthMap[k] }));

  // Animal species donut
  const speciesCounts  = countBy(animals, 'species');
  const speciesDonut   = Object.entries(speciesCounts)
    .map(([name, value]) => ({ name, value, color: SPECIES_COLOR[name] ?? '#2563eb' }));

  // Movement status donut
  const movStatusMap  = countBy(filtMovements, 'status');
  const movStatusDonut = Object.entries(movStatusMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({ name, value, color: STATUS_COLOR[name] ?? PIE_COLORS[i % PIE_COLORS.length] }));

  // Premises by region — all 18 Somalia regions, zero if none
  const ALL_SOMALIA_REGIONS = ['AWD','WOG','TOG','SAN','BAR','SOL','NUG','MUD','GAL','HIR','BAK','BAY','MSH','BAN','LSH','GED','MJU','LJU'];
  const premByRegion = countBy(premises, 'region_code');
  const premRegionBar = ALL_SOMALIA_REGIONS.map(region => ({ region, Premises: premByRegion[region] ?? 0 }));

  // Overall activity line (movements + tag requests + premises by month)
  const activityByMonth: Record<string, { Movements: number; 'Tag Requests': number; Premises: number }> = {};
  for (const k of last12) activityByMonth[k] = { Movements: 0, 'Tag Requests': 0, Premises: 0 };
  for (const m of movements) {
    const k = monthKey(m.created_at);
    if (k in activityByMonth) activityByMonth[k].Movements++;
  }
  for (const t of tagReqs) {
    const k = monthKey(t.requested_at);
    if (k in activityByMonth) activityByMonth[k]['Tag Requests']++;
  }
  for (const p of premises) {
    const k = monthKey(p.created_at);
    if (k in activityByMonth) activityByMonth[k].Premises++;
  }
  const activityTrend = last12.map(k => ({ month: monthLabel(k), ...activityByMonth[k] }));

  // ── Livestock analytics ───────────────────────────────────────────────────

  const animalSpeciesBar = Object.entries(speciesCounts)
    .map(([species, count]) => ({ species: shortLabel(species), Animals: count, fill: SPECIES_COLOR[species] ?? '#2563eb' }));

  const genderCounts   = countBy(animals, 'gender');
  const genderDonut    = Object.entries(genderCounts)
    .map(([name, value], i) => ({ name: shortLabel(name), value, color: CHART_BLUES[i] ?? '#2563eb' }));

  const animalStatusCounts = countBy(animals, 'status');
  const animalStatusDonut  = Object.entries(animalStatusCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name: shortLabel(name), value, color: STATUS_COLOR[name] ?? '#6b7280' }));

  // Batch species aggregation (animals in herds)
  const batchSpecies: Record<string, number> = {};
  for (const b of batches) {
    const sp = (b.species ?? 'UNKNOWN').toUpperCase();
    batchSpecies[sp] = (batchSpecies[sp] ?? 0) + Number(b.count ?? 0);
  }
  const batchSpeciesBar = Object.entries(batchSpecies)
    .map(([species, count]) => ({ species: shortLabel(species), 'Herd Animals': count, fill: SPECIES_COLOR[species] ?? '#2563eb' }));

  // Livestock trend by month (batch registrations as proxy)
  const last6 = getMonths(6);
  const batchMonthMap: Record<string, number> = Object.fromEntries(last6.map(m => [m, 0]));
  for (const b of batches) {
    const k = monthKey(b.created_at);
    if (k in batchMonthMap) batchMonthMap[k] += Number(b.count ?? 0);
  }
  const livestockTrend = last6.map(k => ({ month: monthLabel(k), 'Animals Registered': batchMonthMap[k] }));

  // ── Movement analytics ────────────────────────────────────────────────────

  const completedMovs = movements.filter(m => m.status === 'COMPLETED').length;
  const pendingMovs   = movements.filter(m => ['SUBMITTED', 'UNDER_REVIEW'].includes(m.status)).length;
  const rejectedMovs  = movements.filter(m => m.status === 'REJECTED').length;
  const inTransitMovs = movements.filter(m => m.status === 'IN_TRANSIT').length;

  const movByRegion   = countBy(filtMovements.filter(m => m.origin_region_code), 'origin_region_code');
  const movRegionBar  = Object.entries(movByRegion)
    .filter(([k]) => k && k !== 'null')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([region, Movements]) => ({ region, Movements }));

  const movTypeMap    = countBy(filtMovements.filter(m => m.movement_type_code), 'movement_type_code');
  const movTypeBar    = Object.entries(movTypeMap)
    .map(([type, count]) => ({ type: shortLabel(type), Movements: count }));

  // Animal count per movement (total animals moved)
  const animalsMoved  = filtMovements.reduce((sum, m) => sum + (m.animal_count ?? 0), 0);

  // Movement trend
  const movTrendFilt = last12.map(k => ({ month: monthLabel(k), Movements: movMonthMap[k] }));

  // Status progression funnel
  const statusOrder = ['SUBMITTED', 'UNDER_REVIEW', 'INSPECTION_ASSIGNED', 'PERMIT_ISSUED', 'IN_TRANSIT', 'COMPLETED'];
  const funnelData = statusOrder.map(status => ({
    stage: shortLabel(status),
    count: movements.filter(m => m.status === status).length,
  }));

  // ── Facilities analytics ──────────────────────────────────────────────────

  const facByType      = countBy(facilities, 'facility_type');
  const facTypeBar     = Object.entries(facByType)
    .map(([type, count], i) => ({ type: shortLabel(type), Facilities: count, fill: PIE_COLORS[i] ?? '#2563eb' }));

  const facStatusCounts = countBy(facilities, 'status');
  const facStatusDonut  = Object.entries(facStatusCounts)
    .map(([name, value]) => ({ name: shortLabel(name), value, color: STATUS_COLOR[name] ?? '#6b7280' }));

  const facByRegion    = countBy(facilities, 'region_code');
  const facRegionBar   = Object.entries(facByRegion)
    .filter(([k]) => k && k !== 'null')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([region, Facilities]) => ({ region, Facilities }));

  const totalCapacity  = facilities.reduce((sum, f) => sum + (f.capacity ?? 0), 0);
  const facCapByType   = (() => {
    const cap: Record<string, number> = {};
    for (const f of facilities) {
      const t = shortLabel(f.facility_type ?? 'UNKNOWN');
      cap[t] = (cap[t] ?? 0) + (f.capacity ?? 0);
    }
    return Object.entries(cap).map(([type, Capacity]) => ({ type, Capacity }));
  })();

  // Facilities by region + type (stacked)
  const facRegionTypeBar = (() => {
    const regionData: Record<string, Record<string, number>> = {};
    for (const f of facilities) {
      const r = f.region_code ?? 'UNKNOWN';
      const t = shortLabel(f.facility_type ?? 'UNKNOWN');
      if (!regionData[r]) regionData[r] = {};
      regionData[r][t] = (regionData[r][t] ?? 0) + 1;
    }
    return Object.entries(regionData)
      .sort((a, b) => Object.values(b[1]).reduce((s, v) => s + v, 0) - Object.values(a[1]).reduce((s, v) => s + v, 0))
      .slice(0, 8)
      .map(([region, types]) => ({ region, ...types }));
  })();

  const facTypes = [...new Set(facilities.map(f => shortLabel(f.facility_type ?? '')))];

  // ── Tags analytics ────────────────────────────────────────────────────────

  const tagStatusCounts = countBy(filtTagReqs, 'status');
  const tagStatusDonut  = Object.entries(tagStatusCounts)
    .map(([name, value], i) => ({ name: shortLabel(name), value, color: STATUS_COLOR[name] ?? PIE_COLORS[i % PIE_COLORS.length] }));

  const tagTypeCounts = countBy(filtTagReqs, 'tag_type');
  const tagTypeBar    = Object.entries(tagTypeCounts)
    .map(([type, Requests]) => ({ type: shortLabel(type), Requests }));

  const totalTagsRequested = filtTagReqs.reduce((sum, t) => sum + (t.quantity ?? 0), 0);
  const tagsApproved       = filtTagReqs.filter(t => ['APPROVED', 'DISPATCHED', 'DELIVERED'].includes(t.status)).reduce((s, t) => s + (t.quantity ?? 0), 0);

  const tagMonthMap: Record<string, number> = Object.fromEntries(last6.map(m => [m, 0]));
  for (const t of tagReqs) {
    const k = monthKey(t.requested_at);
    if (k in tagMonthMap) tagMonthMap[k]++;
  }
  const tagTrend = last6.map(k => ({ month: monthLabel(k), Requests: tagMonthMap[k] }));

  const tagQtyMonthMap: Record<string, number> = Object.fromEntries(last6.map(m => [m, 0]));
  for (const t of tagReqs) {
    const k = monthKey(t.requested_at);
    if (k in tagQtyMonthMap) tagQtyMonthMap[k] += t.quantity ?? 0;
  }
  const tagQtyTrend = last6.map(k => ({ month: monthLabel(k), 'Tags Requested': tagQtyMonthMap[k] }));

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={s.page}>

      {/* ── Dark header ── */}
      <div className={s.header}>
        <div className={s.headerTop}>
          <div>
            <h1 className={s.headerTitle}>National Livestock Analytics</h1>
            <p className={s.headerSub}>Real-time insights across Somalia's livestock traceability system</p>
          </div>
          <div className={s.headerRight}>
            {updatedAt && <span className={s.updatedAt}>Updated {updatedAt.toLocaleTimeString()}</span>}
            <button className={s.refreshBtn} onClick={() => void load()} disabled={loading}>
              <RefreshCw size={13} className={loading ? s.spin : ''} />
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
        </div>

        <div className={s.kpiRow}>
          <KpiCard label="Total Animals"     value={totalAnimals}   sub="registered livestock"  Icon={Beef}       />
          <KpiCard label="Active Premises"   value={activePremises} sub="approved farms"        Icon={MapPin}     />
          <KpiCard label="Active Movements"  value={activeMovs}     sub="awaiting action"       Icon={Navigation} />
          <KpiCard label="Active Facilities" value={activeFacs}     sub="operational"           Icon={Building2}  />
          <KpiCard label="Pending Tag Reqs"  value={pendingTags}    sub="awaiting dispatch"     Icon={Tag}        />
        </div>
      </div>

      {/* ── Controls ── */}
      <div className={s.controlBar}>
        <div className={s.tabs}>
          {TABS.map(t => (
            <button
              key={t.key}
              className={`${s.tab}${tab === t.key ? ' ' + s.tabActive : ''}`}
              onClick={() => setTab(t.key)}
            >
              <t.Icon size={13} strokeWidth={2} />
              {t.label}
            </button>
          ))}
        </div>
        <div className={s.rangeRow}>
          <span className={s.rangeLabel}>Period:</span>
          {TIME_RANGES.map(r => (
            <button
              key={r.key}
              className={`${s.rangeBtn}${range === r.key ? ' ' + s.rangeBtnActive : ''}`}
              onClick={() => setRange(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className={s.loadingState}>
          <Activity size={28} className={s.spin} style={{ color: '#2563eb' }} />
          <span>Loading analytics data…</span>
        </div>
      ) : (
        <div className={s.content}>

          {/* ═══════════════ OVERVIEW ═══════════════ */}
          {tab === 'overview' && (
            <div className={s.stackGrid}>

              {/* Activity trend — full width */}
              <ChartCard title="System Activity Trend — Last 12 Months">
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={activityTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gmov" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}    />
                      </linearGradient>
                      <linearGradient id="gtag" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}    />
                      </linearGradient>
                      <linearGradient id="gprem" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#0891b2" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#0891b2" stopOpacity={0}    />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="Movements"    stroke="#2563eb" fill="url(#gmov)"  strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="Tag Requests" stroke="#7c3aed" fill="url(#gtag)"  strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="Premises"     stroke="#0891b2" fill="url(#gprem)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Map — full width */}
              <FarmsMap premises={premises} ownerMap={ownerMap} />

              {/* Two donuts side by side — full width row */}
              <div className={s.donutRow}>
                <div className={s.donutHalf}>
                  <p className={s.chartTitle}>Livestock by Species</p>
                  {speciesDonut.length === 0 ? <EmptyChart /> : (
                    <div className={s.donutHoriz}>
                      <ResponsiveContainer width={200} height={200}>
                        <PieChart>
                          <Pie data={speciesDonut} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                            dataKey="value" paddingAngle={2}>
                            {speciesDonut.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                          </Pie>
                          <Tooltip content={<ChartTip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <PieLegend data={speciesDonut} />
                    </div>
                  )}
                </div>
                <div className={s.donutDivider} />
                <div className={s.donutHalf}>
                  <p className={s.chartTitle}>Movement Status Distribution</p>
                  {movStatusDonut.length === 0 ? <EmptyChart /> : (
                    <div className={s.donutHoriz}>
                      <ResponsiveContainer width={200} height={200}>
                        <PieChart>
                          <Pie data={movStatusDonut} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                            dataKey="value" paddingAngle={2}>
                            {movStatusDonut.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                          </Pie>
                          <Tooltip content={<ChartTip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <PieLegend data={movStatusDonut} />
                    </div>
                  )}
                </div>
              </div>

              {/* Premises by region — full width */}
              <ChartCard title="Premises Registered by Region">
                {premRegionBar.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={premRegionBar} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="region" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<ChartTip />} />
                      <Bar dataKey="Premises" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              {/* Quick stat summary — full width */}
              <div className={s.statGrid}>
                {[
                  { label: 'Movements Completed', value: completedMovs,       Icon: CheckCircle, color: '#16a34a' },
                  { label: 'Movements Pending',   value: pendingMovs,         Icon: Clock,       color: '#f59e0b' },
                  { label: 'Movements Rejected',  value: rejectedMovs,        Icon: XCircle,     color: '#dc2626' },
                  { label: 'Total Tag Requests',  value: tagReqs.length,      Icon: Tag,         color: '#7c3aed' },
                  { label: 'Facilities Total',    value: facilities.length,   Icon: Building2,   color: '#0891b2' },
                  { label: 'Total Premises',      value: premises.length,     Icon: MapPin,      color: '#1d4ed8' },
                ].map((item, i) => (
                  <div key={i} className={s.statCard}>
                    <item.Icon size={16} style={{ color: '#64748b', flexShrink: 0 }} />
                    <div>
                      <p className={s.statVal}>{fmtNum(item.value)}</p>
                      <p className={s.statLbl}>{item.label}</p>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* ═══════════════ LIVESTOCK ═══════════════ */}
          {tab === 'livestock' && (
            <div className={s.grid}>

              {/* Species breakdown bar */}
              <ChartCard title="Individual Animals by Species" span="2">
                {animalSpeciesBar.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={animalSpeciesBar} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="species" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<ChartTip />} />
                      <Bar dataKey="Animals" radius={[6, 6, 0, 0]}>
                        {animalSpeciesBar.map((d, i) => <Cell key={i} fill={d.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              {/* Gender donut */}
              <ChartCard title="Gender Distribution">
                {genderDonut.length === 0 ? <EmptyChart /> : (
                  <div className={s.donutWrap}>
                    <ResponsiveContainer width="100%" height={170}>
                      <PieChart>
                        <Pie data={genderDonut} cx="50%" cy="50%" innerRadius={48} outerRadius={76}
                          dataKey="value" paddingAngle={2}>
                          {genderDonut.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                        </Pie>
                        <Tooltip content={<ChartTip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <PieLegend data={genderDonut} />
                  </div>
                )}
              </ChartCard>

              {/* Animal status donut */}
              <ChartCard title="Animal Status Breakdown">
                {animalStatusDonut.length === 0 ? <EmptyChart /> : (
                  <div className={s.donutWrap}>
                    <ResponsiveContainer width="100%" height={170}>
                      <PieChart>
                        <Pie data={animalStatusDonut} cx="50%" cy="50%" innerRadius={48} outerRadius={76}
                          dataKey="value" paddingAngle={2}>
                          {animalStatusDonut.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                        </Pie>
                        <Tooltip content={<ChartTip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <PieLegend data={animalStatusDonut} />
                  </div>
                )}
              </ChartCard>

              {/* Herd (batch) animals by species */}
              <ChartCard title="Herd Animals by Species (Batch Registry)" span="2">
                {batchSpeciesBar.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={batchSpeciesBar} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="species" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<ChartTip />} />
                      <Bar dataKey="Herd Animals" radius={[6, 6, 0, 0]}>
                        {batchSpeciesBar.map((d, i) => <Cell key={i} fill={d.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              {/* Livestock registered trend */}
              <ChartCard title="Herd Registrations — Last 6 Months">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={livestockTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="glv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#1d4ed8" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTip />} />
                    <Area type="monotone" dataKey="Animals Registered" stroke="#1d4ed8" fill="url(#glv)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

            </div>
          )}

          {/* ═══════════════ MOVEMENTS ═══════════════ */}
          {tab === 'movements' && (
            <div className={s.grid}>

              {/* Summary metrics */}
              <div className={s.metricRow}>
                {[
                  { label: 'Total Movements', value: movements.length,  color: '#1d4ed8' },
                  { label: 'Pending Review',  value: pendingMovs,       color: '#f59e0b' },
                  { label: 'In Transit',      value: inTransitMovs,     color: '#8b5cf6' },
                  { label: 'Completed',       value: completedMovs,     color: '#16a34a' },
                  { label: 'Rejected',        value: rejectedMovs,      color: '#dc2626' },
                  { label: 'Animals Moved',   value: animalsMoved,      color: '#0891b2' },
                ].map((m, i) => (
                  <div key={i} className={s.metricCard}>
                    <p className={s.metricVal}>{fmtNum(m.value)}</p>
                    <p className={s.metricLbl}>{m.label}</p>
                  </div>
                ))}
              </div>

              {/* Movement trend */}
              <ChartCard title="Movement Requests — Last 12 Months" span="2">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={movTrendFilt} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gmt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTip />} />
                    <Area type="monotone" dataKey="Movements" stroke="#2563eb" fill="url(#gmt)" strokeWidth={2.5} dot={{ r: 3, fill: '#2563eb' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Status donut */}
              <ChartCard title="Status Distribution">
                {movStatusDonut.length === 0 ? <EmptyChart /> : (
                  <div className={s.donutWrap}>
                    <ResponsiveContainer width="100%" height={170}>
                      <PieChart>
                        <Pie data={movStatusDonut} cx="50%" cy="50%" innerRadius={48} outerRadius={76}
                          dataKey="value" paddingAngle={2}>
                          {movStatusDonut.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                        </Pie>
                        <Tooltip content={<ChartTip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <PieLegend data={movStatusDonut} />
                  </div>
                )}
              </ChartCard>

              {/* By origin region */}
              <ChartCard title="Movements by Origin Region" span="2">
                {movRegionBar.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={movRegionBar} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="region" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<ChartTip />} />
                      <Bar dataKey="Movements" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              {/* By movement type */}
              <ChartCard title="By Movement Type">
                {movTypeBar.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={movTypeBar} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <YAxis type="category" dataKey="type" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={90} />
                      <Tooltip content={<ChartTip />} />
                      <Bar dataKey="Movements" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              {/* Processing funnel */}
              <ChartCard title="Movement Processing Funnel" span="2">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={funnelData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="stage" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="count" name="Movements" radius={[4, 4, 0, 0]}>
                      {funnelData.map((_, i) => (
                        <Cell key={i} fill={CHART_BLUES[i % CHART_BLUES.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

            </div>
          )}

          {/* ═══════════════ FACILITIES ═══════════════ */}
          {tab === 'facilities' && (
            <div className={s.grid}>

              <div className={s.metricRow}>
                {[
                  { label: 'Total Facilities',        value: facilities.length,                                    color: '#1d4ed8' },
                  { label: 'Active',                  value: facilities.filter(f => f.status === 'ACTIVE').length, color: '#16a34a' },
                  { label: 'Quarantine Stations',     value: facilities.filter(f => f.facility_type === 'QUARANTINE_STATION').length, color: '#b91c1c' },
                  { label: 'Slaughterhouses',         value: facilities.filter(f => f.facility_type === 'SLAUGHTERHOUSE').length, color: '#7c3aed' },
                  { label: 'Checkpoints',             value: facilities.filter(f => f.facility_type === 'CHECKPOINT').length, color: '#0891b2' },
                  { label: 'Total Capacity',          value: totalCapacity,                                        color: '#0d9488' },
                ].map((m, i) => (
                  <div key={i} className={s.metricCard}>
                    <p className={s.metricVal}>{fmtNum(m.value)}</p>
                    <p className={s.metricLbl}>{m.label}</p>
                  </div>
                ))}
              </div>

              {/* By type */}
              <ChartCard title="Facilities by Type">
                {facTypeBar.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={facTypeBar} margin={{ top: 5, right: 10, left: -10, bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="type" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} angle={-15} textAnchor="end" />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<ChartTip />} />
                      <Bar dataKey="Facilities" radius={[6, 6, 0, 0]}>
                        {facTypeBar.map((d, i) => <Cell key={i} fill={d.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              {/* Status donut */}
              <ChartCard title="Status Distribution">
                {facStatusDonut.length === 0 ? <EmptyChart /> : (
                  <div className={s.donutWrap}>
                    <ResponsiveContainer width="100%" height={170}>
                      <PieChart>
                        <Pie data={facStatusDonut} cx="50%" cy="50%" innerRadius={48} outerRadius={76}
                          dataKey="value" paddingAngle={2}>
                          {facStatusDonut.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                        </Pie>
                        <Tooltip content={<ChartTip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <PieLegend data={facStatusDonut} />
                  </div>
                )}
              </ChartCard>

              {/* By region */}
              <ChartCard title="Facilities by Region" span="2">
                {facRegionBar.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={facRegionBar} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="region" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<ChartTip />} />
                      <Bar dataKey="Facilities" fill="#0891b2" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              {/* Capacity by type */}
              <ChartCard title="Total Capacity by Facility Type">
                {facCapByType.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={facCapByType} margin={{ top: 5, right: 10, left: -10, bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="type" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} angle={-15} textAnchor="end" />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTip />} />
                      <Bar dataKey="Capacity" fill="#1d4ed8" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              {/* Stacked bar: facilities by region and type */}
              <ChartCard title="Facilities by Region and Type" span="2">
                {facRegionTypeBar.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={facRegionTypeBar} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="region" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<ChartTip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      {facTypes.map((type, i) => (
                        <Bar key={type} dataKey={type} stackId="a" fill={PIE_COLORS[i % PIE_COLORS.length]} radius={i === facTypes.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

            </div>
          )}

          {/* ═══════════════ TAGS ═══════════════ */}
          {tab === 'tags' && (
            <div className={s.grid}>

              <div className={s.metricRow}>
                {[
                  { label: 'Total Requests',       value: filtTagReqs.length,                                        color: '#1d4ed8' },
                  { label: 'Pending',              value: filtTagReqs.filter(t => t.status === 'PENDING').length,    color: '#f59e0b' },
                  { label: 'Approved',             value: filtTagReqs.filter(t => t.status === 'APPROVED').length,   color: '#16a34a' },
                  { label: 'Dispatched',           value: filtTagReqs.filter(t => t.status === 'DISPATCHED').length, color: '#2563eb' },
                  { label: 'Tags Requested (qty)', value: totalTagsRequested,                                         color: '#7c3aed' },
                  { label: 'Tags Approved (qty)',  value: tagsApproved,                                               color: '#0d9488' },
                ].map((m, i) => (
                  <div key={i} className={s.metricCard}>
                    <p className={s.metricVal}>{fmtNum(m.value)}</p>
                    <p className={s.metricLbl}>{m.label}</p>
                  </div>
                ))}
              </div>

              {/* Request volume trend */}
              <ChartCard title="Tag Requests per Month — Last 6 Months" span="2">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={tagTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gtreq" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTip />} />
                    <Area type="monotone" dataKey="Requests" stroke="#7c3aed" fill="url(#gtreq)" strokeWidth={2.5} dot={{ r: 3, fill: '#7c3aed' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Status donut */}
              <ChartCard title="Request Status Distribution">
                {tagStatusDonut.length === 0 ? <EmptyChart /> : (
                  <div className={s.donutWrap}>
                    <ResponsiveContainer width="100%" height={170}>
                      <PieChart>
                        <Pie data={tagStatusDonut} cx="50%" cy="50%" innerRadius={48} outerRadius={76}
                          dataKey="value" paddingAngle={2}>
                          {tagStatusDonut.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                        </Pie>
                        <Tooltip content={<ChartTip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <PieLegend data={tagStatusDonut} />
                  </div>
                )}
              </ChartCard>

              {/* Tag type bar */}
              <ChartCard title="Requests by Tag Type">
                {tagTypeBar.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={tagTypeBar} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="type" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<ChartTip />} />
                      <Bar dataKey="Requests" fill="#2563eb" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              {/* Tag quantity trend */}
              <ChartCard title="Tag Quantity Requested per Month" span="2">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={tagQtyTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="Tags Requested" fill="#0891b2" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

            </div>
          )}

        </div>
      )}
    </div>
  );
}

export default AnalyticsPage;
