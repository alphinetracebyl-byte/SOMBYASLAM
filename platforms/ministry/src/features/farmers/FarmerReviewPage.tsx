import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, Users, Clock, CheckCircle, PauseCircle, MessageSquare, Phone, Mail, FileText, MapPin } from 'lucide-react';
import { fetchFarmers, countByStatus, type Farmer } from './farmers.supabase';
import { useAuthStore } from '@/store/auth.store';
import s from './farmers.module.css';

const TABS = ['ALL', 'PENDING', 'APPROVED', 'SUSPENDED'] as const;
type Tab = typeof TABS[number];

const REGIONS = [
  'ALL','Awdal','Bakool','Banaadir','Bari','Bay','Galguduud','Gedo','Hiiraan',
  'Jubbada Dhexe','Jubbada Hoose','Mudug','Nugaal','Sanaag',
  'Shabeellaha Dhexe','Shabeellaha Hoose','Sool','Togdheer','Woqooyi Galbeed',
];

const TAB_META: Record<Tab, { icon: JSX.Element; label: string }> = {
  ALL:       { icon: <Users size={13}/>,        label: 'All Farmers' },
  PENDING:   { icon: <Clock size={13}/>,        label: 'Pending'     },
  APPROVED:  { icon: <CheckCircle size={13}/>,  label: 'Approved'    },
  SUSPENDED: { icon: <PauseCircle size={13}/>,  label: 'Suspended'   },
};

const STATUS_CLASS: Record<string, string> = {
  PENDING:  s.pillPending,
  APPROVED: s.pillApproved,
  REJECTED: s.pillRejected,
  SUSPENDED: s.pillSuspended,
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}

