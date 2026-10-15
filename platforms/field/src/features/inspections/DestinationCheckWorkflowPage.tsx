import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle, XCircle, MapPin, Loader2, ArrowLeft,
  AlertTriangle, Home, ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';
import s from './inspection-workflow.module.css';

interface DestinationCheck {
  id:                       string;
  checkCode:                string;
  movementCode:             string;
  status:                   string;
  assignedToId:             string;
  destinationPremisesCode:  string;
  destinationPremisesName:  string;
  originPremisesCode:       string;
  originPremisesName:       string;
  destinationRegionCode:    string;
  animalCount:              number;
  purpose:                  string;
  movementTypeCode:         string;
  startedAt:                string | null;
  submittedAt:              string | null;
  decision:                 string | null;
}

type CheckStep = 'PREMISES' | 'CAPACITY' | 'RESTRICTIONS' | 'DECISION';

const STEP_ORDER: CheckStep[] = ['PREMISES', 'CAPACITY', 'RESTRICTIONS', 'DECISION'];

const STEP_LABELS: Record<CheckStep, string> = {
  PREMISES:     'Premises',
  CAPACITY:     'Capacity',
  RESTRICTIONS: 'Restrictions',
  DECISION:     'Decision',
};

const PREMISES_STATUS_OPTS = ['ACTIVE', 'SUSPENDED', 'NOT_FOUND'] as const;

