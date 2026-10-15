import { useState, useCallback, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, CheckCircle, AlertCircle, Loader, Camera } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import {
  submitRegistration, requestPhotoUploadUrl,
  uploadPhotoToBlob, confirmPhotoUpload,
} from '../animals.api';
import type { RegistrationFormData, Species } from '../animals.types';
import { BREEDS, BREED_LABELS } from '../animals.types';
import s from './register-modal.module.css';

// ── Step config ───────────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Type',     icon: '📋' },
  { label: 'Species',  icon: '🐄' },
  { label: 'Physical', icon: '📏' },
  { label: 'Tag',      icon: '🏷️' },
  { label: 'Photos',   icon: '📷' },
  { label: 'Review',   icon: '✅' },
];

// ── Domain config ─────────────────────────────────────────────────────────────

const SPECIES_CONFIG: Record<Species, { emoji: string; name: string; sub: string; bg: string }> = {
  CATTLE: { emoji: '🐄', name: 'Cattle',  sub: 'Zebu, Boran, Somali breeds',          bg: '#fff7ed' },
  CAMEL:  { emoji: '🐪', name: 'Camel',   sub: 'Dromedary (one hump)',                bg: '#fefce8' },
  GOAT:   { emoji: '🐐', name: 'Goat',    sub: 'Somali, Galla, Benadir',              bg: '#f0fdf4' },
  SHEEP:  { emoji: '🐑', name: 'Sheep',   sub: 'Blackhead, Ogaden, Benadir',          bg: '#f5f3ff' },
};

const COAT_COLORS = [
  { label: 'Black',       hex: '#1a1a1a' },
  { label: 'Dark Brown',  hex: '#3d1c02' },
  { label: 'Brown',       hex: '#7c4a2c' },
  { label: 'Red-Brown',   hex: '#8b3a1a' },
  { label: 'Lt Brown',    hex: '#b87b55' },
  { label: 'Tan',         hex: '#c8a47a' },
  { label: 'Cream',       hex: '#f5dcb0' },
  { label: 'White',       hex: '#efefef' },
  { label: 'Grey',        hex: '#808080' },
  { label: 'Roan',        hex: '#b05030' },
  { label: 'Dun',         hex: '#c5a256' },
  { label: 'Piebald',     hex: '' },       // special gradient handled inline
];

const BCS = [
  { score: '1', label: 'Emaciated', desc: 'Bones visible' },
  { score: '2', label: 'Thin',      desc: 'Bones felt'    },
  { score: '3', label: 'Moderate',  desc: 'Normal'        },
  { score: '4', label: 'Good',      desc: 'Well-covered'  },
  { score: '5', label: 'Fat',       desc: 'Heavy fat'     },
];

const VACCINE_TYPES = [
  'FMD', 'Brucellosis', 'Anthrax', 'PPR',
  'Blackleg', 'CBPP', 'Lumpy Skin', 'Rift Valley Fever',
];

const TAG_COLORS = [
  { label: 'Yellow', hex: '#facc15' },
  { label: 'Orange', hex: '#f97316' },
  { label: 'Red',    hex: '#ef4444' },
  { label: 'Green',  hex: '#22c55e' },
  { label: 'Blue',   hex: '#3b82f6' },
  { label: 'White',  hex: '#f1f5f9' },
  { label: 'Black',  hex: '#1a1a1a' },
];

const SOMALIA_PORTS = ['Mogadishu', 'Berbera', 'Kismayo', 'Bosaso', 'Marka'];

// ── Initial form state ────────────────────────────────────────────────────────

