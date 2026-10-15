import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus, Beef, RefreshCw, Search, X,
  LogIn, LogOut, Home, MapPin, ArrowRight, Tag, Globe, ChevronRight, ChevronLeft, Building2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth.store';
import { getBadge } from '@/utils/statusBadge';
import { fmtDate } from '@/utils/date';
import { RegisterAnimalPage } from './RegisterAnimalPage';
import {
  fetchBatches, fetchAnimalsByPremises, fetchIncoming, fetchOutgoing, fetchExported, fetchMyAnimals,
  type AvailableBatch, type IncomingBatch, type OutgoingBatch, type ExportedBatch, type MyAnimal,
} from './animals.supabase';
import s from './animals.module.css';

type Tab = 'incoming' | 'available' | 'outgoing' | 'exported';

// ── Constants ─────────────────────────────────────────────────────────────────

const SPECIES_EMOJI: Record<string, string> = {
  CATTLE: '🐄', CAMEL: '🐪', GOAT: '🐐', SHEEP: '🐑',
  Cattle: '🐄', Camel:  '🐪', Goat:  '🐐', Sheep: '🐑',
};

const SPECIES_BANNER: Record<string, { bg: string; accent: string }> = {
  Cattle: { bg: '#eff6ff', accent: '#2563eb' },
  Sheep:  { bg: '#eff6ff', accent: '#2563eb' },
  Goat:   { bg: '#eff6ff', accent: '#2563eb' },
  Camel:  { bg: '#eff6ff', accent: '#2563eb' },
};

