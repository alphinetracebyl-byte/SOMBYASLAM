import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase';
import type { MovementPermit } from '@/types/facility';
import s from './quarantine.module.css';

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active', USED: 'Used', EXPIRED: 'Expired', CANCELLED: 'Cancelled',
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: '#16a34a', USED: '#0891b2', EXPIRED: '#d97706', CANCELLED: '#dc2626',
};

export function MovementRequestsPage(): JSX.Element {
  const navigate = useNavigate();
  const { facilityCode, staffRole } = useAuthStore();
  const [permits, setPermits]   = useState<MovementPermit[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('ACTIVE');
  const [selected, setSelected] = useState<MovementPermit | null>(null);

  const canAct = staffRole === 'QUARANTINE_SUPERVISOR';

  useEffect(() => { void load(); }, [facilityCode, filter]);

  async function load() {
    if (!facilityCode) return;
    setLoading(true);
    const q = supabase.from('movement_permits')
      .select('*')
      .eq('destination_premises_code', facilityCode)
      .order('created_at', { ascending: false });
    if (filter !== 'ALL') q.eq('status', filter);
    const { data } = await q;
    setPermits(data ?? []);
    setLoading(false);
  }

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.pageTitle}>Incoming Movement Permits</h1>
          <p className={s.pageSub}>{facilityCode} — permits authorising animals to arrive at this quarantine station</p>
        </div>
      </div>

      <div className={s.tableWrap}>
        <div className={s.tableHeader}>
          <h2 className={s.tableTitle}>Movement Permits</h2>
          <div className={s.btnRow}>
            {['ACTIVE', 'USED', 'EXPIRED', 'ALL'].map(f => (
              <button key={f} className={`${s.btn} ${filter === f ? s.btn_primary : s.btn_outline}`}
                onClick={() => setFilter(f)}>
                {f === 'ALL' ? 'All' : STATUS_LABELS[f] ?? f}
              </button>
            ))}
          </div>
        </div>

        {loading ? <div className={s.empty}>Loading…</div> : permits.length === 0 ? (
          <div className={s.empty}>No {filter === 'ALL' ? '' : filter.toLowerCase()} permits found for {facilityCode}.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Permit Number</th><th>Origin</th><th>Owner</th>
                <th>Animals</th><th>Valid From</th><th>Valid To</th>
                <th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {permits.map(p => (
                <tr key={p.id}>
                  <td><strong style={{ fontFamily: 'monospace' }}>{p.permit_number}</strong></td>
                  <td>{p.origin_premises_name ?? p.origin_premises_code ?? '—'}</td>
                  <td>{p.owner_name ?? '—'}</td>
                  <td>{p.animal_count ?? '—'}</td>
                  <td>{p.valid_from ?? '—'}</td>
                  <td>{p.valid_to ?? '—'}</td>
                  <td>
                    <span className={s.badge} style={{
                      background: (STATUS_COLOR[p.status] ?? '#64748b') + '18',
                      color: STATUS_COLOR[p.status] ?? '#64748b',
                      border: `1px solid ${(STATUS_COLOR[p.status] ?? '#64748b')}35`,
                    }}>{STATUS_LABELS[p.status] ?? p.status}</span>
                  </td>
                  <td>
                    <div className={s.btnRow}>
                      <button className={`${s.btn} ${s.btn_outline}`} onClick={() => setSelected(p)}>View</button>
                      {canAct && p.status === 'ACTIVE' && (
                        <button className={`${s.btn} ${s.btn_primary}`}
                          onClick={() => void navigate(`/quarantine/movements/${p.id}/arrival`)}>
                          Record Arrival
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className={s.tableFooter}>{permits.length} permit{permits.length !== 1 ? 's' : ''}</div>
      </div>

      {selected && (
        <div className={s.modal}>
          <div className={s.modalBackdrop} onClick={() => setSelected(null)} />
          <div className={s.modalBox}>
            <h2 className={s.modalTitle}>Permit — {selected.permit_number}</h2>
            <div className={s.kv}>
              <div className={s.kvRow}><span className={s.kvKey}>Permit Number</span><span className={s.kvVal}>{selected.permit_number}</span></div>
              <div className={s.kvRow}><span className={s.kvKey}>Origin</span><span className={s.kvVal}>{selected.origin_premises_name ?? selected.origin_premises_code ?? '—'}</span></div>
              <div className={s.kvRow}><span className={s.kvKey}>Destination</span><span className={s.kvVal}>{selected.destination_premises_name ?? selected.destination_premises_code ?? '—'}</span></div>
              <div className={s.kvRow}><span className={s.kvKey}>Owner</span><span className={s.kvVal}>{selected.owner_name ?? '—'}</span></div>
              <div className={s.kvRow}><span className={s.kvKey}>Animal Count</span><span className={s.kvVal}>{selected.animal_count ?? '—'}</span></div>
              <div className={s.kvRow}><span className={s.kvKey}>Vehicle</span><span className={s.kvVal}>{selected.vehicle_registration ?? '—'}</span></div>
              <div className={s.kvRow}><span className={s.kvKey}>Valid From</span><span className={s.kvVal}>{selected.valid_from ?? '—'}</span></div>
              <div className={s.kvRow}><span className={s.kvKey}>Valid To</span><span className={s.kvVal}>{selected.valid_to ?? '—'}</span></div>
              {selected.conditions && <div className={s.kvRow}><span className={s.kvKey}>Conditions</span><span className={s.kvVal}>{selected.conditions}</span></div>}
              <div className={s.kvRow}><span className={s.kvKey}>Status</span><span className={s.kvVal}>{STATUS_LABELS[selected.status] ?? selected.status}</span></div>
            </div>
            <div className={s.formActions}>
              <button className={`${s.btn} ${s.btn_outline}`} onClick={() => setSelected(null)}>Close</button>
              {canAct && selected.status === 'ACTIVE' && (
                <button className={`${s.btn} ${s.btn_primary}`}
                  onClick={() => void navigate(`/quarantine/movements/${selected.id}/arrival`)}>
                  Record Arrival
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MovementRequestsPage;
