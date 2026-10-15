import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, ChevronRight, Package, MapPin, Ruler, Tag, Layers } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth.store';
import {
  fetchBatches, fetchAnimalsByPremises,
  type MyAnimal, type AvailableBatch,
} from '@/features/animals/animals.supabase';
import s from './livestock.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Premises {
  id: string;
  premisesCode: string;
  premisesName: string;
  premisesType: string;
  status: string;
  regionCode: string;
  physicalAddress: string;
  areaHectares: number | null;
  capacityAnimals: number | null;
  licenseNumber: string | null;
  allowedSpecies: string | null;
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  createdAt: string;
}

type SelectedBatch =
  | { kind: 'batch';      batch: AvailableBatch }
  | { kind: 'ungrouped' };

type View =
  | { kind: 'premises' }
  | { kind: 'batches';  premises: Premises }
  | { kind: 'animals';  premises: Premises; selectedBatch: SelectedBatch };

// ── Constants ─────────────────────────────────────────────────────────────────

const SPECIES_EMOJI: Record<string, string> = {
  CATTLE: '🐄', CAMEL: '🐪', GOAT: '🐐', SHEEP: '🐑',
  Cattle: '🐄', Camel: '🐪', Goat:  '🐐', Sheep: '🐑',
};

const CARD_SPECIES = ['CATTLE', 'CAMEL', 'GOAT', 'SHEEP'] as const;

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  APPROVED:  { label: 'Approved',  color: '#16a34a' },
  SUBMITTED: { label: 'Submitted', color: '#0b5ed7' },
  DRAFT:     { label: 'Draft',     color: '#64748b' },
  REJECTED:  { label: 'Rejected',  color: '#dc2626' },
  SUSPENDED: { label: 'Suspended', color: '#d97706' },
  OPEN:      { label: 'Open',      color: '#0d9488' },
  CLOSED:    { label: 'Closed',    color: '#64748b' },
  ARCHIVED:  { label: 'Archived',  color: '#94a3b8' },
  ACTIVE:    { label: 'Active',    color: '#16a34a' },
  PENDING:   { label: 'Pending',   color: '#d97706' },
};

function fmtDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Tag SVG Components (ministry-style) ───────────────────────────────────────

function RFIDTag({ serial }: { serial?: string }) {
  return (
    <svg width="100" height="88" viewBox="0 0 110 100" style={{ display: 'block' }}>
      <rect x="40" y="2" width="30" height="18" rx="6" fill="#eab308" stroke="#713f12" strokeWidth="2" />
      <circle cx="55" cy="11" r="4.5" fill="#e5e7eb" stroke="#713f12" strokeWidth="1.5" />
      <circle cx="55" cy="11" r="2" fill="white" />
      <rect x="2" y="14" width="106" height="84" rx="14" fill="#eab308" stroke="#713f12" strokeWidth="2" />
      <rect x="10" y="22" width="90" height="68" rx="9" fill="none" stroke="#713f12" strokeWidth="1" opacity="0.35" />
      <rect x="14" y="27" width="18" height="13" rx="2" fill="rgba(0,0,0,0.3)" />
      <rect x="16" y="29" width="14" height="9" rx="1" fill="#1e293b" />
      <path d="M76,28 Q81,34 76,40" fill="none" stroke="#422006" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
      <path d="M81,25 Q89,34 81,43" fill="none" stroke="#422006" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <path d="M86,22 Q97,34 86,46" fill="none" stroke="#422006" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
      <text x="55" y="57" fontSize="6.5" fill="#422006" fontFamily="monospace" textAnchor="middle" letterSpacing="1.5">ID NUMBER</text>
      <text x="55" y="70" fontSize="10" fill="#1c1917" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
        {(serial ?? 'UNASSIGNED').slice(-10)}
      </text>
    </svg>
  );
}

function UnassignedTag() {
  return (
    <svg width="100" height="88" viewBox="0 0 110 100" style={{ display: 'block' }}>
      <rect x="40" y="2" width="30" height="18" rx="6" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
      <circle cx="55" cy="11" r="4.5" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.5" />
      <circle cx="55" cy="11" r="2" fill="white" />
      <rect x="2" y="14" width="106" height="84" rx="14" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="6 3" />
      <text x="55" y="57" fontSize="6" fill="#94a3b8" fontFamily="monospace" textAnchor="middle" letterSpacing="1">ID NUMBER</text>
      <text x="55" y="70" fontSize="8" fill="#cbd5e1" fontFamily="monospace" fontWeight="bold" textAnchor="middle">NOT ASSIGNED</text>
    </svg>
  );
}

