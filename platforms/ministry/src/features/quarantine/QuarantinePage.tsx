import { useState } from 'react';
import {
  ShieldOff, X, Search, ChevronDown,
  CheckCircle, AlertTriangle, Clock, MapPin, Beef, Plus,
  FileText, ShieldCheck,
} from 'lucide-react';
import s from './quarantine.module.css';

/* ── Types ───────────────────────────────────────────────────── */
type ZoneStatus  = 'ACTIVE' | 'CLEARANCE_IN_PROGRESS' | 'LIFTED' | 'EXPIRED';
type ZoneType    = 'DISEASE_OUTBREAK' | 'BORDER_CONTROL' | 'EXPORT_HOLD' | 'ROUTINE_HEALTH';
type ActionKind  = 'extend' | 'initiate_clearance' | 'lift' | 'notes' | null;

interface QuarantineZone {
  id:              string;
  zoneCode:        string;
  zoneName:        string;
  type:            ZoneType;
  status:          ZoneStatus;
  region:          string;
  declaredDate:    string;
  expectedLiftDate:string;
  reason:          string;
  premisesCount:   number;
  animalCount:     number;
  inspections:     number;
  lastInspection:  string;
  lastInspectedBy: string;
  authorizedBy:    string;
}

/* ── Mock data ───────────────────────────────────────────────── */
const MOCK: QuarantineZone[] = [
  { id:'1', zoneCode:'QZ-2026-001', zoneName:'Bay Region Zone A',       type:'DISEASE_OUTBREAK',  status:'ACTIVE',                region:'Bay',        declaredDate:'2026-07-20', expectedLiftDate:'2026-08-20', reason:'FMD outbreak detected at SOM-BAY-003', premisesCount:8,  animalCount:340, inspections:12, lastInspection:'2026-08-03', lastInspectedBy:'Field Inspector Hassan', authorizedBy:'Dr. Ahmed Ministry' },
  { id:'2', zoneCode:'QZ-2026-002', zoneName:'Jubbaland Border Zone',   type:'BORDER_CONTROL',    status:'ACTIVE',                region:'Jubbaland',  declaredDate:'2026-07-25', expectedLiftDate:'2026-09-01', reason:'Border entry point — routine health screening', premisesCount:3, animalCount:150, inspections:6, lastInspection:'2026-08-02', lastInspectedBy:'Quarantine Officer Ali', authorizedBy:'Ministry Directive 2026-07' },
  { id:'3', zoneCode:'QZ-2026-003', zoneName:'Mogadishu South Zone',    type:'DISEASE_OUTBREAK',  status:'CLEARANCE_IN_PROGRESS', region:'Mogadishu',  declaredDate:'2026-07-01', expectedLiftDate:'2026-08-10', reason:'CBPP suspected at SOM-MOG-007 and SOM-MOG-012', premisesCount:5, animalCount:210, inspections:21, lastInspection:'2026-08-04', lastInspectedBy:'Dr. Fadumo Vet Officer', authorizedBy:'National Vet Authority' },
  { id:'4', zoneCode:'QZ-2026-004', zoneName:'Puntland Export Hold',    type:'EXPORT_HOLD',       status:'ACTIVE',                region:'Puntland',   declaredDate:'2026-08-01', expectedLiftDate:'2026-08-15', reason:'Pre-export health certification pending', premisesCount:2, animalCount:480, inspections:3,  lastInspection:'2026-08-03', lastInspectedBy:'Quarantine Officer Omar', authorizedBy:'Export Division Head' },
  { id:'5', zoneCode:'QZ-2026-005', zoneName:'Somaliland North Zone',   type:'ROUTINE_HEALTH',    status:'ACTIVE',                region:'Somaliland', declaredDate:'2026-07-28', expectedLiftDate:'2026-08-28', reason:'Routine biannual health check zone', premisesCount:12, animalCount:620, inspections:8, lastInspection:'2026-08-01', lastInspectedBy:'Social Worker Said', authorizedBy:'Regional Director' },
  { id:'6', zoneCode:'QZ-2026-006', zoneName:'Bakool South Zone',       type:'DISEASE_OUTBREAK',  status:'LIFTED',                region:'Bakool',     declaredDate:'2026-06-10', expectedLiftDate:'2026-07-20', reason:'LSD suspected — cleared after testing', premisesCount:4,  animalCount:190, inspections:18, lastInspection:'2026-07-19', lastInspectedBy:'Dr. Halimo Vet Officer', authorizedBy:'National Vet Authority' },
  { id:'7', zoneCode:'QZ-2026-007', zoneName:'Bay Region Zone B',       type:'DISEASE_OUTBREAK',  status:'ACTIVE',                region:'Bay',        declaredDate:'2026-08-02', expectedLiftDate:'2026-09-02', reason:'PPR confirmed at SOM-BAY-009', premisesCount:6, animalCount:280, inspections:2, lastInspection:'2026-08-03', lastInspectedBy:'Field Inspector Ibrahim', authorizedBy:'Dr. Ahmed Ministry' },
];

