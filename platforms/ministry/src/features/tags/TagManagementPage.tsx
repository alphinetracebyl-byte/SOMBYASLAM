import { useState, useEffect, useMemo } from 'react';
import {
  Tag, CheckCircle, X, Search, ChevronDown,
  Package, Truck, AlertCircle, Printer, Radio, RefreshCw, MapPin, Mail, Pencil,
} from 'lucide-react';
import { getDeliverySettings } from '../settings/settings.supabase';
import { supabase } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';
import s from './tags.module.css';

/* ── Types ───────────────────────────────────────────────────── */
type TagType   = 'RFID' | 'EAR_TAG';
type ReqStatus = 'PENDING' | 'FIELD_APPROVED' | 'APPROVED' | 'ALLOCATED' | 'ISSUED' | 'IN_TRANSIT' | 'WITH_FARMER' | 'DELIVERED' | 'REJECTED';
type ActionKind = 'approve' | 'reject' | 'allocate' | 'issue' | 'collect' | 'dispatch' | null;

interface BoxRange { start: string; end: string; qty: number; }

interface TagRequest {
  id:           string;
  reqCode:      string;
  tagType:      TagType;
  quantity:     number;
  reason?:      string;
  farmerName:   string;
  farmId:       string;
  region:       string;
  contact:      string;
  phone?:       string;
  address?:     string;
  latitude?:    number;
  longitude?:   number;
  status:       ReqStatus;
  requestedAt:  string;
  processedAt?: string;
  notes?:       string;
  allocatedRange?: string;
  tagRanges?:   BoxRange[];
  waybillNo?:   string;
}

function parseTagRanges(notes: string | undefined, quantity: number): BoxRange[] | null {
  if (!notes) return null;
  const match = notes.match(/TAG_SERIALS:([\d|]+)/);
  if (!match) return null;
  const numBoxes = Math.ceil(quantity / TAGS_PER_BOX);
  const firsts = match[1].split('|');
  const ranges: BoxRange[] = [];
  for (let i = 0; i < numBoxes; i++) {
    const n = parseInt(firsts[i] ?? '');
    if (!n || n <= 0) return null;
    const qty = i === numBoxes - 1 ? quantity - i * TAGS_PER_BOX : TAGS_PER_BOX;
    ranges.push({ start: String(n).padStart(6, '0'), end: String(n + qty - 1).padStart(6, '0'), qty });
  }
  return ranges;
}

/* ── Static config ───────────────────────────────────────────── */
const STATUS_STYLE: Record<ReqStatus, { bg: string; color: string; label: string }> = {
  PENDING:        { bg: '#fefce8', color: '#a16207', label: 'Pending'           },
  FIELD_APPROVED: { bg: '#f0fdf4', color: '#0f7b4d', label: 'Regional Approved' },
  APPROVED:       { bg: '#eff6ff', color: '#1d4ed8', label: 'Ministry Approved' },
  ALLOCATED:      { bg: '#f0f9ff', color: '#0369a1', label: 'Assigned'          },
  ISSUED:         { bg: '#fdf4ff', color: '#9333ea', label: 'Issued'            },
  IN_TRANSIT:     { bg: '#fefce8', color: '#d97706', label: 'In Transit'        },
  WITH_FARMER:    { bg: '#f0fdf4', color: '#16a34a', label: 'With Farmer'       },
  DELIVERED:      { bg: '#f0fdf4', color: '#16a34a', label: 'Delivered'         },
  REJECTED:       { bg: '#fef2f2', color: '#dc2626', label: 'Rejected'          },
};


const STATUS_FILTERS: Array<{ key: ReqStatus | 'ALL'; label: string }> = [
  { key: 'ALL',            label: 'All'              },
  { key: 'PENDING',        label: 'Pending'          },
  { key: 'FIELD_APPROVED', label: 'Regional Approved'},
  { key: 'APPROVED',       label: 'Ministry Approved'},
  { key: 'ALLOCATED',      label: 'Assigned'         },
  { key: 'ISSUED',         label: 'Issued'           },
  { key: 'IN_TRANSIT',     label: 'In Transit'       },
  { key: 'WITH_FARMER',    label: 'With Farmer'      },
  { key: 'DELIVERED',      label: 'Delivered'        },
  { key: 'REJECTED',       label: 'Rejected'         },
];

const ACTIVE_STATUSES: ReqStatus[] = ['PENDING', 'FIELD_APPROVED', 'APPROVED', 'ALLOCATED', 'ISSUED', 'IN_TRANSIT'];
const HISTORY_STATUSES: ReqStatus[] = ['WITH_FARMER', 'DELIVERED', 'REJECTED'];

const REGIONS = ['All', 'Mogadishu', 'Bay', 'Bakool', 'Jubbaland', 'Puntland', 'Somaliland'];

/* ── Box calculation ─────────────────────────────────────────── */
const TAGS_PER_BOX = 50;

interface Box { boxNum: number; start: number; end: number; qty: number; startLabel: string; endLabel: string; }

function calcBoxes(quantity: number, firstSerial: number): Box[] {
  const count = Math.ceil(quantity / TAGS_PER_BOX);
  return Array.from({ length: count }, (_, i) => {
    const start = firstSerial + i * TAGS_PER_BOX;
    const end   = Math.min(start + TAGS_PER_BOX - 1, firstSerial + quantity - 1);
    return {
      boxNum:     i + 1,
      start, end,
      qty:        end - start + 1,
      startLabel: String(start).padStart(6, '0'),
      endLabel:   String(end).padStart(6, '0'),
    };
  });
}

function buildPrintableLabels(req: TagRequest, boxes: Box[]): string {
  const labels = boxes.map(b => `
    <div style="border:2px solid #000;padding:1.5rem;margin-bottom:1rem;page-break-inside:avoid;font-family:sans-serif;max-width:380px;">
      <div style="text-align:center;font-size:0.65rem;font-weight:700;letter-spacing:.12em;color:#555;margin-bottom:.75rem;">QXLITS — LIVESTOCK TAG DELIVERY LABEL</div>
      <div style="font-size:1.5rem;font-weight:800;text-align:center;margin-bottom:.375rem;">Box ${b.boxNum} <span style="font-size:1rem;font-weight:500;color:#555;">of ${boxes.length}</span></div>
      <hr style="border:1px solid #000;margin:.625rem 0;"/>
      <table style="width:100%;font-size:.8125rem;border-collapse:collapse;">
        <tr><td style="color:#555;padding:.2rem 0;width:80px;">Request:</td><td style="font-weight:700;font-family:monospace;">${req.reqCode}</td></tr>
        <tr><td style="color:#555;padding:.2rem 0;">Farm ID:</td><td style="font-weight:700;">${req.farmId}</td></tr>
        <tr><td style="color:#555;padding:.2rem 0;">Contact:</td><td style="font-weight:700;">${req.farmerName}</td></tr>
        <tr><td style="color:#555;padding:.2rem 0;">Region:</td><td style="font-weight:700;">${req.region}</td></tr>
        ${req.address ? `<tr><td style="color:#555;padding:.2rem 0;">Address:</td><td>${req.address}</td></tr>` : ''}
      </table>
      <hr style="border:1px solid #000;margin:.625rem 0;"/>
      <div style="text-align:center;">
        <div style="font-size:.6875rem;color:#555;letter-spacing:.08em;margin-bottom:.375rem;">TAG SERIAL RANGE</div>
        <div style="font-size:1.125rem;font-weight:800;font-family:monospace;">${b.startLabel}</div>
        <div style="font-size:.75rem;color:#555;">to</div>
        <div style="font-size:1.125rem;font-weight:800;font-family:monospace;">${b.endLabel}</div>
        <div style="margin-top:.5rem;font-size:.875rem;font-weight:600;color:#333;">${b.qty} RFID Tags</div>
      </div>
      <hr style="border:1px solid #000;margin:.625rem 0;"/>
      <div style="font-size:.6875rem;color:#555;text-align:center;">Date: ${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</div>
    </div>`).join('');
  return `<!DOCTYPE html><html><head><title>Labels — ${req.reqCode}</title>
    <style>@media print{body{margin:0;}}body{background:#fff;padding:1rem;}</style>
    </head><body>${labels}</body></html>`;
}

function buildAssignmentEmail(req: TagRequest, boxes: Box[], deliveryEmail: string): string {
  const range = `${boxes[0].startLabel} → ${boxes[boxes.length-1].endLabel}`;
  const boxLines = boxes.map(b => `  Box ${b.boxNum}: ${b.startLabel} → ${b.endLabel} (${b.qty} tags)`).join('\n');
  const lat = req.latitude; const lon = req.longitude;
  const mapLink = lat != null && lon != null
    ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}`
    : req.address ? `${req.address}, ${req.region}, Somalia` : 'See request details';
  const subject = encodeURIComponent(`Tag Delivery Assignment — ${req.reqCode}`);
  const body = encodeURIComponent(
`Tag Delivery Assignment — QXLITS

REQUEST CODE: ${req.reqCode}
FARMER / CONTACT: ${req.farmerName}
FARM ID: ${req.farmId}
REGION: ${req.region}
PHONE: ${req.phone ?? 'N/A'}
ADDRESS: ${req.address ?? req.region + ', Somalia'}

TOTAL QUANTITY: ${req.quantity} RFID tags
TOTAL BOXES: ${boxes.length}
TAG RANGE: ${range}

BOX BREAKDOWN:
${boxLines}

DELIVERY LOCATION:
${mapLink}

Please confirm receipt and provide estimated delivery date.

