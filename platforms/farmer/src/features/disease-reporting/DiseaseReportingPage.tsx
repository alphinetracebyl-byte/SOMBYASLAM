import { useState, useRef } from 'react';
import {
  AlertTriangle, CheckCircle2, ChevronRight, Plus, X,
  ClipboardList, Microscope, Truck, FlaskConical,
  Phone, ArrowRight, RotateCcw,
} from 'lucide-react';
import s from './disease-reporting.module.css';

/* ── Types ──────────────────────────────────────────────────── */
interface ReportDraft {
  species: string[];
  affectedCount: string;
  tagIds: string[];
  symptoms: string[];
  onsetDate: string;
  severity: 'MILD' | 'MODERATE' | 'SEVERE' | '';
  notes: string;
}

interface MockCase {
  caseId: string;
  status: 'REPORTED' | 'UNDER_INVESTIGATION' | 'CONFIRMED' | 'CLEARED' | 'CLOSED';
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  species: string;
  date: string;
}

/* ── Static data ─────────────────────────────────────────────── */
const SPECIES_OPTIONS = [
  { key: 'CATTLE', label: 'Cattle', emoji: '🐄' },
  { key: 'CAMEL',  label: 'Camel',  emoji: '🐪' },
  { key: 'GOAT',   label: 'Goat',   emoji: '🐐' },
  { key: 'SHEEP',  label: 'Sheep',  emoji: '🐑' },
];

const SYMPTOM_GROUPS: { group: string; items: string[] }[] = [
  {
    group: 'General',
    items: [
      'Fever / high temperature',
      'Loss of appetite',
      'Sudden deaths in herd',
      'Weight loss / wasting',
      'Weakness / lethargy',
    ],
  },
  {
    group: 'Respiratory',
    items: ['Nasal discharge', 'Coughing / sneezing', 'Difficulty breathing'],
  },
  {
    group: 'Digestive',
    items: ['Diarrhea (watery)', 'Diarrhea (bloody)', 'Bloating', 'Excessive salivation / drooling'],
  },
  {
    group: 'Skin & External',
    items: [
      'Blisters on mouth / feet / teats',
      'Skin lesions / sores',
      'Lameness / limping',
      'Swollen lymph nodes',
    ],
  },
  {
    group: 'Reproductive',
    items: ['Abortion / miscarriage', 'Stillbirth', 'Reduced milk production'],
  },
  {
    group: 'Neurological',
    items: ['Tremors / convulsions', 'Walking in circles', 'Blindness / eye discharge'],
  },
];

const SEVERITY_OPTIONS: { key: 'MILD' | 'MODERATE' | 'SEVERE'; label: string; desc: string }[] = [
  { key: 'MILD',     label: 'Mild',     desc: 'A few animals affected, stable condition' },
  { key: 'MODERATE', label: 'Moderate', desc: 'Multiple animals affected, some deteriorating' },
  { key: 'SEVERE',   label: 'Severe',   desc: 'Rapid spread, deaths occurring in herd' },
];

const MOCK_CASES: MockCase[] = [
  { caseId: 'DIS-2026-00037', status: 'UNDER_INVESTIGATION', risk: 'HIGH',  species: 'Cattle', date: '2026-07-29' },
  { caseId: 'DIS-2026-00021', status: 'CLEARED',             risk: 'LOW',   species: 'Goat',   date: '2026-06-14' },
  { caseId: 'DIS-2026-00008', status: 'CLOSED',              risk: 'LOW',   species: 'Sheep',  date: '2026-05-02' },
];

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  UNDER_INVESTIGATION: { bg: '#eff6ff', color: '#1d4ed8' },
  CLEARED:             { bg: '#f0fdf4', color: '#16a34a' },
  CLOSED:              { bg: '#f1f5f9', color: '#475569' },
  CONFIRMED:           { bg: '#fef2f2', color: '#dc2626' },
  REPORTED:            { bg: '#f1f5f9', color: '#475569' },
};

