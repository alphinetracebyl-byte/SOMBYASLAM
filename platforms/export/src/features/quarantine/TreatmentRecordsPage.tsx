import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase';
import type { TreatmentRecord, QuarantineBatch } from '@/types/facility';
import s from './quarantine.module.css';

export function TreatmentRecordsPage(): JSX.Element {
  const { facilityId, staffId, staffName, staffRole } = useAuthStore();
  const [records, setRecords]   = useState<(TreatmentRecord & { batch_code?: string })[]>([]);
  const [batches, setBatches]   = useState<QuarantineBatch[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const [batchId, setBatchId]       = useState('');
  const [tagNumber, setTagNumber]   = useState('');
  const [treatType, setTreatType]   = useState('MEDICINE');
  const [medicine, setMedicine]     = useState('');
  const [dose, setDose]             = useState('');
  const [route, setRoute]           = useState('INJECTION_IM');
  const [dateAdmin, setDateAdmin]   = useState(new Date().toISOString().slice(0, 10));
  const [lotNumber, setLotNumber]   = useState('');
  const [nextDose, setNextDose]     = useState('');
  const [withdrawal, setWithdrawal] = useState('');
  const [treatNotes, setTreatNotes] = useState('');

  const canAdd = ['VETERINARY_OFFICER'].includes(staffRole ?? '');

  useEffect(() => { void load(); }, [facilityId]);

  async function load() {
    if (!facilityId) return;
    setLoading(true);
    const [rRes, bRes] = await Promise.all([
      supabase.from('treatment_records').select('*').eq('facility_id', facilityId)
        .order('created_at', { ascending: false }).limit(150),
      supabase.from('quarantine_batches').select('id, batch_code')
        .eq('facility_id', facilityId).in('status', ['ADMITTED','ACTIVE','ON_HOLD']),
    ]);
    const batchMap = Object.fromEntries((bRes.data ?? []).map(b => [b.id, b.batch_code]));
    setRecords((rRes.data ?? []).map(r => ({ ...r, batch_code: batchMap[r.batch_id] })));
    setBatches(bRes.data ?? []);
    setLoading(false);
  }

  async function save() {
    if (!batchId || !medicine.trim()) { setError('Select batch and enter medicine name.'); return; }
    setSaving(true); setError(null);

    const withdrawalDays = withdrawal ? Number(withdrawal) : null;
    const withdrawalEnd = withdrawalDays
      ? new Date(new Date(dateAdmin).getTime() + withdrawalDays * 86400000).toISOString().slice(0, 10)
      : null;

    const { error: e } = await supabase.from('treatment_records').insert({
      batch_id: batchId,
      facility_id: facilityId,
      tag_number: tagNumber || null,
      treatment_type: treatType,
      medicine_name: medicine,
      dose: dose || null,
      administration_route: route,
      date_administered: dateAdmin,
      batch_lot_number: lotNumber || null,
      treating_vet_id: staffId,
      treating_vet_name: staffName,
      next_dose_date: nextDose || null,
      withdrawal_period_days: withdrawalDays,
      withdrawal_end_date: withdrawalEnd,
      treatment_outcome: 'PENDING',
      notes: treatNotes || null,
    });
    setSaving(false);
    if (e) { setError(e.message); return; }
    setShowForm(false);
    setBatchId(''); setTagNumber(''); setMedicine(''); setDose(''); setLotNumber(''); setNextDose(''); setWithdrawal(''); setTreatNotes('');
    void load();
  }

  // Count active withdrawal periods
  const today = new Date().toISOString().slice(0, 10);
  const activeWithdrawals = records.filter(r => r.withdrawal_end_date && r.withdrawal_end_date >= today);

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.pageTitle}>Treatment &amp; Vaccination Records</h1>
          <p className={s.pageSub}>Medicine administration and withdrawal period tracking</p>
        </div>
        {canAdd && (
          <button className={`${s.btn} ${s.btn_success}`} onClick={() => setShowForm(true)}>
            + Record Treatment
          </button>
        )}
      </div>

      {activeWithdrawals.length > 0 && (
        <div className={`${s.alert} ${s.alert_warning}`}>
          ⚠ <strong>{activeWithdrawals.length}</strong> active withdrawal period{activeWithdrawals.length !== 1 ? 's' : ''} — clearance is blocked until withdrawal dates pass.
        </div>
      )}

      <div className={s.tableWrap}>
        <div className={s.tableHeader}><h2 className={s.tableTitle}>Treatment Records</h2></div>
        {loading ? <div className={s.empty}>Loading…</div> : records.length === 0 ? (
          <div className={s.empty}>No treatment records yet.</div>
        ) : (
          <table>
            <thead>
              <tr><th>Type</th><th>Batch</th><th>Tag</th><th>Medicine / Vaccine</th><th>Dose &amp; Route</th>
                <th>Date</th><th>Lot #</th><th>Withdrawal End</th><th>Outcome</th></tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id}>
                  <td>
                    <span className={`${s.badge} ${r.treatment_type === 'VACCINE' ? s.badge_ACCEPTED : s.badge_PENDING}`}>
                      {r.treatment_type}
                    </span>
                  </td>
                  <td>{r.batch_code ?? r.batch_id.slice(0,8)}</td>
                  <td>{r.tag_number ?? 'Batch'}</td>
                  <td><strong>{r.medicine_name}</strong></td>
                  <td>{r.dose ?? '—'} {r.administration_route ? `/ ${r.administration_route}` : ''}</td>
                  <td>{r.date_administered}</td>
                  <td>{r.batch_lot_number ?? '—'}</td>
                  <td>
                    {r.withdrawal_end_date ? (
                      <span style={{ color: r.withdrawal_end_date >= today ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                        {r.withdrawal_end_date} {r.withdrawal_end_date >= today ? '🔒' : '✓'}
                      </span>
                    ) : '—'}
                  </td>
                  <td><span className={`${s.badge} ${s['badge_' + r.treatment_outcome]}`}>{r.treatment_outcome}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className={s.tableFooter}>{records.length} treatment{records.length !== 1 ? 's' : ''}</div>
      </div>

      {showForm && (
        <div className={s.modal}>
          <div className={s.modalBackdrop} onClick={() => setShowForm(false)} />
          <div className={`${s.modalBox} ${s.modalBoxWide}`}>
            <h2 className={s.modalTitle}>Record Treatment / Vaccination</h2>
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
                <label className={s.label}>Animal Tag (optional — blank for whole batch)</label>
                <input className={s.input} value={tagNumber} onChange={e => setTagNumber(e.target.value)} placeholder="Tag number" />
              </div>
            </div>
            <div className={s.fieldRow}>
              <div className={s.field}>
                <label className={s.label}>Treatment Type</label>
                <select className={s.select} value={treatType} onChange={e => setTreatType(e.target.value)}>
                  <option value="MEDICINE">Medicine</option>
                  <option value="VACCINE">Vaccine</option>
                </select>
              </div>
              <div className={s.field}>
                <label className={s.label}>Medicine / Vaccine Name *</label>
                <input className={s.input} value={medicine} onChange={e => setMedicine(e.target.value)}
                  placeholder="e.g. Oxytetracycline, FMD Vaccine" />
              </div>
            </div>
            <div className={s.fieldRow}>
              <div className={s.field}>
                <label className={s.label}>Dose</label>
                <input className={s.input} value={dose} onChange={e => setDose(e.target.value)} placeholder="e.g. 5mg/kg" />
              </div>
              <div className={s.field}>
                <label className={s.label}>Administration Route</label>
                <select className={s.select} value={route} onChange={e => setRoute(e.target.value)}>
                  {['INJECTION_IM','INJECTION_SC','ORAL','TOPICAL','OTHER'].map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className={s.fieldRow}>
              <div className={s.field}>
                <label className={s.label}>Date Administered</label>
                <input className={s.input} type="date" value={dateAdmin} onChange={e => setDateAdmin(e.target.value)} />
              </div>
              <div className={s.field}>
                <label className={s.label}>Batch / Lot Number</label>
                <input className={s.input} value={lotNumber} onChange={e => setLotNumber(e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <div className={s.fieldRow}>
              <div className={s.field}>
                <label className={s.label}>Next Dose Date</label>
                <input className={s.input} type="date" value={nextDose} onChange={e => setNextDose(e.target.value)} />
              </div>
              <div className={s.field}>
                <label className={s.label}>Withdrawal Period (days)</label>
                <input className={s.input} type="number" min={0} value={withdrawal}
                  onChange={e => setWithdrawal(e.target.value)} placeholder="e.g. 14" />
              </div>
            </div>
            <div className={s.field}>
              <label className={s.label}>Notes</label>
              <textarea className={s.textarea} value={treatNotes} onChange={e => setTreatNotes(e.target.value)} />
            </div>
            <div className={s.formActions}>
              <button className={`${s.btn} ${s.btn_outline}`} onClick={() => setShowForm(false)}>Cancel</button>
              <button className={`${s.btn} ${s.btn_success}`} disabled={saving} onClick={() => void save()}>
                {saving ? 'Saving…' : 'Record Treatment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TreatmentRecordsPage;
