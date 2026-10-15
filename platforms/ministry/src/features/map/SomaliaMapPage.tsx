import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { MapPin, User, Phone, Building2, ChevronRight, ArrowLeft, Maximize2, X, Tag, Clock, PauseCircle, CheckCircle, Truck } from 'lucide-react';
import { logActivity } from '@/lib/activity';
import { useAuthStore } from '@/store/auth.store';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getBadge } from '@/utils/statusBadge';
import s from './somalia-map.module.css';

// ── Types ──────────────────────────────────────────────────────────────────────

type TagColor = 'yellow' | 'orange' | 'green' | 'blue' | 'red';

interface BatchAnimal {
  id: string; seq: number; sex: 'M' | 'F'; ageMonths: number; weightKg: number; features: string;
  animalId?: string; tagSerial?: string; tagType?: 'RFID' | 'EAR_TAG'; tagColor?: TagColor;
  tagStatus: 'TAGGED' | 'UNTAGGED'; status: string;
}

interface Batch {
  id: string; batchCode: string; batchName: string;
  species: string; breed: string; count: number; status: string; createdAt: string;
  animals: BatchAnimal[];
}

interface Facility {
  id: string; code: string; name: string; type: string;
  checkpointType?: string; status: string; regionCode: string;
  lat?: number; lng?: number;
  capacity?: number; contactName?: string; contactPhone?: string;
  speciesHandled?: string;
}

interface Premises {
  id: string; code: string; name: string;
  owner: string; ownerId?: string; phone: string; type: string; status: string;
  lat?: number; lng?: number;
  areaHectares?: number; licenseNumber?: string;
  isTemporary?: boolean; temporaryEndDate?: string;
  createdAt?: string;
  physicalAddress?: string;
  capacityAnimals?: number;
  allowedSpecies?: string;
  licenseExpiryDate?: string;
  notes?: string;
  batches: Batch[];
}

interface PremisesPhoto {
  id: string; url: string; fileName: string | null;
}

// ── Somalia region polygons (viewBox 0 0 500 560) ────────────────────────────
// Outer shape matches the real Somalia "7" silhouette:
// Northern arm angles from lower-left (NW, near Djibouti) to upper-right (Horn/Bari).
// Then the coast curves south, bottom extends southwest with the characteristic notch.

const REGIONS = [
  { id: 'awdal',        name: 'Awdal',           code: 'AWD' },
  { id: 'woqooyi',      name: 'Woqooyi Galbeed', code: 'WOG' },
  { id: 'togdheer',     name: 'Togdheer',         code: 'TOG' },
  { id: 'sanaag',       name: 'Sanaag',           code: 'SAN' },
  { id: 'bari',         name: 'Bari',             code: 'BAR' },
  { id: 'sool',         name: 'Sool',             code: 'SOL' },
  { id: 'nugaal',       name: 'Nugaal',           code: 'NUG' },
  { id: 'mudug',        name: 'Mudug',            code: 'MUD' },
  { id: 'galgaduud',    name: 'Galgaduud',        code: 'GAL' },
  { id: 'hiiraan',      name: 'Hiiraan',          code: 'HIR' },
  { id: 'bakool',       name: 'Bakool',           code: 'BAK' },
  { id: 'bay',          name: 'Bay',              code: 'BAY' },
  { id: 'middle_shab',  name: 'Mid. Shabelle',    code: 'MSH' },
  { id: 'banaadir',     name: 'Banaadir',         code: 'BAN' },
  { id: 'lower_shab',   name: 'Lower Shabelle',   code: 'LSH' },
  { id: 'gedo',         name: 'Gedo',             code: 'GED' },
  { id: 'middle_jubba', name: 'Middle Jubba',     code: 'MJU' },
  { id: 'lower_jubba',  name: 'Lower Jubba',      code: 'LJU' },
];

// ── Region code → page region id mapping ──────────────────────────────────────

