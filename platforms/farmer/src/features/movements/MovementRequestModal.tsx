import { useState, useEffect, useCallback, useRef } from 'react';
import { Users, CheckCircle, Loader, AlertTriangle, MapPin, ChevronDown, ChevronRight } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth.store';
import { logActivity } from '@/lib/activity';
import s from './movement-request.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface OriginPremises {
  id: string;
  premisesCode: string;
  premisesName: string;
  premisesType: string;
  regionCode: string;
  status: string;
}

interface Batch {
  id: string;
  batchCode: string;
  batchName: string;
  species: string;
  breed: string;
  count: number;
  status: string;
}

interface Animal {
  id: string;
  tagId: string;
  species: string;
  breed: string;
  sex: string;
  batchId: string;
}

interface MovementForm {
  // Step 1
  originPremisesId: string;
  originPremisesCode: string;
  originPremisesName: string;
  originRegionCode: string;
  selectedAnimalIds: string[];
  // Step 2
  movementTypeCode: string;
  purpose: string;
  destinationPremisesCode: string;
  destinationPremisesName: string;
  destinationAddress: string;
  destinationLat: number | null;
  destinationLng: number | null;
  plannedDepartureDate: string;
  plannedArrivalDate: string;
  // Step 2 extra
  requestReason: string;
  // Step 3
  vehicleRegistration: string;
  transporterName: string;
  routeDescription: string;
}

