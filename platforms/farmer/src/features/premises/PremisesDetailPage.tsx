import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin, Beef, CheckCircle, Clock, XCircle, AlertCircle, Plus, Tag,
  Truck, ChevronRight, ArrowUpFromLine, ArrowDownToLine, HeartPulse, Home, ShieldAlert, AlertTriangle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth.store';
import { MovementRequestModal } from '../movements/MovementRequestModal';
import { HealthRequestModal } from '../health/HealthRequestModal';
import { TagInventoryPage } from './TagInventoryPage';
import { RequestModal } from '@/features/tags/TagRequestPage';
import s from './premisesDetail.module.css';

// ── Interfaces ────────────────────────────────────────────────────────────────

interface Premises {
  id: string;
  premisesCode: string;
  premisesName: string;
  premisesType: string;
  status: string;
  regionCode: string;
  physicalAddress: string;
  gpsLatitude: number;
  gpsLongitude: number;
  areaHectares?: number;
  capacityAnimals?: number;
  allowedSpecies?: string;
  licenseNumber?: string;
}

interface Animal {
  id: string;
  animal_tag_id: string;
  species: string;
  breed?: string;
  gender?: string;
  status: string;
  date_of_birth?: string;
  batch_id?: string;
}

interface Batch {
  id: string;
  batchCode: string;
  batchName: string;
  species: string;
  breed: string;
  count: number;
  purpose: string;
  status: string;
  region: string;
  createdAt: string;
}

interface AnimalDetail { id?: string; tag_id: string; species: string; breed: string; gender: string; status: string; photoUrl?: string; }

interface FullTagRequest {
  id: string; quantity: number; tagType: string; reason: string;
  status: string; requestedAt: string; processedAt?: string; notes?: string;
}

interface TagReplacement {
  id: string;
  animalId: string;
  animalCode: string | null;
  oldTagSerial: string | null;
  newTagSerial: string | null;
  evidenceUrl: string | null;
  reason: string;
  notes: string | null;
  status: string;
  requestedByName: string | null;
  createdAt: string;
}

interface PremisesMovement {
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
  animalIds:               string[];
  animalTagIds:            string[];
  animalDetails:           AnimalDetail[];
  createdAt:               string;
}

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  APPROVED:  { label: 'Approved',  color: '#16a34a', bg: '#dcfce7', Icon: CheckCircle },
  SUBMITTED: { label: 'Submitted', color: '#0b5ed7', bg: '#dbeafe', Icon: Clock       },
  DRAFT:     { label: 'Draft',     color: '#64748b', bg: '#f1f5f9', Icon: Clock       },
  REJECTED:  { label: 'Rejected',  color: '#dc2626', bg: '#fee2e2', Icon: XCircle     },
  SUSPENDED: { label: 'Suspended', color: '#d97706', bg: '#fef3c7', Icon: AlertCircle },
};

const MOV_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  SUBMITTED:            { label: 'Submitted',          color: '#2563eb', bg: '#eff6ff' },
  INSPECTION_ASSIGNED:  { label: 'Inspection Assigned', color: '#0891b2', bg: '#ecfeff' },
  INSPECTION_FAILED:    { label: 'Inspection Failed',   color: '#dc2626', bg: '#fef2f2' },
  UNDER_REVIEW:         { label: 'Under Review',        color: '#7c3aed', bg: '#f5f3ff' },
  APPROVED:             { label: 'Approved',            color: '#059669', bg: '#ecfdf5' },
  REJECTED:             { label: 'Rejected',            color: '#dc2626', bg: '#fef2f2' },
  PERMIT_ISSUED:        { label: 'Permit Issued',       color: '#6366f1', bg: '#eef2ff' },
  IN_TRANSIT:           { label: 'In Transit',          color: '#d97706', bg: '#fffbeb' },
  ARRIVAL_CONFIRMED:    { label: 'Arrived — Confirmed',  color: '#9333ea', bg: '#fdf4ff' },
  COMPLETED:            { label: 'Completed',           color: '#16a34a', bg: '#f0fdf4' },
  CANCELLED:            { label: 'Cancelled',           color: '#94a3b8', bg: '#f8fafc' },
};

const BATCH_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT:              { label: 'Draft',               color: '#64748b', bg: '#f1f5f9' },
  SUBMITTED:          { label: 'Submitted',            color: '#0b5ed7', bg: '#dbeafe' },
  UNDER_REVIEW:       { label: 'Under Review',         color: '#d97706', bg: '#fef3c7' },
  APPROVED:           { label: 'Approved',             color: '#16a34a', bg: '#dcfce7' },
  REJECTED:           { label: 'Rejected',             color: '#dc2626', bg: '#fee2e2' },
  TAGGED:             { label: 'Tagged',               color: '#7c3aed', bg: '#f5f3ff' },
  CLOSED:             { label: 'Closed',               color: '#475569', bg: '#f1f5f9' },
  PENDING_QUARANTINE: { label: 'Awaiting Inspection',  color: '#b45309', bg: '#fef3c7' },
  QUARANTINE:         { label: 'In Quarantine',        color: '#d97706', bg: '#ffedd5' },
};

const SPECIES_EMOJI: Record<string, string> = {
  CATTLE: '🐄', CAMEL: '🐪', GOAT: '🐐', SHEEP: '🐑',
};
const SPECIES = ['CATTLE', 'CAMEL', 'GOAT', 'SHEEP'];

const TABS = ['Incoming', 'Available', 'Outgoing', 'Quarantine', 'Slaughterhouse', 'Exported', 'Tag Requests', 'My Tags', 'Tag Replacement Requests'] as const;
type Tab = typeof TABS[number];

