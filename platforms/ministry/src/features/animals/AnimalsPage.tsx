import { useState } from 'react';
import {
  Home, MapPin, ChevronRight, Tag, Beef,
  Search, Phone, User, Building2,
} from 'lucide-react';
import { getBadge } from '@/utils/statusBadge';
import s from './animals.module.css';

// ── Types ──────────────────────────────────────────────────────────────────────

type TagType  = 'RFID' | 'EAR_TAG';
type TagColor = 'yellow' | 'orange' | 'green' | 'blue' | 'red';

interface BatchAnimal {
  id: string; seq: number; sex: 'M' | 'F'; ageMonths: number; weightKg: number; features: string;
  animalId?: string; tagSerial?: string; tagType?: TagType; tagColor?: TagColor;
  tagStatus: 'UNTAGGED' | 'TAGGED'; photoUrl?: string;
}

interface Batch {
  id: string; batchCode: string; batchName: string;
  species: string; breed: string; count: number; status: string;
  createdAt: string; animals: BatchAnimal[];
}

interface Premises {
  id: string; code: string; name: string;
  owner: string; ownerPhone: string;
  region: string; type: string; status: string;
  batches: Batch[];
}

// ── Mock Data ──────────────────────────────────────────────────────────────────

const MOCK_PREMISES: Premises[] = [
  {
    id: 'prm1', code: 'SOM-MOG-004', name: 'Daynile Farm',
    owner: 'Ahmed Hassan', ownerPhone: '+252 61 234 5678',
    region: 'Banaadir', type: 'FARM', status: 'APPROVED',
    batches: [
      {
        id: 'b1', batchCode: 'HRD-2026-MOG-001', batchName: 'Daynile Zebu Herd',
        species: 'Cattle', breed: 'Somali Zebu', count: 3, status: 'TAGGED',
        createdAt: '2026-07-15',
        animals: [
          { id: 'ba1', seq: 1, sex: 'M', ageMonths: 36, weightKg: 280, features: 'White patch', animalId: '9001000441', tagSerial: '9001000441', tagType: 'RFID', tagColor: 'yellow', tagStatus: 'TAGGED' },
          { id: 'ba2', seq: 2, sex: 'M', ageMonths: 42, weightKg: 310, features: 'Brown coat',  animalId: '9001000442', tagSerial: '9001000442', tagType: 'RFID', tagColor: 'yellow', tagStatus: 'TAGGED' },
          { id: 'ba3', seq: 3, sex: 'F', ageMonths: 28, weightKg: 245, features: 'Black face',  animalId: '9001000443', tagSerial: '9001000443', tagType: 'RFID', tagColor: 'yellow', tagStatus: 'TAGGED' },
        ],
      },
      {
        id: 'b2', batchCode: 'HRD-2026-MOG-003', batchName: 'Small Goat Group',
        species: 'Goat', breed: 'Somali', count: 2, status: 'APPROVED',
        createdAt: '2026-08-01',
        animals: [
          { id: 'bc1', seq: 1, sex: 'M', ageMonths: 24, weightKg: 42, features: '',            tagStatus: 'UNTAGGED' },
          { id: 'bc2', seq: 2, sex: 'F', ageMonths: 18, weightKg: 32, features: 'Brown coat', tagStatus: 'UNTAGGED' },
        ],
      },
    ],
  },
  {
    id: 'prm2', code: 'SOM-BAY-011', name: 'Baidoa Livestock Holdings',
    owner: 'Faadumo Ali', ownerPhone: '+252 61 876 5432',
    region: 'Bay', type: 'FARM', status: 'APPROVED',
    batches: [
      {
        id: 'b3', batchCode: 'HRD-2026-BAY-002', batchName: 'Baidoa Sheep Flock',
        species: 'Sheep', breed: 'Somali Blackhead', count: 4, status: 'APPROVED',
        createdAt: '2026-07-28',
        animals: [
          { id: 'bb1', seq: 1, sex: 'M', ageMonths: 18, weightKg: 36, features: '',             animalId: '9001000201', tagSerial: '9001000201', tagType: 'EAR_TAG', tagColor: 'yellow', tagStatus: 'UNTAGGED' },
          { id: 'bb2', seq: 2, sex: 'M', ageMonths: 20, weightKg: 38, features: 'Black legs',   animalId: '9001000202', tagSerial: '9001000202', tagType: 'EAR_TAG', tagColor: 'yellow', tagStatus: 'UNTAGGED' },
          { id: 'bb3', seq: 3, sex: 'F', ageMonths: 16, weightKg: 30, features: '',             animalId: '9001000203', tagSerial: '9001000203', tagType: 'EAR_TAG', tagColor: 'yellow', tagStatus: 'UNTAGGED' },
          { id: 'bb4', seq: 4, sex: 'F', ageMonths: 15, weightKg: 28, features: 'White blaze', animalId: '9001000204', tagSerial: '9001000204', tagType: 'EAR_TAG', tagColor: 'yellow', tagStatus: 'UNTAGGED' },
        ],
      },
    ],
  },
  {
    id: 'prm3', code: 'SOM-JUB-004', name: 'Kismayo Camel Station',
    owner: 'Mohamed Said', ownerPhone: '+252 61 555 1234',
    region: 'Lower Jubba', type: 'PASTORAL_CAMP', status: 'APPROVED',
    batches: [
      {
        id: 'b4', batchCode: 'HRD-2026-KIS-003', batchName: 'Kismayo Goat Herd',
        species: 'Goat', breed: 'Somali', count: 3, status: 'UNDER_REVIEW',
        createdAt: '2026-08-02',
        animals: [
          { id: 'bd1', seq: 1, sex: 'M', ageMonths: 24, weightKg: 42, features: '',            tagStatus: 'UNTAGGED' },
          { id: 'bd2', seq: 2, sex: 'F', ageMonths: 18, weightKg: 32, features: '',            tagStatus: 'UNTAGGED' },
          { id: 'bd3', seq: 3, sex: 'F', ageMonths: 20, weightKg: 35, features: 'Brown coat', tagStatus: 'UNTAGGED' },
        ],
      },
    ],
  },
  {
    id: 'prm4', code: 'SOM-GAR-002', name: 'Garowe Highland Farm',
    owner: 'Hodan Abdullahi', ownerPhone: '+252 61 777 9988',
    region: 'Nugaal', type: 'FARM', status: 'APPROVED',
    batches: [
      {
        id: 'b5', batchCode: 'HRD-2026-GAR-001', batchName: 'Garowe Camel Herd',
        species: 'Camel', breed: 'Somali Dromedary', count: 2, status: 'SUBMITTED',
        createdAt: '2026-08-03',
        animals: [
          { id: 'be1', seq: 1, sex: 'M', ageMonths: 60, weightKg: 450, features: 'Dark brown', tagStatus: 'UNTAGGED' },
          { id: 'be2', seq: 2, sex: 'F', ageMonths: 48, weightKg: 380, features: '',           tagStatus: 'UNTAGGED' },
        ],
      },
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

const SPECIES_EMOJI: Record<string, string> = {
  Cattle: '🐄', Camel: '🐪', Goat: '🐐', Sheep: '🐑',
};

const PREMISES_TYPE_LABEL: Record<string, string> = {
  FARM: 'Farm', PASTORAL_CAMP: 'Pastoral Camp', FEEDLOT: 'Feedlot',
  SLAUGHTERHOUSE: 'Slaughterhouse', QUARANTINE: 'Quarantine Station',
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function totalAnimals(premises: Premises) {
  return premises.batches.reduce((sum, b) => sum + b.count, 0);
}

// ── Status Badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const b = getBadge(status);
  return (
    <span className={s.badge} style={{ background: b.bg, color: b.color }}>
      {b.label}
    </span>
  );
}

// ── Tag SVG Components ─────────────────────────────────────────────────────────

function RFIDTag({ serial, color = 'yellow' }: { serial?: string; color?: TagColor }) {
  const fills: Record<TagColor, { body: string; stroke: string; text: string; sub: string }> = {
    yellow: { body: '#eab308', stroke: '#713f12', text: '#1c1917', sub: '#422006' },
    orange: { body: '#fed7aa', stroke: '#f97316', text: '#7c2d12', sub: '#9a3412' },
    green:  { body: '#bbf7d0', stroke: '#16a34a', text: '#14532d', sub: '#166534' },
    blue:   { body: '#bfdbfe', stroke: '#3b82f6', text: '#1e3a8a', sub: '#1e40af' },
    red:    { body: '#fecaca', stroke: '#ef4444', text: '#7f1d1d', sub: '#991b1b' },
  };
  const c = fills[color] ?? fills.yellow;
  const fullSerial = serial ?? 'UNASSIGNED';
  return (
    <svg width="110" height="100" viewBox="0 0 110 100" style={{ display: 'block' }}>
      <rect x="40" y="2" width="30" height="18" rx="6" fill={c.body} stroke={c.stroke} strokeWidth="2" />
      <circle cx="55" cy="11" r="4.5" fill="#e5e7eb" stroke={c.stroke} strokeWidth="1.5" />
      <circle cx="55" cy="11" r="2" fill="white" />
      <rect x="2" y="14" width="106" height="84" rx="14" fill={c.body} stroke={c.stroke} strokeWidth="2" />
      <rect x="10" y="22" width="90" height="68" rx="9" fill="none" stroke={c.stroke} strokeWidth="1" opacity="0.35" />
      <rect x="14" y="27" width="18" height="13" rx="2" fill="rgba(0,0,0,0.3)" />
      <rect x="16" y="29" width="14" height="9" rx="1" fill="#1e293b" />
      <line x1="12" y1="30" x2="14" y2="30" stroke={c.sub} strokeWidth="1" />
      <line x1="12" y1="36" x2="14" y2="36" stroke={c.sub} strokeWidth="1" />
      <line x1="32" y1="30" x2="34" y2="30" stroke={c.sub} strokeWidth="1" />
      <line x1="32" y1="36" x2="34" y2="36" stroke={c.sub} strokeWidth="1" />
      <path d="M76,28 Q81,34 76,40" fill="none" stroke={c.sub} strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
      <path d="M81,25 Q89,34 81,43" fill="none" stroke={c.sub} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <path d="M86,22 Q97,34 86,46" fill="none" stroke={c.sub} strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
      <text x="55" y="57" fontSize="6.5" fill={c.sub} fontFamily="monospace" textAnchor="middle" letterSpacing="1.5">ID NUMBER</text>
      <text x="55" y="70" fontSize="11" fill={c.text} fontFamily="monospace" fontWeight="bold" textAnchor="middle">{fullSerial}</text>
      <text x="55" y="83" fontSize="8" fill={c.sub} fontFamily="monospace" textAnchor="middle">{fullSerial}</text>
    </svg>
  );
}

function EarTag({ serial, color = 'yellow' }: { serial?: string; color?: TagColor }) {
  const fills: Record<TagColor, { body: string; stroke: string; text: string; num: string }> = {
    yellow: { body: '#eab308', stroke: '#713f12', text: '#1c1917', num: '#422006' },
    orange: { body: '#fed7aa', stroke: '#f97316', text: '#7c2d12', num: '#9a3412' },
    green:  { body: '#bbf7d0', stroke: '#16a34a', text: '#14532d', num: '#166534' },
    blue:   { body: '#bfdbfe', stroke: '#3b82f6', text: '#1e3a8a', num: '#1e40af' },
    red:    { body: '#fecaca', stroke: '#ef4444', text: '#7f1d1d', num: '#991b1b' },
  };
  const c = fills[color] ?? fills.yellow;
  const fullSerial = serial ?? 'PENDING';
  return (
    <svg width="110" height="100" viewBox="0 0 110 100" style={{ display: 'block' }}>
      <rect x="40" y="2" width="30" height="18" rx="6" fill={c.body} stroke={c.stroke} strokeWidth="2" />
      <circle cx="55" cy="11" r="4.5" fill="#e5e7eb" stroke={c.stroke} strokeWidth="1.5" />
      <circle cx="55" cy="11" r="2" fill="white" />
      <rect x="2" y="14" width="106" height="84" rx="14" fill={c.body} stroke={c.stroke} strokeWidth="2" />
      <rect x="10" y="22" width="90" height="68" rx="9" fill="none" stroke={c.stroke} strokeWidth="1" opacity="0.35" />
      <text x="55" y="57" fontSize="6.5" fill={c.num} fontFamily="monospace" textAnchor="middle" letterSpacing="1.5">ID NUMBER</text>
      <text x="55" y="70" fontSize="11" fill={c.num} fontFamily="monospace" fontWeight="bold" textAnchor="middle">{fullSerial}</text>
      <text x="55" y="83" fontSize="8" fill={c.text} fontFamily="monospace" textAnchor="middle">{fullSerial}</text>
    </svg>
  );
}

function UnassignedTag() {
  return (
    <svg width="110" height="100" viewBox="0 0 110 100" style={{ display: 'block' }}>
      <rect x="40" y="2" width="30" height="18" rx="6" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
      <circle cx="55" cy="11" r="4.5" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.5" />
      <circle cx="55" cy="11" r="2" fill="white" />
      <rect x="2" y="14" width="106" height="84" rx="14" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="6 3" />
      <text x="55" y="57" fontSize="6.5" fill="#94a3b8" fontFamily="monospace" textAnchor="middle" letterSpacing="1.5">ID NUMBER</text>
      <text x="55" y="70" fontSize="9" fill="#cbd5e1" fontFamily="monospace" fontWeight="bold" textAnchor="middle">NOT ASSIGNED</text>
    </svg>
  );
}

// ── Animal Card ────────────────────────────────────────────────────────────────

function AnimalCard({ animal }: { animal: BatchAnimal }) {
  function renderTag() {
    if (animal.tagStatus === 'TAGGED') {
      if (animal.tagType === 'RFID')    return <RFIDTag serial={animal.tagSerial} color={animal.tagColor} />;
      if (animal.tagType === 'EAR_TAG') return <EarTag  serial={animal.tagSerial} color={animal.tagColor} />;
    }
    return <UnassignedTag />;
  }

  return (
    <div className={s.animalCard}>
      {/* Seq + sex */}
      <div className={s.animalSeqRow}>
        <span className={s.animalSeq}>#{animal.seq}</span>
        <span className={`${s.sexBadge} ${animal.sex === 'M' ? s.sexM : s.sexF}`}>
          {animal.sex === 'M' ? 'Male' : 'Female'}
        </span>
      </div>

      {/* Photo */}
      <div className={s.animalPhotoWrap}>
        {animal.photoUrl ? (
          <img src={animal.photoUrl} className={s.animalPhotoImg} alt="animal" />
        ) : (
          <div className={s.animalPhotoUpload}>
            <span className={s.animalPhotoUploadMain}>Upload Animal Photo</span>
            <span className={s.animalPhotoUploadSub}>JPG · PNG · up to 10 MB</span>
          </div>
        )}
      </div>

      {/* Meta */}
      <div className={s.animalMeta}>
        {animal.ageMonths > 0 ? `${animal.ageMonths} mo` : '—'} &nbsp;·&nbsp; {animal.weightKg > 0 ? `${animal.weightKg} kg` : '—'}
        {animal.features ? <><br /><span style={{ fontStyle: 'italic' }}>{animal.features}</span></> : null}
      </div>

      {/* Tag SVG */}
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
        {renderTag()}
      </div>

      {/* Animal ID or status */}
      {animal.animalId
        ? <span className={s.animalIdText}>{animal.animalId}</span>
        : <span className={`${s.statusChip} ${s.statusUntagged}`}>Untagged</span>}
    </div>
  );
}

// ── Premises Sidebar Card ──────────────────────────────────────────────────────

function PremisesCard({ premises, isActive, onClick }: { premises: Premises; isActive: boolean; onClick: () => void }) {
  const b = getBadge(premises.status);
  const animals = totalAnimals(premises);
  return (
    <button
      className={`${s.premisesCard} ${isActive ? s.premisesCardActive : ''}`}
      onClick={onClick}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
        <span className={s.premisesName}>{premises.name}</span>
        <span className={s.badge} style={{ background: b.bg, color: b.color, flexShrink: 0 }}>{b.label}</span>
      </div>
      <span className={s.premisesCode}>{premises.code}</span>
      <div className={s.premisesOwner}>
        <User size={11} />
        {premises.owner}
        <span style={{ marginLeft: 2 }}>·</span>
        <Phone size={10} />
        {premises.ownerPhone}
      </div>
      <div className={s.premisesRegion}>
        <MapPin size={11} />
        {premises.region}
      </div>
      <div className={s.premisesFooter}>
        <div className={s.premisesStats}>
          <span className={s.statPill}>{animals} animals</span>
          <span className={s.statPill}>{premises.batches.length} batches</span>
        </div>
      </div>
    </button>
  );
}

// ── Batch Card ─────────────────────────────────────────────────────────────────

function BatchCard({ batch, onClick }: { batch: Batch; onClick: () => void }) {
  const emoji = SPECIES_EMOJI[batch.species] ?? '🐾';
  return (
    <button className={s.batchCard} onClick={onClick}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <span className={s.batchCardCode}>{batch.batchCode}</span>
        <StatusBadge status={batch.status} />
      </div>
      <span className={s.batchCardName}>{batch.batchName}</span>
      <div className={s.batchCardSpecies}>
        <span>{emoji}</span>
        <span>{batch.species}</span>
        <span style={{ color: '#94a3b8' }}>·</span>
        <span>{batch.breed}</span>
      </div>
      <div className={s.batchCardFooter}>
        <span className={s.batchCardDate}>Created {fmtDate(batch.createdAt)}</span>
        <span className={s.batchCardCount}>{batch.count} animals</span>
      </div>
    </button>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export function AnimalsPage(): JSX.Element {
  const [search, setSearch]                   = useState('');
  const [selectedPremises, setSelectedPremises] = useState<Premises | null>(null);
  const [selectedBatch, setSelectedBatch]       = useState<Batch | null>(null);

  function selectPremises(premises: Premises) {
    setSelectedPremises(premises);
    setSelectedBatch(null);
  }

  function selectBatch(batch: Batch) {
    setSelectedBatch(batch);
  }

  function backToPremises() {
    setSelectedBatch(null);
  }

  function backToRoot() {
    setSelectedPremises(null);
    setSelectedBatch(null);
  }

  const filteredPremises = MOCK_PREMISES.filter(p =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.code.toLowerCase().includes(search.toLowerCase()) ||
    p.owner.toLowerCase().includes(search.toLowerCase()) ||
    p.region.toLowerCase().includes(search.toLowerCase())
  );

  // ── Render right panel content ─────────────────────────────────────────────

  function renderRight() {
    // No premises selected
    if (!selectedPremises) {
      return (
        <div className={s.emptyState}>
          <Home size={52} strokeWidth={1.1} />
          <div>
            <p className={s.emptyStateTitle}>Select a Premises</p>
            <p className={s.emptyStateSub}>Choose a premises from the list to view its batches and animals.</p>
          </div>
        </div>
      );
    }

    // Batch selected — show animals
    if (selectedBatch) {
      const emoji = SPECIES_EMOJI[selectedBatch.species] ?? '🐾';
      return (
        <>
          {/* Batch detail header */}
          <div className={s.batchDetailHeader}>
            {/* Breadcrumb */}
            <div className={s.breadcrumb}>
              <span className={s.breadcrumbLink} onClick={backToRoot}>Animals</span>
              <ChevronRight size={12} />
              <span className={s.breadcrumbLink} onClick={backToPremises}>{selectedPremises.name}</span>
              <ChevronRight size={12} />
              <span className={s.breadcrumbActive}>{selectedBatch.batchCode}</span>
            </div>

            {/* Title row */}
            <div className={s.batchDetailTitle}>
              <span>{emoji} {selectedBatch.batchName}</span>
              <StatusBadge status={selectedBatch.status} />
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#64748b' }}>{selectedBatch.batchCode}</div>

            {/* Detail chips */}
            <div className={s.detailChips}>
              <span className={s.detailChip}>Species: {selectedBatch.species}</span>
              <span className={s.detailChip}>Breed: {selectedBatch.breed}</span>
              <span className={s.detailChip}>{selectedBatch.count} animals</span>
              <span className={s.detailChip}>Created: {fmtDate(selectedBatch.createdAt)}</span>
              <span className={s.detailChip}>Premises: {selectedPremises.code}</span>
              <span className={s.detailChip}>Region: {selectedPremises.region}</span>
            </div>
          </div>

          {/* Animals grid */}
          <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '1.25rem 1.5rem' }}>
            <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Tag size={16} color="#64748b" />
              Animals in this batch ({selectedBatch.count})
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 400, color: '#94a3b8' }}>Click any card to view details</span>
            </div>
            <div className={s.animalGrid}>
              {selectedBatch.animals.map(animal => (
                <AnimalCard key={animal.id} animal={animal} />
              ))}
            </div>
          </div>
        </>
      );
    }

    // Premises selected, no batch — show batches
    const premisesBadge = getBadge(selectedPremises.status);
    return (
      <>
        {/* Premises detail header */}
        <div className={s.detailHeader}>
          {/* Breadcrumb */}
          <div className={s.breadcrumb}>
            <span className={s.breadcrumbLink} onClick={backToRoot}>Animals</span>
            <ChevronRight size={12} />
            <span className={s.breadcrumbActive}>{selectedPremises.name}</span>
          </div>

          {/* Title row */}
          <div className={s.detailTitle}>
            <Building2 size={18} color="#6366f1" />
            {selectedPremises.name}
            <span className={s.detailCode}>{selectedPremises.code}</span>
            <span className={s.badge} style={{ background: premisesBadge.bg, color: premisesBadge.color }}>{premisesBadge.label}</span>
          </div>

          {/* Owner info strip */}
          <div className={s.ownerStrip}>
            <span className={s.ownerChip}><User size={12} />{selectedPremises.owner}</span>
            <span className={s.ownerChip}><Phone size={12} />{selectedPremises.ownerPhone}</span>
            <span className={s.ownerChip}><MapPin size={12} />{selectedPremises.region}</span>
            <span className={s.ownerChip}><Building2 size={12} />{PREMISES_TYPE_LABEL[selectedPremises.type] ?? selectedPremises.type}</span>
            <span className={s.ownerChip}><Beef size={12} />{totalAnimals(selectedPremises)} animals</span>
          </div>
        </div>

        {/* Batches section */}
        <div>
          <div className={s.batchSectionTitle} style={{ marginBottom: '0.75rem' }}>
            <Tag size={16} color="#6366f1" />
            Batches ({selectedPremises.batches.length})
          </div>
          {selectedPremises.batches.length === 0 ? (
            <div style={{ padding: '3rem 2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem', background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              No batches registered for this premises.
            </div>
          ) : (
            <div className={s.batchGrid}>
              {selectedPremises.batches.map(batch => (
                <BatchCard key={batch.id} batch={batch} onClick={() => selectBatch(batch)} />
              ))}
            </div>
          )}
        </div>
      </>
    );
  }

  // ── Page layout ────────────────────────────────────────────────────────────

  return (
    <div className={s.pageWrap}>

      {/* Left Sidebar */}
      <div className={s.sidebar}>
        <div className={s.sidebarHeader}>
          <div className={s.sidebarTitle}>
            <span className={s.sidebarTitleText}>Premises</span>
            <span className={s.sidebarCount}>{filteredPremises.length}</span>
          </div>
          <div className={s.searchWrap}>
            <Search size={14} className={s.searchIcon} />
            <input
              className={s.searchInput}
              placeholder="Search premises, owner, region…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className={s.premisesList}>
          {filteredPremises.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8125rem' }}>
              No premises match your search.
            </div>
          ) : (
            filteredPremises.map(premises => (
              <PremisesCard
                key={premises.id}
                premises={premises}
                isActive={selectedPremises?.id === premises.id}
                onClick={() => selectPremises(premises)}
              />
            ))
          )}
        </div>
      </div>

      {/* Right Panel */}
      <div className={s.rightPanel}>
        <div className={s.rightScroll}>
          {renderRight()}
        </div>
      </div>

    </div>
  );
}

export default AnimalsPage;
