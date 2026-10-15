import { useState, useEffect, useCallback } from 'react';
import { Tag, CheckCircle, Loader, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth.store';
import { logActivity } from '@/lib/activity';
import s from '../movements/movement-request.module.css';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Premises {
  id: string;
  premisesCode: string;
  premisesName: string;
}

interface Animal {
  id: string;
  animalTagId: string;
  species: string;
  breed: string;
  gender: string;
}

interface HealthForm {
  premisesId: string;
  premisesCode: string;
  premisesName: string;
  selectedAnimalIds: string[];
  healthEventType: string;
  priority: string;
  scheduledDate: string;
  notes: string;
  vetPreference: string;
}

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  initialPremisesCode?: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const HEALTH_TYPES = [
  { code: 'VACCINATION',           label: 'Vaccination'           },
  { code: 'CLINICAL_INSPECTION',   label: 'Clinical Inspection'   },
  { code: 'TREATMENT',             label: 'Treatment'             },
  { code: 'DISEASE_INVESTIGATION', label: 'Disease Investigation' },
];

const STEP_LABELS = ['Farm & Animals', 'Health Details', 'Review & Submit'];

const EMPTY_FORM: HealthForm = {
  premisesId: '', premisesCode: '', premisesName: '',
  selectedAnimalIds: [],
  healthEventType: '', priority: 'NORMAL',
  scheduledDate: '', notes: '', vetPreference: '',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function generateCode() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `HR-${ymd}-${rand}`;
}

function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div className={s.stepIndicator}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={s.stepItem}>
          {i > 0 && <div className={`${s.stepLine} ${i <= step ? s.stepLineDone : ''}`} />}
          <div className={`${s.stepDot} ${i === step ? s.stepDotActive : i < step ? s.stepDotDone : s.stepDotPending}`}>
            {i < step ? '✓' : i + 1}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────────

export function HealthRequestModal({ onClose, onSuccess, initialPremisesCode }: Props) {
  const { userId, farmerName, farmerId, region } = useAuthStore();
  const [step, setStep]           = useState(0);
  const [form, setForm]           = useState<HealthForm>(EMPTY_FORM);
  const [premisesList, setPremisesList] = useState<Premises[]>([]);
  const [animals, setAnimals]     = useState<Animal[]>([]);
  const [loadingAnimals, setLoadingAnimals] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [requestCode, setRequestCode] = useState('');

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('farmer_premises')
      .select('id, premises_code, premises_name')
      .eq('user_id', userId)
      .eq('status', 'APPROVED')
      .order('premises_name')
      .then(({ data }) => {
        if (!data) return;
        const rows = (data as any[]).map(p => ({
          id: p.id as string,
          premisesCode: p.premises_code as string,
          premisesName: p.premises_name as string,
        }));
        setPremisesList(rows);
        const auto = initialPremisesCode
          ? rows.find(r => r.premisesCode === initialPremisesCode)
          : rows.length === 1 ? rows[0] : null;
        if (auto) {
          setForm(f => ({ ...f, premisesId: auto.id, premisesCode: auto.premisesCode, premisesName: auto.premisesName }));
          loadAnimals(auto.premisesCode);
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadAnimals = useCallback(async (premisesCode: string) => {
    if (!userId || !premisesCode) return;
    setLoadingAnimals(true);
    const { data: batchData } = await supabase
      .from('batches')
      .select('id')
      .eq('premises_code', premisesCode)
      .eq('owner_id', userId);
    const batchIds = (batchData ?? []).map((b: any) => b.id as string);
    if (batchIds.length === 0) { setAnimals([]); setLoadingAnimals(false); return; }
    const { data } = await supabase
      .from('animals')
      .select('id, animal_code, tag_serial, species, breed, sex, tag_status')
      .in('batch_id', batchIds);
    setAnimals((data as any[] ?? []).map((a: any) => ({
      id:         a.id as string,
      animalTagId: a.tag_serial ?? a.animal_code ?? a.id,
      species:    (a.species as string) ?? '—',
      breed:      (a.breed   as string) ?? '',
      gender:     (a.sex     as string) ?? '',
    })));
    setLoadingAnimals(false);
  }, [userId]);

  function onPremisesChange(id: string) {
    const p = premisesList.find(x => x.id === id);
    if (!p) return;
    setForm(f => ({ ...f, premisesId: p.id, premisesCode: p.premisesCode, premisesName: p.premisesName, selectedAnimalIds: [] }));
    loadAnimals(p.premisesCode);
  }

  function toggleAnimal(id: string) {
    setForm(f => ({
      ...f,
      selectedAnimalIds: f.selectedAnimalIds.includes(id)
        ? f.selectedAnimalIds.filter(x => x !== id)
        : [...f.selectedAnimalIds, id],
    }));
  }

  async function submit() {
    setSubmitting(true);
    setError('');
    const code = generateCode();
    const selectedAnimals = animals.filter(a => form.selectedAnimalIds.includes(a.id));
    const { error: err } = await supabase.from('farmer_health_requests').insert({
      user_id:             userId,
      health_request_code: code,
      status:              'SUBMITTED',
      premises_id:         form.premisesId,
      premises_code:       form.premisesCode,
      premises_name:       form.premisesName,
      health_event_type:   form.healthEventType,
      priority:            form.priority,
      scheduled_date:      form.scheduledDate || null,
      notes:               form.notes || null,
      vet_preference:      form.vetPreference || null,
      animal_ids:          form.selectedAnimalIds,
      animal_tag_ids:      selectedAnimals.map(a => a.animalTagId),
      animal_count:        form.selectedAnimalIds.length,
    });
    setSubmitting(false);
    if (err) { setError(err.message); return; }

    void logActivity({
      category:      'HEALTH',
      level:         'INFO',
      title:         'Health event request submitted',
      detail:        `${form.healthEventType} for ${form.selectedAnimalIds.length} animal${form.selectedAnimalIds.length !== 1 ? 's' : ''} at ${form.premisesCode}`,
      actorName:     farmerName ?? undefined,
      actorRole:     'Farmer',
      region:        region ?? undefined,
      referenceCode: code,
      userId:        userId,
      farmerId:      farmerId,
    });

    setRequestCode(code);
    setSubmitted(true);
  }

  const step1Valid = !!form.premisesId && form.selectedAnimalIds.length > 0;
  const step2Valid = !!form.healthEventType && !!form.scheduledDate;
  const todayISO   = new Date().toISOString().split('T')[0];

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={s.modalHeader}>
          <div className={s.modalTitleGroup}>
            <div className={s.modalTitle}>Health Event Request</div>
            <div className={s.modalStepLabel}>
              {submitted ? 'Submitted' : `Step ${step + 1} of ${STEP_LABELS.length} — ${STEP_LABELS[step]}`}
            </div>
          </div>
          <button className={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {!submitted && <StepIndicator step={step} total={STEP_LABELS.length} />}

        {/* Body */}
        <div className={s.body}>

          {/* Success */}
          {submitted && (
            <div className={s.successState}>
              <div className={s.successIcon}><CheckCircle size={36} strokeWidth={1.5} /></div>
              <h2 className={s.successHeading}>Health Request Submitted</h2>
              <div className={s.successCode}>{requestCode}</div>
              <p className={s.successMessage}>
                Your health event request has been submitted. A veterinary officer will review and schedule a visit.
              </p>
              <button className={s.submitBtn} onClick={() => { onSuccess(); onClose(); }}>Done</button>
            </div>
          )}

          {/* Step 1 — Premises & Animals */}
          {!submitted && step === 0 && (
            <div className={s.stepContent}>
              <div className={s.fieldGroup}>
                <div className={s.animalListHeader}>
                  <label className={s.sectionLabel}>Farm</label>
                  {!initialPremisesCode && form.premisesId && premisesList.length > 1 && (
                    <button type="button" className={s.selectAllBtn} onClick={() => setForm(f => ({ ...f, premisesId: '', premisesCode: '', premisesName: '', selectedAnimalIds: [] }))}>Change</button>
                  )}
                </div>
                <div className={s.premisesGrid}>
                  {premisesList.map(p => {
                    const selected = form.premisesId === p.id;
                    const dimmed   = (!!form.premisesId && !selected) || (!!initialPremisesCode && !selected);
                    return (
                      <div
                        key={p.id}
                        className={`${s.premisesCard} ${selected ? s.premisesCardSelected : ''} ${dimmed ? s.premisesCardDimmed : ''}`}
                        onClick={() => !dimmed && !initialPremisesCode && onPremisesChange(p.id)}
                      >
                        <div className={s.premisesCardTop}>
                          <span className={s.premisesCardName}>{p.premisesName}</span>
                          {selected && <CheckCircle size={15} strokeWidth={2.5} color="#2563eb" style={{ flexShrink: 0 }} />}
                        </div>
                        <span className={s.premisesCardCode}>{p.premisesCode}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {form.premisesId && (
                <div className={s.fieldGroup}>
                  <div className={s.animalListHeader}>
                    <span className={s.sectionLabel}>
                      Animals <span className={s.optional}>(select animals for this health event)</span>
                    </span>
                    <button
                      className={s.selectAllBtn}
                      onClick={() => setForm(f => ({
                        ...f,
                        selectedAnimalIds: f.selectedAnimalIds.length === animals.length ? [] : animals.map(a => a.id),
                      }))}
                    >
                      {form.selectedAnimalIds.length === animals.length ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>

                  {loadingAnimals ? (
                    <div className={s.loadingRow}><Loader size={14} className={s.spinIcon} /> Loading animals…</div>
                  ) : animals.length === 0 ? (
                    <p className={s.hintText}>No active animals on this premises.</p>
                  ) : (
                    <div className={s.animalList}>
                      {animals.map(a => {
                        const sel = form.selectedAnimalIds.includes(a.id);
                        return (
                          <div key={a.id} className={`${s.animalRow} ${sel ? s.animalRowSelected : ''}`} onClick={() => toggleAnimal(a.id)}>
                            <input type="checkbox" className={s.animalCheck} checked={sel} readOnly />
                            <Tag size={12} className={s.animalTagIcon} />
                            <span className={s.animalTagId}>{a.animalTagId}</span>
                            <span className={s.speciesTag}>{a.species}</span>
                            <span className={s.animalMeta}>{[a.breed, a.gender].filter(Boolean).join(' · ')}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {form.selectedAnimalIds.length > 0 && (
                    <div className={s.selectionCount}>
                      {form.selectedAnimalIds.length} animal{form.selectedAnimalIds.length !== 1 ? 's' : ''} selected
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2 — Health Details */}
          {!submitted && step === 1 && (
            <div className={s.stepContent}>
              <div className={s.fieldGroup}>
                <label className={s.sectionLabel}>Health Event Type</label>
                <select
                  className={s.select}
                  value={form.healthEventType}
                  onChange={e => setForm(f => ({ ...f, healthEventType: e.target.value }))}
                >
                  <option value="">Select type…</option>
                  {HEALTH_TYPES.map(t => (
                    <option key={t.code} value={t.code}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className={s.fieldRow}>
                <div className={s.fieldGroup}>
                  <label className={s.sectionLabel}>Priority</label>
                  <select
                    className={s.select}
                    value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div className={s.fieldGroup}>
                  <label className={s.sectionLabel}>Requested Date</label>
                  <input
                    type="date"
                    className={s.input}
                    min={todayISO}
                    value={form.scheduledDate}
                    onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className={s.fieldGroup}>
                <label className={s.sectionLabel}>Notes / Symptoms <span className={s.optional}>(optional)</span></label>
                <textarea
                  className={s.textarea}
                  placeholder="Describe symptoms, concerns, or reason for the request…"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>

              <div className={s.fieldGroup}>
                <label className={s.sectionLabel}>Preferred Vet <span className={s.optional}>(optional)</span></label>
                <input
                  type="text"
                  className={s.input}
                  placeholder="Name or clinic (optional)"
                  value={form.vetPreference}
                  onChange={e => setForm(f => ({ ...f, vetPreference: e.target.value }))}
                />
              </div>
            </div>
          )}

          {/* Step 3 — Review */}
          {!submitted && step === 2 && (
            <div className={s.stepContent}>
              <p className={s.reviewIntro}>
                Review your health request before submitting. A veterinary officer will schedule a visit.
              </p>

              <div className={s.reviewSection}>
                <div className={s.reviewSectionTitle}>Farm & Animals</div>
                <div className={s.reviewRow}>
                  <span className={s.reviewKey}>Farm</span>
                  <span className={s.reviewVal}>{form.premisesName}</span>
                </div>
                <div className={s.reviewRow}>
                  <span className={s.reviewKey}>Code</span>
                  <span className={`${s.reviewVal} ${s.monoCode}`}>{form.premisesCode}</span>
                </div>
                <div className={s.reviewRow}>
                  <span className={s.reviewKey}>Animals</span>
                  <span className={s.reviewVal}>{form.selectedAnimalIds.length} selected</span>
                </div>
              </div>

              <div className={s.reviewSection}>
                <div className={s.reviewSectionTitle}>Health Event Details</div>
                <div className={s.reviewRow}>
                  <span className={s.reviewKey}>Type</span>
                  <span className={s.reviewVal}>{HEALTH_TYPES.find(t => t.code === form.healthEventType)?.label ?? form.healthEventType}</span>
                </div>
                <div className={s.reviewRow}>
                  <span className={s.reviewKey}>Priority</span>
                  <span className={s.reviewVal}>{form.priority}</span>
                </div>
                <div className={s.reviewRow}>
                  <span className={s.reviewKey}>Requested Date</span>
                  <span className={s.reviewVal}>{form.scheduledDate}</span>
                </div>
                {form.notes && (
                  <div className={s.reviewRow}>
                    <span className={s.reviewKey}>Notes</span>
                    <span className={s.reviewVal}>{form.notes}</span>
                  </div>
                )}
                {form.vetPreference && (
                  <div className={s.reviewRow}>
                    <span className={s.reviewKey}>Preferred Vet</span>
                    <span className={s.reviewVal}>{form.vetPreference}</span>
                  </div>
                )}
              </div>

              {error && (
                <div className={s.inlineError}>
                  <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  {error}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        {!submitted && (
          <div className={s.footer}>
            <div className={s.footerLeft}>
              {step === 0
                ? <button className={s.backBtn} onClick={onClose}>Cancel</button>
                : <button className={s.backBtn} onClick={() => setStep(p => p - 1)} disabled={submitting}>← Back</button>
              }
            </div>
            <div className={s.footerRight}>
              {step < 2 && (
                <button
                  className={s.submitBtn}
                  disabled={step === 0 ? !step1Valid : !step2Valid}
                  onClick={() => setStep(p => p + 1)}
                >
                  Continue →
                </button>
              )}
              {step === 2 && (
                <button className={s.submitBtn} disabled={submitting} onClick={submit}>
                  {submitting ? <><Loader size={14} className={s.spinIcon} /> Submitting…</> : 'Submit Request'}
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default HealthRequestModal;
