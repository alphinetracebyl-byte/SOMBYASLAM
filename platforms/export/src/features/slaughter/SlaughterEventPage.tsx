import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase';
import type { SlaughterRecord } from '@/types/facility';
import s from '../quarantine/quarantine.module.css';

export function SlaughterEventPage(): JSX.Element {
  const { facilityId } = useAuthStore();
  const today = new Date().toISOString().slice(0, 10);

  const [ready, setReady]     = useState<SlaughterRecord[]>([]);
  const [done, setDone]       = useState<SlaughterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SlaughterRecord | null>(null);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const [line, setLine]           = useState('');
  const [slaughterTime, setSlaughterTime] = useState('');
  const [carcassWeight, setCarcassWeight] = useState('');

  useEffect(() => { void load(); }, [facilityId]);

  async function load() {
    if (!facilityId) return;
    setLoading(true);
    const [rRes, dRes] = await Promise.all([
      supabase.from('slaughter_records').select('*').eq('facility_id', facilityId)
        .eq('status', 'ANTE_MORTEM_PASSED').order('created_at'),
      supabase.from('slaughter_records').select('*').eq('facility_id', facilityId)
        .eq('status', 'SLAUGHTERED').order('slaughter_date', { ascending: false })
        .order('slaughter_time', { ascending: false }).limit(150),
    ]);
    setReady(rRes.data ?? []);
    setDone(dRes.data ?? []);
    setLoading(false);
  }

  function openModal(r: SlaughterRecord) {
    setSelected(r);
    setLine('');
    setSlaughterTime(new Date().toTimeString().slice(0, 5));
    setCarcassWeight('');
    setConfirmed(false);
    setError(null);
  }

  async function recordSlaughter() {
    if (!selected || !confirmed) return;
    setSaving(true); setError(null);
    const carcassCode = `CARC-${selected.slaughter_code}`;
    const { error: e } = await supabase.from('slaughter_records').update({
      status: 'SLAUGHTERED',
      slaughter_date: today,
      slaughter_time: slaughterTime || null,
      slaughter_line: line || null,
      carcass_code: carcassCode,
      carcass_weight_kg: carcassWeight ? Number(carcassWeight) : null,
      updated_at: new Date().toISOString(),
    }).eq('id', selected.id);
    setSaving(false);
    if (e) { setError(e.message); return; }
    setSelected(null);
    void load();
  }

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.pageTitle}>Slaughter Events</h1>
          <p className={s.pageSub}>{ready.length} animal{ready.length !== 1 ? 's' : ''} cleared for slaughter</p>
        </div>
      </div>

      <div className={s.tableWrap}>
        <div className={s.tableHeader}><h2 className={s.tableTitle}>Ready for Slaughter</h2></div>
        {loading ? <div className={s.empty}>Loading…</div> : ready.length === 0 ? (
          <div className={s.empty}>No animals ready. Ante-mortem inspection must pass first.</div>
        ) : (
          <table>
            <thead>
              <tr><th>Code</th><th>Tag</th><th>Species</th><th>Owner</th><th>Live Wt.</th><th></th></tr>
            </thead>
            <tbody>
              {ready.map(r => (
                <tr key={r.id}>
                  <td><strong>{r.slaughter_code}</strong></td>
                  <td>{r.tag_number}</td>
                  <td>{r.species}</td>
                  <td>{r.owner_name ?? '—'}</td>
                  <td>{r.weight_before_kg ? `${r.weight_before_kg} kg` : '—'}</td>
                  <td>
                    <button className={`${s.btn} ${s.btn_danger}`} onClick={() => openModal(r)}>
                      Record Slaughter
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className={s.tableFooter}>{ready.length} ready</div>
      </div>

      <div className={s.tableWrap}>
        <div className={s.tableHeader}><h2 className={s.tableTitle}>Slaughtered — Awaiting Post-mortem</h2></div>
        {done.length === 0 ? <div className={s.empty}>No slaughter events recorded yet.</div> : (
          <table>
            <thead>
              <tr><th>Carcass Code</th><th>Tag</th><th>Species</th><th>Date</th><th>Time</th><th>Line</th><th>Carcass Wt.</th></tr>
            </thead>
            <tbody>
              {done.map(r => (
                <tr key={r.id}>
                  <td><strong style={{ fontFamily: 'monospace' }}>{r.carcass_code ?? '—'}</strong></td>
                  <td>{r.tag_number}</td>
                  <td>{r.species}</td>
                  <td>{r.slaughter_date ?? '—'}</td>
                  <td>{r.slaughter_time ?? '—'}</td>
                  <td>{r.slaughter_line ?? '—'}</td>
                  <td>{r.carcass_weight_kg ? `${r.carcass_weight_kg} kg` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className={s.tableFooter}>{done.length} slaughtered</div>
      </div>

      {selected && (
        <div className={s.modal}>
          <div className={s.modalBackdrop} onClick={() => setSelected(null)} />
          <div className={s.modalBox}>
            <h2 className={s.modalTitle}>Record Slaughter Event</h2>
            {error && <div className={`${s.alert} ${s.alert_error}`}>⚠ {error}</div>}
            <div className={`${s.alert} ${s.alert_warning}`}>
              ⚠ This action cannot be undone. Confirm ante-mortem and halal verifications are complete before proceeding.
            </div>
            <div className={s.kv} style={{ marginBottom: '1rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '6px' }}>
              <div className={s.kvRow}><span className={s.kvKey}>Tag</span><span className={s.kvVal}>{selected.tag_number}</span></div>
              <div className={s.kvRow}><span className={s.kvKey}>Species</span><span className={s.kvVal}>{selected.species}</span></div>
              <div className={s.kvRow}><span className={s.kvKey}>Owner</span><span className={s.kvVal}>{selected.owner_name ?? '—'}</span></div>
              <div className={s.kvRow}><span className={s.kvKey}>Carcass Code</span>
                <span className={s.kvVal} style={{ fontFamily: 'monospace' }}>CARC-{selected.slaughter_code}</span>
              </div>
            </div>
            <div className={s.fieldRow}>
              <div className={s.field}>
                <label className={s.label}>Slaughter Time</label>
                <input className={s.input} type="time" value={slaughterTime} onChange={e => setSlaughterTime(e.target.value)} />
              </div>
              <div className={s.field}>
                <label className={s.label}>Slaughter Line</label>
                <input className={s.input} value={line} onChange={e => setLine(e.target.value)} placeholder="e.g. Line A" />
              </div>
            </div>
            <div className={s.field}>
              <label className={s.label}>Dressed Carcass Weight (kg)</label>
              <input className={s.input} type="number" step="0.1" min={0} value={carcassWeight}
                onChange={e => setCarcassWeight(e.target.value)} placeholder="Post-slaughter weight" />
            </div>
            <label className={s.checklistItem} style={{ marginBottom: '1rem' }}>
              <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
              I confirm ante-mortem inspection and halal verification are complete
            </label>
            <div className={s.formActions}>
              <button className={`${s.btn} ${s.btn_outline}`} onClick={() => setSelected(null)}>Cancel</button>
              <button className={`${s.btn} ${s.btn_danger}`} disabled={saving || !confirmed}
                onClick={() => void recordSlaughter()}>
                {saving ? 'Recording…' : 'Confirm Slaughter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SlaughterEventPage;
