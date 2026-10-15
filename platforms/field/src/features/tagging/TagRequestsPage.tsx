import { useState, useEffect } from 'react';
import {
  Tag, CheckCircle2, Search, Package, Truck, X, RefreshCw,
  Clock, XCircle, ChevronRight, FileText, ShieldCheck, Boxes, SendHorizonal, HandCoins, MapPin,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';
import s from './tagRequests.module.css';

/* ── Types ───────────────────────────────────────────────────── */
type ReqStatus = 'PENDING' | 'FIELD_APPROVED' | 'APPROVED' | 'DELIVERED' | 'REJECTED';

interface TagRequest {
  id: string;
  reqCode: string;
  farmerName: string;
  farmId: string;
  region: string;
  quantity: number;
  phone?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  status: ReqStatus;
  requestedAt: string;
  notes?: string;
}

/* ── Static config ───────────────────────────────────────────── */
const STATUS_CFG: Record<ReqStatus, { bg: string; color: string; label: string }> = {
  PENDING:        { bg: '#fefce8', color: '#a16207', label: 'Pending'            },
  FIELD_APPROVED: { bg: '#f0fdf4', color: '#0f7b4d', label: 'Regional Approved'  },
  APPROVED:       { bg: '#eff6ff', color: '#1d4ed8', label: 'Ministry Approved'  },
  DELIVERED:      { bg: '#dcfce7', color: '#15803d', label: 'Delivered'          },
  REJECTED:       { bg: '#fef2f2', color: '#dc2626', label: 'Rejected'           },
};

/* ── Process steps card ──────────────────────────────────────── */
const PROCESS_STEPS = [
  {
    icon: FileText,
    title: 'Farmer Submits Request',
    desc: 'Farmer logs into the portal and requests RFID tags, specifying quantity and reason.',
    color: '#0369a1',
    bg: '#f0f9ff',
  },
  {
    icon: ShieldCheck,
    title: 'Ministry Reviews',
    desc: 'The Ministry of Livestock reviews the request and either approves or rejects it. The farmer is notified of the decision.',
    color: '#7c3aed',
    bg: '#faf5ff',
  },
  {
    icon: Boxes,
    title: 'Tags Prepared & Allocated',
    desc: 'Approved tags are RFID-encoded, barcoded, and a sequential tag range is allocated for the farm.',
    color: '#0f2170',
    bg: '#eff6ff',
  },
  {
    icon: SendHorizonal,
    title: 'Tags Dispatched',
    desc: 'Tags are physically dispatched via courier to the region. A waybill number is recorded for tracking.',
    color: '#d97706',
    bg: '#fffbeb',
  },
  {
    icon: HandCoins,
    title: 'Field Inspector Delivers',
    desc: 'You collect the tags and deliver them to the farmer. Confirm delivery here — the farmer must sign receipt.',
    color: '#16a34a',
    bg: '#f0fdf4',
    highlight: true,
  },
  {
    icon: Tag,
    title: 'Tags Applied to Animals',
    desc: 'The farmer works with a Field Inspector to physically apply tags to each animal and register them in QXLITS.',
    color: '#475569',
    bg: '#f8fafc',
  },
];

function ProcessCard() {
  return (
    <div className={s.processCard}>
      <div className={s.processTitle}>
        <Package size={15} strokeWidth={2} /> Tag Request Process
      </div>
      <div className={s.processSub}>How tags move from request to farm</div>

      <div className={s.steps}>
        {PROCESS_STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={i} className={`${s.step}${step.highlight ? ' ' + s.stepHighlight : ''}`}>
              <div className={s.stepLeft}>
                <div className={s.stepIconWrap} style={{ background: step.bg, color: step.color }}>
                  <Icon size={15} strokeWidth={2} />
                </div>
                {i < PROCESS_STEPS.length - 1 && <div className={s.stepLine} />}
              </div>
              <div className={s.stepBody}>
                <div className={s.stepNum}>Step {i + 1}</div>
                <div className={s.stepTitle} style={{ color: step.highlight ? step.color : undefined }}>{step.title}</div>
                <div className={s.stepDesc}>{step.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className={s.processNote}>
        <ShieldCheck size={13} /> Your action is Step 5 — confirm delivery after handing tags to the farmer.
      </div>
    </div>
  );
}

/* ── Map view ────────────────────────────────────────────────── */
function MapView({ lat, lon, address, region }: { lat?: number; lon?: number; address?: string; region?: string }) {
  const hasCoords = lat != null && lon != null;
  const searchQuery = [address, region, 'Somalia'].filter(Boolean).join(', ');
  const mapUrl  = hasCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${lon! - 0.015},${lat! - 0.015},${lon! + 0.015},${lat! + 0.015}&layer=mapnik&marker=${lat},${lon}`
    : `https://www.openstreetmap.org/export/embed.html?query=${encodeURIComponent(searchQuery)}&layer=mapnik`;
  const extLink = hasCoords
    ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}`
    : `https://www.openstreetmap.org/search?query=${encodeURIComponent(searchQuery)}`;
  return (
    <div className={s.mapBox}>
      <div className={s.mapLabel}><MapPin size={12} /> Delivery Location</div>
      {address && <div className={s.mapAddress}>{address}</div>}
      {hasCoords
        ? <div style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace' }}>{lat!.toFixed(5)}, {lon!.toFixed(5)} · GPS</div>
        : <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Approximate — GPS not captured</div>
      }
      <iframe title="Delivery map" src={mapUrl} className={s.mapFrame} loading="lazy" />
      <a href={extLink} target="_blank" rel="noopener noreferrer" className={s.mapLink}>Open in map ↗</a>
    </div>
  );
}

/* ── Deliver modal ───────────────────────────────────────────── */
function DeliverModal({ req, onClose, onApprove, onDeliver }: {
  req: TagRequest;
  onClose: () => void;
  onApprove: (id: string) => Promise<void>;
  onDeliver: (id: string) => Promise<void>;
}) {
  const [confirm, setConfirm]     = useState(false);
  const [busy, setBusy]           = useState(false);
  const [done, setDone]           = useState(false);
  const [forwarded, setForwarded] = useState(false);
  const st = STATUS_CFG[req.status];

  async function handleApprove() {
    setBusy(true);
    await onApprove(req.id);
    setBusy(false);
    setForwarded(true);
  }

  async function handleDeliver() {
    setBusy(true);
    await onDeliver(req.id);
    setBusy(false);
    setDone(true);
  }

  return (
    <div className={s.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={s.modal}>
        {done ? (
          <div className={s.successBody}>
            <CheckCircle2 size={44} color="#16a34a" strokeWidth={1.5} />
            <div className={s.successTitle}>Tags Delivered</div>
            <div className={s.successSub}>
              <strong>{req.quantity} tags</strong> confirmed delivered to <strong>{req.farmerName}</strong>
            </div>
            <button className={s.doneBtn} onClick={onClose}>Done</button>
          </div>
        ) : forwarded ? (
          <div className={s.successBody}>
            <CheckCircle2 size={44} color="#0f7b4d" strokeWidth={1.5} />
            <div className={s.successTitle}>Forwarded to Ministry</div>
            <div className={s.successSub}>Regional approval recorded. The Ministry will review and give final approval.</div>
            <button className={s.doneBtn} onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            <div className={s.modalHeader}>
              <div>
                <div className={s.modalCode}>{req.reqCode}</div>
                <span className={s.badge} style={{ background: st.bg, color: st.color }}>{st.label}</span>
              </div>
              <button className={s.closeBtn} onClick={onClose}><X size={16} /></button>
            </div>

            <div className={s.infoGrid}>
              <div className={s.infoItem}><div className={s.infoLabel}>Farmer</div><div className={s.infoValue}>{req.farmerName}</div></div>
              <div className={s.infoItem}><div className={s.infoLabel}>Farm ID</div><div className={s.infoValue}>{req.farmId}</div></div>
              <div className={s.infoItem}><div className={s.infoLabel}>Quantity</div><div className={s.infoValue}>{req.quantity} tags</div></div>
              <div className={s.infoItem}><div className={s.infoLabel}>Region</div><div className={s.infoValue}>{req.region}</div></div>
              <div className={s.infoItem}><div className={s.infoLabel}>Requested</div><div className={s.infoValue}>{req.requestedAt}</div></div>
              {req.phone   && <div className={s.infoItem}><div className={s.infoLabel}>Phone</div><div className={s.infoValue}>{req.phone}</div></div>}
              {req.address && <div className={`${s.infoItem} ${s.infoFull}`}><div className={s.infoLabel}>Address</div><div className={s.infoValue}>{req.address}</div></div>}
              {req.notes   && <div className={`${s.infoItem} ${s.infoFull}`}><div className={s.infoLabel}>Notes</div><div className={s.infoValue}>{req.notes}</div></div>}
            </div>

            <div style={{ padding: '0 1.5rem' }}>
              <MapView lat={req.latitude} lon={req.longitude} address={req.address} region={req.region} />
            </div>

            {req.status === 'PENDING' && (
              <div className={s.modalFooter}>
                <label className={s.checkRow}>
                  <input type="checkbox" checked={confirm} onChange={e => setConfirm(e.target.checked)} />
                  <span>I have reviewed this request and confirm it is valid for regional approval</span>
                </label>
                <button className={s.approveBtn} disabled={!confirm || busy} onClick={handleApprove}>
                  <CheckCircle2 size={14} /> {busy ? 'Saving…' : 'Approve — Forward to Ministry'}
                </button>
              </div>
            )}

            {req.status === 'FIELD_APPROVED' && (
              <div className={s.deliveredNote}>
                <CheckCircle2 size={14} /> Regional approval recorded. Awaiting Ministry final approval.
              </div>
            )}

            {req.status === 'APPROVED' && (
              <div className={s.modalFooter}>
                <label className={s.checkRow}>
                  <input type="checkbox" checked={confirm} onChange={e => setConfirm(e.target.checked)} />
                  <span>I confirm the tags have been physically handed to the farmer and the farmer has signed receipt</span>
                </label>
                <button className={s.deliverBtn} disabled={!confirm || busy} onClick={handleDeliver}>
                  <Truck size={14} /> {busy ? 'Saving…' : 'Confirm Delivery'}
                </button>
              </div>
            )}

            {req.status === 'DELIVERED' && (
              <div className={s.deliveredNote}>
                <CheckCircle2 size={14} /> Delivery already confirmed.
              </div>
            )}

            {req.status === 'REJECTED' && (
              <div className={s.rejectedNote}>
                <XCircle size={14} /> This request was rejected.
                {req.notes && <span> Reason: {req.notes}</span>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Request card ────────────────────────────────────────────── */
function RequestCard({ r, onClick }: { r: TagRequest; onClick: () => void }) {
  const st = STATUS_CFG[r.status];
  return (
    <div className={s.card} onClick={onClick}>
      <div className={s.cardTop}>
        <span className={s.cardCode}>{r.reqCode}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className={s.badge} style={{ background: st.bg, color: st.color }}>{st.label}</span>
          <ChevronRight size={14} color="#94a3b8" />
        </div>
      </div>
      <div className={s.cardFarmer}>{r.farmerName} · {r.farmId}</div>
      <div className={s.cardMeta}>
        <span className={s.cardQty}><Package size={12} /> {r.quantity} tags</span>
        <span>{r.region} · {r.requestedAt}</span>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────── */
const CAN_DELIVER = ['FIELD_INSPECTOR', 'SOCIAL_WORKER'];

export function TagRequestsPage(): JSX.Element {
  const { roles, userId, regionCode } = useAuthStore();
  const canDeliver = roles.some(r => CAN_DELIVER.includes(r));

  const [reqs, setReqs]         = useState<TagRequest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<TagRequest | null>(null);
  const [tab, setTab]           = useState<'active' | 'completed'>('active');
  const [search, setSearch]     = useState('');

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('farmer_tag_requests')
      .select('id, premises_id, user_id, quantity, tag_type, reason, contact_person, phone, physical_address, status, requested_at, processed_at, notes, farmer_premises(premises_code, region_code, physical_address)')
      .order('requested_at', { ascending: false });

    if (data) {
      setReqs((data as Record<string, unknown>[]).map(r => {
        const fp = r.farmer_premises as Record<string, string> | null;
        const year = new Date(r.requested_at as string).getFullYear();
        const shortId = (r.id as string).slice(-5).toUpperCase();
        return {
          id:          r.id as string,
          reqCode:     `TAG-REQ-${year}-${shortId}`,
          farmerName:  (r.contact_person as string) ?? '—',
          farmId:      fp?.premises_code ?? '—',
          region:      fp?.region_code   ?? '—',
          quantity:    Number(r.quantity),
          phone:       r.phone as string | undefined,
          address:     (r.physical_address as string) ?? fp?.physical_address ?? undefined,
          latitude:    r.latitude != null ? Number(r.latitude) : undefined,
          longitude:   r.longitude != null ? Number(r.longitude) : undefined,
          status:      r.status as ReqStatus,
          requestedAt: new Date(r.requested_at as string).toISOString().slice(0, 10),
          notes:       r.notes as string | undefined,
        };
      }));
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function handleApprove(id: string) {
    const req = reqs.find(r => r.id === id);
    await supabase
      .from('farmer_tag_requests')
      .update({ status: 'FIELD_APPROVED', processed_at: new Date().toISOString() })
      .eq('id', id);
    setReqs(prev => prev.map(r => r.id === id ? { ...r, status: 'FIELD_APPROVED' } : r));
    setSelected(prev => prev?.id === id ? { ...prev, status: 'FIELD_APPROVED' } : prev);
    if (req) {
      void logActivity({
        category:      'TAGGING',
        level:         'SUCCESS',
        title:         'Tag request field-approved',
        detail:        `${req.quantity} RFID tags approved for ${req.farmerName} — forwarded to Ministry`,
        actorRole:     (roles[0] ?? 'FIELD_INSPECTOR').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
        region:        regionCode,
        referenceCode: req.farmId,
        userId,
      });
    }
  }

  async function handleDeliver(id: string) {
    const req = reqs.find(r => r.id === id);
    await supabase
      .from('farmer_tag_requests')
      .update({ status: 'DELIVERED', processed_at: new Date().toISOString() })
      .eq('id', id);
    setReqs(prev => prev.map(r => r.id === id ? { ...r, status: 'DELIVERED' } : r));
    setSelected(prev => prev?.id === id ? { ...prev, status: 'DELIVERED' } : prev);
    if (req) {
      void logActivity({
        category:      'TAGGING',
        level:         'SUCCESS',
        title:         'Tags delivered to farmer',
        detail:        `${req.quantity} RFID tags delivered to ${req.farmerName}`,
        actorRole:     (roles[0] ?? 'FIELD_INSPECTOR').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
        region:        regionCode,
        referenceCode: req.farmId,
        userId,
      });
    }
  }

  const activeReqs    = reqs.filter(r => ['PENDING', 'FIELD_APPROVED', 'APPROVED'].includes(r.status));
  const completedReqs = reqs.filter(r => r.status === 'DELIVERED' || r.status === 'REJECTED');

  const sourceList = tab === 'active' ? activeReqs : completedReqs;
  const filtered = sourceList.filter(r =>
    !search ||
    r.farmerName.toLowerCase().includes(search.toLowerCase()) ||
    r.reqCode.toLowerCase().includes(search.toLowerCase())
  );

  const pendingCount        = reqs.filter(r => r.status === 'PENDING').length;
  const fieldApprovedCount  = reqs.filter(r => r.status === 'FIELD_APPROVED').length;
  const approvedCount       = reqs.filter(r => r.status === 'APPROVED').length;
  const deliveredCount      = reqs.filter(r => r.status === 'DELIVERED').length;

  return (
    <div className={s.layout}>

      {/* ── Left column ── */}
      <div className={s.leftCol}>

        {/* Summary chips */}
        <div className={s.summaryRow}>
          <div className={s.chip} style={{ background: '#fefce8', color: '#a16207' }}>
            <Clock size={13} /> {loading ? '…' : pendingCount} Pending
          </div>
          <div className={s.chip} style={{ background: '#f0fdf4', color: '#0f7b4d' }}>
            <CheckCircle2 size={13} /> {loading ? '…' : fieldApprovedCount} Regional
          </div>
          <div className={s.chip} style={{ background: '#eff6ff', color: '#1d4ed8' }}>
            <Package size={13} /> {loading ? '…' : approvedCount} Ministry
          </div>
          <div className={s.chip} style={{ background: '#dcfce7', color: '#15803d' }}>
            <Truck size={13} /> {loading ? '…' : deliveredCount} Delivered
          </div>
          <button className={s.refreshBtn} onClick={() => void load()} title="Refresh">
            <RefreshCw size={13} />
          </button>
        </div>

        {/* Tabs */}
        <div className={s.tabBar}>
          <button
            className={`${s.tabBtn}${tab === 'active' ? ' ' + s.tabOn : ''}`}
            onClick={() => setTab('active')}
          >
            Active
            {activeReqs.length > 0 && <span className={s.tabCount}>{activeReqs.length}</span>}
          </button>
          <button
            className={`${s.tabBtn}${tab === 'completed' ? ' ' + s.tabOn : ''}`}
            onClick={() => setTab('completed')}
          >
            Completed
            {completedReqs.length > 0 && <span className={s.tabCount} style={{ background: '#e2e8f0', color: '#64748b' }}>{completedReqs.length}</span>}
          </button>
        </div>

        {/* Search */}
        <div className={s.searchWrap}>
          <Search size={13} className={s.searchIcon} />
          <input className={s.searchInput} placeholder="Search farmer or request code…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* List */}
        {loading ? (
          <div className={s.empty}>Loading requests…</div>
        ) : filtered.length === 0 ? (
          <div className={s.empty}>
            <Package size={36} strokeWidth={1.25} color="#cbd5e1" />
            <span>{tab === 'active' ? 'No active requests' : 'No completed requests'}</span>
          </div>
        ) : (
          <div className={s.list}>
            {filtered.map(r => (
              <RequestCard key={r.id} r={r} onClick={() => setSelected(r)} />
            ))}
          </div>
        )}
      </div>

      {/* ── Right column: process card ── */}
      <div className={s.rightCol}>
        <ProcessCard />
      </div>

      {/* ── Modal ── */}
      {selected && (
        <DeliverModal
          req={selected}
          onClose={() => setSelected(null)}
          onApprove={handleApprove}
          onDeliver={handleDeliver}
        />
      )}
    </div>
  );
}

export default TagRequestsPage;
