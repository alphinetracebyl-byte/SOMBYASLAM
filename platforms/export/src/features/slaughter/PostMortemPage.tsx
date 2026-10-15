import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase';
import type { SlaughterRecord, PostMortemInspection } from '@/types/facility';
import s from '../quarantine/quarantine.module.css';

const DECISION_COLOR: Record<string, string> = {
  PASSED: '#16a34a', CONDITIONALLY_PASSED: '#d97706', CONDEMNED: '#dc2626',
};

export function PostMortemPage(): JSX.Element {
  const { facilityId, staffId, staffName, staffRole } = useAuthStore();
  const [pending, setPending]       = useState<SlaughterRecord[]>([]);
  const [inspections, setInspections] = useState<PostMortemInspection[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<SlaughterRecord | null>(null);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const [carcassCondition, setCarcassCondition]     = useState('');
  const [headFindings, setHeadFindings]             = useState('');
  const [organFindings, setOrganFindings]           = useState('');
  const [lesions, setLesions]                       = useState('');
  const [contamination, setContamination]           = useState('');
  const [disease, setDisease]                       = useState('');
  const [samplesCollected, setSamplesCollected]     = useState(false);
  const [sampleDetails, setSampleDetails]           = useState('');
  const [decision, setDecision]                     = useState('PASSED');
  const [condemnedParts, setCondemnedParts]         = useState('');
  const [condemnedWeight, setCondemnedWeight]       = useState('');
  const [disposalMethod, setDisposalMethod]         = useState('');
  const [condemnationReason, setCondemnationReason] = useState('');
  const [notes, setNotes]                           = useState('');

  const canInspect = ['MEAT_INSPECTOR', 'VETERINARY_OFFICER', 'SLAUGHTER_SUPERVISOR'].includes(staffRole ?? '');

  useEffect(() => { void load(); }, [facilityId]);

  async function load() {
    if (!facilityId) return;
    setLoading(true);
    const [pRes, iRes] = await Promise.all([
      supabase.from('slaughter_records').select('*').eq('facility_id', facilityId)
        .eq('status', 'SLAUGHTERED').order('slaughter_date', { ascending: false }),
      supabase.from('post_mortem_inspections').select('*').eq('facility_id', facilityId)
        .order('created_at', { ascending: false }).limit(150),
    ]);
    setPending(pRes.data ?? []);
    setInspections(iRes.data ?? []);
    setLoading(false);
  }

  function resetForm() {
    setCarcassCondition(''); setHeadFindings(''); setOrganFindings('');
    setLesions(''); setContamination(''); setDisease('');
    setSamplesCollected(false); setSampleDetails('');
    setDecision('PASSED'); setCondemnedParts(''); setCondemnedWeight('');
    setDisposalMethod(''); setCondemnationReason(''); setNotes('');
  }

  async function submitInspection() {
    if (!selected || !staffId || !selected.carcass_code) return;
    setSaving(true); setError(null);
    const { error: e } = await supabase.from('post_mortem_inspections').insert({
      slaughter_id: selected.id,
      facility_id: facilityId,
      carcass_code: selected.carcass_code,
      inspection_date: new Date().toISOString().slice(0, 10),
      inspector_id: staffId,
      inspector_name: staffName,
      carcass_condition: carcassCondition || null,
      head_findings: headFindings || null,
      organ_findings: organFindings || null,
      visible_lesions: lesions || null,
      contamination: contamination || null,
      suspected_disease: disease || null,
      samples_collected: samplesCollected,
      sample_details: samplesCollected ? sampleDetails || null : null,
      decision,
      condemnation_reason: decision === 'CONDEMNED' ? condemnationReason || null : null,
      condemned_parts: decision === 'CONDEMNED' ? condemnedParts || null : null,
      condemned_weight_kg: decision === 'CONDEMNED' && condemnedWeight ? Number(condemnedWeight) : null,
      disposal_method: decision === 'CONDEMNED' ? disposalMethod || null : null,
      notes: notes || null,
    });
    if (e) { setSaving(false); setError(e.message); return; }

    const newStatus = decision === 'CONDEMNED' ? 'CONDEMNED' : 'POST_MORTEM_PASSED';
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
          <h1 className={s.pageTitle}>Post-mortem Inspection</h1>
          <p className={s.pageSub}>Carcass and organ inspection — {pending.length} carcass{pending.length !== 1 ? 'es' : ''} awaiting inspection</p>
        </div>
      </div>

      <div className={s.tableWrap}>
        <div className={s.tableHeader}><h2 className={s.tableTitle}>Awaiting Post-mortem</h2></div>
        {loading ? <div className={s.empty}>Loading…</div> : pending.length === 0 ? (
          <div className={s.empty}>No carcasses awaiting post-mortem inspection.</div>
        ) : (
          <table>
            <thead>
              <tr><th>Carcass Code</th><th>Tag</th><th>Species</th><th>Slaughter Date</th><th>Line</th><th>Carcass Wt.</th><th></th></tr>
            </thead>
            <tbody>
              {pending.map(r => (
                <tr key={r.id}>
                  <td><strong style={{ fontFamily: 'monospace' }}>{r.carcass_code ?? '—'}</strong></td>
                  <td>{r.tag_number}</td>
                  <td>{r.species}</td>
                  <td>{r.slaughter_date ?? '—'}</td>
                  <td>{r.slaughter_line ?? '—'}</td>
                  <td>{r.carcass_weight_kg ? `${r.carcass_weight_kg} kg` : '—'}</td>
                  <td>
                    {canInspect && r.carcass_code && (
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
        <div className={s.tableHeader}><h2 className={s.tableTitle}>Inspection Records</h2></div>
        {inspections.length === 0 ? <div className={s.empty}>No post-mortem inspections recorded.</div> : (
          <table>
            <thead>
              <tr><th>Carcass Code</th><th>Date</th><th>Inspector</th><th>Carcass Cond.</th><th>Decision</th></tr>
            </thead>
            <tbody>
              {inspections.map(i => (
                <tr key={i.id}>
                  <td><strong style={{ fontFamily: 'monospace' }}>{i.carcass_code}</strong></td>
                  <td>{i.inspection_date}</td>
                  <td>{i.inspector_name}</td>
                  <td>{i.carcass_condition ?? '—'}</td>
                  <td>
                    <span className={s.badge} style={{
                      background: (DECISION_COLOR[i.decision] ?? '#64748b') + '18',
                      color: DECISION_COLOR[i.decision] ?? '#64748b',
                      border: `1px solid ${(DECISION_COLOR[i.decision] ?? '#64748b')}35`,
                    }}>{i.decision.replace(/_/g, ' ')}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className={s.tableFooter}>{inspections.length} inspection{inspections.length !== 1 ? 's' : ''}</div>
      </div>

      {selected && (
        <div className={s.modal}>
          <div className={s.modalBackdrop} onClick={() => setSelected(null)} />
          <div className={`${s.modalBox} ${s.modalBoxWide}`}>
            <h2 className={s.modalTitle}>Post-mortem Inspection — {selected.carcass_code}</h2>
            {error && <div className={`${s.alert} ${s.alert_error}`}>⚠ {error}</div>}
            <div className={s.fieldRow}>
              <div className={s.field}>
                <label className={s.label}>Carcass Condition</label>
                <input className={s.input} value={carcassCondition} onChange={e => setCarcassCondition(e.target.value)}
                  placeholder="e.g. Good, Emaciated, Contaminated…" />
              </div>
              <div className={s.field}>
                <label className={s.label}>Head Findings</label>
                <input className={s.input} value={headFindings} onChange={e => setHeadFindings(e.target.value)}
                  placeholder="Lymph nodes, tongue, nasal mucosa…" />
              </div>
            </div>
            <div className={s.field}>
              <label className={s.label}>Organ Findings (liver, lungs, heart, kidneys, spleen)</label>
              <textarea className={s.textarea} value={organFindings} onChange={e => setOrganFindings(e.target.value)}
                placeholder="Describe findings for each organ…" />
            </div>
            <div className={s.fieldRow}>
              <div className={s.field}>
                <label className={s.label}>Visible Lesions</label>
                <input className={s.input} value={lesions} onChange={e => setLesions(e.target.value)} placeholder="Location and type…" />
              </div>
              <div className={s.field}>
                <label className={s.label}>Contamination</label>
                <input className={s.input} value={contamination} onChange={e => setContamination(e.target.value)}
                  placeholder="Faecal, chemical, other…" />
              </div>
            </div>
            <div className={s.fieldRow}>
              <div className={s.field}>
                <label className={s.label}>Suspected Disease</label>
                <input className={s.input} value={disease} onChange={e => setDisease(e.target.value)} />
              </div>
              <label className={s.checklistItem} style={{ marginTop: '1.5rem' }}>
                <input type="checkbox" checked={samplesCollected} onChange={e => setSamplesCollected(e.target.checked)} />
                Samples collected for further testing
              </label>
            </div>
            {samplesCollected && (
              <div className={s.field}>
                <label className={s.label}>Sample Details</label>
                <input className={s.input} value={sampleDetails} onChange={e => setSampleDetails(e.target.value)}
                  placeholder="Sample type and laboratory destination…" />
              </div>
            )}
            <div className={s.field}>
              <label className={s.label}>Inspection Decision *</label>
              <select className={s.select} value={decision} onChange={e => setDecision(e.target.value)}>
                <option value="PASSED">PASSED — Fit for human consumption</option>
                <option value="CONDITIONALLY_PASSED">CONDITIONALLY_PASSED — Fit with conditions / partial trim</option>
                <option value="CONDEMNED">CONDEMNED — Not fit for human consumption</option>
              </select>
            </div>
            {decision === 'CONDEMNED' && (
              <>
                <div className={s.fieldRow}>
                  <div className={s.field}>
                    <label className={s.label}>Condemnation Reason</label>
                    <input className={s.input} value={condemnationReason} onChange={e => setCondemnationReason(e.target.value)} />
                  </div>
                  <div className={s.field}>
                    <label className={s.label}>Condemned Parts</label>
                    <input className={s.input} value={condemnedParts} onChange={e => setCondemnedParts(e.target.value)}
                      placeholder="e.g. Whole carcass, liver, lungs…" />
                  </div>
                </div>
                <div className={s.fieldRow}>
                  <div className={s.field}>
                    <label className={s.label}>Condemned Weight (kg)</label>
                    <input className={s.input} type="number" step="0.1" min={0} value={condemnedWeight}
                      onChange={e => setCondemnedWeight(e.target.value)} />
                  </div>
                  <div className={s.field}>
                    <label className={s.label}>Disposal Method</label>
                    <input className={s.input} value={disposalMethod} onChange={e => setDisposalMethod(e.target.value)}
                      placeholder="e.g. Incineration, Burial, Rendering…" />
                  </div>
                </div>
              </>
            )}
            <div className={s.field}>
              <label className={s.label}>Notes</label>
              <textarea className={s.textarea} value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <div className={s.formActions}>
              <button className={`${s.btn} ${s.btn_outline}`} onClick={() => setSelected(null)}>Cancel</button>
              <button
                className={`${s.btn} ${
                  decision === 'PASSED' ? s.btn_success :
                  decision === 'CONDITIONALLY_PASSED' ? s.btn_warning : s.btn_danger
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

export default PostMortemPage;