// ── Animal Card (ministry-style) ───────────────────────────────────────────────

function AnimalCard({ animal, seq, onClick }: { animal: MyAnimal; seq: number; onClick: () => void }) {
  const tagged = animal.tagStatus === 'TAGGED';
  const cfg    = STATUS_CFG[animal.status] ?? { label: animal.status, color: '#64748b' };

  return (
    <div className={s.animalCard} onClick={onClick}>
      <div className={s.animalCardSeqRow}>
        <span className={s.animalSeqBadge}>#{seq}</span>
        <span className={`${s.animalSexBadge} ${animal.sex === 'M' || animal.sex === 'MALE' ? s.sexM : s.sexF}`}>
          {animal.sex === 'M' || animal.sex === 'MALE' ? 'Male' : 'Female'}
        </span>
      </div>

      <div className={s.animalCardTagWrap}>
        {tagged ? <RFIDTag serial={animal.tagSerial ?? undefined} /> : <UnassignedTag />}
      </div>

      <div className={s.animalCardInfo}>
        <span className={s.animalCardCode}>{animal.animalCode}</span>
        <span className={s.animalCardBreed}>{animal.breed}</span>
        <span className={s.animalCardMeta}>
          {animal.ageMonths != null ? `${animal.ageMonths}m` : '—'}
          {animal.weightKg  != null ? ` · ${animal.weightKg}kg` : ''}
        </span>
      </div>

      <span className={s.animalCardStatus} style={{ background: cfg.color }}>
        {cfg.label}
      </span>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LivestockPage(): JSX.Element {
  const { userId } = useAuthStore();
  const navigate   = useNavigate();

  // Premises level
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [premises,      setPremises]      = useState<Premises[]>([]);
  const [animalCounts,  setAnimalCounts]  = useState<Record<string, number>>({});
  const [speciesCounts, setSpeciesCounts] = useState<Record<string, Record<string, number>>>({});
  const [batchCounts,   setBatchCounts]   = useState<Record<string, number>>({});

  // Batches level
  const [batchLoading,    setBatchLoading]    = useState(false);
  const [batches,         setBatches]         = useState<AvailableBatch[]>([]);
  const [premisesAnimals, setPremisesAnimals] = useState<MyAnimal[]>([]);

  const [view, setView] = useState<View>({ kind: 'premises' });

  // ── Load premises + animal counts ──────────────────────────────────────────

  const loadPremises = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const { data: fp, error: fpErr } = await supabase
        .from('farmer_premises')
        .select(`id, premises_code, premises_name, premises_type, status, region_code,
                 physical_address, area_hectares, capacity_animals, license_number,
                 allowed_species, gps_latitude, gps_longitude, created_at`)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (fpErr) throw fpErr;

      const pList: Premises[] = (fp ?? []).map(r => ({
        id:              r.id,
        premisesCode:    r.premises_code,
        premisesName:    r.premises_name,
        premisesType:    r.premises_type,
        status:          r.status,
        regionCode:      r.region_code,
        physicalAddress: (r.physical_address as string) ?? '',
        areaHectares:    r.area_hectares as number | null,
        capacityAnimals: r.capacity_animals as number | null,
        licenseNumber:   (r.license_number as string) || null,
        allowedSpecies:  (r.allowed_species as string) || null,
        gpsLatitude:     r.gps_latitude as number | null,
        gpsLongitude:    r.gps_longitude as number | null,
        createdAt:       r.created_at as string,
      }));
      setPremises(pList);

      const codes = pList.map(p => p.premisesCode);
      if (codes.length > 0) {
        const [{ data: animals }, { data: batchRows }] = await Promise.all([
          supabase.from('animals').select('current_premises_id, species').in('current_premises_id', codes),
          supabase.from('batches').select('premises_code').in('premises_code', codes),
        ]);

        const counts: Record<string, number>                   = {};
        const species: Record<string, Record<string, number>>  = {};
        for (const a of animals ?? []) {
          const code = a.current_premises_id as string;
          counts[code] = (counts[code] ?? 0) + 1;
          if (!species[code]) species[code] = {};
          const sp = ((a.species as string) ?? '').toUpperCase();
          if (sp) species[code][sp] = (species[code][sp] ?? 0) + 1;
        }
        setAnimalCounts(counts);
        setSpeciesCounts(species);

        const bc: Record<string, number> = {};
        for (const b of batchRows ?? []) {
          const code = b.premises_code as string;
          bc[code] = (bc[code] ?? 0) + 1;
        }
        setBatchCounts(bc);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load premises');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadPremises(); }, [userId]);

  // ── Select premises → load batches + animals, auto-assign if needed ────────

  const selectPremises = async (p: Premises) => {
    setView({ kind: 'batches', premises: p });
    setBatchLoading(true);
    try {
      const [fetchedBatches, fetchedAnimals] = await Promise.all([
        fetchBatches([p.premisesCode]),
        fetchAnimalsByPremises(p.premisesCode),
      ]);

      // Auto-assign animals that have no batch
      const unassigned = fetchedAnimals.filter(a => a.batchId === null);
      if (unassigned.length > 0 && fetchedBatches.length > 0) {
        const target = fetchedBatches.find(b => b.status === 'OPEN') ?? fetchedBatches[0];
        const ids = unassigned.map(a => a.id);
        await supabase.from('animals').update({ batch_id: target.id }).in('id', ids);
        // Reflect in local state without a re-fetch
        const updated = fetchedAnimals.map(a =>
          a.batchId === null ? { ...a, batchId: target.id } : a
        );
        setBatches(fetchedBatches);
        setPremisesAnimals(updated);
      } else {
        setBatches(fetchedBatches);
        setPremisesAnimals(fetchedAnimals);
      }
    } catch {
      setBatches([]);
      setPremisesAnimals([]);
    } finally {
      setBatchLoading(false);
    }
  };

  // Group animals by batch id
  const byBatchId = premisesAnimals.reduce<Record<string, MyAnimal[]>>((acc, a) => {
    const key = a.batchId ?? '__ungrouped__';
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  const ungroupedAnimals = byBatchId['__ungrouped__'] ?? [];

  // ── Loading / error ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className={s.loadingWrap}>
        <RefreshCw size={22} className={s.spinner} />
        <span>Loading livestock…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={s.errorWrap}>
        <p>{error}</p>
        <button className={s.retryBtn} onClick={() => void loadPremises()}>Retry</button>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW: Animals within a batch (ministry-style cards)
  // ══════════════════════════════════════════════════════════════════════════

  if (view.kind === 'animals') {
    const { premises: p, selectedBatch } = view;

    const animals: MyAnimal[] =
      selectedBatch.kind === 'ungrouped'
        ? ungroupedAnimals
        : byBatchId[selectedBatch.batch.id] ?? [];

    const batchLabel =
      selectedBatch.kind === 'ungrouped'
        ? 'Unassigned Animals'
        : selectedBatch.batch.batchName || selectedBatch.batch.batchCode;

    const batchCode =
      selectedBatch.kind === 'ungrouped'
        ? ''
        : selectedBatch.batch.batchCode;

    return (
      <div className={s.page}>
        <div className={s.breadcrumb}>
          <button className={s.breadcrumbBtn} onClick={() => setView({ kind: 'premises' })}>
            Livestock
          </button>
          <ChevronRight size={14} className={s.breadcrumbSep} />
          <button className={s.breadcrumbBtn} onClick={() => setView({ kind: 'batches', premises: p })}>
            {p.premisesName}
          </button>
          <ChevronRight size={14} className={s.breadcrumbSep} />
          <span className={s.breadcrumbCurrent}>{batchLabel}</span>
        </div>

        <div className={s.detailHeader}>
          <button className={s.backBtn} onClick={() => setView({ kind: 'batches', premises: p })}>
            <ArrowLeft size={15} />
            Back to Batches
          </button>
          <div className={s.detailTitle}>
            {batchCode && <span className={s.detailCode}>{batchCode}</span>}
            <span className={s.detailName}>{batchLabel}</span>
          </div>
          <span className={s.detailCount}>
            {animals.length} animal{animals.length !== 1 ? 's' : ''}
          </span>
        </div>

        {animals.length === 0 ? (
          <div className={s.emptyWrap}>No animals in this batch.</div>
        ) : (
          <div className={s.animalCardGrid}>
            {animals.map((a, i) => (
              <AnimalCard
                key={a.id}
                animal={a}
                seq={i + 1}
                onClick={() => navigate(`/animals/profile/${a.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW: Batches within a premises
  // ══════════════════════════════════════════════════════════════════════════

  if (view.kind === 'batches') {
    const { premises: p } = view;

    return (
      <div className={s.page}>
        <div className={s.breadcrumb}>
          <button className={s.breadcrumbBtn} onClick={() => setView({ kind: 'premises' })}>
            Livestock
          </button>
          <ChevronRight size={14} className={s.breadcrumbSep} />
          <span className={s.breadcrumbCurrent}>{p.premisesName}</span>
        </div>

        <div className={s.detailHeader}>
          <button className={s.backBtn} onClick={() => setView({ kind: 'premises' })}>
            <ArrowLeft size={15} />
            All Farms
          </button>
          <div className={s.detailTitle}>
            <span className={s.detailCode}>{p.premisesCode}</span>
            <span className={s.detailName}>{p.premisesName}</span>
          </div>
          <span className={s.detailCount}>
            {animalCounts[p.premisesCode] ?? 0} animal{(animalCounts[p.premisesCode] ?? 0) !== 1 ? 's' : ''}
          </span>
        </div>

        {batchLoading ? (
          <div className={s.loadingWrap}>
            <RefreshCw size={18} className={s.spinner} />
            <span>Loading batches…</span>
          </div>
        ) : (
          <div className={s.batchGrid}>
            {batches.map(b => {
              const batchAnimals = byBatchId[b.id] ?? [];
              const count        = batchAnimals.length;
              const cfg          = STATUS_CFG[b.status] ?? STATUS_CFG.OPEN;
              const spEmoji      = SPECIES_EMOJI[b.species] ?? '🐾';

              return (
                <div
                  key={b.id}
                  className={s.batchCard}
                  onClick={() => setView({ kind: 'animals', premises: p, selectedBatch: { kind: 'batch', batch: b } })}
                >
                  <div className={s.batchCardTop}>
                    <div className={s.batchCardMeta}>
                      <span className={s.batchCardCode}>{b.batchCode}</span>
                      <span className={s.batchCardStatus} style={{ color: cfg.color }}>
                        ● {cfg.label}
                      </span>
                    </div>
                    <ChevronRight size={17} className={s.cardChevron} />
                  </div>

                  <div className={s.batchCardName}>{b.batchName || b.batchCode}</div>

                  <div className={s.batchCardSpecies}>
                    <span className={s.batchCardEmoji}>{spEmoji}</span>
                    <span className={s.batchCardSpeciesLabel}>
                      {b.species
                        ? b.species.charAt(0) + b.species.slice(1).toLowerCase()
                        : 'Mixed'}
                    </span>
                  </div>

                  <div className={s.batchCardFooter}>
                    <div className={s.batchCardCountWrap}>
                      <span className={s.batchCardCountNum}>{count}</span>
                      <span className={s.batchCardCountLabel}>animals</span>
                    </div>
                    <span className={s.batchCardDate}>{fmtDate(b.createdAt)}</span>
                  </div>
                </div>
              );
            })}

            {ungroupedAnimals.length > 0 && (
              <div
                className={s.batchCard}
                onClick={() => setView({ kind: 'animals', premises: p, selectedBatch: { kind: 'ungrouped' } })}
              >
                <div className={s.batchCardTop}>
                  <div className={s.batchCardMeta}>
                    <span className={s.batchCardCode}>UNASSIGNED</span>
                  </div>
                  <ChevronRight size={17} className={s.cardChevron} />
                </div>
                <div className={s.batchCardName}>Animals without a batch</div>
                <div className={s.batchCardSpecies}>
                  <Package size={18} color="#94a3b8" />
                  <span className={s.batchCardSpeciesLabel} style={{ color: '#94a3b8' }}>Mixed</span>
                </div>
                <div className={s.batchCardFooter}>
                  <div className={s.batchCardCountWrap}>
                    <span className={s.batchCardCountNum}>{ungroupedAnimals.length}</span>
                    <span className={s.batchCardCountLabel}>animals</span>
                  </div>
                </div>
              </div>
            )}

            {batches.length === 0 && ungroupedAnimals.length === 0 && (
              <div className={s.emptyWrap}>No batches or animals at this premises.</div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW: Premises grid (default)
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <div>
          <h2 className={s.pageHeadTitle}>Your Livestock</h2>
          <p className={s.pageHeadSub}>Select a premises to view its batches and animals</p>
        </div>
        <button className={s.refreshBtn} onClick={() => void loadPremises()}>
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {premises.length === 0 ? (
        <div className={s.emptyWrap}>
          <p>No farms registered yet.</p>
          <button className={s.retryBtn} onClick={() => navigate('/premises')}>Register Farm</button>
        </div>
      ) : (
        <div className={s.premisesGrid}>
          {premises.map(p => {
            const total      = animalCounts[p.premisesCode] ?? 0;
            const numBatches = batchCounts[p.premisesCode] ?? 0;
            const spMap      = speciesCounts[p.premisesCode] ?? {};
            const counts     = CARD_SPECIES.map(sp => ({ sp, n: spMap[sp] ?? 0 }));
            const cfg        = STATUS_CFG[p.status] ?? { label: p.status, color: '#64748b' };
            const hasAny     = counts.some(c => c.n > 0);
            const hasGps     = p.gpsLatitude != null && p.gpsLongitude != null;

            return (
              <div
                key={p.id}
                className={s.premisesCard}
                onClick={() => void selectPremises(p)}
              >
                {/* ── Top row: code + status + chevron ── */}
                <div className={s.cardTop}>
                  <div className={s.cardMeta}>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: '0.5rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', lineHeight: 1 }}>Farm ID</span>
                      <span className={s.cardCode}>{p.premisesCode}</span>
                    </span>
                    <span className={s.cardStatus} style={{ color: cfg.color }}>● {cfg.label}</span>
                  </div>
                  <ChevronRight size={17} className={s.cardChevron} />
                </div>

                {/* ── Name ── */}
                <div className={s.cardName}>{p.premisesName}</div>

                {/* ── Type + Region ── */}
                <div className={s.cardRegion}>
                  <MapPin size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
                  {p.regionCode} · {p.premisesType.replace(/_/g, ' ')}
                </div>

                {/* ── Physical address ── */}
                {p.physicalAddress && (
                  <div className={s.cardAddress}>{p.physicalAddress}</div>
                )}

                <div className={s.cardDivider} />

                {/* ── Species tiles ── */}
                <div className={s.cardSpecies}>
                  {hasAny
                    ? counts.filter(c => c.n > 0).map(c => (
                      <div key={c.sp} className={s.speciesTile}>
                        <span className={s.speciesTileEmoji}>{SPECIES_EMOJI[c.sp]}</span>
                        <span className={s.speciesTileCount}>{c.n}</span>
                        <span className={s.speciesTileLabel}>{c.sp.charAt(0) + c.sp.slice(1).toLowerCase()}</span>
                      </div>
                    ))
                    : <span className={s.noAnimals}>No animals recorded</span>
                  }
                </div>

                {/* ── Detail pills: area, capacity, license ── */}
                <div className={s.cardDetailRow}>
                  {p.areaHectares != null && (
                    <span className={s.cardDetailPill}>
                      <Ruler size={10} />
                      {p.areaHectares} ha
                    </span>
                  )}
                  {p.capacityAnimals != null && (
                    <span className={s.cardDetailPill}>
                      Capacity {p.capacityAnimals}
                    </span>
                  )}
                  {p.licenseNumber && (
                    <span className={s.cardDetailPill}>
                      <Tag size={10} />
                      {p.licenseNumber}
                    </span>
                  )}
                </div>

                {/* ── Footer: totals + batches + GPS ── */}
                <div className={s.cardFooter}>
                  <div className={s.cardFooterLeft}>
                    <div className={s.cardStat}>
                      <span className={s.cardStatNum}>{total}</span>
                      <span className={s.cardStatLabel}>animals</span>
                    </div>
                    <div className={s.cardStatSep} />
                    <div className={s.cardStat}>
                      <span className={s.cardStatNum}>{numBatches}</span>
                      <span className={s.cardStatLabel}>
                        <Layers size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 2 }} />
                        batches
                      </span>
                    </div>
                  </div>
                  {hasGps && (
                    <span className={s.cardGpsBadge}>
                      <MapPin size={10} />
                      GPS
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default LivestockPage;