export function DestinationCheckWorkflowPage(): JSX.Element {
  const { checkId } = useParams<{ checkId: string }>();
  const navigate = useNavigate();
  const { userId, regionCode, roles } = useAuthStore();
  const userRole  = roles[0] ?? 'FIELD_INSPECTOR';
  const roleLabel = userRole.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

  const [loading,   setLoading]   = useState(true);
  const [check,     setCheck]     = useState<DestinationCheck | null>(null);
  const [step,      setStep]      = useState<CheckStep>('PREMISES');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Form fields
  const [premisesStatus,  setPremisesStatus]  = useState('');
  const [capacityOk,      setCapacityOk]      = useState<boolean | null>(null);
  const [capacityNotes,   setCapacityNotes]   = useState('');
  const [restrictionExists, setRestrictionExists] = useState<boolean | null>(null);
  const [restrictionDetails, setRestrictionDetails] = useState('');
  const [officerNotes,    setOfficerNotes]    = useState('');
  const [decision,        setDecision]        = useState<'APPROVED' | 'REJECTED' | ''>('');
  const [declaration,     setDeclaration]     = useState(false);

  useEffect(() => {
    if (!checkId) return;
    void (async () => {
      const { data } = await supabase
        .from('movement_destination_checks')
        .select('*')
        .eq('id', checkId)
        .single();
      if (!data) { setLoading(false); return; }
      const dc: DestinationCheck = {
        id:                      data.id as string,
        checkCode:               data.check_code as string,
        movementCode:            data.movement_code as string,
        status:                  data.status as string,
        assignedToId:            (data.assigned_to_id as string) ?? '',
        destinationPremisesCode: (data.destination_premises_code as string) ?? '',
        destinationPremisesName: (data.destination_premises_name as string) ?? '',
        originPremisesCode:      (data.origin_premises_code as string) ?? '',
        originPremisesName:      (data.origin_premises_name as string) ?? '',
        destinationRegionCode:   (data.destination_region_code as string) ?? '',
        animalCount:             (data.animal_count as number) ?? 0,
        purpose:                 (data.purpose as string) ?? '',
        movementTypeCode:        (data.movement_type_code as string) ?? '',
        startedAt:               data.started_at as string | null,
        submittedAt:             data.submitted_at as string | null,
        decision:                data.decision as string | null,
      };
      setCheck(dc);

      // Restore saved form state
      if (data.premises_status)   setPremisesStatus(data.premises_status as string);
      if (data.premises_capacity_ok != null) setCapacityOk(data.premises_capacity_ok as boolean);
      if (data.capacity_notes)    setCapacityNotes(data.capacity_notes as string);
      if (data.restriction_exists != null) setRestrictionExists(data.restriction_exists as boolean);
      if (data.restriction_details) setRestrictionDetails(data.restriction_details as string);
      if (data.destination_officer_notes) setOfficerNotes(data.destination_officer_notes as string);
      if (data.decision)          setDecision(data.decision as 'APPROVED' | 'REJECTED');

      if (dc.status === 'SUBMITTED' || dc.status === 'APPROVED' || dc.status === 'REJECTED') {
        setStep('DECISION');
      }

      if (dc.status === 'PENDING' && !dc.startedAt) {
        await supabase
          .from('movement_destination_checks')
          .update({ status: 'IN_PROGRESS', started_at: new Date().toISOString() })
          .eq('id', checkId);
      }
      setLoading(false);
    })();
  }, [checkId]);

  const stepIdx = STEP_ORDER.indexOf(step);

  const saveProgress = async () => {
    if (!check) return;
    await supabase.from('movement_destination_checks').update({
      premises_status:           premisesStatus || null,
      premises_capacity_ok:      capacityOk,
      capacity_notes:            capacityNotes || null,
      restriction_exists:        restrictionExists,
      restriction_details:       restrictionDetails || null,
      destination_officer_notes: officerNotes || null,
    }).eq('id', check.id);
  };

  const goNext = async () => {
    await saveProgress();
    const next = STEP_ORDER[stepIdx + 1];
    if (next) setStep(next);
  };

  const handleSubmit = async () => {
    if (!check || !decision || !declaration) return;
    setSubmitting(true);
    setSubmitError('');

    const now = new Date().toISOString();

    const { error } = await supabase.from('movement_destination_checks').update({
      premises_status:           premisesStatus || null,
      premises_capacity_ok:      capacityOk,
      capacity_notes:            capacityNotes || null,
      restriction_exists:        restrictionExists,
      restriction_details:       restrictionDetails || null,
      destination_officer_notes: officerNotes || null,
      decision,
      decided_at:  now,
      submitted_at: now,
      status:      decision === 'APPROVED' ? 'APPROVED' : 'REJECTED',
    }).eq('id', check.id);

    if (error) { setSubmitError(error.message); setSubmitting(false); return; }

    // If rejected, update movement request to DESTINATION_REJECTED
    if (decision === 'REJECTED') {
      await supabase.from('farmer_movement_requests')
        .update({ status: 'DESTINATION_REJECTED' })
        .eq('movement_code', check.movementCode);
    }

    void logActivity({
      category:      'MOVEMENT',
      level:         decision === 'APPROVED' ? 'SUCCESS' : 'WARNING',
      title:         `Destination check ${decision === 'APPROVED' ? 'approved' : 'rejected'}`,
      detail:        `${check.checkCode} — ${check.originPremisesCode} → ${check.destinationPremisesCode}`,
      actorRole:     roleLabel,
      region:        regionCode,
      referenceCode: check.checkCode,
      userId,
    });

    setCheck(prev => prev ? { ...prev, status: decision === 'APPROVED' ? 'APPROVED' : 'REJECTED', decision } : prev);
    setStep('DECISION');
    setSubmitting(false);
  };

  const canSubmit = decision !== '' && declaration;

  if (loading) {
    return (
      <div className={s.page}>
        <div className={s.loading}><Loader2 size={20} className={s.spinner} /> Loading destination check…</div>
      </div>
    );
  }

  if (!check) {
    return (
      <div className={s.page}>
        <div className={s.alertErr}><XCircle size={16} /> Destination check not found.</div>
      </div>
    );
  }

  const isSubmitted = check.status === 'SUBMITTED' || check.status === 'APPROVED' || check.status === 'REJECTED';

  return (
    <div className={s.shell}>
      <main className={s.main}>
        {/* Step card */}
        <div className={s.stepCard}>
          <div className={s.stepRoute}>
            <div className={s.stepRouteSide}>
              <div className={s.stepRouteLabel}>Origin</div>
              <div className={s.stepRouteName}>{check.originPremisesName || check.originPremisesCode}</div>
              <div className={s.stepRouteCode}>{check.originPremisesCode}</div>
            </div>
            <div className={s.stepRouteArrow}>
              <div className={s.stepRouteArrowLine} />
              <div className={s.stepRouteArrowMeta}>
                {check.animalCount} animal{check.animalCount !== 1 ? 's' : ''} · {check.purpose}
              </div>
            </div>
            <div className={`${s.stepRouteSide}`} style={{ textAlign: 'right' }}>
              <div className={s.stepRouteLabel}>Destination</div>
              <div className={s.stepRouteName}>{check.destinationPremisesName || check.destinationPremisesCode}</div>
              <div className={s.stepRouteCode}>{check.destinationPremisesCode}</div>
            </div>
          </div>

          <div className={s.stepList}>
            {STEP_ORDER.map((st, i) => {
              const isDone    = i < stepIdx;
              const isActive  = st === step;
              const reachable = i <= stepIdx;
              return (
                <React.Fragment key={st}>
                  {i > 0 && (
                    <div className={`${s.stepConnector}${isDone ? ' ' + s.stepConnectorDone : ''}`} />
                  )}
                  <button
                    type="button"
                    className={`${s.stepItem}${isDone ? ' ' + s.stepItemDone : ''}${isActive ? ' ' + s.stepItemActive : ''}`}
                    onClick={() => reachable && setStep(st)}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: reachable ? 'pointer' : 'default' }}
                    title={reachable ? `Go to ${STEP_LABELS[st]}` : STEP_LABELS[st]}
                  >
                    <div className={s.stepDot}>
                      {isDone ? <CheckCircle size={15} /> : <span>{i + 1}</span>}
                    </div>
                    <span className={s.stepLabel}>{STEP_LABELS[st]}</span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'none', border: 'none', color: '#6b7280', fontSize: '0.8125rem', cursor: 'pointer', padding: '0.25rem 0', marginBottom: '0.5rem' }}
        >
          <ArrowLeft size={14} /> Back to tasks
        </button>

        {/* Step content */}
        <div className={s.card}>
          {/* PREMISES step */}
          {step === 'PREMISES' && (
            <div>
              <div className={s.cardTitle}>
                <Home size={16} /> Premises Status Verification
              </div>
              <p className={s.cardDesc}>
                Verify the registration and status of the destination premises: <strong>{check.destinationPremisesName || check.destinationPremisesCode}</strong>.
              </p>

              <div className={s.section}>
                <label className={s.label}>Destination Premises Status *</label>
                <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
                  {PREMISES_STATUS_OPTS.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      className={`${s.resultBtn}${premisesStatus === opt ? ' ' + s.resultBtnSelected : ''}`}
                      style={{ flex: 1 }}
                      onClick={() => setPremisesStatus(opt)}
                      disabled={isSubmitted}
                    >
                      <div className={s.resultBtnLabel} style={{ color: opt === 'ACTIVE' ? '#16a34a' : opt === 'SUSPENDED' ? '#d97706' : '#dc2626' }}>
                        {opt.replace(/_/g, ' ')}
                      </div>
                      <div className={s.resultBtnSub}>
                        {opt === 'ACTIVE' ? 'Registered and operating normally'
                          : opt === 'SUSPENDED' ? 'Registration suspended — cannot receive animals'
                          : 'No record found in QXLITS'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {premisesStatus === 'SUSPENDED' && (
                <div className={s.alertWarn}>
                  <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                  Suspended premises cannot receive animals. This movement will be rejected.
                </div>
              )}
              {premisesStatus === 'NOT_FOUND' && (
                <div className={s.alertErr}>
                  <XCircle size={15} style={{ flexShrink: 0 }} />
                  Premises not found. Verify the premises code is correct before proceeding.
                </div>
              )}
            </div>
          )}

          {/* CAPACITY step */}
          {step === 'CAPACITY' && (
            <div>
              <div className={s.cardTitle}>
                <MapPin size={16} /> Premises Capacity Check
              </div>
              <p className={s.cardDesc}>
                Confirm the premises can receive <strong>{check.animalCount}</strong> additional animal{check.animalCount !== 1 ? 's' : ''}.
              </p>

              <div className={s.section}>
                <label className={s.label}>Can the premises receive these animals? *</label>
                <div style={{ display: 'flex', gap: '0.625rem' }}>
                  {[
                    { val: true,  label: 'Yes — Capacity Available', sub: 'Premises has space for the incoming animals', color: '#16a34a' },
                    { val: false, label: 'No — At Capacity',         sub: 'Premises cannot currently receive more animals', color: '#dc2626' },
                  ].map(opt => (
                    <button
                      key={String(opt.val)}
                      type="button"
                      className={`${s.resultBtn}${capacityOk === opt.val ? ' ' + s.resultBtnSelected : ''}`}
                      style={{ flex: 1 }}
                      onClick={() => setCapacityOk(opt.val)}
                      disabled={isSubmitted}
                    >
                      <div className={s.resultBtnLabel} style={{ color: opt.color }}>{opt.label}</div>
                      <div className={s.resultBtnSub}>{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className={s.fieldGroup}>
                <label className={s.label}>Capacity Notes</label>
                <textarea
                  className={s.textarea}
                  rows={2}
                  value={capacityNotes}
                  onChange={e => setCapacityNotes(e.target.value)}
                  placeholder="Current animal count, available space, seasonal considerations…"
                  disabled={isSubmitted}
                />
              </div>
            </div>
          )}

          {/* RESTRICTIONS step */}
          {step === 'RESTRICTIONS' && (
            <div>
              <div className={s.cardTitle}>
                <AlertTriangle size={16} /> Regional Restrictions Check
              </div>
              <p className={s.cardDesc}>
                Check if any movement restrictions, quarantine zones, or disease outbreaks apply to <strong>{check.destinationRegionCode || check.destinationPremisesCode}</strong>.
              </p>

              <div className={s.section}>
                <label className={s.label}>Are there active movement restrictions? *</label>
                <div style={{ display: 'flex', gap: '0.625rem' }}>
                  {[
                    { val: false, label: 'No Restrictions', sub: 'Region is open — movement may proceed', color: '#16a34a' },
                    { val: true,  label: 'Restrictions Active', sub: 'Movement into this region is restricted', color: '#dc2626' },
                  ].map(opt => (
                    <button
                      key={String(opt.val)}
                      type="button"
                      className={`${s.resultBtn}${restrictionExists === opt.val ? ' ' + s.resultBtnSelected : ''}`}
                      style={{ flex: 1 }}
                      onClick={() => setRestrictionExists(opt.val)}
                      disabled={isSubmitted}
                    >
                      <div className={s.resultBtnLabel} style={{ color: opt.color }}>{opt.label}</div>
                      <div className={s.resultBtnSub}>{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {restrictionExists && (
                <div className={s.fieldGroup}>
                  <label className={s.label}>Restriction Details *</label>
                  <textarea
                    className={s.textarea}
                    rows={3}
                    value={restrictionDetails}
                    onChange={e => setRestrictionDetails(e.target.value)}
                    placeholder="Describe the restriction — disease type, quarantine zone, authority reference number…"
                    disabled={isSubmitted}
                  />
                </div>
              )}

              <div className={s.fieldGroup}>
                <label className={s.label}>Officer Notes</label>
                <textarea
                  className={s.textarea}
                  rows={2}
                  value={officerNotes}
                  onChange={e => setOfficerNotes(e.target.value)}
                  placeholder="Any additional observations about the destination premises or region…"
                  disabled={isSubmitted}
                />
              </div>
            </div>
          )}

          {/* DECISION step */}
          {step === 'DECISION' && (
            <div>
              <div className={s.cardTitle}>
                <CheckCircle size={16} /> Final Decision
              </div>

              {isSubmitted ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '1rem 1.25rem', borderRadius: 10, marginBottom: '1.25rem',
                  background: check.decision === 'APPROVED' ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${check.decision === 'APPROVED' ? '#86efac' : '#fecaca'}`,
                }}>
                  {check.decision === 'APPROVED'
                    ? <CheckCircle size={20} color="#16a34a" />
                    : <XCircle size={20} color="#dc2626" />}
                  <div>
                    <div style={{ fontWeight: 700, color: check.decision === 'APPROVED' ? '#15803d' : '#b91c1c' }}>
                      Destination Check {check.decision === 'APPROVED' ? 'Approved' : 'Rejected'}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: '0.2rem' }}>
                      {check.checkCode} — submitted successfully
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Summary */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 10, padding: '1rem 1.125rem', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Check Summary</div>
                    {[
                      ['Premises Status', premisesStatus || '—'],
                      ['Capacity Available', capacityOk == null ? '—' : capacityOk ? 'Yes' : 'No'],
                      ['Restrictions Active', restrictionExists == null ? '—' : restrictionExists ? 'Yes' : 'No'],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8125rem' }}>
                        <span style={{ color: '#9ca3af', minWidth: 150 }}>{k}</span>
                        <span style={{ color: '#111827', fontWeight: 500 }}>{v}</span>
                      </div>
                    ))}
                  </div>

                  <div className={s.section}>
                    <label className={s.label}>Your Decision *</label>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button
                        type="button"
                        className={`${s.resultBtn}${decision === 'APPROVED' ? ' ' + s.resultBtnSelected : ''}`}
                        style={{ flex: 1 }}
                        onClick={() => setDecision('APPROVED')}
                        disabled={isSubmitted}
                      >
                        <div className={s.resultBtnLabel} style={{ color: '#16a34a' }}>Approve</div>
                        <div className={s.resultBtnSub}>Destination premises cleared for receiving animals</div>
                      </button>
                      <button
                        type="button"
                        className={`${s.resultBtn} ${s.resultBtnDanger}${decision === 'REJECTED' ? ' ' + s.resultBtnSelected : ''}`}
                        style={{ flex: 1 }}
                        onClick={() => setDecision('REJECTED')}
                        disabled={isSubmitted}
                      >
                        <div className={s.resultBtnLabel} style={{ color: '#dc2626' }}>Reject</div>
                        <div className={s.resultBtnSub}>Premises cannot receive animals at this time</div>
                      </button>
                    </div>
                  </div>

                  <div
                    className={s.toggleRow}
                    onClick={() => !isSubmitted && setDeclaration(!declaration)}
                    style={{ marginTop: '1rem' }}
                  >
                    <span className={s.toggleLabel}>
                      I declare that the information I have provided is accurate and complete to the best of my knowledge.
                    </span>
                    <div className={`${s.toggle} ${declaration ? s.toggleOn : ''}`} />
                  </div>

                  {submitError && (
                    <div className={s.alertErr} style={{ marginTop: '1rem' }}>
                      <XCircle size={15} style={{ flexShrink: 0 }} /> {submitError}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Navigation buttons */}
          {!isSubmitted && (
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #f3f4f6' }}>
              <button
                type="button"
                className={s.btnSecondary}
                onClick={() => { const prev = STEP_ORDER[stepIdx - 1]; if (prev) setStep(prev); }}
                disabled={stepIdx === 0}
              >
                ← Back
              </button>

              {step !== 'DECISION' ? (
                <button type="button" className={s.btnPrimary} onClick={goNext}>
                  Next <ChevronRight size={14} style={{ verticalAlign: 'middle' }} />
                </button>
              ) : (
                <button
                  type="button"
                  className={s.btnPrimary}
                  onClick={handleSubmit}
                  disabled={submitting || !canSubmit}
                >
                  {submitting
                    ? <><Loader2 size={14} className={s.spinner} style={{ marginRight: 4 }} /> Submitting…</>
                    : 'Submit Decision'
                  }
                </button>
              )}
            </div>
          )}

          {isSubmitted && (
            <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
              <button
                type="button"
                className={s.btnSecondary}
                onClick={() => navigate('/tasks')}
              >
                <ArrowLeft size={14} style={{ marginRight: 4 }} /> Return to Tasks
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default DestinationCheckWorkflowPage;
