import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase';
import type { LabSample, QuarantineBatch } from '@/types/facility';
import s from './quarantine.module.css';

const RESULT_COLORS: Record<string, string> = {
  PENDING: '#64748b', NEGATIVE: '#16a34a', POSITIVE: '#dc2626',
  INCONCLUSIVE: '#d97706', RETEST_REQUIRED: '#9333ea',
};

export function LabSamplesPage(): JSX.Element {
  const { facilityId, staffId, staffName, staffRole } = useAuthStore();
  const [samples, setSamples]   = useState<(LabSample & { batch_code?: string })[]>([]);
  const [batches, setBatches]   = useState<QuarantineBatch[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<LabSample | null>(null);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // Collection form
  const [batchId, setBatchId]       = useState('');
  const [tagNumber, setTagNumber]   = useState('');
  const [sampleType, setSampleType] = useState('BLOOD');
  const [testType, setTestType]     = useState('');
  const [labDest, setLabDest]       = useState('');

  // Result form
  const [resultVal, setResultVal]   = useState('NEGATIVE');
  const [resultNotes, setResultNotes] = useState('');

  const canCollect = ['LAB_TECHNICIAN','VETERINARY_OFFICER'].includes(staffRole ?? '');
  const canEnterResult = staffRole === 'LAB_TECHNICIAN';

  useEffect(() => { void load(); }, [facilityId]);

  async function load() {
    if (!facilityId) return;
    setLoading(true);
    const [sRes, bRes] = await Promise.all([
      supabase.from('lab_samples').select('*').eq('facility_id', facilityId)
        .order('created_at', { ascending: false }).limit(150),
      supabase.from('quarantine_batches').select('id, batch_code')
        .eq('facility_id', facilityId).in('status', ['ADMITTED','ACTIVE','ON_HOLD']),
    ]);
    const batchMap = Object.fromEntries((bRes.data ?? []).map(b => [b.id, b.batch_code]));
    setSamples((sRes.data ?? []).map(s => ({ ...s, batch_code: batchMap[s.batch_id] })));
    setBatches(bRes.data ?? []);
    setLoading(false);
  }

  async function collectSample() {
    if (!batchId || !testType.trim()) { setError('Select a batch and enter the test type.'); return; }
    setSaving(true); setError(null);
    const code = `SMP-${Date.now()}`;
    const { error: e } = await supabase.from('lab_samples').insert({
      sample_code: code,
      batch_id: batchId,
      facility_id: facilityId,
      tag_number: tagNumber || null,
      sample_type: sampleType,
      test_type: testType,
      collection_date: new Date().toISOString().slice(0, 10),
      collector_id: staffId,
      collector_name: staffName,
      lab_destination: labDest || null,
      status: 'COLLECTED',
      result: 'PENDING',
    });
    setSaving(false);
    if (e) { setError(e.message); return; }
    setShowForm(false); setBatchId(''); setTagNumber(''); setTestType(''); setLabDest('');
    void load();
  }

  async function enterResult() {
    if (!selected) return;
    setSaving(true); setError(null);
    const triggerHold = ['POSITIVE','INCONCLUSIVE'].includes(resultVal);
    const { error: e } = await supabase.from('lab_samples').update({
      result: resultVal,
      result_date: new Date().toISOString().slice(0, 10),
      result_notes: resultNotes || null,
      status: 'RESULTED',
      auto_hold_triggered: triggerHold,
      updated_at: new Date().toISOString(),
    }).eq('id', selected.id);

    if (!e && triggerHold) {
      await supabase.from('quarantine_batches').update({
        status: 'ON_HOLD',
        health_hold_reason: `Lab result: ${resultVal} for ${selected.test_type}`,
        updated_at: new Date().toISOString(),
      }).eq('id', selected.batch_id);
    }
    setSaving(false);
    if (e) { setError(e.message); return; }
    setSelected(null); setResultNotes('');
    void load();
  }

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.pageTitle}>Laboratory Samples</h1>
          <p className={s.pageSub}>Sample collection, chain of custody and test results</p>
        </div>
        {canCollect && (
          <button className={`${s.btn} ${s.btn_success}`} onClick={() => setShowForm(true)}>
            + Collect Sample
          </button>
        )}
      </div>

      {/* Result summary */}
      <div className={s.statGrid} style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {(['PENDING','NEGATIVE','POSITIVE','INCONCLUSIVE','RETEST_REQUIRED'] as const).map(r => (
          <div key={r} className={s.statCard}>
            <div className={s.statValue}>
              {samples.filter(s => s.result === r).length}
            </div>
            <div className={s.statLabel}>{r.replace(/_/g,' ')}</div>
          </div>
        ))}
      </div>

      <div className={s.tableWrap}>
        <div className={s.tableHeader}><h2 className={s.tableTitle}>Sample Records</h2></div>
        {loading ? <div className={s.empty}>Loading…</div> : samples.length === 0 ? (
          <div className={s.empty}>No samples recorded.</div>
        ) : (
          <table>
            <thead>
              <tr><th>Code</th><th>Batch</th><th>Tag</th><th>Sample Type</th><th>Test</th><th>Collected</th><th>Lab</th><th>Status</th><th>Result</th><th></th></tr>
            </thead>
            <tbody>
              {samples.map(sm => (
                <tr key={sm.id}>
                  <td><strong>{sm.sample_code}</strong></td>
                  <td>{sm.batch_code ?? sm.batch_id.slice(0,8)}</td>
                  <td>{sm.tag_number ?? 'Batch'}</td>
                  <td>{sm.sample_type}</td>
                  <td>{sm.test_type}</td>
                  <td>{sm.collection_date}</td>
                  <td>{sm.lab_destination ?? '—'}</td>
                  <td><span className={`${s.badge} ${s['badge_' + sm.status]}`}>{sm.status}</span></td>
                  <td>
                    <span className={s.badge} style={{ background: RESULT_COLORS[sm.result] + '20', color: RESULT_COLORS[sm.result], border: `1px solid ${RESULT_COLORS[sm.result]}40` }}>
                      {sm.result}
                    </span>
                    {sm.auto_hold_triggered && <span style={{ marginLeft: 4, fontSize: '0.7rem' }}>🔒</span>}
                  </td>
                  <td>
                    {canEnterResult && sm.result === 'PENDING' && (
                      <button className={`${s.btn} ${s.btn_primary}`} onClick={() => { setSelected(sm); setResultVal('NEGATIVE'); setResultNotes(''); }}>
                        Enter Result
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className={s.tableFooter}>{samples.length} sample{samples.length !== 1 ? 's' : ''}</div>
      </div>

      {/* Collect sample modal */}
      {showForm && (
        <div className={s.modal}>
          <div className={s.modalBackdrop} onClick={() => setShowForm(false)} />
          <div className={s.modalBox}>
            <h2 className={s.modalTitle}>Collect Lab Sample</h2>
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
                <label className={s.label}>Animal Tag (optional)</label>
                <input className={s.input} value={tagNumber} onChange={e => setTagNumber(e.target.value)}
                  placeholder="Leave blank for batch-level sample" />
              </div>
            </div>
            <div className={s.fieldRow}>
              <div className={s.field}>
                <label className={s.label}>Sample Type</label>
                <select className={s.select} value={sampleType} onChange={e => setSampleType(e.target.value)}>
                  {['BLOOD','NASAL_SWAB','RECTAL_SWAB','TISSUE','URINE','FECES','OTHER'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className={s.field}>
                <label className={s.label}>Test Type *</label>
                <input className={s.input} value={testType} onChange={e => setTestType(e.target.value)}
                  placeholder="e.g. FMD PCR, Brucellosis ELISA" />
              </div>
            </div>
            <div className={s.field}>
              <label className={s.label}>Laboratory Destination</label>
              <input className={s.input} value={labDest} onChange={e => setLabDest(e.target.value)}
                placeholder="e.g. National Veterinary Laboratory, Mogadishu" />
            </div>
            <div className={s.formActions}>
              <button className={`${s.btn} ${s.btn_outline}`} onClick={() => setShowForm(false)}>Cancel</button>
              <button className={`${s.btn} ${s.btn_success}`} disabled={saving} onClick={() => void collectSample()}>
                {saving ? 'Saving…' : 'Record Sample'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enter result modal */}
      {selected && (
        <div className={s.modal}>
          <div className={s.modalBackdrop} onClick={() => setSelected(null)} />
          <div className={s.modalBox}>
            <h2 className={s.modalTitle}>Enter Lab Result — {selected.sample_code}</h2>
            {error && <div className={`${s.alert} ${s.alert_error}`}>⚠ {error}</div>}
            <div className={s.kv} style={{ marginBottom: '1rem' }}>
              <div className={s.kvRow}><span className={s.kvKey}>Sample Type</span><span className={s.kvVal}>{selected.sample_type}</span></div>
              <div className={s.kvRow}><span className={s.kvKey}>Test Type</span><span className={s.kvVal}>{selected.test_type}</span></div>
              <div className={s.kvRow}><span className={s.kvKey}>Collected</span><span className={s.kvVal}>{selected.collection_date}</span></div>
            </div>
            {(resultVal === 'POSITIVE' || resultVal === 'INCONCLUSIVE') && (
              <div className={`${s.alert} ${s.alert_warning}`}>
                ⚠ A {resultVal} result will automatically place the quarantine batch on <strong>Health Hold</strong>.
              </div>
            )}
            <div className={s.field}>
              <label className={s.label}>Result *</label>
              <select className={s.select} value={resultVal} onChange={e => setResultVal(e.target.value)}>
                <option value="NEGATIVE">Negative</option>
                <option value="POSITIVE">Positive</option>
                <option value="INCONCLUSIVE">Inconclusive</option>
                <option value="RETEST_REQUIRED">Retest Required</option>
              </select>
            </div>
            <div className={s.field}>
              <label className={s.label}>Result Notes</label>
              <textarea className={s.textarea} value={resultNotes} onChange={e => setResultNotes(e.target.value)}
                placeholder="Lab notes, values, interpretations…" />
            </div>
            <div className={s.formActions}>
              <button className={`${s.btn} ${s.btn_outline}`} onClick={() => setSelected(null)}>Cancel</button>
              <button className={`${s.btn} ${s.btn_primary}`} disabled={saving} onClick={() => void enterResult()}>
                {saving ? 'Saving…' : 'Submit Result'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LabSamplesPage;
