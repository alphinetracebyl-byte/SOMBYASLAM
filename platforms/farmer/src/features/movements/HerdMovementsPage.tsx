import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, ChevronRight, ChevronDown, ChevronUp, CheckCircle, Clock, XCircle, Truck } from 'lucide-react';
import s from './herd-movements.module.css';

// ── Premises ──────────────────────────────────────────────────────────────────

const PREMISES: Record<string, { name: string; lat: number; lng: number }> = {
  'PRM-BAI-001': { name: 'Baidoa Collection',  lat: 3.1178,  lng: 43.6488 },
  'PRM-MOG-001': { name: 'Mogadishu Central',  lat: 2.0469,  lng: 45.3182 },
  'PRM-KIS-001': { name: 'Kismayo Market',     lat: 0.3585,  lng: 42.5455 },
  'PRM-GAL-001': { name: 'Galkayo Camel Hub',  lat: 6.7697,  lng: 47.4316 },
  'PRM-BOS-001': { name: 'Bosaso Export Port', lat: 11.2844, lng: 49.1836 },
  'PRM-GAR-001': { name: 'Garowe Livestock',   lat: 8.4081,  lng: 48.4842 },
  'PRM-BEL-001': { name: 'Beledweyne Farm',    lat: 4.7355,  lng: 45.2008 },
  'PRM-JOW-001': { name: 'Jowhar Goat Farm',   lat: 2.7862,  lng: 45.5021 },
  'PRM-MAR-001': { name: 'Marka Holding',      lat: 1.7151,  lng: 44.7691 },
  'PRM-AFG-001': { name: 'Afgooye Farm',       lat: 2.1493,  lng: 45.1212 },
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface Step {
  label: string;
  completedAt?: string;
  pending?: boolean;
  rejected?: boolean;
}

interface HerdRequest {
  id: string;
  code: string;
  from: string;
  to: string;
  animalCount: number;
  species: string;
  purpose: string;
  status: string;
  submittedAt: string;
  steps: Step[];
}

// ── Data ──────────────────────────────────────────────────────────────────────

const REQUESTS: HerdRequest[] = [
  {
    id: 'h1', code: 'HR-2026-00081',
    from: 'PRM-BAI-001', to: 'PRM-MOG-001',
    animalCount: 320, species: 'Cattle', purpose: 'EXPORT', status: 'IN_TRANSIT',
    submittedAt: '2026-07-28',
    steps: [
      { label: 'Submitted',        completedAt: '28 Jul 09:10' },
      { label: 'Vet Inspection',   completedAt: '29 Jul 11:45' },
      { label: 'Permit Issued',    completedAt: '30 Jul 14:20' },
      { label: 'In Transit',       completedAt: '01 Aug 07:00' },
      { label: 'Arrival Confirmed', pending: true },
    ],
  },
  {
    id: 'h2', code: 'HR-2026-00085',
    from: 'PRM-GAL-001', to: 'PRM-BOS-001',
    animalCount: 580, species: 'Camel', purpose: 'EXPORT', status: 'PERMIT_ISSUED',
    submittedAt: '2026-07-30',
    steps: [
      { label: 'Submitted',        completedAt: '30 Jul 08:30' },
      { label: 'Vet Inspection',   completedAt: '31 Jul 14:00' },
      { label: 'Permit Issued',    completedAt: '01 Aug 10:15' },
      { label: 'In Transit',       pending: true },
      { label: 'Arrival Confirmed', pending: true },
    ],
  },
  {
    id: 'h3', code: 'HR-2026-00089',
    from: 'PRM-KIS-001', to: 'PRM-MOG-001',
    animalCount: 95, species: 'Goat', purpose: 'SLAUGHTER', status: 'COMPLETED',
    submittedAt: '2026-07-20',
    steps: [
      { label: 'Submitted',        completedAt: '20 Jul 10:00' },
      { label: 'Vet Inspection',   completedAt: '21 Jul 09:30' },
      { label: 'Permit Issued',    completedAt: '22 Jul 16:00' },
      { label: 'In Transit',       completedAt: '23 Jul 06:45' },
      { label: 'Arrival Confirmed', completedAt: '23 Jul 18:20' },
    ],
  },
  {
    id: 'h4', code: 'HR-2026-00091',
    from: 'PRM-MOG-001', to: 'PRM-MAR-001',
    animalCount: 42, species: 'Sheep', purpose: 'SALE', status: 'SUBMITTED',
    submittedAt: '2026-08-01',
    steps: [
      { label: 'Submitted',        completedAt: '01 Aug 13:05' },
      { label: 'Vet Inspection',   pending: true },
      { label: 'Permit Issued',    pending: true },
      { label: 'In Transit',       pending: true },
      { label: 'Arrival Confirmed', pending: true },
    ],
  },
  {
    id: 'h5', code: 'HR-2026-00093',
    from: 'PRM-BEL-001', to: 'PRM-AFG-001',
    animalCount: 110, species: 'Cattle', purpose: 'SALE', status: 'REJECTED',
    submittedAt: '2026-07-25',
    steps: [
      { label: 'Submitted',        completedAt: '25 Jul 09:00' },
      { label: 'Vet Inspection',   rejected: true },
      { label: 'Permit Issued',    pending: true },
      { label: 'In Transit',       pending: true },
      { label: 'Arrival Confirmed', pending: true },
    ],
  },
  {
    id: 'h6', code: 'HR-2026-00096',
    from: 'PRM-GAR-001', to: 'PRM-BOS-001',
    animalCount: 440, species: 'Camel', purpose: 'EXPORT', status: 'IN_TRANSIT',
    submittedAt: '2026-08-01',
    steps: [
      { label: 'Submitted',        completedAt: '01 Aug 07:20' },
      { label: 'Vet Inspection',   completedAt: '01 Aug 12:30' },
      { label: 'Permit Issued',    completedAt: '02 Aug 08:45' },
      { label: 'In Transit',       completedAt: '02 Aug 11:00' },
      { label: 'Arrival Confirmed', pending: true },
    ],
  },
  {
    id: 'h7', code: 'HR-2026-00099',
    from: 'PRM-JOW-001', to: 'PRM-MOG-001',
    animalCount: 55, species: 'Goat', purpose: 'SALE', status: 'VET_INSPECTION',
    submittedAt: '2026-08-02',
    steps: [
      { label: 'Submitted',        completedAt: '02 Aug 09:45' },
      { label: 'Vet Inspection',   pending: true },
      { label: 'Permit Issued',    pending: true },
      { label: 'In Transit',       pending: true },
      { label: 'Arrival Confirmed', pending: true },
    ],
  },
];

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  IN_TRANSIT:     { label: 'In Transit',      color: '#d97706', bg: '#fffbeb' },
  COMPLETED:      { label: 'Completed',       color: '#16a34a', bg: '#f0fdf4' },
  REJECTED:       { label: 'Rejected',        color: '#dc2626', bg: '#fef2f2' },
  PERMIT_ISSUED:  { label: 'Permit Issued',   color: '#6366f1', bg: '#eef2ff' },
  SUBMITTED:      { label: 'Submitted',       color: '#2563eb', bg: '#eff6ff' },
  VET_INSPECTION: { label: 'Vet Inspection',  color: '#0891b2', bg: '#ecfeff' },
  APPROVED:       { label: 'Approved',        color: '#059669', bg: '#ecfdf5' },
};