const STATUS_STYLE: Record<ZoneStatus, { bg: string; color: string; label: string }> = {
  ACTIVE:                 { bg: '#fef3c7', color: '#d97706', label: 'Active'               },
  CLEARANCE_IN_PROGRESS:  { bg: '#ede9fe', color: '#7c3aed', label: 'Clearance in Progress'},
  LIFTED:                 { bg: '#f0fdf4', color: '#16a34a', label: 'Lifted'               },
  EXPIRED:                { bg: '#f1f5f9', color: '#64748b', label: 'Expired'              },
};

const TYPE_LABELS: Record<ZoneType, string> = {
  DISEASE_OUTBREAK: 'Disease Outbreak',
  BORDER_CONTROL:   'Border Control',
  EXPORT_HOLD:      'Export Hold',
  ROUTINE_HEALTH:   'Routine Health',
};

const REGIONS = ['All', 'Bay', 'Bakool', 'Jubbaland', 'Mogadishu', 'Puntland', 'Somaliland'];

const STATUS_FILTERS: Array<{ key: ZoneStatus | 'ALL'; label: string }> = [
  { key: 'ALL',                 label: 'All'                  },
  { key: 'ACTIVE',              label: 'Active'               },
  { key: 'CLEARANCE_IN_PROGRESS', label: 'Clearance'         },
  { key: 'LIFTED',              label: 'Lifted'               },
  { key: 'EXPIRED',             label: 'Expired'              },
];

/* ── Declare zone form ───────────────────────────────────────── */
function DeclareZoneForm({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    zoneName: '', region: '', type: 'DISEASE_OUTBREAK' as ZoneType,
    reason: '', premisesList: '', expectedLiftDate: '',
  });
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className={s.formSuccess}>
        <CheckCircle size={28} color="#16a34a" />
        <div className={s.formSuccessTitle}>Quarantine Zone Declared</div>
        <div className={s.formSuccessSub}>Zone code assigned and field teams notified.</div>
        <button className={s.closeFormBtn} onClick={onClose}>Close</button>
      </div>
    );
  }

  const canSubmit = form.zoneName && form.region && form.reason && form.expectedLiftDate;

  return (
    <div className={s.declareForm}>
      <div className={s.declareFormTitle}><Plus size={15} /> Declare Quarantine Zone</div>
      <div className={s.formGrid}>
        <div className={s.field}>
          <label className={s.label}>Zone Name <span className={s.req}>*</span></label>
          <input className={s.input} value={form.zoneName} onChange={e => setForm(f => ({...f, zoneName: e.target.value}))} placeholder="e.g. Bay Region Zone C" />
        </div>
        <div className={s.field}>
          <label className={s.label}>Region <span className={s.req}>*</span></label>
          <select className={s.select} value={form.region} onChange={e => setForm(f => ({...f, region: e.target.value}))}>
            <option value="">Select region…</option>
            {REGIONS.filter(r => r !== 'All').map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className={s.field}>
          <label className={s.label}>Quarantine Type</label>
          <select className={s.select} value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value as ZoneType}))}>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className={s.field}>
          <label className={s.label}>Expected Lift Date <span className={s.req}>*</span></label>
          <input className={s.input} type="date" value={form.expectedLiftDate} onChange={e => setForm(f => ({...f, expectedLiftDate: e.target.value}))} />
        </div>
        <div className={s.field} style={{ gridColumn: '1 / -1' }}>
          <label className={s.label}>Reason / Justification <span className={s.req}>*</span></label>
          <textarea className={s.textarea} rows={2} value={form.reason} onChange={e => setForm(f => ({...f, reason: e.target.value}))} placeholder="Describe the reason for quarantine declaration…" />
        </div>
        <div className={s.field} style={{ gridColumn: '1 / -1' }}>
          <label className={s.label}>Affected Premises Codes (comma-separated)</label>
          <input className={s.input} value={form.premisesList} onChange={e => setForm(f => ({...f, premisesList: e.target.value}))} placeholder="SOM-BAY-001, SOM-BAY-002, …" />
        </div>
      </div>
      <div className={s.formBtns}>
        <button className={s.cancelBtn} onClick={onClose}>Cancel</button>
        <button className={s.declareBtn} disabled={!canSubmit} onClick={() => canSubmit && setDone(true)}>
          <ShieldOff size={13} /> Declare Zone
        </button>
      </div>
    </div>
  );
}

