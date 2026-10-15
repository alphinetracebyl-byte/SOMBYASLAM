import { useState } from 'react';
import {
  Biohazard, Plus, CheckCircle, ChevronRight,
  FlaskConical, ClipboardList, Eye,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import s from './disease-reporting.module.css';

// ─── Domain types ────────────────────────────────────────────────────────────

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
type CaseStatus =
  | 'REPORTED'
  | 'UNDER_INVESTIGATION'
  | 'SAMPLES_SENT'
  | 'CONFIRMED'
  | 'CONTROL_ACTIVE'
  | 'CLEARED'
  | 'CLOSED';

type ActionKind = 'visit' | 'sample' | 'control';
type RightMode = 'detail' | 'new-report';

type Genuineness = 'Genuine' | 'Not a Case' | 'Inconclusive';
type PreAssessment = 'Suspected' | 'Confirmed field case' | 'Not likely';

interface DiseaseCase {
  id: string;
  code: string;
  risk: RiskLevel;
  status: CaseStatus;
  species: string[];
  affectedCount: number;
  district: string;
  region: string;
  onsetDate: string;
  reportedAt: string;
  symptoms: string[];
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_CASES: DiseaseCase[] = [
  {
    id: '1',
    code: 'DIS-2026-00041',
    risk: 'HIGH',
    status: 'UNDER_INVESTIGATION',
    species: ['Cattle', 'Goat'],
    affectedCount: 34,
    district: 'Bay district',
    region: 'Bay',
    onsetDate: '2026-07-29',
    reportedAt: '2026-08-01',
    symptoms: ['Fever', 'Vesicular lesions', 'Lameness', 'Salivation'],
  },
  {
    id: '2',
    code: 'DIS-2026-00037',
    risk: 'HIGH',
    status: 'CONFIRMED',
    species: ['Cattle'],
    affectedCount: 18,
    district: 'Bay district',
    region: 'Bay',
    onsetDate: '2026-07-25',
    reportedAt: '2026-07-29',
    symptoms: ['Respiratory distress', 'Nasal discharge', 'Coughing', 'Fever'],
  },
  {
    id: '3',
    code: 'DIS-2026-00035',
    risk: 'MEDIUM',
    status: 'SAMPLES_SENT',
    species: ['Camel'],
    affectedCount: 7,
    district: 'Bakool district',
    region: 'Bakool',
    onsetDate: '2026-07-24',
    reportedAt: '2026-07-27',
    symptoms: ['Skin lesions', 'Weight loss', 'Ulcers on mouth'],
  },
  {
    id: '4',
    code: 'DIS-2026-00029',
    risk: 'MEDIUM',
    status: 'CONTROL_ACTIVE',
    species: ['Cattle'],
    affectedCount: 52,
    district: 'Bay district',
    region: 'Bay',
    onsetDate: '2026-07-17',
    reportedAt: '2026-07-20',
    symptoms: ['Fever', 'Swollen lymph nodes', 'Milk drop', 'Mastitis'],
  },
  {
    id: '5',
    code: 'DIS-2026-00021',
    risk: 'LOW',
    status: 'CLEARED',
    species: ['Goat'],
    affectedCount: 11,
    district: 'Bakool district',
    region: 'Bakool',
    onsetDate: '2026-06-10',
    reportedAt: '2026-06-14',
    symptoms: ['Diarrhoea', 'Weakness', 'Dehydration'],
  },
  {
    id: '6',
    code: 'DIS-2026-00008',
    risk: 'LOW',
    status: 'CLOSED',
    species: ['Sheep'],
    affectedCount: 4,
    district: 'Bay district',
    region: 'Bay',
    onsetDate: '2026-04-28',
    reportedAt: '2026-05-02',
    symptoms: ['Coughing', 'Mild fever'],
  },
];

const STATUS_LABELS: Record<CaseStatus, string> = {
  REPORTED: 'Reported',
  UNDER_INVESTIGATION: 'Under Investigation',
  SAMPLES_SENT: 'Samples Sent',
  CONFIRMED: 'Confirmed',
  CONTROL_ACTIVE: 'Control Active',
  CLEARED: 'Cleared',
  CLOSED: 'Closed',
};

const FILTER_CHIPS: Array<{ key: CaseStatus | 'ALL'; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'REPORTED', label: 'Reported' },
  { key: 'UNDER_INVESTIGATION', label: 'Under Investigation' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'CONTROL_ACTIVE', label: 'Control Active' },
  { key: 'CLEARED', label: 'Cleared' },
];

const TIMELINE_STAGES = [
  'Reported',
  'Under Investigation',
  'On-site Visit',
  'Samples Sent',
  'Lab Testing',
  'Confirmed / Not a Case',
  'Control Active',
  'Clearance Testing',
  'Cleared',
];

const STATUS_TO_STAGE_INDEX: Record<CaseStatus, number> = {
  REPORTED: 0,
  UNDER_INVESTIGATION: 1,
  SAMPLES_SENT: 3,
  CONFIRMED: 5,
  CONTROL_ACTIVE: 6,
  CLEARED: 8,
  CLOSED: 8,
};

const ACTION_TYPES = [
  'Movement Control',
  'Quarantine & Isolation',
  'Surveillance',
  'Sample Testing',
  'Disinfection & Biosecurity',
  'Controlled Disposal',
  'Vaccination',
  'Public Awareness',
];

const SAMPLE_TYPES = ['Blood', 'Swab', 'Tissue', 'Faeces', 'Other'];
const LABS = ['Mogadishu Regional Vet Lab', 'Hargeisa Vet Lab', 'Garowe Vet Lab'];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: CaseStatus }) {
  return (
    <span className={`${s.badge} ${s['badge_' + status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function RiskBadge({ risk }: { risk: RiskLevel }) {
  return (
    <span className={`${s.riskBadge} ${s['risk_' + risk]}`}>
      {risk}
    </span>
  );
}

// ─── Visit form ───────────────────────────────────────────────────────────────

interface VisitFormState {
  findings: string;
  differentialDiagnosis: string;
  adviceGiven: string;
  samplesCollected: boolean | null;
  genuineness: Genuineness | '';
}

function VisitForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState<VisitFormState>({
    findings: '',
    differentialDiagnosis: '',
    adviceGiven: '',
    samplesCollected: null,
    genuineness: '',
  });

  const set =
    (k: keyof VisitFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }));

  const canSubmit =
    form.findings.trim() !== '' &&
    form.genuineness !== '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) onSuccess();
  };

  return (
    <form className={s.actionForm} onSubmit={handleSubmit}>
      <div className={s.actionFormTitle}>Log On-site Visit</div>
      <div className={s.field}>
        <label className={s.label}>Clinical Findings <span className={s.req}>*</span></label>
        <textarea
          className={s.textarea}
          rows={3}
          value={form.findings}
          onChange={set('findings')}
          placeholder="Describe clinical findings observed on site"
        />
      </div>
      <div className={s.field}>
        <label className={s.label}>Differential Diagnosis</label>
        <input
          className={s.input}
          value={form.differentialDiagnosis}
          onChange={set('differentialDiagnosis')}
          placeholder="e.g. FMD, CBPP, PPR"
        />
      </div>
      <div className={s.field}>
        <label className={s.label}>Advice Given to Farmer</label>
        <textarea
          className={s.textarea}
          rows={2}
          value={form.adviceGiven}
          onChange={set('adviceGiven')}
          placeholder="Biosecurity measures, isolation instructions, etc."
        />
      </div>
      <div className={s.field}>
        <label className={s.label}>Samples Collected?</label>
        <div className={s.toggleRow}>
          <button
            type="button"
            className={`${s.toggleBtn}${form.samplesCollected === true ? ' ' + s.toggleBtnActive : ''}`}
            onClick={() => setForm(p => ({ ...p, samplesCollected: true }))}
          >
            Yes
          </button>
          <button
            type="button"
            className={`${s.toggleBtn}${form.samplesCollected === false ? ' ' + s.toggleBtnActive : ''}`}
            onClick={() => setForm(p => ({ ...p, samplesCollected: false }))}
          >
            No
          </button>
        </div>
      </div>
      <div className={s.field}>
        <label className={s.label}>Genuineness Assessment <span className={s.req}>*</span></label>
        <select className={s.select} value={form.genuineness} onChange={set('genuineness')}>
          <option value="">Select assessment</option>
          <option value="Genuine">Genuine</option>
          <option value="Not a Case">Not a Case</option>
          <option value="Inconclusive">Inconclusive</option>
        </select>
      </div>
      <div className={s.actionFormFooter}>
        <button type="submit" className={s.submitBtn} disabled={!canSubmit}>
          Submit Visit Log
        </button>
      </div>
    </form>
  );
}

// ─── Sample collection form ───────────────────────────────────────────────────

interface SampleFormState {
  sampleType: string;
  sampleCode: string;
  lab: string;
  coldChain: boolean | null;
}

function SampleForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState<SampleFormState>({
    sampleType: '',
    sampleCode: 'SAMP-2026-',
    lab: '',
    coldChain: null,
  });

  const set =
    (k: keyof SampleFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }));

  const canSubmit =
    form.sampleType !== '' &&
    form.sampleCode.length > 10 &&
    form.lab !== '' &&
    form.coldChain !== null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) onSuccess();
  };

  return (
    <form className={s.actionForm} onSubmit={handleSubmit}>
      <div className={s.actionFormTitle}>Log Sample Collection</div>
      <div className={s.field}>
        <label className={s.label}>Sample Type <span className={s.req}>*</span></label>
        <select className={s.select} value={form.sampleType} onChange={set('sampleType')}>
          <option value="">Select type</option>
          {SAMPLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className={s.field}>
        <label className={s.label}>Sample Code <span className={s.req}>*</span></label>
        <input
          className={s.input}
          value={form.sampleCode}
          onChange={set('sampleCode')}
          placeholder="SAMP-2026-XXXXX"
        />
      </div>
      <div className={s.field}>
        <label className={s.label}>Dispatching Lab <span className={s.req}>*</span></label>
        <select className={s.select} value={form.lab} onChange={set('lab')}>
          <option value="">Select lab</option>
          {LABS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>
      <div className={s.field}>
        <label className={s.label}>Cold Chain Maintained? <span className={s.req}>*</span></label>
        <div className={s.toggleRow}>
          <button
            type="button"
            className={`${s.toggleBtn}${form.coldChain === true ? ' ' + s.toggleBtnActive : ''}`}
            onClick={() => setForm(p => ({ ...p, coldChain: true }))}
          >
            Yes
          </button>
          <button
            type="button"
            className={`${s.toggleBtn}${form.coldChain === false ? ' ' + s.toggleBtnActive : ''}`}
            onClick={() => setForm(p => ({ ...p, coldChain: false }))}
          >
            No
          </button>
        </div>
      </div>
      <div className={s.actionFormFooter}>
        <button type="submit" className={s.submitBtn} disabled={!canSubmit}>
          Register Sample
        </button>
      </div>
    </form>
  );
}

// ─── Control action form ──────────────────────────────────────────────────────

interface ControlFormState {
  actionType: string;
  notes: string;
}

function ControlForm({ onSuccess, socialWorkerOnly }: { onSuccess: () => void; socialWorkerOnly?: boolean }) {
  const availableTypes = socialWorkerOnly
    ? ['Public Awareness']
    : ACTION_TYPES;

  const [form, setForm] = useState<ControlFormState>({
    actionType: socialWorkerOnly ? 'Public Awareness' : '',
    notes: '',
  });

  const set =
    (k: keyof ControlFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }));

  const canSubmit = form.actionType !== '' && form.notes.trim() !== '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) onSuccess();
  };

  return (
    <form className={s.actionForm} onSubmit={handleSubmit}>
      <div className={s.actionFormTitle}>Log Control Action</div>
      <div className={s.field}>
        <label className={s.label}>Action Type <span className={s.req}>*</span></label>
        <select
          className={s.select}
          value={form.actionType}
          onChange={set('actionType')}
          disabled={socialWorkerOnly}
        >
          {!socialWorkerOnly && <option value="">Select action type</option>}
          {availableTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className={s.field}>
        <label className={s.label}>Notes <span className={s.req}>*</span></label>
        <textarea
          className={s.textarea}
          rows={3}
          value={form.notes}
          onChange={set('notes')}
          placeholder="Describe the control action taken"
        />
      </div>
      <div className={s.actionFormFooter}>
        <button type="submit" className={s.submitBtn} disabled={!canSubmit}>
          Record Action
        </button>
      </div>
    </form>
  );
}

// ─── Case detail panel ────────────────────────────────────────────────────────

interface CaseDetailProps {
  caseData: DiseaseCase;
  roles: string[];
  activeAction: ActionKind | null;
  actionSuccess: string | null;
  onSetActiveAction: (a: ActionKind | null) => void;
  onActionSuccess: (msg: string) => void;
}

function CaseDetail({
  caseData,
  roles,
  activeAction,
  actionSuccess,
  onSetActiveAction,
  onActionSuccess,
}: CaseDetailProps) {
  const isFieldInspector = roles.includes('FIELD_INSPECTOR');
  const isVetOfficer = roles.includes('VETERINARY_OFFICER');
  const isSocialWorker = roles.includes('SOCIAL_WORKER');

  const stageIndex = STATUS_TO_STAGE_INDEX[caseData.status];

  const handleActionSuccess = (msg: string) => {
    onSetActiveAction(null);
    onActionSuccess(msg);
  };

  return (
    <div className={s.detailPanel}>
      {actionSuccess && (
        <div className={s.successBanner}>
          <CheckCircle size={15} />
          {actionSuccess}
        </div>
      )}

      {/* Header */}
      <div className={s.detailHeader}>
        <div className={s.detailCode}>{caseData.code}</div>
        <div className={s.detailBadges}>
          <StatusBadge status={caseData.status} />
          <RiskBadge risk={caseData.risk} />
        </div>
      </div>

      {/* Key info grid */}
      <div className={s.infoGrid}>
        <div className={s.infoItem}>
          <div className={s.infoLabel}>Species</div>
          <div className={s.infoValue}>{caseData.species.join(', ')}</div>
        </div>
        <div className={s.infoItem}>
          <div className={s.infoLabel}>Affected Count</div>
          <div className={s.infoValue}>{caseData.affectedCount} animals</div>
        </div>
        <div className={s.infoItem}>
          <div className={s.infoLabel}>Onset Date</div>
          <div className={s.infoValue}>{caseData.onsetDate}</div>
        </div>
        <div className={s.infoItem}>
          <div className={s.infoLabel}>Reported At</div>
          <div className={s.infoValue}>{caseData.reportedAt}</div>
        </div>
        <div className={s.infoItem} style={{ gridColumn: '1 / -1' }}>
          <div className={s.infoLabel}>Symptoms</div>
          <div className={s.infoValue}>{caseData.symptoms.join(', ')}</div>
        </div>
      </div>

      {/* Timeline */}
      <div className={s.timelineSection}>
        <div className={s.timelineSectionLabel}>Case Progress</div>
        <div className={s.timeline}>
          {TIMELINE_STAGES.map((stage, i) => {
            const isPast = i < stageIndex;
            const isCurrent = i === stageIndex;
            const isFuture = i > stageIndex;
            return (
              <div
                key={stage}
                className={`${s.timelineItem}${isCurrent ? ' ' + s.timelineItemCurrent : ''}${isPast ? ' ' + s.timelineItemPast : ''}`}
              >
                <div className={`${s.timelineDot}${isCurrent ? ' ' + s.timelineDotCurrent : ''}${isPast ? ' ' + s.timelineDotPast : ''}`} />
                {i < TIMELINE_STAGES.length - 1 && (
                  <div className={`${s.timelineConnector}${isPast || isCurrent ? ' ' + s.timelineConnectorActive : ''}`} />
                )}
                <div
                  className={`${s.timelineLabel}${isCurrent ? ' ' + s.timelineLabelCurrent : ''}${isFuture ? ' ' + s.timelineLabelFuture : ''}`}
                >
                  {stage}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Role-based action buttons */}
      <div className={s.actionsSection}>
        <div className={s.actionsSectionLabel}>Actions</div>
        <div className={s.actionBtns}>
          {(isFieldInspector || isVetOfficer) && (
            <button
              className={`${s.actionBtn}${activeAction === 'visit' ? ' ' + s.actionBtnActive : ''}`}
              onClick={() => onSetActiveAction(activeAction === 'visit' ? null : 'visit')}
            >
              <Eye size={14} strokeWidth={1.75} />
              Log On-site Visit
            </button>
          )}
          {isVetOfficer && (
            <button
              className={`${s.actionBtn}${activeAction === 'sample' ? ' ' + s.actionBtnActive : ''}`}
              onClick={() => onSetActiveAction(activeAction === 'sample' ? null : 'sample')}
            >
              <FlaskConical size={14} strokeWidth={1.75} />
              Log Sample Collection
            </button>
          )}
          {(isFieldInspector || isVetOfficer || isSocialWorker) && (
            <button
              className={`${s.actionBtn}${activeAction === 'control' ? ' ' + s.actionBtnActive : ''}`}
              onClick={() => onSetActiveAction(activeAction === 'control' ? null : 'control')}
            >
              <ClipboardList size={14} strokeWidth={1.75} />
              Log Control Action
            </button>
          )}
        </div>

        {/* Inline action forms */}
        {activeAction === 'visit' && (
          <VisitForm onSuccess={() => handleActionSuccess('Visit logged successfully')} />
        )}
        {activeAction === 'sample' && (
          <SampleForm onSuccess={() => handleActionSuccess('Sample registered. Dispatched to lab.')} />
        )}
        {activeAction === 'control' && (
          <ControlForm
            socialWorkerOnly={isSocialWorker && !isFieldInspector && !isVetOfficer}
            onSuccess={() => handleActionSuccess('Control action recorded')}
          />
        )}
      </div>
    </div>
  );
}

// ─── New report form ──────────────────────────────────────────────────────────

interface NewReportFormState {
  species: string[];
  affectedCount: string;
  symptomsObserved: string;
  onsetDate: string;
  clinicalAssessment: string;
  premisesCode: string;
  preAssessment: PreAssessment | '';
}

const SPECIES_OPTIONS = ['Cattle', 'Camel', 'Goat', 'Sheep'];

interface NewReportFormProps {
  onSuccess: (code: string) => void;
}

function NewReportForm({ onSuccess }: NewReportFormProps) {
  const [form, setForm] = useState<NewReportFormState>({
    species: [],
    affectedCount: '',
    symptomsObserved: '',
    onsetDate: '',
    clinicalAssessment: '',
    premisesCode: '',
    preAssessment: '',
  });

  const toggleSpecies = (sp: string) => {
    setForm(p => ({
      ...p,
      species: p.species.includes(sp) ? p.species.filter(s => s !== sp) : [...p.species, sp],
    }));
  };

  const set =
    (k: keyof NewReportFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }));

  const canSubmit =
    form.species.length > 0 &&
    form.affectedCount !== '' &&
    form.symptomsObserved.trim() !== '' &&
    form.onsetDate !== '' &&
    form.preAssessment !== '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) {
      const seq = String(Math.floor(40000 + Math.random() * 9999)).padStart(5, '0');
      onSuccess(`DIS-2026-${seq}`);
    }
  };

  return (
    <form className={s.newReportForm} onSubmit={handleSubmit}>
      <div className={s.newReportTitle}>
        <Biohazard size={16} color="#dc2626" />
        New Disease Report
      </div>

      <div className={s.field}>
        <label className={s.label}>Species Affected <span className={s.req}>*</span></label>
        <div className={s.checkboxRow}>
          {SPECIES_OPTIONS.map(sp => (
            <label key={sp} className={`${s.checkChip}${form.species.includes(sp) ? ' ' + s.checkChipActive : ''}`}>
              <input
                type="checkbox"
                className={s.hidden}
                checked={form.species.includes(sp)}
                onChange={() => toggleSpecies(sp)}
              />
              {sp}
            </label>
          ))}
        </div>
      </div>

      <div className={s.formGrid}>
        <div className={s.field}>
          <label className={s.label}>Affected Count <span className={s.req}>*</span></label>
          <input
            className={s.input}
            type="number"
            min="1"
            value={form.affectedCount}
            onChange={set('affectedCount')}
            placeholder="Number of animals"
          />
        </div>
        <div className={s.field}>
          <label className={s.label}>Onset Date <span className={s.req}>*</span></label>
          <input
            className={s.input}
            type="date"
            value={form.onsetDate}
            onChange={set('onsetDate')}
          />
        </div>
      </div>

      <div className={s.field}>
        <label className={s.label}>Symptoms Observed <span className={s.req}>*</span></label>
        <textarea
          className={s.textarea}
          rows={3}
          value={form.symptomsObserved}
          onChange={set('symptomsObserved')}
          placeholder="Describe clinical signs observed: fever, lesions, discharge, behaviour changes, etc."
        />
      </div>

      <div className={s.field}>
        <label className={s.label}>Clinical Assessment</label>
        <textarea
          className={s.textarea}
          rows={3}
          value={form.clinicalAssessment}
          onChange={set('clinicalAssessment')}
          placeholder="Field officer or veterinary assessment notes"
        />
      </div>

      <div className={s.formGrid}>
        <div className={s.field}>
          <label className={s.label}>Premises Code</label>
          <input
            className={s.input}
            value={form.premisesCode}
            onChange={set('premisesCode')}
            placeholder="e.g. PR-0082"
          />
        </div>
        <div className={s.field}>
          <label className={s.label}>Genuineness Pre-Assessment <span className={s.req}>*</span></label>
          <select className={s.select} value={form.preAssessment} onChange={set('preAssessment')}>
            <option value="">Select assessment</option>
            <option value="Suspected">Suspected</option>
            <option value="Confirmed field case">Confirmed field case</option>
            <option value="Not likely">Not likely</option>
          </select>
        </div>
      </div>

      <div className={s.newReportFooter}>
        <button type="submit" className={s.reportSubmitBtn} disabled={!canSubmit}>
          Submit Disease Report
        </button>
      </div>
    </form>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function DiseaseReportingPage(): JSX.Element {
  const { roles, regionCode, districtCode } = useAuthStore();

  const territory = [regionCode, districtCode].filter(Boolean).join(' / ') || 'Somalia';

  const [selectedCase, setSelectedCase]     = useState<DiseaseCase | null>(null);
  const [rightMode, setRightMode]           = useState<RightMode>('detail');
  const [activeAction, setActiveAction]     = useState<ActionKind | null>(null);
  const [actionSuccess, setActionSuccess]   = useState<string | null>(null);
  const [statusFilter, setStatusFilter]     = useState<CaseStatus | 'ALL'>('ALL');
  const [newReportCode, setNewReportCode]   = useState<string | null>(null);

  const filteredCases =
    statusFilter === 'ALL'
      ? MOCK_CASES
      : MOCK_CASES.filter(c => c.status === statusFilter);

  const handleSelectCase = (c: DiseaseCase) => {
    setSelectedCase(c);
    setRightMode('detail');
    setActiveAction(null);
    setActionSuccess(null);
    setNewReportCode(null);
  };

  const handleNewReport = () => {
    setRightMode('new-report');
    setSelectedCase(null);
    setActiveAction(null);
    setActionSuccess(null);
    setNewReportCode(null);
  };

  const handleSetActiveAction = (a: ActionKind | null) => {
    setActiveAction(a);
    setActionSuccess(null);
  };

  const handleReportSuccess = (code: string) => {
    setNewReportCode(code);
  };

  return (
    <div className={s.page}>

      {/* Left panel — case list */}
      <div className={s.leftPanel}>
        <div className={s.listHeader}>
          <div>
            <h1 className={s.pageTitle}>Disease Cases</h1>
            <p className={s.pageSub}>{territory}</p>
          </div>
          <button className={s.newReportBtn} onClick={handleNewReport}>
            <Plus size={14} strokeWidth={2.5} />
            New Report
          </button>
        </div>

        {/* Filter chips */}
        <div className={s.filterRow}>
          {FILTER_CHIPS.map(chip => (
            <button
              key={chip.key}
              className={`${s.filterChip}${statusFilter === chip.key ? ' ' + s.filterChipActive : ''}`}
              onClick={() => setStatusFilter(chip.key as CaseStatus | 'ALL')}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Case list */}
        <div className={s.caseList}>
          {filteredCases.length === 0 ? (
            <div className={s.emptyState}>No cases match the selected filter.</div>
          ) : (
            filteredCases.map(c => (
              <button
                key={c.id}
                className={`${s.caseItem}${selectedCase?.id === c.id ? ' ' + s.caseItemSelected : ''}`}
                onClick={() => handleSelectCase(c)}
              >
                <div className={s.caseItemTop}>
                  <span className={s.caseCode}>{c.code}</span>
                  <div className={s.caseItemBadges}>
                    <RiskBadge risk={c.risk} />
                    <StatusBadge status={c.status} />
                  </div>
                </div>
                <div className={s.caseItemMeta}>
                  <span className={s.caseMeta}>{c.species.join(', ')}</span>
                  <span className={s.caseMeta}>{c.district}</span>
                  <span className={s.caseMeta}>{c.reportedAt}</span>
                </div>
                <ChevronRight size={14} className={s.caseArrow} />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className={s.rightPanel}>
        {rightMode === 'new-report' ? (
          <div className={s.rightCard}>
            {newReportCode ? (
              <div className={s.reportSuccessBanner}>
                <CheckCircle size={18} />
                <div>
                  <div className={s.reportSuccessTitle}>Report submitted successfully</div>
                  <div className={s.reportSuccessCode}>Case reference: <strong>{newReportCode}</strong></div>
                </div>
              </div>
            ) : null}
            <NewReportForm onSuccess={handleReportSuccess} />
          </div>
        ) : selectedCase ? (
          <div className={s.rightCard}>
            <CaseDetail
              caseData={selectedCase}
              roles={roles}
              activeAction={activeAction}
              actionSuccess={actionSuccess}
              onSetActiveAction={handleSetActiveAction}
              onActionSuccess={setActionSuccess}
            />
          </div>
        ) : (
          <div className={s.emptyDetail}>
            <Biohazard size={32} color="#cbd5e1" strokeWidth={1.25} />
            <div className={s.emptyDetailTitle}>Select a case to view details</div>
            <div className={s.emptyDetailSub}>
              Choose a disease case from the list, or click New Report to file a new report.
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export default DiseaseReportingPage;
