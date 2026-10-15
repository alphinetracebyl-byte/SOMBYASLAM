import { useState, useEffect } from 'react';
import { Navigation, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp, FileText, AlertTriangle, Search, X, ClipboardList, Loader2, Bell, MapPin, FileCheck, Printer } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth.store';
import { logActivity } from '@/lib/activity';

type MStatus =
  | 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'IN_TRANSIT' | 'COMPLETED'
  | 'INSPECTION_ASSIGNED' | 'DESTINATION_CHECK' | 'DESTINATION_REJECTED'
  | 'PERMIT_ISSUED' | 'DEPARTURE_CONFIRMED' | 'ARRIVAL_CONFIRMED' | 'INSPECTION_FAILED';

interface FieldOfficer {
  id: string;
  fullName: string;
  role: string;
  regionCode: string;
}


interface Movement {
  id: string;
  animal: string;
  species: string;
  from: string;
  to: string;
  owner: string;
  ownerId: string;
  date: string;
  purpose: string;
  permitRef?: string;
  status: MStatus;
  rejectionReason?: string;
  notes?: string;
  animalCount: number;
  animalIds: string[];
  originPremisesCode: string;
  originPremisesName: string;
  originRegionCode: string;
  destinationPremisesCode: string;
  destinationPremisesName: string;
  destinationRegionCode: string;
  regionCode: string;
  plannedDepartureDate: string;
  movementTypeCode: string;
  vehicleRegistration: string;
  transporterName: string;
  ownerNationalId: string;
  inspectionPassed?: boolean;
}

const DB_TO_STATUS: Record<string, MStatus> = {
  SUBMITTED:            'PENDING',
  UNDER_REVIEW:         'UNDER_REVIEW',
  INSPECTION_ASSIGNED:  'INSPECTION_ASSIGNED',
  DESTINATION_CHECK:    'DESTINATION_CHECK',
  DESTINATION_REJECTED: 'DESTINATION_REJECTED',
  PERMIT_ISSUED:        'PERMIT_ISSUED',
  DEPARTURE_CONFIRMED:  'DEPARTURE_CONFIRMED',
  ARRIVAL_CONFIRMED:    'ARRIVAL_CONFIRMED',
  APPROVED:             'APPROVED',
  REJECTED:             'REJECTED',
  INSPECTION_FAILED:    'INSPECTION_FAILED',
  IN_TRANSIT:           'IN_TRANSIT',
  COMPLETED:            'COMPLETED',
};

function extractSpecies(notes: string | null): string {
  if (!notes) return 'Cattle';
  for (const sp of ['Cattle', 'Camel', 'Sheep', 'Goat']) {
    if (notes.includes(sp)) return sp;
  }
  return 'Cattle';
}

const SPECIES_EMOJI: Record<string, string> = { Cattle: '🐄', Camel: '🐪', Goat: '🐐', Sheep: '🐑' };

const STATUS_CFG: Record<MStatus, { bg: string; color: string; label: string }> = {
  PENDING:              { bg: '#fef3c7', color: '#92400e', label: 'Pending'              },
  UNDER_REVIEW:         { bg: '#dbeafe', color: '#1e40af', label: 'Under Review'         },
  INSPECTION_ASSIGNED:  { bg: '#ede9fe', color: '#6d28d9', label: 'Inspection Assigned'  },
  INSPECTION_FAILED:    { bg: '#fee2e2', color: '#991b1b', label: 'Inspection Failed'    },
  DESTINATION_CHECK:    { bg: '#fff7ed', color: '#c2410c', label: 'Dest. Check'          },
  DESTINATION_REJECTED: { bg: '#fee2e2', color: '#991b1b', label: 'Dest. Rejected'       },
  PERMIT_ISSUED:        { bg: '#ecfdf5', color: '#065f46', label: 'Permit Issued'        },
  DEPARTURE_CONFIRMED:  { bg: '#f0fdf4', color: '#15803d', label: 'Departed'             },
  ARRIVAL_CONFIRMED:    { bg: '#f0fdf4', color: '#166534', label: 'Arrived'              },
  APPROVED:             { bg: '#dcfce7', color: '#166534', label: 'Approved'             },
  REJECTED:             { bg: '#fee2e2', color: '#991b1b', label: 'Rejected'             },
  IN_TRANSIT:           { bg: '#f0fdf4', color: '#15803d', label: 'In Transit'           },
  COMPLETED:            { bg: '#f1f5f9', color: '#475569', label: 'Completed'            },
};

