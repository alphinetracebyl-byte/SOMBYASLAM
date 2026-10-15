import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth.store';
import {
  Tag, CheckCircle2, ChevronRight, ChevronLeft, ArrowRight,
  Clock, Truck, Package, CheckCircle, AlertCircle, Plus, X,
  Hash, MapPin, User, FileText, Target, StickyNote, Phone,
  RefreshCw, HelpCircle,
} from 'lucide-react';
import s from './tags.module.css';

/* ── Types ───────────────────────────────────────────────────── */
type TagType   = 'RFID' | 'EAR_TAG';
type ReqStatus = 'PENDING' | 'APPROVED' | 'ALLOCATED' | 'ISSUED' | 'IN_TRANSIT' | 'WITH_FARMER' | 'REJECTED';

interface RequestDraft {
  tagType:       TagType | '';
  quantity:      string;
  reason:        string;
  farmId:        string;
  location:      string;
  address:       string;
  contactPerson: string;
  phone:         string;
  notes:         string;
  latitude:      number | null;
  longitude:     number | null;
}

interface MockRequest {
  reqCode:   string;
  tagType:   TagType;
  quantity:  number;
  status:    ReqStatus;
  date:      string;
  allocated: string;
}

/* ── Static data ─────────────────────────────────────────────── */
const STEP_LABELS = ['Tag Details', 'Purpose & Farm', 'Contact', 'Review'];


const STATUS_STYLE: Record<ReqStatus, { bg: string; color: string; label: string }> = {
  PENDING:     { bg: '#fefce8', color: '#a16207', label: 'Pending Review' },
  APPROVED:    { bg: '#eff6ff', color: '#1d4ed8', label: 'Approved'       },
  ALLOCATED:   { bg: '#f0f9ff', color: '#0369a1', label: 'Allocated'      },
  ISSUED:      { bg: '#fdf4ff', color: '#9333ea', label: 'Issued'         },
  IN_TRANSIT:  { bg: '#fefce8', color: '#d97706', label: 'In Transit'     },
  WITH_FARMER: { bg: '#f0fdf4', color: '#16a34a', label: 'With You'       },
  REJECTED:    { bg: '#fef2f2', color: '#dc2626', label: 'Rejected'       },
};

const MOCK_REQUESTS: MockRequest[] = [
  { reqCode: 'TAG-REQ-2026-00037', tagType: 'EAR_TAG', quantity: 25, status: 'WITH_FARMER', date: '2026-07-22', allocated: 'EAR-2026-10001 → 10025' },
  { reqCode: 'TAG-REQ-2026-00029', tagType: 'RFID',    quantity: 10, status: 'IN_TRANSIT',  date: '2026-07-10', allocated: 'RFID-2026-05011 → 05020' },
  { reqCode: 'TAG-REQ-2026-00018', tagType: 'EAR_TAG', quantity: 15, status: 'REJECTED',    date: '2026-06-01', allocated: '—' },
];

const HOW_STEPS = [
  { num: '1', title: 'Submit a Request',      desc: 'Fill in tag type, quantity, reason, and farm details. Each request is limited to 500 tags.' },
  { num: '2', title: 'Authority Review',       desc: 'The regional livestock authority reviews your request within 1–3 working days.' },
  { num: '3', title: 'Tag Allocation',         desc: 'Approved requests are allocated a sequential tag number range. RFID tags are programmed at this stage.' },
  { num: '4', title: 'Delivery or Collection', desc: 'Tags are dispatched to your region or ready for collection. Authorised contact must present ID.' },
  { num: '5', title: 'Apply Tags to Animals',  desc: 'Record each tag application to permanently link the tag number to the animal in the national database.' },
];

const IMPORTANT_NOTES = [
  'Tags are government property — report any lost or stolen tags immediately.',
  'Each tag serial number is unique and permanently linked to one animal.',
  'Do not apply a tag to an animal already carrying an active tag without recording a replacement.',
  'Unused tags must be returned if a request is partially fulfilled.',
  'RFID tags must be scanned to verify chip data before application.',
];

