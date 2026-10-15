import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import client from '@/api/client';
import s from './audit.module.css';

interface AuditEvent { id: string; eventCode: string; eventType: string; aggregateType: string; aggregateId: string; aggregateCode?: string; performedBy?: string; performedAt: string; serviceSource: string; payload?: string; }
interface PagedResponse<T> { content: T[]; totalPages: number; totalElements: number; number: number; }

const SERVICE_COLORS: Record<string, string> = {
  ANIMAL_REGISTRY: '#0b5ed7', MOVEMENT_TRACKING: '#059669', IDENTITY_ACCESS: '#7e22ce',
  VET_HEALTH: '#16a34a', OWNER_ORG: '#d97706', PREMISES: '#0369a1',
};

export function AuditPage(): JSX.Element {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filters, setFilters] = useState({ eventType: '', aggregateType: '', dateFrom: '', dateTo: '' });

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page, size: 25, sort: 'performedAt,desc' };
    if (filters.eventType) params.eventType = filters.eventType;
    if (filters.aggregateType) params.aggregateType = filters.aggregateType;
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;
    client.get<PagedResponse<AuditEvent>>('/audit', { params })
      .then(r => { setEvents(r.data.content ?? []); setTotalPages(r.data.totalPages ?? 0); })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [page, filters]);

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.title}>Audit Log</h1>
        <p className={s.sub}>Immutable record of all system events</p>
      </div>

      <div className={s.filterBar}>
        <input className={s.filterInput} placeholder="Event type" value={filters.eventType} onChange={e => setFilters(p => ({...p, eventType: e.target.value}))}/>
        <input className={s.filterInput} placeholder="Aggregate type" value={filters.aggregateType} onChange={e => setFilters(p => ({...p, aggregateType: e.target.value}))}/>
        <input className={s.filterInput} type="date" value={filters.dateFrom} onChange={e => setFilters(p => ({...p, dateFrom: e.target.value}))}/>
        <input className={s.filterInput} type="date" value={filters.dateTo} onChange={e => setFilters(p => ({...p, dateTo: e.target.value}))}/>
      </div>

      <div className={s.card}>
        {loading ? <div className={s.loading}>Loading audit events…</div> :
          <table className={s.table}>
            <thead><tr>
              <th className={s.th}>Event Code</th><th className={s.th}>Type</th>
              <th className={s.th}>Aggregate</th><th className={s.th}>Performed By</th>
              <th className={s.th}>Timestamp</th><th className={s.th}>Service</th><th className={s.th}/>
            </tr></thead>
            <tbody>
              {events.length === 0 ? <tr><td colSpan={7} className={s.empty}>No audit events</td></tr>
                : events.map(e => (
                  <>
                    <tr key={e.id} className={s.tr} onClick={() => setExpanded(expanded === e.id ? null : e.id)} style={{cursor: 'pointer'}}>
                      <td className={s.td}><span className={s.code}>{e.eventCode}</span></td>
                      <td className={s.td}><span className={s.evtType}>{e.eventType}</span></td>
                      <td className={s.td}><span className={s.aggType}>{e.aggregateType}</span>{e.aggregateCode && <span className={s.aggCode}> · {e.aggregateCode}</span>}</td>
                      <td className={s.td}><span className={s.userId}>{e.performedBy?.slice(0, 8) ?? 'system'}</span></td>
                      <td className={s.td}>{new Date(e.performedAt).toLocaleString()}</td>
                      <td className={s.td}><span className={s.serviceBadge} style={{background: (SERVICE_COLORS[e.serviceSource] ?? '#64748b') + '18', color: SERVICE_COLORS[e.serviceSource] ?? '#64748b'}}>{e.serviceSource?.replace(/_/g, ' ')}</span></td>
                      <td className={s.td}><ChevronDown size={14} color="#94a3b8" style={{transform: expanded === e.id ? 'rotate(180deg)' : 'none', transition: '0.2s'}}/></td>
                    </tr>
                    {expanded === e.id && e.payload && (
                      <tr key={e.id + '-exp'} className={s.expandedRow}>
                        <td colSpan={7} className={s.payloadCell}>
                          <pre className={s.payload}>{JSON.stringify(JSON.parse(e.payload ?? '{}'), null, 2)}</pre>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              }
            </tbody>
          </table>
        }
      </div>

      {totalPages > 1 && (
        <div className={s.pagination}>
          <button className={s.pageBtn} disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span>Page {page + 1} of {totalPages}</span>
          <button className={s.pageBtn} disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}

export default AuditPage;