interface Props {
  onClose: () => void;
  onSuccess: (movementCode: string) => void;
  initialPremisesCode?: string;
  destType?: 'premises' | 'quarantine';
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MOVEMENT_TYPES = [
  { code: 'P2P', label: 'Farm to Farm' },
  { code: 'F2M', label: 'Farm to Livestock Market' },
  { code: 'M2P', label: "Market to Buyer's Farm" },
  { code: 'F2Q', label: 'Farm/Market to Quarantine' },
  { code: 'Q2S', label: 'Quarantine to Slaughterhouse' },
  { code: 'Q2E', label: 'Quarantine to Export Point' },
  { code: 'Q2P', label: 'Quarantine Return to Farm' },
  { code: 'P2V', label: 'Farm to Veterinary Facility' },
  { code: 'TRH', label: 'Transhumance / Seasonal Grazing' },
  { code: 'EXP', label: 'Movement for Export' },
  { code: 'RET', label: 'Return Movement' },
  { code: 'EMG', label: 'Emergency Movement' },
];

const PURPOSES = [
  'Sale', 'Market', 'Quarantine', 'Slaughter', 'Export',
  'Veterinary Treatment', 'Seasonal Grazing', 'Transfer', 'Breeding', 'Emergency',
];

const MOVEMENT_TYPE_PURPOSE: Record<string, string> = {
  P2P: 'Transfer',
  F2M: 'Market',
  M2P: 'Transfer',
  F2Q: 'Quarantine',
  Q2S: 'Slaughter',
  Q2E: 'Export',
  Q2P: 'Transfer',
  P2V: 'Veterinary Treatment',
  TRH: 'Seasonal Grazing',
  EXP: 'Export',
  RET: 'Transfer',
  EMG: 'Emergency',
};

const STEP_LABELS = ['Origin & Animals', 'Destination & Purpose', 'Transport Details', 'Review & Submit'];

const EMPTY_FORM: MovementForm = {
  originPremisesId: '',
  originPremisesCode: '',
  originPremisesName: '',
  originRegionCode: '',
  selectedAnimalIds: [],
  movementTypeCode: '',
  purpose: '',
  destinationPremisesCode: '',
  destinationPremisesName: '',
  destinationAddress: '',
  destinationLat: null,
  destinationLng: null,
  plannedDepartureDate: '',
  plannedArrivalDate: '',
  requestReason: '',
  vehicleRegistration: '',
  transporterName: '',
  routeDescription: '',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function animalSpeciesSummary(animals: Animal[]): Record<string, number> {
  const map: Record<string, number> = {};
  animals.forEach(a => { map[a.species] = (map[a.species] ?? 0) + 1; });
  return map;
}

const SPECIES_COLOR: Record<string, { bg: string; color: string }> = {
  CATTLE: { bg: '#dbeafe', color: '#1d4ed8' },
  CAMEL:  { bg: '#e0f2fe', color: '#0369a1' },
  GOAT:   { bg: '#ede9fe', color: '#6d28d9' },
  SHEEP:  { bg: '#fce7f3', color: '#be185d' },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: number }) {
  return (
    <div className={s.stepIndicator}>
      {STEP_LABELS.map((label, i) => {
        const num = i + 1;
        const isDone = num < step;
        const isActive = num === step;
        return (
          <div key={num} className={s.stepItem}>
            {i > 0 && <div className={`${s.stepLine} ${isDone ? s.stepLineDone : ''}`} />}
            <div
              className={`${s.stepDot} ${isDone ? s.stepDotDone : isActive ? s.stepDotActive : s.stepDotPending}`}
              title={label}
            >
              {isDone ? <CheckCircle size={12} /> : <span>{num}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Step 1 ────────────────────────────────────────────────────────────────────

interface Step1Props {
  form: MovementForm;
  premises: OriginPremises[];
  batches: Batch[];
  loadingPremises: boolean;
  loadingBatches: boolean;
  premisesError: string;
  batchesError: string;
  onChange: (patch: Partial<MovementForm>) => void;
  locked: boolean;
  expandedBatchIds: Set<string>;
  onToggleBatchExpand: (batchId: string) => void;
  batchAnimals: Record<string, Animal[]>;
  loadingBatchAnimals: Record<string, boolean>;
}

function Step1({
  form, premises, batches, loadingPremises, loadingBatches,
  premisesError, batchesError, onChange, locked,
  expandedBatchIds, onToggleBatchExpand, batchAnimals, loadingBatchAnimals,
}: Step1Props) {

  function selectPremises(p: OriginPremises) {
    onChange({
      originPremisesId:   p.id,
      originPremisesCode: p.premisesCode,
      originPremisesName: p.premisesName,
      originRegionCode:   p.regionCode,
      selectedAnimalIds:  [],
    });
  }

  function clearPremises() {
    onChange({
      originPremisesId: '', originPremisesCode: '',
      originPremisesName: '', originRegionCode: '',
      selectedAnimalIds: [],
    });
  }

  const toggleAnimal = (animalId: string) => {
    const ids = form.selectedAnimalIds;
    onChange({ selectedAnimalIds: ids.includes(animalId) ? ids.filter(x => x !== animalId) : [...ids, animalId] });
  };

  const selectAllInBatch = (batchId: string) => {
    const animals = batchAnimals[batchId] ?? [];
    const toAdd = animals.map(a => a.id);
    const merged = Array.from(new Set([...form.selectedAnimalIds, ...toAdd]));
    onChange({ selectedAnimalIds: merged });
  };

  const clearBatch = (batchId: string) => {
    const toRemove = new Set((batchAnimals[batchId] ?? []).map(a => a.id));
    onChange({ selectedAnimalIds: form.selectedAnimalIds.filter(id => !toRemove.has(id)) });
  };

  const countInBatch = (batchId: string): number => {
    const animals = batchAnimals[batchId];
    if (!animals) return 0;
    const ids = new Set(form.selectedAnimalIds);
    return animals.filter(a => ids.has(a.id)).length;
  };

  const totalSelected = form.selectedAnimalIds.length;
  const batchesWithSel = batches.filter(b => countInBatch(b.id) > 0).length;

  return (
    <div className={s.stepContent}>
      {/* Premises selection */}
      <div className={s.fieldGroup}>
        <div className={s.animalListHeader}>
          <label className={s.sectionLabel}>Origin Farm</label>
          {!locked && form.originPremisesId && premises.length > 1 && (
            <button type="button" className={s.selectAllBtn} onClick={clearPremises}>Change</button>
          )}
        </div>

        {loadingPremises ? (
          <div className={s.loadingRow}><Loader size={14} className={s.spinIcon} /> Loading your premises…</div>
        ) : premisesError ? (
          <div className={s.inlineError}><AlertTriangle size={13} /> {premisesError}</div>
        ) : premises.length === 0 ? (
          <p className={s.hintText}>No approved farms found on your account.</p>
        ) : (
          <div className={s.premisesGrid}>
            {premises.map(p => {
              const selected = form.originPremisesId === p.id;
              const dimmed   = (!!form.originPremisesId && !selected) || (locked && !selected);
              return (
                <div
                  key={p.id}
                  className={`${s.premisesCard} ${selected ? s.premisesCardSelected : ''} ${dimmed ? s.premisesCardDimmed : ''}`}
                  onClick={() => !dimmed && !locked && selectPremises(p)}
                >
                  <div className={s.premisesCardTop}>
                    <span className={s.premisesCardName}>{p.premisesName}</span>
                    {selected && <CheckCircle size={15} strokeWidth={2.5} color="#2563eb" style={{ flexShrink: 0 }} />}
                  </div>
                  <span className={s.premisesCardCode}>{p.premisesCode}</span>
                  <div className={s.premisesCardMeta}>
                    {p.premisesType && <span className={s.premisesCardBadge}>{p.premisesType.replace(/_/g, ' ')}</span>}
                    {p.regionCode   && <span className={s.premisesCardRegion}>{p.regionCode}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {form.originPremisesId && (
        <div className={s.restrictionNotice}>
          <AlertTriangle size={13} />
          Check for active health restrictions on this premises before submitting.
        </div>
      )}

      {/* Batch accordion + animal checkboxes */}
      {form.originPremisesId && (
        <div className={s.fieldGroup}>
          <div className={s.animalListHeader}>
            <label className={s.sectionLabel}>Select Animals to Move</label>
            {totalSelected > 0 && (
              <span className={s.selectionCount}>
                <strong>{totalSelected}</strong> selected
              </span>
            )}
          </div>

          {loadingBatches ? (
            <div className={s.loadingRow}><Loader size={14} className={s.spinIcon} /> Loading batches…</div>
          ) : batchesError ? (
            <div className={s.inlineError}><AlertTriangle size={13} /> {batchesError}</div>
          ) : batches.length === 0 ? (
            <p className={s.hintText}>No active batches found at this premises.</p>
          ) : (
            <div className={s.batchList}>
              {batches.map(b => {
                const expanded = expandedBatchIds.has(b.id);
                const loading  = loadingBatchAnimals[b.id] ?? false;
                const animals  = batchAnimals[b.id];
                const selCount = countInBatch(b.id);
                const allSel   = animals != null && animals.length > 0 && selCount === animals.length;
                const sc = SPECIES_COLOR[b.species?.toUpperCase()] ?? { bg: '#f3f4f6', color: '#374151' };

                return (
                  <div key={b.id} className={`${s.batchItem} ${selCount > 0 ? s.batchItemHasSelection : ''}`}>
                    {/* Clickable header */}
                    <div
                      className={s.batchItemHeader}
                      onClick={() => onToggleBatchExpand(b.id)}
                      role="button"
                      aria-expanded={expanded}
                    >
                      <div className={s.batchIconWrap} style={{ background: sc.bg }}>
                        <Users size={16} style={{ color: sc.color }} />
                      </div>
                      <div className={s.batchItemInfo}>
                        <div className={s.batchItemNameRow}>
                          <span className={s.batchItemName}>{b.batchName || b.batchCode}</span>
                          <span className={s.batchItemCodeBadge}>{b.batchCode}</span>
                        </div>
                        <div className={s.batchItemMeta}>
                          <span className={s.batchSpeciesBadge} style={{ background: sc.bg, color: sc.color }}>
                            {b.species}
                          </span>
                          {b.breed && <span className={s.batchBreed}>{b.breed}</span>}
                          <span className={s.batchTotalCount}>{animals != null ? animals.length : b.count} animals</span>
                        </div>
                      </div>
                      {selCount > 0 && (
                        <span className={s.batchSelCount}>{selCount} selected</span>
                      )}
                      <div className={s.batchExpandIcon}>
                        {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                      </div>
                    </div>

                    {/* Expanded: animal list */}
                    {expanded && (
                      <div className={s.batchItemBody}>
                        {loading ? (
                          <div className={s.loadingRow}>
                            <Loader size={13} className={s.spinIcon} /> Loading animals…
                          </div>
                        ) : !animals || animals.length === 0 ? (
                          <p className={s.hintText} style={{ margin: 0 }}>No animals registered in this batch.</p>
                        ) : (
                          <>
                            <div className={s.batchSelectActions}>
                              <button
                                type="button"
                                className={s.selectAllBtn}
                                onClick={() => allSel ? clearBatch(b.id) : selectAllInBatch(b.id)}
                              >
                                {allSel ? 'Deselect all' : 'Select all'} in batch
                              </button>
                              <span className={s.batchSelectCount}>{selCount} / {animals.length}</span>
                            </div>
                            <div className={s.animalInlineList}>
                              {animals.map(a => {
                                const checked = form.selectedAnimalIds.includes(a.id);
                                return (
                                  <label
                                    key={a.id}
                                    className={`${s.animalItem} ${checked ? s.animalItemChecked : ''}`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleAnimal(a.id)}
                                      className={s.animalCheckbox}
                                    />
                                    <span className={s.animalTagId}>{a.tagId}</span>
                                    <span className={s.animalMeta}>
                                      {[a.sex, a.breed].filter(Boolean).join(' · ')}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {totalSelected > 0 && (
            <div className={s.selectionSummary}>
              <strong>{totalSelected}</strong> animal{totalSelected !== 1 ? 's' : ''} selected
              {batchesWithSel > 0 && ` across ${batchesWithSel} batch${batchesWithSel !== 1 ? 'es' : ''}`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Step 2 ────────────────────────────────────────────────────────────────────

interface Step2Props {
  form: MovementForm;
  onChange: (patch: Partial<MovementForm>) => void;
  destLookupLoading: boolean;
  destLookupFound: boolean | null;
  destType?: 'premises' | 'quarantine';
}

function DestinationMap({ lat, lng, name }: { lat: number; lng: number; name: string }) {
  const ref    = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current, { center: [lat, lng], zoom: 13, attributionControl: false, zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(map);
    L.marker([lat, lng], {
      icon: L.divIcon({
        className: '',
        html: `<div style="width:16px;height:16px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 3px #93c5fd,0 2px 10px rgba(37,99,235,0.5);"></div>`,
        iconSize: [16, 16], iconAnchor: [8, 8],
      }),
    }).bindTooltip(name, { permanent: true, direction: 'top', offset: [0, -14] }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [lat, lng, name]);

  return <div ref={ref} className={s.destMapBox} />;
}

interface DestOption { code: string; name: string; type: string; address?: string; lat?: number | null; lng?: number | null; }

function inferMovementType(facilityType: string): { movementTypeCode: string; purpose: string } {
  const t = facilityType.toUpperCase();
  if (t.includes('QUARANTINE'))               return { movementTypeCode: 'F2Q', purpose: 'Quarantine' };
  if (t.includes('SLAUGHTER'))                return { movementTypeCode: 'Q2S', purpose: 'Slaughter' };
  if (t.includes('MARKET'))                   return { movementTypeCode: 'F2M', purpose: 'Market' };
  if (t.includes('VETERINARY') || t.includes('VET')) return { movementTypeCode: 'P2V', purpose: 'Veterinary Treatment' };
  if (t.includes('EXPORT'))                   return { movementTypeCode: 'EXP', purpose: 'Export' };
  return { movementTypeCode: 'P2P', purpose: 'Transfer' };
}

function Step2({ form, onChange, destLookupLoading, destLookupFound, destType }: Step2Props) {
  const autoFilled = destLookupFound === true;

  const [allDests,     setAllDests]     = useState<DestOption[]>([]);
  const [showDrop,     setShowDrop]     = useState(false);
  const [destsLoading, setDestsLoading] = useState(false);

  useEffect(() => {
    setDestsLoading(true);
    if (destType === 'quarantine') {
      supabase
        .from('facilities')
        .select('facility_code, facility_name, facility_type, location_address, latitude, longitude')
        .eq('facility_type', 'QUARANTINE_STATION')
        .order('facility_name')
        .then(({ data }) => {
          setAllDests((data ?? []).map((r: any) => ({ code: r.facility_code, name: r.facility_name, type: 'Quarantine Station', address: r.location_address ?? '', lat: Number(r.latitude) || null, lng: Number(r.longitude) || null })));
          setDestsLoading(false);
        });
    } else if (destType === 'premises') {
      supabase
        .from('farmer_premises')
        .select('premises_code, premises_name, premises_type, physical_address, gps_latitude, gps_longitude')
        .order('premises_name')
        .then(({ data }) => {
          setAllDests((data ?? []).map((r: any) => ({ code: r.premises_code, name: r.premises_name, type: (r.premises_type ?? 'PREMISES').replace(/_/g, ' '), address: r.physical_address ?? '', lat: Number(r.gps_latitude) || null, lng: Number(r.gps_longitude) || null })));
          setDestsLoading(false);
        });
    } else {
      Promise.all([
        supabase.from('farmer_premises').select('premises_code, premises_name, premises_type, physical_address, gps_latitude, gps_longitude').order('premises_name'),
        supabase.from('facilities').select('facility_code, facility_name, facility_type, location_address, latitude, longitude').order('facility_name'),
      ]).then(([pRes, fRes]) => {
        const premises   = (pRes.data ?? []).map((r: any) => ({ code: r.premises_code, name: r.premises_name, type: (r.premises_type ?? 'PREMISES').replace(/_/g, ' '), address: r.physical_address ?? '', lat: Number(r.gps_latitude) || null, lng: Number(r.gps_longitude) || null }));
        const facilities = (fRes.data ?? []).map((r: any) => ({ code: r.facility_code, name: r.facility_name, type: (r.facility_type ?? 'FACILITY').replace(/_/g, ' '), address: r.location_address ?? '', lat: Number(r.latitude) || null, lng: Number(r.longitude) || null }));
        setAllDests([...premises, ...facilities]);
        setDestsLoading(false);
      });
    }
  }, [destType]);

  const query    = form.destinationPremisesCode.trim().toLowerCase();
  const filtered = allDests.filter(d =>
    query.length === 0 ||
    d.code.toLowerCase().includes(query) ||
    d.name.toLowerCase().includes(query)
  );

  return (
    <div className={s.stepContent}>

      <div className={s.fieldGroup}>
        <label className={s.sectionLabel}>Movement Type <span className={s.required}>*</span></label>
        <select
          className={s.select}
          value={form.movementTypeCode}
          onChange={e => {
            const code = e.target.value;
            const autoPurpose = MOVEMENT_TYPE_PURPOSE[code];
            onChange({ movementTypeCode: code, ...(autoPurpose ? { purpose: autoPurpose } : {}) });
          }}
        >
          <option value="">Select movement type…</option>
          {MOVEMENT_TYPES.map(mt => (
            <option key={mt.code} value={mt.code}>{mt.code} — {mt.label}</option>
          ))}
        </select>
      </div>

      <div className={s.fieldGroup}>
        <label className={s.sectionLabel}>Purpose <span className={s.required}>*</span></label>
        <select
          className={s.select}
          value={form.purpose}
          onChange={e => onChange({ purpose: e.target.value })}
        >
          <option value="">Select purpose…</option>
          {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        {form.movementTypeCode && form.purpose && (
          <span className={s.autoFillHint}>Auto-filled from movement type — you can change it</span>
        )}
      </div>

      <div className={s.fieldGroup}>
        <label className={s.sectionLabel}>Destination Farm Code <span className={s.required}>*</span></label>
        <input
          type="text"
          className={s.input}
          placeholder={destsLoading ? 'Loading…' : 'Search by code or name…'}
          value={form.destinationPremisesCode}
          onChange={e => onChange({ destinationPremisesCode: e.target.value.toUpperCase() })}
          onFocus={() => setShowDrop(true)}
          onBlur={() => setTimeout(() => setShowDrop(false), 150)}
          autoComplete="off"
        />
        {(showDrop || destsLoading) && (
          <div className={s.destDropdown}>
            {destsLoading ? (
              <div className={s.destDropItem}><Loader size={13} className={s.spinIcon} /> Loading…</div>
            ) : filtered.length === 0 ? (
              <div className={s.destDropItem} style={{ color: '#94a3b8', fontStyle: 'italic' }}>No results found</div>
            ) : filtered.map(d => (
              <div
                key={d.code}
                className={`${s.destDropItem} ${form.destinationPremisesCode === d.code ? s.destDropItemSel : ''}`}
                onMouseDown={() => {
                  onChange({
                    destinationPremisesCode: d.code,
                    destinationPremisesName: d.name,
                    destinationAddress:      d.address ?? '',
                    destinationLat:          d.lat ?? null,
                    destinationLng:          d.lng ?? null,
                    ...inferMovementType(d.type),
                  });
                  setShowDrop(false);
                }}
              >
                <span className={s.destDropCode}>{d.code}</span>
                <span className={s.destDropName}>{d.name}</span>
                <span className={s.destDropType}>{d.type}</span>
              </div>
            ))}
          </div>
        )}
        {destLookupLoading && (
          <span className={s.lookupStatus}><Loader size={12} className={s.spinIcon} /> Looking up…</span>
        )}
        {!destLookupLoading && destLookupFound === true && (
          <span className={`${s.lookupStatus} ${s.lookupStatusFound}`}><CheckCircle size={12} /> Found — details filled automatically</span>
        )}
        {!destLookupLoading && destLookupFound === false && (
          <span className={`${s.lookupStatus} ${s.lookupStatusNotFound}`}><MapPin size={12} /> Not in registry — enter name and address manually</span>
        )}
      </div>

      <div className={s.fieldRow}>
        <div className={s.fieldGroup}>
          <label className={s.sectionLabel}>Destination Name</label>
          <input
            type="text"
            className={`${s.input}${autoFilled ? ' ' + s.inputReadonly : ''}`}
            placeholder="Farm name"
            value={form.destinationPremisesName}
            readOnly={autoFilled}
            onChange={e => onChange({ destinationPremisesName: e.target.value })}
          />
        </div>
        <div className={s.fieldGroup}>
          <label className={s.sectionLabel}>Address</label>
          <input
            type="text"
            className={`${s.input}${autoFilled ? ' ' + s.inputReadonly : ''}`}
            placeholder="Physical address"
            value={form.destinationAddress}
            readOnly={autoFilled}
            onChange={e => onChange({ destinationAddress: e.target.value })}
          />
        </div>
      </div>

      {form.destinationLat != null && form.destinationLng != null && (
        <DestinationMap
          lat={form.destinationLat}
          lng={form.destinationLng}
          name={form.destinationPremisesName || form.destinationPremisesCode}
        />
      )}

      <div className={s.fieldRow}>
        <div className={s.fieldGroup}>
          <label className={s.sectionLabel}>Planned Departure Date <span className={s.required}>*</span></label>
          <input
            type="date"
            className={s.input}
            min={today()}
            value={form.plannedDepartureDate}
            onChange={e => {
              const dep = e.target.value;
              onChange({ plannedDepartureDate: dep, plannedArrivalDate: dep });
            }}
          />
        </div>
        <div className={s.fieldGroup}>
          <label className={s.sectionLabel}>Planned Arrival Date <span className={s.required}>*</span></label>
          <input
            type="date"
            className={s.input}
            min={form.plannedDepartureDate || today()}
            value={form.plannedArrivalDate}
            onChange={e => onChange({ plannedArrivalDate: e.target.value })}
          />
          {form.plannedDepartureDate && form.plannedArrivalDate === form.plannedDepartureDate && (
            <span className={s.autoFillHint}>Same-day arrival — adjust if needed</span>
          )}
        </div>
      </div>

      <div className={s.fieldGroup}>
        <label className={s.sectionLabel}>Reason for Request <span className={s.required}>*</span></label>
        <textarea
          className={s.textarea}
          rows={3}
          placeholder="Explain why you are making this movement request. e.g. Selling 10 cattle at Mogadishu market, buyer already agreed."
          value={form.requestReason}
          onChange={e => onChange({ requestReason: e.target.value })}
        />
      </div>
    </div>
  );
}

// ── Step 3 ────────────────────────────────────────────────────────────────────

interface Step3Props {
  form: MovementForm;
  onChange: (patch: Partial<MovementForm>) => void;
}

function Step3({ form, onChange }: Step3Props) {
  return (
    <div className={s.stepContent}>
      <div className={s.fieldGroup}>
        <label className={s.sectionLabel}>Vehicle Plate Number <span className={s.required}>*</span></label>
        <input
          type="text"
          className={s.input}
          placeholder="e.g. SOM-1234-AB"
          value={form.vehicleRegistration}
          onChange={e => onChange({ vehicleRegistration: e.target.value.toUpperCase() })}
        />
      </div>

      <div className={s.fieldGroup}>
        <label className={s.sectionLabel}>Driver / Transporter Name <span className={s.optional}>(optional)</span></label>
        <input
          type="text"
          className={s.input}
          placeholder="Name of the driver or transporter"
          value={form.transporterName}
          onChange={e => onChange({ transporterName: e.target.value })}
        />
      </div>

      <div className={s.fieldGroup}>
        <label className={s.sectionLabel}>Route Notes <span className={s.optional}>(optional)</span></label>
        <textarea
          className={s.textarea}
          rows={3}
          placeholder="Describe the planned route, checkpoints, or any stops…"
          value={form.routeDescription}
          onChange={e => onChange({ routeDescription: e.target.value })}
        />
      </div>
    </div>
  );
}

// ── Step 4 ────────────────────────────────────────────────────────────────────

interface Step4Props {
  form: MovementForm;
  batches: Batch[];
  batchAnimals: Record<string, Animal[]>;
}

function Step4({ form, batches, batchAnimals }: Step4Props) {
  const allAnimals     = Object.values(batchAnimals).flat();
  const selectedAnimals = allAnimals.filter(a => form.selectedAnimalIds.includes(a.id));
  const speciesBreakdown = animalSpeciesSummary(selectedAnimals);
  const speciesText    = Object.entries(speciesBreakdown).map(([sp, cnt]) => `${cnt} ${sp}`).join(', ') || '—';
  const mvType         = MOVEMENT_TYPES.find(m => m.code === form.movementTypeCode);

  const batchBreakdown = batches
    .map(b => {
      const animals = batchAnimals[b.id] ?? [];
      const selIds  = new Set(form.selectedAnimalIds);
      return { batch: b, selCount: animals.filter(a => selIds.has(a.id)).length };
    })
    .filter(x => x.selCount > 0);

  return (
    <div className={s.stepContent}>
      <p className={s.reviewIntro}>
        Review your movement request before submitting. Once submitted it will be reviewed by the livestock authority.
      </p>

      <div className={s.reviewSection}>
        <div className={s.reviewSectionTitle}>Origin Farm</div>
        <div className={s.reviewRow}><span className={s.reviewKey}>Name</span><span className={s.reviewVal}>{form.originPremisesName}</span></div>
        <div className={s.reviewRow}><span className={s.reviewKey}>Code</span><span className={s.reviewVal}><code className={s.monoCode}>{form.originPremisesCode}</code></span></div>
        <div className={s.reviewRow}><span className={s.reviewKey}>Region</span><span className={s.reviewVal}>{form.originRegionCode}</span></div>
      </div>

      <div className={s.reviewSection}>
        <div className={s.reviewSectionTitle}>Animals Selected</div>
        <div className={s.reviewRow}><span className={s.reviewKey}>Total Animals</span><span className={s.reviewVal}>{form.selectedAnimalIds.length}</span></div>
        <div className={s.reviewRow}><span className={s.reviewKey}>Species</span><span className={s.reviewVal}>{speciesText}</span></div>
        {batchBreakdown.map(({ batch, selCount }) => (
          <div key={batch.id} className={s.reviewRow}>
            <span className={s.reviewKey}>{batch.batchCode}</span>
            <span className={s.reviewVal}>{batch.batchName} · {selCount} of {batch.count}</span>
          </div>
        ))}
      </div>

      <div className={s.reviewSection}>
        <div className={s.reviewSectionTitle}>Destination & Purpose</div>
        <div className={s.reviewRow}><span className={s.reviewKey}>Destination Code</span><span className={s.reviewVal}><code className={s.monoCode}>{form.destinationPremisesCode}</code></span></div>
        <div className={s.reviewRow}><span className={s.reviewKey}>Destination Name</span><span className={s.reviewVal}>{form.destinationPremisesName || '—'}</span></div>
        {form.destinationAddress && <div className={s.reviewRow}><span className={s.reviewKey}>Address</span><span className={s.reviewVal}>{form.destinationAddress}</span></div>}
        <div className={s.reviewRow}><span className={s.reviewKey}>Movement Type</span><span className={s.reviewVal}>{mvType ? `${mvType.code} — ${mvType.label}` : form.movementTypeCode}</span></div>
        <div className={s.reviewRow}><span className={s.reviewKey}>Purpose</span><span className={s.reviewVal}>{form.purpose}</span></div>
        {form.requestReason && <div className={s.reviewRow}><span className={s.reviewKey}>Reason</span><span className={s.reviewVal}>{form.requestReason}</span></div>}
      </div>

      <div className={s.reviewSection}>
        <div className={s.reviewSectionTitle}>Dates</div>
        <div className={s.reviewRow}><span className={s.reviewKey}>Departure</span><span className={s.reviewVal}>{form.plannedDepartureDate}</span></div>
        <div className={s.reviewRow}><span className={s.reviewKey}>Arrival</span><span className={s.reviewVal}>{form.plannedArrivalDate}</span></div>
      </div>

      <div className={s.reviewSection}>
        <div className={s.reviewSectionTitle}>Transport</div>
        <div className={s.reviewRow}><span className={s.reviewKey}>Vehicle Plate</span><span className={s.reviewVal}>{form.vehicleRegistration}</span></div>
        {form.transporterName && <div className={s.reviewRow}><span className={s.reviewKey}>Driver / Transporter</span><span className={s.reviewVal}>{form.transporterName}</span></div>}
        {form.routeDescription && <div className={s.reviewRow}><span className={s.reviewKey}>Route Notes</span><span className={s.reviewVal}>{form.routeDescription}</span></div>}
      </div>
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────

export function MovementRequestModal({ onClose, onSuccess, initialPremisesCode, destType }: Props) {
  const { userId, farmerName, farmerId } = useAuthStore();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<MovementForm>(() => ({
    ...EMPTY_FORM,
    movementTypeCode: destType === 'quarantine' ? 'F2Q' : destType === 'premises' ? 'P2P' : '',
    purpose:          destType === 'quarantine' ? 'Quarantine' : destType === 'premises' ? 'Transfer' : '',
  }));

  const [premises, setPremises]               = useState<OriginPremises[]>([]);
  const [loadingPremises, setLoadingPremises] = useState(false);
  const [premisesError, setPremisesError]     = useState('');

  const [batches, setBatches]               = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [batchesError, setBatchesError]     = useState('');

  const [expandedBatchIds, setExpandedBatchIds]         = useState<Set<string>>(new Set());
  const [batchAnimals, setBatchAnimals]                 = useState<Record<string, Animal[]>>({});
  const [loadingBatchAnimals, setLoadingBatchAnimals]   = useState<Record<string, boolean>>({});
  const loadedBatchIds                                  = useRef(new Set<string>());

  const [destLookupLoading, setDestLookupLoading] = useState(false);
  const [destLookupFound, setDestLookupFound]     = useState<boolean | null>(null);

  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successCode, setSuccessCode] = useState<string | null>(null);

  const overlayRef   = useRef<HTMLDivElement>(null);
  const firstFocusRef = useRef<HTMLButtonElement>(null);

  // Focus trap + Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    firstFocusRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // Load premises on mount
  useEffect(() => {
    if (!userId) return;
    setLoadingPremises(true);
    setPremisesError('');
    supabase
      .from('farmer_premises')
      .select('id, premises_code, premises_name, premises_type, region_code, status')
      .eq('user_id', userId)
      .order('premises_name', { ascending: true })
      .then(({ data, error }) => {
        setLoadingPremises(false);
        if (error) { setPremisesError(error.message); return; }
        const rows: OriginPremises[] = (data ?? []).map((r: any) => ({
          id: r.id,
          premisesCode: r.premises_code,
          premisesName: r.premises_name,
          premisesType: r.premises_type,
          regionCode: r.region_code,
          status: r.status,
        }));
        setPremises(rows);
        const autoSelect = initialPremisesCode
          ? rows.find(r => r.premisesCode === initialPremisesCode)
          : rows.length === 1 ? rows[0] : null;
        if (autoSelect) {
          setForm(f => ({
            ...f,
            originPremisesId:   autoSelect.id,
            originPremisesCode: autoSelect.premisesCode,
            originPremisesName: autoSelect.premisesName,
            originRegionCode:   autoSelect.regionCode,
          }));
        }
      });
  }, [userId]);

  // Load batches when premises changes; reset animal state
  useEffect(() => {
    if (!form.originPremisesCode || !userId) { setBatches([]); return; }
    setBatchAnimals({});
    setLoadingBatchAnimals({});
    setExpandedBatchIds(new Set());
    loadedBatchIds.current = new Set();

    setLoadingBatches(true);
    setBatchesError('');
    supabase
      .from('batches')
      .select('id, batch_code, batch_name, species, breed, count, status')
      .eq('premises_code', form.originPremisesCode)
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
      .then(async ({ data, error }) => {
        setLoadingBatches(false);
        if (error) { setBatchesError(error.message); return; }
        const rows = data ?? [];
        const batchIds = rows.map((r: any) => r.id as string);
        const actualCounts: Record<string, number> = {};
        if (batchIds.length > 0) {
          const { data: countRows } = await supabase
            .from('animals')
            .select('batch_id')
            .in('batch_id', batchIds);
          (countRows ?? []).forEach((a: any) => {
            if (a.batch_id) actualCounts[a.batch_id] = (actualCounts[a.batch_id] ?? 0) + 1;
          });
        }
        setBatches(rows.map((r: any) => ({
          id:        r.id,
          batchCode: r.batch_code ?? '',
          batchName: r.batch_name ?? r.batch_code ?? '',
          species:   r.species ?? '',
          breed:     r.breed ?? '',
          count:     actualCounts[r.id] ?? r.count ?? 0,
          status:    r.status ?? '',
        })));
      });
  }, [form.originPremisesCode, userId]);

  // Load animals for a specific batch (lazy, once per batch per premises selection)
  const loadBatchAnimals = useCallback(async (batchId: string) => {
    if (loadedBatchIds.current.has(batchId)) return;
    loadedBatchIds.current.add(batchId);
    setLoadingBatchAnimals(prev => ({ ...prev, [batchId]: true }));
    const { data } = await supabase
      .from('animals')
      .select('id, animal_code, species, breed, sex, tag_serial, batch_id')
      .eq('batch_id', batchId)
      .order('registered_at', { ascending: false });
    setLoadingBatchAnimals(prev => ({ ...prev, [batchId]: false }));
    setBatchAnimals(prev => ({
      ...prev,
      [batchId]: (data ?? []).map((r: any) => ({
        id:      r.id,
        tagId:   r.tag_serial ?? r.animal_code ?? r.id,
        species: r.species ?? '',
        breed:   r.breed ?? '',
        sex:     r.sex ?? '',
        batchId: r.batch_id ?? batchId,
      })),
    }));
  }, [userId]);

  const handleToggleBatchExpand = useCallback((batchId: string) => {
    setExpandedBatchIds(prev => {
      const next = new Set(prev);
      if (next.has(batchId)) {
        next.delete(batchId);
      } else {
        next.add(batchId);
        loadBatchAnimals(batchId);
      }
      return next;
    });
  }, [loadBatchAnimals]);

  // Auto-lookup destination premises by code (debounced) — checks farmer_premises then facilities
  useEffect(() => {
    const code = form.destinationPremisesCode.trim();
    if (code.length < 6) { setDestLookupFound(null); return; }

    const timer = setTimeout(async () => {
      setDestLookupLoading(true);

      // 1. Check farmer_premises
      const { data: premisesData } = await supabase
        .from('farmer_premises')
        .select('premises_name, physical_address, gps_latitude, gps_longitude')
        .eq('premises_code', code)
        .maybeSingle();

      if (premisesData) {
        setDestLookupLoading(false);
        setDestLookupFound(true);
        setForm(f => ({
          ...f,
          destinationPremisesName: (premisesData as any).premises_name ?? '',
          destinationAddress:      (premisesData as any).physical_address ?? '',
          destinationLat:          Number((premisesData as any).gps_latitude)  || null,
          destinationLng:          Number((premisesData as any).gps_longitude) || null,
        }));
        return;
      }

      // 2. Fall back to facilities (quarantine stations, slaughterhouses, etc.)
      const { data: facilityData } = await supabase
        .from('facilities')
        .select('facility_name, location_address, latitude, longitude')
        .eq('facility_code', code)
        .maybeSingle();

      setDestLookupLoading(false);

      if (facilityData) {
        setDestLookupFound(true);
        setForm(f => ({
          ...f,
          destinationPremisesName: (facilityData as any).facility_name ?? '',
          destinationAddress:      (facilityData as any).location_address ?? '',
          destinationLat:          Number((facilityData as any).latitude)  || null,
          destinationLng:          Number((facilityData as any).longitude) || null,
        }));
      } else {
        setDestLookupFound(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [form.destinationPremisesCode]);

  const patch = useCallback((p: Partial<MovementForm>) => setForm(f => ({ ...f, ...p })), []);

  const canProceed = (): boolean => {
    if (step === 1) return !!form.originPremisesId && form.selectedAnimalIds.length > 0;
    if (step === 2) return (
      !!form.movementTypeCode &&
      !!form.purpose &&
      !!form.destinationPremisesCode &&
      !!form.plannedDepartureDate &&
      !!form.plannedArrivalDate &&
      !!form.requestReason.trim()
    );
    if (step === 3) return !!form.vehicleRegistration;
    return true;
  };

  const handleNext = () => { if (step < 4) setStep(s => s + 1); };
  const handleBack = () => { if (step > 1) setStep(s => s - 1); };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError('');

    let movementCode = `MOV-DRAFT-${Date.now()}`;
    const { data: rpcData, error: rpcError } = await supabase.rpc('generate_movement_id', {
      p_region_code: form.originRegionCode,
    });
    if (!rpcError && rpcData) movementCode = rpcData as string;

    const allAnimals      = Object.values(batchAnimals).flat();
    const selectedAnimals = allAnimals.filter(a => form.selectedAnimalIds.includes(a.id));
    const speciesBreakdown = animalSpeciesSummary(selectedAnimals);
    const speciesNotesStr  = Object.entries(speciesBreakdown).map(([sp, cnt]) => `${cnt} ${sp}`).join(', ');

    const payload = {
      movement_code:             movementCode,
      status:                    'SUBMITTED',
      user_id:                   userId,
      origin_premises_code:      form.originPremisesCode,
      origin_premises_name:      form.originPremisesName,
      origin_region_code:        form.originRegionCode,
      destination_premises_code: form.destinationPremisesCode,
      destination_premises_name: form.destinationPremisesName || null,
      movement_type_code:        form.movementTypeCode,
      purpose:                   form.purpose,
      planned_departure_date:    form.plannedDepartureDate,
      planned_arrival_date:      form.plannedArrivalDate,
      vehicle_registration:      form.vehicleRegistration,
      transporter_name:          form.transporterName || '',
      route_description:         form.routeDescription || null,
      animal_ids:                form.selectedAnimalIds,
      animal_count:              form.selectedAnimalIds.length,
      species_notes:             speciesNotesStr || null,
      notes:                     form.requestReason.trim() || null,
    };

    const { error: insertError } = await supabase
      .from('farmer_movement_requests')
      .insert(payload);

    if (insertError) {
      setSubmitting(false);
      setSubmitError(insertError.message);
      return;
    }

    // When moving to quarantine, mark animals and batches as pending inspection
    if (form.movementTypeCode === 'F2Q' && form.selectedAnimalIds.length > 0) {
      await supabase.from('animals')
        .update({ status: 'PENDING_QUARANTINE' })
        .in('id', form.selectedAnimalIds);

      const affectedBatchIds = Object.entries(batchAnimals)
        .filter(([, animals]) => animals.some(a => form.selectedAnimalIds.includes(a.id)))
        .map(([batchId]) => batchId);
      if (affectedBatchIds.length > 0) {
        await supabase.from('batches')
          .update({ status: 'PENDING_QUARANTINE' })
          .in('id', affectedBatchIds);
      }
    }

    void logActivity({
      category:      'MOVEMENT',
      level:         'INFO',
      title:         'Movement request submitted',
      detail:        `${form.selectedAnimalIds.length} animals requested for movement — ${form.originPremisesCode ?? ''} → ${form.destinationPremisesCode}`,
      actorName:     farmerName ?? undefined,
      actorRole:     'Farmer',
      region:        form.originRegionCode,
      referenceCode: movementCode,
      userId:        userId,
      farmerId:      farmerId,
    });

    // Create review task(s) based on ministry movement_task_mode setting
    if (form.originRegionCode) {
      const { data: settingRow } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'movement_task_mode')
        .single();
      const mode = settingRow?.value ?? 'BOTH';

      const taskBase = {
        movement_code:             movementCode,
        region_code:               form.originRegionCode,
        status:                    'PENDING',
        origin_premises_code:      form.originPremisesCode,
        origin_premises_name:      form.originPremisesName,
        destination_premises_code: form.destinationPremisesCode,
        destination_premises_name: form.destinationPremisesName,
        animal_count:              form.selectedAnimalIds.length,
        movement_type_code:        form.movementTypeCode,
        purpose:                   form.purpose,
        planned_departure_date:    form.plannedDepartureDate,
        planned_arrival_date:      form.plannedArrivalDate,
        vehicle_registration:      form.vehicleRegistration,
        transporter_name:          form.transporterName || null,
        species_notes:             speciesNotesStr,
        request_reason:            form.requestReason.trim() || null,
      };

      const tasks = [];
      if (mode === 'FIELD_INSPECTOR' || mode === 'BOTH') tasks.push({ ...taskBase, task_role: 'FIELD_INSPECTOR' });
      if (mode === 'VETERINARY_OFFICER' || mode === 'BOTH') tasks.push({ ...taskBase, task_role: 'VETERINARY_OFFICER' });
      if (tasks.length > 0) {
        const { error: taskErr } = await supabase.from('movement_tasks').insert(tasks);
        if (taskErr) console.error('[MovementRequest] task insert failed:', taskErr.message, taskErr.details);
      }

      // Auto-assign pre-movement inspection to the regional field officer
      const { data: regionalOfficers } = await supabase
        .from('user_registrations')
        .select('id, full_name, role')
        .in('role', ['FIELD_INSPECTOR', 'VETERINARY_OFFICER'])
        .eq('region_code', form.originRegionCode);

      const fi       = regionalOfficers?.find(o => o.role === 'FIELD_INSPECTOR');
      const vet      = regionalOfficers?.find(o => o.role === 'VETERINARY_OFFICER');
      const assignee = fi ?? vet;

      if (assignee) {
        const assigneeId   = assignee.id as string;
        const assigneeName = assignee.full_name as string;
        const assigneeRole = assignee.role as string;

        let inspCode = `INS-${form.originRegionCode.toUpperCase().slice(0, 3)}-${new Date().getFullYear().toString().slice(2)}-${String(Date.now()).slice(-4)}`;
        const { data: rpcCode } = await supabase.rpc('generate_inspection_code', { p_region: form.originRegionCode });
        if (rpcCode) inspCode = rpcCode as string;

        await supabase.from('movement_inspections').insert({
          inspection_code:           inspCode,
          movement_code:             movementCode,
          assigned_to_id:            assigneeId,
          assigned_to_name:          assigneeName,
          assigned_to_role:          assigneeRole,
          origin_premises_code:      form.originPremisesCode,
          origin_premises_name:      form.originPremisesName,
          origin_region_code:        form.originRegionCode,
          destination_premises_code: form.destinationPremisesCode,
          destination_premises_name: form.destinationPremisesName || null,
          farmer_user_id:            userId,
          animal_count:              form.selectedAnimalIds.length,
          animal_ids:                form.selectedAnimalIds,
          species_summary:           speciesNotesStr || null,
          purpose:                   form.purpose,
          planned_departure_date:    form.plannedDepartureDate || null,
          region_code:               form.originRegionCode,
        });

        await supabase.from('farmer_movement_requests')
          .update({ status: 'INSPECTION_ASSIGNED' })
          .eq('movement_code', movementCode);
      }
    }

    setSubmitting(false);
    setSuccessCode(movementCode);
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) onClose();
  };

  // ── Success state ──────────────────────────────────────────────────────────
  if (successCode) {
    return (
      <div className={s.overlay} ref={overlayRef} onClick={handleOverlayClick} role="dialog" aria-modal="true" aria-label="Movement request submitted">
        <div className={s.modal}>
          <div className={s.modalHeader}>
            <span className={s.modalTitle}>Request Animal Movement</span>
            <button className={s.closeBtn} onClick={() => onSuccess(successCode!)} aria-label="Close">&times;</button>
          </div>
          <div className={s.body}>
            <div className={s.successState}>
              <div className={s.successIcon}>
                <CheckCircle size={48} />
              </div>
              <h2 className={s.successHeading}>Movement Request Submitted</h2>
              <div className={s.successCode}>{successCode}</div>
              <p className={s.successMessage}>
                Your request has been submitted for approval. You will be notified when it is reviewed by the livestock authority.
              </p>
              <button className={s.submitBtn} onClick={() => onSuccess(successCode!)}>Close</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Normal modal ───────────────────────────────────────────────────────────
  return (
    <div
      className={s.overlay}
      ref={overlayRef}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label="Request animal movement"
    >
      <div className={s.modal}>
        <div className={s.modalHeader}>
          <div className={s.modalTitleGroup}>
            <span className={s.modalTitle}>Request Animal Movement</span>
            <span className={s.modalStepLabel}>Step {step} of 4 — {STEP_LABELS[step - 1]}</span>
          </div>
          <button
            ref={firstFocusRef}
            className={s.closeBtn}
            onClick={onClose}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        <StepIndicator step={step} />

        <div className={s.body}>
          {step === 1 && (
            <Step1
              form={form}
              premises={premises}
              batches={batches}
              loadingPremises={loadingPremises}
              loadingBatches={loadingBatches}
              premisesError={premisesError}
              batchesError={batchesError}
              onChange={patch}
              locked={!!initialPremisesCode}
              expandedBatchIds={expandedBatchIds}
              onToggleBatchExpand={handleToggleBatchExpand}
              batchAnimals={batchAnimals}
              loadingBatchAnimals={loadingBatchAnimals}
            />
          )}
          {step === 2 && <Step2 form={form} onChange={patch} destLookupLoading={destLookupLoading} destLookupFound={destLookupFound} destType={destType} />}
          {step === 3 && <Step3 form={form} onChange={patch} />}
          {step === 4 && <Step4 form={form} batches={batches} batchAnimals={batchAnimals} />}

          {submitError && (
            <div className={s.inlineError} style={{ marginTop: '0.75rem' }}>
              <AlertTriangle size={13} /> {submitError}
            </div>
          )}
        </div>

        <div className={s.footer}>
          <div className={s.footerLeft}>
            {step > 1 && (
              <button className={s.backBtn} onClick={handleBack} disabled={submitting}>
                Back
              </button>
            )}
          </div>
          <div className={s.footerRight}>
            {step < 4 ? (
              <button className={s.submitBtn} onClick={handleNext} disabled={!canProceed()}>
                Next
              </button>
            ) : (
              <button
                className={s.submitBtn}
                onClick={handleSubmit}
                disabled={submitting || !canProceed()}
              >
                {submitting ? (
                  <><Loader size={13} className={s.spinIcon} /> Submitting…</>
                ) : (
                  'Submit for Approval'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MovementRequestModal;