/* ── Mother & calf SVG icon ──────────────────────────────────── */
function MotherCalfIcon({ size = 22, color = '#94a3b8' }: { size?: number; color?: string; strokeWidth?: number }) {
  return (
    <svg width={Math.round(size * 1.55)} height={size} viewBox="0 0 36 24" fill={color}>
      {/* Mother cow body + head */}
      <ellipse cx="11" cy="15" rx="8.5" ry="5.5" />
      <ellipse cx="19" cy="10.5" rx="4" ry="3.5" />
      {/* Mother legs */}
      <rect x="4"  y="19.5" width="2" height="4"   rx="1" />
      <rect x="8"  y="19.5" width="2" height="4"   rx="1" />
      <rect x="13" y="19.5" width="2" height="4"   rx="1" />
      <rect x="17" y="19.5" width="2" height="4"   rx="1" />
      {/* Calf body + head */}
      <ellipse cx="28"  cy="17"   rx="5.5" ry="3.5" opacity="0.6" />
      <ellipse cx="32.5" cy="13.5" rx="2.8" ry="2.5" opacity="0.6" />
      {/* Calf legs */}
      <rect x="24" y="19.5" width="1.5" height="4"   rx="0.75" opacity="0.6" />
      <rect x="27" y="19.5" width="1.5" height="4"   rx="0.75" opacity="0.6" />
      <rect x="30" y="19.5" width="1.5" height="3.5" rx="0.75" opacity="0.6" />
      <rect x="33" y="19.5" width="1.5" height="3.5" rx="0.75" opacity="0.6" />
    </svg>
  );
}

/* ── RFID tag SVG icon ───────────────────────────────────────── */
function RfidTagIcon({ active }: { active: boolean }) {
  const body   = active ? '#f59e0b' : '#cbd5e1';
  const stroke = active ? '#b45309' : '#94a3b8';
  const chip   = active ? '#78350f' : '#64748b';
  const text   = active ? '#451a03' : '#475569';
  return (
    <svg width="60" height="56" viewBox="0 0 60 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Hole / loop at top */}
      <rect x="23" y="1" width="14" height="8" rx="4" fill={chip} />
      {/* Tag body */}
      <rect x="2" y="7" width="56" height="47" rx="10" fill={body} stroke={stroke} strokeWidth="1.5" />
      {/* Chip block */}
      <rect x="20" y="13" width="20" height="12" rx="3" fill={chip} />
      {/* Chip contacts */}
      <rect x="16" y="16" width="4" height="2" rx="1" fill={chip} opacity="0.6" />
      <rect x="40" y="16" width="4" height="2" rx="1" fill={chip} opacity="0.6" />
      {/* Antenna lines */}
      <rect x="8"  y="16" width="6" height="1.5" rx="0.75" fill={stroke} opacity="0.5" />
      <rect x="46" y="16" width="6" height="1.5" rx="0.75" fill={stroke} opacity="0.5" />
      {/* ID NUMBER label */}
      <rect x="14" y="30" width="32" height="3" rx="1.5" fill={text} opacity="0.35" />
      {/* Dot rows simulating ID number */}
      <rect x="10" y="36" width="4" height="3" rx="1" fill={text} opacity="0.4" />
      <rect x="16" y="36" width="4" height="3" rx="1" fill={text} opacity="0.4" />
      <rect x="22" y="36" width="4" height="3" rx="1" fill={text} opacity="0.4" />
      <rect x="28" y="36" width="4" height="3" rx="1" fill={text} opacity="0.4" />
      <rect x="34" y="36" width="4" height="3" rx="1" fill={text} opacity="0.4" />
      <rect x="40" y="36" width="4" height="3" rx="1" fill={text} opacity="0.4" />
      <rect x="46" y="36" width="4" height="3" rx="1" fill={text} opacity="0.4" />
      <rect x="10" y="42" width="4" height="3" rx="1" fill={text} opacity="0.3" />
      <rect x="16" y="42" width="4" height="3" rx="1" fill={text} opacity="0.3" />
      <rect x="22" y="42" width="4" height="3" rx="1" fill={text} opacity="0.3" />
      <rect x="28" y="42" width="4" height="3" rx="1" fill={text} opacity="0.3" />
      <rect x="34" y="42" width="4" height="3" rx="1" fill={text} opacity="0.3" />
      <rect x="40" y="42" width="4" height="3" rx="1" fill={text} opacity="0.3" />
    </svg>
  );
}

/* ── Helpers ─────────────────────────────────────────────────── */
function randomReqCode() {
  const n = String(Math.floor(40000 + Math.random() * 9000)).padStart(5, '0');
  return `TAG-REQ-2026-${n}`;
}

const INIT: RequestDraft = { tagType: 'RFID', quantity: '', reason: '', farmId: '', location: '', address: '', contactPerson: '', phone: '', notes: '', latitude: null, longitude: null };

