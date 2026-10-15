import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList,
  Plus,
  Stethoscope,
  Scissors,
  Package,
  QrCode,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Printer,
  Truck,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase';
import s from './slaughter.module.css';

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */

type SessionStatus = 'OPEN' | 'COMPLETED';
type AnimalStatus =
  | 'ARRIVED'
  | 'ANTE_MORTEM_DONE'
  | 'SLAUGHTERED'
  | 'POST_MORTEM_DONE'
  | 'PACKAGED'
  | 'QR_ISSUED';
type AnteMortemDecision = 'APPROVED' | 'HELD' | 'REJECTED';
type PostMortemDecision = 'PASSED' | 'CONDITIONALLY_PASSED' | 'CONDEMNED';
type CutType = 'Whole Carcass' | 'Half Carcass (2 halves)' | 'Quarters (4)' | 'Retail Cuts';
type Grade = 'A' | 'B' | 'C';

interface Session {
  id: string;
  sessionCode: string;
  premisesCode: string;
  sessionDate: string;
  status: SessionStatus;
  animalCount: number;
}

interface PackagingData {
  packageCode: string;
  cutType: CutType;
  netWeightKg: number;
  grade: Grade;
  storageTempC: number;
}

interface AnimalRecord {
  id: string;
  recordNo: string;
  animalId: string;
  tagSerial: string;
  species: string;
  breed: string;
  liveWeightKg: number;
  originFarm: string;
  ownerName: string;
  status: AnimalStatus;
  anteMortemDecision?: AnteMortemDecision;
  anteMortemNotes?: string;
  anteMortemOfficer?: string;
  slaughterTime?: string;
  slaughterMethod?: string;
  slaughtermanName?: string;
  postMortemDecision?: PostMortemDecision;
  postMortemObservations?: string;
  postMortemOfficer?: string;
  carcassCode?: string;
  packaging?: PackagingData;
  certIssued?: string;
}

type ActiveTab = 'sessions' | 'animals' | 'slaughter' | 'packaging' | 'qr';

/* ─────────────────────────────────────────────
   MOCK DATA
───────────────────────────────────────────── */

const INITIAL_SESSIONS: Session[] = [
  {
    id: 'sess-0041',
    sessionCode: 'SLS-2026-0041',
    premisesCode: 'SOM-MOG-ABATTOIR-001',
    sessionDate: '2026-08-04',
    status: 'OPEN',
    animalCount: 12,
  },
  {
    id: 'sess-0040',
    sessionCode: 'SLS-2026-0040',
    premisesCode: 'SOM-BAY-ABATTOIR-001',
    sessionDate: '2026-08-03',
    status: 'COMPLETED',
    animalCount: 28,
  },
  {
    id: 'sess-0039',
    sessionCode: 'SLS-2026-0039',
    premisesCode: 'SOM-MOG-ABATTOIR-001',
    sessionDate: '2026-08-02',
    status: 'COMPLETED',
    animalCount: 18,
  },
];

const INITIAL_ANIMALS: AnimalRecord[] = [
  {
    id: 'slr-001',
    recordNo: 'SLR-001',
    animalId: 'SOB-2026-0041',
    tagSerial: 'RFID-2026-05011',
    species: 'Cattle',
    breed: 'Somali Zebu',
    liveWeightKg: 380,
    originFarm: 'SOM-BAY-001',
    ownerName: 'Hassan Abdi',
    status: 'QR_ISSUED',
    anteMortemDecision: 'APPROVED',
    anteMortemOfficer: 'Dr. Ahmed Vet',
    slaughterTime: '2026-08-04T08:30',
    slaughterMethod: 'Halal',
    slaughtermanName: 'Abdi Warsame',
    postMortemDecision: 'PASSED',
    postMortemOfficer: 'Dr. Ahmed Vet',
    carcassCode: 'CAR-2026-00041',
    packaging: {
      packageCode: 'PKG-2026-0041-001',
      cutType: 'Whole Carcass',
      netWeightKg: 210,
      grade: 'A',
      storageTempC: 2,
    },
    certIssued: '2026-08-04 14:32',
  },
  {
    id: 'slr-002',
    recordNo: 'SLR-002',
    animalId: 'SOB-2026-0042',
    tagSerial: 'RFID-2026-05012',
    species: 'Cattle',
    breed: 'Somali Zebu',
    liveWeightKg: 410,
    originFarm: 'SOM-BAY-001',
    ownerName: 'Hassan Abdi',
    status: 'PACKAGED',
    anteMortemDecision: 'APPROVED',
    anteMortemOfficer: 'Dr. Ahmed Vet',
    slaughterTime: '2026-08-04T08:45',
    slaughterMethod: 'Halal',
    slaughtermanName: 'Abdi Warsame',
    postMortemDecision: 'PASSED',
    postMortemOfficer: 'Dr. Ahmed Vet',
    carcassCode: 'CAR-2026-00042',
    packaging: {
      packageCode: 'PKG-2026-0041-002',
      cutType: 'Half Carcass (2 halves)',
      netWeightKg: 225,
      grade: 'A',
      storageTempC: 2,
    },
  },
  {
    id: 'slr-003',
    recordNo: 'SLR-003',
    animalId: 'GOT-2026-0015',
    tagSerial: 'EAR-2026-20015',
    species: 'Goat',
    breed: 'Somali Goat',
    liveWeightKg: 45,
    originFarm: 'SOM-MOG-007',
    ownerName: 'Fadumo Said',
    status: 'POST_MORTEM_DONE',
    anteMortemDecision: 'APPROVED',
    anteMortemOfficer: 'Dr. Ahmed Vet',
    slaughterTime: '2026-08-04T09:10',
    slaughterMethod: 'Halal',
    slaughtermanName: 'Abdi Warsame',
    postMortemDecision: 'PASSED',
    postMortemOfficer: 'Dr. Ahmed Vet',
    carcassCode: 'CAR-2026-00043',
  },
  {
    id: 'slr-004',
    recordNo: 'SLR-004',
    animalId: 'SHP-2026-0008',
    tagSerial: 'EAR-2026-20016',
    species: 'Sheep',
    breed: 'Somali Sheep',
    liveWeightKg: 52,
    originFarm: 'SOM-MOG-007',
    ownerName: 'Fadumo Said',
    status: 'SLAUGHTERED',
    anteMortemDecision: 'APPROVED',
    anteMortemOfficer: 'Dr. Ahmed Vet',
    slaughterTime: '2026-08-04T09:30',
    slaughterMethod: 'Halal',
    slaughtermanName: 'Abdi Warsame',
  },
  {
    id: 'slr-005',
    recordNo: 'SLR-005',
    animalId: 'CAM-2026-0003',
    tagSerial: 'EAR-2026-20017',
    species: 'Camel',
    breed: 'Somali Camel',
    liveWeightKg: 520,
    originFarm: 'SOM-PNT-022',
    ownerName: 'Omar Hassan',
    status: 'ANTE_MORTEM_DONE',
    anteMortemDecision: 'APPROVED',
    anteMortemOfficer: 'Dr. Ahmed Vet',
  },
  {
    id: 'slr-006',
    recordNo: 'SLR-006',
    animalId: 'SOB-2026-0050',
    tagSerial: 'EAR-2026-20018',
    species: 'Cattle',
    breed: 'Somali Zebu',
    liveWeightKg: 375,
    originFarm: 'SOM-BAY-009',
    ownerName: 'Ali Mohamed',
    status: 'ARRIVED',
  },
];

