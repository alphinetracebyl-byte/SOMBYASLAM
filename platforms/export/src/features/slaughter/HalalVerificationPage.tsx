import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase';
import type { SlaughterRecord, HalalVerification } from '@/types/facility';
import s from '../quarantine/quarantine.module.css';

export function HalalVerificationPage(): JSX.Element {
  const { facilityId, staffId, staffName, staffRole } = useAuthStore();
  const [animals, setAnimals]         = useState<SlaughterRecord[]>([]);
  const [verifications, setVerifications] = useState<HalalVerification[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState<SlaughterRecord | null>(null);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const [slaughtererName, setSlaughtererName]     = useState('');
  const [slaughtererVerified, setSlaughtererVerified] = useState(true);
  const [animalAlive, setAnimalAlive]             = useState(true);
  const [method, setMethod]                       = useState('MANUAL_ZABIHA');
  const [stunningUsed, setStunningUsed]           = useState(false);
  const [stunningMethod, setStunningMethod]       = useState('');
  const [equipCond, setEquipCond]                 = useState('GOOD');
  const [tasmiyah, setTasmiyah]                   = useState(true);
  const [complianceNotes, setComplianceNotes]     = useState('');
  const [decision, setDecision]                   = useState('HALAL');
  const [rejectionReason, setRejectionReason]     = useState('');

  const canVerify = ['HALAL_SUPERVISOR', 'SLAUGHTER_SUPERVISOR'].includes(staffRole ?? '');

  useEffect(() => { void load(); }, [facilityId]);

  async function load() {
    if (!facilityId) return;
    setLoading(true);
    const [aRes, vRes] = await Promise.all([
      supabase.from('slaughter_records').select('*').eq('facility_id', facilityId)
        .eq('status', 'ANTE_MORTEM_PASSED').order('created_at'),
      supabase.from('halal_verifications').select('*').eq('facility_id', facilityId)
        .order('created_at', { ascending: false }).limit(100),
    ]);
    setAnimals(aRes.data ?? []);
    setVerifications(vRes.data ?? []);
    setLoading(false);
  }

  function resetForm() {
    setSlaughtererName(''); setSlaughtererVerified(true); setAnimalAlive(true);
    setMethod('MANUAL_ZABIHA'); setStunningUsed(false); setStunningMethod('');
    setEquipCond('GOOD'); setTasmiyah(true); setComplianceNotes('');
    setDecision('HALAL'); setRejectionReason('');
  }

  async function submitVerification() {
    if (!selected || !staffId) return;
    setSaving(true); setError(null);
    const { error: e } = await supabase.from('halal_verifications').insert({
      slaughter_id: selected.id,
      facility_id: facilityId,
      tag_number: selected.tag_number,
      verification_date: new Date().toISOString().slice(0, 10),
      verified_by_id: staffId,
      verified_by_name: staffName,
      slaughterer_name: slaughtererName || null,
      slaughterer_verified: slaughtererVerified,
      animal_alive_confirmed: animalAlive,
      slaughter_method: method,
      stunning_used: stunningUsed,
      stunning_method: stunningUsed ? stunningMethod || null : null,
      equipment_condition: equipCond,
      tasmiyah_recited: tasmiyah,
      non_compliance_notes: complianceNotes || null,
      decision,
      rejection_reason: decision !== 'HALAL' ? rejectionReason || null : null,
    });
    setSaving(false);
    if (e) { setError(e.message); return; }
    setSelected(null); resetForm();
    void load();
  }

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.pageTitle}>Halal Verification</h1>
          <p className={s.pageSub}>Verify halal compliance for slaughter operations</p>
        </div>
      </div>

      <div className={s.tableWrap}>
        <div className={s.tableHeader}><h2 className={s.tableTitle}>Animals Ready — Ante-mortem Passed</h2></div>
        {loading ? <div className={s.empty}>Loading…</div> : animals.length === 0 ? (
          <div className={s.empty}>No animals have passed ante-mortem inspection yet.</div>
        ) : (
          <table>
            <thead><tr><th>Code</th><th>Tag</th><th>Species</th><th>Owner</th><th></th></tr></thead>
            <tbody>
              {animals.map(r => (
                <tr key={r.id}>
                  <td><strong>{r.slaughter_code}</strong></td>
                  <td>{r.tag_number}</td>
                  <td>{r.species}</td>
                  <td>{r.owner_name ?? '—'}</td>
                  <td>
                    {canVerify && (
                      <button className={`${s.btn} ${s.btn_primary}`} onClick={() => { setSelected(r); resetForm(); }}>
                        Verify
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className={s.tableFooter}>{animals.length} animal{animals.length !== 1 ? 's' : ''}</div>
      </div>

      <div className={s.tableWrap}>
        <div className={s.tableHeader}><h2 className={s.tableTitle}>Verification Records</h2></div>
        {verifications.length === 0 ? <div className={s.empty}>No verifications recorded.</div> : (
          <table>
            <thead>
              <tr><th>Tag</th><th>Date</th><th>Verified By</th><th>Method</th><th>Tasmiyah</th><th>Stunning</th><th>Decision</th></tr>
            </thead>
            <tbody>
              {verifications.map(v => (
                <tr key={v.id}>
                  <td><strong>{v.tag_number}</strong></td>
                  <td>{v.verification_date}</td>
                  <td>{v.verified_by_name}</td>
                  <td>{v.slaughter_method?.replace(/_/g, ' ') ?? '—'}</td>
                  <td>{v.tasmiyah_recited ? '✅ Yes' : '❌ No'}</td>
                  <td>{v.stunning_used ? `⚠ ${v.stunning_method ?? 'Yes'}` : 'No'}</td>
                  <td>
                    <span className={s.badge} style={{
                      background: v.decision === 'HALAL' ? '#d1fae5' : v.decision === 'DOUBTFUL' ? '#fef3c7' : '#fee2e2',
                      color:      v.decision === 'HALAL' ? '#065f46' : v.decision === 'DOUBTFUL' ? '#92400e' : '#991b1b',
                    }}>{v.decision}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className={s.tableFooter}>{verifications.length} verification{verifications.length !== 1 ? 's' : ''}</div>
      </div>

      {selected && (
        <div className={s.modal}>
          <div className={s.modalBackdrop} onClick={() => setSelected(null)} />
          <div className={`${s.modalBox} ${s.modalBoxWide}`}>
            <h2 className={s.modalTitle}>Halal Verification — {selected.tag_number}</h2>
            {error && <div className={`${s.alert} ${s.alert_error}`}>⚠ {error}</div>}
            <div className={s.fieldRow}>
              <div className={s.field}>
                <label className={s.label}>Slaughterer Name</label>
                <input className={s.input} value={slaughtererName} onChange={e => setSlaughtererName(e.target.value)} placeholder="Name of slaughterer" />
              </div>
              <div className={s.field}>
                <label className={s.label}>Slaughter Method</label>
                <select className={s.select} value={method} onChange={e => setMethod(e.target.value)}>
                  <option value="MANUAL_ZABIHA">Manual Zabiha</option>
                  <option value="MECHANICAL">Mechanical</option>
                </select>
              </div>
            </div>
            <div className={s.fieldRow} style={{ marginBottom: '0.75rem' }}>
              <label className={s.checklistItem}>
                <input type="checkbox" checked={slaughtererVerified} onChange={e => setSlaughtererVerified(e.target.checked)} />
                Slaughterer identity and credentials verified (Muslim)
              </label>
              <label className={s.checklistItem}>
                <input type="checkbox" checked={animalAlive} onChange={e => setAnimalAlive(e.target.checked)} />
                Animal was alive at time of slaughter
              </label>
            </div>
            <div className={s.fieldRow} style={{ marginBottom: '0.75rem' }}>
              <label className={s.checklistItem}>
                <input type="checkbox" checked={tasmiyah} onChange={e => setTasmiyah(e.target.checked)} />
                Tasmiyah (Bismillah Allahu Akbar) recited before slaughter
              </label>
              <label className={s.checklistItem}>
                <input type="checkbox" checked={stunningUsed} onChange={e => setStunningUsed(e.target.checked)} />
                Pre-slaughter stunning used
              </label>
            </div>
            {stunningUsed && (
              <div className={s.field}>
                <label className={s.label}>Stunning Method</label>
                <input className={s.input} value={stunningMethod} onChange={e => setStunningMethod(e.target.value)}
                  placeholder="e.g. Captive bolt, Electric…" />
              </div>
            )}
            <div className={s.fieldRow}>
              <div className={s.field}>
                <label className={s.label}>Equipment Condition</label>
                <select className={s.select} value={equipCond} onChange={e => setEquipCond(e.target.value)}>
                  {['GOOD','ACCEPTABLE','POOR','FAILED'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className={s.field}>
                <label className={s.label}>Decision</label>
                <select className={s.select} value={decision} onChange={e => setDecision(e.target.value)}>
                  <option value="HALAL">HALAL — Compliant</option>
                  <option value="DOUBTFUL">DOUBTFUL — Requires review</option>
                  <option value="NON_HALAL">NON_HALAL — Not compliant</option>
                </select>
              </div>
            </div>
            {decision !== 'HALAL' && (
              <div className={s.field}>
                <label className={s.label}>Non-compliance / Rejection Reason</label>
                <textarea className={s.textarea} value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
                  placeholder="Describe the non-compliance…" />
              </div>
            )}
            <div className={s.field}>
              <label className={s.label}>Compliance Observation Notes</label>
              <textarea className={s.textarea} value={complianceNotes} onChange={e => setComplianceNotes(e.target.value)}
                placeholder="Any additional halal compliance observations…" />
            </div>
            <div className={s.formActions}>
              <button className={`${s.btn} ${s.btn_outline}`} onClick={() => setSelected(null)}>Cancel</button>
              <button
                className={`${s.btn} ${decision === 'HALAL' ? s.btn_success : decision === 'DOUBTFUL' ? s.btn_warning : s.btn_danger}`}
                disabled={saving}
                onClick={() => void submitVerification()}
              >
                {saving ? 'Recording…' : 'Record Verification'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HalalVerificationPage;
