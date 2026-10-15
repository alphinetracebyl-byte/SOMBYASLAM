import { useState } from 'react';
import {
  Tag, CheckCircle2, Search, ChevronDown,
  Radio, Clipboard, AlertCircle,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import s from './tagging.module.css';

/* ── Types ───────────────────────────────────────────────────── */
type TagType   = 'RFID' | 'EAR_TAG';
type AppStatus = 'PENDING' | 'APPLIED' | 'FAILED';

interface AnimalRecord {
  id: string;
  animalId: string;
  species: string;
  breed: string;
  farmerName: string;
  farmId: string;
  allocatedRange: string;
  tagType: TagType;
  assignedQty: number;
  region: string;
  status: AppStatus;
  date: string;
}

interface Application {
  id: string;
  animalId: string;
  tagNo: string;
  tagType: TagType;
  appliedBy: string;
  appliedAt: string;
  farmerName: string;
  notes?: string;
}

/* ── Mock data ───────────────────────────────────────────────── */
const MOCK_ANIMALS: AnimalRecord[] = [
  { id:'1', animalId:'SOB-2026-0041', species:'Cattle', breed:'Somali Zebu', farmerName:'Hassan Abdi',   farmId:'SOM-BAY-001', allocatedRange:'RFID-2026-05011 → 05020', tagType:'RFID',    assignedQty:1, region:'Bay',        status:'PENDING', date:'2026-08-03' },
  { id:'2', animalId:'SOB-2026-0042', species:'Cattle', breed:'Somali Zebu', farmerName:'Hassan Abdi',   farmId:'SOM-BAY-001', allocatedRange:'RFID-2026-05011 → 05020', tagType:'RFID',    assignedQty:1, region:'Bay',        status:'PENDING', date:'2026-08-03' },
  { id:'3', animalId:'GOT-2026-0015', species:'Goat',   breed:'Somali Goat', farmerName:'Fadumo Said',   farmId:'SOM-MOG-007', allocatedRange:'EAR-2026-20001 → 20030',  tagType:'EAR_TAG', assignedQty:1, region:'Mogadishu',  status:'PENDING', date:'2026-08-02' },
  { id:'4', animalId:'SHP-2026-0008', species:'Sheep',  breed:'Somali Sheep',farmerName:'Fadumo Said',   farmId:'SOM-MOG-007', allocatedRange:'EAR-2026-20001 → 20030',  tagType:'EAR_TAG', assignedQty:1, region:'Mogadishu',  status:'PENDING', date:'2026-08-02' },
  { id:'5', animalId:'CAM-2026-0003', species:'Camel',  breed:'Somali Camel',farmerName:'Omar Hassan',   farmId:'SOM-PNT-022', allocatedRange:'EAR-2026-20001 → 20030',  tagType:'EAR_TAG', assignedQty:1, region:'Puntland',   status:'APPLIED', date:'2026-08-01' },
  { id:'6', animalId:'SOB-2026-0033', species:'Cattle', breed:'Somali Zebu', farmerName:'Ali Mohamed',   farmId:'SOM-BAY-009', allocatedRange:'EAR-2026-10001 → 10025',  tagType:'EAR_TAG', assignedQty:1, region:'Bay',        status:'APPLIED', date:'2026-07-31' },
  { id:'7', animalId:'GOT-2026-0019', species:'Goat',   breed:'Somali Goat', farmerName:'Halimo Nur',    farmId:'SOM-BAK-003', allocatedRange:'RFID-2026-04001 → 04015', tagType:'RFID',    assignedQty:1, region:'Bakool',     status:'FAILED',  date:'2026-07-30' },
];

const MOCK_APPLICATIONS: Application[] = [
  { id:'a1', animalId:'CAM-2026-0003', tagNo:'EAR-2026-20015', tagType:'EAR_TAG', appliedBy:'Field Inspector', appliedAt:'2026-08-01 09:42', farmerName:'Omar Hassan' },
  { id:'a2', animalId:'SOB-2026-0033', tagNo:'EAR-2026-10008', tagType:'EAR_TAG', appliedBy:'Field Inspector', appliedAt:'2026-07-31 14:20', farmerName:'Ali Mohamed' },
  { id:'a3', animalId:'GOT-2026-0007', tagNo:'RFID-2026-03991', tagType:'RFID',   appliedBy:'Social Worker',   appliedAt:'2026-07-29 11:05', farmerName:'Said Ahmed', notes:'Tag replaced — old EAR damaged' },
];

const STATUS_STYLE: Record<AppStatus, { bg: string; color: string; label: string }> = {
  PENDING: { bg: '#fefce8', color: '#a16207', label: 'Pending'  },
  APPLIED: { bg: '#f0fdf4', color: '#16a34a', label: 'Applied'  },
  FAILED:  { bg: '#fef2f2', color: '#dc2626', label: 'Failed'   },
};

const SPECIES = ['All', 'Cattle', 'Goat', 'Sheep', 'Camel'];
const CAN_APPLY = ['FIELD_INSPECTOR', 'SOCIAL_WORKER'];

/* ── Apply tag form ──────────────────────────────────────────── */
const RFID_RE = /^RFID-\d{4}-\d{5}$/i;
const EAR_RE  = /^EAR-\d{4}-\d{5}$/i;

function ApplyTagForm({ animal, onSuccess }: { animal: AnimalRecord; onSuccess: () => void }) {
  const [tagNo, setTagNo]     = useState('');
  const [notes, setNotes]     = useState('');
  const [confirm, setConfirm] = useState(false);
  const [done, setDone]       = useState(false);

  const pattern  = animal.tagType === 'RFID' ? RFID_RE : EAR_RE;
  const formatOk = tagNo.trim() === '' || pattern.test(tagNo.trim());
  const canSubmit = tagNo.trim() !== '' && formatOk && confirm;

  if (done) {
    return (
      <div className={s.applySuccess}>
        <CheckCircle2 size={32} color="#16a34a" strokeWidth={1.75} />
        <div className={s.successTitle}>Tag Applied</div>
        <div className={s.successSub}>
          <strong>{tagNo}</strong> recorded on animal <strong>{animal.animalId}</strong>
        </div>
        <button className={s.doneBtn} onClick={onSuccess}>Done</button>
      </div>
    );
  }

  return (
    <div className={s.applyForm}>
      <div className={s.applyFormTitle}>
        {animal.tagType === 'RFID' ? <><Radio size={14} /> Apply RFID Tag</> : <><Tag size={14} /> Apply Ear Tag</>}
      </div>

      <div className={s.animalSummary}>
        <div className={s.aRow}><span>Animal ID</span><strong>{animal.animalId}</strong></div>
        <div className={s.aRow}><span>Species</span><strong>{animal.species} — {animal.breed}</strong></div>
        <div className={s.aRow}><span>Farmer</span><strong>{animal.farmerName}</strong></div>
        <div className={s.aRow}><span>Allocated Range</span><strong>{animal.allocatedRange}</strong></div>
      </div>

      <div className={s.field}>
        <label className={s.label}>Tag Number <span className={s.req}>*</span></label>
        <div className={s.tagInputWrap}>
          <input
            className={s.input}
            value={tagNo}
            onChange={e => setTagNo(e.target.value)}
            placeholder={animal.tagType === 'RFID' ? 'RFID-2026-XXXXX' : 'EAR-2026-XXXXX'}
          />
          {animal.tagType === 'RFID' && (
            <button className={s.scanBtn} title="Scan RFID"><Radio size={14} /></button>
          )}
        </div>
        {!formatOk && tagNo.trim() !== '' && (
          <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.25rem' }}>
            {animal.tagType === 'RFID' ? 'Format: RFID-YYYY-NNNNN' : 'Format: EAR-YYYY-NNNNN'}
          </div>
        )}
        <div className={s.hint}>Enter the tag number from the allocated range above</div>
      </div>

      <div className={s.field}>
        <label className={s.label}>Notes (optional)</label>
        <textarea className={s.textarea} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any observations about tag application…" />
      </div>

      <label className={s.checkRow}>
        <input type="checkbox" checked={confirm} onChange={e => setConfirm(e.target.checked)} />
        <span>I confirm the tag is physically attached and the animal is correctly identified</span>
      </label>

      <button className={s.applyBtn} disabled={!canSubmit} onClick={() => setDone(true)}>
        <CheckCircle2 size={14} /> Record Tag Application
      </button>
    </div>
  );
}

/* ── Animal card ─────────────────────────────────────────────── */
function AnimalCard({ a, selected, onClick }: { a: AnimalRecord; selected: boolean; onClick: () => void }) {
  const st = STATUS_STYLE[a.status];
  return (
    <div className={`${s.animalCard}${selected ? ' ' + s.animalCardSelected : ''}`} onClick={onClick}>
      <div className={s.acTop}>
        <span className={s.acId}>{a.animalId}</span>
        <span className={s.badge} style={{ background: st.bg, color: st.color }}>{st.label}</span>
      </div>
      <div className={s.acMeta}>{a.species} · {a.breed}</div>
      <div className={s.acFarmer}>{a.farmerName} · {a.farmId}</div>
      <div className={s.acTag}>
        {a.tagType === 'RFID' ? <Radio size={11} /> : <Tag size={11} />}
        {a.tagType === 'RFID' ? 'RFID' : 'Ear Tag'} · {a.allocatedRange}
      </div>
    </div>
  );
}

/* ── Right panel ─────────────────────────────────────────────── */
function RightPanel({ selected, canApply, onSuccess }: {
  selected: AnimalRecord | null;
  canApply: boolean;
  onSuccess: () => void;
}) {
  if (!selected) {
    return (
      <div className={s.emptyRight}>
        <Clipboard size={40} strokeWidth={1.25} color="#c8d8ef" />
        <div className={s.emptyRightTitle}>Select an animal</div>
        <div className={s.emptyRightSub}>Choose an animal from the list to record a tag application</div>
      </div>
    );
  }

  const st = STATUS_STYLE[selected.status];
  return (
    <div className={s.rightCard}>
      <div className={s.rightHeader}>
        <div>
          <div className={s.rightAnimalId}>{selected.animalId}</div>
          <span className={s.badge} style={{ background: st.bg, color: st.color }}>{st.label}</span>
        </div>
        {selected.status === 'APPLIED' && (
          <div className={s.alreadyApplied}><CheckCircle2 size={14} /> Tag already applied</div>
        )}
      </div>

      {selected.status === 'FAILED' && (
        <div className={s.failedNote}>
          <AlertCircle size={14} /> Previous application failed. Re-attempt below.
        </div>
      )}

      {(selected.status === 'PENDING' || selected.status === 'FAILED') && canApply && (
        <ApplyTagForm animal={selected} onSuccess={onSuccess} />
      )}

      {!canApply && selected.status === 'PENDING' && (
        <div className={s.roleNote}>
          <AlertCircle size={13} /> Tag application is performed by Field Inspectors and Social Workers.
        </div>
      )}
    </div>
  );
}

/* ── Recent applications ─────────────────────────────────────── */
function RecentApplications() {
  return (
    <div className={s.recentCard}>
      <div className={s.recentTitle}>Recent Applications</div>
      <div className={s.recentList}>
        {MOCK_APPLICATIONS.map(a => (
          <div key={a.id} className={s.recentItem}>
            <div className={s.recentItemTop}>
              <span className={s.recentAnimalId}>{a.animalId}</span>
              <span className={s.recentTagNo}>
                {a.tagType === 'RFID' ? <Radio size={10} /> : <Tag size={10} />}
                {a.tagNo}
              </span>
            </div>
            <div className={s.recentMeta}>{a.farmerName} · {a.appliedBy} · {a.appliedAt}</div>
            {a.notes && <div className={s.recentNote}>{a.notes}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────── */
export function TaggingPage(): JSX.Element {
  const { roles } = useAuthStore();
  const canApply  = roles.some(r => CAN_APPLY.includes(r));

  const [selected, setSelected]         = useState<AnimalRecord | null>(null);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState<AppStatus | 'ALL'>('ALL');
  const [speciesFilter, setSpecies]     = useState('All');
  const [refreshKey, setRefreshKey]     = useState(0);

  const filtered = MOCK_ANIMALS.filter(a => {
    if (search && !a.animalId.toLowerCase().includes(search.toLowerCase()) && !a.farmerName.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
    if (speciesFilter !== 'All' && a.species !== speciesFilter) return false;
    return true;
  });

  const pendingCount = MOCK_ANIMALS.filter(a => a.status === 'PENDING').length;
  const appliedCount = MOCK_ANIMALS.filter(a => a.status === 'APPLIED').length;
  const failedCount  = MOCK_ANIMALS.filter(a => a.status === 'FAILED').length;

  return (
    <div className={s.page}>
      <div className={s.leftCol}>
        <div className={s.summaryRow}>
          <div className={s.summaryChip} style={{ background: '#fefce8', color: '#a16207' }}>{pendingCount} Pending</div>
          <div className={s.summaryChip} style={{ background: '#f0fdf4', color: '#16a34a' }}>{appliedCount} Applied</div>
          {failedCount > 0 && <div className={s.summaryChip} style={{ background: '#fef2f2', color: '#dc2626' }}>{failedCount} Failed</div>}
        </div>

        <div className={s.filterBar}>
          <div className={s.searchWrap}>
            <Search size={13} className={s.searchIcon} />
            <input className={s.searchInput} placeholder="Animal ID or farmer…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className={s.selectWrap}>
            <select className={s.filterSelect} value={statusFilter} onChange={e => setStatusFilter(e.target.value as AppStatus | 'ALL')}>
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPLIED">Applied</option>
              <option value="FAILED">Failed</option>
            </select>
            <ChevronDown size={12} className={s.selectIcon} />
          </div>
          <div className={s.selectWrap}>
            <select className={s.filterSelect} value={speciesFilter} onChange={e => setSpecies(e.target.value)}>
              {SPECIES.map(sp => <option key={sp} value={sp}>{sp === 'All' ? 'All Species' : sp}</option>)}
            </select>
            <ChevronDown size={12} className={s.selectIcon} />
          </div>
        </div>

        <div className={s.animalList} key={refreshKey}>
          {filtered.length === 0 ? (
            <div className={s.emptyList}>No animals match the current filters.</div>
          ) : filtered.map(a => (
            <AnimalCard key={a.id} a={a} selected={selected?.id === a.id} onClick={() => setSelected(sel => sel?.id === a.id ? null : a)} />
          ))}
        </div>
      </div>

      <div className={s.rightCol}>
        <RightPanel selected={selected} canApply={canApply} onSuccess={() => { setSelected(null); setRefreshKey(k => k + 1); }} />
        <RecentApplications />
      </div>
    </div>
  );
}

export default TaggingPage;
