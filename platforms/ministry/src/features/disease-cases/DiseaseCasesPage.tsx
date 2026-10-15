import { useState } from 'react';
import {
  Biohazard, X, CheckCircle, AlertTriangle, Search,
  ChevronDown, Bell, FileCheck, Shield,
} from 'lucide-react';
import s from './disease-cases.module.css';

/* ── Types ─────────────────────────────────────────────────────── */
type Risk   = 'LOW' | 'MEDIUM' | 'HIGH';
type Status =
  | 'REPORTED' | 'UNDER_INVESTIGATION' | 'SAMPLES_SENT' | 'LAB_RESULT_PENDING'
  | 'CONFIRMED' | 'ESCALATED' | 'CONTROL_ACTIVE' | 'CLEARANCE_TESTING'
  | 'CLEARED' | 'CLOSED' | 'NOT_A_CASE';

interface DiseaseCase {
  id: string;
  caseCode: string;
  risk: Risk;
  status: Status;
  species: string[];
  region: string;
  reportedAt: string;
  onsetDate: string;
  affectedCount: number;
  symptoms: string[];
  assignedVet: string;
}

type ActionKind = 'assign-team' | 'approve-plan' | 'issue-notification' | 'clearance' | null;

/* ── Mock data ─────────────────────────────────────────────────── */
const MOCK_CASES: DiseaseCase[] = [
  { id: '1',  caseCode: 'DIS-2026-00041', risk: 'HIGH',   status: 'UNDER_INVESTIGATION', species: ['Cattle','Goat'],   region: 'Bay',            reportedAt: '2026-08-01', onsetDate: '2026-07-29', affectedCount: 34, symptoms: ['Fever','Vesicular lesions','Lameness'],         assignedVet: 'Dr. Amina Yusuf' },
  { id: '2',  caseCode: 'DIS-2026-00040', risk: 'HIGH',   status: 'CONFIRMED',           species: ['Cattle'],           region: 'Lower Shabelle', reportedAt: '2026-07-31', onsetDate: '2026-07-28', affectedCount: 51, symptoms: ['Respiratory distress','Nasal discharge','Cough'], assignedVet: 'Dr. Hassan Ali' },
  { id: '3',  caseCode: 'DIS-2026-00039', risk: 'MEDIUM', status: 'CONTROL_ACTIVE',      species: ['Camel'],            region: 'Jubbaland',      reportedAt: '2026-07-30', onsetDate: '2026-07-26', affectedCount: 12, symptoms: ['Skin lesions','Weight loss'],                    assignedVet: 'Dr. Fadumo Said' },
  { id: '4',  caseCode: 'DIS-2026-00038', risk: 'HIGH',   status: 'LAB_RESULT_PENDING',  species: ['Cattle','Sheep'],   region: 'Puntland',       reportedAt: '2026-07-30', onsetDate: '2026-07-27', affectedCount: 28, symptoms: ['Fever','Swollen lymph nodes','Milk drop'],       assignedVet: 'Dr. Omar Warsame' },
  { id: '5',  caseCode: 'DIS-2026-00037', risk: 'HIGH',   status: 'ESCALATED',           species: ['Cattle'],           region: 'Bay',            reportedAt: '2026-07-29', onsetDate: '2026-07-25', affectedCount: 18, symptoms: ['Nasal discharge','Coughing','Fever'],            assignedVet: 'Dr. Amina Yusuf' },
  { id: '6',  caseCode: 'DIS-2026-00036', risk: 'MEDIUM', status: 'SAMPLES_SENT',        species: ['Goat'],             region: 'Somaliland',     reportedAt: '2026-07-28', onsetDate: '2026-07-24', affectedCount: 9,  symptoms: ['Diarrhoea','Weakness'],                         assignedVet: 'Dr. Ali Hassan' },
  { id: '7',  caseCode: 'DIS-2026-00035', risk: 'MEDIUM', status: 'UNDER_INVESTIGATION', species: ['Camel'],            region: 'Bakool',         reportedAt: '2026-07-27', onsetDate: '2026-07-23', affectedCount: 7,  symptoms: ['Ulcers on mouth','Weight loss'],                 assignedVet: 'Dr. Halimo Nur' },
  { id: '8',  caseCode: 'DIS-2026-00034', risk: 'LOW',    status: 'CLEARANCE_TESTING',   species: ['Sheep'],            region: 'Mogadishu',      reportedAt: '2026-07-25', onsetDate: '2026-07-20', affectedCount: 6,  symptoms: ['Mild fever','Lethargy'],                         assignedVet: 'Dr. Said Omar' },
  { id: '9',  caseCode: 'DIS-2026-00033', risk: 'LOW',    status: 'CLEARED',             species: ['Goat'],             region: 'Jubbaland',      reportedAt: '2026-07-20', onsetDate: '2026-07-15', affectedCount: 11, symptoms: ['Diarrhoea','Dehydration'],                      assignedVet: 'Dr. Fadumo Said' },
  { id: '10', caseCode: 'DIS-2026-00032', risk: 'MEDIUM', status: 'CONFIRMED',           species: ['Cattle'],           region: 'Bay',            reportedAt: '2026-07-18', onsetDate: '2026-07-14', affectedCount: 22, symptoms: ['Fever','Blisters','Lameness'],                   assignedVet: 'Dr. Amina Yusuf' },
  { id: '11', caseCode: 'DIS-2026-00031', risk: 'LOW',    status: 'CLOSED',              species: ['Sheep'],            region: 'Somaliland',     reportedAt: '2026-07-10', onsetDate: '2026-07-07', affectedCount: 3,  symptoms: ['Coughing'],                                     assignedVet: '—' },
  { id: '12', caseCode: 'DIS-2026-00030', risk: 'LOW',    status: 'NOT_A_CASE',          species: ['Goat'],             region: 'Puntland',       reportedAt: '2026-07-08', onsetDate: '2026-07-05', affectedCount: 2,  symptoms: ['Mild nasal discharge'],                         assignedVet: 'Dr. Omar Warsame' },
];