const TABS = [
  { key: 'incoming' as Tab,  label: 'Incoming',  Icon: LogIn,  color: '#0d9488', desc: 'Animals arriving at your premises' },
  { key: 'available' as Tab, label: 'Available', Icon: Home,   color: '#0f2170', desc: 'Animals currently on your premises' },
  { key: 'outgoing' as Tab,  label: 'Outgoing',  Icon: LogOut, color: '#d97706', desc: 'Animals leaving your premises' },
  { key: 'exported' as Tab,  label: 'Exported',  Icon: Globe,  color: '#7c3aed', desc: 'Animals exported internationally' },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface FarmerPremise {
  id: string; premisesCode: string; premisesName: string;
  premisesType: string; status: string; regionCode: string;
}

export function AnimalsPage(): JSX.Element {
  const navigate = useNavigate();
  const { userId } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const premisesFilter = searchParams.get('premises') ?? '';

  const [view,   setView]    = useState<'list' | 'form'>(searchParams.get('register') === '1' ? 'form' : 'list');
  const [tab,    setTab]     = useState<Tab>(premisesFilter ? 'available' : 'available');
  const [search, setSearch]  = useState(premisesFilter);
  const [loading, setLoading] = useState(true);
  const [error,   setError]  = useState<string | null>(null);

  const [userPremises,        setUserPremises]        = useState<FarmerPremise[]>([]);
  const [selectedPremisesCode, setSelectedPremisesCode] = useState<string | null>(premisesFilter || null);
  const [available, setAvailable] = useState<AvailableBatch[]>([]);
  const [incoming,  setIncoming]  = useState<IncomingBatch[]>([]);
  const [outgoing,  setOutgoing]  = useState<OutgoingBatch[]>([]);
  const [exported,  setExported]  = useState<ExportedBatch[]>([]);
  const [myAnimals,              setMyAnimals]              = useState<MyAnimal[]>([]);
  const [selectedBatchKey,       setSelectedBatchKey]       = useState<string | null>(null);
  const [premisesAnimals,        setPremisesAnimals]        = useState<MyAnimal[]>([]);
  const [premisesAnimalsLoading, setPremisesAnimalsLoading] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch farmer's own premises first
      let premisesCodes: string[] = [];
      if (userId) {
        const { data: fp } = await supabase
          .from('farmer_premises')
          .select('id, premises_code, premises_name, premises_type, status, region_code')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (fp) {
          const mapped: FarmerPremise[] = fp.map((r: Record<string, string>) => ({
            id: r.id, premisesCode: r.premises_code, premisesName: r.premises_name,
            premisesType: r.premises_type, status: r.status, regionCode: r.region_code,
          }));
          setUserPremises(mapped);
          premisesCodes = mapped.map(p => p.premisesCode);
        }
      }
      const [av, inc, out, exp, mine] = await Promise.allSettled([
        fetchBatches(premisesCodes), fetchIncoming(userId), fetchOutgoing(userId), fetchExported(userId),
        fetchMyAnimals(premisesCodes),
      ]);
      setAvailable(av.status === 'fulfilled' ? av.value : []);
      setIncoming(inc.status === 'fulfilled' ? inc.value : []);
      setOutgoing(out.status === 'fulfilled' ? out.value : []);
      setExported(exp.status === 'fulfilled' ? exp.value : []);
      setMyAnimals(mine.status === 'fulfilled' ? mine.value : []);
    } catch (e) {
      setError('Failed to load data. Please try again.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, [userId]);


  // Fetch all animals at selected premises — drives Level 2 batch groups and Level 3 animal list
  useEffect(() => {
    setSelectedBatchKey(null);
    if (!selectedPremisesCode) { setPremisesAnimals([]); return; }
    setPremisesAnimalsLoading(true);
    fetchAnimalsByPremises(selectedPremisesCode)
      .then(setPremisesAnimals)
      .catch(() => setPremisesAnimals([]))
      .finally(() => setPremisesAnimalsLoading(false));
  }, [selectedPremisesCode]);

  if (view === 'form') {
    return (
      <RegisterAnimalPage
        initialPremisesCode={premisesFilter || undefined}
        onBack={() => setView('list')}
        onSuccess={() => { setView('list'); loadAll(); }}
      />
    );
  }

  const q = search.toLowerCase();

  const filteredIncoming = incoming.filter(b =>
    !q ||
    b.batchName.toLowerCase().includes(q) ||
    b.species.toLowerCase().includes(q) ||
    b.fromRegion.toLowerCase().includes(q) ||
    b.fromPremises.toLowerCase().includes(q) ||
    b.fromOwner.toLowerCase().includes(q) ||
    b.moveCode.toLowerCase().includes(q)
  );

  const filteredAvailable = available.filter(b =>
    !q ||
    b.batchName.toLowerCase().includes(q) ||
    b.species.toLowerCase().includes(q) ||
    b.region.toLowerCase().includes(q) ||
    b.premisesCode.toLowerCase().includes(q) ||
    b.batchCode.toLowerCase().includes(q)
  );

  const filteredOutgoing = outgoing.filter(b =>
    !q ||
    b.batchName.toLowerCase().includes(q) ||
    b.species.toLowerCase().includes(q) ||
    b.toRegion.toLowerCase().includes(q) ||
    b.toPremises.toLowerCase().includes(q) ||
    b.toOwner.toLowerCase().includes(q) ||
    b.moveCode.toLowerCase().includes(q)
  );

  const filteredExported = exported.filter(b =>
    !q ||
    b.batchName.toLowerCase().includes(q) ||
    b.species.toLowerCase().includes(q) ||
    b.destinationCountry.toLowerCase().includes(q) ||
    b.port.toLowerCase().includes(q) ||
    b.exportCompany.toLowerCase().includes(q) ||
    b.exportCode.toLowerCase().includes(q)
  );

  const activeTab = TABS.find(t => t.key === tab)!;

  return (
    <div className={s.page}>

      {/* ── Error banner ── */}
      {error && (
        <div className={s.errorBanner}>
          {error}
          <button className={s.retryBtn} onClick={loadAll}>Retry</button>
        </div>
      )}

      {/* ── Header ── */}
      <div className={s.header}>
        <div>
          <h1 className={s.title}>My Animals</h1>
          <p className={s.sub}>
            {incoming.length} incoming · {available.length} available · {outgoing.length} outgoing · {exported.length} exported
          </p>
        </div>
        <div className={s.headerActions}>
          <button className={s.iconBtn} onClick={loadAll} disabled={loading} title="Refresh">
            <RefreshCw size={14} strokeWidth={2} className={loading ? s.spin : ''} />
          </button>
          <button className={s.addBtn} onClick={() => setView('form')}>
            <Plus size={15} strokeWidth={2} /> Register Animal
          </button>
        </div>
      </div>

      {/* ── 3 Big Tabs ── */}
      <div className={s.bigTabBar}>
        {TABS.map(t => {
          const count = t.key === 'incoming'  ? incoming.length
                      : t.key === 'available' ? available.length
                      : t.key === 'outgoing'  ? outgoing.length
                      : exported.length;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              className={`${s.bigTab}${active ? ' ' + s.bigTabActive : ''}`}
              onClick={() => { setTab(t.key); setSearch(''); }}
            >
              <t.Icon size={18} strokeWidth={2} color={t.color} />
              <span className={s.bigTabCount} style={{ color: t.color }}>{count}</span>
              <div className={s.bigTabLabel} style={{ color: active ? t.color : '#374151' }}>{t.label}</div>
              <div className={s.bigTabDesc}>{t.desc}</div>
            </button>
          );
        })}
      </div>

      {/* ── Premises filter banner ── */}
      {premisesFilter && (
        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.6rem 1rem', background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:10, fontSize:13 }}>
          <MapPin size={13} color="#2563eb" />
          <span style={{ color:'#1d4ed8', fontWeight:600 }}>Filtered by farm: <span style={{ fontFamily:'monospace' }}>{premisesFilter}</span></span>
          <button onClick={() => { setSearch(''); setSearchParams({}); }} style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:4, fontSize:12, color:'#3b82f6', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>
            <X size={12} /> Clear filter
          </button>
        </div>
      )}

      {/* ── Search ── */}
      <div className={s.searchWrap}>
        <Search size={14} className={s.searchIcon} />
        <input
          className={s.searchInput}
          placeholder={`Search ${activeTab.label.toLowerCase()} batches by name, species, premises, region…`}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button className={s.searchClear} onClick={() => { setSearch(''); setSearchParams({}); }}>
            <X size={13} />
          </button>
        )}
      </div>

      {/* ══ INCOMING ══ */}
      {tab === 'incoming' && (
        <>
          {filteredIncoming.length === 0 ? (
            <div className={s.empty}>
              <LogIn size={48} strokeWidth={1} color="#d1d5db" />
              <div className={s.emptyTitle}>{search ? 'No incoming batches match your search' : 'No incoming batches'}</div>
              <div className={s.emptySub}>{search ? 'Try a different keyword.' : 'Animals transferred to your farm will appear here.'}</div>
            </div>
          ) : (
            <div className={s.batchGrid}>
              {filteredIncoming.map(b => {
                const badge = getBadge(b.status);
                const emoji = SPECIES_EMOJI[b.species] ?? '🐾';
                return (
                  <button key={b.id} className={s.batchCard} onClick={() => navigate('/movements')}>
                    <div className={s.dirBadgeIn}><ArrowRight size={10} /> FROM &nbsp;{b.fromRegion}</div>
                    <div className={s.routeRow}>
                      <MapPin size={10} color="#9ca3af" />
                      <span className={s.routeText}>{b.fromPremises}</span>
                      <span className={s.routeDot}>·</span>
                      <span className={s.routeOwner}>{b.fromOwner}</span>
                    </div>
                    <div className={s.animalPhoto}>{emoji}</div>
                    <div className={s.batchCardSpecies}>{b.species}</div>
                    <div className={s.batchCardName}>{b.batchName}</div>
                    <div className={s.batchCardCount}>
                      {b.count} animal{b.count !== 1 ? 's' : ''}
                      <span className={s.metaDot}>·</span>
                      Arrives {fmtDate(b.expectedArrival)}
                    </div>
                    <span className={s.batchStatusBadge} style={{ background: badge.bg, color: badge.color }}>
                      {badge.label}
                    </span>
                    <div className={s.tagChip}>
                      <Tag size={11} strokeWidth={2} />
                      BT-{b.moveCode.replace(/^[A-Z]+-/, '')}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ══ AVAILABLE ══ */}
      {tab === 'available' && (
        <>
          {/* ── LEVEL 1: Premises cards ── */}
          {!selectedPremisesCode && (
            userPremises.length === 0 ? (
              <div className={s.empty}>
                <Building2 size={48} strokeWidth={1} color="#d1d5db" />
                <div className={s.emptyTitle}>No farms registered</div>
                <div className={s.emptySub}>Register a farm first to track your animals.</div>
                <button className={s.addBtn} style={{ marginTop: '0.5rem' }} onClick={() => navigate('/premises')}>
                  Register Farm
                </button>
              </div>
            ) : (
              <div className={s.batchGrid}>
                {userPremises.map(p => {
                  const premAnimals = myAnimals.filter(a => a.premisesCode === p.premisesCode);
                  const animalCount = premAnimals.length;
                  const batchCount  = new Set(premAnimals.map(a => a.batchId ?? 'NO_BATCH')).size;
                  return (
                    <button key={p.id} className={s.availCard} onClick={() => setSelectedPremisesCode(p.premisesCode)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#0f2170', letterSpacing: '0.04em' }}>{p.premisesCode}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: p.status === 'APPROVED' ? '#dcfce7' : '#fef9c3', color: p.status === 'APPROVED' ? '#15803d' : '#a16207' }}>
                          {p.status}
                        </span>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 3, textAlign: 'left' }}>{p.premisesName}</div>
                      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <MapPin size={10} color="#94a3b8" />
                        {p.premisesType.replace(/_/g, ' ')} · {p.regionCode}
                      </div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#374151', background: '#f1f5f9', borderRadius: 8, padding: '4px 10px' }}>
                          <Beef size={12} strokeWidth={2} color="#64748b" /> {animalCount} animal{animalCount !== 1 ? 's' : ''}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#374151', background: '#f1f5f9', borderRadius: 8, padding: '4px 10px' }}>
                          <Tag size={12} strokeWidth={2} color="#64748b" /> {batchCount} active batch{batchCount !== 1 ? 'es' : ''}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )
          )}

          {/* ── LEVEL 2: Batch groups derived from animals + batches table ── */}
          {selectedPremisesCode && !selectedBatchKey && (() => {
            const premise = userPremises.find(p => p.premisesCode === selectedPremisesCode);

            // Build batch groups from premisesAnimals (primary source — works even when batches table is empty)
            type DerivedBatch = {
              key: string; batchCode: string; batchName: string;
              species: string; breed: string; count: number; status: string;
            };
            const seenKeys = new Set<string>();
            const derivedBatches: DerivedBatch[] = [];
            const groups = new Map<string, MyAnimal[]>();
            for (const a of premisesAnimals) {
              const key = a.batchId ?? 'NO_BATCH';
              if (!groups.has(key)) groups.set(key, []);
              groups.get(key)!.push(a);
            }
            for (const [key, animals] of groups) {
              const tableB = key !== 'NO_BATCH' ? available.find(b => b.id === key) : undefined;
              const first = animals[0];
              seenKeys.add(key);
              derivedBatches.push({
                key,
                batchCode: tableB?.batchCode ?? (key !== 'NO_BATCH' ? key.slice(-8).toUpperCase() : '—'),
                batchName: tableB?.batchName ?? `${first.species} · ${first.breed}`,
                species:   tableB?.species   ?? first.species,
                breed:     tableB?.breed     ?? first.breed,
                count:     animals.length,
                status:    tableB?.status    ?? 'SUBMITTED',
              });
            }
            // Also include batches from the batches table that have no animals yet
            for (const b of available.filter(ab => ab.premisesCode === selectedPremisesCode && ab.status !== 'CLOSED')) {
              if (!seenKeys.has(b.id)) {
                derivedBatches.push({
                  key: b.id, batchCode: b.batchCode, batchName: b.batchName,
                  species: b.species, breed: b.breed, count: b.count, status: b.status,
                });
              }
            }

            return (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button
                    onClick={() => { setSelectedPremisesCode(null); setSelectedBatchKey(null); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer', color: '#374151', fontWeight: 600 }}
                  >
                    <ChevronLeft size={14} /> All Farms
                  </button>
                  <span style={{ fontSize: 13, color: '#64748b' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>{selectedPremisesCode}</span>
                    {premise && ` · ${premise.premisesName}`}
                  </span>
                </div>
                {premisesAnimalsLoading ? (
                  <div className={s.empty}>
                    <Tag size={48} strokeWidth={1} color="#d1d5db" />
                    <div className={s.emptyTitle}>Loading…</div>
                  </div>
                ) : derivedBatches.length === 0 ? (
                  <div className={s.empty}>
                    <Tag size={48} strokeWidth={1} color="#d1d5db" />
                    <div className={s.emptyTitle}>No animals at this farm</div>
                    <div className={s.emptySub}>Register an animal under this farm to see it here.</div>
                  </div>
                ) : (
                  <div className={s.batchGrid}>
                    {derivedBatches.map((db, idx) => {
                      const badge  = getBadge(db.status);
                      const emoji  = SPECIES_EMOJI[db.species] ?? '🐾';
                      const banner = SPECIES_BANNER[db.species] ?? { bg: '#eff6ff', accent: '#2563eb' };
                      return (
                        <button
                          key={db.key}
                          className={s.availCard}
                          onClick={() => setSelectedBatchKey(db.key)}
                        >
                          <div className={s.availBanner} style={{ background: banner.bg }}>
                            <div className={s.availBannerTop}>
                              <span className={s.availBatchNo} style={{ color: banner.accent }}>BATCH {idx + 1}</span>
                              <span className={s.availStatus} style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
                            </div>
                            <div className={s.availEmojiWrap}>
                              <div className={s.availEmojiCircle}><span className={s.availEmoji}>{emoji}</span></div>
                            </div>
                          </div>
                          <div className={s.availBody}>
                            <div className={s.availSpecies} style={{ color: banner.accent }}>
                              {db.species.toUpperCase()}&nbsp;·&nbsp;{db.breed}
                            </div>
                            <div className={s.availName}>{db.batchName}</div>
                            <div className={s.availChips}>
                              <span className={s.availChip}><Beef size={11} strokeWidth={2} />{db.count} animal{db.count !== 1 ? 's' : ''}</span>
                            </div>
                          </div>
                          <div className={s.availFooter}>
                            <Tag size={11} strokeWidth={2.5} color={banner.accent} />
                            <span className={s.availCode}>{db.batchCode}</span>
                            <ChevronRight size={14} className={s.availChevron} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            );
          })()}

          {/* ── LEVEL 3: Animal cards for selected batch group ── */}
          {selectedBatchKey && (() => {
            const premise     = userPremises.find(p => p.premisesCode === selectedPremisesCode);
            const tableB      = available.find(b => b.id === selectedBatchKey);
            const batchLabel  = tableB?.batchCode
              ?? (selectedBatchKey !== 'NO_BATCH' ? selectedBatchKey.slice(-8).toUpperCase() : 'Unassigned');
            const groupAnimals = premisesAnimals.filter(
              a => (a.batchId ?? 'NO_BATCH') === selectedBatchKey
            );
            return (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setSelectedBatchKey(null)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer', color: '#374151', fontWeight: 600 }}
                  >
                    <ChevronLeft size={14} /> Back to Batches
                  </button>
                  <span style={{ fontSize: 13, color: '#64748b' }}>
                    {premise && <><span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>{selectedPremisesCode}</span> · </>}
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>{batchLabel}</span>
                  </span>
                </div>
                {premisesAnimalsLoading ? (
                  <div className={s.empty}>
                    <Beef size={48} strokeWidth={1} color="#d1d5db" />
                    <div className={s.emptyTitle}>Loading animals…</div>
                  </div>
                ) : groupAnimals.length === 0 ? (
                  <div className={s.empty}>
                    <Beef size={48} strokeWidth={1} color="#d1d5db" />
                    <div className={s.emptyTitle}>No animals in this batch</div>
                    <div className={s.emptySub}>Animals registered under this batch will appear here.</div>
                  </div>
                ) : (
                  <div className={s.batchGrid}>
                    {groupAnimals.map(animal => {
                      const badge  = getBadge(animal.status);
                      const emoji  = SPECIES_EMOJI[animal.species] ?? '🐾';
                      const banner = SPECIES_BANNER[animal.species] ?? { bg: '#eff6ff', accent: '#2563eb' };
                      const tagged = animal.tagStatus === 'TAGGED';
                      return (
                        <button
                          key={animal.id}
                          className={s.availCard}
                          onClick={() => navigate(`/animals/profile/${animal.id}`)}
                        >
                          <div className={s.availBanner} style={{ background: banner.bg }}>
                            <div className={s.availBannerTop}>
                              <span className={s.availBatchNo} style={{ color: banner.accent }}>{animal.submissionType}</span>
                              <span className={s.availStatus} style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
                            </div>
                            <div className={s.availEmojiWrap}>
                              <div className={s.availEmojiCircle}><span className={s.availEmoji}>{emoji}</span></div>
                            </div>
                          </div>
                          <div className={s.availBody}>
                            <div className={s.availSpecies} style={{ color: banner.accent }}>{animal.species}&nbsp;·&nbsp;{animal.breed}</div>
                            <div className={s.availName} style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{animal.animalCode}</div>
                            <div className={s.availChips}>
                              <span className={s.availChip}>{animal.sex}</span>
                              {animal.weightKg && <span className={s.availChip}>{animal.weightKg} kg</span>}
                              {animal.coatColor && <span className={s.availChip}>{animal.coatColor}</span>}
                              <span className={s.availChip}>{fmtDate(animal.registeredAt)}</span>
                            </div>
                          </div>
                          <div className={s.availFooter}>
                            <Tag size={11} strokeWidth={2.5} color={tagged ? banner.accent : '#9ca3af'} />
                            <span className={s.availCode} style={{ color: tagged ? banner.accent : '#9ca3af' }}>
                              {tagged ? animal.tagSerial : 'Untagged'}
                            </span>
                            <ChevronRight size={14} className={s.availChevron} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            );
          })()}
        </>
      )}

      {/* ══ OUTGOING ══ */}
      {tab === 'outgoing' && (
        <>
          {filteredOutgoing.length === 0 ? (
            <div className={s.empty}>
              <LogOut size={48} strokeWidth={1} color="#d1d5db" />
              <div className={s.emptyTitle}>{search ? 'No outgoing batches match your search' : 'No outgoing batches'}</div>
              <div className={s.emptySub}>{search ? 'Try a different keyword.' : 'Animals you are sending to another farm will appear here.'}</div>
            </div>
          ) : (
            <div className={s.batchGrid}>
              {filteredOutgoing.map(b => {
                const badge = getBadge(b.status);
                const emoji = SPECIES_EMOJI[b.species] ?? '🐾';
                return (
                  <button key={b.id} className={s.batchCard} onClick={() => navigate('/movements')}>
                    <div className={s.dirBadgeOut}><ArrowRight size={10} /> TO &nbsp;{b.toRegion}</div>
                    <div className={s.routeRow}>
                      <MapPin size={10} color="#9ca3af" />
                      <span className={s.routeText}>{b.toPremises}</span>
                      <span className={s.routeDot}>·</span>
                      <span className={s.routeOwner}>{b.toOwner}</span>
                    </div>
                    <div className={s.animalPhoto}>{emoji}</div>
                    <div className={s.batchCardSpecies}>{b.species}</div>
                    <div className={s.batchCardName}>{b.batchName}</div>
                    <div className={s.batchCardCount}>
                      {b.count} animal{b.count !== 1 ? 's' : ''}
                      <span className={s.metaDot}>·</span>
                      Departs {fmtDate(b.departureDate)}
                    </div>
                    <span className={s.batchStatusBadge} style={{ background: badge.bg, color: badge.color }}>
                      {badge.label}
                    </span>
                    <div className={s.tagChip}>
                      <Tag size={11} strokeWidth={2} />
                      BT-{b.moveCode.replace(/^[A-Z]+-/, '')}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ══ EXPORTED ══ */}
      {tab === 'exported' && (
        <>
          {filteredExported.length === 0 ? (
            <div className={s.empty}>
              <Globe size={48} strokeWidth={1} color="#d1d5db" />
              <div className={s.emptyTitle}>{search ? 'No exported batches match your search' : 'No exported batches'}</div>
              <div className={s.emptySub}>{search ? 'Try a different keyword.' : 'Animals you have exported internationally will appear here.'}</div>
            </div>
          ) : (
            <div className={s.batchGrid}>
              {filteredExported.map(b => {
                const badge = getBadge(b.status);
                const emoji = SPECIES_EMOJI[b.species] ?? '🐾';
                return (
                  <button key={b.id} className={s.batchCard} onClick={() => navigate('/movements')}>
                    <div className={s.dirBadgeExported}><Globe size={10} /> {b.destinationCountry}</div>
                    <div className={s.routeRow}>
                      <MapPin size={10} color="#9ca3af" />
                      <span className={s.routeText}>{b.port}</span>
                      <span className={s.routeDot}>·</span>
                      <span className={s.routeOwner}>{b.exportCompany}</span>
                    </div>
                    <div className={s.animalPhoto}>{emoji}</div>
                    <div className={s.batchCardSpecies}>{b.species}</div>
                    <div className={s.batchCardName}>{b.batchName}</div>
                    <div className={s.batchCardCount}>
                      {b.count} animal{b.count !== 1 ? 's' : ''}
                      <span className={s.metaDot}>·</span>
                      Departed {fmtDate(b.departureDate)}
                    </div>
                    <span className={s.batchStatusBadge} style={{ background: badge.bg, color: badge.color }}>
                      {badge.label}
                    </span>
                    <div className={s.tagChip}>
                      <Tag size={11} strokeWidth={2} />
                      {b.exportCode}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

    </div>
  );
}

export default AnimalsPage;
