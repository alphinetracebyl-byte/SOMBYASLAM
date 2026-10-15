import { useState } from 'react';
import { Tag, CheckCircle, Clock, Users, Beef, Scan } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { getBadge } from '@/utils/statusBadge';
import s from './herds-field.module.css';

type BatchStatus = 'APPROVED' | 'TAGGED';
type TagType = 'RFID' | 'EAR_TAG';
type TagColor = 'yellow' | 'orange' | 'green' | 'blue' | 'red';

interface BatchAnimal {
  id: string; seq: number; sex: 'M' | 'F'; ageMonths: number; weightKg: number; features: string;
  animalId: string; tagSerial: string; tagType: TagType; tagColor: TagColor;
  tagStatus: 'UNTAGGED' | 'TAGGED';
  scannedSerial?: string;
}

interface HerdBatch {
  id: string; batchCode: string; batchName: string;
  premisesCode: string; ownerName: string;
  species: string; breed: string; count: number; purpose: string;
  status: BatchStatus; region: string; approvedAt: string;
  animals: BatchAnimal[];
}

const FIELD_BATCHES: HerdBatch[] = [
  {
    id: 'b1', batchCode: 'HRD-2026-MOG-001', batchName: 'Daynile Zebu Herd — Aug 2026',
    premisesCode: 'SOM-MOG-004', ownerName: 'Ahmed Hassan Warsame',
    species: 'Cattle', breed: 'Somali Zebu', count: 6, purpose: 'Export',
    status: 'TAGGED', region: 'Banaadir', approvedAt: '2026-07-20',
    animals: [
      { id: 'ba1', seq: 1, sex: 'M', ageMonths: 36, weightKg: 280, features: 'White patch on left ear', animalId: 'SOB-2026-0441', tagSerial: 'RFID-2026-00441', tagType: 'RFID', tagColor: 'yellow', tagStatus: 'TAGGED' },
      { id: 'ba2', seq: 2, sex: 'M', ageMonths: 42, weightKg: 310, features: 'Brown coat',              animalId: 'SOB-2026-0442', tagSerial: 'RFID-2026-00442', tagType: 'RFID', tagColor: 'yellow', tagStatus: 'TAGGED' },
      { id: 'ba3', seq: 3, sex: 'F', ageMonths: 28, weightKg: 245, features: 'Black face',              animalId: 'SOB-2026-0443', tagSerial: 'RFID-2026-00443', tagType: 'RFID', tagColor: 'yellow', tagStatus: 'TAGGED' },
      { id: 'ba4', seq: 4, sex: 'M', ageMonths: 30, weightKg: 265, features: '',                        animalId: 'SOB-2026-0444', tagSerial: 'RFID-2026-00444', tagType: 'RFID', tagColor: 'yellow', tagStatus: 'TAGGED' },
      { id: 'ba5', seq: 5, sex: 'F', ageMonths: 24, weightKg: 220, features: 'Spotted',                 animalId: 'SOB-2026-0445', tagSerial: 'RFID-2026-00445', tagType: 'RFID', tagColor: 'yellow', tagStatus: 'TAGGED' },
      { id: 'ba6', seq: 6, sex: 'M', ageMonths: 48, weightKg: 340, features: 'Large hump',              animalId: 'SOB-2026-0446', tagSerial: 'RFID-2026-00446', tagType: 'RFID', tagColor: 'yellow', tagStatus: 'TAGGED' },
    ],
  },
  {
    id: 'b2', batchCode: 'HRD-2026-BAY-002', batchName: 'Baidoa Sheep Flock',
    premisesCode: 'SOM-BAY-011', ownerName: 'Faadumo Abdullahi Said',
    species: 'Sheep', breed: 'Somali Blackhead', count: 4, purpose: 'Sale',
    status: 'APPROVED', region: 'Bay', approvedAt: '2026-08-01',
    animals: [
      { id: 'bb1', seq: 1, sex: 'M', ageMonths: 18, weightKg: 36, features: '',              animalId: 'SOS-2026-0201', tagSerial: 'EAR-2026-00201', tagType: 'EAR_TAG', tagColor: 'yellow', tagStatus: 'UNTAGGED' },
      { id: 'bb2', seq: 2, sex: 'M', ageMonths: 20, weightKg: 38, features: 'Black legs',    animalId: 'SOS-2026-0202', tagSerial: 'EAR-2026-00202', tagType: 'EAR_TAG', tagColor: 'yellow', tagStatus: 'UNTAGGED' },
      { id: 'bb3', seq: 3, sex: 'F', ageMonths: 16, weightKg: 30, features: '',              animalId: 'SOS-2026-0203', tagSerial: 'EAR-2026-00203', tagType: 'EAR_TAG', tagColor: 'yellow', tagStatus: 'UNTAGGED' },
      { id: 'bb4', seq: 4, sex: 'F', ageMonths: 15, weightKg: 28, features: 'White blaze',  animalId: 'SOS-2026-0204', tagSerial: 'EAR-2026-00204', tagType: 'EAR_TAG', tagColor: 'yellow', tagStatus: 'UNTAGGED' },
    ],
  },
];

