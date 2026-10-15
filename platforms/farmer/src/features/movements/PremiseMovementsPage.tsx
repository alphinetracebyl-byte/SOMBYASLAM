import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Smartphone, MapPin, ChevronRight, Truck, CheckCircle, Clock, XCircle, Wifi, WifiOff } from 'lucide-react';
import s from './premise-movements.module.css';

// ── Data ──────────────────────────────────────────────────────────────────────

const PREMISES: Record<string, { name: string; lat: number; lng: number }> = {
  'PRM-BAI-001': { name: 'Baidoa Collection',  lat: 3.1178,  lng: 43.6488 },
  'PRM-MOG-001': { name: 'Mogadishu Central',  lat: 2.0469,  lng: 45.3182 },
  'PRM-KIS-001': { name: 'Kismayo Market',     lat: 0.3585,  lng: 42.5455 },
  'PRM-GAL-001': { name: 'Galkayo Camel Hub',  lat: 6.7697,  lng: 47.4316 },
  'PRM-BOS-001': { name: 'Bosaso Export Port', lat: 11.2844, lng: 49.1836 },
  'PRM-GAR-001': { name: 'Garowe Livestock',   lat: 8.4081,  lng: 48.4842 },
  'PRM-BEL-001': { name: 'Beledweyne Farm',    lat: 4.7355,  lng: 45.2008 },
  'PRM-JOW-001': { name: 'Jowhar Goat Farm',   lat: 2.7862,  lng: 45.5021 },
};

interface PremiseMove {
  id: string;
  code: string;
  from: string;
  to: string;
  purpose: string;
  animalCount: number;
  species: string;
  status: string;
  createdAt: string;
  mobile: {
    deviceId: string;
    farmerName: string;
    lastPing: string;
    online: boolean;
    lat: number;
    lng: number;
  };
}

const MOVES: PremiseMove[] = [
  {
    id: '1', code: 'MV-2026-001234',
    from: 'PRM-BAI-001', to: 'PRM-MOG-001',
    purpose: 'SALE', animalCount: 45, species: 'Cattle',
    status: 'IN_TRANSIT', createdAt: '2026-08-01',
    mobile: { deviceId: 'MOB-041', farmerName: 'Ahmed Hassan', lastPing: '2 min ago', online: true, lat: 2.5820, lng: 44.8400 },
  },
  {
    id: '2', code: 'MV-2026-001237',
    from: 'PRM-GAL-001', to: 'PRM-BOS-001',
    purpose: 'EXPORT', animalCount: 200, species: 'Camel',
    status: 'IN_TRANSIT', createdAt: '2026-08-01',
    mobile: { deviceId: 'MOB-087', farmerName: 'Abdirahman Warsame', lastPing: '5 min ago', online: true, lat: 9.1200, lng: 48.7500 },
  },
  {
    id: '3', code: 'MV-2026-001241',
    from: 'PRM-GAR-001', to: 'PRM-BOS-001',
    purpose: 'EXPORT', animalCount: 350, species: 'Camel',
    status: 'IN_TRANSIT', createdAt: '2026-08-02',
    mobile: { deviceId: 'MOB-112', farmerName: 'Faadumo Yusuf', lastPing: '1 min ago', online: true, lat: 9.8500, lng: 48.9000 },
  },
  {
    id: '4', code: 'MV-2026-001235',
    from: 'PRM-KIS-001', to: 'PRM-MOG-001',
    purpose: 'SLAUGHTER', animalCount: 120, species: 'Goat',
    status: 'COMPLETED', createdAt: '2026-07-28',
    mobile: { deviceId: 'MOB-033', farmerName: 'Mohamed Idle', lastPing: '2 days ago', online: false, lat: 2.0469, lng: 45.3182 },
  },
  {
    id: '5', code: 'MV-2026-001240',
    from: 'PRM-MOG-001', to: 'PRM-KIS-001',
    purpose: 'SALE', animalCount: 60, species: 'Cattle',
    status: 'REJECTED', createdAt: '2026-07-30',
    mobile: { deviceId: 'MOB-055', farmerName: 'Habibo Ali', lastPing: '3 days ago', online: false, lat: 2.0469, lng: 45.3182 },
  },
  {
    id: '6', code: 'MV-2026-001242',
    from: 'PRM-BEL-001', to: 'PRM-JOW-001',
    purpose: 'SALE', animalCount: 25, species: 'Goat',
    status: 'PERMIT_ISSUED', createdAt: '2026-08-02',
    mobile: { deviceId: 'MOB-098', farmerName: 'Omar Farah', lastPing: '10 min ago', online: true, lat: 4.7355, lng: 45.2008 },
  },
];

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  IN_TRANSIT:    { label: 'In Transit',    color: '#d97706', bg: '#fffbeb' },
  COMPLETED:     { label: 'Completed',     color: '#16a34a', bg: '#f0fdf4' },
  REJECTED:      { label: 'Rejected',      color: '#dc2626', bg: '#fef2f2' },
  PERMIT_ISSUED: { label: 'Permit Issued', color: '#6366f1', bg: '#eef2ff' },
  APPROVED:      { label: 'Approved',      color: '#059669', bg: '#ecfdf5' },
  SUBMITTED:     { label: 'Submitted',     color: '#2563eb', bg: '#eff6ff' },
};