const REPL_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:   { label: 'Pending',   color: '#b45309', bg: '#fef3c7' },
  APPROVED:  { label: 'Approved',  color: '#15803d', bg: '#dcfce7' },
  REJECTED:  { label: 'Rejected',  color: '#b91c1c', bg: '#fee2e2' },
  COMPLETED: { label: 'Completed', color: '#1d4ed8', bg: '#eff6ff' },
  CANCELLED: { label: 'Cancelled', color: '#64748b', bg: '#f1f5f9' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function toAge(dob?: string): string {
  if (!dob) return '—';
  const diff   = Date.now() - new Date(dob).getTime();
  const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
  if (months < 1)  return '< 1 mo';
  if (months < 12) return `${months} mo`;
  return `${Math.floor(months / 12)} yr`;
}

function mapMovement(r: any): PremisesMovement {
  return {
    id:                      r.id,
    movementCode:            r.movement_code,
    status:                  r.status,
    originPremisesName:      r.origin_premises_name ?? r.origin_premises_code,
    originPremisesCode:      r.origin_premises_code,
    destinationPremisesCode: r.destination_premises_code,
    destinationPremisesName: r.destination_premises_name ?? r.destination_premises_code,
    movementTypeCode:        r.movement_type_code,
    purpose:                 r.purpose,
    plannedDepartureDate:    r.planned_departure_date,
    plannedArrivalDate:      r.planned_arrival_date,
    vehicleRegistration:     r.vehicle_registration ?? '',
    animalCount:             r.animal_count ?? 0,
    animalIds:               Array.isArray(r.animal_ids)     ? r.animal_ids     : [],
    animalTagIds:            Array.isArray(r.animal_tag_ids) ? r.animal_tag_ids : [],
    animalDetails:           Array.isArray(r.animal_details) ? r.animal_details : [],
    createdAt:               r.created_at,
  };
}

// ── Premises mini-map ─────────────────────────────────────────────────────────

function PremisesMap({ lat, lng, name }: { lat: number; lng: number; name: string }) {
  const ref    = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current || !lat || !lng) return;
    const map = L.map(ref.current, { center: [lat, lng], zoom: 7, attributionControl: false, zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(map);
    L.marker([lat, lng], {
      icon: L.divIcon({
        className: '',
        html: `<div style="width:16px;height:16px;border-radius:50%;background:#0b5ed7;border:3px solid #fff;box-shadow:0 0 0 3px #93c5fd,0 2px 10px rgba(11,94,215,0.5);"></div>`,
        iconSize: [16, 16], iconAnchor: [8, 8],
      }),
    }).bindTooltip(name, { permanent: true, direction: 'top', offset: [0, -14] }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [lat, lng, name]);

  return <div ref={ref} className={s.mvMapBox} />;
}

// ── Ear tag SVG ──────────────────────────────────────────────────────────────

function RFIDTag({ serial }: { serial: string }) {
  return (
    <svg width="90" height="76" viewBox="0 0 110 100" style={{ display: 'block' }}>
      <rect x="40" y="2" width="30" height="18" rx="6" fill="#eab308" stroke="#713f12" strokeWidth="2" />
      <circle cx="55" cy="11" r="4.5" fill="#e5e7eb" stroke="#713f12" strokeWidth="1.5" />
      <circle cx="55" cy="11" r="2" fill="white" />
      <rect x="2" y="14" width="106" height="84" rx="14" fill="#eab308" stroke="#713f12" strokeWidth="2" />
      <rect x="14" y="27" width="18" height="13" rx="2" fill="rgba(0,0,0,0.3)" />
      <rect x="16" y="29" width="14" height="9" rx="1" fill="#1e293b" />
      <path d="M76,28 Q81,34 76,40" fill="none" stroke="#422006" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M81,25 Q89,34 81,43" fill="none" stroke="#422006" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <text x="55" y="57" fontSize="6.5" fill="#422006" fontFamily="monospace" textAnchor="middle" letterSpacing="1.5">ID NUMBER</text>
      <text x="55" y="70" fontSize="10" fill="#1c1917" fontFamily="monospace" fontWeight="bold" textAnchor="middle">{serial.slice(-10)}</text>
      <text x="55" y="83" fontSize="7" fill="#713f12" fontFamily="monospace" textAnchor="middle" opacity="0.7">{serial.slice(0, -10)}</text>
    </svg>
  );
}

// ── Animal status colours ─────────────────────────────────────────────────────

const ANIMAL_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVE:             { label: 'Active',              color: '#16a34a', bg: '#dcfce7' },
  active:             { label: 'Active',              color: '#16a34a', bg: '#dcfce7' },
  PENDING_QUARANTINE: { label: 'Awaiting Inspection', color: '#b45309', bg: '#fef3c7' },
  QUARANTINE:         { label: 'In Quarantine',       color: '#d97706', bg: '#ffedd5' },
  SLAUGHTERED:        { label: 'Slaughtered',         color: '#dc2626', bg: '#fee2e2' },
  EXPORTED:           { label: 'Exported',            color: '#7c3aed', bg: '#f5f3ff' },
  DEAD:               { label: 'Dead',                color: '#94a3b8', bg: '#f1f5f9' },
};

// ── Movement list for a tab ───────────────────────────────────────────────────

interface AnimalInfo { tagId: string; species: string; breed: string; gender: string; status: string; photoUrl?: string; }

function MovementList({ movements, dir, onConfirmArrival, onDispatch }: {
  movements:         PremisesMovement[];
  dir:               'outgoing' | 'incoming';
  onConfirmArrival?: (movementCode: string) => Promise<void>;
  onDispatch?:       (movementCode: string) => Promise<void>;
}) {
  const navigate    = useNavigate();
  const [expandedId,  setExpandedId]  = useState<string | null>(null);
  const [confirming,  setConfirming]  = useState<string | null>(null);
  const [dispatching, setDispatching] = useState<string | null>(null);

  if (movements.length === 0) {
    return (
      <div className={s.tabEmpty}>
        {dir === 'outgoing' ? <ArrowUpFromLine size={32} color="#cbd5e1"/> : <ArrowDownToLine size={32} color="#cbd5e1"/>}
        <p>No {dir} movement requests for this premises</p>
      </div>
    );
  }

  const active    = movements.filter(m => ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'PERMIT_ISSUED', 'IN_TRANSIT'].includes(m.status)).length;
  const inTransit = movements.filter(m => m.status === 'IN_TRANSIT').length;
  const completed = movements.filter(m => m.status === 'COMPLETED').length;

  const isIncoming = dir === 'incoming';
  const dirLabel = isIncoming
    ? { label: 'Incoming', color: '#065f46', bg: '#d1fae5', Icon: ArrowDownToLine }
    : { label: 'Outgoing', color: '#1e40af', bg: '#dbeafe', Icon: ArrowUpFromLine };

  return (
    <div className={s.mvSection}>
      {/* Mini stats */}
      <div className={s.mvStats}>
        <div className={s.mvStat}><div className={s.mvStatNum}>{movements.length}</div><div className={s.mvStatLabel}>Total</div></div>
        <div className={s.mvStat}><div className={s.mvStatNum}>{active}</div><div className={s.mvStatLabel}>Active</div></div>
        <div className={s.mvStat}><div className={s.mvStatNum}>{inTransit}</div><div className={s.mvStatLabel}>In Transit</div></div>
        <div className={s.mvStat}><div className={s.mvStatNum}>{completed}</div><div className={s.mvStatLabel}>Completed</div></div>
      </div>

      {/* Cards */}
      <div className={s.mvList}>
        {movements.map(m => {
          const st      = MOV_STATUS[m.status] ?? MOV_STATUS.SUBMITTED;
          const details = m.animalDetails.length > 0
            ? m.animalDetails
            : m.animalTagIds.map(t => ({ tag_id: t, species: '', breed: '', gender: '', status: '' }));
          const isOpen   = expandedId === m.id;

          return (
            <div
              key={m.id}
              className={`${s.mvCard} ${s.mvCardClickable}`}
              onClick={() => setExpandedId(isOpen ? null : m.id)}
            >
              {/* ── Header band: direction · code · status ── */}
              <div className={s.mvCardTop}>
                {isIncoming && (
                  <span className={s.mvDirLabel} style={{ color: dirLabel.color, background: dirLabel.bg }}>
                    <dirLabel.Icon size={10}/> Incoming Movement
                  </span>
                )}
                <span className={s.mvCode}>{m.movementCode}</span>
                <ChevronRight
                  size={15}
                  className={s.mvChevron}
                  style={{ marginLeft: 'auto', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: '#cbd5e1' }}
                />
                <span className={s.mvBadge} style={{ color: st.color, background: st.bg }}>
                  {m.status === 'IN_TRANSIT' ? <Truck size={11}/> : <Clock size={11}/>}
                  {st.label}
                </span>
                {!isIncoming && m.status === 'PERMIT_ISSUED' && (
                  <button
                    disabled={dispatching === m.movementCode}
                    onClick={async e => {
                      e.stopPropagation();
                      setDispatching(m.movementCode);
                      await onDispatch?.(m.movementCode);
                      setDispatching(null);
                    }}
                    style={{ background: dispatching === m.movementCode ? '#bfdbfe' : '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, padding: '0.3rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, cursor: dispatching === m.movementCode ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontFamily: 'inherit', flexShrink: 0 }}
                  >
                    <Truck size={12} />
                    {dispatching === m.movementCode ? 'Dispatching…' : 'Dispatch'}
                  </button>
                )}
              </div>

              {/* ── Route: FROM → TO ── */}
              <div className={s.mvRoute}>
                <div className={s.mvRouteEndpoint}>
                  <span className={s.mvRouteEndpointLabel}>From</span>
                  <span className={s.mvRouteOrg}>{m.originPremisesName}</span>
                </div>
                <div className={s.mvRouteArrow}>
                  <div className={s.mvRouteArrowLine}/>
                  <Truck size={11} color="#94a3b8"/>
                  {m.vehicleRegistration && (
                    <span className={s.mvRouteVehicle}>{m.vehicleRegistration}</span>
                  )}
                </div>
                <div className={s.mvRouteEndpoint}>
                  <span className={s.mvRouteEndpointLabel}>To</span>
                  <span className={s.mvRouteDst}>{m.destinationPremisesName || m.destinationPremisesCode}</span>
                </div>
              </div>

              {/* ── Meta footer ── */}
              <div className={s.mvMetaRow}>
                <div className={s.mvMeta}>
                  {m.movementTypeCode && <span className={s.mvMetaChip}>{m.movementTypeCode.replace(/_/g, ' ')}</span>}
                  {m.purpose          && <span className={s.mvMetaChip}>{m.purpose}</span>}
                  <span className={s.mvMetaChipAccent}>{m.animalCount} {m.animalCount === 1 ? 'animal' : 'animals'}</span>
                  {m.plannedDepartureDate && <span className={s.mvMetaChip}>Departs {m.plannedDepartureDate}</span>}
                  {m.vehicleRegistration  && <span className={s.mvMetaChip}>{m.vehicleRegistration}</span>}
                  {m.createdAt && (
                    <span className={s.mvMetaChip}>
                      Applied {new Date(m.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>
                <span className={s.mvViewHint}>{isOpen ? 'Hide animals ▲' : 'View animals ▼'}</span>
              </div>

              {/* Arrival confirmation — only for incoming IN_TRANSIT */}
              {isIncoming && m.status === 'IN_TRANSIT' && (
                <div style={{ padding: '0 0.25rem', marginBottom: '0.5rem' }} onClick={e => e.stopPropagation()}>
                  {['Quarantine', 'Slaughter'].includes(m.purpose) ? (
                    <div style={{ fontSize: '0.78rem', color: '#6b7280', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Clock size={12} color="#94a3b8" />
                      Awaiting {m.purpose === 'Quarantine' ? 'quarantine supervisor' : 'slaughter supervisor'} acceptance
                    </div>
                  ) : (
                    <button
                      disabled={confirming === m.movementCode}
                      onClick={async () => {
                        setConfirming(m.movementCode);
                        await onConfirmArrival?.(m.movementCode);
                        setConfirming(null);
                      }}
                      style={{ width: '100%', background: confirming === m.movementCode ? '#bbf7d0' : '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 1rem', fontSize: '0.8125rem', fontWeight: 600, cursor: confirming === m.movementCode ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}
                    >
                      <CheckCircle size={14} />
                      {confirming === m.movementCode ? 'Confirming…' : 'Confirm Arrival'}
                    </button>
                  )}
                </div>
              )}

              {/* Expanded animal table */}
              {isOpen && (
                <div className={s.mvAnimalExpand} onClick={e => e.stopPropagation()}>
                  {details.length === 0 ? (
                    <p style={{ fontSize: '0.8125rem', color: '#94a3b8', margin: 0 }}>No animals attached to this movement.</p>
                  ) : (
                    <div className={s.mvTagCardGrid}>
                      {details.map((a, i) => (
                        <div key={a.tag_id ?? i} className={s.mvTagCard} onClick={() => a.id && navigate('/animals/profile/' + a.id)} style={{ cursor: a.id ? 'pointer' : 'default' }}>
                          {/* Photo with tag overlay */}
                          <div className={s.mvTagCardPhoto}>
                            {a.photoUrl
                              ? <img src={a.photoUrl} alt={a.species} className={s.mvTagCardPhotoImg} />
                              : <span className={s.mvTagCardPhotoEmoji}>{SPECIES_EMOJI[a.species?.toUpperCase()] ?? '🐄'}</span>
                            }
                            <div className={s.mvTagCardTagOverlay}>
                              <Tag size={10} strokeWidth={2.5} />
                              {a.tag_id}
                            </div>
                          </div>
                          {/* Meta rows */}
                          <div className={s.mvTagCardMeta}>
                            <div className={s.mvTagCardRow}>
                              <span className={s.mvTagCardLbl}>Breed</span>
                              <span className={s.mvTagCardVal}>{a.breed || '—'}</span>
                            </div>
                            <div className={s.mvTagCardRow}>
                              <span className={s.mvTagCardLbl}>Marks</span>
                              <span className={s.mvTagCardVal}>—</span>
                            </div>
                            <div className={s.mvTagCardRow}>
                              <span className={s.mvTagCardLbl}>Health</span>
                              <span className={s.mvTagCardVal}>Unknown</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function PremisesDetailPage(): JSX.Element {
  const { code }    = useParams<{ code: string }>();
  const navigate    = useNavigate();
  const { userId }  = useAuthStore();

  const [premises,      setPremises]      = useState<Premises | null>(null);
  const [animals,       setAnimals]       = useState<Animal[]>([]);
  const [batches,       setBatches]       = useState<Batch[]>([]);
  const [outMovements,  setOutMovements]  = useState<PremisesMovement[]>([]);
  const [inMovements,   setInMovements]   = useState<PremisesMovement[]>([]);
  const [tagInventory,  setTagInventory]  = useState({ available: 0, used: 0, ordered: 0, delivered: 0 });
  const [tagRequests,   setTagRequests]   = useState<FullTagRequest[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [tab,           setTab]           = useState<Tab>('Available');
  const [showMoveModal,       setShowMoveModal]       = useState(false);
  const [moveDestType,        setMoveDestType]        = useState<'premises' | 'quarantine'>('premises');
  const [showHealthModal,     setShowHealthModal]     = useState(false);
  const [showTagRequestModal, setShowTagRequestModal] = useState(false);
  const [showReqMenu,         setShowReqMenu]         = useState(false);
  const [tagReplacements,  setTagReplacements]  = useState<TagReplacement[]>([]);
  const [selectedTagRepl,  setSelectedTagRepl]  = useState<TagReplacement | null>(null);
  const [myTagsStats, setMyTagsStats] = useState<{ total: number; inStock: number; assigned: number; pending: number } | null>(null);
  const reqMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showReqMenu) return;
    function handleClick(e: MouseEvent) {
      if (reqMenuRef.current && !reqMenuRef.current.contains(e.target as Node)) {
        setShowReqMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showReqMenu]);

  useEffect(() => {
    if (!code || !userId) return;
    setLoading(true);

    Promise.all([
      supabase.from('farmer_premises').select('*').eq('premises_code', code).eq('user_id', userId).single(),
      supabase.from('batches').select('id, batch_code, batch_name, species, breed, count, status, region, created_at').eq('premises_code', code).eq('owner_id', userId).order('created_at', { ascending: false }),
      // Load outgoing movements (requests originating from this premises)
      supabase.from('farmer_movement_requests')
        .select('id, movement_code, status, origin_premises_name, origin_premises_code, destination_premises_code, destination_premises_name, movement_type_code, purpose, planned_departure_date, planned_arrival_date, vehicle_registration, animal_count, animal_ids, animal_tag_ids, animal_details, created_at')
        .eq('origin_premises_code', code)
        .order('created_at', { ascending: false }),
      // Load incoming movements (requests destined for this premises)
      supabase.from('farmer_movement_requests')
        .select('id, movement_code, status, origin_premises_name, origin_premises_code, destination_premises_code, destination_premises_name, movement_type_code, purpose, planned_departure_date, planned_arrival_date, vehicle_registration, animal_count, animal_ids, animal_tag_ids, animal_details, created_at')
        .eq('destination_premises_code', code)
        .order('created_at', { ascending: false }),
      // Load tag replacement requests — independent of animal chain, RLS scopes to this user
      supabase.from('tag_replacement_requests')
        .select('id, animal_id, animal_code, old_tag_serial, new_tag_serial, evidence_url, reason, notes, status, requested_by_name, created_at')
        .eq('requested_by_id', userId)
        .order('created_at', { ascending: false }),
    ]).then(async ([pRes, bRes, outRes, inRes, replRes]) => {
      // Set tag replacements immediately — not dependent on animal lookup
      const allRepls: TagReplacement[] = ((replRes.data ?? []) as any[]).map(r => ({
        id:              r.id,
        animalId:        r.animal_id,
        animalCode:      r.animal_code,
        oldTagSerial:    r.old_tag_serial,
        newTagSerial:    r.new_tag_serial,
        evidenceUrl:     r.evidence_url,
        reason:          r.reason,
        notes:           r.notes,
        status:          r.status,
        requestedByName: r.requested_by_name,
        createdAt:       r.created_at,
      }));
      setTagReplacements(allRepls);
      if (pRes.data) {
        const d = pRes.data as Record<string, unknown>;
        setPremises({
          id:               d.id as string,
          premisesCode:     d.premises_code as string,
          premisesName:     d.premises_name as string,
          premisesType:     (d.premises_type as string) ?? '',
          status:           d.status as string,
          regionCode:       d.region_code as string,
          physicalAddress:  d.physical_address as string,
          gpsLatitude:      Number(d.gps_latitude),
          gpsLongitude:     Number(d.gps_longitude),
          areaHectares:     d.area_hectares  ? Number(d.area_hectares)  : undefined,
          capacityAnimals:  d.capacity_animals ? Number(d.capacity_animals) : undefined,
          allowedSpecies:   d.allowed_species as string | undefined,
          licenseNumber:    d.license_number as string | undefined,
        });

        // Tag inventory + full requests
        const [invRes, reqRes] = await Promise.all([
          supabase.from('farmer_tag_inventory').select('available, used, delivered').eq('premises_id', d.id as string).maybeSingle(),
          supabase.from('farmer_tag_requests')
            .select('id, quantity, tag_type, reason, status, requested_at, processed_at, notes')
            .eq('premises_id', d.id as string)
            .order('requested_at', { ascending: false }),
        ]);
        const inv = invRes.data as Record<string, number> | null;
        const allReqs = (reqRes.data ?? []) as Record<string, unknown>[];
        const ordered = allReqs.filter(r => ['PENDING', 'APPROVED', 'FIELD_APPROVED', 'ALLOCATED', 'ISSUED'].includes(r.status as string))
          .reduce((sum, r) => sum + Number(r.quantity), 0);
        setTagInventory({ available: inv?.available ?? 0, used: inv?.used ?? 0, delivered: inv?.delivered ?? 0, ordered });
        setTagRequests(allReqs.map(r => ({
          id: r.id as string, quantity: Number(r.quantity),
          tagType: (r.tag_type as string) ?? '',
          reason: (r.reason as string) ?? '',
          status: r.status as string,
          requestedAt: r.requested_at as string,
          processedAt: r.processed_at as string | undefined,
          notes: r.notes as string | undefined,
        })));
      }

      // Query animals directly by their current premises — avoids batch-ID indirection
      const { data: animalData } = await supabase
        .from('animals')
        .select('id, batch_id, animal_code, tag_serial, species, breed, sex, status, tag_status, date_of_birth')
        .eq('current_premises_id', code);
      if (animalData) {
        setAnimals((animalData as any[]).map(a => ({
          id:            a.id as string,
          animal_tag_id: (a.tag_serial ?? a.animal_code ?? a.id) as string,
          species:       (a.species ?? '') as string,
          breed:         (a.breed   ?? '') as string,
          gender:        (a.sex     ?? '') as string,
          status:        (a.status ?? a.tag_status ?? '') as string,
          date_of_birth: a.date_of_birth ?? undefined,
          batch_id:      a.batch_id as string | undefined,
        })));
        // Re-filter replacements to only this premises' animals
        if (allRepls.length > 0) {
          const animalIdSet = new Set((animalData as any[]).map((a: any) => a.id as string));
          const premisesRepls = allRepls.filter(r => animalIdSet.has(r.animalId));
          if (premisesRepls.length > 0) setTagReplacements(premisesRepls);
        }
      }
      if (bRes.data) {
        const batchIds = (bRes.data as any[]).map(b => b.id as string);
        const { data: countRows } = batchIds.length > 0
          ? await supabase.from('animals').select('batch_id').in('batch_id', batchIds)
          : { data: [] };
        const actualCounts: Record<string, number> = {};
        (countRows ?? []).forEach((a: any) => {
          const bid = a.batch_id as string;
          if (bid) actualCounts[bid] = (actualCounts[bid] ?? 0) + 1;
        });
        setBatches((bRes.data as Record<string, unknown>[]).map(b => ({
          id: b.id as string, batchCode: b.batch_code as string, batchName: b.batch_name as string,
          species: b.species as string, breed: (b.breed as string) ?? '',
          count: actualCounts[b.id as string] ?? 0, purpose: '', status: b.status as string,
          region: (b.region as string) ?? '', createdAt: b.created_at as string,
        })));
      }
      const outMapped = (outRes.data as any[] ?? []).map(mapMovement);
      const inMapped  = (inRes.data  as any[] ?? []).map(mapMovement);

      // Enrich old movements that have animal_ids but no stored animal_details
      const allIds = [...new Set(
        [...outMapped, ...inMapped]
          .filter(m => m.animalDetails.length === 0 && m.animalIds.length > 0)
          .flatMap(m => m.animalIds)
      )];

      let enrichedOut = outMapped;
      let enrichedIn  = inMapped;

      if (allIds.length > 0) {
        const [{ data: animalData }, { data: photoData }] = await Promise.all([
          supabase.from('animals').select('id, animal_code, tag_serial, species, breed, sex, status, tag_status').in('id', allIds),
          supabase.from('animal_photos').select('animal_id, blob_url').in('animal_id', allIds).eq('photo_type', 'PRIMARY').eq('status', 'ACTIVE'),
        ]);

        if (animalData) {
          const photoMap = new Map((photoData ?? []).map((p: any) => [p.animal_id as string, p.blob_url as string]));
          const aMap = new Map((animalData as any[]).map((a: any) => [a.id, {
            id:       a.id as string,
            tag_id:   (a.tag_serial ?? a.animal_code ?? a.id) as string,
            species:  a.species    ?? '',
            breed:    a.breed      ?? '',
            gender:   a.sex        ?? '',
            status:   a.status ?? a.tag_status ?? '',
            photoUrl: photoMap.get(a.id),
          } as AnimalDetail]));

          const enrich = (ms: PremisesMovement[]) => ms.map(m =>
            m.animalDetails.length === 0 && m.animalIds.length > 0
              ? { ...m, animalDetails: m.animalIds.map(id => aMap.get(id) ?? { tag_id: id, species: '', breed: '', gender: '', status: '' }) }
              : m
          );

          enrichedOut = enrich(outMapped);
          enrichedIn  = enrich(inMapped);
        }
      }

      if (enrichedOut.length) setOutMovements(enrichedOut);
      if (enrichedIn.length)  setInMovements(enrichedIn);

      setLoading(false);
    });
  }, [code, userId]);

  if (loading) {
    return (
      <div className={s.page}>
        <div className={s.skeleton} style={{ height: 130, borderRadius: 12, marginBottom: '1.5rem' }} />
        <div className={s.skeleton} style={{ height: 48, borderRadius: 10, marginBottom: '1rem' }} />
        <div className={s.skeleton} style={{ height: 300, borderRadius: 12 }} />
      </div>
    );
  }

  if (!premises) {
    return (
      <div className={s.page}>
        <div className={s.notFound}>
          <MapPin size={40} color="#cbd5e1" />
          <p>Farm not found</p>
          <button onClick={() => navigate('/premises')}>← Back to My Farms</button>
        </div>
      </div>
    );
  }

  const cfg      = STATUS_CONFIG[premises.status] ?? STATUS_CONFIG.DRAFT;
  const bySpecies = animals.reduce<Record<string, number>>((acc, a) => {
    acc[a.species] = (acc[a.species] ?? 0) + 1;
    return acc;
  }, {});

  const tabAnimals: Animal[] = (() => {
    switch (tab) {
      case 'Available':      return animals.filter(a => a.status === 'ACTIVE' || a.status === 'active');
      case 'Quarantine':     return animals.filter(a => a.status === 'QUARANTINE' || a.status === 'PENDING_QUARANTINE');
      case 'Slaughterhouse': return animals.filter(a => a.status === 'SLAUGHTERED');
      case 'Exported':       return animals.filter(a => a.status === 'EXPORTED');
      default:               return [];
    }
  })();

  const hasGps = !!premises.gpsLatitude && !!premises.gpsLongitude;

  return (
    <div className={s.page}>

      {/* ── Hero ── */}
      <div className={s.hero}>
        <div className={s.heroContent}>
          <div className={s.heroCode} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: '0.5rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', lineHeight: 1 }}>Farm ID</span>
            {premises.premisesCode}
          </div>
          <div className={s.heroName}>{premises.premisesName}</div>
          <div className={s.heroSub}>{premises.physicalAddress}</div>
          <div className={s.heroStatRow}>
            <div className={s.heroStatPill}><MapPin size={13} strokeWidth={2}/>{premises.regionCode}</div>
            <div className={s.heroStatPill}>{premises.premisesType.replace(/_/g, ' ')}</div>
            {premises.areaHectares    && <div className={s.heroStatPill}>{premises.areaHectares} ha</div>}
            {premises.capacityAnimals && <div className={s.heroStatPill}>Cap: {premises.capacityAnimals}</div>}
            <span className={s.heroStatusPill} style={{ color: cfg.color, background: cfg.bg }}>
              <cfg.Icon size={11}/> {cfg.label}
            </span>
          </div>
        </div>

        <div className={s.heroRight}>
          <div className={s.heroSpeciesAndTags}>
            <div className={s.heroSpecies}>
              {SPECIES.map(sp => (
                <div key={sp} className={s.heroSpItem}>
                  <div className={s.heroSpEmoji}>{SPECIES_EMOJI[sp]}</div>
                  <div className={s.heroSpName}>{sp.charAt(0) + sp.slice(1).toLowerCase()}</div>
                  <div className={s.heroSpCount}>{bySpecies[sp] ?? 0}</div>
                </div>
              ))}
            </div>
            <div className={s.heroTagBlock}>
              <div className={s.heroTagBlockLabel}>
                <Tag size={10} strokeWidth={2.5} /> Tag Inventory
              </div>
              <div className={s.heroTagRows}>
                <div className={s.heroTagRow}>
                  <span>In Stock</span>
                  <span className={s.heroTagNum}>{tagInventory.available}</span>
                </div>
                <div className={s.heroTagRow}>
                  <span>On Animals</span>
                  <span className={s.heroTagNum}>{tagInventory.used}</span>
                </div>
                <div className={s.heroTagRow}>
                  <span>Ordered</span>
                  <span className={s.heroTagNum}>{tagInventory.ordered}</span>
                </div>
              </div>
              <div className={s.heroTagBar}>
                <div
                  className={s.heroTagBarFill}
                  style={{ width: `${tagInventory.delivered > 0 ? Math.round((tagInventory.available / tagInventory.delivered) * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>
          <div className={s.heroActions}>
            <Link to="/animals/register" className={s.heroCta}>
              <Plus size={14} strokeWidth={2.5}/> Register Animal
            </Link>
            <div className={s.reqMenuWrap} ref={reqMenuRef}>
              {showReqMenu && (
                <div className={s.reqMenu}>
                  <button className={s.reqMenuItem} onClick={() => { setShowReqMenu(false); setShowMoveModal(true); }}>
                    <Truck size={14} strokeWidth={2}/> Movement Request
                  </button>
                  <button className={s.reqMenuItem} onClick={() => { setShowReqMenu(false); setShowHealthModal(true); }}>
                    <HeartPulse size={14} strokeWidth={2}/> Health Request
                  </button>
                  <button className={s.reqMenuItem} onClick={() => { setShowReqMenu(false); setShowTagRequestModal(true); }}>
                    <Tag size={14} strokeWidth={2}/> Request Tags
                  </button>
                </div>
              )}
              <button className={s.heroSecondary} onClick={() => setShowReqMenu(v => !v)}>
                <Plus size={14} strokeWidth={2}/> Requests
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className={s.tabBarWrap} style={{ paddingTop: '2rem', paddingBottom: '1.25rem' }}>
      <div className={s.tabBar}>
        {TABS.map(t => (
          <button
            key={t}
            className={`${s.tabBtn}${tab === t ? ' ' + s.tabBtnActive : ''}`}
            onClick={() => setTab(t)}
            style={t === 'Tag Requests' ? { marginLeft: 'auto' } : undefined}
          >
            {t}
            {t === 'Available' && animals.filter(a => a.status === 'ACTIVE' || a.status === 'active').length > 0 && (
              <span className={s.tabCount}>{animals.filter(a => a.status === 'ACTIVE' || a.status === 'active').length}</span>
            )}
            {t === 'Quarantine' && animals.filter(a => a.status === 'QUARANTINE' || a.status === 'PENDING_QUARANTINE').length > 0 && (
              <span className={s.tabCount}>{animals.filter(a => a.status === 'QUARANTINE' || a.status === 'PENDING_QUARANTINE').length}</span>
            )}
            {t === 'Outgoing'      && outMovements.length > 0    && <span className={s.tabCount}>{outMovements.length}</span>}
            {t === 'Incoming'      && inMovements.length  > 0    && <span className={s.tabCount}>{inMovements.length}</span>}
            {t === 'Tag Requests'  && tagRequests.length  > 0    && <span className={s.tabCount}>{tagRequests.length}</span>}
            {t === 'Tag Replacement Requests' && tagReplacements.length > 0 && <span className={s.tabCount}>{tagReplacements.length}</span>}
          </button>
        ))}
      </div>
      </div>

      {/* ── Tab content ── */}
      <div className={s.tabContent}>

        {/* Outgoing movements */}
        {tab === 'Outgoing' && (
          <div className={s.mvLayout}>
            <MovementList
              movements={outMovements}
              dir="outgoing"
              onDispatch={async (movementCode) => {
                await supabase.from('farmer_movement_requests')
                  .update({ status: 'IN_TRANSIT' })
                  .eq('movement_code', movementCode);
                setOutMovements(prev => prev.map(m =>
                  m.movementCode === movementCode ? { ...m, status: 'IN_TRANSIT' } : m
                ));
              }}
            />
            {hasGps && <PremisesMap lat={premises.gpsLatitude} lng={premises.gpsLongitude} name={premises.premisesName} />}
          </div>
        )}

        {/* Incoming movements */}
        {tab === 'Incoming' && (
          <div className={s.mvLayout}>
            <MovementList
              movements={inMovements}
              dir="incoming"
              onConfirmArrival={async (movementCode) => {
                await supabase.from('farmer_movement_requests')
                  .update({ status: 'ARRIVAL_CONFIRMED' })
                  .eq('movement_code', movementCode);
                setInMovements(prev => prev.map(m =>
                  m.movementCode === movementCode ? { ...m, status: 'ARRIVAL_CONFIRMED' } : m
                ));
              }}
            />
            {hasGps && <PremisesMap lat={premises.gpsLatitude} lng={premises.gpsLongitude} name={premises.premisesName} />}
          </div>
        )}

        {/* Available animals + batches */}
        {tab === 'Available' && (
          <div className={s.availableContent}>
            <div className={s.batchSection}>
              <div className={s.batchSectionTitle} style={{ marginBottom: '0.875rem' }}>
                <Tag size={14} strokeWidth={2}/> Batches
                {batches.length > 0 && <span className={s.batchSectionCount}>{batches.length}</span>}
              </div>
              {batches.length === 0 ? (
                <div className={s.batchEmpty}>
                  <Tag size={28} color="#cbd5e1"/>
                  <p>No batches registered for this premises</p>
                </div>
              ) : (
                <div className={s.batchGrid}>
                  {batches.map(b => {
                    const bCfg        = BATCH_STATUS_CONFIG[b.status] ?? BATCH_STATUS_CONFIG.DRAFT;
                    const createdDate = b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
                    return (
                      <div key={b.id} className={s.batchCard} onClick={() => navigate('/herds')}>
                        <div className={s.batchCardTop}>
                          <div className={s.batchHeaderLeft}>
                            <span className={s.batchOrg}>Batch ID</span>
                            <span className={s.batchCode}>{b.batchCode}</span>
                          </div>
                          <span className={s.batchStatusBadge} style={{ color: bCfg.color, background: bCfg.bg }}>{bCfg.label}</span>
                        </div>
                        <div className={s.batchBody}><div className={s.batchName}>{b.batchName}</div></div>
                        <div className={s.batchDivider} />
                        <div className={s.batchCountRow}>
                          <span className={s.batchCountEmoji}>{SPECIES_EMOJI[b.species.toUpperCase()] ?? '🐄'}</span>
                          <div className={s.batchCountBlock}>
                            <span className={s.batchCountNum}>{b.count}</span>
                            <span className={s.batchCountLbl}>Animals</span>
                          </div>
                          <div className={s.batchSpeciesBlock}>
                            <span className={s.batchSpeciesName}>{b.species}</span>
                            {b.breed && <span className={s.batchBreed}>{b.breed}</span>}
                          </div>
                        </div>
                        <div className={s.batchDivider} />
                        <div className={s.batchStats}>
                          {b.region && <div className={s.batchStat}><span className={s.batchStatNum}>{b.region}</span><span className={s.batchStatLbl}>Region</span></div>}
                          <div className={s.batchStat}><span className={s.batchStatNum}>{createdDate}</span><span className={s.batchStatLbl}>Created</span></div>
                        </div>
                        <div className={s.batchDivider} />
                        <div className={s.batchMoveRow} onClick={e => e.stopPropagation()}>
                          <button className={s.batchMoveBtn} onClick={() => { setMoveDestType('premises'); setShowMoveModal(true); }}>
                            <Home size={11} strokeWidth={2} /> Move to Farm
                          </button>
                          <button className={`${s.batchMoveBtn} ${s.batchMoveBtnQuarantine}`} onClick={() => { setMoveDestType('quarantine'); setShowMoveModal(true); }}>
                            <ShieldAlert size={11} strokeWidth={2} /> Move to Quarantine
                          </button>
                        </div>
                        <div className={s.batchDivider} />
                        <div className={s.batchFooter}>
                          {b.purpose ? <span className={s.batchPurpose}>{b.purpose}</span> : <span className={s.batchPurpose} style={{ opacity: 0.4 }}>No purpose set</span>}
                          <span className={s.batchViewLink}>View →</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tag Requests */}
        {tab === 'Tag Requests' && (
          <TagInventoryPage
            embedded
            initialTab="requests"
            hideSubTabs
            prefetchedRequests={tagRequests}
            prefetchedInventory={tagInventory}
            prefetchedPremisesDbId={premises?.id ?? ''}
            prefetchedPremisesCode={premises?.premisesCode ?? code ?? ''}
          />
        )}

        {/* My Tags */}
        {tab === 'My Tags' && (
          <>
            {myTagsStats && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.375rem', padding: '0.625rem 2rem 0 0' }}>
                {[
                  { label: 'Total Tags',      value: myTagsStats.total,    color: '#0f172a' },
                  { label: 'In Stock',        value: myTagsStats.inStock,  color: '#16a34a' },
                  { label: 'On Animals',      value: myTagsStats.assigned, color: '#7c3aed' },
                  ...(myTagsStats.pending > 0 ? [{ label: 'Awaiting Serial', value: myTagsStats.pending, color: '#d97706' }] : []),
                ].map(chip => (
                  <div key={chip.label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.25rem 0.625rem', display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: chip.color, lineHeight: 1 }}>{chip.value.toLocaleString()}</span>
                    <span style={{ fontSize: '0.5625rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{chip.label}</span>
                  </div>
                ))}
              </div>
            )}
            <TagInventoryPage
              embedded
              initialTab="tags"
              hideSubTabs
              prefetchedRequests={tagRequests}
              prefetchedInventory={tagInventory}
              prefetchedPremisesDbId={premises?.id ?? ''}
              prefetchedPremisesCode={premises?.premisesCode ?? code ?? ''}
              onTagStats={setMyTagsStats}
            />
          </>
        )}

        {/* Tag Replacement Requests */}
        {tab === 'Tag Replacement Requests' && (
          tagReplacements.length === 0 ? (
            <div className={s.tabEmpty}>
              <Tag size={32} color="#cbd5e1"/>
              <p>No tag replacement requests for this premises</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tagReplacements.map(r => {
                const sc = REPL_STATUS[r.status] ?? { label: r.status, color: '#475569', bg: '#f1f5f9' };
                const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                const reasonLabel = r.reason.charAt(0) + r.reason.slice(1).toLowerCase().replace(/_/g, ' ');
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedTagRepl(r)}
                    style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 14, cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                  >
                    <AlertTriangle size={16} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>{reasonLabel}</span>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: sc.bg, color: sc.color }}>{sc.label}</span>
                        {r.evidenceUrl && <span style={{ fontSize: '0.6875rem', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: 20 }}>📷 Evidence</span>}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', fontSize: '0.8125rem', color: '#475569' }}>
                        {r.animalCode   && <span>Animal: <span style={{ fontFamily: 'monospace', color: '#0f172a', fontWeight: 600 }}>{r.animalCode}</span></span>}
                        {r.oldTagSerial && <span>Old tag: <span style={{ fontFamily: 'monospace', color: '#0f172a', fontWeight: 600 }}>{r.oldTagSerial}</span></span>}
                        {r.newTagSerial && <span>New tag: <span style={{ fontFamily: 'monospace', color: '#16a34a', fontWeight: 600 }}>{r.newTagSerial}</span></span>}
                        <span style={{ color: '#94a3b8' }}>{fmt(r.createdAt)}</span>
                      </div>
                    </div>
                    <ChevronRight size={15} color="#cbd5e1" style={{ flexShrink: 0, marginTop: 2 }} />
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Tag replacement detail modal */}
        {selectedTagRepl && (() => {
          const r   = selectedTagRepl;
          const sc  = REPL_STATUS[r.status] ?? { label: r.status, color: '#475569', bg: '#f1f5f9' };
          const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
          const reasonLabel = r.reason.charAt(0) + r.reason.slice(1).toLowerCase().replace(/_/g, ' ');

          async function handleCancel() {
            if (r.status !== 'PENDING') return;
            const { error } = await supabase
              .from('tag_replacement_requests')
              .update({ status: 'CANCELLED' })
              .eq('id', r.id)
              .eq('status', 'PENDING'); // DB-level guard: only cancels if still PENDING
            if (!error) {
              setTagReplacements(prev => prev.map(x => x.id === r.id ? { ...x, status: 'CANCELLED' } : x));
              setSelectedTagRepl(null);
            }
          }

          return (
            <div onClick={() => setSelectedTagRepl(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
              <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

                {/* Header */}
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>Tag Replacement Request</div>
                    <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: 2 }}>{fmt(r.createdAt)}</div>
                  </div>
                  <button onClick={() => setSelectedTagRepl(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}>
                    <XCircle size={20} />
                  </button>
                </div>

                {/* Evidence photo */}
                {r.evidenceUrl ? (
                  <img src={r.evidenceUrl} alt="evidence" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ background: '#f8fafc', padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#94a3b8', fontSize: '0.8125rem', borderBottom: '1px solid #f1f5f9' }}>
                    <AlertTriangle size={14} /> No evidence photo uploaded
                  </div>
                )}

                {/* Details */}
                <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 14 }}>

                  {/* Reason + status */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 3 }}>Reason</div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>{reasonLabel}</div>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 14px', borderRadius: 20, background: sc.bg, color: sc.color }}>{sc.label}</span>
                  </div>

                  {/* Tag info */}
                  <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { label: 'Animal',  value: r.animalCode   ?? '—',              mono: true, green: false },
                      { label: 'Old Tag', value: r.oldTagSerial ?? '—',              mono: true, green: false },
                      { label: 'New Tag', value: r.newTagSerial ?? 'Not specified',  mono: true, green: !!r.newTagSerial },
                    ].map(row => (
                      <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                        <span style={{ color: '#64748b' }}>{row.label}</span>
                        <span style={{ fontFamily: row.mono ? 'monospace' : undefined, fontWeight: 600, color: row.green ? '#16a34a' : '#0f172a' }}>{row.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Notes */}
                  {r.notes && (
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 4 }}>Notes</div>
                      <div style={{ fontSize: '0.875rem', color: '#374151', lineHeight: 1.5 }}>{r.notes}</div>
                    </div>
                  )}

                  {/* Cancel — only for pending requests */}
                  {r.status === 'PENDING' ? (
                    <button
                      onClick={handleCancel}
                      style={{ marginTop: 4, width: '100%', padding: '10px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: 10, fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
                    >
                      Cancel Request
                    </button>
                  ) : r.status !== 'CANCELLED' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#f8fafc', borderRadius: 10, fontSize: '0.8125rem', color: '#64748b' }}>
                      <CheckCircle size={14} color={r.status === 'APPROVED' ? '#16a34a' : '#94a3b8'} />
                      This request has been {r.status.toLowerCase()} and can no longer be cancelled.
                    </div>
                  )}

                </div>
              </div>
            </div>
          );
        })()}

        {/* Quarantine / Slaughterhouse / Exported */}
        {(tab === 'Quarantine' || tab === 'Slaughterhouse' || tab === 'Exported') && (
          tabAnimals.length === 0 ? (
            <div className={s.tabEmpty}>
              <Beef size={32} color="#cbd5e1"/>
              <p>No animals in this category</p>
            </div>
          ) : (
            <div className={s.animalTable}>
              <div className={s.animalTableHead}>
                <span>Tag ID</span><span>Species</span><span>Breed</span>
                <span>Gender</span><span>Age</span><span>Status</span>
              </div>
              {tabAnimals.map(a => (
                <div key={a.id} className={s.animalRow} onClick={() => navigate(`/animals/${a.id}`)}>
                  <span className={s.animalTag}>{a.animal_tag_id}</span>
                  <span>{SPECIES_EMOJI[a.species] ?? ''} {a.species}</span>
                  <span>{a.breed ?? '—'}</span>
                  <span>{a.gender ?? '—'}</span>
                  <span>{toAge(a.date_of_birth)}</span>
                  <span className={s.animalStatus}>{a.status}</span>
                </div>
              ))}
            </div>
          )
        )}

      </div>

      {showMoveModal && (
        <MovementRequestModal
          onClose={() => setShowMoveModal(false)}
          onSuccess={() => setShowMoveModal(false)}
          initialPremisesCode={premises.premisesCode}
          destType={moveDestType}
        />
      )}
      {showHealthModal && (
        <HealthRequestModal
          onClose={() => setShowHealthModal(false)}
          onSuccess={() => setShowHealthModal(false)}
          initialPremisesCode={premises.premisesCode}
        />
      )}
      {showTagRequestModal && (
        <RequestModal
          premisesId={premises.id}
          premisesCode={premises.premisesCode}
          userId={userId ?? ''}
          onClose={() => setShowTagRequestModal(false)}
          onSubmitted={() => { setShowTagRequestModal(false); }}
        />
      )}
    </div>
  );
}

export default PremisesDetailPage;
