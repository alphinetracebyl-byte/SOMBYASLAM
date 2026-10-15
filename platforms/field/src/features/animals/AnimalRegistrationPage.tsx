import { useState } from 'react';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { apiClient } from '@/api/client';
import s from './animal-registration.module.css';

const SPECIES = ['CATTLE', 'SHEEP', 'GOAT', 'CAMEL'];
const SEX = ['MALE', 'FEMALE', 'CASTRATED_MALE'];
const SOURCES = ['BIRTH', 'EXISTING', 'PURCHASE', 'IMPORT'];

interface Step1 { ownerId: string; ownerCode: string; premisesId: string; premisesCode: string; }
interface Step2 { species: string; sex: string; dob: string; dobPrecision: string; breed: string; coatColor: string; distinguishingMarks: string; }
interface Step3 { tagSerial: string; sourceType: string; sourceDescription: string; }

export function AnimalRegistrationPage(): JSX.Element {
  const navigate = useNavigate();
  const { userId } = useAuthStore();
  const [step, setStep] = useState(1);
  const [step1, setStep1] = useState<Step1>({ ownerId: '', ownerCode: '', premisesId: '', premisesCode: '' });
  const [step2, setStep2] = useState<Step2>({ species: 'CATTLE', sex: 'MALE', dob: '', dobPrecision: 'EXACT', breed: '', coatColor: '', distinguishingMarks: '' });
  const [step3, setStep3] = useState<Step3>({ tagSerial: '', sourceType: 'BIRTH', sourceDescription: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const STEPS = ['Owner & Premises', 'Animal Details', 'Tag & Source'];

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const idempotencyKey = crypto.randomUUID();
      await apiClient.post('/animal-registrations', {
        idempotencyKey,
        ownerId: step1.ownerId,
        premisesId: step1.premisesId,
        species: step2.species,
        sex: step2.sex,
        dob: step2.dob || undefined,
        dobPrecision: step2.dobPrecision,
        breed: step2.breed || undefined,
        coatColor: step2.coatColor || undefined,
        distinguishingMarks: step2.distinguishingMarks || undefined,
        tagSerial: step3.tagSerial,
        sourceType: step3.sourceType,
        sourceDescription: step3.sourceDescription || undefined,
        registeredBy: userId,
      });
      void navigate('/animals');
    } catch {
      setError('Registration failed. Please check your inputs and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const f = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    type = 'text',
    options?: string[],
  ) => (
    <div className={s.field}>
      <label className={s.label}>{label}</label>
      {options ? (
        <select className={s.input} value={value} onChange={e => onChange(e.target.value)}>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input className={s.input} type={type} value={value} onChange={e => onChange(e.target.value)} />
      )}
    </div>
  );

  return (
    <div className={s.page}>
      <div className={s.card}>

        {/* Stepper */}
        <div className={s.stepper}>
          {STEPS.map((label, i) => (
            <div key={i} className={s.stepItem}>
              <div
                className={[
                  s.stepCircle,
                  i + 1 < step ? s.stepDone : i + 1 === step ? s.stepActive : '',
                ].filter(Boolean).join(' ')}
              >
                {i + 1 < step ? <Check size={14} /> : i + 1}
              </div>
              <span className={s.stepLabel}>{label}</span>
              {i < STEPS.length - 1 && (
                <div className={[s.stepLine, i + 1 < step ? s.stepLineDone : ''].filter(Boolean).join(' ')} />
              )}
            </div>
          ))}
        </div>

        {error && <div className={s.error}>{error}</div>}

        {step === 1 && (
          <div className={s.stepContent}>
            <h2 className={s.stepTitle}>Owner &amp; Premises</h2>
            {f('Owner ID (UUID)', step1.ownerId, v => setStep1(p => ({ ...p, ownerId: v })))}
            {f('Owner Code', step1.ownerCode, v => setStep1(p => ({ ...p, ownerCode: v })))}
            {f('Premises ID (UUID)', step1.premisesId, v => setStep1(p => ({ ...p, premisesId: v })))}
            {f('Premises Code', step1.premisesCode, v => setStep1(p => ({ ...p, premisesCode: v })))}
          </div>
        )}

        {step === 2 && (
          <div className={s.stepContent}>
            <h2 className={s.stepTitle}>Animal Details</h2>
            {f('Species', step2.species, v => setStep2(p => ({ ...p, species: v })), 'text', SPECIES)}
            {f('Sex', step2.sex, v => setStep2(p => ({ ...p, sex: v })), 'text', SEX)}
            {f('Date of Birth', step2.dob, v => setStep2(p => ({ ...p, dob: v })), 'date')}
            {f('DOB Precision', step2.dobPrecision, v => setStep2(p => ({ ...p, dobPrecision: v })), 'text', ['EXACT', 'MONTH', 'YEAR', 'ESTIMATED'])}
            {f('Breed', step2.breed, v => setStep2(p => ({ ...p, breed: v })))}
            {f('Coat Color', step2.coatColor, v => setStep2(p => ({ ...p, coatColor: v })))}
            {f('Distinguishing Marks', step2.distinguishingMarks, v => setStep2(p => ({ ...p, distinguishingMarks: v })))}
          </div>
        )}

        {step === 3 && (
          <div className={s.stepContent}>
            <h2 className={s.stepTitle}>Tag &amp; Source</h2>
            {f('Tag Serial Number', step3.tagSerial, v => setStep3(p => ({ ...p, tagSerial: v })))}
            {f('Source Type', step3.sourceType, v => setStep3(p => ({ ...p, sourceType: v })), 'text', SOURCES)}
            {f('Source Description', step3.sourceDescription, v => setStep3(p => ({ ...p, sourceDescription: v })))}
          </div>
        )}

        <div className={s.actions}>
          {step > 1 && (
            <button className={s.backBtn} onClick={() => setStep(n => n - 1)}>
              <ChevronLeft size={16} /> Back
            </button>
          )}
          {step < 3 && (
            <button className={s.nextBtn} onClick={() => setStep(n => n + 1)}>
              Next <ChevronRight size={16} />
            </button>
          )}
          {step === 3 && (
            <button className={s.submitBtn} onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Registering…' : 'Register Animal'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

export default AnimalRegistrationPage;