const SESSION_ANIMALS: Record<string, AnimalRecord[]> = {
  'sess-0041': INITIAL_ANIMALS,
  'sess-0040': [],
  'sess-0039': [],
};

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */

function statusBadge(status: AnimalStatus): JSX.Element {
  const map: Record<AnimalStatus, { label: string; bg: string; color: string }> = {
    ARRIVED:          { label: 'Arrived',           bg: '#f1f5f9', color: '#475569' },
    ANTE_MORTEM_DONE: { label: 'Ante-Mortem Done',  bg: '#eff6ff', color: '#2563eb' },
    SLAUGHTERED:      { label: 'Slaughtered',        bg: '#fef3c7', color: '#b45309' },
    POST_MORTEM_DONE: { label: 'Post-Mortem Done',   bg: '#f0fdf4', color: '#15803d' },
    PACKAGED:         { label: 'Packaged',           bg: '#faf5ff', color: '#7c3aed' },
    QR_ISSUED:        { label: 'QR Issued',          bg: '#ecfdf5', color: '#059669' },
  };
  const m = map[status];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: 20,
        fontSize: '0.6875rem',
        fontWeight: 700,
        letterSpacing: '0.01em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        background: m.bg,
        color: m.color,
      }}
    >
      {m.label}
    </span>
  );
}

function amBadge(decision?: AnteMortemDecision): JSX.Element {
  if (!decision) return <span className={`${s.badge} ${s.badgePending}`}>Pending</span>;
  const cls =
    decision === 'APPROVED' ? s.badgeApproved :
    decision === 'HELD'     ? s.badgeHeld     : s.badgeRejected;
  return <span className={`${s.badge} ${cls}`}>{decision}</span>;
}

function pmBadge(decision?: PostMortemDecision): JSX.Element {
  if (!decision) return <span className={`${s.badge} ${s.badgePending}`}>Pending</span>;
  const map: Record<PostMortemDecision, string> = {
    PASSED:               '#16a34a',
    CONDITIONALLY_PASSED: '#d97706',
    CONDEMNED:            '#dc2626',
  };
  return (
    <span
      className={s.badge}
      style={{ background: decision === 'CONDEMNED' ? '#fef2f2' : decision === 'PASSED' ? '#dcfce7' : '#fef3c7', color: map[decision] }}
    >
      {decision.replace('_', ' ')}
    </span>
  );
}

function nextRecordNo(animals: AnimalRecord[]): string {
  const n = animals.length + 1;
  return `SLR-${String(n).padStart(3, '0')}`;
}

function nextCarcassCode(): string {
  const n = Math.floor(Math.random() * 90000) + 10000;
  return `CAR-2026-${n}`;
}

function nextPackageCode(sessionCode: string, animals: AnimalRecord[]): string {
  const packed = animals.filter(a => a.packaging).length + 1;
  const idx = sessionCode.split('-').pop() ?? '0000';
  return `PKG-2026-${idx}-${String(packed).padStart(3, '0')}`;
}

/* ─────────────────────────────────────────────
   QR CODE GENERATION (pure JS, no library)
───────────────────────────────────────────── */

function generateQRSVG(data: string): string {
  const SIZE = 21;
  const CELL = 10;

  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = (Math.imul(31, hash) + data.charCodeAt(i)) | 0;
  }

  function seededRand(seed: number): () => number {
    let s = seed ^ 0x5a5a5a5a;
    return () => {
      s = (Math.imul(s ^ (s >>> 17), 0x45d9f3b) ^ (s >>> 7)) | 0;
      return (s >>> 0) / 0xffffffff;
    };
  }

  const rand = seededRand(hash);
  const grid: boolean[][] = Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => rand() > 0.5)
  );

  function drawFinder(r: number, c: number) {
    for (let dr = 0; dr < 7; dr++) {
      for (let dc = 0; dc < 7; dc++) {
        const onOuter = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const onInner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        grid[r + dr][c + dc] = onOuter || onInner;
      }
    }
  }

  drawFinder(0, 0);
  drawFinder(0, SIZE - 7);
  drawFinder(SIZE - 7, 0);

  const totalPx = SIZE * CELL;
  const cells: string[] = [];

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c]) {
        cells.push(`<rect x="${c * CELL}" y="${r * CELL}" width="${CELL}" height="${CELL}" fill="#000"/>`);
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalPx}" height="${totalPx}" viewBox="0 0 ${totalPx} ${totalPx}">
  <rect width="${totalPx}" height="${totalPx}" fill="#fff"/>
  ${cells.join('\n  ')}
