import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase';
import type {
  QuarantineBatch, LabSample, TreatmentRecord,
  HealthInspection, DailyMonitoring,
} from '@/types/facility';
import s from './quarantine.module.css';

interface Criterion {
  key: string;
  label: string;
  pass: boolean;
  detail: string;
}

export function ClearancePage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { facilityId, staffId, staffName, staffRole } = useAuthStore();

  const [batch, setBatch]             = useState<QuarantineBatch | null>(null);
  const [samples, setSamples]         = useState<LabSample[]>([]);
  const [treatments, setTreatments]   = useState<TreatmentRecord[]>([]);
  const [inspections, setInspections] = useState<HealthInspection[]>([]);
  const [monitoring, setMonitoring]   = useState<DailyMonitoring[]>([]);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const [decision, setDecision]           = useState('CLEAR_FOR_EXPORT');
  const [notes, setNotes]                 = useState('');
  const [extensionDays, setExtensionDays] = useState('');

  const canDecide = staffRole === 'VETERINARY_OFFICER';
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => { void load(); }, [id]);

  async function load() {
    if (!id) return;
    setLoading(true);
    const [b, sm, t, i, m] = await Promise.all([
      supabase.from('quarantine_batches').select('*').eq('id', id).maybeSingle(),
      supabase.from('lab_samples').select('*').eq('batch_id', id),
      supabase.from('treatment_records').select('*').eq('batch_id', id),
      supabase.from('health_inspections').select('*').eq('batch_id', id),
      supabase.from('daily_monitoring_records').select('*').eq('batch_id', id)
        .order('monitoring_date', { ascending: false }).limit(1),
    ]);
    setBatch(b.data);
    setSamples(sm.data ?? []);
    setTreatments(t.data ?? []);
    setInspections(i.data ?? []);
    setMonitoring(m.data ?? []);
    setLoading(false);
  }

  function buildCriteria(b: QuarantineBatch): Criterion[] {
    const pendingSamples   = samples.filter(sm => sm.result === 'PENDING').length;
    const positiveSamples  = samples.filter(sm => sm.result === 'POSITIVE' || sm.result === 'INCONCLUSIVE').length;
    const activeWithdrawals = treatments.filter(t => t.withdrawal_end_date && t.withdrawal_end_date >= today).length;
    const lastRecord = monitoring[0];
    const sickOrDead = lastRecord ? (lastRecord.sick_count > 0 || lastRecord.dead_count > 0) : false;

    return [
      {
        key: 'period',
        label: 'Minimum quarantine period completed',
        pass: !!(b.expected_completion_date && b.expected_completion_date <= today),
        detail: b.expected_completion_date
          ? `Expected completion: ${b.expected_completion_date}`
          : 'No completion date set',
      },
      {
        key: 'hold',
        label: 'No active health restriction or hold',
        pass: b.status !== 'ON_HOLD',
        detail: b.status === 'ON_HOLD'
          ? `Hold reason: ${b.health_hold_reason ?? 'Not specified'}`
          : 'No active hold',
      },
      {
        key: 'inspections',
        label: 'Health inspection(s) completed',
        pass: inspections.length > 0,
        detail: `${inspections.length} inspection${inspections.length !== 1 ? 's' : ''} on record`,
      },
      {
        key: 'lab_pending',
        label: 'All laboratory results received',
        pass: pendingSamples === 0,
        detail: samples.length === 0
          ? 'No samples collected'
          : pendingSamples > 0
            ? `${pendingSamples} result(s) still pending`
            : 'All results received',
      },
      {
        key: 'lab_clear',
        label: 'No positive or inconclusive lab results',
        pass: positiveSamples === 0,
        detail: positiveSamples > 0
          ? `${positiveSamples} result(s) require resolution`
          : 'All results acceptable',
      },
      {
        key: 'withdrawal',
        label: 'All withdrawal periods expired',
        pass: activeWithdrawals === 0,
        detail: activeWithdrawals > 0
          ? `${activeWithdrawals} active withdrawal period(s)`
          : 'No active withdrawal periods',
      },
      {
        key: 'welfare',
        label: 'No current sick or dead animal incidents',
        pass: !sickOrDead,
        detail: lastRecord
          ? `Last check: ${lastRecord.sick_count} sick, ${lastRecord.dead_count} dead (${lastRecord.monitoring_date})`
          : 'No daily monitoring records',
      },
    ];
  }

  async function submitDecision() {
    if (!batch || !staffId) return;
    setSaving(true); setError(null);
    const criteria = buildCriteria(batch);
    const clearCode = `CLR-${Date.now()}`;
    const { error: e } = await supabase.from('quarantine_clearances').insert({
      clearance_code: clearCode,
      batch_id: batch.id,
      facility_id: facilityId,
      decision,
      decision_date: today,
      decided_by_id: staffId,
      decided_by_name: staffName,
      checklist: Object.fromEntries(criteria.map(c => [c.key, c.pass])),
      extension_days: decision === 'EXTEND' && extensionDays ? Number(extensionDays) : null,
      notes: notes || null,
    });
    if (e) { setSaving(false); setError(e.message); return; }

    const newStatus =
      ['CLEAR_FOR_EXPORT', 'CLEAR_FOR_SLAUGHTER', 'CLEAR_FOR_RETURN'].includes(decision) ? 'CLEARED' :
      decision === 'EXTEND' ? 'ACTIVE' : 'ON_HOLD';

    await supabase.from('quarantine_batches').update({
      status: newStatus,
      actual_completion_date: today,
      updated_at: new Date().toISOString(),
    }).eq('id', batch.id);

    setSaving(false);
    void navigate(`/quarantine/batches/${batch.id}`);
  }

  if (loading) return <div className={s.loading}>Loading clearance data…</div>;
  if (!batch)  return <div className={s.empty}>Batch not found.</div>;

  const criteria = buildCriteria(batch);
  const passCount = criteria.filter(c => c.pass).length;
  const allPass   = passCount === criteria.length;

  return (
    <div className={s.page}>
      <button className={s.backLink} onClick={() => void navigate(`/quarantine/batches/${batch.id}`)}>
        ← Back to {batch.batch_code}
      </button>

      <div className={s.pageHeader}>
        <div>
          <h1 className={s.pageTitle}>Quarantine Clearance Assessment</h1>
          <p className={s.pageSub}>{batch.batch_code} — {batch.animal_count} animals — {batch.quarantine_purpose}</p>
        </div>
        <span className={`${s.badge} ${s['badge_' + batch.status]}`} style={{ fontSize: '0.85rem', padding: '4px 12px' }}>
          {batch.status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className={s.detailGrid}>
        <div className={s.card}>
          <h3 className={s.cardTitle}>Criteria Summary</h3>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: allPass ? '#16a34a' : '#d97706', lineHeight: 1 }}>
            {passCount}/{criteria.length}
          </div>
          <div style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 8px' }}>criteria satisfied</div>
          <div style={{ height: '8px', borderRadius: '4px', background: '#e2e8f0', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${(passCount / criteria.length) * 100}%`,
              background: allPass ? '#16a34a' : '#f59e0b',
              transition: 'width 0.3s',
            }} />
          </div>
        </div>
        <div className={s.card}>
          <h3 className={s.cardTitle}>Batch Details</h3>
          <div className={s.kv}>
            <div className={s.kvRow}><span className={s.kvKey}>Admitted</span><span className={s.kvVal}>{batch.admission_date}</span></div>
            <div className={s.kvRow}><span className={s.kvKey}>Quarantine Period</span><span className={s.kvVal}>{batch.quarantine_days} days</span></div>
            <div className={s.kvRow}><span className={s.kvKey}>Expected Completion</span><span className={s.kvVal}>{batch.expected_completion_date ?? '—'}</span></div>
            <div className={s.kvRow}><span className={s.kvKey}>Vet Officer</span><span className={s.kvVal}>{batch.vet_officer_name ?? '—'}</span></div>
          </div>
        </div>
      </div>

      <div className={s.card}>
        <h3 className={s.cardTitle}>Clearance Criteria</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {criteria.map(c => (
            <div key={c.key} style={{
              display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
              padding: '0.75rem 1rem',
              background: c.pass ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${c.pass ? '#bbf7d0' : '#fecaca'}`,
              borderRadius: '8px',
            }}>
              <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: '1px' }}>{c.pass ? '✅' : '❌'}</span>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: c.pass ? '#14532d' : '#991b1b' }}>{c.label}</div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>{c.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {allPass
        ? <div className={`${s.alert} ${s.alert_success}`}>✅ All clearance criteria satisfied. This batch is ready for a clearance decision.</div>
        : <div className={`${s.alert} ${s.alert_warning}`}>⚠ {criteria.length - passCount} criterion/criteria not met. A decision can still be recorded; unmet criteria will be noted in the clearance record.</div>
      }

      {canDecide ? (
        <div className={s.card}>
          <h3 className={s.cardTitle}>Issue Clearance Decision</h3>
          {error && <div className={`${s.alert} ${s.alert_error}`}>⚠ {error}</div>}
          <div className={s.fieldRow}>
            <div className={s.field}>
              <label className={s.label}>Decision *</label>
              <select className={s.select} value={decision} onChange={e => setDecision(e.target.value)}>
                <option value="CLEAR_FOR_EXPORT">Clear for Export</option>
                <option value="CLEAR_FOR_SLAUGHTER">Clear for Domestic Slaughter</option>
                <option value="CLEAR_FOR_RETURN">Return to Farm of Origin</option>
                <option value="EXTEND">Extend Quarantine Period</option>
                <option value="PROHIBIT">Prohibit Movement</option>
              </select>
            </div>
            {decision === 'EXTEND' && (
              <div className={s.field}>
                <label className={s.label}>Extension Days</label>
                <input className={s.input} type="number" min={1} value={extensionDays}
                  onChange={e => setExtensionDays(e.target.value)} placeholder="e.g. 7" />
              </div>
            )}
          </div>
          <div className={s.field}>
            <label className={s.label}>Veterinary Notes / Justification</label>
            <textarea className={s.textarea} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Basis for the clearance decision, any conditions or observations…" />
          </div>
          <div className={s.formActions}>
            <button className={`${s.btn} ${s.btn_outline}`} onClick={() => void navigate(`/quarantine/batches/${batch.id}`)}>
              Cancel
            </button>
            <button
              className={`${s.btn} ${decision === 'PROHIBIT' ? s.btn_danger : allPass ? s.btn_success : s.btn_warning}`}
              disabled={saving}
              onClick={() => void submitDecision()}
            >
              {saving ? 'Recording…' : 'Record Decision'}
            </button>
          </div>
        </div>
      ) : (
        <div className={`${s.alert} ${s.alert_info}`}>
          ℹ Only a Veterinary Officer can issue quarantine clearance decisions.
        </div>
      )}
    </div>
  );
}

export default ClearancePage;