const STATUS_LABELS: Record<Status, string> = {
  REPORTED:             'Reported',
  UNDER_INVESTIGATION:  'Under Investigation',
  SAMPLES_SENT:         'Samples Sent',
  LAB_RESULT_PENDING:   'Lab Testing',
  CONFIRMED:            'Confirmed',
  ESCALATED:            'Escalated',
  CONTROL_ACTIVE:       'Control Active',
  CLEARANCE_TESTING:    'Clearance Testing',
  CLEARED:              'Cleared',
  CLOSED:               'Closed',
  NOT_A_CASE:           'Not a Case',
};

const STATUS_STYLE: Record<Status, { bg: string; color: string }> = {
  REPORTED:             { bg: '#f1f5f9', color: '#475569' },
  UNDER_INVESTIGATION:  { bg: '#eff6ff', color: '#1d4ed8' },
  SAMPLES_SENT:         { bg: '#f0f9ff', color: '#0369a1' },
  LAB_RESULT_PENDING:   { bg: '#fefce8', color: '#a16207' },
  CONFIRMED:            { bg: '#fef2f2', color: '#dc2626' },
  ESCALATED:            { bg: '#fdf4ff', color: '#9333ea' },
  CONTROL_ACTIVE:       { bg: '#fef2f2', color: '#dc2626' },
  CLEARANCE_TESTING:    { bg: '#fefce8', color: '#a16207' },
  CLEARED:              { bg: '#f0fdf4', color: '#16a34a' },
  CLOSED:               { bg: '#f1f5f9', color: '#475569' },
  NOT_A_CASE:           { bg: '#f0fdf4', color: '#16a34a' },
};

