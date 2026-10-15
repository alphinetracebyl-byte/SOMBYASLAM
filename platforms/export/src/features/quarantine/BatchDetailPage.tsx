import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase';
import type { QuarantineBatch, HealthInspection, LabSample, TreatmentRecord } from '@/types/facility';
import s from './quarantine.module.css';

// ── Local types for new tables ────────────────────────────────────────────────

interface Vaccination {
  id:                 string;
  vaccine_name:       string;
  vaccine_batch_no:   string | null;
  dose_ml:            number | null;
  animals_vaccinated: number;
  administered_date:  string;
  administered_by:    string | null;
  notes:              string | null;
}

interface DailyInspection {
  id:                    string;
  inspection_date:       string;
  day_number:            number | null;
  inspector_name:        string | null;
  overall_status:        string;
  animals_checked:       number | null;
  animals_showing_signs: number;
  mortalities_today:     number;
  feed_adequate:         boolean;
  water_adequate:        boolean;
  pen_condition:         string;
  findings:              string | null;
  actions_taken:         string | null;
}

interface ExceptionAnimal {
  id:                string;
  tag_number:        string | null;
  species:           string;
  arrival_condition: string;
  status:            string;
  isolation_required: boolean;
  exception_type:    string | null;
  pen_code:          string | null;
  notes:             string | null;
}

const INSP_TYPE_LABELS: Record<string, string> = {
  ADMISSION: 'Admission', PERIODIC: 'Periodic',
  SUSPECTED_DISEASE: 'Disease Suspicion', FINAL_RELEASE: 'Final Release',
};

