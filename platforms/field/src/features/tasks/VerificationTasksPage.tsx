import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle, XCircle, MessageSquare, Loader,
  MapPin, X, User, Search, Navigation, ChevronRight,
  Truck, RefreshCw, ClipboardList, Building2,
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuthStore } from '@/store/auth.store';
import { apiClient } from '@/api/client';
import { supabase } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';
import { TasksMap, type TaskPin, type TaskRoute } from './TasksMap';
import s from './verification-tasks.module.css';

// Fix Leaflet default marker icons (bundler strips the default asset path)
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface VerificationTask {
  id: string;
  animalCode: string;
  submissionCode: string;
  species: string;
  breed: string;
  sex: string;
  tagSerial: string;
  premisesCode: string;
  premisesName?: string;
  regionCode: string;
  districtCode?: string;
  farmerName?: string;
  submittedAt: string;
  status: string;
  coatColor?: string;
  distinguishingMarks?: string;
  weightKg?: number | null;
  ageMonths?: number | null;
  bodyConditionScore?: string;
  photoUrls?: string[];
}

interface TaskPage {
  content: VerificationTask[];
  totalElements: number;
  totalPages: number;
  number: number;
}

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
  requestReason?: string;
  ownerName?: string;
  transporterPhone?: string;
}

interface InspectionTask {
  id:                      string;
  inspectionCode:          string;
  movementCode:            string;
  status:                  string;
  originPremisesCode:      string;
  destinationPremisesCode: string;
  animalCount:             number;
  speciesSummary:          string;
  purpose:                 string;
  plannedDepartureDate:    string;
  assignedAt:              string;
  requiredCompletionDate:  string;
}

interface DestinationCheckTask {
  id:                       string;
  checkCode:                string;
  movementCode:             string;
  status:                   string;
  destinationPremisesCode:  string;
  destinationPremisesName:  string;
  originPremisesCode:       string;
  originPremisesName:       string;
  animalCount:              number;
  purpose:                  string;
  assignedAt:               string;
}

interface ConfirmTask {
  id:                      string;
  taskType:                string;
  movementCode:            string;
  status:                  string;
  originPremisesCode:      string;
  originPremisesName:      string;
  destinationPremisesCode: string;
  destinationPremisesName: string;
  animalCount:             number;
  movementTypeCode:        string;
  purpose:                 string;
  plannedDepartureDate:    string;
  vehicleRegistration:     string;
  createdAt:               string;
  requestReason?:          string;
}

const INSP_STATUS: Record<string, { bg: string; color: string; label: string }> = {
  ASSIGNED:    { bg: '#fef3c7', color: '#92400e', label: 'Assigned'    },
  IN_PROGRESS: { bg: '#dbeafe', color: '#1e40af', label: 'In Progress' },
  SUBMITTED:   { bg: '#ede9fe', color: '#6d28d9', label: 'Submitted'   },
  APPROVED:    { bg: '#dcfce7', color: '#166534', label: 'Approved'    },
  FAILED:      { bg: '#fee2e2', color: '#991b1b', label: 'Failed'      },
};

const I_TABS = [
  { key: 'active',    label: 'Active'    },
  { key: 'completed', label: 'Completed' },
  { key: '',          label: 'All'       },
];

// ── Constants ─────────────────────────────────────────────────────────────────

const SPECIES_EMOJI: Record<string, string> = {
  CATTLE: '🐄', CAMEL: '🐪', GOAT: '🐐', SHEEP: '🐑',
};

const V_TABS = [
  { key: 'PENDING_VERIFICATION', label: 'Pending'   },
  { key: 'UNDER_REVIEW',         label: 'In Review' },
  { key: 'VERIFIED',             label: 'Verified'  },
  { key: 'REJECTED',             label: 'Rejected'  },
  { key: '',                     label: 'All'       },
];

const M_TABS = [
  { key: 'PENDING',        label: 'Pending'  },
  { key: 'APPROVED',       label: 'Approved' },
  { key: 'REJECTED',       label: 'Rejected' },
  { key: 'INFO_REQUESTED', label: 'Info Req' },
  { key: '',               label: 'All'      },
];