const LINE_COLOR: Record<string, string> = {
  IN_TRANSIT: '#f59e0b', COMPLETED: '#16a34a', REJECTED: '#dc2626',
  PERMIT_ISSUED: '#6366f1', APPROVED: '#0b5ed7', SUBMITTED: '#94a3b8',
};

// ── Map sub-component ─────────────────────────────────────────────────────────

function PremiseMapView({ selectedId, onSelect, moves }: {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  moves: PremiseMove[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);
  const linesRef     = useRef<Map<string, L.Polyline>>(new Map());
  const truckRefs    = useRef<Map<string, L.Marker>>(new Map());
  const mobileRefs   = useRef<Map<string, L.Marker>>(new Map());
  const progressRef  = useRef<Map<string, number>>(new Map());
  const animRef      = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, { center: [5.5, 46.5], zoom: 6, attributionControl: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(map);

    const layers = L.layerGroup().addTo(map);

    moves.forEach(mv => {
      const org = PREMISES[mv.from];
      const dst = PREMISES[mv.to];
      if (!org || !dst) return;

      const color     = LINE_COLOR[mv.status] ?? '#94a3b8';
      const isTransit = mv.status === 'IN_TRANSIT';
      const isDone    = mv.status === 'COMPLETED';

      const line = L.polyline([[org.lat, org.lng], [dst.lat, dst.lng]], {
        color, weight: isTransit ? 4 : 2.5,
        opacity: mv.status === 'REJECTED' ? 0.3 : 0.8,
        dashArray: isDone ? undefined : isTransit ? '8 5' : '4 6',
      }).addTo(layers);
      line.on('click', () => onSelect(mv.id));
      linesRef.current.set(mv.id, line);

      if (isTransit) {
        const truck = L.marker([org.lat, org.lng], {
          interactive: false,
          zIndexOffset: 900,
          icon: L.divIcon({ className: '', html: '<div style="font-size:20px;filter:drop-shadow(0 2px 6px rgba(0,0,0,.35))">🚛</div>', iconSize: [22, 22], iconAnchor: [11, 11] }),
        }).addTo(layers);
        truckRefs.current.set(mv.id, truck);
        progressRef.current.set(mv.id, Math.random());
      }

      // Mobile GPS dot
      if (mv.mobile.online) {
        const mobileDot = L.marker([mv.mobile.lat, mv.mobile.lng], {
          zIndexOffset: 1100,
          icon: L.divIcon({
            className: '',
            html: `<div style="width:16px;height:16px;border-radius:50%;background:#22c55e;border:3px solid #fff;box-shadow:0 0 0 3px rgba(34,197,94,0.35),0 2px 8px rgba(0,0,0,.3);"></div>`,
            iconSize: [16, 16], iconAnchor: [8, 8],
          }),
        })
          .bindTooltip(`📱 ${mv.mobile.farmerName} · ${mv.mobile.deviceId}`, { direction: 'top', offset: [0, -10] })
          .addTo(layers);
        mobileRefs.current.set(mv.id, mobileDot);
      }
    });

    // Premise node markers
    const used = new Set(moves.flatMap(m => [m.from, m.to]));
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
        moves.forEach(mv => {
          if (mv.status !== 'IN_TRANSIT') return;
          const truck = truckRefs.current.get(mv.id);
          const org   = PREMISES[mv.from];
          const dst   = PREMISES[mv.to];
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

    return () => { cancelAnimationFrame(animRef.current); map.remove(); mapRef.current = null; linesRef.current.clear(); truckRefs.current.clear(); mobileRefs.current.clear(); progressRef.current.clear(); };
  }, []);

  useEffect(() => {
    linesRef.current.forEach((line, id) => {
      const mv = moves.find(m => m.id === id);
      if (!mv) return;
      if (id === selectedId) {
        line.setStyle({ color: '#f97316', weight: 6, opacity: 1, dashArray: undefined });
        line.bringToFront();
      } else {
        const color = LINE_COLOR[mv.status] ?? '#94a3b8';
        line.setStyle({ color, weight: mv.status === 'IN_TRANSIT' ? 4 : 2.5, opacity: mv.status === 'REJECTED' ? 0.3 : 0.8, dashArray: mv.status === 'COMPLETED' ? undefined : '4 6' });
      }
    });
  }, [selectedId]);

  return <div ref={containerRef} className={s.mapContainer} />;
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TABS = ['ALL', 'IN_TRANSIT', 'COMPLETED', 'PERMIT_ISSUED', 'REJECTED'];

export function PremiseMovementsPage(): JSX.Element {
  const [tab,        setTab]        = useState('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = tab === 'ALL' ? MOVES : MOVES.filter(m => m.status === tab);
  const selectedMv = selectedId ? MOVES.find(m => m.id === selectedId) ?? null : null;

  return (
    <div className={s.page}>

      {/* Stats */}
      <div className={s.stats}>
        {[
          { label: 'Total',         count: MOVES.length,                                         color: '#2563eb' },
          { label: 'In Transit',    count: MOVES.filter(m => m.status === 'IN_TRANSIT').length,   color: '#d97706' },
          { label: 'Online Mobile', count: MOVES.filter(m => m.mobile.online).length,             color: '#22c55e' },
          { label: 'Completed',     count: MOVES.filter(m => m.status === 'COMPLETED').length,    color: '#16a34a' },
        ].map(st => (
          <div key={st.label} className={s.statCard} style={{ borderTop: `3px solid ${st.color}` }}>
            <div className={s.statNum} style={{ color: st.color }}>{st.count}</div>
            <div className={s.statLabel}>{st.label}</div>
          </div>
        ))}
      </div>

      {/* Split layout */}
      <div className={s.layout}>

        {/* Left — list */}
        <div className={s.sidebar}>
          <div className={s.sidebarHead}>
            <span className={s.sidebarTitle}>Premise Movements</span>
            <span className={s.sidebarBadge}>{filtered.length}</span>
          </div>

          {/* Tabs */}
          <div className={s.tabBar}>
            {TABS.map(t => (
              <button key={t} className={`${s.tab}${tab === t ? ' ' + s.tabActive : ''}`} onClick={() => setTab(t)}>
                {t === 'ALL' ? 'All' : t === 'IN_TRANSIT' ? 'In Transit' : t === 'PERMIT_ISSUED' ? 'Permit' : t.charAt(0) + t.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Cards */}
          {filtered.map(mv => {
            const st     = STATUS_CFG[mv.status] ?? STATUS_CFG.SUBMITTED;
            const org    = PREMISES[mv.from];
            const dst    = PREMISES[mv.to];
            const active = selectedId === mv.id;
            return (
              <div
                key={mv.id}
                className={`${s.card}${active ? ' ' + s.cardActive : ''}`}
                onClick={() => setSelectedId(active ? null : mv.id)}
              >
                {/* Code + status */}
                <div className={s.cardTop}>
                  <span className={s.code}>{mv.code}</span>
                  <span className={s.badge} style={{ color: st.color, background: st.bg }}>{st.label}</span>
                </div>

                {/* Route */}
                <div className={s.route}>
                  <MapPin size={10} color="#94a3b8"/>
                  <span className={s.routeFrom}>{org?.name ?? mv.from}</span>
                  <ChevronRight size={11} color="#94a3b8"/>
                  <span className={s.routeTo}>{dst?.name ?? mv.to}</span>
                </div>

                {/* Animals */}
                <div className={s.meta}>🐄 {mv.animalCount} {mv.species} · {mv.purpose} · {mv.createdAt}</div>

                {/* Mobile tracker */}
                <div className={`${s.mobileRow} ${mv.mobile.online ? s.mobileOnline : s.mobileOffline}`}>
                  {mv.mobile.online ? <Wifi size={11}/> : <WifiOff size={11}/>}
                  <Smartphone size={11}/>
                  <span className={s.mobileName}>{mv.mobile.farmerName}</span>
                  <span className={s.mobileId}>{mv.mobile.deviceId}</span>
                  <span className={s.mobilePing}>· {mv.mobile.lastPing}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right — map */}
        <div className={s.mapWrapper}>
          <PremiseMapView selectedId={selectedId} onSelect={setSelectedId} moves={MOVES} />

          {/* Mobile tracker legend */}
          <div className={s.mapLegend}>
            <div className={s.legendTitle}>Legend</div>
            <div className={s.legendRow}><span className={s.dotGreen}/> Farmer Mobile (online)</div>
            <div className={s.legendRow}><span className={s.dotBlue}/> Premises</div>
            <div className={s.legendRow}><span>🚛</span> In Transit</div>
          </div>

          {/* Selected detail overlay */}
          {selectedMv && (
            <div className={s.detail}>
              <div className={s.detailTop}>
                <span className={s.detailCode}>{selectedMv.code}</span>
                <button className={s.detailClose} onClick={() => setSelectedId(null)}>✕</button>
              </div>
              <div className={s.detailRow}><span className={s.detailLabel}>From</span><span className={s.detailVal}>{PREMISES[selectedMv.from]?.name}</span></div>
              <div className={s.detailRow}><span className={s.detailLabel}>To</span><span className={s.detailVal}>{PREMISES[selectedMv.to]?.name}</span></div>
              <div className={s.detailRow}><span className={s.detailLabel}>Animals</span><span className={s.detailVal}>{selectedMv.animalCount} {selectedMv.species}</span></div>
              <div className={s.detailRow}><span className={s.detailLabel}>Purpose</span><span className={s.detailVal}>{selectedMv.purpose}</span></div>
              <hr className={s.detailDivider}/>
              <div className={s.detailMobile}>
                {selectedMv.mobile.online ? <Wifi size={12} color="#22c55e"/> : <WifiOff size={12} color="#94a3b8"/>}
                <Smartphone size={12} color={selectedMv.mobile.online ? '#22c55e' : '#94a3b8'}/>
                <span>{selectedMv.mobile.farmerName}</span>
              </div>
              <div className={s.detailPing}>Device: {selectedMv.mobile.deviceId} · Last ping: {selectedMv.mobile.lastPing}</div>
              <div className={s.detailCoords}>
                GPS: {selectedMv.mobile.lat.toFixed(4)}°N, {selectedMv.mobile.lng.toFixed(4)}°E
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PremiseMovementsPage;
