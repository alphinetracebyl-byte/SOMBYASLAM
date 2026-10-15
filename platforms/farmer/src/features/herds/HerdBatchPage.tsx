import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth.store';
import { fmtDate } from '@/utils/date';
import { getBadge } from '@/utils/statusBadge';
import {
  Tag, CheckCircle, Clock, XCircle, ChevronRight,
  AlertTriangle, Beef, X, Truck, Camera, LayoutGrid, List, ArrowRightLeft,
} from 'lucide-react';
import { MovementRequestModal } from '../movements/MovementRequestModal';
import { HealthRequestModal } from '../health/HealthRequestModal';
import s from './herds.module.css';

type BatchStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'TAGGED' | 'PENDING_QUARANTINE' | 'QUARANTINE';
type TagType = 'RFID' | 'EAR_TAG';
type TagColor = 'yellow' | 'orange' | 'green' | 'blue' | 'red';

interface BatchAnimal {
  id: string; seq: number; sex: 'M' | 'F'; ageMonths: number; weightKg: number; features: string;
  animalId?: string; tagSerial?: string; tagType?: TagType; tagColor?: TagColor;
  tagStatus: 'UNTAGGED' | 'TAGGED';
  status?: string;
  breed?: string; healthStatus?: string; vaccinationStatus?: string;
  coatColor?: string; submissionType?: string; photoUrl?: string;
}

interface HerdBatch {
  id: string; batchCode: string; batchName: string; premisesCode: string;
  species: string; breed: string; count: number; purpose: string;
  status: BatchStatus; region: string; createdAt: string;
  submittedAt?: string; approvedAt?: string; rejectionReason?: string;
  animals: BatchAnimal[];
}


// ── Tag SVG components ────────────────────────────────────────────────────────

function RFIDTag({ animalId, serial, color = 'orange', seq }: { animalId?: string; serial?: string; color?: TagColor; seq: number }) {
  const fills: Record<TagColor, { body: string; stroke: string; text: string; sub: string }> = {
    yellow: { body: '#eab308', stroke: '#713f12', text: '#1c1917', sub: '#422006' },
    orange: { body: '#fed7aa', stroke: '#f97316', text: '#7c2d12', sub: '#9a3412' },
    green:  { body: '#bbf7d0', stroke: '#16a34a', text: '#14532d', sub: '#166534' },
    blue:   { body: '#bfdbfe', stroke: '#3b82f6', text: '#1e3a8a', sub: '#1e40af' },
    red:    { body: '#fecaca', stroke: '#ef4444', text: '#7f1d1d', sub: '#991b1b' },
  };
  const c = fills[color] ?? fills.yellow;
  const fullSerial = serial ?? 'UNASSIGNED';
  return (
    <svg width="110" height="100" viewBox="0 0 110 100" style={{ display: 'block' }}>
      <rect x="40" y="2" width="30" height="18" rx="6" fill={c.body} stroke={c.stroke} strokeWidth="2" />
      <circle cx="55" cy="11" r="4.5" fill="#e5e7eb" stroke={c.stroke} strokeWidth="1.5" />
      <circle cx="55" cy="11" r="2" fill="white" />
      <rect x="2" y="14" width="106" height="84" rx="14" fill={c.body} stroke={c.stroke} strokeWidth="2" />
      <rect x="10" y="22" width="90" height="68" rx="9" fill="none" stroke={c.stroke} strokeWidth="1" opacity="0.35" />
      <rect x="14" y="27" width="18" height="13" rx="2" fill="rgba(0,0,0,0.3)" />
      <rect x="16" y="29" width="14" height="9" rx="1" fill="#1e293b" />
      <line x1="12" y1="30" x2="14" y2="30" stroke={c.sub} strokeWidth="1" />
      <line x1="12" y1="36" x2="14" y2="36" stroke={c.sub} strokeWidth="1" />
      <line x1="32" y1="30" x2="34" y2="30" stroke={c.sub} strokeWidth="1" />
      <line x1="32" y1="36" x2="34" y2="36" stroke={c.sub} strokeWidth="1" />
      <path d="M76,28 Q81,34 76,40" fill="none" stroke={c.sub} strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
      <path d="M81,25 Q89,34 81,43" fill="none" stroke={c.sub} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <path d="M86,22 Q97,34 86,46" fill="none" stroke={c.sub} strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
      <text x="55" y="57" fontSize="6.5" fill={c.sub} fontFamily="monospace" textAnchor="middle" letterSpacing="1.5">ID NUMBER</text>
      <text x="55" y="70" fontSize="11" fill={c.text} fontFamily="monospace" fontWeight="bold" textAnchor="middle">{fullSerial}</text>
      <text x="55" y="83" fontSize="8" fill={c.sub} fontFamily="monospace" textAnchor="middle">{fullSerial}</text>
    </svg>
  );
}

