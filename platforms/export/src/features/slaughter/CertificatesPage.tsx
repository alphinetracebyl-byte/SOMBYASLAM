import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase';
import type { QuarantineClearance, ExportConsignment } from '@/types/facility';
import s from '../quarantine/quarantine.module.css';

const DECISION_COLOR: Record<string, string> = {
  CLEAR_FOR_EXPORT: '#16a34a', CLEAR_FOR_SLAUGHTER: '#0d9488',
  CLEAR_FOR_RETURN: '#2563eb', EXTEND: '#d97706', PROHIBIT: '#dc2626',
};

export function CertificatesPage(): JSX.Element {
  const navigate = useNavigate();
  const { facilityId } = useAuthStore();

  const [clearances, setClearances]     = useState<(QuarantineClearance & { batch_code?: string })[]>([]);
  const [consignments, setConsignments] = useState<ExportConsignment[]>([]);
  const [loading, setLoading]           = useState(true);
  const [tab, setTab]                   = useState<'quarantine' | 'slaughter'>('quarantine');

  useEffect(() => { void load(); }, [facilityId]);

  async function load() {
    if (!facilityId) return;
    setLoading(true);
    const [clrRes, consRes, batchRes] = await Promise.all([
      supabase.from('quarantine_clearances').select('*').eq('facility_id', facilityId)
        .order('created_at', { ascending: false }).limit(100),
      supabase.from('export_consignments').select('*').eq('facility_id', facilityId)
        .order('created_at', { ascending: false }).limit(100),
      supabase.from('quarantine_batches').select('id, batch_code').eq('facility_id', facilityId),
    ]);
    const batchMap = Object.fromEntries((batchRes.data ?? []).map(b => [b.id, b.batch_code]));
    setClearances((clrRes.data ?? []).map(c => ({ ...c, batch_code: batchMap[c.batch_id] })));
    setConsignments(consRes.data ?? []);
    setLoading(false);
  }

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.pageTitle}>Certificates</h1>
          <p className={s.pageSub}>Quarantine clearance records and export health certificates</p>
        </div>
      </div>

      <div className={s.tableWrap}>
        <div className={s.tableHeader}>
          <button className={`${s.btn} ${tab === 'quarantine' ? s.btn_primary : s.btn_outline}`}
            onClick={() => setTab('quarantine')}>
            Quarantine Clearances ({clearances.length})
          </button>
          <button className={`${s.btn} ${tab === 'slaughter' ? s.btn_primary : s.btn_outline}`}
            onClick={() => setTab('slaughter')}>
            Export Consignments ({consignments.length})
          </button>
        </div>

        {loading ? <div className={s.empty}>Loading…</div> : (
          <>
            {tab === 'quarantine' && (
              clearances.length === 0
                ? <div className={s.empty}>No quarantine clearances recorded.</div>
                : (
                  <table>
                    <thead>
                      <tr>
                        <th>Certificate No.</th><th>Batch</th><th>Decision</th>
                        <th>Date</th><th>Decided By</th><th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clearances.map(c => (
                        <tr key={c.id}>
                          <td><strong style={{ fontFamily: 'monospace' }}>{c.clearance_code}</strong></td>
                          <td>
                            <button className={s.backLink} onClick={() => void navigate(`/quarantine/batches/${c.batch_id}`)}>
                              {c.batch_code ?? c.batch_id.slice(0, 8)}
                            </button>
                          </td>
                          <td>
                            <span className={s.badge} style={{
                              background: (DECISION_COLOR[c.decision] ?? '#64748b') + '18',
                              color: DECISION_COLOR[c.decision] ?? '#64748b',
                              border: `1px solid ${(DECISION_COLOR[c.decision] ?? '#64748b')}35`,
                            }}>{c.decision.replace(/_/g, ' ')}</span>
                          </td>
                          <td>{c.decision_date}</td>
                          <td>{c.decided_by_name}</td>
                          <td style={{ fontSize: '0.78rem', color: '#64748b', maxWidth: '200px' }}>
                            {c.notes ? c.notes.slice(0, 80) + (c.notes.length > 80 ? '…' : '') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
            )}

            {tab === 'slaughter' && (
              consignments.length === 0
                ? <div className={s.empty}>No export consignments recorded.</div>
                : (
                  <table>
                    <thead>
                      <tr>
                        <th>Consignment Code</th><th>Destination</th><th>Exporter</th>
                        <th>Container</th><th>Seal</th><th>Loading Date</th><th>Items</th><th>Total Wt.</th><th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {consignments.map(c => (
                        <tr key={c.id}>
                          <td><strong style={{ fontFamily: 'monospace' }}>{c.consignment_code}</strong></td>
                          <td>{c.destination ?? '—'}</td>
                          <td>{c.exporter_name ?? '—'}</td>
                          <td>{c.container_vehicle ?? '—'}</td>
                          <td>{c.container_seal ?? '—'}</td>
                          <td>{c.loading_date ?? '—'}</td>
                          <td>{c.total_items}</td>
                          <td>{c.total_weight_kg ? `${c.total_weight_kg} kg` : '—'}</td>
                          <td>
                            <span className={`${s.badge} ${s.badge_ACTIVE}`}>{c.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
            )}
          </>
        )}

        <div className={s.tableFooter}>
          {tab === 'quarantine'
            ? `${clearances.length} clearance${clearances.length !== 1 ? 's' : ''}`
            : `${consignments.length} consignment${consignments.length !== 1 ? 's' : ''}`
          }
        </div>
      </div>
    </div>
  );
}

export default CertificatesPage;
