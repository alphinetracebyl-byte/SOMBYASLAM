import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tag, CheckCircle, Clock, XCircle, Plus, ChevronLeft, Truck, BellRing, Phone, Trash2, PackageCheck, List } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth.store';
import { RequestModal } from '@/features/tags/TagRequestPage';
import s from './tagInventory.module.css';

const TAGS_PER_BOX = 50;

interface TagRange { start: string; end: string; qty: number; }

function parseTagRanges(notes: string | undefined, quantity: number): TagRange[] {
  if (!notes) return [];
  const match = notes.match(/TAG_SERIALS:([\d|]+)/);
  if (!match) return [];
  const numBoxes = Math.ceil(quantity / TAGS_PER_BOX);
  const firsts   = match[1].split('|');
  const ranges: TagRange[] = [];
  for (let i = 0; i < numBoxes; i++) {
    const n = parseInt(firsts[i] ?? '');
    if (!n || n <= 0) continue;
    const qty = i === numBoxes - 1 ? quantity - i * TAGS_PER_BOX : TAGS_PER_BOX;
    ranges.push({ start: String(n).padStart(6, '0'), end: String(n + qty - 1).padStart(6, '0'), qty });
  }
  return ranges;
}

function stripTagSerials(notes: string | undefined): string {
  if (!notes) return '';
  return notes.replace(/\s*TAG_SERIALS:[\d|]+/, '').trim();
}

interface TagInventory { id: string; available: number; used: number; delivered: number; }

type RequestStatus =
  | 'PENDING' | 'FIELD_APPROVED' | 'APPROVED'
  | 'ALLOCATED' | 'ISSUED' | 'IN_TRANSIT' | 'WITH_FARMER'
  | 'REJECTED' | 'DELIVERED' | 'CANCELLED';

interface TagRequest {
  id: string; quantity: number; tagType: string; reason: string;
  status: RequestStatus;
  requestedAt: string; processedAt?: string; notes?: string;
}

const STATUS_CONFIG: Record<RequestStatus, {
  label: string; color: string; bg: string;
  Icon: React.ElementType; step: number;
}> = {
  PENDING:        { label: 'Pending',     color: '#d97706', bg: '#fef3c7', Icon: Clock,       step: 0 },
  FIELD_APPROVED: { label: 'Approved',   color: '#0f7b4d', bg: '#d1fae5', Icon: CheckCircle, step: 1 },
  APPROVED:       { label: 'Approved',   color: '#0f7b4d', bg: '#d1fae5', Icon: CheckCircle, step: 1 },
  ALLOCATED:      { label: 'Approved',   color: '#0f7b4d', bg: '#d1fae5', Icon: CheckCircle, step: 1 },
  ISSUED:         { label: 'Approved',   color: '#0f7b4d', bg: '#d1fae5', Icon: CheckCircle, step: 1 },
  IN_TRANSIT:     { label: 'On the Way', color: '#d97706', bg: '#fef3c7', Icon: Truck,       step: 2 },
  WITH_FARMER:    { label: 'Delivered',  color: '#16a34a', bg: '#dcfce7', Icon: CheckCircle, step: 3 },
  DELIVERED:      { label: 'Delivered',  color: '#16a34a', bg: '#dcfce7', Icon: CheckCircle, step: 3 },
  REJECTED:       { label: 'Rejected',   color: '#dc2626', bg: '#fee2e2', Icon: XCircle,     step: -1 },
  CANCELLED:      { label: 'Cancelled',  color: '#64748b', bg: '#f1f5f9', Icon: XCircle,     step: -1 },
};

const DELIVERY_STATUSES: RequestStatus[] = ['IN_TRANSIT', 'WITH_FARMER', 'DELIVERED'];

// ── RFID ear-tag icon ─────────────────────────────────────────────────────────