function EarTag({ animalId, serial, color = 'yellow', seq }: { animalId?: string; serial?: string; color?: TagColor; seq: number }) {
  const fills: Record<TagColor, { body: string; stroke: string; text: string; num: string }> = {
    yellow: { body: '#eab308', stroke: '#713f12', text: '#1c1917', num: '#422006' },
    orange: { body: '#fed7aa', stroke: '#f97316', text: '#7c2d12', num: '#9a3412' },
    green:  { body: '#bbf7d0', stroke: '#16a34a', text: '#14532d', num: '#166534' },
    blue:   { body: '#bfdbfe', stroke: '#3b82f6', text: '#1e3a8a', num: '#1e40af' },
    red:    { body: '#fecaca', stroke: '#ef4444', text: '#7f1d1d', num: '#991b1b' },
  };
  const c = fills[color] ?? fills.yellow;
  const fullSerial = serial ?? 'PENDING';
  return (
    <svg width="110" height="100" viewBox="0 0 110 100" style={{ display: 'block' }}>
      <rect x="40" y="2" width="30" height="18" rx="6" fill={c.body} stroke={c.stroke} strokeWidth="2" />
      <circle cx="55" cy="11" r="4.5" fill="#e5e7eb" stroke={c.stroke} strokeWidth="1.5" />
      <circle cx="55" cy="11" r="2" fill="white" />
      <rect x="2" y="14" width="106" height="84" rx="14" fill={c.body} stroke={c.stroke} strokeWidth="2" />
      <rect x="10" y="22" width="90" height="68" rx="9" fill="none" stroke={c.stroke} strokeWidth="1" opacity="0.35" />
      <text x="55" y="57" fontSize="6.5" fill={c.num} fontFamily="monospace" textAnchor="middle" letterSpacing="1.5">ID NUMBER</text>
      <text x="55" y="70" fontSize="11" fill={c.num} fontFamily="monospace" fontWeight="bold" textAnchor="middle">{fullSerial}</text>
      <text x="55" y="83" fontSize="8" fill={c.text} fontFamily="monospace" textAnchor="middle">{fullSerial}</text>
    </svg>
  );
}

function UnassignedTag() {
  return (
    <svg width="110" height="100" viewBox="0 0 110 100" style={{ display: 'block' }}>
      <rect x="40" y="2" width="30" height="18" rx="6" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3 2" />
      <circle cx="55" cy="11" r="4.5" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.5" />
      <rect x="2" y="14" width="106" height="84" rx="14" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 3" />
      <text x="55" y="57" fontSize="7" fill="#94a3b8" fontFamily="monospace" textAnchor="middle" letterSpacing="1">ID NUMBER</text>
      <text x="55" y="72" fontSize="10.5" fill="#94a3b8" fontFamily="monospace" fontWeight="bold" textAnchor="middle">NOT ASSIGNED</text>
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_ICON: Record<BatchStatus, React.ElementType> = {
  DRAFT: Clock, SUBMITTED: ChevronRight, UNDER_REVIEW: Clock,
  APPROVED: CheckCircle, REJECTED: XCircle, TAGGED: Tag,
  PENDING_QUARANTINE: AlertTriangle, QUARANTINE: AlertTriangle,
};

const SPECIES_EMOJI: Record<string, string> = {
  CATTLE: '🐄', Cattle: '🐄', CAMEL: '🐪', Camel: '🐪',
  GOAT: '🐐', Goat: '🐐', SHEEP: '🐑', Sheep: '🐑',
};


function StatusBadge({ status, size = 'sm' }: { status: BatchStatus; size?: 'sm' | 'lg' }) {
  const IconEl = STATUS_ICON[status];
  const b = getBadge(status);
  return (
    <span className={s.statusBadge} style={{ color: b.color, background: b.bg, fontSize: size === 'lg' ? '0.8125rem' : '0.6875rem', padding: size === 'lg' ? '4px 12px' : '2px 8px' }}>
      <IconEl size={size === 'lg' ? 14 : 11} />{b.label}
    </span>
  );
}

// ── Animal detail modal ───────────────────────────────────────────────────────

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className={s.detailRow}>
      <span className={s.detailLabel}>{label}</span>
      <span className={s.detailValue} style={mono ? { fontFamily: 'monospace', fontSize: '0.8rem' } : undefined}>{value}</span>
    </div>
  );
}

function AnimalDetailModal({ animal, species, batch, onClose }: { animal: BatchAnimal; species: string; batch: HerdBatch; onClose: () => void }) {
  function renderTag() {
    if (animal.tagStatus === 'TAGGED') {
      if (animal.tagType === 'RFID')    return <RFIDTag animalId={animal.animalId} serial={animal.tagSerial} color={animal.tagColor} seq={animal.seq} />;
      if (animal.tagType === 'EAR_TAG') return <EarTag  animalId={animal.animalId} serial={animal.tagSerial} color={animal.tagColor} seq={animal.seq} />;
    }
    return <UnassignedTag />;
  }
  return (
    <div className={s.modalOverlay} onClick={onClose}>
      <div className={s.modalBox} onClick={e => e.stopPropagation()}>

        <div className={s.modalHead}>
          <div>
            <div className={s.modalTitle}>Animal #{animal.seq} — {species}</div>
            <div className={s.modalSub}>{animal.animalId ?? 'ID Pending'} · {animal.tagStatus}</div>
          </div>
          <button className={s.modalCloseBtn} onClick={onClose}><X size={16} strokeWidth={2} /></button>
        </div>

        <div className={s.modalPhotoTag}>
          {animal.photoUrl
            ? <img src={animal.photoUrl} className={s.modalPhotoImg} alt="animal" />
            : <div className={s.modalPhotoEmoji}>{SPECIES_EMOJI[species] ?? '🐾'}</div>}
          <div className={s.modalTagVisual}>{renderTag()}</div>
        </div>

        <div className={s.modalDetails}>
          <DetailRow label="Species"    value={species} />
          <DetailRow label="Breed"      value={batch.breed} />
          <DetailRow label="Sex"        value={animal.sex === 'M' ? 'Male' : 'Female'} />
          <DetailRow label="Age"        value={animal.ageMonths ? `${animal.ageMonths} months` : '—'} />
          <DetailRow label="Weight"     value={animal.weightKg ? `${animal.weightKg} kg` : '—'} />
          <DetailRow label="Features"   value={animal.features || '—'} />
          <DetailRow label="Animal ID"  value={animal.animalId ?? 'Not assigned'} mono />
          <DetailRow label="Tag Serial" value={animal.tagSerial ?? 'Not assigned'} mono />
          <DetailRow label="Tag Type"   value={animal.tagType ?? 'None'} />
          <DetailRow label="Tag Status" value={animal.tagStatus} />
          <DetailRow label="Batch"      value={batch.batchCode} mono />
          <DetailRow label="Farm"       value={batch.premisesCode} mono />
          <DetailRow label="Purpose"    value={batch.purpose} />
          <DetailRow label="Region"     value={batch.region} />
        </div>

      </div>
    </div>
  );
}

