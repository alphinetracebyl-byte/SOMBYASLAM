import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle, XCircle, AlertTriangle, Loader2,
  MapPin, Tag, Activity, Syringe, ClipboardCheck, Send,
  LocateFixed, ChevronRight, ChevronLeft, Info, Truck,
  Thermometer, ShieldAlert,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth.store';
import { logActivity } from '@/lib/activity';
import s from './inspection-workflow.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface InspectionRecord {
  id: string;
  inspectionCode: string;
  movementCode: string;
  status: string;
  originPremisesCode: string;
  originPremisesName: string;
  originRegionCode: string;
  destinationPremisesCode: string;
  destinationPremisesName: string;
  farmerUserId: string;
  ownerName: string;
  animalCount: number;
  animalIds: string[];
  speciesSummary: string;
  movementTypeCode: string;
  purpose: string;
  plannedDepartureDate: string;
  requiredCompletionDate: string;
  assignedToName: string;
  assignedAt: string;
  arrivedAt: string | null;
  officerGpsLat: number | null;
  officerGpsLng: number | null;
  gpsWarning: boolean;
  overallDecision: string | null;
  overallNotes: string | null;
  submittedAt: string | null;
  vehicleInspection: VehicleInspection | null;
}

interface ExpectedAnimal {
  id: string;
  animalCode: string;
  tagSerial: string;
  species: string;
  breed: string;
  sex: string;
  vaccinationStatus: string;
  lastVaccinationDate: string;
  vaccinationTypes: string[];
  dewormingStatus: string;
  healthStatus: string;
  status: string;
  currentOwnerId: string;
  currentPremisesId: string;
}

interface VaccRecord {
  disease: string;
  vaccinated: boolean;
  date: string;
  product: string;
  batch: string;
  nextDue: string;
}

interface VehicleInspection {
  vehicleType: string;
  cleanliness: string;
  previousLoad: string;
  disinfectionApplied: boolean;
  disinfectant: string;
  ventilationAdequate: string;
  loadingDensityOk: string;
  waterProvided: boolean;
  feedProvided: boolean;
  journeyHours: string;
  notes: string;
}

type AnimalResult =
  | 'FIT_FOR_MOVEMENT' | 'CONDITIONALLY_FIT' | 'UNFIT_FOR_MOVEMENT'
  | 'UNDER_OBSERVATION' | 'REFERRED_TO_VET' | 'NOT_PRESENTED'
  | 'IDENTIFICATION_MISMATCH' | 'EXCLUDED';

interface TagVerification {
  tagFound: boolean;
  tagActive: boolean;
  speciesMatch: boolean;
  ownerMatch: boolean;
  premisesMatch: boolean;
  inRequest: boolean;
  notRestricted: boolean;
  scannedTagSerial: string;
  scanMethod: 'RFID' | 'MANUAL';
}

interface AnimalData {
  tagVerification: TagVerification | null;
  tagException: string;
  tagExceptionNotes: string;
  bcsScore: number | null;
  locomotionScore: number | null;
  healthChecks: Record<string, string>;
  diseaseChecks: Record<string, string>;
  clinicalNotes: string;
  bodyTemp: string;
  markedForIsolation: boolean;
  referredToVet: boolean;
  vaccinationCompliant: boolean | null;
  vaccinationNotes: string;
  vaccinationRecords: VaccRecord[];
  animalResult: AnimalResult | '';
  resultConditions: string;
  tabComplete: { tag: boolean; health: boolean; vacc: boolean; result: boolean };
}

type WorkflowStep = 'OVERVIEW' | 'ARRIVAL' | 'VEHICLE' | 'ANIMALS' | 'DECISION' | 'SUBMIT';
type AnimalTab = 'tag' | 'health' | 'disease' | 'vacc' | 'result';

// ── Clinical constants ─────────────────────────────────────────────────────────

const BCS_ITEMS = [
  { score: 1, label: 'Emaciated',  desc: 'Bones prominently visible, no muscle cover.',           fit: false, color: '#dc2626' },
  { score: 2, label: 'Very Thin',  desc: 'Ribs, spine, hip bones clearly visible.',                fit: false, color: '#ef4444' },
  { score: 3, label: 'Adequate',   desc: 'Ribs palpable, moderate cover. Minimum for transport.',  fit: true,  color: '#d97706' },
  { score: 4, label: 'Good',       desc: 'Ribs not visible, well-muscled, good fill.',             fit: true,  color: '#16a34a' },
  { score: 5, label: 'Very Good',  desc: 'Ribs impalpable, excess fat deposits.',                  fit: true,  color: '#0d9488' },
];

const LOCO_ITEMS = [
  { score: 0, label: 'Normal',          desc: 'Walks freely, fully weight-bearing on all limbs.',     fit: true,  color: '#16a34a' },
  { score: 1, label: 'Slightly Lame',   desc: 'Minor stiffness, still weight-bearing. Note required.', fit: true,  color: '#d97706' },
  { score: 2, label: 'Moderately Lame', desc: 'Reluctant to move, uneven gait. Reassess before departure.', fit: null, color: '#ea580c' },
  { score: 3, label: 'Severely Lame',   desc: 'Cannot bear weight. Must NOT be transported.',           fit: false, color: '#dc2626' },
];

const TEMP_RANGES: Record<string, { normal: [number, number]; fever: number; label: string }> = {
  Cattle: { normal: [38.0, 39.5], fever: 40.0, label: '38.0 – 39.5 °C' },
  Camel:  { normal: [36.0, 38.5], fever: 39.5, label: '36.0 – 38.5 °C' },
  Sheep:  { normal: [38.5, 40.0], fever: 40.5, label: '38.5 – 40.0 °C' },
  Goat:   { normal: [38.5, 40.0], fever: 40.5, label: '38.5 – 40.0 °C' },
};

const NOTIFIABLE_DISEASES: {
  key: string; label: string; species: string[]; signs: string; emergency?: boolean;
}[] = [
  { key: 'FMD',         label: 'Foot & Mouth Disease (FMD)',                       species: ['Cattle','Sheep','Goat','Camel'], signs: 'Vesicles/erosions on tongue, lips, dental pad, interdigital space, coronary band, teats' },
  { key: 'CBPP',        label: 'Contagious Bovine Pleuropneumonia (CBPP)',          species: ['Cattle'],                        signs: 'Painful respiration, pleural friction rub, bilateral nasal discharge, dullness' },
  { key: 'CCPP',        label: 'Contagious Caprine Pleuropneumonia (CCPP)',         species: ['Goat','Sheep'],                  signs: 'Respiratory distress, coughing, nasal discharge, fever' },
  { key: 'LSD',         label: 'Lumpy Skin Disease (LSD)',                          species: ['Cattle'],                        signs: 'Multiple firm 2–5 cm skin nodules, lymphadenopathy, nasal discharge' },
  { key: 'RVF',         label: 'Rift Valley Fever (RVF)',                           species: ['Cattle','Sheep','Goat','Camel'], signs: 'Fever >40 °C, bloody nasal discharge, jaundice, abortions — ZOONOTIC' },
  { key: 'BRUCELLOSIS', label: 'Brucellosis',                                       species: ['Cattle','Sheep','Goat','Camel'], signs: 'Abortion history, retained placenta, orchitis — ZOONOTIC' },
  { key: 'ANTHRAX',     label: 'Anthrax',                                           species: ['Cattle','Sheep','Goat','Camel'], signs: 'Sudden death in herd. DO NOT open carcasses. — EMERGENCY / ZOONOTIC', emergency: true },
  { key: 'MANGE',       label: 'Sarcoptic Mange',                                   species: ['Cattle','Sheep','Goat','Camel'], signs: 'Intense pruritus, hair loss, skin thickening, especially head and neck' },
  { key: 'ORF',         label: 'Contagious Ecthyma (Orf)',                          species: ['Sheep','Goat'],                  signs: 'Proliferative lesions on lips, nostrils, ears — ZOONOTIC' },
];

const VACC_DISEASES: { key: string; label: string; species: string[] }[] = [
  { key: 'FMD',         label: 'Foot & Mouth Disease (FMD)',  species: ['Cattle','Sheep','Goat'] },
  { key: 'RVF',         label: 'Rift Valley Fever (RVF)',     species: ['Cattle','Sheep','Goat','Camel'] },
  { key: 'PPR',         label: 'PPR (Peste des Petits Ruminants)', species: ['Sheep','Goat'] },
  { key: 'BRUCELLOSIS', label: 'Brucellosis (B19 / S19)',     species: ['Cattle','Sheep','Goat'] },
  { key: 'LSD',         label: 'Lumpy Skin Disease',          species: ['Cattle'] },
  { key: 'ANTHRAX',     label: 'Anthrax',                     species: ['Cattle','Sheep','Goat','Camel'] },
  { key: 'CBPP',        label: 'CBPP',                        species: ['Cattle'] },
];

const HEALTH_ITEMS: { key: string; label: string; options: { val: string; warn?: boolean; danger?: boolean }[] }[] = [
  { key: 'GENERAL_APPEARANCE', label: 'General Appearance',       options: [{ val: 'Normal' }, { val: 'Abnormal', warn: true }] },
  { key: 'BEHAVIOUR',          label: 'Behaviour',                options: [{ val: 'Normal' }, { val: 'Depressed', warn: true }, { val: 'Aggressive', warn: true }] },
  { key: 'VISIBLE_INJURIES',   label: 'Visible Injuries',         options: [{ val: 'None' }, { val: 'Minor', warn: true }, { val: 'Serious', danger: true }] },
  { key: 'RESPIRATORY',        label: 'Respiratory Signs',        options: [{ val: 'None' }, { val: 'Coughing', warn: true }, { val: 'Nasal discharge', warn: true }, { val: 'Breathing difficulty', danger: true }] },
  { key: 'DIGESTIVE',          label: 'Digestive Signs',          options: [{ val: 'None' }, { val: 'Diarrhoea', warn: true }, { val: 'Bloating', warn: true }, { val: 'Vomiting', danger: true }] },
  { key: 'SKIN',               label: 'Skin / Coat Condition',    options: [{ val: 'Normal' }, { val: 'Lesions', warn: true }, { val: 'Parasites', warn: true }, { val: 'Suspected disease', danger: true }] },
  { key: 'EYES_MOUTH',         label: 'Eyes & Mouth',             options: [{ val: 'Normal' }, { val: 'Discharge', warn: true }, { val: 'Lesions', danger: true }] },
  { key: 'PREGNANCY',          label: 'Pregnancy Condition',      options: [{ val: 'Not applicable' }, { val: 'Fit' }, { val: 'Restricted', warn: true }] },
  { key: 'SUSPECTED_DISEASE',  label: 'Signs of Infectious Disease', options: [{ val: 'No' }, { val: 'Yes — see Disease tab', danger: true }] },
];

