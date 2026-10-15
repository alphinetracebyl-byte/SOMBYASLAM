import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase';
import type { MovementPermit } from '@/types/facility';
import s from './quarantine.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Pen {
  id:            string;
  pen_code:      string;
  pen_name:      string | null;
  capacity:      number;
  current_count: number | null;
  status:        string;
  species:       string[] | null;
}

interface VaccinationEntry {
  vaccine_name: string;
  vaccine_batch_no: string;
  dose_ml: string;
  animals_vaccinated: string;
  administered_by: string;
}

const VACCINE_OPTIONS = [
  'RVF', 'PPR', 'FMD', 'SHEEP_POX', 'CAMEL_POX',
  'PASTEURELLOSIS', 'BRUCELLOSIS', 'CBPP', 'CCPP', 'OTHER',
];

const DESTINATION_OPTIONS = [
  { value: 'SAUDI_ARABIA', label: 'Saudi Arabia',  days: 21 },
  { value: 'UAE',          label: 'UAE',            days: 21 },
  { value: 'OMAN',         label: 'Oman',           days: 21 },
  { value: 'QATAR',        label: 'Qatar',          days: 30 },
  { value: 'EGYPT',        label: 'Egypt',          days: 28 },
  { value: 'KUWAIT',       label: 'Kuwait',         days: 21 },
  { value: 'BAHRAIN',      label: 'Bahrain',        days: 21 },
  { value: 'OTHER',        label: 'Other',          days: 21 },
];