/* ── Action forms ────────────────────────────────────────────── */
function ExtendForm({ zone, onSuccess }: { zone: QuarantineZone; onSuccess: (msg: string) => void }) {
  const [newDate, setNewDate] = useState('');
  const [reason, setReason]  = useState('');
  return (
    <div className={s.actionForm}>
      <div className={s.actionTitle}><Clock size={13} /> Extend Quarantine</div>
      <div className={s.field}>
        <label className={s.label}>New Lift Date <span className={s.req}>*</span></label>
        <input className={s.input} type="date" value={newDate} onChange={e => setNewDate(e.target.value)} min={zone.expectedLiftDate} />
      </div>
      <div className={s.field}>
        <label className={s.label}>Reason for Extension <span className={s.req}>*</span></label>
        <textarea className={s.textarea} rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="Explain why an extension is needed…" />
      </div>
      <button className={s.primaryBtn} disabled={!newDate || !reason.trim()} onClick={() => newDate && reason.trim() && onSuccess(`Zone extended to ${newDate}. Field teams notified.`)}>
        <Clock size={13} /> Confirm Extension
      </button>
    </div>
  );
}

function ClearanceForm({ onSuccess }: { onSuccess: (msg: string) => void }) {
  const [notes, setNotes] = useState('');
  return (
    <div className={s.actionForm}>
      <div className={s.actionTitle}><FileText size={13} /> Initiate Clearance Process</div>
      <div className={s.field}>
        <label className={s.label}>Clearance Instructions</label>
        <textarea className={s.textarea} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Instructions for field inspection team…" />
      </div>
      <button className={s.primaryBtn} onClick={() => onSuccess('Clearance process initiated. Veterinary team notified to conduct final inspections.')}>
        <ShieldCheck size={13} /> Initiate Clearance
      </button>
    </div>
  );
}

function LiftForm({ zone, onSuccess }: { zone: QuarantineZone; onSuccess: (msg: string) => void }) {
  const [confirm, setConfirm] = useState(false);
  const [authorizer, setAuthorizer] = useState('');
  return (
    <div className={s.actionForm}>
      <div className={s.actionTitle}><ShieldCheck size={13} /> Lift Quarantine</div>
      <div className={s.liftWarning}>
        <AlertTriangle size={14} /> Lifting quarantine for <strong>{zone.zoneName}</strong> will allow normal movement in and out of {zone.premisesCount} premises.
      </div>
      <div className={s.field}>
        <label className={s.label}>Authorized By <span className={s.req}>*</span></label>
        <input className={s.input} value={authorizer} onChange={e => setAuthorizer(e.target.value)} placeholder="Ministry official name and title" />
      </div>
      <label className={s.checkRow}>
        <input type="checkbox" checked={confirm} onChange={e => setConfirm(e.target.checked)} />
        <span>I confirm all clearance criteria have been met and the zone is safe to open</span>
      </label>
      <button className={s.liftBtn} disabled={!confirm || !authorizer.trim()} onClick={() => confirm && authorizer.trim() && onSuccess('Quarantine lifted. All affected premises notified. Movement restrictions removed.')}>
        <ShieldCheck size={13} /> Lift Quarantine Zone
      </button>
    </div>
  );
}