const REJECT_REASONS = [
  'Missing veterinary health certificate',
  'Animal under quarantine restriction',
  'Health test results expired or missing',
  'Premises of origin not approved',
  'Destination premises not registered',
  'Incomplete movement request form',
  'Brucellosis / FMD test required',
  'Other (specify below)',
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const card: React.CSSProperties = { background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.08)' };
const kpi:  React.CSSProperties = { background: '#fff', borderRadius: 12, padding: '1.125rem 1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,.07)' };

export function MovementsPage(): JSX.Element {
  const { userId, roles } = useAuthStore();
  const actorRole = (roles[0] ?? 'MINISTRY_OFFICER').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [filter, setFilter]       = useState<'ALL' | MStatus>('ALL');
  const [expanded, setExpanded]   = useState<string | null>(null);

  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectPreset, setRejectPreset] = useState('');
  const [rejectNote,   setRejectNote]   = useState('');
  const [confirmApprove, setConfirmApprove] = useState<string | null>(null);

  // Escalation tracking
  const [escalationDays,         setEscalationDays]         = useState(2);
  const [overdueInspectionCodes, setOverdueInspectionCodes] = useState<Set<string>>(new Set());
  const [overdueList,            setOverdueList]            = useState<{ movementCode: string; assigneeName: string; assignedAt: string }[]>([]);

  // Inspection assignment
  const [assignTarget, setAssignTarget]   = useState<Movement | null>(null);
  const [officers, setOfficers]           = useState<FieldOfficer[]>([]);
  const [officersLoading, setOfficersLoading] = useState(false);
  const [selectedOfficerId, setSelectedOfficerId] = useState('');
  const [completionDate, setCompletionDate]       = useState('');
  const [assigning, setAssigning]                 = useState(false);

  // Destination check assignment
  const [destCheckTarget, setDestCheckTarget]           = useState<Movement | null>(null);
  const [destOfficers, setDestOfficers]                 = useState<FieldOfficer[]>([]);
  const [destOfficersLoading, setDestOfficersLoading]   = useState(false);
  const [selectedDestOfficerId, setSelectedDestOfficerId] = useState('');
  const [assigningDest, setAssigningDest]               = useState(false);

  // Permit issuance
  const [permitTarget, setPermitTarget]   = useState<Movement | null>(null);
  const [permitValidTo, setPermitValidTo] = useState('');
  const [permitConditions, setPermitConditions] = useState('');
  const [issuingPermit, setIssuingPermit] = useState(false);

  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => { fetchMovements(); }, []);

  async function fetchMovements() {
    setLoading(true);

    // Load escalation threshold
    const { data: escRow } = await supabase.from('app_settings').select('value').eq('key', 'inspection_escalation_days').single();
    const escDays = parseInt(escRow?.value ?? '2', 10);
    setEscalationDays(escDays);

    // Load overdue assigned inspections (assigned but not started past threshold)
    const cutoff = new Date(Date.now() - escDays * 86_400_000).toISOString();
    const { data: overdueData } = await supabase
      .from('movement_inspections')
      .select('movement_code, assigned_to_name, assigned_at')
      .eq('status', 'ASSIGNED')
      .lt('assigned_at', cutoff);

    const overdue = (overdueData ?? []) as { movement_code: string; assigned_to_name: string; assigned_at: string }[];
    setOverdueInspectionCodes(new Set(overdue.map(o => o.movement_code)));
    setOverdueList(overdue.map(o => ({ movementCode: o.movement_code, assigneeName: o.assigned_to_name, assignedAt: o.assigned_at })));

    const { data } = await supabase
      .from('farmer_movement_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) {
      // Resolve farmer names from user_ids
      const userIds = [...new Set(data.map(r => r.user_id as string).filter(Boolean))];
      const nameMap:  Record<string, string> = {};
      const natIdMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: farmerRows } = await supabase
          .from('farmers')
          .select('user_id, full_name, national_id')
          .in('user_id', userIds);
        (farmerRows ?? []).forEach((f: any) => {
          if (f.user_id) {
            nameMap[f.user_id]  = f.full_name as string;
            natIdMap[f.user_id] = (f.national_id as string) ?? '';
          }
        });
      }
      const mapped: Movement[] = data.map(row => ({
        id:                      row.movement_code,
        animal:                  row.species_notes || row.notes || `${row.animal_count} animal(s)`,
        species:                 extractSpecies(row.species_notes ?? row.notes),
        from:                    row.origin_premises_name || row.origin_premises_code || '-',
        to:                      row.destination_premises_name || row.destination_premises_code || '-',
        owner:                   row.owner_name || nameMap[row.user_id] || (row.user_id ? row.user_id.slice(0, 8) + '…' : '-'),
        ownerId:                 row.user_id || '-',
        date:                    row.planned_departure_date || (row.created_at?.slice(0, 10) ?? ''),
        purpose:                 row.purpose || '-',
        status:                  (DB_TO_STATUS[row.status] ?? 'PENDING') as MStatus,
        notes:                   row.notes ?? undefined,
        rejectionReason:         row.rejection_reason ?? undefined,
        animalCount:             row.animal_count ?? 0,
        animalIds:               (row.animal_ids as string[]) ?? [],
        originPremisesCode:      row.origin_premises_code ?? '',
        originPremisesName:      row.origin_premises_name ?? '',
        originRegionCode:        row.origin_region_code ?? '',
        destinationPremisesCode: row.destination_premises_code ?? '',
        destinationPremisesName: row.destination_premises_name ?? '',
        destinationRegionCode:   row.destination_region_code ?? '',
        regionCode:              row.origin_region_code ?? '',
        plannedDepartureDate:    row.planned_departure_date ?? '',
        movementTypeCode:        row.movement_type_code ?? '',
        vehicleRegistration:     row.vehicle_registration ?? '',
        transporterName:         (row.transporter_name as string) ?? '',
        ownerNationalId:         natIdMap[row.user_id] ?? '',
      }));

      // Mark UNDER_REVIEW movements that came via a passed inspection
      const underReviewCodes = mapped
        .filter(m => m.status === 'UNDER_REVIEW')
        .map(m => m.id);

      if (underReviewCodes.length > 0) {
        const { data: inspRows } = await supabase
          .from('movement_inspections')
          .select('movement_code')
          .in('movement_code', underReviewCodes)
          .in('overall_decision', ['PASS', 'PARTIAL_PASS'])
          .not('submitted_at', 'is', null);

        const passedCodes = new Set((inspRows ?? []).map((r: any) => r.movement_code as string));
        setMovements(mapped.map(m => ({ ...m, inspectionPassed: passedCodes.has(m.id) })));
      } else {
        setMovements(mapped);
      }
    }
    setLoading(false);
  }

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3200);
  }

  async function doApprove(id: string) {
    const mv = movements.find(m => m.id === id);
    const { error } = await supabase
      .from('farmer_movement_requests')
      .update({ status: 'APPROVED' })
      .eq('movement_code', id);
    if (error) { showToast('Failed to approve movement.', false); return; }
    const permitRef = 'PRM-' + id.slice(4);
    setMovements(prev => prev.map(m =>
      m.id === id ? { ...m, status: 'APPROVED', permitRef } : m
    ));
    setConfirmApprove(null);
    setExpanded(null);
    showToast(`Movement ${id} approved — permit issued.`);
    void logActivity({
      category:      'MOVEMENT',
      level:         'SUCCESS',
      title:         'Movement request approved',
      detail:        mv ? `${mv.from} → ${mv.to} — permit issued` : id,
      actorRole,
      userId:        userId ?? undefined,
      referenceCode: id,
    });
  }

  async function doReject(id: string) {
    const reason = rejectPreset === 'Other (specify below)' || !rejectPreset
      ? rejectNote
      : rejectPreset + (rejectNote ? '. ' + rejectNote : '');
    if (!reason.trim()) return;
    const mv = movements.find(m => m.id === id);
    const { error } = await supabase
      .from('farmer_movement_requests')
      .update({ status: 'REJECTED', rejection_reason: reason })
      .eq('movement_code', id);
    if (error) { showToast('Failed to reject movement.', false); return; }
    setMovements(prev => prev.map(m =>
      m.id === id ? { ...m, status: 'REJECTED', rejectionReason: reason } : m
    ));
    setRejectTarget(null);
    setRejectPreset('');
    setRejectNote('');
    setExpanded(null);
    showToast(`Movement ${id} rejected.`, false);
    void logActivity({
      category:      'MOVEMENT',
      level:         'WARNING',
      title:         'Movement request rejected',
      detail:        mv ? `${mv.from} → ${mv.to} — ${reason}` : `${id} — ${reason}`,
      actorRole,
      userId:        userId ?? undefined,
      referenceCode: id,
    });
  }

  async function doReview(id: string) {
    const { error } = await supabase
      .from('farmer_movement_requests')
      .update({ status: 'UNDER_REVIEW' })
      .eq('movement_code', id);
    if (error) { showToast('Failed to update status.', false); return; }
    setMovements(prev => prev.map(m =>
      m.id === id ? { ...m, status: 'UNDER_REVIEW' } : m
    ));
    showToast(`Movement ${id} marked Under Review.`);
    void logActivity({
      category:      'MOVEMENT',
      level:         'INFO',
      title:         'Movement request under review',
      detail:        id,
      actorRole,
      userId:        userId ?? undefined,
      referenceCode: id,
    });
  }

  async function openAssignDialog(mv: Movement) {
    setAssignTarget(mv);
    setSelectedOfficerId('');
    setCompletionDate('');
    setOfficersLoading(true);
    const { data } = await supabase
      .from('user_registrations')
      .select('id, full_name, role, region_code')
      .in('role', ['FIELD_INSPECTOR', 'VETERINARY_OFFICER'])
      .eq('region_code', mv.regionCode)   // origin region only — animals are physically there
      .order('full_name');
    setOfficers((data ?? []).map((r: Record<string, unknown>) => ({
      id:         r.id as string,
      fullName:   r.full_name as string,
      role:       r.role as string,
      regionCode: (r.region_code as string) ?? '',
    })));
    setOfficersLoading(false);
  }

  async function doAssignInspection() {
    if (!assignTarget || !selectedOfficerId) return;
    setAssigning(true);
    const officer = officers.find(o => o.id === selectedOfficerId);

    // Generate inspection code via RPC (falls back to a client-generated one)
    let inspCode = `INS-${(assignTarget.regionCode || 'SOM').toUpperCase().slice(0, 3)}-${new Date().getFullYear().toString().slice(2)}-${String(Date.now()).slice(-4)}`;
    const { data: rpcCode } = await supabase.rpc('generate_inspection_code', {
      p_region: assignTarget.regionCode || 'SOM',
    });
    if (rpcCode) inspCode = rpcCode as string;

    const { error } = await supabase.from('movement_inspections').insert({
      inspection_code:           inspCode,
      movement_code:             assignTarget.id,
      assigned_by_id:            userId ?? null,
      assigned_by_name:          actorRole,
      assigned_to_id:            selectedOfficerId,
      assigned_to_name:          officer?.fullName ?? '',
      assigned_to_role:          officer?.role ?? 'FIELD_INSPECTOR',
      required_completion_date:  completionDate || null,
      origin_premises_code:      assignTarget.originPremisesCode,
      origin_premises_name:      assignTarget.originPremisesName,
      origin_region_code:        assignTarget.regionCode,
      destination_premises_code: assignTarget.destinationPremisesCode,
      destination_premises_name: assignTarget.destinationPremisesName,
      farmer_user_id:            assignTarget.ownerId,
      owner_name:                assignTarget.owner,
      animal_count:              assignTarget.animalCount,
      animal_ids:                assignTarget.animalIds,
      species_summary:           assignTarget.animal,
      movement_type_code:        '',
      purpose:                   assignTarget.purpose,
      planned_departure_date:    assignTarget.plannedDepartureDate || null,
      region_code:               assignTarget.regionCode,
    });

    if (error) { showToast('Failed to assign inspection.', false); setAssigning(false); return; }

    await supabase.from('farmer_movement_requests')
      .update({ status: 'INSPECTION_ASSIGNED' })
      .eq('movement_code', assignTarget.id);

    setMovements(prev => prev.map(m =>
      m.id === assignTarget.id ? { ...m, status: 'INSPECTION_ASSIGNED' } : m,
    ));
    setAssignTarget(null);
    setAssigning(false);
    showToast(`Inspection ${inspCode} assigned to ${officer?.fullName ?? 'officer'}.`);
    void logActivity({
      category:      'MOVEMENT',
      level:         'INFO',
      title:         'Pre-movement inspection assigned',
      detail:        `${inspCode} assigned to ${officer?.fullName ?? selectedOfficerId} — ${assignTarget.id}`,
      actorRole,
      userId:        userId ?? undefined,
      referenceCode: inspCode,
    });
  }

  async function openDestCheckDialog(mv: Movement) {
    setDestCheckTarget(mv);
    setSelectedDestOfficerId('');
    setDestOfficersLoading(true);
    const destRegion = mv.destinationRegionCode || mv.destinationPremisesCode.slice(0, 3) || 'SOM';
    const { data } = await supabase
      .from('user_registrations')
      .select('id, full_name, role, region_code')
      .in('role', ['FIELD_INSPECTOR', 'VETERINARY_OFFICER'])
      .eq('region_code', destRegion)
      .order('full_name');
    setDestOfficers((data ?? []).map((r: Record<string, unknown>) => ({
      id:         r.id as string,
      fullName:   r.full_name as string,
      role:       r.role as string,
      regionCode: (r.region_code as string) ?? '',
    })));
    setDestOfficersLoading(false);
  }

  async function doAssignDestCheck() {
    if (!destCheckTarget || !selectedDestOfficerId) return;
    setAssigningDest(true);
    const officer = destOfficers.find(o => o.id === selectedDestOfficerId);
    const destRegion = destCheckTarget.destinationRegionCode
      || destCheckTarget.destinationPremisesCode.slice(0, 3) || 'SOM';

    let checkCode = `DST-${destRegion.slice(0, 3).toUpperCase()}-${new Date().getFullYear().toString().slice(2)}-${String(Date.now()).slice(-4)}`;
    const { data: rpcCode } = await supabase.rpc('generate_destination_check_code', { p_region: destRegion });
    if (rpcCode) checkCode = rpcCode as string;

    // Get linked inspection code
    const { data: inspRow } = await supabase
      .from('movement_inspections')
      .select('inspection_code')
      .eq('movement_code', destCheckTarget.id)
      .in('status', ['APPROVED', 'PARTIAL_PASS', 'SUBMITTED'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error } = await supabase.from('movement_destination_checks').insert({
      check_code:                checkCode,
      movement_code:             destCheckTarget.id,
      inspection_code:           (inspRow as { inspection_code: string } | null)?.inspection_code ?? null,
      assigned_by_id:            userId ?? null,
      assigned_by_name:          actorRole,
      assigned_to_id:            selectedDestOfficerId,
      assigned_to_name:          officer?.fullName ?? '',
      assigned_to_role:          officer?.role ?? 'FIELD_INSPECTOR',
      destination_premises_code: destCheckTarget.destinationPremisesCode,
      destination_premises_name: destCheckTarget.destinationPremisesName,
      destination_region_code:   destRegion,
      origin_premises_code:      destCheckTarget.originPremisesCode,
      origin_premises_name:      destCheckTarget.originPremisesName,
      origin_region_code:        destCheckTarget.originRegionCode,
      animal_count:              destCheckTarget.animalCount,
      movement_type_code:        destCheckTarget.movementTypeCode,
      purpose:                   destCheckTarget.purpose,
      region_code:               destRegion,
    });

    if (error) { showToast('Failed to assign destination check.', false); setAssigningDest(false); return; }

    await supabase.from('farmer_movement_requests')
      .update({ destination_check_code: checkCode })
      .eq('movement_code', destCheckTarget.id);

    setMovements(prev => prev.map(m =>
      m.id === destCheckTarget.id ? { ...m, status: 'DESTINATION_CHECK' } : m,
    ));
    setDestCheckTarget(null);
    setAssigningDest(false);
    showToast(`Destination check ${checkCode} assigned to ${officer?.fullName ?? 'officer'}.`);
    void logActivity({
      category:      'MOVEMENT',
      level:         'INFO',
      title:         'Destination check assigned',
      detail:        `${checkCode} → ${officer?.fullName ?? selectedDestOfficerId} — ${destCheckTarget.id}`,
      actorRole,
      userId:        userId ?? undefined,
      referenceCode: checkCode,
    });
  }

  async function openPermitDialog(mv: Movement) {
    const typeValidityDays: Record<string, number> = {
      P2P: 5, F2M: 2, M2P: 3, F2Q: 3, Q2S: 1, Q2E: 2, TRH: 60, EMG: 1,
    };
    const days = typeValidityDays[mv.movementTypeCode] ?? 5;
    const d = new Date(mv.plannedDepartureDate || Date.now());
    d.setDate(d.getDate() + days);
    setPermitValidTo(d.toISOString().slice(0, 10));
    setPermitConditions('');
    setPermitTarget(mv);
  }

  async function doIssuePermit() {
    if (!permitTarget) return;
    setIssuingPermit(true);

    let permitNum = `PRM-${(permitTarget.originRegionCode || 'SOM').slice(0, 3).toUpperCase()}-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
    const { data: rpcNum } = await supabase.rpc('generate_permit_number', {
      p_region: permitTarget.originRegionCode || 'SOM',
    });
    if (rpcNum) permitNum = rpcNum as string;

    const { data: inspRow } = await supabase
      .from('movement_inspections')
      .select('inspection_code')
      .eq('movement_code', permitTarget.id)
      .in('status', ['APPROVED', 'PARTIAL_PASS', 'SUBMITTED'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: destRow } = await supabase
      .from('movement_destination_checks')
      .select('check_code')
      .eq('movement_code', permitTarget.id)
      .in('status', ['APPROVED', 'SUBMITTED'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Look up issuing officer's vet licence number
    const { data: officerRow } = userId
      ? await supabase.from('user_registrations').select('licence_number').eq('id', userId).maybeSingle()
      : { data: null };
    const issuedByLicence = (officerRow as { licence_number: string | null } | null)?.licence_number ?? null;

    // Compute sex breakdown from registered animal records
    let sexBreakdown: string | null = null;
    if (permitTarget.animalIds.length > 0) {
      const { data: sexRows } = await supabase
        .from('animals').select('sex').in('id', permitTarget.animalIds);
      if (sexRows?.length) {
        const m = sexRows.filter((a: any) => /^(male|m|bull|ram|billy|buck)$/i.test(a.sex ?? '')).length;
        const f = sexRows.filter((a: any) => /^(female|f|cow|heifer|ewe|doe|nanny)$/i.test(a.sex ?? '')).length;
        const c = sexRows.filter((a: any) => /^(castrat|steer|wether|ox)$/i.test(a.sex ?? '')).length;
        const parts: string[] = [];
        if (m > 0) parts.push(`${m} Male`);
        if (f > 0) parts.push(`${f} Female`);
        if (c > 0) parts.push(`${c} Castrated`);
        sexBreakdown = parts.join(' / ') || null;
      }
    }

    const { error } = await supabase.from('movement_permits').insert({
      permit_number:             permitNum,
      movement_code:             permitTarget.id,
      inspection_code:           (inspRow as { inspection_code: string } | null)?.inspection_code ?? null,
      destination_check_code:    (destRow as { check_code: string } | null)?.check_code ?? null,
      valid_from:                new Date().toISOString().slice(0, 10),
      valid_to:                  permitValidTo || null,
      conditions:                permitConditions || null,
      animal_count:              permitTarget.animalCount,
      animal_ids:                permitTarget.animalIds,
      origin_premises_code:      permitTarget.originPremisesCode,
      origin_premises_name:      permitTarget.originPremisesName,
      origin_region_code:        permitTarget.originRegionCode,
      destination_premises_code: permitTarget.destinationPremisesCode,
      destination_premises_name: permitTarget.destinationPremisesName,
      destination_region_code:   permitTarget.destinationRegionCode,
      owner_name:                permitTarget.owner,
      movement_type_code:        permitTarget.movementTypeCode,
      purpose:                   permitTarget.purpose,
      vehicle_registration:      permitTarget.vehicleRegistration,
      issued_by_id:              userId ?? null,
      issued_by_name:            actorRole,
      issued_by_licence:         issuedByLicence,
      permit_type:               permitTarget.movementTypeCode || null,
      species_summary:           permitTarget.animal || null,
      transporter_name:          permitTarget.transporterName || null,
      owner_national_id:         permitTarget.ownerNationalId || null,
      sex_breakdown:             sexBreakdown,
    });

    if (error) { showToast('Failed to issue permit.', false); setIssuingPermit(false); return; }

    await supabase.from('farmer_movement_requests')
      .update({ status: 'PERMIT_ISSUED', permit_number: permitNum })
      .eq('movement_code', permitTarget.id);

    // Create departure task for origin inspector
    await supabase.from('movement_tasks').insert({
      movement_code:             permitTarget.id,
      region_code:               permitTarget.originRegionCode,
      task_role:                 'FIELD_INSPECTOR',
      task_type:                 'DEPARTURE_CONFIRM',
      origin_premises_code:      permitTarget.originPremisesCode,
      origin_premises_name:      permitTarget.originPremisesName,
      destination_premises_code: permitTarget.destinationPremisesCode,
      destination_premises_name: permitTarget.destinationPremisesName,
      animal_count:              permitTarget.animalCount,
      movement_type_code:        permitTarget.movementTypeCode,
      purpose:                   permitTarget.purpose,
      planned_departure_date:    permitTarget.plannedDepartureDate || null,
      vehicle_registration:      permitTarget.vehicleRegistration,
      request_reason:            permitTarget.notes || null,
    });

    // Arrival task is created later, when the origin inspector confirms departure

    setMovements(prev => prev.map(m =>
      m.id === permitTarget.id ? { ...m, status: 'PERMIT_ISSUED', permitRef: permitNum } : m,
    ));
    setPermitTarget(null);
    setIssuingPermit(false);
    showToast(`Permit ${permitNum} issued.`);
    void logActivity({
      category:      'MOVEMENT',
      level:         'SUCCESS',
      title:         'Movement permit issued',
      detail:        `${permitNum} — ${permitTarget.id} — ${permitTarget.from} → ${permitTarget.to}`,
      actorRole,
      userId:        userId ?? undefined,
      referenceCode: permitNum,
    });
  }

  const counts = {
    ALL:               movements.length,
    PENDING:           movements.filter(m => m.status === 'PENDING').length,
    UNDER_REVIEW:      movements.filter(m => m.status === 'UNDER_REVIEW').length,
    DESTINATION_CHECK: movements.filter(m => m.status === 'DESTINATION_CHECK').length,
    PERMIT_ISSUED:     movements.filter(m => m.status === 'PERMIT_ISSUED').length,
    APPROVED:          movements.filter(m => m.status === 'APPROVED').length,
    REJECTED:          movements.filter(m => m.status === 'REJECTED').length,
    IN_TRANSIT:        movements.filter(m => m.status === 'IN_TRANSIT').length,
    COMPLETED:         movements.filter(m => m.status === 'COMPLETED').length,
  };

  const visible = movements.filter(m => {
    if (filter !== 'ALL' && m.status !== filter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.id.toLowerCase().includes(q) ||
      m.animal.toLowerCase().includes(q) ||
      m.owner.toLowerCase().includes(q) ||
      m.from.toLowerCase().includes(q) ||
      m.to.toLowerCase().includes(q) ||
      m.species.toLowerCase().includes(q)
    );
  });

  const tabs: { key: 'ALL' | MStatus; label: string }[] = [
    { key: 'ALL',                label: `All (${counts.ALL})`                                  },
    { key: 'PENDING',            label: `Pending (${counts.PENDING})`                          },
    { key: 'UNDER_REVIEW',       label: `Under Review (${counts.UNDER_REVIEW})`                },
    { key: 'INSPECTION_ASSIGNED', label: `Inspection (${movements.filter(m => m.status === 'INSPECTION_ASSIGNED').length})` },
    { key: 'DESTINATION_CHECK',  label: `Dest. Check (${counts.DESTINATION_CHECK})`            },
    { key: 'PERMIT_ISSUED',      label: `Permit Issued (${counts.PERMIT_ISSUED})`              },
    { key: 'APPROVED',           label: `Approved (${counts.APPROVED})`                        },
    { key: 'IN_TRANSIT',         label: `In Transit (${counts.IN_TRANSIT})`                    },
    { key: 'COMPLETED',          label: `Completed (${counts.COMPLETED})`                      },
    { key: 'REJECTED',           label: `Rejected (${counts.REJECTED})`                        },
  ];

  const btnBase: React.CSSProperties = { border: 'none', borderRadius: 8, padding: '0.45rem 1rem', fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer' };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#9ca3af', fontSize: '0.875rem', fontFamily: "'Inter',system-ui,sans-serif" }}>
      Loading movements…
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontFamily: "'Inter',system-ui,sans-serif", position: 'relative' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 24, zIndex: 9999, background: toast.ok ? '#166534' : '#991b1b', color: '#fff', padding: '0.75rem 1.25rem', borderRadius: 10, fontSize: '0.875rem', fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,.18)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {toast.ok ? <CheckCircle size={15} /> : <XCircle size={15} />} {toast.msg}
        </div>
      )}

      {/* Confirm approve modal */}
      {confirmApprove && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', width: 400, boxShadow: '0 8px 32px rgba(0,0,0,.18)' }}>
            <div style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>Approve Movement?</div>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 1.5rem' }}>
              This will issue a movement permit for <strong>{confirmApprove}</strong>. The farmer will be notified and can proceed with the movement.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmApprove(null)} style={{ ...btnBase, background: '#f3f4f6', color: '#374151' }}>Cancel</button>
              <button onClick={() => doApprove(confirmApprove)} style={{ ...btnBase, background: '#16a34a', color: '#fff' }}>
                <CheckCircle size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />Issue Permit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', width: 480, boxShadow: '0 8px 32px rgba(0,0,0,.18)' }}>
            <div style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#111827', marginBottom: '0.25rem' }}>Reject Movement</div>
            <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '1.25rem' }}>Select a reason for rejecting <strong>{rejectTarget}</strong>.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {REJECT_REASONS.map(r => (
                <label key={r} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: 8, cursor: 'pointer', background: rejectPreset === r ? '#fef2f2' : '#f9fafb', border: `1px solid ${rejectPreset === r ? '#fca5a5' : '#e5e7eb'}`, fontSize: '0.8125rem', color: '#374151' }}>
                  <input type="radio" name="reject" value={r} checked={rejectPreset === r} onChange={() => setRejectPreset(r)} style={{ accentColor: '#dc2626' }} />
                  {r}
                </label>
              ))}
            </div>
            <textarea
              placeholder="Additional notes (required if 'Other' selected)…"
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
              rows={3}
              style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.625rem', fontSize: '0.8125rem', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button onClick={() => { setRejectTarget(null); setRejectPreset(''); setRejectNote(''); }} style={{ ...btnBase, background: '#f3f4f6', color: '#374151' }}>Cancel</button>
              <button
                disabled={!rejectPreset && !rejectNote.trim()}
                onClick={() => doReject(rejectTarget)}
                style={{ ...btnBase, background: !rejectPreset && !rejectNote.trim() ? '#fecaca' : '#dc2626', color: '#fff', opacity: !rejectPreset && !rejectNote.trim() ? 0.6 : 1 }}
              >
                <XCircle size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Destination Check modal */}
      {destCheckTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', width: 500, boxShadow: '0 8px 32px rgba(0,0,0,.18)' }}>
            <div style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#111827', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={18} color="#c2410c" /> Assign Destination Check
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '1.25rem' }}>
              Movement <strong>{destCheckTarget.id}</strong> — {destCheckTarget.from} → <strong>{destCheckTarget.to}</strong>
            </div>

            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '0.625rem 0.875rem', fontSize: '0.78rem', color: '#c2410c', marginBottom: '1rem' }}>
              Showing officers in <strong>{destCheckTarget.destinationRegionCode || 'destination region'}</strong>. The destination inspector must confirm that the premises is valid, has capacity, and no restrictions exist.
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
                Assign to Destination Inspector
              </label>
              {destOfficersLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#9ca3af', fontSize: '0.8125rem' }}>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading officers…
                </div>
              ) : destOfficers.length === 0 ? (
                <div style={{ fontSize: '0.8125rem', color: '#9ca3af', padding: '0.625rem', background: '#f9fafb', borderRadius: 8 }}>
                  No field officers found in destination region. Verify the destination region code is set.
                </div>
              ) : (
                <select
                  value={selectedDestOfficerId}
                  onChange={e => setSelectedDestOfficerId(e.target.value)}
                  style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: '0.8125rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                >
                  <option value="">— Select officer —</option>
                  {destOfficers.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.fullName} ({o.role.replace(/_/g, ' ')}{o.regionCode ? ` · ${o.regionCode}` : ''})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setDestCheckTarget(null)} disabled={assigningDest} style={{ ...btnBase, background: '#f3f4f6', color: '#374151' }}>Cancel</button>
              <button
                onClick={doAssignDestCheck}
                disabled={assigningDest || !selectedDestOfficerId}
                style={{ ...btnBase, background: assigningDest || !selectedDestOfficerId ? '#fed7aa' : '#c2410c', color: '#fff' }}
              >
                {assigningDest
                  ? <><Loader2 size={13} style={{ marginRight: 4, verticalAlign: 'middle', animation: 'spin 1s linear infinite' }} />Assigning…</>
                  : <><MapPin size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />Assign Dest. Check</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Issue Permit modal */}
      {permitTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', width: 480, boxShadow: '0 8px 32px rgba(0,0,0,.18)' }}>
            <div style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#111827', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileCheck size={18} color="#065f46" /> Issue Movement Permit
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '1.25rem' }}>
              Movement <strong>{permitTarget.id}</strong> — {permitTarget.animalCount} animal{permitTarget.animalCount !== 1 ? 's' : ''} — {permitTarget.from} → {permitTarget.to}
            </div>

            <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 8, padding: '0.625rem 0.875rem', fontSize: '0.78rem', color: '#065f46', marginBottom: '1rem' }}>
              Issuing this permit will notify the origin inspector to confirm departure, and the destination inspector to confirm arrival.
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>Permit Valid To *</label>
              <input
                type="date"
                value={permitValidTo}
                onChange={e => setPermitValidTo(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: '0.8125rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>Special Conditions (optional)</label>
              <textarea
                value={permitConditions}
                onChange={e => setPermitConditions(e.target.value)}
                rows={3}
                placeholder="e.g. Animals must be inspected at weigh bridge before departure."
                style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: '0.8125rem', fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setPermitTarget(null)} disabled={issuingPermit} style={{ ...btnBase, background: '#f3f4f6', color: '#374151' }}>Cancel</button>
              <button
                onClick={doIssuePermit}
                disabled={issuingPermit || !permitValidTo}
                style={{ ...btnBase, background: issuingPermit || !permitValidTo ? '#6ee7b7' : '#059669', color: '#fff' }}
              >
                {issuingPermit
                  ? <><Loader2 size={13} style={{ marginRight: 4, verticalAlign: 'middle', animation: 'spin 1s linear infinite' }} />Issuing…</>
                  : <><FileCheck size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />Issue Permit</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Inspection modal */}
      {assignTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', width: 500, boxShadow: '0 8px 32px rgba(0,0,0,.18)' }}>
            <div style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#111827', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ClipboardList size={18} color="#6d28d9" /> Assign Pre-Movement Inspection
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '1.25rem' }}>
              Movement <strong>{assignTarget.id}</strong> — {assignTarget.from} → {assignTarget.to}
            </div>

            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '0.625rem 0.875rem', fontSize: '0.78rem', color: '#1e40af', marginBottom: '1rem' }}>
              Showing officers registered in <strong>{assignTarget.regionCode}</strong> (origin region). Pre-movement inspection must be conducted by the inspector where the animals are physically located.
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>Assign to Field Officer ({assignTarget.regionCode})</label>
              {officersLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#9ca3af', fontSize: '0.8125rem' }}>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading officers…
                </div>
              ) : (
                <select
                  value={selectedOfficerId}
                  onChange={e => setSelectedOfficerId(e.target.value)}
                  style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: '0.8125rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                >
                  <option value="">— Select officer —</option>
                  {officers.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.fullName} ({o.role.replace(/_/g, ' ')}{o.regionCode ? ` · ${o.regionCode}` : ''})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>Required Completion Date</label>
              <input
                type="date"
                value={completionDate}
                onChange={e => setCompletionDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: '0.8125rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setAssignTarget(null)}
                disabled={assigning}
                style={{ ...btnBase, background: '#f3f4f6', color: '#374151' }}
              >Cancel</button>
              <button
                onClick={doAssignInspection}
                disabled={assigning || !selectedOfficerId}
                style={{ ...btnBase, background: assigning || !selectedOfficerId ? '#c4b5fd' : '#7c3aed', color: '#fff' }}
              >
                {assigning
                  ? <><Loader2 size={13} style={{ marginRight: 4, verticalAlign: 'middle', animation: 'spin 1s linear infinite' }} />Assigning…</>
                  : <><ClipboardList size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />Assign Inspection</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <h1 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: 0 }}>Movement Control</h1>
        <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: '0.2rem 0 0' }}>Review and approve livestock movement permits across Somalia</p>
      </div>

      {/* Escalation alert banner */}
      {overdueList.length > 0 && (
        <div style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 12, padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <Bell size={16} color="#c2410c" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#c2410c', marginBottom: '0.25rem' }}>
              {overdueList.length} inspection{overdueList.length > 1 ? 's' : ''} overdue — not started within {escalationDays} day{escalationDays !== 1 ? 's' : ''}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#9a3412', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {overdueList.map(o => (
                <span key={o.movementCode} style={{ background: '#ffedd5', padding: '0.15rem 0.5rem', borderRadius: 6, fontFamily: 'monospace' }}>
                  {o.movementCode} · {o.assigneeName}
                </span>
              ))}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '0.3rem' }}>
              A re-assign button is now available on each overdue row.
            </div>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem' }}>
        {([
          { label: 'Movements Today',  value: movements.length,                                       Icon: Navigation   },
          { label: 'Pending Approval', value: counts.PENDING + counts.UNDER_REVIEW,                   Icon: Clock        },
          { label: 'Approved (MTD)',   value: counts.APPROVED + counts.IN_TRANSIT + counts.COMPLETED, Icon: CheckCircle  },
          { label: 'Rejected (MTD)',   value: counts.REJECTED,                                        Icon: XCircle      },
        ] as const).map(k => (
          <div key={k.label} style={{ ...kpi }}>
            <k.Icon size={20} strokeWidth={1.5} color="#6b7280" />
            <div style={{ fontSize: '1.625rem', fontWeight: 800, color: '#111827', margin: '0.25rem 0 0.1rem' }}>{k.value}</div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 500 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={card}>
        {/* Filter tabs */}
        <div style={{ padding: '0 1.25rem', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 0, overflowX: 'auto' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => { setFilter(t.key); setSearch(''); }} style={{ border: 'none', background: 'none', padding: '0.875rem 1rem', fontSize: '0.8rem', fontWeight: filter === t.key ? 700 : 500, color: filter === t.key ? '#1d4ed8' : '#6b7280', borderBottom: filter === t.key ? '2px solid #1d4ed8' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Search bar */}
        <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ position: 'relative', maxWidth: 420 }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by ID, animal, owner, route…"
              style={{ width: '100%', padding: '0.5rem 2.25rem', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: '0.8125rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center', padding: 2 }}>
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Table header */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
          <thead>
            <tr>
              {['', 'Permit ID', 'Animal', 'Route', 'Owner', 'Date', 'Purpose', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af', fontSize: '0.875rem' }}>No movements in this category.</td></tr>
            )}
            {visible.map(m => {
              const st  = STATUS_CFG[m.status];
              const isExpanded = expanded === m.id;
              const canAct = m.status === 'PENDING' || m.status === 'UNDER_REVIEW';
              // Show Inspect for: no auto-assign happened (PENDING = no regional config),
              // or inspection overdue (INSPECTION_ASSIGNED but not started past threshold)
              const isOverdueInspection = m.status === 'INSPECTION_ASSIGNED' && overdueInspectionCodes.has(m.id);
              const canManualAssign = m.status === 'PENDING' || isOverdueInspection;
              return (
                <>
                  <tr key={m.id} style={{ background: isExpanded ? '#f8faff' : '#fff' }}>
                    <td style={{ padding: '0.875rem 0.5rem 0.875rem 1rem', borderBottom: isExpanded ? 'none' : '1px solid #f9fafb' }}>
                      <button onClick={() => setExpanded(isExpanded ? null : m.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', padding: '0.125rem' }}>
                        {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', borderBottom: isExpanded ? 'none' : '1px solid #f9fafb', fontFamily: 'monospace', fontSize: '0.75rem', color: '#6b7280' }}>{m.id}</td>
                    <td style={{ padding: '0.875rem 1rem', borderBottom: isExpanded ? 'none' : '1px solid #f9fafb' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#374151' }}>{m.animal}</span>
                      <br /><span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{SPECIES_EMOJI[m.species]} {m.species}</span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', borderBottom: isExpanded ? 'none' : '1px solid #f9fafb', color: '#374151' }}>{m.from} → {m.to}</td>
                    <td style={{ padding: '0.875rem 1rem', borderBottom: isExpanded ? 'none' : '1px solid #f9fafb' }}>
                      <div style={{ color: '#374151', fontSize: '0.8125rem' }}>{m.owner}</div>
                      <div style={{ color: '#9ca3af', fontSize: '0.7rem', fontFamily: 'monospace' }}>{m.ownerId}</div>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', borderBottom: isExpanded ? 'none' : '1px solid #f9fafb', color: '#9ca3af', whiteSpace: 'nowrap' }}>{fmtDate(m.date)}</td>
                    <td style={{ padding: '0.875rem 1rem', borderBottom: isExpanded ? 'none' : '1px solid #f9fafb', color: '#6b7280' }}>{m.purpose}</td>
                    <td style={{ padding: '0.875rem 1rem', borderBottom: isExpanded ? 'none' : '1px solid #f9fafb' }}>
                      <span style={{ display: 'inline-block', padding: '0.25rem 0.625rem', borderRadius: 999, background: st.bg, color: st.color, fontSize: '0.7rem', fontWeight: 700 }}>{st.label}</span>
                      {m.inspectionPassed && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', marginLeft: 4, padding: '0.15rem 0.45rem', borderRadius: 999, background: '#dcfce7', color: '#166534', fontSize: '0.65rem', fontWeight: 700 }}>
                          <CheckCircle size={9} /> Inspection Passed
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', borderBottom: isExpanded ? 'none' : '1px solid #f9fafb' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {canAct && (
                          <>
                            {m.status === 'PENDING' && (
                              <button onClick={() => doReview(m.id)} style={{ ...btnBase, padding: '0.3rem 0.6rem', background: '#dbeafe', color: '#1e40af', fontSize: '0.7rem' }}>Review</button>
                            )}
                            {m.status === 'UNDER_REVIEW' && (
                              <button onClick={() => void openPermitDialog(m)} style={{ ...btnBase, padding: '0.3rem 0.6rem', background: '#ecfdf5', color: '#065f46', fontSize: '0.7rem' }}>
                                <FileCheck size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} />Issue Permit
                              </button>
                            )}
                            <button onClick={() => setConfirmApprove(m.id)} style={{ ...btnBase, padding: '0.3rem 0.6rem', background: '#dcfce7', color: '#166534', fontSize: '0.7rem' }}>
                              <CheckCircle size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} />Approve
                            </button>
                            <button onClick={() => { setRejectTarget(m.id); setRejectPreset(''); setRejectNote(''); }} style={{ ...btnBase, padding: '0.3rem 0.6rem', background: '#fee2e2', color: '#991b1b', fontSize: '0.7rem' }}>
                              <XCircle size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} />Reject
                            </button>
                          </>
                        )}
                        {canManualAssign && (
                          <button onClick={() => openAssignDialog(m)} style={{ ...btnBase, padding: '0.3rem 0.6rem', background: isOverdueInspection ? '#fff7ed' : '#ede9fe', color: isOverdueInspection ? '#c2410c' : '#6d28d9', fontSize: '0.7rem', border: isOverdueInspection ? '1px solid #fed7aa' : 'none' }}>
                            <ClipboardList size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                            {isOverdueInspection ? 'Re-assign' : 'Assign Inspection'}
                          </button>
                        )}
                        {m.status === 'DESTINATION_CHECK' && (
                          <>
                            <button onClick={() => void openDestCheckDialog(m)} style={{ ...btnBase, padding: '0.3rem 0.6rem', background: '#fff7ed', color: '#c2410c', fontSize: '0.7rem', border: '1px solid #fed7aa' }}>
                              <MapPin size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} />Assign Dest. Check
                            </button>
                            <button onClick={() => void openPermitDialog(m)} style={{ ...btnBase, padding: '0.3rem 0.6rem', background: '#ecfdf5', color: '#065f46', fontSize: '0.7rem' }}>
                              <FileCheck size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} />Issue Permit
                            </button>
                          </>
                        )}
                        {m.status === 'PERMIT_ISSUED' && m.permitRef && (
                          <button
                            onClick={() => window.open(`/movements/permit/${encodeURIComponent(m.permitRef!)}`, '_blank')}
                            style={{ ...btnBase, padding: '0.3rem 0.6rem', background: '#1e3a5f', color: '#fff', fontSize: '0.7rem' }}
                          >
                            <Printer size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} />Print Permit
                          </button>
                        )}
                      </div>
                      {m.status === 'APPROVED' && m.permitRef && (
                        <button
                          onClick={() => window.open(`/movements/permit/${encodeURIComponent(m.permitRef!)}`, '_blank')}
                          style={{ ...btnBase, padding: '0.3rem 0.6rem', background: '#166534', color: '#fff', fontSize: '0.7rem' }}
                        >
                          <Printer size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} />Print Permit
                        </button>
                      )}
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr key={m.id + '-detail'}>
                      <td colSpan={9} style={{ padding: '0 1rem 1rem 3rem', borderBottom: '1px solid #f3f4f6', background: '#f8faff' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', paddingTop: '0.5rem' }}>
                          <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Movement Details</div>
                            {[
                              ['Permit ID',     m.id],
                              ['Animal ID',     m.animal],
                              ['Species',       `${SPECIES_EMOJI[m.species]} ${m.species}`],
                              ['From',          m.from],
                              ['To',            m.to],
                              ['Purpose',       m.purpose],
                              ['Submitted',     fmtDate(m.date)],
                              ...(m.permitRef ? [['Permit Ref', m.permitRef]] : []),
                            ].map(([k, v]) => (
                              <div key={k} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.3rem', fontSize: '0.8125rem' }}>
                                <span style={{ color: '#9ca3af', minWidth: 100 }}>{k}</span>
                                <span style={{ color: '#111827', fontWeight: 500 }}>{v}</span>
                              </div>
                            ))}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Owner & Notes</div>
                            <div style={{ marginBottom: '0.75rem', fontSize: '0.8125rem' }}>
                              <div style={{ color: '#374151', fontWeight: 600 }}>{m.owner}</div>
                              <div style={{ color: '#9ca3af', fontFamily: 'monospace', fontSize: '0.75rem' }}>{m.ownerId}</div>
                            </div>
                            {m.notes && (
                              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '0.625rem', fontSize: '0.8125rem', color: '#0c4a6e' }}>
                                <div style={{ fontWeight: 600, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><FileText size={12} />Notes</div>
                                {m.notes}
                              </div>
                            )}
                            {m.rejectionReason && (
                              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '0.625rem', fontSize: '0.8125rem', color: '#991b1b', marginTop: '0.5rem' }}>
                                <div style={{ fontWeight: 600, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><AlertTriangle size={12} />Rejection Reason</div>
                                {m.rejectionReason}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MovementsPage;