// ── Animal card ───────────────────────────────────────────────────────────────

// ── Tag Issue Modal ───────────────────────────────────────────────────────────

const TAG_ISSUE_REASONS = [
  { value: 'DAMAGED',  label: 'Tag Damaged' },
  { value: 'LOST',     label: 'Tag Lost' },
  { value: 'TAMPERED', label: 'Tag Tampered / Suspected Fraud' },
  { value: 'OTHER',    label: 'Other' },
];

const TAGS_PER_BOX = 50;

interface AvailableTagBatch {
  id: string; reqCode: string; tagType: string; quantity: number;
  serialRanges: { start: string; end: string; qty: number }[];
}

function parseSerialRanges(notes: string | null | undefined, quantity: number) {
  if (!notes) return [];
  const match = notes.match(/TAG_SERIALS:([\d|]+)/);
  if (!match) return [];
  const numBoxes = Math.ceil(quantity / TAGS_PER_BOX);
  const firsts = match[1].split('|');
  const ranges: { start: string; end: string; qty: number }[] = [];
  for (let i = 0; i < numBoxes; i++) {
    const n = parseInt(firsts[i] ?? '');
    if (!n || n <= 0) break;
    const boxQty = i === numBoxes - 1 ? quantity - i * TAGS_PER_BOX : TAGS_PER_BOX;
    ranges.push({
      start: String(n).padStart(6, '0'),
      end:   String(n + boxQty - 1).padStart(6, '0'),
      qty:   boxQty,
    });
  }
  return ranges;
}