/* ── Tag SVG Components ─────────────────────────────────── */

type RFIDProps = { animalId: string; serial: string; color: TagColor; seq: number };
function RFIDTag({ animalId, serial, color, seq }: RFIDProps) {
  const fills: Record<TagColor, { body: string; stroke: string; text: string; sub: string }> = {
    yellow: { body: '#eab308', stroke: '#713f12', text: '#1c1917', sub: '#422006' },
    orange: { body: '#fed7aa', stroke: '#f97316', text: '#7c2d12', sub: '#9a3412' },
    green:  { body: '#bbf7d0', stroke: '#16a34a', text: '#14532d', sub: '#166534' },
    blue:   { body: '#bfdbfe', stroke: '#3b82f6', text: '#1e3a8a', sub: '#1e40af' },
    red:    { body: '#fecaca', stroke: '#ef4444', text: '#7f1d1d', sub: '#991b1b' },
  };
  const c = fills[color] || fills.yellow;
  const num = String(seq).padStart(4, '0');
  return (
    <svg width="90" height="102" viewBox="0 0 90 102" style={{ display: 'block' }}>
      {/* Top hole nub */}
      <rect x="33" y="2" width="24" height="20" rx="6" fill={c.body} stroke={c.stroke} strokeWidth="2" />
      <circle cx="45" cy="12" r="5" fill="#e5e7eb" stroke={c.stroke} strokeWidth="1.5" />
      <circle cx="45" cy="12" r="2.5" fill="white" />
      {/* Main body */}
      <rect x="2" y="16" width="86" height="84" rx="14" fill={c.body} stroke={c.stroke} strokeWidth="2" />
      {/* Inner panel groove */}
      <rect x="11" y="25" width="68" height="66" rx="9" fill="none" stroke={c.stroke} strokeWidth="1" opacity="0.35" />
      {/* Embedded chip indicator — top-left of inner panel */}
      <rect x="15" y="29" width="16" height="12" rx="2" fill="rgba(0,0,0,0.3)" />
      <rect x="17" y="31" width="12" height="8" rx="1" fill="#1e293b" />
      <line x1="13" y1="32" x2="15" y2="32" stroke={c.sub} strokeWidth="1" />
      <line x1="13" y1="37" x2="15" y2="37" stroke={c.sub} strokeWidth="1" />
      <line x1="31" y1="32" x2="33" y2="32" stroke={c.sub} strokeWidth="1" />
      <line x1="31" y1="37" x2="33" y2="37" stroke={c.sub} strokeWidth="1" />
      {/* RFID wave arcs — top-right of inner panel */}
      <path d="M62,30 Q66,35 62,40" fill="none" stroke={c.sub} strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
      <path d="M66,27 Q73,35 66,43" fill="none" stroke={c.sub} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <path d="M70,24 Q80,35 70,46" fill="none" stroke={c.sub} strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
      {/* Sequence number */}
      <text x="45" y="70" fontSize="26" fill={c.text} fontFamily="monospace" fontWeight="bold" textAnchor="middle">{num}</text>
      {/* Animal ID */}
      <text x="45" y="84" fontSize="6.5" fill={c.sub} fontFamily="monospace" textAnchor="middle">{animalId.length > 14 ? animalId.slice(-14) : animalId}</text>
      {/* Footer */}
      <text x="45" y="93" fontSize="5" fill={c.sub} fontFamily="monospace" textAnchor="middle">RFID · ISO 11784 · QXLITS</text>
    </svg>
  );
}

