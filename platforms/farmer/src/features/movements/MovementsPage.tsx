import { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Truck, CheckCircle, XCircle, Clock,
  MapPin, ChevronRight, RefreshCw, ChevronDown, ChevronUp,
  ArrowDownToLine, ArrowUpFromLine, CheckCircle2, AlertCircle, Plus,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth.store';
import s from './movements.module.css';
import { MovementRequestModal } from './MovementRequestModal';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MyMovementRequest {
  id:                      string;
  movementCode:            string;
  status:                  string;
  originPremisesName:      string;
  originPremisesCode:      string;
  destinationPremisesCode: string;
  destinationPremisesName: string;
  movementTypeCode:        string;
  purpose:                 string;
  plannedDepartureDate:    string;
  plannedArrivalDate:      string;
  vehicleRegistration:     string;
  animalCount:             number;
  createdAt:               string;
  inspectionDecision?:     string;
  inspectionNotes?:        string;
}

interface IncomingRequest {
  id:                      string;
  movementCode:            string;
  status:                  string;
  originPremisesName:      string;
  originPremisesCode:      string;
  destinationPremisesCode: string;
  destinationPremisesName: string;
  movementTypeCode:        string;
  purpose:                 string;
  plannedDepartureDate:    string;
  plannedArrivalDate:      string;
  animalCount:             number;
  notes:                   string | null;
  createdAt:               string;
}

interface Movement {
  id: string; movementCode: string; status: string;
  originPremisesCode: string; destinationPremisesCode: string;
  purpose: string; animalCount: number; createdAt: string;
  type?: 'PREMISE' | 'HERD';
}
interface RequestStep { label: string; completedAt?: string; pending?: boolean; rejected?: boolean }

// ── Demo data (map only) ──────────────────────────────────────────────────────

const DEMO_PREMISES: Record<string, { name: string; lat: number; lng: number }> = {
  'PRM-MOG-001': { name: 'Mogadishu Central',  lat: 2.0469,  lng: 45.3182 },
  'PRM-KIS-001': { name: 'Kismayo Market',     lat: 0.3585,  lng: 42.5455 },
  'PRM-BAI-001': { name: 'Baidoa Collection',  lat: 3.1178,  lng: 43.6488 },
  'PRM-BEL-001': { name: 'Beledweyne Farm',    lat: 4.7355,  lng: 45.2008 },
  'PRM-GAL-001': { name: 'Galkayo Camel Hub',  lat: 6.7697,  lng: 47.4316 },
  'PRM-BOS-001': { name: 'Bosaso Export Port', lat: 11.2844, lng: 49.1836 },
  'PRM-HAR-001': { name: 'Hargeisa Sheep Mkt', lat: 9.5600,  lng: 44.0650 },
  'PRM-GAR-001': { name: 'Garowe Livestock',   lat: 8.4081,  lng: 48.4842 },
  'PRM-JOW-001': { name: 'Jowhar Goat Farm',   lat: 2.7862,  lng: 45.5021 },
  'PRM-MAR-001': { name: 'Marka Coastal',      lat: 1.7165,  lng: 44.7697 },
};

const DEMO_MOVEMENTS: Movement[] = [
  { id:'1', movementCode:'MV-2026-001234', status:'IN_TRANSIT',    originPremisesCode:'PRM-BAI-001', destinationPremisesCode:'PRM-MOG-001', purpose:'SALE',      animalCount:45,  createdAt:'2026-08-01T08:00:00Z', type:'PREMISE' },
  { id:'2', movementCode:'MV-2026-001235', status:'COMPLETED',     originPremisesCode:'PRM-KIS-001', destinationPremisesCode:'PRM-MOG-001', purpose:'SLAUGHTER', animalCount:120, createdAt:'2026-07-28T10:00:00Z', type:'PREMISE' },
  { id:'3', movementCode:'MV-2026-001236', status:'APPROVED',      originPremisesCode:'PRM-BEL-001', destinationPremisesCode:'PRM-GAL-001', purpose:'GRAZING',   animalCount:80,  createdAt:'2026-08-02T07:30:00Z', type:'HERD'    },
  { id:'4', movementCode:'MV-2026-001237', status:'IN_TRANSIT',    originPremisesCode:'PRM-GAL-001', destinationPremisesCode:'PRM-BOS-001', purpose:'EXPORT',    animalCount:200, createdAt:'2026-08-01T06:00:00Z', type:'PREMISE' },
  { id:'5', movementCode:'MV-2026-001238', status:'COMPLETED',     originPremisesCode:'PRM-JOW-001', destinationPremisesCode:'PRM-MAR-001', purpose:'SALE',      animalCount:30,  createdAt:'2026-07-25T12:00:00Z', type:'HERD'    },
  { id:'6', movementCode:'MV-2026-001239', status:'SUBMITTED',     originPremisesCode:'PRM-HAR-001', destinationPremisesCode:'PRM-GAR-001', purpose:'BREEDING',  animalCount:15,  createdAt:'2026-08-02T09:00:00Z', type:'HERD'    },
  { id:'7', movementCode:'MV-2026-001240', status:'REJECTED',      originPremisesCode:'PRM-MOG-001', destinationPremisesCode:'PRM-KIS-001', purpose:'SALE',      animalCount:60,  createdAt:'2026-07-30T14:00:00Z', type:'PREMISE' },
  { id:'8', movementCode:'MV-2026-001241', status:'IN_TRANSIT',    originPremisesCode:'PRM-GAR-001', destinationPremisesCode:'PRM-BOS-001', purpose:'EXPORT',    animalCount:350, createdAt:'2026-08-02T04:00:00Z', type:'PREMISE' },
  { id:'9', movementCode:'MV-2026-001242', status:'PERMIT_ISSUED', originPremisesCode:'PRM-BEL-001', destinationPremisesCode:'PRM-JOW-001', purpose:'SALE',      animalCount:25,  createdAt:'2026-08-02T11:00:00Z', type:'HERD'    },
];

// ── Config ────────────────────────────────────────────────────────────────────

const LINE_COLOR: Record<string, string> = {
  COMPLETED: '#16a34a', IN_TRANSIT: '#f59e0b', DEPARTURE_CONFIRMED: '#f59e0b',
  APPROVED: '#0b5ed7', PERMIT_ISSUED: '#6366f1', SUBMITTED: '#94a3b8',
  UNDER_REVIEW: '#7c3aed', REJECTED: '#dc2626', DRAFT: '#cbd5e1', CANCELLED: '#e2e8f0',
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  DRAFT:                 { label: 'Draft',               color: '#64748b', bg: '#f1f5f9', Icon: Clock        },
  SUBMITTED:             { label: 'Submitted',           color: '#2563eb', bg: '#eff6ff', Icon: Clock        },
  UNDER_REVIEW:          { label: 'Under Review',        color: '#7c3aed', bg: '#f5f3ff', Icon: Clock        },
  INSPECTION_ASSIGNED:   { label: 'Inspection Assigned', color: '#0891b2', bg: '#ecfeff', Icon: Clock        },
  INSPECTION_FAILED:     { label: 'Inspection Failed',   color: '#dc2626', bg: '#fef2f2', Icon: XCircle      },
  APPROVED:              { label: 'Approved',            color: '#059669', bg: '#ecfdf5', Icon: CheckCircle  },
  REJECTED:              { label: 'Rejected',            color: '#dc2626', bg: '#fef2f2', Icon: XCircle      },
  PERMIT_ISSUED:         { label: 'Permit Issued',       color: '#6366f1', bg: '#eef2ff', Icon: CheckCircle  },
  DEPARTURE_CONFIRMED:   { label: 'Departed',            color: '#d97706', bg: '#fffbeb', Icon: Truck        },
  IN_TRANSIT:            { label: 'In Transit',          color: '#d97706', bg: '#fffbeb', Icon: Truck        },
  ARRIVAL_CONFIRMED:     { label: 'Arrived',             color: '#9333ea', bg: '#fdf4ff', Icon: CheckCircle  },
  COMPLETED:             { label: 'Completed',           color: '#16a34a', bg: '#f0fdf4', Icon: CheckCircle  },
  CANCELLED:             { label: 'Cancelled',           color: '#94a3b8', bg: '#f8fafc', Icon: XCircle      },
};

const OUT_FILTERS = ['ALL', 'SUBMITTED', 'INSPECTION_ASSIGNED', 'UNDER_REVIEW', 'PERMIT_ISSUED', 'IN_TRANSIT', 'COMPLETED', 'REJECTED'];

const IN_FILTER_GROUPS: Array<{ key: string; label: string; statuses: string[] }> = [
  { key: 'ALL',               label: 'All',        statuses: [] },
  { key: 'AT_SENDER',         label: 'At Sender',  statuses: ['SUBMITTED', 'INSPECTION_ASSIGNED', 'UNDER_REVIEW', 'DESTINATION_CHECK', 'APPROVED', 'PERMIT_ISSUED'] },
  { key: 'IN_TRANSIT',        label: 'On the Way', statuses: ['DEPARTURE_CONFIRMED', 'IN_TRANSIT'] },
  { key: 'ARRIVAL_CONFIRMED', label: 'Confirm',    statuses: ['ARRIVAL_CONFIRMED'] },
  { key: 'COMPLETED',         label: 'Received',   statuses: ['COMPLETED'] },
];

// ── Timeline step generator ───────────────────────────────────────────────────

const ORDERED_STEPS = ['SUBMITTED', 'INSPECTION_ASSIGNED', 'UNDER_REVIEW', 'PERMIT_ISSUED', 'IN_TRANSIT', 'COMPLETED'];
const STEP_DISPLAY  = ['Submitted', 'Inspection',          'Reviewed',    'Permit Issued', 'In Transit', 'Completed'];

function stepsFromStatus(status: string): RequestStep[] {
  if (status === 'REJECTED') {
    return [
      { label: 'Submitted',    completedAt: 'done' },
      { label: 'Under Review', completedAt: 'done' },
      { label: 'Rejected',     completedAt: 'done', rejected: true },
    ];
  }
  if (status === 'INSPECTION_FAILED') {
    return [
      { label: 'Submitted',           completedAt: 'done' },
      { label: 'Inspection Assigned', completedAt: 'done' },
      { label: 'Inspection Failed',   completedAt: 'done', rejected: true },
    ];
  }
  if (status === 'CANCELLED') {
    return [
      { label: 'Submitted',  completedAt: 'done' },
      { label: 'Cancelled',  completedAt: 'done', rejected: true },
    ];
  }
  const idx = Math.max(0, ORDERED_STEPS.indexOf(status));
  return STEP_DISPLAY.map((label, i) => ({
    label,
    completedAt: i <= idx ? 'done' : undefined,
    pending:     i >  idx,
  }));
}

function bearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dL = (lng2 - lng1) * Math.PI / 180;
  const y = Math.sin(dL) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180)
    - Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dL);
  return Math.atan2(y, x) * 180 / Math.PI;
}