const LINE_COLOR: Record<string, string> = {
  IN_TRANSIT:     '#f59e0b',
  COMPLETED:      '#16a34a',
  REJECTED:       '#dc2626',
  PERMIT_ISSUED:  '#6366f1',
  SUBMITTED:      '#94a3b8',
  VET_INSPECTION: '#0891b2',
};

const TABS = ['ALL', 'IN_TRANSIT', 'PERMIT_ISSUED', 'SUBMITTED', 'COMPLETED', 'REJECTED'];

// ── Map ───────────────────────────────────────────────────────────────────────

function HerdMapView({ selectedId, requests }: { selectedId: string | null; requests: HerdRequest[] }) {
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

    requests.forEach(req => {
      const org = PREMISES[req.from];
      const dst = PREMISES[req.to];
      if (!org || !dst) return;

      const color     = LINE_COLOR[req.status] ?? '#94a3b8';
      const isTransit = req.status === 'IN_TRANSIT';
      const isDone    = req.status === 'COMPLETED';

      const line = L.polyline([[org.lat, org.lng], [dst.lat, dst.lng]], {
        color,
        weight: isTransit ? 4.5 : 2.5,
        opacity: req.status === 'REJECTED' ? 0.3 : 0.8,
        dashArray: isDone ? undefined : isTransit ? '8 5' : '4 6',
      }).addTo(layers);
      line.bindTooltip(`${req.code} — ${PREMISES[req.from]?.name} → ${PREMISES[req.to]?.name}`, { direction: 'center', sticky: true });
      linesRef.current.set(req.id, line);

      if (isTransit) {
        const truck = L.marker([org.lat, org.lng], {
          interactive: false,
          zIndexOffset: 900,
          icon: L.divIcon({ className: '', html: '<div style="font-size:20px;filter:drop-shadow(0 2px 6px rgba(0,0,0,.3))">🚛</div>', iconSize: [22, 22], iconAnchor: [11, 11] }),
        }).addTo(layers);
        truckRefs.current.set(req.id, truck);
        progressRef.current.set(req.id, Math.random() * 0.7);
      }
    });

    // Premise node markers
    const used = new Set(requests.flatMap(r => [r.from, r.to]));
    used.forEach(code => {
      const p = PREMISES[code];
      if (!p) return;
      L.marker([p.lat, p.lng], {
        icon: L.divIcon({
          className: '',
          html: `<div style="width:12px;height:12px;border-radius:50%;background:#0b5ed7;border:3px solid #fff;box-shadow:0 0 0 2px #93c5fd,0 2px 8px rgba(11,94,215,.4)"></div>`,
          iconSize: [12, 12], iconAnchor: [6, 6],
        }),
      }).bindTooltip(p.name, { permanent: false, direction: 'top', offset: [0, -10] }).addTo(layers);
    });

    mapRef.current = map;

    // Truck animation
    let last = 0;
    const tick = (t: number) => {
      if (t - last > 16) {
        last = t;
        requests.forEach(req => {
          if (req.status !== 'IN_TRANSIT') return;
          const truck = truckRefs.current.get(req.id);
          const org   = PREMISES[req.from];
          const dst   = PREMISES[req.to];
          if (!truck || !org || !dst) return;
          let p = (progressRef.current.get(req.id) ?? 0) + 0.0005;
          if (p > 1) p = 0;
          progressRef.current.set(req.id, p);
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
      const req = requests.find(r => r.id === id);
      if (!req) return;
      if (id === selectedId) {
        line.setStyle({ color: '#f97316', weight: 7, opacity: 1, dashArray: undefined });
        line.bringToFront();
      } else {
        const color = LINE_COLOR[req.status] ?? '#94a3b8';
        line.setStyle({ color, weight: req.status === 'IN_TRANSIT' ? 4.5 : 2.5, opacity: req.status === 'REJECTED' ? 0.3 : 0.8, dashArray: req.status === 'COMPLETED' ? undefined : '4 6' });
      }
    });
  }, [selectedId, requests]);

  return <div ref={containerRef} className={s.mapContainer} />;
}

