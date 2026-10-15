import { useState } from 'react';
import {
  Users, CheckCircle, XCircle, Clock, Tag, ChevronRight, AlertTriangle, Search,
} from 'lucide-react';
import { getBadge } from '@/utils/statusBadge';
import s from './batches.module.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BatchStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'TAGGED';
type TagType = 'RFID' | 'EAR_TAG';
type TagColor = 'yellow' | 'orange' | 'green' | 'blue' | 'red';

interface BatchAnimal {
  id: string;
  seq: number;
  sex: 'M' | 'F';
  ageMonths: number;
  weightKg: number;
  features: string;
  animalId?: string;
  tagSerial?: string;
  tagType?: TagType;
  tagColor?: TagColor;
  tagStatus: 'UNTAGGED' | 'TAGGED';
}

interface HerdBatch {
  id: string;
  batchCode: string;
  batchName: string;
  premisesCode: string;
  ownerCode: string;
  ownerName: string;
  species: string;
  breed: string;
  count: number;
  purpose: string;
  status: BatchStatus;
  region: string;
  createdAt: string;
  submittedAt?: string;
  approvedAt?: string;
  rejectionReason?: string;
  animals: BatchAnimal[];
}

// ---------------------------------------------------------------------------
// Mock data — ministry sees all farmers' batches
// ---------------------------------------------------------------------------

