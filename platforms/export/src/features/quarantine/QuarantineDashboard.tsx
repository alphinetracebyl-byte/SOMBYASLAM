import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase';
import {
  Truck, Archive, AlertTriangle, PawPrint, Activity,
  Stethoscope, FlaskConical, CheckCircle, Pill,
} from 'lucide-react';
import { CapacityWidget } from './CapacityWidget';
import s from './qdash.module.css';

interface Stats {
  pending_movements: number;
  active_batches: number;
  on_hold_batches: number;
  animals_in_quarantine: number;
  animals_on_hold: number;
  inspections_due: number;
  samples_pending: number;
  clearances_pending: number;
  treatments_active: number;
}

export function QuarantineDashboard(): JSX.Element {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { facilityId, facilityCode, staffRole } = useAuthStore();
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { void load(); }, [facilityId]);

  async function load() {
    if (!facilityId) return;
    setLoading(true);
    try {
      const [movRes, batchRes, animalRes, inspRes, sampleRes, clearRes, treatRes] = await Promise.all([
        supabase.from('movement_permits').select('id', { count: 'exact', head: true })
          .eq('destination_premises_code', facilityCode).eq('status', 'ACTIVE'),
        supabase.from('quarantine_batches').select('id, status')
          .eq('facility_id', facilityId).in('status', ['ADMITTED', 'ACTIVE', 'ON_HOLD']),
        supabase.from('quarantine_batch_animals').select('id, status')
          .eq('facility_id', facilityId).in('status', ['ACTIVE', 'ON_HOLD']),
        supabase.from('health_inspections').select('id', { count: 'exact', head: true })
          .eq('facility_id', facilityId).in('status', ['PENDING', 'IN_PROGRESS']),
        supabase.from('lab_samples').select('id', { count: 'exact', head: true })
          .eq('facility_id', facilityId).eq('result', 'PENDING'),
        supabase.from('quarantine_batches').select('id', { count: 'exact', head: true })
          .eq('facility_id', facilityId).in('status', ['ADMITTED', 'ACTIVE'])
          .lte('expected_completion_date', new Date().toISOString().slice(0, 10)),
        supabase.from('treatment_records').select('id', { count: 'exact', head: true })
          .eq('facility_id', facilityId).eq('treatment_outcome', 'PENDING'),
      ]);
      const batches = batchRes.data ?? [];
      setStats({
        pending_movements:     movRes.count ?? 0,
        active_batches:        batches.filter(b => b.status !== 'ON_HOLD').length,
        on_hold_batches:       batches.filter(b => b.status === 'ON_HOLD').length,
        animals_in_quarantine: (animalRes.data ?? []).filter(a => a.status === 'ACTIVE').length,
        animals_on_hold:       (animalRes.data ?? []).filter(a => a.status === 'ON_HOLD').length,
        inspections_due:       inspRes.count ?? 0,
        samples_pending:       sampleRes.count ?? 0,
        clearances_pending:    clearRes.count ?? 0,
        treatments_active:     treatRes.count ?? 0,
      });
    } finally {
      setLoading(false);
    }
  }

  const canAccept  = staffRole === 'QUARANTINE_SUPERVISOR';
  const canInspect = ['QUARANTINE_SUPERVISOR', 'VETERINARY_OFFICER'].includes(staffRole ?? '');
  const canLab     = staffRole === 'LAB_TECHNICIAN';
  const st         = stats;

  const tabs = [
    { show: canAccept,  icon: Truck,        label: 'Incoming Movements', path: '/quarantine/movements'   },
    { show: true,       icon: Archive,      label: 'Quarantine Batches', path: '/quarantine/batches'     },
    { show: canInspect, icon: Stethoscope,  label: 'Health Inspections', path: '/quarantine/inspections' },
    { show: canLab,     icon: FlaskConical, label: 'Lab Samples',        path: '/quarantine/lab'         },
    { show: true,       icon: Activity,     label: 'Daily Monitoring',   path: '/quarantine/monitoring'  },
    { show: canInspect, icon: Pill,         label: 'Treatments',         path: '/quarantine/treatments'  },
  ].filter(t => t.show);

  return (
    <div className={s.page}>
      {loading ? <div className={s.loading}>Loading…</div> : (
        <>
          {/* Stat cards — full width */}
          <div className={s.statsRow}>
            <StatCard icon={Truck}         label="Incoming Permits"      value={st?.pending_movements ?? 0}
              onClick={canAccept ? () => void navigate('/quarantine/movements') : undefined} />
            <StatCard icon={Archive}       label="Active Batches"        value={st?.active_batches ?? 0}
              onClick={() => void navigate('/quarantine/batches')} />
            <StatCard icon={AlertTriangle} label="Batches on Hold"       value={st?.on_hold_batches ?? 0}
              onClick={() => void navigate('/quarantine/batches')} />
            <StatCard icon={PawPrint}      label="In Quarantine"         value={st?.animals_in_quarantine ?? 0} />
            <StatCard icon={Activity}      label="Animals on Hold"       value={st?.animals_on_hold ?? 0} />
            <StatCard icon={Stethoscope}   label="Inspections Due"       value={st?.inspections_due ?? 0}
              onClick={canInspect ? () => void navigate('/quarantine/inspections') : undefined} />
            <StatCard icon={FlaskConical}  label="Lab Pending"           value={st?.samples_pending ?? 0}
              onClick={canLab ? () => void navigate('/quarantine/lab') : undefined} />
            <StatCard icon={CheckCircle}   label="Clearances Ready"      value={st?.clearances_pending ?? 0}
              onClick={canInspect ? () => void navigate('/quarantine/batches') : undefined} />
            <StatCard icon={Pill}          label="Active Treatments"     value={st?.treatments_active ?? 0}
              onClick={canInspect ? () => void navigate('/quarantine/treatments') : undefined} />
          </div>

          {/* Capacity widget */}
          <CapacityWidget />

          {/* Navigation tabs */}
          <div className={s.tabBar}>
            {tabs.map(({ icon: Icon, label, path }) => {
              const active = location.pathname.startsWith(path);
              return (
                <button
                  key={path}
                  className={`${s.tab} ${active ? s.tabActive : ''}`}
                  onClick={() => void navigate(path)}
                >
                  <Icon size={14} strokeWidth={2} />
                  {label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, onClick }: {
  icon: typeof Truck; label: string; value: number; onClick?: () => void;
}): JSX.Element {
  return (
    <div className={`${s.statCard} ${onClick ? s.statCardLink : ''}`} onClick={onClick}>
      <Icon size={16} strokeWidth={2} className={s.statIcon} />
      <div className={s.statValue}>{value}</div>
      <div className={s.statLabel}>{label}</div>
    </div>
  );
}

export default QuarantineDashboard;
