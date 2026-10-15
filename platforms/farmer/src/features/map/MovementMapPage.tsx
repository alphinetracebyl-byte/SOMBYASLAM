import { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin, Navigation, Truck, CheckCircle, XCircle,
  Clock, ChevronRight, RefreshCw, Home, Tent,
  TreePine, Droplets, Store, Warehouse,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import client from '@/api/client';
import s from './map.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Premises {
  id: string;
  premisesCode: string;
  premisesName: string;
  premisesType: string;
  status: string;
  regionCode: string;
  districtCode: string;
  gpsLatitude: number;
  gpsLongitude: number;
  allowedSpecies?: string;
  capacityAnimals?: number;
}

interface Movement {
  id: string;
  movementCode: string;
  status: string;
  originPremisesCode: string;
  destinationPremisesCode: string;
  purpose: string;
  animalCount: number;
  createdAt: string;
  departedAt?: string;
  arrivedAt?: string;
}

// ── Regional GPS fallbacks (for premises not owned by the farmer) ─────────────

const REGION_GPS: Record<string, [number, number]> = {
  AWD: [10.08, 42.71], BAK: [4.22, 44.06], BAN: [2.05, 45.32],
  BAR: [11.28, 49.18], BAY: [3.12, 43.65], GAL: [6.77, 47.43],
  GED: [3.80, 41.88], HIR: [4.74, 45.20], LJU: [0.36, 42.55],
  LSH: [1.72, 44.77], MJU: [2.49, 43.29], MSH: [2.79, 45.50],
  MUD: [6.77, 47.43], NUG: [8.41, 48.48], SAN: [10.63, 47.38],
  SOL: [8.72, 46.88], TOG: [9.52, 45.54], WOG: [9.56, 44.07],
};

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  DRAFT:               { label: 'Draft',         color: '#64748b', bg: '#f1f5f9', Icon: Clock       },
  SUBMITTED:           { label: 'Submitted',     color: '#0b5ed7', bg: '#eff6ff', Icon: Clock       },
  UNDER_REVIEW:        { label: 'Under Review',  color: '#7c3aed', bg: '#f5f3ff', Icon: Clock       },
  APPROVED:            { label: 'Approved',      color: '#059669', bg: '#ecfdf5', Icon: CheckCircle },
  REJECTED:            { label: 'Rejected',      color: '#dc2626', bg: '#fef2f2', Icon: XCircle     },
  PERMIT_ISSUED:       { label: 'Permit Issued', color: '#6366f1', bg: '#eef2ff', Icon: CheckCircle },
  DEPARTURE_CONFIRMED: { label: 'Departed',      color: '#d97706', bg: '#fffbeb', Icon: Truck       },
  IN_TRANSIT:          { label: 'In Transit',    color: '#d97706', bg: '#fffbeb', Icon: Truck       },
  ARRIVAL_CONFIRMED:   { label: 'Arrived',       color: '#16a34a', bg: '#f0fdf4', Icon: CheckCircle },
  COMPLETED:           { label: 'Completed',     color: '#16a34a', bg: '#f0fdf4', Icon: CheckCircle },
  CANCELLED:           { label: 'Cancelled',     color: '#94a3b8', bg: '#f8fafc', Icon: XCircle     },
};

const LINE_COLOR: Record<string, string> = {
  COMPLETED:           '#16a34a',
  IN_TRANSIT:          '#f59e0b',
  DEPARTURE_CONFIRMED: '#f59e0b',
  APPROVED:            '#0b5ed7',
  PERMIT_ISSUED:       '#6366f1',
  SUBMITTED:           '#94a3b8',
  UNDER_REVIEW:        '#7c3aed',
  REJECTED:            '#dc2626',
  DRAFT:               '#cbd5e1',
  CANCELLED:           '#e2e8f0',
};

const PREMISES_ICON: Record<string, React.ElementType> = {
  FARM: Home, PASTORAL_CAMP: Tent, GRAZING_AREA: TreePine,
  WATERING_POINT: Droplets, TRADER_HOLDING: Store,
  COLLECTION_CENTRE: Warehouse,
};

// ── Geometry helpers ──────────────────────────────────────────────────────────

function bearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dL = (lng2 - lng1) * Math.PI / 180;
  const y = Math.sin(dL) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180)
    - Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dL);
  return Math.atan2(y, x) * 180 / Math.PI;
}