type EarTagProps = { animalId: string; serial: string; color: TagColor; seq: number };
function EarTag({ animalId, serial, color, seq }: EarTagProps) {
  const fills: Record<TagColor, { body: string; stroke: string; text: string; num: string }> = {
    yellow: { body: '#eab308', stroke: '#713f12', text: '#1c1917', num: '#422006' },
    orange: { body: '#fed7aa', stroke: '#f97316', text: '#7c2d12', num: '#9a3412' },
    green:  { body: '#bbf7d0', stroke: '#16a34a', text: '#14532d', num: '#166534' },
    blue:   { body: '#bfdbfe', stroke: '#3b82f6', text: '#1e3a8a', num: '#1e40af' },
    red:    { body: '#fecaca', stroke: '#ef4444', text: '#7f1d1d', num: '#991b1b' },
  };
  const c = fills[color] || fills.yellow;
  const num = String(seq).padStart(4, '0');
  return (
    <svg width="90" height="102" viewBox="0 0 90 102" style={{ display: 'block' }}>
      {/* Top hole nub */}
      <rect x="33" y="2" width="24" height="20" rx="6" fill={c.body} stroke={c.stroke} strokeWidth="2" />
      <circle cx="45" cy="12" r="5" fill="#e5e7eb" stroke={c.stroke} strokeWidth="1.5" />
      <circle cx="45" cy="12" r="2.5" fill="white" />
      {/* Main body */}
      <rect x="2" y="16" width="86" height="84" rx="14" fill={c.body} stroke={c.stroke} strokeWidth="2" />
      {/* Inner panel groove */}
      <rect x="11" y="25" width="68" height="66" rx="9" fill="none" stroke={c.stroke} strokeWidth="1" opacity="0.35" />
      {/* Sequence number */}
      <text x="45" y="72" fontSize="26" fill={c.num} fontFamily="monospace" fontWeight="bold" textAnchor="middle">{num}</text>
      {/* Animal ID */}
      <text x="45" y="86" fontSize="6.5" fill={c.text} fontFamily="monospace" textAnchor="middle">{animalId.length > 14 ? animalId.slice(-14) : animalId}</text>
      {/* QXLITS */}
      <text x="45" y="95" fontSize="5.5" fill={c.text} fontFamily="monospace" textAnchor="middle">QXLITS · SO</text>
    </svg>
  );
}

function UnassignedTag() {
  return (
    <svg width="80" height="60" viewBox="0 0 80 60" style={{ display: 'block' }}>
      <rect x="2" y="2" width="76" height="56" rx="8" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 3" />
      <text x="40" y="26" fontSize="9" fill="#94a3b8" fontFamily="sans-serif" textAnchor="middle">No Tag</text>
      <text x="40" y="38" fontSize="7" fill="#cbd5e1" fontFamily="monospace" textAnchor="middle">PENDING</text>
    </svg>
  );
}

/* ── Main Page ──────────────────────────────────────────── */

const SPECIES_EMOJI: Record<string, string> = { Cattle: '🐄', Camel: '🐪', Goat: '🐐', Sheep: '🐑' };