const RISK_STYLE: Record<Risk, { bg: string; color: string }> = {
  HIGH:   { bg: '#fef2f2', color: '#dc2626' },
  MEDIUM: { bg: '#fefce8', color: '#d97706' },
  LOW:    { bg: '#f0fdf4', color: '#16a34a' },
};

const TIMELINE_STAGES = [
  { label: 'Reported',            statuses: ['REPORTED'] as Status[] },
  { label: 'Under Investigation', statuses: ['UNDER_INVESTIGATION'] as Status[] },
  { label: 'Samples Sent',        statuses: ['SAMPLES_SENT', 'LAB_RESULT_PENDING'] as Status[] },
  { label: 'Lab Result',          statuses: [] as Status[] },
  { label: 'Confirmed / Closed',  statuses: ['CONFIRMED', 'NOT_A_CASE', 'CLOSED'] as Status[] },
  { label: 'Escalated',           statuses: ['ESCALATED'] as Status[] },
  { label: 'Control Active',      statuses: ['CONTROL_ACTIVE'] as Status[] },
  { label: 'Clearance Testing',   statuses: ['CLEARANCE_TESTING'] as Status[] },
  { label: 'Cleared',             statuses: ['CLEARED'] as Status[] },
];

const CONTROL_MEASURES = [
  'Movement Control',
  'Quarantine & Isolation',
  'Surveillance & Monitoring',
  'Sample Testing (Regular Intervals)',
  'Disinfection & Biosecurity',
  'Controlled Disposal',
  'Vaccination',
  'Public Awareness & Communication',
];

const REGIONS = ['All', 'Mogadishu', 'Bay', 'Bakool', 'Jubbaland', 'Puntland', 'Somaliland', 'Lower Shabelle'];
const STATUS_FILTERS: Array<{ key: Status | 'ALL'; label: string }> = [
  { key: 'ALL',                label: 'All'                },
  { key: 'REPORTED',           label: 'Reported'           },
  { key: 'UNDER_INVESTIGATION',label: 'Under Investigation'},
  { key: 'CONFIRMED',          label: 'Confirmed'          },
  { key: 'ESCALATED',          label: 'Escalated'          },
  { key: 'CONTROL_ACTIVE',     label: 'Control Active'     },
  { key: 'CLEARANCE_TESTING',  label: 'Clearance Testing'  },
  { key: 'CLEARED',            label: 'Cleared'            },
  { key: 'CLOSED',             label: 'Closed'             },
];
const RISK_FILTERS: Array<{ key: Risk | 'ALL'; label: string }> = [
  { key: 'ALL',    label: 'All Risk'  },
  { key: 'HIGH',   label: 'High'     },
  { key: 'MEDIUM', label: 'Medium'   },
  { key: 'LOW',    label: 'Low'      },
];

/* ── Sub-components ────────────────────────────────────────────── */
function StatusBadge({ status }: { status: Status }) {
  const { bg, color } = STATUS_STYLE[status];
  return (
    <span className={s.badge} style={{ background: bg, color }}>{STATUS_LABELS[status]}</span>
  );
}

function RiskBadge({ risk }: { risk: Risk }) {
  const { bg, color } = RISK_STYLE[risk];
  return <span className={s.riskBadge} style={{ background: bg, color }}>{risk}</span>;
}

/* ── Action forms ──────────────────────────────────────────────── */
function AssignTeamForm({ onSuccess }: { onSuccess: () => void }) {
  const [vet, setVet] = useState('');
  const [assistant, setAssistant] = useState('');
  const canSubmit = vet.trim() !== '';
  return (
    <div className={s.actionForm}>
      <div className={s.actionFormTitle}>Assign Veterinary Team</div>
      <div className={s.field}>
        <label className={s.label}>Lead Veterinarian <span className={s.req}>*</span></label>
        <input className={s.input} value={vet} onChange={e => setVet(e.target.value)} placeholder="Dr. Name" />
      </div>
      <div className={s.field}>
        <label className={s.label}>Assistant</label>
        <input className={s.input} value={assistant} onChange={e => setAssistant(e.target.value)} placeholder="Field officer name" />
      </div>
      <button className={s.actionSubmitBtn} disabled={!canSubmit} onClick={() => canSubmit && onSuccess()}>
        Assign Team
      </button>
    </div>
  );
}