// ── Timeline ──────────────────────────────────────────────────────────────────

function Timeline({ steps }: { steps: Step[] }) {
  const lastDone = steps.filter(st => st.completedAt).length;
  return (
    <div className={s.timeline}>
      {steps.map((step, i) => {
        const done     = !!step.completedAt;
        const rejected = !!step.rejected;
        const pending  = !done && !rejected;
        const showLine = i < steps.length - 1;
        return (
          <div key={i} className={s.timelineStep}>
            {showLine && <div className={`${s.connector}${done ? ' ' + s.connectorDone : ''}`} />}
            <div className={`${s.node}${done ? ' ' + s.nodeDone : rejected ? ' ' + s.nodeRejected : ' ' + s.nodePending}`}>
              {done     && <CheckCircle size={13} />}
              {rejected && <XCircle     size={13} />}
              {pending  && <Clock       size={13} />}
            </div>
            <div className={s.stepInfo}>
              <span className={`${s.stepLabel}${done ? ' ' + s.stepLabelDone : rejected ? ' ' + s.stepLabelRejected : ' ' + s.stepLabelPending}`}>
                {step.label}
              </span>
              {done     && <span className={s.stepTime}>{step.completedAt}</span>}
              {rejected && <span className={s.stepTime} style={{ color: '#dc2626' }}>Rejected</span>}
              {pending  && <span className={s.stepWaiting}>Waiting</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function HerdMovementsPage(): JSX.Element {
  const [tab,        setTab]        = useState('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded,   setExpanded]   = useState<string | null>(null);

  const filtered = tab === 'ALL' ? REQUESTS : REQUESTS.filter(r => r.status === tab);
  const selectedReq = selectedId ? REQUESTS.find(r => r.id === selectedId) ?? null : null;

  const stats = [
    { label: 'Total',        count: REQUESTS.length,                                              color: '#2563eb' },
    { label: 'In Transit',   count: REQUESTS.filter(r => r.status === 'IN_TRANSIT').length,       color: '#d97706' },
    { label: 'Permit Ready', count: REQUESTS.filter(r => r.status === 'PERMIT_ISSUED').length,    color: '#6366f1' },
    { label: 'Completed',    count: REQUESTS.filter(r => r.status === 'COMPLETED').length,        color: '#16a34a' },
    { label: 'Rejected',     count: REQUESTS.filter(r => r.status === 'REJECTED').length,        color: '#dc2626' },
  ];

  return (
    <div className={s.page}>

      {/* Stats */}
      <div className={s.stats}>
        {stats.map(st => (
          <div key={st.label} className={s.statCard} style={{ borderTop: `3px solid ${st.color}` }}>
            <div className={s.statNum} style={{ color: st.color }}>{st.count}</div>
            <div className={s.statLabel}>{st.label}</div>
          </div>
        ))}
      </div>

      {/* Split layout */}
      <div className={s.layout}>

        {/* Left — request list */}
        <div className={s.sidebar}>
          <div className={s.sidebarHead}>
            <span className={s.sidebarTitle}>Herd Movements</span>
            <span className={s.sidebarBadge}>{filtered.length}</span>
          </div>

          {/* Tabs */}
          <div className={s.tabBar}>
            {TABS.map(t => {
              const label = t === 'ALL' ? 'All' : t === 'IN_TRANSIT' ? 'In Transit' : t === 'PERMIT_ISSUED' ? 'Permit' : t.charAt(0) + t.slice(1).toLowerCase();
              return (
                <button key={t} className={`${s.tab}${tab === t ? ' ' + s.tabActive : ''}`} onClick={() => setTab(t)}>
                  {label}
                </button>
              );
            })}
          </div>

          {/* Cards */}
          <div className={s.cardList}>
            {filtered.map(req => {
              const st     = STATUS_CFG[req.status] ?? STATUS_CFG.SUBMITTED;
              const org    = PREMISES[req.from];
              const dst    = PREMISES[req.to];
              const active = selectedId === req.id;
              const open   = expanded === req.id;
              const lastDone = req.steps.filter(step => step.completedAt).length;
              const pct = (lastDone / req.steps.length) * 100;

              return (
                <div
                  key={req.id}
                  className={`${s.card}${active ? ' ' + s.cardActive : ''}`}
                >
                  {/* Card header — click to select on map */}
                  <div className={s.cardHead} onClick={() => setSelectedId(active ? null : req.id)}>
                    <div className={s.cardLeft}>
                      <div className={s.cardTop}>
                        <span className={s.code}>{req.code}</span>
                        <span className={s.badge} style={{ color: st.color, background: st.bg }}>{st.label}</span>
                      </div>
                      <div className={s.route}>
                        <MapPin size={10} color="#94a3b8" />
                        <span className={s.routeFrom}>{org?.name ?? req.from}</span>
                        <ChevronRight size={11} color="#94a3b8" />
                        <span className={s.routeTo}>{dst?.name ?? req.to}</span>
                      </div>
                      <div className={s.meta}>
                        {req.animalCount} {req.species} · {req.purpose} · {req.submittedAt}
                      </div>

                      {/* Progress bar */}
                      <div className={s.progressWrap}>
                        <div className={s.progressBar}>
                          <div className={s.progressFill} style={{ width: `${pct}%`, background: st.color }} />
                        </div>
                        <span className={s.progressLabel}>{lastDone}/{req.steps.length} steps</span>
                      </div>
                    </div>

                    {/* Expand toggle */}
                    <button
                      className={s.expandBtn}
                      onClick={e => { e.stopPropagation(); setExpanded(open ? null : req.id); }}
                      title={open ? 'Collapse' : 'View timeline'}
                    >
                      {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  </div>

                  {/* Expanded: timeline */}
                  {open && (
                    <div className={s.cardBody}>
                      <Timeline steps={req.steps} />
                      {(req.status === 'PERMIT_ISSUED') && (
                        <div className={s.actions}>
                          <button className={`${s.actionBtn} ${s.actionOrange}`}>🚛 Confirm Departure</button>
                        </div>
                      )}
                      {(req.status === 'IN_TRANSIT') && (
                        <div className={s.actions}>
                          <button className={`${s.actionBtn} ${s.actionGreen}`}>✓ Confirm Arrival</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right — map */}
        <div className={s.mapWrapper}>
          <HerdMapView selectedId={selectedId} requests={REQUESTS} />

          {/* Legend */}
          <div className={s.mapLegend}>
            <div className={s.legendTitle}>Routes</div>
            <div className={s.legendRow}><span className={s.lineAmber} /> In Transit</div>
            <div className={s.legendRow}><span className={s.lineGreen} /> Completed</div>
            <div className={s.legendRow}><span className={s.lineIndigo} /> Permit Issued</div>
            <div className={s.legendRow}><span className={s.lineGray} /> Submitted</div>
            <div className={s.legendRow}><span className={s.lineRed} /> Rejected</div>
            <div className={s.legendRow}><span>🚛</span> Truck moving</div>
          </div>

          {/* Selected detail */}
          {selectedReq && (
            <div className={s.detail}>
              <div className={s.detailTop}>
                <span className={s.detailCode}>{selectedReq.code}</span>
                <button className={s.detailClose} onClick={() => setSelectedId(null)}>✕</button>
              </div>
              <div className={s.detailRow}><span className={s.detailLabel}>From</span><span className={s.detailVal}>{PREMISES[selectedReq.from]?.name}</span></div>
              <div className={s.detailRow}><span className={s.detailLabel}>To</span><span className={s.detailVal}>{PREMISES[selectedReq.to]?.name}</span></div>
              <div className={s.detailRow}><span className={s.detailLabel}>Animals</span><span className={s.detailVal}>{selectedReq.animalCount} {selectedReq.species}</span></div>
              <div className={s.detailRow}><span className={s.detailLabel}>Purpose</span><span className={s.detailVal}>{selectedReq.purpose}</span></div>
              <div className={s.detailRow}>
                <span className={s.detailLabel}>Status</span>
                <span className={s.detailVal} style={{ color: STATUS_CFG[selectedReq.status]?.color }}>
                  {STATUS_CFG[selectedReq.status]?.label ?? selectedReq.status}
                </span>
              </div>
              <div className={s.detailHint}>Click card to expand timeline</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HerdMovementsPage;