export function HerdBatchFieldPage(): JSX.Element {
  useAuthStore();
  const [batches, setBatches] = useState<HerdBatch[]>(FIELD_BATCHES);
  const [selectedId, setSelectedId] = useState<string | null>('b2');
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [scanInput, setScanInput] = useState('');
  const [scanDone, setScanDone] = useState(false);

  const selected = batches.find(b => b.id === selectedId) ?? null;

  function simulateScan(animal: BatchAnimal) {
    setApplyingId(animal.id);
    setScanInput('');
    setScanDone(false);
  }

  function confirmTag(batchId: string, animalId: string) {
    setBatches(prev => prev.map(b => {
      if (b.id !== batchId) return b;
      const updatedAnimals = b.animals.map(a =>
        a.id === animalId ? { ...a, tagStatus: 'TAGGED' as const, scannedSerial: scanInput || a.tagSerial } : a
      );
      const allTagged = updatedAnimals.every(a => a.tagStatus === 'TAGGED');
      return { ...b, animals: updatedAnimals, status: allTagged ? 'TAGGED' : b.status };
    }));
    setApplyingId(null);
    setScanInput('');
    setScanDone(false);
  }

  const pending = batches.filter(b => b.status === 'APPROVED');
  const tagged  = batches.filter(b => b.status === 'TAGGED');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.25rem', alignItems: 'flex-start' }}>

      {/* Left panel */}
      <div className={s.leftPanel}>

        {/* KPIs */}
        <div className={s.kpiRow}>
          <div className={s.kpiChip}>
            <span className={s.kpiNum}>{batches.length}</span>
            <span className={s.kpiLbl}>Batches</span>
          </div>
          <div className={s.kpiChip}>
            <span className={s.kpiNum} style={{ color: '#d97706' }}>{pending.length}</span>
            <span className={s.kpiLbl}>Needs Tagging</span>
          </div>
          <div className={s.kpiChip}>
            <span className={s.kpiNum} style={{ color: '#7c3aed' }}>{tagged.length}</span>
            <span className={s.kpiLbl}>Tagged</span>
          </div>
        </div>

        {/* Needs attention banner */}
        {pending.length > 0 && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '0.75rem 1rem', fontSize: '0.8125rem', color: '#92400e', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag size={14} color="#d97706" />
            {pending.length} batch{pending.length > 1 ? 'es' : ''} awaiting tag application
          </div>
        )}

        {/* Batch list */}
        <div className={s.batchList}>
          {batches.map(batch => {
            const isSelected = batch.id === selectedId;
            const tagged = batch.animals.filter(a => a.tagStatus === 'TAGGED').length;
            return (
              <button
                key={batch.id}
                className={`${s.batchCard}${isSelected ? ' ' + s.batchCardActive : ''}`}
                onClick={() => setSelectedId(batch.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className={s.batchCode}>{batch.batchCode}</span>
                  {(() => { const b = getBadge(batch.status); return (
                    <span className={s.statusBadge} style={{ color: b.color, background: b.bg }}>
                      {batch.status === 'TAGGED' ? <Tag size={10} /> : <Clock size={10} />}
                      {b.label}
                    </span>
                  ); })()}
                </div>
                <span className={s.batchName}>{batch.batchName}</span>
                <span className={s.batchMeta}>
                  {SPECIES_EMOJI[batch.species]} {batch.species} · {batch.ownerName}
                </span>
                <span className={s.batchMeta}>
                  {tagged}/{batch.count} tagged · {batch.premisesCode}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right panel */}
      <div className={s.rightPanel}>
        {!selected ? (
          <div className={s.emptyState}>
            <Users size={44} color="#c7dff7" />
            <p>Select a batch to apply tags</p>
          </div>
        ) : (
          <>
            {/* Batch header */}
            <div className={s.batchHeader}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div className={s.batchTitle}>{selected.batchCode}</div>
                  <div className={s.batchSubtitle}>{selected.batchName}</div>
                </div>
                {(() => { const b = getBadge(selected.status); return (
                  <span className={s.statusBadge} style={{ padding: '5px 14px', fontSize: '0.75rem', color: b.color, background: b.bg }}>
                    {selected.status === 'TAGGED' ? <Tag size={13} /> : <Clock size={13} />}
                    {selected.status === 'TAGGED' ? 'All Tagged' : 'Tagging In Progress'}
                  </span>
                ); })()}
              </div>
              <div className={s.detailChips}>
                <span className={s.detailChip}>Owner: {selected.ownerName}</span>
                <span className={s.detailChip}>Premises: {selected.premisesCode}</span>
                <span className={s.detailChip}>{SPECIES_EMOJI[selected.species]} {selected.species} — {selected.breed}</span>
                <span className={s.detailChip}>Approved: {selected.approvedAt}</span>
              </div>

              {/* Progress bar */}
              {(() => {
                const done = selected.animals.filter(a => a.tagStatus === 'TAGGED').length;
                const pct = Math.round((done / selected.count) * 100);
                return (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.8125rem', color: '#64748b' }}>
                      <span>Tagging progress</span>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{done} / {selected.count} ({pct}%)</span>
                    </div>
                    <div style={{ height: 8, background: '#e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#7c3aed' : '#0b5ed7', borderRadius: 8, transition: 'width 0.3s' }} />
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* All Tagged banner */}
            {selected.status === 'TAGGED' && (
              <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 10, padding: '0.875rem 1.125rem', display: 'flex', alignItems: 'center', gap: 10, color: '#5b21b6', fontSize: '0.875rem', fontWeight: 600 }}>
                <CheckCircle size={16} color="#7c3aed" />
                All {selected.count} animals in this batch have been tagged. National IDs are active.
              </div>
            )}

            {/* Animal grid */}
            <div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.875rem' }}>
                Animals — {selected.batchName}
              </div>
              <div className={s.animalGrid}>
                {selected.animals.map(animal => (
                  <div key={animal.id} className={s.animalCard}>
                    {/* Header row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                      <span className={s.animalSeq}>#{String(animal.seq).padStart(2, '0')}</span>
                      <span className={`${s.sexBadge} ${animal.sex === 'M' ? s.sexM : s.sexF}`}>{animal.sex === 'M' ? 'Male' : 'Female'}</span>
                    </div>
                    <span className={s.animalMeta}>{animal.ageMonths} mo · {animal.weightKg} kg</span>
                    {animal.features && <span className={s.animalMeta} style={{ fontStyle: 'italic' }}>{animal.features}</span>}

                    {/* Tag visual */}
                    <div style={{ margin: '0.5rem 0', display: 'flex', justifyContent: 'center' }}>
                      {animal.tagStatus === 'TAGGED' && animal.tagType === 'RFID' ? (
                        <RFIDTag animalId={animal.animalId} serial={animal.tagSerial} color={animal.tagColor} seq={animal.seq} />
                      ) : animal.tagStatus === 'TAGGED' && animal.tagType === 'EAR_TAG' ? (
                        <EarTag animalId={animal.animalId} serial={animal.tagSerial} color={animal.tagColor} seq={animal.seq} />
                      ) : (
                        <UnassignedTag />
                      )}
                    </div>

                    {/* IDs */}
                    <span className={s.animalIdText}>{animal.animalId}</span>
                    <span className={s.tagSerial}>{animal.tagSerial}</span>

                    {/* Tag application (UNTAGGED only) */}
                    {animal.tagStatus === 'UNTAGGED' && applyingId !== animal.id && (
                      <button
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 4, background: '#eff6ff', color: '#0b5ed7', border: '1px solid #bfdbfe', borderRadius: 7, padding: '5px 12px', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                        onClick={() => simulateScan(animal)}
                      >
                        <Scan size={13} /> Apply Tag
                      </button>
                    )}

                    {/* Inline scan/confirm form */}
                    {applyingId === animal.id && (
                      <div style={{ width: '100%', marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center' }}>
                          Scan or enter serial number:
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <input
                            style={{ flex: 1, height: 32, padding: '0 0.5rem', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.75rem', background: '#f8fafc', outline: 'none', fontFamily: 'monospace' }}
                            value={scanInput}
                            onChange={e => setScanInput(e.target.value)}
                            placeholder={animal.tagSerial}
                          />
                          <button
                            style={{ background: '#0b5ed7', color: '#fff', border: 'none', borderRadius: 6, padding: '0 8px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                            onClick={() => { setScanInput(animal.tagSerial); setScanDone(true); }}
                          >
                            <Scan size={12} />
                          </button>
                        </div>
                        {scanDone && (
                          <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 6, padding: '4px 8px', fontSize: '0.75rem', color: '#065f46', textAlign: 'center' }}>
                            ✓ Tag scanned: {scanInput}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            style={{ flex: 1, background: '#059669', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 0', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                            onClick={() => confirmTag(selected.id, animal.id)}
                          >
                            Confirm
                          </button>
                          <button
                            style={{ flex: 1, background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: 6, padding: '5px 0', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                            onClick={() => { setApplyingId(null); setScanInput(''); setScanDone(false); }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {animal.tagStatus === 'TAGGED' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                        <CheckCircle size={12} /> Tagged
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default HerdBatchFieldPage;