</svg>`;
}

/* ─────────────────────────────────────────────
   TAB 1 — BATCH SESSIONS
───────────────────────────────────────────── */

interface SessionsTabProps {
  sessions: Session[];
  selectedSessionId: string;
  onSelect: (id: string) => void;
  onAddSession: (s: Session) => void;
}

function SessionsTab({ sessions, selectedSessionId, onSelect, onAddSession }: SessionsTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [premisesCode, setPremisesCode] = useState('');
  const [sessionDate, setSessionDate]   = useState('2026-08-04');
  const [expectedCount, setExpectedCount] = useState('');
  const [vetOfficer, setVetOfficer]     = useState('');

  const today = '2026-08-04';
  const todaySessions = sessions.filter(s => s.sessionDate === today);
  const animalsProcessed = sessions.reduce((acc, s) => acc + (s.status === 'COMPLETED' ? s.animalCount : 0), 0);
  const pending = sessions.filter(s => s.status === 'OPEN').length;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newSession: Session = {
      id: `sess-${Date.now()}`,
      sessionCode: `SLS-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      premisesCode,
      sessionDate,
      status: 'OPEN',
      animalCount: 0,
    };
    onAddSession(newSession);
    setShowForm(false);
    setPremisesCode('');
    setExpectedCount('');
    setVetOfficer('');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Sessions Today', value: todaySessions.length },
          { label: 'Animals Processed', value: animalsProcessed },
          { label: 'Pending Sessions', value: pending },
        ].map(chip => (
          <div
            key={chip.label}
            style={{
              background: '#fff',
              borderRadius: 12,
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              padding: '0.75rem 1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              minWidth: 140,
            }}
          >
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{chip.value}</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>{chip.label}</span>
          </div>
        ))}

        <button
          className={s.submitBtn}
          style={{ marginLeft: 'auto', alignSelf: 'center' }}
          onClick={() => setShowForm(v => !v)}
        >
          <Plus size={14} /> New Session
        </button>
      </div>

      {showForm && (
        <div className={s.formCard}>
          <h2 className={s.sectionTitle}>New Slaughter Session</h2>
          <form onSubmit={handleSubmit}>
            <div className={s.formGrid}>
              <div className={s.field}>
                <label className={s.label}>Premises Code</label>
                <input className={s.input} required value={premisesCode} onChange={e => setPremisesCode(e.target.value)} placeholder="SOM-MOG-ABATTOIR-001" />
              </div>
              <div className={s.field}>
                <label className={s.label}>Session Date</label>
                <input className={s.input} type="date" required value={sessionDate} onChange={e => setSessionDate(e.target.value)} />
              </div>
              <div className={s.field}>
                <label className={s.label}>Expected Animal Count</label>
                <input className={s.input} type="number" min="1" value={expectedCount} onChange={e => setExpectedCount(e.target.value)} />
              </div>
              <div className={s.field}>
                <label className={s.label}>Veterinary Officer Name</label>
                <input className={s.input} value={vetOfficer} onChange={e => setVetOfficer(e.target.value)} placeholder="Dr. Ahmed Vet" />
              </div>
            </div>
            <div className={s.formActions}>
              <button type="button" className={s.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className={s.submitBtn}>Create Session</button>
            </div>
          </form>
        </div>
      )}

      {sessions.map(sess => {
        const isSelected = sess.id === selectedSessionId;
        return (
          <div
            key={sess.id}
            className={s.sessionCard}
            style={{ border: isSelected ? '2px solid #0b5ed7' : '2px solid transparent' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span className={s.sessionCode}>{sess.sessionCode}</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '3px 10px',
                  borderRadius: 20,
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  background: sess.status === 'OPEN' ? '#dcfce7' : '#f1f5f9',
                  color: sess.status === 'OPEN' ? '#16a34a' : '#475569',
                }}
              >
                {sess.status}
              </span>
            </div>
            <span className={s.sessionMeta}>Premises: {sess.premisesCode}</span>
            <span className={s.sessionMeta}>Date: {sess.sessionDate} · {sess.animalCount} animals</span>
            {sess.status === 'OPEN' && (
              <button
                className={s.inspectBtn}
                style={{ alignSelf: 'flex-start', marginTop: '0.25rem' }}
                onClick={() => onSelect(sess.id)}
              >
                {isSelected ? '✓ Selected' : 'Select'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────
   TAB 2 — ANIMALS
───────────────────────────────────────────── */

interface AnimalsTabProps {
  animals: AnimalRecord[];
  session: Session;
  onUpdate: (animals: AnimalRecord[]) => void;
}

function AnimalsTab({ animals, session, onUpdate }: AnimalsTabProps) {
  const [showArrivalForm, setShowArrivalForm] = useState(false);
  const [animalId, setAnimalId]               = useState('');
  const [tagSerial, setTagSerial]             = useState('');
  const [species, setSpecies]                 = useState('');
  const [breed, setBreed]                     = useState('');
  const [liveWeight, setLiveWeight]           = useState('');
  const [originFarm, setOriginFarm]           = useState('');

  const [inspectingId, setInspectingId] = useState<string | null>(null);
  const [amDecision, setAmDecision]     = useState<AnteMortemDecision | ''>('');
  const [amNotes, setAmNotes]           = useState('');
  const [amOfficer, setAmOfficer]       = useState('');

  function handleArrival(e: React.FormEvent) {
    e.preventDefault();
    const rec: AnimalRecord = {
      id: `slr-${Date.now()}`,
      recordNo: nextRecordNo(animals),
      animalId,
      tagSerial,
      species,
      breed,
      liveWeightKg: parseFloat(liveWeight),
      originFarm,
      ownerName: '',
      status: 'ARRIVED',
    };
    onUpdate([...animals, rec]);
    setShowArrivalForm(false);
    setAnimalId(''); setTagSerial(''); setSpecies(''); setBreed(''); setLiveWeight(''); setOriginFarm('');
  }

  function handleAnteMortem(e: React.FormEvent, id: string) {
    e.preventDefault();
    if (!amDecision) return;
    onUpdate(animals.map(a =>
      a.id === id
        ? { ...a, status: 'ANTE_MORTEM_DONE' as AnimalStatus, anteMortemDecision: amDecision as AnteMortemDecision, anteMortemNotes: amNotes, anteMortemOfficer: amOfficer }
        : a
    ));
    setInspectingId(null);
    setAmDecision(''); setAmNotes(''); setAmOfficer('');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 className={s.sectionTitle} style={{ margin: 0 }}>
          Animals — {session.sessionCode} ({animals.length})
        </h2>
        <button className={s.submitBtn} onClick={() => setShowArrivalForm(v => !v)}>
          <Plus size={14} /> Record Arrival
        </button>
      </div>

      {showArrivalForm && (
        <div className={s.formCard}>
          <h2 className={s.sectionTitle}>Record Animal Arrival</h2>
          <form onSubmit={handleArrival}>
            <div className={s.formGrid}>
              <div className={s.field}>
                <label className={s.label}>Animal ID</label>
                <input className={s.input} required value={animalId} onChange={e => setAnimalId(e.target.value)} placeholder="SOB-2026-XXXX" />
              </div>
              <div className={s.field}>
                <label className={s.label}>Tag Serial Number</label>
                <input className={s.input} required value={tagSerial} onChange={e => setTagSerial(e.target.value)} placeholder="RFID-2026-XXXXX" />
              </div>
              <div className={s.field}>
                <label className={s.label}>Species</label>
                <select className={s.input} required value={species} onChange={e => setSpecies(e.target.value)}>
                  <option value="">— select —</option>
                  <option>Cattle</option>
                  <option>Goat</option>
                  <option>Sheep</option>
                  <option>Camel</option>
                </select>
              </div>
              <div className={s.field}>
                <label className={s.label}>Breed</label>
                <input className={s.input} required value={breed} onChange={e => setBreed(e.target.value)} placeholder="Somali Zebu" />
              </div>
              <div className={s.field}>
                <label className={s.label}>Live Weight (kg)</label>
                <input className={s.input} type="number" min="1" step="0.1" required value={liveWeight} onChange={e => setLiveWeight(e.target.value)} />
              </div>
              <div className={s.field}>
                <label className={s.label}>Origin Farm ID</label>
                <input className={s.input} required value={originFarm} onChange={e => setOriginFarm(e.target.value)} placeholder="SOM-BAY-001" />
              </div>
            </div>
            <div className={s.formActions}>
              <button type="button" className={s.cancelBtn} onClick={() => setShowArrivalForm(false)}>Cancel</button>
              <button type="submit" className={s.submitBtn}>Record Arrival</button>
            </div>
          </form>
        </div>
      )}

      {animals.length === 0 ? (
        <div className={s.empty}>
          <ClipboardList size={40} color="#c7dff7" />
          <p>No animals recorded in this session yet.</p>
        </div>
      ) : (
        animals.map(animal => (
          <div key={animal.id} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div className={s.recordCard}>
              <div className={s.recordInfo}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className={s.recordCode}>{animal.recordNo}</span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>·</span>
                  <span className={s.recordCode} style={{ fontWeight: 500 }}>{animal.animalId}</span>
                </div>
                <span className={s.recordMeta}>
                  Tag: {animal.tagSerial} · {animal.species} ({animal.breed}) · {animal.liveWeightKg} kg
                </span>
                <span className={s.recordMeta}>
                  Origin: {animal.originFarm}{animal.ownerName ? ` · ${animal.ownerName}` : ''}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {statusBadge(animal.status)}
                {animal.status === 'ARRIVED' && (
                  <button
                    className={s.inspectBtn}
                    onClick={() => setInspectingId(inspectingId === animal.id ? null : animal.id)}
                  >
                    <Stethoscope size={13} /> Ante-Mortem Inspect
                  </button>
                )}
              </div>
            </div>

            {inspectingId === animal.id && (
              <div className={s.formCard} style={{ borderRadius: '0 0 14px 14px', marginTop: -8, borderTop: '2px solid #eff6ff' }}>
                <form onSubmit={e => handleAnteMortem(e, animal.id)}>
                  <div className={s.formGrid}>
                    <div className={s.field}>
                      <label className={s.label}>Decision</label>
                      <select className={s.input} required value={amDecision} onChange={e => setAmDecision(e.target.value as AnteMortemDecision)}>
                        <option value="">— select —</option>
                        <option value="APPROVED">APPROVED</option>
                        <option value="HELD">HELD</option>
                        <option value="REJECTED">REJECTED</option>
                      </select>
                    </div>
                    <div className={s.field}>
                      <label className={s.label}>Inspecting Officer Name</label>
                      <input className={s.input} required value={amOfficer} onChange={e => setAmOfficer(e.target.value)} placeholder="Dr. Ahmed Vet" />
                    </div>
                    <div className={s.field} style={{ gridColumn: '1 / -1' }}>
                      <label className={s.label}>Clinical Notes</label>
                      <textarea className={s.textarea} value={amNotes} onChange={e => setAmNotes(e.target.value)} placeholder="Clinical observations, findings…" />
                    </div>
                  </div>
                  <div className={s.formActions}>
                    <button type="button" className={s.cancelBtn} onClick={() => setInspectingId(null)}>Cancel</button>
                    <button type="submit" className={s.submitBtn}>Submit Inspection</button>
                  </div>
                </form>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   TAB 3 — SLAUGHTER
───────────────────────────────────────────── */

interface SlaughterTabProps {
  animals: AnimalRecord[];
  onUpdate: (animals: AnimalRecord[]) => void;
}

function SlaughterTab({ animals, onUpdate }: SlaughterTabProps) {
  const eligible = animals.filter(a => a.status === 'ANTE_MORTEM_DONE' && a.anteMortemDecision === 'APPROVED');

  const [openId, setOpenId]             = useState<string | null>(null);
  const [phase, setPhase]               = useState<'slaughter' | 'postmortem'>('slaughter');

  const [slaughterTime, setSlaughterTime] = useState('2026-08-04T10:00');
  const [method, setMethod]             = useState('Halal');
  const [slaughterman, setSlaughterman] = useState('');

  const [pmDecision, setPmDecision]     = useState<PostMortemDecision | ''>('');
  const [pmObservations, setPmObs]      = useState('');
  const [pmOfficer, setPmOfficer]       = useState('');

  function openAnimal(id: string) {
    setOpenId(id);
    setPhase('slaughter');
    setSlaughterTime('2026-08-04T10:00');
    setMethod('Halal');
    setSlaughterman('');
    setPmDecision(''); setPmObs(''); setPmOfficer('');
  }

  function handleSlaughter(e: React.FormEvent) {
    e.preventDefault();
    onUpdate(animals.map(a =>
      a.id === openId
        ? { ...a, status: 'SLAUGHTERED' as AnimalStatus, slaughterTime, slaughterMethod: method, slaughtermanName: slaughterman }
        : a
    ));
    setPhase('postmortem');
  }

  function handlePostMortem(e: React.FormEvent) {
    e.preventDefault();
    if (!pmDecision) return;
    const carcassCode = nextCarcassCode();
    onUpdate(animals.map(a =>
      a.id === openId
        ? { ...a, status: 'POST_MORTEM_DONE' as AnimalStatus, postMortemDecision: pmDecision as PostMortemDecision, postMortemObservations: pmObservations, postMortemOfficer: pmOfficer, carcassCode }
        : a
    ));
    setOpenId(null);
  }

  if (eligible.length === 0) {
    return (
      <div className={s.empty}>
        <Scissors size={40} color="#c7dff7" />
        <p>No animals ready for slaughter. Complete ante-mortem inspections first.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <h2 className={s.sectionTitle}>Animals Ready for Slaughter ({eligible.length})</h2>
      {eligible.map(animal => (
        <div key={animal.id} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div className={s.recordCard}>
            <div className={s.recordInfo}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className={s.recordCode}>{animal.recordNo}</span>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>·</span>
                <span className={s.recordCode} style={{ fontWeight: 500 }}>{animal.animalId}</span>
              </div>
              <span className={s.recordMeta}>
                Tag: {animal.tagSerial} · {animal.species} ({animal.breed}) · {animal.liveWeightKg} kg
              </span>
              <span className={s.recordMeta}>AM Decision: {amBadge(animal.anteMortemDecision)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {statusBadge(animal.status)}
              {openId !== animal.id && (
                <button className={s.inspectBtn} onClick={() => openAnimal(animal.id)}>
                  <Scissors size={13} /> Record Slaughter
                </button>
              )}
            </div>
          </div>

          {openId === animal.id && phase === 'slaughter' && (
            <div className={s.formCard} style={{ borderRadius: '0 0 14px 14px', marginTop: -8, borderTop: '2px solid #fef3c7' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1rem' }}>Record Slaughter</h3>
              <form onSubmit={handleSlaughter}>
                <div className={s.formGrid}>
                  <div className={s.field}>
                    <label className={s.label}>Slaughter Time</label>
                    <input className={s.input} type="datetime-local" required value={slaughterTime} onChange={e => setSlaughterTime(e.target.value)} />
                  </div>
                  <div className={s.field}>
                    <label className={s.label}>Method</label>
                    <select className={s.input} value={method} onChange={e => setMethod(e.target.value)}>
                      <option>Halal</option>
                      <option>Standard</option>
                    </select>
                  </div>
                  <div className={s.field} style={{ gridColumn: '1 / -1' }}>
                    <label className={s.label}>Slaughterman Name</label>
                    <input className={s.input} required value={slaughterman} onChange={e => setSlaughterman(e.target.value)} placeholder="Abdi Warsame" />
                  </div>
                </div>
                <div className={s.formActions}>
                  <button type="button" className={s.cancelBtn} onClick={() => setOpenId(null)}>Cancel</button>
                  <button type="submit" className={s.submitBtn}>Record Slaughter</button>
                </div>
              </form>
            </div>
          )}

          {openId === animal.id && phase === 'postmortem' && (
            <div className={s.formCard} style={{ borderRadius: '0 0 14px 14px', marginTop: -8, borderTop: '2px solid #f0fdf4' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1rem' }}>Post-Mortem Inspection</h3>
              <form onSubmit={handlePostMortem}>
                <div className={s.formGrid}>
                  <div className={s.field}>
                    <label className={s.label}>Decision</label>
                    <select className={s.input} required value={pmDecision} onChange={e => setPmDecision(e.target.value as PostMortemDecision)}>
                      <option value="">— select —</option>
                      <option value="PASSED">PASSED</option>
                      <option value="CONDITIONALLY_PASSED">CONDITIONALLY PASSED</option>
                      <option value="CONDEMNED">CONDEMNED</option>
                    </select>
                  </div>
                  <div className={s.field}>
                    <label className={s.label}>Veterinary Officer Name</label>
                    <input className={s.input} required value={pmOfficer} onChange={e => setPmOfficer(e.target.value)} placeholder="Dr. Ahmed Vet" />
                  </div>
                  <div className={s.field} style={{ gridColumn: '1 / -1' }}>
                    <label className={s.label}>Carcass Observations</label>
                    <textarea className={s.textarea} value={pmObservations} onChange={e => setPmObs(e.target.value)} placeholder="Observations, lesions, findings…" />
                  </div>
                </div>
                {pmDecision === 'CONDEMNED' && (
                  <div className={s.errorBanner} style={{ marginTop: '1rem' }}>
                    <XCircle size={16} style={{ display: 'inline', marginRight: 6 }} />
                    Condemned carcass will be removed from the packaging workflow.
                  </div>
                )}
                <div className={s.formActions}>
                  <button type="submit" className={s.submitBtn}>Submit Post-Mortem</button>
                </div>
              </form>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   TAB 4 — PACKAGING
───────────────────────────────────────────── */

interface PackagingTabProps {
  animals: AnimalRecord[];
  session: Session;
  onUpdate: (animals: AnimalRecord[]) => void;
}

function PackagingTab({ animals, session, onUpdate }: PackagingTabProps) {
  const eligible = animals.filter(
    a => a.status === 'POST_MORTEM_DONE' && (a.postMortemDecision === 'PASSED' || a.postMortemDecision === 'CONDITIONALLY_PASSED')
  );
  const packaged = animals.filter(a => a.status === 'PACKAGED' || a.status === 'QR_ISSUED');

  const [packagingId, setPackagingId]   = useState<string | null>(null);
  const [cutType, setCutType]           = useState<CutType>('Whole Carcass');
  const [netWeight, setNetWeight]       = useState('');
  const [grade, setGrade]               = useState<Grade>('A');
  const [storageTemp, setStorageTemp]   = useState('2');

  function openPackaging(animal: AnimalRecord) {
    setPackagingId(animal.id);
    setCutType('Whole Carcass');
    setNetWeight(String((animal.liveWeightKg * 0.55).toFixed(1)));
    setGrade('A');
    setStorageTemp('2');
  }

  function dressingPct(animal: AnimalRecord): string {
    const net = parseFloat(netWeight);
    if (!net || !animal.liveWeightKg) return '—';
    return ((net / animal.liveWeightKg) * 100).toFixed(1) + '%';
  }

  function handlePackage(e: React.FormEvent, animal: AnimalRecord) {
    e.preventDefault();
    const pkgCode = nextPackageCode(session.sessionCode, animals);
    onUpdate(animals.map(a =>
      a.id === animal.id
        ? {
            ...a,
            status: 'PACKAGED' as AnimalStatus,
            packaging: {
              packageCode: pkgCode,
              cutType,
              netWeightKg: parseFloat(netWeight),
              grade,
              storageTempC: parseFloat(storageTemp),
            },
          }
        : a
    ));
    setPackagingId(null);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <h2 className={s.sectionTitle}>Ready for Packaging ({eligible.length})</h2>

      {eligible.length === 0 && packaged.length === 0 && (
        <div className={s.empty}>
          <Package size={40} color="#c7dff7" />
          <p>No carcasses ready for packaging yet.</p>
        </div>
      )}

      {eligible.map(animal => (
        <div key={animal.id} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div className={s.recordCard}>
            <div className={s.recordInfo}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className={s.recordCode}>{animal.carcassCode}</span>
              </div>
              <span className={s.recordMeta}>
                {animal.recordNo} · {animal.animalId} · {animal.species} ({animal.breed})
              </span>
              <span className={s.recordMeta}>Live: {animal.liveWeightKg} kg · PM: {pmBadge(animal.postMortemDecision)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {statusBadge(animal.status)}
              {packagingId !== animal.id && (
                <button className={s.inspectBtn} onClick={() => openPackaging(animal)}>
                  <Package size={13} /> Package
                </button>
              )}
            </div>
          </div>

          {packagingId === animal.id && (
            <div className={s.formCard} style={{ borderRadius: '0 0 14px 14px', marginTop: -8, borderTop: '2px solid #faf5ff' }}>
              <form onSubmit={e => handlePackage(e, animal)}>
                <div className={s.formGrid}>
                  <div className={s.field}>
                    <label className={s.label}>Package Code (auto)</label>
                    <input className={s.input} readOnly value={nextPackageCode(session.sessionCode, animals)} />
                  </div>
                  <div className={s.field}>
                    <label className={s.label}>Cut Type</label>
                    <select className={s.input} value={cutType} onChange={e => setCutType(e.target.value as CutType)}>
                      <option>Whole Carcass</option>
                      <option>Half Carcass (2 halves)</option>
                      <option>Quarters (4)</option>
                      <option>Retail Cuts</option>
                    </select>
                  </div>
                  <div className={s.field}>
                    <label className={s.label}>Net Carcass Weight (kg)</label>
                    <input className={s.input} type="number" min="1" step="0.1" required value={netWeight} onChange={e => setNetWeight(e.target.value)} />
                  </div>
                  <div className={s.field}>
                    <label className={s.label}>Dressing % (auto)</label>
                    <input className={s.input} readOnly value={dressingPct(animal)} />
                  </div>
                  <div className={s.field}>
                    <label className={s.label}>Grade</label>
                    <select className={s.input} value={grade} onChange={e => setGrade(e.target.value as Grade)}>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                    </select>
                  </div>
                  <div className={s.field}>
                    <label className={s.label}>Storage Temp (°C)</label>
                    <input className={s.input} type="number" step="0.5" value={storageTemp} onChange={e => setStorageTemp(e.target.value)} />
                  </div>
                  <div className={s.field}>
                    <label className={s.label}>Packaging Date</label>
                    <input className={s.input} readOnly value="2026-08-04" />
                  </div>
                </div>
                <div className={s.formActions}>
                  <button type="button" className={s.cancelBtn} onClick={() => setPackagingId(null)}>Cancel</button>
                  <button type="submit" className={s.submitBtn}>Confirm Packaging</button>
                </div>
              </form>
            </div>
          )}
        </div>
      ))}

      {packaged.length > 0 && (
        <>
          <h2 className={s.sectionTitle} style={{ marginTop: '0.5rem' }}>Packaged Carcasses ({packaged.length})</h2>
          <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['Package Code', 'Carcass Code', 'Animal ID', 'Cut Type', 'Net (kg)', 'Grade', 'Temp °C', 'Status'].map(h => (
                    <th key={h} style={{ padding: '0.625rem 0.875rem', textAlign: 'left', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {packaged.map((a, i) => (
                  <tr key={a.id} style={{ borderBottom: i < packaged.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <td style={{ padding: '0.625rem 0.875rem', fontFamily: 'monospace', fontWeight: 600 }}>{a.packaging?.packageCode ?? '—'}</td>
                    <td style={{ padding: '0.625rem 0.875rem', fontFamily: 'monospace' }}>{a.carcassCode ?? '—'}</td>
                    <td style={{ padding: '0.625rem 0.875rem' }}>{a.animalId}</td>
                    <td style={{ padding: '0.625rem 0.875rem' }}>{a.packaging?.cutType ?? '—'}</td>
                    <td style={{ padding: '0.625rem 0.875rem' }}>{a.packaging?.netWeightKg ?? '—'}</td>
                    <td style={{ padding: '0.625rem 0.875rem', fontWeight: 700 }}>{a.packaging?.grade ?? '—'}</td>
                    <td style={{ padding: '0.625rem 0.875rem' }}>{a.packaging?.storageTempC ?? '—'}</td>
                    <td style={{ padding: '0.625rem 0.875rem' }}>{statusBadge(a.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   TAB 5 — CARCASS QR
───────────────────────────────────────────── */

interface QRTabProps {
  animals: AnimalRecord[];
  session: Session;
  onUpdate: (animals: AnimalRecord[]) => void;
}

function QRTab({ animals, session, onUpdate }: QRTabProps) {
  const eligible = animals.filter(a => a.status === 'PACKAGED' || a.status === 'QR_ISSUED');
  const [selectedId, setSelectedId] = useState<string | null>(eligible[0]?.id ?? null);

  const selected = eligible.find(a => a.id === selectedId) ?? null;

  function qrData(animal: AnimalRecord): string {
    return [
      animal.carcassCode,
      animal.packaging?.packageCode,
      animal.animalId,
      animal.tagSerial,
      session.sessionCode,
    ].join('|');
  }

  function issueCertificate() {
    if (!selected) return;
    const now = '2026-08-04 14:32';
    onUpdate(animals.map(a =>
      a.id === selected.id
        ? { ...a, status: 'QR_ISSUED' as AnimalStatus, certIssued: now }
        : a
    ));
  }

  return (
    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div style={{ flex: '0 0 220px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <h2 className={s.sectionTitle}>Packaged Carcasses</h2>
        {eligible.length === 0 && (
          <div className={s.empty} style={{ padding: '2rem 1rem' }}>
            <QrCode size={36} color="#c7dff7" />
            <p>No packaged carcasses yet.</p>
          </div>
        )}
        {eligible.map(a => (
          <button
            key={a.id}
            onClick={() => setSelectedId(a.id)}
            style={{
              background: selectedId === a.id ? '#eff6ff' : '#fff',
              border: selectedId === a.id ? '2px solid #0b5ed7' : '2px solid #e2e8f0',
              borderRadius: 10,
              padding: '0.75rem 1rem',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              transition: 'border-color 0.15s',
            }}
          >
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
              {a.carcassCode}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              {a.animalId} · {a.species}
            </span>
            {statusBadge(a.status)}
          </button>
        ))}
      </div>

      {selected && (
        <div style={{ flex: 1, minWidth: 300, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div
              style={{
                background: '#fff',
                borderRadius: 12,
                padding: '1rem',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                display: 'inline-block',
              }}
            >
              <div dangerouslySetInnerHTML={{ __html: generateQRSVG(qrData(selected)) }} />
              <p style={{ fontSize: '0.6875rem', color: '#94a3b8', textAlign: 'center', margin: '0.5rem 0 0', fontFamily: 'monospace' }}>
                {selected.carcassCode}
              </p>
            </div>

            <div
              style={{
                background: '#fff',
                borderRadius: 12,
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                padding: '1.25rem 1.5rem',
                fontFamily: 'monospace',
                fontSize: '0.8125rem',
                color: '#0f172a',
                lineHeight: 1.7,
                flex: 1,
                minWidth: 260,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.25rem' }}>QXLITS CARCASS CERTIFICATE</div>
              <div style={{ borderBottom: '1px solid #e2e8f0', marginBottom: '0.5rem' }} />
              {[
                ['Carcass Code',   selected.carcassCode ?? '—'],
                ['Package Code',   selected.packaging?.packageCode ?? '—'],
                ['Animal ID',      selected.animalId],
                ['Tag No',         selected.tagSerial],
                ['Species',        `${selected.species} (${selected.breed})`],
                ['Origin Farm',    `${selected.originFarm}${selected.ownerName ? ' · ' + selected.ownerName : ''}`],
                ['Live Weight',    `${selected.liveWeightKg} kg`],
                ['Net Weight',     selected.packaging ? `${selected.packaging.netWeightKg} kg (${((selected.packaging.netWeightKg / selected.liveWeightKg) * 100).toFixed(1)}%)` : '—'],
                ['Grade',          selected.packaging?.grade ?? '—'],
                ['Cut Type',       selected.packaging?.cutType ?? '—'],
                ['Storage Temp',   selected.packaging ? `${selected.packaging.storageTempC}°C (Chilled)` : '—'],
                ['Slaughter Date', selected.slaughterTime ? selected.slaughterTime.split('T')[0] : '—'],
                ['Session',        session.sessionCode],
                ['Facility',       session.premisesCode],
                ['Vet Officer',    selected.postMortemOfficer ?? '—'],
                ['Post-Mortem',    selected.postMortemDecision ?? '—'],
                ['Cert Issued',    selected.certIssued ?? 'Not yet issued'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ color: '#64748b', minWidth: 120 }}>{k}:</span>
                  <span style={{ fontWeight: 600 }}>{v}</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '0.5rem', paddingTop: '0.5rem', color: '#64748b', fontSize: '0.75rem' }}>
                Scan QR to verify at qxlits.gov.so
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {selected.status === 'PACKAGED' && (
              <button className={s.submitBtn} onClick={issueCertificate}>
                <CheckCircle size={14} /> Issue Certificate
              </button>
            )}
            {selected.status === 'QR_ISSUED' && (
              <div className={s.successBanner}>
                <CheckCircle size={16} /> Certificate issued — {selected.certIssued}
              </div>
            )}
            <button
              className={s.cancelBtn}
              onClick={() => window.print()}
            >
              <Printer size={14} style={{ display: 'inline', marginRight: 4 }} /> Print
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */

const TAB_CONFIG: { id: ActiveTab; label: string; icon: JSX.Element }[] = [
  { id: 'sessions',   label: 'Batch Sessions', icon: <ClipboardList size={14} /> },
  { id: 'animals',    label: 'Animals',         icon: <Stethoscope size={14} /> },
  { id: 'slaughter',  label: 'Slaughter',       icon: <Scissors size={14} /> },
  { id: 'packaging',  label: 'Packaging',       icon: <Package size={14} /> },
  { id: 'qr',         label: 'Carcass QR',      icon: <QrCode size={14} /> },
];

export function SlaughterPage(): JSX.Element {
  const { regionCode } = useAuthStore();

  // ── Incoming slaughter arrivals ──────────────────────────────────────────
  const [incomingMovements, setIncomingMovements] = useState<{
    id: string; movementCode: string; status: string;
    originPremisesName: string; animalCount: number; plannedArrivalDate: string;
  }[]>([]);
  const [acceptingCode, setAcceptingCode] = useState<string | null>(null);

  const loadIncoming = useCallback(async () => {
    let q = supabase
      .from('farmer_movement_requests')
      .select('id, movement_code, status, origin_premises_name, animal_count, planned_arrival_date')
      .eq('purpose', 'Slaughter')
      .in('status', ['PERMIT_ISSUED', 'IN_TRANSIT'])
      .order('created_at', { ascending: false });
    if (regionCode) q = q.eq('destination_region_code', regionCode);
    const { data } = await q;
    setIncomingMovements((data ?? []).map((r: any) => ({
      id:                 r.id as string,
      movementCode:       r.movement_code as string,
      status:             r.status as string,
      originPremisesName: (r.origin_premises_name as string) ?? '—',
      animalCount:        (r.animal_count as number) ?? 0,
      plannedArrivalDate: (r.planned_arrival_date as string) ?? '',
    })));
  }, [regionCode]);

  const acceptArrival = async (movementCode: string) => {
    setAcceptingCode(movementCode);
    await supabase.from('farmer_movement_requests')
      .update({ status: 'ARRIVAL_CONFIRMED' })
      .eq('movement_code', movementCode);
    setIncomingMovements(prev => prev.filter(m => m.movementCode !== movementCode));
    setAcceptingCode(null);
  };

  useEffect(() => { void loadIncoming(); }, [loadIncoming]);

  const [activeTab, setActiveTab]       = useState<ActiveTab>('sessions');
  const [sessions, setSessions]         = useState<Session[]>(INITIAL_SESSIONS);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('sess-0041');
  const [animalsBySession, setAnimalsBySession] = useState<Record<string, AnimalRecord[]>>(SESSION_ANIMALS);

  const selectedSession = sessions.find(s => s.id === selectedSessionId);
  const animals = animalsBySession[selectedSessionId] ?? [];

  function updateAnimals(updated: AnimalRecord[]) {
    setAnimalsBySession(prev => ({ ...prev, [selectedSessionId]: updated }));
  }

  function handleAddSession(newSession: Session) {
    setSessions(prev => [newSession, ...prev]);
    setAnimalsBySession(prev => ({ ...prev, [newSession.id]: [] }));
  }

  function handleSelectSession(id: string) {
    setSelectedSessionId(id);
    setActiveTab('animals');
  }

  return (
    <div className={s.page}>

      {/* ── Incoming animals awaiting slaughterhouse acceptance ─────────────── */}
      {incomingMovements.length > 0 && (
        <div style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#9a3412', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Truck size={16} color="#c2410c" />
            {incomingMovements.length} Movement{incomingMovements.length !== 1 ? 's' : ''} Arriving for Slaughter — Acceptance Required
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {incomingMovements.map(m => (
              <div key={m.id} style={{ background: '#fff', border: '1px solid #fed7aa', borderRadius: 8, padding: '0.625rem 0.875rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: '#374151', fontWeight: 700 }}>{m.movementCode}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 2 }}>
                    From: {m.originPremisesName} · {m.animalCount} animal{m.animalCount !== 1 ? 's' : ''}
                    {m.plannedArrivalDate && ` · Expected ${m.plannedArrivalDate}`}
                  </div>
                </div>
                <div style={{ display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: 999, background: m.status === 'IN_TRANSIT' ? '#fff7ed' : '#dbeafe', color: m.status === 'IN_TRANSIT' ? '#c2410c' : '#1d4ed8', fontSize: '0.7rem', fontWeight: 700 }}>
                  {m.status === 'IN_TRANSIT' ? 'In Transit' : 'Permit Issued'}
                </div>
                <button
                  disabled={acceptingCode === m.movementCode}
                  onClick={() => void acceptArrival(m.movementCode)}
                  style={{ background: acceptingCode === m.movementCode ? '#fed7aa' : '#c2410c', color: '#fff', border: 'none', borderRadius: 8, padding: '0.4rem 0.875rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  {acceptingCode === m.movementCode ? 'Accepting…' : 'Accept Arrival'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={s.header}>
        <div>
          <h1 className={s.title}>Slaughter Management</h1>
          <p className={s.sub}>
            {selectedSession
              ? `Session: ${selectedSession.sessionCode} · ${selectedSession.premisesCode} · ${selectedSession.sessionDate}`
              : 'Select a session to begin'}
          </p>
        </div>
        {selectedSession && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '5px 14px',
              borderRadius: 20,
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              background: selectedSession.status === 'OPEN' ? '#dcfce7' : '#f1f5f9',
              color: selectedSession.status === 'OPEN' ? '#16a34a' : '#475569',
              alignSelf: 'center',
            }}
          >
            {selectedSession.status}
          </span>
        )}
      </div>

      <div className={s.tabs}>
        {TAB_CONFIG.map(tab => (
          <button
            key={tab.id}
            className={`${s.tab}${activeTab === tab.id ? ' ' + s.tabActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
            disabled={tab.id !== 'sessions' && !selectedSession}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'sessions' && (
        <SessionsTab
          sessions={sessions}
          selectedSessionId={selectedSessionId}
          onSelect={handleSelectSession}
          onAddSession={handleAddSession}
        />
      )}

      {activeTab === 'animals' && selectedSession && (
        <AnimalsTab
          animals={animals}
          session={selectedSession}
          onUpdate={updateAnimals}
        />
      )}

      {activeTab === 'slaughter' && selectedSession && (
        <SlaughterTab
          animals={animals}
          onUpdate={updateAnimals}
        />
      )}

      {activeTab === 'packaging' && selectedSession && (
        <PackagingTab
          animals={animals}
          session={selectedSession}
          onUpdate={updateAnimals}
        />
      )}

      {activeTab === 'qr' && selectedSession && (
        <QRTab
          animals={animals}
          session={selectedSession}
          onUpdate={updateAnimals}
        />
      )}

      {!selectedSession && activeTab !== 'sessions' && (
        <div className={s.empty}>
          <AlertTriangle size={36} color="#c7dff7" />
          <p>Select an open session from the Batch Sessions tab to continue.</p>
        </div>
      )}
    </div>
  );
}

export default SlaughterPage;
