import { useState } from 'react';
import {
  Syringe, Plus, CheckCircle, Clock, XCircle,
  ChevronDown, ChevronUp, MapPin, Users, Zap, AlertTriangle, X,
} from 'lucide-react';
import s from './vaccination-plan.module.css';

// ── Constants ─────────────────────────────────────────────────────────────────

const REGIONS = [
  { code: 'AWD', name: 'Awdal' },
  { code: 'BAK', name: 'Bakool' },
  { code: 'BAN', name: 'Banadir' },
  { code: 'BAR', name: 'Bari' },
  { code: 'BAY', name: 'Bay' },
  { code: 'GAL', name: 'Galgaduud' },
  { code: 'GED', name: 'Gedo' },
  { code: 'HIR', name: 'Hiraan' },
  { code: 'LJU', name: 'Lower Juba' },
  { code: 'LSH', name: 'Lower Shabelle' },
  { code: 'MJU', name: 'Middle Juba' },
  { code: 'MSH', name: 'Mid. Shabelle' },
  { code: 'MUD', name: 'Mudug' },
  { code: 'NUG', name: 'Nugaal' },
  { code: 'SAN', name: 'Sanaag' },
  { code: 'SOL', name: 'Sool' },
  { code: 'TOG', name: 'Togdheer' },
  { code: 'WOG', name: 'Woqooyi Galbeed' },
];

const VACCINES = [
  { value: 'FMD',        label: 'FMD — Foot-and-Mouth Disease',               species: ['CATTLE', 'SHEEP', 'GOAT', 'CAMEL'] },
  { value: 'PPR',        label: 'PPR — Peste des Petits Ruminants',            species: ['GOAT', 'SHEEP'] },
  { value: 'CCPP',       label: 'CCPP — Contagious Caprine Pleuropneumonia',   species: ['GOAT', 'CAMEL'] },
  { value: 'BRUCELLOSIS',label: 'Brucellosis',                                 species: ['CATTLE', 'CAMEL', 'GOAT', 'SHEEP'] },
  { value: 'ANTHRAX',    label: 'Anthrax',                                     species: ['CATTLE', 'CAMEL', 'GOAT', 'SHEEP'] },
  { value: 'LSD',        label: 'LSD — Lumpy Skin Disease',                    species: ['CATTLE'] },
  { value: 'RVF',        label: 'RVF — Rift Valley Fever',                     species: ['CATTLE', 'SHEEP', 'GOAT', 'CAMEL'] },
  { value: 'BLACKLEG',   label: 'Blackleg (Clostridial)',                       species: ['CATTLE'] },
  { value: 'NEWCASTLE',  label: 'Newcastle Disease',                            species: ['POULTRY'] },
];

const ALL_SPECIES = ['CATTLE', 'CAMEL', 'GOAT', 'SHEEP', 'POULTRY'];

const SPECIES_COLOR: Record<string, { bg: string; color: string }> = {
  CATTLE:  { bg: '#eff6ff', color: '#2563eb' },
  CAMEL:   { bg: '#fefce8', color: '#a16207' },
  GOAT:    { bg: '#f0fdf4', color: '#16a34a' },
  SHEEP:   { bg: '#f5f3ff', color: '#7c3aed' },
  POULTRY: { bg: '#fff7ed', color: '#c2410c' },
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT:     { label: 'Draft',     color: '#64748b', bg: '#f8fafc' },
  SCHEDULED: { label: 'Scheduled', color: '#0b5ed7', bg: '#eff6ff' },
  ACTIVE:    { label: 'Active',    color: '#059669', bg: '#ecfdf5' },
  COMPLETED: { label: 'Completed', color: '#16a34a', bg: '#f0fdf4' },
  CANCELLED: { label: 'Cancelled', color: '#94a3b8', bg: '#f1f5f9' },
};

const TABS = ['ALL', 'DRAFT', 'SCHEDULED', 'ACTIVE', 'COMPLETED'];

// ── Types ─────────────────────────────────────────────────────────────────────