function EarTagIcon({ size = 32 }: { size?: number }) {
  const h = Math.round(size * 46 / 56);
  return (
    <svg viewBox="0 0 56 46" width={size} height={h} style={{ display: 'block', flexShrink: 0 }}>
      <rect x="5" y="8" width="48" height="36" rx="7" fill="#b8860b" opacity="0.22" />
      <rect x="3" y="4" width="48" height="36" rx="7" fill="#f5c428" />
      <rect x="3" y="4" width="48" height="13" rx="7" fill="rgba(255,255,255,0.22)" />
      <circle cx="10" cy="9" r="4.5" fill="#d4a017" />
      <circle cx="10" cy="9" r="2.5" fill="#5c3d00" />
      <text x="32" y="20" textAnchor="middle" fontSize="5.5" fontWeight="700" fill="#7a5000" letterSpacing="0.8" fontFamily="sans-serif">SO NUMBER</text>
      <text x="32" y="30" textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#3d2500" fontFamily="monospace">RFID TAG</text>
      <path d="M46 17 Q50.5 22 46 27" stroke="#7a5000" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      <path d="M49 14 Q56 22 49 30" stroke="#7a5000" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.5"/>
    </svg>
  );
}

// ── Status timeline ───────────────────────────────────────────────────────────

function fmt(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

function StatusTrack({ r }: { r: TagRequest }) {
  const step = STATUS_CONFIG[r.status].step;

  if (step === -1) {
    return (
      <div className={s.rejectedPill}>
        <XCircle size={12} strokeWidth={2.5} /> Rejected
        {r.processedAt && <span className={s.rejectedDate}>{fmt(r.processedAt)}</span>}
      </div>
    );
  }

  const stages = [
    { label: 'Submitted',  done: step >= 0, current: step === 0, date: fmt(r.requestedAt) },
    { label: 'Approved',   done: step >= 1, current: step === 1, date: step >= 1 ? fmt(r.processedAt) : null },
    { label: 'In Transit', done: step >= 2, current: step === 2, date: step >= 2 ? fmt(r.processedAt) : null },
    { label: 'Delivered',  done: step >= 3, current: step === 3, date: step >= 3 ? fmt(r.processedAt) : null },
  ];

  return (
    <div className={s.trackWrap}>
      <div className={s.trackRow}>
        {stages.map((st, i) => (
          <div key={st.label} className={s.trackStep}>
            {i > 0 && <div className={`${s.trackLine} ${st.done ? s.trackLineDone : ''}`} />}
            <div className={[
              s.trackDot,
              st.done && !st.current ? s.trackDotDone : '',
              st.current ? s.trackDotCurrent : '',
            ].join(' ')} />
            <span className={`${s.trackLabel} ${st.done ? s.trackLabelDone : ''}`}>{st.label}</span>
            <span className={s.trackDate}>{st.date ?? ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Request card ──────────────────────────────────────────────────────────────

function RequestCard({ r, reminded, onRemind, onCancelled, onReceived, premisesDbId, inventory }: {
  r: TagRequest; reminded: boolean;
  onRemind: () => void; onCancelled: () => void; onReceived: () => void;
  premisesDbId: string; inventory: TagInventory | null;
}) {
  const cfg = STATUS_CONFIG[r.status];
  const canRemind   = ['PENDING', 'FIELD_APPROVED', 'APPROVED', 'ALLOCATED', 'ISSUED'].includes(r.status);
  const canCancel   = r.status === 'PENDING';
  const canReceive  = r.status === 'IN_TRANSIT';
  const isDelivery  = DELIVERY_STATUSES.includes(r.status);
  const displayNotes = stripTagSerials(r.notes);

  const [confirming,    setConfirming]    = useState(false);
  const [cancelling,    setCancelling]    = useState(false);
  const [confirmRcv,    setConfirmRcv]    = useState(false);
  const [receiving,     setReceiving]     = useState(false);

  async function handleCancel() {
    setCancelling(true);
    await supabase.from('farmer_tag_requests').update({ status: 'CANCELLED' }).eq('id', r.id);
    setCancelling(false);
    setConfirming(false);
    onCancelled();
  }

  async function handleReceive() {
    setReceiving(true);
    await supabase.from('farmer_tag_requests').update({
      status:       'WITH_FARMER',
      processed_at: new Date().toISOString(),
    }).eq('id', r.id);

    if (inventory) {
      await supabase.from('farmer_tag_inventory').update({
        available: (inventory.available ?? 0) + r.quantity,
        delivered: (inventory.delivered ?? 0) + r.quantity,
      }).eq('id', inventory.id);
    } else if (premisesDbId) {
      await supabase.from('farmer_tag_inventory').insert({
        premises_id: premisesDbId,
        available:   r.quantity,
        used:        0,
        delivered:   r.quantity,
      });
    }

    setReceiving(false);
    setConfirmRcv(false);
    onReceived();
  }

  const batchCode = `TAG-${new Date(r.requestedAt).getFullYear()}-${r.id.slice(-6).toUpperCase()}`;
  const ranges    = parseTagRanges(r.notes, r.quantity);

  return (
    <div className={s.reqCard}>

      {/* Batch header */}
      <div className={s.batchHeader}>
        <div className={s.batchHeaderLeft}>
          <span className={s.batchOrg}>Batch ID</span>
          <span className={s.batchCode}>{batchCode}</span>
        </div>
        <span className={s.statusBadge} style={{ color: cfg.color, background: cfg.bg }}>
          <cfg.Icon size={10} strokeWidth={2.5} /> {cfg.label}
        </span>
      </div>

      {/* Quantity + type */}
      <div className={s.batchBody}>
        <div className={s.cardLeft}>
          <EarTagIcon size={40} />
          <div className={s.cardQtyBlock}>
            <span className={s.cardQty}>{r.quantity}</span>
            <span className={s.cardType}>{r.tagType.replace('_', ' ')} tags</span>
          </div>
        </div>
      </div>

      {/* Serial ranges (if assigned) */}
      {ranges.length > 0 && (
        <div className={s.rangesWrap}>
          {ranges.map((rng, i) => (
            <div key={i} className={s.rangeRow}>
              <span className={s.rangeBoxLabel}>Box {i + 1}</span>
              <span className={s.rangeVal}>{rng.start}</span>
              <span className={s.rangeArrow}>→</span>
              <span className={s.rangeVal}>{rng.end}</span>
              <span className={s.rangeQty}>{rng.qty} tags</span>
            </div>
          ))}
        </div>
      )}

      {/* Divider */}
      <div className={s.batchDivider} />

      {/* Status timeline */}
      <div className={s.batchTrack}>
        <StatusTrack r={r} />
      </div>

      {/* Reason / delivery notes */}
      {(r.reason || (isDelivery && displayNotes)) && (
        <>
          <div className={s.batchDivider} />
          <div className={s.batchInfo}>
            {r.reason && <div className={s.reqReason}>{r.reason}</div>}
            {isDelivery && displayNotes && (
              <div className={s.deliveryContact}>
                <Phone size={11} strokeWidth={2} /><span>{displayNotes}</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Receive confirmation */}
      {confirmRcv && (
        <div className={s.receiveConfirm}>
          <PackageCheck size={15} strokeWidth={2} style={{ color: '#16a34a' }} />
          <span>Confirm you have received {r.quantity} tags?</span>
          <div className={s.cancelConfirmBtns}>
            <button className={s.receiveYesBtn} disabled={receiving} onClick={() => void handleReceive()}>
              {receiving ? 'Saving…' : 'Yes, Received'}
            </button>
            <button className={s.cancelNoBtn} onClick={() => setConfirmRcv(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Cancel confirmation */}
      {confirming && (
        <div className={s.cancelConfirm}>
          <span>Cancel this request?</span>
          <div className={s.cancelConfirmBtns}>
            <button className={s.cancelYesBtn} disabled={cancelling} onClick={() => void handleCancel()}>
              {cancelling ? 'Cancelling…' : 'Yes, Cancel'}
            </button>
            <button className={s.cancelNoBtn} onClick={() => setConfirming(false)}>Keep</button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className={s.batchFooter}>
        <span className={s.reqDate}>
          {new Date(r.requestedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {canCancel && !confirming && !confirmRcv && (
            <button className={s.cancelBtn} onClick={() => setConfirming(true)}>
              <Trash2 size={11} strokeWidth={2} /> Cancel
            </button>
          )}
          {canReceive && !confirming && !confirmRcv && (
            <button className={s.receiveBtn} onClick={() => setConfirmRcv(true)}>
              <PackageCheck size={12} strokeWidth={2} /> Receive Tags
            </button>
          )}
          {canRemind && !confirming && !confirmRcv && (
            reminded
              ? <span className={s.remindSent}><CheckCircle size={12} strokeWidth={2.5} /> Reminder sent</span>
              : <button className={s.remindBtn} onClick={onRemind}>
                  <BellRing size={12} strokeWidth={2} /> Remind
                </button>
          )}
        </div>
      </div>

    </div>
  );
}

// ── My Tags view ──────────────────────────────────────────────────────────────

interface TagRecord {
  serial: string; serialNum: number;
  batchCode: string; box: number; tagType: string;
  tagStatus: string;       // ASSIGNED | IN_STOCK | IN_TRANSIT | PENDING | ...
  receivedAt: string | undefined;
  animalCode: string | undefined;
  animalId: string | undefined;
  species: string | undefined;
  breed: string | undefined;
}

const TAG_STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  ASSIGNED:   { label: 'On Animal',  color: '#7c3aed', bg: '#f5f3ff' },
  IN_STOCK:   { label: 'In Stock',   color: '#16a34a', bg: '#f0fdf4' },
  IN_TRANSIT: { label: 'In Transit', color: '#d97706', bg: '#fef3c7' },
  COMING:     { label: 'Coming',     color: '#0369a1', bg: '#f0f9ff' },
};

const PAGE_SIZE = 100;

function fmtTagDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtTagType(t: string) {
  return t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

interface MyTagStats { total: number; inStock: number; assigned: number; pending: number; }

function MyTagsView({ premisesDbId, premisesCode, hideStats, onStats }: {
  premisesDbId: string;
  premisesCode: string | undefined;
  hideStats?: boolean;
  onStats?: (s: MyTagStats) => void;
}) {
  const [loading,      setLoading]      = useState(true);
  const [allTags,      setAllTags]      = useState<TagRecord[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [page,         setPage]         = useState(0);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    void loadTags();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [premisesDbId]);

  async function loadTags() {
    if (!premisesDbId || !premisesCode) return;
    setLoading(true);

    // 1. Tag requests for this premises (serial ranges + status)
    const { data: reqData } = await supabase
      .from('farmer_tag_requests')
      .select('id, quantity, tag_type, status, processed_at, notes')
      .eq('premises_id', premisesDbId)
      .not('status', 'in', '(REJECTED,CANCELLED)')
      .order('processed_at', { ascending: false });

    // 2. Batches for this premises → animal tag serials
    const { data: batchData } = await supabase
      .from('batches')
      .select('id')
      .eq('premises_code', premisesCode);

    const batchIds = (batchData ?? []).map((b: Record<string, unknown>) => b.id as string);

    const animalBySerial = new Map<string, { animal_code: string; animal_id: string; species: string; breed: string }>();
    if (batchIds.length > 0) {
      const { data: animalData } = await supabase
        .from('animals')
        .select('id, animal_code, tag_serial, species, breed')
        .in('batch_id', batchIds)
        .not('tag_serial', 'is', null);

      for (const a of (animalData ?? []) as Record<string, string>[]) {
        if (a.tag_serial) {
          animalBySerial.set(a.tag_serial, {
            animal_code: a.animal_code ?? '',
            animal_id:   a.id ?? '',
            species:     a.species ?? '',
            breed:       a.breed   ?? '',
          });
        }
      }
    }

    // 3. Expand serial ranges → individual tag rows
    const rows: TagRecord[] = [];
    let pending = 0;

    for (const r of (reqData ?? []) as Record<string, unknown>[]) {
      const ranges = parseTagRanges(r.notes as string | undefined, Number(r.quantity));
      const batchCode = `TAG-${new Date(r.processed_at as string ?? Date.now()).getFullYear()}-${(r.id as string).slice(-6).toUpperCase()}`;

      if (ranges.length === 0) {
        pending += Number(r.quantity);
        continue;
      }

      const deliveryStatus = String(r.status);
      ranges.forEach((rng, boxIdx) => {
        const start = parseInt(rng.start, 10);
        const end   = parseInt(rng.end,   10);
        for (let n = start; n <= end; n++) {
          const serial = String(n).padStart(6, '0');
          const animal = animalBySerial.get(serial);
          let tagStatus = 'IN_STOCK';
          if (animal) tagStatus = 'ASSIGNED';
          else if (['IN_TRANSIT'].includes(deliveryStatus)) tagStatus = 'IN_TRANSIT';
          else if (['PENDING', 'FIELD_APPROVED', 'APPROVED', 'ALLOCATED', 'ISSUED'].includes(deliveryStatus)) tagStatus = 'COMING';

          rows.push({
            serial, serialNum: n,
            batchCode, box: boxIdx + 1,
            tagType:     String(r.tag_type ?? ''),
            tagStatus,
            receivedAt:  r.processed_at as string | undefined,
            animalCode:  animal?.animal_code,
            animalId:    animal?.animal_id,
            species:     animal?.species,
            breed:       animal?.breed,
          });
        }
      });
    }

    rows.sort((a, b) => a.serialNum - b.serialNum);
    setAllTags(rows);
    setPendingCount(pending);
    setLoading(false);
    const inStk  = rows.filter(t => t.tagStatus === 'IN_STOCK').length;
    const asgnd  = rows.filter(t => t.tagStatus === 'ASSIGNED').length;
    onStats?.({ total: rows.length, inStock: inStk, assigned: asgnd, pending });
  }

  const filtered = useMemo(() => {
    let res = allTags;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      res = res.filter(t =>
        t.serial.includes(q) ||
        t.batchCode.toLowerCase().includes(q) ||
        (t.animalCode ?? '').toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'ALL') res = res.filter(t => t.tagStatus === statusFilter);
    return res;
  }, [allTags, search, statusFilter]);

  useEffect(() => { setPage(0); }, [search, statusFilter]);

  if (loading) {
    return <div className={s.tabLoading}>Loading tags…</div>;
  }

  if (allTags.length === 0 && pendingCount === 0) {
    return (
      <div className={s.emptyState} style={{ marginTop: '1.5rem' }}>
        <EarTagIcon size={48} />
        <p>No tags yet</p>
        <span>Tags appear here once the Ministry assigns serial numbers to your requests</span>
      </div>
    );
  }

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const pageRows  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const inStock  = allTags.filter(t => t.tagStatus === 'IN_STOCK').length;
  const assigned = allTags.filter(t => t.tagStatus === 'ASSIGNED').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>

      {/* Summary bar — hidden in embedded mode (chips are shown in parent tab bar) */}
      {!hideStats && <div className={s.tagSummaryBar}>
        <div className={s.tagSummaryItem}>
          <span className={s.tagSummaryValue}>{allTags.length.toLocaleString()}</span>
          <span className={s.tagSummaryLabel}>Total Tags</span>
        </div>
        <div className={s.tagSummaryItem}>
          <span className={s.tagSummaryValue} style={{ color: '#16a34a' }}>{inStock.toLocaleString()}</span>
          <span className={s.tagSummaryLabel}>In Stock</span>
        </div>
        <div className={s.tagSummaryItem}>
          <span className={s.tagSummaryValue} style={{ color: '#7c3aed' }}>{assigned.toLocaleString()}</span>
          <span className={s.tagSummaryLabel}>On Animals</span>
        </div>
        {pendingCount > 0 && (
          <div className={s.tagSummaryItem}>
            <span className={s.tagSummaryValue} style={{ color: '#d97706' }}>{pendingCount.toLocaleString()}</span>
            <span className={s.tagSummaryLabel}>Awaiting Serial</span>
          </div>
        )}
      </div>}

      <div className={s.myTagsTable}>

        <div className={s.myTagsToolbar}>
          <input
            className={s.myTagsSearch}
            placeholder="Search serial, batch or animal..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className={s.myTagsFilter}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All statuses</option>
            <option value="IN_STOCK">In Stock</option>
            <option value="ASSIGNED">On Animal</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="COMING">Coming</option>
          </select>
          <span className={s.myTagsCount}>{filtered.length.toLocaleString()} tags</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className={s.tagsTable}>
            <thead>
              <tr>
                <th>Tag Serial</th>
                <th>Batch</th>
                <th>Box</th>
                <th>Type</th>
                <th>Status</th>
                <th>Animal</th>
                <th>Species</th>
                <th>Breed</th>
                <th>Received</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className={s.tagsTableEmpty}>No tags match your search</td>
                </tr>
              ) : pageRows.map(t => {
                const badge = TAG_STATUS_BADGE[t.tagStatus] ?? { label: t.tagStatus, color: '#64748b', bg: '#f1f5f9' };
                return (
                  <tr key={t.serial}>
                    <td><span className={s.tagSerial}>{t.serial}</span></td>
                    <td><span className={s.tagBatch}>{t.batchCode}</span></td>
                    <td className={s.tagMeta}>Box {t.box}</td>
                    <td className={s.tagMeta}>{fmtTagType(t.tagType)}</td>
                    <td>
                      <span className={s.statusBadge} style={{ color: badge.color, background: badge.bg }}>
                        {badge.label}
                      </span>
                    </td>
                    <td className={s.tagMeta}>{t.animalCode ?? '—'}</td>
                    <td className={s.tagMeta}>{t.species ?? '—'}</td>
                    <td className={s.tagMeta}>{t.breed ?? '—'}</td>
                    <td className={s.tagDate}>{fmtTagDate(t.receivedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {pageCount > 1 && (
          <div className={s.myTagsPager}>
            <button
              className={s.pagerBtn}
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >← Prev</button>
            <span className={s.pagerInfo}>
              Page {page + 1} of {pageCount} · showing {pageRows.length} of {filtered.length.toLocaleString()} tags
            </span>
            <button
              className={s.pagerBtn}
              onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
              disabled={page === pageCount - 1}
            >Next →</button>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface TagInventoryPageProps {
  embedded?: boolean;
  initialTab?: 'requests' | 'tags';
  hideSubTabs?: boolean;
  prefetchedRequests?: { id: string; quantity: number; tagType: string; reason: string; status: string; requestedAt: string; processedAt?: string; notes?: string; }[];
  prefetchedInventory?: { available: number; used: number; delivered: number; ordered?: number };
  prefetchedPremisesDbId?: string;
  prefetchedPremisesCode?: string;
  onTagStats?: (s: MyTagStats) => void;
}

export function TagInventoryPage({
  embedded,
  initialTab,
  hideSubTabs,
  prefetchedRequests,
  prefetchedInventory,
  prefetchedPremisesDbId,
  prefetchedPremisesCode,
  onTagStats,
}: TagInventoryPageProps = {}): JSX.Element {
  const { code: paramCode } = useParams<{ code: string }>();
  const code = prefetchedPremisesCode ?? paramCode;
  const navigate  = useNavigate();
  const { userId } = useAuthStore();

  const [premisesName, setPremisesName]           = useState('');
  const [premisesAddress, setPremisesAddress]     = useState('');
  const [premisesRegionCode, setPremisesRegionCode] = useState('');
  const [premisesLat, setPremisesLat]             = useState<number | null>(null);
  const [premisesLon, setPremisesLon]             = useState<number | null>(null);
  const [premisesDbId, setPremisesDbId]           = useState(prefetchedPremisesDbId ?? '');
  const [inventory, setInventory]   = useState<TagInventory | null>(null);
  const [requests, setRequests]     = useState<TagRequest[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [remindedIds, setRemindedIds] = useState<Set<string>>(new Set());
  const [tab, setTab]               = useState<'requests' | 'tags'>(initialTab ?? 'requests');

  useEffect(() => {
    if (!prefetchedRequests) return;
    setRequests(prefetchedRequests.map(r => ({ ...r, status: r.status as RequestStatus })));
    if (prefetchedInventory) setInventory({ id: '', available: prefetchedInventory.available, used: prefetchedInventory.used, delivered: prefetchedInventory.delivered });
    if (prefetchedPremisesDbId) setPremisesDbId(prefetchedPremisesDbId);
    setLoading(false);
  }, [prefetchedRequests, prefetchedInventory, prefetchedPremisesDbId]);

  const loadData = useCallback(async () => {
    if (prefetchedRequests) return; // already provided by parent
    if (!code || !userId) return;
    const { data: prem } = await supabase
      .from('farmer_premises')
      .select('id, premises_name, physical_address, region_code, gps_latitude, gps_longitude')
      .eq('premises_code', code).eq('user_id', userId).single();

    if (!prem) { setLoading(false); return; }
    const d = prem as Record<string, unknown>;
    setPremisesName(d.premises_name as string);
    setPremisesAddress((d.physical_address as string) ?? (d.region_code as string) ?? '');
    setPremisesRegionCode((d.region_code as string) ?? '');
    setPremisesLat(d.gps_latitude != null ? Number(d.gps_latitude) : null);
    setPremisesLon(d.gps_longitude != null ? Number(d.gps_longitude) : null);
    setPremisesDbId(d.id as string);

    const [invRes, reqRes] = await Promise.all([
      supabase.from('farmer_tag_inventory').select('*').eq('premises_id', d.id as string).maybeSingle(),
      supabase.from('farmer_tag_requests')
        .select('id, quantity, tag_type, reason, status, requested_at, processed_at, notes')
        .eq('premises_id', d.id as string)
        .order('requested_at', { ascending: false }),
    ]);

    if (invRes.data) {
      const inv = invRes.data as Record<string, unknown>;
      setInventory({ id: inv.id as string, available: Number(inv.available), used: Number(inv.used), delivered: Number(inv.delivered) });
    }
    if (reqRes.data) {
      setRequests((reqRes.data as Record<string, unknown>[]).map(r => ({
        id: r.id as string, quantity: Number(r.quantity),
        tagType: r.tag_type as string,
        reason: (r.reason as string) ?? '',
        status: r.status as RequestStatus,
        requestedAt: r.requested_at as string,
        processedAt: r.processed_at as string | undefined,
        notes: r.notes as string | undefined,
      })));
    }
    setLoading(false);
  }, [code, userId, prefetchedRequests]);

  useEffect(() => { void loadData(); }, [loadData]);

  function remind(id: string) {
    setRemindedIds(prev => new Set([...prev, id]));
    setTimeout(() => {
      setRemindedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    }, 3000);
  }

  const ordered = requests
    .filter(r => ['PENDING', 'FIELD_APPROVED', 'APPROVED', 'ALLOCATED', 'ISSUED'].includes(r.status))
    .reduce((sum, r) => sum + r.quantity, 0);

  const stats = [
    { label: 'Available', value: inventory?.available ?? 0 },
    { label: 'Used',      value: inventory?.used      ?? 0 },
    { label: 'Delivered', value: inventory?.delivered ?? 0 },
    { label: 'On Order',  value: ordered              },
  ];

  if (loading) {
    return (
      <div className={s.page}>
        {[52, 88, 72, 120, 120, 120].map((h, i) => (
          <div key={i} className={s.skeleton} style={{ height: h }} />
        ))}
      </div>
    );
  }

  return (
    <div className={s.page}>

      {/* Top bar — hidden when embedded inside another page */}
      {!embedded && (
        <div className={s.topBar}>
          <div className={s.topBarLeft}>
            <button className={s.backBtn} onClick={() => navigate(`/premises/${code}`)}>
              <ChevronLeft size={15} /> Back to Farms
            </button>
            <div className={s.topBarPremises}>
              <span className={s.topBarCode}>{code}</span>
              <span className={s.topBarName}>{premisesName}</span>
            </div>
          </div>
          <div className={s.topBarRight}>
            {stats.map(st => (
              <div key={st.label} className={s.statCard}>
                <span className={s.statValue}>{st.value}</span>
                <span className={s.statLabel}>{st.label}</span>
              </div>
            ))}
            <button className={s.requestBtn} onClick={() => setShowModal(true)}>
              <Plus size={14} strokeWidth={2.5} /> Request Tags
            </button>
          </div>
        </div>
      )}

      {/* Tab bar — hidden when embedded; parent tab handles navigation */}
      {!embedded && (
        <div className={s.tabBar}>
          <button className={`${s.tabBtn}${tab === 'requests' ? ' ' + s.tabBtnActive : ''}`} onClick={() => setTab('requests')}>
            <Tag size={13} /> Tag Requests
            {requests.length > 0 && <span className={s.badge}>{requests.length}</span>}
          </button>
          <button className={`${s.tabBtn}${tab === 'tags' ? ' ' + s.tabBtnActive : ''}`} onClick={() => setTab('tags')}>
            <List size={13} /> My Tags
          </button>
        </div>
      )}

      {/* Content */}
      <div className={s.requestsWrap}>
        {/* Embedded mode: show a compact header row with actions */}
        {embedded && !hideSubTabs && (
          <div className={s.embeddedHeader}>
            <div className={s.embeddedActions}>
              <button
                className={`${s.tabBtn}${tab === 'requests' ? ' ' + s.tabBtnActive : ''}`}
                onClick={() => setTab('requests')}
              >
                <Tag size={13} /> Tag Requests
                {requests.length > 0 && <span className={s.badge}>{requests.length}</span>}
              </button>
              <button
                className={`${s.tabBtn}${tab === 'tags' ? ' ' + s.tabBtnActive : ''}`}
                onClick={() => setTab('tags')}
              >
                <List size={13} /> My Tags
              </button>
            </div>
            <button className={s.requestBtn} onClick={() => setShowModal(true)}>
              <Plus size={14} strokeWidth={2.5} /> Request Tags
            </button>
          </div>
        )}

        {tab === 'requests' && (
          requests.length === 0 ? (
            <div className={s.emptyState}>
              <EarTagIcon size={56} />
              <p>No tag requests yet</p>
              <span>Request tags from the Ministry to get started</span>
              <button className={s.requestBtn} onClick={() => setShowModal(true)}>
                <Plus size={14} /> Request Tags
              </button>
            </div>
          ) : (
            <div className={s.requestList}>
              {requests.map(r => (
                <RequestCard
                  key={r.id}
                  r={r}
                  reminded={remindedIds.has(r.id)}
                  onRemind={() => remind(r.id)}
                  onCancelled={() => void loadData()}
                  onReceived={() => void loadData()}
                  premisesDbId={premisesDbId}
                  inventory={inventory}
                />
              ))}
            </div>
          )
        )}

        {tab === 'tags' && (
          <MyTagsView premisesDbId={premisesDbId} premisesCode={code} hideStats={embedded} onStats={onTagStats} />
        )}
      </div>

      {showModal && (
        <RequestModal
          onClose={() => setShowModal(false)}
          onSuccess={() => void loadData()}
          premisesCode={code}
          premisesAddress={premisesAddress}
          premisesRegionCode={premisesRegionCode}
          premisesLat={premisesLat}
          premisesLon={premisesLon}
          premisesId={premisesDbId}
        />
      )}
    </div>
  );
}

export default TagInventoryPage;