function ApprovePlanForm({ onSuccess }: { onSuccess: () => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const toggle = (m: string) =>
    setSelected(p => p.includes(m) ? p.filter(x => x !== m) : [...p, m]);
  return (
    <div className={s.actionForm}>
      <div className={s.actionFormTitle}>Approve Control Plan</div>
      <div className={s.field}>
        <label className={s.label}>Control Measures to Activate</label>
        <div className={s.checkList}>
          {CONTROL_MEASURES.map(m => (
            <label key={m} className={s.checkRow}>
              <input type="checkbox" checked={selected.includes(m)} onChange={() => toggle(m)} />
              <span>{m}</span>
            </label>
          ))}
        </div>
      </div>
      <div className={s.field}>
        <label className={s.label}>Notes</label>
        <textarea className={s.textarea} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional instructions to field team" />
      </div>
      <button className={s.actionSubmitBtn} disabled={selected.length === 0} onClick={() => selected.length > 0 && onSuccess()}>
        Approve Control Plan
      </button>
    </div>
  );
}

function NotificationForm({ caseData, onSuccess }: { caseData: DiseaseCase; onSuccess: () => void }) {
  const [disease, setDisease] = useState('Foot and Mouth Disease');
  const [affectedRegions, setAffectedRegions] = useState(caseData.region);
  const [level, setLevel] = useState<'Regional' | 'National' | 'International'>('National');
  const [message, setMessage] = useState('');
  const canSubmit = disease.trim() !== '' && message.trim() !== '';
  return (
    <div className={s.actionForm}>
      <div className={s.actionFormTitle}>Issue National Notification</div>
      <div className={s.formGrid}>
        <div className={s.field}>
          <label className={s.label}>Disease Name <span className={s.req}>*</span></label>
          <input className={s.input} value={disease} onChange={e => setDisease(e.target.value)} />
        </div>
        <div className={s.field}>
          <label className={s.label}>Affected Regions</label>
          <input className={s.input} value={affectedRegions} onChange={e => setAffectedRegions(e.target.value)} />
        </div>
      </div>
      <div className={s.field}>
        <label className={s.label}>Notification Level</label>
        <div className={s.levelRow}>
          {(['Regional', 'National', 'International'] as const).map(l => (
            <button key={l} type="button" className={`${s.levelBtn}${level === l ? ' ' + s.levelBtnActive : ''}`} onClick={() => setLevel(l)}>{l}</button>
          ))}
        </div>
      </div>
      <div className={s.field}>
        <label className={s.label}>Notification Message <span className={s.req}>*</span></label>
        <textarea className={s.textarea} rows={3} value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe the situation and required action…" />
      </div>
      <button className={s.actionSubmitBtnDanger} disabled={!canSubmit} onClick={() => canSubmit && onSuccess()}>
        <Bell size={13} strokeWidth={2} /> Issue Notification
      </button>
    </div>
  );
}

function ClearanceConfirm({ caseCode, onSuccess }: { caseCode: string; onSuccess: () => void }) {
  return (
    <div className={s.actionForm}>
      <div className={s.actionFormTitle}>Issue Clearance Certificate</div>
      <div className={s.clearanceWarning}>
        <AlertTriangle size={14} strokeWidth={2} />
        This will lift all movement restrictions for <strong>{caseCode}</strong> and notify the farmer. Ensure at least 2 consecutive negative lab results have been recorded.
      </div>
      <button className={s.actionSubmitBtnGreen} onClick={onSuccess}>
        <FileCheck size={13} strokeWidth={2} /> Confirm & Issue Certificate
      </button>
    </div>
  );
}

/* ── Case detail panel ─────────────────────────────────────────── */
interface CaseDetailProps {
  caseData: DiseaseCase;
  onClose: () => void;
  permitDecisions: Record<string, 'approved' | 'rejected'>;
  onPermitDecision: (id: string, d: 'approved' | 'rejected') => void;
}

function CaseDetailPanel({ caseData, onClose, permitDecisions, onPermitDecision }: CaseDetailProps) {
  const [activeAction, setActiveAction] = useState<ActionKind>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const handleSuccess = (msg: string) => {
    setActionSuccess(msg);
    setActiveAction(null);
  };

  const stageIndex = TIMELINE_STAGES.findIndex(s => s.statuses.includes(caseData.status));

  return (
    <div className={s.detailPanel}>
      <div className={s.detailPanelHeader}>
        <div>
          <div className={s.detailCode}>{caseData.caseCode}</div>
          <div className={s.detailBadges}>
            <StatusBadge status={caseData.status} />
            <RiskBadge risk={caseData.risk} />
          </div>
        </div>
        <button className={s.closeBtn} onClick={onClose}><X size={16} /></button>
      </div>

      {actionSuccess && (
        <div className={s.successBanner}>
          <CheckCircle size={14} strokeWidth={2} /> {actionSuccess}
        </div>
      )}

      {/* Info grid */}
      <div className={s.infoGrid}>
        {[
          { l: 'Species',         v: caseData.species.join(', ') },
          { l: 'Affected',        v: `${caseData.affectedCount} animals` },
          { l: 'Region',          v: caseData.region },
          { l: 'Reported',        v: caseData.reportedAt },
          { l: 'Onset Date',      v: caseData.onsetDate },
          { l: 'Assigned Vet',    v: caseData.assignedVet },
        ].map(({ l, v }) => (
          <div key={l} className={s.infoItem}>
            <div className={s.infoLabel}>{l}</div>
            <div className={s.infoValue}>{v}</div>
          </div>
        ))}
        <div className={s.infoItem} style={{ gridColumn: '1 / -1' }}>
          <div className={s.infoLabel}>Symptoms</div>
          <div className={s.infoValue}>{caseData.symptoms.join(', ')}</div>
        </div>
      </div>

      {/* Timeline */}
      <div className={s.timelineSection}>
        <div className={s.sectionLabel}>Case Timeline</div>
        <div className={s.timeline}>
          {TIMELINE_STAGES.map((stage, i) => {
            const isPast    = stageIndex >= 0 && i < stageIndex;
            const isCurrent = i === stageIndex;
            return (
              <div key={stage.label} className={s.timelineItem}>
                <div className={`${s.tDot}${isPast ? ' ' + s.tDotPast : ''}${isCurrent ? ' ' + s.tDotCurrent : ''}`} />
                {i < TIMELINE_STAGES.length - 1 && (
                  <div className={`${s.tLine}${(isPast || isCurrent) ? ' ' + s.tLineActive : ''}`} />
                )}
                <div className={`${s.tLabel}${isCurrent ? ' ' + s.tLabelCurrent : ''}${!isPast && !isCurrent ? ' ' + s.tLabelFuture : ''}`}>
                  {stage.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ministry actions */}
      <div className={s.actionsSection}>
        <div className={s.sectionLabel}>Ministry Actions</div>
        <div className={s.actionBtns}>
          {(caseData.status === 'UNDER_INVESTIGATION') && (
            <button className={`${s.actionBtn}${activeAction === 'assign-team' ? ' ' + s.actionBtnOn : ''}`} onClick={() => setActiveAction(a => a === 'assign-team' ? null : 'assign-team')}>
              <Shield size={13} /> Assign Vet Team
            </button>
          )}
          {(caseData.status === 'ESCALATED' || caseData.status === 'CONFIRMED') && (
            <button className={`${s.actionBtn}${activeAction === 'approve-plan' ? ' ' + s.actionBtnOn : ''}`} onClick={() => setActiveAction(a => a === 'approve-plan' ? null : 'approve-plan')}>
              <CheckCircle size={13} /> Approve Control Plan
            </button>
          )}
          {(caseData.status === 'CONTROL_ACTIVE' || caseData.status === 'CONFIRMED') && (
            <button className={`${s.actionBtn}${activeAction === 'issue-notification' ? ' ' + s.actionBtnOn : ''}`} onClick={() => setActiveAction(a => a === 'issue-notification' ? null : 'issue-notification')}>
              <Bell size={13} /> Issue National Notification
            </button>
          )}
          {caseData.status === 'CLEARANCE_TESTING' && (
            <button className={`${s.actionBtnGreen}${activeAction === 'clearance' ? ' ' + s.actionBtnOn : ''}`} onClick={() => setActiveAction(a => a === 'clearance' ? null : 'clearance')}>
              <FileCheck size={13} /> Issue Clearance Certificate
            </button>
          )}
        </div>

        {activeAction === 'assign-team'         && <AssignTeamForm      onSuccess={() => handleSuccess('Team assigned. Field team notified.')} />}
        {activeAction === 'approve-plan'        && <ApprovePlanForm     onSuccess={() => handleSuccess('Control plan approved. Field team notified.')} />}
        {activeAction === 'issue-notification'  && <NotificationForm caseData={caseData} onSuccess={() => handleSuccess('National notification issued.')} />}
        {activeAction === 'clearance'           && <ClearanceConfirm caseCode={caseData.caseCode} onSuccess={() => handleSuccess('Clearance certificate issued. Farmer notified.')} />}
      </div>

      {/* Movement permit exceptions */}
      {(caseData.status === 'CONTROL_ACTIVE' || caseData.status === 'CONFIRMED') && (
        <div className={s.permitsSection}>
          <div className={s.sectionLabel}>Pending Movement Permits</div>
          {permitDecisions['permit-1'] ? (
            <div className={s.permitDecided}>
              Permit for TAG-001A — <strong style={{ color: permitDecisions['permit-1'] === 'approved' ? '#16a34a' : '#dc2626' }}>{permitDecisions['permit-1'] === 'approved' ? 'Approved' : 'Rejected'}</strong>
            </div>
          ) : (
            <div className={s.permitCard}>
              <div className={s.permitInfo}>
                <div className={s.permitAnimal}>Animal: <strong>TAG-001A</strong></div>
                <div className={s.permitFarmer}>Farmer: Hassan Abdi</div>
                <div className={s.permitReason}>Reason: Medical treatment at remote clinic</div>
                <div className={s.permitDate}>Requested: 2026-08-01</div>
              </div>
              <div className={s.permitBtns}>
                <button className={s.permitApprove} onClick={() => onPermitDecision('permit-1', 'approved')}>Approve</button>
                <button className={s.permitReject}  onClick={() => onPermitDecision('permit-1', 'rejected')}>Reject</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────────── */
export function DiseaseCasesPage(): JSX.Element {
  const [selectedCase, setSelectedCase] = useState<DiseaseCase | null>(null);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState<Status | 'ALL'>('ALL');
  const [riskFilter, setRiskFilter]     = useState<Risk | 'ALL'>('ALL');
  const [regionFilter, setRegionFilter] = useState('All');
  const [permitDecisions, setPermitDecisions] = useState<Record<string, 'approved' | 'rejected'>>({});

  const filtered = MOCK_CASES.filter(c => {
    if (search && !c.caseCode.toLowerCase().includes(search.toLowerCase()) && !c.region.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (riskFilter   !== 'ALL' && c.risk   !== riskFilter)   return false;
    if (regionFilter !== 'All' && c.region !== regionFilter)  return false;
    return true;
  });

  const kpis = [
    { label: 'Total Cases',         value: MOCK_CASES.length },
    { label: 'Active / Control',    value: MOCK_CASES.filter(c => c.status === 'CONTROL_ACTIVE').length },
    { label: 'Pending Lab',         value: MOCK_CASES.filter(c => c.status === 'LAB_RESULT_PENDING' || c.status === 'SAMPLES_SENT').length },
    { label: 'Cleared This Month',  value: MOCK_CASES.filter(c => c.status === 'CLEARED').length },
  ];

  return (
    <div className={`${s.page}${selectedCase ? ' ' + s.pageWithPanel : ''}`}>

      {/* Main content */}
      <div className={s.mainContent}>

        {/* Page header */}
        <div className={s.pageHeader}>
          <div>
            <h1 className={s.pageTitle}>Disease Cases</h1>
            <p className={s.pageSub}>National disease reporting and response management</p>
          </div>
          <div className={s.headerActions}>
            <button className={s.btnDanger}>
              <Bell size={14} strokeWidth={1.75} /> National Notification
            </button>
            <button className={s.btnSecondary}>Export</button>
          </div>
        </div>

        {/* KPI row */}
        <div className={s.kpiRow}>
          {kpis.map(k => (
            <div key={k.label} className={s.kpiCard}>
              <div className={s.kpiValue}>{k.value}</div>
              <div className={s.kpiLabel}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className={s.filterBar}>
          <div className={s.searchWrap}>
            <Search size={14} className={s.searchIcon} />
            <input
              className={s.searchInput}
              placeholder="Search case code or region…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className={s.selectWrap}>
            <select className={s.filterSelect} value={statusFilter} onChange={e => setStatusFilter(e.target.value as Status | 'ALL')}>
              {STATUS_FILTERS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
            <ChevronDown size={13} className={s.selectIcon} />
          </div>
          <div className={s.selectWrap}>
            <select className={s.filterSelect} value={riskFilter} onChange={e => setRiskFilter(e.target.value as Risk | 'ALL')}>
              {RISK_FILTERS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
            <ChevronDown size={13} className={s.selectIcon} />
          </div>
          <div className={s.selectWrap}>
            <select className={s.filterSelect} value={regionFilter} onChange={e => setRegionFilter(e.target.value)}>
              {REGIONS.map(r => <option key={r} value={r}>{r === 'All' ? 'All Regions' : r}</option>)}
            </select>
            <ChevronDown size={13} className={s.selectIcon} />
          </div>
        </div>

        {/* Table */}
        <div className={s.tableCard}>
          <table className={s.table}>
            <thead>
              <tr>
                <th className={s.th}>Case Code</th>
                <th className={s.th}>Risk</th>
                <th className={s.th}>Status</th>
                <th className={s.th}>Species</th>
                <th className={s.th}>Region</th>
                <th className={s.th}>Reported</th>
                <th className={s.th}>Assigned Vet</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className={s.emptyRow}>No cases match the current filters.</td>
                </tr>
              ) : filtered.map(c => (
                <tr
                  key={c.id}
                  className={`${s.tr}${selectedCase?.id === c.id ? ' ' + s.trSelected : ''}`}
                  onClick={() => setSelectedCase(sc => sc?.id === c.id ? null : c)}
                >
                  <td className={s.td}><span className={s.caseCode}>{c.caseCode}</span></td>
                  <td className={s.td}><RiskBadge risk={c.risk} /></td>
                  <td className={s.td}><StatusBadge status={c.status} /></td>
                  <td className={s.td}>{c.species.join(', ')}</td>
                  <td className={s.td}>{c.region}</td>
                  <td className={s.td}>{c.reportedAt}</td>
                  <td className={s.td}>{c.assignedVet}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail panel */}
      {selectedCase && (
        <CaseDetailPanel
          caseData={selectedCase}
          onClose={() => setSelectedCase(null)}
          permitDecisions={permitDecisions}
          onPermitDecision={(id, d) => setPermitDecisions(p => ({ ...p, [id]: d }))}
        />
      )}
    </div>
  );
}

export default DiseaseCasesPage;