interface VaccinationPlan {
  id: string;
  planCode: string;
  planName: string;
  vaccine: string;
  vaccineLabel: string;
  species: string[];
  allRegions: boolean;
  targetRegions: string[];
  targetAnimalCount: number;
  vaccinatedCount: number;
  startDate: string;
  endDate: string;
  status: string;
  vetsNotified: number;
  createdAt: string;
  notes?: string;
}

// ── Demo data ─────────────────────────────────────────────────────────────────

let nextId = 9;
const BASE_PLANS: VaccinationPlan[] = [
  {
    id: '1', planCode: 'VP-2026-001',
    planName: 'National FMD Campaign 2026',
    vaccine: 'FMD', vaccineLabel: 'FMD — Foot-and-Mouth Disease',
    species: ['CATTLE', 'SHEEP', 'GOAT', 'CAMEL'],
    allRegions: true, targetRegions: [],
    targetAnimalCount: 2_500_000, vaccinatedCount: 1_820_000,
    startDate: '2026-07-01', endDate: '2026-09-30',
    status: 'ACTIVE', vetsNotified: 42, createdAt: '2026-06-15',
    notes: 'Priority: Bay, Bakool and Hiraan regions.',
  },
  {
    id: '2', planCode: 'VP-2026-002',
    planName: 'PPR Bay Region Emergency',
    vaccine: 'PPR', vaccineLabel: 'PPR — Peste des Petits Ruminants',
    species: ['GOAT', 'SHEEP'],
    allRegions: false, targetRegions: ['BAY', 'BAK', 'GED'],
    targetAnimalCount: 380_000, vaccinatedCount: 312_000,
    startDate: '2026-07-10', endDate: '2026-08-31',
    status: 'ACTIVE', vetsNotified: 8, createdAt: '2026-07-08',
  },
  {
    id: '3', planCode: 'VP-2026-003',
    planName: 'Brucellosis Southern Campaign',
    vaccine: 'BRUCELLOSIS', vaccineLabel: 'Brucellosis',
    species: ['CATTLE', 'GOAT', 'SHEEP'],
    allRegions: false, targetRegions: ['LJU', 'MJU', 'LSH', 'MSH', 'GED'],
    targetAnimalCount: 640_000, vaccinatedCount: 0,
    startDate: '2026-08-15', endDate: '2026-10-15',
    status: 'SCHEDULED', vetsNotified: 11, createdAt: '2026-07-20',
    notes: 'Coordinate with FAO field teams in Lower Juba.',
  },
  {
    id: '4', planCode: 'VP-2026-004',
    planName: 'Rift Valley Fever Coastal Alert',
    vaccine: 'RVF', vaccineLabel: 'RVF — Rift Valley Fever',
    species: ['CATTLE', 'SHEEP', 'GOAT', 'CAMEL'],
    allRegions: false, targetRegions: ['LJU', 'LSH', 'BAN'],
    targetAnimalCount: 290_000, vaccinatedCount: 0,
    startDate: '2026-09-01', endDate: '2026-10-31',
    status: 'DRAFT', vetsNotified: 0, createdAt: '2026-08-01',
  },
  {
    id: '5', planCode: 'VP-2025-018',
    planName: 'Anthrax Northern Control 2025',
    vaccine: 'ANTHRAX', vaccineLabel: 'Anthrax',
    species: ['CATTLE', 'CAMEL', 'GOAT', 'SHEEP'],
    allRegions: false, targetRegions: ['BAR', 'NUG', 'SOL', 'SAN'],
    targetAnimalCount: 520_000, vaccinatedCount: 520_000,
    startDate: '2025-10-01', endDate: '2025-12-31',
    status: 'COMPLETED', vetsNotified: 14, createdAt: '2025-09-15',
  },
  {
    id: '6', planCode: 'VP-2026-005',
    planName: 'CCPP Galkayo Area Campaign',
    vaccine: 'CCPP', vaccineLabel: 'CCPP — Contagious Caprine Pleuropneumonia',
    species: ['GOAT', 'CAMEL'],
    allRegions: false, targetRegions: ['GAL', 'MUD', 'NUG'],
    targetAnimalCount: 175_000, vaccinatedCount: 98_000,
    startDate: '2026-07-20', endDate: '2026-09-15',
    status: 'ACTIVE', vetsNotified: 7, createdAt: '2026-07-15',
  },
  {
    id: '7', planCode: 'VP-2026-006',
    planName: 'National LSD Control Plan',
    vaccine: 'LSD', vaccineLabel: 'LSD — Lumpy Skin Disease',
    species: ['CATTLE'],
    allRegions: true, targetRegions: [],
    targetAnimalCount: 1_100_000, vaccinatedCount: 0,
    startDate: '2026-09-01', endDate: '2026-12-31',
    status: 'DRAFT', vetsNotified: 0, createdAt: '2026-08-02',
  },
  {
    id: '8', planCode: 'VP-2026-007',
    planName: 'PPR Rapid Response — Hiraan',
    vaccine: 'PPR', vaccineLabel: 'PPR — Peste des Petits Ruminants',
    species: ['GOAT', 'SHEEP'],
    allRegions: false, targetRegions: ['HIR', 'BAK'],
    targetAnimalCount: 210_000, vaccinatedCount: 0,
    startDate: '2026-08-10', endDate: '2026-09-30',
    status: 'SCHEDULED', vetsNotified: 5, createdAt: '2026-08-02',
  },
];