const ALL_BATCHES: HerdBatch[] = [
  {
    id: 'b1',
    batchCode: 'HRD-2026-MOG-001',
    batchName: 'Daynile Zebu Herd — Aug 2026',
    premisesCode: 'SOM-MOG-004',
    ownerCode: 'FRM-MOG-0041',
    ownerName: 'Ahmed Hassan Warsame',
    species: 'Cattle',
    breed: 'Somali Zebu',
    count: 6,
    purpose: 'Export',
    region: 'Banaadir',
    status: 'TAGGED',
    createdAt: '2026-07-15',
    submittedAt: '2026-07-16',
    approvedAt: '2026-07-20',
    animals: [
      { id: 'ba1', seq: 1, sex: 'M', ageMonths: 36, weightKg: 280, features: 'White patch on left ear', animalId: 'SOB-2026-0441', tagSerial: 'RFID-2026-00441', tagType: 'RFID', tagColor: 'yellow', tagStatus: 'TAGGED' },
      { id: 'ba2', seq: 2, sex: 'M', ageMonths: 42, weightKg: 310, features: 'Brown coat', animalId: 'SOB-2026-0442', tagSerial: 'RFID-2026-00442', tagType: 'RFID', tagColor: 'yellow', tagStatus: 'TAGGED' },
      { id: 'ba3', seq: 3, sex: 'F', ageMonths: 28, weightKg: 245, features: 'Black face', animalId: 'SOB-2026-0443', tagSerial: 'RFID-2026-00443', tagType: 'RFID', tagColor: 'yellow', tagStatus: 'TAGGED' },
      { id: 'ba4', seq: 4, sex: 'M', ageMonths: 30, weightKg: 265, features: '', animalId: 'SOB-2026-0444', tagSerial: 'RFID-2026-00444', tagType: 'RFID', tagColor: 'yellow', tagStatus: 'TAGGED' },
      { id: 'ba5', seq: 5, sex: 'F', ageMonths: 24, weightKg: 220, features: 'Spotted', animalId: 'SOB-2026-0445', tagSerial: 'RFID-2026-00445', tagType: 'RFID', tagColor: 'yellow', tagStatus: 'TAGGED' },
      { id: 'ba6', seq: 6, sex: 'M', ageMonths: 48, weightKg: 340, features: 'Large hump', animalId: 'SOB-2026-0446', tagSerial: 'RFID-2026-00446', tagType: 'RFID', tagColor: 'yellow', tagStatus: 'TAGGED' },
    ],
  },
  {
    id: 'b2',
    batchCode: 'HRD-2026-BAY-002',
    batchName: 'Baidoa Sheep Flock',
    premisesCode: 'SOM-BAY-011',
    ownerCode: 'FRM-BAY-0008',
    ownerName: 'Faadumo Abdullahi Said',
    species: 'Sheep',
    breed: 'Somali Blackhead',
    count: 4,
    purpose: 'Sale',
    region: 'Bay',
    status: 'APPROVED',
    createdAt: '2026-07-28',
    submittedAt: '2026-07-29',
    approvedAt: '2026-08-01',
    animals: [
      { id: 'bb1', seq: 1, sex: 'M', ageMonths: 18, weightKg: 36, features: '', animalId: 'SOS-2026-0201', tagSerial: 'EAR-2026-00201', tagType: 'EAR_TAG', tagColor: 'yellow', tagStatus: 'UNTAGGED' },
      { id: 'bb2', seq: 2, sex: 'M', ageMonths: 20, weightKg: 38, features: 'Black legs', animalId: 'SOS-2026-0202', tagSerial: 'EAR-2026-00202', tagType: 'EAR_TAG', tagColor: 'yellow', tagStatus: 'UNTAGGED' },
      { id: 'bb3', seq: 3, sex: 'F', ageMonths: 16, weightKg: 30, features: '', animalId: 'SOS-2026-0203', tagSerial: 'EAR-2026-00203', tagType: 'EAR_TAG', tagColor: 'yellow', tagStatus: 'UNTAGGED' },
      { id: 'bb4', seq: 4, sex: 'F', ageMonths: 15, weightKg: 28, features: 'White blaze', animalId: 'SOS-2026-0204', tagSerial: 'EAR-2026-00204', tagType: 'EAR_TAG', tagColor: 'yellow', tagStatus: 'UNTAGGED' },
    ],
  },
  {
    id: 'b3',
    batchCode: 'HRD-2026-KIS-003',
    batchName: 'Kismayo Goat Herd',
    premisesCode: 'SOM-JUB-004',
    ownerCode: 'FRM-JUB-0012',
    ownerName: 'Mahad Ali Geele',
    species: 'Goat',
    breed: 'Somali',
    count: 3,
    purpose: 'Breeding',
    region: 'Lower Jubba',
    status: 'UNDER_REVIEW',
    createdAt: '2026-08-02',
    submittedAt: '2026-08-02',
    animals: [
      { id: 'bc1', seq: 1, sex: 'M', ageMonths: 24, weightKg: 42, features: '', tagStatus: 'UNTAGGED' },
      { id: 'bc2', seq: 2, sex: 'F', ageMonths: 18, weightKg: 32, features: '', tagStatus: 'UNTAGGED' },
      { id: 'bc3', seq: 3, sex: 'F', ageMonths: 20, weightKg: 35, features: 'Brown coat', tagStatus: 'UNTAGGED' },
    ],
  },
  {
    id: 'b4',
    batchCode: 'HRD-2026-GAR-004',
    batchName: 'Garowe Camel Group',
    premisesCode: 'SOM-NUG-003',
    ownerCode: 'FRM-NUG-0005',
    ownerName: 'Yasmin Nur Hersi',
    species: 'Camel',
    breed: 'Somali Dromedary',
    count: 5,
    purpose: 'Export',
    region: 'Nugaal',
    status: 'SUBMITTED',
    createdAt: '2026-08-03',
    submittedAt: '2026-08-04',
    animals: [
      { id: 'bd1', seq: 1, sex: 'M', ageMonths: 60, weightKg: 450, features: 'Dark brown', tagStatus: 'UNTAGGED' },
      { id: 'bd2', seq: 2, sex: 'M', ageMonths: 54, weightKg: 420, features: '', tagStatus: 'UNTAGGED' },
      { id: 'bd3', seq: 3, sex: 'F', ageMonths: 48, weightKg: 380, features: '', tagStatus: 'UNTAGGED' },
      { id: 'bd4', seq: 4, sex: 'F', ageMonths: 42, weightKg: 360, features: 'Light tan', tagStatus: 'UNTAGGED' },
      { id: 'bd5', seq: 5, sex: 'M', ageMonths: 66, weightKg: 490, features: 'Large hump', tagStatus: 'UNTAGGED' },
    ],
  },
  {
    id: 'b5',
    batchCode: 'HRD-2026-JOW-005',
    batchName: 'Jowhar Cattle Batch',
    premisesCode: 'SOM-HRS-002',
    ownerCode: 'FRM-HRS-0019',
    ownerName: 'Omar Khalif Mohamud',
    species: 'Cattle',
    breed: 'Somali Zebu',
    count: 3,
    purpose: 'Export',
    region: 'Hiiraan',
    status: 'REJECTED',
    createdAt: '2026-07-10',
    submittedAt: '2026-07-11',
    rejectionReason:
      'Brucellosis test results missing. Animals must have a negative brucellosis test from an accredited laboratory before registration can be approved.',
    animals: [
      { id: 'be1', seq: 1, sex: 'M', ageMonths: 30, weightKg: 270, features: '', tagStatus: 'UNTAGGED' },
      { id: 'be2', seq: 2, sex: 'M', ageMonths: 34, weightKg: 290, features: '', tagStatus: 'UNTAGGED' },
      { id: 'be3', seq: 3, sex: 'F', ageMonths: 26, weightKg: 235, features: '', tagStatus: 'UNTAGGED' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const STATUS_ICON: Record<BatchStatus, React.ElementType> = {
  DRAFT:        Clock,
  SUBMITTED:    ChevronRight,
  UNDER_REVIEW: Clock,
  APPROVED:     CheckCircle,
  REJECTED:     XCircle,
  TAGGED:       Tag,
};

// ---------------------------------------------------------------------------
// Species helpers
// ---------------------------------------------------------------------------

const SPECIES_EMOJI: Record<string, string> = {
  Cattle: '🐄',
  Camel:  '🐪',
  Goat:   '🐐',
  Sheep:  '🐑',
};

function speciesPrefix(species: string): string {
  if (species === 'Cattle') return 'SOB';
  if (species === 'Camel')  return 'SOC';
  if (species === 'Goat')   return 'SOG';
  if (species === 'Sheep')  return 'SOS';
  return 'SOX';
}

function usesRfid(species: string): boolean {
  return species === 'Cattle' || species === 'Camel';
}

// ---------------------------------------------------------------------------
// Tag SVG components
// ---------------------------------------------------------------------------

const TAG_PALETTE: Record<TagColor, { fill: string; stroke: string; text: string }> = {
  yellow: { fill: '#eab308', stroke: '#713f12', text: '#1c1917' },
  orange: { fill: '#fed7aa', stroke: '#ea580c', text: '#7c2d12' },
  green:  { fill: '#bbf7d0', stroke: '#16a34a', text: '#14532d' },
  blue:   { fill: '#bfdbfe', stroke: '#2563eb', text: '#1e3a5f' },
  red:    { fill: '#fecaca', stroke: '#dc2626', text: '#7f1d1d' },
};

function RFIDTag({ animalId, tagSerial, color = 'orange', seq }: {
  animalId: string;
  tagSerial: string;
  color?: TagColor;
  seq: number;
}): JSX.Element {
  const p = TAG_PALETTE[color] ?? TAG_PALETTE.orange;
  const num = String(seq).padStart(4, '0');
  return (
    <svg width="90" height="102" viewBox="0 0 90 102" xmlns="http://www.w3.org/2000/svg">
      {/* Top hole nub */}
      <rect x="33" y="2" width="24" height="20" rx="6" fill={p.fill} stroke={p.stroke} strokeWidth="2" />
      <circle cx="45" cy="12" r="5" fill="#e5e7eb" stroke={p.stroke} strokeWidth="1.5" />
      <circle cx="45" cy="12" r="2.5" fill="white" />
      {/* Main body */}
      <rect x="2" y="16" width="86" height="84" rx="14" fill={p.fill} stroke={p.stroke} strokeWidth="2" />
      {/* Inner panel groove */}
      <rect x="11" y="25" width="68" height="66" rx="9" fill="none" stroke={p.stroke} strokeWidth="1" opacity="0.35" />
      {/* Embedded chip indicator — top-left of inner panel */}
      <rect x="15" y="29" width="16" height="12" rx="2" fill={p.stroke} opacity="0.4" />
      <rect x="17" y="31" width="12" height="8" rx="1" fill={p.stroke} opacity="0.7" />
      <line x1="13" y1="32" x2="15" y2="32" stroke={p.stroke} strokeWidth="1" />
      <line x1="13" y1="37" x2="15" y2="37" stroke={p.stroke} strokeWidth="1" />
      <line x1="31" y1="32" x2="33" y2="32" stroke={p.stroke} strokeWidth="1" />
      <line x1="31" y1="37" x2="33" y2="37" stroke={p.stroke} strokeWidth="1" />
      {/* RFID wave arcs — top-right of inner panel */}
      <path d="M62,30 Q66,35 62,40" fill="none" stroke={p.stroke} strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
      <path d="M66,27 Q73,35 66,43" fill="none" stroke={p.stroke} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <path d="M70,24 Q80,35 70,46" fill="none" stroke={p.stroke} strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      {/* Sequence number */}
      <text x="45" y="70" fontSize="26" fontWeight="800" fill={p.text} fontFamily="monospace" textAnchor="middle">{num}</text>
      {/* Animal ID */}
      <text x="45" y="84" fontSize="6.5" fill={p.text} fontFamily="monospace" textAnchor="middle">{animalId.length > 14 ? animalId.slice(-14) : animalId}</text>
      {/* Footer */}
      <text x="45" y="93" fontSize="5" fill={p.text} fontFamily="monospace" textAnchor="middle" opacity="0.75">RFID · ISO 11784 · QXLITS</text>
    </svg>
  );
}

function EarTag({ seq, animalId, color = 'yellow' }: {
  seq: number;
  animalId: string;
  color?: TagColor;
}): JSX.Element {
  const p = TAG_PALETTE[color] ?? TAG_PALETTE.yellow;
  const seqStr = String(seq).padStart(4, '0');
  return (
    <svg width="90" height="102" viewBox="0 0 90 102" xmlns="http://www.w3.org/2000/svg">
      {/* Top hole nub */}
      <rect x="33" y="2" width="24" height="20" rx="6" fill={p.fill} stroke={p.stroke} strokeWidth="2" />
      <circle cx="45" cy="12" r="5" fill="#e5e7eb" stroke={p.stroke} strokeWidth="1.5" />
      <circle cx="45" cy="12" r="2.5" fill="white" />
      {/* Main body */}
      <rect x="2" y="16" width="86" height="84" rx="14" fill={p.fill} stroke={p.stroke} strokeWidth="2" />
      {/* Inner panel groove */}
      <rect x="11" y="25" width="68" height="66" rx="9" fill="none" stroke={p.stroke} strokeWidth="1" opacity="0.35" />
      {/* Sequence number */}
      <text x="45" y="72" fontSize="26" fontWeight="800" fill={p.text} fontFamily="monospace" textAnchor="middle">{seqStr}</text>
      {/* Animal ID */}
      <text x="45" y="86" fontSize="6.5" fill={p.text} fontFamily="monospace" textAnchor="middle">{animalId.length > 14 ? animalId.slice(-14) : animalId}</text>
      {/* QXLITS */}
      <text x="45" y="95" fontSize="5.5" fill={p.text} fontFamily="monospace" textAnchor="middle">QXLITS · SO</text>
    </svg>
  );
}

function UnassignedTag(): JSX.Element {
  return (
    <svg width="140" height="70" viewBox="0 0 140 70" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="136" height="66" rx="8" ry="8"
        fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="6 4" />
      <text x="70" y="32" fontSize="9" fill="#94a3b8"
        fontFamily="monospace" textAnchor="middle" fontWeight="600">
        No Tag
      </text>
      <text x="70" y="46" fontSize="8" fill="#cbd5e1"
        fontFamily="monospace" textAnchor="middle">
        PENDING
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status, large = false }: { status: BatchStatus; large?: boolean }): JSX.Element {
  const Icon = STATUS_ICON[status];
  const b = getBadge(status);
  return (
    <span
      className={s.statusBadge}
      style={{
        background: b.bg,
        color: b.color,
        fontSize: large ? '0.8125rem' : undefined,
        padding: large ? '4px 14px' : undefined,
      }}
    >
      <Icon size={large ? 14 : 11} />
      {b.label}
    </span>
  );
}

function AnimalCard({ animal }: { animal: BatchAnimal }): JSX.Element {
  const showRfid = animal.tagStatus === 'TAGGED' && animal.tagType === 'RFID';
  const showEar  = animal.tagType === 'EAR_TAG' && animal.animalId;

  return (
    <div className={s.animalCard}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
        <span className={s.animalSeq}>#{String(animal.seq).padStart(2, '0')}</span>
        <span className={`${s.sexBadge} ${animal.sex === 'M' ? s.sexM : s.sexF}`}>
          {animal.sex === 'M' ? 'Male' : 'Female'}
        </span>
      </div>
      <div className={s.animalMeta}>Age: {animal.ageMonths} mo · Wt: {animal.weightKg} kg</div>
      {animal.features ? (
        <div className={s.animalMeta} style={{ fontStyle: 'italic' }}>{animal.features}</div>
      ) : null}

      {/* Tag visual */}
      <div style={{ margin: '4px 0' }}>
        {showRfid && animal.animalId && animal.tagSerial ? (
          <RFIDTag
            animalId={animal.animalId}
            tagSerial={animal.tagSerial}
            color={animal.tagColor ?? 'orange'}
            seq={animal.seq}
          />
        ) : showEar && animal.animalId && animal.tagSerial ? (
          <EarTag
            seq={animal.seq}
            animalId={animal.animalId}
            color={animal.tagColor ?? 'yellow'}
          />
        ) : (
          <UnassignedTag />
        )}
      </div>

      {/* IDs */}
      {animal.animalId ? (
        <div className={s.animalIdText}>{animal.animalId}</div>
      ) : (
        <div className={s.animalMeta} style={{ color: '#94a3b8' }}>Pending ID</div>
      )}
      {animal.tagSerial && (
        <div className={s.tagSerial}>{animal.tagSerial}</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Regions and filter options
// ---------------------------------------------------------------------------

const ALL_REGIONS = ['Banaadir', 'Bay', 'Nugaal', 'Lower Jubba', 'Hiiraan'];
const ALL_STATUSES: BatchStatus[] = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'TAGGED'];

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export function BatchRegistryPage(): JSX.Element {
  const [batches, setBatches] = useState<HerdBatch[]>(ALL_BATCHES);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BatchStatus | 'ALL'>('ALL');
  const [regionFilter, setRegionFilter] = useState<string>('ALL');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Derived: selected batch from live state
  const selected = batches.find((b) => b.id === selectedId) ?? null;

  // Filtered list
  const filtered = batches.filter((b) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      b.batchCode.toLowerCase().includes(q) ||
      b.batchName.toLowerCase().includes(q) ||
      b.ownerName.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'ALL' || b.status === statusFilter;
    const matchRegion = regionFilter === 'ALL' || b.region === regionFilter;
    return matchSearch && matchStatus && matchRegion;
  });

  // KPI counts
  const total       = batches.length;
  const underReview = batches.filter((b) => b.status === 'UNDER_REVIEW').length;
  const approved    = batches.filter((b) => b.status === 'APPROVED' || b.status === 'TAGGED').length;
  const tagged      = batches.filter((b) => b.status === 'TAGGED').length;

  // Actions
  function handleBeginReview(): void {
    if (!selected) return;
    setBatches((prev) =>
      prev.map((b) =>
        b.id === selected.id ? { ...b, status: 'UNDER_REVIEW' } : b,
      ),
    );
  }

  function handleApprove(): void {
    if (!selected) return;
    const today = new Date().toISOString().slice(0, 10);
    const prefix = speciesPrefix(selected.species);
    const rfid   = usesRfid(selected.species);
    const updatedAnimals: BatchAnimal[] = selected.animals.map((a, i) => {
      const animalId  = `${prefix}-2026-${String(9000 + i).padStart(4, '0')}`;
      const tagSerial = rfid
        ? `RFID-2026-${String(90000 + i).padStart(5, '0')}`
        : `EAR-2026-${String(90000 + i).padStart(5, '0')}`;
      const tagType:  TagType  = rfid ? 'RFID' : 'EAR_TAG';
      const tagColor: TagColor = rfid ? 'orange' : 'yellow';
      return { ...a, animalId, tagSerial, tagType, tagColor };
    });
    setBatches((prev) =>
      prev.map((b) =>
        b.id === selected.id
          ? { ...b, status: 'APPROVED', approvedAt: today, animals: updatedAnimals }
          : b,
      ),
    );
    setRejectOpen(false);
  }

  function handleRejectConfirm(): void {
    if (!selected || !rejectReason.trim()) return;
    setBatches((prev) =>
      prev.map((b) =>
        b.id === selected.id
          ? { ...b, status: 'REJECTED', rejectionReason: rejectReason.trim() }
          : b,
      ),
    );
    setRejectOpen(false);
    setRejectReason('');
  }

  const canAct =
    selected?.status === 'SUBMITTED' || selected?.status === 'UNDER_REVIEW';

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div style={{ display: 'flex', gap: '1.25rem', height: '100%', alignItems: 'flex-start' }}>

      {/* ================================================================
          LEFT PANEL
      ================================================================ */}
      <div className={s.leftPanel} style={{ width: 360, flexShrink: 0 }}>

        {/* KPI chips */}
        <div className={s.kpiRow}>
          <div className={s.kpiChip}>
            <span className={s.kpiNum}>{total}</span>
            <span className={s.kpiLbl}>Total</span>
          </div>
          <div className={s.kpiChip}>
            <span className={s.kpiNum}>{underReview}</span>
            <span className={s.kpiLbl}>Under Review</span>
          </div>
          <div className={s.kpiChip}>
            <span className={s.kpiNum}>{approved}</span>
            <span className={s.kpiLbl}>Approved</span>
          </div>
          <div className={s.kpiChip}>
            <span className={s.kpiNum}>{tagged}</span>
            <span className={s.kpiLbl}>Tagged</span>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search
            size={14}
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search batch code, name, owner…"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              paddingLeft: 30,
              paddingRight: 10,
              height: 34,
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              fontSize: '0.8125rem',
              background: '#fff',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Status filter */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {(['ALL', ...ALL_STATUSES] as const).map((st) => {
            const active = statusFilter === st;
            const b = st !== 'ALL' ? getBadge(st) : null;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '2px 10px',
                  borderRadius: 20,
                  border: active ? '2px solid #0b5ed7' : '1px solid #e2e8f0',
                  background: active ? '#eff6ff' : '#fff',
                  color: active ? '#0b5ed7' : (b ? b.color : '#64748b'),
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {st === 'ALL' ? 'ALL' : getBadge(st).label.toUpperCase()}
              </button>
            );
          })}
        </div>

        {/* Region filter */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {(['ALL', ...ALL_REGIONS] as const).map((r) => {
            const active = regionFilter === r;
            return (
              <button
                key={r}
                onClick={() => setRegionFilter(r)}
                style={{
                  padding: '2px 10px',
                  borderRadius: 20,
                  border: active ? '2px solid #0b5ed7' : '1px solid #e2e8f0',
                  background: active ? '#eff6ff' : '#fff',
                  color: active ? '#0b5ed7' : '#475569',
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {r}
              </button>
            );
          })}
        </div>

        {/* Batch list */}
        <div className={s.batchList}>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8125rem', padding: '2rem 0' }}>
              No batches match the current filters.
            </div>
          )}
          {filtered.map((batch) => {
            const emoji = SPECIES_EMOJI[batch.species] ?? '🐾';
            const isActive = batch.id === selectedId;
            return (
              <button
                key={batch.id}
                className={`${s.batchCard} ${isActive ? s.batchCardActive : ''}`}
                onClick={() => {
                  setSelectedId(batch.id);
                  setRejectOpen(false);
                  setRejectReason('');
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span className={s.batchCode}>{batch.batchCode}</span>
                  <StatusBadge status={batch.status} />
                </div>
                <div className={s.batchMeta} style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {batch.ownerName}
                </div>
                <div className={s.batchName}>{batch.batchName}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <span style={{
                    fontSize: '0.6875rem', background: '#f1f5f9', color: '#475569',
                    borderRadius: 6, padding: '1px 7px', fontWeight: 500,
                  }}>
                    {batch.region}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#334155' }}>
                    {emoji} {batch.count} {batch.species}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ================================================================
          RIGHT PANEL
      ================================================================ */}
      <div className={s.rightPanel} style={{ flex: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 100px)' }}>

        {/* Empty state */}
        {!selected && (
          <div className={s.emptyState}>
            <Users size={48} strokeWidth={1.2} />
            <div style={{ fontWeight: 600, fontSize: '1rem', color: '#64748b' }}>
              Select a batch to review
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#94a3b8', textAlign: 'center', maxWidth: 300 }}>
              Choose a batch registration from the list to view details,
              approve, or reject it.
            </div>
          </div>
        )}

        {selected && (
          <>
            {/* ---- Batch header card ---- */}
            <div className={s.batchHeader}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <div className={s.batchTitle}>{selected.batchCode}</div>
                  <div className={s.batchSubtitle}>{selected.batchName}</div>
                </div>
                <StatusBadge status={selected.status} large />
              </div>

              {/* Owner row */}
              <div style={{ fontSize: '0.8125rem', color: '#475569', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontFamily: 'monospace', background: '#f1f5f9', borderRadius: 4, padding: '1px 6px' }}>
                  {selected.ownerCode}
                </span>
                <span>{selected.ownerName}</span>
                <span style={{ color: '#94a3b8' }}>·</span>
                <span style={{ fontFamily: 'monospace', background: '#f1f5f9', borderRadius: 4, padding: '1px 6px' }}>
                  {selected.premisesCode}
                </span>
              </div>

              {/* Detail chips */}
              <div className={s.detailChips}>
                <span className={s.detailChip}>Region: {selected.region}</span>
                <span className={s.detailChip}>{SPECIES_EMOJI[selected.species] ?? ''} {selected.species}</span>
                <span className={s.detailChip}>Breed: {selected.breed}</span>
                <span className={s.detailChip}>Count: {selected.count}</span>
                <span className={s.detailChip}>Purpose: {selected.purpose}</span>
                {selected.submittedAt && (
                  <span className={s.detailChip}>Submitted: {selected.submittedAt}</span>
                )}
              </div>
            </div>

            {/* ---- Rejection banner ---- */}
            {selected.status === 'REJECTED' && selected.rejectionReason && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 12,
                padding: '1rem 1.25rem',
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
              }}>
                <AlertTriangle size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#991b1b', marginBottom: 4 }}>
                    Batch Rejected
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#7f1d1d', lineHeight: 1.5 }}>
                    {selected.rejectionReason}
                  </div>
                </div>
              </div>
            )}

            {/* ---- Ministry actions (SUBMITTED / UNDER_REVIEW only) ---- */}
            {canAct && (
              <div style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}>
                <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0f172a' }}>
                  Ministry Actions
                </div>

                {/* Action buttons row */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {selected.status === 'SUBMITTED' && (
                    <button
                      onClick={handleBeginReview}
                      style={{
                        padding: '7px 18px',
                        background: '#fffbeb',
                        color: '#b45309',
                        border: '1px solid #fcd34d',
                        borderRadius: 8,
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Clock size={14} />
                      Begin Review
                    </button>
                  )}

                  <button
                    onClick={handleApprove}
                    style={{
                      padding: '7px 18px',
                      background: '#059669',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <CheckCircle size={14} />
                    Approve Batch
                  </button>

                  <button
                    onClick={() => setRejectOpen((v) => !v)}
                    style={{
                      padding: '7px 18px',
                      background: '#fef2f2',
                      color: '#dc2626',
                      border: '1px solid #fecaca',
                      borderRadius: 8,
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <XCircle size={14} />
                    Reject
                  </button>
                </div>

                {/* Inline rejection form */}
                {rejectOpen && (
                  <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 10,
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#991b1b' }}>
                      Reason for rejection
                    </div>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Describe why this batch is being rejected. The farmer will receive this message."
                      rows={4}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        border: '1px solid #fecaca',
                        borderRadius: 8,
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.8125rem',
                        fontFamily: 'inherit',
                        lineHeight: 1.5,
                        resize: 'vertical',
                        background: '#fff',
                        outline: 'none',
                        color: '#0f172a',
                      }}
                    />
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => { setRejectOpen(false); setRejectReason(''); }}
                        style={{
                          padding: '6px 16px',
                          background: '#fff',
                          color: '#475569',
                          border: '1px solid #e2e8f0',
                          borderRadius: 8,
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleRejectConfirm}
                        disabled={!rejectReason.trim()}
                        style={{
                          padding: '6px 16px',
                          background: rejectReason.trim() ? '#dc2626' : '#fca5a5',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 8,
                          fontSize: '0.8125rem',
                          fontWeight: 700,
                          cursor: rejectReason.trim() ? 'pointer' : 'not-allowed',
                          fontFamily: 'inherit',
                        }}
                      >
                        Confirm Rejection
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ---- Approval banner (APPROVED) ---- */}
            {selected.status === 'APPROVED' && selected.approvedAt && (
              <div style={{
                background: '#ecfdf5',
                border: '1px solid #6ee7b7',
                borderRadius: 12,
                padding: '1rem 1.25rem',
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
              }}>
                <CheckCircle size={18} color="#059669" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#065f46', marginBottom: 4 }}>
                    Batch Approved — {selected.approvedAt}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#047857', lineHeight: 1.5 }}>
                    Animal IDs and tag serials have been assigned. Field officers have been
                    notified to apply tags.
                  </div>
                </div>
              </div>
            )}

            {/* ---- Tagged banner ---- */}
            {selected.status === 'TAGGED' && (
              <div style={{
                background: '#f5f3ff',
                border: '1px solid #c4b5fd',
                borderRadius: 12,
                padding: '1rem 1.25rem',
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
              }}>
                <Tag size={18} color="#7c3aed" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#4c1d95', marginBottom: 4 }}>
                    All animals tagged
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#6d28d9', lineHeight: 1.5 }}>
                    Tags have been physically applied and verified by field officers.
                    {selected.approvedAt && ` Approved: ${selected.approvedAt}.`}
                  </div>
                </div>
              </div>
            )}

            {/* ---- Animal grid ---- */}
            <div>
              <div style={{
                fontWeight: 700,
                fontSize: '0.9375rem',
                color: '#0f172a',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <Users size={16} color="#0b5ed7" />
                Animals ({selected.animals.length})
              </div>
              <div className={s.animalGrid}>
                {selected.animals.map((a) => (
                  <AnimalCard key={a.id} animal={a} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default BatchRegistryPage;