const RISK_COLOR: Record<string, string> = {
  LOW:    '#16a34a',
  MEDIUM: '#d97706',
  HIGH:   '#dc2626',
};

const NEXT_STEPS = [
  { Icon: ClipboardList, label: 'Case received',     desc: 'Your report has been logged in QXLITS' },
  { Icon: Truck,         label: 'Vet team assigned',  desc: 'A field veterinary team is being dispatched' },
  { Icon: Microscope,    label: 'On-site visit',      desc: 'Team will examine the affected animals' },
  { Icon: FlaskConical,  label: 'Lab testing',        desc: 'Samples sent to national veterinary lab' },
];

const STEP_LABELS = ['Affected Animals', 'Symptoms', 'Details', 'Review'];

/* ── Helpers ──────────────────────────────────────────────────── */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function randomCaseId(): string {
  const n = Math.floor(10000 + Math.random() * 90000);
  return `DIS-2026-${String(n).padStart(5, '0')}`;
}

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
}

function isStep1Valid(d: ReportDraft): boolean {
  return d.species.length > 0 && d.affectedCount.trim() !== '' && Number(d.affectedCount) > 0;
}

function isStep2Valid(d: ReportDraft): boolean {
  return d.symptoms.length > 0;
}

function isStep3Valid(d: ReportDraft): boolean {
  return d.onsetDate.trim() !== '' && d.severity !== '';
}

