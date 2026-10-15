import { useState } from 'react';
import { Search, Navigation, Activity, Tag, Users } from 'lucide-react';
import client from '@/api/client';
import s from './traceability.module.css';

export function TraceabilityPage(): JSX.Element {
  const [searchCode, setSearchCode] = useState('');
  const [animal, setAnimal] = useState<any>(null);
  const [traceResult, setTraceResult] = useState<any>(null);
  const [traceType, setTraceType] = useState<'back' | 'forward' | null>(null);
  const [searching, setSearching] = useState(false);
  const [tracing, setTracing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchAnimal = async () => {
    if (!searchCode.trim()) return;
    setSearching(true); setError(null); setAnimal(null); setTraceResult(null);
    try {
      const r = await client.get(`/animals/by-code/${searchCode.trim()}`);
      setAnimal(r.data);
    } catch { setError(`Animal "${searchCode}" not found`); }
    finally { setSearching(false); }
  };

  const doTrace = async (type: 'back' | 'forward') => {
    if (!animal) return;
    setTracing(true); setError(null); setTraceType(type);
    try {
      const url = type === 'back'
        ? `/traceability/animals/${animal.id}/trace-back`
        : `/traceability/animals/${animal.id}/trace-forward?windowDays=14`;
      const r = await client.get(url);
      setTraceResult(r.data);
    } catch { setError('Trace failed. Please try again.'); }
    finally { setTracing(false); }
  };

  return (
    <div className={s.page}>
      <div className={s.searchBox}>
        <div className={s.searchInput}>
          <Search size={16} color="#94a3b8" className={s.searchIcon}/>
          <input
            className={s.input}
            placeholder="Enter animal code (e.g. SOM-2024-000001) or tag serial"
            value={searchCode}
            onChange={e => setSearchCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchAnimal()}
          />
        </div>
        <button className={s.searchBtn} onClick={searchAnimal} disabled={searching}>
          {searching ? 'Searching…' : 'Search'}
        </button>
      </div>

      {error && <div className={s.error}>{error}</div>}

      {animal && (
        <div className={s.animalCard}>
          <div className={s.animalHeader}>
            <div>
              <div className={s.animalCode}>{animal.animalCode}</div>
              <div className={s.animalMeta}>{animal.species} · {animal.sex} · {animal.status}</div>
            </div>
            <div className={s.traceActions}>
              <button className={s.traceBtn} onClick={() => doTrace('back')} disabled={tracing}>
                {tracing && traceType === 'back' ? 'Tracing…' : '← Trace Back'}
              </button>
              <button className={s.traceBtn} onClick={() => doTrace('forward')} disabled={tracing}>
                {tracing && traceType === 'forward' ? 'Tracing…' : 'Trace Forward (14d) →'}
              </button>
            </div>
          </div>
          {animal.activeTagSerial && <div className={s.tag}><Tag size={13}/> Tag: {animal.activeTagSerial}</div>}
        </div>
      )}

      {traceResult && traceType === 'back' && (
        <div className={s.resultsCard}>
          <h3 className={s.resultsTitle}>Trace-Back Results</h3>
          <div className={s.timeline}>
            {traceResult.movementHistory?.map((m: any, i: number) => (
              <div key={i} className={s.timelineItem}>
                <div className={s.timelineDot} style={{background: '#0b5ed7'}}/>
                <div className={s.timelineContent}>
                  <div className={s.tlType}><Navigation size={13}/> Movement</div>
                  <div className={s.tlDetail}>{m.originPremisesCode} → {m.destinationPremisesCode}</div>
                  <div className={s.tlDate}>{m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '—'}</div>
                </div>
              </div>
            ))}
            {traceResult.healthEvents?.map((h: any, i: number) => (
              <div key={i} className={s.timelineItem}>
                <div className={s.timelineDot} style={{background: '#059669'}}/>
                <div className={s.timelineContent}>
                  <div className={s.tlType}><Activity size={13}/> {h.eventType?.replace(/_/g, ' ')}</div>
                  <div className={s.tlDetail}>{h.vaccineProduct ?? h.diagnosis ?? h.clinicalNotes ?? ''}</div>
                  <div className={s.tlDate}>{h.eventDate}</div>
                </div>
              </div>
            ))}
            {(!traceResult.movementHistory?.length && !traceResult.healthEvents?.length) && (
              <div className={s.empty}>No history data available from services</div>
            )}
          </div>
        </div>
      )}

      {traceResult && traceType === 'forward' && (
        <div className={s.resultsCard}>
          <h3 className={s.resultsTitle}>Trace-Forward Results (14-day window)</h3>
          {Array.isArray(traceResult) && traceResult.length > 0 ? (
            <div className={s.contactList}>
              {traceResult.map((a: any, i: number) => (
                <div key={i} className={s.contactItem}>
                  <Users size={14} color="#0b5ed7"/>
                  <span>{a.animalCode}</span>
                  <span className={s.contactType}>{a.contactType}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={s.empty}>No contact animals identified in this window</div>
          )}
        </div>
      )}

      {!animal && !error && (
        <div className={s.hint}>
          <Search size={40} color="#c7dff7"/>
          <p>Search for an animal by code to perform trace-back or trace-forward analysis</p>
        </div>
      )}
    </div>
  );
}

export default TraceabilityPage;