/* ── Step bar ────────────────────────────────────────────────── */
function StepBar({ step }: { step: number }) {
  return (
    <div className={s.stepBar}>
      {STEP_LABELS.map((label, i) => {
        const idx = i + 1;
        const active = idx === step, done = idx < step;
        return (
          <div key={label} className={s.stepBarItem}>
            <div className={`${s.stepDot}${active ? ' ' + s.stepDotActive : ''}${done ? ' ' + s.stepDotDone : ''}`}>
              {done ? <CheckCircle2 size={13} strokeWidth={2.5} /> : idx}
            </div>
            <div className={`${s.stepLabel}${active ? ' ' + s.stepLabelActive : ''}`}>{label}</div>
            {i < STEP_LABELS.length - 1 && (
              <div className={`${s.stepConnector}${done ? ' ' + s.stepConnectorDone : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Step 1 — Tag Details ────────────────────────────────────── */
function Step1({ draft, onChange }: { draft: RequestDraft; onChange: (d: Partial<RequestDraft>) => void }) {
  return (
    <div className={s.stepBody}>
      <div className={s.fieldGroup}>
        <label className={s.label}>Tag Type</label>
        <div className={s.typeGrid}>
          <button type="button"
            className={`${s.typeCard} ${s.typeCardOn}`}
            onClick={() => onChange({ tagType: 'RFID' })}>
            <RfidTagIcon active={true} />
            <div className={s.typeLabel}>RFID Tag</div>
            <div className={s.typeDesc}>Electronic tag with encoded chip for scanning</div>
          </button>
        </div>
      </div>
      <div className={s.fieldGroup}>
        <label className={s.label}>Quantity Requested <span className={s.req}>*</span></label>
        <input className={s.input} type="number" min="1" max="500"
          value={draft.quantity} onChange={e => onChange({ quantity: e.target.value })}
          placeholder="Enter number of tags (max 500 per request)" />
        <div className={s.hint}>Maximum 500 tags per request. For larger quantities, contact the regional office.</div>
      </div>
      <div className={s.fieldGroup}>
        <label className={s.label}>Reason <span className={s.req}>*</span></label>
        <textarea className={s.textarea} rows={3}
          value={draft.reason} onChange={e => onChange({ reason: e.target.value })}
          placeholder="Explain why you need these tags (e.g. new herd registration, seasonal calving, tag replacement after loss)…" />
      </div>
    </div>
  );
}


/* ── Step 3 — Contact ────────────────────────────────────────── */
function Step3({ draft, onChange }: { draft: RequestDraft; onChange: (d: Partial<RequestDraft>) => void }) {
  return (
    <div className={s.stepBody}>
      <div className={s.fieldGroup}>
        <label className={s.label}>Authorized Contact Person <span className={s.req}>*</span></label>
        <input className={s.input} value={draft.contactPerson} onChange={e => onChange({ contactPerson: e.target.value })} placeholder="Full name of person to receive the tags" />
        <div className={s.hint}>This person must present their ID when collecting the tags.</div>
      </div>
      <div className={s.fieldGroup}>
        <label className={s.label}>Additional Notes</label>
        <textarea className={s.textarea} rows={3} value={draft.notes} onChange={e => onChange({ notes: e.target.value })} placeholder="Any special instructions or additional information…" />
      </div>
    </div>
  );
}

/* ── Step 4 — Review ─────────────────────────────────────────── */
function Step4({ draft }: { draft: RequestDraft }) {
  const rows: [string, string][] = [
    ['Tag Type',        draft.tagType === 'RFID' ? 'RFID Tag' : 'Ear Tag'],
    ['Quantity',        `${draft.quantity} tags`],
    ['Reason',          draft.reason],
    ['Farm', draft.farmId],
    ['Location',        draft.location],
    ['Contact Person',  draft.contactPerson],
  ];
  if (draft.notes) rows.push(['Notes', draft.notes]);
  return (
    <div className={s.stepBody}>
      <div className={s.reviewCard}>
        {rows.map(([label, value]) => (
          <div key={label} className={s.reviewRow}>
            <div className={s.reviewLabel}>{label}</div>
            <div className={s.reviewValue}>{value}</div>
          </div>
        ))}
      </div>
      <div className={s.reviewNote}>
        <AlertCircle size={13} strokeWidth={2} />
        Your request will be reviewed by the regional authority within 1–3 working days.
      </div>
    </div>
  );
}

/* ── Success screen ──────────────────────────────────────────── */
function SuccessScreen({ reqCode, onNew, onClose }: { reqCode: string; onNew: () => void; onClose: () => void }) {
  return (
    <div className={s.successScreen}>
      <div className={s.successIcon}><CheckCircle size={48} strokeWidth={1.5} color="#16a34a" /></div>
      <div className={s.successTitle}>Request Submitted</div>
      <div className={s.successSub}>Your tag request has been received by the regional authority.</div>
      <div className={s.successCode}>{reqCode}</div>
      <div className={s.successCodeLabel}>Save this reference number</div>
      <div className={s.nextSteps}>
        {[
          { Icon: Clock,       text: 'Authority reviews your request (1–3 working days)' },
          { Icon: Package,     text: 'Tags allocated and prepared (RFID encoded if applicable)' },
          { Icon: Truck,       text: 'Tags dispatched or ready for collection' },
          { Icon: CheckCircle, text: 'Receive tags and apply to your animals' },
        ].map(({ Icon, text }, i) => (
          <div key={i} className={s.nextStep}>
            <div className={s.nextStepDot}><Icon size={13} strokeWidth={1.75} /></div>
            <div className={s.nextStepText}>{text}</div>
          </div>
        ))}
      </div>
      <div className={s.successActions}>
        <button className={s.newReqBtn} onClick={onNew}>Request More Tags</button>
        <button className={s.closeDoneBtn} onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

/* ── Premises map display ────────────────────────────────────── */
function PremisesMap({ lat, lon, address }: { lat: number | null; lon: number | null; address?: string }) {
  const hasCoords = lat !== null && lon !== null;
  const mapSrc = hasCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${lon! - 0.015},${lat! - 0.015},${lon! + 0.015},${lat! + 0.015}&layer=mapnik&marker=${lat},${lon}`
    : address?.trim()
    ? `https://www.openstreetmap.org/export/embed.html?query=${encodeURIComponent(address.trim() + ', Somalia')}&layer=mapnik`
    : null;

  if (!mapSrc) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <iframe title="Premises location" className={s.gpsMap} src={mapSrc} loading="lazy" />
      {hasCoords && (
        <span className={s.gpsCoords}>{lat!.toFixed(5)}, {lon!.toFixed(5)}</span>
      )}
    </div>
  );
}

/* ── Request modal ───────────────────────────────────────────── */
export function RequestModal({ onClose, onSuccess, premisesCode, premisesAddress, premisesRegionCode, premisesLat, premisesLon, premisesId }: {
  onClose: () => void;
  onSuccess?: () => void;
  premisesCode?: string;
  premisesAddress?: string;
  premisesRegionCode?: string;
  premisesLat?: number | null;
  premisesLon?: number | null;
  premisesId?: string;
}) {
  const { userId } = useAuthStore();
  const initLat = premisesLat ?? null;
  const initLon = premisesLon ?? null;
  const [draft, setDraft]   = useState<RequestDraft>({ ...INIT, farmId: premisesCode ?? '', location: premisesAddress ?? '', address: premisesAddress ?? '', latitude: initLat, longitude: initLon });
  const [submitted, setSub] = useState(false);
  const [reqCode, setCode]  = useState('');
  const [saving, setSaving]   = useState(false);
  const [saveErr, setSaveErr] = useState('');

  const update = (d: Partial<RequestDraft>) => setDraft(p => ({ ...p, ...d }));

  const qty = Number(draft.quantity);
  const canSubmit = [50, 100, 200, 250, 400, 500].includes(qty)
    && draft.reason.trim() !== ''
    && draft.farmId.trim() !== ''
    && draft.location.trim() !== ''
    && draft.contactPerson.trim() !== ''
    && draft.phone.trim() !== '';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || saving) return;
    setSaving(true);

    let trqCode: string | null = null;
    if (premisesRegionCode) {
      const { data: generatedCode } = await supabase
        .rpc('generate_tag_request_id', { p_region_code: premisesRegionCode });
      trqCode = generatedCode as string | null;
    }

    const insertRow: Record<string, unknown> = {
      premises_id:      premisesId,
      user_id:          userId,
      quantity:         qty,
      tag_type:         'RFID',
      reason:           draft.reason,
      contact_person:   draft.contactPerson,
      phone:            draft.phone,
      physical_address: draft.address,
      notes:            draft.notes || null,
      status:           'PENDING',
    };
    if (trqCode)              insertRow.request_code = trqCode;
    if (draft.latitude  !== null) insertRow.latitude  = draft.latitude;
    if (draft.longitude !== null) insertRow.longitude = draft.longitude;
    const { error } = await supabase.from('farmer_tag_requests').insert(insertRow);
    setSaving(false);
    if (error) {
      setSaveErr('Failed to submit. Please try again.');
    } else {
      setSaveErr('');
      setCode(trqCode ?? randomReqCode());
      setSub(true);
      onSuccess?.();
    }
  }
  function reset() { setDraft({ ...INIT, farmId: premisesCode ?? '', location: premisesAddress ?? '', address: premisesAddress ?? '', latitude: initLat, longitude: initLon }); setSub(false); setCode(''); }

  return (
    <div className={s.modalOverlay} onClick={onClose}>
      <div className={s.formModal} onClick={e => e.stopPropagation()}>
        <div className={s.modalHead}>
          <div>
            <div className={s.modalHeadTitle}><Tag size={15} strokeWidth={1.75} /> Request Tags</div>
            <div className={s.modalHeadSub}>Submit a tag request to the regional authority</div>
          </div>
          <button className={s.modalClose} onClick={onClose}><X size={16} /></button>
        </div>
        <div className={s.modalBody}>
          {submitted ? (
            <SuccessScreen reqCode={reqCode} onNew={reset} onClose={onClose} />
          ) : (
          <div>
            <form onSubmit={submit} className={s.rForm}>

              {/* Section 01 — Tag & Quantity */}
              <div className={s.rSec}>
                <div className={s.rSecHead}>
                  <span className={s.rBadge}>01</span>
                  <div>
                    <div className={s.rSecTitle}>Tag &amp; Quantity</div>
                    <div className={s.rSecSub}>RFID electronic tags with encoded chip for scanning</div>
                  </div>
                  <div className={s.rfidMini}><RfidTagIcon active={true} /></div>
                </div>
                <label className={s.rLbl}>Number of Tags <span className={s.req}>*</span></label>
                <div className={s.rQtyGrid}>
                  {[50, 100, 200, 250, 400, 500].map(n => (
                    <button key={n} type="button"
                      className={`${s.rQtyBtn}${draft.quantity === String(n) ? ' ' + s.rQtyBtnOn : ''}`}
                      onClick={() => update({ quantity: String(n) })}>
                      {n}
                    </button>
                  ))}
                </div>
                <span className={s.rHint}>Select the number of tags needed. For quantities above 500 contact the regional office.</span>
              </div>

              {/* Section 02 — Reason */}
              <div className={s.rSec}>
                <div className={s.rSecHead}>
                  <span className={s.rBadge}>02</span>
                  <div>
                    <div className={s.rSecTitle}>Reason</div>
                    <div className={s.rSecSub}>Explain why you need these tags in detail</div>
                  </div>
                </div>
                <textarea className={s.rTextarea} rows={3}
                  value={draft.reason} onChange={e => update({ reason: e.target.value })} />
              </div>

              {/* Section 03 — Farm & Contact */}
              <div className={s.rSec}>
                <div className={s.rSecHead}>
                  <span className={s.rBadge}>03</span>
                  <div>
                    <div className={s.rSecTitle}>Farm &amp; Contact</div>
                    <div className={s.rSecSub}>Details of the farm and person receiving the tags</div>
                  </div>
                </div>
                <div className={s.rGrid2}>
                  <div>
                    <label className={s.rLbl}><MapPin size={12} strokeWidth={2} /> Farm ID <span className={s.req}>*</span></label>
                    <input className={s.rInp} value={draft.farmId} onChange={e => update({ farmId: e.target.value })} />
                  </div>
                  <div>
                    <label className={s.rLbl}><MapPin size={12} strokeWidth={2} /> Location / District <span className={s.req}>*</span></label>
                    <input className={s.rInp} value={draft.location} onChange={e => update({ location: e.target.value })} />
                  </div>
                  <div>
                    <label className={s.rLbl}><User size={12} strokeWidth={2} /> Authorized Contact Person <span className={s.req}>*</span></label>
                    <input className={s.rInp} value={draft.contactPerson} onChange={e => update({ contactPerson: e.target.value })} />
                    <span className={s.rHint}>Must present ID when collecting tags.</span>
                  </div>
                  <div>
                    <label className={s.rLbl}><Phone size={12} strokeWidth={2} /> Phone Number <span className={s.req}>*</span></label>
                    <input className={s.rInp} type="tel" value={draft.phone} onChange={e => update({ phone: e.target.value })} placeholder="+252 6xx xxx xxx" />
                  </div>
                  <div className={s.rGridFull}>
                    <label className={s.rLbl}><MapPin size={12} strokeWidth={2} /> Physical Address</label>
                    <input className={s.rInp} value={draft.address} onChange={e => update({ address: e.target.value })} />
                  </div>
                  <div className={s.rGridFull}>
                    <label className={s.rLbl}><MapPin size={12} strokeWidth={2} /> Farm Location</label>
                    <PremisesMap lat={draft.latitude} lon={draft.longitude} address={draft.address} />
                  </div>
                  <div className={s.rGridFull}>
                    <label className={s.rLbl}><StickyNote size={12} strokeWidth={2} /> Additional Notes</label>
                    <textarea className={s.rTextarea} rows={3} value={draft.notes} onChange={e => update({ notes: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className={s.rFooter}>
                <div className={s.rFooterNote}>
                  <AlertCircle size={13} strokeWidth={2} color="#d97706" />
                  {saveErr
                    ? <span style={{ color: '#dc2626' }}>{saveErr}</span>
                    : 'Reviewed by the regional authority within 1–3 working days.'}
                </div>
                <button type="submit" className={s.rSubmitBtn} disabled={!canSubmit || saving}>
                  {saving ? 'Submitting…' : <><span>Submit Request</span> <ArrowRight size={14} /></>}
                </button>
              </div>

            </form>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────── */
export function TagRequestPage(): JSX.Element {
  const [showModal, setShowModal] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  return (
    <div className={s.tagPage}>

      {/* Top bar */}
      <div className={s.tagTopBar}>
        <div>
          <div className={s.tagPageTitle}>Tag Management</div>
          <div className={s.tagPageSub}>Request tags from the Ministry and track your requests</div>
        </div>
        <button className={s.openModalBtn} onClick={() => setShowModal(true)}>
          <Plus size={14} strokeWidth={2.5} /> Request Tags
        </button>
      </div>

      {/* Two-column layout */}
      <div className={s.mainGrid} ref={listRef}>

        {/* Left: My Tag Requests */}
        <div className={s.card}>
          <div className={s.cardHeader}>
            <div>
              <div className={s.cardTitle}>My Tag Requests</div>
              <div className={s.cardSub}>Track the status of your requests</div>
            </div>
            <span className={s.cardBadge}>{MOCK_REQUESTS.length}</span>
          </div>
          <div className={s.reqList}>
            {MOCK_REQUESTS.map(r => {
              const st = STATUS_STYLE[r.status];
              return (
                <div key={r.reqCode} className={s.reqItem}>
                  <div className={s.reqTop}>
                    <span className={s.reqCode}>{r.reqCode}</span>
                    <span className={s.reqBadge} style={{ background: st.bg, color: st.color }}>{st.label}</span>
                  </div>
                  <div className={s.reqMeta}>
                    <span>{r.tagType === 'RFID' ? 'RFID' : 'Ear Tag'}</span>
                    <span>·</span>
                    <span>{r.quantity} tags</span>
                  </div>
                  {r.allocated !== '—' && (
                    <div className={s.reqAllocated}>
                      <Tag size={11} strokeWidth={2} /> Allocated: {r.allocated}
                    </div>
                  )}
                  <div className={s.reqDate}>{r.date}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: How it works + Important Notes */}
        <div className={s.rightStack}>
          <div className={s.card}>
            <div className={s.cardHeader}>
              <div>
                <div className={s.cardTitle}>How Tag Requests Work</div>
                <div className={s.cardSub}>From request to application — step by step</div>
              </div>
            </div>
            <div className={s.howList}>
              {HOW_STEPS.map(step => (
                <div key={step.num} className={s.howStep}>
                  <div className={s.howNum}>{step.num}</div>
                  <div className={s.howBody}>
                    <div className={s.howTitle}>{step.title}</div>
                    <div className={s.howDesc}>{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={s.card}>
            <div className={s.cardHeader}>
              <div className={s.cardTitle}>Important Notes</div>
            </div>
            <div className={s.noteList}>
              {IMPORTANT_NOTES.map((note, i) => (
                <div key={i} className={s.noteItem}>
                  <span className={s.noteDot} />
                  {note}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && <RequestModal onClose={() => setShowModal(false)} />}

    </div>
  );
}

export default TagRequestPage;
