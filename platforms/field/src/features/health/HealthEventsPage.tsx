import { useState } from 'react';
import { Activity, Plus, Stethoscope, Syringe, AlertCircle, CheckCircle, X, FlaskConical, Heart, PackageCheck } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { apiClient } from '@/api/client';
import s from './health-events.module.css';

const EVENT_TYPES = [
  { key: 'VACCINATION',            label: 'Vaccination',        Icon: Syringe,      color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
  { key: 'CLINICAL_INSPECTION',    label: 'Inspection',         Icon: Stethoscope,  color: '#0b5ed7', bg: '#eff6ff', border: '#93c5fd' },
  { key: 'TREATMENT',              label: 'Treatment',          Icon: Heart,        color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  { key: 'DISEASE_INVESTIGATION',  label: 'Investigation',      Icon: AlertCircle,  color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  { key: 'SAMPLE_COLLECTION',      label: 'Sample',             Icon: FlaskConical, color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd' },
  { key: 'FITNESS_FOR_MOVEMENT',   label: 'Fitness Check',      Icon: Activity,     color: '#0891b2', bg: '#ecfeff', border: '#67e8f9' },
  { key: 'PRE_EXPORT_INSPECTION',  label: 'Pre-Export Inspect', Icon: PackageCheck, color: '#b45309', bg: '#fefce8', border: '#fde68a' },
];

interface HealthForm {
  eventType: string; animalId: string; animalCode: string; premisesId: string;
  eventDate: string; vaccineProduct: string; vaccineBatchNumber: string; doseMl: string;
  routeOfAdministration: string; nextDueDate: string; diagnosis: string;
  treatment: string; clinicalNotes: string; fitnessDecision: string;
}

const EMPTY: HealthForm = {
  eventType: '', animalId: '', animalCode: '', premisesId: '',
  eventDate: new Date().toISOString().split('T')[0],
  vaccineProduct: '', vaccineBatchNumber: '', doseMl: '',
  routeOfAdministration: '', nextDueDate: '', diagnosis: '',
  treatment: '', clinicalNotes: '', fitnessDecision: '',
};

export function HealthEventsPage(): JSX.Element {
  const { userId } = useAuthStore();
  const [form, setForm]         = useState<HealthForm>(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const set = (k: keyof HealthForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }));

  const pickType = (key: string) => setForm(p => ({ ...p, eventType: key }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiClient.post('/health-events', {
        ...form,
        responsibleVetId: userId,
        responsibleVetName: 'Field Officer',
        doseMl: form.doseMl ? parseFloat(form.doseMl) : undefined,
        premisesId: form.premisesId || undefined,
        createdBy: userId,
      });
      setSuccess(true);
      setShowForm(false);
      setForm(EMPTY);
    } catch {
      setError('Failed to save health event. Please check the details and try again.');
    } finally {
      setSaving(false);
    }
  };

  const isVax     = form.eventType === 'VACCINATION';
  const isTreat   = form.eventType === 'TREATMENT' || form.eventType === 'CLINICAL_INSPECTION';
  const isFitness = form.eventType === 'FITNESS_FOR_MOVEMENT';
  const hasType   = !!form.eventType;
  const canSave   = hasType && !!form.animalCode && !!form.eventDate && !saving;
  const selectedCfg = EVENT_TYPES.find(t => t.key === form.eventType);

  return (
    <div className={s.page}>
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Health Events</h1>
          <p className={s.sub}>Record veterinary events for animals in your region</p>
        </div>
        {!showForm && (
          <button className={s.addBtn} onClick={() => { setShowForm(true); setSuccess(false); setError(null); }}>
            <Plus size={15}/> Record Event
          </button>
        )}
      </div>

      {success && (
        <div className={s.successBanner}>
          <CheckCircle size={16}/> Health event recorded successfully.
        </div>
      )}
      {error && <div className={s.errorBanner}>{error}</div>}

      {showForm ? (
        <div className={s.formCard}>
          <div className={s.formCardHead}>
            <div className={s.formCardTitle}>
              {selectedCfg
                ? <><selectedCfg.Icon size={16} color={selectedCfg.color}/> {selectedCfg.label}</>
                : 'New Health Event'}
            </div>
            <button className={s.closeBtn} onClick={() => setShowForm(false)}><X size={16}/></button>
          </div>

          {/* Step 1: Type selector */}
          <div className={s.typeSection}>
            <div className={s.typeSectionLabel}>Select event type</div>
            <div className={s.typeGrid}>
              {EVENT_TYPES.map(t => (
                <button key={t.key} type="button"
                  className={`${s.typeTile}${form.eventType === t.key ? ' ' + s.typeTileActive : ''}`}
                  style={form.eventType === t.key ? { background: t.bg, borderColor: t.color } : undefined}
                  onClick={() => pickType(t.key)}>
                  <t.Icon size={20} color={form.eventType === t.key ? t.color : '#94a3b8'}/>
                  <span className={s.typeTileLabel} style={form.eventType === t.key ? { color: t.color } : undefined}>
                    {t.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Form fields */}
          {hasType && (
            <form onSubmit={handleSave} className={s.formBody}>
              <div className={s.section}>
                <div className={s.sectionLabel}>Animal Details</div>
                <div className={s.formGrid}>
                  <div className={s.field}>
                    <label className={s.label}>Animal Code <span className={s.req}>*</span></label>
                    <input className={s.input} value={form.animalCode} onChange={set('animalCode')} placeholder="e.g. SOM-2024-000001"/>
                  </div>
                  <div className={s.field}>
                    <label className={s.label}>Animal ID</label>
                    <input className={s.input} value={form.animalId} onChange={set('animalId')} placeholder="System UUID (optional)"/>
                  </div>
                  <div className={s.field}>
                    <label className={s.label}>Event Date <span className={s.req}>*</span></label>
                    <input className={s.input} type="date" value={form.eventDate} onChange={set('eventDate')}/>
                  </div>
                  <div className={s.field}>
                    <label className={s.label}>Premises ID</label>
                    <input className={s.input} value={form.premisesId} onChange={set('premisesId')} placeholder="If at specific premises"/>
                  </div>
                </div>
              </div>

              {isVax && (
                <div className={s.section}>
                  <div className={s.sectionLabel}>Vaccination Details</div>
                  <div className={s.formGrid}>
                    <div className={s.field}>
                      <label className={s.label}>Vaccine Product</label>
                      <input className={s.input} value={form.vaccineProduct} onChange={set('vaccineProduct')}/>
                    </div>
                    <div className={s.field}>
                      <label className={s.label}>Batch Number</label>
                      <input className={s.input} value={form.vaccineBatchNumber} onChange={set('vaccineBatchNumber')}/>
                    </div>
                    <div className={s.field}>
                      <label className={s.label}>Dose (ml)</label>
                      <input className={s.input} type="number" step="0.1" value={form.doseMl} onChange={set('doseMl')}/>
                    </div>
                    <div className={s.field}>
                      <label className={s.label}>Route of Administration</label>
                      <input className={s.input} value={form.routeOfAdministration} onChange={set('routeOfAdministration')} placeholder="e.g. Subcutaneous"/>
                    </div>
                    <div className={s.field}>
                      <label className={s.label}>Next Due Date</label>
                      <input className={s.input} type="date" value={form.nextDueDate} onChange={set('nextDueDate')}/>
                    </div>
                  </div>
                </div>
              )}

              {isTreat && (
                <div className={s.section}>
                  <div className={s.sectionLabel}>Clinical Details</div>
                  <div className={s.formGrid}>
                    <div className={s.field}>
                      <label className={s.label}>Diagnosis</label>
                      <input className={s.input} value={form.diagnosis} onChange={set('diagnosis')}/>
                    </div>
                    <div className={s.field}>
                      <label className={s.label}>Treatment</label>
                      <input className={s.input} value={form.treatment} onChange={set('treatment')}/>
                    </div>
                  </div>
                </div>
              )}

              {isFitness && (
                <div className={s.section}>
                  <div className={s.sectionLabel}>Fitness Assessment</div>
                  <div className={s.fitnessGrid}>
                    {(['FIT', 'CONDITIONALLY_FIT', 'UNFIT'] as const).map(opt => (
                      <label key={opt}
                        className={`${s.fitnessTile}${form.fitnessDecision === opt ? ' ' + s.fitnessTileActive : ''}`}
                        style={form.fitnessDecision === opt ? {
                          borderColor: opt === 'FIT' ? '#059669' : opt === 'UNFIT' ? '#dc2626' : '#d97706',
                          background:  opt === 'FIT' ? '#ecfdf5' : opt === 'UNFIT' ? '#fef2f2' : '#fffbeb',
                        } : undefined}>
                        <input type="radio" name="fitness" value={opt} checked={form.fitnessDecision === opt}
                          onChange={() => setForm(p => ({ ...p, fitnessDecision: opt }))} className={s.hidden}/>
                        <span className={s.fitnessDot} style={{
                          background: opt === 'FIT' ? '#059669' : opt === 'UNFIT' ? '#dc2626' : '#d97706'
                        }}/>
                        <span>{opt === 'CONDITIONALLY_FIT' ? 'Conditional' : opt.charAt(0) + opt.slice(1).toLowerCase()}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className={s.section}>
                <div className={s.field}>
                  <label className={s.label}>Clinical Notes</label>
                  <textarea className={s.textarea} rows={3} value={form.clinicalNotes} onChange={set('clinicalNotes')}
                    placeholder="Any additional observations or notes…"/>
                </div>
              </div>

              <div className={s.formActions}>
                <button type="button" className={s.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className={s.saveBtn} disabled={!canSave}>
                  {saving ? 'Saving…' : 'Record Event'}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <div className={s.infoCard}>
          <Stethoscope size={24} color="#0b5ed7"/>
          <div>
            <div className={s.infoTitle}>Record veterinary events in the field</div>
            <div className={s.infoSub}>Vaccinations, clinical inspections, treatment records, sample collection and fitness assessments</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HealthEventsPage;
