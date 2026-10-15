import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase';
import type { SlaughterRecord, AnteMortemInspection } from '@/types/facility';
import s from '../quarantine/quarantine.module.css';

const DECISION_COLOR: Record<string, string> = {
  FIT: '#16a34a', CONDITIONALLY_FIT: '#d97706',
  DETAINED: '#9333ea', UNFIT: '#dc2626', EMERGENCY: '#ea580c',
};

export function AnteMortemPage(): JSX.Element {
  const { facilityId, staffId, staffName, staffRole } = useAuthStore();
  const [pending, setPending]     = useState<SlaughterRecord[]>([]);
  const [inspected, setInspected] = useState<AnteMortemInspection[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<SlaughterRecord | null>(null);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const [health, setHealth]       = useState('');
  const [behaviour, setBehaviour] = useState('');
  const [mobility, setMobility]   = useState('');
  const [symptoms, setSymptoms]   = useState('');
  const [testingReq, setTestingReq]   = useState(false);
  const [isolationReq, setIsolationReq] = useState(false);
  const [decision, setDecision]   = useState('FIT');
  const [conditions, setConditions] = useState('');
  const [notes, setNotes]         = useState('');

  const canInspect = ['MEAT_INSPECTOR', 'VETERINARY_OFFICER', 'SLAUGHTER_SUPERVISOR'].includes(staffRole ?? '');

  useEffect(() => { void load(); }, [facilityId]);

  async function load() {
    if (!facilityId) return;
    setLoading(true);
    const [pRes, iRes] = await Promise.all([
      supabase.from('slaughter_records').select('*').eq('facility_id', facilityId)
        .in('status', ['RECEIVED', 'ANTE_MORTEM_PENDING']).order('created_at'),
      supabase.from('ante_mortem_inspections').select('*').eq('facility_id', facilityId)
        .order('created_at', { ascending: false }).limit(100),
    ]);
    setPending(pRes.data ?? []);
    setInspected(iRes.data ?? []);
    setLoading(false);
  }

  function resetForm() {
    setHealth(''); setBehaviour(''); setMobility(''); setSymptoms('');
    setTestingReq(false); setIsolationReq(false);
    setDecision('FIT'); setConditions(''); setNotes('');
  }

  async function submitInspection() {
    if (!selected || !staffId) return;
    setSaving(true); setError(null);
    const { error: e } = await supabase.from('ante_mortem_inspections').insert({
      slaughter_id: selected.id,
      facility_id: facilityId,
      tag_number: selected.tag_number,
      inspection_date: new Date().toISOString().slice(0, 10),
      inspector_id: staffId,
      inspector_name: staffName,
      health_condition: health || null,
      behaviour: behaviour || null,
      mobility: mobility || null,
      visible_symptoms: symptoms || null,
      testing_required: testingReq,
      isolation_required: isolationReq,
      decision,
      conditions: conditions || null,
      notes: notes || null,
    });
    if (e) { setSaving(false); setError(e.message); return; }

    const newStatus =
      decision === 'FIT' || decision === 'CONDITIONALLY_FIT' ? 'ANTE_MORTEM_PASSED' :
      decision === 'DETAINED' ? 'DETAINED' : 'REJECTED';

    await supabase.from('slaughter_records').update({
      status: newStatus, updated_at: new Date().toISOString(),
    }).eq('id', selected.id);

    setSaving(false); setSelected(null); resetForm();
    void load();
  }

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.pageTitle}>Ante-mortem Inspection</h1>
          <p className={s.pageSub}>Pre-slaughter health assessment — {pending.length} animal{pending.length !== 1 ? 's' : ''} awaiting inspection</p>
        </div>
      </div>

      <div className={s.tableWrap}>
        <div className={s.tableHeader}><h2 className={s.tableTitle}>Awaiting Inspection</h2></div>
        {loading ? <div className={s.empty}>Loading…</div> : pending.length === 0 ? (
          <div className={s.empty}>No animals awaiting ante-mortem inspection.</div>
        ) : (
          <table>
            <thead>
              <tr><th>Code</th><th>Tag</th><th>Species</th><th>Pen</th><th>Arrival Condition</th><th>Received By</th><th></th></tr>
            </thead>
            <tbody>
              {pending.map(r => (
                <tr key={r.id}>
                  <td><strong>{r.slaughter_code}</strong></td>
                  <td>{r.tag_number}</td>
                  <td>{r.species}</td>
                  <td>{r.pen_assignment ?? '—'}</td>
                  <td>{r.arrival_condition}</td>
                  <td>{r.received_by_name ?? '—'}</td>
                  <td>
                    {canInspect && (
                      <button className={`${s.btn} ${s.btn_primary}`} onClick={() => { setSelected(r); resetForm(); }}>
                        Inspect
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className={s.tableFooter}>{pending.length} pending</div>
      </div>

      <div className={s.tableWrap}>
        <div className={s.tableHeader}><h2 className={s.tableTitle}>Recent Inspections</h2></div>
        {inspected.length === 0 ? <div className={s.empty}>No inspections yet.</div> : (
          <table>
            <thead>
              <tr><th>Tag</th><th>Date</th><th>Inspector</th><th>Health</th><th>Decision</th><th>Testing</th><th>Isolation</th></tr>
            </thead>
            <tbody>
              {inspected.map(i => (
                <tr key={i.id}>
                  <td><strong>{i.tag_number}</strong></td>
                  <td>{i.inspection_date}</td>
                  <td>{i.inspector_name}</td>
                  <td>{i.health_condition ?? '—'}</td>
                  <td>
                    <span className={s.badge} style={{
                      background: (DECISION_COLOR[i.decision] ?? '#64748b') + '18',
                      color: DECISION_COLOR[i.decision] ?? '#64748b',
                      border: `1px solid ${(DECISION_COLOR[i.decision] ?? '#64748b')}35`,
                    }}>{i.decision.replace(/_/g, ' ')}</span>
                  </td>
                  <td>{i.testing_required ? '⚠ Yes' : 'No'}</td>
                  <td>{i.isolation_required ? '⚠ Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className={s.tableFooter}>{inspected.length} inspection{inspected.length !== 1 ? 's' : ''}</div>
      </div>

      {selected && (
        <div className={s.modal}>
          <div className={s.modalBackdrop} onClick={() => setSelected(null)} />
          <div className={`${s.modalBox} ${s.modalBoxWide}`}>
            <h2 className={s.modalTitle}>Ante-mortem Inspection — {selected.tag_number}</h2>
            {error && <div className={`${s.alert} ${s.alert_error}`}>⚠ {error}</div>}
            <div className={s.kv} style={{ marginBottom: '1rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '6px' }}>
              <div className={s.kvRow}><span className={s.kvKey}>Species</span><span className={s.kvVal}>{selected.species}</span></div>
              <div className={s.kvRow}><span className={s.kvKey}>Arrival Condition</span><span className={s.kvVal}>{selected.arrival_condition}</span></div>
              <div className={s.kvRow}><span className={s.kvKey}>Pen</span><span className={s.kvVal}>{selected.pen_assignment ?? '—'}</span></div>
              <div className={s.kvRow}><span className={s.kvKey}>Owner</span><span className={s.kvVal}>{selected.owner_name ?? '—'}</span></div>
            </div>
            <div className={s.fieldRow}>
              <div className={s.field}>
                <label className={s.label}>Health Condition</label>
                <input className={s.input} value={health} onChange={e => setHealth(e.target.value)} placeholder="e.g. Good, Emaciated…" />
              </div>
              <div className={s.field}>
                <label className={s.label}>Behaviour</label>
                <input className={s.input} value={behaviour} onChange={e => setBehaviour(e.target.value)} placeholder="e.g. Alert, Lethargic…" />
              </div>
            </div>
            <div className={s.fieldRow}>
              <div className={s.field}>
                <label className={s.label}>Mobility</label>
                <input className={s.input} value={mobility} onChange={e => setMobility(e.target.value)} placeholder="e.g. Normal, Lame…" />
              </div>
              <div className={s.field}>
                <label className={s.label}>Visible Symptoms</label>
                <input className={s.input} value={symptoms} onChange={e => setSymptoms(e.target.value)} placeholder="Describe any symptoms…" />
              </div>
            </div>
            <div className={s.fieldRow} style={{ marginBottom: '1rem' }}>
              <label className={s.checklistItem}>
                <input type="checkbox" checked={testingReq} onChange={e => setTestingReq(e.target.checked)} />
                Additional testing required before slaughter
              </label>
              <label className={s.checklistItem}>
                <input type="checkbox" checked={isolationReq} onChange={e => setIsolationReq(e.target.checked)} />
                Isolation required
              </label>
            </div>
            <div className={s.field}>
              <label className={s.label}>Inspection Decision *</label>
              <select className={s.select} value={decision} onChange={e => setDecision(e.target.value)}>
                <option value="FIT">FIT — Passed, proceed to slaughter</option>
                <option value="CONDITIONALLY_FIT">CONDITIONALLY_FIT — Passed with conditions</option>
                <option value="DETAINED">DETAINED — Hold for further observation</option>
                <option value="UNFIT">UNFIT — Rejected, not fit for slaughter</option>
                <option value="EMERGENCY">EMERGENCY — Emergency slaughter required</option>
              </select>
            </div>
            {(decision === 'CONDITIONALLY_FIT' || decision === 'DETAINED') && (
              <div className={s.field}>
                <label className={s.label}>Conditions / Detention Reason</label>
                <textarea className={s.textarea} value={conditions} onChange={e => setConditions(e.target.value)}
                  placeholder="Specify conditions or reasons for detention…" />
              </div>
            )}
            <div className={s.field}>
              <label className={s.label}>Notes</label>
              <textarea className={s.textarea} value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <div className={s.formActions}>
              <button className={`${s.btn} ${s.btn_outline}`} onClick={() => setSelected(null)}>Cancel</button>
              <button
                className={`${s.btn} ${
                  decision === 'FIT' || decision === 'CONDITIONALLY_FIT' ? s.btn_success :
                  decision === 'DETAINED' ? s.btn_warning : s.btn_danger
                }`}
                disabled={saving}
                onClick={() => void submitInspection()}
              >
                {saving ? 'Recording…' : 'Record Decision'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AnteMortemPage;
