import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Loader2, ChevronRight, MapPin, Calendar, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth.store';
import s from './inspections.module.css';

type InspStatus =
  | 'ASSIGNED' | 'IN_PROGRESS' | 'SUBMITTED'
  | 'APPROVED' | 'PARTIAL_PASS' | 'CORRECTION_REQUIRED'
  | 'REINSPECTION_REQUIRED' | 'VETERINARY_REVIEW'
  | 'FAILED' | 'DISEASE_SUSPECTED';

interface Inspection {
  id: string;
  inspectionCode: string;
  movementCode: string;
  status: InspStatus;
  originPremisesCode: string;
  originPremisesName: string;
  destinationPremisesCode: string;
  destinationPremisesName: string;
  ownerName: string;
  animalCount: number;
  speciesSummary: string;
  purpose: string;
  plannedDepartureDate: string;
  requiredCompletionDate: string;
  assignedAt: string;
}

const STATUS_CFG: Record<InspStatus, { bg: string; color: string; label: string }> = {
  ASSIGNED:              { bg: '#fef3c7', color: '#92400e', label: 'Assigned'          },
  IN_PROGRESS:           { bg: '#dbeafe', color: '#1e40af', label: 'In Progress'       },
  SUBMITTED:             { bg: '#ede9fe', color: '#6d28d9', label: 'Submitted'         },
  APPROVED:              { bg: '#dcfce7', color: '#166534', label: 'Approved'          },
  PARTIAL_PASS:          { bg: '#fef9c3', color: '#854d0e', label: 'Partial Pass'      },
  CORRECTION_REQUIRED:   { bg: '#fee2e2', color: '#991b1b', label: 'Correction Req.'  },
  REINSPECTION_REQUIRED: { bg: '#ffedd5', color: '#9a3412', label: 'Reinspection'     },
  VETERINARY_REVIEW:     { bg: '#e0f2fe', color: '#075985', label: 'Vet Review'       },
  FAILED:                { bg: '#fee2e2', color: '#991b1b', label: 'Failed'            },
  DISEASE_SUSPECTED:     { bg: '#fce7f3', color: '#9d174d', label: 'Disease Suspected'},
};

const ACTIVE_STATUSES  = ['ASSIGNED', 'IN_PROGRESS'];
const CLOSED_STATUSES  = ['SUBMITTED','APPROVED','PARTIAL_PASS','CORRECTION_REQUIRED',
                          'REINSPECTION_REQUIRED','VETERINARY_REVIEW','FAILED','DISEASE_SUSPECTED'];

function mapRow(r: Record<string, unknown>): Inspection {
  return {
    id:                       r.id as string,
    inspectionCode:           r.inspection_code as string,
    movementCode:             r.movement_code as string,
    status:                   r.status as InspStatus,
    originPremisesCode:       r.origin_premises_code as string ?? '',
    originPremisesName:       r.origin_premises_name as string ?? '',
    destinationPremisesCode:  r.destination_premises_code as string ?? '',
    destinationPremisesName:  r.destination_premises_name as string ?? '',
    ownerName:                r.owner_name as string ?? '',
    animalCount:              r.animal_count as number ?? 0,
    speciesSummary:           r.species_summary as string ?? '',
    purpose:                  r.purpose as string ?? '',
    plannedDepartureDate:     r.planned_departure_date as string ?? '',
    requiredCompletionDate:   r.required_completion_date as string ?? '',
    assignedAt:               r.assigned_at as string,
  };
}

function isOverdue(date: string): boolean {
  if (!date) return false;
  return new Date(date) < new Date();
}

function fmtDate(d: string): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function InspectionsPage(): JSX.Element {
  const navigate = useNavigate();
  const { userId, regionCode } = useAuthStore();

  const [tab, setTab]                   = useState<'active' | 'closed'>('active');
  const [inspections, setInspections]   = useState<Inspection[]>([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    void supabase
      .from('movement_inspections')
      .select('*')
      .eq('assigned_to_id', userId)
      .order('assigned_at', { ascending: false })
      .then(({ data }) => {
        setInspections((data ?? []).map(r => mapRow(r as Record<string, unknown>)));
        setLoading(false);
      });
  }, [userId, regionCode]);

  const active  = inspections.filter(i => ACTIVE_STATUSES.includes(i.status));
  const closed  = inspections.filter(i => CLOSED_STATUSES.includes(i.status));
  const shown   = tab === 'active' ? active : closed;

  return (
    <div className={s.page}>
      <div className={s.header}>
        <div>
          <div className={s.title}>Pre-Movement Inspections</div>
          <div className={s.subtitle}>Assigned inspection tasks for animal movement requests</div>
        </div>
      </div>

      <div className={s.tabs}>
        <button
          className={`${s.tab} ${tab === 'active' ? s.tabActive : ''}`}
          onClick={() => setTab('active')}
        >
          Active
          {active.length > 0 && <span className={s.tabBadge}>{active.length}</span>}
        </button>
        <button
          className={`${s.tab} ${tab === 'closed' ? s.tabActive : ''}`}
          onClick={() => setTab('closed')}
        >
          Completed
        </button>
      </div>

      {loading ? (
        <div className={s.loading}>
          <Loader2 size={18} className={s.spinner} />
          Loading inspections…
        </div>
      ) : shown.length === 0 ? (
        <div className={s.empty}>
          <div className={s.emptyIcon}><ClipboardList size={48} /></div>
          <div className={s.emptyTitle}>
            {tab === 'active' ? 'No active inspections assigned' : 'No completed inspections'}
          </div>
        </div>
      ) : (
        <div className={s.list}>
          {shown.map(insp => {
            const cfg     = STATUS_CFG[insp.status] ?? STATUS_CFG.ASSIGNED;
            const overdue = isOverdue(insp.requiredCompletionDate);
            return (
              <div
                key={insp.id}
                className={s.card}
                onClick={() => navigate(`/inspections/${insp.id}`)}
              >
                <div className={s.cardIcon}>
                  <ClipboardList size={20} />
                </div>
                <div className={s.cardBody}>
                  <div className={s.cardTop}>
                    <span className={s.cardCode}>{insp.inspectionCode}</span>
                    <span className={s.status} style={{ background: cfg.bg, color: cfg.color }}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className={s.cardMeta}>
                    <span className={s.cardMetaItem}>
                      <Users size={12} /> {insp.animalCount} animals
                      {insp.speciesSummary && ` · ${insp.speciesSummary}`}
                    </span>
                    <span className={s.cardMetaItem}>
                      <MapPin size={12} />
                      {insp.purpose || 'Movement'}
                    </span>
                    {insp.plannedDepartureDate && (
                      <span className={s.cardMetaItem}>
                        <Calendar size={12} /> Departs {fmtDate(insp.plannedDepartureDate)}
                      </span>
                    )}
                  </div>
                  <div className={s.cardRoute}>
                    {insp.originPremisesCode || '—'} → {insp.destinationPremisesCode || '—'}
                    {insp.ownerName && <span style={{ color: '#94a3b8', marginLeft: '0.5rem' }}>· {insp.ownerName}</span>}
                  </div>
                  {insp.requiredCompletionDate && (
                    <div className={`${s.cardDeadline} ${overdue ? s.cardDeadlineUrgent : ''}`}>
                      {overdue ? 'Overdue' : 'Due'}: {fmtDate(insp.requiredCompletionDate)}
                    </div>
                  )}
                </div>
                <ChevronRight size={16} className={s.chevron} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default InspectionsPage;