const TAG_EXCEPTIONS = [
  'TAG_MISSING', 'TAG_DAMAGED', 'TAG_UNREADABLE', 'NUMBER_MISMATCH',
  'ANIMAL_NOT_FOUND', 'ADDITIONAL_ANIMAL', 'SUSPECTED_TAMPERING',
];

const ANIMAL_RESULTS: { val: AnimalResult; label: string; sub: string; color: string }[] = [
  { val: 'FIT_FOR_MOVEMENT',        label: 'Fit for Movement',         sub: 'Animal is healthy and eligible',          color: '#16a34a' },
  { val: 'CONDITIONALLY_FIT',       label: 'Conditionally Fit',        sub: 'Eligible with stated conditions',         color: '#d97706' },
  { val: 'UNFIT_FOR_MOVEMENT',      label: 'Unfit for Movement',       sub: 'Animal must not be moved',                color: '#dc2626' },
  { val: 'UNDER_OBSERVATION',       label: 'Under Observation',        sub: 'Requires monitoring before decision',     color: '#9333ea' },
  { val: 'REFERRED_TO_VET',         label: 'Referred to Veterinarian', sub: 'Needs veterinary assessment',             color: '#0891b2' },
  { val: 'NOT_PRESENTED',           label: 'Not Presented',            sub: 'Animal was absent during inspection',     color: '#6b7280' },
  { val: 'IDENTIFICATION_MISMATCH', label: 'Identification Mismatch',  sub: 'Tag or records do not match animal',      color: '#dc2626' },
  { val: 'EXCLUDED',                label: 'Excluded',                 sub: 'Removed from request by officer',         color: '#64748b' },
];

const OVERALL_DECISIONS: { val: string; label: string; sub: string; outcome: string }[] = [
  { val: 'PASS',                  label: 'Pass',                   sub: 'All animals fit — proceed',            outcome: 'Permit issued'       },
  { val: 'PARTIAL_PASS',          label: 'Partial Pass',           sub: 'Eligible animals continue',            outcome: 'Failed removed'      },
  { val: 'CORRECTION_REQUIRED',   label: 'Correction Required',    sub: 'Owner must correct and resubmit',      outcome: 'Returned to owner'   },
  { val: 'REINSPECTION_REQUIRED', label: 'Reinspection Required',  sub: 'Another inspection needed',            outcome: 'On hold'             },
  { val: 'VETERINARY_REVIEW',     label: 'Veterinary Review',      sub: 'Assign to authorised veterinarian',    outcome: 'Assigned to vet'     },
  { val: 'FAIL',                  label: 'Fail',                   sub: 'Movement request refused',             outcome: 'Inspection failed'   },
  { val: 'DISEASE_SUSPECTED',     label: 'Disease Suspected',      sub: 'Triggers disease-surveillance workflow', outcome: 'Movement blocked'  },
];

const STEP_LABELS  = ['Overview', 'Arrival', 'Vehicle', 'Animals', 'Decision', 'Submit'];
const STEP_ORDER: WorkflowStep[] = ['OVERVIEW', 'ARRIVAL', 'VEHICLE', 'ANIMALS', 'DECISION', 'SUBMIT'];

function mkDefaultVehicle(): VehicleInspection {
  return {
    vehicleType: '', cleanliness: '', previousLoad: '',
    disinfectionApplied: false, disinfectant: '',
    ventilationAdequate: '', loadingDensityOk: '',
    waterProvided: false, feedProvided: false,
    journeyHours: '', notes: '',
  };
}

function mkDefaultAnimalData(): AnimalData {
  return {
    tagVerification: null, tagException: '', tagExceptionNotes: '',
    bcsScore: null, locomotionScore: null,
    healthChecks: {}, diseaseChecks: {},
    clinicalNotes: '', bodyTemp: '',
    markedForIsolation: false, referredToVet: false,
    vaccinationCompliant: null, vaccinationNotes: '',
    vaccinationRecords: [],
    animalResult: '', resultConditions: '',
    tabComplete: { tag: false, health: false, vacc: false, result: false },
  };
}