/* ── Step progress bar ───────────────────────────────────────── */
function StepBar({ step }: { step: number }): JSX.Element {
  return (
    <div className={s.stepBar}>
      {STEP_LABELS.map((label, i) => {
        const idx = i + 1;
        const active    = idx === step;
        const completed = idx < step;
        return (
          <div key={label} className={s.stepBarItem}>
            <div
              className={[
                s.stepDot,
                active    ? s.stepDotActive    : '',
                completed ? s.stepDotCompleted : '',
              ].filter(Boolean).join(' ')}
            >
              {completed ? <CheckCircle2 size={14} strokeWidth={2.5} /> : idx}
            </div>
            <div className={[s.stepLabel, active ? s.stepLabelActive : ''].filter(Boolean).join(' ')}>
              {label}
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={[s.stepConnector, completed ? s.stepConnectorDone : ''].filter(Boolean).join(' ')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Case badge ─────────────────────────────────────────────── */
function CaseBadge({ status }: { status: string }): JSX.Element {
  const st = STATUS_STYLE[status] ?? STATUS_STYLE.REPORTED;
  return (
    <span className={s.caseBadge} style={{ background: st.bg, color: st.color }}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

/* ── My Reports list ────────────────────────────────────────── */
function MyReports({ listRef }: { listRef: React.RefObject<HTMLDivElement> }): JSX.Element {
  return (
    <div className={s.card} ref={listRef}>
      <div className={s.cardHeader}>
        <div>
          <div className={s.cardTitle}>My Reports</div>
          <div className={s.cardSub}>Disease cases you have submitted</div>
        </div>
        <span className={s.cardBadge}>{MOCK_CASES.length} cases</span>
      </div>
      <div className={s.caseList}>
        {MOCK_CASES.map(c => (
          <div key={c.caseId} className={s.caseItem}>
            <div className={s.caseTop}>
              <span className={s.caseCode}>{c.caseId}</span>
              <CaseBadge status={c.status} />
            </div>
            <div className={s.caseMeta}>
              <span style={{ color: RISK_COLOR[c.risk], fontWeight: 600, fontSize: '0.75rem' }}>
                {c.risk} RISK
              </span>
              <span className={s.caseMetaDot}>·</span>
              <span>{c.species}</span>
              <span className={s.caseMetaDot}>·</span>
              <span>{c.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── What happens next panel ─────────────────────────────────── */
function WhatHappensNext(): JSX.Element {
  return (
    <div className={s.card}>
      <div className={s.cardHeader}>
        <div>
          <div className={s.cardTitle}>What happens next?</div>
          <div className={s.cardSub}>After you submit a disease report</div>
        </div>
      </div>
      <div className={s.nextSteps}>
        {NEXT_STEPS.map(({ Icon, label, desc }, i) => (
          <div key={label} className={s.nextStep}>
            <div className={s.nextStepIcon}>
              <Icon size={15} strokeWidth={2} />
              {i < NEXT_STEPS.length - 1 && <div className={s.nextStepLine} />}
            </div>
            <div className={s.nextStepText}>
              <div className={s.nextStepLabel}>{label}</div>
              <div className={s.nextStepDesc}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────── */
export function DiseaseReportingPage(): JSX.Element {
  const [step, setStep]       = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [caseId, setCaseId]   = useState('');
  const [tagInput, setTagInput] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const [draft, setDraft] = useState<ReportDraft>({
    species: [], affectedCount: '', tagIds: [],
    symptoms: [], onsetDate: '', severity: '', notes: '',
  });

  /* -- patch helpers -- */
  const patch = (updates: Partial<ReportDraft>) => setDraft(d => ({ ...d, ...updates }));
  const toggleSpecies  = (k: string) => patch({ species:  toggle(draft.species,  k) });
  const toggleSymptom  = (k: string) => patch({ symptoms: toggle(draft.symptoms, k) });

  const addTag = () => {
    const val = tagInput.trim().toUpperCase();
    if (val && !draft.tagIds.includes(val)) {
      patch({ tagIds: [...draft.tagIds, val] });
    }
    setTagInput('');
  };

  const removeTag = (t: string) => patch({ tagIds: draft.tagIds.filter(x => x !== t) });

  const canNext = () => {
    if (step === 1) return isStep1Valid(draft);
    if (step === 2) return isStep2Valid(draft);
    if (step === 3) return isStep3Valid(draft);
    return true;
  };

  const handleSubmit = () => {
    const id = randomCaseId();
    setCaseId(id);
    setSubmitted(true);
  };

  const handleReportAnother = () => {
    setDraft({ species: [], affectedCount: '', tagIds: [], symptoms: [], onsetDate: '', severity: '', notes: '' });
    setStep(1);
    setSubmitted(false);
    setCaseId('');
  };

  const scrollToList = () => {
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /* ── Success screen ─────────────────────────────────────────── */
  if (submitted) {
    return (
      <div className={s.page}>
        <div className={s.successOuter}>
          <div className={`${s.card} ${s.successScreen}`}>
            <div className={s.successIcon}>
              <CheckCircle2 size={52} strokeWidth={1.75} color="#16a34a" />
            </div>
            <h2 className={s.successTitle}>Report Submitted Successfully</h2>
            <div className={s.caseIdDisplay}>
              <span className={s.caseIdLabel}>Case ID</span>
              <span className={s.caseIdValue}>{caseId}</span>
            </div>
            <div className={s.successSub}>
              <Phone size={13} strokeWidth={2} />
              Sent to your registered phone number
            </div>

            <div className={s.timelineWrap}>
              {NEXT_STEPS.map(({ Icon, label }, i) => (
                <div key={label} className={s.timelineRow}>
                  <div className={s.timelineDotWrap}>
                    <div className={s.timelineDot}>
                      <Icon size={13} strokeWidth={2} />
                    </div>
                    {i < NEXT_STEPS.length - 1 && <div className={s.timelineConnector} />}
                  </div>
                  <span className={s.timelineLabel}>{label}</span>
                </div>
              ))}
            </div>

            <div className={s.successActions}>
              <button className={s.btnBack} onClick={scrollToList}>
                View My Reports <ArrowRight size={14} strokeWidth={2} />
              </button>
              <button className={s.btnNext} onClick={handleReportAnother}>
                <RotateCcw size={14} strokeWidth={2} /> Report Another
              </button>
            </div>
          </div>

          <div className={s.rightSide}>
            <MyReports listRef={listRef} />
            <WhatHappensNext />
          </div>
        </div>
      </div>
    );
  }

  /* ── Multi-step form ────────────────────────────────────────── */
  return (
    <div className={s.page}>

      {/* Page header */}
      <div>
        <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
          Report Disease Outbreak
        </h1>
        <p style={{ fontSize: '0.8125rem', color: '#94a3b8', margin: '2px 0 0' }}>
          Notify the Ministry of Livestock of a suspected disease in your herd
        </p>
      </div>

      <div className={s.pageLayout}>

        {/* ── Left: form card ─────────────────────────────────── */}
        <div className={s.formSide}>
          <div className={s.card}>

            <StepBar step={step} />

            {/* ─ Step 1: Affected Animals ─ */}
            {step === 1 && (
              <div className={s.stepBody}>
                <div className={s.fieldLabel}>Which species are affected?</div>
                <div className={s.speciesGrid}>
                  {SPECIES_OPTIONS.map(sp => (
                    <button
                      key={sp.key}
                      type="button"
                      className={[s.speciesCard, draft.species.includes(sp.key) ? s.speciesCardOn : ''].filter(Boolean).join(' ')}
                      onClick={() => toggleSpecies(sp.key)}
                    >
                      <span className={s.speciesEmoji}>{sp.emoji}</span>
                      <span className={s.speciesLabel}>{sp.label}</span>
                    </button>
                  ))}
                </div>

                <label className={s.fieldLabel} htmlFor="affectedCount">
                  How many animals are affected?
                </label>
                <input
                  id="affectedCount"
                  type="number"
                  min={1}
                  className={s.textInput}
                  placeholder="Enter number"
                  value={draft.affectedCount}
                  onChange={e => patch({ affectedCount: e.target.value })}
                />

                <div className={s.fieldLabel}>
                  Tag IDs <span className={s.optionalNote}>(optional)</span>
                </div>
                <div className={s.tagInputRow}>
                  <input
                    type="text"
                    className={s.textInput}
                    placeholder="e.g. TAG-001A"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  />
                  <button type="button" className={s.tagAddBtn} onClick={addTag}>
                    <Plus size={15} strokeWidth={2.5} /> Add
                  </button>
                </div>
                {draft.tagIds.length > 0 && (
                  <div className={s.tagChips}>
                    {draft.tagIds.map(t => (
                      <span key={t} className={s.tagChip}>
                        {t}
                        <button type="button" className={s.tagChipX} onClick={() => removeTag(t)}>
                          <X size={11} strokeWidth={2.5} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─ Step 2: Symptoms ─ */}
            {step === 2 && (
              <div className={s.stepBody}>
                <div className={s.stepHeadRow}>
                  <div className={s.fieldLabel} style={{ margin: 0 }}>Select all symptoms you have observed</div>
                  {draft.symptoms.length > 0 && (
                    <span className={s.cardBadge}>{draft.symptoms.length} selected</span>
                  )}
                </div>
                {SYMPTOM_GROUPS.map(grp => (
                  <div key={grp.group} className={s.symptomsGroup}>
                    <div className={s.groupLabel}>{grp.group}</div>
                    {grp.items.map(item => (
                      <label key={item} className={s.checkRow}>
                        <input
                          type="checkbox"
                          className={s.checkInput}
                          checked={draft.symptoms.includes(item)}
                          onChange={() => toggleSymptom(item)}
                        />
                        <span className={s.checkText}>{item}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* ─ Step 3: Details ─ */}
            {step === 3 && (
              <div className={s.stepBody}>
                <label className={s.fieldLabel} htmlFor="onsetDate">
                  When did symptoms first appear?
                </label>
                <input
                  id="onsetDate"
                  type="date"
                  className={s.textInput}
                  max={today()}
                  value={draft.onsetDate}
                  onChange={e => patch({ onsetDate: e.target.value })}
                />

                <div className={s.fieldLabel}>How severe is the outbreak?</div>
                <div className={s.severityGrid}>
                  {SEVERITY_OPTIONS.map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      className={[s.severityCard, draft.severity === opt.key ? s.severityCardOn : ''].filter(Boolean).join(' ')}
                      onClick={() => patch({ severity: opt.key })}
                    >
                      <span className={s.severityLabel}>{opt.label}</span>
                      <span className={s.severityDesc}>{opt.desc}</span>
                    </button>
                  ))}
                </div>

                <label className={s.fieldLabel} htmlFor="notes">
                  Additional notes <span className={s.optionalNote}>(optional)</span>
                </label>
                <textarea
                  id="notes"
                  className={s.textarea}
                  rows={4}
                  placeholder="Describe any other observations, recent movements, or contacts with other herds…"
                  value={draft.notes}
                  onChange={e => patch({ notes: e.target.value })}
                />

                <div className={s.photoPlaceholder}>
                  <span className={s.photoIcon}>📷</span>
                  <span className={s.photoText}>Photo upload available via mobile app</span>
                </div>
              </div>
            )}

            {/* ─ Step 4: Review ─ */}
            {step === 4 && (
              <div className={s.stepBody}>
                <div className={s.reviewCard}>
                  <div className={s.reviewSection}>
                    <div className={s.reviewSectionTitle}>Affected Animals</div>
                    <div className={s.reviewRow}>
                      <span className={s.reviewKey}>Species</span>
                      <span className={s.reviewVal}>
                        {draft.species.map(k => SPECIES_OPTIONS.find(o => o.key === k)?.label).filter(Boolean).join(', ')}
                      </span>
                    </div>
                    <div className={s.reviewRow}>
                      <span className={s.reviewKey}>Count</span>
                      <span className={s.reviewVal}>{draft.affectedCount} animals</span>
                    </div>
                    {draft.tagIds.length > 0 && (
                      <div className={s.reviewRow}>
                        <span className={s.reviewKey}>Tag IDs</span>
                        <span className={s.reviewVal}>{draft.tagIds.join(', ')}</span>
                      </div>
                    )}
                  </div>

                  <div className={s.reviewSection}>
                    <div className={s.reviewSectionTitle}>Symptoms ({draft.symptoms.length})</div>
                    <div className={s.reviewSymptoms}>
                      {draft.symptoms.map(sym => (
                        <span key={sym} className={s.reviewSymptomChip}>{sym}</span>
                      ))}
                    </div>
                  </div>

                  <div className={s.reviewSection}>
                    <div className={s.reviewSectionTitle}>Details</div>
                    <div className={s.reviewRow}>
                      <span className={s.reviewKey}>Onset date</span>
                      <span className={s.reviewVal}>{draft.onsetDate}</span>
                    </div>
                    <div className={s.reviewRow}>
                      <span className={s.reviewKey}>Severity</span>
                      <span className={s.reviewVal}>{draft.severity}</span>
                    </div>
                    {draft.notes && (
                      <div className={s.reviewRow}>
                        <span className={s.reviewKey}>Notes</span>
                        <span className={s.reviewVal}>{draft.notes}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className={s.warningNote}>
                  <AlertTriangle size={15} strokeWidth={2} color="#d97706" />
                  <span>
                    A field veterinary team will visit your premises. Please ensure animals are accessible.
                  </span>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className={s.stepNav}>
              {step > 1 ? (
                <button type="button" className={s.btnBack} onClick={() => setStep(s => s - 1)}>
                  Back
                </button>
              ) : (
                <span />
              )}

              {step < 4 ? (
                <button
                  type="button"
                  className={s.btnNext}
                  disabled={!canNext()}
                  onClick={() => setStep(s => s + 1)}
                >
                  Next <ChevronRight size={15} strokeWidth={2.5} />
                </button>
              ) : (
                <button type="button" className={s.btnSubmit} onClick={handleSubmit}>
                  <AlertTriangle size={15} strokeWidth={2} /> Submit Report
                </button>
              )}
            </div>

          </div>
        </div>

        {/* ── Right: My Reports + What happens next ─────────── */}
        <div className={s.rightSide}>
          <MyReports listRef={listRef} />
          <WhatHappensNext />
        </div>

      </div>
    </div>
  );
}

export default DiseaseReportingPage;
