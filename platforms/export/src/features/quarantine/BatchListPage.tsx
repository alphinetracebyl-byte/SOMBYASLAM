import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase';
import type { QuarantineBatch } from '@/types/facility';
import s from './quarantine.module.css';

const STATUS_LABELS: Record<string, string> = {
  ADMITTED: 'Admitted', ACTIVE: 'Active', ON_HOLD: 'On Hold',
  CLEARED: 'Cleared', CLOSED: 'Closed',
};

const PURPOSE_LABELS: Record<string, string> = {
  EXPORT: 'Export', IMPORT: 'Import', DISEASE_CONTROL: 'Disease Control', ROUTINE: 'Routine',
};

function daysLeft(expected: string | null): number | null {
  if (!expected) return null;
  return Math.ceil((new Date(expected).getTime() - Date.now()) / 86400000);
}

export function BatchListPage(): JSX.Element {
  const navigate = useNavigate();
  const { facilityId, facilityCode } = useAuthStore();
  const [batches, setBatches] = useState<QuarantineBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('ACTIVE_ALL');

  useEffect(() => { void load(); }, [facilityId, filter]);

  async function load() {
    if (!facilityId) return;
    setLoading(true);
    const q = supabase.from('quarantine_batches').select('*')
      .eq('facility_id', facilityId)
      .order('created_at', { ascending: false });
    if (filter === 'ACTIVE_ALL')  q.in('status', ['ADMITTED', 'ACTIVE', 'ON_HOLD']);
    else if (filter !== 'ALL')    q.eq('status', filter);
    const { data } = await q;
    setBatches(data ?? []);
    setLoading(false);
  }

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.pageTitle}>Quarantine Batches</h1>
          <p className={s.pageSub}>{facilityCode} — all animal batches in quarantine</p>
        </div>
      </div>

      <div className={s.tableWrap}>
        <div className={s.tableHeader}>
          <h2 className={s.tableTitle}>Batches</h2>
          <div className={s.btnRow}>
            {[['ACTIVE_ALL','Active'], ['ON_HOLD','On Hold'], ['CLEARED','Cleared'], ['ALL','All']].map(([v, l]) => (
              <button key={v} className={`${s.btn} ${filter === v ? s.btn_primary : s.btn_outline}`}
                onClick={() => setFilter(v)}>{l}</button>
            ))}
          </div>
        </div>

        {loading ? <div className={s.empty}>Loading…</div> : batches.length === 0 ? (
          <div className={s.empty}>No batches found.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Batch Code</th><th>Purpose</th><th>Animals</th>
                <th>Admitted</th><th>Expected Completion</th><th>Days Left</th>
                <th>Vet Officer</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {batches.map(b => {
                const dl = daysLeft(b.expected_completion_date);
                return (
                  <tr key={b.id}>
                    <td><strong>{b.batch_code}</strong></td>
                    <td>{PURPOSE_LABELS[b.quarantine_purpose] ?? b.quarantine_purpose}</td>
                    <td>{b.animal_count}</td>
                    <td>{b.admission_date}</td>
                    <td>{b.expected_completion_date ?? '—'}</td>
                    <td>
                      {dl === null ? '—' : (
                        <span style={{ color: dl < 0 ? '#dc2626' : dl <= 3 ? '#d97706' : '#16a34a', fontWeight: 700 }}>
                          {dl < 0 ? `${Math.abs(dl)}d overdue` : `${dl}d`}
                        </span>
                      )}
                    </td>
                    <td>{b.vet_officer_name ?? '—'}</td>
                    <td>
                      <span className={`${s.badge} ${s['badge_' + b.status]}`}>
                        {STATUS_LABELS[b.status] ?? b.status}
                      </span>
                      {b.health_hold_reason && (
                        <div style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: 2 }}>🔒 Hold</div>
                      )}
                    </td>
                    <td>
                      <button className={`${s.btn} ${s.btn_primary}`}
                        onClick={() => void navigate(`/quarantine/batches/${b.id}`)}>
                        Open
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <div className={s.tableFooter}>{batches.length} batch{batches.length !== 1 ? 'es' : ''}</div>
      </div>
    </div>
  );
}

export default BatchListPage;
