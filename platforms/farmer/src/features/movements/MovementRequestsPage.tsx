import { useState } from 'react';
import { CheckCircle, Clock, XCircle, Truck, FileText, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import s from './movement-requests.module.css';

interface Request {
  id: string;
  code: string;
  type: 'PREMISE' | 'HERD';
  from: string;
  to: string;
  purpose: string;
  animalCount: number;
  species: string;
  submittedAt: string;
  status: string;
  steps: { label: string; completedAt?: string; pending?: boolean; rejected?: boolean }[];
  note?: string;
}

const REQUESTS: Request[] = [
  {
    id: '1',
    code: 'MV-2026-001234',
    type: 'PREMISE',
    from: 'Baidoa Collection (PRM-BAI-001)',
    to:   'Mogadishu Central (PRM-MOG-001)',
    purpose: 'SALE',
    animalCount: 45,
    species: 'Cattle',
    submittedAt: '2026-08-01T08:00:00Z',
    status: 'IN_TRANSIT',
    steps: [
      { label: 'Submitted',     completedAt: '2026-08-01 08:00' },
      { label: 'Under Review',  completedAt: '2026-08-01 09:15' },
      { label: 'Approved',      completedAt: '2026-08-01 10:30' },
      { label: 'Permit Issued', completedAt: '2026-08-01 11:00' },
      { label: 'In Transit',    completedAt: '2026-08-01 13:00' },
      { label: 'Completed',     pending: true },
    ],
  },
  {
    id: '2',
    code: 'MV-2026-001235',
    type: 'PREMISE',
    from: 'Kismayo Market (PRM-KIS-001)',
    to:   'Mogadishu Central (PRM-MOG-001)',
    purpose: 'SLAUGHTER',
    animalCount: 120,
    species: 'Goat',
    submittedAt: '2026-07-28T10:00:00Z',
    status: 'COMPLETED',
    steps: [
      { label: 'Submitted',     completedAt: '2026-07-28 10:00' },
      { label: 'Under Review',  completedAt: '2026-07-28 11:20' },
      { label: 'Approved',      completedAt: '2026-07-28 13:00' },
      { label: 'Permit Issued', completedAt: '2026-07-28 14:30' },
      { label: 'In Transit',    completedAt: '2026-07-29 07:00' },
      { label: 'Completed',     completedAt: '2026-07-29 16:45' },
    ],
  },
  {
    id: '3',
    code: 'MV-2026-001236',
    type: 'HERD',
    from: 'Beledweyne Farm (PRM-BEL-001)',
    to:   'Galkayo Camel Hub (PRM-GAL-001)',
    purpose: 'GRAZING',
    animalCount: 80,
    species: 'Camel',
    submittedAt: '2026-08-02T07:30:00Z',
    status: 'APPROVED',
    steps: [
      { label: 'Submitted',     completedAt: '2026-08-02 07:30' },
      { label: 'Under Review',  completedAt: '2026-08-02 08:00' },
      { label: 'Approved',      completedAt: '2026-08-02 09:45' },
      { label: 'Permit Issued', pending: true },
      { label: 'In Transit',    pending: true },
      { label: 'Completed',     pending: true },
    ],
  },
  {
    id: '4',
    code: 'MV-2026-001237',
    type: 'PREMISE',
    from: 'Galkayo Camel Hub (PRM-GAL-001)',
    to:   'Bosaso Export Port (PRM-BOS-001)',
    purpose: 'EXPORT',
    animalCount: 200,
    species: 'Camel',
    submittedAt: '2026-08-01T06:00:00Z',
    status: 'IN_TRANSIT',
    note: 'Export permit requires veterinary certificate.',
    steps: [
      { label: 'Submitted',     completedAt: '2026-08-01 06:00' },
      { label: 'Under Review',  completedAt: '2026-08-01 07:30' },
      { label: 'Approved',      completedAt: '2026-08-01 08:00' },
      { label: 'Permit Issued', completedAt: '2026-08-01 09:00' },
      { label: 'In Transit',    completedAt: '2026-08-01 11:00' },
      { label: 'Completed',     pending: true },
    ],
  },
  {
    id: '5',
    code: 'MV-2026-001238',
    type: 'HERD',
    from: 'Jowhar Goat Farm (PRM-JOW-001)',
    to:   'Marka Coastal (PRM-MAR-001)',
    purpose: 'SALE',
    animalCount: 30,
    species: 'Goat',
    submittedAt: '2026-07-25T12:00:00Z',
    status: 'COMPLETED',
    steps: [
      { label: 'Submitted',     completedAt: '2026-07-25 12:00' },
      { label: 'Under Review',  completedAt: '2026-07-25 13:00' },
      { label: 'Approved',      completedAt: '2026-07-25 14:30' },
      { label: 'Permit Issued', completedAt: '2026-07-25 15:00' },
      { label: 'In Transit',    completedAt: '2026-07-26 06:00' },
      { label: 'Completed',     completedAt: '2026-07-26 11:00' },
    ],
  },
  {
    id: '6',
    code: 'MV-2026-001239',
    type: 'HERD',
    from: 'Hargeisa Sheep Mkt (PRM-HAR-001)',
    to:   'Garowe Livestock (PRM-GAR-001)',
    purpose: 'BREEDING',
    animalCount: 15,
    species: 'Sheep',
    submittedAt: '2026-08-02T09:00:00Z',
    status: 'SUBMITTED',
    steps: [
      { label: 'Submitted',     completedAt: '2026-08-02 09:00' },
      { label: 'Under Review',  pending: true },
      { label: 'Approved',      pending: true },
      { label: 'Permit Issued', pending: true },
      { label: 'In Transit',    pending: true },
      { label: 'Completed',     pending: true },
    ],
  },
  {
    id: '7',
    code: 'MV-2026-001240',
    type: 'PREMISE',
    from: 'Mogadishu Central (PRM-MOG-001)',
    to:   'Kismayo Market (PRM-KIS-001)',
    purpose: 'SALE',
    animalCount: 60,
    species: 'Cattle',
    submittedAt: '2026-07-30T14:00:00Z',
    status: 'REJECTED',
    note: 'Rejected: health restriction on origin premises.',
    steps: [
      { label: 'Submitted',     completedAt: '2026-07-30 14:00' },
      { label: 'Under Review',  completedAt: '2026-07-30 15:00' },
      { label: 'Rejected',      completedAt: '2026-07-30 16:00', rejected: true },
    ],
  },
  {
    id: '8',
    code: 'MV-2026-001241',
    type: 'PREMISE',
    from: 'Garowe Livestock (PRM-GAR-001)',
    to:   'Bosaso Export Port (PRM-BOS-001)',
    purpose: 'EXPORT',
    animalCount: 350,
    species: 'Camel',
    submittedAt: '2026-08-02T04:00:00Z',
    status: 'IN_TRANSIT',
    steps: [
      { label: 'Submitted',     completedAt: '2026-08-02 04:00' },
      { label: 'Under Review',  completedAt: '2026-08-02 05:00' },
      { label: 'Approved',      completedAt: '2026-08-02 06:00' },
      { label: 'Permit Issued', completedAt: '2026-08-02 07:00' },
      { label: 'In Transit',    completedAt: '2026-08-02 09:00' },
      { label: 'Completed',     pending: true },
    ],
  },
  {
    id: '9',
    code: 'MV-2026-001242',
    type: 'HERD',
    from: 'Beledweyne Farm (PRM-BEL-001)',
    to:   'Jowhar Goat Farm (PRM-JOW-001)',
    purpose: 'SALE',
    animalCount: 25,
    species: 'Goat',
    submittedAt: '2026-08-02T11:00:00Z',
    status: 'PERMIT_ISSUED',
    steps: [
      { label: 'Submitted',     completedAt: '2026-08-02 11:00' },
      { label: 'Under Review',  completedAt: '2026-08-02 11:30' },
      { label: 'Approved',      completedAt: '2026-08-02 12:00' },
      { label: 'Permit Issued', completedAt: '2026-08-02 13:00' },
      { label: 'In Transit',    pending: true },
      { label: 'Completed',     pending: true },
    ],
  },
];

const STATUS_COLOR: Record<string, { color: string; bg: string; label: string }> = {
  SUBMITTED:            { color: '#2563eb', bg: '#eff6ff', label: 'Submitted'            },
  UNDER_REVIEW:         { color: '#7c3aed', bg: '#f5f3ff', label: 'Under Review'         },
  INSPECTION_ASSIGNED:  { color: '#0e7490', bg: '#ecfeff', label: 'Inspection Assigned'   },
  INSPECTION_FAILED:    { color: '#dc2626', bg: '#fef2f2', label: 'Inspection Failed'     },
  APPROVED:             { color: '#059669', bg: '#ecfdf5', label: 'Approved'             },
  PERMIT_ISSUED:        { color: '#6366f1', bg: '#eef2ff', label: 'Permit Issued'        },
  IN_TRANSIT:           { color: '#d97706', bg: '#fffbeb', label: 'In Transit'           },
  COMPLETED:            { color: '#16a34a', bg: '#f0fdf4', label: 'Completed'            },
  REJECTED:             { color: '#dc2626', bg: '#fef2f2', label: 'Rejected'             },
};

const FILTERS = ['ALL', 'PREMISE', 'HERD', 'IN_TRANSIT', 'COMPLETED', 'REJECTED', 'SUBMITTED'];

export function MovementRequestsPage(): JSX.Element {
  const [filter,   setFilter]   = useState('ALL');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = filter === 'ALL'        ? REQUESTS
    : filter === 'PREMISE'                 ? REQUESTS.filter(r => r.type === 'PREMISE')
    : filter === 'HERD'                    ? REQUESTS.filter(r => r.type === 'HERD')
    : REQUESTS.filter(r => r.status === filter);

  return (
    <div className={s.page}>

      {/* Summary stat row */}
      <div className={s.statRow}>
        {[
          { label: 'Total',      count: REQUESTS.length,                                              color: '#2563eb', bg: '#eff6ff' },
          { label: 'Premise',    count: REQUESTS.filter(r => r.type === 'PREMISE').length,            color: '#0369a1', bg: '#e0f2fe' },
          { label: 'Herd',       count: REQUESTS.filter(r => r.type === 'HERD').length,               color: '#7c3aed', bg: '#f5f3ff' },
          { label: 'In Transit', count: REQUESTS.filter(r => r.status === 'IN_TRANSIT').length,       color: '#d97706', bg: '#fffbeb' },
          { label: 'Completed',  count: REQUESTS.filter(r => r.status === 'COMPLETED').length,        color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Rejected',   count: REQUESTS.filter(r => r.status === 'REJECTED').length,         color: '#dc2626', bg: '#fef2f2' },
        ].map(s2 => (
          <div key={s2.label} className={s.statCard} style={{ borderTop: `3px solid ${s2.color}` }}>
            <div className={s.statNum} style={{ color: s2.color }}>{s2.count}</div>
            <div className={s.statLabel}>{s2.label}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className={s.filterBar}>
        {FILTERS.map(f => (
          <button
            key={f}
            className={`${s.filterBtn}${filter === f ? ' ' + s.filterBtnActive : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'ALL' ? 'All Requests' : f === 'IN_TRANSIT' ? 'In Transit' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Request list */}
      <div className={s.list}>
        {filtered.map(req => {
          const st       = STATUS_COLOR[req.status] ?? STATUS_COLOR.SUBMITTED;
          const isOpen   = expanded === req.id;
          const lastDone = req.steps.filter(st2 => st2.completedAt).length;

          return (
            <div key={req.id} className={`${s.card}${isOpen ? ' ' + s.cardOpen : ''}`}>

              {/* Card header — always visible */}
              <div className={s.cardHead} onClick={() => setExpanded(isOpen ? null : req.id)}>
                <div className={s.cardLeft}>
                  <div className={s.cardTopRow}>
                    <span className={s.cardCode}>{req.code}</span>
                    <span className={s.typePill} style={{
                      background: req.type === 'PREMISE' ? '#e0f2fe' : '#f5f3ff',
                      color:      req.type === 'PREMISE' ? '#0369a1' : '#7c3aed',
                    }}>
                      {req.type === 'PREMISE' ? 'Premise Move' : 'Herd Move'}
                    </span>
                    <span className={s.statusBadge} style={{ color: st.color, background: st.bg }}>
                      {st.label}
                    </span>
                  </div>
                  <div className={s.cardRoute}>
                    <MapPin size={12} color="#94a3b8" />
                    <span className={s.routeFrom}>{req.from}</span>
                    <span className={s.routeArrow}>→</span>
                    <span className={s.routeTo}>{req.to}</span>
                  </div>
                  <div className={s.cardMeta}>
                    <span>🐄 {req.animalCount} {req.species}</span>
                    <span className={s.dot2}>·</span>
                    <span>{req.purpose}</span>
                    <span className={s.dot2}>·</span>
                    <span>{new Date(req.submittedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>

                {/* Mini progress track */}
                <div className={s.miniTrack}>
                  <div className={s.miniBar}>
                    <div
                      className={s.miniFill}
                      style={{
                        width: `${(lastDone / req.steps.length) * 100}%`,
                        background: req.status === 'REJECTED' ? '#dc2626' : st.color,
                      }}
                    />
                  </div>
                  <span className={s.miniLabel}>{lastDone}/{req.steps.length} steps</span>
                </div>

                <div className={s.expandIcon}>
                  {isOpen ? <ChevronUp size={16} color="#94a3b8"/> : <ChevronDown size={16} color="#94a3b8"/>}
                </div>
              </div>

              {/* Expanded — status timeline */}
              {isOpen && (
                <div className={s.cardBody}>
                  {req.note && (
                    <div className={s.noteBox}>
                      <FileText size={13} color="#f97316"/> {req.note}
                    </div>
                  )}

                  <div className={s.timeline}>
                    {req.steps.map((step, i) => {
                      const done     = !!step.completedAt;
                      const rejected = !!step.rejected;
                      const pending  = !!step.pending;
                      return (
                        <div key={i} className={s.timelineStep}>
                          {/* Connector line */}
                          {i < req.steps.length - 1 && (
                            <div className={`${s.connector}${done && !rejected ? ' ' + s.connectorDone : ''}`} />
                          )}

                          {/* Node */}
                          <div className={`${s.node} ${rejected ? s.nodeRejected : done ? s.nodeDone : s.nodePending}`}>
                            {rejected ? <XCircle size={13}/> : done ? <CheckCircle size={13}/> : <Clock size={13}/>}
                          </div>

                          {/* Label + time */}
                          <div className={s.stepInfo}>
                            <span className={`${s.stepLabel} ${rejected ? s.stepLabelRejected : done ? s.stepLabelDone : s.stepLabelPending}`}>
                              {step.label}
                            </span>
                            {step.completedAt && (
                              <span className={s.stepTime}>{step.completedAt}</span>
                            )}
                            {pending && !done && (
                              <span className={s.stepWaiting}>Waiting…</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Action buttons */}
                  {req.status === 'PERMIT_ISSUED' && (
                    <div className={s.actions}>
                      <button className={s.actionBtn}>
                        <Truck size={14}/> Confirm Departure
                      </button>
                    </div>
                  )}
                  {req.status === 'IN_TRANSIT' && (
                    <div className={s.actions}>
                      <button className={`${s.actionBtn} ${s.actionGreen}`}>
                        <CheckCircle size={14}/> Confirm Arrival
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MovementRequestsPage;