const SPECIES_OPTIONS = ['CATTLE', 'CAMEL', 'GOAT', 'SHEEP'];

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function genCode(facilityCode: string): string {
  const n = Math.floor(Math.random() * 900000 + 100000);
  return `${facilityCode}-QB-${n}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AnimalArrivalPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { facilityId, facilityCode, staffId, staffName } = useAuthStore();

  const [permit,  setPermit]  = useState<MovementPermit | null>(null);
  const [pens,    setPens]    = useState<Pen[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [step,    setStep]    = useState(1);

  // Step 1 — Permit & Vehicle
  const [vehicleReg, setVehicleReg] = useState('');
  const [driverName, setDriverName] = useState('');
  const [sealNumber, setSealNumber] = useState('');
  const [permitQr,   setPermitQr]   = useState('');

  // Step 2 — Lot Details
  const [species,            setSpecies]            = useState('CATTLE');
  const [animalCount,        setAnimalCount]        = useState('');
  const [exporterName,       setExporterName]       = useState('');
  const [sourceRegion,       setSourceRegion]       = useState('');
  const [destinationCountry, setDestinationCountry] = useState('SAUDI_ARABIA');
  const [importPermitNo,     setImportPermitNo]     = useState('');
  const [lotNotes,           setLotNotes]           = useState('');

  // Step 3 — Pen Assignment
  const [selectedPenIds, setSelectedPenIds] = useState<string[]>([]);

  // Step 4 — Day 0 Protocols
  const [sampleDate,       setSampleDate]       = useState(today());
  const [quarantineDays,   setQuarantineDays]   = useState(21);
  const [vetOfficer,       setVetOfficer]       = useState('');
  const [ectoTreated,      setEctoTreated]      = useState(false);
  const [ectoProduct,      setEctoProduct]      = useState('');
  const [vaccinations,     setVaccinations]     = useState<VaccinationEntry[]>([]);
  const [vacForm,          setVacForm]          = useState<VaccinationEntry>({
    vaccine_name: 'RVF', vaccine_batch_no: '', dose_ml: '', animals_vaccinated: '', administered_by: '',
  });
  const [admissionNotes, setAdmissionNotes] = useState('');

  useEffect(() => { void load(); }, [id]);

  async function load() {
    if (!id) return;
    const { data } = await supabase.from('movement_permits').select('*').eq('id', id).maybeSingle();
    setPermit(data);
    if (data?.vehicle_registration) setVehicleReg(data.vehicle_registration);
    if (data?.owner_name)           setExporterName(data.owner_name);

    if (facilityId) {
      const { data: penRows } = await supabase
        .from('facility_pens')
        .select('id, pen_code, pen_name, capacity, current_count, status, species')
        .eq('facility_id', facilityId)
        .neq('status', 'MAINTENANCE')
        .order('pen_code');
      setPens((penRows ?? []) as Pen[]);
    }
    setLoading(false);
  }

  // Update quarantine days when destination changes
  function handleDestinationChange(val: string) {
    setDestinationCountry(val);
    const opt = DESTINATION_OPTIONS.find(o => o.value === val);
    if (opt) setQuarantineDays(opt.days);
  }

  function togglePen(penId: string) {
    setSelectedPenIds(prev =>
      prev.includes(penId) ? prev.filter(id => id !== penId) : [...prev, penId]
    );
  }

  function addVaccination() {
    if (!vacForm.vaccine_name || !vacForm.animals_vaccinated) return;
    setVaccinations(prev => [...prev, { ...vacForm }]);
    setVacForm({ vaccine_name: 'RVF', vaccine_batch_no: '', dose_ml: '', animals_vaccinated: '', administered_by: '' });
  }

  function removeVaccination(i: number) {
    setVaccinations(prev => prev.filter((_, idx) => idx !== i));
  }

  // Pens compatible with selected species (filter by species array or show all)
  const compatiblePens = pens.filter(p =>
    !p.species || p.species.length === 0 || p.species.includes(species)
  );

  const selectedPens = pens.filter(p => selectedPenIds.includes(p.id));
  const totalSelectedCapacity = selectedPens.reduce((a, p) => a + p.capacity, 0);
  const count = Number.parseInt(animalCount, 10) || 0;
  const capacityOk = totalSelectedCapacity >= count;

  const earliestExport = sampleDate ? addDays(sampleDate, quarantineDays) : '—';

  // ── Validation per step ───────────────────────────────────────────────────

  function validateStep1(): string | null {
    if (!vehicleReg.trim()) return 'Vehicle registration is required';
    if (!driverName.trim()) return 'Driver name is required';
    return null;
  }

  function validateStep2(): string | null {
    if (!animalCount || count < 1) return 'Animal count must be at least 1';
    if (!exporterName.trim()) return 'Exporter / owner name is required';
    if (!destinationCountry) return 'Destination country is required';
    return null;
  }

  function validateStep3(): string | null {
    if (selectedPenIds.length === 0) return 'Select at least one pen';
    if (!capacityOk) return `Selected pens hold ${totalSelectedCapacity} — not enough for ${count} animals`;
    return null;
  }

  function next(validate: () => string | null) {
    const err = validate();
    if (err) { setError(err); return; }
    setError(null);
    setStep(s => s + 1);
  }

  // ── Confirm & Save ────────────────────────────────────────────────────────

  async function confirmArrival() {
    if (!permit || !facilityId || !facilityCode) return;
    setSaving(true); setError(null);

    try {
      const admissionDate  = today();
      const batchCode      = genCode(facilityCode);
      const computedExport = sampleDate ? addDays(sampleDate, quarantineDays) : null;
      const penCodes       = selectedPens.map(p => p.pen_code).join(', ');

      // 1. Create quarantine lot (batch)
      const { data: batch, error: batchErr } = await supabase
        .from('quarantine_batches')
        .insert({
          batch_code:               batchCode,
          facility_id:              facilityId,
          facility_code:            facilityCode,
          movement_permit_id:       permit.id,
          vehicle_reg:              vehicleReg || null,
          driver_name:              driverName || null,
          seal_number:              sealNumber || null,
          permit_qr_data:           permitQr || null,
          status:                   'ADMITTED',
          quarantine_purpose:       'EXPORT',
          pen_assignment:           penCodes || null,
          admission_date:           admissionDate,
          quarantine_days:          quarantineDays,
          required_quarantine_days: quarantineDays,
          expected_completion_date: computedExport,
          earliest_export_date:     computedExport,
          sample_collection_date:   sampleDate || null,
          animal_count:             count,
          species:                  species,
          exporter_name:            exporterName || null,
          source_region:            sourceRegion || null,
          destination_country:      destinationCountry || null,
          import_permit_number:     importPermitNo || null,
          vet_officer_name:         vetOfficer || null,
          ectoparasite_treated:     ectoTreated,
          ectoparasite_product:     ectoTreated ? (ectoProduct || null) : null,
          notes:                    admissionNotes || null,
          lot_closed:               true,  // closed lot — no new animals after admission
          created_by_id:            staffId,
          created_by_name:          staffName,
        })
        .select('id')
        .single();

      if (batchErr || !batch) throw new Error(batchErr?.message ?? 'Failed to create lot');

      // 2. Insert vaccination records
      if (vaccinations.length > 0) {
        await supabase.from('quarantine_vaccinations').insert(
          vaccinations.map(v => ({
            batch_id:           batch.id,
            facility_id:        facilityId,
            vaccine_name:       v.vaccine_name,
            vaccine_batch_no:   v.vaccine_batch_no || null,
            dose_ml:            v.dose_ml ? Number(v.dose_ml) : null,
            animals_vaccinated: Number.parseInt(v.animals_vaccinated, 10) || count,
            administered_by:    v.administered_by || vetOfficer || null,
            administered_date:  admissionDate,
          }))
        );
      }

      // 3. Update pen current_count and status → OCCUPIED
      await Promise.all(
        selectedPens.map(async pen => {
          const newCount = (pen.current_count ?? 0) + count;
          await supabase.from('facility_pens')
            .update({ current_count: newCount, status: 'OCCUPIED' })
            .eq('id', pen.id);
        })
      );

      // 4. Mark permit as USED
      await supabase.from('movement_permits')
        .update({ status: 'USED', updated_at: new Date().toISOString() })
        .eq('id', permit.id);

      void navigate(`/quarantine/batches/${batch.id}`);
    } catch (e: unknown) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return <div className={s.loading}>Loading…</div>;
  if (!permit)  return <div className={s.empty}>Movement permit not found.</div>;

  const approvedCount = (permit.animal_count && permit.animal_count > 0) ? permit.animal_count : '—';

  const STEPS = [
    { n: 1, label: 'Permit & Vehicle' },
    { n: 2, label: 'Lot Details' },
    { n: 3, label: 'Pen Assignment' },
    { n: 4, label: 'Day 0 Protocols' },
  ];

  return (
    <div className={s.page} style={{ maxWidth: 860, margin: '0 auto' }}>
      <button className={s.backLink} onClick={() => void navigate('/quarantine/movements')}>
        ← Back to Movement Permits
      </button>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.pageTitle}>Lot Admission — {permit.permit_number}</h1>
          <p className={s.pageSub}>Register incoming animal lot at this quarantine station</p>
        </div>
      </div>

      {/* Steps */}
      <div className={s.steps}>
        {STEPS.map((st, i, arr) => (
          <>
            <div key={st.n} className={`${s.step} ${step === st.n ? s.active : step > st.n ? s.done : ''}`}>
              <div className={s.stepDot}>{step > st.n ? '✓' : st.n}</div>
              {st.label}
            </div>
            {i < arr.length - 1 && <div className={s.stepLine} />}
          </>
        ))}
      </div>

      {error && <div className={`${s.alert} ${s.alert_error}`}>⚠ {error}</div>}

      {/* ── Step 1: Permit & Vehicle ── */}
      {step === 1 && (
        <div className={s.card}>
          <h3 className={s.cardTitle}>Permit &amp; Vehicle Verification</h3>
          <div className={s.kv} style={{ marginBottom: '1.25rem' }}>
            <div className={s.kvRow}><span className={s.kvKey}>Permit Number</span><span className={s.kvVal}>{permit.permit_number}</span></div>
            <div className={s.kvRow}><span className={s.kvKey}>Origin</span><span className={s.kvVal}>{permit.origin_premises_name ?? permit.origin_premises_code ?? '—'}</span></div>
            <div className={s.kvRow}><span className={s.kvKey}>Approved Count</span><span className={s.kvVal}>{approvedCount}</span></div>
            <div className={s.kvRow}><span className={s.kvKey}>Valid Until</span><span className={s.kvVal}>{permit.valid_to ?? '—'}</span></div>
            {permit.conditions && <div className={s.kvRow}><span className={s.kvKey}>Conditions</span><span className={s.kvVal}>{permit.conditions}</span></div>}
          </div>
          <div className={s.fieldRow}>
            <div className={s.field}>
              <label className={s.label}>Vehicle Registration *</label>
              <input className={s.input} value={vehicleReg} onChange={e => setVehicleReg(e.target.value)} placeholder="e.g. SO-1234" />
            </div>
            <div className={s.field}>
              <label className={s.label}>Driver Name *</label>
              <input className={s.input} value={driverName} onChange={e => setDriverName(e.target.value)} placeholder="Full name" />
            </div>
          </div>
          <div className={s.fieldRow}>
            <div className={s.field}>
              <label className={s.label}>Container / Seal Number</label>
              <input className={s.input} value={sealNumber} onChange={e => setSealNumber(e.target.value)} placeholder="Seal #" />
            </div>
            <div className={s.field}>
              <label className={s.label}>Permit QR / Scan Data</label>
              <input className={s.input} value={permitQr} onChange={e => setPermitQr(e.target.value)} placeholder="Scan or enter QR data" />
            </div>
          </div>
          <div className={s.formActions}>
            <button className={`${s.btn} ${s.btn_primary}`} onClick={() => next(validateStep1)}>
              Next: Lot Details →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Lot Details ── */}
      {step === 2 && (
        <div className={s.card}>
          <h3 className={s.cardTitle}>Lot Registration</h3>
          <div className={`${s.alert} ${s.alert_info}`}>
            ℹ Enter the count verified at the gate. Attach individual RFID tags later via bulk upload — do not let scanning delay receiving.
          </div>
          <div className={s.fieldRow}>
            <div className={s.field}>
              <label className={s.label}>Species *</label>
              <select className={s.select} value={species} onChange={e => setSpecies(e.target.value)}>
                {SPECIES_OPTIONS.map(sp => <option key={sp} value={sp}>{sp}</option>)}
              </select>
            </div>
            <div className={s.field}>
              <label className={s.label}>Animal Count (gate count) *</label>
              <input className={s.input} type="number" min={1} value={animalCount}
                onChange={e => setAnimalCount(e.target.value)} placeholder="e.g. 500" />
            </div>
          </div>
          <div className={s.fieldRow}>
            <div className={s.field}>
              <label className={s.label}>Exporter / Owner *</label>
              <input className={s.input} value={exporterName} onChange={e => setExporterName(e.target.value)} placeholder="Exporter company or name" />
            </div>
            <div className={s.field}>
              <label className={s.label}>Source Region</label>
              <input className={s.input} value={sourceRegion} onChange={e => setSourceRegion(e.target.value)} placeholder="e.g. Mudug, Gedo" />
            </div>
          </div>
          <div className={s.fieldRow}>
            <div className={s.field}>
              <label className={s.label}>Destination Country *</label>
              <select className={s.select} value={destinationCountry} onChange={e => handleDestinationChange(e.target.value)}>
                {DESTINATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label} ({o.days} days)</option>)}
              </select>
            </div>
            <div className={s.field}>
              <label className={s.label}>Import Permit Number</label>
              <input className={s.input} value={importPermitNo} onChange={e => setImportPermitNo(e.target.value)} placeholder="Destination country permit #" />
            </div>
          </div>
          <div className={s.field}>
            <label className={s.label}>Notes</label>
            <input className={s.input} value={lotNotes} onChange={e => setLotNotes(e.target.value)} placeholder="Any gate observations" />
          </div>
          <div className={s.formActions}>
            <button className={`${s.btn} ${s.btn_outline}`} onClick={() => { setError(null); setStep(1); }}>← Back</button>
            <button className={`${s.btn} ${s.btn_primary}`} onClick={() => next(validateStep2)}>Next: Assign Pens →</button>
          </div>
        </div>
      )}

      {/* ── Step 3: Pen Assignment ── */}
      {step === 3 && (
        <div className={s.card}>
          <h3 className={s.cardTitle}>Pen Assignment — {species} lot · {count} animals</h3>
          <div className={`${s.alert} ${s.alert_info}`}>
            ℹ Select one or more pens for this lot. All selected pens will share the same lot. Species must not mix between pens.
          </div>

          {compatiblePens.length === 0 ? (
            <div className={`${s.alert} ${s.alert_warning}`}>
              ⚠ No pens configured for {species}. Go to Facility Capacity to add pens first.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
              {compatiblePens.map(pen => {
                const sel     = selectedPenIds.includes(pen.id);
                const avail   = pen.capacity - (pen.current_count ?? 0);
                const isFull  = avail <= 0;
                return (
                  <button
                    key={pen.id}
                    type="button"
                    disabled={isFull && !sel}
                    onClick={() => !isFull && togglePen(pen.id)}
                    style={{
                      border: sel ? '2px solid #0f2170' : '2px solid #e2e8f0',
                      borderRadius: 10, padding: '0.875rem', background: sel ? '#eef2ff' : '#fff',
                      cursor: isFull && !sel ? 'not-allowed' : 'pointer', textAlign: 'left',
                      opacity: isFull && !sel ? 0.45 : 1, fontFamily: 'inherit',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: sel ? '#0f2170' : '#0f172a' }}>
                      Pen {pen.pen_code}
                    </div>
                    {pen.pen_name && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{pen.pen_name}</div>}
                    <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: '#475569' }}>
                      <div>{avail} available / {pen.capacity} total</div>
                      <div style={{ color: pen.status === 'OCCUPIED' ? '#a0622a' : '#15803d', fontWeight: 600 }}>{pen.status}</div>
                    </div>
                    {sel && <div style={{ marginTop: '0.4rem', fontSize: '0.72rem', color: '#0f2170', fontWeight: 700 }}>✓ Selected</div>}
                  </button>
                );
              })}
            </div>
          )}

          {selectedPenIds.length > 0 && (
            <div style={{ padding: '0.6rem 0.875rem', background: capacityOk ? '#f0fdf4' : '#fef9ec', border: `1px solid ${capacityOk ? '#bbf7d0' : '#fcd34d'}`, borderRadius: 7, fontSize: '0.82rem', marginBottom: '0.5rem' }}>
              Selected pens: <strong>{selectedPens.map(p => `Pen ${p.pen_code}`).join(', ')}</strong>
              {' — '}Combined capacity: <strong>{totalSelectedCapacity}</strong>
              {' — '}Animals to admit: <strong>{count}</strong>
              {!capacityOk && <span style={{ color: '#a0622a', marginLeft: '0.5rem' }}>⚠ Insufficient capacity</span>}
            </div>
          )}

          <div className={s.formActions}>
            <button className={`${s.btn} ${s.btn_outline}`} onClick={() => { setError(null); setStep(2); }}>← Back</button>
            <button className={`${s.btn} ${s.btn_primary}`} onClick={() => next(validateStep3)}>Next: Day 0 Protocols →</button>
          </div>
        </div>
      )}

      {/* ── Step 4: Day 0 Protocols ── */}
      {step === 4 && (
        <div className={s.card}>
          <h3 className={s.cardTitle}>Day 0 Admission Protocols</h3>

          {/* Quarantine clock */}
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '0.875rem 1rem', marginBottom: '1rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0369a1', marginBottom: '0.5rem' }}>⏱ Quarantine Clock</div>
            <div className={s.fieldRow} style={{ marginBottom: 0 }}>
              <div className={s.field} style={{ marginBottom: 0 }}>
                <label className={s.label}>Sample Collection Date * (clock starts here)</label>
                <input className={s.input} type="date" value={sampleDate} onChange={e => setSampleDate(e.target.value)} />
              </div>
              <div className={s.field} style={{ marginBottom: 0 }}>
                <label className={s.label}>Required Quarantine Days ({destinationCountry.replace('_', ' ')})</label>
                <input className={s.input} type="number" min={14} max={60} value={quarantineDays}
                  onChange={e => setQuarantineDays(Number(e.target.value))} />
              </div>
            </div>
            <div style={{ marginTop: '0.6rem', fontSize: '0.82rem', color: '#0369a1' }}>
              Earliest export date: <strong>{earliestExport}</strong>
            </div>
          </div>

          {/* Vaccinations */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#374151', marginBottom: '0.5rem' }}>Vaccinations Administered</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 0.7fr 0.8fr 1.5fr auto', gap: '0.4rem', alignItems: 'end', marginBottom: '0.5rem' }}>
              <div>
                <label className={s.label}>Vaccine</label>
                <select className={s.select} style={{ marginBottom: 0 }} value={vacForm.vaccine_name}
                  onChange={e => setVacForm(f => ({ ...f, vaccine_name: e.target.value }))}>
                  {VACCINE_OPTIONS.map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className={s.label}>Batch No</label>
                <input className={s.input} style={{ marginBottom: 0 }} value={vacForm.vaccine_batch_no}
                  onChange={e => setVacForm(f => ({ ...f, vaccine_batch_no: e.target.value }))} placeholder="Lot #" />
              </div>
              <div>
                <label className={s.label}>Dose (ml)</label>
                <input className={s.input} style={{ marginBottom: 0 }} type="number" min={0} step={0.5} value={vacForm.dose_ml}
                  onChange={e => setVacForm(f => ({ ...f, dose_ml: e.target.value }))} placeholder="e.g. 2" />
              </div>
              <div>
                <label className={s.label}>Count</label>
                <input className={s.input} style={{ marginBottom: 0 }} type="number" min={1} value={vacForm.animals_vaccinated}
                  onChange={e => setVacForm(f => ({ ...f, animals_vaccinated: e.target.value }))} placeholder={animalCount} />
              </div>
              <div>
                <label className={s.label}>Administered by</label>
                <input className={s.input} style={{ marginBottom: 0 }} value={vacForm.administered_by}
                  onChange={e => setVacForm(f => ({ ...f, administered_by: e.target.value }))} placeholder="Vet name" />
              </div>
              <button className={`${s.btn} ${s.btn_primary}`} onClick={addVaccination} style={{ marginBottom: 0 }}>Add</button>
            </div>
            {vaccinations.length > 0 && (
              <table>
                <thead><tr><th>Vaccine</th><th>Batch</th><th>Dose</th><th>Animals</th><th>By</th><th></th></tr></thead>
                <tbody>
                  {vaccinations.map((v, i) => (
                    <tr key={i}>
                      <td><strong>{v.vaccine_name}</strong></td>
                      <td>{v.vaccine_batch_no || '—'}</td>
                      <td>{v.dose_ml ? `${v.dose_ml} ml` : '—'}</td>
                      <td>{v.animals_vaccinated || count}</td>
                      <td>{v.administered_by || '—'}</td>
                      <td><button className={`${s.btn} ${s.btn_danger}`} onClick={() => removeVaccination(i)}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Ectoparasite & Vet */}
          <div className={s.fieldRow}>
            <div className={s.field}>
              <label className={s.label}>Ectoparasite Treatment</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <input type="checkbox" id="ecto" checked={ectoTreated} onChange={e => setEctoTreated(e.target.checked)} />
                <label htmlFor="ecto" style={{ fontSize: '0.82rem', cursor: 'pointer' }}>Treated on admission</label>
              </div>
              {ectoTreated && (
                <input className={s.input} value={ectoProduct} onChange={e => setEctoProduct(e.target.value)} placeholder="Product name / dose" />
              )}
            </div>
            <div className={s.field}>
              <label className={s.label}>Assigned Veterinary Officer</label>
              <input className={s.input} value={vetOfficer} onChange={e => setVetOfficer(e.target.value)} placeholder="Officer name" />
            </div>
          </div>

          <div className={s.field}>
            <label className={s.label}>Admission Notes</label>
            <textarea className={s.textarea} value={admissionNotes}
              onChange={e => setAdmissionNotes(e.target.value)} placeholder="Gate clinical observations, body condition, any concerns…" />
          </div>

          <div className={s.formActions}>
            <button className={`${s.btn} ${s.btn_outline}`} onClick={() => { setError(null); setStep(3); }}>← Back</button>
            <button className={`${s.btn} ${s.btn_success}`} disabled={saving} onClick={() => void confirmArrival()}>
              {saving ? 'Admitting Lot…' : `Admit ${count} ${species} — Lot Closed`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AnimalArrivalPage;
