import { useState, useEffect, useMemo } from 'react';
import { Activity, Syringe, Stethoscope, AlertCircle, Calendar, User, ChevronDown, ChevronUp } from 'lucide-react';
import client from '@/api/client';
import s from './health.module.css';

interface HealthEvent {
  id: string; eventCode: string; eventType: string; animalCode: string;
  eventDate: string; diagnosis?: string; treatment?: string;
  vaccineProduct?: string; nextDueDate?: string;
  clinicalNotes?: string; responsibleVetName: string;
}

const TYPE_CFG: Record<string, { label: string; color: string; bg: string; border: string; Icon: React.ElementType }> = {
  VACCINATION:           { label: 'Vaccination',   color: '#059669', bg: '#ecfdf5', border: '#6ee7b7', Icon: Syringe      },
  CLINICAL_INSPECTION:   { label: 'Inspection',    color: '#0b5ed7', bg: '#eff6ff', border: '#93c5fd', Icon: Stethoscope  },
  TREATMENT:             { label: 'Treatment',     color: '#d97706', bg: '#fffbeb', border: '#fcd34d', Icon: Activity     },
  DISEASE_INVESTIGATION: { label: 'Investigation', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', Icon: AlertCircle  },
};

const FILTERS = ['ALL', 'VACCINATION', 'CLINICAL_INSPECTION', 'TREATMENT', 'DISEASE_INVESTIGATION'];
const FILTER_LABELS: Record<string, string> = {
  ALL: 'All Types', VACCINATION: 'Vaccination', CLINICAL_INSPECTION: 'Inspection',
  TREATMENT: 'Treatment', DISEASE_INVESTIGATION: 'Investigation',
};

function groupByMonth(events: HealthEvent[]) {
  const map = new Map<string, HealthEvent[]>();
  events.forEach(e => {
    const key = new Date(e.eventDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  });
  return Array.from(map.entries());
}

export function HealthPage(): JSX.Element {
  const [events, setEvents]     = useState<HealthEvent[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('ALL');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    client.get<HealthEvent[]>('/health-events/my-animals')
      .then(r => setEvents(r.data))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const today   = new Date();
  const in30    = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const dueSoon = events.filter(e => e.nextDueDate && new Date(e.nextDueDate) <= in30);
  const vax     = events.filter(e => e.eventType === 'VACCINATION').length;
  const treats  = events.filter(e => e.eventType === 'TREATMENT').length;

  const filtered = filter === 'ALL' ? events : events.filter(e => e.eventType === filter);
  const grouped  = useMemo(() => groupByMonth(filtered), [filtered]);

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.title}>Health Records</h1>
        <p className={s.sub}>Veterinary history for all your animals</p>
      </div>

      <div className={s.stats}>
        <div className={s.statCard}>
          <div className={s.statIcon} style={{ background: '#eff6ff', color: '#0b5ed7' }}><Activity size={20}/></div>
          <div>
            <div className={s.statNum}>{events.length}</div>
            <div className={s.statLabel}>Total Events</div>
          </div>
        </div>
        <div className={s.statCard}>
          <div className={s.statIcon} style={{ background: '#ecfdf5', color: '#059669' }}><Syringe size={20}/></div>
          <div>
            <div className={s.statNum}>{vax}</div>
            <div className={s.statLabel}>Vaccinations</div>
          </div>
        </div>
        <div className={s.statCard}>
          <div className={s.statIcon} style={{ background: '#fffbeb', color: '#d97706' }}><Activity size={20}/></div>
          <div>
            <div className={s.statNum}>{treats}</div>
            <div className={s.statLabel}>Treatments</div>
          </div>
        </div>
        <div className={s.statCard}>
          <div className={s.statIcon} style={{ background: '#fef2f2', color: '#dc2626' }}><Calendar size={20}/></div>
          <div>
            <div className={s.statNum}>{dueSoon.length}</div>
            <div className={s.statLabel}>Due Within 30 Days</div>
          </div>
        </div>
      </div>

      {dueSoon.length > 0 && (
        <div className={s.dueBanner}>
          <Calendar size={16} color="#d97706"/>
          <div className={s.dueBannerContent}>
            <strong>{dueSoon.length} upcoming vaccination{dueSoon.length > 1 ? 's' : ''}</strong>
            {dueSoon.map(e => (
              <span key={e.id} className={s.duePill}>
                {e.animalCode} — {e.vaccineProduct} · {e.nextDueDate}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className={s.chips}>
        {FILTERS.map(f => {
          const cfg = TYPE_CFG[f];
          return (
            <button key={f}
              className={`${s.chip}${filter === f ? ' ' + s.chipActive : ''}`}
              style={filter === f && cfg ? { background: cfg.bg, color: cfg.color, borderColor: cfg.border } : undefined}
              onClick={() => setFilter(f)}>
              {cfg && <cfg.Icon size={12}/>}
              {FILTER_LABELS[f]}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className={s.skeletons}>
          {[1,2,3,4].map(i => <div key={i} className={s.skeleton}/>)}
        </div>
      ) : filtered.length === 0 ? (
        <div className={s.empty}>
          <Activity size={44} color="#cbd5e1"/>
          <p className={s.emptyTitle}>No health records found</p>
          <p className={s.emptySub}>Veterinary events will appear here once recorded</p>
        </div>
      ) : (
        <div className={s.timeline}>
          {grouped.map(([month, evts]) => (
            <div key={month} className={s.monthGroup}>
              <div className={s.monthHeader}>
                <span className={s.monthLabel}>{month}</span>
                <span className={s.monthCount}>{evts.length} event{evts.length > 1 ? 's' : ''}</span>
              </div>
              <div className={s.eventList}>
                {evts.map(e => {
                  const cfg  = TYPE_CFG[e.eventType] ?? TYPE_CFG.CLINICAL_INSPECTION;
                  const open = expanded.has(e.id);
                  return (
                    <div key={e.id} className={s.eventCard} style={{ borderLeftColor: cfg.color }}>
                      <div className={s.eventRow} onClick={() => toggle(e.id)}>
                        <div className={s.typeIcon} style={{ background: cfg.bg, color: cfg.color }}>
                          <cfg.Icon size={16}/>
                        </div>
                        <div className={s.eventMain}>
                          <div className={s.eventTop}>
                            <span className={s.eventType} style={{ color: cfg.color }}>{cfg.label}</span>
                            <span className={s.eventAnimal}>{e.animalCode}</span>
                            <span className={s.eventCode}>{e.eventCode}</span>
                          </div>
                          {(e.vaccineProduct || e.diagnosis) && (
                            <div className={s.eventSub}>
                              {e.vaccineProduct && <span>Vaccine: <strong>{e.vaccineProduct}</strong></span>}
                              {e.diagnosis && <span>Dx: <strong>{e.diagnosis}</strong></span>}
                            </div>
                          )}
                        </div>
                        <div className={s.eventRight}>
                          <span className={s.eventDate}>{e.eventDate}</span>
                          <span className={s.expandBtn}>{open ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}</span>
                        </div>
                      </div>
                      {open && (
                        <div className={s.detail}>
                          {e.treatment && (
                            <div className={s.detRow}><span className={s.detKey}>Treatment</span><span>{e.treatment}</span></div>
                          )}
                          {e.clinicalNotes && (
                            <div className={s.detRow}><span className={s.detKey}>Notes</span><span>{e.clinicalNotes}</span></div>
                          )}
                          {e.nextDueDate && (
                            <div className={s.detRow}>
                              <span className={s.detKey}>Next Due</span>
                              <span className={s.nextDue}><Calendar size={12}/>{e.nextDueDate}</span>
                            </div>
                          )}
                          <div className={s.detRow}>
                            <span className={s.detKey}>Veterinarian</span>
                            <span className={s.vetName}><User size={12}/>{e.responsibleVetName}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
export default HealthPage;