// ── Map renderer component ────────────────────────────────────────────────────

interface MapRendererProps {
  gpsMap: Record<string, { lat: number; lng: number; name: string }>;
  myPremises: Premises[];
  movements: Movement[];
  selectedPremisesCode: string | null;
  selectedMovementId: string | null;
  onSelectMovement: (id: string | null) => void;
}

function MapRenderer({
  gpsMap, myPremises, movements,
  selectedPremisesCode, selectedMovementId, onSelectMovement,
}: MapRendererProps) {
  const containerRef   = useRef<HTMLDivElement>(null);
  const mapRef         = useRef<L.Map | null>(null);
  const routeLayerRef  = useRef<L.LayerGroup | null>(null);
  const premisesLayerRef = useRef<L.LayerGroup | null>(null);
  const linesRef       = useRef<Map<string, L.Polyline>>(new Map());
  const truckRefs      = useRef<Map<string, L.Marker>>(new Map());
  const progressRef    = useRef<Map<string, number>>(new Map());
  const animRef        = useRef<number>(0);

  // Initialise Leaflet once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [5.5, 46.5], zoom: 6, attributionControl: false,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(map);

    routeLayerRef.current   = L.layerGroup().addTo(map);
    premisesLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      cancelAnimationFrame(animRef.current);
      map.remove();
      mapRef.current = null;
      routeLayerRef.current = null;
      premisesLayerRef.current = null;
    };
  }, []);

  // Redraw premises markers when list changes or filter changes
  useEffect(() => {
    const layer = premisesLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    myPremises.forEach(p => {
      const isSelected = selectedPremisesCode === p.premisesCode;
      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:${isSelected ? 18 : 13}px;
          height:${isSelected ? 18 : 13}px;
          border-radius:50%;
          background:${isSelected ? '#f97316' : '#0b5ed7'};
          border:3px solid #fff;
          box-shadow:0 0 0 ${isSelected ? 3 : 2}px ${isSelected ? '#fdba74' : '#93c5fd'},
                     0 3px 10px rgba(0,0,0,0.25);
          transition:all 0.2s;
        "></div>`,
        iconSize: [isSelected ? 18 : 13, isSelected ? 18 : 13],
        iconAnchor: [isSelected ? 9 : 6, isSelected ? 9 : 6],
      });

      L.marker([p.gpsLatitude, p.gpsLongitude], { icon })
        .bindTooltip(
          `<strong>${p.premisesName}</strong><br/>${p.premisesCode}<br/>${p.premisesType.replace(/_/g,' ')}`,
          { direction: 'top', offset: [0, -10] }
        )
        .addTo(layer);
    });
  }, [myPremises, selectedPremisesCode]);

  // Redraw routes when movements or filter changes
  useEffect(() => {
    const layer = routeLayerRef.current;
    if (!layer) return;

    cancelAnimationFrame(animRef.current);
    layer.clearLayers();
    linesRef.current.clear();
    truckRefs.current.clear();
    progressRef.current.clear();

    movements.forEach(mv => {
      const org = gpsMap[mv.originPremisesCode];
      const dst = gpsMap[mv.destinationPremisesCode];
      if (!org || !dst) return;

      const color     = LINE_COLOR[mv.status] ?? '#94a3b8';
      const isTransit = mv.status === 'IN_TRANSIT' || mv.status === 'DEPARTURE_CONFIRMED';
      const isDone    = mv.status === 'COMPLETED';
      const isSelected = mv.id === selectedMovementId;

      const line = L.polyline(
        [[org.lat, org.lng], [dst.lat, dst.lng]],
        {
          color: isSelected ? '#f97316' : color,
          weight: isSelected ? 6 : isTransit ? 4 : 2.5,
          opacity: mv.status === 'REJECTED' ? 0.4 : 0.85,
          dashArray: isSelected ? undefined : isDone ? undefined : isTransit ? '8 5' : '5 7',
        }
      ).addTo(layer);

      line.on('click', () => onSelectMovement(mv.id === selectedMovementId ? null : mv.id));
      linesRef.current.set(mv.id, line);

      // Direction arrow at midpoint
      const midLat = (org.lat + dst.lat) / 2;
      const midLng = (org.lng + dst.lng) / 2;
      const angle  = bearing(org.lat, org.lng, dst.lat, dst.lng);
      L.marker([midLat, midLng], {
        interactive: false,
        icon: L.divIcon({
          className: '',
          html: `<div style="transform:rotate(${angle}deg);color:${isSelected ? '#f97316' : color};font-size:13px;line-height:1;">▶</div>`,
          iconSize: [13, 13], iconAnchor: [6, 6],
        }),
      }).addTo(layer);

      // Animated truck for in-transit
      if (isTransit) {
        const truck = L.marker([org.lat, org.lng], {
          interactive: false,
          zIndexOffset: 2000,
          icon: L.divIcon({
            className: '',
            html: `<div style="font-size:20px;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.35));user-select:none;">🚛</div>`,
            iconSize: [22, 22], iconAnchor: [11, 11],
          }),
        }).addTo(layer);
        truckRefs.current.set(mv.id, truck);
        progressRef.current.set(mv.id, Math.random());
      }
    });

    // RAF loop for trucks
    const inTransitMvs = movements.filter(mv =>
      (mv.status === 'IN_TRANSIT' || mv.status === 'DEPARTURE_CONFIRMED') &&
      gpsMap[mv.originPremisesCode] && gpsMap[mv.destinationPremisesCode]
    );

    if (inTransitMvs.length > 0) {
      let last = 0;
      const tick = (t: number) => {
        if (t - last > 16) {
          last = t;
          inTransitMvs.forEach(mv => {
            const truck = truckRefs.current.get(mv.id);
            const org   = gpsMap[mv.originPremisesCode];
            const dst   = gpsMap[mv.destinationPremisesCode];
            if (!truck || !org || !dst) return;
            let p = (progressRef.current.get(mv.id) ?? 0) + 0.0005;
            if (p > 1) p = 0;
            progressRef.current.set(mv.id, p);
            truck.setLatLng([org.lat + (dst.lat - org.lat) * p, org.lng + (dst.lng - org.lng) * p]);
          });
        }
        animRef.current = requestAnimationFrame(tick);
      };
      animRef.current = requestAnimationFrame(tick);
    }

    return () => cancelAnimationFrame(animRef.current);
  }, [movements, gpsMap, selectedMovementId]);

  // Re-highlight selected line without full redraw
  useEffect(() => {
    linesRef.current.forEach((line, id) => {
      const mv = movements.find(m => m.id === id);
      if (!mv) return;
      const color = LINE_COLOR[mv.status] ?? '#94a3b8';
      if (id === selectedMovementId) {
        line.setStyle({ color: '#f97316', weight: 6, opacity: 1, dashArray: undefined });
        line.bringToFront();
      } else {
        const isTransit = mv.status === 'IN_TRANSIT' || mv.status === 'DEPARTURE_CONFIRMED';
        const isDone    = mv.status === 'COMPLETED';
        line.setStyle({
          color, weight: isTransit ? 4 : 2.5,
          opacity: mv.status === 'REJECTED' ? 0.4 : 0.85,
          dashArray: isDone ? undefined : isTransit ? '8 5' : '5 7',
        });
      }
    });
  }, [selectedMovementId, movements]);

  return <div ref={containerRef} className={s.mapCanvas} />;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function MovementMapPage(): JSX.Element {
  const { userId } = useAuthStore();

  const [premises,   setPremises]   = useState<Premises[]>([]);
  const [movements,  setMovements]  = useState<Movement[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPremisesCode, setSelectedPremisesCode] = useState<string | null>(null);
  const [selectedMovementId,   setSelectedMovementId]   = useState<string | null>(null);

  const load = (silent = false) => {
    if (!userId) return;
    silent ? setRefreshing(true) : setLoading(true);

    Promise.all([
      client.get<Premises[]>(`/premises/by-owner/${userId}`),
      client.get<{ content: Movement[] }>('/movements', { params: { size: 100 } }),
    ])
      .then(([pRes, mRes]) => {
        setPremises(pRes.data);
        setMovements(mRes.data.content ?? []);
      })
      .catch(() => {})
      .finally(() => { setLoading(false); setRefreshing(false); });
  };

  useEffect(() => { load(); }, [userId]);

  // Build GPS lookup: premisesCode → { lat, lng, name }
  // Own premises use real GPS; external premises fall back to region center
  const gpsMap = useMemo(() => {
    const map: Record<string, { lat: number; lng: number; name: string }> = {};

    // Index own premises
    premises.forEach(p => {
      map[p.premisesCode] = {
        lat: p.gpsLatitude, lng: p.gpsLongitude, name: p.premisesName,
      };
    });

    // For movements referencing external premises, derive from region in code
    // Code format: PRM-{REG}-NNN  e.g. PRM-BAY-001
    movements.forEach(mv => {
      [mv.originPremisesCode, mv.destinationPremisesCode].forEach(code => {
        if (map[code]) return;
        const parts = code.split('-');
        const regionCode = parts[1] ?? '';
        const fallback = REGION_GPS[regionCode] ?? [5.5, 46.5];
        map[code] = { lat: fallback[0], lng: fallback[1], name: code };
      });
    });

    return map;
  }, [premises, movements]);

  // Filter movements by selected premises
  const filteredMovements = useMemo(() => {
    if (!selectedPremisesCode) return movements;
    return movements.filter(m =>
      m.originPremisesCode === selectedPremisesCode ||
      m.destinationPremisesCode === selectedPremisesCode
    );
  }, [movements, selectedPremisesCode]);

  // Per-premises movement counts
  const movementCounts = useMemo(() => {
    const out: Record<string, number> = {};
    const inc: Record<string, number> = {};
    movements.forEach(mv => {
      out[mv.originPremisesCode] = (out[mv.originPremisesCode] ?? 0) + 1;
      inc[mv.destinationPremisesCode] = (inc[mv.destinationPremisesCode] ?? 0) + 1;
    });
    return { out, inc };
  }, [movements]);

  // Overall stats
  const stats = useMemo(() => ({
    total:     filteredMovements.length,
    inTransit: filteredMovements.filter(m => ['IN_TRANSIT','DEPARTURE_CONFIRMED'].includes(m.status)).length,
    pending:   filteredMovements.filter(m => ['SUBMITTED','UNDER_REVIEW','APPROVED','PERMIT_ISSUED'].includes(m.status)).length,
    completed: filteredMovements.filter(m => m.status === 'COMPLETED').length,
  }), [filteredMovements]);

  const selectedMovement = selectedMovementId
    ? filteredMovements.find(m => m.id === selectedMovementId) ?? null
    : null;

  const selectedPremises = selectedPremisesCode
    ? premises.find(p => p.premisesCode === selectedPremisesCode) ?? null
    : null;

  if (loading) {
    return (
      <div className={s.page}>
        <div className={s.header}>
          <h1 className={s.title}>Movement Map</h1>
        </div>
        <div className={s.loadingWrap}>
          <div className={s.loadingSpinner} />
          <p>Loading your farms and movements…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={s.page}>

      {/* Page header */}
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Movement Map</h1>
          <p className={s.sub}>
            {premises.length} farms · {movements.length} movements
            {selectedPremises && <> · Filtered to <strong>{selectedPremises.premisesName}</strong></>}
          </p>
        </div>
        <button
          className={s.refreshBtn}
          onClick={() => load(true)}
          disabled={refreshing}
          title="Refresh"
        >
          <RefreshCw size={15} className={refreshing ? s.spin : undefined} />
        </button>
      </div>

      {/* Stats strip */}
      <div className={s.statsRow}>
        <div className={s.statChip}>
          <Navigation size={13} color="#0b5ed7" />
          <span className={s.statNum}>{stats.total}</span>
          <span className={s.statLabel}>Total</span>
        </div>
        <div className={s.statChip} style={{ borderColor: '#fde68a' }}>
          <Truck size={13} color="#d97706" />
          <span className={s.statNum} style={{ color: '#d97706' }}>{stats.inTransit}</span>
          <span className={s.statLabel}>In Transit</span>
        </div>
        <div className={s.statChip} style={{ borderColor: '#bfdbfe' }}>
          <Clock size={13} color="#0b5ed7" />
          <span className={s.statNum} style={{ color: '#0b5ed7' }}>{stats.pending}</span>
          <span className={s.statLabel}>Pending</span>
        </div>
        <div className={s.statChip} style={{ borderColor: '#bbf7d0' }}>
          <CheckCircle size={13} color="#16a34a" />
          <span className={s.statNum} style={{ color: '#16a34a' }}>{stats.completed}</span>
          <span className={s.statLabel}>Completed</span>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className={s.mapLayout}>

        {/* ── Left sidebar ── */}
        <aside className={s.sidebar}>

          {/* All filter */}
          <button
            className={`${s.filterAll}${!selectedPremisesCode ? ' ' + s.filterAllActive : ''}`}
            onClick={() => { setSelectedPremisesCode(null); setSelectedMovementId(null); }}
          >
            <Navigation size={14} />
            All Farms
            <span className={s.filterCount}>{movements.length}</span>
          </button>

          {/* Premises list */}
          <div className={s.premisesList}>
            {premises.length === 0 ? (
              <div className={s.emptyList}>
                <MapPin size={28} color="#e2e8f0" />
                <p>No farms registered</p>
              </div>
            ) : (
              premises.map(p => {
                const isActive = selectedPremisesCode === p.premisesCode;
                const outCount = movementCounts.out[p.premisesCode] ?? 0;
                const incCount = movementCounts.inc[p.premisesCode] ?? 0;
                const total    = outCount + incCount;
                const PIcon = PREMISES_ICON[p.premisesType] ?? MapPin;

                return (
                  <button
                    key={p.id}
                    className={`${s.premisesCard}${isActive ? ' ' + s.premisesCardActive : ''}`}
                    onClick={() => {
                      setSelectedPremisesCode(isActive ? null : p.premisesCode);
                      setSelectedMovementId(null);
                    }}
                  >
                    <div className={s.premisesCardIcon} style={{ background: isActive ? '#fff7ed' : '#eff6ff' }}>
                      <PIcon size={14} color={isActive ? '#f97316' : '#0b5ed7'} />
                    </div>
                    <div className={s.premisesCardBody}>
                      <div className={s.premisesCardName}>{p.premisesName}</div>
                      <div className={s.premisesCardCode}>{p.premisesCode}</div>
                      <div className={s.premisesCardMeta}>
                        <span title="Outgoing movements">↗ {outCount} out</span>
                        <span title="Incoming movements">↘ {incCount} in</span>
                        {total === 0 && <span style={{ color: '#cbd5e1' }}>No movements</span>}
                      </div>
                    </div>
                    {total > 0 && (
                      <span className={s.premisesCardBadge}
                        style={{ background: isActive ? '#fff7ed' : undefined, color: isActive ? '#ea580c' : undefined }}>
                        {total}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Selected premises movement list */}
          {selectedPremisesCode && filteredMovements.length > 0 && (
            <div className={s.mvList}>
              <div className={s.mvListTitle}>
                Movements <span className={s.mvListCount}>{filteredMovements.length}</span>
              </div>
              {filteredMovements.map(mv => {
                const cfg      = STATUS_CFG[mv.status] ?? STATUS_CFG.DRAFT;
                const isOut    = mv.originPremisesCode === selectedPremisesCode;
                const isActive = selectedMovementId === mv.id;
                const org = gpsMap[mv.originPremisesCode];
                const dst = gpsMap[mv.destinationPremisesCode];

                return (
                  <button
                    key={mv.id}
                    className={`${s.mvCard}${isActive ? ' ' + s.mvCardActive : ''}`}
                    onClick={() => setSelectedMovementId(isActive ? null : mv.id)}
                  >
                    <div className={s.mvCardTop}>
                      <span className={s.mvCode}>{mv.movementCode}</span>
                      <span className={s.mvBadge} style={{ color: cfg.color, background: cfg.bg }}>
                        <cfg.Icon size={9} /> {cfg.label}
                      </span>
                    </div>
                    <div className={s.mvRoute}>
                      <span style={{ color: isOut ? '#64748b' : '#0b5ed7', fontWeight: isOut ? 400 : 600 }}>
                        {org?.name ?? mv.originPremisesCode}
                      </span>
                      <ChevronRight size={10} color="#94a3b8" />
                      <span style={{ color: !isOut ? '#64748b' : '#0b5ed7', fontWeight: !isOut ? 400 : 600 }}>
                        {dst?.name ?? mv.destinationPremisesCode}
                      </span>
                    </div>
                    <div className={s.mvMeta}>
                      🐄 {mv.animalCount} · {mv.purpose} · {new Date(mv.createdAt).toLocaleDateString()}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        {/* ── Map panel ── */}
        <div className={s.mapPanel}>

          <MapRenderer
            gpsMap={gpsMap}
            myPremises={premises}
            movements={filteredMovements}
            selectedPremisesCode={selectedPremisesCode}
            selectedMovementId={selectedMovementId}
            onSelectMovement={setSelectedMovementId}
          />

          {/* Empty overlay */}
          {premises.length === 0 && (
            <div className={s.mapOverlayEmpty}>
              <MapPin size={48} color="#e2e8f0" />
              <p style={{ fontWeight: 600, color: '#475569' }}>No farms registered yet</p>
              <p style={{ fontSize: 13, color: '#94a3b8' }}>Register a farm to see it on the map</p>
            </div>
          )}

          {premises.length > 0 && movements.length === 0 && (
            <div className={s.mapOverlayEmpty}>
              <Navigation size={40} color="#e2e8f0" />
              <p style={{ fontWeight: 600, color: '#475569' }}>No movements yet</p>
              <p style={{ fontSize: 13, color: '#94a3b8' }}>Submit a movement permit to see routes here</p>
            </div>
          )}

          {/* Selected movement detail panel */}
          {selectedMovement && (() => {
            const cfg = STATUS_CFG[selectedMovement.status] ?? STATUS_CFG.DRAFT;
            const org = gpsMap[selectedMovement.originPremisesCode];
            const dst = gpsMap[selectedMovement.destinationPremisesCode];
            return (
              <div className={s.detailPanel}>
                <div className={s.detailTop}>
                  <span className={s.detailCode}>{selectedMovement.movementCode}</span>
                  <button className={s.detailClose} onClick={() => setSelectedMovementId(null)}>✕</button>
                </div>
                <span className={s.detailBadge} style={{ color: cfg.color, background: cfg.bg }}>
                  <cfg.Icon size={11} /> {cfg.label}
                </span>
                <div className={s.detailRoute}>
                  <div className={s.detailNode}>
                    <div className={s.detailNodeDot} style={{ background: '#0b5ed7' }} />
                    <div>
                      <div className={s.detailNodeLabel}>From</div>
                      <div className={s.detailNodeName}>{org?.name ?? selectedMovement.originPremisesCode}</div>
                    </div>
                  </div>
                  <div className={s.detailRouteLine} />
                  <div className={s.detailNode}>
                    <div className={s.detailNodeDot} style={{ background: '#16a34a' }} />
                    <div>
                      <div className={s.detailNodeLabel}>To</div>
                      <div className={s.detailNodeName}>{dst?.name ?? selectedMovement.destinationPremisesCode}</div>
                    </div>
                  </div>
                </div>
                <div className={s.detailGrid}>
                  <div className={s.detailRow}><span>Animals</span><strong>{selectedMovement.animalCount}</strong></div>
                  <div className={s.detailRow}><span>Purpose</span><strong>{selectedMovement.purpose}</strong></div>
                  <div className={s.detailRow}><span>Submitted</span><strong>{new Date(selectedMovement.createdAt).toLocaleDateString()}</strong></div>
                  {selectedMovement.departedAt && (
                    <div className={s.detailRow}><span>Departed</span><strong>{new Date(selectedMovement.departedAt).toLocaleDateString()}</strong></div>
                  )}
                  {selectedMovement.arrivedAt && (
                    <div className={s.detailRow}><span>Arrived</span><strong>{new Date(selectedMovement.arrivedAt).toLocaleDateString()}</strong></div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Map legend */}
          <div className={s.legend}>
            <div className={s.legendTitle}>Legend</div>
            {[
              { color: '#f59e0b', dash: '8 5', label: 'In Transit 🚛' },
              { color: '#16a34a', dash: undefined,  label: 'Completed'    },
              { color: '#0b5ed7', dash: '5 7', label: 'Approved'     },
              { color: '#94a3b8', dash: '5 7', label: 'Submitted'    },
              { color: '#dc2626', dash: '5 7', label: 'Rejected'     },
            ].map(item => (
              <div key={item.label} className={s.legendRow}>
                <svg width="26" height="6" style={{ flexShrink: 0 }}>
                  <line x1="0" y1="3" x2="26" y2="3"
                    stroke={item.color} strokeWidth="2.5"
                    strokeDasharray={item.dash ?? undefined} />
                </svg>
                <span>{item.label}</span>
              </div>
            ))}
            <div className={s.legendRow}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#0b5ed7', border: '2px solid #fff', boxShadow: '0 0 0 2px #93c5fd', flexShrink: 0 }} />
              <span>My Farms</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MovementMapPage;
