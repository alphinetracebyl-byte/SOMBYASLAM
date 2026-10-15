import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase';
import type { SlaughterRecord } from '@/types/facility';
import s from '../quarantine/quarantine.module.css';

const STATUS_COLOR: Record<string, string> = {
  RECEIVED: '#d97706', ANTE_MORTEM_PENDING: '#2563eb', ANTE_MORTEM_PASSED: '#16a34a',
  DETAINED: '#9333ea', REJECTED: '#dc2626', SLAUGHTERED: '#0d9488',
  POST_MORTEM_PASSED: '#14532d', CONDEMNED: '#991b1b', DISPATCHED: '#1e40af',
};

export function AnimalReceivingPage(): JSX.Element {
  const { facilityId, facilityCode, staffName } = useAuthStore();
  const [records, setRecords] = useState<SlaughterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const [tagNumber, setTagNumber]   = useState('');
  const [species, setSpecies]       = useState('CATTLE');
  const [owner, setOwner]           = useState('');
  const [origin, setOrigin]         = useState('');
  const [pen, setPen]               = useState('');
  const [condition, setCondition]   = useState('HEALTHY');
  const [weightBefore, setWeightBefore] = useState('');

  useEffect(() => { void load(); }, [facilityId]);

  async function load() {
    if (!facilityId) return;
    setLoading(true);
    const { data } = await supabase.from('slaughter_records').select('*')
      .eq('facility_id', facilityId).order('created_at', { ascending: false }).limit(200);
    setRecords(data ?? []);
    setLoading(false);
  }

  async function receive() {
    if (!tagNumber.trim()) { setError('Tag number is required.'); return; }
    setSaving(true); setError(null);
    const code = `SL-${facilityCode}-${Date.now()}`;
    const { error: e } = await supabase.from('slaughter_records').insert({
      slaughter_code: code,
      facility_id: facilityId,
      facility_code: facilityCode,
      session_date: new Date().toISOString().slice(0, 10),
      tag_number: tagNumber,
      species,
      owner_name: owner || null,
      origin_facility_code: origin || null,
      pen_assignment: pen || null,
      arrival_condition: condition,
      weight_before_kg: weightBefore ? Number(weightBefore) : null,
      status: 'RECEIVED',
      received_by_name: staffName,
    });
    setSaving(false);
    if (e) { setError(e.message); return; }
    setShowForm(false);
    setTagNumber(''); setOwner(''); setOrigin(''); setPen(''); setWeightBefore('');
    void load();
  }

  const byStatus = (status: string) => records.filter(r => r.status === status).length;

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.pageTitle}>Animal Receiving</h1>
          <p className={s.pageSub}>Record animals arriving at the slaughterhouse</p>
        </div>
        <button className={`${s.btn} ${s.btn_success}`} onClick={() => setShowForm(true)}>+ Receive Animal</button>
      </div>

      <div className={s.statGrid} style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[
          { label: 'Received (pending inspection)', value: byStatus('RECEIVED'),        cls: s.stat_amber  },
          { label: 'Ante-mortem Passed',            value: byStatus('ANTE_MORTEM_PASSED'), cls: s.stat_green  },
          { label: 'Slaughtered',                   value: byStatus('SLAUGHTERED'),     cls: s.stat_teal   },
          { label: 'Post-mortem Cleared',           value: byStatus('POST_MORTEM_PASSED'), cls: s.stat_blue  },
        ].map(c => (
          <div key={c.label} className={`${s.statCard} ${c.cls}`}>
            <div className={s.statValue}>{c.value}</div>
            <div className={s.statLabel}>{c.label}</div>
          </div>
        ))}
      </div>

      <div className={s.tableWrap}>
        <div className={s.tableHeader}><h2 className={s.tableTitle}>All Animals</h2></div>
        {loading ? <div className={s.empty}>Loading…</div> : records.length === 0 ? (
          <div className={s.empty}>No animals received yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Code</th><th>Tag</th><th>Species</th><th>Owner</th>
                <th>Origin</th><th>Condition</th><th>Live Wt.</th><th>Pen</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id}>
                  <td><strong>{r.slaughter_code}</strong></td>
                  <td>{r.tag_number}</td>
                  <td>{r.species}</td>
                  <td>{r.owner_name ?? '—'}</td>
                  <td>{r.origin_facility_code ?? '—'}</td>
                  <td>{r.arrival_condition}</td>
                  <td>{r.weight_before_kg ? `${r.weight_before_kg} kg` : '—'}</td>
                  <td>{r.pen_assignment ?? '—'}</td>
                  <td>
                    <span className={s.badge} style={{
                      background: (STATUS_COLOR[r.status] ?? '#64748b') + '18',
                      color: STATUS_COLOR[r.status] ?? '#64748b',
                      border: `1px solid ${(STATUS_COLOR[r.status] ?? '#64748b')}35`,
                    }}>{r.status.replace(/_/g, ' ')}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className={s.tableFooter}>{records.length} animal{records.length !== 1 ? 's' : ''}</div>
      </div>

      {showForm && (
        <div className={s.modal}>
          <div className={s.modalBackdrop} onClick={() => setShowForm(false)} />
          <div className={`${s.modalBox} ${s.modalBoxWide}`}>
            <h2 className={s.modalTitle}>Receive Animal</h2>
            {error && <div className={`${s.alert} ${s.alert_error}`}>⚠ {error}</div>}
            <div className={s.fieldRow}>
              <div className={s.field}>
                <label className={s.label}>Animal Tag / RFID *</label>
                <input className={s.input} value={tagNumber} onChange={e => setTagNumber(e.target.value)} placeholder="Tag or RFID number" />
              </div>
              <div className={s.field}>
                <label className={s.label}>Species</label>
                <select className={s.select} value={species} onChange={e => setSpecies(e.target.value)}>
                  {['CATTLE','CAMEL','SHEEP','GOAT'].map(sp => <option key={sp}>{sp}</option>)}
                </select>
              </div>
            </div>
            <div className={s.fieldRow}>
              <div className={s.field}>
                <label className={s.label}>Owner Name</label>
                <input className={s.input} value={owner} onChange={e => setOwner(e.target.value)} placeholder="Animal owner" />
              </div>
              <div className={s.field}>
                <label className={s.label}>Origin / Source Facility</label>
                <input className={s.input} value={origin} onChange={e => setOrigin(e.target.value)} placeholder="e.g. QS-BAID-001" />
              </div>
            </div>
            <div className={s.fieldRow}>
              <div className={s.field}>
                <label className={s.label}>Pen Assignment</label>
                <input className={s.input} value={pen} onChange={e => setPen(e.target.value)} placeholder="e.g. Pen A3" />
              </div>
              <div className={s.field}>
                <label className={s.label}>Arrival Condition</label>
                <select className={s.select} value={condition} onChange={e => setCondition(e.target.value)}>
                  {['HEALTHY','SICK','INJURED','DEAD'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className={s.field}>
              <label className={s.label}>Live Weight (kg)</label>
              <input className={s.input} type="number" min={0} step="0.1" value={weightBefore}
                onChange={e => setWeightBefore(e.target.value)} placeholder="Optional" />
            </div>
            <div className={s.formActions}>
              <button className={`${s.btn} ${s.btn_outline}`} onClick={() => setShowForm(false)}>Cancel</button>
              <button className={`${s.btn} ${s.btn_success}`} disabled={saving} onClick={() => void receive()}>
                {saving ? 'Recording…' : 'Receive Animal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AnimalReceivingPage;
