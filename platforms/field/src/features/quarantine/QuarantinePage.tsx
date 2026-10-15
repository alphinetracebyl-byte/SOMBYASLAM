import { useState, useEffect, useCallback } from 'react';
import {
  ShieldOff, ShieldCheck, X, Search, ChevronDown,
  CheckCircle2, AlertTriangle, Clock, MapPin, Beef,
  Clipboard, Activity, FileText, AlertCircle, RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase';
import s from './quarantine.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

type ZoneStatus = 'ACTIVE' | 'CLEARANCE_IN_PROGRESS' | 'LIFTED';
type ZoneType   = 'DISEASE_OUTBREAK' | 'BORDER_CONTROL' | 'EXPORT_HOLD' | 'ROUTINE_HEALTH';
type ActionKind = 'inspect' | 'breach' | 'sample' | 'recommend' | 'healthcheck' | null;

interface QuarantineZone {
  id:               string;
  zoneCode:         string;
  zoneName:         string;
  type:             ZoneType;
  status:           ZoneStatus;
  regionCode:       string;
  declaredDate:     string;
  expectedLiftDate: string;
  reason:           string;
  premisesCount:    number;
  animalCount:      number;
  movementBlocked:  boolean;
  declaredByName:   string;
  daysActive:       number;
}

interface InspectionLog {
  id:           string;
  zoneCode:     string;
  logType:      string;
  officerName:  string;
  officerRole:  string;
  findings:     string;
  outcome:      string;
  animalsChecked?: number;
  sampleType?:  string;
  labName?:     string;
  createdAt:    string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<ZoneStatus, { bg: string; color: string; label: string }> = {
  ACTIVE:                { bg: '#fef3c7', color: '#d97706', label: 'Active'                },
  CLEARANCE_IN_PROGRESS: { bg: '#ede9fe', color: '#7c3aed', label: 'Clearance in Progress' },
  LIFTED:                { bg: '#f0fdf4', color: '#16a34a', label: 'Lifted'                },
};

const TYPE_LABELS: Record<ZoneType, string> = {
  DISEASE_OUTBREAK: 'Disease Outbreak',
  BORDER_CONTROL:   'Border Control',
  EXPORT_HOLD:      'Export Hold',
  ROUTINE_HEALTH:   'Routine Health',
};

function mapZone(r: Record<string, unknown>): QuarantineZone {
  const days = Math.floor((Date.now() - new Date(r.declared_date as string).getTime()) / 86_400_000);
  return {
    id:               r.id as string,
    zoneCode:         r.zone_code as string,
    zoneName:         r.zone_name as string,
    type:             (r.zone_type as ZoneType) ?? 'DISEASE_OUTBREAK',
    status:           (r.status as ZoneStatus) ?? 'ACTIVE',
    regionCode:       (r.region_code as string) ?? '',
    declaredDate:     r.declared_date as string,
    expectedLiftDate: (r.expected_lift_date as string) ?? '',
    reason:           (r.reason as string) ?? '',
    premisesCount:    (r.premises_count as number) ?? 0,
    animalCount:      (r.animal_count as number) ?? 0,
    movementBlocked:  (r.movement_blocked as boolean) ?? true,
    declaredByName:   (r.declared_by_name as string) ?? '',
    daysActive:       days,
  };
}

function mapLog(r: Record<string, unknown>): InspectionLog {
  return {
    id:            r.id as string,
    zoneCode:      r.zone_code as string,
    logType:       r.log_type as string,
    officerName:   (r.officer_name as string) ?? '',
    officerRole:   (r.officer_role as string) ?? '',
    findings:      (r.findings as string) ?? '',
    outcome:       (r.outcome as string) ?? '',
    animalsChecked:(r.animals_checked as number) ?? undefined,
    sampleType:    r.sample_type as string | undefined,
    labName:       r.lab_name as string | undefined,
    createdAt:     r.created_at as string,
  };
}

// ── Inline forms ──────────────────────────────────────────────────────────────

function InspectForm({ zone, authUid, officerName, officerRole, onSuccess }: {
  zone: QuarantineZone; authUid: string; officerName: string; officerRole: string; onSuccess: () => void;
}) {
  const [finding, setFinding] = useState('');
  const [outcome, setOutcome] = useState('Compliant');
  const [animals, setAnimals] = useState('');
  const [saving,  setSaving]  = useState(false);
  const [done,    setDone]    = useState(false);

  if (done) return (
    <div className={s.inlineSuccess}><CheckCircle2 size={20} color="#16a34a" /><span>Inspection recorded for {zone.zoneCode}</span></div>
  );

  const submit = async () => {
    if (!finding.trim()) return;
    setSaving(true);
    await supabase.from('quarantine_inspection_logs').insert({
      zone_id: zone.id, zone_code: zone.zoneCode,
      log_type: 'Routine Inspection',
      officer_id: authUid, officer_name: officerName, officer_role: officerRole,
      findings: finding.trim(), outcome, animals_checked: animals ? Number(animals) : null,
    });
    setSaving(false); setDone(true); onSuccess();
  };

  return (
    <div className={s.inlineForm}>
      <div className={s.inlineFormTitle}><Clipboard size={13} /> Record Inspection</div>
      <div className={s.field}>
        <label className={s.label}>Findings <span className={s.req}>*</span></label>
        <textarea className={s.textarea} rows={3} value={finding} onChange={e => setFinding(e.target.value)} placeholder="Describe what was observed…" />
      </div>
      <div className={s.formRow}>
        <div className={s.field}>
          <label className={s.label}>Animals Checked</label>
          <input className={s.input} value={animals} onChange={e => setAnimals(e.target.value)} placeholder="e.g. 45" type="number" />
        </div>
        <div className={s.field}>
          <label className={s.label}>Outcome</label>
          <select className={s.select} value={outcome} onChange={e => setOutcome(e.target.value)}>
            <option>Compliant</option><option>Minor Issues</option>
            <option>Breach Detected</option><option>Samples Sent</option>
          </select>
        </div>
      </div>
      <button className={s.submitBtn} disabled={!finding.trim() || saving} onClick={submit}>
        <CheckCircle2 size={13} /> {saving ? 'Saving…' : 'Submit Inspection'}
      </button>
    </div>
  );
}

function BreachForm({ zone, authUid, officerName, officerRole, onSuccess }: {
  zone: QuarantineZone; authUid: string; officerName: string; officerRole: string; onSuccess: () => void;
}) {
  const [desc,    setDesc]    = useState('');
  const [animals, setAnimals] = useState('');
  const [action,  setAction]  = useState('');
  const [saving,  setSaving]  = useState(false);
  const [done,    setDone]    = useState(false);

  if (done) return (
    <div className={s.inlineSuccess}><AlertTriangle size={20} color="#d97706" /><span>Breach reported. Ministry notified.</span></div>
  );

  const submit = async () => {
    if (!desc.trim()) return;
    setSaving(true);
    await supabase.from('quarantine_inspection_logs').insert({
      zone_id: zone.id, zone_code: zone.zoneCode,
      log_type: 'Breach Investigation',
      officer_id: authUid, officer_name: officerName, officer_role: officerRole,
      findings: `${desc.trim()}${animals ? ` Animals involved: ${animals}.` : ''}${action ? ` Action taken: ${action}.` : ''}`,
      outcome: 'Warning Issued',
    });
    setSaving(false); setDone(true); onSuccess();
  };

  return (
    <div className={s.inlineForm}>
      <div className={s.inlineFormTitle} style={{ color: '#dc2626' }}><AlertTriangle size={13} /> Report Movement Breach</div>
      <div className={s.field}>
        <label className={s.label}>Breach Description <span className={s.req}>*</span></label>
        <textarea className={s.textarea} rows={2} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Describe the unauthorized movement or violation…" />
      </div>
      <div className={s.formRow}>
        <div className={s.field}>
          <label className={s.label}>Animals Involved</label>
          <input className={s.input} value={animals} onChange={e => setAnimals(e.target.value)} placeholder="Count or IDs" />
        </div>
        <div className={s.field}>
          <label className={s.label}>Immediate Action Taken</label>
          <input className={s.input} value={action} onChange={e => setAction(e.target.value)} placeholder="e.g. Animals returned, owner warned" />
        </div>
      </div>
      <button className={s.dangerBtn} disabled={!desc.trim() || saving} onClick={submit}>
        <AlertTriangle size={13} /> {saving ? 'Saving…' : 'Report Breach'}
      </button>
    </div>
  );
}

function SampleForm({ zone, authUid, officerName, officerRole, onSuccess }: {
  zone: QuarantineZone; authUid: string; officerName: string; officerRole: string; onSuccess: () => void;
}) {
  const [count,      setCount]  = useState('');
  const [sampleType, setType]   = useState('Blood');
  const [lab,        setLab]    = useState('Mogadishu Central Veterinary Lab');
  const [saving,     setSaving] = useState(false);
  const [done,       setDone]   = useState(false);

  if (done) return (
    <div className={s.inlineSuccess}><CheckCircle2 size={20} color="#16a34a" /><span>Sample collection recorded. Awaiting lab results.</span></div>
  );

  const submit = async () => {
    setSaving(true);
    await supabase.from('quarantine_inspection_logs').insert({
      zone_id: zone.id, zone_code: zone.zoneCode,
      log_type: 'Sample Collection',
      officer_id: authUid, officer_name: officerName, officer_role: officerRole,
      findings: `${sampleType} samples collected. Sent to ${lab}.`,
      outcome: 'Samples Sent',
      animals_checked: count ? Number(count) : null,
      sample_type: sampleType, lab_name: lab,
    });
    setSaving(false); setDone(true); onSuccess();
  };

  return (
    <div className={s.inlineForm}>
      <div className={s.inlineFormTitle}><Activity size={13} /> Record Sample Collection</div>
      <div className={s.formRow}>
        <div className={s.field}>
          <label className={s.label}>Sample Type <span className={s.req}>*</span></label>
          <select className={s.select} value={sampleType} onChange={e => setType(e.target.value)}>
            <option>Blood</option><option>Nasal Swab</option>
            <option>Tissue</option><option>Fecal</option><option>Serum</option>
          </select>
        </div>
        <div className={s.field}>
          <label className={s.label}>Animals Sampled</label>
          <input className={s.input} value={count} onChange={e => setCount(e.target.value)} placeholder="e.g. 12" type="number" />
        </div>
      </div>
      <div className={s.field}>
        <label className={s.label}>Receiving Laboratory</label>
        <input className={s.input} value={lab} onChange={e => setLab(e.target.value)} />
      </div>
      <button className={s.submitBtn} disabled={saving} onClick={submit}>
        <Activity size={13} /> {saving ? 'Saving…' : 'Submit Sample Record'}
      </button>
    </div>
  );
}

function RecommendForm({ zone, authUid, officerName, officerRole, onSuccess }: {
  zone: QuarantineZone; authUid: string; officerName: string; officerRole: string; onSuccess: () => void;
}) {
  const [basis,   setBasis]   = useState('');
  const [confirm, setConfirm] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [done,    setDone]    = useState(false);

  if (done) return (
    <div className={s.inlineSuccess}><CheckCircle2 size={20} color="#16a34a" /><span>Recommendation submitted. Ministry will review and issue final clearance.</span></div>
  );

  const submit = async () => {
    if (!basis.trim() || !confirm) return;
    setSaving(true);
    await supabase.from('quarantine_inspection_logs').insert({
      zone_id: zone.id, zone_code: zone.zoneCode,
      log_type: 'Lift Recommendation',
      officer_id: authUid, officer_name: officerName, officer_role: officerRole,
      findings: basis.trim(), outcome: 'Recommend Lifting',
    });
    setSaving(false); setDone(true); onSuccess();
  };

  return (
    <div className={s.inlineForm}>
      <div className={s.inlineFormTitle} style={{ color: '#16a34a' }}><ShieldCheck size={13} /> Recommend Lifting Quarantine</div>
      <div className={s.field}>
        <label className={s.label}>Clinical Basis for Recommendation <span className={s.req}>*</span></label>
        <textarea className={s.textarea} rows={3} value={basis} onChange={e => setBasis(e.target.value)} placeholder="Describe lab results, clinical findings, and why the zone is safe to open…" />
      </div>
      <label className={s.checkRow}>
        <input type="checkbox" checked={confirm} onChange={e => setConfirm(e.target.checked)} />
        <span>I confirm all inspections are complete and no active disease signs are present</span>
      </label>
      <button className={s.liftBtn} disabled={!basis.trim() || !confirm || saving} onClick={submit}>
        <ShieldCheck size={13} /> {saving ? 'Saving…' : 'Submit Recommendation'}
      </button>
    </div>
  );
}

function HealthCheckForm({ zone, authUid, officerName, officerRole, onSuccess }: {
  zone: QuarantineZone; authUid: string; officerName: string; officerRole: string; onSuccess: () => void;
}) {
  const [findings, setFindings] = useState('');
  const [rec,      setRec]      = useState('Continue Quarantine');
  const [saving,   setSaving]   = useState(false);
  const [done,     setDone]     = useState(false);

  if (done) return (
    <div className={s.inlineSuccess}><CheckCircle2 size={20} color="#16a34a" /><span>Veterinary health check recorded.</span></div>
  );

  const submit = async () => {
    if (!findings.trim()) return;
    setSaving(true);
    await supabase.from('quarantine_inspection_logs').insert({
      zone_id: zone.id, zone_code: zone.zoneCode,
      log_type: 'Veterinary Assessment',
      officer_id: authUid, officer_name: officerName, officer_role: officerRole,
      findings: findings.trim(), outcome: rec,
    });
    setSaving(false); setDone(true); onSuccess();
  };

  return (
    <div className={s.inlineForm}>
      <div className={s.inlineFormTitle}><Activity size={13} /> Veterinary Health Assessment</div>
      <div className={s.field}>
        <label className={s.label}>Clinical Findings <span className={s.req}>*</span></label>
        <textarea className={s.textarea} rows={3} value={findings} onChange={e => setFindings(e.target.value)} placeholder="Document clinical signs, animal condition, disease progression…" />
      </div>
      <div className={s.field}>
        <label className={s.label}>Recommendation</label>
        <select className={s.select} value={rec} onChange={e => setRec(e.target.value)}>
          <option>Continue Quarantine</option><option>Extend Quarantine</option>
          <option>Initiate Clearance</option><option>Recommend Lifting</option>
        </select>
      </div>
      <button className={s.submitBtn} disabled={!findings.trim() || saving} onClick={submit}>
        <FileText size={13} /> {saving ? 'Saving…' : 'Submit Assessment'}
      </button>
    </div>
  );
}

// ── Zone card ─────────────────────────────────────────────────────────────────

function ZoneCard({ z, selected, onClick }: { z: QuarantineZone; selected: boolean; onClick: () => void }) {
  const st = STATUS_STYLE[z.status];
  return (
    <div className={`${s.zoneCard}${selected ? ' ' + s.zoneCardSelected : ''}`} onClick={onClick}>
      <div className={s.zcTop}>
        <span className={s.zcCode}>{z.zoneCode}</span>
        <span className={s.badge} style={{ background: st.bg, color: st.color }}>{st.label}</span>
      </div>
      <div className={s.zcName}>{z.zoneName}</div>
      <div className={s.zcMeta}><MapPin size={11} /> {z.regionCode}</div>
      <div className={s.zcStats}>
        <span><Beef size={11} /> {z.animalCount.toLocaleString()} animals</span>
        <span><Clock size={11} /> {z.daysActive}d active</span>
        {z.movementBlocked && <span className={s.zcBlock}>Movement Blocked</span>}
      </div>
    </div>
  );
}

// ── Inspection timeline ───────────────────────────────────────────────────────

function InspectionTimeline({ logs }: { logs: InspectionLog[] }) {
  if (logs.length === 0) return <div className={s.noLogs}>No inspections recorded yet.</div>;
  return (
    <div className={s.timeline}>
      {logs.map((log, i) => (
        <div key={log.id} className={s.timelineItem}>
          <div className={s.tlDotWrap}>
            <div className={`${s.tlDot}${i === 0 ? ' ' + s.tlDotCurrent : ''}`} />
            {i < logs.length - 1 && <div className={s.tlLine} />}
          </div>
          <div className={s.tlContent}>
            <div className={s.tlTop}>
              <span className={s.tlType}>{log.logType}</span>
              <span className={s.tlDate}>{log.createdAt.slice(0, 10)}</span>
            </div>
            <div className={s.tlOfficer}>{log.officerName}{log.officerRole ? ` · ${log.officerRole.replace(/_/g, ' ')}` : ''}</div>
            <div className={s.tlFinding}>{log.findings}</div>
            <div className={s.tlOutcome}>{log.outcome}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function DetailPanel({
  zone, logs, authUid, officerName, officerRole, isQO, isVet, onClose, onLogAdded,
}: {
  zone: QuarantineZone; logs: InspectionLog[];
  authUid: string; officerName: string; officerRole: string;
  isQO: boolean; isVet: boolean;
  onClose: () => void; onLogAdded: () => void;
}) {
  const [activeAction, setActiveAction] = useState<ActionKind>(null);
  const st = STATUS_STYLE[zone.status];
  const toggle = (a: Exclude<ActionKind, null>) => setActiveAction(cur => cur === a ? null : a);
  const handleSuccess = () => { setActiveAction(null); onLogAdded(); };

  const formProps = { zone, authUid, officerName, officerRole, onSuccess: handleSuccess };

  return (
    <div className={s.detailPanel}>
      <div className={s.detailHeader}>
        <div>
          <div className={s.detailCode}>{zone.zoneCode}</div>
          <div className={s.detailName}>{zone.zoneName}</div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.375rem', flexWrap: 'wrap' }}>
            <span className={s.badge} style={{ background: st.bg, color: st.color }}>{st.label}</span>
            <span className={s.typeBadge}>{TYPE_LABELS[zone.type]}</span>
          </div>
        </div>
        <button className={s.closeBtn} onClick={onClose}><X size={16} /></button>
      </div>

      {zone.movementBlocked && (
        <div className={s.blockBanner}>
          <AlertCircle size={13} /> Movement in and out of this zone is currently blocked
        </div>
      )}

      <div className={s.infoGrid}>
        {([
          ['Region',        zone.regionCode],
          ['Premises',      `${zone.premisesCount} premises`],
          ['Animals',       zone.animalCount.toLocaleString()],
          ['Declared By',   zone.declaredByName || '—'],
          ['Declared',      zone.declaredDate],
          ['Expected Lift', zone.expectedLiftDate || '—'],
        ] as [string, string][]).map(([l, v]) => (
          <div key={l} className={s.infoItem}>
            <div className={s.infoLabel}>{l}</div>
            <div className={s.infoValue}>{v}</div>
          </div>
        ))}
        {zone.reason && (
          <div className={s.infoItem} style={{ gridColumn: '1 / -1' }}>
            <div className={s.infoLabel}>Reason</div>
            <div className={s.infoValue} style={{ fontWeight: 400, fontSize: '0.8125rem', lineHeight: 1.5 }}>{zone.reason}</div>
          </div>
        )}
      </div>

      {zone.status !== 'LIFTED' && (isQO || isVet) && (
        <div className={s.actionsSection}>
          <div className={s.sectionLabel}>Field Actions</div>
          <div className={s.actionBtns}>
            {(isQO || isVet) && (
              <button className={`${s.actionBtn}${activeAction === 'inspect' ? ' ' + s.actionBtnOn : ''}`} onClick={() => toggle('inspect')}>
                <Clipboard size={13} /> Record Inspection
              </button>
            )}
            {isQO && (
              <button className={`${s.actionBtn}${activeAction === 'breach' ? ' ' + s.actionBtnOn : ''}`} onClick={() => toggle('breach')}>
                <AlertTriangle size={13} /> Report Breach
              </button>
            )}
            {isVet && (
              <>
                <button className={`${s.actionBtn}${activeAction === 'sample' ? ' ' + s.actionBtnOn : ''}`} onClick={() => toggle('sample')}>
                  <Activity size={13} /> Collect Sample
                </button>
                <button className={`${s.actionBtn}${activeAction === 'healthcheck' ? ' ' + s.actionBtnOn : ''}`} onClick={() => toggle('healthcheck')}>
                  <FileText size={13} /> Health Assessment
                </button>
              </>
            )}
            {(isQO || isVet) && zone.status === 'CLEARANCE_IN_PROGRESS' && (
              <button className={`${s.liftActionBtn}${activeAction === 'recommend' ? ' ' + s.actionBtnOn : ''}`} onClick={() => toggle('recommend')}>
                <ShieldCheck size={13} /> Recommend Lifting
              </button>
            )}
          </div>

          {activeAction === 'inspect'     && <InspectForm     {...formProps} />}
          {activeAction === 'breach'      && <BreachForm      {...formProps} />}
          {activeAction === 'sample'      && <SampleForm      {...formProps} />}
          {activeAction === 'healthcheck' && <HealthCheckForm {...formProps} />}
          {activeAction === 'recommend'   && <RecommendForm   {...formProps} />}
        </div>
      )}

      <div className={s.timelineSection}>
        <div className={s.sectionLabel}>Inspection Log</div>
        <InspectionTimeline logs={logs} />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function QuarantinePage(): JSX.Element {
  const { roles, regionCode } = useAuthStore();
  const [authUid,     setAuthUid]     = useState('');
  const [officerName, setOfficerName] = useState('');
  const userRole   = roles[0] ?? 'FIELD_INSPECTOR';
  const isQO       = roles.some(r => r === 'QUARANTINE_OFFICER');
  const isVet      = roles.some(r => r === 'VETERINARY_OFFICER');

  const [zones,        setZones]        = useState<QuarantineZone[]>([]);
  const [logs,         setLogs]         = useState<InspectionLog[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [selected,     setSelected]     = useState<QuarantineZone | null>(null);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<ZoneStatus | 'ALL'>('ALL');

  // ── Incoming movements awaiting quarantine acceptance ──────────────────────
  const [incomingMovements, setIncomingMovements] = useState<{
    id: string; movementCode: string; status: string;
    originPremisesName: string; animalCount: number;
    purpose: string; plannedArrivalDate: string;
  }[]>([]);
  const [acceptingCode, setAcceptingCode] = useState<string | null>(null);

  const loadIncoming = useCallback(async () => {
    let q = supabase
      .from('farmer_movement_requests')
      .select('id, movement_code, status, origin_premises_name, animal_count, purpose, planned_arrival_date')
      .eq('purpose', 'Quarantine')
      .in('status', ['PERMIT_ISSUED', 'IN_TRANSIT'])
      .order('created_at', { ascending: false });
    if (regionCode) q = q.eq('destination_region_code', regionCode);
    const { data } = await q;
    setIncomingMovements((data ?? []).map((r: any) => ({
      id:                 r.id as string,
      movementCode:       r.movement_code as string,
      status:             r.status as string,
      originPremisesName: (r.origin_premises_name as string) ?? '—',
      animalCount:        (r.animal_count as number) ?? 0,
      purpose:            r.purpose as string,
      plannedArrivalDate: (r.planned_arrival_date as string) ?? '',
    })));
  }, [regionCode]);

  const acceptArrival = async (movementCode: string) => {
    setAcceptingCode(movementCode);
    await supabase.from('farmer_movement_requests')
      .update({ status: 'ARRIVAL_CONFIRMED' })
      .eq('movement_code', movementCode);
    setIncomingMovements(prev => prev.filter(m => m.movementCode !== movementCode));
    setAcceptingCode(null);
  };

  useEffect(() => { void loadIncoming(); }, [loadIncoming]);

  // Resolve real auth UID
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.id) setAuthUid(data.user.id);
    });
  }, []);

  const loadZones = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('quarantine_zones').select('*').order('declared_date', { ascending: false });
    if (regionCode) q = q.eq('region_code', regionCode);
    const { data } = await q;
    setZones((data ?? []).map(r => mapZone(r as Record<string, unknown>)));
    setLoading(false);
  }, [regionCode]);

  const loadLogs = useCallback(async (zoneId: string) => {
    const { data } = await supabase
      .from('quarantine_inspection_logs')
      .select('*')
      .eq('zone_id', zoneId)
      .order('created_at', { ascending: false });
    setLogs((data ?? []).map(r => mapLog(r as Record<string, unknown>)));
  }, []);

  useEffect(() => { void loadZones(); }, [loadZones]);

  useEffect(() => {
    if (selected) void loadLogs(selected.id);
    else setLogs([]);
  }, [selected, loadLogs]);

  // Resolve officer display name
  useEffect(() => {
    const label = userRole.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    setOfficerName(label);
  }, [userRole]);

  const filtered = zones.filter(z => {
    if (search && !z.zoneCode.toLowerCase().includes(search.toLowerCase()) && !z.zoneName.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'ALL' && z.status !== statusFilter) return false;
    return true;
  });

  const activeCount    = zones.filter(z => z.status === 'ACTIVE').length;
  const clearanceCount = zones.filter(z => z.status === 'CLEARANCE_IN_PROGRESS').length;
  const animalCount    = zones.filter(z => z.status === 'ACTIVE').reduce((a, z) => a + z.animalCount, 0);

  return (
    <div className={s.page}>

      {/* ── Incoming quarantine arrivals ──────────────────────────────────────── */}
      {incomingMovements.length > 0 && (
        <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#92400e', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={16} color="#d97706" />
            {incomingMovements.length} Movement{incomingMovements.length !== 1 ? 's' : ''} Arriving at Quarantine — Acceptance Required
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {incomingMovements.map(m => (
              <div key={m.id} style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: 8, padding: '0.625rem 0.875rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: '#374151', fontWeight: 700 }}>{m.movementCode}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 2 }}>
                    From: {m.originPremisesName} · {m.animalCount} animal{m.animalCount !== 1 ? 's' : ''}
                    {m.plannedArrivalDate && ` · Expected ${m.plannedArrivalDate}`}
                  </div>
                </div>
                <div style={{ display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: 999, background: m.status === 'IN_TRANSIT' ? '#fffbeb' : '#dbeafe', color: m.status === 'IN_TRANSIT' ? '#b45309' : '#1d4ed8', fontSize: '0.7rem', fontWeight: 700 }}>
                  {m.status === 'IN_TRANSIT' ? 'In Transit' : 'Permit Issued'}
                </div>
                <button
                  disabled={acceptingCode === m.movementCode}
                  onClick={() => void acceptArrival(m.movementCode)}
                  style={{ background: acceptingCode === m.movementCode ? '#d1fae5' : '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '0.4rem 0.875rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  {acceptingCode === m.movementCode ? 'Accepting…' : 'Accept Arrival'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className={s.summaryRow}>
        <div className={s.summaryChip} style={{ background: '#fef3c7', color: '#a16207' }}>
          <ShieldOff size={12} /> {activeCount} Active Zone{activeCount !== 1 ? 's' : ''}
        </div>
        <div className={s.summaryChip} style={{ background: '#ede9fe', color: '#7c3aed' }}>
          <ShieldCheck size={12} /> {clearanceCount} In Clearance
        </div>
        <div className={s.summaryChip} style={{ background: '#fef2f2', color: '#dc2626' }}>
          <Beef size={12} /> {animalCount.toLocaleString()} Animals Affected
        </div>
        <button
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.3rem 0.625rem', fontSize: '0.75rem', color: '#64748b', cursor: 'pointer' }}
          onClick={loadZones}
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div className={s.splitLayout}>
        {/* Left: zone list */}
        <div className={s.leftCol}>
          <div className={s.filterBar}>
            <div className={s.searchWrap}>
              <Search size={13} className={s.searchIcon} />
              <input className={s.searchInput} placeholder="Zone code or name…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className={s.selectWrap}>
              <select className={s.filterSelect} value={statusFilter} onChange={e => setStatusFilter(e.target.value as ZoneStatus | 'ALL')}>
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="CLEARANCE_IN_PROGRESS">Clearance</option>
                <option value="LIFTED">Lifted</option>
              </select>
              <ChevronDown size={12} className={s.selectIcon} />
            </div>
          </div>

          <div className={s.zoneList}>
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} style={{ height: 90, borderRadius: 10, background: 'linear-gradient(90deg,#f3f4f6 25%,#e9eaec 50%,#f3f4f6 75%)', backgroundSize: '400px 100%', animation: 'shimmer 1.4s infinite' }} />
              ))
            ) : filtered.length === 0 ? (
              <div className={s.emptyList}>
                {zones.length === 0 ? 'No quarantine zones in your region.' : 'No zones match the filters.'}
              </div>
            ) : filtered.map(z => (
              <ZoneCard
                key={z.id} z={z}
                selected={selected?.id === z.id}
                onClick={() => setSelected(sel => sel?.id === z.id ? null : z)}
              />
            ))}
          </div>
        </div>

        {/* Right: detail */}
        <div className={s.rightCol}>
          {selected ? (
            <DetailPanel
              zone={selected} logs={logs}
              authUid={authUid} officerName={officerName} officerRole={userRole}
              isQO={isQO} isVet={isVet || isQO}
              onClose={() => setSelected(null)}
              onLogAdded={() => void loadLogs(selected.id)}
            />
          ) : (
            <div className={s.emptyRight}>
              <ShieldOff size={40} strokeWidth={1.25} color="#c8d8ef" />
              <div className={s.emptyRightTitle}>Select a quarantine zone</div>
              <div className={s.emptyRightSub}>Choose a zone from the list to view details, record inspections, and log findings</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default QuarantinePage;