const INITIAL: RegistrationFormData = {
  submissionType: 'BIRTH',
  species: '',
  breed: '',
  sex: '',
  dob: '',
  dobPrecision: 'EXACT',
  coatColor: '',
  distinguishingMarks: '',
  tagSerial: '',
  premisesId: '',
  photoFile: null,
  photoCaption: '',

  ageMonths: '',
  weightKg: '',
  bodyConditionScore: '',
  coatPattern: '',
  hornStatus: '',

  damTagSerial: '',
  sireTagSerial: '',

  sourceOwnerName: '',
  sourcePremisesId: '',
  purchaseDate: '',
  purchasePrice: '',

  countryOfOrigin: '',
  importPermitNumber: '',
  portOfEntry: '',
  importDate: '',

  tagType: 'RFID',
  tagColor: 'Yellow',
  tagPlacement: '',
  secondaryTagSerial: '',

  healthStatus: '',
  vaccinationStatus: '',
  lastVaccinationDate: '',
  vaccinationTypes: [],
  dewormingStatus: '',
  veterinaryNotes: '',

  rightSidePhoto: null,
  frontPhoto: null,
  tagCloseupPhoto: null,
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RegisterModal({ onClose, onSuccess }: Props): JSX.Element {
  const { userId } = useAuthStore();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<RegistrationFormData>({ ...INITIAL });

  // Photo previews
  const [primaryPreview,  setPrimaryPreview]  = useState<string | null>(null);
  const [rightPreview,    setRightPreview]    = useState<string | null>(null);
  const [frontPreview,    setFrontPreview]    = useState<string | null>(null);
  const [tagPreview,      setTagPreview]      = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [done, setDone] = useState<{ animalCode: string; submissionCode: string } | null>(null);

  // Hidden file input refs for each photo slot
  const primaryInputRef = useRef<HTMLInputElement>(null);
  const rightInputRef   = useRef<HTMLInputElement>(null);
  const frontInputRef   = useRef<HTMLInputElement>(null);
  const tagInputRef     = useRef<HTMLInputElement>(null);

  // ── Form helpers ────────────────────────────────────────────────────────────

  const set = <K extends keyof RegistrationFormData>(k: K, v: RegistrationFormData[K]) =>
    setForm(f => ({ ...f, [k]: v, ...(k === 'species' ? { breed: '' } : {}) }));

  const toggleVaccineType = (type: string) =>
    setForm(f => ({
      ...f,
      vaccinationTypes: f.vaccinationTypes.includes(type)
        ? f.vaccinationTypes.filter(t => t !== type)
        : [...f.vaccinationTypes, type],
    }));

  // ── Photo helpers ───────────────────────────────────────────────────────────

  const makePhotoReader = useCallback(
    (
      field: 'photoFile' | 'rightSidePhoto' | 'frontPhoto' | 'tagCloseupPhoto',
      setPreview: (url: string) => void,
    ) =>
      (file: File) => {
        setForm(f => ({ ...f, [field]: file }));
        const reader = new FileReader();
        reader.onload = e => setPreview(e.target?.result as string);
        reader.readAsDataURL(file);
      },
    [],
  );

  const handlePrimaryPhoto = useCallback(
    makePhotoReader('photoFile', setPrimaryPreview),
    [makePhotoReader],
  );
  const handleRightPhoto = useCallback(
    makePhotoReader('rightSidePhoto', setRightPreview),
    [makePhotoReader],
  );
  const handleFrontPhoto = useCallback(
    makePhotoReader('frontPhoto', setFrontPreview),
    [makePhotoReader],
  );
  const handleTagPhoto = useCallback(
    makePhotoReader('tagCloseupPhoto', setTagPreview),
    [makePhotoReader],
  );

  const clearPhoto = (
    field: 'photoFile' | 'rightSidePhoto' | 'frontPhoto' | 'tagCloseupPhoto',
    setPreview: (url: string | null) => void,
    inputRef: React.RefObject<HTMLInputElement>,
  ) => {
    setForm(f => ({ ...f, [field]: null }));
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  // ── Advance guard ───────────────────────────────────────────────────────────

  const canAdvance = (): boolean => {
    switch (step) {
      case 0: return !!form.submissionType;
      case 1: return !!form.species && !!form.breed;
      case 2: return !!form.sex;
      case 3: return !!form.tagSerial && !!form.premisesId;
      case 4: return true;
      default: return true;
    }
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await submitRegistration(form, userId);
      const { animalId } = result;

      const photoUploads: Array<{ file: File; caption: string }> = [];
      if (form.photoFile)       photoUploads.push({ file: form.photoFile,       caption: 'Left side'  });
      if (form.rightSidePhoto)  photoUploads.push({ file: form.rightSidePhoto,  caption: 'Right side' });
      if (form.frontPhoto)      photoUploads.push({ file: form.frontPhoto,       caption: 'Front face' });
      if (form.tagCloseupPhoto) photoUploads.push({ file: form.tagCloseupPhoto, caption: 'Ear tag'    });

      for (const { file, caption } of photoUploads) {
        try {
          const urlRes = await requestPhotoUploadUrl(animalId, file);
          await uploadPhotoToBlob(urlRes.uploadUrl, file);
          await confirmPhotoUpload(animalId, urlRes.photoId, file, caption);
        } catch {
          // Photo upload failure is non-blocking — registration succeeded
        }
      }

      setDone({ animalCode: result.animalCode, submissionCode: result.submissionCode });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => { onSuccess(); onClose(); };

  // ── Done screen ─────────────────────────────────────────────────────────────

  if (done) {
    return (
      <div className={s.overlay} onClick={onClose}>
        <div className={s.modal} onClick={e => e.stopPropagation()}>
          <div className={s.doneWrap}>
            <CheckCircle size={52} strokeWidth={1.25} color="#16a34a" />
            <div className={s.doneTitle}>Registration Submitted!</div>
            <div className={s.doneSub}>
              Your animal has been submitted for verification by a field officer.
            </div>
            <div className={s.codePills}>
              <div className={s.codePill}>
                <span className={s.codeLabel}>Animal Code</span>
                <span className={s.codeVal}>{done.animalCode}</span>
              </div>
              <div className={s.codePill}>
                <span className={s.codeLabel}>Submission</span>
                <span className={s.codeVal}>{done.submissionCode}</span>
              </div>
            </div>
            <button className={s.doneBtn} onClick={handleFinish}>View My Animals</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Derived display values ──────────────────────────────────────────────────

  const speciesCfg = form.species ? SPECIES_CONFIG[form.species] : null;
  const photoCount = [form.photoFile, form.rightSidePhoto, form.frontPhoto, form.tagCloseupPhoto]
    .filter(Boolean).length;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={s.header}>
          <div>
            <div className={s.title}>Register Animal</div>
            <div className={s.stepLabel}>Step {step + 1} of {STEPS.length}: {STEPS[step].label}</div>
          </div>
          <button className={s.closeBtn} onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Visual step track */}
        <div className={s.stepTrack}>
          {STEPS.map((st, i) => (
            <StepTrackItem
              key={i}
              icon={st.icon}
              label={st.label}
              state={i < step ? 'done' : i === step ? 'active' : 'idle'}
              isLast={i === STEPS.length - 1}
              doneLine={i < step}
            />
          ))}
        </div>

        {/* Body */}
        <div className={s.body}>

          {/* ── Step 0: Registration Type ── */}
          {step === 0 && (
            <div className={s.fields}>
              <div className={s.sectionHeading}>How did you acquire this animal?</div>
              <div className={s.typeGrid}>
                <TypeCard
                  active={form.submissionType === 'BIRTH'}
                  icon="🐣"
                  name="Birth Registration"
                  desc="Animal was born on your farm or holding"
                  onClick={() => set('submissionType', 'BIRTH')}
                />
                <TypeCard
                  active={form.submissionType === 'PURCHASE'}
                  icon="🤝"
                  name="Purchased Animal"
                  desc="Bought from another owner or market"
                  onClick={() => set('submissionType', 'PURCHASE')}
                />
                <TypeCard
                  active={form.submissionType === 'IMPORT'}
                  icon="✈️"
                  name="Imported Animal"
                  desc="Brought from another country with official permits"
                  onClick={() => set('submissionType', 'IMPORT')}
                />
              </div>
            </div>
          )}

          {/* ── Step 1: Species & Breed ── */}
          {step === 1 && (
            <div className={s.fields}>
              <div className={s.sectionHeading}>Select species</div>
              <div className={s.speciesGrid}>
                {(Object.keys(SPECIES_CONFIG) as Species[]).map(sp => {
                  const cfg = SPECIES_CONFIG[sp];
                  return (
                    <button
                      key={sp}
                      type="button"
                      className={`${s.speciesCard}${form.species === sp ? ' ' + s.speciesCardActive : ''}`}
                      style={{ background: form.species === sp ? '#eff6ff' : cfg.bg }}
                      onClick={() => set('species', sp)}
                    >
                      <span className={s.speciesEmoji}>{cfg.emoji}</span>
                      <span className={s.speciesName}>{cfg.name}</span>
                      <span className={s.speciesSub}>{cfg.sub}</span>
                    </button>
                  );
                })}
              </div>

              {form.species && (
                <>
                  <div className={s.sectionHeading} style={{ marginTop: 4 }}>Select breed</div>
                  <div className={s.breedGrid}>
                    {(BREEDS[form.species] ?? []).map(b => (
                      <button
                        key={b}
                        type="button"
                        className={`${s.breedChip}${form.breed === b ? ' ' + s.breedChipActive : ''}`}
                        onClick={() => set('breed', b)}
                      >
                        {BREED_LABELS[b] ?? b}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Step 2: Physical Details ── */}
          {step === 2 && (
            <div className={s.fields}>

              {/* Hint */}
              <div className={s.infoBox}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>📋</span>
                <div>
                  <strong style={{ display: 'block', marginBottom: 6 }}>How to fill in this page</strong>
                  <span>Select or enter each characteristic that describes this animal. You do not need to fill everything — skip what you do not know.</span>
                  <ul style={{ margin: '8px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <li><strong>Sex</strong> — tap Male, Female or Unknown</li>
                    <li><strong>Date of Birth</strong> — pick the birth date, or enter the age in months if the exact date is not known (e.g. 18 months)</li>
                    <li><strong>Weight</strong> — live weight in kilograms (e.g. 180 kg for a young cow, 350 kg for adult cattle)</li>
                    <li><strong>Body Condition Score (BCS)</strong> — rate from 1 (very thin) to 5 (fat). Score 3 is normal and healthy</li>
                    <li><strong>Coat Color</strong> — tap the circle that best matches the animal's main colour</li>
                    <li><strong>Distinguishing Marks</strong> — any scars, brands, notches or unusual features that help identify this animal</li>
                  </ul>
                </div>
              </div>

              {/* Sex */}
              <div className={s.field}>
                <span className={s.label}>Sex <span className={s.req}>*</span></span>
                <div className={s.sexRow}>
                  {(['MALE', 'FEMALE', 'UNKNOWN'] as const).map(sx => (
                    <button
                      key={sx}
                      type="button"
                      className={`${s.sexBtn}${form.sex === sx ? ' ' + s.sexBtnActive : ''}`}
                      onClick={() => set('sex', sx)}
                    >
                      {sx === 'MALE' ? '♂ Male' : sx === 'FEMALE' ? '♀ Female' : '? Unknown'}
                    </button>
                  ))}
                </div>
              </div>

              {/* DOB row */}
              <div className={s.row}>
                <div className={s.field}>
                  <label className={s.label}>Date of Birth</label>
                  <input
                    className={s.input}
                    type="date"
                    value={form.dob}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={e => set('dob', e.target.value)}
                  />
                </div>
                <div className={s.field}>
                  {form.dob ? (
                    <>
                      <label className={s.label}>DOB Precision</label>
                      <select
                        className={s.select}
                        value={form.dobPrecision}
                        onChange={e => set('dobPrecision', e.target.value as 'EXACT' | 'ESTIMATED' | 'UNKNOWN')}
                      >
                        <option value="EXACT">Exact date</option>
                        <option value="ESTIMATED">Estimated</option>
                        <option value="UNKNOWN">Unknown</option>
                      </select>
                    </>
                  ) : (
                    <>
                      <label className={s.label}>Estimated Age (months)</label>
                      <input
                        className={s.input}
                        type="number"
                        min="0"
                        value={form.ageMonths}
                        onChange={e => set('ageMonths', e.target.value)}
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Weight + BCS */}
              <div className={s.row}>
                <div className={s.field}>
                  <label className={s.label}>Live Weight (kg)</label>
                  <input
                    className={s.input}
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.weightKg}
                    onChange={e => set('weightKg', e.target.value)}
                  />
                </div>
                <div className={s.field}>
                  <span className={s.label}>Body Condition Score</span>
                  <div className={s.bcsRow}>
                    {BCS.map(b => (
                      <button
                        key={b.score}
                        type="button"
                        className={`${s.bcsBtn}${form.bodyConditionScore === b.score ? ' ' + s.bcsBtnActive : ''}`}
                        title={`${b.label} — ${b.desc}`}
                        onClick={() => set('bodyConditionScore', b.score)}
                      >
                        {b.score}
                        <span className={s.bcsLabel}>{b.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Coat color */}
              <div className={s.field}>
                <span className={s.label}>Coat Color</span>
                <div className={s.colorGrid}>
                  {COAT_COLORS.map(c => (
                    <div key={c.label} className={s.colorItem}>
                      <button
                        type="button"
                        className={`${s.colorSwatch}${form.coatColor === c.label ? ' ' + s.colorSwatchActive : ''}`}
                        style={
                          c.label === 'Piebald'
                            ? { background: 'linear-gradient(135deg, #1a1a1a 50%, #efefef 50%)', border: '3px solid transparent' }
                            : { background: c.hex, border: '3px solid transparent' }
                        }
                        title={c.label}
                        onClick={() => set('coatColor', c.label)}
                      />
                      <span className={s.colorLabel}>{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Coat pattern */}
              <div className={s.field}>
                <span className={s.label}>Coat Pattern</span>
                <div className={s.hornRow}>
                  {['SOLID', 'SPOTTED', 'PIEBALD', 'STRIPED'].map(p => (
                    <button
                      key={p}
                      type="button"
                      className={`${s.hornBtn}${form.coatPattern === p ? ' ' + s.hornBtnActive : ''}`}
                      onClick={() => set('coatPattern', p)}
                    >
                      {p.charAt(0) + p.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Horn status */}
              <div className={s.field}>
                <span className={s.label}>Horn Status</span>
                <div className={s.hornRow}>
                  {[
                    { val: 'HORNED',   label: '🦌 Horned'   },
                    { val: 'POLLED',   label: 'Polled'       },
                    { val: 'DEHORNED', label: 'Dehorned'     },
                    { val: 'NA',       label: 'N/A'          },
                  ].map(h => (
                    <button
                      key={h.val}
                      type="button"
                      className={`${s.hornBtn}${form.hornStatus === h.val ? ' ' + s.hornBtnActive : ''}`}
                      onClick={() => set('hornStatus', h.val)}
                    >
                      {h.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Distinguishing marks */}
              <div className={s.field}>
                <label className={s.label}>Distinguishing Marks</label>
                <span className={s.hint}>Any scar, brand, notch, or unusual feature that helps identify this specific animal</span>
                <textarea
                  className={s.textarea}
                  value={form.distinguishingMarks}
                  onChange={e => set('distinguishingMarks', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* ── Step 3: Tag & Location ── */}
          {step === 3 && (
            <div className={s.fields}>
              <div className={s.infoBox}>
                <span>🏷️</span>
                <span>The tag serial must match the officially issued RFID transponder assigned to this animal by the livestock authority.</span>
              </div>

              {/* RFID locked badge */}
              <div className={s.field}>
                <span className={s.label}>Tag Type</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 10, width: 'fit-content' }}>
                  <span style={{ fontSize: 18 }}>📡</span>
                  <span style={{ fontWeight: 700, color: '#1d4ed8', fontSize: '0.9rem' }}>RFID</span>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: 4 }}>Official tag type</span>
                </div>
              </div>

              <div className={s.field}>
                <label className={s.label}>Tag Serial Number <span className={s.req}>*</span></label>
                <input
                  className={s.input}
                  placeholder="e.g. TG-SOM-2024-001234"
                  value={form.tagSerial}
                  onChange={e => set('tagSerial', e.target.value.toUpperCase())}
                />
              </div>

              {/* Tag color */}
              <div className={s.field}>
                <span className={s.label}>Tag Color</span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                  {TAG_COLORS.map(c => (
                    <button
                      key={c.label}
                      type="button"
                      title={c.label}
                      className={`${s.colorSwatch}${form.tagColor === c.label ? ' ' + s.colorSwatchActive : ''}`}
                      style={{
                        background: c.hex,
                        border: '3px solid transparent',
                        width: 32,
                        height: 32,
                      }}
                      onClick={() => set('tagColor', c.label)}
                    />
                  ))}
                </div>
              </div>

              {/* Premises */}
              <div className={s.field}>
                <label className={s.label}>Farm ID <span className={s.req}>*</span></label>
                <input
                  className={s.input}
                  placeholder="Your registered farm / holding ID"
                  value={form.premisesId}
                  onChange={e => set('premisesId', e.target.value)}
                />
                <span className={s.hint}>
                  Your premises identifier is issued by the Ministry of Livestock. Contact your local livestock office if you do not have one.
                </span>
              </div>
            </div>
          )}

          {/* ── Step 4: Photos ── */}
          {step === 4 && (
            <div className={s.fields}>
              <div className={s.sectionHeading}>Animal Photos</div>
              <div className={s.infoBox}>
                <Camera size={16} />
                <span>Photos are optional but strongly recommended. Clear photos help with identification and speed up verification.</span>
              </div>

              <div className={s.photoGrid}>

                {/* Slot 1 — Left side (primary) */}
                <PhotoSlot
                  label="Left Side"
                  preview={primaryPreview}
                  required
                  inputRef={primaryInputRef}
                  onFile={handlePrimaryPhoto}
                  onRemove={() => clearPhoto('photoFile', setPrimaryPreview, primaryInputRef)}
                />

                {/* Slot 2 — Right side */}
                <PhotoSlot
                  label="Right Side"
                  preview={rightPreview}
                  inputRef={rightInputRef}
                  onFile={handleRightPhoto}
                  onRemove={() => clearPhoto('rightSidePhoto', setRightPreview, rightInputRef)}
                />

                {/* Slot 3 — Front face */}
                <PhotoSlot
                  label="Front Face"
                  preview={frontPreview}
                  inputRef={frontInputRef}
                  onFile={handleFrontPhoto}
                  onRemove={() => clearPhoto('frontPhoto', setFrontPreview, frontInputRef)}
                />

                {/* Slot 4 — Ear tag */}
                <PhotoSlot
                  label="Ear Tag"
                  preview={tagPreview}
                  inputRef={tagInputRef}
                  onFile={handleTagPhoto}
                  onRemove={() => clearPhoto('tagCloseupPhoto', setTagPreview, tagInputRef)}
                />
              </div>

              <div className={s.photoTips}>
                <div className={s.photoTipsTitle}>Photo tips</div>
                <ul className={s.photoTipsList}>
                  <li>Use natural daylight when possible — avoid harsh flash</li>
                  <li>Left Side: capture the full body in frame</li>
                  <li>Ear Tag: ensure the serial number is readable</li>
                  <li>Keep the animal calm and standing naturally</li>
                </ul>
              </div>
            </div>
          )}

          {/* ── Step 5: Review & Submit ── */}
          {step === 5 && (
            <div className={s.fields}>
              <div className={s.reviewCard}>

                {/* Animal header */}
                <div className={s.reviewAnimalHeader}>
                  {speciesCfg && (
                    <div
                      className={s.reviewAnimalEmoji}
                      style={{ background: speciesCfg.bg }}
                    >
                      {speciesCfg.emoji}
                    </div>
                  )}
                  <div>
                    <div className={s.reviewAnimalName}>
                      {speciesCfg?.name ?? '—'} — {(BREED_LABELS[form.breed] ?? form.breed) || '—'}
                    </div>
                    <div className={s.reviewAnimalSub}>
                      {form.sex || 'Unknown sex'}
                      {form.dob ? ` · Born ${form.dob}` : form.ageMonths ? ` · ~${form.ageMonths} months` : ''}
                    </div>
                  </div>
                </div>

                {/* Registration section */}
                <div className={s.reviewSection}>
                  <div className={s.reviewSectionTitle}>Registration</div>
                  <div className={s.reviewRow}>
                    <span className={s.reviewLabel}>Type</span>
                    <span className={s.reviewValue}>{form.submissionType}</span>
                  </div>
                  <div className={s.reviewRow}>
                    <span className={s.reviewLabel}>Date</span>
                    <span className={s.reviewValue}>{new Date().toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Physical section */}
                <div className={s.reviewSection}>
                  <div className={s.reviewSectionTitle}>Physical</div>
                  <div className={s.reviewGrid}>
                    <div className={s.reviewRow}>
                      <span className={s.reviewLabel}>Weight</span>
                      <span className={s.reviewValue}>{form.weightKg ? `${form.weightKg} kg` : '—'}</span>
                    </div>
                    <div className={s.reviewRow}>
                      <span className={s.reviewLabel}>BCS</span>
                      <span className={s.reviewValue}>{form.bodyConditionScore || '—'}</span>
                    </div>
                    <div className={s.reviewRow}>
                      <span className={s.reviewLabel}>Coat Color</span>
                      <span className={s.reviewValue}>{form.coatColor || '—'}</span>
                    </div>
                    <div className={s.reviewRow}>
                      <span className={s.reviewLabel}>Pattern</span>
                      <span className={s.reviewValue}>{form.coatPattern || '—'}</span>
                    </div>
                    <div className={s.reviewRow}>
                      <span className={s.reviewLabel}>Horns</span>
                      <span className={s.reviewValue}>{form.hornStatus || '—'}</span>
                    </div>
                    <div className={s.reviewRow}>
                      <span className={s.reviewLabel}>Marks</span>
                      <span className={s.reviewValue}>{form.distinguishingMarks || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Tag & Location section */}
                <div className={s.reviewSection}>
                  <div className={s.reviewSectionTitle}>Tag & Location</div>
                  <div className={s.reviewGrid}>
                    <div className={s.reviewRow}>
                      <span className={s.reviewLabel}>Tag Serial</span>
                      <span className={s.reviewValue}>{form.tagSerial}</span>
                    </div>
                    <div className={s.reviewRow}>
                      <span className={s.reviewLabel}>Tag Type</span>
                      <span className={s.reviewValue}>📡 RFID</span>
                    </div>
                    <div className={s.reviewRow}>
                      <span className={s.reviewLabel}>Tag Color</span>
                      <span className={s.reviewValue}>{form.tagColor || '—'}</span>
                    </div>
                    <div className={s.reviewRow}>
                      <span className={s.reviewLabel}>Farm ID</span>
                      <span className={s.reviewValue}>{form.premisesId}</span>
                    </div>
                  </div>
                </div>

                {/* Photos section */}
                <div className={s.reviewSection}>
                  <div className={s.reviewSectionTitle}>Photos</div>
                  <div className={s.reviewRow}>
                    <span className={s.reviewLabel}>Photos uploaded</span>
                    <span className={s.reviewValue}>
                      {photoCount === 0 ? 'None' : `${photoCount} photo${photoCount > 1 ? 's' : ''}`}
                    </span>
                  </div>
                </div>
              </div>

              {error && (
                <div className={s.errorBox}>
                  <AlertCircle size={16} strokeWidth={2} />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={s.footer}>
          <button
            type="button"
            className={s.backBtn}
            onClick={() => setStep(p => p - 1)}
            disabled={step === 0}
          >
            <ChevronLeft size={16} strokeWidth={2} />
            Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              className={s.nextBtn}
              onClick={() => setStep(p => p + 1)}
              disabled={!canAdvance()}
            >
              Continue
              <ChevronRight size={16} strokeWidth={2} />
            </button>
          ) : (
            <button
              type="button"
              className={s.submitBtn}
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading && <Loader size={15} strokeWidth={2} className={s.spin} />}
              {loading ? 'Submitting…' : 'Submit Registration'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface StepTrackItemProps {
  icon: string;
  label: string;
  state: 'idle' | 'active' | 'done';
  isLast: boolean;
  doneLine: boolean;
}

function StepTrackItem({ icon, label, state, isLast, doneLine }: StepTrackItemProps): JSX.Element {
  const circleClass =
    state === 'active' ? `${s.stepCircle} ${s.stepCircleActive}`
    : state === 'done'  ? `${s.stepCircle} ${s.stepCircleDone}`
    : s.stepCircle;

  const nameClass = state === 'active' ? `${s.stepName} ${s.stepNameActive}` : s.stepName;

  return (
    <>
      <div className={s.stepItem}>
        <div className={circleClass}>{state === 'done' ? '✓' : icon}</div>
        <span className={nameClass}>{label}</span>
      </div>
      {!isLast && (
        <div className={`${s.stepLine}${doneLine ? ' ' + s.stepLineDone : ''}`} />
      )}
    </>
  );
}

interface TypeCardProps {
  active: boolean;
  icon: string;
  name: string;
  desc: string;
  onClick: () => void;
}

function TypeCard({ active, icon, name, desc, onClick }: TypeCardProps): JSX.Element {
  return (
    <button
      type="button"
      className={`${s.typeCard}${active ? ' ' + s.typeCardActive : ''}`}
      onClick={onClick}
    >
      <div className={s.typeIcon}>{icon}</div>
      <div className={s.typeName}>{name}</div>
      <div className={s.typeDesc}>{desc}</div>
    </button>
  );
}

interface PhotoSlotProps {
  label: string;
  preview: string | null;
  required?: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  onFile: (file: File) => void;
  onRemove: () => void;
}

function PhotoSlot({ label, preview, required, inputRef, onFile, onRemove }: PhotoSlotProps): JSX.Element {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  };

  return (
    <div className={`${s.photoSlot}${preview ? ' ' + s.photoSlotFilled : ''}`}>
      <label style={{ display: 'contents', cursor: 'pointer' }}>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handleChange}
        />
        {preview ? (
          <img src={preview} alt={label} className={s.photoImg} />
        ) : (
          <>
            <span className={s.photoSlotIcon}>📷</span>
            <span className={s.photoSlotLabel}>{label}</span>
            {required && <span className={s.photoSlotRequired}>Recommended</span>}
          </>
        )}
      </label>
      {preview && (
        <button
          type="button"
          className={s.photoRemoveBtn}
          onClick={e => { e.stopPropagation(); onRemove(); }}
          aria-label={`Remove ${label} photo`}
        >
          <X size={12} strokeWidth={3} />
        </button>
      )}
    </div>
  );
}