QXLITS — Ministry of Livestock`);
  return `mailto:${deliveryEmail}?subject=${subject}&body=${body}`;
}

/* ── DB helpers ──────────────────────────────────────────────── */
async function updateStatus(id: string, status: ReqStatus, notes?: string) {
  const patch: Record<string, unknown> = { status, processed_at: new Date().toISOString() };
  if (notes) patch.notes = notes;
  return supabase.from('farmer_tag_requests').update(patch).eq('id', id);
}

/* ── Action forms ────────────────────────────────────────────── */
function ApproveForm({ req, onSuccess }: { req: TagRequest; onSuccess: (msg: string) => void }) {
  const [notes, setNotes] = useState('');
  const [busy, setBusy]   = useState(false);

  async function handle() {
    setBusy(true);
    await updateStatus(req.id, 'APPROVED', notes || undefined);
    setBusy(false);
    void logActivity({
      category:      'TAGGING',
      level:         'SUCCESS',
      title:         'Tag request approved',
      detail:        `${req.quantity} RFID tags approved for ${req.farmerName}`,
      actorRole:     'Ministry Officer',
      referenceCode: req.farmId,
    });
    onSuccess('Request approved. Farmer will be notified.');
  }

  return (
    <div className={s.actionForm}>
      <div className={s.actionTitle}>Approve Tag Request</div>
      <div className={s.infoRow}><span>Farmer:</span>   <strong>{req.farmerName}</strong></div>
      <div className={s.infoRow}><span>Farm ID:</span>  <strong>{req.farmId}</strong></div>
      <div className={s.infoRow}><span>Quantity:</span> <strong>{req.quantity} × RFID</strong></div>
      <div className={s.field}>
        <label className={s.label}>Approval Notes</label>
        <textarea className={s.textarea} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional instructions for the tag preparation team" />
      </div>
      <div className={s.formBtns}>
        <button className={s.approveBtn} disabled={busy} onClick={handle}>
          <CheckCircle size={13} /> {busy ? 'Approving…' : 'Approve Request'}
        </button>
      </div>
    </div>
  );
}

function RejectForm({ req, onSuccess }: { req: TagRequest; onSuccess: (msg: string) => void }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy]     = useState(false);

  async function handle() {
    if (!reason.trim()) return;
    setBusy(true);
    await updateStatus(req.id, 'REJECTED', reason);
    setBusy(false);
    void logActivity({
      category:      'TAGGING',
      level:         'WARNING',
      title:         'Tag request rejected',
      detail:        `${req.quantity} RFID tags rejected for ${req.farmerName} — ${reason}`,
      actorRole:     'Ministry Officer',
      referenceCode: req.farmId,
    });
    onSuccess('Request rejected. Farmer notified with reason.');
  }

  return (
    <div className={s.actionForm}>
      <div className={s.actionTitle}>Reject Request</div>
      <div className={s.field}>
        <label className={s.label}>Rejection Reason <span className={s.req}>*</span></label>
        <textarea className={s.textarea} rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Explain why this request is being rejected (farmer will be notified)" />
      </div>
      <button className={s.rejectBtn} disabled={!reason.trim() || busy} onClick={handle}>
        <X size={13} /> {busy ? 'Rejecting…' : 'Reject Request'}
      </button>
    </div>
  );
}

/* ── Cardboard box SVG ───────────────────────────────────────── */
function BoxGraphic({ boxNum, numBoxes, qty, filled }: {
  boxNum: number; numBoxes: number; qty: number; filled: boolean;
}) {
  const bc = filled ? '#b87222' : '#c97f2a';
  const sc = filled ? '#7a4410' : '#8f5a1a';
  const tc = filled ? '#cc9030' : '#dea040';
  const fc = filled ? '#c88828' : '#d49030';
  return (
    <svg viewBox="0 0 160 142" width="80" height="71" style={{ display: 'block', margin: '0 auto' }}>
      <ellipse cx="62" cy="139" rx="56" ry="5" fill="rgba(0,0,0,0.12)" />
      <polygon points="110,50 144,36 144,120 110,134" fill={sc} />
      <rect x="10" y="50" width="100" height="84" rx="1" fill={bc} />
      <polygon points="10,50 44,36 144,36 110,50" fill={tc} />
      <polygon points="10,50 110,50 110,20 10,20" fill="#2e1505" opacity="0.8" />
      <polygon points="10,50 60,50 60,14 10,18" fill={tc} />
      <polygon points="60,50 110,50 110,14 60,14" fill={fc} />
      <line x1="60" y1="14" x2="60" y2="50" stroke="rgba(0,0,0,0.18)" strokeWidth="1.5" />
      <line x1="10" y1="50" x2="10" y2="134" stroke="rgba(0,0,0,0.12)" strokeWidth="1" />
      <line x1="110" y1="50" x2="110" y2="134" stroke="rgba(0,0,0,0.12)" strokeWidth="1" />
      <text x="60" y="88" textAnchor="middle" fill="white" fontSize="26" fontWeight="800" fontFamily="sans-serif">Box {boxNum}</text>
      <text x="60" y="110" textAnchor="middle" fill="rgba(255,255,255,0.65)" fontSize="18" fontFamily="sans-serif">{qty} tags</text>
    </svg>
  );
}

function PrepareTagsForm({ req, onSuccess }: { req: TagRequest; onSuccess: (msg: string) => void }) {
  const numBoxes = Math.ceil(req.quantity / TAGS_PER_BOX);
  const [firstSerials, setFirstSerials] = useState<string[]>(() => Array(numBoxes).fill(''));
  const [busy, setBusy]                 = useState(false);
  const [assigned, setAssigned]         = useState(false);
  const [assignedBoxes, setAssignedBoxes] = useState<Box[]>([]);
  const [assignError, setAssignError]   = useState<string | null>(null);

  const deliveryEmail = getDeliverySettings().email ?? '';

  function tagsInBox(i: number) {
    return i === numBoxes - 1 ? req.quantity - i * TAGS_PER_BOX : TAGS_PER_BOX;
  }

  function buildBox(i: number): Box | null {
    const start = parseInt(firstSerials[i].replace(/\D/g, ''));
    if (!start || start <= 0) return null;
    const qty = tagsInBox(i);
    const end = start + qty - 1;
    return {
      boxNum:     i + 1,
      start, end, qty,
      startLabel: String(start).padStart(6, '0'),
      endLabel:   String(end).padStart(6, '0'),
    };
  }

  const preview   = Array.from({ length: numBoxes }, (_, i) => buildBox(i));
  const allReady  = preview.every(b => b !== null);
  const readyBoxes = preview.filter(Boolean) as Box[];

  const allocatedRange = allReady
    ? readyBoxes.map(b => `${b.startLabel}→${b.endLabel}`).join(', ')
    : '';

  function updateSerial(i: number, val: string) {
    setFirstSerials(prev => { const next = [...prev]; next[i] = val.replace(/\D/g, ''); return next; });
  }

  async function handleAssign() {
    if (!allReady || busy) return;
    setBusy(true);
    setAssignError(null);
    const baseNotes = (req.notes ?? '').replace(/\s*TAG_SERIALS:[\d|]+/, '').trim();
    const newNotes  = [baseNotes, `TAG_SERIALS:${firstSerials.join('|')}`].filter(Boolean).join(' ');
    const { error } = await supabase.from('farmer_tag_requests').update({
      status:       'ALLOCATED',
      processed_at: new Date().toISOString(),
      notes:        newNotes,
    }).eq('id', req.id);
    setBusy(false);
    if (error) { setAssignError(error.message); return; }
    setAssignedBoxes(readyBoxes);
    setAssigned(true);
    void logActivity({
      category:      'TAGGING',
      level:         'INFO',
      title:         'Tags allocated to farmer',
      detail:        `${req.quantity} RFID tags (${numBoxes} boxes) allocated for ${req.farmerName} — range: ${allocatedRange}`,
      actorRole:     'Ministry Officer',
      referenceCode: req.farmId,
    });
    if (deliveryEmail) {
      const link = buildAssignmentEmail({ ...req, allocatedRange }, readyBoxes, deliveryEmail);
      window.open(link);
    }
    onSuccess(`${numBoxes} boxes assigned. Status → Assigned. Click "Prepare for Delivery" to continue.`);
  }

  function printLabels() {
    const b = assignedBoxes.length ? assignedBoxes : readyBoxes;
    if (!b.length) return;
    const win = window.open('', '_blank', 'width=820,height=640');
    if (!win) return;
    win.document.write(buildPrintableLabels(req, b));
    win.document.close();
    win.print();
  }

  return (
    <div className={s.actionForm}>
      <div className={s.actionTitle}><Package size={13} /> Prepare Tags</div>
      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem' }}>
        {numBoxes} {numBoxes === 1 ? 'box' : 'boxes'} — enter the first serial on each physical box
      </div>

      <div className={s.boxGrid}>
        {Array.from({ length: numBoxes }, (_, i) => {
          const box = buildBox(i);
          return (
            <div key={i} className={s.boxCardWrap}>
              <BoxGraphic
                boxNum={i + 1}
                numBoxes={numBoxes}
                qty={tagsInBox(i)}
                filled={box !== null}
              />
              <div className={s.boxCardBody}>
                <input
                  className={s.input}
                  value={firstSerials[i]}
                  onChange={e => updateSerial(i, e.target.value)}
                  placeholder="First serial on this box"
                  style={{ fontFamily: 'monospace' }}
                />
                {box
                  ? <div className={s.boxRangeText}>{box.startLabel} → {box.endLabel}</div>
                  : <div className={s.boxRangePlaceholder}>— enter serial to see range —</div>
                }
              </div>
            </div>
          );
        })}
      </div>

      <div className={s.formBtns} style={{ flexWrap: 'wrap' }}>
        <button className={s.assignBtn} disabled={!allReady || busy} onClick={handleAssign}>
          <Package size={13} /> {busy ? 'Saving…' : 'Assign & Email Delivery'}
        </button>
        {(assigned || allReady) && (
          <button className={s.printBtn} onClick={printLabels}>
            <Printer size={13} /> Print Labels
          </button>
        )}
      </div>

      {assignError && (
        <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.5rem' }}>
          Error: {assignError}
        </div>
      )}
      {assigned && !deliveryEmail && (
        <div style={{ fontSize: '0.75rem', color: '#d97706', marginTop: '0.5rem' }}>
          No delivery email configured — go to Settings to add one.
        </div>
      )}
    </div>
  );
}

/* ── Prepare for Delivery button (ALLOCATED → ISSUED) ────────── */
function PrepareForDeliveryBtn({ req, onSuccess }: { req: TagRequest; onSuccess: (msg: string) => void }) {
  const [busy, setBusy] = useState(false);

  async function handle() {
    setBusy(true);
    const { error } = await supabase.from('farmer_tag_requests').update({
      status:       'ISSUED',
      processed_at: new Date().toISOString(),
    }).eq('id', req.id);
    setBusy(false);
    if (error) return;
    void logActivity({
      category:      'TAGGING',
      level:         'INFO',
      title:         'Tags prepared for delivery',
      detail:        `${req.quantity} tags packaged for field dispatch — ${req.farmerName}`,
      actorRole:     'Ministry Officer',
      referenceCode: req.farmId,
    });
    onSuccess('Tags marked ready for delivery. Field officer can now dispatch.');
  }

  return (
    <div className={s.actionBtns}>
      <button className={s.actionBtn} disabled={busy} onClick={() => void handle()}>
        <Truck size={13} /> {busy ? 'Updating…' : 'Prepare for Delivery'}
      </button>
    </div>
  );
}

/* ── RFID ear-tag SVG icon ───────────────────────────────────── */
function TagIcon({ size = 28 }: { size?: number }) {
  const h = Math.round(size * 46 / 56);
  return (
    <svg viewBox="0 0 56 46" width={size} height={h} style={{ display: 'block', flexShrink: 0 }}>
      {/* Drop shadow */}
      <rect x="5" y="8" width="48" height="36" rx="7" fill="#b8860b" opacity="0.25" />
      {/* Body */}
      <rect x="3" y="4" width="48" height="36" rx="7" fill="#f5c428" />
      {/* Top sheen */}
      <rect x="3" y="4" width="48" height="13" rx="7" fill="rgba(255,255,255,0.22)" />
      {/* Punch hole */}
      <circle cx="10" cy="9" r="4.5" fill="#d4a017" />
      <circle cx="10" cy="9" r="2.5" fill="#5c3d00" />
      {/* "SO NUMBER" label */}
      <text x="31" y="19" textAnchor="middle" fontSize="5.5" fontWeight="700"
        fill="#7a5000" letterSpacing="1" fontFamily="sans-serif">SO NUMBER</text>
      {/* Serial line */}
      <text x="31" y="31" textAnchor="middle" fontSize="8.5" fontWeight="800"
        fill="#3d2500" fontFamily="monospace" letterSpacing="0.2">9007001102</text>
      {/* RFID waves */}
      <path d="M46 17 Q50.5 22 46 27" stroke="#7a5000" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      <path d="M49 13.5 Q56 22 49 30.5" stroke="#7a5000" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.55"/>
    </svg>
  );
}

/* ── Tag number table modal (click a box) ────────────────────── */
function TagTableModal({ range, boxNum, onClose }: { range: BoxRange; boxNum: number; onClose: () => void }) {
  const startN = parseInt(range.start);
  const tags   = Array.from({ length: range.qty }, (_, i) => String(startN + i).padStart(6, '0'));
  return (
    <div className={s.modalOverlay} style={{ zIndex: 1200 }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={s.tagNumModal}>
        <div className={s.tagNumModalHeader}>
          <div>
            <span className={s.tagNumModalTitle}>Box {boxNum}</span>
            <span className={s.tagNumModalRange}>{range.start} → {range.end}</span>
          </div>
          <button className={s.closeBtn} onClick={onClose}><X size={16} /></button>
        </div>
        <div className={s.tagNumGrid}>
          {tags.map(t => <span key={t} className={s.tagNum}>{t}</span>)}
        </div>
      </div>
    </div>
  );
}

/* ── Assigned boxes + tags summary ──────────────────────────── */
function AssignedBoxSummary({ quantity, tagRanges, onEdit }: {
  quantity: number; tagRanges?: BoxRange[]; onEdit?: () => void;
}) {
  const numBoxes = Math.ceil(quantity / TAGS_PER_BOX);
  const [viewBox, setViewBox] = useState<number | null>(null);
  return (
    <div className={s.actionForm}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        <div className={s.actionTitle} style={{ color: '#0f7b4d', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <TagIcon size={20} /> {numBoxes} {numBoxes === 1 ? 'Box' : 'Boxes'} · {quantity} Tags Assigned
        </div>
        {onEdit && (
          <button className={s.editTagsBtn} onClick={onEdit}>
            <Pencil size={11} /> Edit
          </button>
        )}
      </div>
      <div className={s.boxGrid}>
        {Array.from({ length: numBoxes }, (_, i) => {
          const qty   = i === numBoxes - 1 ? quantity - i * TAGS_PER_BOX : TAGS_PER_BOX;
          const range = tagRanges?.[i];
          return (
            <div
              key={i}
              className={`${s.boxCardWrap} ${range ? s.boxCardClickable : ''}`}
              onClick={() => range && setViewBox(i)}
            >
              <BoxGraphic boxNum={i + 1} numBoxes={numBoxes} qty={qty} filled />
              <div className={s.boxCardBody}>
                {range ? (
                  <>
                    <div className={s.boxRangeIconRow}>
                      <TagIcon size={13} />
                      <span className={s.boxRangeBigStart}>{range.start}</span>
                    </div>
                    <div className={s.boxRangeBigEnd}>→ {range.end}</div>
                    <div className={s.boxRangeHint}>{qty} tags · click to view</div>
                  </>
                ) : (
                  <span className={s.boxRangePlaceholder}>{qty} tags</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {viewBox !== null && tagRanges?.[viewBox] && (
        <TagTableModal range={tagRanges[viewBox]} boxNum={viewBox + 1} onClose={() => setViewBox(null)} />
      )}
    </div>
  );
}

function buildGenericLabels(req: TagRequest): string {
  const numBoxes = Math.ceil(req.quantity / TAGS_PER_BOX);
  const labels = Array.from({ length: numBoxes }, (_, i) => {
    const qty   = i === numBoxes - 1 ? req.quantity - i * TAGS_PER_BOX : TAGS_PER_BOX;
    const range = req.tagRanges?.[i];
    const rangeSection = range
      ? `<div style="margin:.625rem 0;padding:.625rem;background:#f0fdf4;border:1.5px solid #86efac;border-radius:6px;text-align:center;">
           <div style="font-size:.625rem;font-weight:700;letter-spacing:.1em;color:#15803d;margin-bottom:.375rem;">TAG SERIAL RANGE</div>
           <div style="font-size:1.125rem;font-weight:800;font-family:monospace;color:#166534;">${range.start} → ${range.end}</div>
           <div style="font-size:.75rem;color:#166534;margin-top:.25rem;">${range.qty} RFID Tags</div>
         </div>`
      : `<div style="margin:.625rem 0;padding:.5rem;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;text-align:center;">
           <div style="font-size:.75rem;color:#64748b;">${qty} RFID Tags — serial range not assigned</div>
         </div>`;
    return `
    <div style="border:2px solid #000;padding:1.5rem;margin-bottom:1rem;page-break-inside:avoid;font-family:sans-serif;max-width:380px;">
      <div style="text-align:center;font-size:0.65rem;font-weight:700;letter-spacing:.12em;color:#555;margin-bottom:.75rem;">QXLITS — LIVESTOCK TAG DELIVERY LABEL</div>
      <div style="font-size:1.5rem;font-weight:800;text-align:center;margin-bottom:.375rem;">Box ${i + 1} <span style="font-size:1rem;font-weight:500;color:#555;">of ${numBoxes}</span></div>
      <hr style="border:1px solid #000;margin:.625rem 0;"/>
      <table style="width:100%;font-size:.8125rem;border-collapse:collapse;">
        <tr><td style="color:#555;padding:.2rem 0;width:80px;">Request:</td><td style="font-weight:700;font-family:monospace;">${req.reqCode}</td></tr>
        <tr><td style="color:#555;padding:.2rem 0;">Farm ID:</td><td style="font-weight:700;">${req.farmId}</td></tr>
        <tr><td style="color:#555;padding:.2rem 0;">Contact:</td><td style="font-weight:700;">${req.farmerName}</td></tr>
        <tr><td style="color:#555;padding:.2rem 0;">Region:</td><td style="font-weight:700;">${req.region}</td></tr>
        ${req.phone   ? `<tr><td style="color:#555;padding:.2rem 0;">Phone:</td><td>${req.phone}</td></tr>`     : ''}
        ${req.address ? `<tr><td style="color:#555;padding:.2rem 0;">Address:</td><td>${req.address}</td></tr>` : ''}
      </table>
      ${rangeSection}
      <hr style="border:1px solid #000;margin:.625rem 0;"/>
      <div style="font-size:.6875rem;color:#555;text-align:center;">Date: ${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</div>
    </div>`;
  }).join('');
  return `<!DOCTYPE html><html><head><title>Labels — ${req.reqCode}</title>
    <style>@media print{body{margin:0;}}body{background:#fff;padding:1rem;}</style>
    </head><body>${labels}</body></html>`;
}

function openPrintWindow(req: TagRequest) {
  const win = window.open('', '_blank', 'width=820,height=640');
  if (!win) return;
  win.document.write(buildGenericLabels(req));
  win.document.close();
  win.print();
}

function TagNumbersManager({ req, onSuccess }: { req: TagRequest; onSuccess: (msg: string) => void }) {
  const numBoxes = Math.ceil(req.quantity / TAGS_PER_BOX);

  function parseSerials(): string[] {
    if (!req.notes) return Array(numBoxes).fill('');
    const match = req.notes.match(/TAG_SERIALS:([\d|]+)/);
    if (!match) return Array(numBoxes).fill('');
    const parts = match[1].split('|');
    return Array(numBoxes).fill('').map((_, i) => parts[i] ?? '');
  }

  const [serials, setSerials] = useState<string[]>(parseSerials);
  const [busy, setBusy]       = useState(false);
  const [saved, setSaved]     = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  function tagsInBox(i: number) {
    return i === numBoxes - 1 ? req.quantity - i * TAGS_PER_BOX : TAGS_PER_BOX;
  }

  function buildRange(i: number) {
    const n = parseInt(serials[i]);
    if (!n || n <= 0) return null;
    const qty = tagsInBox(i);
    return { start: String(n).padStart(6, '0'), end: String(n + qty - 1).padStart(6, '0') };
  }

  function updateSerial(i: number, val: string) {
    setSaved(false);
    setSerials(prev => { const next = [...prev]; next[i] = val.replace(/\D/g, ''); return next; });
  }

  async function handleSave() {
    setBusy(true); setSaved(false); setSaveErr(null);
    const serialStr = serials.join('|');
    const baseNotes = (req.notes ?? '').replace(/\s*TAG_SERIALS:[\d|]+/, '').trim();
    const newNotes  = [baseNotes, `TAG_SERIALS:${serialStr}`].filter(Boolean).join(' ');
    const { error } = await supabase.from('farmer_tag_requests').update({ notes: newNotes }).eq('id', req.id);
    setBusy(false);
    if (error) { setSaveErr(error.message); return; }
    setSaved(true);
    onSuccess('Tag numbers saved.');
  }

  const allFilled = serials.every(s => parseInt(s) > 0);

  return (
    <div className={s.actionForm}>
      <div className={s.actionTitle}>Tag Serial Numbers</div>
      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>
        {numBoxes} {numBoxes === 1 ? 'box' : 'boxes'} — enter the first serial printed on each physical box
      </div>

      <div className={s.tagTable}>
        {Array.from({ length: numBoxes }, (_, i) => {
          const range = buildRange(i);
          return (
            <div key={i} className={s.tagTableRow}>
              <span className={s.tagTableBox}>Box {i + 1}</span>
              <input
                className={s.input}
                style={{ fontFamily: 'monospace', width: '120px', flexShrink: 0 }}
                value={serials[i]}
                onChange={e => updateSerial(i, e.target.value)}
                placeholder="000001"
              />
              {range
                ? <span className={s.tagTableRange}>{range.start} → {range.end} <span style={{ color: '#94a3b8', fontWeight: 400 }}>({tagsInBox(i)} tags)</span></span>
                : <span className={s.tagTablePlaceholder}>{tagsInBox(i)} tags — enter first serial</span>
              }
            </div>
          );
        })}
      </div>

      <div className={s.formBtns}>
        <button className={s.primaryBtn} disabled={!allFilled || busy} onClick={handleSave}>
          <CheckCircle size={13} /> {busy ? 'Saving…' : 'Save Tag Numbers'}
        </button>
      </div>
      {saved    && <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.25rem' }}>Tag numbers saved.</div>}
      {saveErr  && <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.25rem' }}>Error: {saveErr}</div>}
    </div>
  );
}

function DispatchForm({ req, onSuccess }: { req: TagRequest; onSuccess: (msg: string) => void }) {
  const [waybill, setWaybill]   = useState('');
  const [dispDate, setDispDate] = useState(new Date().toISOString().slice(0, 10));
  const [courier, setCourier]   = useState('');
  const [busy, setBusy]         = useState(false);
  const canSubmit = waybill.trim() !== '' && courier.trim() !== '' && dispDate !== '';

  async function handle() {
    if (!canSubmit || busy) return;
    setBusy(true);
    const ds = getDeliverySettings();
    const contactParts = [
      ds.name  ? `Contact: ${ds.name}`   : '',
      ds.phone ? `Phone: ${ds.phone}`     : '',
    ].filter(Boolean);
    const notes = [`Courier: ${courier}`, `Waybill: ${waybill}`, ...contactParts].join(' · ');
    await updateStatus(req.id, 'IN_TRANSIT', notes);
    setBusy(false);
    void logActivity({
      category:      'TAGGING',
      level:         'INFO',
      title:         'Tags dispatched to farmer',
      detail:        `${req.quantity} RFID tags dispatched to ${req.farmerName} via ${courier} — waybill ${waybill}`,
      actorRole:     'Ministry Officer',
      referenceCode: req.farmId,
    });
    onSuccess(`Dispatched via ${courier}. Waybill: ${waybill}. Status → In Transit.`);
  }

  return (
    <div className={s.actionForm}>
      <div className={s.actionTitle}>Record Dispatch</div>
      <div className={s.field}>
        <label className={s.label}>Courier / Transport <span className={s.req}>*</span></label>
        <input className={s.input} value={courier} onChange={e => setCourier(e.target.value)} placeholder="e.g. Somalia Postal, Direct Delivery" />
      </div>
      <div className={s.formRow}>
        <div className={s.field}>
          <label className={s.label}>Waybill No. <span className={s.req}>*</span></label>
          <input className={s.input} value={waybill} onChange={e => setWaybill(e.target.value)} placeholder="WB-2026-XXXXX" />
        </div>
        <div className={s.field}>
          <label className={s.label}>Dispatch Date</label>
          <input className={s.input} type="date" value={dispDate} onChange={e => setDispDate(e.target.value)} />
        </div>
      </div>
      <button className={s.primaryBtn} disabled={!canSubmit || busy} onClick={handle}>
        <Truck size={13} /> {busy ? 'Saving…' : 'Record Dispatch'}
      </button>
    </div>
  );
}

/* ── Premises popup ──────────────────────────────────────────── */
interface PremisesData {
  id: string; premises_code: string; premises_name?: string;
  physical_address?: string; region_code?: string;
  gps_latitude?: number; gps_longitude?: number;
  status?: string; created_at?: string;
  [key: string]: unknown;
}

function PremisesModal({ premisesCode, onClose }: { premisesCode: string; onClose: () => void }) {
  const [data, setData]       = useState<PremisesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr]         = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: d, error: e } = await supabase
        .from('farmer_premises')
        .select('*')
        .eq('premises_code', premisesCode)
        .single();
      if (e) setErr(e.message);
      else    setData(d as PremisesData);
      setLoading(false);
    }
    void load();
  }, [premisesCode]);

  const lat = data?.gps_latitude  != null ? Number(data.gps_latitude)  : null;
  const lon = data?.gps_longitude != null ? Number(data.gps_longitude) : null;
  const hasGps = lat != null && lon != null;
  const mapLink = hasGps
    ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}`
    : `https://www.openstreetmap.org/search?query=${encodeURIComponent([data?.physical_address, data?.region_code, 'Somalia'].filter(Boolean).join(', '))}`;

  return (
    <div className={s.modalOverlay} style={{ zIndex: 1100 }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={s.premisesModal}>

        <div className={s.pmHeader}>
          <span className={s.pmCode}>{premisesCode}</span>
          <button className={s.closeBtn} onClick={onClose}><X size={16} /></button>
        </div>

        <div className={s.pmBody}>
          {loading && <div className={s.tableLoading}>Loading…</div>}
          {err     && <div className={s.pmError}>{err}</div>}
          {data && (
            <>
              {[
                ['Premises Code',    data.premises_code],
                ['Premises Name',    data.premises_name],
                ['Region',           data.region_code],
                ['Physical Address', data.physical_address],
                ['Status',           data.status],
                ['Created',          data.created_at ? new Date(data.created_at as string).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : undefined],
                ['GPS Latitude',     lat?.toFixed(6)],
                ['GPS Longitude',    lon?.toFixed(6)],
              ].filter(([, v]) => v != null && v !== '').map(([l, v]) => (
                <div key={l as string} className={s.pmRow}>
                  <span className={s.pmLabel}>{l as string}</span>
                  <span className={s.pmValue}>{v as string}</span>
                </div>
              ))}

              <div className={s.pmRow}>
                <span className={s.pmLabel}>Map</span>
                <a href={mapLink} target="_blank" rel="noopener noreferrer" className={s.mapInlineLink}>
                  <MapPin size={11} />
                  {hasGps ? `${lat!.toFixed(5)}, ${lon!.toFixed(5)} — Open map ↗` : 'Search on map ↗'}
                </a>
              </div>

              {hasGps && (
                <iframe
                  title="Premises map"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${lon!-0.015},${lat!-0.015},${lon!+0.015},${lat!+0.015}&layer=mapnik&marker=${lat},${lon}`}
                  className={s.pmMapFrame}
                  loading="lazy"
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Map view ────────────────────────────────────────────────── */
function MapView({ lat, lon, address, region }: { lat?: number; lon?: number; address?: string; region?: string }) {
  const hasCoords = lat != null && lon != null;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lon! - 0.015},${lat! - 0.015},${lon! + 0.015},${lat! + 0.015}&layer=mapnik&marker=${lat},${lon}`;
  const extLink = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}`;

  return (
    <div className={s.mapSection}>
      <div className={s.sectionLabel}><MapPin size={13} /> Delivery Location</div>
      {address && <div className={s.mapAddress}>{address}</div>}
      {hasCoords ? (
        <>
          <div className={s.mapCoords}>{lat!.toFixed(5)}, {lon!.toFixed(5)} · GPS pinned</div>
          <iframe title="Delivery map" src={mapUrl} className={s.mapFrame} loading="lazy" />
          <a href={extLink} target="_blank" rel="noopener noreferrer" className={s.mapLink}>
            Open in OpenStreetMap ↗
          </a>
        </>
      ) : (
        <div className={s.mapNoGps}>
          <MapPin size={20} color="#cbd5e1" strokeWidth={1.5} />
          <span>GPS coordinates not captured — delivery location is approximate</span>
          {region && <span className={s.mapRegionLabel}>{region}</span>}
        </div>
      )}
    </div>
  );
}

function buildDeliveryEmail(req: TagRequest): string {
  const lat = req.latitude;
  const lon = req.longitude;
  const mapLink = lat != null && lon != null
    ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}`
    : 'No GPS coordinates provided';

  const subject = encodeURIComponent(`Tag Delivery — ${req.reqCode} — ${req.farmerName}`);
  const body = encodeURIComponent(
`Dear Delivery Team,

Please arrange delivery of the following livestock tag order:

REQUEST CODE: ${req.reqCode}
FARMER / CONTACT: ${req.farmerName}
FARM ID: ${req.farmId}
REGION: ${req.region}
PHONE: ${req.phone ?? 'N/A'}
QUANTITY: ${req.quantity} RFID tags
ADDRESS: ${req.address ?? 'See GPS coordinates below'}

GPS LOCATION (click to open map):
${mapLink}

Please confirm receipt of this delivery instruction and provide an estimated delivery date.

QXLITS Ministry of Livestock
`
  );
  return `mailto:?subject=${subject}&body=${body}`;
}

/* ── Detail panel ────────────────────────────────────────────── */
function DetailPanel({ req, onClose, onRefresh }: { req: TagRequest; onClose: () => void; onRefresh: () => void }) {
  const [activeAction, setActiveAction] = useState<ActionKind>(null);
  const [successMsg, setSuccessMsg]     = useState<string | null>(null);
  const [showTagEdit, setShowTagEdit]   = useState(false);

  const handleSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setActiveAction(null);
    onRefresh();
  };

  const st = STATUS_STYLE[req.status];

  const WORKFLOW_STEPS = [
    { label: 'Requested',     done: true },
    { label: 'Approved',      done: ['APPROVED','ALLOCATED','ISSUED','IN_TRANSIT','WITH_FARMER'].includes(req.status) },
    { label: 'Tags Prepared', done: ['ALLOCATED','ISSUED','IN_TRANSIT','WITH_FARMER'].includes(req.status) },
    { label: 'Issued',        done: ['ISSUED','IN_TRANSIT','WITH_FARMER'].includes(req.status) },
    { label: 'Dispatched',    done: ['IN_TRANSIT','WITH_FARMER'].includes(req.status) },
    { label: 'With Farmer',   done: req.status === 'WITH_FARMER' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Modal header */}
      <div className={s.detailHeader} style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
        <div>
          <div className={s.detailCode}>{req.reqCode}</div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.375rem' }}>
            <span className={s.badge} style={{ background: st.bg, color: st.color }}>{st.label}</span>
            <span className={s.tagTypeBadge}><Radio size={10} /> RFID</span>
          </div>
        </div>
        <button className={s.closeBtn} onClick={onClose}><X size={16} /></button>
      </div>

      {successMsg && (
        <div className={s.successBanner} style={{ margin: '0.75rem 1.5rem 0' }}>
          <CheckCircle size={14} /> {successMsg}
        </div>
      )}

      {/* Two-column body */}
      <div className={s.modalTwoCols}>

        {/* Left — info + map + workflow */}
        <div className={s.modalLeft}>

          {/* All fields from DB */}
          <div className={s.infoGrid}>
            {([
              ['Farmer',    req.farmerName],
              ['Farm ID',   req.farmId],
              ['Region',    req.region],
              ['Tag Type',  req.tagType.replace('_', ' ')],
              ['Quantity',  `${req.quantity} tags · ${Math.ceil(req.quantity / TAGS_PER_BOX)} boxes`],
              ...(req.phone   ? [['Phone',   req.phone]]   : []),
            ] as [string, string][]).map(([l, v]) => (
              <div key={l} className={s.infoItem}>
                <div className={s.infoLabel}>{l}</div>
                <div className={s.infoValue}>{v}</div>
              </div>
            ))}

            {/* Address + map link */}
            {(req.address || req.latitude != null) && (
              <div className={s.infoItem} style={{ gridColumn: '1 / -1' }}>
                <div className={s.infoLabel}>Address</div>
                <div className={s.infoValue}>{req.address ?? `${req.region}, Somalia`}</div>
              </div>
            )}
            <div className={s.infoItem} style={{ gridColumn: '1 / -1' }}>
              <div className={s.infoLabel}>Map</div>
              {(() => {
                const hasGps = req.latitude != null && req.longitude != null;
                const link = hasGps
                  ? `https://www.openstreetmap.org/?mlat=${req.latitude}&mlon=${req.longitude}#map=15/${req.latitude}/${req.longitude}`
                  : `https://www.openstreetmap.org/search?query=${encodeURIComponent([req.address, req.region, 'Somalia'].filter(Boolean).join(', '))}`;
                return (
                  <a href={link} target="_blank" rel="noopener noreferrer" className={s.mapInlineLink}>
                    <MapPin size={12} /> {hasGps ? `${req.latitude!.toFixed(5)}, ${req.longitude!.toFixed(5)} — Open in OpenStreetMap ↗` : 'Search address on OpenStreetMap ↗'}
                  </a>
                );
              })()}
            </div>

            {req.reason && (
              <div className={s.infoItem} style={{ gridColumn: '1 / -1' }}>
                <div className={s.infoLabel}>Reason</div>
                <div className={s.infoValue} style={{ fontWeight: 400, color: '#475569' }}>{req.reason}</div>
              </div>
            )}
            {req.notes && (
              <div className={s.infoItem} style={{ gridColumn: '1 / -1' }}>
                <div className={s.infoLabel}>Notes</div>
                <div className={s.infoValue} style={{ fontWeight: 400, color: '#475569' }}>{req.notes}</div>
              </div>
            )}
            {req.allocatedRange && (
              <div className={s.infoItem} style={{ gridColumn: '1 / -1' }}>
                <div className={s.infoLabel}>Allocated Range</div>
                <div className={s.infoValue} style={{ color: '#0369a1', fontWeight: 700, fontFamily: 'monospace', fontSize: '0.8125rem' }}>{req.allocatedRange}</div>
              </div>
            )}
          </div>

          {/* Timeline dates */}
          <div className={s.dateTimeline}>
            <div className={s.dateItem}>
              <div className={s.dateLabel}>Requested</div>
              <div className={s.dateValue}>{req.requestedAt}</div>
            </div>
            {req.processedAt && (
              <div className={s.dateItem}>
                <div className={s.dateLabel}>
                  {req.status === 'REJECTED'                                    ? 'Rejected'
                  : req.status === 'WITH_FARMER' || req.status === 'DELIVERED'  ? 'Delivered'
                  : req.status === 'IN_TRANSIT'                                 ? 'Dispatched'
                  : req.status === 'FIELD_APPROVED'                             ? 'Regional Approved'
                  :                                                               'Approved'}
                </div>
                <div className={s.dateValue}>{req.processedAt}</div>
              </div>
            )}
          </div>

          <MapView lat={req.latitude} lon={req.longitude} address={req.address} region={req.region} />

          <div className={s.workflowSection}>
            <div className={s.sectionLabel}>Workflow Progress</div>
            <div className={s.workflowSteps}>
              {WORKFLOW_STEPS.map((ws, i) => (
                <div key={ws.label} className={s.wfStep}>
                  <div className={`${s.wfDot}${ws.done ? ' ' + s.wfDotDone : ''}`} />
                  {i < WORKFLOW_STEPS.length - 1 && <div className={`${s.wfLine}${ws.done ? ' ' + s.wfLineDone : ''}`} />}
                  <div className={`${s.wfLabel}${ws.done ? ' ' + s.wfLabelDone : ''}`}>{ws.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — actions */}
        <div className={s.modalRight}>
          <div className={s.panelSectionHead}>Authority Actions</div>

          {/* Print Labels — only after tags are assigned */}
          {(['ALLOCATED', 'ISSUED', 'IN_TRANSIT', 'WITH_FARMER', 'DELIVERED'] as ReqStatus[]).includes(req.status) && (
            <div className={s.actionBtns}>
              <button className={s.printBtn} onClick={() => openPrintWindow(req)}>
                <Printer size={13} /> Print Labels
              </button>
            </div>
          )}

          {(req.status === 'PENDING' || req.status === 'FIELD_APPROVED') && (
            <>
              <div className={s.actionBtns}>
                <button className={`${s.actionBtn}${activeAction === 'approve' ? ' ' + s.actionBtnOn : ''}`} onClick={() => setActiveAction(a => a === 'approve' ? null : 'approve')}>
                  <CheckCircle size={13} /> Approve
                </button>
                <button className={`${s.actionBtnDanger}${activeAction === 'reject' ? ' ' + s.actionBtnOn : ''}`} onClick={() => setActiveAction(a => a === 'reject' ? null : 'reject')}>
                  <X size={13} /> Reject
                </button>
              </div>
              {activeAction === 'approve' && <ApproveForm req={req} onSuccess={handleSuccess} />}
              {activeAction === 'reject'  && <RejectForm  req={req} onSuccess={handleSuccess} />}
            </>
          )}

          {req.status === 'APPROVED' && (
            <PrepareTagsForm req={req} onSuccess={handleSuccess} />
          )}

          {/* Box summary — shown for all post-assignment statuses */}
          {(['ALLOCATED', 'ISSUED', 'IN_TRANSIT', 'WITH_FARMER', 'DELIVERED'] as ReqStatus[]).includes(req.status) && (
            <AssignedBoxSummary
              quantity={req.quantity}
              tagRanges={req.tagRanges}
              onEdit={(['ALLOCATED', 'ISSUED', 'IN_TRANSIT'] as ReqStatus[]).includes(req.status)
                ? () => setShowTagEdit(e => !e)
                : undefined}
            />
          )}

          {/* Tag number editor — toggled by Edit button, hidden after delivery */}
          {(['ALLOCATED', 'ISSUED', 'IN_TRANSIT'] as ReqStatus[]).includes(req.status) && showTagEdit && (
            <TagNumbersManager
              req={req}
              onSuccess={msg => { handleSuccess(msg); setShowTagEdit(false); }}
            />
          )}

          {req.status === 'ALLOCATED' && (
            <PrepareForDeliveryBtn req={req} onSuccess={handleSuccess} />
          )}

          {req.status === 'ISSUED' && (
            <>
              <div className={s.actionBtns}>
                <button className={`${s.actionBtn}${activeAction === 'dispatch' ? ' ' + s.actionBtnOn : ''}`} onClick={() => setActiveAction(a => a === 'dispatch' ? null : 'dispatch')}>
                  <Truck size={13} /> Record Dispatch
                </button>
              </div>
              {activeAction === 'dispatch' && <DispatchForm req={req} onSuccess={handleSuccess} />}
            </>
          )}

          {(req.status === 'REJECTED' || req.status === 'WITH_FARMER' || req.status === 'DELIVERED') && (
            <div style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>No further actions available.</div>
          )}

        </div>

      </div>
    </div>
  );
}

/* ── Tag Database ────────────────────────────────────────────── */
interface TagRow {
  serial: string;
  serialNum: number;
  requestId: string;
  reqCode: string;
  farmerName: string;
  farmId: string;
  region: string;
  phone: string;
  contact: string;
  tagType: TagType;
  status: ReqStatus;
  dateAssigned: string;
  requestedAt: string;
}

const DB_PAGE = 100;
const TAG_DB_STATUSES: ReqStatus[] = ['ALLOCATED', 'ISSUED', 'IN_TRANSIT', 'WITH_FARMER', 'DELIVERED', 'REJECTED'];

function TagDatabase({ requests, onUpdate }: { requests: TagRequest[]; onUpdate: () => void }) {
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<ReqStatus | 'ALL'>('ALL');
  const [page,         setPage]         = useState(0);
  const [selected,     setSelected]     = useState<Set<string>>(new Set());
  const [showModal,    setShowModal]    = useState(false);
  const [newStatus,    setNewStatus]    = useState<ReqStatus>('DELIVERED');
  const [statusNote,   setStatusNote]   = useState('');
  const [changing,     setChanging]     = useState(false);
  const [changeError,  setChangeError]  = useState<string | null>(null);

  const allTags: TagRow[] = useMemo(() => {
    const rows: TagRow[] = [];
    for (const r of requests) {
      if (!r.tagRanges || r.tagRanges.length === 0) continue;
      for (const rng of r.tagRanges) {
        const s = parseInt(rng.start, 10);
        const e = parseInt(rng.end, 10);
        for (let n = s; n <= e; n++) {
          rows.push({
            serial:       String(n).padStart(6, '0'),
            serialNum:    n,
            requestId:    r.id,
            reqCode:      r.reqCode,
            farmerName:   r.farmerName,
            farmId:       r.farmId,
            region:       r.region,
            phone:        r.phone ?? '—',
            contact:      r.contact,
            tagType:      r.tagType,
            status:       r.status,
            dateAssigned: r.processedAt ?? r.requestedAt,
            requestedAt:  r.requestedAt,
          });
        }
      }
    }
    rows.sort((a, b) => a.serialNum - b.serialNum);
    return rows;
  }, [requests]);

  const filtered: TagRow[] = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allTags.filter(t => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (!q) return true;
      return (
        t.serial.includes(q) ||
        t.farmerName.toLowerCase().includes(q) ||
        t.farmId.toLowerCase().includes(q) ||
        t.reqCode.toLowerCase().includes(q) ||
        t.region.toLowerCase().includes(q) ||
        t.phone.toLowerCase().includes(q)
      );
    });
  }, [allTags, search, statusFilter]);

  useEffect(() => { setPage(0); setSelected(new Set()); }, [search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / DB_PAGE);
  const pageData   = filtered.slice(page * DB_PAGE, (page + 1) * DB_PAGE);

  const withFarmer     = allTags.filter(t => ['WITH_FARMER', 'DELIVERED'].includes(t.status)).length;
  const inTransit      = allTags.filter(t => t.status === 'IN_TRANSIT').length;
  const uniquePremises = new Set(allTags.map(t => t.farmId)).size;

  const kpis = [
    { label: 'Total Tags',   value: allTags.length },
    { label: 'With Farmers', value: withFarmer },
    { label: 'In Transit',   value: inTransit },
    { label: 'Premises',     value: uniquePremises },
  ];

  const ALLOCATED_STATUSES: Array<ReqStatus | 'ALL'> = [
    'ALL', 'ALLOCATED', 'ISSUED', 'IN_TRANSIT', 'WITH_FARMER', 'DELIVERED',
  ];

  /* ── Selection helpers ── */
  const allPageSelected = pageData.length > 0 && pageData.every(t => selected.has(t.serial));
  function toggleAll() {
    const pageSerials = pageData.map(t => t.serial);
    setSelected(prev => {
      const next = new Set(prev);
      if (allPageSelected) pageSerials.forEach(s => next.delete(s));
      else                 pageSerials.forEach(s => next.add(s));
      return next;
    });
  }
  function toggleOne(serial: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(serial)) next.delete(serial); else next.add(serial);
      return next;
    });
  }

  /* ── Status change ── */
  function openChangeModal(forSerial?: string) {
    if (forSerial) setSelected(new Set([forSerial]));
    setNewStatus('DELIVERED');
    setStatusNote('');
    setChangeError(null);
    setShowModal(true);
  }

  async function confirmChange() {
    if (selected.size === 0) return;
    setChanging(true); setChangeError(null);
    const affectedRows  = allTags.filter(t => selected.has(t.serial));
    const uniqueReqIds  = [...new Set(affectedRows.map(t => t.requestId))];
    let lastErr: string | null = null;
    for (const id of uniqueReqIds) {
      const { error } = await updateStatus(id, newStatus, statusNote.trim() || undefined);
      if (error) lastErr = (error as { message: string }).message;
    }
    setChanging(false);
    if (lastErr) { setChangeError(lastErr); return; }
    setShowModal(false);
    setSelected(new Set());
    onUpdate();
  }

  const selectedReqCount = new Set(allTags.filter(t => selected.has(t.serial)).map(t => t.requestId)).size;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '0.875rem 1.125rem' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f1f38', lineHeight: 1 }}>{k.value.toLocaleString()}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filter bar + bulk action */}
      <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className={s.searchWrap} style={{ flex: 1, minWidth: 220 }}>
          <Search size={14} className={s.searchIcon} />
          <input
            className={s.searchInput}
            placeholder="Search serial, farmer, premises, region, phone, request code…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
        <div className={s.selectWrap}>
          <select className={s.filterSelect} value={statusFilter} onChange={e => setStatusFilter(e.target.value as ReqStatus | 'ALL')}>
            {ALLOCATED_STATUSES.map(v => (
              <option key={v} value={v}>{v === 'ALL' ? 'All Statuses' : STATUS_STYLE[v as ReqStatus]?.label ?? v}</option>
            ))}
          </select>
          <ChevronDown size={13} className={s.selectIcon} />
        </div>
        {selected.size > 0 && (
          <button
            onClick={() => openChangeModal()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.4rem 0.875rem', borderRadius: 6, border: 'none', background: '#0b5ed7', color: '#fff', fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            <Pencil size={13} />
            Change Status ({selected.size} tag{selected.size !== 1 ? 's' : ''})
          </button>
        )}
        {selected.size > 0 && (
          <button
            onClick={() => setSelected(new Set())}
            style={{ padding: '0.4rem 0.625rem', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', fontFamily: 'inherit', fontSize: '0.78rem', color: '#64748b', cursor: 'pointer' }}
          >Clear</button>
        )}
      </div>

      {/* Table */}
      <div className={s.tableCard}>
        <table className={s.table}>
          <thead>
            <tr>
              <th className={s.th} style={{ width: 36, paddingRight: 0 }}>
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={toggleAll}
                  style={{ width: 15, height: 15, accentColor: '#0b5ed7', cursor: 'pointer' }}
                />
              </th>
              <th className={s.th}>Tag Serial</th>
              <th className={s.th}>Assigned To</th>
              <th className={s.th}>Region</th>
              <th className={s.th}>Phone</th>
              <th className={s.th}>Request #</th>
              <th className={s.th}>Date Assigned</th>
              <th className={s.th}>Status</th>
              <th className={s.th}></th>
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr><td colSpan={9} className={s.emptyRow}>
                {search || statusFilter !== 'ALL' ? 'No tags match your search.' : 'No allocated tags yet.'}
              </td></tr>
            ) : pageData.map(t => {
              const st   = STATUS_STYLE[t.status];
              const isSel = selected.has(t.serial);
              return (
                <tr
                  key={t.serial}
                  className={s.tr}
                  style={isSel ? { background: '#eff6ff' } : undefined}
                  onClick={() => toggleOne(t.serial)}
                >
                  <td className={s.td} style={{ paddingRight: 0 }} onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={() => toggleOne(t.serial)}
                      style={{ width: 15, height: 15, accentColor: '#0b5ed7', cursor: 'pointer' }}
                    />
                  </td>
                  <td className={s.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Tag size={13} strokeWidth={1.75} color="#0f2170" style={{ flexShrink: 0 }} />
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.88rem', color: '#0f1f38', letterSpacing: '0.05em' }}>
                        {t.serial}
                      </span>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '1px 6px', borderRadius: 8, background: t.tagType === 'RFID' ? '#eff6ff' : '#f0fdf4', color: t.tagType === 'RFID' ? '#1d4ed8' : '#15803d', flexShrink: 0 }}>
                        {t.tagType === 'RFID' ? 'RFID' : 'Ear'}
                      </span>
                    </div>
                  </td>
                  <td className={s.td}>
                    <div style={{ fontWeight: 600, color: '#0f1f38', fontSize: '0.83rem' }}>{t.farmerName}</div>
                    <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: 1 }}>{t.farmId}</div>
                  </td>
                  <td className={s.td} style={{ fontSize: '0.82rem', color: '#475569' }}>{t.region}</td>
                  <td className={s.td} style={{ fontSize: '0.82rem', color: '#475569', fontFamily: 'monospace' }}>{t.phone}</td>
                  <td className={s.td}>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#64748b' }}>{t.reqCode}</span>
                  </td>
                  <td className={s.td} style={{ color: '#475569', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{t.dateAssigned}</td>
                  <td className={s.td}>
                    <span className={s.badge} style={{ background: st.bg, color: st.color }}>{st.label}</span>
                  </td>
                  <td className={s.td} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => openChangeModal(t.serial)}
                      title="Change status"
                      style={{ padding: '3px 8px', borderRadius: 5, border: '1px solid #e2e8f0', background: '#f8fafc', fontFamily: 'inherit', fontSize: '0.72rem', fontWeight: 600, color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 1.25rem', borderTop: '1px solid #f1f5f9' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            {filtered.length.toLocaleString()} tag{filtered.length !== 1 ? 's' : ''}
            {selected.size > 0 && ` · ${selected.size} selected`}
            {totalPages > 1 && ` · page ${page + 1} of ${totalPages}`}
          </span>
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              <button
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', cursor: page === 0 ? 'not-allowed' : 'pointer', fontSize: '0.78rem', color: '#475569', opacity: page === 0 ? 0.4 : 1 }}
              >← Prev</button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
                style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', fontSize: '0.78rem', color: '#475569', opacity: page >= totalPages - 1 ? 0.4 : 1 }}
              >Next →</button>
            </div>
          )}
        </div>
      </div>

      {/* Status Change Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,31,56,0.45)', backdropFilter: 'blur(2px)' }} onClick={() => setShowModal(false)} />
          <div style={{ position: 'relative', zIndex: 1, background: '#fff', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', width: '100%', maxWidth: 460, padding: '1.75rem' }}>
            <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: 700, color: '#0f1f38' }}>Change Tag Status</h3>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.8rem', color: '#64748b' }}>
              Updating <strong>{selected.size}</strong> tag{selected.size !== 1 ? 's' : ''} across <strong>{selectedReqCount}</strong> request{selectedReqCount !== 1 ? 's' : ''}.
              All tags in the same request will move to the new status.
            </p>

            {changeError && (
              <div style={{ display: 'flex', gap: '0.5rem', padding: '0.6rem 0.875rem', borderRadius: 6, background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '0.82rem', marginBottom: '0.875rem' }}>
                {changeError}
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.3rem' }}>New Status</label>
              <div style={{ position: 'relative' }}>
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value as ReqStatus)}
                  style={{ display: 'block', width: '100%', border: '1px solid #e2e8f0', borderRadius: 6, padding: '0.5rem 0.75rem', font: 'inherit', fontSize: '0.85rem', color: '#0f1f38', background: '#fff', outline: 'none', appearance: 'none', boxSizing: 'border-box' }}
                >
                  {TAG_DB_STATUSES.map(st => (
                    <option key={st} value={st}>{STATUS_STYLE[st].label} ({st})</option>
                  ))}
                </select>
                <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.3rem' }}>Notes (optional)</label>
              <textarea
                value={statusNote}
                onChange={e => setStatusNote(e.target.value)}
                placeholder="Reason for status change, delivery details, etc."
                rows={3}
                style={{ display: 'block', width: '100%', border: '1px solid #e2e8f0', borderRadius: 6, padding: '0.5rem 0.75rem', font: 'inherit', fontSize: '0.85rem', color: '#0f1f38', background: '#fff', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{ padding: '0.45rem 1rem', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
              >Cancel</button>
              <button
                disabled={changing}
                onClick={() => void confirmChange()}
                style={{ padding: '0.45rem 1.125rem', borderRadius: 6, border: 'none', background: '#0b5ed7', color: '#fff', fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 700, cursor: changing ? 'not-allowed' : 'pointer', opacity: changing ? 0.6 : 1 }}
              >
                {changing ? 'Saving…' : `Confirm — ${STATUS_STYLE[newStatus].label}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────── */
interface TagReplacement {
  id: string;
  animalId: string;
  animalCode: string | null;
  oldTagSerial: string | null;
  newTagSerial: string | null;
  evidenceUrl: string | null;
  reason: string;
  notes: string | null;
  status: string;
  requestedByName: string | null;
  reviewerNotes: string | null;
  createdAt: string;
}

export function TagManagementPage(): JSX.Element {
  const [requests, setRequests]         = useState<TagRequest[]>([]);
  const [loading, setLoading]           = useState(true);
  const [loadError, setLoadError]       = useState<string | null>(null);
  const [selected, setSelected]         = useState<TagRequest | null>(null);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState<ReqStatus | 'ALL'>('ALL');
  const [regionFilter, setRegionFilter] = useState('All');
  const [tab, setTab]                     = useState<'database' | 'requests' | 'replacements'>('database');
  const [premisesPopup, setPremisesPopup] = useState<string | null>(null);

  const [replacements,     setReplacements]     = useState<TagReplacement[]>([]);
  const [loadingRepl,      setLoadingRepl]      = useState(false);
  const [selectedRepl,     setSelectedRepl]     = useState<TagReplacement | null>(null);
  const [newSerial,        setNewSerial]        = useState('');
  const [replNote,         setReplNote]         = useState('');
  const [replActionLoading,setReplActionLoading]= useState(false);
  const [replActionError,  setReplActionError]  = useState('');

  async function load(): Promise<TagRequest[]> {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from('farmer_tag_requests')
      .select('id, premises_id, user_id, quantity, tag_type, reason, contact_person, phone, physical_address, status, requested_at, processed_at, notes, farmer_premises(premises_code, premises_name, region_code)')
      .order('requested_at', { ascending: false });

    if (error) {
      setLoadError(error.message);
      setLoading(false);
      return [];
    }
    const mapped: TagRequest[] = (data as Record<string, unknown>[]).map(r => {
      const fp = r.farmer_premises as Record<string, string> | null;
      const year = new Date(r.requested_at as string).getFullYear();
      const shortId = (r.id as string).slice(-5).toUpperCase();
      return {
        id:          r.id as string,
        reqCode:     `TAG-REQ-${year}-${shortId}`,
        tagType:     (r.tag_type as TagType) ?? 'RFID',
        quantity:    Number(r.quantity),
        reason:      r.reason as string | undefined,
        farmerName:  (r.contact_person as string) ?? 'Unknown',
        farmId:      fp?.premises_code ?? '—',
        region:      fp?.region_code   ?? '—',
        contact:     (r.contact_person as string) ?? '',
        phone:       r.phone as string | undefined,
        address:     r.physical_address as string | undefined,
        latitude:    r.latitude  != null ? Number(r.latitude)  : undefined,
        longitude:   r.longitude != null ? Number(r.longitude) : undefined,
        status:      r.status as ReqStatus,
        requestedAt: new Date(r.requested_at as string).toISOString().slice(0, 10),
        processedAt: r.processed_at ? new Date(r.processed_at as string).toISOString().slice(0, 10) : undefined,
        notes:       r.notes as string | undefined,
        tagRanges:   parseTagRanges(r.notes as string | undefined, Number(r.quantity)) ?? undefined,
      };
    });
    setRequests(mapped);
    setLoading(false);
    return mapped;
  }

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (tab !== 'replacements') return;
    setLoadingRepl(true);
    supabase
      .from('tag_replacement_requests')
      .select('id, animal_id, animal_code, old_tag_serial, new_tag_serial, evidence_url, reason, notes, status, requested_by_name, reviewer_notes, created_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setReplacements((data ?? []).map((r: any) => ({
          id:              r.id,
          animalId:        r.animal_id,
          animalCode:      r.animal_code,
          oldTagSerial:    r.old_tag_serial,
          newTagSerial:    r.new_tag_serial,
          evidenceUrl:     r.evidence_url,
          reason:          r.reason,
          notes:           r.notes,
          status:          r.status,
          requestedByName: r.requested_by_name,
          reviewerNotes:   r.reviewer_notes,
          createdAt:       r.created_at,
        })));
        setLoadingRepl(false);
      });
  }, [tab]);

  async function handleReplAction(action: 'APPROVED' | 'REJECTED') {
    if (!selectedRepl) return;
    if (action === 'APPROVED' && !newSerial.trim()) { setReplActionError('Enter the new tag serial.'); return; }
    setReplActionLoading(true);
    setReplActionError('');

    const { error } = await supabase
      .from('tag_replacement_requests')
      .update({ status: action, new_tag_serial: newSerial.trim() || null, reviewer_notes: replNote.trim() || null })
      .eq('id', selectedRepl.id);

    if (error) { setReplActionError(error.message); setReplActionLoading(false); return; }

    if (action === 'APPROVED' && newSerial.trim()) {
      await supabase.from('animals').update({ tag_serial: newSerial.trim() }).eq('id', selectedRepl.animalId);
    }

    setReplacements(prev => prev.map(r => r.id === selectedRepl.id ? { ...r, status: action, newTagSerial: newSerial.trim() || null } : r));
    setSelectedRepl(null);
    setNewSerial('');
    setReplNote('');
    setReplActionLoading(false);
  }

  function handleRefresh() {
    const prevId = selected?.id;
    void load().then(updated => {
      if (prevId) setSelected(updated.find(r => r.id === prevId) ?? null);
    });
  }

  const filtered = requests.filter(r => {
    if (search && !r.reqCode.toLowerCase().includes(search.toLowerCase()) && !r.farmerName.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (regionFilter !== 'All' && r.region !== regionFilter) return false;
    return true;
  });

  const kpis = [
    { label: 'Total Requests', value: requests.length },
    { label: 'Pending Review', value: requests.filter(r => r.status === 'PENDING').length },
    { label: 'Approved',       value: requests.filter(r => r.status === 'APPROVED').length },
    { label: 'With Farmer',    value: requests.filter(r => ['WITH_FARMER','DELIVERED'].includes(r.status)).length },
  ];

  return (
    <div className={s.page}>
      <div className={s.mainContent}>

        {/* Header */}
        <div className={s.pageHeader}>
          <div>
            <h1 className={s.pageTitle}><Tag size={18} strokeWidth={1.75} color="#0f2170" /> Tag Management</h1>
            <p className={s.pageSub}>Review and process tag requests from farmers</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Compact RFID spec card */}
            <div style={{ display: 'flex', background: '#f2faff', overflow: 'hidden' }}>

              {/* Tag image column */}
              <div style={{ background: '#48A9E8', padding: '0.5rem 0.625rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                {/* SVG ear tag */}
                <svg viewBox="0 0 110 110" width="76" height="76" style={{ display: 'block', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))' }}>
                  {/* Outer yellow disc */}
                  <circle cx="55" cy="55" r="51" fill="#FFD600" />
                  <circle cx="55" cy="55" r="51" fill="none" stroke="#c8a800" strokeWidth="1.5" />
                  {/* Concave inner zone */}
                  <circle cx="55" cy="55" r="30" fill="#d4a800" />
                  <circle cx="55" cy="55" r="28" fill="#111" />
                  {/* RFID black button */}
                  <circle cx="55" cy="55" r="23" fill="#1a1a1a" />
                  <circle cx="55" cy="55" r="16" fill="#252525" />
                  {/* Centre pin */}
                  <circle cx="55" cy="55" r="6"  fill="#0d0d0d" />
                  <circle cx="55" cy="55" r="3.5" fill="#1f1f1f" />
                  <circle cx="53" cy="53" r="1.2" fill="rgba(255,255,255,0.12)" />
                  {/* Four oval holes */}
                  <ellipse cx="55" cy="37" rx="2.8" ry="3.5" fill="#0d0d0d" />
                  <ellipse cx="73" cy="55" rx="3.5" ry="2.8" fill="#0d0d0d" />
                  <ellipse cx="55" cy="73" rx="2.8" ry="3.5" fill="#0d0d0d" />
                  <ellipse cx="37" cy="55" rx="3.5" ry="2.8" fill="#0d0d0d" />
                  {/* Right tab */}
                  <path d="M 102 50 Q 110 55 102 60 L 98 58 L 98 52 Z" fill="#c8a800" />
                  {/* Curved text path — counterclockwise = over the top */}
                  {/* Path via TOP: sweep-flag=1 = clockwise on screen = over the top */}
                  <path id="rfidArc" d="M 13 55 A 42 42 0 0 1 97 55" fill="none" stroke="none" />
                  <text fontSize="9.5" fontWeight="900" fill="#1a1a00" letterSpacing="1">
                    <textPath href="#rfidArc" startOffset="3%">706  000123456789</textPath>
                  </text>
                </svg>
                <span style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'center' }}>RFID Ear Tag</span>
              </div>

              {/* Identity strip */}
              <div style={{ background: '#48A9E8', padding: '0.65rem 0.875rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderLeft: '1px solid rgba(255,255,255,0.2)' }}>
                <div style={{ fontSize: '0.52rem', fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.72)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>ISO 11784 · 11785</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#fff', lineHeight: 1.15, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>IDT RFID<br />Ear Tag</div>
                <div style={{ fontSize: '0.56rem', color: 'rgba(255,255,255,0.68)', marginTop: '0.3rem', lineHeight: 1.5 }}>FDX-B / HDX · TPU<br />100 pcs / polybag</div>
              </div>

              {/* Spec grid — two rows */}
              <div style={{ background: '#C8F3F0', padding: '0.55rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', justifyContent: 'center' }}>
                <div style={{ display: 'flex', gap: '1.25rem' }}>
                  {[
                    { label: 'Frequency',  value: '134.2 kHz' },
                    { label: 'Fixed Read', value: 'Up to 30 cm' },
                    { label: 'Handheld',   value: 'Up to 10 cm' },
                    { label: 'IC Type',    value: 'EM4305 / Hitags' },
                    { label: 'UID',        value: '32-bit' },
                    { label: 'User Mem',   value: '512-bit' },
                  ].map(it => (
                    <div key={it.label} style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.565rem', fontWeight: 700, color: '#1a7f6e', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{it.label}</span>
                      <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0d2137', whiteSpace: 'nowrap' }}>{it.value}</span>
                    </div>
                  ))}
                </div>
                <div style={{ height: 1, background: 'rgba(26,127,110,0.18)' }} />
                <div style={{ display: 'flex', gap: '1.25rem' }}>
                  {[
                    { label: 'Female Dim', value: '30 mm × 6.5 mm' },
                    { label: 'Male Dim',   value: '28 mm' },
                    { label: 'Weight F/M', value: '6 gm / 2 gm' },
                    { label: 'R/W Cycles', value: '100,000' },
                    { label: 'Data Life',  value: '10 years' },
                    { label: 'Lock',       value: 'EEPROM read-only' },
                  ].map(it => (
                    <div key={it.label} style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.565rem', fontWeight: 700, color: '#1a7f6e', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{it.label}</span>
                      <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0d2137', whiteSpace: 'nowrap' }}>{it.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button className={s.refreshBtn} onClick={() => void load()} title="Refresh">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {loadError && (
          <div className={s.errorBanner}>
            <AlertCircle size={14} /> Database error: {loadError}
          </div>
        )}

        {/* Tabs */}
        <div className={s.tabs}>
          <button
            className={`${s.tab}${tab === 'database' ? ' ' + s.tabActive : ''}`}
            onClick={() => setTab('database')}
          >
            Tag Database
          </button>
          <button
            className={`${s.tab}${tab === 'requests' ? ' ' + s.tabActive : ''}`}
            onClick={() => setTab('requests')}
          >
            Tag Requests
            <span className={s.tabCount}>{requests.filter(r => r.status === 'PENDING').length || ''}</span>
          </button>
          <button
            className={`${s.tab}${tab === 'replacements' ? ' ' + s.tabActive : ''}`}
            onClick={() => setTab('replacements')}
          >
            Tag Replacements
            <span className={s.tabCount}>{replacements.filter(r => r.status === 'PENDING').length || ''}</span>
          </button>
        </div>

        {/* Tag Database tab */}
        {tab === 'database' && <TagDatabase requests={requests} onUpdate={() => { void load(); }} />}

        {/* KPI row — Tag Requests tab */}
        {tab === 'requests' && (
          <div className={s.kpiRow}>
            {kpis.map(k => (
              <div key={k.label} className={s.kpiCard}>
                <div className={s.kpiValue}>{loading ? '—' : k.value}</div>
                <div className={s.kpiLabel}>{k.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters — Tag Requests tab */}
        {tab === 'requests' && <div className={s.filterBar}>
          <div className={s.searchWrap}>
            <Search size={14} className={s.searchIcon} />
            <input className={s.searchInput} placeholder="Search request code or farmer…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className={s.selectWrap}>
            <select className={s.filterSelect} value={statusFilter} onChange={e => setStatusFilter(e.target.value as ReqStatus | 'ALL')}>
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
        </div>}

        {/* Table — Tag Requests tab */}
        {tab === 'requests' && <div className={s.tableCard}>
          {loading ? (
            <div className={s.tableLoading}>Loading requests…</div>
          ) : (
            <table className={s.table}>
              <thead>
                <tr>
                  <th className={s.th}>Request ID</th>
                  <th className={s.th}>Premises ID</th>
                  <th className={s.th}>Region</th>
                  <th className={s.th}>Requested By</th>
                  <th className={s.th}>Phone</th>
                  <th className={s.th}>Address</th>
                  <th className={s.th}>Req. Qty</th>
                  <th className={s.th}>Allotted Qty</th>
                  <th className={s.th}>Requested</th>
                  <th className={s.th}>Approved</th>
                  <th className={s.th}>Delivered</th>
                  <th className={s.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={12} className={s.emptyRow}>
                    {loadError ? loadError : requests.length === 0 ? 'No requests found.' : 'No requests match your filter.'}
                  </td></tr>
                ) : filtered.map(r => {
                  const st = STATUS_STYLE[r.status];
                  const isApproved  = ['APPROVED','ALLOCATED','ISSUED','IN_TRANSIT','WITH_FARMER','DELIVERED'].includes(r.status);
                  const isAllocated = ['ALLOCATED','ISSUED','IN_TRANSIT','WITH_FARMER','DELIVERED'].includes(r.status);
                  const isDelivered = ['WITH_FARMER','DELIVERED'].includes(r.status);
                  return (
                    <tr
                      key={r.id}
                      className={`${s.tr}${selected?.id === r.id ? ' ' + s.trSelected : ''}`}
                      onClick={() => setSelected(sel => sel?.id === r.id ? null : r)}
                    >
                      <td className={s.td}><span className={s.reqCode}>{r.reqCode}</span></td>
                      <td className={s.td}>
                        <button className={s.premisesLink} onClick={e => { e.stopPropagation(); setPremisesPopup(r.farmId); }}>
                          {r.farmId}
                        </button>
                      </td>
                      <td className={s.td}>{r.region}</td>
                      <td className={s.td}>{r.farmerName}</td>
                      <td className={s.td}>{r.phone ?? <span className={s.dateDash}>—</span>}</td>
                      <td className={s.td}>{r.address ?? <span className={s.dateDash}>—</span>}</td>
                      <td className={s.td}>{r.quantity}</td>
                      <td className={s.td}>
                        {isAllocated ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                            <span>{r.quantity}</span>
                            {r.tagRanges && r.tagRanges.length > 0 && (
                              <span className={s.listRange}>
                                {r.tagRanges[0].start}
                                {r.tagRanges.length > 1
                                  ? ` → ${r.tagRanges[r.tagRanges.length - 1].end}`
                                  : ` → ${r.tagRanges[0].end}`}
                              </span>
                            )}
                          </div>
                        ) : <span className={s.dateDash}>—</span>}
                      </td>
                      <td className={s.td}>{r.requestedAt}</td>
                      <td className={s.td}>{isApproved  && r.processedAt ? r.processedAt : <span className={s.dateDash}>—</span>}</td>
                      <td className={s.td}>{isDelivered && r.processedAt ? r.processedAt : <span className={s.dateDash}>—</span>}</td>
                      <td className={s.td}><span className={s.badge} style={{ background: st.bg, color: st.color }}>{st.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>}

        {/* Tag Replacements tab */}
        {tab === 'replacements' && (
          <div className={s.tableCard}>
            {loadingRepl ? (
              <div className={s.tableLoading}>Loading replacement requests…</div>
            ) : replacements.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>No tag replacement requests yet.</div>
            ) : (
              <table className={s.table}>
                <thead>
                  <tr>
                    <th className={s.th}>Animal</th>
                    <th className={s.th}>Old Tag Serial</th>
                    <th className={s.th}>Reason</th>
                    <th className={s.th}>Submitted By</th>
                    <th className={s.th}>Date</th>
                    <th className={s.th}>Status</th>
                    <th className={s.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {replacements.map(r => {
                    const sc = r.status === 'PENDING' ? { bg: '#fef3c7', color: '#b45309' } : r.status === 'APPROVED' ? { bg: '#dcfce7', color: '#15803d' } : { bg: '#fee2e2', color: '#b91c1c' };
                    return (
                      <tr key={r.id} className={s.tr}>
                        <td className={s.td}><span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{r.animalCode ?? r.animalId.slice(0, 8)}</span></td>
                        <td className={s.td}><span style={{ fontFamily: 'monospace' }}>{r.oldTagSerial ?? '—'}</span></td>
                        <td className={s.td}>{r.reason.charAt(0) + r.reason.slice(1).toLowerCase()}</td>
                        <td className={s.td}>{r.requestedByName ?? '—'}</td>
                        <td className={s.td}>{new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        <td className={s.td}><span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: sc.bg, color: sc.color }}>{r.status.charAt(0) + r.status.slice(1).toLowerCase()}</span></td>
                        <td className={s.td}>
                          {r.status === 'PENDING' && (
                            <button className={s.actionBtn} onClick={() => { setSelectedRepl(r); setNewSerial(r.newTagSerial ?? ''); setReplNote(''); setReplActionError(''); }}>Review</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Tag replacement review modal */}
      {selectedRepl && (
        <div className={s.modalOverlay} onClick={e => { if (e.target === e.currentTarget) setSelectedRepl(null); }}>
          <div className={s.modalContent} style={{ maxWidth: 480, width: '100%' }}>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>Tag Replacement Request</div>
                  <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: 2 }}>Animal: {selectedRepl.animalCode ?? selectedRepl.animalId.slice(0, 8)} · Old tag: {selectedRepl.oldTagSerial ?? '—'}</div>
                </div>
                <button onClick={() => setSelectedRepl(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
              </div>

              <div style={{ background: '#f8fafc', borderRadius: 10, padding: '1rem', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Reason',        value: selectedRepl.reason.charAt(0) + selectedRepl.reason.slice(1).toLowerCase() },
                  { label: 'Submitted by',  value: selectedRepl.requestedByName ?? '—' },
                  { label: 'Notes',         value: selectedRepl.notes ?? '—' },
                  ...(selectedRepl.newTagSerial ? [{ label: 'Farmer suggested', value: selectedRepl.newTagSerial }] : []),
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', gap: 12, fontSize: '0.8125rem' }}>
                    <span style={{ color: '#64748b', width: 110, flexShrink: 0 }}>{row.label}</span>
                    <span style={{ color: '#0f172a', fontWeight: 500, fontFamily: row.label === 'Farmer suggested' ? 'monospace' : undefined }}>{row.value}</span>
                  </div>
                ))}
              </div>

              {selectedRepl.evidenceUrl && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>Evidence Photo</div>
                  <img src={selectedRepl.evidenceUrl} alt="evidence" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0' }} />
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  New Tag Serial <span style={{ color: '#ef4444' }}>*</span> (required to approve)
                  {selectedRepl.newTagSerial && <span style={{ fontWeight: 400, color: '#64748b', fontSize: '0.75rem', marginLeft: 6 }}>pre-filled from farmer's suggestion</span>}
                </label>
                <input
                  value={newSerial}
                  onChange={e => setNewSerial(e.target.value.toUpperCase())}
                  placeholder="Enter new official tag serial number"
                  style={{ width: '100%', borderRadius: 8, border: '1.5px solid #e2e8f0', padding: '8px 12px', fontSize: '0.875rem', fontFamily: 'monospace', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>Review notes <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#94a3b8' }}>(optional)</span></label>
                <textarea value={replNote} onChange={e => setReplNote(e.target.value)} rows={2} style={{ width: '100%', borderRadius: 8, border: '1.5px solid #e2e8f0', padding: '8px 12px', fontSize: '0.875rem', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>

              {replActionError && <div style={{ color: '#dc2626', fontSize: '0.8125rem', marginBottom: 10 }}>{replActionError}</div>}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button disabled={replActionLoading} onClick={() => void handleReplAction('REJECTED')}
                  style={{ padding: '7px 18px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: 8, fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <X size={13} /> Reject
                </button>
                <button disabled={replActionLoading} onClick={() => void handleReplAction('APPROVED')}
                  style={{ padding: '7px 18px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <CheckCircle size={13} /> Approve &amp; Assign Tag
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className={s.modalOverlay} onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className={s.modalContent}>
            <DetailPanel
              req={selected}
              onClose={() => setSelected(null)}
              onRefresh={handleRefresh}
            />
          </div>
        </div>
      )}

      {premisesPopup && (
        <PremisesModal premisesCode={premisesPopup} onClose={() => setPremisesPopup(null)} />
      )}
    </div>
  );
}

export default TagManagementPage;