function daysSince(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function today(): string { return new Date().toISOString().slice(0, 10); }

type Tab = 'daily' | 'vaccinations' | 'exceptions' | 'inspections' | 'samples' | 'treatments';

// ── Component ─────────────────────────────────────────────────────────────────

export function BatchDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { facilityId, staffId, staffName, staffRole } = useAuthStore();

  const [batch,       setBatch]       = useState<(QuarantineBatch & Record<string, unknown>) | null>(null);
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [dailyLogs,   setDailyLogs]   = useState<DailyInspection[]>([]);
  const [exceptions,  setExceptions]  = useState<ExceptionAnimal[]>([]);
  const [inspections, setInspections] = useState<HealthInspection[]>([]);
  const [samples,     setSamples]     = useState<LabSample[]>([]);
  const [treatments,  setTreatments]  = useState<TreatmentRecord[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [tab,         setTab]         = useState<Tab>('daily');

  // Daily inspection form
  const [showDailyForm,   setShowDailyForm]   = useState(false);
  const [dailyStatus,     setDailyStatus]     = useState('SATISFACTORY');
  const [dailyChecked,    setDailyChecked]    = useState('');
  const [dailySigns,      setDailySigns]      = useState('0');
  const [dailyMort,       setDailyMort]       = useState('0');
  const [dailyFeed,       setDailyFeed]       = useState(true);
  const [dailyWater,      setDailyWater]      = useState(true);
  const [dailyPenCond,    setDailyPenCond]    = useState('GOOD');
  const [dailyFindings,   setDailyFindings]   = useState('');
  const [dailyActions,    setDailyActions]    = useState('');
  const [dailySaving,     setDailySaving]     = useState(false);

  // Classic inspection form
  const [showInspForm,  setShowInspForm]  = useState(false);
  const [inspType,      setInspType]      = useState('PERIODIC');
  const [inspHealth,    setInspHealth]    = useState('GOOD');
  const [inspObs,       setInspObs]       = useState('');
  const [inspRec,       setInspRec]       = useState('CLEAR');
  const [inspNotes,     setInspNotes]     = useState('');
  const [inspSaving,    setInspSaving]    = useState(false);
  const [formError,     setFormError]     = useState<string | null>(null);

  const canInspect = ['QUARANTINE_SUPERVISOR', 'VETERINARY_OFFICER'].includes(staffRole ?? '');
  const canClear   = staffRole === 'VETERINARY_OFFICER';

  useEffect(() => { void load(); }, [id]);

  async function load() {
    if (!id) return;
    setLoading(true);
    const [b, vax, logs, exc, insp, sm, tr] = await Promise.all([
      supabase.from('quarantine_batches').select('*').eq('id', id).maybeSingle(),
      supabase.from('quarantine_vaccinations').select('*').eq('batch_id', id).order('administered_date'),
      supabase.from('quarantine_daily_inspections').select('*').eq('batch_id', id).order('inspection_date', { ascending: false }),
      supabase.from('quarantine_batch_animals').select('*').eq('batch_id', id).order('created_at'),
      supabase.from('health_inspections').select('*').eq('batch_id', id).order('created_at', { ascending: false }),
      supabase.from('lab_samples').select('*').eq('batch_id', id).order('created_at', { ascending: false }),
      supabase.from('treatment_records').select('*').eq('batch_id', id).order('created_at', { ascending: false }),
    ]);
    setBatch(b.data as (QuarantineBatch & Record<string, unknown>) | null);
    setVaccinations(vax.data ?? []);
    setDailyLogs(logs.data ?? []);
    setExceptions(exc.data ?? []);
    setInspections(insp.data ?? []);
    setSamples(sm.data ?? []);
    setTreatments(tr.data ?? []);
    setLoading(false);
  }

  // ── Save daily lot inspection ─────────────────────────────────────────────

  async function saveDailyLog() {
    if (!batch) return;
    setDailySaving(true); setFormError(null);
    const admDate = (batch as Record<string, unknown>).admission_date as string | null;
    const dayNum  = admDate ? daysSince(admDate) ?? 1 : 1;
    const { error } = await supabase.from('quarantine_daily_inspections').upsert({
      batch_id:              batch.id,
      facility_id:           facilityId,
      inspection_date:       today(),
      day_number:            dayNum + 1,
      inspector_name:        staffName,
      overall_status:        dailyStatus,
      animals_checked:       dailyChecked ? Number(dailyChecked) : null,
      animals_showing_signs: Number(dailySigns),
      mortalities_today:     Number(dailyMort),
      feed_adequate:         dailyFeed,
      water_adequate:        dailyWater,
      pen_condition:         dailyPenCond,
      findings:              dailyFindings || null,
      actions_taken:         dailyActions || null,
    }, { onConflict: 'batch_id,inspection_date' });
    setDailySaving(false);
    if (error) { setFormError(error.message); return; }
    setShowDailyForm(false);
    setDailyFindings(''); setDailyActions(''); setDailySigns('0'); setDailyMort('0');
    void load();
  }

  // ── Save vet inspection ───────────────────────────────────────────────────

  async function addInspection() {
    if (!batch || !staffId) return;
    setInspSaving(true); setFormError(null);
    const code = `INS-${Date.now()}`;
    const { error } = await supabase.from('health_inspections').insert({
      inspection_code: code, batch_id: batch.id, facility_id: facilityId,
      inspection_type: inspType, inspection_date: today(),
      inspector_id: staffId, inspector_name: staffName, status: 'COMPLETED',
      general_health: inspHealth, clinical_observations: inspObs || null,
      vet_recommendation: inspRec, notes: inspNotes || null,
    });
    setInspSaving(false);
    if (error) { setFormError(error.message); return; }
    setShowInspForm(false); setInspObs(''); setInspNotes('');
    void load();
  }

  async function setClearance(decision: string) {
    if (!batch) return;
    const clearCode = `CLR-${Date.now()}`;
    await supabase.from('quarantine_clearances').insert({
      clearance_code: clearCode, batch_id: batch.id, facility_id: facilityId,
      decision, decision_date: today(), decided_by_id: staffId, decided_by_name: staffName,
    });
    const newStatus = ['CLEAR_FOR_EXPORT','CLEAR_FOR_SLAUGHTER','CLEAR_FOR_RETURN'].includes(decision)
      ? 'CLEARED' : decision === 'EXTEND' ? 'ACTIVE' : 'ON_HOLD';
    await supabase.from('quarantine_batches').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', batch.id);
    void navigate('/quarantine/batches');
  }

  if (loading) return <div className={s.loading}>Loading batch…</div>;
  if (!batch)  return <div className={s.empty}>Batch not found.</div>;

  const bx = batch as Record<string, unknown>;

  // Quarantine clock
  const sampleDate      = bx.sample_collection_date as string | null;
  const earliestExport  = bx.earliest_export_date as string | null;
  const daysElapsed     = sampleDate ? (daysSince(sampleDate) ?? 0) : null;
  const requiredDays    = (bx.required_quarantine_days as number) ?? batch.quarantine_days ?? 21;
  const daysRemaining   = daysElapsed !== null ? Math.max(0, requiredDays - daysElapsed) : null;
  const clockDone       = daysRemaining === 0;

  const daysLeft = batch.expected_completion_date
    ? Math.ceil((new Date(batch.expected_completion_date).getTime() - Date.now()) / 86400000)
    : null;

  const todayLogged = dailyLogs.some(l => l.inspection_date === today());
  const lastLog     = dailyLogs[0];

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: 'daily',        label: 'Daily Log',       count: dailyLogs.length },
    { key: 'vaccinations', label: 'Vaccinations',    count: vaccinations.length },
    { key: 'exceptions',   label: 'Exception Animals', count: exceptions.length },
    { key: 'inspections',  label: 'Vet Inspections', count: inspections.length },
    { key: 'samples',      label: 'Lab Samples',     count: samples.length },
    { key: 'treatments',   label: 'Treatments',      count: treatments.length },
  ];

  return (
    <div className={s.page}>
      <button className={s.backLink} onClick={() => void navigate('/quarantine/batches')}>← Back to Batches</button>

      <div className={s.pageHeader}>
        <div>
          <h1 className={s.pageTitle}>{batch.batch_code}</h1>
          <p className={s.pageSub}>
            {(bx.species as string) ?? batch.quarantine_purpose} · {batch.animal_count} animals
            {bx.exporter_name ? ` · ${bx.exporter_name as string}` : ''}
            {batch.pen_assignment ? ` · Pen: ${batch.pen_assignment}` : ''}
          </p>
        </div>
        <span className={`${s.badge} ${s['badge_' + batch.status]}`} style={{ fontSize: '0.85rem', padding: '4px 12px' }}>
          {batch.status}
        </span>
      </div>

      {/* ── Summary cards ── */}
      <div className={s.detailGrid}>

        {/* Lot Information */}
        <div className={s.card}>
          <h3 className={s.cardTitle}>Lot Information</h3>
          <div className={s.kv}>
            <div className={s.kvRow}><span className={s.kvKey}>Species</span><span className={s.kvVal}>{(bx.species as string) ?? '—'}</span></div>
            <div className={s.kvRow}><span className={s.kvKey}>Animal Count</span><span className={s.kvVal}><strong>{batch.animal_count}</strong></span></div>
            <div className={s.kvRow}><span className={s.kvKey}>Exporter</span><span className={s.kvVal}>{(bx.exporter_name as string) ?? '—'}</span></div>
            <div className={s.kvRow}><span className={s.kvKey}>Source Region</span><span className={s.kvVal}>{(bx.source_region as string) ?? '—'}</span></div>
            <div className={s.kvRow}><span className={s.kvKey}>Destination</span><span className={s.kvVal}>{((bx.destination_country as string) ?? '—').replace('_', ' ')}</span></div>
            <div className={s.kvRow}><span className={s.kvKey}>Import Permit</span><span className={s.kvVal}>{(bx.import_permit_number as string) ?? '—'}</span></div>
            <div className={s.kvRow}><span className={s.kvKey}>Pen(s)</span><span className={s.kvVal}>{batch.pen_assignment ?? 'Unassigned'}</span></div>
            <div className={s.kvRow}><span className={s.kvKey}>Vet Officer</span><span className={s.kvVal}>{batch.vet_officer_name ?? '—'}</span></div>
            <div className={s.kvRow}><span className={s.kvKey}>Ectoparasite Tx</span>
              <span className={s.kvVal}>{(bx.ectoparasite_treated as boolean) ? `✓ ${(bx.ectoparasite_product as string) ?? 'Yes'}` : 'Not recorded'}</span>
            </div>
          </div>
        </div>

        {/* Quarantine Clock */}
        <div className={s.card}>
          <h3 className={s.cardTitle}>Quarantine Clock</h3>
          <div className={s.kv}>
            <div className={s.kvRow}><span className={s.kvKey}>Admission Date</span><span className={s.kvVal}>{batch.admission_date}</span></div>
            <div className={s.kvRow}><span className={s.kvKey}>Sample Collection</span>
              <span className={s.kvVal} style={{ color: !sampleDate ? '#a0622a' : undefined }}>
                {sampleDate ?? '⚠ Not set'}
              </span>
            </div>
            <div className={s.kvRow}><span className={s.kvKey}>Days Elapsed</span>
              <span className={s.kvVal}>
                {daysElapsed !== null ? `Day ${daysElapsed} of ${requiredDays}` : '—'}
              </span>
            </div>
            <div className={s.kvRow}><span className={s.kvKey}>Days Remaining</span>
              <span className={s.kvVal} style={{ color: clockDone ? '#1d4ed8' : daysRemaining !== null && daysRemaining <= 3 ? '#a0622a' : undefined, fontWeight: 700 }}>
                {clockDone ? '✓ Period Complete' : daysRemaining !== null ? `${daysRemaining} days` : '—'}
              </span>
            </div>
            <div className={s.kvRow}><span className={s.kvKey}>Earliest Export</span>
              <span className={s.kvVal} style={{ fontWeight: 700, color: '#0f2170' }}>
                {earliestExport ?? '—'}
              </span>
            </div>
            <div className={s.kvRow}><span className={s.kvKey}>Today's Log</span>
              <span className={s.kvVal}>
                {todayLogged
                  ? <span style={{ color: '#1d4ed8' }}>✓ Recorded</span>
                  : <span style={{ color: '#a0622a' }}>⚠ Pending</span>}
              </span>
            </div>
            {lastLog && (
              <div className={s.kvRow}><span className={s.kvKey}>Last Status</span>
                <span className={s.kvVal} style={{ color: lastLog.overall_status === 'SATISFACTORY' ? '#15803d' : '#a0622a' }}>
                  {lastLog.overall_status}
                  {lastLog.animals_showing_signs > 0 && ` · ${lastLog.animals_showing_signs} showing signs`}
                </span>
              </div>
            )}
            <div className={s.kvRow}><span className={s.kvKey}>Vaccinations</span><span className={s.kvVal}>{vaccinations.length} events</span></div>
            <div className={s.kvRow}><span className={s.kvKey}>Inspections</span><span className={s.kvVal}>{inspections.length} vet records</span></div>
          </div>
        </div>
      </div>

      {/* Clearance panel */}
      {canClear && ['ADMITTED','ACTIVE'].includes(batch.status) && clockDone && (
        <div className={`${s.alert} ${s.alert_success}`}>
          ✅ Quarantine period complete. Issue a clearance decision.
          <div className={s.btnRow} style={{ marginTop: '0.5rem' }}>
            <button className={`${s.btn} ${s.btn_success}`} onClick={() => void setClearance('CLEAR_FOR_EXPORT')}>Clear for Export</button>
            <button className={`${s.btn} ${s.btn_primary}`} onClick={() => void setClearance('CLEAR_FOR_SLAUGHTER')}>Clear for Slaughter</button>
            <button className={`${s.btn} ${s.btn_outline}`} onClick={() => void setClearance('CLEAR_FOR_RETURN')}>Return to Farm</button>
            <button className={`${s.btn} ${s.btn_warning}`} onClick={() => void setClearance('EXTEND')}>Extend Quarantine</button>
            <button className={`${s.btn} ${s.btn_danger}`} onClick={() => void setClearance('PROHIBIT')}>Prohibit Movement</button>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className={s.tableWrap}>
        <div className={s.tableHeader} style={{ flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t.key}
              className={`${s.btn} ${tab === t.key ? s.btn_primary : s.btn_outline}`}
              onClick={() => setTab(t.key)}>
              {t.label}{t.count !== undefined ? ` (${t.count})` : ''}
            </button>
          ))}
          {tab === 'daily' && canInspect && !todayLogged && (
            <button className={`${s.btn} ${s.btn_success}`} onClick={() => setShowDailyForm(true)}>+ Record Today</button>
          )}
          {tab === 'inspections' && canInspect && (
            <button className={`${s.btn} ${s.btn_success}`} onClick={() => setShowInspForm(true)}>+ Add Inspection</button>
          )}
        </div>

        {/* Daily Log tab */}
        {tab === 'daily' && (
          <>
            {showDailyForm && (
              <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.75rem', color: '#0f172a' }}>
                  Daily Lot Observation — {today()} (Day {(daysElapsed ?? 0) + 1})
                </div>
                {formError && <div className={`${s.alert} ${s.alert_error}`}>⚠ {formError}</div>}
                <div className={s.fieldRow}>
                  <div className={s.field}>
                    <label className={s.label}>Overall Status</label>
                    <select className={s.select} value={dailyStatus} onChange={e => setDailyStatus(e.target.value)}>
                      <option value="SATISFACTORY">Satisfactory — No concerns</option>
                      <option value="REQUIRES_ATTENTION">Requires Attention — Some animals showing signs</option>
                      <option value="CRITICAL">Critical — Immediate veterinary action needed</option>
                    </select>
                  </div>
                  <div className={s.field}>
                    <label className={s.label}>Animals Checked</label>
                    <input className={s.input} type="number" min={0} value={dailyChecked}
                      onChange={e => setDailyChecked(e.target.value)} placeholder={String(batch.animal_count)} />
                  </div>
                  <div className={s.field}>
                    <label className={s.label}>Showing Signs of Illness</label>
                    <input className={s.input} type="number" min={0} value={dailySigns}
                      onChange={e => setDailySigns(e.target.value)} />
                  </div>
                  <div className={s.field}>
                    <label className={s.label}>Mortalities Today</label>
                    <input className={s.input} type="number" min={0} value={dailyMort}
                      onChange={e => setDailyMort(e.target.value)} />
                  </div>
                </div>
                <div className={s.fieldRow}>
                  <div className={s.field}>
                    <label className={s.label}>Pen Condition</label>
                    <select className={s.select} value={dailyPenCond} onChange={e => setDailyPenCond(e.target.value)}>
                      <option value="GOOD">Good</option>
                      <option value="FAIR">Fair — needs attention</option>
                      <option value="POOR">Poor — requires cleaning</option>
                    </select>
                  </div>
                  <div className={s.field}>
                    <label className={s.label}>Resources</label>
                    <div style={{ display: 'flex', gap: '1rem', paddingTop: '0.35rem' }}>
                      <label style={{ display: 'flex', gap: '0.35rem', fontSize: '0.82rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={dailyFeed} onChange={e => setDailyFeed(e.target.checked)} /> Feed adequate
                      </label>
                      <label style={{ display: 'flex', gap: '0.35rem', fontSize: '0.82rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={dailyWater} onChange={e => setDailyWater(e.target.checked)} /> Water adequate
                      </label>
                    </div>
                  </div>
                </div>
                <div className={s.fieldRow}>
                  <div className={s.field}>
                    <label className={s.label}>Findings / Observations</label>
                    <textarea className={s.textarea} style={{ minHeight: 60 }} value={dailyFindings}
                      onChange={e => setDailyFindings(e.target.value)} placeholder="Clinical observations across the lot…" />
                  </div>
                  <div className={s.field}>
                    <label className={s.label}>Actions Taken</label>
                    <textarea className={s.textarea} style={{ minHeight: 60 }} value={dailyActions}
                      onChange={e => setDailyActions(e.target.value)} placeholder="Treatments given, animals isolated, samples taken…" />
                  </div>
                </div>
                <div className={s.formActions}>
                  <button className={`${s.btn} ${s.btn_outline}`} onClick={() => setShowDailyForm(false)}>Cancel</button>
                  <button className={`${s.btn} ${s.btn_success}`} disabled={dailySaving} onClick={() => void saveDailyLog()}>
                    {dailySaving ? 'Saving…' : 'Save Daily Record'}
                  </button>
                </div>
              </div>
            )}
            <table>
              <thead>
                <tr><th>Date</th><th>Day</th><th>Status</th><th>Checked</th><th>Signs</th><th>Deaths</th><th>Feed</th><th>Water</th><th>Pen</th><th>Inspector</th><th>Findings</th></tr>
              </thead>
              <tbody>
                {dailyLogs.length === 0 ? (
                  <tr><td colSpan={11} className={s.empty}>No daily records yet. Record the first observation.</td></tr>
                ) : dailyLogs.map(log => (
                  <tr key={log.id} style={{ background: log.overall_status === 'CRITICAL' ? '#fef9ec' : undefined }}>
                    <td>{log.inspection_date}</td>
                    <td>Day {log.day_number ?? '—'}</td>
                    <td>
                      <span style={{
                        fontWeight: 700, fontSize: '0.75rem',
                        color: log.overall_status === 'SATISFACTORY' ? '#15803d' : log.overall_status === 'CRITICAL' ? '#7c4f2a' : '#1d4ed8',
                      }}>
                        {log.overall_status}
                      </span>
                    </td>
                    <td>{log.animals_checked ?? '—'}</td>
                    <td style={{ color: log.animals_showing_signs > 0 ? '#a0622a' : undefined, fontWeight: log.animals_showing_signs > 0 ? 700 : undefined }}>
                      {log.animals_showing_signs}
                    </td>
                    <td style={{ color: log.mortalities_today > 0 ? '#7c4f2a' : undefined, fontWeight: log.mortalities_today > 0 ? 700 : undefined }}>
                      {log.mortalities_today}
                    </td>
                    <td>{log.feed_adequate ? '✓' : '⚠'}</td>
                    <td>{log.water_adequate ? '✓' : '⚠'}</td>
                    <td>{log.pen_condition}</td>
                    <td>{log.inspector_name ?? '—'}</td>
                    <td style={{ maxWidth: 200, fontSize: '0.78rem', color: '#475569' }}>{log.findings ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={s.tableFooter}>{dailyLogs.length} records · {daysElapsed ?? '?'} days elapsed</div>
          </>
        )}

        {/* Vaccinations tab */}
        {tab === 'vaccinations' && (
          <>
            <table>
              <thead><tr><th>Vaccine</th><th>Batch #</th><th>Dose</th><th>Animals</th><th>Date</th><th>Administered By</th><th>Notes</th></tr></thead>
              <tbody>
                {vaccinations.length === 0 ? (
                  <tr><td colSpan={7} className={s.empty}>No vaccination records. These are recorded during lot admission.</td></tr>
                ) : vaccinations.map(v => (
                  <tr key={v.id}>
                    <td><strong>{v.vaccine_name}</strong></td>
                    <td>{v.vaccine_batch_no ?? '—'}</td>
                    <td>{v.dose_ml ? `${v.dose_ml} ml` : '—'}</td>
                    <td>{v.animals_vaccinated}</td>
                    <td>{v.administered_date}</td>
                    <td>{v.administered_by ?? '—'}</td>
                    <td style={{ fontSize: '0.78rem', color: '#475569' }}>{v.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={s.tableFooter}>{vaccinations.length} vaccination events</div>
          </>
        )}

        {/* Exception Animals tab */}
        {tab === 'exceptions' && (
          <>
            <div style={{ padding: '0.6rem 0.875rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#475569' }}>
              Exception records are created for individual animals requiring special action — sick, dead, or rejected from the consignment.
            </div>
            <table>
              <thead><tr><th>Tag</th><th>Species</th><th>Condition</th><th>Exception</th><th>Pen</th><th>Isolation</th><th>Status</th><th>Notes</th></tr></thead>
              <tbody>
                {exceptions.length === 0 ? (
                  <tr><td colSpan={8} className={s.empty}>No individual exceptions recorded — the lot is proceeding normally.</td></tr>
                ) : exceptions.map(a => (
                  <tr key={a.id}>
                    <td><strong>{a.tag_number ?? '—'}</strong></td>
                    <td>{a.species}</td>
                    <td><span className={`${s.badge} ${s['badge_' + a.arrival_condition]}`}>{a.arrival_condition}</span></td>
                    <td>{a.exception_type ?? '—'}</td>
                    <td>{a.pen_code ?? '—'}</td>
                    <td>{a.isolation_required ? '⚠ Yes' : 'No'}</td>
                    <td><span className={`${s.badge} ${s['badge_' + a.status]}`}>{a.status}</span></td>
                    <td style={{ fontSize: '0.78rem', color: '#475569' }}>{a.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={s.tableFooter}>{exceptions.length} exception animals</div>
          </>
        )}

        {/* Vet Inspections tab */}
        {tab === 'inspections' && (
          <>
            <table>
              <thead><tr><th>Code</th><th>Type</th><th>Date</th><th>Inspector</th><th>Health</th><th>Recommendation</th></tr></thead>
              <tbody>
                {inspections.length === 0 ? (
                  <tr><td colSpan={6} className={s.empty}>No formal vet inspections recorded.</td></tr>
                ) : inspections.map(i => (
                  <tr key={i.id}>
                    <td>{i.inspection_code}</td>
                    <td>{INSP_TYPE_LABELS[i.inspection_type] ?? i.inspection_type}</td>
                    <td>{i.inspection_date}</td>
                    <td>{i.inspector_name}</td>
                    <td>{i.general_health ?? '—'}</td>
                    <td>{i.vet_recommendation ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={s.tableFooter}>{inspections.length} inspections</div>
          </>
        )}

        {/* Lab Samples tab */}
        {tab === 'samples' && (
          <>
            <div className={s.tableHeader}>
              <button className={`${s.btn} ${s.btn_primary}`} onClick={() => void navigate('/quarantine/lab')}>→ Lab Module</button>
            </div>
            <table>
              <thead><tr><th>Code</th><th>Type</th><th>Test</th><th>Date</th><th>Collector</th><th>Status</th><th>Result</th></tr></thead>
              <tbody>
                {samples.length === 0 ? (
                  <tr><td colSpan={7} className={s.empty}>No lab samples recorded.</td></tr>
                ) : samples.map(sm => (
                  <tr key={sm.id}>
                    <td>{sm.sample_code}</td>
                    <td>{sm.sample_type}</td>
                    <td>{sm.test_type}</td>
                    <td>{sm.collection_date}</td>
                    <td>{sm.collector_name}</td>
                    <td><span className={`${s.badge} ${s['badge_' + sm.status]}`}>{sm.status}</span></td>
                    <td><span className={`${s.badge} ${s['badge_' + sm.result]}`}>{sm.result}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={s.tableFooter}>{samples.length} samples</div>
          </>
        )}

        {/* Treatments tab */}
        {tab === 'treatments' && (
          <>
            <div className={s.tableHeader}>
              {canInspect && <button className={`${s.btn} ${s.btn_primary}`} onClick={() => void navigate('/quarantine/treatments')}>+ Add Treatment</button>}
            </div>
            <table>
              <thead><tr><th>Type</th><th>Medicine</th><th>Date</th><th>Dose</th><th>Vet</th><th>Outcome</th></tr></thead>
              <tbody>
                {treatments.length === 0 ? (
                  <tr><td colSpan={6} className={s.empty}>No treatments recorded.</td></tr>
                ) : treatments.map(t => (
                  <tr key={t.id}>
                    <td><span className={`${s.badge} ${t.treatment_type === 'VACCINE' ? s.badge_ACCEPTED : s.badge_PENDING}`}>{t.treatment_type}</span></td>
                    <td><strong>{t.medicine_name}</strong></td>
                    <td>{t.date_administered}</td>
                    <td>{t.dose ?? '—'} {t.administration_route ? `(${t.administration_route})` : ''}</td>
                    <td>{t.treating_vet_name}</td>
                    <td><span className={`${s.badge} ${s['badge_' + t.treatment_outcome]}`}>{t.treatment_outcome}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={s.tableFooter}>{treatments.length} treatments</div>
          </>
        )}
      </div>

      {/* Add Inspection Modal */}
      {showInspForm && (
        <div className={s.modal}>
          <div className={s.modalBackdrop} onClick={() => setShowInspForm(false)} />
          <div className={s.modalBox}>
            <h2 className={s.modalTitle}>Record Vet Inspection</h2>
            {formError && <div className={`${s.alert} ${s.alert_error}`}>⚠ {formError}</div>}
            <div className={s.fieldRow}>
              <div className={s.field}>
                <label className={s.label}>Inspection Type</label>
                <select className={s.select} value={inspType} onChange={e => setInspType(e.target.value)}>
                  {Object.entries(INSP_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className={s.field}>
                <label className={s.label}>General Health</label>
                <select className={s.select} value={inspHealth} onChange={e => setInspHealth(e.target.value)}>
                  {['GOOD','FAIR','POOR','CRITICAL'].map(h => <option key={h}>{h}</option>)}
                </select>
              </div>
            </div>
            <div className={s.field}>
              <label className={s.label}>Clinical Observations</label>
              <textarea className={s.textarea} value={inspObs} onChange={e => setInspObs(e.target.value)} placeholder="Record your clinical findings…" />
            </div>
            <div className={s.field}>
              <label className={s.label}>Veterinary Recommendation</label>
              <select className={s.select} value={inspRec} onChange={e => setInspRec(e.target.value)}>
                {['CLEAR','EXTEND_QUARANTINE','ISOLATE','COLLECT_SAMPLE','TREAT','PROHIBIT_MOVEMENT'].map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className={s.field}>
              <label className={s.label}>Notes</label>
              <textarea className={s.textarea} value={inspNotes} onChange={e => setInspNotes(e.target.value)} />
            </div>
            <div className={s.formActions}>
              <button className={`${s.btn} ${s.btn_outline}`} onClick={() => setShowInspForm(false)}>Cancel</button>
              <button className={`${s.btn} ${s.btn_success}`} disabled={inspSaving} onClick={() => void addInspection()}>
                {inspSaving ? 'Saving…' : 'Record Inspection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BatchDetailPage;