// ── Incoming panel ────────────────────────────────────────────────────────────

function IncomingPanel({ requests, loading }: { requests: IncomingRequest[]; loading: boolean }) {
  const [filter,    setFilter]    = useState('ALL');
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());

  const matchesFilter = (r: IncomingRequest) => {
    if (filter === 'ALL') return true;
    const group = IN_FILTER_GROUPS.find(g => g.key === filter);
    return group ? group.statuses.includes(r.status) : false;
  };

  const visible        = requests.filter(matchesFilter);
  const toConfirm      = requests.filter(r => r.status === 'ARRIVAL_CONFIRMED' && !confirmed.has(r.id)).length;

  return (
    <div className={s.requestsPanel}>
      {toConfirm > 0 && (
        <div className={s.incomingAlert}>
          <AlertCircle size={14} />
          {toConfirm} shipment{toConfirm > 1 ? 's' : ''} arrived — confirm receipt to update your herd
        </div>
      )}

      {/* Filter chips */}
      <div className={s.reqFilterBar}>
        {IN_FILTER_GROUPS.map(g => {
          const count = g.key === 'ALL'
            ? requests.length
            : requests.filter(r => g.statuses.includes(r.status)).length;
          return (
            <button
              key={g.key}
              className={`${s.reqFilterBtn}${filter === g.key ? ' ' + s.reqFilterBtnActive : ''}`}
              onClick={() => setFilter(g.key)}
            >
              {g.label}
              {count > 0 && <span className={s.reqFilterCount}>{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Cards */}
      <div className={s.reqList}>
        {loading && requests.length === 0 ? (
          <>
            <div className={s.skeletonRow} />
            <div className={s.skeletonRow} />
            <div className={s.skeletonRow} />
          </>
        ) : visible.length === 0 ? (
          <div className={s.empty} style={{ boxShadow: 'none', padding: '2.5rem 1rem' }}>
            <p className={s.emptyTitle}>No incoming movements</p>
            <p className={s.emptySub}>
              {requests.length === 0
                ? 'No other farmers have sent a movement request to your premises.'
                : `No requests with status "${IN_FILTER_GROUPS.find(g => g.key === filter)?.label ?? filter}".`}
            </p>
          </div>
        ) : (
          visible.map(mv => {
            const st          = STATUS_CFG[mv.status] ?? STATUS_CFG.SUBMITTED;
            const isConfirmed = confirmed.has(mv.id);
            const statusLabel = isConfirmed ? 'Received' : st.label;
            const statusColor = isConfirmed ? STATUS_CFG.COMPLETED.color : st.color;
            const statusBg    = isConfirmed ? STATUS_CFG.COMPLETED.bg    : st.bg;

            return (
              <div key={mv.id} className={s.incomingCard}>
                {/* Top row */}
                <div className={s.incomingCardTop}>
                  <div className={s.incomingCardLeft}>
                    <span className={s.code}>{mv.movementCode}</span>
                    <span className={s.badge} style={{ background: statusBg, color: statusColor }}>
                      {['IN_TRANSIT', 'DEPARTURE_CONFIRMED'].includes(mv.status) ? <Truck size={10}/> : isConfirmed || mv.status === 'COMPLETED' ? <CheckCircle size={10}/> : <Clock size={10}/>}
                      {statusLabel}
                    </span>
                  </div>
                  <div className={s.incomingAnimalBadge}>
                    {mv.animalCount} animals
                  </div>
                </div>

                {/* Route */}
                <div className={s.incomingRoute}>
                  <MapPin size={11} style={{ color: '#94a3b8', flexShrink: 0 }}/>
                  <span className={s.incomingFrom}>{mv.originPremisesName}</span>
                  <span className={s.incomingFarmId}>({mv.originPremisesCode})</span>
                  <ChevronRight size={11} style={{ color: '#94a3b8', flexShrink: 0 }}/>
                  <span className={s.incomingTo}>{mv.destinationPremisesName || mv.destinationPremisesCode}</span>
                </div>

                {/* Meta */}
                <div className={s.incomingMeta}>
                  <span>{mv.movementTypeCode} · {mv.purpose}</span>
                  <span>
                    {['IN_TRANSIT', 'DEPARTURE_CONFIRMED'].includes(mv.status) ? '🚛 ETA' : isConfirmed || mv.status === 'COMPLETED' ? '✓ Received' : 'Expected'}
                    {' '}{mv.plannedArrivalDate}
                  </span>
                  <span>Departs {mv.plannedDepartureDate}</span>
                </div>

                {mv.notes && <div className={s.incomingNote}>{mv.notes}</div>}

                {/* Status context */}
                {mv.status === 'SUBMITTED' && (
                  <div className={s.incomingStatusBox} style={{ background: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8' }}>
                    Movement request submitted — awaiting ministry review.
                  </div>
                )}
                {mv.status === 'INSPECTION_ASSIGNED' && (
                  <div className={s.incomingStatusBox} style={{ background: '#ecfeff', borderColor: '#a5f3fc', color: '#0e7490' }}>
                    Health inspection in progress at the origin premises. Animals are still with the sender.
                  </div>
                )}
                {mv.status === 'UNDER_REVIEW' && (
                  <div className={s.incomingStatusBox} style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#15803d' }}>
                    Health inspection passed — movement is under ministry review before permit is issued.
                  </div>
                )}
                {mv.status === 'DESTINATION_CHECK' && (
                  <div className={s.incomingStatusBox} style={{ background: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8' }}>
                    Ministry is conducting a destination check. Permit will be issued once complete.
                  </div>
                )}
                {mv.status === 'APPROVED' && (
                  <div className={s.incomingStatusBox} style={{ background: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8' }}>
                    Animals are still at the origin premises. The movement is authorized and awaiting departure.
                  </div>
                )}
                {mv.status === 'PERMIT_ISSUED' && (
                  <div className={s.incomingStatusBox} style={{ background: '#eef2ff', borderColor: '#c7d2fe', color: '#4338ca' }}>
                    Permit issued. Animals are expected to depart soon.
                  </div>
                )}
                {mv.status === 'DEPARTURE_CONFIRMED' && (
                  <div className={s.incomingStatusBox} style={{ background: '#fffbeb', borderColor: '#fde68a', color: '#92400e' }}>
                    Animals have departed from the origin premises and are on their way to you.
                  </div>
                )}
                {mv.status === 'INSPECTION_FAILED' && (
                  <div className={s.incomingStatusBox} style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b' }}>
                    Health inspection failed — this movement cannot proceed. Contact the sender for details.
                  </div>
                )}

                {/* Confirm arrival */}
                {mv.status === 'ARRIVAL_CONFIRMED' && !isConfirmed && (
                  <div className={s.incomingConfirmRow}>
                    <div className={s.incomingConfirmHint}>
                      The sender has confirmed these animals are on your premises. Please verify and confirm receipt.
                    </div>
                    <button
                      className={s.confirmBtn}
                      onClick={() => setConfirmed(prev => new Set([...prev, mv.id]))}
                    >
                      <CheckCircle2 size={13}/> Confirm Receipt — {mv.animalCount} animals
                    </button>
                  </div>
                )}
                {isConfirmed && (
                  <div className={s.incomingReceived}>
                    <CheckCircle2 size={13}/> Receipt confirmed. Animals added to your premises.
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Map ───────────────────────────────────────────────────────────────────────

function MovementMapView({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string | null) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);
  const linesRef     = useRef<Map<string, L.Polyline>>(new Map());
  const truckRefs    = useRef<Map<string, L.Marker>>(new Map());
  const progressRef  = useRef<Map<string, number>>(new Map());
  const animRef      = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center: [5.5, 46.5], zoom: 6, attributionControl: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(map);
    const layers = L.layerGroup().addTo(map);

    DEMO_MOVEMENTS.forEach(mv => {
      const org = DEMO_PREMISES[mv.originPremisesCode];
      const dst = DEMO_PREMISES[mv.destinationPremisesCode];
      if (!org || !dst) return;
      const color     = LINE_COLOR[mv.status] ?? '#94a3b8';
      const isTransit = mv.status === 'IN_TRANSIT' || mv.status === 'DEPARTURE_CONFIRMED';
      const isDone    = mv.status === 'COMPLETED';
      const line = L.polyline([[org.lat, org.lng], [dst.lat, dst.lng]], {
        color, weight: isTransit ? 4 : 2.5, opacity: mv.status === 'REJECTED' ? 0.35 : 0.8,
        dashArray: isDone ? undefined : isTransit ? '8 5' : '4 6',
      }).addTo(layers);
      line.on('click', () => onSelect(mv.id));
      linesRef.current.set(mv.id, line);
      const angle = bearing(org.lat, org.lng, dst.lat, dst.lng);
      L.marker([(org.lat + dst.lat) / 2, (org.lng + dst.lng) / 2], {
        interactive: false,
        icon: L.divIcon({ className: '', html: `<div style="transform:rotate(${angle}deg);color:${color};font-size:14px;line-height:1;">▶</div>`, iconSize: [14, 14], iconAnchor: [7, 7] }),
      }).addTo(layers);
      if (isTransit) {
        const truck = L.marker([org.lat, org.lng], {
          interactive: false, zIndexOffset: 1000,
          icon: L.divIcon({ className: '', html: `<div style="font-size:20px;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.35));">🚛</div>`, iconSize: [22, 22], iconAnchor: [11, 11] }),
        }).addTo(layers);
        truckRefs.current.set(mv.id, truck);
        progressRef.current.set(mv.id, Math.random());
      }
    });

    const used = new Set(DEMO_MOVEMENTS.flatMap(m => [m.originPremisesCode, m.destinationPremisesCode]));
    used.forEach(code => {
      const p = DEMO_PREMISES[code];
      if (!p) return;
      L.marker([p.lat, p.lng], {
        icon: L.divIcon({ className: '', html: `<div style="width:12px;height:12px;border-radius:50%;background:#0b5ed7;border:3px solid #fff;box-shadow:0 0 0 2px #93c5fd,0 2px 8px rgba(11,94,215,0.4);"></div>`, iconSize: [12, 12], iconAnchor: [6, 6] }),
      }).bindTooltip(p.name, { permanent: false, direction: 'top', offset: [0, -10] }).addTo(layers);
    });

    mapRef.current = map;
    let last = 0;
    const tick = (t: number) => {
      if (t - last > 16) {
        last = t;
        DEMO_MOVEMENTS.forEach(mv => {
          if (mv.status !== 'IN_TRANSIT' && mv.status !== 'DEPARTURE_CONFIRMED') return;
          const truck = truckRefs.current.get(mv.id);
          const org   = DEMO_PREMISES[mv.originPremisesCode];
          const dst   = DEMO_PREMISES[mv.destinationPremisesCode];
          if (!truck || !org || !dst) return;
          let p = (progressRef.current.get(mv.id) ?? 0) + 0.0006;
          if (p > 1) p = 0;
          progressRef.current.set(mv.id, p);
          truck.setLatLng([org.lat + (dst.lat - org.lat) * p, org.lng + (dst.lng - org.lng) * p]);
        });
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animRef.current);
      map.remove();
      mapRef.current = null;
      linesRef.current.clear();
      truckRefs.current.clear();
      progressRef.current.clear();
    };
  }, []);

  useEffect(() => {
    linesRef.current.forEach((line, id) => {
      const mv = DEMO_MOVEMENTS.find(m => m.id === id);
      if (!mv) return;
      if (id === selectedId) {
        line.setStyle({ color: '#f97316', weight: 6, opacity: 1, dashArray: undefined });
        line.bringToFront();
      } else {
        const color     = LINE_COLOR[mv.status] ?? '#94a3b8';
        const isTransit = mv.status === 'IN_TRANSIT' || mv.status === 'DEPARTURE_CONFIRMED';
        line.setStyle({ color, weight: isTransit ? 4 : 2.5, opacity: mv.status === 'REJECTED' ? 0.35 : 0.8, dashArray: mv.status === 'COMPLETED' ? undefined : isTransit ? '8 5' : '4 6' });
      }
    });
  }, [selectedId]);

  return <div ref={containerRef} className={s.mapContainer} />;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function MovementsPage(): JSX.Element {
  const [view,            setView]            = useState<'outgoing' | 'incoming'>('outgoing');
  const [outLoading,      setOutLoading]      = useState(false);
  const [inLoading,       setInLoading]       = useState(false);
  const [outFilter,       setOutFilter]       = useState('ALL');
  const [expanded,        setExpanded]        = useState<string | null>(null);
  const [selectedId,      setSelectedId]      = useState<string | null>(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [myRequests,      setMyRequests]      = useState<MyMovementRequest[]>([]);
  const [inRequests,      setInRequests]      = useState<IncomingRequest[]>([]);

  const userId = useAuthStore(st => st.userId);

  // ── Load outgoing ──────────────────────────────────────────────────────────
  const loadOutgoing = useCallback(async () => {
    if (!userId) return;
    setOutLoading(true);
    const { data } = await supabase
      .from('farmer_movement_requests')
      .select('id, movement_code, status, origin_premises_name, origin_premises_code, destination_premises_code, destination_premises_name, movement_type_code, purpose, planned_departure_date, planned_arrival_date, vehicle_registration, animal_count, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setOutLoading(false);
    if (data) {
      const mapped: MyMovementRequest[] = data.map((r: any) => ({
        id:                      r.id,
        movementCode:            r.movement_code,
        status:                  r.status,
        originPremisesName:      r.origin_premises_name,
        originPremisesCode:      r.origin_premises_code,
        destinationPremisesCode: r.destination_premises_code,
        destinationPremisesName: r.destination_premises_name ?? r.destination_premises_code,
        movementTypeCode:        r.movement_type_code,
        purpose:                 r.purpose,
        plannedDepartureDate:    r.planned_departure_date,
        plannedArrivalDate:      r.planned_arrival_date,
        vehicleRegistration:     r.vehicle_registration,
        animalCount:             r.animal_count ?? 0,
        createdAt:               r.created_at,
      }));

      // Attach inspection results for relevant statuses
      const codesNeedingInspection = mapped
        .filter(r => ['INSPECTION_ASSIGNED', 'INSPECTION_FAILED', 'UNDER_REVIEW'].includes(r.status))
        .map(r => r.movementCode);

      if (codesNeedingInspection.length > 0) {
        const { data: inspData } = await supabase
          .from('movement_inspections')
          .select('movement_code, overall_decision, overall_notes')
          .in('movement_code', codesNeedingInspection)
          .not('submitted_at', 'is', null)
          .order('submitted_at', { ascending: false });

        const inspMap: Record<string, { decision: string; notes: string }> = {};
        (inspData ?? []).forEach((ins: any) => {
          if (!inspMap[ins.movement_code]) {
            inspMap[ins.movement_code] = { decision: ins.overall_decision ?? '', notes: ins.overall_notes ?? '' };
          }
        });

        setMyRequests(mapped.map(r => ({
          ...r,
          inspectionDecision: inspMap[r.movementCode]?.decision,
          inspectionNotes:    inspMap[r.movementCode]?.notes,
        })));
      } else {
        setMyRequests(mapped);
      }
    }
  }, [userId]);

  // ── Load incoming ──────────────────────────────────────────────────────────
  const loadIncoming = useCallback(async () => {
    if (!userId) return;
    setInLoading(true);

    // Step 1: get this farmer's premises codes
    const { data: premData } = await supabase
      .from('farmer_premises')
      .select('premises_code')
      .eq('user_id', userId);

    const myCodes = (premData ?? []).map((p: any) => p.premises_code as string);

    if (myCodes.length === 0) {
      setInLoading(false);
      setInRequests([]);
      return;
    }

    // Step 2: find movements from OTHER farmers destined to my premises
    const { data } = await supabase
      .from('farmer_movement_requests')
      .select('id, movement_code, status, origin_premises_name, origin_premises_code, destination_premises_code, destination_premises_name, movement_type_code, purpose, planned_departure_date, planned_arrival_date, animal_count, notes, created_at')
      .in('destination_premises_code', myCodes)
      .neq('user_id', userId)
      .order('created_at', { ascending: false });

    setInLoading(false);
    if (data) {
      setInRequests(data.map((r: any) => ({
        id:                      r.id,
        movementCode:            r.movement_code,
        status:                  r.status,
        originPremisesName:      r.origin_premises_name,
        originPremisesCode:      r.origin_premises_code,
        destinationPremisesCode: r.destination_premises_code,
        destinationPremisesName: r.destination_premises_name ?? r.destination_premises_code,
        movementTypeCode:        r.movement_type_code,
        purpose:                 r.purpose,
        plannedDepartureDate:    r.planned_departure_date,
        plannedArrivalDate:      r.planned_arrival_date,
        animalCount:             r.animal_count ?? 0,
        notes:                   r.notes ?? null,
        createdAt:               r.created_at,
      })));
    }
  }, [userId]);

  const refreshAll = useCallback(() => {
    loadOutgoing();
    loadIncoming();
  }, [loadOutgoing, loadIncoming]);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const filteredOut = outFilter === 'ALL'
    ? myRequests
    : myRequests.filter(r => r.status === outFilter);

  const selectedMv = selectedId ? DEMO_MOVEMENTS.find(m => m.id === selectedId) ?? null : null;

  // Outgoing stats
  const outTotal     = myRequests.length;
  const outInTransit = myRequests.filter(r => r.status === 'IN_TRANSIT').length;
  const outPending   = myRequests.filter(r => ['SUBMITTED', 'UNDER_REVIEW'].includes(r.status)).length;
  const outCompleted = myRequests.filter(r => r.status === 'COMPLETED').length;

  // Incoming stats
  const inActive     = inRequests.filter(r => !['COMPLETED', 'REJECTED', 'CANCELLED', 'INSPECTION_FAILED'].includes(r.status)).length;
  const inAtSender   = inRequests.filter(r => ['SUBMITTED', 'INSPECTION_ASSIGNED', 'UNDER_REVIEW', 'DESTINATION_CHECK', 'APPROVED', 'PERMIT_ISSUED'].includes(r.status)).length;
  const inTransit    = inRequests.filter(r => ['DEPARTURE_CONFIRMED', 'IN_TRANSIT'].includes(r.status)).length;
  const inAnimals    = inRequests.filter(r => ['APPROVED', 'PERMIT_ISSUED', 'DEPARTURE_CONFIRMED', 'IN_TRANSIT'].includes(r.status)).reduce((a, r) => a + r.animalCount, 0);
  const inToConfirm  = inRequests.filter(r => r.status === 'ARRIVAL_CONFIRMED').length;

  return (
    <div className={s.page}>

      {/* Header */}
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Animal Movements</h1>
          <p className={s.sub}>Track permits, routes and transit status for your livestock</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          <button className={s.requestBtn} onClick={() => setShowRequestForm(true)}>
            <Plus size={14} strokeWidth={2.5} /> Request Movement
          </button>
          <button className={s.refreshBtn} onClick={refreshAll} disabled={outLoading || inLoading}>
            <RefreshCw size={15} className={(outLoading || inLoading) ? s.spin : undefined} />
          </button>
        </div>
      </div>

      {/* View toggle */}
      <div className={s.viewToggleRow}>
        <div className={s.viewToggle}>
          <button
            className={`${s.viewBtn}${view === 'outgoing' ? ' ' + s.viewBtnActive : ''}`}
            onClick={() => setView('outgoing')}
          >
            <ArrowUpFromLine size={14}/> Outgoing
          </button>
          <button
            className={`${s.viewBtn}${view === 'incoming' ? ' ' + s.viewBtnActive : ''}`}
            onClick={() => setView('incoming')}
          >
            <ArrowDownToLine size={14}/> Incoming
            {inToConfirm > 0 && <span className={s.incomingAlertDot}>{inToConfirm}</span>}
          </button>
        </div>
        {view === 'incoming' && inActive > 0 && (
          <div className={s.incomingTagline}>
            <Truck size={12}/> {inTransit} on the way · {inAtSender} at sender · {inAnimals} animals expected
          </div>
        )}
      </div>

      {/* Stats */}
      {view === 'outgoing' ? (
        <div className={s.stats}>
          <div className={s.stat}>
            <div className={s.statIcon}><Truck size={20}/></div>
            <div className={s.statNum}>{outTotal}</div>
            <div className={s.statLabel}>Total Movements</div>
          </div>
          <div className={s.stat}>
            <div className={s.statIcon}><Truck size={20}/></div>
            <div className={s.statNum}>{outInTransit}</div>
            <div className={s.statLabel}>In Transit</div>
          </div>
          <div className={s.stat}>
            <div className={s.statIcon}><Clock size={20}/></div>
            <div className={s.statNum}>{outPending}</div>
            <div className={s.statLabel}>Awaiting Approval</div>
          </div>
          <div className={s.stat}>
            <div className={s.statIcon}><CheckCircle size={20}/></div>
            <div className={s.statNum}>{outCompleted}</div>
            <div className={s.statLabel}>Completed</div>
          </div>
        </div>
      ) : (
        <div className={s.stats}>
          <div className={s.stat}>
            <div className={s.statIcon}><ArrowDownToLine size={20}/></div>
            <div className={s.statNum}>{inActive}</div>
            <div className={s.statLabel}>Active Incoming</div>
          </div>
          <div className={s.stat}>
            <div className={s.statIcon}><Clock size={20}/></div>
            <div className={s.statNum}>{inAtSender}</div>
            <div className={s.statLabel}>At Sender</div>
          </div>
          <div className={s.stat}>
            <div className={s.statIcon}><Truck size={20}/></div>
            <div className={s.statNum}>{inTransit}</div>
            <div className={s.statLabel}>On the Way</div>
          </div>
          <div className={s.stat}>
            <div className={s.statIcon}><CheckCircle size={20}/></div>
            <div className={s.statNum}>{inAnimals}</div>
            <div className={s.statLabel}>Animals Expected</div>
          </div>
        </div>
      )}

      {/* 50/50 split */}
      <div className={s.splitLayout}>

        {/* Left — map */}
        <div className={s.mapWrapper}>
          <MovementMapView selectedId={selectedId} onSelect={setSelectedId} />

          {selectedMv && (() => {
            const cfg = STATUS_CFG[selectedMv.status] ?? STATUS_CFG.DRAFT;
            const org = DEMO_PREMISES[selectedMv.originPremisesCode];
            const dst = DEMO_PREMISES[selectedMv.destinationPremisesCode];
            return (
              <div className={s.mapDetail}>
                <div className={s.mapDetailTop}>
                  <span className={s.mapDetailCode}>{selectedMv.movementCode}</span>
                  <button className={s.mapDetailClose} onClick={() => setSelectedId(null)}>✕</button>
                </div>
                <span className={s.badge} style={{ color: cfg.color, background: cfg.bg, marginBottom: 8, display: 'inline-flex' }}>
                  <cfg.Icon size={11}/> {cfg.label}
                </span>
                <div className={s.mapDetailRow}><span className={s.mapDetailLabel}>From</span><span className={s.mapDetailVal}>{org?.name ?? selectedMv.originPremisesCode}</span></div>
                <div className={s.mapDetailRow}><span className={s.mapDetailLabel}>To</span><span className={s.mapDetailVal}>{dst?.name ?? selectedMv.destinationPremisesCode}</span></div>
                <div className={s.mapDetailRow}><span className={s.mapDetailLabel}>Animals</span><span className={s.mapDetailVal}>{selectedMv.animalCount}</span></div>
                <div className={s.mapDetailRow}><span className={s.mapDetailLabel}>Purpose</span><span className={s.mapDetailVal}>{selectedMv.purpose}</span></div>
              </div>
            );
          })()}

          <div className={s.mapLegend}>
            <div className={s.mapLegendTitle}>Legend</div>
            {[
              { color: '#f59e0b', dash: '8 5',    label: 'In Transit 🚛' },
              { color: '#16a34a', dash: undefined, label: 'Completed'     },
              { color: '#0b5ed7', dash: '4 6',    label: 'Approved'      },
              { color: '#6366f1', dash: '4 6',    label: 'Permit Issued' },
              { color: '#94a3b8', dash: '4 6',    label: 'Submitted'     },
              { color: '#dc2626', dash: '4 6',    label: 'Rejected'      },
            ].map(item => (
              <div key={item.label} className={s.mapLegendRow}>
                <svg width="28" height="6" style={{ flexShrink: 0 }}>
                  <line x1="0" y1="3" x2="28" y2="3" stroke={item.color} strokeWidth="2.5" strokeDasharray={item.dash} />
                </svg>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        {view === 'incoming' ? (
          <IncomingPanel requests={inRequests} loading={inLoading} />
        ) : (
          <div className={s.requestsPanel}>

            {/* Filter chips */}
            <div className={s.reqFilterBar}>
              {OUT_FILTERS.map(f => {
                const count = f === 'ALL'
                  ? myRequests.length
                  : myRequests.filter(r => r.status === f).length;
                return (
                  <button
                    key={f}
                    className={`${s.reqFilterBtn}${outFilter === f ? ' ' + s.reqFilterBtnActive : ''}`}
                    onClick={() => setOutFilter(f)}
                  >
                    {f === 'ALL' ? 'All' : (STATUS_CFG[f]?.label ?? f)}
                    {count > 0 && <span className={s.reqFilterCount}>{count}</span>}
                  </button>
                );
              })}
            </div>

            {/* Outgoing request cards */}
            <div className={s.reqList}>
              {outLoading && myRequests.length === 0 ? (
                <>
                  <div className={s.skeletonRow} />
                  <div className={s.skeletonRow} />
                  <div className={s.skeletonRow} />
                </>
              ) : filteredOut.length === 0 ? (
                <div className={s.empty} style={{ boxShadow: 'none', padding: '2.5rem 1rem' }}>
                  <p className={s.emptyTitle}>No movement requests</p>
                  <p className={s.emptySub}>
                    {outFilter === 'ALL'
                      ? 'Click "+ Request Movement" to submit your first request.'
                      : `No requests with status "${STATUS_CFG[outFilter]?.label ?? outFilter}".`}
                  </p>
                </div>
              ) : (
                filteredOut.map(r => {
                  const st     = STATUS_CFG[r.status] ?? STATUS_CFG.SUBMITTED;
                  const steps  = stepsFromStatus(r.status);
                  const isOpen = expanded === r.id;
                  const done   = steps.filter(step => !!step.completedAt).length;

                  return (
                    <div key={r.id} className={`${s.reqCard}${isOpen ? ' ' + s.reqCardOpen : ''}`}>
                      <div className={s.reqCardHead} onClick={() => setExpanded(isOpen ? null : r.id)}>
                        <div className={s.reqCardLeft}>
                          <div className={s.reqTopRow}>
                            <span className={s.code}>{r.movementCode}</span>
                            <span className={s.badge} style={{ color: st.color, background: st.bg }}>
                              <st.Icon size={10}/> {st.label}
                            </span>
                          </div>
                          <div className={s.reqRoute}>
                            <MapPin size={11} color="#94a3b8"/>
                            <span className={s.mapMvOrg}>{r.originPremisesName}</span>
                            <ChevronRight size={11} color="#94a3b8"/>
                            <span className={s.mapMvDst}>{r.destinationPremisesName || r.destinationPremisesCode}</span>
                          </div>
                          <div className={s.reqMeta}>
                            {r.movementTypeCode} · {r.purpose} · {r.animalCount} animals · {new Date(r.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                          </div>
                        </div>
                        <div className={s.reqProgress}>
                          <div className={s.reqProgressBar}>
                            <div
                              className={s.reqProgressFill}
                              style={{ width: `${(done / steps.length) * 100}%`, background: r.status === 'REJECTED' ? '#dc2626' : st.color }}
                            />
                          </div>
                          <span className={s.reqProgressLabel}>{done}/{steps.length}</span>
                        </div>
                        {isOpen ? <ChevronUp size={14} color="#94a3b8"/> : <ChevronDown size={14} color="#94a3b8"/>}
                      </div>

                      {isOpen && (
                        <div className={s.reqCardBody}>
                          <div className={s.timeline}>
                            {steps.map((step, i) => {
                              const isDone     = !!step.completedAt;
                              const isRejected = !!step.rejected;
                              return (
                                <div key={i} className={s.timelineStep}>
                                  {i < steps.length - 1 && (
                                    <div className={`${s.connector}${isDone && !isRejected ? ' ' + s.connectorDone : ''}`} />
                                  )}
                                  <div className={`${s.node} ${isRejected ? s.nodeRejected : isDone ? s.nodeDone : s.nodePending}`}>
                                    {isRejected ? <XCircle size={12}/> : isDone ? <CheckCircle size={12}/> : <Clock size={12}/>}
                                  </div>
                                  <div className={s.stepInfo}>
                                    <span className={`${s.stepLabel} ${isRejected ? s.stepLabelRejected : isDone ? s.stepLabelDone : s.stepLabelPending}`}>
                                      {step.label}
                                    </span>
                                    {step.pending && !isDone && <span className={s.stepWaiting}>Waiting…</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {r.inspectionDecision && (
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', background: r.inspectionDecision === 'FAIL' || r.inspectionDecision === 'DISEASE_SUSPECTED' ? '#fef2f2' : '#f0fdf4', border: `1px solid ${r.inspectionDecision === 'FAIL' || r.inspectionDecision === 'DISEASE_SUSPECTED' ? '#fecaca' : '#bbf7d0'}`, borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: '0.78rem' }}>
                              {r.inspectionDecision === 'FAIL' || r.inspectionDecision === 'DISEASE_SUSPECTED'
                                ? <XCircle size={13} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
                                : <CheckCircle size={13} color="#16a34a" style={{ flexShrink: 0, marginTop: 1 }} />}
                              <div>
                                <span style={{ fontWeight: 700, color: r.inspectionDecision === 'FAIL' || r.inspectionDecision === 'DISEASE_SUSPECTED' ? '#dc2626' : '#15803d' }}>
                                  Inspection: {r.inspectionDecision.replace(/_/g, ' ')}
                                </span>
                                {r.inspectionNotes && <div style={{ color: '#64748b', marginTop: 2 }}>{r.inspectionNotes}</div>}
                              </div>
                            </div>
                          )}
                          <div className={s.reqNote} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569' }}>
                            <Truck size={12} color="#64748b"/>
                            Plate: {r.vehicleRegistration} · Departs {r.plannedDepartureDate} · Arrives {r.plannedArrivalDate}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

      </div>

      {showRequestForm && (
        <MovementRequestModal
          onClose={() => setShowRequestForm(false)}
          onSuccess={() => {
            setShowRequestForm(false);
            loadOutgoing();
          }}
        />
      )}
    </div>
  );
}

export default MovementsPage;
