import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase';
import type { DailyMonitoring, QuarantineBatch } from '@/types/facility';
import s from './quarantine.module.css';

export function DailyMonitoringPage(): JSX.Element {
  const { facilityId, staffId, staffName, staffRole } = useAuthStore();
  const [records, setRecords]   = useState<(DailyMonitoring & { batch_code?: string })[]>([]);
  const [batches, setBatches]   = useState<QuarantineBatch[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const [batchId, setBatchId]           = useState('');
  const [feedOk, setFeedOk]             = useState(true);
  const [waterOk, setWaterOk]           = useState(true);
  const [behaviour, setBehaviour]       = useState('NORMAL');
  const [symptoms, setSymptoms]         = useState('');
  const [sickCount, setSickCount]       = useState(0);
  const [injuredCount, setInjuredCount] = useState(0);
  const [deadCount, setDeadCount]       = useState(0);
  const [missingCount, setMissingCount] = useState(0);
  const [isolation, setIsolation]       = useState('');
  const [penIncidents, setPenIncidents] = useState('');
  const [bioIncidents, setBioIncidents] = useState('');

  const canVerify = ['QUARANTINE_SUPERVISOR','VETERINARY_OFFICER'].includes(staffRole ?? '');

  useEffect(() => { void load(); }, [facilityId]);

  async function load() {
    if (!facilityId) return;
    setLoading(true);
    const [rRes, bRes] = await Promise.all([
      supabase.from('daily_monitoring_records').select('*').eq('facility_id', facilityId)
        .order('monitoring_date', { ascending: false }).order('created_at', { ascending: false }).limit(100),
      supabase.from('quarantine_batches').select('id, batch_code')
        .eq('facility_id', facilityId).in('status', ['ADMITTED','ACTIVE','ON_HOLD']),
    ]);
    const batchMap = Object.fromEntries((bRes.data ?? []).map(b => [b.id, b.batch_code]));
    setRecords((rRes.data ?? []).map(r => ({ ...r, batch_code: batchMap[r.batch_id] })));
    setBatches(bRes.data ?? []);
    setLoading(false);
  }

  async function save() {
    if (!batchId) { setError('Select a quarantine batch.'); return; }
    setSaving(true); setError(null);
    const { error: e } = await supabase.from('daily_monitoring_records').insert({
      batch_id: batchId,
      facility_id: facilityId,
      monitoring_date: new Date().toISOString().slice(0, 10),
      recorded_by_id: staffId,
      recorded_by_name: staffName,
      feed_available: feedOk,
      water_available: waterOk,
      general_behaviour: behaviour,
      visible_symptoms: symptoms || null,
      sick_count: sickCount,
      injured_count: injuredCount,
      dead_count: deadCount,
      missing_count: missingCount,
      isolation_actions: isolation || null,
      pen_incidents: penIncidents || null,
      biosecurity_incidents: bioIncidents || null,
    });
    setSaving(false);
    if (e) { setError(e.message); return; }
    setShowForm(false);
    setBatchId(''); setSymptoms(''); setIsolation(''); setPenIncidents(''); setBioIncidents('');
    setSickCount(0); setInjuredCount(0); setDeadCount(0); setMissingCount(0);
    void load();
  }

  async function verify(recordId: string) {
    await supabase.from('daily_monitoring_records').update({
      verified_by_id: staffId,
      verified_by_name: staffName,
      verified_at: new Date().toISOString(),
    }).eq('id', recordId);
    void load();
  }

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.pageTitle}>Daily Monitoring</h1>
          <p className={s.pageSub}>Daily animal welfare and pen condition records</p>
        </div>
        <button className={`${s.btn} ${s.btn_success}`} onClick={() => setShowForm(true)}>
          + Today&apos;s Record
        </button>
      </div>

      <div className={s.tableWrap}>
        <div className={s.tableHeader}><h2 className={s.tableTitle}>Monitoring Records</h2></div>
        {loading ? <div className={s.empty}>Loading…</div> : records.length === 0 ? (
          <div className={s.empty}>No daily monitoring records yet.</div>
        ) : (
          <table>
            <thead>
              <tr><th>Date</th><th>Batch</th><th>Feed</th><th>Water</th><th>Behaviour</th>
                <th>Sick</th><th>Injured</th><th>Dead</th><th>Missing</th><th>Recorded By</th><th>Verified</th><th></th></tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id}>
                  <td><strong>{r.monitoring_date}</strong></td>
                  <td>{r.batch_code ?? r.batch_id.slice(0,8)}</td>
                  <td>{r.feed_available ? '✅' : '❌'}</td>
                  <td>{r.water_available ? '✅' : '❌'}</td>
                  <td><span style={{ color: r.general_behaviour === 'AGITATED' ? '#dc2626' : r.general_behaviour === 'LETHARGIC' ? '#d97706' : '#16a34a', fontWeight: 600 }}>{r.general_behaviour ?? '—'}</span></td>
                  <td style={{ color: r.sick_count > 0 ? '#dc2626' : undefined }}>{r.sick_count}</td>
                  <td style={{ color: r.injured_count > 0 ? '#d97706' : undefined }}>{r.injured_count}</td>
                  <td style={{ color: r.dead_count > 0 ? '#dc2626' : undefined }}>{r.dead_count}</td>
                  <td style={{ color: r.missing_count > 0 ? '#d97706' : undefined }}>{r.missing_count}</td>
                  <td>{r.recorded_by_name}</td>
                  <td>{r.verified_by_name ? <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ {r.verified_by_name}</span> : '—'}</td>
                  <td>
                    {canVerify && !r.verified_by_name && (
                      <button className={`${s.btn} ${s.btn_outline}`} onClick={() => void verify(r.id)}>Verify</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className={s.tableFooter}>{records.length} record{records.length !== 1 ? 's' : ''}</div>
      </div>

      {showForm && (
        <div className={s.modal}>
          <div className={s.modalBackdrop} onClick={() => setShowForm(false)} />
          <div className={`${s.modalBox} ${s.modalBoxWide}`}>
            <h2 className={s.modalTitle}>Daily Monitoring Record — {new Date().toLocaleDateString()}</h2>
            {error && <div className={`${s.alert} ${s.alert_error}`}>⚠ {error}</div>}

            <div className={s.field}>
              <label className={s.label}>Quarantine Batch *</label>
              <select className={s.select} value={batchId} onChange={e => setBatchId(e.target.value)}>
                <option value="">— Select batch —</option>
                {batches.map(b => <option key={b.id} value={b.id}>{b.batch_code}</option>)}
              </select>
            </div>

            <div className={s.fieldRow}>
              <label className={s.checklistItem}>
                <input type="checkbox" checked={feedOk} onChange={e => setFeedOk(e.target.checked)} />
                Feed available and adequate
              </label>
              <label className={s.checklistItem}>
                <input type="checkbox" checked={waterOk} onChange={e => setWaterOk(e.target.checked)} />
                Water available and clean
              </label>
            </div>

            <div className={s.fieldRow}>
              <div className={s.field}>
                <label className={s.label}>General Behaviour</label>
                <select className={s.select} value={behaviour} onChange={e => setBehaviour(e.target.value)}>
                  {['NORMAL','LETHARGIC','AGITATED','MIXED'].map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div className={s.field}>
                <label className={s.label}>Visible Symptoms</label>
                <input className={s.input} value={symptoms} onChange={e => setSymptoms(e.target.value)}
                  placeholder="Describe any visible symptoms…" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
              {[['Sick Animals', sickCount, setSickCount], ['Injured Animals', injuredCount, setInjuredCount],
                ['Dead Animals', deadCount, setDeadCount], ['Missing Animals', missingCount, setMissingCount]
              ].map(([label, val, setter]) => (
                <div key={label as string} className={s.field}>
                  <label className={s.label}>{label as string}</label>
                  <input className={s.input} type="number" min={0} value={val as number}
                    onChange={e => (setter as (n: number) => void)(Number(e.target.value))} />
                </div>
              ))}
            </div>

            <div className={s.field}>
              <label className={s.label}>Isolation Actions Taken</label>
              <textarea className={s.textarea} value={isolation} onChange={e => setIsolation(e.target.value)}
                placeholder="Describe any animals isolated and reason…" />
            </div>
            <div className={s.fieldRow}>
              <div className={s.field}>
                <label className={s.label}>Pen / Facility Incidents</label>
                <textarea className={s.textarea} value={penIncidents} onChange={e => setPenIncidents(e.target.value)} />
              </div>
              <div className={s.field}>
                <label className={s.label}>Biosecurity Incidents</label>
                <textarea className={s.textarea} value={bioIncidents} onChange={e => setBioIncidents(e.target.value)} />
              </div>
            </div>

            <div className={s.formActions}>
              <button className={`${s.btn} ${s.btn_outline}`} onClick={() => setShowForm(false)}>Cancel</button>
              <button className={`${s.btn} ${s.btn_success}`} disabled={saving} onClick={() => void save()}>
                {saving ? 'Saving…' : 'Submit Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DailyMonitoringPage;