export function FarmerReviewPage(): JSX.Element {
  const navigate = useNavigate();
  const { roles, territoryType } = useAuthStore();
  const isAdmin = roles.includes('ADMIN') || territoryType === 'NATIONAL';

  const [tab,     setTab]     = useState<Tab>('ALL');
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [counts,  setCounts]  = useState<Record<string, number>>({});
  const [region,  setRegion]  = useState<string>(isAdmin ? 'ALL' : (territoryType ?? 'ALL'));
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [data, c] = await Promise.all([
        fetchFarmers(tab, region),
        countByStatus(),
      ]);
      setFarmers(data);
      setCounts(c);
    } catch {
      setError('Failed to load farmer data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [tab, region]);

  const filtered = farmers.filter(f => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      f.fullName.toLowerCase().includes(q) ||
      f.phoneE164.includes(q) ||
      f.nationalId.toLowerCase().includes(q) ||
      (f.farmerCode?.toLowerCase().includes(q) ?? false)
    );
  });

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const STATS = [
    { key: 'PENDING',   label: 'Pending'   },
    { key: 'APPROVED',  label: 'Approved'  },
    { key: 'SUSPENDED', label: 'Suspended' },
    { key: 'TOTAL',     label: 'Total',    val: total },
  ];

  return (
    <div className={s.page}>

      {/* Header */}
      <div className={s.pageHead}>
        <div>
          <h1 className={s.pageTitle}>Farmers</h1>
          <p className={s.pageSub}>
            {isAdmin ? 'All regions' : territoryType ? `Region: ${territoryType}` : 'Your region'}
            {' · '}{total} registered{(counts.PENDING ?? 0) > 0 ? ` · ${counts.PENDING} pending review` : ''}
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className={s.statRow}>
        {STATS.map(({ key, label, val }) => (
          <div key={key} className={s.statCard}>
            <div className={s.statLbl}>{label}</div>
            <div className={s.statVal}>{val ?? counts[key] ?? 0}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className={s.toolbar}>
        <div className={s.tabs}>
          {TABS.map(t => (
            <button
              key={t}
              className={`${s.tab}${tab === t ? ' ' + s.tabActive : ''}`}
              onClick={() => setTab(t)}
            >
              {TAB_META[t].icon}
              {TAB_META[t].label}
              {t !== 'ALL' && (counts[t as string] ?? 0) > 0 && (
                <span className={`${s.tabBadge}${tab === t ? ' ' + s.tabBadgeActive : ''}`}>
                  {counts[t]}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className={s.toolbarRight}>
          {isAdmin && (
            <select className={s.regionSel} value={region} onChange={e => setRegion(e.target.value)}>
              {REGIONS.map(r => (
                <option key={r} value={r}>{r === 'ALL' ? 'All Regions' : r}</option>
              ))}
            </select>
          )}
          <div className={s.searchWrap}>
            <Search size={13} className={s.searchIco}/>
            <input
              className={s.searchInp}
              placeholder="Search name, phone, ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className={s.tableCard}>
        {error ? (
          <div className={s.empty}>{error}</div>
        ) : loading ? (
          <div className={s.empty}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div className={s.empty}>
            <div className={s.emptyIcon}><Users size={28}/></div>
            {farmers.length === 0
              ? 'No farmers have registered yet. Once a farmer registers through the Farmer Portal, they will appear here.'
              : `No farmers found matching "${search}".`
            }
          </div>
        ) : (
          <table className={s.table}>
            <thead>
              <tr>
                <th>Client Code</th>
                <th>Representative</th>
                <th>Account Type</th>
                <th>Company</th>
                <th>ID Type</th>
                <th>Contact</th>
                <th>Region</th>
                <th>Submitted</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.id} className={s.row} onClick={() => navigate(`/farmers/${f.id}`)}>
                  <td>
                    <span className={s.code}>{f.farmerCode ?? '—'}</span>
                  </td>
                  <td>
                    <div className={s.nameCell}>
                      {f.photoUrl
                        ? <img src={f.photoUrl} alt="" className={s.avatar}/>
                        : <div className={s.avatarFallback}>{f.fullName[0].toUpperCase()}</div>
                      }
                      <div>
                        <div className={s.farmerName}>{f.fullName}</div>
                        <div className={s.farmerSub}>{f.nationalId}{f.gender ? ` · ${f.gender.charAt(0) + f.gender.slice(1).toLowerCase()}` : ''}</div>
                      </div>
                    </div>
                  </td>
                  <td className={s.cell}>
                    {f.accountType
                      ? <span className={f.accountType === 'COMPANY' ? s.typeBadgeCompany : s.typeBadgeIndividual}>
                          {f.accountType === 'COMPANY' ? '🏢 Company' : '👤 Individual'}
                        </span>
                      : <span className={s.typeBadgeIndividual}>👤 Individual</span>
                    }
                  </td>
                  <td className={s.cell}>
                    {f.accountType === 'COMPANY' ? (
                      <div>
                        <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 3 }}>{f.companyName || '—'}</div>
                        <div className={s.iconRow}><FileText size={10} className={s.cellIcon}/><span className={s.cellSub}>{f.licenseNumber || '—'}</span></div>
                        <div className={s.iconRow} style={{ marginTop: 2 }}><MapPin size={10} className={s.cellIcon}/><span className={s.cellSub}>{f.companyAddress || '—'}</span></div>
                      </div>
                    ) : (
                      <span style={{ color: '#cbd5e1' }}>—</span>
                    )}
                  </td>
                  <td className={s.cell}>{f.idType.replace(/_/g, ' ')}</td>
                  <td className={s.cell}>
                    <div className={s.iconRow}><Phone size={11} className={s.cellIcon}/>{f.phoneE164}</div>
                    {f.email && <div className={s.iconRow} style={{ marginTop: 3 }}><Mail size={11} className={s.cellIcon}/><span className={s.cellSub}>{f.email}</span></div>}
                  </td>
                  <td className={s.cell}>
                    <div>{f.region}</div>
                    {f.village && <div className={s.cellSub}>{f.village}</div>}
                  </td>
                  <td className={s.cell}>{fmt(f.createdAt)}</td>
                  <td>
                    <span className={`${s.statusPill} ${STATUS_CLASS[f.status] ?? ''}`}>
                      {f.status.charAt(0) + f.status.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td className={s.actionCell}>
                    <button
                      className={s.msgBtn}
                      title={`Send message to ${f.fullName}`}
                      onClick={e => {
                        e.stopPropagation();
                        navigate('/messenger', {
                          state: { autoCompose: { userId: f.userId, name: f.fullName, email: f.email, farmerCode: f.farmerCode, region: f.region } },
                        });
                      }}
                    >
                      <MessageSquare size={13} />
                    </button>
                    <ChevronRight size={15} className={s.chevron} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default FarmerReviewPage;