// ── Form default ──────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  planName: '',
  vaccine: '',
  species: [] as string[],
  allRegions: true,
  targetRegions: [] as string[],
  targetAnimalCount: '',
  startDate: '',
  endDate: '',
  notes: '',
};

type PlanForm = typeof EMPTY_FORM;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n >= 1_000_000
    ? (n / 1_000_000).toFixed(1) + 'M'
    : n >= 1_000
    ? (n / 1_000).toFixed(0) + 'K'
    : String(n);
}

function regionName(code: string): string {
  return REGIONS.find(r => r.code === code)?.name ?? code;
}

// ── Confirmation modal ────────────────────────────────────────────────────────

function LaunchConfirmModal({ plan, onConfirm, onCancel, loading }: {
  plan: VaccinationPlan;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const vetCount = plan.allRegions ? 42 : plan.targetRegions.length * 3;
  const regions  = plan.allRegions ? 'All 18 regions of Somalia' : plan.targetRegions.map(regionName).join(', ');

  return (
    <div className={s.overlay}>
      <div className={s.confirmModal}>
        <div className={s.confirmIcon}><Zap size={28} color="#0b5ed7" /></div>
        <h2 className={s.confirmTitle}>Launch Vaccination Campaign</h2>
        <p className={s.confirmSub}>
          You are about to activate <strong>{plan.planName}</strong>. This will dispatch tasks to veterinary officers immediately.
        </p>
        <div className={s.confirmDetails}>
          <div className={s.confirmRow}><span className={s.confirmLabel}>Vaccine</span><span>{plan.vaccineLabel}</span></div>
          <div className={s.confirmRow}><span className={s.confirmLabel}>Species</span><span>{plan.species.join(', ')}</span></div>
          <div className={s.confirmRow}><span className={s.confirmLabel}>Coverage</span><span>{regions}</span></div>
          <div className={s.confirmRow}><span className={s.confirmLabel}>Target</span><span>{fmt(plan.targetAnimalCount)} animals</span></div>
          <div className={s.confirmRow}><span className={s.confirmLabel}>Vets notified</span><strong style={{ color: '#0b5ed7' }}>{vetCount} veterinary officers</strong></div>
        </div>
        <div className={s.confirmWarning}>
          <AlertTriangle size={13} /> Once launched, vets will receive this as an active task. This action cannot be undone.
        </div>
        <div className={s.confirmActions}>
          <button className={s.cancelBtn} onClick={onCancel} disabled={loading}>Cancel</button>
          <button className={s.launchBtn} onClick={onConfirm} disabled={loading}>
            {loading ? 'Launching…' : `🚀 Launch & Notify ${vetCount} Vets`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Create Plan Modal ─────────────────────────────────────────────────────────

function CreatePlanModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (plan: VaccinationPlan) => void;
}) {
  const [form, setForm] = useState<PlanForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedVaccine = VACCINES.find(v => v.value === form.vaccine);

  const set = (key: keyof PlanForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [key]: e.target.value }));

  const toggleSpecies = (sp: string) =>
    setForm(p => ({
      ...p,
      species: p.species.includes(sp) ? p.species.filter(x => x !== sp) : [...p.species, sp],
    }));

  const toggleRegion = (code: string) =>
    setForm(p => ({
      ...p,
      targetRegions: p.targetRegions.includes(code)
        ? p.targetRegions.filter(x => x !== code)
        : [...p.targetRegions, code],
    }));

  const onVaccineChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = VACCINES.find(x => x.value === e.target.value);
    setForm(p => ({ ...p, vaccine: e.target.value, species: v ? [...v.species] : [] }));
  };

  const canSubmit = form.planName && form.vaccine && form.species.length > 0
    && (form.allRegions || form.targetRegions.length > 0)
    && form.targetAnimalCount && form.startDate && form.endDate;

  const handleCreate = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    await new Promise(r => setTimeout(r, 600));
    const vaccine = VACCINES.find(v => v.value === form.vaccine)!;
    const newPlan: VaccinationPlan = {
      id: String(nextId++),
      planCode: `VP-2026-00${nextId}`,
      planName: form.planName,
      vaccine: form.vaccine,
      vaccineLabel: vaccine.label,
      species: [...form.species],
      allRegions: form.allRegions,
      targetRegions: form.allRegions ? [] : [...form.targetRegions],
      targetAnimalCount: parseInt(form.targetAnimalCount.replace(/,/g, '')) || 0,
      vaccinatedCount: 0,
      startDate: form.startDate,
      endDate: form.endDate,
      status: 'DRAFT',
      vetsNotified: 0,
      createdAt: new Date().toISOString().slice(0, 10),
      notes: form.notes || undefined,
    };
    onCreate(newPlan);
    setSaving(false);
  };

  return (
    <div className={s.overlay}>
      <div className={s.createModal}>
        <div className={s.createHeader}>
          <div>
            <div className={s.createTitle}>New Vaccination Plan</div>
            <div className={s.createSub}>Define vaccine, coverage area, and target animals</div>
          </div>
          <button className={s.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        {error && <div className={s.formError}>{error}</div>}

        <div className={s.createBody}>
          {/* Plan name */}
          <div className={s.field}>
            <label className={s.label}>Plan Name <span className={s.req}>*</span></label>
            <input className={s.input} value={form.planName} onChange={set('planName')}  />
          </div>

          {/* Vaccine */}
          <div className={s.field}>
            <label className={s.label}>Vaccine <span className={s.req}>*</span></label>
            <select className={s.select} value={form.vaccine} onChange={onVaccineChange}>
              <option value="">Select vaccine…</option>
              {VACCINES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </div>

          {/* Species */}
          <div className={s.field}>
            <label className={s.label}>Target Species <span className={s.req}>*</span></label>
            <div className={s.chipRow}>
              {ALL_SPECIES.map(sp => {
                const clr = SPECIES_COLOR[sp];
                const on = form.species.includes(sp);
                const avail = !selectedVaccine || selectedVaccine.species.includes(sp);
                return (
                  <button
                    key={sp}
                    type="button"
                    disabled={!avail}
                    className={`${s.speciesChip}${on ? ' ' + s.speciesChipOn : ''}${!avail ? ' ' + s.speciesChipDisabled : ''}`}
                    style={on ? { background: clr.bg, color: clr.color, borderColor: clr.color } : {}}
                    onClick={() => avail && toggleSpecies(sp)}
                  >
                    {sp.charAt(0) + sp.slice(1).toLowerCase()}
                  </button>
                );
              })}
            </div>
            {selectedVaccine && (
              <div className={s.fieldHint}>Greyed species are not applicable for {selectedVaccine.label.split('—')[0].trim()}</div>
            )}
          </div>

          {/* Coverage */}
          <div className={s.field}>
            <label className={s.label}>Coverage Area <span className={s.req}>*</span></label>
            <label className={s.toggleRow}>
              <input
                type="checkbox"
                checked={form.allRegions}
                onChange={e => setForm(p => ({ ...p, allRegions: e.target.checked, targetRegions: [] }))}
              />
              <span className={s.toggleLabel}>All Somalia (18 regions)</span>
            </label>

            {!form.allRegions && (
              <div className={s.regionGrid}>
                {REGIONS.map(r => (
                  <label
                    key={r.code}
                    className={`${s.regionChip}${form.targetRegions.includes(r.code) ? ' ' + s.regionChipOn : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={form.targetRegions.includes(r.code)}
                      onChange={() => toggleRegion(r.code)}
                      style={{ display: 'none' }}
                    />
                    {r.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Dates */}
          <div className={s.row2}>
            <div className={s.field}>
              <label className={s.label}>Start Date <span className={s.req}>*</span></label>
              <input className={s.input} type="date" value={form.startDate} onChange={set('startDate')} />
            </div>
            <div className={s.field}>
              <label className={s.label}>End Date <span className={s.req}>*</span></label>
              <input className={s.input} type="date" value={form.endDate} onChange={set('endDate')} />
            </div>
          </div>

          {/* Target count */}
          <div className={s.field}>
            <label className={s.label}>Target Animal Count <span className={s.req}>*</span></label>
            <input className={s.input} type="number" min="1" value={form.targetAnimalCount} onChange={set('targetAnimalCount')}  />
          </div>

          {/* Notes */}
          <div className={s.field}>
            <label className={s.label}>Instructions for Vets <span className={s.opt}>(optional)</span></label>
            <textarea className={s.textarea} rows={3} value={form.notes} onChange={set('notes')}  />
          </div>
        </div>

        <div className={s.createFooter}>
          <button className={s.cancelBtn} onClick={onClose} disabled={saving}>Cancel</button>
          <button className={s.primaryBtn} onClick={handleCreate} disabled={!canSubmit || saving}>
            {saving ? 'Creating…' : 'Create Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Plan card ─────────────────────────────────────────────────────────────────

function PlanCard({ plan, onLaunch, onComplete, onCancel }: {
  plan: VaccinationPlan;
  onLaunch: (plan: VaccinationPlan) => void;
  onComplete: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const st = STATUS_CFG[plan.status] ?? STATUS_CFG.DRAFT;
  const pct = plan.targetAnimalCount > 0
    ? Math.round((plan.vaccinatedCount / plan.targetAnimalCount) * 100)
    : 0;
  const coverageText = plan.allRegions ? 'All Somalia' : plan.targetRegions.map(regionName).join(', ');

  return (
    <div className={`${s.planCard}${expanded ? ' ' + s.planCardOpen : ''}`}>
      {/* Card header */}
      <div className={s.planHead} onClick={() => setExpanded(e => !e)}>
        <div className={s.planLeft}>
          <div className={s.planTopRow}>
            <span className={s.planCode}>{plan.planCode}</span>
            <span className={s.statusBadge} style={{ color: st.color, background: st.bg }}>{st.label}</span>
            {plan.status === 'ACTIVE' && (
              <span className={s.liveTag}><span className={s.liveDot} /> LIVE</span>
            )}
          </div>
          <div className={s.planName}>{plan.planName}</div>
          <div className={s.planMeta}>
            <span className={s.vaccineTag}><Syringe size={11} /> {plan.vaccineLabel.split('—')[0].trim()}</span>
            {plan.species.map(sp => {
              const clr = SPECIES_COLOR[sp];
              return <span key={sp} className={s.speciesTag} style={{ background: clr.bg, color: clr.color }}>{sp.charAt(0) + sp.slice(1).toLowerCase()}</span>;
            })}
          </div>
          <div className={s.planCoverage}>
            <MapPin size={11} color="#94a3b8" />
            <span>{coverageText}</span>
          </div>
        </div>

        <div className={s.planRight}>
          {/* Progress mini */}
          <div className={s.miniProgress}>
            <div className={s.miniBar}><div className={s.miniFill} style={{ width: `${pct}%`, background: st.color }} /></div>
            <div className={s.miniLabel}>{pct}% · {fmt(plan.vaccinatedCount)}/{fmt(plan.targetAnimalCount)}</div>
          </div>
          {plan.vetsNotified > 0 && (
            <div className={s.vetsTag}><Users size={11} /> {plan.vetsNotified} vets</div>
          )}
          <div className={s.planDates}>{plan.startDate} → {plan.endDate}</div>
          <span className={s.chevron}>{expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</span>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className={s.planBody}>
          {plan.notes && (
            <div className={s.noteBox}>
              <AlertTriangle size={13} />
              <span>{plan.notes}</span>
            </div>
          )}

          <div className={s.detailGrid}>
            <div className={s.detailItem}><span className={s.detailLabel}>Vaccine</span><span className={s.detailVal}>{plan.vaccineLabel}</span></div>
            <div className={s.detailItem}><span className={s.detailLabel}>Start date</span><span className={s.detailVal}>{plan.startDate}</span></div>
            <div className={s.detailItem}><span className={s.detailLabel}>End date</span><span className={s.detailVal}>{plan.endDate}</span></div>
            <div className={s.detailItem}><span className={s.detailLabel}>Target animals</span><span className={s.detailVal}>{plan.targetAnimalCount.toLocaleString()}</span></div>
            <div className={s.detailItem}><span className={s.detailLabel}>Vaccinated</span><span className={s.detailVal}>{plan.vaccinatedCount.toLocaleString()}</span></div>
            <div className={s.detailItem}><span className={s.detailLabel}>Vets notified</span><span className={s.detailVal}>{plan.vetsNotified}</span></div>
          </div>

          {/* Progress bar full width */}
          <div className={s.progressRow}>
            <div className={s.progressTrack}>
              <div className={s.progressFill} style={{ width: `${pct}%`, background: st.color }} />
            </div>
            <span className={s.progressLabel}>{pct}% complete — {fmt(plan.vaccinatedCount)} of {fmt(plan.targetAnimalCount)} animals</span>
          </div>

          {/* Regions */}
          {!plan.allRegions && (
            <div className={s.regionList}>
              {plan.targetRegions.map(r => (
                <span key={r} className={s.regionPill}><MapPin size={9} /> {regionName(r)}</span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className={s.planActions}>
            {(plan.status === 'DRAFT' || plan.status === 'SCHEDULED') && (
              <button className={s.launchBtn} onClick={() => onLaunch(plan)}>
                <Zap size={13} /> Launch &amp; Notify Vets
              </button>
            )}
            {plan.status === 'ACTIVE' && (
              <button className={s.completeBtn} onClick={() => onComplete(plan.id)}>
                <CheckCircle size={13} /> Mark Completed
              </button>
            )}
            {(plan.status === 'DRAFT' || plan.status === 'SCHEDULED' || plan.status === 'ACTIVE') && (
              <button className={s.cancelPlanBtn} onClick={() => onCancel(plan.id)}>
                <XCircle size={13} /> Cancel Plan
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function VaccinationPlanPage(): JSX.Element {
  const [plans,       setPlans]       = useState<VaccinationPlan[]>(BASE_PLANS);
  const [tab,         setTab]         = useState('ALL');
  const [showCreate,  setShowCreate]  = useState(false);
  const [launching,   setLaunching]   = useState<VaccinationPlan | null>(null);
  const [launchLoad,  setLaunchLoad]  = useState(false);
  const [toast,       setToast]       = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const filtered = tab === 'ALL' ? plans : plans.filter(p => p.status === tab);

  const stats = {
    total:     plans.length,
    active:    plans.filter(p => p.status === 'ACTIVE').length,
    vets:      plans.filter(p => p.status === 'ACTIVE').reduce((a, p) => a + p.vetsNotified, 0),
    animals:   plans.filter(p => p.status === 'ACTIVE').reduce((a, p) => a + p.vaccinatedCount, 0),
    completed: plans.filter(p => p.status === 'COMPLETED').length,
  };

  const handleLaunchConfirm = async () => {
    if (!launching) return;
    setLaunchLoad(true);
    await new Promise(r => setTimeout(r, 1000));
    const vetCount = launching.allRegions ? 42 : launching.targetRegions.length * 3;
    setPlans(prev => prev.map(p =>
      p.id === launching.id ? { ...p, status: 'ACTIVE', vetsNotified: vetCount } : p,
    ));
    setLaunching(null);
    setLaunchLoad(false);
    showToast(`Campaign launched — ${vetCount} veterinary officers notified`);
  };

  const handleComplete = (id: string) => {
    setPlans(prev => prev.map(p => p.id === id ? { ...p, status: 'COMPLETED' } : p));
    showToast('Campaign marked as completed');
  };

  const handleCancel = (id: string) => {
    setPlans(prev => prev.map(p => p.id === id ? { ...p, status: 'CANCELLED' } : p));
    showToast('Campaign cancelled');
  };

  const handleCreate = (plan: VaccinationPlan) => {
    setPlans(prev => [plan, ...prev]);
    setShowCreate(false);
    showToast(`Plan "${plan.planName}" created as Draft`);
  };

  return (
    <div className={s.page}>

      {/* Toast */}
      {toast && (
        <div className={s.toast}>
          <CheckCircle size={15} /> {toast}
        </div>
      )}

      {/* Stats */}
      <div className={s.statRow}>
        {[
          { label: 'Total Plans',       val: stats.total,                    color: '#2563eb' },
          { label: 'Active Campaigns',  val: stats.active,                   color: '#059669' },
          { label: 'Vets Notified',     val: stats.vets,                     color: '#7c3aed' },
          { label: 'Animals Vaccinated',val: fmt(stats.animals),             color: '#d97706' },
          { label: 'Completed',         val: stats.completed,                color: '#16a34a' },
        ].map(st => (
          <div key={st.label} className={s.statCard}>
            <div className={s.statNum}>{st.val}</div>
            <div className={s.statLabel}>{st.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className={s.toolbar}>
        <div className={s.tabBar}>
          {TABS.map(t => (
            <button
              key={t}
              className={`${s.tabBtn}${tab === t ? ' ' + s.tabBtnActive : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'ALL' ? 'All Plans' : STATUS_CFG[t]?.label ?? t}
              <span className={s.tabCount}>
                {t === 'ALL' ? plans.length : plans.filter(p => p.status === t).length}
              </span>
            </button>
          ))}
        </div>
        <button className={s.newBtn} onClick={() => setShowCreate(true)}>
          <Plus size={14} /> New Vaccination Plan
        </button>
      </div>

      {/* Plan list */}
      <div className={s.planList}>
        {filtered.length === 0 ? (
          <div className={s.empty}>
            <Syringe size={40} color="#e2e8f0" style={{ marginBottom: '0.75rem' }} />
            <div>No vaccination plans in this category</div>
          </div>
        ) : (
          filtered.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onLaunch={setLaunching}
              onComplete={handleComplete}
              onCancel={handleCancel}
            />
          ))
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <CreatePlanModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}

      {launching && (
        <LaunchConfirmModal
          plan={launching}
          onConfirm={handleLaunchConfirm}
          onCancel={() => setLaunching(null)}
          loading={launchLoad}
        />
      )}
    </div>
  );
}

export default VaccinationPlanPage;