function mkAnimalDataFromAnimal(animal: ExpectedAnimal): AnimalData {
  const applicable = VACC_DISEASES.filter(
    v => v.species.some(sp => sp.toLowerCase() === animal.species.toLowerCase())
  );
  const normed = animal.vaccinationTypes.map(t => t.toUpperCase().replace(/[^A-Z]/g, ''));
  const vaccinationRecords: VaccRecord[] = applicable.map(v => {
    const key = v.key.replace(/[^A-Z]/g, '');
    const isVaccinated = normed.some(t => t === key || t.includes(key) || key.includes(t));
    return {
      disease: v.key,
      vaccinated: isVaccinated,
      date: isVaccinated ? (animal.lastVaccinationDate ?? '') : '',
      product: '', batch: '', nextDue: '',
    };
  });
  const allAnswered = applicable.length === 0 || vaccinationRecords.length === applicable.length;
  const compliant = applicable.length > 0 ? vaccinationRecords.every(r => r.vaccinated) : null;
  return {
    tagVerification: null, tagException: '', tagExceptionNotes: '',
    bcsScore: null, locomotionScore: null,
    healthChecks: {}, diseaseChecks: {},
    clinicalNotes: '', bodyTemp: '',
    markedForIsolation: false, referredToVet: false,
    vaccinationCompliant: compliant,
    vaccinationNotes: '',
    vaccinationRecords,
    animalResult: '', resultConditions: '',
    tabComplete: { tag: false, health: false, vacc: allAnswered, result: false },
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mapInspectionRow(r: Record<string, unknown>): InspectionRecord {
  return {
    id:                      r.id as string,
    inspectionCode:          r.inspection_code as string,
    movementCode:            r.movement_code as string,
    status:                  r.status as string,
    originPremisesCode:      (r.origin_premises_code as string) ?? '',
    originPremisesName:      (r.origin_premises_name as string) ?? '',
    originRegionCode:        (r.origin_region_code as string) ?? '',
    destinationPremisesCode: (r.destination_premises_code as string) ?? '',
    destinationPremisesName: (r.destination_premises_name as string) ?? '',
    farmerUserId:            (r.farmer_user_id as string) ?? '',
    ownerName:               (r.owner_name as string) ?? '',
    animalCount:             (r.animal_count as number) ?? 0,
    animalIds:               ((r.animal_ids as string[]) ?? []),
    speciesSummary:          (r.species_summary as string) ?? '',
    movementTypeCode:        (r.movement_type_code as string) ?? '',
    purpose:                 (r.purpose as string) ?? '',
    plannedDepartureDate:    (r.planned_departure_date as string) ?? '',
    requiredCompletionDate:  (r.required_completion_date as string) ?? '',
    assignedToName:          (r.assigned_to_name as string) ?? '',
    assignedAt:              r.assigned_at as string,
    arrivedAt:               r.arrived_at as string | null,
    officerGpsLat:           r.officer_gps_lat as number | null,
    officerGpsLng:           r.officer_gps_lng as number | null,
    gpsWarning:              (r.gps_warning as boolean) ?? false,
    overallDecision:         r.overall_decision as string | null,
    overallNotes:            r.overall_notes as string | null,
    submittedAt:             r.submitted_at as string | null,
    vehicleInspection:       (r.vehicle_inspection as VehicleInspection) ?? null,
  };
}

function mapAnimalRow(r: Record<string, unknown>): ExpectedAnimal {
  return {
    id:                  r.id as string,
    animalCode:          (r.animal_code as string) ?? '',
    tagSerial:           (r.tag_serial as string) ?? '',
    species:             (r.species as string) ?? '',
    breed:               (r.breed as string) ?? '',
    sex:                 (r.sex as string) ?? '',
    vaccinationStatus:   (r.vaccination_status as string) ?? 'UNKNOWN',
    lastVaccinationDate: (r.last_vaccination_date as string) ?? '',
    vaccinationTypes:    (r.vaccination_types as string[]) ?? [],
    dewormingStatus:     (r.deworming_status as string) ?? 'UNKNOWN',
    healthStatus:        (r.health_status as string) ?? 'UNKNOWN',
    status:              (r.status as string) ?? '',
    currentOwnerId:      (r.current_owner_id as string) ?? '',
    currentPremisesId:   (r.current_premises_id as string) ?? '',
  };
}

function resultColor(val: AnimalResult | ''): string {
  return ANIMAL_RESULTS.find(r => r.val === val)?.color ?? '#94a3b8';
}

function fmtDate(d: string): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getTempStatus(species: string, temp: string): { label: string; color: string } | null {
  const val = parseFloat(temp);
  if (!temp || isNaN(val)) return null;
  const range = TEMP_RANGES[species] ?? TEMP_RANGES['Cattle'];
  if (val >= range.fever) return { label: `FEVER — above ${range.fever} °C threshold`, color: '#dc2626' };
  if (val < range.normal[0]) return { label: `Below normal — ${range.label}`, color: '#d97706' };
  return { label: `Normal — ${range.label}`, color: '#16a34a' };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TagPanel({
  animal, inspection, data, onChange,
}: {
  animal: ExpectedAnimal;
  inspection: InspectionRecord;
  data: AnimalData;
  onChange: (patch: Partial<AnimalData>) => void;
}) {
  const [tagInput, setTagInput] = useState(data.tagVerification?.scannedTagSerial ?? animal.tagSerial);
  const [scanning, setScanning] = useState(false);
  const tv = data.tagVerification;

  const verify = useCallback(async () => {
    const serial = tagInput.trim().toUpperCase();
    if (!serial) return;
    setScanning(true);
    const { data: found } = await supabase
      .from('animals')
      .select('id, animal_code, tag_status, status, species, current_owner_id, current_premises_id')
      .eq('tag_serial', serial)
      .maybeSingle();

    const requestedIds: string[] = inspection.animalIds ?? [];
    const dbSpecies = (found?.species as string ?? '').toLowerCase();
    const expSpecies = animal.species.toLowerCase();

    const result: TagVerification = {
      scannedTagSerial: serial,
      scanMethod:       serial === animal.tagSerial ? 'RFID' : 'MANUAL',
      tagFound:         !!found,
      tagActive:        found?.tag_status === 'TAGGED',
      speciesMatch:     dbSpecies === expSpecies,
      ownerMatch:       found?.current_owner_id === inspection.farmerUserId,
      premisesMatch:    true,
      inRequest:        found ? requestedIds.includes(found.id as string) : false,
      notRestricted:    found
        ? !['DEAD', 'SLAUGHTERED', 'LOST', 'STOLEN'].includes(found.status as string)
        : false,
    };

    onChange({
      tagVerification: result,
      tabComplete: { ...data.tabComplete, tag: result.tagFound && result.notRestricted },
    });
    setScanning(false);
  }, [tagInput, animal, inspection, data, onChange]);

  const checks = tv
    ? [
        { key: 'Tag exists in QXLITS',    ok: tv.tagFound      },
        { key: 'Tag is active',            ok: tv.tagActive     },
        { key: 'Species matches record',   ok: tv.speciesMatch  },
        { key: 'Owner matches request',    ok: tv.ownerMatch    },
        { key: 'Animal in movement request', ok: tv.inRequest   },
        { key: 'No restriction on animal', ok: tv.notRestricted },
      ]
    : [];

  const allPass = tv ? checks.every(c => c.ok) : false;
  const anyFail = tv ? checks.some(c => !c.ok) : false;

  return (
    <div>
      <div className={s.alertInfo}>
        <Info size={16} style={{ flexShrink: 0 }} />
        Scan or enter the RFID tag serial. System verifies identity, species, and restrictions in QXLITS.
      </div>

      <div className={s.section}>
        <label className={s.label}>Tag Serial / Scan</label>
        <div className={s.scanRow}>
          <input
            className={s.scanInput}
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            placeholder="e.g. SOM-001234"
            onKeyDown={e => { if (e.key === 'Enter') void verify(); }}
          />
          <button className={s.scanBtn} onClick={() => void verify()} disabled={scanning || !tagInput.trim()}>
            {scanning ? <Loader2 size={14} className={s.spinner} /> : 'Verify'}
          </button>
        </div>

        {tv && (
          <div className={s.checkGrid}>
            {checks.map(c => (
              <div key={c.key} className={`${s.checkRow} ${c.ok ? s.checkPass : s.checkFail}`}>
                <span className={s.checkLabel}>{c.key}</span>
                {c.ok ? <CheckCircle size={16} color="#16a34a" /> : <XCircle size={16} color="#dc2626" />}
              </div>
            ))}
          </div>
        )}

        {tv && allPass && (
          <div className={s.alertInfo} style={{ marginTop: '0.75rem' }}>
            <CheckCircle size={16} style={{ flexShrink: 0 }} />
            All 6 checks passed — animal identity verified.
          </div>
        )}
        {tv && anyFail && (
          <div className={s.alertWarn} style={{ marginTop: '0.75rem' }}>
            <AlertTriangle size={16} style={{ flexShrink: 0 }} />
            One or more checks failed. Record the exception below.
          </div>
        )}
      </div>

      {tv && anyFail && (
        <div className={s.section}>
          <label className={s.label}>Tag Exception Type</label>
          <select
            className={s.select}
            value={data.tagException}
            onChange={e => onChange({ tagException: e.target.value })}
          >
            <option value="">— Select exception —</option>
            {TAG_EXCEPTIONS.map(ex => (
              <option key={ex} value={ex}>{ex.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      )}
      {data.tagException && (
        <div className={s.fieldGroup}>
          <label className={s.label}>Exception Notes</label>
          <textarea
            className={s.textarea}
            rows={2}
            value={data.tagExceptionNotes}
            onChange={e => onChange({ tagExceptionNotes: e.target.value })}
            placeholder="Describe what was observed…"
          />
        </div>
      )}
    </div>
  );
}

function HealthPanel({
  data, animal, onChange,
}: {
  data: AnimalData;
  animal: ExpectedAnimal;
  onChange: (patch: Partial<AnimalData>) => void;
}) {
  function setCheck(key: string, val: string) {
    const next = { ...data.healthChecks, [key]: val };
    const healthComplete = HEALTH_ITEMS.every(item => next[item.key])
      && data.bcsScore !== null
      && data.locomotionScore !== null;
    onChange({ healthChecks: next, tabComplete: { ...data.tabComplete, health: healthComplete } });
  }

  function setBcs(score: number) {
    const healthComplete = HEALTH_ITEMS.every(item => data.healthChecks[item.key])
      && data.locomotionScore !== null;
    onChange({ bcsScore: score, tabComplete: { ...data.tabComplete, health: healthComplete } });
  }

  function setLoco(score: number) {
    const healthComplete = HEALTH_ITEMS.every(item => data.healthChecks[item.key])
      && data.bcsScore !== null;
    onChange({ locomotionScore: score, tabComplete: { ...data.tabComplete, health: healthComplete } });
  }

  const tempStatus = getTempStatus(animal.species, data.bodyTemp);
  const tempRange  = TEMP_RANGES[animal.species] ?? TEMP_RANGES['Cattle'];

  return (
    <div>
      {/* ── BCS ── */}
      <div className={s.section}>
        <label className={s.label}>
          Body Condition Score (BCS) — FAO 1–5 scale
          <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: 6 }}>BCS &lt; 3 = unfit for transport</span>
        </label>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
          {BCS_ITEMS.map(b => {
            const sel = data.bcsScore === b.score;
            return (
              <button
                key={b.score}
                type="button"
                onClick={() => setBcs(b.score)}
                style={{
                  flex: 1, minWidth: 80,
                  border: `2px solid ${sel ? b.color : '#e2e8f0'}`,
                  borderRadius: 10, padding: '0.6rem 0.4rem',
                  background: sel ? b.color + '18' : '#fff',
                  cursor: 'pointer', textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 900, color: sel ? b.color : '#cbd5e1' }}>{b.score}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: sel ? b.color : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{b.label}</div>
                <div style={{ fontSize: 9.5, color: '#64748b', marginTop: 2, lineHeight: 1.3 }}>{b.desc}</div>
                {!b.fit && (
                  <div style={{ marginTop: 3, fontSize: 8.5, fontWeight: 800, color: '#dc2626', background: '#fee2e2', borderRadius: 4, padding: '1px 5px' }}>UNFIT</div>
                )}
              </button>
            );
          })}
        </div>
        {data.bcsScore !== null && data.bcsScore < 3 && (
          <div className={s.alertWarn} style={{ marginTop: '0.5rem' }}>
            <AlertTriangle size={14} style={{ flexShrink: 0 }} />
            BCS {data.bcsScore} — animal is below minimum condition for transport. Set result to UNFIT.
          </div>
        )}
      </div>

      {/* ── Locomotion ── */}
      <div className={s.section}>
        <label className={s.label}>
          Locomotion Score — 0–3 scale
          <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: 6 }}>Score 3 = must NOT transport</span>
        </label>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
          {LOCO_ITEMS.map(l => {
            const sel = data.locomotionScore === l.score;
            return (
              <button
                key={l.score}
                type="button"
                onClick={() => setLoco(l.score)}
                style={{
                  flex: 1, minWidth: 100,
                  border: `2px solid ${sel ? l.color : '#e2e8f0'}`,
                  borderRadius: 10, padding: '0.6rem 0.5rem',
                  background: sel ? l.color + '18' : '#fff',
                  cursor: 'pointer', textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 900, color: sel ? l.color : '#cbd5e1' }}>{l.score}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: sel ? l.color : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l.label}</div>
                <div style={{ fontSize: 9.5, color: '#64748b', marginTop: 2, lineHeight: 1.3 }}>{l.desc}</div>
                {l.fit === false && (
                  <div style={{ marginTop: 3, fontSize: 8.5, fontWeight: 800, color: '#dc2626', background: '#fee2e2', borderRadius: 4, padding: '1px 5px' }}>UNFIT</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Temperature ── */}
      <div className={s.section}>
        <label className={s.label}>
          Body Temperature (°C)
          <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: 6 }}>Normal for {animal.species}: {tempRange.label}</span>
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.35rem' }}>
          <input
            type="number"
            step="0.1"
            className={s.input}
            style={{ maxWidth: 140 }}
            value={data.bodyTemp}
            onChange={e => onChange({ bodyTemp: e.target.value })}
            placeholder={`e.g. ${tempRange.normal[0]}`}
          />
          {tempStatus && (
            <span style={{ fontSize: 11.5, fontWeight: 700, color: tempStatus.color, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Thermometer size={13} /> {tempStatus.label}
            </span>
          )}
        </div>
        {tempStatus && tempStatus.color === '#dc2626' && (
          <div className={s.alertWarn} style={{ marginTop: '0.5rem', borderColor: '#fca5a5', background: '#fef2f2' }}>
            <ShieldAlert size={14} style={{ flexShrink: 0, color: '#dc2626' }} />
            <span style={{ color: '#991b1b' }}>Fever detected — isolate animal and flag for veterinary review. Consider disease screening.</span>
          </div>
        )}
      </div>

      {/* ── Health items ── */}
      <div className={s.healthGrid}>
        {HEALTH_ITEMS.map(item => (
          <div key={item.key} className={s.healthRow}>
            <span className={s.healthLabel}>{item.label}</span>
            <div className={s.radioGroup}>
              {item.options.map(opt => {
                const selected = data.healthChecks[item.key] === opt.val;
                return (
                  <button
                    key={opt.val}
                    type="button"
                    className={`${s.radioBtn} ${selected ? (opt.danger ? s.radioBtnDanger : opt.warn ? s.radioBtnWarn : s.radioBtnSelected) : ''}`}
                    onClick={() => setCheck(item.key, opt.val)}
                  >
                    {opt.val}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className={s.fieldGroup} style={{ marginTop: '1rem' }}>
        <label className={s.label}>Clinical Notes</label>
        <textarea
          className={s.textarea}
          rows={2}
          value={data.clinicalNotes}
          onChange={e => onChange({ clinicalNotes: e.target.value })}
          placeholder="Detailed findings, abnormal observations, measurements…"
        />
      </div>

      <div
        className={s.toggleRow}
        onClick={() => onChange({ markedForIsolation: !data.markedForIsolation })}
      >
        <span className={s.toggleLabel}>Mark animal for isolation</span>
        <div className={`${s.toggle} ${data.markedForIsolation ? s.toggleOn : ''}`} />
      </div>
      <div
        className={s.toggleRow}
        onClick={() => onChange({ referredToVet: !data.referredToVet })}
      >
        <span className={s.toggleLabel}>Refer animal to authorised veterinarian</span>
        <div className={`${s.toggle} ${data.referredToVet ? s.toggleOn : ''}`} />
      </div>
    </div>
  );
}

function DiseasePanel({
  data, animal, onChange,
}: {
  data: AnimalData;
  animal: ExpectedAnimal;
  onChange: (patch: Partial<AnimalData>) => void;
}) {
  const applicable = NOTIFIABLE_DISEASES.filter(
    d => d.species.some(sp => sp.toLowerCase() === animal.species.toLowerCase())
  );
  const DISEASE_OPTIONS = ['No signs', 'Suspected', 'Positive — confirmed', 'Not applicable'];

  function setDisease(key: string, val: string) {
    onChange({ diseaseChecks: { ...data.diseaseChecks, [key]: val } });
  }

  const anySuspected = applicable.some(d =>
    data.diseaseChecks[d.key] === 'Suspected' || data.diseaseChecks[d.key] === 'Positive — confirmed'
  );

  return (
    <div>
      <div className={s.alertInfo} style={{ background: '#f0f9ff', borderColor: '#38bdf8' }}>
        <ShieldAlert size={16} style={{ flexShrink: 0, color: '#0284c7' }} />
        <span style={{ color: '#0369a1' }}>
          Check each notifiable disease that applies to <strong>{animal.species}</strong>. Suspected cases trigger the disease-surveillance workflow and block the movement.
        </span>
      </div>

      {anySuspected && (
        <div className={s.alertWarn} style={{ background: '#fef2f2', borderColor: '#fca5a5', marginTop: '0.5rem' }}>
          <AlertTriangle size={14} style={{ flexShrink: 0, color: '#dc2626' }} />
          <span style={{ color: '#991b1b', fontWeight: 600 }}>
            Suspected disease recorded — movement will be blocked and supervisory review triggered.
          </span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
        {applicable.map(d => {
          const val = data.diseaseChecks[d.key] ?? '';
          const isSuspected = val === 'Suspected' || val === 'Positive — confirmed';
          return (
            <div
              key={d.key}
              style={{
                background: isSuspected ? '#fef2f2' : '#f8fafc',
                border: `1px solid ${isSuspected ? '#fca5a5' : '#e2e8f0'}`,
                borderRadius: 10, padding: '0.75rem 1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: '0.4rem' }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: isSuspected ? '#991b1b' : '#0d1f2d', display: 'flex', alignItems: 'center', gap: 5 }}>
                    {d.emergency && <span style={{ fontSize: 9, background: '#dc2626', color: '#fff', borderRadius: 4, padding: '1px 5px', fontWeight: 800, letterSpacing: '0.05em' }}>EMERGENCY</span>}
                    {d.label}
                  </div>
                  <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 2, lineHeight: 1.4 }}>{d.signs}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {DISEASE_OPTIONS.map(opt => {
                  const sel = val === opt;
                  const isDanger = (opt === 'Suspected' || opt === 'Positive — confirmed') && sel;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setDisease(d.key, opt)}
                      style={{
                        border: `1.5px solid ${sel ? (isDanger ? '#dc2626' : '#0d9488') : '#e2e8f0'}`,
                        borderRadius: 7, padding: '4px 10px',
                        background: sel ? (isDanger ? '#fee2e2' : '#f0fdfa') : '#fff',
                        color: sel ? (isDanger ? '#991b1b' : '#0f766e') : '#475569',
                        fontSize: 11, fontWeight: sel ? 700 : 500, cursor: 'pointer',
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VaccPanel({
  animal, data, onChange,
}: {
  animal: ExpectedAnimal;
  data: AnimalData;
  onChange: (patch: Partial<AnimalData>) => void;
}) {
  const applicable = VACC_DISEASES.filter(
    v => v.species.some(sp => sp.toLowerCase() === animal.species.toLowerCase())
  );

  function setRecord(disease: string, patch: Partial<VaccRecord>) {
    const existing = data.vaccinationRecords.find(r => r.disease === disease);
    let updated: VaccRecord[];
    if (existing) {
      updated = data.vaccinationRecords.map(r =>
        r.disease === disease ? { ...r, ...patch } : r
      );
    } else {
      updated = [
        ...data.vaccinationRecords,
        { disease, vaccinated: false, date: '', product: '', batch: '', nextDue: '', ...patch },
      ];
    }
    const allAnswered = applicable.every(v => updated.find(r => r.disease === v.key));
    onChange({
      vaccinationRecords: updated,
      vaccinationCompliant: updated.filter(r => applicable.some(v => v.key === r.disease)).every(r => r.vaccinated),
      tabComplete: { ...data.tabComplete, vacc: allAnswered },
    });
  }

  return (
    <div>
      <div className={s.vaccCard}>
        <div className={s.vaccTitle}>QXLITS Vaccination History</div>
        <div className={s.vaccRow}>
          <span className={s.vaccDetail}><strong>Status:</strong> {animal.vaccinationStatus}</span>
          <span className={s.vaccDetail}><strong>Deworming:</strong> {animal.dewormingStatus}</span>
        </div>
        {animal.lastVaccinationDate && (
          <div className={s.vaccDetail}><strong>Last vaccination:</strong> {fmtDate(animal.lastVaccinationDate)}</div>
        )}
        {animal.vaccinationTypes.length > 0 && (
          <div className={s.vaccDetail} style={{ marginTop: '0.35rem' }}>
            <strong>Recorded types:</strong> {animal.vaccinationTypes.join(', ')}
          </div>
        )}
      </div>

      {animal.vaccinationTypes.length > 0 && (
        <div style={{ marginTop: '0.75rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '0.5rem 0.85rem', fontSize: 12, color: '#1d4ed8' }}>
          <strong>Pre-loaded from QXLITS records.</strong> Verify against the animal's physical certificate and correct any discrepancies.
        </div>
      )}

      <div style={{ marginTop: '1rem' }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b', marginBottom: '0.5rem' }}>
          Per-Disease Vaccination Check — {animal.species}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {applicable.map(v => {
            const rec = data.vaccinationRecords.find(r => r.disease === v.key);
            const vax = rec?.vaccinated ?? null;
            return (
              <div
                key={v.key}
                style={{
                  background: vax === true ? '#f0fdf4' : vax === false ? '#fef2f2' : '#f8fafc',
                  border: `1px solid ${vax === true ? '#86efac' : vax === false ? '#fca5a5' : '#e2e8f0'}`,
                  borderRadius: 10, padding: '0.7rem 1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0d1f2d' }}>
                    {v.label}
                    {vax !== null && rec?.date && (
                      <span style={{ marginLeft: '0.4rem', fontSize: 10, fontWeight: 600, background: '#dbeafe', color: '#1d4ed8', borderRadius: 4, padding: '1px 5px' }}>
                        QXLITS
                      </span>
                    )}
                  </span>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      type="button"
                      onClick={() => setRecord(v.key, { vaccinated: true })}
                      style={{
                        border: `1.5px solid ${vax === true ? '#16a34a' : '#e2e8f0'}`,
                        borderRadius: 6, padding: '3px 10px',
                        background: vax === true ? '#d1fae5' : '#fff',
                        color: vax === true ? '#065f46' : '#94a3b8',
                        fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      }}
                    >✓ Vaccinated</button>
                    <button
                      type="button"
                      onClick={() => setRecord(v.key, { vaccinated: false })}
                      style={{
                        border: `1.5px solid ${vax === false ? '#dc2626' : '#e2e8f0'}`,
                        borderRadius: 6, padding: '3px 10px',
                        background: vax === false ? '#fee2e2' : '#fff',
                        color: vax === false ? '#991b1b' : '#94a3b8',
                        fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      }}
                    >✗ Not vaccinated</button>
                  </div>
                </div>
                {vax === true && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem', marginTop: '0.3rem' }}>
                    {(['date', 'product', 'batch', 'nextDue'] as const).map(field => (
                      <input
                        key={field}
                        type={field === 'date' || field === 'nextDue' ? 'date' : 'text'}
                        className={s.input}
                        style={{ fontSize: 11 }}
                        value={rec?.[field] ?? ''}
                        onChange={e => setRecord(v.key, { [field]: e.target.value })}
                        placeholder={{ date: 'Date given', product: 'Product name', batch: 'Batch no.', nextDue: 'Next due' }[field]}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className={s.fieldGroup} style={{ marginTop: '0.75rem' }}>
        <label className={s.label}>Vaccination Notes</label>
        <textarea
          className={s.textarea}
          rows={2}
          value={data.vaccinationNotes}
          onChange={e => onChange({ vaccinationNotes: e.target.value })}
          placeholder="Missing vaccines, expired records, physical certificate checked…"
        />
      </div>
    </div>
  );
}

function ResultPanel({ data, onChange }: { data: AnimalData; onChange: (patch: Partial<AnimalData>) => void }) {
  function setResult(val: AnimalResult) {
    onChange({ animalResult: val, tabComplete: { ...data.tabComplete, result: true } });
  }

  const autoFlags: string[] = [];
  if (data.bcsScore !== null && data.bcsScore < 3) autoFlags.push(`BCS ${data.bcsScore} — below minimum`);
  if (data.locomotionScore === 3) autoFlags.push('Locomotion score 3 — severely lame');
  if (data.bodyTemp && getTempStatus('Cattle', data.bodyTemp)?.color === '#dc2626') autoFlags.push('Fever detected');

  return (
    <div>
      {autoFlags.length > 0 && (
        <div className={s.alertWarn} style={{ marginBottom: '0.75rem' }}>
          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, marginBottom: 2 }}>Auto-flags from clinical findings:</div>
            {autoFlags.map(f => <div key={f} style={{ fontSize: 11 }}>{f}</div>)}
          </div>
        </div>
      )}
      <div className={s.alertInfo}>
        <Info size={16} style={{ flexShrink: 0 }} />
        Select the fitness result for this animal based on all findings above.
      </div>
      <div className={s.resultGrid}>
        {ANIMAL_RESULTS.map(r => (
          <button
            key={r.val}
            type="button"
            className={`${s.resultBtn} ${data.animalResult === r.val ? s.resultBtnSelected : ''}`}
            onClick={() => setResult(r.val)}
          >
            <div className={s.resultBtnLabel} style={{ color: r.color }}>{r.label}</div>
            <div className={s.resultBtnSub}>{r.sub}</div>
          </button>
        ))}
      </div>
      {data.animalResult === 'CONDITIONALLY_FIT' && (
        <div className={s.fieldGroup} style={{ marginTop: '0.75rem' }}>
          <label className={s.label}>Conditions Required</label>
          <textarea
            className={s.textarea}
            rows={2}
            value={data.resultConditions}
            onChange={e => onChange({ resultConditions: e.target.value })}
            placeholder="e.g. Separate transport compartment; veterinary clearance on arrival…"
          />
        </div>
      )}
    </div>
  );
}

function VehiclePanel({
  value, onChange,
}: {
  value: VehicleInspection;
  onChange: (patch: Partial<VehicleInspection>) => void;
}) {
  function radio(field: keyof VehicleInspection, options: string[], val: string) {
    return (
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
        {options.map(opt => {
          const sel = val === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange({ [field]: opt } as Partial<VehicleInspection>)}
              style={{
                border: `1.5px solid ${sel ? '#0d9488' : '#e2e8f0'}`,
                borderRadius: 7, padding: '5px 12px',
                background: sel ? '#f0fdfa' : '#fff',
                color: sel ? '#0f766e' : '#475569',
                fontSize: 12, fontWeight: sel ? 700 : 500, cursor: 'pointer',
              }}
            >{opt}</button>
          );
        })}
      </div>
    );
  }

  function tog(field: keyof VehicleInspection, val: boolean, label: string) {
    return (
      <div
        className={s.toggleRow}
        onClick={() => onChange({ [field]: !val } as Partial<VehicleInspection>)}
      >
        <span className={s.toggleLabel}>{label}</span>
        <div className={`${s.toggle} ${val ? s.toggleOn : ''}`} />
      </div>
    );
  }

  const rejected = value.cleanliness === 'Rejected — unusable';

  return (
    <div>
      <div className={s.alertInfo}>
        <Truck size={16} style={{ flexShrink: 0 }} />
        Inspect the transport vehicle before animals are loaded. WOAH standards require adequate biosecurity for livestock transport.
      </div>

      {rejected && (
        <div className={s.alertWarn} style={{ background: '#fef2f2', borderColor: '#fca5a5', marginTop: '0.5rem' }}>
          <XCircle size={14} style={{ flexShrink: 0, color: '#dc2626' }} />
          <span style={{ color: '#991b1b', fontWeight: 700 }}>Vehicle rejected — animals must not be loaded until vehicle is cleaned and re-inspected.</span>
        </div>
      )}

      <div className={s.section}>
        <label className={s.label}>Vehicle Type</label>
        {radio('vehicleType', ['Livestock truck', 'Trailer', 'Pickup', 'Donkey cart', 'Foot movement'], value.vehicleType)}
      </div>

      <div className={s.section}>
        <label className={s.label}>Vehicle Cleanliness</label>
        {radio('cleanliness', ['Clean', 'Needs cleaning', 'Rejected — unusable'], value.cleanliness)}
      </div>

      <div className={s.section}>
        <label className={s.label}>Previous Load (last trip)</label>
        {radio('previousLoad', ['Unknown', 'Same species — livestock', 'Other species — livestock', 'Non-livestock'], value.previousLoad)}
      </div>

      {tog('disinfectionApplied', value.disinfectionApplied, 'Disinfection applied before loading')}

      {value.disinfectionApplied && (
        <div className={s.fieldGroup}>
          <label className={s.label}>Disinfectant Product Used</label>
          <input
            className={s.input}
            value={value.disinfectant}
            onChange={e => onChange({ disinfectant: e.target.value })}
            placeholder="e.g. Virkon S 1%, formaldehyde solution…"
          />
        </div>
      )}

      <div className={s.section}>
        <label className={s.label}>Adequate Ventilation</label>
        {radio('ventilationAdequate', ['Yes', 'No', 'Not applicable'], value.ventilationAdequate)}
      </div>

      <div className={s.section}>
        <label className={s.label}>Loading Density Acceptable</label>
        {radio('loadingDensityOk', ['Yes', 'No — overcrowded', 'Not applicable'], value.loadingDensityOk)}
      </div>

      {tog('waterProvided', value.waterProvided, 'Water provision arranged for journey')}
      {tog('feedProvided', value.feedProvided, 'Feed provision arranged for journey')}

      <div className={s.fieldGroup} style={{ marginTop: '0.5rem' }}>
        <label className={s.label}>Estimated Journey Duration (hours)</label>
        <input
          type="number"
          min="0"
          step="0.5"
          className={s.input}
          style={{ maxWidth: 140 }}
          value={value.journeyHours}
          onChange={e => onChange({ journeyHours: e.target.value })}
          placeholder="e.g. 6"
        />
      </div>

      <div className={s.fieldGroup}>
        <label className={s.label}>Vehicle Inspection Notes</label>
        <textarea
          className={s.textarea}
          rows={2}
          value={value.notes}
          onChange={e => onChange({ notes: e.target.value })}
          placeholder="Any observations about vehicle condition, biosecurity issues…"
        />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function InspectionWorkflowPage(): JSX.Element {
  const { inspectionId } = useParams<{ inspectionId: string }>();
  const navigate         = useNavigate();
  const { userId, roles, regionCode } = useAuthStore();
  const roleLabel = (roles[0] ?? 'FIELD_INSPECTOR').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

  const [inspection,      setInspection]    = useState<InspectionRecord | null>(null);
  const [animals,         setAnimals]       = useState<ExpectedAnimal[]>([]);
  const [loading,         setLoading]       = useState(true);
  const [step,            setStep]          = useState<WorkflowStep>('OVERVIEW');
  const [animalData,      setAnimalData]    = useState<Record<string, AnimalData>>({});
  const [vehicleData,     setVehicleData]   = useState<VehicleInspection>(mkDefaultVehicle());
  const [currentAnimalIdx, setCurrentIdx]  = useState(0);
  const [animalTab,       setAnimalTab]     = useState<AnimalTab>('tag');
  const [overallDecision, setDecision]     = useState('');
  const [overallNotes,    setOverallNotes] = useState('');
  const [declaration,     setDeclaration]  = useState(false);
  const [gpsLoading,      setGpsLoading]   = useState(false);
  const [gpsCoords,       setGpsCoords]    = useState<{ lat: number; lng: number } | null>(null);
  const [submitting,      setSubmitting]   = useState(false);
  const [submitError,     setSubmitError]  = useState('');
  const [savingVehicle,   setSavingVehicle] = useState(false);

  useEffect(() => {
    if (!inspectionId) return;
    void (async () => {
      const { data: ins } = await supabase
        .from('movement_inspections')
        .select('*')
        .eq('id', inspectionId)
        .single();
      if (!ins) { setLoading(false); return; }

      const insp = mapInspectionRow(ins as Record<string, unknown>);
      setInspection(insp);
      if (insp.vehicleInspection) setVehicleData(insp.vehicleInspection);

      if (insp.status === 'SUBMITTED' || insp.submittedAt) {
        setStep('SUBMIT');
      } else if (insp.status === 'IN_PROGRESS') {
        setStep(insp.arrivedAt ? 'ANIMALS' : 'ARRIVAL');
      }

      if (insp.animalIds && insp.animalIds.length > 0) {
        const { data: animalRows } = await supabase
          .from('animals')
          .select('id, animal_code, tag_serial, species, breed, sex, vaccination_status, last_vaccination_date, vaccination_types, deworming_status, health_status, status, current_owner_id, current_premises_id')
          .in('id', insp.animalIds);
        const mapped = (animalRows ?? []).map(r => mapAnimalRow(r as Record<string, unknown>));
        setAnimals(mapped);

        const init: Record<string, AnimalData> = {};
        mapped.forEach(a => { init[a.id] = mkAnimalDataFromAnimal(a); });

        const { data: savedAnimals } = await supabase
          .from('movement_inspection_animals')
          .select('*')
          .eq('inspection_id', inspectionId);

        (savedAnimals ?? []).forEach((r: Record<string, unknown>) => {
          const aId = r.animal_id as string;
          if (!aId || !init[aId]) return;
          const tv: TagVerification | null = r.tag_found != null ? {
            scannedTagSerial: (r.tag_serial as string) ?? '',
            scanMethod:       (r.scan_method as 'RFID' | 'MANUAL') ?? 'MANUAL',
            tagFound:         r.tag_found as boolean,
            tagActive:        r.tag_active as boolean,
            speciesMatch:     (r.species_match as boolean) ?? true,
            ownerMatch:       r.owner_match as boolean,
            premisesMatch:    r.premises_match as boolean,
            inRequest:        r.in_request as boolean,
            notRestricted:    r.not_restricted as boolean,
          } : null;
          const hc  = (r.health_checks as Record<string, string>) ?? {};
          const dc  = (r.disease_checks as Record<string, string>) ?? {};
          const bcs = r.bcs_score as number | null;
          const loco = r.locomotion_score as number | null;
          const vacRecs = (r.vaccination_records as VaccRecord[]) ?? [];
          const healthComplete = HEALTH_ITEMS.every(item => hc[item.key]) && bcs !== null && loco !== null;

          init[aId] = {
            tagVerification:    tv,
            tagException:       (r.tag_exception as string) ?? '',
            tagExceptionNotes:  (r.tag_exception_notes as string) ?? '',
            bcsScore:           bcs,
            locomotionScore:    loco,
            healthChecks:       hc,
            diseaseChecks:      dc,
            clinicalNotes:      (r.clinical_notes as string) ?? '',
            bodyTemp:           r.body_temp_celsius != null ? String(r.body_temp_celsius) : '',
            markedForIsolation: (r.marked_for_isolation as boolean) ?? false,
            referredToVet:      (r.referred_to_vet as boolean) ?? false,
            vaccinationCompliant: r.vaccination_compliant as boolean | null,
            vaccinationNotes:   (r.vaccination_notes as string) ?? '',
            vaccinationRecords: vacRecs,
            animalResult:       (r.animal_result as AnimalResult) ?? '',
            resultConditions:   (r.result_conditions as string) ?? '',
            tabComplete: {
              tag:    !!tv,
              health: healthComplete,
              vacc:   r.vaccination_compliant != null,
              result: !!(r.animal_result),
            },
          };
        });
        setAnimalData(init);
      }
      setLoading(false);
    })();
  }, [inspectionId]);

  const patchAnimal = useCallback((animalId: string, patch: Partial<AnimalData>) => {
    setAnimalData(prev => ({
      ...prev,
      [animalId]: { ...prev[animalId], ...patch },
    }));
  }, []);

  const getGps = () => {
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => { setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsLoading(false); },
      () => { setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleStartInspection = async () => {
    if (!inspection) return;
    const now = new Date().toISOString();
    await supabase.from('movement_inspections').update({ status: 'IN_PROGRESS', started_at: now }).eq('id', inspection.id);
    setInspection(prev => prev ? { ...prev, status: 'IN_PROGRESS' } : prev);
    setStep('ARRIVAL');
    void logActivity({ category: 'MOVEMENT', level: 'INFO', title: 'Pre-movement inspection started', detail: `${inspection.inspectionCode} — ${inspection.originPremisesCode}`, actorRole: roleLabel, region: regionCode, referenceCode: inspection.inspectionCode, userId });
  };

  const handleArrival = async () => {
    if (!inspection) return;
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { arrived_at: now, gps_warning: false };
    if (gpsCoords) { patch.officer_gps_lat = gpsCoords.lat; patch.officer_gps_lng = gpsCoords.lng; }
    await supabase.from('movement_inspections').update(patch).eq('id', inspection.id);
    setInspection(prev => prev ? { ...prev, arrivedAt: now, officerGpsLat: gpsCoords?.lat ?? null, officerGpsLng: gpsCoords?.lng ?? null } : prev);
    setStep('VEHICLE');
  };

  const handleSaveVehicle = async () => {
    if (!inspection) return;
    setSavingVehicle(true);
    await supabase.from('movement_inspections').update({ vehicle_inspection: vehicleData }).eq('id', inspection.id);
    setInspection(prev => prev ? { ...prev, vehicleInspection: vehicleData } : prev);
    setSavingVehicle(false);
    setStep('ANIMALS');
  };

  const saveAnimalRecord = async (animal: ExpectedAnimal, data: AnimalData) => {
    if (!inspection) return;
    const tv = data.tagVerification;
    const record = {
      inspection_id:        inspection.id,
      animal_id:            animal.id,
      tag_serial:           tv?.scannedTagSerial ?? animal.tagSerial,
      animal_code:          animal.animalCode,
      species:              animal.species,
      breed:                animal.breed,
      sex:                  animal.sex,
      scan_method:          tv?.scanMethod ?? 'MANUAL',
      scanned_at:           new Date().toISOString(),
      tag_found:            tv?.tagFound ?? null,
      tag_active:           tv?.tagActive ?? null,
      species_match:        tv?.speciesMatch ?? null,
      owner_match:          tv?.ownerMatch ?? null,
      premises_match:       tv?.premisesMatch ?? null,
      in_request:           tv?.inRequest ?? null,
      not_restricted:       tv?.notRestricted ?? null,
      tag_exception:        data.tagException || null,
      tag_exception_notes:  data.tagExceptionNotes || null,
      bcs_score:            data.bcsScore,
      locomotion_score:     data.locomotionScore,
      health_checks:        data.healthChecks,
      disease_checks:       data.diseaseChecks,
      clinical_notes:       data.clinicalNotes || null,
      body_temp_celsius:    data.bodyTemp ? parseFloat(data.bodyTemp) : null,
      marked_for_isolation: data.markedForIsolation,
      referred_to_vet:      data.referredToVet,
      vaccination_compliant: data.vaccinationCompliant,
      vaccination_notes:    data.vaccinationNotes || null,
      vaccination_records:  data.vaccinationRecords,
      animal_result:        data.animalResult || null,
      result_conditions:    data.resultConditions || null,
      sort_order:           animals.findIndex(a => a.id === animal.id),
    };
    await supabase.from('movement_inspection_animals').delete().eq('inspection_id', inspection.id).eq('animal_id', animal.id);
    await supabase.from('movement_inspection_animals').insert(record);
  };

  const handleAnimalNext = async () => {
    const animal = animals[currentAnimalIdx];
    if (animal) await saveAnimalRecord(animal, animalData[animal.id] ?? mkDefaultAnimalData());
    if (currentAnimalIdx < animals.length - 1) { setCurrentIdx(currentAnimalIdx + 1); setAnimalTab('tag'); }
    else setStep('DECISION');
  };

  const handleSubmit = async () => {
    if (!inspection || !overallDecision || !declaration) return;
    setSubmitting(true);
    setSubmitError('');

    const currentAnimal = animals[currentAnimalIdx];
    if (currentAnimal && step === 'ANIMALS') {
      await saveAnimalRecord(currentAnimal, animalData[currentAnimal.id] ?? mkDefaultAnimalData());
    }

    const allData      = Object.values(animalData);
    const passedCount  = allData.filter(d => d.animalResult === 'FIT_FOR_MOVEMENT' || d.animalResult === 'CONDITIONALLY_FIT').length;
    const failedCount  = allData.filter(d => d.animalResult === 'UNFIT_FOR_MOVEMENT' || d.animalResult === 'IDENTIFICATION_MISMATCH').length;
    const excludedCount = allData.filter(d => d.animalResult === 'EXCLUDED').length;
    const missingCount = allData.filter(d => d.animalResult === 'NOT_PRESENTED').length;
    const scannedCount = allData.filter(d => d.tagVerification !== null).length;

    const movementStatusMap: Record<string, string> = {
      PASS:                  'PERMIT_ISSUED',
      PARTIAL_PASS:          'PERMIT_ISSUED',
      CORRECTION_REQUIRED:   'PENDING',
      REINSPECTION_REQUIRED: 'INSPECTION_ASSIGNED',
      VETERINARY_REVIEW:     'INSPECTION_ASSIGNED',
      FAIL:                  'INSPECTION_FAILED',
      DISEASE_SUSPECTED:     'INSPECTION_FAILED',
    };

    const now       = new Date().toISOString();
    const insStatus = overallDecision === 'PASS' || overallDecision === 'PARTIAL_PASS' ? 'APPROVED' : overallDecision;

    const { error } = await supabase.from('movement_inspections').update({
      status: insStatus, overall_decision: overallDecision, overall_notes: overallNotes || null,
      officer_declaration: true, submitted_at: now,
      scanned_count: scannedCount, passed_count: passedCount, failed_count: failedCount,
      excluded_count: excludedCount, missing_count: missingCount,
    }).eq('id', inspection.id);

    if (error) { setSubmitError(error.message); setSubmitting(false); return; }

    const mvStatus = movementStatusMap[overallDecision] ?? 'UNDER_REVIEW';

    if (mvStatus === 'PERMIT_ISSUED') {
      const [{ data: permitNum }, { data: mrRow }, { data: farmerRow }, { data: officerRow }] = await Promise.all([
        supabase.rpc('generate_permit_number', { p_region: inspection.originRegionCode || 'SOM' }),
        supabase.from('farmer_movement_requests')
          .select('transporter_name, vehicle_registration')
          .eq('movement_code', inspection.movementCode)
          .maybeSingle(),
        inspection.farmerUserId
          ? supabase.from('farmers').select('national_id').eq('user_id', inspection.farmerUserId).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        userId
          ? supabase.from('user_registrations').select('licence_number').eq('id', userId).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);
      const mrData     = mrRow     as { transporter_name: string | null; vehicle_registration: string | null } | null;
      const farmerData = farmerRow as { national_id: string | null } | null;
      const officerData = officerRow as { licence_number: string | null } | null;

      // Compute sex breakdown from loaded animals
      const passedAnimals = animals.filter(a => {
        const d = animalData[a.id];
        return !d || d.animalResult === 'FIT_FOR_MOVEMENT' || d.animalResult === 'CONDITIONALLY_FIT' || d.animalResult === '';
      });
      const mCount = passedAnimals.filter(a => /^(male|m|bull|ram|billy|buck)$/i.test(a.sex ?? '')).length;
      const fCount = passedAnimals.filter(a => /^(female|f|cow|heifer|ewe|doe|nanny)$/i.test(a.sex ?? '')).length;
      const cCount = passedAnimals.filter(a => /^(castrat|steer|wether|ox)$/i.test(a.sex ?? '')).length;
      const sexParts: string[] = [];
      if (mCount > 0) sexParts.push(`${mCount} Male`);
      if (fCount > 0) sexParts.push(`${fCount} Female`);
      if (cCount > 0) sexParts.push(`${cCount} Castrated`);
      const sexBreakdown = sexParts.join(' / ') || null;

      const validFrom = new Date();
      const validTo   = new Date(validFrom);
      const typeValidityDays: Record<string, number> = {
        P2P: 5, F2M: 2, M2P: 3, F2Q: 3, Q2S: 1, Q2E: 2, TRH: 60, EMG: 1,
      };
      const days = typeValidityDays[inspection.movementTypeCode] ?? 5;
      validTo.setDate(validTo.getDate() + days);

      const { error: permitErr } = await supabase.from('movement_permits').insert({
        permit_number:             permitNum as string,
        movement_code:             inspection.movementCode,
        inspection_code:           inspection.inspectionCode,
        valid_from:                validFrom.toISOString().split('T')[0],
        valid_to:                  validTo.toISOString().split('T')[0],
        conditions:                overallNotes || null,
        animal_count:              passedCount,
        animal_ids:                inspection.animalIds,
        origin_premises_code:      inspection.originPremisesCode,
        origin_premises_name:      inspection.originPremisesName,
        origin_region_code:        inspection.originRegionCode,
        destination_premises_code: inspection.destinationPremisesCode,
        destination_premises_name: inspection.destinationPremisesName,
        purpose:                   inspection.purpose,
        movement_type_code:        inspection.movementTypeCode,
        owner_name:                inspection.ownerName,
        species_summary:           inspection.speciesSummary,
        issued_by_id:              userId,
        issued_by_name:            inspection.assignedToName,
        issued_by_licence:         officerData?.licence_number ?? null,
        issued_at:                 now,
        status:                    'ACTIVE',
        permit_type:               inspection.movementTypeCode,
        transporter_name:          mrData?.transporter_name  ?? null,
        vehicle_registration:      mrData?.vehicle_registration ?? null,
        owner_national_id:         farmerData?.national_id ?? null,
        sex_breakdown:             sexBreakdown,
      });

      if (permitErr) { setSubmitError(`Failed to issue permit: ${permitErr.message}`); setSubmitting(false); return; }

      await supabase.from('farmer_movement_requests').update({ status: mvStatus, permit_number: permitNum as string }).eq('movement_code', inspection.movementCode);
    } else {
      await supabase.from('farmer_movement_requests').update({ status: mvStatus }).eq('movement_code', inspection.movementCode);
    }

    await supabase.from('movement_tasks').update({ status: 'COMPLETED', completed_at: now }).eq('movement_code', inspection.movementCode).in('status', ['PENDING', 'IN_PROGRESS']);

    void logActivity({ category: 'MOVEMENT', level: overallDecision === 'FAIL' || overallDecision === 'DISEASE_SUSPECTED' ? 'ERROR' : 'SUCCESS', title: 'Pre-movement inspection submitted', detail: `${inspection.inspectionCode} — ${overallDecision} — ${passedCount} fit, ${failedCount} failed`, actorRole: roleLabel, region: regionCode, referenceCode: inspection.inspectionCode, userId });

    setInspection(prev => prev ? { ...prev, status: insStatus, overallDecision, submittedAt: now } : prev);
    setStep('SUBMIT');
    setSubmitting(false);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) return <div className={s.page}><div className={s.loading}><Loader2 size={20} className={s.spinner} /> Loading inspection…</div></div>;
  if (!inspection) return <div className={s.page}><div className={s.alertErr}><XCircle size={16} /> Inspection not found.</div></div>;

  const currentAnimal = animals[currentAnimalIdx];
  const currentData   = currentAnimal ? (animalData[currentAnimal.id] ?? mkDefaultAnimalData()) : null;
  const animalsDone   = animals.filter(a => (animalData[a.id]?.animalResult ?? '') !== '').length;
  const stepIdx       = STEP_ORDER.indexOf(step);

  return (
    <div className={s.shell}>
      <main className={s.main}>
        <div className={s.stepCard}>
          <div className={s.stepRoute}>
            <div className={s.stepRouteSide}>
              <span className={s.stepRouteLabel}>Origin Farm</span>
              <span className={s.stepRouteName}>{inspection.originPremisesName || inspection.originPremisesCode}</span>
              <span className={s.stepRouteCode}>{inspection.originPremisesCode}</span>
            </div>
            <div className={s.stepRouteArrow}>
              <div className={s.stepRouteArrowLine} />
              <span className={s.stepRouteArrowLabel}>{inspection.animalCount} animal{inspection.animalCount !== 1 ? 's' : ''} · {inspection.purpose || 'Movement'}</span>
            </div>
            <div className={s.stepRouteSide}>
              <span className={s.stepRouteLabel}>Destination</span>
              <span className={s.stepRouteName}>{inspection.destinationPremisesName || inspection.destinationPremisesCode}</span>
              <span className={s.stepRouteCode}>{inspection.destinationPremisesCode}</span>
            </div>
          </div>

          <div className={s.stepList}>
            {STEP_LABELS.map((label, i) => {
              const isDone   = i < stepIdx;
              const isActive = i === stepIdx;
              const reachable = i <= stepIdx;
              return (
                <React.Fragment key={label}>
                  {i > 0 && <div className={`${s.stepConnector}${i <= stepIdx ? ' ' + s.stepConnectorDone : ''}`} />}
                  <button
                    type="button"
                    className={`${s.stepItem}${isDone ? ' ' + s.stepItemDone : ''}${isActive ? ' ' + s.stepItemActive : ''}`}
                    onClick={() => reachable && setStep(STEP_ORDER[i])}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: reachable ? 'pointer' : 'default' }}
                  >
                    <div className={s.stepDot}>{isDone ? <CheckCircle size={15} /> : <span>{i + 1}</span>}</div>
                    <span className={s.stepLabel}>{label}</span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* ── OVERVIEW ── */}
        {step === 'OVERVIEW' && (
          <div className={s.card}>
            <div className={s.cardTitle}><ClipboardCheck size={18} /> {inspection.inspectionCode}</div>
            <div className={s.section}>
              <div className={s.sectionLabel}>Movement Details</div>
              <div className={s.infoGrid}>
                <div className={s.infoRow}><span className={s.infoKey}>Movement Code</span><span className={s.infoVal}>{inspection.movementCode}</span></div>
                <div className={s.infoRow}><span className={s.infoKey}>Type</span><span className={s.infoVal}>{inspection.movementTypeCode || '—'}</span></div>
                <div className={s.infoRow}><span className={s.infoKey}>Purpose</span><span className={s.infoVal}>{inspection.purpose}</span></div>
                <div className={s.infoRow}><span className={s.infoKey}>Animals</span><span className={s.infoVal}>{inspection.animalCount} · {inspection.speciesSummary}</span></div>
                <div className={s.infoRow}><span className={s.infoKey}>Planned Departure</span><span className={s.infoVal}>{fmtDate(inspection.plannedDepartureDate)}</span></div>
                <div className={s.infoRow}><span className={s.infoKey}>Owner</span><span className={s.infoVal}>{inspection.ownerName || '—'}</span></div>
                <div className={s.infoRow}><span className={s.infoKey}>Required By</span><span className={s.infoVal}>{fmtDate(inspection.requiredCompletionDate)}</span></div>
              </div>
            </div>
            <div className={s.section}>
              <div className={s.sectionLabel}>Route</div>
              <div className={s.infoValRoute}>{inspection.originPremisesCode} ({inspection.originPremisesName}) → {inspection.destinationPremisesCode} ({inspection.destinationPremisesName})</div>
            </div>
            <div className={s.section}>
              <div className={s.sectionLabel}>Expected Animals ({animals.length})</div>
              {animals.slice(0, 8).map(a => (
                <div key={a.id} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.35rem', fontSize: '0.82rem', color: '#374151' }}>
                  <span style={{ fontFamily: 'monospace', color: '#2563eb', fontWeight: 700 }}>{a.tagSerial || a.animalCode}</span>
                  <span>{a.species} {a.sex} {a.breed && `· ${a.breed}`}</span>
                </div>
              ))}
              {animals.length > 8 && <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>…and {animals.length - 8} more</div>}
            </div>
            {inspection.status === 'SUBMITTED'
              ? <div className={s.alertInfo}><Info size={16} /> Inspection already submitted.</div>
              : (
                <div className={s.footer}>
                  <span />
                  <button className={s.btnPrimary} onClick={() => inspection.status === 'IN_PROGRESS' && inspection.arrivedAt ? setStep('VEHICLE') : inspection.status === 'IN_PROGRESS' ? setStep('ARRIVAL') : void handleStartInspection()}>
                    {inspection.status === 'IN_PROGRESS' ? 'Continue Inspection' : 'Start Inspection'} <ChevronRight size={16} />
                  </button>
                </div>
              )
            }
          </div>
        )}

        {/* ── ARRIVAL ── */}
        {step === 'ARRIVAL' && (
          <div className={s.card}>
            <div className={s.cardTitle}><LocateFixed size={18} /> Confirm Arrival at Premises</div>
            <div className={s.alertInfo}>
              <Info size={16} style={{ flexShrink: 0 }} />
              Confirm you have arrived at <strong>{inspection.originPremisesName || inspection.originPremisesCode}</strong>. GPS coordinates will be recorded in the inspection audit trail.
            </div>
            <div className={s.section}>
              <label className={s.label}>GPS Location</label>
              {gpsCoords
                ? <div className={s.gpsBox}><span className={s.gpsCoords}>{gpsCoords.lat.toFixed(6)}, {gpsCoords.lng.toFixed(6)}</span><span style={{ fontSize: '0.78rem', color: '#065f46' }}>Location recorded</span></div>
                : (
                  <button className={s.btnPrimary} onClick={getGps} disabled={gpsLoading} style={{ marginBottom: '0.5rem' }}>
                    {gpsLoading ? <Loader2 size={14} className={s.spinner} /> : <LocateFixed size={14} />}
                    {gpsLoading ? 'Getting location…' : 'Get GPS Location'}
                  </button>
                )
              }
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.35rem' }}>GPS is optional but required for the official inspection audit trail.</div>
            </div>
            <div className={s.footer}>
              <button className={s.btnSecondary} onClick={() => setStep('OVERVIEW')}>Back</button>
              <button className={s.btnPrimary} onClick={() => void handleArrival()}>
                Confirm Arrival — Inspect Vehicle <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── VEHICLE ── */}
        {step === 'VEHICLE' && (
          <div className={s.card}>
            <div className={s.cardTitle}><Truck size={18} /> Vehicle Biosecurity Inspection</div>
            <VehiclePanel value={vehicleData} onChange={patch => setVehicleData(prev => ({ ...prev, ...patch }))} />
            <div className={s.footer}>
              <button className={s.btnSecondary} onClick={() => setStep('ARRIVAL')}><ChevronLeft size={14} /> Back</button>
              <button className={s.btnPrimary} onClick={() => void handleSaveVehicle()} disabled={savingVehicle}>
                {savingVehicle ? <Loader2 size={14} className={s.spinner} /> : null}
                Save &amp; Inspect Animals <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── ANIMALS ── */}
        {step === 'ANIMALS' && animals.length === 0 && (
          <div className={s.card}>
            <div className={s.alertInfo} style={{ fontSize: '0.9rem', padding: '1rem 1.25rem' }}>
              <Info size={18} style={{ flexShrink: 0 }} />
              No animal records found for this inspection.
            </div>
            <div className={s.footer}>
              <button className={s.btnSecondary} onClick={() => setStep('VEHICLE')}><ChevronLeft size={14} /> Back</button>
              <button className={s.btnPrimary} onClick={() => setStep('DECISION')}>Skip to Decision <ChevronRight size={14} /></button>
            </div>
          </div>
        )}

        {step === 'ANIMALS' && currentAnimal && currentData && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                Animal {currentAnimalIdx + 1} of {animals.length} &nbsp;·&nbsp; {animalsDone} completed
              </span>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>{animalsDone}/{animals.length} animals inspected</span>
            </div>

            <div className={s.animalLayout}>
              <div className={s.animalList}>
                {animals.map((a, idx) => {
                  const d = animalData[a.id];
                  const done = d?.animalResult !== '';
                  const isActive = idx === currentAnimalIdx;
                  return (
                    <div
                      key={a.id}
                      className={`${s.animalItem} ${isActive ? s.animalItemActive : ''} ${done && !isActive ? s.animalItemDone : ''}`}
                      onClick={() => { setCurrentIdx(idx); setAnimalTab('tag'); }}
                    >
                      <div className={s.animalItemInfo}>
                        <div className={s.animalItemCode}>{a.tagSerial || a.animalCode}</div>
                        <div className={s.animalItemMeta}>{a.species} · {a.sex}</div>
                      </div>
                      <div className={s.animalResultDot} style={{ background: done ? resultColor(d?.animalResult ?? '') : '#d1d5db' }} />
                    </div>
                  );
                })}
              </div>

              <div className={s.card} style={{ margin: 0 }}>
                <div className={s.cardTitle}>
                  <Tag size={16} />
                  {currentAnimal.tagSerial || currentAnimal.animalCode}
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 400, marginLeft: '0.5rem' }}>
                    {currentAnimal.species} · {currentAnimal.sex} {currentAnimal.breed && `· ${currentAnimal.breed}`}
                  </span>
                </div>

                <div className={s.inspTabs}>
                  {([
                    { key: 'tag',     icon: Tag,           label: 'Tag Scan',    done: currentData.tabComplete.tag    },
                    { key: 'health',  icon: Activity,      label: 'Clinical',    done: currentData.tabComplete.health },
                    { key: 'disease', icon: ShieldAlert,   label: 'Diseases',    done: Object.keys(currentData.diseaseChecks).length > 0 },
                    { key: 'vacc',    icon: Syringe,       label: 'Vaccination', done: currentData.tabComplete.vacc   },
                    { key: 'result',  icon: ClipboardCheck,label: 'Result',      done: currentData.tabComplete.result },
                  ] as { key: AnimalTab; icon: React.ComponentType<{size?: number}>; label: string; done: boolean }[]).map(t => (
                    <button
                      key={t.key}
                      className={`${s.inspTab} ${animalTab === t.key ? s.inspTabActive : ''} ${t.done ? s.inspTabDone : ''}`}
                      onClick={() => setAnimalTab(t.key)}
                    >
                      <t.icon size={13} />
                      {t.label}
                      {t.done && <CheckCircle size={12} />}
                    </button>
                  ))}
                </div>

                {animalTab === 'tag'    && <TagPanel     animal={currentAnimal} inspection={inspection} data={currentData} onChange={p => patchAnimal(currentAnimal.id, p)} />}
                {animalTab === 'health' && <HealthPanel  data={currentData} animal={currentAnimal} onChange={p => patchAnimal(currentAnimal.id, p)} />}
                {animalTab === 'disease'&& <DiseasePanel data={currentData} animal={currentAnimal} onChange={p => patchAnimal(currentAnimal.id, p)} />}
                {animalTab === 'vacc'   && <VaccPanel    animal={currentAnimal} data={currentData}   onChange={p => patchAnimal(currentAnimal.id, p)} />}
                {animalTab === 'result' && <ResultPanel  data={currentData} onChange={p => patchAnimal(currentAnimal.id, p)} />}

                <div className={s.footer}>
                  <button
                    className={s.btnSecondary}
                    onClick={() => {
                      if (currentAnimalIdx > 0) { setCurrentIdx(currentAnimalIdx - 1); setAnimalTab('tag'); }
                      else setStep('VEHICLE');
                    }}
                  >
                    <ChevronLeft size={14} /> {currentAnimalIdx === 0 ? 'Vehicle' : 'Previous'}
                  </button>
                  <button className={s.btnPrimary} onClick={() => void handleAnimalNext()}>
                    {currentAnimalIdx < animals.length - 1 ? 'Save & Next Animal' : 'Save & Review Decision'} <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── DECISION ── */}
        {step === 'DECISION' && (
          <div className={s.card}>
            <div className={s.cardTitle}><Send size={18} /> Overall Inspection Decision</div>

            <div className={s.section}>
              <div className={s.sectionLabel}>Inspection Summary</div>
              <div className={s.infoGrid}>
                <div className={s.infoRow}><span className={s.infoKey}>Animals in request</span><span className={s.infoVal}>{inspection.animalCount}</span></div>
                <div className={s.infoRow}><span className={s.infoKey}>Animals inspected</span><span className={s.infoVal}>{animalsDone}</span></div>
                <div className={s.infoRow}><span className={s.infoKey}>Fit for movement</span><span className={s.infoVal} style={{ color: '#16a34a', fontWeight: 700 }}>{Object.values(animalData).filter(d => d.animalResult === 'FIT_FOR_MOVEMENT' || d.animalResult === 'CONDITIONALLY_FIT').length}</span></div>
                <div className={s.infoRow}><span className={s.infoKey}>Unfit / excluded</span><span className={s.infoVal} style={{ color: '#dc2626', fontWeight: 700 }}>{Object.values(animalData).filter(d => d.animalResult === 'UNFIT_FOR_MOVEMENT' || d.animalResult === 'EXCLUDED').length}</span></div>
                <div className={s.infoRow}><span className={s.infoKey}>Vehicle status</span><span className={s.infoVal}>{inspection.vehicleInspection?.cleanliness || vehicleData.cleanliness || '—'}</span></div>
              </div>
            </div>

            <div className={s.section}>
              <label className={s.label}>Overall Decision</label>
              <div className={s.resultGrid}>
                {OVERALL_DECISIONS.map(d => (
                  <button
                    key={d.val}
                    type="button"
                    className={`${s.resultBtn} ${overallDecision === d.val ? s.resultBtnSelected : ''}`}
                    onClick={() => setDecision(d.val)}
                  >
                    <div className={s.resultBtnLabel}>{d.label}</div>
                    <div className={s.resultBtnSub}>{d.sub}</div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 2 }}>→ {d.outcome}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className={s.fieldGroup}>
              <label className={s.label}>Overall Notes / Conditions on Permit</label>
              <textarea
                className={s.textarea}
                rows={3}
                value={overallNotes}
                onChange={e => setOverallNotes(e.target.value)}
                placeholder="Any conditions to be printed on the permit, health observations, instructions for destination officer…"
              />
            </div>

            <div className={s.toggleRow} onClick={() => setDeclaration(!declaration)}>
              <span className={s.toggleLabel}>
                I declare that this inspection was conducted in person, all findings are accurate, and I am authorised to submit this report.
              </span>
              <div className={`${s.toggle} ${declaration ? s.toggleOn : ''}`} />
            </div>

            <div className={s.footer}>
              <button className={s.btnSecondary} onClick={() => setStep('ANIMALS')}><ChevronLeft size={14} /> Animals</button>
              <button
                className={s.btnPrimary}
                disabled={!overallDecision || !declaration || submitting}
                onClick={() => void handleSubmit()}
              >
                {submitting ? <Loader2 size={14} className={s.spinner} /> : <Send size={14} />}
                Submit Inspection Report
              </button>
            </div>
            {submitError && <div className={s.alertErr} style={{ marginTop: '0.5rem' }}><XCircle size={14} /> {submitError}</div>}
          </div>
        )}

        {/* ── SUBMIT ── */}
        {step === 'SUBMIT' && (
          <div className={s.card} style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
            {inspection.overallDecision === 'PASS' || inspection.overallDecision === 'PARTIAL_PASS'
              ? <CheckCircle size={48} color="#16a34a" style={{ margin: '0 auto 1rem' }} />
              : inspection.overallDecision === 'DISEASE_SUSPECTED' || inspection.overallDecision === 'FAIL'
              ? <XCircle size={48} color="#dc2626" style={{ margin: '0 auto 1rem' }} />
              : <AlertTriangle size={48} color="#d97706" style={{ margin: '0 auto 1rem' }} />
            }
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0d1f2d', marginBottom: '0.5rem' }}>
              Inspection Submitted
            </div>
            <div style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '0.35rem' }}>
              {inspection.inspectionCode} · Decision: <strong>{inspection.overallDecision}</strong>
            </div>
            {inspection.submittedAt && (
              <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
                Submitted {new Date(inspection.submittedAt).toLocaleString()}
              </div>
            )}
            {(inspection.overallDecision === 'PASS' || inspection.overallDecision === 'PARTIAL_PASS') && (
              <div className={s.alertInfo} style={{ textAlign: 'left' }}>
                <CheckCircle size={16} style={{ flexShrink: 0 }} />
                A movement permit has been issued. The Ministry officer can print the permit from the Ministry Portal.
              </div>
            )}
            <button className={s.btnSecondary} style={{ marginTop: '1rem' }} onClick={() => navigate(-1)}>
              <ArrowLeft size={14} /> Back to Inspections
            </button>
          </div>
        )}

      </main>
    </div>
  );
}

export default InspectionWorkflowPage;
