import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle, XCircle, MessageSquare, Loader, Navigation,
  MapPin, X, ChevronRight, Truck, RefreshCw,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth.store';
import { logActivity } from '@/lib/activity';
import s from './movement-tasks.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MovementTask {
  id: string;
  movementCode: string;
  regionCode: string;
  taskRole: string;
  status: string;
  originPremisesCode: string;
  originPremisesName: string;
  destinationPremisesCode: string;
  destinationPremisesName: string;
  animalCount: number;
  movementTypeCode: string;
  purpose: string;
  plannedDepartureDate: string;
  plannedArrivalDate: string;
  vehicleRegistration: string;
  transporterName?: string;
  speciesNotes?: string;
  reviewerNotes?: string;
  reviewedAt?: string;
  createdAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mapRow(r: Record<string, unknown>): MovementTask {
  return {
    id:                       r.id as string,
    movementCode:             r.movement_code as string,
    regionCode:               r.region_code as string,
    taskRole:                 r.task_role as string,
    status:                   r.status as string,
    originPremisesCode:       (r.origin_premises_code as string) ?? '',
    originPremisesName:       (r.origin_premises_name as string) ?? '',
    destinationPremisesCode:  (r.destination_premises_code as string) ?? '',
    destinationPremisesName:  (r.destination_premises_name as string) ?? '',
    animalCount:              (r.animal_count as number) ?? 0,
    movementTypeCode:         (r.movement_type_code as string) ?? '',
    purpose:                  (r.purpose as string) ?? '',
    plannedDepartureDate:     (r.planned_departure_date as string) ?? '',
    plannedArrivalDate:       (r.planned_arrival_date as string) ?? '',
    vehicleRegistration:      (r.vehicle_registration as string) ?? '',
    transporterName:          r.transporter_name as string | undefined,
    speciesNotes:             r.species_notes as string | undefined,
    reviewerNotes:            r.reviewer_notes as string | undefined,
    reviewedAt:               r.reviewed_at as string | undefined,
    createdAt:                r.created_at as string,
  };
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

const ROLE_LABEL: Record<string, string> = {
  VETERINARY_OFFICER: 'Health Inspector',
  FIELD_INSPECTOR:    'Ban Region',
};

const TABS = [
  { key: 'PENDING',        label: 'Pending'  },
  { key: 'APPROVED',       label: 'Approved' },
  { key: 'REJECTED',       label: 'Rejected' },
  { key: 'INFO_REQUESTED', label: 'Info Req' },
  { key: '',               label: 'All'      },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export function MovementTasksPage(): JSX.Element {
  const { regionCode, roles, userId } = useAuthStore();
  const userRole = roles[0] ?? 'FIELD_INSPECTOR';

  const [tasks,       setTasks]       = useState<MovementTask[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState('PENDING');
  const [pendingCount,setPendingCount]= useState(0);
  const [selected,    setSelected]    = useState<MovementTask | null>(null);

  const [actionType,    setActionType]    = useState<'approve' | 'reject' | 'info' | null>(null);
  const [actionText,    setActionText]    = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError,   setActionError]   = useState<string | null>(null);

  // Pending count badge
  useEffect(() => {
    if (!regionCode) return;
    supabase
      .from('movement_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('region_code', regionCode)
      .eq('task_role',   userRole)
      .eq('status', 'PENDING')
      .then(({ count }) => setPendingCount(count ?? 0));
  }, [regionCode, userRole]);

  const loadTasks = useCallback(() => {
    if (!regionCode) { setLoading(false); return; }
    setLoading(true);

    let query = supabase
      .from('movement_tasks')
      .select('*')
      .eq('region_code', regionCode)
      .eq('task_role',   userRole)
      .order('created_at', { ascending: false });

    if (activeTab) query = query.eq('status', activeTab);

    query.then(({ data, error }) => {
      if (!error && data) setTasks(data.map(mapRow));
      else setTasks([]);
      setLoading(false);
    });
  }, [regionCode, userRole, activeTab]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  // Auto-refresh every 60 s while on the Pending tab so new assignments appear without a manual refresh
  useEffect(() => {
    if (activeTab !== 'PENDING') return;
    const interval = setInterval(loadTasks, 60_000);
    return () => clearInterval(interval);
  }, [activeTab, loadTasks]);

  const handleAction = async () => {
    if (!selected || !actionType) return;
    if (actionType !== 'approve' && !actionText.trim()) return;

    setActionLoading(true);
    setActionError(null);

    const newStatus =
      actionType === 'approve' ? 'APPROVED' :
      actionType === 'reject'  ? 'REJECTED' : 'INFO_REQUESTED';

    const { error } = await supabase
      .from('movement_tasks')
      .update({
        status:         newStatus,
        reviewer_notes: actionText || null,
        reviewed_at:    new Date().toISOString(),
      })
      .eq('id', selected.id);

    if (error) {
      setActionError('Failed to update. Please try again.');
      setActionLoading(false);
      return;
    }

    // If approved, check if both tasks for this movement are now approved → update movement request
    if (actionType === 'approve') {
      const { data: allTasks } = await supabase
        .from('movement_tasks')
        .select('status')
        .eq('movement_code', selected.movementCode);

      const updatedStatuses = (allTasks ?? []).map(t =>
        t.id === selected.id ? 'APPROVED' : t.status,
      );
      const allApproved = updatedStatuses.every(st => st === 'APPROVED');

      if (allApproved) {
        await supabase
          .from('farmer_movement_requests')
          .update({ status: 'APPROVED' })
          .eq('movement_code', selected.movementCode);
      }
    }

    const levelMap = { approve: 'SUCCESS', reject: 'WARNING', info: 'INFO' } as const;
    const titleMap = {
      approve: 'Movement task approved',
      reject:  'Movement task rejected',
      info:    'Movement task — info requested',
    };
    void logActivity({
      category:      'MOVEMENT',
      level:         levelMap[actionType] ?? 'INFO',
      title:         titleMap[actionType],
      detail:        `${selected.movementCode} — ${selected.originPremisesCode} → ${selected.destinationPremisesCode}${actionText ? ` — ${actionText}` : ''}`,
      actorRole:     userRole.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
      region:        regionCode,
      referenceCode: selected.movementCode,
      userId:        userId,
    });

    setTasks(prev => prev.map(t =>
      t.id === selected.id ? { ...t, status: newStatus, reviewerNotes: actionText } : t,
    ));
    setPendingCount(prev => Math.max(0, prev - 1));
    closePanel();
    setActionLoading(false);
  };

  const openPanel = (task: MovementTask) => {
    setSelected(task);
    setActionType(null);
    setActionText('');
    setActionError(null);
  };

  const closePanel = () => {
    setSelected(null);
    setActionType(null);
    setActionText('');
    setActionError(null);
  };

  const territory = regionCode ?? 'Your Region';
  const roleLabel  = ROLE_LABEL[userRole] ?? userRole;

  return (
    <div className={s.page}>

      {/* Header */}
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Movement Request Tasks</h1>
          <p className={s.sub}>{territory} · {roleLabel} review queue</p>
        </div>
        <div className={s.headerRight}>
          {pendingCount > 0 && (
            <div className={s.pendingBadge}>
              <span className={s.pendingDot} />
              {pendingCount} pending
            </div>
          )}
          <button className={s.refreshBtn} onClick={loadTasks} title="Refresh">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={s.tabs}>
        {TABS.map(t => (
          <button
            key={t.key}
            className={`${s.tab}${activeTab === t.key ? ' ' + s.tabActive : ''}`}
            onClick={() => { setActiveTab(t.key); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Task list */}
      {loading ? (
        <div className={s.list}>
          {[1, 2, 3].map(i => <div key={i} className={s.skeleton} />)}
        </div>
      ) : tasks.length === 0 ? (
        <div className={s.empty}>
          <Navigation size={44} strokeWidth={1.25} color="#cbd5e1" />
          <div className={s.emptyTitle}>
            {activeTab === 'PENDING' ? 'No pending movement requests' : 'No tasks in this category'}
          </div>
          <div className={s.emptySub}>
            {activeTab === 'PENDING'
              ? 'Movement requests from farmers in your region will appear here.'
              : 'Tasks will appear once actioned.'}
          </div>
        </div>
      ) : (
        <div className={s.list}>
          {tasks.map(task => {
            const days    = daysSince(task.createdAt);
            const ageLabel = days === 0 ? 'Today' : `${days}d ago`;
            const urgency = days > 5 ? 'urgent' : days > 2 ? 'warn' : 'ok';

            return (
              <div key={task.id} className={s.card}>
                <div className={s.cardLeft}>
                  <div className={s.cardTop}>
                    <span className={s.movCode}>{task.movementCode}</span>
                    <span className={`${s.urgencyBadge} ${s[urgency as keyof typeof s]}`}>{ageLabel}</span>
                    <StatusBadge status={task.status} />
                  </div>

                  <div className={s.routeRow}>
                    <span className={s.routePin}><MapPin size={11} />{task.originPremisesCode}</span>
                    <ChevronRight size={13} color="#94a3b8" />
                    <span className={s.routePinDest}><MapPin size={11} />{task.destinationPremisesCode}</span>
                  </div>

                  <div className={s.cardMeta}>
                    <span><Truck size={11} /> {task.vehicleRegistration}</span>
                    <span className={s.dot}>·</span>
                    <span>{task.animalCount} animal{task.animalCount !== 1 ? 's' : ''}</span>
                    <span className={s.dot}>·</span>
                    <span>{task.purpose}</span>
                    {task.plannedDepartureDate && (
                      <>
                        <span className={s.dot}>·</span>
                        <span>Dep: {task.plannedDepartureDate}</span>
                      </>
                    )}
                  </div>

                  {task.speciesNotes && (
                    <div className={s.speciesRow}>{task.speciesNotes}</div>
                  )}
                </div>

                {task.status === 'PENDING' && (
                  <button className={s.reviewBtn} onClick={() => openPanel(task)}>
                    Review →
                  </button>
                )}
                {task.status !== 'PENDING' && (
                  <button className={`${s.reviewBtn} ${s.reviewBtnGhost}`} onClick={() => openPanel(task)}>
                    View →
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Task detail panel / modal */}
      {selected && (
        <div className={s.overlay} onClick={closePanel}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>

            <div className={s.modalHead}>
              <div>
                <div className={s.modalCode}>{selected.movementCode}</div>
                <div className={s.modalSub}>{selected.purpose} · {selected.movementTypeCode}</div>
              </div>
              <button className={s.closeBtn} onClick={closePanel}><X size={18} /></button>
            </div>

            <div className={s.modalBody}>

              {/* Route */}
              <div className={s.modalRoute}>
                <div className={s.modalRoutePin}>
                  <MapPin size={14} color="#374151" />
                  <div>
                    <div className={s.modalRouteCode}>{selected.originPremisesCode}</div>
                    <div className={s.modalRouteName}>{selected.originPremisesName}</div>
                  </div>
                </div>
                <ChevronRight size={18} color="#94a3b8" className={s.modalRouteArrow} />
                <div className={s.modalRoutePin}>
                  <MapPin size={14} color="#d97706" />
                  <div>
                    <div className={s.modalRouteCode}>{selected.destinationPremisesCode}</div>
                    <div className={s.modalRouteName}>{selected.destinationPremisesName || '—'}</div>
                  </div>
                </div>
              </div>

              {/* Details grid */}
              <div className={s.detailGrid}>
                <Detail label="Animals"    value={`${selected.animalCount}`} />
                <Detail label="Species"    value={selected.speciesNotes ?? '—'} />
                <Detail label="Departure"  value={selected.plannedDepartureDate} />
                <Detail label="Arrival"    value={selected.plannedArrivalDate} />
                <Detail label="Vehicle"    value={selected.vehicleRegistration} mono />
                {selected.transporterName && <Detail label="Transporter" value={selected.transporterName} />}
                <Detail label="Type"       value={selected.movementTypeCode} />
                <Detail label="Region"     value={selected.regionCode} />
              </div>

              {/* Existing reviewer notes (if already reviewed) */}
              {selected.reviewerNotes && (
                <div className={s.existingNotes}>
                  <div className={s.existingNotesLabel}>Review Notes</div>
                  <div className={s.existingNotesText}>{selected.reviewerNotes}</div>
                </div>
              )}

              {/* Action area */}
              {selected.status === 'PENDING' && (
                <div className={s.actionArea}>
                  {actionType === null ? (
                    <div className={s.actionButtons}>
                      <button className={s.approveBtn} onClick={() => setActionType('approve')}>
                        <CheckCircle size={15} /> Approve
                      </button>
                      <button className={s.infoBtn} onClick={() => setActionType('info')}>
                        <MessageSquare size={15} /> Request Info
                      </button>
                      <button className={s.rejectBtn} onClick={() => setActionType('reject')}>
                        <XCircle size={15} /> Reject
                      </button>
                    </div>
                  ) : (
                    <div className={s.actionForm}>
                      <label className={s.actionLabel}>
                        {actionType === 'approve' ? 'Approval notes (optional)' :
                         actionType === 'reject'  ? 'Rejection reason *' :
                         'Information request *'}
                      </label>

                      {actionType === 'reject' && (
                        <div className={s.quickReasons}>
                          {[
                            'Health restriction on origin premises',
                            'Animal health certificates missing',
                            'Vehicle not registered / invalid plate',
                            'Route passes restricted zone',
                            'Species requires additional permits',
                            'Departure date conflicts with quarantine',
                          ].map(r => (
                            <button
                              key={r}
                              type="button"
                              className={`${s.reasonChip} ${actionText === r ? s.reasonChipActive : ''}`}
                              onClick={() => setActionText(r)}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      )}

                      <textarea
                        className={s.actionTextarea}
                        rows={3}
                        value={actionText}
                        onChange={e => setActionText(e.target.value)}
                        placeholder={
                          actionType === 'approve' ? 'e.g. Animals inspected, health certificates verified.' :
                          actionType === 'reject'  ? 'Select a reason above or type your own…' :
                          'e.g. Please attach the health certificate for all cattle.'
                        }
                      />

                      {actionError && <div className={s.actionError}>{actionError}</div>}

                      <div className={s.actionFormBtns}>
                        <button
                          className={actionType === 'approve' ? s.approveBtn : actionType === 'reject' ? s.rejectBtn : s.infoBtn}
                          disabled={actionLoading || (actionType !== 'approve' && !actionText.trim())}
                          onClick={handleAction}
                        >
                          {actionLoading && <Loader size={13} className={s.spin} />}
                          {actionType === 'approve' ? 'Confirm Approval' :
                           actionType === 'reject'  ? 'Confirm Rejection' : 'Send Request'}
                        </button>
                        <button className={s.cancelBtn} onClick={() => { setActionType(null); setActionText(''); }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selected.status !== 'PENDING' && (
                <div className={s.statusBanner} data-status={selected.status}>
                  {selected.status === 'APPROVED'
                    ? <><CheckCircle size={16} /> Movement request approved</>
                    : selected.status === 'REJECTED'
                    ? <><XCircle size={16} /> Movement request rejected</>
                    : <><MessageSquare size={16} /> Additional information requested</>
                  }
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    PENDING:        { bg: '#fef9c3', color: '#92400e', label: 'Pending'   },
    APPROVED:       { bg: '#f0fdf4', color: '#15803d', label: 'Approved'  },
    REJECTED:       { bg: '#fef2f2', color: '#b91c1c', label: 'Rejected'  },
    INFO_REQUESTED: { bg: '#eff6ff', color: '#1d4ed8', label: 'Info Req'  },
  };
  const st = map[status] ?? { bg: '#f3f4f6', color: '#374151', label: status };
  return (
    <span style={{ background: st.bg, color: st.color, fontSize: '0.6875rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: 12, flexShrink: 0 }}>
      {st.label}
    </span>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className={s.detail}>
      <div className={s.detailLabel}>{label}</div>
      <div className={`${s.detailValue}${mono ? ' ' + s.mono : ''}`}>{value || '—'}</div>
    </div>
  );
}

export default MovementTasksPage;