function TagIssueModal({ animal, onClose }: { animal: BatchAnimal; onClose: () => void }) {
  const { userId, farmerName } = useAuthStore();
  const [reason,          setReason]          = useState('');
  const [notes,           setNotes]           = useState('');
  const [newTagSerial,    setNewTagSerial]    = useState('');
  const [submitting,      setSubmitting]      = useState(false);
  const [done,            setDone]            = useState(false);
  const [wasAutoApproved, setWasAutoApproved] = useState(false);
  const [error,           setError]           = useState('');
  const [availableTags,   setAvailableTags]   = useState<AvailableTagBatch[]>([]);
  const [loadingTags,     setLoadingTags]     = useState(true);
  const [evidenceFile,    setEvidenceFile]    = useState<File | null>(null);
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const evidenceRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase
      .from('farmer_tag_requests')
      .select('id, quantity, tag_type, notes, requested_at')
      .in('status', ['WITH_FARMER', 'DELIVERED'])
      .order('requested_at', { ascending: false })
      .then(({ data }) => {
        if (!data) { setLoadingTags(false); return; }
        const batches: AvailableTagBatch[] = (data as Record<string, unknown>[]).map(r => {
          const year    = new Date(r.requested_at as string).getFullYear();
          const shortId = (r.id as string).slice(-6).toUpperCase();
          const qty     = Number(r.quantity);
          return {
            id:           r.id as string,
            reqCode:      `TAG-${year}-${shortId}`,
            tagType:      r.tag_type as string,
            quantity:     qty,
            serialRanges: parseSerialRanges(r.notes as string | null, qty),
          };
        }).filter(b => b.serialRanges.length > 0);
        setAvailableTags(batches);
        setLoadingTags(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEvidenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEvidenceFile(file);
    setEvidencePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!reason) { setError('Please select a reason.'); return; }
    setSubmitting(true);
    setError('');

    // Upload evidence photo if provided
    let evidenceUrl: string | null = null;
    if (evidenceFile) {
      const ext  = evidenceFile.name.split('.').pop() ?? 'jpg';
      const path = `tag-evidence/${animal.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('premises-photos').upload(path, evidenceFile, { upsert: false });
      if (!upErr) {
        const { data: { publicUrl } } = supabase.storage.from('premises-photos').getPublicUrl(path);
        evidenceUrl = publicUrl;
      }
    }

    // Check if tag replacement requires ministry approval
    let requiresApproval = true;
    try {
      const { data } = await supabase.from('app_settings').select('value').eq('key', 'tag_replacement_requires_approval').single();
      requiresApproval = data?.value !== 'false';
    } catch { /* default: requires approval */ }

    const status = requiresApproval ? 'PENDING' : 'APPROVED';

    const { error: dbErr } = await supabase.from('tag_replacement_requests').insert({
      animal_id:         animal.id,
      animal_code:       animal.animalId ?? null,
      old_tag_serial:    animal.tagSerial ?? null,
      new_tag_serial:    newTagSerial.trim() || null,
      evidence_url:      evidenceUrl,
      reason,
      notes:             notes.trim() || null,
      status,
      requested_by_id:   userId,
      requested_by_name: farmerName ?? null,
    });
    if (dbErr) { setError(dbErr.message); setSubmitting(false); return; }

    // Auto-approved with a new serial → update animal immediately
    if (!requiresApproval && newTagSerial.trim()) {
      await supabase.from('animals').update({ tag_serial: newTagSerial.trim() }).eq('id', animal.id);
    }

    setWasAutoApproved(!requiresApproval);
    setDone(true);
    setSubmitting(false);
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>Report Tag Issue</div>
            <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: 2 }}>Animal: {animal.animalId ?? animal.id} · Tag: {animal.tagSerial ?? '—'}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <CheckCircle size={40} color="#16a34a" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', marginBottom: 6 }}>
              {wasAutoApproved ? 'Tag Updated' : 'Request Submitted'}
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1.25rem' }}>
              {wasAutoApproved
                ? (newTagSerial.trim()
                    ? `Animal record updated to serial ${newTagSerial.trim()}. A field officer will visit to physically apply the new tag.`
                    : 'Your report has been recorded and approved. A field officer will visit to replace the tag.')
                : 'A field officer will visit to verify and replace the tag. Keep the animal accessible.'}
            </div>
            <button onClick={onClose} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 24px', fontWeight: 600, cursor: 'pointer' }}>Close</button>
          </div>
        ) : (<>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 8 }}>Reason <span style={{ color: '#ef4444' }}>*</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {TAG_ISSUE_REASONS.map(r => (
                <label key={r.value} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: `2px solid ${reason === r.value ? '#2563eb' : '#e2e8f0'}`, background: reason === r.value ? '#eff6ff' : '#fff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
                  <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} style={{ accentColor: '#2563eb' }} />
                  {r.label}
                </label>
              ))}
            </div>
          </div>

          {/* Evidence upload — hidden for LOST since there's nothing to photograph */}
          {reason && reason !== 'LOST' && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Evidence Photo <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#94a3b8' }}>(recommended)</span>
              </div>
              {evidencePreview ? (
                <div style={{ position: 'relative' }}>
                  <img src={evidencePreview} alt="evidence" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0', display: 'block' }} />
                  <button
                    onClick={() => { setEvidenceFile(null); setEvidencePreview(null); }}
                    style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', padding: 0 }}
                  ><X size={12} /></button>
                </div>
              ) : (
                <button
                  onClick={() => evidenceRef.current?.click()}
                  style={{ width: '100%', padding: '14px', border: '2px dashed #cbd5e1', borderRadius: 8, background: '#f8fafc', cursor: 'pointer', fontSize: '0.8125rem', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxSizing: 'border-box' }}
                >
                  <Camera size={16} /> Upload evidence photo
                </button>
              )}
              <input ref={evidenceRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleEvidenceChange} />
            </div>
          )}

          {/* New tag selection */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              New Tag Serial <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#94a3b8' }}>(optional — if you have a replacement tag ready)</span>
            </div>
            {loadingTags ? (
              <div style={{ fontSize: '0.8125rem', color: '#94a3b8', padding: '8px 0' }}>Loading your available tags…</div>
            ) : availableTags.length > 0 ? (<>
              <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 500, marginBottom: 2 }}>Tags available with you:</div>
                {availableTags.map(b => (
                  <div key={b.id} style={{ background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', padding: '8px 12px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>
                      {b.reqCode} · {b.quantity} {b.tagType.replace('_', ' ')} tags
                    </div>
                    {b.serialRanges.map((range, i) => (
                      <div key={i} style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                        {range.start} – {range.end} &nbsp;<span style={{ fontFamily: 'sans-serif', color: '#94a3b8' }}>({range.qty} tags)</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <input
                type="text"
                value={newTagSerial}
                onChange={e => setNewTagSerial(e.target.value.toUpperCase().trim())}
                placeholder="Enter serial from your available tags above"
                style={{ width: '100%', borderRadius: 8, border: '1.5px solid #e2e8f0', padding: '8px 12px', fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: 'monospace' }}
              />
            </>) : (
              <input
                type="text"
                value={newTagSerial}
                onChange={e => setNewTagSerial(e.target.value.toUpperCase().trim())}
                placeholder="Enter new tag serial (optional)"
                style={{ width: '100%', borderRadius: 8, border: '1.5px solid #e2e8f0', padding: '8px 12px', fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: 'monospace' }}
              />
            )}
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>Additional notes <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#94a3b8' }}>(optional)</span></div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Describe the condition of the tag, when you noticed the issue, etc." style={{ width: '100%', borderRadius: 8, border: '1.5px solid #e2e8f0', padding: '8px 12px', fontSize: '0.875rem', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>

          {error && <div style={{ color: '#dc2626', fontSize: '0.8125rem', marginBottom: 10 }}>{error}</div>}

          <button onClick={handleSubmit} disabled={submitting || !reason} style={{ width: '100%', padding: '10px', background: '#b45309', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.9375rem', cursor: submitting || !reason ? 'not-allowed' : 'pointer', opacity: !reason ? 0.6 : 1 }}>
            {submitting ? 'Submitting…' : 'Submit Tag Issue Report'}
          </button>
        </>)}
      </div>
    </div>
  );
}

// ── Move to Batch Modal ───────────────────────────────────────────────────────

function MoveToBatchModal({ animal, currentBatchId, batches, onClose, onMoved }: {
  animal: BatchAnimal;
  currentBatchId: string;
  batches: HerdBatch[];
  onClose: () => void;
  onMoved: (animalId: string, newBatchId: string) => void;
}) {
  const [targetBatchId, setTargetBatchId] = useState('');
  const [submitting, setSubmitting]       = useState(false);
  const [error, setError]                 = useState('');

  const otherBatches = batches.filter(b => b.id !== currentBatchId);

  async function handleMove() {
    if (!targetBatchId) return;
    setSubmitting(true);
    const { error: dbErr } = await supabase
      .from('animals')
      .update({ batch_id: targetBatchId })
      .eq('id', animal.id);
    if (dbErr) { setError(dbErr.message); setSubmitting(false); return; }
    onMoved(animal.id, targetBatchId);
    onClose();
  }

  return (
    <div className={s.modalOverlay} onClick={onClose}>
      <div className={s.modalBox} onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className={s.modalHead}>
          <div>
            <div className={s.modalTitle}>Move to Another Batch</div>
            <div className={s.modalSub}>Animal #{animal.seq} · {animal.tagSerial ?? 'Untagged'}</div>
          </div>
          <button className={s.modalCloseBtn} onClick={onClose}><X size={16} strokeWidth={2} /></button>
        </div>

        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {otherBatches.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '1.5rem 0', fontSize: '0.875rem' }}>
              No other batches available. Create another batch first.
            </div>
          ) : (<>
            <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>Select destination batch:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '50vh', overflowY: 'auto' }}>
              {otherBatches.map(b => (
                <label
                  key={b.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '0.75rem 1rem',
                    borderRadius: 10, cursor: 'pointer',
                    border: `2px solid ${targetBatchId === b.id ? '#0b5ed7' : '#e2e8f0'}`,
                    background: targetBatchId === b.id ? '#eff6ff' : '#fff',
                    transition: 'border-color 0.15s',
                  }}
                >
                  <input type="radio" name="targetBatch" value={b.id} checked={targetBatchId === b.id}
                    onChange={() => setTargetBatchId(b.id)} style={{ accentColor: '#0b5ed7', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0b5ed7', fontFamily: 'monospace' }}>{b.batchCode}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
                      {SPECIES_EMOJI[b.species] ?? '🐾'} {b.batchName} &nbsp;·&nbsp; {b.count} animals &nbsp;·&nbsp;
                      <span style={{ fontWeight: 600 }}>{b.status}</span>
                    </div>
                  </div>
                </label>
              ))}
            </div>

            {error && <div style={{ color: '#dc2626', fontSize: '0.8125rem' }}>{error}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.625rem', paddingTop: 4, borderTop: '1px solid #f1f5f9' }}>
              <button onClick={onClose}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, color: '#64748b' }}>
                Cancel
              </button>
              <button onClick={handleMove} disabled={!targetBatchId || submitting}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', borderRadius: 8, border: 'none', background: targetBatchId && !submitting ? '#0f172a' : '#94a3b8', color: '#fff', cursor: targetBatchId && !submitting ? 'pointer' : 'not-allowed', fontSize: '0.8125rem', fontWeight: 700 }}>
                <ArrowRightLeft size={13} />
                {submitting ? 'Moving…' : 'Move Animal'}
              </button>
            </div>
          </>)}
        </div>
      </div>
    </div>
  );
}

function AnimalCard({ animal, species, onSelect, onTagIssue, onMoveToBatch }: {
  animal: BatchAnimal; species?: string; onSelect?: () => void; onTagIssue?: () => void; onMoveToBatch?: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(animal.photoUrl);
  const [uploading, setUploading] = useState(false);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUrl(URL.createObjectURL(file));
    setUploading(true);
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `animals/${animal.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('premises-photos').upload(path, file, { upsert: false });
    if (upErr) { setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('premises-photos').getPublicUrl(path);
    await supabase.from('animal_photos').insert({
      animal_id: animal.id,
      photo_type: 'PRIMARY',
      blob_url: publicUrl,
      content_type: file.type || 'image/jpeg',
      file_size_bytes: file.size,
    });
    setPhotoUrl(publicUrl);
    setUploading(false);
  }

  function renderTag() {
    if (animal.tagStatus === 'TAGGED') {
      if (animal.tagType === 'RFID')    return <RFIDTag serial={animal.tagSerial} color={animal.tagColor} seq={animal.seq} />;
      if (animal.tagType === 'EAR_TAG') return <EarTag  serial={animal.tagSerial} color={animal.tagColor} seq={animal.seq} />;
    }
    return <UnassignedTag />;
  }

  const fmt = (v?: string) => v ? v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, ' ') : '—';

  const rows: { lbl: string; val: string }[] = [
    { lbl: 'Breed',  val: animal.breed || '—' },
    { lbl: 'Marks',  val: animal.features || '—' },
    { lbl: 'Health', val: fmt(animal.healthStatus) },
  ];

  return (
    <div className={s.animalCard} onClick={onSelect} style={{ cursor: onSelect ? 'pointer' : 'default' }}>

      {/* Seq + sex */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
        <span className={s.animalSeq}>#{animal.seq}</span>
        <span className={`${s.sexBadge} ${animal.sex === 'M' ? s.sexM : s.sexF}`}>
          {animal.sex === 'M' ? '♂ M' : '♀ F'}
        </span>
      </div>

      {/* Photo */}
      <div className={s.animalPhotoWrap} onClick={e => e.stopPropagation()}>
        {photoUrl ? (
          <>
            <img src={photoUrl} className={s.animalPhotoImg} alt="animal" style={{ opacity: uploading ? 0.5 : 1 }} />
            <button className={s.animalPhotoChange} onClick={() => fileRef.current?.click()}>
              {uploading ? 'Saving…' : 'Change Photo'}
            </button>
          </>
        ) : (
          <button className={s.animalPhotoUpload} onClick={() => fileRef.current?.click()}>
            <span className={s.animalPhotoUploadMain}>{SPECIES_EMOJI[species ?? ''] ?? '🐾'}</span>
            <span className={s.animalPhotoUploadSub}>{uploading ? 'Saving…' : 'Tap to add photo'}</span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
      </div>

      {/* Tag graphic — tag serial shown inside SVG */}
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
        {renderTag()}
      </div>

      {/* Tag serial number below SVG (just the number, no SOM- prefix) */}
      {animal.tagSerial && (
        <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', textAlign: 'center', letterSpacing: '0.05em' }}>
          {animal.tagSerial}
        </div>
      )}

      {/* Status badge */}
      {animal.status && animal.status !== 'ACTIVE' && (() => {
        const b = getBadge(animal.status!);
        return (
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: b.bg, color: b.color }}>
              {b.label}
            </span>
          </div>
        );
      })()}

      {/* Detail rows */}
      <div className={s.animalDetailGrid}>
        {rows.map(r => (
          <div key={r.lbl} className={s.animalDetailRow}>
            <span className={s.animalDetailLbl}>{r.lbl}</span>
            <span className={s.animalDetailVal}>{r.val}</span>
          </div>
        ))}
      </div>

      {onMoveToBatch && (
        <button
          onClick={e => { e.stopPropagation(); onMoveToBatch(); }}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginTop: 4 }}
        >
          <ArrowRightLeft size={12} /> Move to Batch
        </button>
      )}

    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function HerdBatchPage() {
  const location = useLocation();
  const navigate  = useNavigate();
  const { userId } = useAuthStore();
  const initialBatchId = (location.state as { batchId?: string } | null)?.batchId ?? null;

  const [batches, setBatches]     = useState<HerdBatch[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialBatchId);
  const [loading, setLoading]     = useState(true);
  const [detailAnimal, setDetailAnimal] = useState<BatchAnimal | null>(null);
  const [showMoveModal, setShowMoveModal]     = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [tagIssueAnimal, setTagIssueAnimal]   = useState<BatchAnimal | null>(null);
  const [tagRequests, setTagRequests]         = useState<{ id: string; animalCode: string | null; oldTagSerial: string | null; reason: string; status: string; createdAt: string }[]>([]);
  const [tagRequestsKey, setTagRequestsKey]   = useState(0);
  const [viewMode, setViewMode]               = useState<'grid' | 'list'>('grid');
  const [moveToBatchAnimal, setMoveToBatchAnimal] = useState<BatchAnimal | null>(null);

  function handleAnimalMoved(animalId: string, newBatchId: string) {
    setBatches(prev => prev.map(b => ({
      ...b,
      animals: b.id === selectedId ? b.animals.filter(a => a.id !== animalId) : b.animals,
      count:   b.id === newBatchId ? b.count + 1 : b.id === selectedId ? Math.max(0, b.count - 1) : b.count,
    })));
  }

  useEffect(() => {
    if (!userId) return;
    setLoading(true);

    supabase
      .from('batches')
      .select('id, batch_code, batch_name, premises_code, species, breed, count, status, region, created_at, submitted_at, approved_at, notes')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
      .then(async ({ data }) => {
        if (!data || data.length === 0) { setLoading(false); return; }

        // Get actual animal counts directly from animals table (stored count is unreliable)
        const batchIds = data.map(b => b.id as string);
        const { data: countRows } = await supabase
          .from('animals')
          .select('batch_id')
          .in('batch_id', batchIds);
        const actualCounts: Record<string, number> = {};
        (countRows ?? []).forEach(a => {
          const bid = a.batch_id as string;
          if (bid) actualCounts[bid] = (actualCounts[bid] ?? 0) + 1;
        });

        const mapped: HerdBatch[] = data.map(b => ({
          id:              b.id as string,
          batchCode:       b.batch_code as string,
          batchName:       b.batch_name as string,
          premisesCode:    b.premises_code as string,
          species:         b.species as string,
          breed:           b.breed as string,
          count:           actualCounts[b.id as string] ?? Number(b.count),
          purpose:         '',
          status:          b.status as BatchStatus,
          region:          b.region as string,
          createdAt:       b.created_at as string,
          submittedAt:     (b.submitted_at as string) ?? undefined,
          approvedAt:      (b.approved_at as string) ?? undefined,
          rejectionReason: (b.notes as string) ?? undefined,
          animals:         [],
        }));

        const effectiveId = initialBatchId ?? mapped[0].id;
        if (!initialBatchId) setSelectedId(mapped[0].id);

        const { data: animalRows } = await supabase
          .from('animals')
          .select('id, seq, sex, age_months, weight_kg, distinguishing_marks, animal_code, tag_serial, tag_type, tag_color, tag_status, status, breed, health_status, vaccination_status, coat_color, submission_type')
          .eq('batch_id', effectiveId)
          .order('seq', { ascending: true });

        const animalIds = (animalRows ?? []).map(a => a.id as string);
        let photoMap: Record<string, string> = {};
        if (animalIds.length > 0) {
          const { data: photos } = await supabase
            .from('animal_photos')
            .select('animal_id, blob_url')
            .in('animal_id', animalIds)
            .eq('photo_type', 'PRIMARY')
            .eq('status', 'ACTIVE')
            .order('uploaded_at', { ascending: false });
          if (photos) {
            photos.forEach(p => {
              const aid = p.animal_id as string;
              if (!photoMap[aid]) photoMap[aid] = p.blob_url as string;
            });
          }
        }

        const mappedAnimals: BatchAnimal[] = (animalRows ?? []).map((a, i) => ({
          id:                a.id as string,
          seq:               Number(a.seq ?? 0) || (i + 1),
          sex:               (a.sex === 'FEMALE' ? 'F' : 'M') as 'M' | 'F',
          ageMonths:         Number(a.age_months ?? 0),
          weightKg:          Number(a.weight_kg ?? 0),
          features:          (a.distinguishing_marks as string) ?? '',
          animalId:          (a.animal_code as string) ?? undefined,
          tagSerial:         (a.tag_serial as string) ?? undefined,
          tagType:           (a.tag_type === 'RFID' || a.tag_type === 'EAR_TAG' ? a.tag_type : undefined) as TagType | undefined,
          tagColor:          ((a.tag_color as string)?.toLowerCase() || undefined) as TagColor | undefined,
          tagStatus:         a.tag_status === 'TAGGED' ? 'TAGGED' : 'UNTAGGED',
          status:            (a.status as string) ?? undefined,
          breed:             (a.breed as string) ?? undefined,
          healthStatus:      (a.health_status as string) ?? undefined,
          vaccinationStatus: (a.vaccination_status as string) ?? undefined,
          coatColor:         (a.coat_color as string) ?? undefined,
          submissionType:    (a.submission_type as string) ?? undefined,
          photoUrl:          photoMap[a.id as string],
        }));

        setBatches(mapped.map(b => b.id === effectiveId ? { ...b, animals: mappedAnimals } : b));
        setLoading(false);
      });
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = batches.find(b => b.id === selectedId) ?? null;

  // Load tag replacement requests for the animals in the selected batch
  useEffect(() => {
    if (!selected || selected.animals.length === 0) { setTagRequests([]); return; }
    const animalIds = selected.animals.map(a => a.id);
    supabase
      .from('tag_replacement_requests')
      .select('id, animal_code, old_tag_serial, reason, status, created_at')
      .in('animal_id', animalIds)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setTagRequests((data ?? []).map((r: any) => ({
          id:           r.id,
          animalCode:   r.animal_code,
          oldTagSerial: r.old_tag_serial,
          reason:       r.reason,
          status:       r.status,
          createdAt:    r.created_at,
        })));
      });
  }, [selectedId, selected?.animals.length, tagRequestsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const animalCount = (b: HerdBatch) => b.id === selectedId ? b.animals.length : b.count;
  const totalAnimals   = batches.reduce((s, b) => s + animalCount(b), 0);
  const approvedAnimals = batches.filter(b => b.status === 'APPROVED' || b.status === 'TAGGED').reduce((s, b) => s + animalCount(b), 0);
  const pendingAnimals  = batches.filter(b => b.status === 'SUBMITTED' || b.status === 'UNDER_REVIEW').reduce((s, b) => s + animalCount(b), 0);
  const rejectedAnimals = batches.filter(b => b.status === 'REJECTED').reduce((s, b) => s + animalCount(b), 0);

  const banner = (bg: string, border: string, Icon: React.ElementType, color: string, text: string) => (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: '0.875rem 1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
      <Icon size={16} color={color} style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ fontSize: '0.8125rem', color }}>{text}</div>
    </div>
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {[130, 48, 300].map(h => (
          <div key={h} style={{ height: h, borderRadius: 12, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '600px 100%', animation: 'shimmer 1.2s infinite' }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {!selected ? (
        <div className={s.emptyState}>
          <Beef size={48} strokeWidth={1.2} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#64748b' }}>
              {batches.length === 0 ? 'No batches registered yet' : 'Batch not found'}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: 4 }}>
              {batches.length === 0
                ? 'Register your animals to create a batch.'
                : 'Go back to My Animals and select a batch.'}
            </div>
          </div>
        </div>
      ) : (<>

        {/* Header */}
        <div className={s.batchHeader}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', width: '100%' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className={s.batchTitle}>{selected.batchCode}</span>
                <StatusBadge status={selected.status} size="lg" />
              </div>
              <div className={s.batchSubtitle} style={{ marginTop: 4 }}>
                {SPECIES_EMOJI[selected.species] ?? '🐾'} {selected.batchName} &nbsp;·&nbsp; {selected.breed}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {[{ num: totalAnimals, lbl: 'Total' }, { num: approvedAnimals, lbl: 'Approved' }, { num: pendingAnimals, lbl: 'Pending' }, { num: rejectedAnimals, lbl: 'Rejected' }].map(({ num, lbl }) => (
                <div key={lbl} className={s.kpiChip} style={{ flex: 'none', minWidth: 72 }}>
                  <span className={s.kpiNum}>{num}</span>
                  <span className={s.kpiLbl}>{lbl}</span>
                </div>
              ))}
            </div>
          </div>
          <div className={s.detailChips}>
            <span className={s.detailChip}>Farm: {selected.premisesCode}</span>
            <span className={s.detailChip}>Region: {selected.region}</span>
            <span className={s.detailChip}>Purpose: {selected.purpose}</span>
            <span className={s.detailChip}>{selected.animals.length} animals</span>
            <span className={s.detailChip}>Created: {fmtDate(selected.createdAt)}</span>
            {selected.submittedAt && <span className={s.detailChip}>Submitted: {fmtDate(selected.submittedAt)}</span>}
            {selected.approvedAt  && <span className={s.detailChip}>Approved: {fmtDate(selected.approvedAt)}</span>}
          </div>
        </div>

        {selected.status === 'REJECTED'     && selected.rejectionReason && banner('#fef2f2','#fecaca', XCircle,       '#dc2626', selected.rejectionReason)}
        {selected.status === 'DRAFT'        && banner('#eff6ff','#bfdbfe', AlertTriangle, '#0b5ed7', 'Review your animals below, then submit for Ministry approval. You can edit animal details while the batch is in Draft status.')}
        {(selected.status === 'APPROVED' || selected.status === 'TAGGED') && banner('#ecfdf5','#bbf7d0', CheckCircle, '#059669', `Approved by Ministry. Animal IDs have been assigned.${selected.status === 'APPROVED' ? ' A field officer will visit to apply physical tags.' : ' Physical tags have been applied to all animals.'}`)}
        {selected.status === 'UNDER_REVIEW' && banner('#fffbeb','#fde68a', Clock,         '#d97706', 'This batch is currently under Ministry review. You will be notified once a decision is made.')}
        {selected.status === 'SUBMITTED'    && banner('#eff6ff','#bfdbfe', ChevronRight,  '#0b5ed7', 'Batch submitted and awaiting Ministry review. No further edits can be made at this stage.')}

        {/* Animal grid / list */}
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '1.25rem 1.5rem' }}>
          <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag size={16} color="#64748b" />
            Animals in this batch ({selected.animals.length})
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
              <button
                onClick={() => setViewMode('grid')}
                title="Grid view"
                style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', background: viewMode === 'grid' ? '#0f172a' : '#f8fafc', color: viewMode === 'grid' ? '#fff' : '#64748b', cursor: 'pointer' }}
              ><LayoutGrid size={14} /></button>
              <button
                onClick={() => setViewMode('list')}
                title="List view"
                style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', background: viewMode === 'list' ? '#0f172a' : '#f8fafc', color: viewMode === 'list' ? '#fff' : '#64748b', cursor: 'pointer' }}
              ><List size={14} /></button>
            </div>
          </div>

          {viewMode === 'grid' && (
            <div className={s.animalGrid}>
              {selected.animals.map(animal => (
                <AnimalCard
                  key={animal.id}
                  animal={animal}
                  species={selected.species}
                  onSelect={
                    animal.tagStatus === 'TAGGED' && animal.animalId
                      ? () => navigate(`/animals/profile/${animal.id}`)
                      : () => setDetailAnimal(animal)
                  }
                  onTagIssue={() => setTagIssueAnimal(animal)}
                  onMoveToBatch={() => setMoveToBatchAnimal(animal)}
                />
              ))}
            </div>
          )}

          {viewMode === 'list' && (
            <div className={s.animalListTable}>
              <div className={s.animalListHead}>
                <span>#</span>
                <span>Photo</span>
                <span>Batch No.</span>
                <span>Tag Serial</span>
                <span>Tag Type</span>
                <span>Sex</span>
                <span>Age</span>
                <span>Weight</span>
                <span>Breed</span>
                <span>Coat</span>
                <span>Marks</span>
                <span>Health</span>
                <span>Vaccination</span>
                <span>Submission</span>
                <span>Status</span>
                <span></span>
              </div>
              {selected.animals.map(animal => {
                const statusBg: Record<string, string> = {
                  SUBMITTED: '#dbeafe', APPROVED: '#dcfce7', REJECTED: '#fee2e2',
                  TAGGED: '#f0fdf4', DRAFT: '#f1f5f9',
                };
                const statusColor: Record<string, string> = {
                  SUBMITTED: '#1e40af', APPROVED: '#15803d', REJECTED: '#b91c1c',
                  TAGGED: '#14532d', DRAFT: '#64748b',
                };
                const st  = (animal.status ?? 'DRAFT').toUpperCase();
                const cap = (v?: string) => v ? v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, ' ') : '—';
                const age = animal.ageMonths > 0
                  ? animal.ageMonths < 12 ? `${animal.ageMonths} mo` : `${(animal.ageMonths / 12).toFixed(1)} yr`
                  : '—';
                const wt  = animal.weightKg > 0 ? `${animal.weightKg} kg` : '—';
                return (
                  <div
                    key={animal.id}
                    className={s.animalListRow}
                    onClick={
                      animal.tagStatus === 'TAGGED' && animal.animalId
                        ? () => navigate(`/animals/profile/${animal.id}`)
                        : () => setDetailAnimal(animal)
                    }
                  >
                    <span className={s.animalListSeq}>#{animal.seq}</span>
                    <div className={s.animalListPhoto}>
                      {animal.photoUrl
                        ? <img src={animal.photoUrl} alt="" />
                        : <span>{SPECIES_EMOJI[selected.species ?? ''] ?? '🐾'}</span>}
                    </div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0b5ed7', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.batchCode}</span>
                    <span className={s.animalListSerial}>
                      {animal.tagSerial ?? <span style={{ color: '#94a3b8' }}>Untagged</span>}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{animal.tagType ?? '—'}</span>
                    <span>
                      <span className={`${s.sexBadge} ${animal.sex === 'M' ? s.sexM : s.sexF}`} style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                        {animal.sex === 'M' ? '♂ M' : '♀ F'}
                      </span>
                    </span>
                    <span style={{ fontSize: '0.82rem', color: '#334155' }}>{age}</span>
                    <span style={{ fontSize: '0.82rem', color: '#334155' }}>{wt}</span>
                    <span style={{ fontSize: '0.82rem', color: '#334155' }}>{animal.breed || '—'}</span>
                    <span style={{ fontSize: '0.82rem', color: '#334155' }}>{cap(animal.coatColor)}</span>
                    <span style={{ fontSize: '0.82rem', color: '#334155' }}>{animal.features || '—'}</span>
                    <span style={{ fontSize: '0.82rem', color: '#334155' }}>{cap(animal.healthStatus)}</span>
                    <span style={{ fontSize: '0.82rem', color: '#334155' }}>{cap(animal.vaccinationStatus)}</span>
                    <span style={{ fontSize: '0.82rem', color: '#334155' }}>{cap(animal.submissionType)}</span>
                    <span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: statusBg[st] ?? '#f1f5f9', color: statusColor[st] ?? '#64748b', whiteSpace: 'nowrap' }}>
                        {cap(animal.status)}
                      </span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button
                        onClick={e => { e.stopPropagation(); setMoveToBatchAnimal(animal); }}
                        title="Move to another batch"
                        style={{ display: 'flex', alignItems: 'center', padding: '3px 5px', borderRadius: 5, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', color: '#64748b', flexShrink: 0 }}
                      ><ArrowRightLeft size={11} /></button>
                      <ChevronRight size={14} color="#94a3b8" />
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>


      </>)}

      {detailAnimal && selected && (
        <AnimalDetailModal animal={detailAnimal} species={selected.species} batch={selected} onClose={() => setDetailAnimal(null)} />
      )}

      {showMoveModal && (
        <MovementRequestModal
          onClose={() => setShowMoveModal(false)}
          onSuccess={() => setShowMoveModal(false)}
        />
      )}

      {showHealthModal && (
        <HealthRequestModal
          onClose={() => setShowHealthModal(false)}
          onSuccess={() => setShowHealthModal(false)}
        />
      )}

      {tagIssueAnimal && (
        <TagIssueModal animal={tagIssueAnimal} onClose={() => { setTagIssueAnimal(null); setTagRequestsKey(k => k + 1); }} />
      )}

      {moveToBatchAnimal && selected && (
        <MoveToBatchModal
          animal={moveToBatchAnimal}
          currentBatchId={selected.id}
          batches={batches}
          onClose={() => setMoveToBatchAnimal(null)}
          onMoved={handleAnimalMoved}
        />
      )}

    </div>
  );
}

export default HerdBatchPage;