const REGION_CODE_TO_ID: Record<string, string> = {
  AWD: 'awdal',       WOG: 'woqooyi',       TOG: 'togdheer',     SAN: 'sanaag',
  BAR: 'bari',        SOL: 'sool',          NUG: 'nugaal',       MUD: 'mudug',
  GAL: 'galgaduud',   HIR: 'hiiraan',       BAK: 'bakool',       BAY: 'bay',
  MSH: 'middle_shab', BAN: 'banaadir',      LSH: 'lower_shab',   GED: 'gedo',
  MJU: 'middle_jubba', LJU: 'lower_jubba',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const SPECIES_EMOJI: Record<string, string> = {
  Cattle: '🐄', CATTLE: '🐄',
  Camel:  '🐪', CAMEL:  '🐪',
  Goat:   '🐐', GOAT:   '🐐',
  Sheep:  '🐑', SHEEP:  '🐑',
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Tag SVG components ─────────────────────────────────────────────────────────

function RFIDTag({ serial, color = 'yellow' }: { serial?: string; color?: TagColor }) {
  const fills: Record<TagColor, { body: string; stroke: string; text: string; sub: string }> = {
    yellow: { body: '#eab308', stroke: '#713f12', text: '#1c1917', sub: '#422006' },
    orange: { body: '#fed7aa', stroke: '#f97316', text: '#7c2d12', sub: '#9a3412' },
    green:  { body: '#bbf7d0', stroke: '#16a34a', text: '#14532d', sub: '#166534' },
    blue:   { body: '#bfdbfe', stroke: '#3b82f6', text: '#1e3a8a', sub: '#1e40af' },
    red:    { body: '#fecaca', stroke: '#ef4444', text: '#7f1d1d', sub: '#991b1b' },
  };
  const c = fills[color] ?? fills.yellow;
  return (
    <svg width="100" height="90" viewBox="0 0 110 100" style={{ display: 'block' }}>
      <rect x="40" y="2" width="30" height="18" rx="6" fill={c.body} stroke={c.stroke} strokeWidth="2" />
      <circle cx="55" cy="11" r="4.5" fill="#e5e7eb" stroke={c.stroke} strokeWidth="1.5" />
      <circle cx="55" cy="11" r="2" fill="white" />
      <rect x="2" y="14" width="106" height="84" rx="14" fill={c.body} stroke={c.stroke} strokeWidth="2" />
      <rect x="14" y="27" width="18" height="13" rx="2" fill="rgba(0,0,0,0.3)" />
      <rect x="16" y="29" width="14" height="9" rx="1" fill="#1e293b" />
      <path d="M76,28 Q81,34 76,40" fill="none" stroke={c.sub} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M81,25 Q89,34 81,43" fill="none" stroke={c.sub} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <text x="55" y="57" fontSize="6.5" fill={c.sub} fontFamily="monospace" textAnchor="middle" letterSpacing="1.5">ID NUMBER</text>
      <text x="55" y="70" fontSize="11" fill={c.text} fontFamily="monospace" fontWeight="bold" textAnchor="middle">{(serial ?? 'UNASSIGNED').slice(-10)}</text>
    </svg>
  );
}

function EarTag({ serial, color = 'yellow' }: { serial?: string; color?: TagColor }) {
  const fills: Record<TagColor, { body: string; stroke: string; text: string }> = {
    yellow: { body: '#eab308', stroke: '#713f12', text: '#1c1917' },
    orange: { body: '#fed7aa', stroke: '#f97316', text: '#7c2d12' },
    green:  { body: '#bbf7d0', stroke: '#16a34a', text: '#14532d' },
    blue:   { body: '#bfdbfe', stroke: '#3b82f6', text: '#1e3a8a' },
    red:    { body: '#fecaca', stroke: '#ef4444', text: '#7f1d1d' },
  };
  const c = fills[color] ?? fills.yellow;
  return (
    <svg width="100" height="90" viewBox="0 0 110 100" style={{ display: 'block' }}>
      <rect x="40" y="2" width="30" height="18" rx="6" fill={c.body} stroke={c.stroke} strokeWidth="2" />
      <circle cx="55" cy="11" r="4.5" fill="#e5e7eb" stroke={c.stroke} strokeWidth="1.5" />
      <circle cx="55" cy="11" r="2" fill="white" />
      <rect x="2" y="14" width="106" height="84" rx="14" fill={c.body} stroke={c.stroke} strokeWidth="2" />
      <text x="55" y="57" fontSize="6.5" fill={c.text} fontFamily="monospace" textAnchor="middle" letterSpacing="1.5">EAR TAG</text>
      <text x="55" y="70" fontSize="11" fill={c.text} fontFamily="monospace" fontWeight="bold" textAnchor="middle">{(serial ?? 'PENDING').slice(-10)}</text>
    </svg>
  );
}

function UnassignedTag() {
  return (
    <svg width="100" height="90" viewBox="0 0 110 100" style={{ display: 'block' }}>
      <rect x="40" y="2" width="30" height="18" rx="6" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
      <circle cx="55" cy="11" r="4.5" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.5" />
      <circle cx="55" cy="11" r="2" fill="white" />
      <rect x="2" y="14" width="106" height="84" rx="14" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="6 3" />
      <text x="55" y="62" fontSize="8" fill="#cbd5e1" fontFamily="monospace" fontWeight="bold" textAnchor="middle">UNTAGGED</text>
    </svg>
  );
}

// ── Region centre coordinates for mini-map (viewBox 0 0 100 130) ─────────────

const REGION_DOT: Record<string, [number, number]> = {
  awdal:        [15, 12],
  woqooyi:      [25, 10],
  togdheer:     [38, 12],
  sanaag:       [55, 10],
  bari:         [82, 28],
  sool:         [48, 22],
  nugaal:       [65, 35],
  mudug:        [68, 52],
  galgaduud:    [60, 65],
  hiiraan:      [45, 72],
  bakool:       [22, 75],
  bay:          [28, 85],
  middle_shab:  [50, 82],
  banaadir:     [55, 95],
  lower_shab:   [40, 100],
  gedo:         [14, 88],
  middle_jubba: [22, 100],
  lower_jubba:  [40, 112],
};

function MiniSomaliaMap({ regionId, regionName }: { regionId: string | null; regionName?: string }) {
  const dot = regionId ? REGION_DOT[regionId] : null;
  return (
    <div className={s.miniMap}>
      <svg width="90" height="117" viewBox="0 0 100 130" style={{ display: 'block' }}>
        <path
          d="M 12,18 L 22,6 L 40,2 L 58,5 L 72,10 L 83,20 L 92,35 L 90,55 L 88,72 L 83,88 L 75,102 L 62,112 L 48,116 L 35,112 L 22,105 L 12,95 L 8,80 L 8,60 L 10,42 L 8,28 Z"
          fill="#f1f5f9"
          stroke="#cbd5e1"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {dot && (
          <>
            <circle cx={dot[0]} cy={dot[1]} r={7} fill="#6366f1" opacity={0.15} />
            <circle cx={dot[0]} cy={dot[1]} r={4} fill="#6366f1" />
            <circle cx={dot[0]} cy={dot[1]} r={1.8} fill="white" />
          </>
        )}
      </svg>
      {regionName && (
        <span className={s.miniMapLabel}>{regionName}</span>
      )}
    </div>
  );
}

// ── Marker icon factories ──────────────────────────────────────────────────────

function makePremisesMarkerIcon(selected: boolean) {
  if (selected) {
    return L.divIcon({
      className: '',
      html: '<div style="width:18px;height:18px;border-radius:50%;background:#f97316;border:3px solid #fff;box-shadow:0 0 0 2px #fed7aa;"></div>',
      iconSize:   [18, 18] as [number, number],
      iconAnchor: [9,  9]  as [number, number],
    });
  }
  return L.divIcon({
    className: '',
    html: '<div style="width:13px;height:13px;border-radius:50%;background:#16a34a;border:3px solid #fff;box-shadow:0 0 0 2px #86efac;"></div>',
    iconSize:   [13, 13] as [number, number],
    iconAnchor: [6,  6]  as [number, number],
  });
}

function makeMarkerIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:22px;height:22px;">
      <div style="width:22px;height:22px;border-radius:50%;background:#6366f1;border:3px solid #fff;box-shadow:0 2px 10px rgba(99,102,241,0.55);"></div>
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:46px;height:46px;border-radius:50%;background:rgba(99,102,241,0.15);"></div>
    </div>`,
    iconSize:   [22, 22] as [number, number],
    iconAnchor: [11, 11] as [number, number],
  });
}

// ── Square premises map (in card) ─────────────────────────────────────────────

function PremisesLeafletMap({ premisesId, lat, lng, code, onExpand, allMarkers }: {
  premisesId: string; lat: number; lng: number; name: string; code: string; onExpand: () => void;
  allMarkers: Array<{ id: string; lat?: number; lng?: number }>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);
  const markersRef   = useRef(allMarkers);
  markersRef.current = allMarkers;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [5.5, 46.5], zoom: 6, zoomControl: false, attributionControl: false,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(map);

    // Other premises first (green dots)
    for (const m of markersRef.current) {
      if (m.id === premisesId || m.lat == null || m.lng == null) continue;
      L.marker([m.lat, m.lng], { icon: makePremisesMarkerIcon(false) }).addTo(map);
    }
    // Selected premises on top (orange dot)
    L.marker([lat, lng], { icon: makePremisesMarkerIcon(true) }).addTo(map);

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, premisesId]);

  return (
    <div className={s.premisesMapSquare}>
      <div ref={containerRef} className={s.premisesMapInner} />
      <button className={s.premisesMapExpandBtn} onClick={onExpand} title="Open full map">
        <Maximize2 size={13} />
        <span>Full Map</span>
      </button>
      <div className={s.premisesMapCoords}>{lat.toFixed(4)}, {lng.toFixed(4)}</div>
    </div>
  );
}

// ── Full-screen map modal ──────────────────────────────────────────────────────

function FullMapModal({ lat, lng, name, code, onClose }: {
  lat: number; lng: number; name: string; code: string; onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [lat, lng], zoom: 14, zoomControl: true, attributionControl: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(map);
    L.marker([lat, lng], { icon: makeMarkerIcon() })
      .addTo(map)
      .bindPopup(`<strong>${name}</strong><br/><code style="font-size:11px">${code}</code><br/><span style="font-size:11px;color:#64748b">${lat.toFixed(6)}, ${lng.toFixed(6)}</span>`)
      .openPopup();
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [lat, lng, name, code]);

  return (
    <div className={s.fullMapOverlay} onClick={onClose}>
      <div className={s.fullMapCard} onClick={e => e.stopPropagation()}>
        <div className={s.fullMapHeader}>
          <Building2 size={16} color="#6366f1" />
          <span className={s.fullMapTitle}>{name}</span>
          <span className={s.fullMapCode}>{code}</span>
          <button className={s.fullMapClose} onClick={onClose}><X size={16} /></button>
        </div>
        <div ref={containerRef} className={s.fullMapContainer} />
        <div className={s.fullMapFooter}>
          <span className={s.fullMapDot} />
          {lat.toFixed(6)}, {lng.toFixed(6)}
        </div>
      </div>
    </div>
  );
}

// ── Status colour map ──────────────────────────────────────────────────────────

const STATUS_PIN_COLOR: Record<string, string> = {
  APPROVED:     '#16a34a',
  SUBMITTED:    '#2563eb',
  UNDER_REVIEW: '#7c3aed',
  PENDING:      '#d97706',
  REJECTED:     '#dc2626',
  SUSPENDED:    '#dc2626',
};

// ── Full-country Leaflet map with all premises pins ────────────────────────────

// ── Type-based SVG marker ──────────────────────────────────────────────────────
function premisesEmoji(type: string): string {
  const t = (type ?? '').toUpperCase().replace(/[\s-]+/g, '_');
  if (t.includes('WATER'))                              return '💧';
  if (t.includes('MARKET'))                             return '🏪';
  if (t.includes('GRAZING'))                            return '🌿';
  if (t.includes('CAMP') || t.includes('HOLDING') || t.includes('PASTORAL')) return '⛺';
  if (t.includes('ABATTOIR') || t.includes('SLAUGHTER')) return '🔪';
  if (t.includes('QUARANTINE'))                         return '🏥';
  if (t.includes('DIPPING'))                            return '🛁';
  return '🏡'; // Farm default
}

function facilityEmoji(type: string): string {
  if (type === 'QUARANTINE_STATION') return '🏥';
  if (type === 'SLAUGHTERHOUSE')     return '🔪';
  if (type === 'CHECKPOINT')         return '🚧';
  return '🏛️';
}

function icon3d(emoji: string, borderColor = 'rgba(0,0,0,0.1)', size = 32): string {
  return `<div style="
    width:${size}px;height:${size}px;
    background:#fff;
    border-radius:9px;
    box-shadow:0 4px 10px rgba(0,0,0,0.18),0 1px 3px rgba(0,0,0,0.1),inset 0 -2px 0 rgba(0,0,0,0.07);
    border:1.5px solid ${borderColor};
    display:flex;align-items:center;justify-content:center;
    font-size:${Math.round(size * 0.56)}px;cursor:pointer;
  ">${emoji}</div>`;
}

function buildMarkerHtml(p: FlatPremises, showNames: boolean, color: string): string {
  const shortName = p.name.length > 20 ? p.name.slice(0, 19) + '…' : p.name;
  const dot = icon3d(premisesEmoji(p.type), `${color}55`);
  const label = showNames ? `
    <div style="margin-top:4px;background:rgba(255,255,255,0.97);border:1px solid ${color}33;padding:3px 7px;border-radius:5px;box-shadow:0 2px 6px rgba(0,0,0,0.15);text-align:center;white-space:nowrap;">
      <div style="font-size:10px;font-weight:800;color:#1e3a8a;font-family:system-ui,-apple-system,sans-serif;letter-spacing:0.01em;">${p.code}</div>
      <div style="font-size:9px;font-weight:600;color:#374151;margin-top:1px;max-width:120px;overflow:hidden;text-overflow:ellipsis;">${shortName}</div>
    </div>` : '';
  return `<div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;">${dot}${label}</div>`;
}

const FACILITY_COLOR: Record<string, string> = {
  QUARANTINE_STATION: '#d97706',
  SLAUGHTERHOUSE:     '#dc2626',
  CHECKPOINT:         '#7c3aed',
};

function AllPremisesLeafletMap({
  premises,
  facilities,
  showNames,
  showFacilities,
  onViewDetails,
}: {
  premises: FlatPremises[];
  facilities: Facility[];
  showNames: boolean;
  showFacilities: boolean;
  onViewDetails: (p: FlatPremises) => void;
}) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<L.Map | null>(null);
  const markersRef    = useRef<L.Marker[]>([]);
  const premisesRef   = useRef(premises);
  const onViewRef     = useRef(onViewDetails);
  premisesRef.current = premises;
  onViewRef.current   = onViewDetails;

  // Create map + draw markers; re-draw markers when showNames/premises changes
  useEffect(() => {
    if (!containerRef.current) return;
    let map = mapRef.current;
    if (!map) {
      map = L.map(containerRef.current, { center: [5.5, 46.5], zoom: 6, zoomControl: true, attributionControl: true });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(map);
      mapRef.current = map;
    }
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    for (const p of premises) {
      if (p.lat == null || p.lng == null) continue;
      const color        = STATUS_PIN_COLOR[p.status] ?? '#64748b';
      const totalAnimals = p.batches.reduce((s, b) => s + b.count, 0);
      const icon = L.divIcon({
        className: '',
        html: buildMarkerHtml(p, showNames, color),
        iconSize:    showNames ? [140, 68] as [number, number] : [32, 32] as [number, number],
        iconAnchor:  showNames ? [70,  16] as [number, number] : [16, 16] as [number, number],
        popupAnchor: [0, -8] as [number, number],
      });
      const marker = L.marker([p.lat, p.lng], { icon });
      marker.addTo(map).bindPopup(
        L.popup({ maxWidth: 260, offset: [0, 10] as [number, number] }).setContent(`
          <div style="font-family:system-ui,sans-serif;min-width:220px;">
            <div style="font-weight:700;font-size:0.9rem;color:#0f172a;margin-bottom:5px;">${p.name}</div>
            <code style="font-size:0.875rem;background:#eff6ff;padding:3px 9px;border-radius:5px;color:#1e3a8a;font-weight:800;letter-spacing:0.03em;">${p.code}</code>
            <div style="margin-top:10px;display:flex;flex-direction:column;gap:5px;font-size:0.775rem;color:#64748b;">
              <div><strong style="color:#374151">Type:</strong> ${p.type.replace(/_/g, ' ')}</div>
              <div><strong style="color:#374151">Region:</strong> ${p.regionName}</div>
              <div><strong style="color:#374151">Owner:</strong> ${p.owner}</div>
              <div><strong style="color:#374151">Phone:</strong> ${p.phone}</div>
              <div><strong style="color:#374151">Animals:</strong> ${totalAnimals}</div>
              <div><strong style="color:#374151">Status:</strong> <span style="color:${color};font-weight:700;">${p.status}</span></div>
            </div>
            <button data-premisesid="${p.id}"
              style="margin-top:12px;width:100%;padding:8px;background:#0f2170;color:#fff;border:none;border-radius:7px;font-size:0.775rem;font-weight:700;cursor:pointer;font-family:inherit;letter-spacing:0.02em;">
              View Full Details →
            </button>
          </div>
        `)
      );
      markersRef.current.push(marker);
    }

    // Draw facility markers
    if (showFacilities) {
      for (const f of facilities) {
        if (f.lat == null || f.lng == null) continue;
        const color = FACILITY_COLOR[f.type] ?? '#64748b';
        const dot3d = icon3d(facilityEmoji(f.type), `${color}66`, 30);
        const label = showNames ? `
          <div style="margin-top:4px;background:rgba(255,255,255,0.97);border:1px solid ${color}55;padding:3px 7px;border-radius:5px;box-shadow:0 2px 6px rgba(0,0,0,0.15);text-align:center;white-space:nowrap;">
            <div style="font-size:10px;font-weight:800;color:${color};font-family:system-ui,-apple-system,sans-serif;letter-spacing:0.01em;">${f.code}</div>
            <div style="font-size:9px;font-weight:600;color:#374151;margin-top:1px;max-width:120px;overflow:hidden;text-overflow:ellipsis;">${f.name.length > 20 ? f.name.slice(0, 19) + '…' : f.name}</div>
          </div>` : '';
        const icon = L.divIcon({
          className: '',
          html: `<div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;">${dot3d}${label}</div>`,
          iconSize:   showNames ? [140, 66] as [number, number] : [30, 30] as [number, number],
          iconAnchor: showNames ? [70,  15] as [number, number] : [15, 15] as [number, number],
          popupAnchor: [0, -8] as [number, number],
        });
        const fMarker = L.marker([f.lat, f.lng], { icon });
        fMarker.addTo(map).bindPopup(
          L.popup({ maxWidth: 260, offset: [0, 10] as [number, number] }).setContent(`
            <div style="font-family:system-ui,sans-serif;min-width:220px;">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
                <span style="padding:2px 8px;border-radius:12px;background:${color}22;color:${color};font-size:0.65rem;font-weight:800;text-transform:uppercase;letter-spacing:0.07em;">${f.type.replace(/_/g, ' ')}</span>
              </div>
              <div style="font-weight:700;font-size:0.9rem;color:#0f172a;margin-bottom:4px;">${f.name}</div>
              <code style="font-size:0.875rem;background:#fef3c7;padding:3px 9px;border-radius:5px;color:${color};font-weight:800;">${f.code}</code>
              <div style="margin-top:10px;display:flex;flex-direction:column;gap:5px;font-size:0.775rem;color:#64748b;">
                ${f.checkpointType ? `<div><strong style="color:#374151">Checkpoint:</strong> ${f.checkpointType}</div>` : ''}
                ${f.capacity != null ? `<div><strong style="color:#374151">Capacity:</strong> ${f.capacity} animals</div>` : ''}
                ${f.speciesHandled ? `<div><strong style="color:#374151">Species:</strong> ${f.speciesHandled}</div>` : ''}
                ${f.contactName ? `<div><strong style="color:#374151">Contact:</strong> ${f.contactName}${f.contactPhone ? ` · ${f.contactPhone}` : ''}</div>` : ''}
                <div><strong style="color:#374151">Status:</strong> <span style="color:${color};font-weight:700;">${f.status}</span></div>
              </div>
            </div>
          `)
        );
        markersRef.current.push(fMarker);
      }
    }

    return () => { mapRef.current?.remove(); mapRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNames, showFacilities, premises, facilities]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-premisesid]');
      if (!btn) return;
      const found = premisesRef.current.find(x => x.id === btn.dataset.premisesid);
      if (found) onViewRef.current(found);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}

// ── Activity Monitor Panel ─────────────────────────────────────────────────────

const CAT_COLOR: Record<string, { bg: string; text: string; label: string }> = {
  ANIMAL:        { bg: '#1d4ed8',  text: '#93c5fd', label: 'Animal'        },
  MOVEMENT:      { bg: '#92400e',  text: '#fcd34d', label: 'Movement'      },
  HEALTH:        { bg: '#991b1b',  text: '#fca5a5', label: 'Health'        },
  PREMISES:      { bg: '#1e3a5f',  text: '#94a3b8', label: 'Premises'      },
  TAGGING:       { bg: '#7c2d12',  text: '#fdba74', label: 'Tagging'       },
  VACCINATION:   { bg: '#065f46',  text: '#6ee7b7', label: 'Vaccination'   },
  CERTIFICATION: { bg: '#4c1d95',  text: '#c4b5fd', label: 'Certification' },
  QUARANTINE:    { bg: '#7f1d1d',  text: '#f87171', label: 'Quarantine'    },
};

interface ActivityRow {
  id: string; title: string; category: string;
  created_at: string;
  actor_name: string | null; actor_role: string | null;
  region: string | null; level: string | null;
  detail: string | null; reference_code: string | null;
  portal: string | null;
}

const LEVEL_STYLE: Record<string, { bg: string; color: string }> = {
  INFO:    { bg: '#eff6ff', color: '#2563eb' },
  WARNING: { bg: '#fffbeb', color: '#d97706' },
  ERROR:   { bg: '#fef2f2', color: '#dc2626' },
  SUCCESS: { bg: '#f0fdf4', color: '#16a34a' },
};

function relMin(ts: string): string {
  const d = Math.floor((Date.now() - new Date(ts).getTime()) / 60_000);
  if (d < 1)    return 'just now';
  if (d < 60)   return `${d}m ago`;
  if (d < 1440) return `${Math.floor(d / 60)}h ago`;
  return `${Math.floor(d / 1440)}d ago`;
}

function timeHHMM(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function dateDDMM(ts: string): string {
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function ActivityMonitorPanel() {
  const [rows, setRows]       = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick]       = useState(0);
  const [lastAt, setLastAt]   = useState<Date | null>(null);

  async function fetchRows() {
    const since = new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString();
    const { data } = await supabase
      .from('activity_log')
      .select('id, title, category, created_at, actor_name, actor_role, region, level, detail, reference_code, portal')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(200);
    setRows((data ?? []) as ActivityRow[]);
    setLastAt(new Date());
    setLoading(false);
  }

  useEffect(() => {
    void fetchRows();
    const poll = setInterval(() => void fetchRows(), 30_000);
    return () => clearInterval(poll);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const secsAgo = lastAt ? Math.floor((Date.now() - lastAt.getTime()) / 1000) : null;

  return (
    <div style={{
      position: 'absolute', top: 12, right: 12, bottom: 12,
      width: 390,
      background: '#ffffff',
      border: '1.5px solid #e2e8f0',
      borderRadius: 14,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
      zIndex: 1000,
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>

      {/* ── Header ── */}
      <div style={{ padding: '12px 14px 10px', borderBottom: '1.5px solid #f1f5f9', background: '#f8fafc', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ position: 'relative', width: 10, height: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e', position: 'relative', zIndex: 1 }} />
              <div style={{
                position: 'absolute', width: 16, height: 16, borderRadius: '50%',
                background: 'rgba(34,197,94,0.25)',
                transform: `scale(${tick % 2 === 0 ? 1 : 1.4})`,
                transition: 'transform 0.9s ease',
              }} />
            </div>
            <span style={{ color: '#0f172a', fontWeight: 700, fontSize: '0.875rem' }}>Live Activity Monitor</span>
          </div>
          <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: 20, letterSpacing: '0.06em' }}>● LIVE</span>
        </div>
        <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#64748b', fontSize: '0.72rem' }}>Last 48 hours · <strong style={{ color: '#0f172a' }}>{rows.length}</strong> events</span>
          <span style={{ color: secsAgo != null && secsAgo < 5 ? '#16a34a' : '#94a3b8', fontSize: '0.7rem', fontWeight: 600 }}>
            {secsAgo != null ? (secsAgo < 5 ? '✓ refreshed' : `↻ ${secsAgo}s`) : ''}
          </span>
        </div>
      </div>

      {/* ── Event list ── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {loading && (
          <div style={{ color: '#94a3b8', fontSize: '0.825rem', textAlign: 'center', padding: '2.5rem' }}>Loading events…</div>
        )}
        {!loading && rows.length === 0 && (
          <div style={{ color: '#94a3b8', fontSize: '0.825rem', textAlign: 'center', padding: '2.5rem' }}>No activity in the last 48 hours.</div>
        )}
        {rows.map((r, i) => {
          const cat   = CAT_COLOR[r.category] ?? { bg: '#e2e8f0', text: '#475569', label: r.category };
          const lvl   = r.level ? (LEVEL_STYLE[r.level] ?? { bg: '#f1f5f9', color: '#64748b' }) : null;
          const isNew = i === 0;
          return (
            <div key={r.id} style={{
              padding: '10px 14px',
              borderBottom: '1px solid #f1f5f9',
              background: isNew ? '#f0fdf4' : '#fff',
              transition: 'background 0.5s',
            }}>

              {/* Row 1: time + category + level */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', fontWeight: 700, color: '#0f172a' }}>{timeHHMM(r.created_at)}</span>
                <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{dateDDMM(r.created_at)}</span>
                <span style={{ fontSize: '0.62rem', color: '#cbd5e1' }}>·</span>
                <span style={{ fontSize: '0.65rem', color: '#64748b' }}>{relMin(r.created_at)}</span>
                <span style={{
                  marginLeft: 'auto',
                  background: cat.bg, color: cat.text,
                  fontSize: '0.6rem', fontWeight: 700,
                  padding: '2px 6px', borderRadius: 4,
                  letterSpacing: '0.04em', textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}>{cat.label}</span>
                {lvl && r.level && (
                  <span style={{
                    background: lvl.bg, color: lvl.color,
                    fontSize: '0.6rem', fontWeight: 700,
                    padding: '2px 6px', borderRadius: 4,
                    letterSpacing: '0.04em', textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}>{r.level}</span>
                )}
              </div>

              {/* Row 2: title */}
              <div style={{ color: '#0f172a', fontSize: '0.8125rem', fontWeight: 600, lineHeight: 1.4, marginBottom: r.detail ? 4 : 0 }}>
                {r.title}
              </div>

              {/* Row 3: detail */}
              {r.detail && (
                <div style={{ color: '#475569', fontSize: '0.75rem', lineHeight: 1.45, marginBottom: 6 }}>
                  {r.detail}
                </div>
              )}

              {/* Row 4: meta pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 5 }}>
                {r.actor_name && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 5, padding: '2px 7px', fontSize: '0.68rem', color: '#374151', fontWeight: 500 }}>
                    👤 by {r.actor_name}{r.actor_role ? ` · ${r.actor_role}` : ''}
                  </span>
                )}
                {r.region && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 5, padding: '2px 7px', fontSize: '0.68rem', color: '#374151', fontWeight: 500 }}>
                    📍 {r.region}
                  </span>
                )}
                {r.reference_code && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 5, padding: '2px 7px', fontSize: '0.68rem', color: '#1e40af', fontWeight: 700, fontFamily: 'monospace' }}>
                    {r.reference_code}
                  </span>
                )}
                {r.portal && (
                  <span style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 5, padding: '2px 7px', fontSize: '0.65rem', color: '#64748b', fontWeight: 500 }}>
                    {r.portal}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Footer ── */}
      <div style={{
        padding: '7px 14px', borderTop: '1.5px solid #f1f5f9',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: '#f8fafc', flexShrink: 0,
      }}>
        <span style={{ color: '#94a3b8', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.04em' }}>QXLITS · MINISTRY PORTAL</span>
        <span style={{ color: '#94a3b8', fontSize: '0.65rem' }}>auto-refresh 30s</span>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

const ACTIVE_STATUSES    = new Set(['TAGGED', 'APPROVED', 'SUBMITTED', 'UNDER_REVIEW', 'PENDING', 'ACTIVE']);
const COMPLETED_STATUSES = new Set(['COMPLETED', 'CLOSED', 'EXPORTED', 'SLAUGHTERED', 'CANCELLED']);

const PREMISES_TABS = ['Registration', 'Incoming', 'Available', 'Outgoing', 'Quarantine', 'Slaughterhouse', 'Exported', 'Activity Log'] as const;
type PremisesTab = typeof PREMISES_TABS[number];

interface PremisesLog {
  id: string; category: string; level: string;
  title: string; detail: string | null;
  actorRole: string | null; createdAt: string;
}

interface MovAnimal {
  id: string; tagSerial: string | null; species: string; breed: string; gender: string;
  photoUrl: string | null; marks: string | null; healthStatus: string | null;
}

interface PremisesMovement {
  id: string; movementCode: string; status: string;
  originPremisesCode: string; originPremisesName: string;
  originRegionCode: string | null;
  destinationPremisesCode: string; destinationPremisesName: string;
  movementTypeCode: string; purpose: string | null;
  plannedDepartureDate: string | null; plannedArrivalDate: string | null;
  animalCount: number | null; vehicleRegistration: string | null;
  transporterName: string | null; routeDescription: string | null;
  speciesNotes: string | null; notes: string | null;
  userId: string | null;
  animalIds: string[];
  createdAt: string;
}

type FlatPremises = Premises & { regionId: string; regionName: string };

export function SomaliaMapPage(): JSX.Element {
  const [selectedId, setSelectedId]                             = useState<string | null>(null);
  const [selectedPremises, setSelectedPremises]                 = useState<Premises | null>(null);
  const [selectedBatch, setSelectedBatch]                       = useState<Batch | null>(null);
  const [showAll, setShowAll]                                   = useState(true);
  const [allPremisesVisible, setAllPremisesVisible]             = useState(20);
  const [listView, setListView]                                 = useState(false);
  const [mapView,  setMapView]                                  = useState(false);
  const [listFilter, setListFilter]                             = useState('');
  const [selectedPremisesRegionId, setSelectedPremisesRegionId] = useState<string | null>(null);
  const [premisesTab, setPremisesTab]                           = useState<PremisesTab>('Available');
  const [showFullMap, setShowFullMap]                           = useState(false);
  const [pendingDismissed, setPendingDismissed]                 = useState(false);
  const [approvingId, setApprovingId]                           = useState<string | null>(null);

  // Live DB state
  const [premisesByRegion, setPremisesByRegion] = useState<Record<string, Premises[]>>({});
  const [allPremisesFlat, setAllPremisesFlat]   = useState<FlatPremises[]>([]);
  const [facilities,       setFacilities]        = useState<Facility[]>([]);
  const [showFacilities,   setShowFacilities]    = useState(true);
  const [totalAnimalsCount, setTotalAnimalsCount] = useState(0);
  const [dbLoading, setDbLoading]               = useState(true);
  const [premisesBatches, setPremisesBatches]   = useState<Batch[]>([]);
  const [premisesAnimals, setPremisesAnimals]   = useState<BatchAnimal[]>([]);
  const [batchAnimals,    setBatchAnimals]       = useState<BatchAnimal[]>([]);
  const [batchAnimLoading, setBatchAnimLoading] = useState(false);
  const [inMovements,     setInMovements]       = useState<PremisesMovement[]>([]);
  const [outMovements,    setOutMovements]       = useState<PremisesMovement[]>([]);
  const [premisesPhotos,  setPremisesPhotos]     = useState<PremisesPhoto[]>([]);
  const [premisesLog,     setPremisesLog]         = useState<PremisesLog[]>([]);
  const [logLoading,      setLogLoading]           = useState(false);
  const [suspendModal,    setSuspendModal]         = useState(false);
  const [movModal,        setMovModal]             = useState<PremisesMovement | null>(null);
  const [movAnimals,      setMovAnimals]           = useState<Record<string, MovAnimal[]>>({});
  const [movAnimLoading,  setMovAnimLoading]       = useState<Set<string>>(new Set());
  const [movFarmers,      setMovFarmers]           = useState<Record<string, { id: string; name: string; code: string }>>({});
  const [showMapNames,    setShowMapNames]         = useState(true);
  const [suspendReason,   setSuspendReason]        = useState('');
  const [suspending,      setSuspending]           = useState(false);

  const { roles } = useAuthStore();
  const navigate = useNavigate();

  // Load premises + batches + farmers on mount
  useEffect(() => {
    async function load() {
      const [pRes, bRes, fRes] = await Promise.all([
        supabase.from('farmer_premises')
          .select('id, premises_code, premises_name, premises_type, status, region_code, gps_latitude, gps_longitude, user_id, area_hectares, license_number, license_expiry_date, is_temporary, temporary_end_date, physical_address, capacity_animals, allowed_species, notes, created_at'),
        supabase.from('batches')
          .select('id, batch_code, batch_name, species, breed, count, status, created_at, premises_code'),
        supabase.rpc('get_all_farmers', { p_status: null, p_region: null }),
      ]);

      const rawPremises = (pRes.data ?? []) as Record<string, unknown>[];
      const rawBatches  = (bRes.data ?? []) as Record<string, unknown>[];

      // Build user_id → farmer lookup
      const farmerByUserId = new Map<string, { id: string; name: string; phone: string }>();
      ((fRes.data ?? []) as Record<string, unknown>[]).forEach(f => {
        const uid = f.user_id as string | null;
        if (uid) farmerByUserId.set(uid, { id: f.id as string, name: (f.full_name as string) ?? '—', phone: (f.phone_e164 as string) ?? '—' });
      });

      const batchByCode: Record<string, Batch[]> = {};
      for (const b of rawBatches) {
        const code = b.premises_code as string;
        if (!code) continue;
        if (!batchByCode[code]) batchByCode[code] = [];
        batchByCode[code].push({
          id:        b.id as string,
          batchCode: (b.batch_code as string) ?? '',
          batchName: (b.batch_name as string) ?? '',
          species:   (b.species as string) ?? '',
          breed:     (b.breed as string) ?? '',
          count:     Number(b.count ?? 0),
          status:    (b.status as string) ?? 'DRAFT',
          createdAt: (b.created_at as string) ?? '',
          animals:   [],
        });
      }

      const byRegion: Record<string, Premises[]> = {};
      const flat: FlatPremises[] = [];

      for (const p of rawPremises) {
        const regionCode = (p.region_code as string) ?? '';
        const regionId   = REGION_CODE_TO_ID[regionCode];
        if (!regionId) continue;
        const regionName = REGIONS.find(r => r.id === regionId)?.name ?? regionId;
        const code = p.premises_code as string;
        const uid  = p.user_id as string | null;
        const farmer = uid ? farmerByUserId.get(uid) : undefined;
        const pObj: Premises = {
          id:              p.id as string,
          code,
          name:            (p.premises_name as string) ?? code,
          owner:           farmer?.name  ?? '—',
          ownerId:         farmer?.id,
          phone:           farmer?.phone ?? '—',
          type:            (p.premises_type as string) ?? '',
          status:          (p.status as string) ?? 'PENDING',
          lat:             p.gps_latitude  != null ? Number(p.gps_latitude)  : undefined,
          lng:             p.gps_longitude != null ? Number(p.gps_longitude) : undefined,
          areaHectares:    p.area_hectares != null ? Number(p.area_hectares) : undefined,
          licenseNumber:   (p.license_number as string) || undefined,
          licenseExpiryDate:(p.license_expiry_date as string) || undefined,
          isTemporary:     Boolean(p.is_temporary),
          temporaryEndDate:(p.temporary_end_date as string) || undefined,
          physicalAddress: (p.physical_address as string) || undefined,
          capacityAnimals: p.capacity_animals != null ? Number(p.capacity_animals) : undefined,
          allowedSpecies:  (p.allowed_species as string) || undefined,
          notes:           (p.notes as string) || undefined,
          createdAt:       (p.created_at as string) || undefined,
          batches:         batchByCode[code] ?? [],
        };
        if (!byRegion[regionId]) byRegion[regionId] = [];
        byRegion[regionId].push(pObj);
        flat.push({ ...pObj, regionId, regionName });
      }

      const byDate = (a: Premises, b: Premises) =>
        (b.createdAt ?? '').localeCompare(a.createdAt ?? '');

      flat.sort(byDate);
      for (const rid of Object.keys(byRegion)) byRegion[rid].sort(byDate);

      const total = flat.reduce((s, p) => s + p.batches.reduce((b, bt) => b + bt.count, 0), 0);
      setPremisesByRegion(byRegion);
      setAllPremisesFlat(flat);
      setTotalAnimalsCount(total);

      // Load facilities (quarantine stations, slaughterhouses, checkpoints)
      const { data: facData } = await supabase
        .from('facilities')
        .select('id, facility_code, facility_name, facility_type, checkpoint_type, status, region_code, latitude, longitude, capacity, contact_name, contact_phone, species_handled');
      setFacilities((facData ?? []).map((f: Record<string, unknown>) => ({
        id:             f.id as string,
        code:           (f.facility_code as string) ?? '',
        name:           (f.facility_name as string) ?? '',
        type:           (f.facility_type as string) ?? '',
        checkpointType: (f.checkpoint_type as string) ?? undefined,
        status:         (f.status as string) ?? 'ACTIVE',
        regionCode:     (f.region_code as string) ?? '',
        lat:            f.latitude != null ? Number(f.latitude) : undefined,
        lng:            f.longitude != null ? Number(f.longitude) : undefined,
        capacity:       f.capacity != null ? Number(f.capacity) : undefined,
        contactName:    (f.contact_name as string) ?? undefined,
        contactPhone:   (f.contact_phone as string) ?? undefined,
        speciesHandled: Array.isArray(f.species_handled) ? (f.species_handled as string[]).join(', ') : undefined,
      })));

      setDbLoading(false);
    }
    void load();
  }, []);

  useEffect(() => {
    if (premisesTab === 'Activity Log' && selectedPremises) void loadPremisesLog(selectedPremises.id);
  }, [premisesTab, selectedPremises?.id]);

  const selectedRegion = REGIONS.find(r => r.id === selectedId);
  const regionPremises = selectedId ? (premisesByRegion[selectedId] ?? []) : [];

  async function updatePremisesStatus(id: string, newStatus: 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'ACTIVE', reason?: string) {
    setApprovingId(id);
    const { error } = await supabase
      .from('farmer_premises')
      .update({ status: newStatus })
      .eq('id', id);
    if (error) {
      console.error('updatePremisesStatus failed:', error.message);
      alert(`Failed to update status: ${error.message}`);
      setApprovingId(null);
      return;
    }
    const p = selectedPremises ?? allPremisesFlat.find(x => x.id === id);
    const levelMap  = { APPROVED: 'SUCCESS', REJECTED: 'ERROR', SUSPENDED: 'WARNING', ACTIVE: 'SUCCESS' } as const;
    const titleMap  = { APPROVED: 'Premises approved', REJECTED: 'Premises rejected', SUSPENDED: 'Premises suspended', ACTIVE: 'Premises reinstated' };
    void logActivity({
      category:    'PREMISES',
      level:       levelMap[newStatus],
      title:       `${titleMap[newStatus]}: ${p?.name ?? id}`,
      detail:      reason ? `Reason: ${reason}` : undefined,
      referenceCode: p?.code,
      premisesId:  id,
      actorRole:   roles[0] ?? 'MINISTRY_OFFICER',
    });
    setAllPremisesFlat(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
    setPremisesByRegion(prev => {
      const next = { ...prev };
      for (const rid of Object.keys(next)) {
        next[rid] = next[rid].map(p => p.id === id ? { ...p, status: newStatus } : p);
      }
      return next;
    });
    setSelectedPremises(prev => prev?.id === id ? { ...prev, status: newStatus } : prev);
    setApprovingId(null);
    if (premisesTab === 'Activity Log' && id === selectedPremises?.id) void loadPremisesLog(id);
  }

  async function loadPremisesLog(id: string) {
    setLogLoading(true);
    const { data } = await supabase
      .from('activity_log')
      .select('id, category, level, title, detail, actor_role, created_at')
      .eq('premises_id', id)
      .order('created_at', { ascending: false });
    setPremisesLog((data ?? []).map(r => ({
      id:        r.id as string,
      category:  r.category as string,
      level:     r.level as string,
      title:     r.title as string,
      detail:    r.detail as string | null,
      actorRole: r.actor_role as string | null,
      createdAt: r.created_at as string,
    })));
    setLogLoading(false);
  }

  async function handleSuspend() {
    if (!selectedPremises || suspendReason.trim().length < 10) return;
    setSuspending(true);
    await updatePremisesStatus(selectedPremises.id, 'SUSPENDED', suspendReason.trim());
    setSuspendModal(false);
    setSuspendReason('');
    setSuspending(false);
  }

  async function openPremises(p: Premises, regionId: string | null) {
    setSelectedPremises(p);
    setSelectedPremisesRegionId(regionId);
    setPremisesTab('Registration');
    setShowFullMap(false);
    setSelectedBatch(null);
    setPremisesBatches([]);
    setPremisesAnimals([]);
    setInMovements([]);
    setOutMovements([]);
    setMovFarmers({});
    setPremisesPhotos([]);

    const [bRes, aRes, outRes, inRes, photoRes] = await Promise.all([
      supabase.from('batches')
        .select('id, batch_code, batch_name, species, breed, count, status, created_at')
        .eq('premises_code', p.code)
        .order('created_at', { ascending: false }),
      supabase.from('farmer_animals')
        .select('id, animal_tag_id, species, breed, gender, status, date_of_birth')
        .eq('premises_code', p.code)
        .limit(200),
      supabase.from('farmer_movement_requests')
        .select('id, movement_code, status, origin_premises_code, origin_premises_name, origin_region_code, destination_premises_code, destination_premises_name, movement_type_code, purpose, planned_departure_date, planned_arrival_date, animal_count, vehicle_registration, transporter_name, route_description, species_notes, notes, user_id, animal_ids, created_at')
        .eq('origin_premises_code', p.code)
        .order('created_at', { ascending: false }),
      supabase.from('farmer_movement_requests')
        .select('id, movement_code, status, origin_premises_code, origin_premises_name, origin_region_code, destination_premises_code, destination_premises_name, movement_type_code, purpose, planned_departure_date, planned_arrival_date, animal_count, vehicle_registration, transporter_name, route_description, species_notes, notes, user_id, animal_ids, created_at')
        .eq('destination_premises_code', p.code)
        .order('created_at', { ascending: false }),
      supabase.from('farmer_premises_photos')
        .select('id, photo_url, file_name')
        .eq('premises_id', p.id)
        .order('created_at', { ascending: true }),
    ]);

    setPremisesPhotos(((photoRes.data ?? []) as Record<string, unknown>[]).map(r => ({
      id:       r.id as string,
      url:      r.photo_url as string,
      fileName: (r.file_name as string) || null,
    })));

    const batches: Batch[] = ((bRes.data ?? []) as Record<string, unknown>[]).map(b => ({
      id:        b.id as string,
      batchCode: (b.batch_code as string) ?? '',
      batchName: (b.batch_name as string) ?? '',
      species:   (b.species as string) ?? '',
      breed:     (b.breed as string) ?? '',
      count:     Number(b.count ?? 0),
      status:    (b.status as string) ?? 'DRAFT',
      createdAt: (b.created_at as string) ?? '',
      animals:   [],
    }));
    setPremisesBatches(batches);

    const animals: BatchAnimal[] = ((aRes.data ?? []) as Record<string, unknown>[]).map((a, i) => ({
      id:        a.id as string,
      seq:       i + 1,
      sex:       ((a.gender as string) === 'FEMALE' ? 'F' : 'M') as 'M' | 'F',
      ageMonths: a.date_of_birth
        ? Math.floor((Date.now() - new Date(a.date_of_birth as string).getTime()) / (30 * 24 * 3600 * 1000))
        : 0,
      weightKg:  0,
      features:  (a.breed as string) ?? '',
      animalId:  (a.animal_tag_id as string) || undefined,
      tagSerial: (a.animal_tag_id as string) || undefined,
      tagStatus: (a.animal_tag_id ? 'TAGGED' : 'UNTAGGED') as 'TAGGED' | 'UNTAGGED',
      status:    (a.status as string) ?? 'ACTIVE',
    }));
    setPremisesAnimals(animals);

    const mapMov = (r: Record<string, unknown>): PremisesMovement => ({
      id:                      r.id as string,
      movementCode:            (r.movement_code as string) ?? '—',
      status:                  (r.status as string) ?? '',
      originPremisesCode:      (r.origin_premises_code as string) ?? '',
      originPremisesName:      (r.origin_premises_name as string) ?? '',
      originRegionCode:        (r.origin_region_code as string) ?? null,
      destinationPremisesCode: (r.destination_premises_code as string) ?? '',
      destinationPremisesName: (r.destination_premises_name as string) ?? '',
      movementTypeCode:        (r.movement_type_code as string) ?? '',
      purpose:                 r.purpose as string | null,
      plannedDepartureDate:    r.planned_departure_date as string | null,
      plannedArrivalDate:      r.planned_arrival_date as string | null,
      animalCount:             r.animal_count != null ? Number(r.animal_count) : null,
      vehicleRegistration:     (r.vehicle_registration as string) ?? null,
      transporterName:         (r.transporter_name as string) ?? null,
      routeDescription:        (r.route_description as string) ?? null,
      speciesNotes:            (r.species_notes as string) ?? null,
      notes:                   (r.notes as string) ?? null,
      userId:                  (r.user_id as string) ?? null,
      animalIds:               Array.isArray(r.animal_ids) ? r.animal_ids as string[] : [],
      createdAt:               (r.created_at as string) ?? '',
    });
    const outMovs = ((outRes.data ?? []) as Record<string, unknown>[]).map(mapMov);
    const inMovs  = ((inRes.data ?? []) as Record<string, unknown>[]).map(mapMov);
    setOutMovements(outMovs);
    setInMovements(inMovs);

    // Resolve user_ids → farmer names for "Submitted By"
    const userIds = [...new Set([...outMovs, ...inMovs].map(m => m.userId).filter(Boolean))] as string[];
    if (userIds.length > 0) {
      supabase.from('farmers').select('id, farmer_code, full_name, user_id').in('user_id', userIds)
        .then(({ data }) => {
          const map: Record<string, { id: string; name: string; code: string }> = {};
          (data ?? []).forEach((f: Record<string, unknown>) => {
            map[f.user_id as string] = { id: f.id as string, name: f.full_name as string, code: f.farmer_code as string };
          });
          setMovFarmers(map);
        });
    }
  }

  function selectRegion(id: string) {
    setMapView(false);
    setListView(false);
    setSelectedId(id);
    setSelectedPremises(null);
    setSelectedBatch(null);
    setSelectedPremisesRegionId(null);
    setShowAll(false);
    setPremisesBatches([]);
    setPremisesAnimals([]);
  }

  function openAllPremises() {
    setListView(false);
    setMapView(false);
    setShowAll(true);
    setAllPremisesVisible(20);
    setSelectedId(null);
    setSelectedPremises(null);
    setSelectedBatch(null);
    setSelectedPremisesRegionId(null);
    setPremisesBatches([]);
    setPremisesAnimals([]);
  }

  function goToMapView() {
    setListView(false);
    setMapView(true);
  }

  async function openBatch(batch: Batch) {
    setSelectedBatch({ ...batch, animals: [] });
    setBatchAnimals([]);
    setBatchAnimLoading(true);
    const { data } = await supabase.rpc('get_batch_animals', { p_batch_id: batch.id });
    const mapped: BatchAnimal[] = ((data ?? []) as Record<string, unknown>[]).map((a, i) => ({
      id:        a.id as string,
      seq:       (a.seq as number) ?? i + 1,
      sex:       ((a.sex as string) === 'FEMALE' ? 'F' : 'M') as 'M' | 'F',
      ageMonths: (a.age_months as number) ?? 0,
      weightKg:  (a.weight_kg as number) ?? 0,
      features:  (a.distinguishing_marks as string) ?? '',
      animalId:  (a.animal_code as string) || undefined,
      tagSerial: (a.tag_serial as string) || undefined,
      tagType:   (a.tag_type as 'RFID' | 'EAR_TAG') || undefined,
      tagColor:  (a.tag_color as TagColor) || undefined,
      tagStatus: ((a.tag_status as string) === 'TAGGED' ? 'TAGGED' : 'UNTAGGED') as 'TAGGED' | 'UNTAGGED',
      status:    (a.tag_status as string) ?? 'ACTIVE',
    }));
    setBatchAnimals(mapped);
    setBatchAnimLoading(false);
  }

  function back() {
    if (selectedBatch)    { setSelectedBatch(null); setBatchAnimals([]); return; }
    if (selectedPremises) { setSelectedPremises(null); setSelectedPremisesRegionId(null); setPremisesBatches([]); setPremisesAnimals([]); setInMovements([]); setOutMovements([]); return; }
    if (showAll)          { setShowAll(false); return; }
    setSelectedId(null);
  }

  // ── Shared premises card ───────────────────────────────────────────────────
  function PremisesCardItem({ p, regionLabel, onClick }: { p: Premises & { regionId?: string; regionName?: string }; regionLabel?: string; onClick: () => void }) {
    const b = getBadge(p.status);
    const totalAnimals = p.batches.reduce((sum, bt) => sum + bt.count, 0);
    const region = p.regionName ?? regionLabel ?? '—';
    const regDate = p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
    return (
      <button className={s.pCard} onClick={onClick}>

        {/* ── Header band ── */}
        <div className={s.pCardHeader}>
          <div className={s.pCardHeaderLeft}>
            <div className={s.pCardTypeIcon}><Building2 size={14} strokeWidth={2} /></div>
            <div>
              <div className={s.pCardName}>{p.name}</div>
              <code className={s.pCardCode}>{p.code}</code>
            </div>
          </div>
          <span className={s.pCardBadge} style={{ background: b.bg, color: b.color }}>{b.label}</span>
        </div>

        {/* ── Info rows ── */}
        <div className={s.pCardBody}>
          <div className={s.pCardInfoRow}><User size={12} className={s.pCardInfoIcon} /><span>{p.owner}</span></div>
          <div className={s.pCardInfoRow}><Phone size={12} className={s.pCardInfoIcon} /><span>{p.phone}</span></div>
          <div className={s.pCardInfoRow}><MapPin size={12} className={s.pCardInfoIcon} /><span>{region}</span><span className={s.pCardDot}>·</span><span>{p.type.replace(/_/g, ' ')}</span>{p.lat != null && <span className={s.pCardGps}>📍 GPS</span>}</div>
        </div>

        {/* ── Footer stats ── */}
        <div className={s.pCardFooter}>
          <div className={s.pCardStats}>
            <div className={s.pCardStat}><span className={s.pCardStatNum}>{p.batches.length}</span><span className={s.pCardStatLbl}>Batches</span></div>
            <div className={s.pCardStatDiv} />
            <div className={s.pCardStat}><span className={s.pCardStatNum}>{totalAnimals}</span><span className={s.pCardStatLbl}>Animals</span></div>
            {p.areaHectares != null && <><div className={s.pCardStatDiv} /><div className={s.pCardStat}><span className={s.pCardStatNum}>{p.areaHectares}</span><span className={s.pCardStatLbl}>ha</span></div></>}
          </div>
          {regDate && <span className={s.pCardDate}>{regDate}</span>}
        </div>

      </button>
    );
  }

  // ── Panel content ──────────────────────────────────────────────────────────

  function renderPanel() {
    if (!selectedRegion && !showAll) return (
      <div className={s.panelEmpty}>
        <MapPin size={52} strokeWidth={1.1} color="#94a3b8" />
        <p className={s.panelEmptyTitle}>Select a Region</p>
        <p className={s.panelEmptySub}>Click any region on the map to explore premises, batches, and animals.</p>
        <div className={s.statRow}>
          <div className={s.statBox}><span className={s.statNum}>18</span><span className={s.statLbl}>Regions</span></div>
          <div className={s.statBox}><span className={s.statNum}>{allPremisesFlat.length}</span><span className={s.statLbl}>Premises</span></div>
          <div className={s.statBox}><span className={s.statNum}>{totalAnimalsCount}</span><span className={s.statLbl}>Animals</span></div>
        </div>
        <button className={s.allBtn} onClick={openAllPremises}>
          <Building2 size={15} /> View All Premises
        </button>
      </div>
    );

    // ── All Premises view ──────────────────────────────────────────────────────
    if (showAll && !selectedPremises && !selectedBatch) {
      const q = listFilter.toLowerCase();
      const filtered = allPremisesFlat.filter(p =>
        !q
        || p.name.toLowerCase().includes(q)
        || p.code.toLowerCase().includes(q)
        || p.owner.toLowerCase().includes(q)
        || p.type.toLowerCase().includes(q)
        || p.regionName.toLowerCase().includes(q)
        || p.status.toLowerCase().includes(q)
      );
      const visiblePremises = q ? filtered : filtered.slice(0, allPremisesVisible);
      const hasMore = !q && filtered.length > allPremisesVisible;
      return (
        <div className={s.listPage}>
          <div className={s.listHeader}>
            <div className={s.listHeaderLeft}>
              <div>
                <div className={s.listTitle}>All Premises</div>
                <div className={s.listSub}>{filtered.length} of {allPremisesFlat.length} premises</div>
              </div>
            </div>
            <input
              className={s.listSearch}
              placeholder="Search by name, code, owner, type, region…"
              value={listFilter}
              onChange={e => setListFilter(e.target.value)}
            />
          </div>
          <div className={s.listTableWrap}>
            <table className={s.listTable}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Premises ID</th>
                  <th>Type</th>
                  <th>Region</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th>Batches</th>
                  <th>Animals</th>
                  <th>Area (ha)</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {visiblePremises.length === 0 && (
                  <tr><td colSpan={10} className={s.listEmpty}>No premises match your search.</td></tr>
                )}
                {visiblePremises.map(p => {
                  const b = getBadge(p.status);
                  const totalAnimals = p.batches.reduce((sum, bt) => sum + bt.count, 0);
                  return (
                    <tr key={p.id} className={s.listRow} onClick={() => openPremises(p, p.regionId)}>
                      <td className={s.listNameCell}>{p.name}</td>
                      <td className={s.listIdCell}><code className={s.listCode}>{p.code}</code></td>
                      <td className={s.listTypeCell}>{p.type.replace(/_/g, ' ')}</td>
                      <td>{p.regionName}</td>
                      <td>
                        {p.ownerId ? (
                          <button
                            onClick={e => { e.stopPropagation(); navigate(`/farmers/${p.ownerId}`); }}
                            style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: '#1d4ed8', fontWeight: 600, fontSize: 'inherit', textAlign: 'left' }}
                          >
                            {p.owner}
                          </button>
                        ) : p.owner}
                      </td>
                      <td><span className={s.listBadge} style={{ background: b.bg, color: b.color }}>{b.label}</span></td>
                      <td className={s.listNumCell}>{p.batches.length}</td>
                      <td className={s.listNumCell}>{totalAnimals}</td>
                      <td className={s.listNumCell}>{p.areaHectares != null ? p.areaHectares.toLocaleString() : '—'}</td>
                      <td style={{ color: '#64748b', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {hasMore && (
            <button className={s.loadMoreBtn} onClick={() => setAllPremisesVisible(v => v + 20)}>
              Load more · showing {visiblePremises.length} of {allPremisesFlat.length}
            </button>
          )}
        </div>
      );
    }

    // Breadcrumb
    const crumb = (
      <div className={s.breadcrumb}>
        <span className={s.crumbLink} onClick={() => { setSelectedId(null); setShowAll(false); }}>Map</span>
        <ChevronRight size={12} />
        {showAll
          ? <span className={selectedPremises ? s.crumbLink : s.crumbActive} onClick={() => { setSelectedPremises(null); setSelectedBatch(null); setBatchAnimals([]); }}>All Premises</span>
          : <span className={selectedPremises ? s.crumbLink : s.crumbActive} onClick={() => { setSelectedPremises(null); setSelectedBatch(null); setBatchAnimals([]); }}>{selectedRegion?.name}</span>
        }
        {selectedPremises && <>
          <ChevronRight size={12} />
          <span className={selectedBatch ? s.crumbLink : s.crumbActive} onClick={() => { setSelectedBatch(null); setBatchAnimals([]); }}>
            {selectedPremises.name}
          </span>
        </>}
        {selectedBatch && <>
          <ChevronRight size={12} />
          <span className={s.crumbActive}>{selectedBatch.batchCode}</span>
        </>}
      </div>
    );

    if (selectedBatch) return (
      <div className={s.panelContent}>
        {crumb}
        <button className={s.backBtn} onClick={back}><ArrowLeft size={14} /> Back to batches</button>
        <div className={s.panelTitle}>{SPECIES_EMOJI[selectedBatch.species] ?? '🐾'} {selectedBatch.batchName}</div>
        <div className={s.batchMeta}>
          <span className={s.chip}>{selectedBatch.species} · {selectedBatch.breed}</span>
          <span className={s.chip}>{selectedBatch.count} animals</span>
          <span className={s.chip}>Created {fmtDate(selectedBatch.createdAt)}</span>
        </div>
        <div className={s.animalGrid}>
          {batchAnimLoading && (
            <div style={{ gridColumn: '1/-1', color: '#94a3b8', fontSize: '0.875rem', padding: '1.5rem 0', textAlign: 'center' }}>
              Loading animals…
            </div>
          )}
          {!batchAnimLoading && batchAnimals.length === 0 && (
            <div style={{ gridColumn: '1/-1', color: '#94a3b8', fontSize: '0.875rem', padding: '1.5rem 0', textAlign: 'center' }}>
              No animals registered in this batch.
            </div>
          )}
          {batchAnimals.map(a => {
            const tag = a.tagStatus === 'TAGGED'
              ? (a.tagType === 'RFID' ? <RFIDTag serial={a.tagSerial} color={a.tagColor} /> : <EarTag serial={a.tagSerial} color={a.tagColor} />)
              : <UnassignedTag />;
            return (
              <div key={a.id} className={s.animalCard} onClick={() => navigate(`/animals/profile/${a.id}`)} style={{ cursor: 'pointer' }}>
                <div className={s.animalTop}>
                  <span className={s.animalSeq}>#{a.seq}</span>
                  <span className={`${s.sexBadge} ${a.sex === 'M' ? s.sexM : s.sexF}`}>{a.sex === 'M' ? '♂ M' : '♀ F'}</span>
                </div>
                <div className={s.animalPhotoSlot}>
                  <span className={s.photoLabel}>Upload Photo</span>
                  <span className={s.photoSub}>JPG · PNG</span>
                </div>
                <div className={s.animalMeta}>{a.ageMonths} mo · {a.weightKg > 0 ? `${a.weightKg} kg` : ''}{a.features ? ` · ${a.features}` : ''}</div>
                <div className={s.tagWrap}>{tag}</div>
                {a.animalId
                  ? <span className={s.animalId}>{a.animalId}</span>
                  : <span className={s.untaggedBadge}>Untagged</span>}
                <span className={s.viewProfileBtn}>View Profile →</span>
              </div>
            );
          })}
        </div>
      </div>
    );

    if (selectedPremises) {
      const pBadge = getBadge(selectedPremises.status);

      // Tab content derivations
      const availableBatches   = premisesBatches.filter(b => !COMPLETED_STATUSES.has(b.status));
      const quarantineAnimals  = premisesAnimals.filter(a => a.status === 'QUARANTINE');
      const slaughteredAnimals = premisesAnimals.filter(a => a.status === 'SLAUGHTERED');
      const exportedAnimals    = premisesAnimals.filter(a => a.status === 'EXPORTED');
      const regionName = selectedPremisesRegionId
        ? REGIONS.find(r => r.id === selectedPremisesRegionId)?.name
        : undefined;
      const totalAnimals  = premisesAnimals.length;
      const taggedAnimals = premisesAnimals.filter(a => a.tagStatus === 'TAGGED').length;
      const tagPct        = totalAnimals > 0 ? Math.round((taggedAnimals / totalAnimals) * 100) : 0;
      const speciesCount: Record<string, number> = {};
      premisesBatches.forEach(b => {
        const sp = (b.species || 'OTHER').toUpperCase();
        speciesCount[sp] = (speciesCount[sp] ?? 0) + b.count;
      });
      const SPECIES_LIST = [
        { key: 'CATTLE', label: 'Cattle', emoji: '🐄' },
        { key: 'CAMEL',  label: 'Camel',  emoji: '🐪' },
        { key: 'GOAT',   label: 'Goat',   emoji: '🐐' },
        { key: 'SHEEP',  label: 'Sheep',  emoji: '🐑' },
      ];

      return (
        <div className={s.panelContent}>
          {/* Movement detail popup */}
          {movModal && (() => {
            const m          = movModal;
            const animals    = movAnimals[m.id] ?? [];
            const isLoadingA = movAnimLoading.has(m.id);
            const SPECIES_EMOJI: Record<string, string> = { Cattle: '🐄', Camel: '🐪', Goat: '🐐', Sheep: '🐑' };
            const HEALTH_COLOR: Record<string, string> = { HEALTHY: '#16a34a', RESTRICTED: '#dc2626', UNKNOWN: '#94a3b8' };
            return (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
                onClick={() => setMovModal(null)}>
                <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 720, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
                  onClick={e => e.stopPropagation()}>
                  {/* Header */}
                  <div style={{ padding: '1.125rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0f172a' }}>{m.movementCode}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.125rem' }}>{m.originPremisesName || m.originPremisesCode} → {m.destinationPremisesName || m.destinationPremisesCode}</div>
                    </div>
                    <button onClick={() => setMovModal(null)} style={{ border: 'none', background: '#f1f5f9', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '1rem' }}>✕</button>
                  </div>
                  <div style={{ overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Vehicle card */}
                    {(m.vehicleRegistration || m.transporterName || m.routeDescription) && (
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '0.875rem 1rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                        {m.vehicleRegistration && (
                          <div>
                            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Vehicle</div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>🚛 {m.vehicleRegistration}</div>
                          </div>
                        )}
                        {m.transporterName && (
                          <div>
                            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Transporter</div>
                            <div style={{ fontSize: '0.875rem', color: '#374151' }}>{m.transporterName}</div>
                          </div>
                        )}
                        {m.routeDescription && (
                          <div>
                            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Route</div>
                            <div style={{ fontSize: '0.875rem', color: '#374151' }}>{m.routeDescription}</div>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Animal cards */}
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.875rem' }}>
                        Animals · {m.speciesNotes || `${m.animalCount ?? 0} animals`}
                      </div>
                      {isLoadingA ? (
                        <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Loading animals…</div>
                      ) : animals.length === 0 ? (
                        <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{m.animalIds.length === 0 ? 'No animals linked to this movement.' : 'Could not load animal details.'}</div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.875rem' }}>
                          {animals.map(a => (
                            <div key={a.id} style={{ background: '#fff', border: '1px solid #e8edf2', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                              {/* Photo area */}
                              <div style={{ position: 'relative', height: 130, background: '#f1f5f9', overflow: 'hidden' }}>
                                {a.photoUrl
                                  ? <img src={a.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>{SPECIES_EMOJI[a.species] ?? '🐾'}</div>
                                }
                                {/* Tag badge */}
                                <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', background: 'rgba(15,23,42,0.82)', color: '#fff', borderRadius: 20, padding: '0.2rem 0.6rem', fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                  <Tag size={10} /> {a.tagSerial || a.id.slice(0, 10)}
                                </div>
                              </div>
                              {/* Info rows */}
                              <div style={{ padding: '0.625rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                {[
                                  { label: 'BREED',  value: a.breed || '—' },
                                  { label: 'MARKS',  value: a.marks || '—' },
                                  { label: 'HEALTH', value: a.healthStatus?.replace(/_/g, ' ') || 'Unknown' },
                                ].map(row => (
                                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{row.label}</span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: row.label === 'HEALTH' ? (HEALTH_COLOR[a.healthStatus ?? 'UNKNOWN'] ?? '#94a3b8') : '#0f172a' }}>{row.value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Suspend modal */}
          {suspendModal && (
            <div className={s.modalOverlay}>
              <div className={s.modalBox}>
                <div className={s.modalBoxHead}>
                  <span className={s.modalBoxTitle}>Suspend Premises</span>
                  <button className={s.modalBoxClose} onClick={() => { setSuspendModal(false); setSuspendReason(''); }}><X size={16}/></button>
                </div>
                <p className={s.modalBoxSub}><strong>{selectedPremises.name}</strong> will be suspended. Provide a clear reason.</p>
                <textarea
                  className={s.modalBoxTextarea}
                  rows={4}
                  placeholder="e.g. Failed biosecurity inspection."
                  value={suspendReason}
                  onChange={e => setSuspendReason(e.target.value)}
                />
                {suspendReason.trim().length > 0 && suspendReason.trim().length < 10 && (
                  <p className={s.modalBoxErr}>Reason must be at least 10 characters.</p>
                )}
                <div className={s.modalBoxActions}>
                  <button className={s.modalBoxCancel} onClick={() => { setSuspendModal(false); setSuspendReason(''); }}>Cancel</button>
                  <button
                    className={s.modalBoxConfirm}
                    disabled={suspending || suspendReason.trim().length < 10}
                    onClick={handleSuspend}
                  >
                    <PauseCircle size={13}/> {suspending ? 'Suspending…' : 'Confirm Suspension'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {crumb}
          <button className={s.backBtn} onClick={back}><ArrowLeft size={14} /> {showAll ? 'Back to all premises' : 'Back to premises'}</button>

          {/* Header: info left (40%), map right (60%) */}
          <div className={s.premisesDetailTop}>
            <div className={s.premisesDetailInfo}>
              <div className={s.prmInfoBadgeRow}>
                <span className={s.statusBadge} style={{ background: pBadge.bg, color: pBadge.color }}>{pBadge.label}</span>
                <span className={s.prmInfoCode}>{selectedPremises.code}</span>
              </div>
              <div className={s.prmInfoNameRow}>
                <Building2 size={15} color="#6366f1" />
                <span className={s.prmInfoName}>{selectedPremises.name}</span>
              </div>
              <div className={s.prmInfoDivider} />
              <div className={s.prmInfoRows}>
                <div className={s.prmInfoRow}><User size={13} className={s.prmInfoRowIcon} />{selectedPremises.owner}</div>
                <div className={s.prmInfoRow}><Phone size={13} className={s.prmInfoRowIcon} />{selectedPremises.phone}</div>
                <div className={s.prmInfoRow}><Building2 size={13} className={s.prmInfoRowIcon} />{selectedPremises.type}</div>
                {regionName && <div className={s.prmInfoRow}><MapPin size={13} className={s.prmInfoRowIcon} />{regionName}</div>}
              </div>
              <div className={s.prmTagStatus}>
                <div className={s.prmTagStatusHeader}><Tag size={10} /> Tag Status · {tagPct}% tagged</div>
                <div className={s.prmTagBoxes}>
                  <div className={`${s.prmTagBox} ${s.prmTagBoxTagged}`}>
                    <div className={s.prmTagSvgWrap}>
                      <div className={s.prmTagSvgInner}><RFIDTag color="yellow" /></div>
                    </div>
                    <div className={s.prmTagBoxText}>
                      <span className={`${s.prmTagBoxNum} ${s.prmTagBoxNumTagged}`}>{taggedAnimals}</span>
                      <span className={`${s.prmTagBoxLbl} ${s.prmTagBoxLblTagged}`}>Tagged</span>
                    </div>
                  </div>
                  <div className={`${s.prmTagBox} ${s.prmTagBoxUntagged}`}>
                    <div className={s.prmTagSvgWrap}>
                      <div className={s.prmTagSvgInner}><UnassignedTag /></div>
                    </div>
                    <div className={s.prmTagBoxText}>
                      <span className={`${s.prmTagBoxNum} ${s.prmTagBoxNumUntagged}`}>{totalAnimals - taggedAnimals}</span>
                      <span className={`${s.prmTagBoxLbl} ${s.prmTagBoxLblUntagged}`}>Untagged</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className={s.speciesRow}>
                {SPECIES_LIST.map(sp => (
                  <div key={sp.key} className={s.speciesCard}>
                    <span className={s.speciesEmoji}>{sp.emoji}</span>
                    <span className={s.speciesLabel}>{sp.label}</span>
                    <span className={s.speciesCount}>{speciesCount[sp.key] ?? 0}</span>
                  </div>
                ))}
              </div>
            </div>
            {selectedPremises.lat != null && selectedPremises.lng != null
              ? <PremisesLeafletMap
                  premisesId={selectedPremises.id}
                  lat={selectedPremises.lat}
                  lng={selectedPremises.lng}
                  name={selectedPremises.name}
                  code={selectedPremises.code}
                  onExpand={() => setShowFullMap(true)}
                  allMarkers={showAll ? allPremisesFlat : regionPremises}
                />
              : <div className={s.premisesMapPlaceholder}><MapPin size={20} color="#cbd5e1" /><span>No GPS coordinates</span></div>
            }
          </div>

          {/* Full-screen map modal */}
          {showFullMap && selectedPremises.lat != null && selectedPremises.lng != null && (
            <FullMapModal lat={selectedPremises.lat} lng={selectedPremises.lng} name={selectedPremises.name} code={selectedPremises.code} onClose={() => setShowFullMap(false)} />
          )}

          {/* Premises tabs */}
          <div className={s.batchTabBar}>
            {PREMISES_TABS.map(t => {
              const count = t === 'Registration'  ? 0
                          : t === 'Incoming'      ? inMovements.length
                          : t === 'Available'     ? availableBatches.length
                          : t === 'Outgoing'      ? outMovements.length
                          : t === 'Quarantine'    ? quarantineAnimals.length
                          : t === 'Slaughterhouse'? slaughteredAnimals.length
                          : exportedAnimals.length;
              return (
                <button
                  key={t}
                  className={`${s.batchTabBtn} ${premisesTab === t ? s.batchTabActive : ''}`}
                  style={t === 'Activity Log' ? { marginLeft: 'auto' } : undefined}
                  onClick={() => setPremisesTab(t)}
                >
                  {t}
                  {count > 0 && <span className={s.batchTabCount}>{count}</span>}
                </button>
              );
            })}
          </div>

          {/* Tab: Registration — full registration data + photos */}
          {premisesTab === 'Registration' && (
            <div className={s.regTab}>

              {/* Approve / Reject action bar */}
              {(selectedPremises.status === 'SUBMITTED' || selectedPremises.status === 'UNDER_REVIEW' || selectedPremises.status === 'PENDING') && (
                <div className={s.decisionStrip}>
                  <div className={s.decisionStripLeft}>
                    <span className={s.decisionStripLabel}>Pending Review</span>
                    <span className={s.decisionStripSub}>
                      Registered {selectedPremises.createdAt
                        ? new Date(selectedPremises.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'} · Awaiting ministry decision
                    </span>
                  </div>
                  <div className={s.decisionStripActions}>
                    <button
                      className={s.decisionRejectBtn}
                      disabled={approvingId === selectedPremises.id}
                      onClick={() => void updatePremisesStatus(selectedPremises.id, 'REJECTED')}
                    >
                      {approvingId === selectedPremises.id ? '…' : 'Reject'}
                    </button>
                    <button
                      className={s.decisionApproveBtn}
                      disabled={approvingId === selectedPremises.id}
                      onClick={() => void updatePremisesStatus(selectedPremises.id, 'APPROVED')}
                    >
                      {approvingId === selectedPremises.id ? 'Processing…' : 'Approve Registration'}
                    </button>
                  </div>
                </div>
              )}

              {selectedPremises.status === 'APPROVED' && (
                <div className={s.decisionStrip}>
                  <div className={s.decisionStripLeft}>
                    <span className={s.decisionStripLabel} style={{ color: '#16a34a' }}>Approved</span>
                    <span className={s.decisionStripSub}>This premises is active and approved · Suspend to restrict operations</span>
                  </div>
                  <div className={s.decisionStripActions}>
                    <button
                      className={s.decisionRejectBtn}
                      onClick={() => setSuspendModal(true)}
                    >
                      <PauseCircle size={12} /> Suspend
                    </button>
                  </div>
                </div>
              )}

              {selectedPremises.status === 'SUSPENDED' && (
                <div className={s.decisionStrip}>
                  <div className={s.decisionStripLeft}>
                    <span className={s.decisionStripLabel} style={{ color: '#dc2626' }}>Suspended</span>
                    <span className={s.decisionStripSub}>This premises is currently suspended · Reinstate to restore operations</span>
                  </div>
                  <div className={s.decisionStripActions}>
                    <button
                      className={s.decisionApproveBtn}
                      disabled={!!approvingId}
                      onClick={() => void updatePremisesStatus(selectedPremises.id, 'ACTIVE')}
                    >
                      <CheckCircle size={12} /> {approvingId === selectedPremises.id ? 'Processing…' : 'Reinstate'}
                    </button>
                  </div>
                </div>
              )}

              <div className={s.regSection}>
                <div className={s.regSectionTitle}>📋 Registration Details</div>
                <div className={s.regGrid}>
                  <div className={s.regField}><span className={s.regLabel}>Premises Code</span><span className={s.regValue}><code className={s.regCode}>{selectedPremises.code}</code></span></div>
                  <div className={s.regField}><span className={s.regLabel}>Name</span><span className={s.regValue}>{selectedPremises.name}</span></div>
                  <div className={s.regField}><span className={s.regLabel}>Type</span><span className={s.regValue}>{selectedPremises.type.replace(/_/g, ' ')}</span></div>
                  <div className={s.regField}><span className={s.regLabel}>Status</span><span className={s.regValue}><span className={s.statusBadge} style={{ background: pBadge.bg, color: pBadge.color }}>{pBadge.label}</span></span></div>
                  <div className={s.regField}><span className={s.regLabel}>Region</span><span className={s.regValue}>{regionName ?? '—'}</span></div>
                  <div className={s.regField}><span className={s.regLabel}>Registered</span><span className={s.regValue}>{selectedPremises.createdAt ? new Date(selectedPremises.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</span></div>
                </div>
              </div>

              <div className={s.regSection}>
                <div className={s.regSectionTitle}>👤 Owner Information</div>
                <div className={s.regGrid}>
                  <div className={s.regField}><span className={s.regLabel}>Owner Name</span><span className={s.regValue}>{selectedPremises.owner}</span></div>
                  <div className={s.regField}><span className={s.regLabel}>Phone</span><span className={s.regValue}>{selectedPremises.phone}</span></div>
                </div>
              </div>

              <div className={s.regSection}>
                <div className={s.regSectionTitle}>📍 Location</div>
                <div className={s.regGrid}>
                  <div className={`${s.regField} ${s.regFieldFull}`}><span className={s.regLabel}>Physical Address</span><span className={s.regValue}>{selectedPremises.physicalAddress ?? '—'}</span></div>
                  <div className={s.regField}><span className={s.regLabel}>GPS Latitude</span><span className={s.regValue}>{selectedPremises.lat != null ? selectedPremises.lat.toFixed(6) : '—'}</span></div>
                  <div className={s.regField}><span className={s.regLabel}>GPS Longitude</span><span className={s.regValue}>{selectedPremises.lng != null ? selectedPremises.lng.toFixed(6) : '—'}</span></div>
                  <div className={s.regField}><span className={s.regLabel}>Area (ha)</span><span className={s.regValue}>{selectedPremises.areaHectares != null ? `${selectedPremises.areaHectares.toLocaleString()} ha` : '—'}</span></div>
                  <div className={s.regField}><span className={s.regLabel}>Capacity</span><span className={s.regValue}>{selectedPremises.capacityAnimals != null ? `${selectedPremises.capacityAnimals.toLocaleString()} animals` : '—'}</span></div>
                </div>
              </div>

              <div className={s.regSection}>
                <div className={s.regSectionTitle}>🐄 Livestock</div>
                <div className={s.regGrid}>
                  <div className={`${s.regField} ${s.regFieldFull}`}><span className={s.regLabel}>Allowed Species</span><span className={s.regValue}>{selectedPremises.allowedSpecies ?? '—'}</span></div>
                </div>
              </div>

              <div className={s.regSection}>
                <div className={s.regSectionTitle}>📜 License</div>
                <div className={s.regGrid}>
                  <div className={s.regField}><span className={s.regLabel}>License Number</span><span className={s.regValue}>{selectedPremises.licenseNumber ?? '—'}</span></div>
                  <div className={s.regField}><span className={s.regLabel}>License Expiry</span><span className={s.regValue}>{selectedPremises.licenseExpiryDate ? new Date(selectedPremises.licenseExpiryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</span></div>
                  <div className={s.regField}><span className={s.regLabel}>Premises Type</span><span className={s.regValue}>{selectedPremises.isTemporary ? <span className={s.listTempBadge}>Temporary</span> : 'Permanent'}</span></div>
                  {selectedPremises.isTemporary && <div className={s.regField}><span className={s.regLabel}>Closes On</span><span className={s.regValue} style={{ color: '#b45309' }}>{selectedPremises.temporaryEndDate ? new Date(selectedPremises.temporaryEndDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</span></div>}
                </div>
              </div>

              {selectedPremises.notes && (
                <div className={s.regSection}>
                  <div className={s.regSectionTitle}>📝 Notes</div>
                  <div className={s.regNotes}>{selectedPremises.notes}</div>
                </div>
              )}

              <div className={s.regSection}>
                <div className={s.regSectionTitle}>📷 Premises Photos {premisesPhotos.length > 0 && <span className={s.regPhotoCount}>{premisesPhotos.length}</span>}</div>
                {premisesPhotos.length === 0
                  ? <div className={s.regNoPhotos}>No photos uploaded for this premises.</div>
                  : <div className={s.regPhotoGrid}>
                      {premisesPhotos.map(ph => (
                        <a key={ph.id} href={ph.url} target="_blank" rel="noopener noreferrer" className={s.regPhotoCard}>
                          <img src={ph.url} alt={ph.fileName ?? 'Premises photo'} className={s.regPhotoImg} />
                          {ph.fileName && <span className={s.regPhotoLabel}>{ph.fileName.replace(/^.*[\\/]/, '').replace(/\.[^.]+$/, '')}</span>}
                        </a>
                      ))}
                    </div>
                }
              </div>
            </div>
          )}

          {/* Tab: Available — batches */}
          {premisesTab === 'Available' && (
            availableBatches.length === 0
              ? <div className={s.emptyRegion}><p>No batches registered.</p></div>
              : <div className={s.batchList}>
                  {availableBatches.map(batch => {
                    const b = getBadge(batch.status);
                    return (
                      <button key={batch.id} className={s.batchCard} onClick={() => openBatch(batch)}>
                        <div className={s.batchCardHeader}>
                          <span className={s.batchCode}>{batch.batchCode}</span>
                          <span className={s.statusBadge} style={{ background: b.bg, color: b.color }}>{b.label}</span>
                        </div>
                        <div className={s.batchCardBody}>
                          <span className={s.batchEmoji}>{SPECIES_EMOJI[batch.species] ?? '🐾'}</span>
                          <div className={s.batchBodyText}>
                            <span className={s.batchName}>{batch.batchName}</span>
                            <span className={s.batchBreed}>{batch.species} · {batch.breed}</span>
                          </div>
                        </div>
                        <div className={s.batchCardFooter}>
                          <span className={s.batchStat}><strong>{batch.count}</strong> animals</span>
                          <span className={s.batchStat}>Registered {fmtDate(batch.createdAt)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
          )}

          {/* Tab: Incoming / Outgoing — movements */}
          {(premisesTab === 'Incoming' || premisesTab === 'Outgoing') && (() => {
            const movs = premisesTab === 'Incoming' ? inMovements : outMovements;
            const SPECIES_EMOJI: Record<string, string> = { Cattle: '🐄', Camel: '🐪', Goat: '🐐', Sheep: '🐑' };
            if (movs.length === 0) return <div className={s.emptyRegion}><p>No {premisesTab.toLowerCase()} movements.</p></div>;
            return (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr>
                      {['Movement Code', 'Animals', 'Route', 'Dates', 'Transporter', 'Notes', 'Submitted By', 'Status'].map(h => (
                        <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {movs.map(m => {
                      const mb      = getBadge(m.status);
                      const movType = m.movementTypeCode
                        ? m.movementTypeCode.replace(/_/g, ' ').replace('MOVEMENT', '').trim()
                        : null;
                      const daysAgo = m.createdAt ? (() => {
                        const d = Math.floor((Date.now() - new Date(m.createdAt).getTime()) / 86400000);
                        return d === 0 ? 'Today' : d === 1 ? 'Yesterday' : `${d}d ago`;
                      })() : null;

                      const cell: React.CSSProperties = { padding: '0.75rem 1rem', borderBottom: '1px solid #f9fafb', verticalAlign: 'top' };
                      const sub: React.CSSProperties  = { fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.2rem' };

                      const handleOpen = () => {
                        setMovModal(m);
                        if (!movAnimals[m.id] && m.animalIds.length > 0) {
                          setMovAnimLoading(prev => new Set([...prev, m.id]));
                          void supabase
                            .from('farmer_animals')
                            .select('id, animal_tag_id, species, breed, gender, photo_url, distinguishing_marks, health_status')
                            .in('id', m.animalIds)
                            .then(({ data }) => {
                              setMovAnimals(prev => ({ ...prev, [m.id]: (data ?? []).map((a: Record<string, unknown>) => ({
                                id:           a.id as string,
                                tagSerial:    (a.animal_tag_id as string) ?? null,
                                species:      (a.species as string) ?? '',
                                breed:        (a.breed as string) ?? '',
                                gender:       (a.gender as string) ?? '',
                                photoUrl:     (a.photo_url as string) ?? null,
                                marks:        (a.distinguishing_marks as string) ?? null,
                                healthStatus: (a.health_status as string) ?? null,
                              })) }));
                              setMovAnimLoading(prev => { const s = new Set(prev); s.delete(m.id); return s; });
                            });
                        }
                      };

                      return (
                        <tr key={m.id} style={{ background: '#fff', cursor: 'pointer', transition: 'background 0.1s' }}
                          onClick={handleOpen}
                          onMouseEnter={e => (e.currentTarget.style.background = '#f8faff')}
                          onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                        >
                          <td style={cell}>
                            <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#1e293b' }}>{m.movementCode}</div>
                            {movType && <div style={sub}>{movType}</div>}
                          </td>
                          <td style={cell}>
                            <div><span style={{ fontWeight: 700, color: '#374151' }}>{m.animalCount ?? 0}</span><span style={{ color: '#9ca3af', marginLeft: '0.25rem' }}>animals</span></div>
                            {m.speciesNotes && <div style={sub}>{m.speciesNotes}</div>}
                          </td>
                          <td style={cell}>
                            <div style={{ color: '#374151' }}>{m.originPremisesName || m.originPremisesCode} → {m.destinationPremisesName || m.destinationPremisesCode}</div>
                            {m.originRegionCode && <div style={sub}>{m.originRegionCode}</div>}
                            {m.routeDescription && <div style={{ ...sub, fontStyle: 'italic' }}>{m.routeDescription}</div>}
                          </td>
                          <td style={{ ...cell, whiteSpace: 'nowrap' }}>
                            <div style={{ color: '#374151' }}>{m.plannedDepartureDate ? fmtDate(m.plannedDepartureDate) : '—'}</div>
                            {m.plannedArrivalDate && <div style={sub}>Arr: {fmtDate(m.plannedArrivalDate)}</div>}
                            {daysAgo && <div style={sub}>Sub: {daysAgo}</div>}
                          </td>
                          <td style={cell}>
                            {m.transporterName ? <div style={{ color: '#374151' }}>{m.transporterName}</div> : <span style={{ color: '#d1d5db' }}>—</span>}
                            {m.vehicleRegistration && <div style={sub}>🚛 {m.vehicleRegistration}</div>}
                          </td>
                          <td style={{ ...cell, maxWidth: 180 }}>
                            {m.notes ? <div style={{ color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 170 }} title={m.notes}>{m.notes}</div> : <span style={{ color: '#d1d5db' }}>—</span>}
                            {m.purpose && <div style={sub}>{m.purpose}</div>}
                          </td>
                          <td style={cell}>
                            {(() => {
                              const f = m.userId ? movFarmers[m.userId] : null;
                              if (f) return (
                                <button
                                  onClick={e => { e.stopPropagation(); navigate(`/farmers/${f.id}`); }}
                                  style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                                >
                                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1d4ed8' }}>{f.name}</div>
                                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.1rem' }}>{f.code}</div>
                                </button>
                              );
                              return m.userId
                                ? <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace' }} title={m.userId}>{m.userId.slice(0, 8)}…</div>
                                : <span style={{ color: '#d1d5db' }}>—</span>;
                            })()}
                          </td>
                          <td style={cell}>
                            <span style={{ display: 'inline-block', padding: '0.25rem 0.625rem', borderRadius: 999, background: mb.bg, color: mb.color, fontSize: '0.7rem', fontWeight: 700 }}>{mb.label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}

          {/* Tabs: Quarantine / Slaughterhouse / Exported — animals */}
          {(premisesTab === 'Quarantine' || premisesTab === 'Slaughterhouse' || premisesTab === 'Exported') && (() => {
            const list = premisesTab === 'Quarantine' ? quarantineAnimals : premisesTab === 'Slaughterhouse' ? slaughteredAnimals : exportedAnimals;
            if (list.length === 0) return <div className={s.emptyRegion}><p>No animals in {premisesTab.toLowerCase()}.</p></div>;
            return (
              <div className={s.animalGrid}>
                {list.map(a => (
                  <div key={a.id} className={s.animalCard} onClick={() => navigate(`/animals/profile/${a.id}`)} style={{ cursor: 'pointer' }}>
                    <div className={s.animalTop}>
                      <span className={s.animalSeq}>#{a.seq}</span>
                      <span className={`${s.sexBadge} ${a.sex === 'M' ? s.sexM : s.sexF}`}>{a.sex === 'M' ? '♂ M' : '♀ F'}</span>
                    </div>
                    <div className={s.animalMeta}>{a.ageMonths} mo · {a.features}</div>
                    {a.animalId
                      ? <span className={s.animalId}>{a.animalId}</span>
                      : <span className={s.untaggedBadge}>Untagged</span>}
                    <span className={s.viewProfileBtn}>View Profile →</span>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Activity Log tab */}
          {premisesTab === 'Activity Log' && (
            <div className={s.logWrap}>
              {logLoading
                ? <div className={s.logEmpty}>Loading activity log…</div>
                : premisesLog.length === 0
                  ? <div className={s.logEmpty}>No activity recorded for this premises yet.</div>
                  : <div className={s.logList}>
                      {premisesLog.map(entry => (
                        <div key={entry.id} className={s.logItem}>
                          <div className={`${s.logDot} ${s['logDot_' + entry.level]}`} />
                          <div className={s.logContent}>
                            <div className={s.logTitle}>{entry.title}</div>
                            {entry.detail && <div className={s.logDetail}>{entry.detail}</div>}
                            <div className={s.logMeta}>
                              {entry.actorRole && <span>{entry.actorRole.replace(/_/g, ' ')}</span>}
                              {entry.actorRole && <span className={s.logMetaSep}>·</span>}
                              <span>{new Date(entry.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                              <span className={s.logMetaSep}>·</span>
                              <span className={s.logCategoryBadge}>{entry.category}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
              }
            </div>
          )}
        </div>
      );
    }

    // Region view — show premises as list
    return (
      <div className={s.listPage}>
        <div className={s.listHeader}>
          <div className={s.listHeaderLeft}>
            {crumb}
            <div>
              <div className={s.listTitle}>{selectedRegion.name}</div>
              <div className={s.listSub}>{regionPremises.length} premise{regionPremises.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
        </div>
        {regionPremises.length === 0 ? (
          <div className={s.emptyRegion}>
            <Building2 size={36} strokeWidth={1.1} color="#cbd5e1" />
            <p>No premises registered in this region.</p>
          </div>
        ) : (
          <div className={s.listTableWrap}>
            <table className={s.listTable}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Premises ID</th>
                  <th>Type</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th>Batches</th>
                  <th>Animals</th>
                  <th>Area (ha)</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {regionPremises.map(p => {
                  const b = getBadge(p.status);
                  const totalAnimals = p.batches.reduce((sum, bt) => sum + bt.count, 0);
                  return (
                    <tr key={p.id} className={s.listRow} onClick={() => openPremises(p, selectedId)}>
                      <td className={s.listNameCell}>{p.name}</td>
                      <td className={s.listIdCell}><code className={s.listCode}>{p.code}</code></td>
                      <td className={s.listTypeCell}>{p.type.replace(/_/g, ' ')}</td>
                      <td>{p.owner}</td>
                      <td><span className={s.listBadge} style={{ background: b.bg, color: b.color }}>{b.label}</span></td>
                      <td className={s.listNumCell}>{p.batches.length}</td>
                      <td className={s.listNumCell}>{totalAnimals}</td>
                      <td className={s.listNumCell}>{p.areaHectares != null ? p.areaHectares.toLocaleString() : '—'}</td>
                      <td style={{ color: '#64748b', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (dbLoading) return (
    <div className={s.page} style={{ alignItems: 'center', justifyContent: 'center', display: 'flex', height: '100%' }}>
      <div style={{ color: '#94a3b8', fontSize: '0.9375rem', fontWeight: 600 }}>Loading livestock data…</div>
    </div>
  );

  const totalPremises = allPremisesFlat.length;
  const withPremises  = Object.keys(premisesByRegion).length;

  // ── Full-country Leaflet map view (lazy — only mounts on first click) ─────────
  if (mapView) {
    const withGps = allPremisesFlat.filter(p => p.lat != null && p.lng != null).length;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        {/* Header bar */}
        <div className={s.listHeader}>
          <div className={s.listHeaderLeft}>
            <div className={s.viewToggleGroup}>
              <button className={`${s.viewToggleBtn} ${s.viewTogglePrimary}`} onClick={openAllPremises}>
                <Building2 size={13} strokeWidth={2} /> All Premises
              </button>
              <button className={`${s.viewToggleBtn} ${s.viewToggleMap}`}>
                <MapPin size={13} strokeWidth={2} /> Map View
              </button>
              <button className={s.viewToggleBtn} style={{ '--toggle-color': '#00bbbb' } as React.CSSProperties}
                onClick={() => { setMapView(false); setListView(true); setListFilter(''); }}>
                <span style={{ fontSize: '0.8rem', lineHeight: 1 }}>☰</span> List View
              </button>
            </div>
            <div>
              <div className={s.listTitle}>Premises Map — Somalia</div>
              <div className={s.listSub}>{withGps} of {allPremisesFlat.length} premises have GPS coordinates</div>
            </div>
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Approved',     color: '#16a34a' },
              { label: 'Submitted',    color: '#2563eb' },
              { label: 'Under Review', color: '#7c3aed' },
              { label: 'Pending',      color: '#d97706' },
              { label: 'Rejected',     color: '#dc2626' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: l.color, border: '2px solid #fff', boxShadow: '0 0 0 1.5px ' + l.color }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>

        {/* Full-height Leaflet map + floating monitor */}
        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0 }}>
            <AllPremisesLeafletMap
              premises={allPremisesFlat}
              facilities={facilities}
              showNames={showMapNames}
              showFacilities={showFacilities}
              onViewDetails={p => { setMapView(false); void openPremises(p, p.regionId); }}
            />
          </div>
          {/* Controls */}
          <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 900, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button
              onClick={() => setShowMapNames(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.4rem 0.875rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.775rem', fontWeight: 700, color: '#374151', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 6px rgba(0,0,0,0.12)' }}
            >
              {showMapNames ? '🏷 Hide Names' : '🏷 Show Names'}
            </button>
            <button
              onClick={() => setShowFacilities(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.4rem 0.875rem', background: showFacilities ? '#fef3c7' : '#fff', border: `1px solid ${showFacilities ? '#fcd34d' : '#e2e8f0'}`, borderRadius: 8, fontSize: '0.775rem', fontWeight: 700, color: showFacilities ? '#92400e' : '#374151', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 6px rgba(0,0,0,0.12)' }}
            >
              🏭 {showFacilities ? 'Hide Facilities' : 'Show Facilities'} ({facilities.length})
            </button>
            {/* Shape legend */}
            <div style={{ background: 'rgba(255,255,255,0.97)', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.5rem 0.75rem', boxShadow: '0 2px 6px rgba(0,0,0,0.10)', fontSize: '0.7rem', fontWeight: 600, color: '#374151', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', fontSize: '0.6rem', marginBottom: 4 }}>Premises (Farmer)</div>
              {[
                { icon: '🏡', label: 'Farm' },
                { icon: '⛺', label: 'Pastoral Camp' },
                { icon: '🌿', label: 'Grazing Area' },
                { icon: '💧', label: 'Water Point' },
                { icon: '🏪', label: 'Livestock Market' },
              ].map(({ icon, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 14 }}>{icon}</span>
                  <span>{label}</span>
                </div>
              ))}
              <div style={{ color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', fontSize: '0.6rem', marginTop: 8, marginBottom: 4 }}>Facilities</div>
              {[
                { icon: '🏥', label: 'Quarantine Station' },
                { icon: '🔪', label: 'Slaughterhouse' },
                { icon: '🚧', label: 'Checkpoint' },
              ].map(({ icon, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 14 }}>{icon}</span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
          <ActivityMonitorPanel />
        </div>
      </div>
    );
  }

  // ── Full-page list view ───────────────────────────────────────────────────────
  if (listView) {
    const q = listFilter.toLowerCase();
    const filtered = allPremisesFlat.filter(p =>
      !q
      || p.name.toLowerCase().includes(q)
      || p.code.toLowerCase().includes(q)
      || p.owner.toLowerCase().includes(q)
      || p.type.toLowerCase().includes(q)
      || p.regionName.toLowerCase().includes(q)
      || p.status.toLowerCase().includes(q)
    );
    return (
      <div className={s.listPage}>
        <div className={s.listHeader}>
          <div className={s.listHeaderLeft}>
            <div className={s.viewToggleGroup}>
              <button
                className={`${s.viewToggleBtn} ${s.viewTogglePrimary}`}
                onClick={openAllPremises}
              >
                <Building2 size={13} strokeWidth={2} /> All Premises
              </button>
              <button
                className={s.viewToggleBtn}
                style={{ '--toggle-color': '#00bbbb' } as React.CSSProperties}
                onClick={goToMapView}
              >
                <MapPin size={13} strokeWidth={2} /> Map View
              </button>
              <button
                className={`${s.viewToggleBtn} ${s.viewToggleActive}`}
                style={{ '--toggle-color': '#00bbbb' } as React.CSSProperties}
              >
                <span style={{ fontSize: '0.8rem', lineHeight: 1 }}>☰</span> List View
              </button>
            </div>
            <div>
              <div className={s.listTitle}>All Premises</div>
              <div className={s.listSub}>{filtered.length} of {allPremisesFlat.length} premises</div>
            </div>
          </div>
          <input
            className={s.listSearch}
            placeholder="Search by name, code, owner, type, region…"
            value={listFilter}
            onChange={e => setListFilter(e.target.value)}
          />
        </div>

        <div className={s.listTableWrap}>
          <table className={s.listTable}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Premises ID</th>
                <th>Type</th>
                <th>Region</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Batches</th>
                <th>Animals</th>
                <th>Area (ha)</th>
                <th>License No.</th>
                <th>Temporary</th>
                <th>Closing</th>
                <th>GPS</th>
                <th>Registered</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={14} className={s.listEmpty}>No premises match your search.</td></tr>
              )}
              {filtered.map(p => {
                const b = getBadge(p.status);
                const totalAnimals = p.batches.reduce((sum, bt) => sum + bt.count, 0);
                return (
                  <tr key={p.id} className={s.listRow} onClick={() => { setListView(false); void openPremises(p, p.regionId); }}>
                    <td className={s.listNameCell}>{p.name}</td>
                    <td className={s.listIdCell}><code className={s.listCode}>{p.code}</code></td>
                    <td className={s.listTypeCell}>{p.type.replace(/_/g, ' ')}</td>
                    <td>{p.regionName}</td>
                    <td>{p.owner}</td>
                    <td><span className={s.listBadge} style={{ background: b.bg, color: b.color }}>{b.label}</span></td>
                    <td className={s.listNumCell}>{p.batches.length}</td>
                    <td className={s.listNumCell}>{totalAnimals}</td>
                    <td className={s.listNumCell}>{p.areaHectares != null ? p.areaHectares.toLocaleString() : '—'}</td>
                    <td className={s.listMono}>{p.licenseNumber ?? '—'}</td>
                    <td style={{ textAlign: 'center' }}>
                      {p.isTemporary
                        ? <span className={s.listTempBadge}>Temporary</span>
                        : <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Permanent</span>}
                    </td>
                    <td style={{ color: p.temporaryEndDate ? '#b45309' : '#94a3b8', fontSize: '0.78rem' }}>
                      {p.temporaryEndDate ? new Date(p.temporaryEndDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className={s.listGps}>
                      {p.lat != null && p.lng != null
                        ? `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`
                        : '—'}
                    </td>
                    <td style={{ color: '#64748b', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className={s.page}>

      {/* ── Region grid — hidden when a premises is open ── */}
      {!selectedPremises && <div className={s.regionGrid}>

        {/* Header */}
        <div className={s.regionGridHeader}>
          <div>
            <div className={s.regionGridTitle}>Somalia — 18 Administrative Regions</div>
            <div className={s.regionGridSub}>Click a region to view premises, batches and animals</div>
          </div>
          <div className={s.regionGridStats}>
            <span className={s.rgStat}><strong>{totalPremises}</strong> premises</span>
            <span className={s.rgStat}><strong>{totalAnimalsCount}</strong> animals</span>
            <span className={s.rgStatPending}><strong>{allPremisesFlat.filter(p => ['SUBMITTED','UNDER_REVIEW','PENDING'].includes(p.status)).length}</strong> pending approval</span>
            <div className={s.viewToggleGroup}>
              <button
                className={`${s.viewToggleBtn} ${s.viewTogglePrimary}`}
                onClick={openAllPremises}
              >
                <Building2 size={13} strokeWidth={2} /> All Premises
              </button>
              <button
                className={`${s.viewToggleBtn} ${s.viewToggleMap}`}
                onClick={goToMapView}
              >
                <MapPin size={13} strokeWidth={2} /> Map View
              </button>
              <button
                className={`${s.viewToggleBtn} ${listView ? s.viewToggleActive : ''}`}
                style={{ '--toggle-color': '#00bbbb' } as React.CSSProperties}
                onClick={() => { setMapView(false); setListView(true); setListFilter(''); }}
              >
                <span style={{ fontSize: '0.8rem', lineHeight: 1 }}>☰</span> List View
              </button>
            </div>
          </div>
        </div>

        {/* Cards */}
        <div className={s.regionCards}>
          {REGIONS.map(r => {
            const premises   = premisesByRegion[r.id] ?? [];
            const hasData    = premises.length > 0;
            const isSelected = selectedId === r.id;
            const animals    = premises.reduce((s, p) => s + p.batches.reduce((b, bt) => b + bt.count, 0), 0);
            const batches    = premises.reduce((s, p) => s + p.batches.length, 0);

            return (
              <button
                key={r.id}
                className={`${s.regionCard} ${isSelected ? s.regionCardSelected : ''}`}
                onClick={() => selectRegion(r.id)}
              >
                <div className={s.rcTop}>
                  <div>
                    <div className={s.rcName}>{r.name}</div>
                    <div className={s.rcCode}>{r.code}</div>
                  </div>
                  {hasData && <span className={s.rcDot} />}
                </div>
                <div className={s.rcDivider} />
                <div className={s.rcStats}>
                  <div className={s.rcStat}>
                    <span className={s.rcStatNum}>{premises.length}</span>
                    <span className={s.rcStatLbl}>Premises</span>
                  </div>
                  <div className={s.rcStatSep} />
                  <div className={s.rcStat}>
                    <span className={s.rcStatNum}>{batches}</span>
                    <span className={s.rcStatLbl}>Batches</span>
                  </div>
                  <div className={s.rcStatSep} />
                  <div className={s.rcStat}>
                    <span className={s.rcStatNum}>{animals}</span>
                    <span className={s.rcStatLbl}>Animals</span>
                  </div>
                </div>
                {!hasData && <div className={s.rcEmpty}>No premises</div>}
              </button>
            );
          })}
        </div>
      </div>}


      {/* ── Panel ── */}
      <div className={s.panel}>
        {renderPanel()}
      </div>
    </div>
  );
}

export default SomaliaMapPage;