const M_REJECT_REASONS = [
  'Health restriction on origin premises',
  'Animal health certificates missing',
  'Vehicle not registered / invalid plate',
  'Route passes restricted zone',
  'Species requires additional permits',
  'Departure date conflicts with quarantine',
];

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function mapMovRow(r: Record<string, unknown>): MovementTask {
  return {
    id:                      r.id as string,
    movementCode:            r.movement_code as string,
    regionCode:              r.region_code as string,
    taskRole:                r.task_role as string,
    status:                  r.status as string,
    originPremisesCode:      (r.origin_premises_code as string) ?? '',
    originPremisesName:      (r.origin_premises_name as string) ?? '',
    destinationPremisesCode: (r.destination_premises_code as string) ?? '',
    destinationPremisesName: (r.destination_premises_name as string) ?? '',
    animalCount:             (r.animal_count as number) ?? 0,
    movementTypeCode:        (r.movement_type_code as string) ?? '',
    purpose:                 (r.purpose as string) ?? '',
    plannedDepartureDate:    (r.planned_departure_date as string) ?? '',
    plannedArrivalDate:      (r.planned_arrival_date as string) ?? '',
    vehicleRegistration:     (r.vehicle_registration as string) ?? '',
    transporterName:         r.transporter_name as string | undefined,
    speciesNotes:            r.species_notes as string | undefined,
    reviewerNotes:           r.reviewer_notes as string | undefined,
    reviewedAt:              r.reviewed_at as string | undefined,
    createdAt:               r.created_at as string,
    requestReason:           (r.request_reason as string) || undefined,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function VerificationTasksPage(): JSX.Element {
  const navigate = useNavigate();
  const { regionCode, districtCode, roles, userId } = useAuthStore();
  const userRole = roles[0] ?? 'FIELD_INSPECTOR';

  // ── Verification state ─────────────────────────────────────────────────────
  const [vtasks,         setVTasks]         = useState<VerificationTask[]>([]);
  const [vLoading,       setVLoading]       = useState(true);
  const [vTab,           setVTab]           = useState('PENDING_VERIFICATION');
  const [vPage,          setVPage]          = useState(0);
  const [vTotalPages,    setVTotalPages]    = useState(0);
  const [vTotalElements, setVTotalElements] = useState(0);
  const [vPendingCount,  setVPendingCount]  = useState(0);
  const [vSelected,      setVSelected]      = useState<VerificationTask | null>(null);
  const [search,         setSearch]         = useState('');

  const [vActionType,    setVActionType]    = useState<'verify' | 'reject' | 'info' | null>(null);
  const [vActionText,    setVActionText]    = useState('');
  const [vActionLoading, setVActionLoading] = useState(false);
  const [vActionError,   setVActionError]   = useState<string | null>(null);

  // ── Inspection state ───────────────────────────────────────────────────────
  const [itasks,        setITasks]        = useState<InspectionTask[]>([]);
  const [iLoading,      setILoading]      = useState(true);
  const [iTab,          setITab]          = useState('active');
  const [iPendingCount, setIPendingCount] = useState(0);

  // Linked inspection for the open movement modal
  const [linkedInsp,        setLinkedInsp]        = useState<{ id: string; inspectionCode: string; status: string } | null>(null);
  const [linkedInspLoading, setLinkedInspLoading] = useState(false);
  const [creatingInsp,      setCreatingInsp]      = useState(false);

  // ── Destination check state ────────────────────────────────────────────────
  const [destCheckTasks,  setDestCheckTasks]  = useState<DestinationCheckTask[]>([]);
  const [dLoading,        setDLoading]        = useState(true);
  const [dPendingCount,   setDPendingCount]   = useState(0);
  const [dTab,            setDTab]            = useState('active');

  // ── Departure/Arrival confirmation state ───────────────────────────────────
  const [confirmTasks,       setConfirmTasks]       = useState<ConfirmTask[]>([]);
  const [cLoading,           setCLoading]           = useState(true);
  const [cPendingCount,      setCPendingCount]      = useState(0);
  const [selectedConfirm,    setSelectedConfirm]    = useState<ConfirmTask | null>(null);
  const [confirmNotes,       setConfirmNotes]       = useState('');
  const [confirmAnimalCount, setConfirmAnimalCount] = useState('');
  const [confirming,         setConfirming]         = useState(false);
  const [confirmError,       setConfirmError]       = useState('');

  // ── Movement state ─────────────────────────────────────────────────────────
  const [mtasks,         setMTasks]         = useState<MovementTask[]>([]);
  const [mLoading,       setMLoading]       = useState(true);
  const [mTab,           setMTab]           = useState('PENDING');
  const [mPendingCount,  setMPendingCount]  = useState(0);
  const [mSelected,      setMSelected]      = useState<MovementTask | null>(null);

  const [mActionType,    setMActionType]    = useState<'approve' | 'reject' | 'info' | null>(null);
  const [mActionText,    setMActionText]    = useState('');
  const [mActionLoading, setMActionLoading] = useState(false);
  const [mActionError,   setMActionError]   = useState<string | null>(null);
  const [mExtra,         setMExtra]         = useState<{ ownerName?: string; transporterPhone?: string; requestReason?: string } | null>(null);

  // ── Map pins & routes ─────────────────────────────────────────────────────
  const [mapPins,   setMapPins]   = useState<TaskPin[]>([]);
  const [mapRoutes, setMapRoutes] = useState<TaskRoute[]>([]);

  // ── Premises popup state ───────────────────────────────────────────────────
  const [popupPremisesCode, setPopupPremisesCode] = useState<string | null>(null);

  // ── Info-request compose state ─────────────────────────────────────────────
  const [infoCompose, setInfoCompose] = useState<MovementTask | null>(null);
  const [infoSubject, setInfoSubject] = useState('');
  const [infoBody,    setInfoBody]    = useState('');
  const [infoSending, setInfoSending] = useState(false);
  const [infoError,   setInfoError]   = useState('');

  // ── Verification: pending count ────────────────────────────────────────────
  useEffect(() => {
    apiClient.get<TaskPage>('/verification-tasks', {
      params: { status: 'PENDING_VERIFICATION', regionCode, size: 1 },
    })
      .then(r => setVPendingCount(r.data.totalElements))
      .catch(() => {});
  }, [regionCode]);

  // ── Verification: load tasks ───────────────────────────────────────────────
  const loadVTasks = useCallback(() => {
    setVLoading(true);
    const params: Record<string, string | number> = { page: vPage, size: 10 };
    if (vTab)       params.status     = vTab;
    if (regionCode) params.regionCode = regionCode;

    apiClient.get<TaskPage>('/verification-tasks', { params })
      .then(r => {
        setVTasks(r.data?.content ?? []);
        setVTotalPages(r.data?.totalPages ?? 0);
        setVTotalElements(r.data?.totalElements ?? 0);
      })
      .catch(() => { setVTasks([]); setVTotalPages(0); setVTotalElements(0); })
      .finally(() => setVLoading(false));
  }, [vTab, vPage, regionCode]);

  useEffect(() => { loadVTasks(); }, [loadVTasks]);

  // ── Inspections: load ─────────────────────────────────────────────────────
  const loadInspections = useCallback(() => {
    if (!userId) { setILoading(false); return; }
    setILoading(true);
    const ACTIVE = ['ASSIGNED', 'IN_PROGRESS'];
    const DONE   = ['SUBMITTED', 'APPROVED', 'PARTIAL_PASS', 'CORRECTION_REQUIRED',
                    'REINSPECTION_REQUIRED', 'VETERINARY_REVIEW', 'FAILED', 'DISEASE_SUSPECTED'];

    let q = supabase
      .from('movement_inspections')
      .select('id, inspection_code, movement_code, status, origin_premises_code, destination_premises_code, animal_count, species_summary, purpose, planned_departure_date, assigned_at, required_completion_date')
      .eq('assigned_to_id', userId)
      .order('assigned_at', { ascending: false });

    if (iTab === 'active')    q = q.in('status', ACTIVE);
    if (iTab === 'completed') q = q.in('status', DONE);

    void q.then(({ data }) => {
      const rows = (data ?? []).map(r => ({
        id:                      r.id as string,
        inspectionCode:          r.inspection_code as string,
        movementCode:            r.movement_code as string,
        status:                  r.status as string,
        originPremisesCode:      (r.origin_premises_code as string) ?? '',
        destinationPremisesCode: (r.destination_premises_code as string) ?? '',
        animalCount:             (r.animal_count as number) ?? 0,
        speciesSummary:          (r.species_summary as string) ?? '',
        purpose:                 (r.purpose as string) ?? '',
        plannedDepartureDate:    (r.planned_departure_date as string) ?? '',
        assignedAt:              r.assigned_at as string,
        requiredCompletionDate:  (r.required_completion_date as string) ?? '',
      }));
      setITasks(rows);
      setIPendingCount(rows.filter(r => ACTIVE.includes(r.status)).length);
      setILoading(false);
    });
  }, [userId, iTab]);

  useEffect(() => { loadInspections(); }, [loadInspections]);

  // ── Destination checks: load ──────────────────────────────────────────────
  const loadDestChecks = useCallback(() => {
    if (!userId) { setDLoading(false); return; }
    setDLoading(true);
    const ACTIVE = ['PENDING', 'IN_PROGRESS'];
    const DONE   = ['SUBMITTED', 'APPROVED', 'REJECTED'];

    let q = supabase
      .from('movement_destination_checks')
      .select('id, check_code, movement_code, status, destination_premises_code, destination_premises_name, origin_premises_code, origin_premises_name, animal_count, purpose, assigned_at')
      .eq('assigned_to_id', userId)
      .order('assigned_at', { ascending: false });

    if (dTab === 'active')    q = q.in('status', ACTIVE);
    if (dTab === 'completed') q = q.in('status', DONE);

    void q.then(({ data }) => {
      const rows = (data ?? []).map(r => ({
        id:                      r.id as string,
        checkCode:               r.check_code as string,
        movementCode:            r.movement_code as string,
        status:                  r.status as string,
        destinationPremisesCode: (r.destination_premises_code as string) ?? '',
        destinationPremisesName: (r.destination_premises_name as string) ?? '',
        originPremisesCode:      (r.origin_premises_code as string) ?? '',
        originPremisesName:      (r.origin_premises_name as string) ?? '',
        animalCount:             (r.animal_count as number) ?? 0,
        purpose:                 (r.purpose as string) ?? '',
        assignedAt:              r.assigned_at as string,
      }));
      setDestCheckTasks(rows);
      setDPendingCount(rows.filter(r => ACTIVE.includes(r.status)).length);
      setDLoading(false);
    });
  }, [userId, dTab]);

  useEffect(() => { loadDestChecks(); }, [loadDestChecks]);

  // ── Departure/Arrival tasks: load ─────────────────────────────────────────
  const loadConfirmTasks = useCallback(() => {
    if (!regionCode) { setCLoading(false); return; }
    setCLoading(true);

    void supabase
      .from('movement_tasks')
      .select('*')
      .eq('region_code', regionCode)
      .in('task_type', ['DEPARTURE_CONFIRM', 'ARRIVAL_CONFIRM'])
      .in('status', ['PENDING'])
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const rows = (data ?? []).map(r => ({
          id:                      r.id as string,
          taskType:                (r.task_type as string) ?? 'DEPARTURE_CONFIRM',
          movementCode:            r.movement_code as string,
          status:                  r.status as string,
          originPremisesCode:      (r.origin_premises_code as string) ?? '',
          originPremisesName:      (r.origin_premises_name as string) ?? '',
          destinationPremisesCode: (r.destination_premises_code as string) ?? '',
          destinationPremisesName: (r.destination_premises_name as string) ?? '',
          animalCount:             (r.animal_count as number) ?? 0,
          movementTypeCode:        (r.movement_type_code as string) ?? '',
          purpose:                 (r.purpose as string) ?? '',
          plannedDepartureDate:    (r.planned_departure_date as string) ?? '',
          vehicleRegistration:     (r.vehicle_registration as string) ?? '',
          createdAt:               r.created_at as string,
          requestReason:           (r.request_reason as string) || undefined,
        }));
        setConfirmTasks(rows);
        setCPendingCount(rows.length);
        setCLoading(false);
      });
  }, [regionCode]);

  useEffect(() => { loadConfirmTasks(); }, [loadConfirmTasks]);

  // ── Movement: pending count ────────────────────────────────────────────────
  useEffect(() => {
    if (!regionCode) return;
    supabase
      .from('movement_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('region_code', regionCode)
      .eq('task_role',   userRole)
      .eq('status', 'PENDING')
      .then(({ count }) => setMPendingCount(count ?? 0));
  }, [regionCode, userRole]);

  // ── Movement: load tasks ───────────────────────────────────────────────────
  const loadMTasks = useCallback(() => {
    if (!regionCode) { setMLoading(false); return; }
    setMLoading(true);

    let query = supabase
      .from('movement_tasks')
      .select('*')
      .eq('region_code', regionCode)
      .eq('task_role',   userRole)
      .order('created_at', { ascending: false });

    if (mTab) query = query.eq('status', mTab);

    query.then(async ({ data, error }) => {
      if (!error && data) {
        const rows = data.map(mapMovRow);
        const codes = rows.map(r => r.movementCode);
        if (codes.length > 0) {
          const { data: extras } = await supabase
            .from('farmer_movement_requests')
            .select('movement_code, owner_name, transporter_phone, notes')
            .in('movement_code', codes);
          const extraMap = Object.fromEntries(
            (extras ?? []).map(e => [e.movement_code as string, e]),
          );
          setMTasks(rows.map(r => ({
            ...r,
            ownerName:       (extraMap[r.movementCode]?.owner_name       as string) || undefined,
            transporterPhone:(extraMap[r.movementCode]?.transporter_phone as string) || undefined,
            // requestReason comes from movement_tasks.request_reason (mapMovRow),
            // but fall back to farmer_movement_requests.notes if not yet populated
            requestReason:   r.requestReason || (extraMap[r.movementCode]?.notes as string) || undefined,
          })));
        } else {
          setMTasks(rows);
        }
      } else {
        setMTasks([]);
      }
      setMLoading(false);
    });
  }, [regionCode, userRole, mTab]);

  useEffect(() => { loadMTasks(); }, [loadMTasks]);

  // ── Verification: action ───────────────────────────────────────────────────
  const handleVAction = async () => {
    if (!vSelected || !vActionType) return;
    if (vActionType !== 'verify' && !vActionText.trim()) return;

    setVActionLoading(true);
    setVActionError(null);

    try {
      const endpoint =
        vActionType === 'verify' ? 'verify' :
        vActionType === 'reject' ? 'reject' : 'request-info';

      const body =
        vActionType === 'verify' ? { notes: vActionText || null } :
        vActionType === 'reject' ? { reason: vActionText } :
        { message: vActionText };

      await apiClient.post(`/verification-tasks/${vSelected.id}/${endpoint}`, body);

      const newStatus =
        vActionType === 'verify' ? 'VERIFIED' :
        vActionType === 'reject' ? 'REJECTED' : 'NEEDS_RESUBMISSION';

      const vLevelMap = { verify: 'SUCCESS', reject: 'WARNING', info: 'INFO' } as const;
      const vTitleMap = {
        verify: 'Animal verification approved',
        reject: 'Animal verification rejected',
        info:   'Animal verification — info requested',
      };
      void logActivity({
        category:      'ANIMAL',
        level:         vLevelMap[vActionType] ?? 'INFO',
        title:         vTitleMap[vActionType],
        detail:        `${vSelected.species} ${vSelected.sex.toLowerCase()} (${vSelected.animalCode})${vActionText ? ` — ${vActionText}` : ''}`,
        actorRole:     userRole.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
        region:        regionCode,
        district:      districtCode,
        referenceCode: vSelected.animalCode,
        userId,
      });

      setVTasks(prev => prev.map(t => t.id === vSelected.id ? { ...t, status: newStatus } : t));
      setVPendingCount(prev => Math.max(0, prev - 1));
      closeVModal();
    } catch {
      setVActionError('Action failed. Please try again.');
    } finally {
      setVActionLoading(false);
    }
  };

  const openVModal  = (t: VerificationTask) => { setVSelected(t); setVActionType(null); setVActionText(''); setVActionError(null); };
  const closeVModal = () => { setVSelected(null); setVActionType(null); setVActionText(''); setVActionError(null); };

  // ── Movement: action ───────────────────────────────────────────────────────
  const handleMAction = async () => {
    if (!mSelected || !mActionType) return;
    if (mActionType !== 'approve' && !mActionText.trim()) return;

    setMActionLoading(true);
    setMActionError(null);

    const newStatus =
      mActionType === 'approve' ? 'APPROVED' :
      mActionType === 'reject'  ? 'REJECTED' : 'INFO_REQUESTED';

    const { error } = await supabase
      .from('movement_tasks')
      .update({ status: newStatus, reviewer_notes: mActionText || null, reviewed_at: new Date().toISOString() })
      .eq('id', mSelected.id);

    if (error) {
      setMActionError('Failed to update. Please try again.');
      setMActionLoading(false);
      return;
    }

    if (mActionType === 'approve') {
      const { data: allTasks } = await supabase
        .from('movement_tasks')
        .select('status')
        .eq('movement_code', mSelected.movementCode);

      const updatedStatuses = (allTasks ?? []).map(t =>
        t.id === mSelected.id ? 'APPROVED' : t.status,
      );
      if (updatedStatuses.every(st => st === 'APPROVED')) {
        await supabase
          .from('farmer_movement_requests')
          .update({ status: 'APPROVED' })
          .eq('movement_code', mSelected.movementCode);
      }
    }

    const mLevelMap = { approve: 'SUCCESS', reject: 'WARNING', info: 'INFO' } as const;
    const mTitleMap = {
      approve: 'Movement task approved',
      reject:  'Movement task rejected',
      info:    'Movement task — info requested',
    };
    void logActivity({
      category:      'MOVEMENT',
      level:         mLevelMap[mActionType] ?? 'INFO',
      title:         mTitleMap[mActionType],
      detail:        `${mSelected.movementCode} — ${mSelected.originPremisesCode} → ${mSelected.destinationPremisesCode}${mActionText ? ` — ${mActionText}` : ''}`,
      actorRole:     userRole.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
      region:        regionCode,
      district:      districtCode,
      referenceCode: mSelected.movementCode,
      userId,
    });

    setMTasks(prev => prev.map(t => t.id === mSelected.id ? { ...t, status: newStatus, reviewerNotes: mActionText } : t));
    setMPendingCount(prev => Math.max(0, prev - 1));
    closeMModal();
    setMActionLoading(false);
  };

  const handleConfirmAction = async () => {
    if (!selectedConfirm || !userId) return;
    setConfirming(true);
    setConfirmError('');

    const isDeparture = selectedConfirm.taskType === 'DEPARTURE_CONFIRM';
    const now = new Date().toISOString();
    const roleLabel = userRole.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

    const movPatch: Record<string, unknown> = isDeparture
      ? {
          status:                      'DEPARTURE_CONFIRMED',
          actual_departure_date:       now,
          departure_confirmed_by_id:   userId,
          departure_confirmed_by_name: roleLabel,
        }
      : {
          status:                    'COMPLETED',
          actual_arrival_date:       now,
          arrival_confirmed_by_id:   userId,
          arrival_confirmed_by_name: roleLabel,
          arrival_animal_count:      confirmAnimalCount ? parseInt(confirmAnimalCount, 10) : null,
          arrival_discrepancy_notes: confirmNotes || null,
        };

    const { error: movErr } = await supabase
      .from('farmer_movement_requests')
      .update(movPatch)
      .eq('movement_code', selectedConfirm.movementCode);

    if (movErr) { setConfirmError('Failed to confirm. Please try again.'); setConfirming(false); return; }

    await supabase
      .from('movement_tasks')
      .update({ status: 'APPROVED', reviewer_notes: confirmNotes || null, reviewed_at: now })
      .eq('id', selectedConfirm.id);

    // When departure is confirmed, create the arrival task for the destination region inspector
    if (isDeparture) {
      const { data: movReq } = await supabase
        .from('farmer_movement_requests')
        .select('destination_region_code, destination_premises_code')
        .eq('movement_code', selectedConfirm.movementCode)
        .maybeSingle();

      const destRegion = (movReq?.destination_region_code as string)
        || (movReq?.destination_premises_code as string | undefined)?.slice(0, 3)
        || selectedConfirm.destinationPremisesCode.slice(0, 3)
        || 'SOM';

      await supabase.from('movement_tasks').insert({
        movement_code:             selectedConfirm.movementCode,
        region_code:               destRegion,
        task_role:                 'FIELD_INSPECTOR',
        task_type:                 'ARRIVAL_CONFIRM',
        origin_premises_code:      selectedConfirm.originPremisesCode,
        origin_premises_name:      selectedConfirm.originPremisesName,
        destination_premises_code: selectedConfirm.destinationPremisesCode,
        destination_premises_name: selectedConfirm.destinationPremisesName,
        animal_count:              selectedConfirm.animalCount,
        movement_type_code:        selectedConfirm.movementTypeCode,
        purpose:                   selectedConfirm.purpose,
        planned_departure_date:    selectedConfirm.plannedDepartureDate || null,
        vehicle_registration:      selectedConfirm.vehicleRegistration,
        request_reason:            selectedConfirm.requestReason || null,
      });
    }

    void logActivity({
      category:      'MOVEMENT',
      level:         'SUCCESS',
      title:         isDeparture ? 'Movement departure confirmed' : 'Movement arrival confirmed',
      detail:        `${selectedConfirm.movementCode} — ${selectedConfirm.originPremisesCode} → ${selectedConfirm.destinationPremisesCode}${confirmNotes ? ` — ${confirmNotes}` : ''}`,
      actorRole:     roleLabel,
      region:        regionCode,
      referenceCode: selectedConfirm.movementCode,
      userId,
    });

    setConfirmTasks(prev => prev.filter(t => t.id !== selectedConfirm.id));
    setCPendingCount(prev => Math.max(0, prev - 1));
    setSelectedConfirm(null);
    setConfirmNotes('');
    setConfirmAnimalCount('');
    setConfirming(false);
  };

  const openMModal = (t: MovementTask) => {
    setMSelected(t);
    setMActionType(null);
    setMActionText('');
    setMActionError(null);
    setLinkedInsp(null);
    setMExtra(null);

    void supabase
      .from('farmer_movement_requests')
      .select('owner_name, transporter_phone, notes')
      .eq('movement_code', t.movementCode)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setMExtra({
          ownerName:       (data.owner_name       as string) || undefined,
          transporterPhone:(data.transporter_phone as string) || undefined,
          requestReason:   (data.notes            as string) || undefined,
        });
      });

    if (userId) {
      setLinkedInspLoading(true);
      void supabase
        .from('movement_inspections')
        .select('id, inspection_code, status')
        .eq('movement_code', t.movementCode)
        .eq('assigned_to_id', userId)
        .maybeSingle()
        .then(({ data }) => {
          setLinkedInsp(data ? { id: data.id as string, inspectionCode: data.inspection_code as string, status: data.status as string } : null);
          setLinkedInspLoading(false);
        });
    }
  };
  const closeMModal = () => { setMSelected(null); setMActionType(null); setMActionText(''); setMActionError(null); setLinkedInsp(null); setMExtra(null); };

  const sendInfoRequest = async () => {
    if (!infoCompose || !userId || !infoBody.trim()) return;
    setInfoSending(true);
    setInfoError('');
    const { data: msgCode } = await supabase.rpc('generate_message_code', { p_region: regionCode || 'SOM' });
    const roleLabel = userRole.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    const { error } = await supabase.from('action_messages').insert({
      message_code:   (msgCode as string) || `MSG-${Date.now()}`,
      from_user_id:   userId,
      from_user_name: roleLabel,
      from_role:      userRole,
      from_region:    regionCode || null,
      to_role:        'FARMER',
      to_region:      infoCompose.regionCode || regionCode || null,
      subject:        infoSubject.trim() || `Info Request: ${infoCompose.movementCode}`,
      body:           infoBody.trim(),
      priority:       'NORMAL',
      ref_type:       'MOVEMENT',
      ref_code:       infoCompose.movementCode,
      status:         'UNREAD',
    });
    if (error) { setInfoError('Failed to send. Please try again.'); setInfoSending(false); return; }
    setInfoCompose(null); setInfoSubject(''); setInfoBody(''); setInfoSending(false);
  };

  const createAndStartInspection = async () => {
    if (!mSelected || !userId) return;
    setCreatingInsp(true);

    const region = mSelected.regionCode || 'SOM';

    // Fetch animal_ids and owner info from the movement request
    const { data: movReq } = await supabase
      .from('farmer_movement_requests')
      .select('animal_ids, farmer_user_id, owner_name')
      .eq('movement_code', mSelected.movementCode)
      .maybeSingle();
    const animalIds: string[] = (movReq?.animal_ids as string[]) ?? [];

    let inspCode = `INS-${region.slice(0, 3).toUpperCase()}-${new Date().getFullYear().toString().slice(2)}-${String(Date.now()).slice(-4)}`;
    const { data: rpcCode } = await supabase.rpc('generate_inspection_code', { p_region: region });
    if (rpcCode) inspCode = rpcCode as string;

    const roleLabel = userRole.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

    const { data: inserted, error } = await supabase
      .from('movement_inspections')
      .insert({
        inspection_code:           inspCode,
        movement_code:             mSelected.movementCode,
        assigned_by_id:            userId,
        assigned_by_name:          roleLabel,
        assigned_to_id:            userId,
        assigned_to_name:          roleLabel,
        assigned_to_role:          userRole,
        origin_premises_code:      mSelected.originPremisesCode,
        origin_premises_name:      mSelected.originPremisesName,
        origin_region_code:        region,
        destination_premises_code: mSelected.destinationPremisesCode,
        destination_premises_name: mSelected.destinationPremisesName,
        farmer_user_id:            (movReq?.farmer_user_id as string) ?? null,
        owner_name:                (movReq?.owner_name as string) ?? null,
        animal_count:              animalIds.length || mSelected.animalCount,
        animal_ids:                animalIds,
        species_summary:           mSelected.speciesNotes ?? '',
        movement_type_code:        mSelected.movementTypeCode,
        purpose:                   mSelected.purpose,
        planned_departure_date:    mSelected.plannedDepartureDate || null,
        region_code:               region,
      })
      .select('id')
      .single();

    setCreatingInsp(false);
    if (error || !inserted) return;

    await supabase
      .from('farmer_movement_requests')
      .update({ status: 'INSPECTION_ASSIGNED' })
      .eq('movement_code', mSelected.movementCode);

    closeMModal();
    navigate(`/inspections/${(inserted as { id: string }).id}`);
  };

  // ── Build map pins from all loaded tasks ──────────────────────────────────
  useEffect(() => {
    // Somalia regional centre coordinates — safely inside each region's border
    const REGION_COORDS: Record<string, [number, number]> = {
      NUG: [8.40, 49.00], BAN: [2.04, 45.34], MUD: [6.50, 47.50],
      TOG: [9.40, 45.60], WOQ: [9.50, 44.10], SAN: [10.50, 47.50],
      BAR: [11.20, 49.20], AWD: [9.90, 43.30], HIR: [4.30, 45.30],
      GED: [3.80, 42.50], BAY: [3.10, 43.60], LOW: [1.20, 42.80],
      MIJ: [2.20, 42.80], LSH: [1.90, 44.30], MSH: [3.00, 45.50],
    };
    const regionFallback = (code: string): [number, number] => {
      // Search all segments for a known region key (handles SO-PRM-NUG-001 and SOM-MUD-005)
      const parts = code.split('-').map(p => p.toUpperCase());
      const regionPart = parts.find(p => p in REGION_COORDS);
      const base = regionPart ? REGION_COORDS[regionPart] : ([6.0, 46.0] as [number, number]);
      // small jitter so co-located premises don't stack exactly
      return [base[0] + (Math.random() - 0.5) * 0.15, base[1] + (Math.random() - 0.5) * 0.15];
    };

    const codes = new Set<string>();
    vtasks.forEach(t => codes.add(t.premisesCode));
    mtasks.forEach(t => { codes.add(t.originPremisesCode); codes.add(t.destinationPremisesCode); });
    itasks.forEach(t => { codes.add(t.originPremisesCode); codes.add(t.destinationPremisesCode); });
    destCheckTasks.forEach(t => codes.add(t.destinationPremisesCode));
    if (codes.size === 0) { setMapPins([]); return; }

    supabase
      .from('premises')
      .select('premises_code,name,gps_latitude,gps_longitude')
      .in('premises_code', [...codes])
      .then(({ data }) => {
        const coordMap: Record<string, { name: string; lat: number; lng: number }> = {};
        for (const r of (data ?? [])) {
          const lat = Number(r.gps_latitude);
          const lng = Number(r.gps_longitude);
          if (lat && lng) {
            coordMap[r.premises_code as string] = { name: r.name as string, lat, lng };
          }
        }

        const pins: TaskPin[] = [];
        const seen = new Set<string>();

        const add = (code: string, taskType: TaskPin['taskType'], label: string, name?: string) => {
          if (!code) return;
          const key = `${code}:${taskType}`;
          if (seen.has(key)) return;
          seen.add(key);
          let lat: number, lng: number, pName: string;
          if (coordMap[code]) {
            ({ lat, lng, name: pName } = coordMap[code]);
          } else {
            [lat, lng] = regionFallback(code);
            pName = name || code;
          }
          pins.push({ id: key, code, name: pName, lat, lng, taskType, label });
        };

        vtasks.forEach(t => add(t.premisesCode, 'verification', `${t.animalCode} · ${t.species}`, t.premisesName));
        mtasks.forEach(t => {
          add(t.originPremisesCode,      'movement', `${t.movementCode} (origin)`,      t.originPremisesName);
          add(t.destinationPremisesCode, 'movement', `${t.movementCode} (destination)`, t.destinationPremisesName);
        });
        itasks.forEach(t => {
          add(t.originPremisesCode,      'inspection', `${t.inspectionCode} (origin)`);
          add(t.destinationPremisesCode, 'inspection', `${t.inspectionCode} (destination)`);
        });
        destCheckTasks.forEach(t => add(t.destinationPremisesCode, 'destination', t.checkCode, t.destinationPremisesName));

        // ── Build green route lines for each inspection ──
        const routes: TaskRoute[] = [];
        itasks.forEach(t => {
          const getCoord = (code: string) => {
            if (coordMap[code]) return [coordMap[code].lat, coordMap[code].lng] as [number, number];
            return regionFallback(code);
          };
          if (!t.originPremisesCode || !t.destinationPremisesCode) return;
          const [fromLat, fromLng] = getCoord(t.originPremisesCode);
          const [toLat,   toLng  ] = getCoord(t.destinationPremisesCode);
          routes.push({ id: t.id, label: t.inspectionCode, fromLat, fromLng, toLat, toLng });
        });

        setMapPins(pins);
        setMapRoutes(routes);
      });
  }, [vtasks, mtasks, itasks, destCheckTasks]);

  const territory = [regionCode, districtCode].filter(Boolean).join(' / ') || 'Your Region';
  const totalPending = vPendingCount + mPendingCount + iPendingCount + dPendingCount + cPendingCount;

  return (
    <div className={s.page}>

      {/* Header */}
      <div className={s.header}>
        <div>
          <h1 className={s.title}>My Tasks</h1>
          <p className={s.sub}>{territory}</p>
        </div>
        <div className={s.headerRight}>
          {totalPending > 0 && (
            <div className={s.pendingBadge}>
              <span className={s.pendingDot} />
              {totalPending} pending
            </div>
          )}
          <button className={s.refreshBtn} onClick={loadMTasks} title="Refresh movement tasks">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* ── Split layout: tasks left | map right ─────────────────────────── */}
      <div className={s.splitLayout}>
      <div className={s.tasksCol}>

      {/* ── Animal Verification section — only shown when there are tasks ─── */}
      {(vLoading || vtasks.length > 0 || vPendingCount > 0) && <div className={s.sectionBlock}>
        <div className={s.sectionHead}>
          <div className={s.sectionTitle}>
            Animal Verifications
            {vPendingCount > 0 && <span className={s.typeBtnCount}>{vPendingCount}</span>}
          </div>
          <div className={s.tabs}>
            {V_TABS.map(t => (
              <button
                key={t.key}
                className={`${s.tab}${vTab === t.key ? ' ' + s.tabActive : ''}`}
                onClick={() => { setVTab(t.key); setVPage(0); setSearch(''); }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className={s.searchRow}>
          <div className={s.searchWrap}>
            <Search size={14} className={s.searchIcon} />
            <input
              className={s.searchInput}
              placeholder="Search by animal code, tag, premises or farmer…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className={s.searchClear} onClick={() => setSearch('')}><X size={13} /></button>
            )}
          </div>
        </div>

        {vLoading ? (
          <div className={s.list}>{[1,2,3].map(i => <div key={i} className={s.skeleton} />)}</div>
        ) : vtasks.length === 0 ? (
          <div className={s.empty}>
            <CheckCircle size={48} strokeWidth={1.25} color="#86efac" />
            <div className={s.emptyTitle}>
              {vTab === 'PENDING_VERIFICATION' ? 'All caught up — no pending verifications' : 'No tasks in this category'}
            </div>
            <div className={s.emptySub}>
              {vTab === 'PENDING_VERIFICATION' ? 'New animal registrations in your region will appear here.' : 'Tasks will appear here once actioned.'}
            </div>
          </div>
        ) : (() => {
          const COL = '185px 145px 115px 85px 120px 130px 100px';
          const filtered = vtasks.filter(t => {
            if (!search) return true;
            const q = search.toLowerCase();
            return (
              t.animalCode.toLowerCase().includes(q) ||
              t.tagSerial.toLowerCase().includes(q) ||
              t.premisesCode.toLowerCase().includes(q) ||
              (t.premisesName ?? '').toLowerCase().includes(q) ||
              (t.farmerName ?? '').toLowerCase().includes(q) ||
              t.species.toLowerCase().includes(q)
            );
          });
          return (
            <div className={s.tblWrap}>
            <div className={s.tbl} style={{ minWidth: 880 }}>
              <div className={s.tblHead} style={{ gridTemplateColumns: COL }}>
                {['Animal Code', 'Tag Serial', 'Premises', 'Species', 'Sex/Breed', 'Farmer', 'Action'].map(h => (
                  <div key={h} className={s.tblHeadCell}>{h}</div>
                ))}
              </div>
              {filtered.map(task => {
                const days    = daysSince(task.submittedAt);
                const urgency = days > 5 ? 'agePillUrgent' : days > 2 ? 'agePillWarn' : 'agePillOk';
                const ageLabel = days === 0 ? 'Today' : `${days}d ago`;
                return (
                  <div key={task.id} className={s.tblRow} style={{ gridTemplateColumns: COL }}>
                    <div className={`${s.tblCell} ${s.cellCode}`}>
                      {SPECIES_EMOJI[task.species] ?? '🐾'} {task.animalCode}
                      <span className={`${s.agePill} ${s[urgency as keyof typeof s]}`} style={{ marginLeft: 6 }}>{ageLabel}</span>
                    </div>
                    <div className={`${s.tblCell} ${s.cellCode}`} style={{ color: '#6b7280' }}>{task.tagSerial}</div>
                    <div className={s.tblCell}>
                      <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.78rem' }}>{task.premisesCode}</div>
                      {task.premisesName && <div className={s.cellMuted}>{task.premisesName}</div>}
                    </div>
                    <div className={s.tblCell}>{task.species}</div>
                    <div className={s.tblCell}>{task.sex} · {task.breed}</div>
                    <div className={s.tblCell}>{task.farmerName || '—'}</div>
                    <div className={`${s.tblCell} ${s.cellAction}`}>
                      <button className={s.reviewBtn} style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }} onClick={() => openVModal(task)}>Review</button>
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
          );
        })()}

        {vTotalPages > 1 && (
          <div className={s.pagination}>
            <button className={s.pageBtn} disabled={vPage === 0} onClick={() => setVPage(p => p - 1)}>Previous</button>
            <span className={s.pageInfo}>Page {vPage + 1} of {vTotalPages} · {vTotalElements} tasks</span>
            <button className={s.pageBtn} disabled={vPage >= vTotalPages - 1} onClick={() => setVPage(p => p + 1)}>Next</button>
          </div>
        )}
      </div>}

      {/* ── Movement Requests section ───────────────────────────────────────── */}
      <div className={s.sectionBlock}>
        <div className={s.sectionHead}>
          <div className={s.sectionTitle}>
            Movement Requests
            {mPendingCount > 0 && <span className={s.typeBtnCount}>{mPendingCount}</span>}
          </div>
          <div className={s.tabs}>
            {M_TABS.map(t => (
              <button
                key={t.key}
                className={`${s.tab}${mTab === t.key ? ' ' + s.tabActive : ''}`}
                onClick={() => setMTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {mLoading ? (
          <div className={s.list}>{[1,2,3].map(i => <div key={i} className={s.skeleton} />)}</div>
        ) : mtasks.length === 0 ? (
          <div className={s.empty}>
            <Navigation size={44} strokeWidth={1.25} color="#cbd5e1" />
            <div className={s.emptyTitle}>
              {mTab === 'PENDING' ? 'No pending movement requests' : 'No tasks in this category'}
            </div>
            <div className={s.emptySub}>
              {mTab === 'PENDING' ? 'Movement requests from farmers in your region will appear here.' : 'Tasks will appear once actioned.'}
            </div>
          </div>
        ) : (() => {
          const COL = '185px 250px 60px 210px 150px 165px';
          return (
            <div className={s.tblWrap}>
            <div className={s.tbl} style={{ minWidth: 1020 }}>
              <div className={s.tblHead} style={{ gridTemplateColumns: COL }}>
                {['Code', 'Route', 'Animals', 'Purpose / Reason', 'Owner / Contact', 'Actions'].map(h => (
                  <div key={h} className={s.tblHeadCell}>{h}</div>
                ))}
              </div>
              {mtasks.map(task => {
                const days     = daysSince(task.createdAt);
                const ageLabel = days === 0 ? 'Today' : `${days}d ago`;
                const urgency  = days > 5 ? 'agePillUrgent' : days > 2 ? 'agePillWarn' : 'agePillOk';
                return (
                  <div key={task.id} className={`${s.tblRow} ${s.tblRowRich}`} style={{ gridTemplateColumns: COL, cursor: 'pointer' }} onClick={() => openMModal(task)}>
                    {/* Code + age + status */}
                    <div className={`${s.tblCell} ${s.cellCode}`}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                        <span>{task.movementCode}</span>
                        <span className={`${s.agePill} ${s[urgency as keyof typeof s]}`}>{ageLabel}</span>
                      </div>
                      <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <MStatusBadge status={task.status} />
                        <span className={s.cellMuted} style={{ fontWeight: 400, fontFamily: 'sans-serif', fontSize: '0.72rem' }}>
                          {new Date(task.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    {/* Route: clickable premises codes */}
                    <div className={s.tblCell} style={{ whiteSpace: 'normal' }}>
                      <button
                        className={s.premisesLink}
                        onClick={e => { e.stopPropagation(); setPopupPremisesCode(task.originPremisesCode); }}
                      >
                        <MapPin size={9} style={{ marginRight: 3, flexShrink: 0 }} />{task.originPremisesCode}
                      </button>
                      {task.originPremisesName && <div className={s.cellMuted} style={{ fontSize: '0.72rem', marginLeft: 13, marginTop: 1 }}>{task.originPremisesName}</div>}
                      <div style={{ color: '#d1d5db', margin: '3px 0 3px 3px', fontSize: '0.8rem' }}>↓</div>
                      <button
                        className={`${s.premisesLink} ${s.premisesLinkDest}`}
                        onClick={e => { e.stopPropagation(); setPopupPremisesCode(task.destinationPremisesCode); }}
                      >
                        <MapPin size={9} style={{ marginRight: 3, flexShrink: 0 }} />{task.destinationPremisesCode}
                      </button>
                      {task.destinationPremisesName && <div className={s.cellMuted} style={{ fontSize: '0.72rem', marginLeft: 13, marginTop: 1 }}>{task.destinationPremisesName}</div>}
                    </div>
                    {/* Animals */}
                    <div className={s.tblCell} style={{ fontWeight: 600 }}>{task.animalCount}</div>
                    {/* Purpose + reason */}
                    <div className={s.tblCell} style={{ whiteSpace: 'normal' }}>
                      <div style={{ fontSize: '0.8rem', color: '#374151', fontWeight: 600 }}>{task.purpose || '—'}</div>
                      {task.movementTypeCode && <div className={s.cellMuted} style={{ marginTop: 1 }}>{task.movementTypeCode}</div>}
                      {task.requestReason && (
                        <div style={{ fontSize: '0.73rem', color: '#6b7280', marginTop: 4, fontStyle: 'italic', lineHeight: 1.35 }}>
                          "{task.requestReason}"
                        </div>
                      )}
                    </div>
                    {/* Owner / contact */}
                    <div className={s.tblCell} style={{ whiteSpace: 'normal' }}>
                      {task.ownerName        && <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#111827' }}>{task.ownerName}</div>}
                      {task.transporterPhone && <div style={{ fontFamily: 'monospace', fontSize: '0.73rem', color: '#6b7280', marginTop: 2 }}>{task.transporterPhone}</div>}
                      {!task.ownerName && !task.transporterPhone && <span className={s.cellMuted}>—</span>}
                    </div>
                    {/* Actions */}
                    <div className={s.tblCell} style={{ paddingTop: '0.625rem', paddingBottom: '0.625rem' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <button
                          className={`${s.reviewBtn}${task.status !== 'PENDING' ? ' ' + s.reviewBtnGhost : ''}`}
                          style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', width: '100%' }}
                          onClick={() => openMModal(task)}
                        >
                          {task.status === 'PENDING' ? 'Review' : 'View'}
                        </button>
                        <button
                          className={s.infoRequestBtn}
                          onClick={() => { setInfoCompose(task); setInfoSubject(`Info Request: ${task.movementCode}`); setInfoBody(''); setInfoError(''); }}
                        >
                          Request Info
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
          );
        })()}
      </div>

      {/* ── Pre-Movement Inspections section ───────────────────────────────── */}
      <div className={s.sectionBlock}>
        <div className={s.sectionHead}>
          <div className={s.sectionTitle}>
            <ClipboardList size={16} style={{ marginRight: '0.35rem', verticalAlign: 'middle' }} />
            Pre-Movement Inspections
            {iPendingCount > 0 && <span className={s.typeBtnCount}>{iPendingCount}</span>}
          </div>
          <div className={s.tabs}>
            {I_TABS.map(t => (
              <button
                key={t.key}
                className={`${s.tab}${iTab === t.key ? ' ' + s.tabActive : ''}`}
                onClick={() => setITab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {iLoading ? (
          <div className={s.list}>{[1, 2].map(i => <div key={i} className={s.skeleton} />)}</div>
        ) : itasks.length === 0 ? (
          <div className={s.empty}>
            <ClipboardList size={40} strokeWidth={1.25} color="#cbd5e1" />
            <div className={s.emptyTitle}>
              {iTab === 'active' ? 'No active inspections assigned' : 'No completed inspections'}
            </div>
            <div className={s.emptySub}>
              {iTab === 'active' ? 'Pre-movement inspections assigned to you will appear here.' : 'Completed inspections will appear here.'}
            </div>
          </div>
        ) : (() => {
          const COL = '200px 260px 60px 180px 130px 140px';
          return (
            <div className={s.tblWrap}>
            <div className={s.tbl} style={{ minWidth: 970 }}>
              <div className={s.tblHead} style={{ gridTemplateColumns: COL }}>
                {['Insp. Code', 'Route', 'Animals', 'Purpose', 'Dep. Date', 'Action'].map(h => (
                  <div key={h} className={s.tblHeadCell}>{h}</div>
                ))}
              </div>
              {itasks.map(insp => {
                const st       = INSP_STATUS[insp.status] ?? INSP_STATUS.ASSIGNED;
                const days     = daysSince(insp.assignedAt);
                const ageLabel = days === 0 ? 'Today' : `${days}d ago`;
                const isActive = insp.status === 'ASSIGNED' || insp.status === 'IN_PROGRESS';
                const btnLabel = insp.status === 'IN_PROGRESS' ? 'Continue' : isActive ? 'Start' : 'View';
                return (
                  <div key={insp.id} className={`${s.tblRow} ${s.tblRowRich}`} style={{ gridTemplateColumns: COL, cursor: 'pointer' }} onClick={() => navigate(`/inspections/${insp.id}`)}>
                    {/* Insp. Code + age + movement code + status */}
                    <div className={`${s.tblCell} ${s.cellCode}`}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                        <span>{insp.inspectionCode}</span>
                        <span className={`${s.agePill} ${s.agePillOk}`}>{ageLabel}</span>
                      </div>
                      <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ background: st.bg, color: st.color, fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: 10, whiteSpace: 'nowrap' }}>{st.label}</span>
                        <span className={s.cellMuted} style={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>{insp.movementCode}</span>
                      </div>
                    </div>
                    {/* Route: vertical origin ↓ destination */}
                    <div className={s.tblCell} style={{ whiteSpace: 'normal' }}>
                      <button
                        className={s.premisesLink}
                        onClick={e => { e.stopPropagation(); navigate(`/premises?code=${insp.originPremisesCode}`); }}
                      >
                        <MapPin size={9} style={{ marginRight: 3, flexShrink: 0 }} />{insp.originPremisesCode || '—'}
                      </button>
                      <div style={{ color: '#d1d5db', margin: '3px 0 3px 3px', fontSize: '0.8rem' }}>↓</div>
                      <button
                        className={`${s.premisesLink} ${s.premisesLinkDestGreen}`}
                        onClick={e => { e.stopPropagation(); navigate(`/premises?code=${insp.destinationPremisesCode}`); }}
                      >
                        <MapPin size={9} style={{ marginRight: 3, flexShrink: 0 }} />{insp.destinationPremisesCode || '—'}
                      </button>
                    </div>
                    {/* Animals */}
                    <div className={s.tblCell} style={{ fontWeight: 600 }}>{insp.animalCount}</div>
                    {/* Purpose */}
                    <div className={s.tblCell} style={{ whiteSpace: 'normal' }}>
                      <div style={{ fontSize: '0.8rem', color: '#374151', fontWeight: 600 }}>{insp.purpose || '—'}</div>
                      <div className={s.cellMuted} style={{ marginTop: 1 }}>{insp.speciesSummary || ''}</div>
                    </div>
                    {/* Dep. Date */}
                    <div className={s.tblCell} style={{ fontSize: '0.8rem', color: '#374151' }}>{insp.plannedDepartureDate || '—'}</div>
                    {/* Action */}
                    <div className={s.tblCell} style={{ paddingTop: '0.625rem', paddingBottom: '0.625rem' }} onClick={e => e.stopPropagation()}>
                      <button
                        className={`${s.reviewBtn}${!isActive ? ' ' + s.reviewBtnGhost : ''}`}
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', width: '100%' }}
                        onClick={() => navigate(`/inspections/${insp.id}`)}
                      >
                        {btnLabel}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
          );
        })()}
      </div>

      {/* ── Destination Check section ──────────────────────────────────────── */}
      <div className={s.sectionBlock}>
        <div className={s.sectionHead}>
          <div className={s.sectionTitle}>
            <MapPin size={16} style={{ marginRight: '0.35rem', verticalAlign: 'middle' }} />
            Destination Checks
            {dPendingCount > 0 && <span className={s.typeBtnCount}>{dPendingCount}</span>}
          </div>
          <div className={s.tabs}>
            {[{ key: 'active', label: 'Active' }, { key: 'completed', label: 'Completed' }, { key: '', label: 'All' }].map(t => (
              <button key={t.key} className={`${s.tab}${dTab === t.key ? ' ' + s.tabActive : ''}`} onClick={() => setDTab(t.key)}>{t.label}</button>
            ))}
          </div>
        </div>

        {dLoading ? (
          <div className={s.list}>{[1, 2].map(i => <div key={i} className={s.skeleton} />)}</div>
        ) : destCheckTasks.length === 0 ? (
          <div className={s.empty}>
            <MapPin size={40} strokeWidth={1.25} color="#cbd5e1" />
            <div className={s.emptyTitle}>{dTab === 'active' ? 'No destination checks assigned' : 'No completed checks'}</div>
            <div className={s.emptySub}>{dTab === 'active' ? 'When a movement targets a premises in your region, you will be assigned to verify capacity and restrictions.' : 'Completed checks will appear here.'}</div>
          </div>
        ) : (() => {
          const COL = '175px 185px 185px 65px 130px 100px 90px';
          return (
            <div className={s.tblWrap}>
            <div className={s.tbl} style={{ minWidth: 935 }}>
              <div className={s.tblHead} style={{ gridTemplateColumns: COL }}>
                {['Check Code', 'Origin', 'Destination', 'Animals', 'Purpose', 'Status', 'Action'].map(h => (
                  <div key={h} className={s.tblHeadCell}>{h}</div>
                ))}
              </div>
              {destCheckTasks.map(dc => {
                const isActive = dc.status === 'PENDING' || dc.status === 'IN_PROGRESS';
                const days     = daysSince(dc.assignedAt);
                const ageLabel = days === 0 ? 'Today' : `${days}d ago`;
                const stCfg = dc.status === 'APPROVED'    ? { bg: '#dcfce7', color: '#166534', label: 'Approved'    }
                            : dc.status === 'REJECTED'    ? { bg: '#fee2e2', color: '#991b1b', label: 'Rejected'    }
                            : dc.status === 'IN_PROGRESS' ? { bg: '#dbeafe', color: '#1e40af', label: 'In Progress' }
                            :                               { bg: '#fef3c7', color: '#92400e', label: 'Pending'     };
                return (
                  <div key={dc.id} className={s.tblRow} style={{ gridTemplateColumns: COL, cursor: 'pointer' }} onClick={() => navigate(`/destination-checks/${dc.id}`)}>
                    <div className={`${s.tblCell} ${s.cellCode}`}>
                      {dc.checkCode}
                      <span className={`${s.agePill} ${s.agePillOk}`} style={{ marginLeft: 6 }}>{ageLabel}</span>
                    </div>
                    <div className={s.tblCell}>
                      <div style={{ fontWeight: 600, fontSize: '0.78rem', color: '#111827' }}>{dc.originPremisesCode}</div>
                      {dc.originPremisesName && <div className={s.cellMuted}>{dc.originPremisesName}</div>}
                    </div>
                    <div className={s.tblCell}>
                      <div style={{ fontWeight: 600, fontSize: '0.78rem', color: '#111827' }}>{dc.destinationPremisesCode}</div>
                      {dc.destinationPremisesName && <div className={s.cellMuted}>{dc.destinationPremisesName}</div>}
                    </div>
                    <div className={s.tblCell}>{dc.animalCount}</div>
                    <div className={s.tblCell}>{dc.purpose || '—'}</div>
                    <div className={s.tblCell}>
                      <span style={{ background: stCfg.bg, color: stCfg.color, fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: 10 }}>{stCfg.label}</span>
                    </div>
                    <div className={`${s.tblCell} ${s.cellAction}`}>
                      <button
                        className={`${s.reviewBtn}${!isActive ? ' ' + s.reviewBtnGhost : ''}`}
                        style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}
                        onClick={e => { e.stopPropagation(); navigate(`/destination-checks/${dc.id}`); }}
                      >
                        {dc.status === 'IN_PROGRESS' ? 'Continue' : isActive ? 'Start' : 'View'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
          );
        })()}
      </div>

      {/* ── Departure & Arrival Confirmations section ───────────────────────── */}
      {confirmTasks.length > 0 || cLoading ? (
        <div className={s.sectionBlock}>
          <div className={s.sectionHead}>
            <div className={s.sectionTitle}>
              <Truck size={16} style={{ marginRight: '0.35rem', verticalAlign: 'middle' }} />
              Departure & Arrival Confirmations
              {cPendingCount > 0 && <span className={s.typeBtnCount}>{cPendingCount}</span>}
            </div>
          </div>

          {cLoading ? (
            <div className={s.list}>{[1, 2].map(i => <div key={i} className={s.skeleton} />)}</div>
          ) : (() => {
            const COL = '190px 100px 280px 65px 140px 160px';
            return (
              <div className={s.tblWrap}>
              <div className={s.tbl} style={{ minWidth: 940 }}>
                <div className={s.tblHead} style={{ gridTemplateColumns: COL }}>
                  {['Movement', 'Type', 'Route', 'Animals', 'Vehicle', 'Action'].map(h => (
                    <div key={h} className={s.tblHeadCell}>{h}</div>
                  ))}
                </div>
                {confirmTasks.map(task => {
                  const isDep    = task.taskType === 'DEPARTURE_CONFIRM';
                  const days     = daysSince(task.createdAt);
                  const ageLabel = days === 0 ? 'Today' : `${days}d ago`;
                  return (
                    <div key={task.id} className={s.tblRow} style={{ gridTemplateColumns: COL }}>
                      <div className={`${s.tblCell} ${s.cellCode}`}>
                        {task.movementCode}
                        <span className={`${s.agePill} ${s.agePillOk}`} style={{ marginLeft: 6 }}>{ageLabel}</span>
                      </div>
                      <div className={s.tblCell}>
                        <span style={{ background: isDep ? '#ecfdf5' : '#eff6ff', color: isDep ? '#065f46' : '#1e40af', fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: 10 }}>
                          {isDep ? 'Departure' : 'Arrival'}
                        </span>
                      </div>
                      <div className={s.tblCell}>
                        <div className={s.cellRoute}>
                          <span className={s.cellRouteFrom}><MapPin size={10} style={{ marginRight: 2 }} />{task.originPremisesCode}</span>
                          <span className={s.cellRouteArrow}>→</span>
                          <span className={s.cellRouteTo}>{task.destinationPremisesCode}</span>
                        </div>
                      </div>
                      <div className={s.tblCell}>{task.animalCount}</div>
                      <div className={`${s.tblCell} ${s.cellCode}`} style={{ color: '#6b7280', fontSize: '0.75rem' }}>{task.vehicleRegistration || '—'}</div>
                      <div className={`${s.tblCell} ${s.cellAction}`}>
                        <button
                          className={s.reviewBtn}
                          style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}
                          onClick={() => { setSelectedConfirm(task); setConfirmNotes(''); setConfirmAnimalCount(String(task.animalCount)); setConfirmError(''); }}
                        >
                          {isDep ? 'Confirm Departure' : 'Confirm Arrival'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              </div>
            );
          })()}
        </div>
      ) : null}

      </div>{/* end tasksCol */}

      {/* ── Map column ──────────────────────────────────────────────────────── */}
      <div className={s.mapCol}>
        <div className={s.mapHeader}>
          <span className={s.mapTitle}><MapPin size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />Task Locations</span>
          <div className={s.mapLegend}>
            <span className={s.legendItem}><span className={s.legendDot} style={{ background: '#2563eb' }} />Verifications</span>
            <span className={s.legendItem}><span className={s.legendDot} style={{ background: '#ea580c' }} />Movements</span>
            <span className={s.legendItem}><span className={s.legendDot} style={{ background: '#16a34a' }} />Inspections</span>
            <span className={s.legendItem}><span className={s.legendDot} style={{ background: '#9333ea' }} />Dest. Checks</span>
            <span className={s.legendItem}>
              <span style={{ display: 'inline-block', width: 16, height: 2, background: '#16a34a', borderTop: '2px dashed #16a34a', marginRight: 4, verticalAlign: 'middle' }} />
              Route
            </span>
          </div>
        </div>
        <TasksMap pins={mapPins} routes={mapRoutes} height="calc(100vh - 200px)" />
      </div>

      </div>{/* end splitLayout */}

      {/* ── Departure/Arrival confirmation modal ───────────────────────────── */}
      {selectedConfirm && (
        <div className={s.overlay} onClick={() => !confirming && setSelectedConfirm(null)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalHead}>
              <div>
                <div className={s.modalAnimalCode}>
                  {selectedConfirm.taskType === 'DEPARTURE_CONFIRM' ? 'Confirm Departure' : 'Confirm Arrival'}
                </div>
                <div className={s.modalSub}>{selectedConfirm.movementCode}</div>
              </div>
              <button className={s.closeBtn} onClick={() => !confirming && setSelectedConfirm(null)}><X size={18} /></button>
            </div>
            <div className={s.modalBody}>
              <div className={s.modalRoute}>
                <div className={s.modalRoutePin}>
                  <MapPin size={14} color="#374151" />
                  <div>
                    <div className={s.modalRouteCode}>{selectedConfirm.originPremisesCode}</div>
                    <div className={s.modalRouteName}>{selectedConfirm.originPremisesName || '—'}</div>
                  </div>
                </div>
                <ChevronRight size={18} color="#94a3b8" />
                <div className={s.modalRoutePin}>
                  <MapPin size={14} color="#d97706" />
                  <div>
                    <div className={s.modalRouteCode}>{selectedConfirm.destinationPremisesCode}</div>
                    <div className={s.modalRouteName}>{selectedConfirm.destinationPremisesName || '—'}</div>
                  </div>
                </div>
              </div>

              <div className={s.detailGrid}>
                <Detail label="Animals"   value={`${selectedConfirm.animalCount}`} />
                <Detail label="Purpose"   value={selectedConfirm.purpose} />
                <Detail label="Vehicle"   value={selectedConfirm.vehicleRegistration} mono />
                <Detail label="Departure" value={selectedConfirm.plannedDepartureDate} />
              </div>

              {selectedConfirm.taskType === 'ARRIVAL_CONFIRM' && (
                <div>
                  <label className={s.actionLabel} style={{ display: 'block', marginBottom: '0.4rem' }}>Animals Arrived (count)</label>
                  <input
                    type="number"
                    min="0"
                    value={confirmAnimalCount}
                    onChange={e => setConfirmAnimalCount(e.target.value)}
                    style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: '0.875rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              <div>
                <label className={s.actionLabel} style={{ display: 'block', marginBottom: '0.4rem' }}>
                  {selectedConfirm.taskType === 'ARRIVAL_CONFIRM' ? 'Discrepancy notes (if any)' : 'Departure notes (optional)'}
                </label>
                <textarea
                  className={s.actionTextarea}
                  rows={3}
                  value={confirmNotes}
                  onChange={e => setConfirmNotes(e.target.value)}
                  placeholder={selectedConfirm.taskType === 'DEPARTURE_CONFIRM' ? 'e.g. All animals loaded and permit verified.' : 'e.g. 2 animals missing — owner notified.'}
                />
              </div>

              {confirmError && <div className={s.actionError}>{confirmError}</div>}

              <div className={s.actionFormBtns}>
                <button className={s.verifyBtn} disabled={confirming} onClick={handleConfirmAction}>
                  {confirming && <Loader size={13} className={s.spin} style={{ marginRight: '0.35rem' }} />}
                  {selectedConfirm.taskType === 'DEPARTURE_CONFIRM' ? 'Confirm Departure' : 'Confirm Arrival'}
                </button>
                <button className={s.cancelBtn} disabled={confirming} onClick={() => setSelectedConfirm(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Verification modal ──────────────────────────────────────────────── */}
      {vSelected && (
        <div className={s.overlay} onClick={closeVModal}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalHead}>
              <div className={s.modalTitle}>
                <span className={s.modalEmoji}>{SPECIES_EMOJI[vSelected.species] ?? '🐾'}</span>
                <div>
                  <div className={s.modalAnimalCode}>{vSelected.animalCode}</div>
                  <div className={s.modalSub}>{vSelected.submissionCode}</div>
                </div>
              </div>
              <button className={s.closeBtn} onClick={closeVModal}><X size={18} /></button>
            </div>

            <div className={s.modalBody}>
              <div className={s.detailGrid}>
                <Detail label="Species"    value={vSelected.species} />
                <Detail label="Breed"      value={vSelected.breed} />
                <Detail label="Sex"        value={vSelected.sex} />
                <Detail label="Tag Serial" value={vSelected.tagSerial} mono />
                <Detail label="Premises"   value={vSelected.premisesCode} mono />
                <Detail label="Region"     value={[vSelected.regionCode, vSelected.districtCode].filter(Boolean).join(' / ')} />
                {vSelected.farmerName         && <Detail label="Farmer"  value={vSelected.farmerName} />}
                {vSelected.weightKg           && <Detail label="Weight"  value={`${vSelected.weightKg} kg`} />}
                {vSelected.ageMonths          && <Detail label="Age"     value={`${vSelected.ageMonths} months`} />}
                {vSelected.bodyConditionScore && <Detail label="BCS"     value={vSelected.bodyConditionScore} />}
                {vSelected.coatColor          && <Detail label="Coat"    value={vSelected.coatColor} />}
                {vSelected.distinguishingMarks && <Detail label="Marks"  value={vSelected.distinguishingMarks} />}
                <Detail label="Submitted" value={new Date(vSelected.submittedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} />
              </div>

              {vSelected.photoUrls && vSelected.photoUrls.length > 0 && (
                <div className={s.photoSection}>
                  <div className={s.photoSectionTitle}>Submitted Photos</div>
                  <div className={s.photoGrid}>
                    {vSelected.photoUrls.map((url, i) => (
                      <img key={i} src={url} alt={`Animal photo ${i + 1}`} className={s.photoThumb} />
                    ))}
                  </div>
                </div>
              )}

              {(vSelected.status === 'PENDING_VERIFICATION' || vSelected.status === 'UNDER_REVIEW') ? (
                <div className={s.actionArea}>
                  {vActionType === null ? (
                    <div className={s.actionButtons}>
                      <button className={s.verifyBtn} onClick={() => setVActionType('verify')}><CheckCircle size={15} /> Verify Animal</button>
                      <button className={s.infoBtn}   onClick={() => setVActionType('info')}><MessageSquare size={15} /> Request More Info</button>
                      <button className={s.rejectBtn} onClick={() => setVActionType('reject')}><XCircle size={15} /> Reject</button>
                    </div>
                  ) : (
                    <div className={s.actionForm}>
                      <label className={s.actionLabel}>
                        {vActionType === 'verify' ? 'Field notes (optional)' : vActionType === 'reject' ? 'Rejection reason *' : 'Information request *'}
                      </label>
                      {vActionType === 'reject' && (
                        <div className={s.quickReasons}>
                          {['No ear tag found on animal','Tag serial mismatch with records','Animal species/breed mismatch','Poor photo quality — resubmit','Animal not at declared premises','Health test certificate missing'].map(r => (
                            <button key={r} type="button" className={`${s.reasonChip} ${vActionText === r ? s.reasonChipActive : ''}`} onClick={() => setVActionText(r)}>{r}</button>
                          ))}
                        </div>
                      )}
                      <textarea className={s.actionTextarea} rows={3} value={vActionText} onChange={e => setVActionText(e.target.value)}
                        placeholder={vActionType === 'verify' ? 'e.g. Tag and animal confirmed on-site.' : vActionType === 'reject' ? 'Select a reason above or type your own…' : 'e.g. Please provide a clearer photo of the ear tag.'}
                      />
                      {vActionError && <div className={s.actionError}>{vActionError}</div>}
                      <div className={s.actionFormBtns}>
                        <button
                          className={vActionType === 'verify' ? s.verifyBtn : vActionType === 'reject' ? s.rejectBtn : s.infoBtn}
                          disabled={vActionLoading || (vActionType !== 'verify' && !vActionText.trim())}
                          onClick={handleVAction}
                        >
                          {vActionLoading && <Loader size={14} className={s.spin} />}
                          {vActionType === 'verify' ? 'Confirm Verification' : vActionType === 'reject' ? 'Confirm Rejection' : 'Send Request'}
                        </button>
                        <button className={s.cancelBtn} onClick={() => { setVActionType(null); setVActionText(''); setVActionError(null); }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className={s.statusBanner} style={{
                  background:  vSelected.status === 'VERIFIED' ? '#f0fdf4' : '#fef2f2',
                  borderColor: vSelected.status === 'VERIFIED' ? '#86efac' : '#fecaca',
                  color:       vSelected.status === 'VERIFIED' ? '#15803d' : '#b91c1c',
                }}>
                  {vSelected.status === 'VERIFIED' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                  {vSelected.status === 'VERIFIED' ? 'This animal has been verified and added to the national registry.' : `Status: ${vSelected.status.replace(/_/g, ' ')}`}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Movement modal ──────────────────────────────────────────────────── */}
      {mSelected && (
        <div className={s.overlay} onClick={closeMModal}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalHead}>
              <div>
                <div className={s.modalAnimalCode}>{mSelected.movementCode}</div>
                <div className={s.modalSub}>{mSelected.purpose} · {mSelected.movementTypeCode}</div>
              </div>
              <button className={s.closeBtn} onClick={closeMModal}><X size={18} /></button>
            </div>

            <div className={s.modalBody}>
              <div className={s.modalRoute}>
                <div className={s.modalRoutePin}>
                  <MapPin size={14} color="#374151" />
                  <div>
                    <div className={s.modalRouteCode}>{mSelected.originPremisesCode}</div>
                    <div className={s.modalRouteName}>{mSelected.originPremisesName}</div>
                  </div>
                </div>
                <ChevronRight size={18} color="#94a3b8" />
                <div className={s.modalRoutePin}>
                  <MapPin size={14} color="#d97706" />
                  <div>
                    <div className={s.modalRouteCode}>{mSelected.destinationPremisesCode}</div>
                    <div className={s.modalRouteName}>{mSelected.destinationPremisesName || '—'}</div>
                  </div>
                </div>
              </div>

              <div className={s.detailGrid}>
                <Detail label="Submitted"       value={new Date(mSelected.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} />
                <Detail label="Movement Type"   value={mSelected.movementTypeCode} />
                <Detail label="Animals"         value={`${mSelected.animalCount}`} />
                <Detail label="Purpose"         value={mSelected.purpose || '—'} />
                <Detail label="Planned Dep."    value={mSelected.plannedDepartureDate || '—'} />
                <Detail label="Planned Arr."    value={mSelected.plannedArrivalDate   || '—'} />
                <Detail label="Vehicle"         value={mSelected.vehicleRegistration  || '—'} mono />
                {mSelected.transporterName && <Detail label="Transporter"  value={mSelected.transporterName} />}
                {mSelected.speciesNotes    && <Detail label="Species"      value={mSelected.speciesNotes} />}
                {mExtra?.ownerName         && <Detail label="Owner"             value={mExtra.ownerName} />}
                {mExtra?.transporterPhone  && <Detail label="Transporter Phone" value={mExtra.transporterPhone} mono />}
              </div>
              {mExtra?.requestReason && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '0.75rem 0.875rem' }}>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#92400e', marginBottom: '0.3rem' }}>Farmer's Reason for Request</div>
                  <div style={{ fontSize: '0.875rem', color: '#374151' }}>{mExtra.requestReason}</div>
                </div>
              )}
              {mSelected.reviewerNotes && (
                <div className={s.existingNotes}>
                  <div className={s.existingNotesLabel}>Review Notes</div>
                  <div className={s.existingNotesText}>{mSelected.reviewerNotes}</div>
                </div>
              )}

              {/* ── Linked pre-movement inspection ──────────────────── */}
              <div className={s.linkedInspPanel}>
                <div className={s.linkedInspTitle}>
                  <ClipboardList size={13} style={{ marginRight: '0.35rem', verticalAlign: 'middle' }} />
                  Pre-Movement Inspection
                </div>
                {linkedInspLoading ? (
                  <div className={s.linkedInspEmpty}><Loader size={13} className={s.spin} /> Loading…</div>
                ) : linkedInsp ? (
                  <div className={s.linkedInspRow}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className={s.linkedInspCode}>{linkedInsp.inspectionCode}</span>
                      <span style={{
                        background: (INSP_STATUS[linkedInsp.status] ?? INSP_STATUS.ASSIGNED).bg,
                        color:      (INSP_STATUS[linkedInsp.status] ?? INSP_STATUS.ASSIGNED).color,
                        fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 12,
                      }}>
                        {(INSP_STATUS[linkedInsp.status] ?? INSP_STATUS.ASSIGNED).label}
                      </span>
                    </div>
                    <button
                      className={s.inspStartBtn}
                      onClick={() => { closeMModal(); navigate(`/inspections/${linkedInsp.id}`); }}
                    >
                      {linkedInsp.status === 'IN_PROGRESS' ? 'Continue →' : linkedInsp.status === 'ASSIGNED' ? 'Start Inspection →' : 'View →'}
                    </button>
                  </div>
                ) : (
                  <button className={s.inspStartBtn} onClick={createAndStartInspection} disabled={creatingInsp}>
                    {creatingInsp ? <><Loader size={13} className={s.spin} style={{ marginRight: '0.35rem' }} /> Creating…</> : 'Create & Start Inspection →'}
                  </button>
                )}
              </div>

              {mSelected.status === 'PENDING' && (
                <div className={s.actionArea}>
                  {mActionType === null ? (
                    <div className={s.actionButtons}>
                      <button className={s.verifyBtn} onClick={() => setMActionType('approve')}><CheckCircle size={15} /> Approve</button>
                      <button className={s.infoBtn}   onClick={() => setMActionType('info')}><MessageSquare size={15} /> Request Info</button>
                      <button className={s.rejectBtn} onClick={() => setMActionType('reject')}><XCircle size={15} /> Reject</button>
                    </div>
                  ) : (
                    <div className={s.actionForm}>
                      <label className={s.actionLabel}>
                        {mActionType === 'approve' ? 'Approval notes (optional)' : mActionType === 'reject' ? 'Rejection reason *' : 'Information request *'}
                      </label>
                      {mActionType === 'reject' && (
                        <div className={s.quickReasons}>
                          {M_REJECT_REASONS.map(r => (
                            <button key={r} type="button" className={`${s.reasonChip} ${mActionText === r ? s.reasonChipActive : ''}`} onClick={() => setMActionText(r)}>{r}</button>
                          ))}
                        </div>
                      )}
                      <textarea className={s.actionTextarea} rows={3} value={mActionText} onChange={e => setMActionText(e.target.value)}
                        placeholder={mActionType === 'approve' ? 'e.g. Animals inspected, health certificates verified.' : mActionType === 'reject' ? 'Select a reason above or type your own…' : 'e.g. Please attach the health certificate for all cattle.'}
                      />
                      {mActionError && <div className={s.actionError}>{mActionError}</div>}
                      <div className={s.actionFormBtns}>
                        <button
                          className={mActionType === 'approve' ? s.verifyBtn : mActionType === 'reject' ? s.rejectBtn : s.infoBtn}
                          disabled={mActionLoading || (mActionType !== 'approve' && !mActionText.trim())}
                          onClick={handleMAction}
                        >
                          {mActionLoading && <Loader size={13} className={s.spin} />}
                          {mActionType === 'approve' ? 'Confirm Approval' : mActionType === 'reject' ? 'Confirm Rejection' : 'Send Request'}
                        </button>
                        <button className={s.cancelBtn} onClick={() => { setMActionType(null); setMActionText(''); }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {mSelected.status !== 'PENDING' && (
                <div className={s.statusBanner} data-status={mSelected.status}>
                  {mSelected.status === 'APPROVED'
                    ? <><CheckCircle size={16} /> Movement request approved</>
                    : mSelected.status === 'REJECTED'
                    ? <><XCircle size={16} /> Movement request rejected</>
                    : <><MessageSquare size={16} /> Additional information requested</>
                  }
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Info Request compose modal ──────────────────────────────────────── */}
      {infoCompose && (
        <div className={s.overlay} onClick={() => !infoSending && setInfoCompose(null)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalHead}>
              <div>
                <div className={s.modalAnimalCode}>Request More Info</div>
                <div className={s.modalSub}>{infoCompose.movementCode} · {infoCompose.originPremisesCode} → {infoCompose.destinationPremisesCode}</div>
              </div>
              <button className={s.closeBtn} onClick={() => !infoSending && setInfoCompose(null)}><X size={18} /></button>
            </div>
            <div className={s.modalBody}>
              <div className={s.detailGrid}>
                <Detail label="Movement"    value={infoCompose.movementCode} mono />
                <Detail label="Animals"     value={`${infoCompose.animalCount}`} />
                <Detail label="Purpose"     value={infoCompose.purpose || '—'} />
                <Detail label="Dep. Date"   value={infoCompose.plannedDepartureDate || '—'} />
              </div>
              <div>
                <label className={s.actionLabel} style={{ display: 'block', marginBottom: '0.4rem' }}>Subject</label>
                <input
                  type="text"
                  value={infoSubject}
                  onChange={e => setInfoSubject(e.target.value)}
                  style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: '0.875rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label className={s.actionLabel} style={{ display: 'block', marginBottom: '0.4rem' }}>Message *</label>
                <textarea
                  className={s.actionTextarea}
                  rows={4}
                  value={infoBody}
                  onChange={e => setInfoBody(e.target.value)}
                  placeholder="e.g. Please provide the health certificate for all cattle in this movement."
                />
              </div>
              {infoError && <div className={s.actionError}>{infoError}</div>}
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '0.625rem 0.875rem', fontSize: '0.8rem', color: '#1d4ed8' }}>
                This request will be saved to Messenger and can be tracked there.
              </div>
              <div className={s.actionFormBtns}>
                <button
                  className={s.infoBtn}
                  style={{ background: '#0f2170', color: '#fff', border: 'none' }}
                  disabled={infoSending || !infoBody.trim()}
                  onClick={sendInfoRequest}
                >
                  {infoSending
                    ? <Loader size={13} className={s.spin} style={{ marginRight: '0.35rem' }} />
                    : <MessageSquare size={13} style={{ marginRight: '0.35rem' }} />}
                  Send to Messenger
                </button>
                <button className={s.cancelBtn} disabled={infoSending} onClick={() => setInfoCompose(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Premises details popup ──────────────────────────────────────────── */}
      {popupPremisesCode && (
        <PremisesPopup code={popupPremisesCode} onClose={() => setPopupPremisesCode(null)} />
      )}
    </div>
  );
}

// ── Premises popup ────────────────────────────────────────────────────────────

interface PremisesInfo {
  premisesCode: string;
  premisesName: string;
  premisesType: string;
  status: string;
  regionCode: string;
  physicalAddress?: string;
  gpsLat?: number;
  gpsLng?: number;
  areaHectares?: number;
  capacityAnimals?: number;
  allowedSpecies?: string;
  ownerName?: string;
}

function PremisesPopup({ code, onClose }: { code: string; onClose: () => void }) {
  const [info,    setInfo]    = useState<PremisesInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const mapRef     = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<L.Map | null>(null);

  useEffect(() => {
    setLoading(true);
    supabase
      .from('farmer_premises')
      .select('premises_code, premises_name, premises_type, status, region_code, physical_address, gps_latitude, gps_longitude, area_hectares, capacity_animals, allowed_species')
      .eq('premises_code', code)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setInfo({
            premisesCode:    data.premises_code as string,
            premisesName:    data.premises_name as string,
            premisesType:    (data.premises_type as string) ?? '',
            status:          data.status as string,
            regionCode:      data.region_code as string,
            physicalAddress: data.physical_address as string | undefined,
            gpsLat:          data.gps_latitude  ? Number(data.gps_latitude)  : undefined,
            gpsLng:          data.gps_longitude ? Number(data.gps_longitude) : undefined,
            areaHectares:    data.area_hectares    ? Number(data.area_hectares)    : undefined,
            capacityAnimals: data.capacity_animals ? Number(data.capacity_animals) : undefined,
            allowedSpecies:  data.allowed_species as string | undefined,
          });
        }
        setLoading(false);
      });
  }, [code]);

  useEffect(() => {
    if (!info?.gpsLat || !info?.gpsLng || !mapRef.current) return;
    if (leafletRef.current) { leafletRef.current.remove(); leafletRef.current = null; }
    const el = mapRef.current;
    (el as HTMLElement & { _leaflet_id?: number })._leaflet_id = undefined;
    const map = L.map(el).setView([info.gpsLat, info.gpsLng], 13);
    leafletRef.current = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    L.marker([info.gpsLat, info.gpsLng])
      .addTo(map)
      .bindPopup(`<strong>${info.premisesName}</strong><br/><span style="font-size:0.75rem;color:#64748b">${info.premisesCode}</span>`)
      .openPopup();
    return () => { leafletRef.current?.remove(); leafletRef.current = null; };
  }, [info]);

  const statusColor = (st: string) =>
    st === 'APPROVED' ? { bg: '#f0fdf4', color: '#15803d' } :
    st === 'PENDING'  ? { bg: '#fef9c3', color: '#92400e' } :
    { bg: '#f3f4f6', color: '#374151' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <Building2 size={18} color="#374151" />
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#111827' }}>
                {loading ? code : (info?.premisesName || code)}
              </div>
              <div style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#64748b', marginTop: 1 }}>{code}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, color: '#6b7280' }}>
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
            <Loader size={20} style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }} /><br/>Loading…
          </div>
        ) : !info ? (
          <div style={{ padding: '2rem 1.25rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
            <MapPin size={32} style={{ marginBottom: 8, opacity: 0.4 }} /><br/>
            No premises record found for <span style={{ fontFamily: 'monospace' }}>{code}</span>.<br/>
            <span style={{ fontSize: '0.78rem' }}>This may be a facility not yet registered in QXLITS.</span>
          </div>
        ) : (
          <>
            {/* Map */}
            {info.gpsLat && info.gpsLng ? (
              <div ref={mapRef} style={{ height: 220, width: '100%' }} />
            ) : (
              <div style={{ height: 80, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.8rem', gap: 6 }}>
                <MapPin size={14} /> No GPS coordinates recorded
              </div>
            )}

            {/* Details */}
            <div style={{ padding: '1rem 1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1.25rem' }}>
              <PopupDetail label="Type"   value={info.premisesType || '—'} />
              <PopupDetail label="Region" value={info.regionCode || '—'} />
              <PopupDetail label="Status" value={
                <span style={{ ...statusColor(info.status), padding: '0.15rem 0.5rem', borderRadius: 10, fontSize: '0.75rem', fontWeight: 600 }}>
                  {info.status}
                </span>
              } />
              {info.capacityAnimals && <PopupDetail label="Capacity" value={`${info.capacityAnimals.toLocaleString()} animals`} />}
              {info.areaHectares    && <PopupDetail label="Area"     value={`${info.areaHectares.toLocaleString()} ha`} />}
              {info.allowedSpecies  && <PopupDetail label="Species"  value={info.allowedSpecies} />}
              {info.physicalAddress && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <PopupDetail label="Address" value={info.physicalAddress} />
                </div>
              )}
              {info.gpsLat && info.gpsLng && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <PopupDetail label="GPS" value={`${info.gpsLat.toFixed(5)}, ${info.gpsLng.toFixed(5)}`} mono />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PopupDetail({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: '0.8125rem', color: '#1e293b', fontFamily: mono ? 'monospace' : 'inherit' }}>{value || '—'}</div>
    </div>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className={s.detail}>
      <div className={s.detailLabel}>{label}</div>
      <div className={`${s.detailValue}${mono ? ' ' + s.mono : ''}`}>{value || '—'}</div>
    </div>
  );
}

function MStatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    PENDING:        { bg: '#fef9c3', color: '#92400e', label: 'Pending'  },
    APPROVED:       { bg: '#f0fdf4', color: '#15803d', label: 'Approved' },
    REJECTED:       { bg: '#fef2f2', color: '#b91c1c', label: 'Rejected' },
    INFO_REQUESTED: { bg: '#eff6ff', color: '#1d4ed8', label: 'Info Req' },
  };
  const st = map[status] ?? { bg: '#f3f4f6', color: '#374151', label: status };
  return (
    <span style={{ background: st.bg, color: st.color, fontSize: '0.6875rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: 12, flexShrink: 0 }}>
      {st.label}
    </span>
  );
}

export default VerificationTasksPage;