/* ── Detail panel ────────────────────────────────────────────── */
function DetailPanel({ zone, onClose }: { zone: QuarantineZone; onClose: () => void }) {
  const [activeAction, setActiveAction] = useState<ActionKind>(null);
  const [successMsg, setSuccessMsg]     = useState<string | null>(null);

  const st = STATUS_STYLE[zone.status];

  const toggle = (a: Exclude<ActionKind, null>) =>
    setActiveAction(cur => cur === a ? null : a);

  const handleSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setActiveAction(null);
  };

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

      {successMsg && (
        <div className={s.successBanner}><CheckCircle size={14} /> {successMsg}</div>
      )}

      {/* Info grid */}
      <div className={s.infoGrid}>
        {[
          ['Region',         zone.region],
          ['Premises Affected', `${zone.premisesCount} premises`],
          ['Animals Affected',  `${zone.animalCount.toLocaleString()} animals`],
          ['Inspections',    `${zone.inspections} conducted`],
          ['Declared',       zone.declaredDate],
          ['Expected Lift',  zone.expectedLiftDate],
        ].map(([l, v]) => (
          <div key={l} className={s.infoItem}>
            <div className={s.infoLabel}>{l}</div>
            <div className={s.infoValue}>{v}</div>
          </div>
        ))}
        <div className={s.infoItem} style={{ gridColumn: '1 / -1' }}>
          <div className={s.infoLabel}>Reason</div>
          <div className={s.infoValue}>{zone.reason}</div>
        </div>
        <div className={s.infoItem} style={{ gridColumn: '1 / -1' }}>
          <div className={s.infoLabel}>Last Inspection</div>
          <div className={s.infoValue}>{zone.lastInspection} by {zone.lastInspectedBy}</div>
        </div>
        <div className={s.infoItem} style={{ gridColumn: '1 / -1' }}>
          <div className={s.infoLabel}>Authorized By</div>
          <div className={s.infoValue}>{zone.authorizedBy}</div>
        </div>
      </div>

      {/* Actions */}
      {zone.status !== 'LIFTED' && zone.status !== 'EXPIRED' && (
        <div className={s.actionsSection}>
          <div className={s.sectionLabel}>Authority Actions</div>
          <div className={s.actionBtns}>
            <button className={`${s.actionBtn}${activeAction === 'extend' ? ' ' + s.actionBtnOn : ''}`}
              onClick={() => toggle('extend')}>
              <Clock size={13} /> Extend
            </button>
            {zone.status === 'ACTIVE' && (
              <button className={`${s.actionBtn}${activeAction === 'initiate_clearance' ? ' ' + s.actionBtnOn : ''}`}
                onClick={() => toggle('initiate_clearance')}>
                <FileText size={13} /> Initiate Clearance
              </button>
            )}
            {zone.status === 'CLEARANCE_IN_PROGRESS' && (
              <button className={`${s.liftActionBtn}${activeAction === 'lift' ? ' ' + s.actionBtnOn : ''}`}
                onClick={() => toggle('lift')}>
                <ShieldCheck size={13} /> Lift Zone
              </button>
            )}
          </div>

          {activeAction === 'extend'             && <ExtendForm   zone={zone} onSuccess={handleSuccess} />}
          {activeAction === 'initiate_clearance' && <ClearanceForm             onSuccess={handleSuccess} />}
          {activeAction === 'lift'               && <LiftForm     zone={zone} onSuccess={handleSuccess} />}
        </div>
      )}

      {zone.status === 'LIFTED' && (
        <div className={s.liftedBanner}>
          <ShieldCheck size={14} /> This quarantine zone has been lifted. Normal movement restored.
        </div>
      )}
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────── */
export function QuarantinePage(): JSX.Element {
  const [selected, setSelected]           = useState<QuarantineZone | null>(null);
  const [search, setSearch]               = useState('');
  const [statusFilter, setStatusFilter]   = useState<ZoneStatus | 'ALL'>('ALL');
  const [regionFilter, setRegionFilter]   = useState('All');
  const [showDeclare, setShowDeclare]     = useState(false);

  const filtered = MOCK.filter(z => {
    if (search && !z.zoneCode.toLowerCase().includes(search.toLowerCase()) && !z.zoneName.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'ALL' && z.status !== statusFilter) return false;
    if (regionFilter !== 'All' && z.region !== regionFilter) return false;
    return true;
  });

  const kpis = [
    { label: 'Active Zones',         value: MOCK.filter(z => z.status === 'ACTIVE').length },
    { label: 'Clearance in Progress', value: MOCK.filter(z => z.status === 'CLEARANCE_IN_PROGRESS').length },
    { label: 'Animals Affected',      value: MOCK.filter(z => z.status === 'ACTIVE').reduce((a,z) => a + z.animalCount, 0).toLocaleString() },
    { label: 'Zones Lifted This Year',value: MOCK.filter(z => z.status === 'LIFTED').length },
  ];

  return (
    <div className={`${s.page}${selected ? ' ' + s.pageWithPanel : ''}`}>
      <div className={s.mainContent}>

        {/* Header */}
        <div className={s.pageHeader}>
          <div>
            <h1 className={s.pageTitle}><ShieldOff size={18} strokeWidth={1.75} color="#0f2170" /> Quarantine Control</h1>
            <p className={s.pageSub}>Manage quarantine zones, inspections and clearances</p>
          </div>
          <button className={s.declareZoneBtn} onClick={() => setShowDeclare(true)}>
            <Plus size={14} /> Declare Zone
          </button>
        </div>

        {showDeclare && (
          <DeclareZoneForm onClose={() => setShowDeclare(false)} />
        )}

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
            <input className={s.searchInput} placeholder="Search zone code or name…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className={s.selectWrap}>
            <select className={s.filterSelect} value={statusFilter} onChange={e => setStatusFilter(e.target.value as ZoneStatus | 'ALL')}>
              {STATUS_FILTERS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
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
                <th className={s.th}>Zone Code</th>
                <th className={s.th}>Zone Name</th>
                <th className={s.th}>Type</th>
                <th className={s.th}>Region</th>
                <th className={s.th}><Beef size={12} /> Animals</th>
                <th className={s.th}><MapPin size={12} /> Premises</th>
                <th className={s.th}>Declared</th>
                <th className={s.th}>Lift Date</th>
                <th className={s.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className={s.emptyRow}>No quarantine zones match the current filters.</td></tr>
              ) : filtered.map(z => {
                const st = STATUS_STYLE[z.status];
                return (
                  <tr
                    key={z.id}
                    className={`${s.tr}${selected?.id === z.id ? ' ' + s.trSelected : ''}`}
                    onClick={() => setSelected(sel => sel?.id === z.id ? null : z)}
                  >
                    <td className={s.td}><span className={s.zoneCode}>{z.zoneCode}</span></td>
                    <td className={s.td}>{z.zoneName}</td>
                    <td className={s.td}>{TYPE_LABELS[z.type]}</td>
                    <td className={s.td}>{z.region}</td>
                    <td className={s.td}>{z.animalCount.toLocaleString()}</td>
                    <td className={s.td}>{z.premisesCount}</td>
                    <td className={s.td}>{z.declaredDate}</td>
                    <td className={s.td}>{z.expectedLiftDate}</td>
                    <td className={s.td}><span className={s.badge} style={{ background: st.bg, color: st.color }}>{st.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <DetailPanel zone={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

export default QuarantinePage;
