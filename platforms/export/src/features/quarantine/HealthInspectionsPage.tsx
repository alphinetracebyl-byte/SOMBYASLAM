import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase';
import type { HealthInspection, QuarantineBatch } from '@/types/facility';
import s from './quarantine.module.css';

export function HealthInspectionsPage(): JSX.Element {
  const { facilityId, staffId, staffName, staffRole } = useAuthStore();
  const [inspections, setInspections] = useState<(HealthInspection & { batch_code?: string })[]>([]);
  const [batches, setBatches]         = useState<QuarantineBatch[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const [batchId, setBatchId]         = useState('');
  const [inspType, setInspType]       = useState('PERIODIC');
  const [health, setHealth]           = useState('GOOD');
  const [temperature, setTemperature] = useState('');
  const [behaviour, setBehaviour]     = useState('');
  const [observations, setObservations] = useState('');
  const [recommendation, setRecommendation] = useState('CLEAR');
  const [notes, setNotes]             = useState('');

  const canAdd = ['QUARANTINE_SUPERVISOR','VETERINARY_OFFICER'].includes(staffRole ?? '');

  useEffect(() => { void load(); }, [facilityId]);

  async function load() {
    if (!facilityId) return;
    setLoading(true);
    const [iRes, bRes] = await Promise.all([
      supabase.from('health_inspections').select('*').eq('facility_id', facilityId)
        .order('created_at', { ascending: false }).limit(100),
      supabase.from('quarantine_batches').select('id, batch_code')
        .eq('facility_id', facilityId).in('status', ['ADMITTED','ACTIVE','ON_HOLD']),
    ]);
    const batchMap = Object.fromEntries((bRes.data ?? []).map(b => [b.id, b.batch_code]));
    setInspections((iRes.data ?? []).map(i => ({ ...i, batch_code: batchMap[i.batch_id] })));
    setBatches(bRes.data ?? []);
    setLoading(false);
  }

  async function save() {
    if (!batchId) { setError('Select a quarantine batch.'); return; }
    setSaving(true); setError(null);
    const { error: e } = await supabase.from('health_inspections').insert({
      inspection_code: `INS-${Date.now()}`,
      batch_id: batchId,
      facility_id: facilityId,
      inspection_type: inspType,
      inspection_date: new Date().toISOString().slice(0, 10),
      inspector_id: staffId,
      inspector_name: staffName,
      status: 'COMPLETED',
      general_health: health,
      temperature_avg: temperature ? Number(temperature) : null,
      behaviour: behaviour || null,
      clinical_observations: observations || null,
      vet_recommendation: recommendation,
      notes: notes || null,
    });
    setSaving(false);
    if (e) { setError(e.message); return; }
    setShowForm(false); setBatchId(''); setObservations(''); setNotes(''); setTemperature(''); setBehaviour('');
    void load();
  }

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.pageTitle}>Health Inspections</h1>
          <p className={s.pageSub}>All inspection records across active quarantine batches</p>
        </div>
        {canAdd && (
          <button className={`${s.btn} ${s.btn_success}`} onClick={() => setShowForm(true)}>
            + New Inspection
          </button>
        )}
      </div>

      <div className={s.tableWrap}>
        <div className={s.tableHeader}><h2 className={s.tableTitle}>Inspection Records</h2></div>
        {loading ? <div className={s.empty}>Loading…</div> : inspections.length === 0 ? (
          <div className={s.empty}>No inspections recorded yet.</div>
        ) : (
          <table>
            <thead>
              <tr><th>Code</th><th>Batch</th><th>Type</th><th>Date</th><th>Inspector</th><th>Health</th><th>Temp °C</th><th>Recommendation</th></tr>
            </thead>
            <tbody>
              {inspections.map(i => (
                <tr key={i.id}>
                  <td>{i.inspection_code}</td>
                  <td>
                    <button className={s.backLink}
                      onClick={() => void navigate(`/quarantine/batches/${i.batch_id}`)}>
                      {i.batch_code ?? i.batch_id.slice(0,8)}
                    </button>
                  </td>
                  <td>{i.inspection_type.replace(/_/g,' ')}</td>
                  <td>{i.inspection_date}</td>
                  <td>{i.inspector_name}</td>
                  <td>
                    <span style={{ color: i.general_health === 'CRITICAL' ? '#dc2626' : i.general_health === 'POOR' ? '#d97706' : '#16a34a', fontWeight: 600 }}>
                      {i.general_health ?? '—'}
                    </span>
                  </td>
                  <td>{i.temperature_avg ?? '—'}</td>
                  <td style={{ fontSize: '0.78rem' }}>{i.vet_recommendation?.replace(/_/g,' ') ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className={s.tableFooter}>{inspections.length} inspection{inspections.length !== 1 ? 's' : ''}</div>
      </div>

      {showForm && (
        <div className={s.modal}>
          <div className={s.modalBackdrop} onClick={() => setShowForm(false)} />
          <div className={s.modalBox}>
            <h2 className={s.modalTitle}>Record Health Inspection</h2>
            {error && <div className={`${s.alert} ${s.alert_error}`}>⚠ {error}</div>}
            <div className={s.fieldRow}>
              <div className={s.field}>
                <label className={s.label}>Quarantine Batch *</label>
                <select className={s.select} value={batchId} onChange={e => setBatchId(e.target.value)}>
                  <option value="">— Select batch —</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.batch_code}</option>)}
                </select>
              </div>
              <div className={s.field}>
                <label className={s.label}>Inspection Type</label>
                <select className={s.select} value={inspType} onChange={e => setInspType(e.target.value)}>
                  <option value="ADMISSION">Admission</option>
                  <option value="PERIODIC">Periodic</option>
                  <option value="SUSPECTED_DISEASE">Disease Suspicion</option>
                  <option value="FINAL_RELEASE">Final Release</option>
                </select>
              </div>
            </div>
            <div className={s.fieldRow}>
              <div className={s.field}>
                <label className={s.label}>General Health</label>
                <select className={s.select} value={health} onChange={e => setHealth(e.target.value)}>
                  {['GOOD','FAIR','POOR','CRITICAL'].map(h => <option key={h}>{h}</option>)}
                </select>
              </div>
              <div className={s.field}>
                <label className={s.label}>Average Temperature (°C)</label>
                <input className={s.input} type="number" step="0.1" value={temperature}
                  onChange={e => setTemperature(e.target.value)} placeholder="e.g. 38.5" />
              </div>
            </div>
            <div className={s.field}>
              <label className={s.label}>Behaviour Observations</label>
              <input className={s.input} value={behaviour} onChange={e => setBehaviour(e.target.value)}
                placeholder="NORMAL, LETHARGIC, AGITATED…" />
            </div>
            <div className={s.field}>
              <label className={s.label}>Clinical Observations</label>
              <textarea className={s.textarea} value={observations} onChange={e => setObservations(e.target.value)}
                placeholder="Detailed clinical findings…" />
            </div>
            <div className={s.field}>
              <label className={s.label}>Veterinary Recommendation</label>
              <select className={s.select} value={recommendation} onChange={e => setRecommendation(e.target.value)}>
                <option value="CLEAR">Clear — no action required</option>
                <option value="EXTEND_QUARANTINE">Extend quarantine period</option>
                <option value="ISOLATE">Isolate affected animals</option>
                <option value="COLLECT_SAMPLE">Collect lab sample</option>
                <option value="TREAT">Administer treatment</option>
                <option value="PROHIBIT_MOVEMENT">Prohibit movement</option>
              </select>
            </div>
            <div className={s.field}>
              <label className={s.label}>Notes</label>
              <textarea className={s.textarea} value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <div className={s.formActions}>
              <button className={`${s.btn} ${s.btn_outline}`} onClick={() => setShowForm(false)}>Cancel</button>
              <button className={`${s.btn} ${s.btn_success}`} disabled={saving} onClick={() => void save()}>
                {saving ? 'Saving…' : 'Record Inspection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HealthInspectionsPage;
