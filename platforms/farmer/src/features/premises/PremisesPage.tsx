import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Plus, CheckCircle, Clock, XCircle, AlertCircle, Crosshair, Home, Tent, TreePine, Droplets, Store, Layers, ChevronLeft, Smartphone, Wifi, WifiOff, Navigation, Pencil } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase';
import s from './premises.module.css';

interface Premises {
  id: string; premisesCode: string; premisesName: string;
  premisesType: string; status: string; regionCode: string;
  physicalAddress: string;
  gpsLatitude: number; gpsLongitude: number;
  areaHectares?: number; capacityAnimals?: number;
  allowedSpecies?: string; licenseNumber?: string;
  licenseExpiryDate?: string; isTemporary?: boolean;
  temporaryEndDate?: string; notes?: string; createdAt?: string;
}

interface Batch {
  id: string;
  batchCode: string;
  premisesId: string;
  registrationYear: number;
  status: 'OPEN' | 'CLOSED' | 'ARCHIVED';
  animalCount: number;
  species: string | null;
  createdAt: string;
  closedAt: string | null;
  notes: string | null;
}

interface DbPremises {
  id: string; premises_code: string; premises_name: string;
  premises_type: string; status: string; region_code: string;
  physical_address: string;
  gps_latitude: number; gps_longitude: number;
  area_hectares?: number | null; capacity_animals?: number | null;
  allowed_species?: string | null; license_number?: string | null;
  license_expiry_date?: string | null; is_temporary?: boolean | null;
  temporary_end_date?: string | null; notes?: string | null;
  created_at?: string;
}

function toPremises(db: DbPremises): Premises {
  return {
    id: db.id,
    premisesCode: db.premises_code,
    premisesName: db.premises_name,
    premisesType: db.premises_type,
    status: db.status,
    regionCode: db.region_code,
    physicalAddress: db.physical_address,
    gpsLatitude: db.gps_latitude,
    gpsLongitude: db.gps_longitude,
    areaHectares: db.area_hectares ?? undefined,
    capacityAnimals: db.capacity_animals ?? undefined,
    allowedSpecies: db.allowed_species ?? undefined,
    licenseNumber: db.license_number ?? undefined,
    licenseExpiryDate: db.license_expiry_date ?? undefined,
    isTemporary: db.is_temporary ?? undefined,
    temporaryEndDate: db.temporary_end_date ?? undefined,
    notes: db.notes ?? undefined,
    createdAt: db.created_at ?? undefined,
  };
}

interface DbBatch {
  id: string; batch_code: string; batch_name: string;
  species: string | null; count: number; status: string;
  premises_code: string; created_at: string;
}

function mapBatchStatus(st: string): 'OPEN' | 'CLOSED' | 'ARCHIVED' {
  if (st === 'CLOSED') return 'CLOSED';
  if (st === 'ARCHIVED') return 'ARCHIVED';
  return 'OPEN';
}

function toBatch(db: DbBatch): Batch {
  return {
    id: db.id,
    batchCode: db.batch_code,
    premisesId: db.premises_code,
    registrationYear: new Date(db.created_at).getFullYear(),
    status: mapBatchStatus(db.status),
    animalCount: db.count,
    species: db.species,
    createdAt: db.created_at,
    closedAt: null,
    notes: db.batch_name ?? null,
  };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  APPROVED:  { label: 'Approved',  color: '#16a34a', bg: '#dcfce7', Icon: CheckCircle },
  SUBMITTED: { label: 'Submitted', color: '#0b5ed7', bg: '#dbeafe', Icon: Clock       },
  DRAFT:     { label: 'Draft',     color: '#64748b', bg: '#f1f5f9', Icon: Clock       },
  REJECTED:  { label: 'Rejected',  color: '#dc2626', bg: '#fee2e2', Icon: XCircle     },
  SUSPENDED: { label: 'Suspended', color: '#d97706', bg: '#fef3c7', Icon: AlertCircle },
};

const PREMISES_TYPES = [
  { value: 'FARM',             label: 'Farm',             desc: 'Permanent farming land',   Icon: Home,     emoji: '🏡' },
  { value: 'PASTORAL_CAMP',    label: 'Pastoral Camp',    desc: 'Temporary pastoral site',  Icon: Tent,     emoji: '⛺' },
  { value: 'GRAZING_AREA',     label: 'Grazing Area',     desc: 'Open communal grazing',    Icon: TreePine, emoji: '🌿' },
  { value: 'WATERING_POINT',   label: 'Watering Point',   desc: 'Water source location',    Icon: Droplets, emoji: '💧' },
  { value: 'LIVESTOCK_MARKET', label: 'Livestock Market', desc: 'Animal trading market',    Icon: Store,    emoji: '🏪' },
];

const SPECIES = ['CATTLE', 'CAMEL', 'SHEEP', 'GOAT'];

const SPECIES_EMOJI: Record<string, string> = {
  CATTLE: '🐄', CAMEL: '🐪', GOAT: '🐐', SHEEP: '🐑',
};
const CARD_SPECIES = ['CATTLE', 'CAMEL', 'GOAT', 'SHEEP'];

const TYPE_COLOR: Record<string, string> = {
  FARM:             '#1d4ed8',
  PASTORAL_CAMP:    '#16a34a',
  GRAZING_AREA:     '#d97706',
  WATERING_POINT:   '#0891b2',
  LIVESTOCK_MARKET: '#7c3aed',
};

interface MinistryRegion { code: string; name: string; }

const SOMALIA_CENTER: [number, number] = [6.0, 46.2];
const SOMALIA_ZOOM = 7;

const PIN_ICON = L.divIcon({
  className: '',
  html: `<div style="
    width:28px;height:28px;border-radius:50% 50% 50% 0;
    background:#0b5ed7;border:3px solid #fff;
    transform:rotate(-45deg);
    box-shadow:0 3px 10px rgba(11,94,215,0.45);
  "></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

function premisesEmoji(type: string): string {
  const t = type.toUpperCase();
  if (t.includes('WATER'))   return '💧';
  if (t.includes('MARKET'))  return '🏪';
  if (t.includes('CAMP') || t.includes('HOLDING')) return '⛺';
  if (t.includes('GRAZING')) return '🌿';
  return '🏡';  // FARM default
}

function icon3d(emoji: string, size = 32): string {
  return `<div style="width:${size}px;height:${size}px;background:#fff;border-radius:9px;
    box-shadow:0 4px 10px rgba(0,0,0,0.18),0 1px 3px rgba(0,0,0,0.1),inset 0 -2px 0 rgba(0,0,0,0.07);
    border:1.5px solid rgba(0,0,0,0.1);display:flex;align-items:center;justify-content:center;
    font-size:${Math.round(size * 0.56)}px;cursor:pointer;">${emoji}</div>`;
}

function PinMap({ lat, lng, onChange }: {
  lat: string; lng: string;
  onChange: (lat: string, lng: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef      = useRef<L.Map | null>(null);
  const markerRef   = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: SOMALIA_CENTER, zoom: SOMALIA_ZOOM, attributionControl: false,
    });
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
      subdomains: 'abcd', maxZoom: 19,
    }).addTo(map);

    const ilat = parseFloat(lat);
    const ilng = parseFloat(lng);
    if (!isNaN(ilat) && !isNaN(ilng)) {
      const m = L.marker([ilat, ilng], { icon: PIN_ICON, draggable: true }).addTo(map);
      m.on('dragend', () => { const p = m.getLatLng(); onChange(p.lat.toFixed(6), p.lng.toFixed(6)); });
      markerRef.current = m;
      map.setView([ilat, ilng], 13);
    }

    map.on('click', (e) => {
      const { lat: clat, lng: clng } = e.latlng;
      onChange(clat.toFixed(6), clng.toFixed(6));
      if (markerRef.current) {
        markerRef.current.setLatLng([clat, clng]);
      } else {
        const m = L.marker([clat, clng], { icon: PIN_ICON, draggable: true }).addTo(map);
        m.on('dragend', () => { const p = m.getLatLng(); onChange(p.lat.toFixed(6), p.lng.toFixed(6)); });
        markerRef.current = m;
      }
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; markerRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const clat = parseFloat(lat);
    const clng = parseFloat(lng);
    if (isNaN(clat) || isNaN(clng)) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([clat, clng]);
    } else {
      const m = L.marker([clat, clng], { icon: PIN_ICON, draggable: true }).addTo(map);
      m.on('dragend', () => { const p = m.getLatLng(); onChange(p.lat.toFixed(6), p.lng.toFixed(6)); });
      markerRef.current = m;
    }
    map.panTo([clat, clng]);
  }, [lat, lng]);

  return <div ref={containerRef} className={s.mapContainer} />;
}

const MINI_PIN = L.divIcon({
  className: '',
  html: `<div style="
    width:10px;height:10px;border-radius:50%;
    background:#0b5ed7;border:2px solid #fff;
    box-shadow:0 1px 4px rgba(11,94,215,0.5);
  "></div>`,
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

function MiniMap({ lat, lng, zoom = 13 }: { lat: number; lng: number; zoom?: number }) {
  const ref    = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current || isNaN(lat) || isNaN(lng)) return;
    const map = L.map(ref.current, {
      center: [lat, lng], zoom,
      attributionControl: false, zoomControl: false,
      dragging: false, scrollWheelZoom: false,
      doubleClickZoom: false, touchZoom: false, keyboard: false,
    });
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
      subdomains: 'abcd', maxZoom: 19,
    }).addTo(map);
    L.marker([lat, lng], { icon: MINI_PIN }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [lat, lng]);

  return <div ref={ref} className={s.cpMiniMap} />;
}

function MapLightbox({ lat, lng, onClose }: { lat: number; lng: number; onClose: () => void }) {
  const ref    = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current, {
      center: [lat, lng], zoom: 8,
      attributionControl: false, zoomControl: true,
    });
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
      subdomains: 'abcd', maxZoom: 19,
    }).addTo(map);
    L.marker([lat, lng], { icon: PIN_ICON }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [lat, lng]);

  return (
    <div className={s.lightboxOverlay}>
      <button className={s.lightboxClose} onClick={onClose}>✕</button>
      <div ref={ref} className={s.lightboxMap} />
    </div>
  );
}

function PhotoLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  const [zoomed, setZoomed] = useState(false);
  return (
    <div className={s.lightboxOverlay} onClick={onClose}>
      <button className={s.lightboxClose} onClick={onClose}>✕</button>
      <div className={s.lightboxPhotoWrap} onClick={e => e.stopPropagation()}>
        <img
          src={url}
          alt="Premises photo"
          className={`${s.lightboxPhotoImg}${zoomed ? ' ' + s.zoomed : ''}`}
          onClick={() => setZoomed(z => !z)}
        />
      </div>
    </div>
  );
}

function PhotoPreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [dataUrl, setDataUrl] = useState<string>('');
  useEffect(() => {
    let cancelled = false;
    const reader = new FileReader();
    reader.onload = (e) => { if (!cancelled) setDataUrl(e.target?.result as string); };
    reader.readAsDataURL(file);
    return () => { cancelled = true; reader.abort(); };
  }, [file]);
  return (
    <div className={s.uploadPreviewItem}>
      {dataUrl
        ? <img src={dataUrl} alt={file.name} className={s.uploadPreviewImg} />
        : <div className={s.uploadPreviewLoading} />}
      <button type="button" className={s.uploadRemoveOverlay} onClick={onRemove}>×</button>
    </div>
  );
}

function LocationEditorLightbox({ initialLat, initialLng, saving, onSave, onClose }: {
  initialLat: number; initialLng: number;
  saving: boolean;
  onSave: (lat: string, lng: string) => void;
  onClose: () => void;
}) {
  const [lat, setLat] = useState(initialLat.toFixed(6));
  const [lng, setLng] = useState(initialLng.toFixed(6));
  return (
    <div className={s.lightboxOverlay}>
      <div className={s.locEditorWrap}>
        <div className={s.locEditorHeader}>
          <span className={s.locEditorTitle}>Click on the map to set new location</span>
          <button className={s.lightboxClose} style={{ position: 'static' }} onClick={onClose}>✕</button>
        </div>
        <div className={s.locEditorMap}>
          <PinMap lat={lat} lng={lng} onChange={(la, lg) => { setLat(la); setLng(lg); }} />
        </div>
        <div className={s.locEditorFooter}>
          <span className={s.locEditorCoords}>{parseFloat(lat).toFixed(4)}°N, {parseFloat(lng).toFixed(4)}°E</span>
          <div className={s.locEditorActions}>
            <button className={s.modalCancelBtn} onClick={onClose}>Cancel</button>
            <button className={s.modalSaveBtn} disabled={saving} onClick={() => onSave(lat, lng)}>
              {saving ? 'Saving…' : 'Save Location'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const EMPTY_FORM = {
  premisesName: '', premisesType: 'FARM', regionCode: '',
  physicalAddress: '', gpsLatitude: '', gpsLongitude: '',
  areaHectares: '', capacityAnimals: '', allowedSpecies: [] as string[],
  licenseNumber: '', licenseExpiryDate: '', isTemporary: false,
  temporaryEndDate: '', notes: '',
};
type Form = typeof EMPTY_FORM;

const SECTIONS: { num: number; label: string; done: (f: Form, photos: File[], docs: File[]) => boolean }[] = [
  { num: 1, label: 'Basic Information',  done: f => !!(f.premisesName && f.premisesType && f.physicalAddress) },
  { num: 2, label: 'Location Details',   done: f => !!(f.regionCode) },
  { num: 3, label: 'Livestock Details',  done: f => f.allowedSpecies.length > 0 },
  { num: 4, label: 'Licensing',          done: f => !!(f.licenseNumber || f.licenseExpiryDate) },
  { num: 5, label: 'GPS & Map Pin',      done: f => !!(f.gpsLatitude && f.gpsLongitude) },
  { num: 6, label: 'Photos & Documents', done: (_, photos, docs) => photos.length > 0 || docs.length > 0 },
];

const FIELD_HELP: Record<string, { title: string; body: string; tip?: string }> = {
  premisesName: {
    title: 'Premises Name',
    body: 'Enter a clear, descriptive name for this location. Use the name you commonly call this farm or holding, followed by the nearest town or area name.\n\nThis name appears on all official documents, permits, and movement records.',
    tip: 'Example: "Hassan Farm — Baidoa"  or  "Abdullahi Pastoral Camp — Galkayo"',
  },
  premisesType: {
    title: 'Premises Type',
    body: 'Choose the type that best describes this location. The type determines which regulations apply:\n\n• Farm — fixed permanent farming location\n• Pastoral Camp — seasonal or nomadic stop point\n• Grazing Area — shared communal grazing land\n• Watering Point — well, borehole or river access\n• Trader Holding — temporary pen for livestock traders\n• Collection Centre — central point before movement',
    tip: 'Choose "Farm" for permanent buildings, "Pastoral Camp" for seasonal use.',
  },
  physicalAddress: {
    title: 'Physical Address',
    body: 'Describe exactly how to find this location. Include the village name, nearest road, a well-known landmark, or the district office name.\n\nA field officer must be able to find this farm using only your description.',
    tip: 'Example: "3 km north of Bulo Burte market on the Beledweyne road, near the old water tower"',
  },
  regionCode: {
    title: 'Region',
    body: 'Select the federal administrative region where this premises is located. Somalia has 18 regions.\n\nThis determines which regional livestock office is responsible for your farm and which field officers conduct inspections.',
    tip: 'Contact your district livestock officer if you are unsure which region you belong to.',
  },
  allowedSpecies: {
    title: 'Allowed Species',
    body: 'Select all species of livestock that are kept, or will be kept, on this premises.\n\nOnly the selected species are officially permitted here. Keeping unlisted species without updating your registration is a regulatory violation and may result in fines.',
    tip: 'Select all species you currently have or plan to add. You can update this later.',
  },
  areaHectares: {
    title: 'Area (Hectares)',
    body: 'Enter the total land area of this premises in hectares. This is used to assess the appropriate animal capacity and ensure your holding meets minimum space requirements per species.\n\nIf this is a shared grazing area, enter the full area used by your animals.',
    tip: '1 hectare = 10,000 m² ≈ 2.47 acres.',
  },
  capacityAnimals: {
    title: 'Animal Capacity',
    body: 'Enter the maximum number of animals this premises can safely hold at one time. This is the official declared capacity and is checked during field inspections to detect overstocking.\n\nOverstocking is a violation and will be recorded on your premises file.',
    tip: 'Be realistic. An honest capacity protects you from overstocking penalties.',
  },
  licenseNumber: {
    title: 'License Number',
    body: 'If this premises has a livestock holding license issued by the Ministry or a regional authority, enter the license number here.\n\nThis links your premises record to the official license database and confirms your legal operating status.',
    tip: 'Leave blank if you do not yet have a license. You can add it later once issued.',
  },
  licenseExpiryDate: {
    title: 'License Expiry Date',
    body: 'Enter the date when your current livestock holding license expires. The system will send you a reminder before expiry so you can renew in time.\n\nOperating a farm with an expired license is a regulatory violation.',
    tip: 'Leave blank if your license has no fixed expiry date.',
  },
  isTemporary: {
    title: 'Temporary / Seasonal Farm',
    body: 'Enable this if the premises is only used during certain seasons or for a limited time period.\n\nTemporary premises have different inspection schedules and may require seasonal renewal permits.',
    tip: 'Common for pastoral camps during rainy season grazing or seasonal watering points.',
  },
  temporaryEndDate: {
    title: 'Temporary End Date',
    body: 'Enter the date when use of this temporary farm will end. After this date the farm status is automatically reviewed.\n\nAny animals remaining at a closed temporary farm must be moved to a registered active farm.',
    tip: 'You can extend this date later by updating your premises registration.',
  },
  notes: {
    title: 'Additional Notes',
    body: 'Provide any extra information that does not fit the other fields. This could include:\n\n• Seasonal access or road conditions\n• Water availability during dry seasons\n• Security or access restrictions\n• Agreements with neighbouring landowners\n\nThese notes are visible to Ministry officials and field officers who review your application.',
    tip: 'Keep notes factual and brief. They are part of the official record.',
  },
  gpsLatitude: {
    title: 'GPS Latitude',
    body: 'Enter the latitude of this premises. For Somalia, latitude values range from approximately 1.5° N to 12° N.\n\nYou can click anywhere on the map above to set the coordinates automatically — no need to type them manually.',
    tip: 'Somalia latitude range: 1.5 to 12.0.  Example: 2.0469 (near Kismayo)',
  },
  gpsLongitude: {
    title: 'GPS Longitude',
    body: 'Enter the longitude of this premises. For Somalia, longitude values range from approximately 40° E to 51° E.\n\nYou can click anywhere on the map above to set the coordinates automatically — no need to type them manually.',
    tip: 'Somalia longitude range: 40.0 to 51.0.  Example: 45.3182 (Mogadishu area)',
  },
};

// ── Mobile tracker demo data ───────────────────────────────────────────────

const DEMO_TRACKERS = [
  { deviceId: 'MOB-041', farmerName: 'Ahmed Hassan',       online: true,  lat: 2.5820, lng: 44.8400, lastPing: '2 min ago',  from: 'Baidoa Collection',  to: 'Mogadishu Central',  animalCount: 45,  species: 'Cattle' },
  { deviceId: 'MOB-087', farmerName: 'Abdirahman Warsame', online: true,  lat: 9.1200, lng: 48.7500, lastPing: '5 min ago',  from: 'Galkayo Camel Hub',  to: 'Bosaso Export Port', animalCount: 200, species: 'Camel'  },
  { deviceId: 'MOB-112', farmerName: 'Faadumo Yusuf',      online: true,  lat: 9.8500, lng: 48.9000, lastPing: '1 min ago',  from: 'Garowe Livestock',   to: 'Bosaso Export Port', animalCount: 350, species: 'Camel'  },
  { deviceId: 'MOB-098', farmerName: 'Omar Farah',         online: true,  lat: 4.7355, lng: 45.2008, lastPing: '10 min ago', from: 'Beledweyne Farm',    to: 'Jowhar Goat Farm',   animalCount: 25,  species: 'Goat'   },
  { deviceId: 'MOB-033', farmerName: 'Mohamed Idle',       online: false, lat: 2.0469, lng: 45.3182, lastPing: '2 days ago', from: 'Kismayo Market',     to: 'Mogadishu Central',  animalCount: 120, species: 'Goat'   },
  { deviceId: 'MOB-055', farmerName: 'Habibo Ali',         online: false, lat: 2.0469, lng: 45.3182, lastPing: '3 days ago', from: 'Mogadishu Central',  to: 'Kismayo Market',     animalCount: 60,  species: 'Cattle' },
];

interface PingLog { time: string; lat: string; lng: string }

// ── Tracker map (tab 1) ───────────────────────────────────────────────────────

const ONLINE_ICON = L.divIcon({
  className: '',
  html: `<div style="
    width:12px;height:12px;border-radius:50%;
    background:#16a34a;border:2px solid #fff;
    box-shadow:0 0 0 3px rgba(22,163,74,0.25),0 2px 6px rgba(0,0,0,0.2);
  "></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const OFFLINE_ICON = L.divIcon({
  className: '',
  html: `<div style="
    width:10px;height:10px;border-radius:50%;
    background:#9ca3af;border:2px solid #fff;
    box-shadow:0 1px 4px rgba(0,0,0,0.15);
  "></div>`,
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

function TrackerMap({ premises, onSelect, className }: {
  premises: Premises[];
  onSelect: (code: string) => void;
  className?: string;
}) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<L.Map | null>(null);
  const premMarkersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: SOMALIA_CENTER, zoom: 7, attributionControl: false, zoomControl: true,
    });
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
      subdomains: 'abcd', maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; premMarkersRef.current = []; };
  }, []);

  // Add / refresh premises pins whenever the premises list changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    premMarkersRef.current.forEach(m => m.remove());
    premMarkersRef.current = [];

    premises.filter(p => !isNaN(p.gpsLatitude) && !isNaN(p.gpsLongitude)).forEach(p => {
      const cfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.DRAFT;
      const typeIcon = L.divIcon({
        className: '',
        html: icon3d(premisesEmoji(p.premisesType)),
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      const marker = L.marker([p.gpsLatitude, p.gpsLongitude], { icon: typeIcon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family:Inter,sans-serif;min-width:190px">
          <div style="font-size:10px;font-weight:700;color:#0f2170;font-family:monospace;margin-bottom:3px">${p.premisesCode}</div>
          <div style="font-weight:800;color:#0f172a;font-size:13px;margin-bottom:2px">${p.premisesName}</div>
          <div style="color:#94a3b8;font-size:11px;margin-bottom:6px">${p.premisesType.replace(/_/g,' ')} · ${p.regionCode}</div>
          <div style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;color:${cfg.color};background:${cfg.color}18;border:1px solid ${cfg.color}40;border-radius:20px;padding:2px 8px;margin-bottom:8px;text-transform:uppercase">${cfg.label}</div><br/>
          <button data-pnav="${p.premisesCode}" style="width:100%;margin-top:4px;padding:7px 0;background:#0f2170;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">View Batches →</button>
        </div>
      `, { maxWidth: 230 });
      marker.on('popupopen', () => {
        const btn = document.querySelector(`[data-pnav="${p.premisesCode}"]`) as HTMLButtonElement | null;
        if (btn) btn.addEventListener('click', () => onSelect(p.premisesCode), { once: true });
      });
      premMarkersRef.current.push(marker);
    });
  }, [premises, onSelect]);

  return <div ref={containerRef} className={className ?? s.trackerMapBox} />;
}

// ── Mobile tracker panel with tabs ───────────────────────────────────────────



function MobileTrackerPanel({ premises = [], onSelect, className }: {
  premises?: Premises[];
  onSelect?: (code: string) => void;
  className?: string;
}) {
  const [tab,       setTab]       = useState<'map' | 'logs'>('map');
  const [recording, setRecording] = useState(false);
  const [pings,     setPings]     = useState<PingLog[]>([]);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const recordLocation = () => {
    if (!navigator.geolocation) { setStatusMsg('Geolocation not supported'); return; }
    setRecording(true);
    setStatusMsg('Locating…');
    navigator.geolocation.getCurrentPosition(
      pos => {
        const entry: PingLog = {
          time: new Date().toLocaleTimeString(),
          lat:  pos.coords.latitude.toFixed(5),
          lng:  pos.coords.longitude.toFixed(5),
        };
        setPings(prev => [entry, ...prev]);
        setStatusMsg(`Recorded at ${entry.time}`);
        setRecording(false);
      },
      () => { setStatusMsg('Could not get location'); setRecording(false); },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <aside className={className ?? s.trackerPanel}>
      {/* Header */}
      <div className={s.trackerHead}>
        <div className={s.trackerTitle}>
          <Smartphone size={14} />
          Mobile Tracker
        </div>
      </div>

      {/* Tabs */}
      <div className={s.trackerTabs}>
        <button className={`${s.trackerTab}${tab === 'map'  ? ' ' + s.trackerTabOn : ''}`} onClick={() => setTab('map')}>Map</button>
        <button className={`${s.trackerTab}${tab === 'logs' ? ' ' + s.trackerTabOn : ''}`} onClick={() => setTab('logs')}>Logs</button>
      </div>

      {/* Tab: Map */}
      {tab === 'map' && (
        <>
          <TrackerMap premises={premises} onSelect={onSelect ?? (() => {})} />
          <div className={s.mapLegendRow}>
            <span className={s.legendOnline} /> Online
            <span className={s.legendOffline} /> Offline
            <span style={{ width: 1, height: 12, background: '#e2e8f0', margin: '0 4px' }} />
            {[
              { emoji: '🏡', label: 'Farm' },
              { emoji: '⛺', label: 'Pastoral Camp' },
              { emoji: '🌿', label: 'Grazing Area' },
              { emoji: '💧', label: 'Water Point' },
              { emoji: '🏪', label: 'Livestock Market' },
            ].map(({ emoji, label }) => (
              <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: '#475569', fontWeight: 500 }}>
                <span style={{ fontSize: 13 }}>{emoji}</span>{label}
              </span>
            ))}
          </div>
        </>
      )}

      {/* Tab: Logs */}
      {tab === 'logs' && (
        <>
          <button className={s.recordBtn} onClick={recordLocation} disabled={recording}>
            <Navigation size={13} />
            {recording ? 'Locating…' : 'Record My Location'}
          </button>

          {pings.length > 0 && (
            <div className={s.pingLog}>
              <div className={s.pingLogTitle}>My Location Log</div>
              {pings.map((p, i) => (
                <div key={i} className={s.pingEntry}>
                  <span className={s.pingDot} />
                  <span className={s.pingCoords}>{p.lat}°N, {p.lng}°E</span>
                  <span className={s.pingTime}>{p.time}</span>
                </div>
              ))}
            </div>
          )}

          {statusMsg && <div className={s.statusMsg}>{statusMsg}</div>}

          <div className={s.trackerDivider}>Active Movements</div>

          <div className={s.trackerList}>
            {DEMO_TRACKERS.map(t => (
              <div key={t.deviceId} className={`${s.trackerCard}${t.online ? '' : ' ' + s.trackerCardOff}`}>
                <div className={s.trackerCardTop}>
                  <div className={s.trackerInfo}>
                    {t.online ? <Wifi size={11} className={s.wifiOn} /> : <WifiOff size={11} className={s.wifiOff} />}
                    <span className={s.trackerName}>{t.farmerName}</span>
                  </div>
                  <span className={s.trackerDevice}>{t.deviceId}</span>
                </div>
                <div className={s.trackerRoute}>
                  <span className={s.trackerFrom}>{t.from}</span>
                  <span className={s.trackerArrow}>→</span>
                  <span className={s.trackerTo}>{t.to}</span>
                </div>
                <div className={s.trackerMeta}>{t.animalCount} {t.species}</div>
                {t.online ? (
                  <div className={s.trackerGps}>
                    <span className={s.gpsDot} />
                    {t.lat.toFixed(4)}°N, {t.lng.toFixed(4)}°E · {t.lastPing}
                  </div>
                ) : (
                  <div className={s.trackerGpsOff}>Last seen {t.lastPing}</div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

    </aside>
  );
}

// ── Full-page premises map (Google Maps style) ───────────────────────────────

function PremisesMapFull({ premises, activeId, onPinClick, onDetailClick, onAnimalsClick, className }: {
  premises: Premises[];
  activeId: string | null;
  onPinClick: (id: string) => void;
  onDetailClick: (p: Premises) => void;
  onAnimalsClick: (code: string) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);
  const markersRef   = useRef<Map<string, L.Marker>>(new Map());

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: SOMALIA_CENTER, zoom: 7, attributionControl: false,
    });
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
      subdomains: 'abcd', maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; markersRef.current.clear(); };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current.clear();

    premises.filter(p => !isNaN(p.gpsLatitude) && !isNaN(p.gpsLongitude)).forEach(p => {
      const cfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.DRAFT;
      const labelIcon = L.divIcon({
        className: '',
        html: `<div style="display:inline-flex;flex-direction:column;align-items:center;gap:4px;transform:translate(-50%,-100%)">
          <div style="background:#0f172a;color:#fff;font-family:system-ui,sans-serif;font-size:10px;font-weight:700;padding:4px 9px;border-radius:5px;white-space:nowrap;max-width:150px;overflow:hidden;text-overflow:ellipsis;line-height:1.4;box-shadow:0 2px 6px rgba(0,0,0,0.4)">${p.premisesName}</div>
          ${icon3d(premisesEmoji(p.premisesType), 32)}
        </div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      const marker = L.marker([p.gpsLatitude, p.gpsLongitude], { icon: labelIcon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family:'Inter',sans-serif;min-width:210px">
          <div style="font-size:9px;font-family:monospace;font-weight:800;color:#94a3b8;letter-spacing:0.07em;margin-bottom:4px">${p.premisesCode}</div>
          <div style="font-size:14px;font-weight:800;color:#0f172a;margin-bottom:4px;line-height:1.3">${p.premisesName}</div>
          <div style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;color:${cfg.color};background:${cfg.color}15;border:1px solid ${cfg.color}35;border-radius:20px;padding:2px 8px;margin-bottom:6px">${cfg.label}</div>
          <div style="font-size:11px;color:#64748b;margin-bottom:10px">${p.premisesType.replace(/_/g,' ')} · ${p.regionCode}</div>
          <div style="display:flex;gap:6px">
            <button data-gmdetail="${p.id}" style="flex:1;padding:7px 0;background:#0b5ed7;color:#fff;border:none;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">View Details</button>
            <button data-gmanim="${p.premisesCode}" style="flex:1;padding:7px 0;background:#f8fafc;color:#374151;border:1px solid #e2e8f0;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">Animals</button>
          </div>
        </div>
      `, { maxWidth: 250 });
      marker.on('click', () => onPinClick(p.id));
      marker.on('popupopen', () => {
        const db = document.querySelector(`[data-gmdetail="${p.id}"]`) as HTMLElement | null;
        const ab = document.querySelector(`[data-gmanim="${p.premisesCode}"]`) as HTMLElement | null;
        if (db) db.addEventListener('click', () => onDetailClick(p), { once: true });
        if (ab) ab.addEventListener('click', () => onAnimalsClick(p.premisesCode), { once: true });
      });
      markersRef.current.set(p.id, marker);
    });
  }, [premises]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !activeId) return;
    const p = premises.find(x => x.id === activeId);
    if (!p || isNaN(p.gpsLatitude) || isNaN(p.gpsLongitude)) return;
    map.panTo([p.gpsLatitude, p.gpsLongitude], { animate: true });
    const m = markersRef.current.get(p.id);
    if (m) setTimeout(() => m.openPopup(), 350);
  }, [activeId]);

  return <div ref={containerRef} className={className} />;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function PremisesPage(): JSX.Element {
  const { userId, accountRole, premisesCode: repPremisesCode } = useAuthStore();
  const navigate = useNavigate();

  const [premises, setPremises]   = useState<Premises[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [view, setView]           = useState<'list' | 'detail' | 'form'>('list');
  const [saving, setSaving]       = useState(false);
  const [locating, setLocating]   = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [activeId, setActiveId]   = useState<string | null>(null);
  const [selectedPremises, setSelectedPremises] = useState<Premises | null>(null);
  const [batches, setBatches]     = useState<Batch[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [premisesStats, setPremisesStats] = useState<Record<string, { animalCount: number; tagCount: number; bySpecies: Record<string, number> }>>({});
  const [regions, setRegions] = useState<MinistryRegion[]>([]);
  const focus = (field: string) => () => setFocusedField(field);
  const goToAnimals = useCallback((code: string) => navigate(`/animals?premises=${code}`), [navigate]);

  const [photoSlots, setPhotoSlots] = useState<{ front: File | null; side: File | null; overview: File | null }>({ front: null, side: null, overview: null });
  const photoSlotFiles = [photoSlots.front, photoSlots.side, photoSlots.overview].filter(Boolean) as File[];
  const [uploadDocs,   setUploadDocs]   = useState<File[]>([]);
  const [detailModal, setDetailModal]   = useState<Premises | null>(null);
  const [detailPhotos, setDetailPhotos] = useState<{ url: string; local: boolean; name: string }[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [mapLightbox, setMapLightbox]       = useState(false);
  const [photoLightbox, setPhotoLightbox]   = useState<string | null>(null);
  const [locationEditing, setLocationEditing] = useState(false);
  const [locationSaving, setLocationSaving]   = useState(false);
  const [photoUploading, setPhotoUploading]   = useState(false);
  const [photoUploadStatus, setPhotoUploadStatus] = useState<{ ok: number; fail: number; msg: string } | null>(null);
  const [editing, setEditing]           = useState(false);
  const [modalSaving, setModalSaving]   = useState(false);
  const [modalError, setModalError]     = useState<string | null>(null);
  const [editForm, setEditForm]         = useState({
    premisesName: '', premisesType: '', regionCode: '', physicalAddress: '',
    areaHectares: '', capacityAnimals: '', allowedSpecies: [] as string[],
    licenseNumber: '', licenseExpiryDate: '', isTemporary: false,
    temporaryEndDate: '', notes: '',
  });

  const openDetailModal = async (p: Premises) => {
    setDetailModal(p);
    setDetailPhotos([]);
    setEditing(false);
    setModalError(null);
    setPhotoUploadStatus(null);
    setDetailLoading(true);
    try {
      const { data } = await supabase
        .from('farmer_premises_photos')
        .select('photo_url, file_name')
        .eq('premises_id', p.id);
      setDetailPhotos((data ?? []).map((r: { photo_url: string; file_name?: string }) => ({
        url: r.photo_url,
        local: false,
        name: r.file_name ?? 'Photo',
      })));
    } catch { /* no photos table yet */ }
    setDetailLoading(false);
  };

  const startEditing = (p: Premises) => {
    setEditForm({
      premisesName:     p.premisesName,
      premisesType:     p.premisesType,
      regionCode:       p.regionCode,
      physicalAddress:  p.physicalAddress,
      areaHectares:     p.areaHectares?.toString() ?? '',
      capacityAnimals:  p.capacityAnimals?.toString() ?? '',
      allowedSpecies:   p.allowedSpecies ? p.allowedSpecies.split(',').map(s => s.trim()) : [],
      licenseNumber:    p.licenseNumber ?? '',
      licenseExpiryDate: p.licenseExpiryDate ?? '',
      isTemporary:      p.isTemporary ?? false,
      temporaryEndDate: p.temporaryEndDate ?? '',
      notes:            p.notes ?? '',
    });
    setModalError(null);
    setEditing(true);
  };

  const handleModalSave = async () => {
    if (!detailModal) return;
    setModalSaving(true);
    setModalError(null);
    const { error: err } = await supabase
      .from('farmer_premises')
      .update({
        premises_name:      editForm.premisesName,
        premises_type:      editForm.premisesType,
        region_code:        editForm.regionCode,
        physical_address:   editForm.physicalAddress,
        area_hectares:      editForm.areaHectares ? parseFloat(editForm.areaHectares) : null,
        capacity_animals:   editForm.capacityAnimals ? parseInt(editForm.capacityAnimals) : null,
        allowed_species:    editForm.allowedSpecies.length > 0 ? editForm.allowedSpecies.join(',') : null,
        license_number:     editForm.licenseNumber || null,
        license_expiry_date: editForm.licenseExpiryDate || null,
        is_temporary:       editForm.isTemporary,
        temporary_end_date: editForm.isTemporary && editForm.temporaryEndDate ? editForm.temporaryEndDate : null,
        notes:              editForm.notes || null,
      })
      .eq('id', detailModal.id);
    setModalSaving(false);
    if (err) { setModalError(err.message); return; }
    const updated: Premises = {
      ...detailModal,
      premisesName:     editForm.premisesName,
      premisesType:     editForm.premisesType,
      regionCode:       editForm.regionCode,
      physicalAddress:  editForm.physicalAddress,
      areaHectares:     editForm.areaHectares ? parseFloat(editForm.areaHectares) : undefined,
      capacityAnimals:  editForm.capacityAnimals ? parseInt(editForm.capacityAnimals) : undefined,
      allowedSpecies:   editForm.allowedSpecies.length > 0 ? editForm.allowedSpecies.join(',') : undefined,
      licenseNumber:    editForm.licenseNumber || undefined,
      licenseExpiryDate: editForm.licenseExpiryDate || undefined,
      isTemporary:      editForm.isTemporary,
      temporaryEndDate: editForm.isTemporary && editForm.temporaryEndDate ? editForm.temporaryEndDate : undefined,
      notes:            editForm.notes || undefined,
    };
    setDetailModal(updated);
    setPremises(prev => prev.map(p => p.id === updated.id ? updated : p));
    setEditing(false);
  };

  const setEF = (key: keyof typeof editForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setEditForm(p => ({ ...p, [key]: e.target.value }));

  const toggleEditSpecies = (sp: string) =>
    setEditForm(p => ({
      ...p,
      allowedSpecies: p.allowedSpecies.includes(sp)
        ? p.allowedSpecies.filter(x => x !== sp)
        : [...p.allowedSpecies, sp],
    }));

  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files || !detailModal || files.length === 0) return;
    setPhotoUploading(true);
    setPhotoUploadStatus(null);

    const fileArr = Array.from(files);

    // Show local previews immediately so the user sees something
    const localEntries = fileArr.map(f => ({
      url: URL.createObjectURL(f),
      local: true,
      name: f.name,
    }));
    setDetailPhotos(prev => [...prev, ...localEntries]);

    let ok = 0;
    let fail = 0;
    let lastError = '';
    const finalEntries: { localUrl: string; finalUrl: string; name: string }[] = [];

    for (let i = 0; i < fileArr.length; i++) {
      const file = fileArr[i];
      const localUrl = localEntries[i].url;
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const storagePath = `${detailModal.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      setPhotoUploadStatus({ ok, fail, msg: `Uploading ${file.name}…` });

      // Step 1: upload to storage
      const { error: upErr } = await supabase.storage
        .from('premises-photos')
        .upload(storagePath, file, { upsert: false });

      if (upErr) {
        fail++;
        lastError = `Storage error: ${upErr.message}`;
        setPhotoUploadStatus({ ok, fail, msg: lastError });
        continue;
      }

      // Step 2: get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('premises-photos')
        .getPublicUrl(storagePath);

      // Step 3: save record in DB
      const { error: dbErr } = await supabase
        .from('farmer_premises_photos')
        .insert({ premises_id: detailModal.id, photo_url: publicUrl, file_name: file.name });

      if (dbErr) {
        fail++;
        lastError = `DB error: ${dbErr.message}`;
        setPhotoUploadStatus({ ok, fail, msg: lastError });
        continue;
      }

      ok++;
      finalEntries.push({ localUrl, finalUrl: publicUrl, name: file.name });
    }

    // Replace local blob URLs with real storage URLs; remove failed ones
    setDetailPhotos(prev => prev
      .map(p => {
        const match = finalEntries.find(e => e.localUrl === p.url);
        if (match) return { url: match.finalUrl, local: false, name: match.name };
        return p;
      })
      .filter(p => !p.local)   // drop any still-local (failed) entries
    );

    setPhotoUploading(false);
    setPhotoUploadStatus({
      ok,
      fail,
      msg: fail === 0
        ? `${ok} photo${ok !== 1 ? 's' : ''} uploaded successfully ✓`
        : lastError,   // show the actual Supabase error
    });
  };

  const handleLocationSave = async (lat: string, lng: string) => {
    if (!detailModal) return;
    setLocationSaving(true);
    const { error: err } = await supabase
      .from('farmer_premises')
      .update({ gps_latitude: parseFloat(lat), gps_longitude: parseFloat(lng) })
      .eq('id', detailModal.id);
    setLocationSaving(false);
    if (err) { setModalError(err.message); return; }
    const updated = { ...detailModal, gpsLatitude: parseFloat(lat), gpsLongitude: parseFloat(lng) };
    setDetailModal(updated);
    setPremises(prev => prev.map(p => p.id === updated.id ? updated : p));
    setLocationEditing(false);
  };

  const sec1Ref = useRef<HTMLDivElement>(null);
  const sec2Ref = useRef<HTMLDivElement>(null);
  const sec3Ref = useRef<HTMLDivElement>(null);
  const sec4Ref = useRef<HTMLDivElement>(null);
  const sec5Ref = useRef<HTMLDivElement>(null);
  const sec6Ref = useRef<HTMLDivElement>(null);
  const secRefs = [sec1Ref, sec2Ref, sec3Ref, sec4Ref, sec5Ref, sec6Ref];

  const stripRef = useRef<HTMLDivElement>(null);
  const scrollStrip = (dir: 'left' | 'right') => {
    if (!stripRef.current) return;
    stripRef.current.scrollBy({ left: dir === 'right' ? 380 : -380, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    const query = supabase.from('farmer_premises').select('*');
    // Premises reps only see their assigned premises; main farmers see all theirs.
    if (accountRole === 'PREMISES_REP' && repPremisesCode) {
      query.eq('premises_code', repPremisesCode);
    } else {
      query.eq('user_id', userId).order('created_at', { ascending: false });
    }
    query.then(({ data, error: err }) => {
      if (err) { setError('Failed to load premises'); return; }
      setPremises((data as DbPremises[]).map(toPremises));
    }).finally(() => setLoading(false));
  }, [userId, accountRole, repPremisesCode]);

  useEffect(() => {
    supabase
      .from('ministry_regions')
      .select('code, name')
      .eq('active', true)
      .order('name')
      .then(({ data }) => setRegions((data ?? []) as MinistryRegion[]));
  }, []);

  useEffect(() => {
    if (premises.length === 0) return;
    const codes = premises.map(p => p.premisesCode);
    supabase
      .from('animals')
      .select('current_premises_id, species, tag_status')
      .in('current_premises_id', codes)
      .then(({ data }) => {
        const stats: Record<string, { animalCount: number; tagCount: number; bySpecies: Record<string, number> }> = {};
        for (const animal of data ?? []) {
          const code = animal.current_premises_id as string;
          if (!stats[code]) stats[code] = { animalCount: 0, tagCount: 0, bySpecies: {} };
          stats[code].animalCount += 1;
          if ((animal.tag_status as string) === 'TAGGED') stats[code].tagCount += 1;
          const sp = ((animal.species as string) ?? '').toUpperCase();
          if (sp) stats[code].bySpecies[sp] = (stats[code].bySpecies[sp] ?? 0) + 1;
        }
        setPremisesStats(stats);
      });
  }, [premises]);

  const set = (key: keyof Form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [key]: e.target.value }));

  const toggleSpecies = (sp: string) =>
    setForm(p => ({
      ...p,
      allowedSpecies: p.allowedSpecies.includes(sp)
        ? p.allowedSpecies.filter(x => x !== sp)
        : [...p.allowedSpecies, sp],
    }));

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setForm(p => ({
          ...p,
          gpsLatitude: pos.coords.latitude.toFixed(6),
          gpsLongitude: pos.coords.longitude.toFixed(6),
        }));
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const openForm   = () => { setForm(EMPTY_FORM); setError(null); setView('form'); };
  const backToList = () => { setView('list'); setSelectedPremises(null); setBatches([]); };

  const openDetail = (p: Premises) => {
    setSelectedPremises(p);
    setView('detail');
    setBatchesLoading(true);
    supabase
      .from('batches')
      .select('*')
      .eq('premises_code', p.premisesCode)
      .then(({ data }) => setBatches((data as DbBatch[] ?? []).map(toBatch)))
      .catch(() => setBatches([]))
      .finally(() => setBatchesLoading(false));
  };
  const scrollTo   = (i: number) =>
    secRefs[i]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);

    const { data: generatedId, error: idErr } = await supabase
      .rpc('generate_premises_id', { p_region_code: form.regionCode });
    if (idErr || !generatedId) {
      setSaving(false);
      setError('Could not generate premises ID. Please try again.');
      return;
    }

    const { data, error: err } = await supabase
      .from('farmer_premises')
      .insert({
        user_id: userId,
        premises_code: generatedId as string,
        premises_name: form.premisesName,
        premises_type: form.premisesType,
        region_code: form.regionCode,
        physical_address: form.physicalAddress,
        gps_latitude: parseFloat(form.gpsLatitude),
        gps_longitude: parseFloat(form.gpsLongitude),
        area_hectares: form.areaHectares ? parseFloat(form.areaHectares) : null,
        capacity_animals: form.capacityAnimals ? parseInt(form.capacityAnimals) : null,
        allowed_species: form.allowedSpecies.join(',') || null,
        license_number: form.licenseNumber || null,
        license_expiry_date: form.licenseExpiryDate || null,
        is_temporary: form.isTemporary,
        temporary_end_date: form.isTemporary && form.temporaryEndDate ? form.temporaryEndDate : null,
        notes: form.notes || null,
      })
      .select()
      .single();

    setSaving(false);
    if (err) {
      setError(err.message ?? 'Registration failed. Please check all required fields and try again.');
      return;
    }
    const newPremises = toPremises(data as DbPremises);

    const slotEntries: { key: 'front' | 'side' | 'overview'; label: string }[] = [
      { key: 'front',    label: 'FRONT_VIEW' },
      { key: 'side',     label: 'SIDE_VIEW'  },
      { key: 'overview', label: 'OVERVIEW'   },
    ];
    for (const { key, label } of slotEntries) {
      const file = photoSlots[key];
      if (!file) continue;
      const ext  = file.name.split('.').pop() ?? 'jpg';
      const path = `${newPremises.id}/${label}.${ext}`;
      const { error: upErr } = await supabase.storage.from('premises-photos').upload(path, file, { upsert: true });
      if (upErr) continue;
      const { data: { publicUrl } } = supabase.storage.from('premises-photos').getPublicUrl(path);
      await supabase.from('farmer_premises_photos').insert({ premises_id: newPremises.id, photo_url: publicUrl, file_name: label });
    }

    setPremises(prev => [newPremises, ...prev]);
    setView('list');
  };

  const canSubmit = !saving
    && !!form.premisesName
    && !!form.premisesType
    && !!form.regionCode
    && !!form.physicalAddress
    && !!form.gpsLatitude
    && !!form.gpsLongitude
    && (!form.isTemporary || !!form.temporaryEndDate);

  /* ════════════════════════════════════
     LIST VIEW — Google Maps style
  ════════════════════════════════════ */
  if (view === 'list') {
    const totalAnimals = Object.values(premisesStats).reduce((s, v) => s + v.animalCount, 0);
    const approved     = premises.filter(p => p.status === 'APPROVED').length;

    return (
      <div className={s.gmWrap}>

        {/* ════ Full-screen map (behind everything) ════ */}
        {window.innerWidth > 640 && (
          <PremisesMapFull
            premises={premises}
            activeId={activeId}
            onPinClick={setActiveId}
            onDetailClick={openDetail}
            onAnimalsClick={goToAnimals}
            className={s.gmMap}
          />
        )}

        {/* ════ Map legend (top-right) ════ */}
        {window.innerWidth > 640 && (
          <div style={{
            position: 'absolute', top: '12px', right: '12px', zIndex: 900,
            background: 'rgba(255,255,255,0.97)', border: '1px solid #e2e8f0',
            borderRadius: 10, padding: '0.55rem 0.8rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            display: 'flex', flexDirection: 'column', gap: 5,
            fontSize: '0.7rem', fontWeight: 600, color: '#374151',
          }}>
            <div style={{ color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.58rem', marginBottom: 2 }}>Premises Type</div>
            {[
              { emoji: '🏡', label: 'Farm' },
              { emoji: '⛺', label: 'Pastoral Camp' },
              { emoji: '🌿', label: 'Grazing Area' },
              { emoji: '💧', label: 'Water Point' },
              { emoji: '🏪', label: 'Livestock Market' },
            ].map(({ emoji, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: 13 }}>{emoji}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        )}

        {/* ════ Floating header top-center ════ */}
        <div className={s.gmFloat}>
          <div className={s.gmFloatTop}>
            <div>
              <div className={s.gmFloatTitle}>My Premises</div>
              {!loading && (
                <div className={s.gmFloatStats}>
                  {premises.length} locations · {totalAnimals} animals · {approved} approved
                </div>
              )}
            </div>
            <button className={s.gmRegBtn} onClick={openForm}>
              <Plus size={13} strokeWidth={2.5} /> Register
            </button>
          </div>
          {error && <div className={s.error}>{error}</div>}
        </div>

        {/* ════ Horizontal card strip at bottom ════ */}
        {!loading && premises.length > 0 && (
          <div className={s.gmStripRow}>
            <button className={s.gmNavBtn} onClick={() => scrollStrip('left')}>&#8249;</button>
            <div className={s.gmStrip} ref={stripRef}>
            {premises.map(p => {
              const cfg      = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.DRAFT;
              const st       = premisesStats[p.premisesCode] ?? { animalCount: 0, tagCount: 0, bySpecies: {} };
              const hasGps   = !isNaN(p.gpsLatitude) && !isNaN(p.gpsLongitude);

              return (
                <div
                  key={p.id}
                  className={`${s.gmCard}${activeId === p.id ? ' ' + s.gmCardActive : ''}`}
                  onClick={() => navigate(`/premises/${p.premisesCode}`)}
                >
                  <div className={s.gmCardMeta}>
                    <span className={s.gmCardCodeLabel}>Premises ID</span>
                    <span className={s.gmCardCode}>{p.premisesCode}</span>
                  </div>
                  <div className={s.gmCardName}>{p.premisesName}</div>
                  <div className={s.gmCardSpecies}>
                    {SPECIES.map(sp => (
                      <div key={sp} className={s.gmSpBox}>
                        <span className={s.gmSpEmoji}>{SPECIES_EMOJI[sp]}</span>
                        <span className={s.gmSpCount}>{st.bySpecies[sp] ?? 0}</span>
                        <span className={s.gmSpLabel}>{sp}</span>
                      </div>
                    ))}
                  </div>
                  <div className={s.gmCardFoot}>
                    <span className={s.gmCardAnimals}><b>{st.animalCount}</b> animals</span>
                    <div className={s.gmCardLoc}>
                      <MapPin size={10} strokeWidth={2} />
                      <span>{p.regionCode}</span>
                      <span className={s.gmCardLocDot}>·</span>
                      <span>{p.premisesType.replace(/_/g, ' ')}</span>
                    </div>
                    <button
                      className={s.gmViewBtn}
                      onClick={e => { e.stopPropagation(); openDetailModal(p); }}
                    >
                      View →
                    </button>
                  </div>
                </div>
              );
            })}
            </div>
            <button className={s.gmNavBtn} onClick={() => scrollStrip('right')}>&#8250;</button>
          </div>
        )}

        {/* Empty state */}
        {!loading && premises.length === 0 && (
          <div className={s.gmEmpty}>
            <MapPin size={36} color="#cbd5e1" />
            <p>No premises registered yet</p>
            <button className={s.gmEmptyBtn} onClick={openForm}>+ Register first premises</button>
          </div>
        )}

        {/* ════ Detail Modal ════ */}
        {detailModal && (() => {
          const m   = detailModal;
          const cfg = STATUS_CONFIG[m.status] ?? STATUS_CONFIG.DRAFT;
          const st  = premisesStats[m.premisesCode] ?? { animalCount: 0, tagCount: 0, bySpecies: {} };
          const typeLabel = PREMISES_TYPES.find(t => t.value === m.premisesType)?.label ?? m.premisesType.replace(/_/g, ' ');
          const registeredDate = m.createdAt
            ? new Date(m.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
            : null;

          return (
            <>
            <div className={s.modalOverlay}>
              <div className={s.modal} onClick={e => e.stopPropagation()}>

                {/* ── Modal Header ── */}
                <div className={s.modalHeader}>
                  <div className={s.modalHeaderLeft}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div className={s.modalName}>{editing ? editForm.premisesName || m.premisesName : m.premisesName}</div>
                      {editing && <span className={s.modalEditingBadge}>Editing</span>}
                    </div>
                    <div className={s.modalTypePill}>{typeLabel} · {m.regionCode}</div>
                  </div>
                  <div className={s.modalHeaderRight}>
                    <button className={s.modalClose} onClick={() => setDetailModal(null)}>✕</button>
                    <div className={s.modalCode} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: '0.5rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', lineHeight: 1 }}>Premises ID</span>
                      {m.premisesCode}
                    </div>
                  </div>
                </div>

                {/* ── Stats strip ── */}
                <div className={s.modalStats}>
                  <div className={s.modalStat}>
                    <span className={s.modalStatNum}>{st.animalCount}</span>
                    <span className={s.modalStatLbl}>Animals</span>
                  </div>
                  <div className={s.modalStatDiv} />
                  <div className={s.modalStat}>
                    <span className={s.modalStatNum}>{m.areaHectares ?? '—'}</span>
                    <span className={s.modalStatLbl}>Hectares</span>
                  </div>
                  <div className={s.modalStatDiv} />
                  <div className={s.modalStat}>
                    <span className={s.modalStatNum}>{m.capacityAnimals ?? '—'}</span>
                    <span className={s.modalStatLbl}>Capacity</span>
                  </div>
                  <div className={s.modalStatDiv} />
                  <div className={s.modalStat}>
                    <span className={s.modalStatNum}>{m.allowedSpecies ? m.allowedSpecies.split(',').length : 0}</span>
                    <span className={s.modalStatLbl}>Species</span>
                  </div>
                </div>

                {/* ── Two-column body ── */}
                <div className={s.modalBody}>

                  {/* Left: all data fields */}
                  <div className={s.modalLeft}>
                  {!editing ? (
                    <>
                    {/* VIEW MODE */}
                    <div className={s.modalSection}>
                      <div className={s.modalSectionTitle}>Basic Information</div>
                      <div className={s.modalRow}>
                        <span className={s.modalRowLbl}>Name</span>
                        <span className={s.modalRowVal}>{m.premisesName}</span>
                      </div>
                      <div className={s.modalRow}>
                        <span className={s.modalRowLbl}>Type</span>
                        <span className={s.modalRowVal}>{typeLabel}</span>
                      </div>
                      <div className={s.modalRow}>
                        <span className={s.modalRowLbl}>Region</span>
                        <span className={s.modalRowVal}>{m.regionCode}</span>
                      </div>
                      <div className={s.modalRow}>
                        <span className={s.modalRowLbl}>Address</span>
                        <span className={s.modalRowVal}>{m.physicalAddress || '—'}</span>
                      </div>
                    </div>

                    <div className={s.modalSection}>
                      <div className={s.modalSectionTitle}>Livestock Details</div>
                      {m.allowedSpecies ? (
                        <div className={s.modalRow}>
                          <span className={s.modalRowLbl}>Species</span>
                          <div className={s.modalSpeciesTags}>
                            {m.allowedSpecies.split(',').map(sp => (
                              <span key={sp} className={s.modalSpeciesTag}>
                                {SPECIES_EMOJI[sp.trim()] ?? ''} {sp.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className={s.modalRow}>
                          <span className={s.modalRowLbl}>Species</span>
                          <span className={s.modalRowEmpty}>Not specified</span>
                        </div>
                      )}
                      <div className={s.modalRow}>
                        <span className={s.modalRowLbl}>Area</span>
                        <span className={s.modalRowVal}>{m.areaHectares ? `${m.areaHectares} hectares` : '—'}</span>
                      </div>
                      <div className={s.modalRow}>
                        <span className={s.modalRowLbl}>Capacity</span>
                        <span className={s.modalRowVal}>{m.capacityAnimals ? `${m.capacityAnimals} animals` : '—'}</span>
                      </div>
                    </div>

                    <div className={s.modalSection}>
                      <div className={s.modalSectionTitle}>Licensing</div>
                      <div className={s.modalRow}>
                        <span className={s.modalRowLbl}>License #</span>
                        <span className={m.licenseNumber ? s.modalRowValMono : s.modalRowEmpty}>
                          {m.licenseNumber || 'Not provided'}
                        </span>
                      </div>
                      <div className={s.modalRow}>
                        <span className={s.modalRowLbl}>Expiry</span>
                        <span className={s.modalRowVal}>{m.licenseExpiryDate || '—'}</span>
                      </div>
                      <div className={s.modalRow}>
                        <span className={s.modalRowLbl}>Temporary</span>
                        <span className={s.modalRowVal}>{m.isTemporary ? 'Yes' : 'No'}</span>
                      </div>
                      {m.isTemporary && m.temporaryEndDate && (
                        <div className={s.modalRow}>
                          <span className={s.modalRowLbl}>Ends</span>
                          <span className={s.modalRowVal}>{m.temporaryEndDate}</span>
                        </div>
                      )}
                    </div>

                    <div className={s.modalSection}>
                      <div className={s.modalSectionTitleRow}>
                        <span className={s.modalSectionTitle}>GPS Location</span>
                        <button className={s.modalMiniActionBtn} onClick={() => setLocationEditing(true)}>
                          <Pencil size={11} /> Change Location
                        </button>
                      </div>
                      <div className={s.modalRow}>
                        <span className={s.modalRowLbl}>Latitude</span>
                        <span className={s.modalRowValMono}>{m.gpsLatitude.toFixed(6)}°N</span>
                      </div>
                      <div className={s.modalRow}>
                        <span className={s.modalRowLbl}>Longitude</span>
                        <span className={s.modalRowValMono}>{m.gpsLongitude.toFixed(6)}°E</span>
                      </div>
                    </div>

                    {m.notes && (
                      <div className={s.modalSection}>
                        <div className={s.modalSectionTitle}>Notes</div>
                        <p className={s.modalNotes}>{m.notes}</p>
                      </div>
                    )}
                    </>
                  ) : (
                    <>
                    {/* EDIT MODE */}
                    <div className={s.modalSection}>
                      <div className={s.modalSectionTitle}>Basic Information</div>
                      <div className={s.modalRow}>
                        <span className={s.modalRowLbl}>Name</span>
                        <input className={s.modalInp} value={editForm.premisesName} onChange={setEF('premisesName')} />
                      </div>
                      <div className={s.modalRow}>
                        <span className={s.modalRowLbl}>Type</span>
                        <select className={s.modalSel} value={editForm.premisesType} onChange={setEF('premisesType')}>
                          {PREMISES_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                      <div className={s.modalRow}>
                        <span className={s.modalRowLbl}>Region</span>
                        <select className={s.modalSel} value={editForm.regionCode} onChange={setEF('regionCode')}>
                          <option value="">Select region…</option>
                          {regions.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
                        </select>
                      </div>
                      <div className={s.modalRow}>
                        <span className={s.modalRowLbl}>Address</span>
                        <input className={s.modalInp} value={editForm.physicalAddress} onChange={setEF('physicalAddress')} />
                      </div>
                    </div>

                    <div className={s.modalSection}>
                      <div className={s.modalSectionTitle}>Livestock Details</div>
                      <div className={s.modalRow}>
                        <span className={s.modalRowLbl}>Species</span>
                        <div className={s.modalSpeciesEdit}>
                          {SPECIES.map(sp => (
                            <button
                              key={sp}
                              type="button"
                              className={`${s.modalSpeciesChip} ${editForm.allowedSpecies.includes(sp) ? s.modalSpeciesChipOn : ''}`}
                              onClick={() => toggleEditSpecies(sp)}
                            >
                              {SPECIES_EMOJI[sp]} {sp.charAt(0) + sp.slice(1).toLowerCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className={s.modalRow}>
                        <span className={s.modalRowLbl}>Area (ha)</span>
                        <input className={s.modalInp} type="number" min="0" step="0.01" value={editForm.areaHectares} onChange={setEF('areaHectares')} />
                      </div>
                      <div className={s.modalRow}>
                        <span className={s.modalRowLbl}>Capacity</span>
                        <input className={s.modalInp} type="number" min="0" value={editForm.capacityAnimals} onChange={setEF('capacityAnimals')} />
                      </div>
                    </div>

                    <div className={s.modalSection}>
                      <div className={s.modalSectionTitle}>Licensing</div>
                      <div className={s.modalRow}>
                        <span className={s.modalRowLbl}>License #</span>
                        <input className={s.modalInp} value={editForm.licenseNumber} onChange={setEF('licenseNumber')} />
                      </div>
                      <div className={s.modalRow}>
                        <span className={s.modalRowLbl}>Expiry</span>
                        <input className={s.modalInp} type="date" value={editForm.licenseExpiryDate} onChange={setEF('licenseExpiryDate')} />
                      </div>
                      <div className={s.modalRow}>
                        <span className={s.modalRowLbl}>Temporary</span>
                        <label className={s.modalCheckRow}>
                          <input type="checkbox" checked={editForm.isTemporary} onChange={e => setEditForm(p => ({ ...p, isTemporary: e.target.checked }))} />
                          Temporary / seasonal premises
                        </label>
                      </div>
                      {editForm.isTemporary && (
                        <div className={s.modalRow}>
                          <span className={s.modalRowLbl}>End Date</span>
                          <input className={s.modalInp} type="date" value={editForm.temporaryEndDate} onChange={setEF('temporaryEndDate')} />
                        </div>
                      )}
                    </div>

                    <div className={s.modalSection}>
                      <div className={s.modalSectionTitle}>Notes</div>
                      <textarea className={s.modalTextarea} rows={3} value={editForm.notes} onChange={setEF('notes')} />
                    </div>
                    </>
                  )}
                  </div>

                  {/* Right: map + photos */}
                  <div className={s.modalRight}>

                    {/* Mini map — click to expand */}
                    <div
                      className={`${s.modalMapWrap} ${s.modalMapWrapClickable}`}
                      onClick={() => setMapLightbox(true)}
                    >
                      <MiniMap lat={m.gpsLatitude} lng={m.gpsLongitude} zoom={3} />
                    </div>

                    {/* Photos */}
                    <div className={s.modalPhotosSection}>
                      <div className={s.modalSectionTitleRow}>
                        <span className={s.modalSectionTitle}>Photos &amp; Documents</span>
                        <label className={`${s.modalUploadBtn}${photoUploading ? ' ' + s.modalUploadBtnBusy : ''}`}>
                          <input
                            type="file"
                            multiple
                            accept="image/*,.pdf"
                            style={{ display: 'none' }}
                            onChange={e => { handlePhotoUpload(e.target.files); e.target.value = ''; }}
                            disabled={photoUploading}
                          />
                          {photoUploading ? '⏳ Uploading…' : '+ Upload Photo'}
                        </label>
                      </div>

                      {/* Upload status banner */}
                      {photoUploadStatus && (
                        <div className={`${s.photoStatusBanner} ${photoUploadStatus.fail > 0 ? s.photoStatusError : s.photoStatusOk}`}>
                          {photoUploadStatus.msg}
                          <button className={s.photoStatusDismiss} onClick={() => setPhotoUploadStatus(null)}>×</button>
                        </div>
                      )}

                      {detailLoading ? (
                        <div className={s.modalPhotosLoading}>Loading photos…</div>
                      ) : detailPhotos.length > 0 ? (
                        <div className={s.modalPhotosGrid}>
                          {detailPhotos.map((photo, i) => (
                            <div
                              key={i}
                              className={`${s.modalPhoto}${photo.local ? ' ' + s.modalPhotoLocal : ''}`}
                              onClick={() => !photo.local && setPhotoLightbox(photo.url)}
                            >
                              <img src={photo.url} alt={photo.name} className={s.modalPhotoImg} />
                              {photo.local && <div className={s.modalPhotoUploading}>Uploading…</div>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className={s.modalPhotosEmpty}>
                          <span>📷</span>
                          <span>No photos yet — click Upload Photo above</span>
                        </div>
                      )}
                    </div>

                  </div>
                </div>

                {/* ── Error banner ── */}
                {modalError && <div className={s.modalErrorBanner}>{modalError}</div>}

                {/* ── Footer ── */}
                <div className={s.modalFooter}>
                  {registeredDate && !editing && (
                    <span className={s.modalRegisteredDate}>Registered {registeredDate}</span>
                  )}
                  {editing && <span className={s.modalRegisteredDate}>Make changes then click Save</span>}
                  <div className={s.modalFooterActions}>
                    {!editing ? (
                      <>
                        <button className={s.modalCancelBtn} onClick={() => setDetailModal(null)}>Close</button>
                        <button className={s.modalEditBtn} onClick={() => startEditing(m)}>
                          <Pencil size={13} /> Edit Details
                        </button>
                        <button className={s.modalViewBatchesBtn} onClick={() => { setDetailModal(null); navigate(`/premises/${m.premisesCode}`); }}>
                          View Batches →
                        </button>
                      </>
                    ) : (
                      <>
                        <button className={s.modalCancelBtn} onClick={() => { setEditing(false); setModalError(null); }}>Cancel</button>
                        <button className={s.modalSaveBtn} disabled={modalSaving} onClick={handleModalSave}>
                          {modalSaving ? 'Saving…' : 'Save Changes'}
                        </button>
                      </>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Map lightbox */}
            {mapLightbox && (
              <MapLightbox lat={m.gpsLatitude} lng={m.gpsLongitude} onClose={() => setMapLightbox(false)} />
            )}

            {/* Photo lightbox */}
            {photoLightbox && (
              <PhotoLightbox url={photoLightbox} onClose={() => setPhotoLightbox(null)} />
            )}

            {/* Location editor */}
            {locationEditing && (
              <LocationEditorLightbox
                initialLat={detailModal.gpsLatitude}
                initialLng={detailModal.gpsLongitude}
                saving={locationSaving}
                onSave={handleLocationSave}
                onClose={() => setLocationEditing(false)}
              />
            )}
            </>
          );
        })()}

      </div>
    );
  }

  /* ════════════════════════════════════
     DETAIL VIEW — premises + batches
  ════════════════════════════════════ */
  if (view === 'detail' && selectedPremises) {
    const p   = selectedPremises;
    const cfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.DRAFT;
    const openBatches   = batches.filter(b => b.status === 'OPEN');
    const closedBatches = batches.filter(b => b.status === 'CLOSED');

    const batchStatusColor: Record<string, { bg: string; text: string }> = {
      OPEN:     { bg: '#dcfce7', text: '#16a34a' },
      CLOSED:   { bg: '#f3f4f6', text: '#6b7280' },
      ARCHIVED: { bg: '#f3f4f6', text: '#9ca3af' },
    };

    return (
      <div className={s.pageWrap}>
      <div className={s.page}>

        {/* Header */}
        <div className={s.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className={s.backBtn}
              onClick={backToList}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', fontSize: 13, cursor: 'pointer', color: '#374151' }}
            >
              <ChevronLeft size={14} /> Back
            </button>
            <div>
              <h1 className={s.title}>{p.premisesName}</h1>
              <p className={s.sub}>{p.premisesCode} · {p.premisesType.replace(/_/g, ' ')}</p>
            </div>
          </div>
          <span className={s.statusPill} style={{ color: cfg.color, background: cfg.color + '18', border: `1px solid ${cfg.color}40`, padding: '5px 12px', borderRadius: 20, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
            <cfg.Icon size={12} /> {cfg.label}
          </span>
        </div>

        {/* Premises meta */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b' }}>
            <MapPin size={13} color="#94a3b8" />
            {p.regionCode}
          </div>
          <div style={{ fontSize: 13, color: '#64748b' }}>
            GPS {p.gpsLatitude.toFixed(4)}, {p.gpsLongitude.toFixed(4)}
          </div>
          {p.capacityAnimals && (
            <div style={{ fontSize: 13, color: '#64748b' }}>
              Capacity: {p.capacityAnimals} animals
            </div>
          )}
          {p.allowedSpecies && (
            <div style={{ display: 'flex', gap: 5 }}>
              {p.allowedSpecies.split(',').map(sp => (
                <span key={sp} className={s.speciesTag}>{sp}</span>
              ))}
            </div>
          )}
        </div>

        {/* Batches section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Layers size={18} color="#0b5ed7" />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>Registration Batches</span>
          {!batchesLoading && (
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
              {batches.length === 0 ? 'No batches' : `${batches.length} batch${batches.length !== 1 ? 'es' : ''}`}
            </span>
          )}
        </div>

        {batchesLoading ? (
          <div className={s.grid}>{[1, 2].map(i => <div key={i} className={s.skeleton} />)}</div>
        ) : batches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af', background: '#f8fafc', borderRadius: 12, border: '1px dashed #e2e8f0' }}>
            <Layers size={40} color="#e2e8f0" style={{ marginBottom: 12 }} />
            <p style={{ margin: 0, fontSize: 14 }}>No batches at this premises yet</p>
            <p style={{ margin: '6px 0 0', fontSize: 12 }}>Batches are opened by field inspectors or vets during group registration sessions.</p>
          </div>
        ) : (
          <>
            {openBatches.length > 0 && (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                  Active Batches
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                  {openBatches.map(b => (
                    <BatchCard key={b.id} batch={b} colors={batchStatusColor[b.status]} />
                  ))}
                </div>
              </>
            )}
            {closedBatches.length > 0 && (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, marginTop: openBatches.length > 0 ? 8 : 0 }}>
                  Closed Batches
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {closedBatches.map(b => (
                    <BatchCard key={b.id} batch={b} colors={batchStatusColor[b.status]} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
      <MobileTrackerPanel />
    </div>
    );
  }

  /* ════════════════════════════════════
     FORM VIEW  (RegisterPage-style)
  ════════════════════════════════════ */
  return (
    <div className={s.formPage}>
      <div className={s.formLayout}>

        {/* ── Sidebar ── */}
        <aside className={s.sidebar}>
          <div className={s.sideInner}>

            <div className={s.sideBrand}>
              <div className={s.sideMark}>SL</div>
              <div>
                <div className={s.sideName}>QXLITS</div>
                <div className={s.sideSub}>Premises Registration</div>
              </div>
            </div>

            <div className={s.sideBlock}>
              <div className={s.sideBlockTitle}>Sections</div>
              <nav className={s.sideNav}>
                {SECTIONS.map((sec, i) => {
                  const done = sec.done(form, photoSlotFiles, uploadDocs);
                  return (
                    <button
                      key={sec.num}
                      type="button"
                      className={`${s.sideNavBtn} ${done ? s.sideNavBtnDone : ''}`}
                      onClick={() => scrollTo(i)}
                    >
                      {done
                        ? <span className={s.sideNavNumDone}>✓</span>
                        : <span className={s.sideNavNum}>{sec.num}</span>
                      }
                      {sec.label}
                      {done && <span className={s.sideNavCheck}>✓</span>}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className={s.sideBlock}>
              <div className={s.sideBlockTitle}>What Happens Next</div>
              <ol className={s.stepsList}>
                <li>
                  <div className={s.stepsNum}>1</div>
                  <div>
                    <strong>Submit Application</strong>
                    <span>Your premises details are sent to the Ministry for review</span>
                  </div>
                </li>
                <li>
                  <div className={s.stepsNum}>2</div>
                  <div>
                    <strong>Field Verification</strong>
                    <span>A field officer may visit to confirm the location and conditions</span>
                  </div>
                </li>
                <li>
                  <div className={s.stepsNum}>3</div>
                  <div>
                    <strong>Official Approval</strong>
                    <span>You receive your official premises code upon approval</span>
                  </div>
                </li>
              </ol>
            </div>

            <div className={s.sideHelp}>
              <span className={s.sideHelpIcon}>ℹ</span>
              <span>All registered premises are subject to Ministry inspection. Keep your records accurate and up to date.</span>
            </div>

            <div className={s.sideActions}>
              <button type="button" className={s.backBtn} onClick={backToList}>
                ← Back to My Premises
              </button>
            </div>

          </div>
        </aside>

        {/* ── Main form ── */}
        <main className={s.formMain}>

          {error && <div className={s.errorBox}>{error}</div>}

          {/* ── Section 1: Basic Information ── */}
          <div className={s.sec} ref={sec1Ref}>
            <div className={s.secHead}>
              <div className={s.secBadge}>01</div>
              <div className={s.secTitle}>Basic Information</div>
              {SECTIONS[0].done(form, photoSlotFiles, uploadDocs) && <span className={s.secDoneLabel}>Complete</span>}
            </div>
            <div className={s.f}>
              <label className={s.lbl}>Premises Name <span className={s.req}>*</span></label>
              <input className={s.inp} value={form.premisesName} onChange={set('premisesName')} onFocus={focus('premisesName')} />
            </div>
            <div className={s.f}>
              <label className={s.lbl}>Premises Type <span className={s.req}>*</span></label>
              <div className={s.typeGrid}>
                {PREMISES_TYPES.map(t => (
                  <button key={t.value} type="button"
                    className={`${s.typeTile}${form.premisesType === t.value ? ' ' + s.typeTileActive : ''}`}
                    onClick={() => { setForm(p => ({ ...p, premisesType: t.value })); setFocusedField('premisesType'); }}
                    onFocus={focus('premisesType')}>
                    <span style={{ fontSize: 28, lineHeight: 1 }}>{t.emoji}</span>
                    <span className={s.typeTileLabel}>{t.label}</span>
                    <span className={s.typeTileDesc}>{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className={s.f}>
              <label className={s.lbl}>Physical Address <span className={s.req}>*</span></label>
              <input className={s.inp} value={form.physicalAddress} onChange={set('physicalAddress')} onFocus={focus('physicalAddress')} />
            </div>
          </div>

          {/* ── Section 2: Location Details ── */}
          <div className={s.sec} ref={sec2Ref}>
            <div className={s.secHead}>
              <div className={s.secBadge}>02</div>
              <div className={s.secTitle}>Location Details</div>
              {SECTIONS[1].done(form, photoSlotFiles, uploadDocs) && <span className={s.secDoneLabel}>Complete</span>}
            </div>
            <div className={s.f}>
              <label className={s.lbl}>Region <span className={s.req}>*</span></label>
              <select className={s.sel} value={form.regionCode} onChange={set('regionCode')} onFocus={focus('regionCode')}>
                <option value="">Select region…</option>
                {regions.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
              </select>
            </div>
          </div>

          {/* ── Section 3: Livestock Details ── */}
          <div className={s.sec} ref={sec3Ref}>
            <div className={s.secHead}>
              <div className={s.secBadge}>03</div>
              <div className={s.secTitle}>Livestock Details</div>
              {SECTIONS[2].done(form, photoSlotFiles, uploadDocs) && <span className={s.secDoneLabel}>Complete</span>}
            </div>
            <div className={s.f}>
              <label className={s.lbl}>Allowed Species <span className={s.req}>*</span></label>
              <div className={s.speciesGrid} onClick={focus('allowedSpecies')}>
                {SPECIES.map(sp => (
                  <label key={sp} className={`${s.speciesChip} ${form.allowedSpecies.includes(sp) ? s.speciesChipOn : ''}`}>
                    <input type="checkbox" checked={form.allowedSpecies.includes(sp)} onChange={() => toggleSpecies(sp)} onFocus={focus('allowedSpecies')} className={s.hidden} />
                    {sp.charAt(0) + sp.slice(1).toLowerCase()}
                  </label>
                ))}
              </div>
            </div>
            <div className={s.grid2}>
              <div className={s.f}>
                <label className={s.lbl}>Area (hectares) <span className={s.opt}>(optional)</span></label>
                <input className={s.inp} type="number" min="0" step="0.01" value={form.areaHectares} onChange={set('areaHectares')} onFocus={focus('areaHectares')} />
              </div>
              <div className={s.f}>
                <label className={s.lbl}>Animal Capacity <span className={s.opt}>(optional)</span></label>
                <input className={s.inp} type="number" min="0" value={form.capacityAnimals} onChange={set('capacityAnimals')} onFocus={focus('capacityAnimals')} />
              </div>
            </div>
          </div>

          {/* ── Section 4: Licensing ── */}
          <div className={s.sec} ref={sec4Ref}>
            <div className={s.secHead}>
              <div className={s.secBadge}>04</div>
              <div className={s.secTitle}>Licensing</div>
              <span className={s.secDoneLabel}>Optional</span>
            </div>
            <div className={s.grid2}>
              <div className={s.f}>
                <label className={s.lbl}>License Number</label>
                <input className={s.inp} value={form.licenseNumber} onChange={set('licenseNumber')} onFocus={focus('licenseNumber')} />
              </div>
              <div className={s.f}>
                <label className={s.lbl}>License Expiry Date</label>
                <input className={s.inp} type="date" value={form.licenseExpiryDate} onChange={set('licenseExpiryDate')} onFocus={focus('licenseExpiryDate')} />
              </div>
            </div>
            <div className={s.f}>
              <label className={s.toggleRow}>
                <input type="checkbox" className={s.hidden} checked={form.isTemporary} onChange={e => setForm(p => ({ ...p, isTemporary: e.target.checked, temporaryEndDate: '' }))} onFocus={focus('isTemporary')} />
                <span className={`${s.toggleTrack} ${form.isTemporary ? s.toggleOn : ''}`}>
                  <span className={s.toggleThumb} />
                </span>
                <span className={s.toggleLabel}>This is a temporary / seasonal premises</span>
              </label>
            </div>
            {form.isTemporary && (
              <div className={s.f} style={{ background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 10, padding: '0.875rem 1rem' }}>
                <label className={s.lbl}>
                  Closing Date <span className={s.req}>*</span>
                  <span style={{ fontWeight: 400, color: '#92400e', fontSize: '0.75rem', marginLeft: '0.5rem' }}>Registration expires on this date</span>
                </label>
                <input
                  className={s.inp}
                  type="date"
                  value={form.temporaryEndDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={set('temporaryEndDate')}
                  onFocus={focus('temporaryEndDate')}
                  required
                />
                {form.isTemporary && !form.temporaryEndDate && (
                  <p style={{ fontSize: '0.75rem', color: '#b45309', margin: '0.375rem 0 0' }}>A closing date is required for temporary premises.</p>
                )}
              </div>
            )}
            <div className={s.f}>
              <label className={s.lbl}>Additional Notes <span className={s.opt}>(optional)</span></label>
              <textarea className={s.textarea} value={form.notes} onChange={set('notes')} onFocus={focus('notes')} rows={3} />
            </div>
          </div>

          {/* ── Section 5: GPS & Map Pin ── */}
          <div className={s.sec} ref={sec5Ref}>
            <div className={s.secHead}>
              <div className={s.secBadge}>05</div>
              <div className={s.secTitle}>GPS & Map Pin</div>
              {SECTIONS[4].done(form, photoSlotFiles, uploadDocs) && <span className={s.secDoneLabel}>Complete</span>}
            </div>
            <p className={s.secSub}>Click anywhere on the map to pin the premises location, or type coordinates below.</p>

            <PinMap
              lat={form.gpsLatitude}
              lng={form.gpsLongitude}
              onChange={(lat, lng) => setForm(p => ({ ...p, gpsLatitude: lat, gpsLongitude: lng }))}
            />

            <div className={s.grid2} style={{ marginTop: '1rem' }}>
              <div className={s.f}>
                <label className={s.lbl}>Latitude <span className={s.req}>*</span></label>
                <input
                  className={`${s.inp} ${s.mono}`}
                  type="number" step="0.000001"
                  value={form.gpsLatitude} onChange={set('gpsLatitude')} onFocus={focus('gpsLatitude')}
                />
              </div>
              <div className={s.f}>
                <label className={s.lbl}>Longitude <span className={s.req}>*</span></label>
                <input
                  className={`${s.inp} ${s.mono}`}
                  type="number" step="0.000001"
                  value={form.gpsLongitude} onChange={set('gpsLongitude')} onFocus={focus('gpsLongitude')}
                />
              </div>
            </div>

            <button type="button" className={s.locateBtn} onClick={useMyLocation} disabled={locating}>
              <Crosshair size={14} strokeWidth={2} />
              {locating ? 'Locating…' : 'Use My Location'}
            </button>
          </div>

          {/* ── Section 6: Photos & Documents ── */}
          <div className={s.sec} ref={sec6Ref}>
            <div className={s.secHead}>
              <div className={s.secBadge}>06</div>
              <div className={s.secTitle}>Photos &amp; Documents</div>
              {SECTIONS[5].done(form, photoSlotFiles, uploadDocs) && <span className={s.secDoneLabel}>Complete</span>}
            </div>

            {/* ── Photo upload — 3 named slots ── */}
            <div className={s.f}>
              <div className={s.uploadLabel}>Upload Premises Photos</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.875rem' }}>
                {([
                  { key: 'front'    as const, icon: '📷', title: 'Front View',    hint: 'Main entrance or front facade' },
                  { key: 'side'     as const, icon: '🏞️', title: 'Side View',     hint: 'Side or back of the premises' },
                  { key: 'overview' as const, icon: '🗺️', title: 'Overview',      hint: 'Wide shot showing the whole area' },
                ] as const).map(slot => (
                  <div key={slot.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#374151' }}>{slot.title}</div>
                    {photoSlots[slot.key] ? (
                      <div style={{ position: 'relative' }}>
                        <PhotoPreview
                          file={photoSlots[slot.key]!}
                          onRemove={() => setPhotoSlots(p => ({ ...p, [slot.key]: null }))}
                        />
                      </div>
                    ) : (
                      <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', border: '2px dashed #d1d5db', borderRadius: 10, padding: '1.25rem 0.75rem', cursor: 'pointer', background: '#f9fafb', minHeight: 110, textAlign: 'center' }}>
                        <input
                          type="file"
                          accept="image/*"
                          className={s.hidden}
                          onChange={e => {
                            const file = e.target.files?.[0] ?? null;
                            if (file) setPhotoSlots(p => ({ ...p, [slot.key]: file }));
                            e.target.value = '';
                          }}
                        />
                        <span style={{ fontSize: '1.5rem' }}>{slot.icon}</span>
                        <span style={{ fontSize: '0.75rem', color: '#6b7280', lineHeight: 1.4 }}>{slot.hint}</span>
                        <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Click to upload</span>
                      </label>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>JPG, PNG, WEBP — max 10 MB each</div>
            </div>

            {/* ── Registration document upload ── */}
            <div className={s.f}>
              <div className={s.uploadLabel}>Upload Registration Documents</div>
              <label className={s.uploadZone}>
                <input
                  type="file"
                  multiple
                  accept=".pdf,image/*"
                  className={s.hidden}
                  onChange={e => setUploadDocs(prev => [...prev, ...Array.from(e.target.files ?? [])])}
                />
                <div className={s.uploadIcon}>📄</div>
                <div className={s.uploadText}>Click to upload registration documents</div>
                <div className={s.uploadHint}>PDF, JPG, PNG — licenses, permits, certificates</div>
              </label>
              {uploadDocs.length > 0 && (
                <div className={s.uploadFileList}>
                  {uploadDocs.map((f, i) => (
                    <div key={i} className={s.uploadFile}>
                      <span className={s.uploadFileName}>{f.name}</span>
                      <button
                        type="button"
                        className={s.uploadRemove}
                        onClick={() => setUploadDocs(prev => prev.filter((_, j) => j !== i))}
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Bottom submit bar ── */}
          <div className={s.formSubmit}>
            <button type="button" className={s.submitBtn} disabled={!canSubmit} onClick={handleSubmit}>
              {saving ? 'Registering…' : 'Register Premises'}
            </button>
            <button type="button" className={s.backBtn} onClick={backToList}>← Back to My Premises</button>
          </div>

        </main>

        {/* ── Right help panel ── */}
        <aside className={s.helpPanel}>
          <div className={s.helpInner}>
            {focusedField && FIELD_HELP[focusedField] ? (() => {
              const h = FIELD_HELP[focusedField];
              return (
                <>
                  <div className={s.helpHeader}>
                    <span className={s.helpTitle}>{h.title}</span>
                  </div>
                  <p className={s.helpBody}>{h.body}</p>
                  {h.tip && (
                    <div className={s.helpTip}>
                      <span className={s.helpTipLabel}>Tip</span>
                      <span className={s.helpTipText}>{h.tip}</span>
                    </div>
                  )}
                </>
              );
            })() : (
              <div className={s.helpIdle}>
                <div className={s.helpIdleIcon}>?</div>
                <div className={s.helpIdleTitle}>Field Help</div>
                <div className={s.helpIdleSub}>Click any field in the form to see guidance on how to fill it in correctly.</div>
              </div>
            )}
          </div>
        </aside>

      </div>
    </div>
  );
}

export default PremisesPage;

// ── BatchCard sub-component ─────────────────────────────────────────────────

function BatchCard({ batch, colors }: { batch: Batch; colors: { bg: string; text: string } }) {
  const opened = new Date(batch.createdAt).toLocaleDateString();
  const closed = batch.closedAt ? new Date(batch.closedAt).toLocaleDateString() : null;

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 12,
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
    }}>
      {/* Left: batch code + species */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 15, color: '#0f172a', letterSpacing: '0.02em' }}>
            {batch.batchCode}
          </span>
          <span style={{
            fontSize: 11, fontWeight: 700, borderRadius: 20,
            padding: '2px 9px', background: colors.bg, color: colors.text,
          }}>
            {batch.status}
          </span>
        </div>
        <div style={{ fontSize: 12, color: '#64748b', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {batch.species && <span>Species: {batch.species}</span>}
          <span>Opened {opened}</span>
          {closed && <span>Closed {closed}</span>}
          {batch.notes && <span style={{ fontStyle: 'italic' }}>{batch.notes}</span>}
        </div>
      </div>
      {/* Right: animal count */}
      <div style={{ textAlign: 'center', flexShrink: 0 }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#0b5ed7', lineHeight: 1 }}>{batch.animalCount}</div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>animals</div>
      </div>
    </div>
  );
}
