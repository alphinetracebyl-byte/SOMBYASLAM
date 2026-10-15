import { useState, useRef, useEffect } from 'react';
import {
  ScanLine, CheckCircle, XCircle, AlertTriangle, RefreshCw,
  Search, Tag, MapPin, User, Clock, Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MovementInfo {
  permitRef:     string;
  from:          string;
  to:            string;
  purpose:       string;
  departureDate: string | null;
  arrivalDate:   string | null;
  status:        string;
}

interface AnimalRecord {
  animalId:     string;
  tagSerial:    string;
  species:      string;
  breed:        string;
  sex:          string;
  ageMonths:    number | null;
  weightKg:     number | null;
  ownerName:    string;
  premisesCode: string;
  premisesName: string;
  region:       string;
  status:       string;
  movement?:    MovementInfo;
  healthFlags:  string[];
}

interface ScanLog {
  serial:   string;
  result:   'found' | 'not_found';
  time:     string;
  cleared?: boolean;
}

// ── Supabase lookup ───────────────────────────────────────────────────────────

async function lookupByTag(tagSerial: string): Promise<AnimalRecord | null> {
  // 1. Animal record
  const { data: animals } = await supabase
    .from('animals')
    .select('id, animal_code, species, breed, sex, age_months, weight_kg, status, tag_serial, current_premises_id')
    .ilike('tag_serial', tagSerial)
    .limit(1);

  const animal = animals?.[0];
  if (!animal) return null;

  // 2. Premises + farmer (parallel)
  const [premisesRes, movementRes] = await Promise.all([
    supabase
      .from('farmer_premises')
      .select('premises_code, premises_name, region_code, farmer_id')
      .eq('premises_code', animal.current_premises_id)
      .limit(1),
    supabase
      .from('farmer_movement_requests')
      .select('movement_code, status, origin_premises_code, origin_premises_name, destination_premises_code, destination_premises_name, purpose, planned_departure_date, planned_arrival_date')
      .or(`origin_premises_code.eq.${animal.current_premises_id},destination_premises_code.eq.${animal.current_premises_id}`)
      .in('status', ['APPROVED', 'PERMIT_ISSUED', 'IN_TRANSIT', 'DEPARTURE_CONFIRMED'])
      .order('created_at', { ascending: false })
      .limit(1),
  ]);

  const premises = premisesRes.data?.[0];

  // 3. Farmer name
  let ownerName = '—';
  if (premises?.farmer_id) {
    const { data: farmers } = await supabase
      .from('farmers')
      .select('full_name')
      .eq('id', premises.farmer_id)
      .limit(1);
    if (farmers?.[0]?.full_name) ownerName = farmers[0].full_name;
  }

  // 4. Movement info
  let movement: MovementInfo | undefined;
  const permit = movementRes.data?.[0];
  if (permit) {
    movement = {
      permitRef:     permit.movement_code,
      from:          permit.origin_premises_name ?? permit.origin_premises_code ?? '—',
      to:            permit.destination_premises_name ?? permit.destination_premises_code ?? '—',
      purpose:       permit.purpose ?? 'Movement',
      departureDate: permit.planned_departure_date ?? null,
      arrivalDate:   permit.planned_arrival_date ?? null,
      status:        permit.status,
    };
  }

  // 5. Health flags
  const healthFlags: string[] = [];
  if (animal.status === 'RESTRICTED')  healthFlags.push('Movement restricted by authority');
  if (animal.status === 'QUARANTINED') healthFlags.push('Animal is under active quarantine');
  if (animal.status === 'SICK')        healthFlags.push('Animal flagged as sick');
  if (animal.status === 'DEAD')        healthFlags.push('Animal is deceased — no movement');
  if (animal.status === 'SUSPENDED')   healthFlags.push('Animal registration suspended');

  return {
    animalId:     animal.animal_code ?? animal.id,
    tagSerial:    animal.tag_serial,
    species:      animal.species,
    breed:        animal.breed ?? '—',
    sex:          animal.sex ?? '—',
    ageMonths:    animal.age_months ?? null,
    weightKg:     animal.weight_kg ?? null,
    ownerName,
    premisesCode: premises?.premises_code ?? animal.current_premises_id ?? '—',
    premisesName: premises?.premises_name ?? '—',
    region:       premises?.region_code ?? '—',
    status:       animal.status,
    movement,
    healthFlags,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SPECIES_EMOJI: Record<string, string> = {
  CATTLE: '🐄', Cattle: '🐄',
  CAMEL:  '🐪', Camel:  '🐪',
  GOAT:   '🐐', Goat:   '🐐',
  SHEEP:  '🐑', Sheep:  '🐑',
};

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const PERMIT_STATUS_LABEL: Record<string, string> = {
  APPROVED:             'APPROVED',
  PERMIT_ISSUED:        'PERMIT ISSUED',
  IN_TRANSIT:           'IN TRANSIT',
  DEPARTURE_CONFIRMED:  'DEPARTED',
};

// ── Component ─────────────────────────────────────────────────────────────────

export function CheckpointScanPage(): JSX.Element {
  const [query,     setQuery]     = useState('');
  const [record,    setRecord]    = useState<AnimalRecord | null>(null);
  const [notFound,  setNotFound]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [cleared,   setCleared]   = useState<boolean | null>(null);
  const [log,       setLog]       = useState<ScanLog[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function scan(serial: string) {
    const q = serial.trim();
    if (!q || loading) return;
    setLoading(true);
    setRecord(null);
    setNotFound(false);
    setCleared(null);

    const found = await lookupByTag(q);
    setRecord(found);
    setNotFound(!found);
    setLoading(false);
    setLog(prev => [
      { serial: q.toUpperCase(), result: found ? 'found' : 'not_found', time: new Date().toLocaleTimeString() },
      ...prev.slice(0, 19),
    ]);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { void scan(query); }
  }

  function clearAnimal() {
    setCleared(true);
    setLog(prev => prev.map((l, i) => i === 0 ? { ...l, cleared: true } : l));
  }

  function flagAnimal() {
    setCleared(false);
    setLog(prev => prev.map((l, i) => i === 0 ? { ...l, cleared: false } : l));
  }

  function reset() {
    setQuery('');
    setRecord(null);
    setNotFound(false);
    setCleared(null);
    inputRef.current?.focus();
  }

  const hasRestriction = record && (
    ['RESTRICTED', 'QUARANTINED', 'SICK', 'DEAD', 'SUSPENDED'].includes(record.status) ||
    record.healthFlags.length > 0
  );
  const hasValidPermit = !!record?.movement;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontFamily: "'Inter',system-ui,sans-serif" }}>
      <div>
        <h1 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: 0 }}>Checkpoint Tag Scanner</h1>
        <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: '0.2rem 0 0' }}>
          Scan or enter an RFID / ear tag number to instantly verify an animal
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.25rem', alignItems: 'start' }}>

        {/* ── Main panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Scan input */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '1.75rem', boxShadow: '0 1px 4px rgba(0,0,0,.09)', border: '2px solid #e0e7ff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <ScanLine size={22} color="#4f46e5" strokeWidth={1.75} />
              <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#1e1b4b' }}>Scan Tag</span>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="RFID-YYYY-NNNNN or EAR-YYYY-NNNNN"
                style={{ flex: 1, border: '2px solid #e5e7eb', borderRadius: 10, padding: '0.875rem 1rem', fontSize: '1.0625rem', fontFamily: 'monospace', outline: 'none', letterSpacing: '0.03em', color: '#111827' }}
                autoComplete="off"
              />
              <button
                onClick={() => void scan(query)}
                disabled={loading}
                style={{ background: loading ? '#a5b4fc' : '#4f46e5', color: '#fff', border: 'none', borderRadius: 10, padding: '0 1.5rem', fontWeight: 700, fontSize: '0.9375rem', cursor: loading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={16} />}
                {loading ? 'Looking up…' : 'Verify'}
              </button>
              {(record || notFound) && !loading && (
                <button onClick={reset} style={{ background: '#f3f4f6', color: '#6b7280', border: 'none', borderRadius: 10, padding: '0 1rem', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <RefreshCw size={14} />Clear
                </button>
              )}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>Press Enter or click Verify to look up the tag in QXLITS</div>
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 14, padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <Loader2 size={28} color="#2563eb" strokeWidth={1.5} style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e40af' }}>Checking QXLITS database…</div>
                <div style={{ fontSize: '0.8125rem', color: '#3b82f6', marginTop: '0.2rem' }}>Looking up tag <code style={{ fontFamily: 'monospace' }}>{query.trim().toUpperCase()}</code></div>
              </div>
            </div>
          )}

          {/* Not found */}
          {notFound && !loading && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 14, padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <XCircle size={36} color="#dc2626" strokeWidth={1.5} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#991b1b' }}>Tag Not Found</div>
                <div style={{ fontSize: '0.875rem', color: '#b91c1c', marginTop: '0.25rem' }}>
                  No animal registered with tag <code style={{ background: '#fee2e2', padding: '0 0.3rem', borderRadius: 4 }}>{query.trim().toUpperCase()}</code>.
                  Do not allow movement — flag for manual inspection.
                </div>
              </div>
            </div>
          )}

          {/* Found */}
          {record && !loading && (
            <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,.09)', overflow: 'hidden' }}>

              {/* Status banner */}
              {cleared === true && (
                <div style={{ background: '#dcfce7', padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.625rem', borderBottom: '1px solid #bbf7d0' }}>
                  <CheckCircle size={18} color="#166534" />
                  <span style={{ fontWeight: 700, color: '#166534' }}>CLEARED — Animal may proceed</span>
                </div>
              )}
              {cleared === false && (
                <div style={{ background: '#fef2f2', padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.625rem', borderBottom: '1px solid #fecaca' }}>
                  <AlertTriangle size={18} color="#991b1b" />
                  <span style={{ fontWeight: 700, color: '#991b1b' }}>FLAGGED — Animal held for inspection</span>
                </div>
              )}
              {hasRestriction && cleared === null && (
                <div style={{ background: '#fef3c7', padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.625rem', borderBottom: '1px solid #fde68a' }}>
                  <AlertTriangle size={18} color="#92400e" />
                  <span style={{ fontWeight: 700, color: '#92400e' }}>RESTRICTION DETECTED — Review before clearing</span>
                </div>
              )}
              {!hasRestriction && cleared === null && (
                <div style={{ background: '#f0fdf4', padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.625rem', borderBottom: '1px solid #bbf7d0' }}>
                  <CheckCircle size={18} color="#16a34a" />
                  <span style={{ fontWeight: 600, color: '#15803d' }}>
                    Animal found — {hasValidPermit ? 'active movement permit present' : 'no active movement permit'}
                  </span>
                </div>
              )}

              <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

                {/* Identity */}
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>
                    Animal Identity
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {([
                      ['Animal ID',  record.animalId,  true ],
                      ['Tag Serial', record.tagSerial, true ],
                      ['Species',    `${SPECIES_EMOJI[record.species] ?? '🐾'} ${record.species}`, false],
                      ['Breed',      record.breed,     false],
                      ['Sex',        record.sex === 'M' ? 'Male' : record.sex === 'F' ? 'Female' : record.sex, false],
                      ['Age',        record.ageMonths ? `${record.ageMonths} months` : '—', false],
                      ['Weight',     record.weightKg ? `${record.weightKg} kg` : '—', false],
                      ['Status',     record.status,   false],
                    ] as [string, string, boolean][]).map(([k, v, mono]) => (
                      <div key={k} style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
                        <span style={{ fontSize: '0.8rem', color: '#9ca3af', minWidth: 90, flexShrink: 0 }}>{k}</span>
                        <span style={{
                          fontSize: '0.875rem',
                          color: (k === 'Status' && ['RESTRICTED','QUARANTINED','SICK','DEAD'].includes(record.status)) ? '#b91c1c' : '#111827',
                          fontWeight: 600,
                          fontFamily: mono ? 'monospace' : 'inherit',
                        }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Owner, permit, health */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                  {/* Owner & Premises */}
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>
                      Owner &amp; Premises
                    </div>
                    <div style={{ background: '#f8fafc', borderRadius: 10, padding: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <User size={13} color="#6b7280" />
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>{record.ownerName}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', fontSize: '0.8125rem', color: '#374151', marginTop: '0.35rem' }}>
                        <MapPin size={12} color="#6b7280" />
                        {record.premisesName} · <code style={{ fontSize: '0.75rem', color: '#6b7280' }}>{record.premisesCode}</code>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>{record.region}</div>
                    </div>
                  </div>

                  {/* Movement permit */}
                  {record.movement ? (
                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>
                        Movement Permit
                      </div>
                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <code style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#15803d' }}>{record.movement.permitRef}</code>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: 999, background: '#dcfce7', color: '#166534' }}>
                            {PERMIT_STATUS_LABEL[record.movement.status] ?? record.movement.status}
                          </span>
                        </div>
                        {([
                          ['Route',     `${record.movement.from} → ${record.movement.to}`],
                          ['Purpose',   record.movement.purpose],
                          ['Departure', fmtDate(record.movement.departureDate)],
                          ['Arrival',   fmtDate(record.movement.arrivalDate)],
                        ] as [string, string][]).map(([k, v]) => (
                          <div key={k} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
                            <span style={{ color: '#9ca3af', minWidth: 65 }}>{k}</span>
                            <span style={{ color: '#374151', fontWeight: 500 }}>{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, padding: '0.75rem', fontSize: '0.8125rem', color: '#92400e' }}>
                      <AlertTriangle size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                      <strong>No active movement permit</strong> found for this premises. Animal should not be in transit.
                    </div>
                  )}

                  {/* Health flags */}
                  {record.healthFlags.length > 0 && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '0.75rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#991b1b', marginBottom: '0.4rem' }}>Health Restrictions</div>
                      {record.healthFlags.map(f => (
                        <div key={f} style={{ fontSize: '0.8rem', color: '#b91c1c', display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: '0.2rem' }}>
                          <XCircle size={12} /> {f}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action row */}
              {cleared === null && (
                <div style={{ borderTop: '1px solid #f3f4f6', padding: '1rem 1.25rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', background: '#fafafa' }}>
                  <button onClick={flagAnimal} style={{ border: '2px solid #fca5a5', background: '#fff', color: '#dc2626', borderRadius: 10, padding: '0.625rem 1.25rem', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <AlertTriangle size={15} />Flag / Hold
                  </button>
                  <button
                    onClick={clearAnimal}
                    disabled={!!hasRestriction && !hasValidPermit}
                    style={{ background: (hasRestriction && !hasValidPermit) ? '#d1d5db' : '#16a34a', color: '#fff', border: 'none', borderRadius: 10, padding: '0.625rem 1.5rem', fontWeight: 700, fontSize: '0.875rem', cursor: (hasRestriction && !hasValidPermit) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <CheckCircle size={15} />Clear to Proceed
                  </button>
                </div>
              )}
              {cleared !== null && (
                <div style={{ borderTop: '1px solid #f3f4f6', padding: '1rem 1.25rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', background: '#fafafa' }}>
                  <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Clock size={13} />Logged at {new Date().toLocaleTimeString()}
                  </div>
                  <button onClick={reset} style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 10, padding: '0.625rem 1.25rem', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ScanLine size={15} />Scan Next Tag
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Scan log ── */}
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,.09)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f3f4f6', fontWeight: 700, fontSize: '0.875rem', color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Tag size={15} color="#6b7280" /> Scan Log
            <span style={{ marginLeft: 'auto', fontWeight: 500, fontSize: '0.75rem', color: '#9ca3af' }}>{log.length} scan{log.length !== 1 ? 's' : ''}</span>
          </div>
          {log.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#d1d5db', fontSize: '0.8125rem' }}>No scans yet</div>
          )}
          {log.map((l, i) => (
            <div key={i} style={{ padding: '0.625rem 1rem', borderBottom: '1px solid #f9fafb', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {l.result === 'found'
                ? l.cleared === true  ? <CheckCircle size={13} color="#16a34a" />
                : l.cleared === false ? <AlertTriangle size={13} color="#d97706" />
                : <CheckCircle size={13} color="#94a3b8" />
                : <XCircle size={13} color="#dc2626" />
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.serial}</div>
                <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                  {l.time} · {l.result === 'not_found' ? 'Not found' : l.cleared === true ? 'Cleared' : l.cleared === false ? 'Flagged' : 'Found'}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

export default CheckpointScanPage;
