import { useEffect, useState } from 'react';
import { Search, Users, Clock, CheckCircle, PauseCircle, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import s from './farmers.module.css';

const TABS = ['ALL', 'PENDING', 'APPROVED', 'SUSPENDED'] as const;
type Tab = typeof TABS[number];

interface FarmerReg {
  id: string;
  full_name: string;
  phone_e164: string;
  national_id: string;
  region: string;
  district: string | null;
  status: string;
  created_at: string;
}

const TAB_META: Record<Tab, { icon: React.ReactNode; label: string }> = {
  ALL:       { icon: <Users      size={13} />, label: 'All Farmers' },
  PENDING:   { icon: <Clock      size={13} />, label: 'Pending'     },
  APPROVED:  { icon: <CheckCircle size={13} />, label: 'Approved'  },
  SUSPENDED: { icon: <PauseCircle size={13} />, label: 'Suspended' },
};

const STATUS_CLASS: Record<string, string> = {
  PENDING:   s.pillPending,
  APPROVED:  s.pillApproved,
  REJECTED:  s.pillRejected,
  SUSPENDED: s.pillSuspended,
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function FarmersPage(): JSX.Element {
  const [tab,     setTab]     = useState<Tab>('ALL');
  const [farmers, setFarmers] = useState<FarmerReg[]>([]);
  const [counts,  setCounts]  = useState<Record<string, number>>({});
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [busy,    setBusy]    = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      let q = supabase
        .from('farmer_registrations')
        .select('id, full_name, phone_e164, national_id, region, district, status, created_at')
        .order('created_at', { ascending: false });

      if (tab !== 'ALL') q = q.eq('status', tab);

      const [{ data, error: fetchErr }, { data: countData }] = await Promise.all([
        q,
        supabase.from('farmer_registrations').select('status'),
      ]);

      if (fetchErr) throw fetchErr;
      setFarmers((data ?? []) as FarmerReg[]);

      const c: Record<string, number> = {};
      for (const row of (countData ?? [])) {
        const st = (row as { status: string }).status;
        c[st] = (c[st] ?? 0) + 1;
      }
      setCounts(c);
    } catch {
      setError('Failed to load farmer registrations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [tab]);

  const filtered = farmers.filter(f => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      f.full_name.toLowerCase().includes(q) ||
      f.phone_e164.includes(q) ||
      f.national_id.toLowerCase().includes(q)
    );
  });

  const approve = async (id: string) => {
    setBusy(id);
    await supabase.from('farmer_registrations').update({ status: 'APPROVED' }).eq('id', id);
    setFarmers(prev => prev.map(f => f.id === id ? { ...f, status: 'APPROVED' } : f));
    setCounts(prev => ({
      ...prev,
      PENDING:  Math.max(0, (prev.PENDING ?? 0) - 1),
      APPROVED: (prev.APPROVED ?? 0) + 1,
    }));
    setBusy(null);
  };

  const reject = async (id: string) => {
    setBusy(id);
    await supabase.from('farmer_registrations').update({ status: 'REJECTED' }).eq('id', id);
    setFarmers(prev => prev.map(f => f.id === id ? { ...f, status: 'REJECTED' } : f));
    setCounts(prev => ({
      ...prev,
      PENDING:  Math.max(0, (prev.PENDING ?? 0) - 1),
      REJECTED: (prev.REJECTED ?? 0) + 1,
    }));
    setBusy(null);
  };

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className={s.page}>

      <div className={s.pageHead}>
        <div>
          <h1 className={s.pageTitle}>Farmer Registrations</h1>
          <p className={s.pageSub}>
            {total} registered · {counts.PENDING ?? 0} pending review
          </p>
        </div>
      </div>

      <div className={s.statRow}>
        {[
          { key: 'PENDING',   label: 'Pending'   },
          { key: 'APPROVED',  label: 'Approved'  },
          { key: 'SUSPENDED', label: 'Suspended' },
          { key: 'TOTAL',     label: 'Total', val: total },
        ].map(({ key, label, val }) => (
          <div key={key} className={s.statCard}>
            <div className={s.statLbl}>{label}</div>
            <div className={s.statVal}>{val ?? counts[key] ?? 0}</div>
          </div>
        ))}
      </div>

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
              {t !== 'ALL' && (counts[t] ?? 0) > 0 && (
                <span className={`${s.tabBadge}${tab === t ? ' ' + s.tabBadgeActive : ''}`}>
                  {counts[t]}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className={s.searchWrap}>
          <Search size={13} className={s.searchIco} />
          <input
            className={s.searchInp}
            placeholder="Search name, phone, ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className={s.tableCard}>
        {error ? (
          <div className={s.empty}>{error}</div>
        ) : loading ? (
          <div className={s.empty}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div className={s.empty}>
            <div className={s.emptyIcon}><Users size={28} /></div>
            {farmers.length === 0
              ? 'No farmers have registered yet.'
              : `No farmers found matching "${search}".`
            }
          </div>
        ) : (
          <table className={s.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>National ID</th>
                <th>Region</th>
                <th>Status</th>
                <th>Registered</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.id} className={s.row}>
                  <td className={s.nameCell}>{f.full_name}</td>
                  <td className={s.cell}>{f.phone_e164}</td>
                  <td className={s.cell}>{f.national_id}</td>
                  <td className={s.cell}>{f.region}{f.district ? ` / ${f.district}` : ''}</td>
                  <td>
                    <span className={`${s.statusPill} ${STATUS_CLASS[f.status] ?? ''}`}>
                      {f.status.charAt(0) + f.status.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td className={s.cell}>{fmt(f.created_at)}</td>
                  <td className={s.actionCell}>
                    {f.status === 'PENDING' && (
                      <>
                        <button
                          className={s.approveBtn}
                          disabled={busy === f.id}
                          onClick={() => void approve(f.id)}
                        >
                          <CheckCircle size={12} /> Approve
                        </button>
                        <button
                          className={s.rejectBtn}
                          disabled={busy === f.id}
                          onClick={() => void reject(f.id)}
                        >
                          <XCircle size={12} /> Reject
                        </button>
                      </>
                    )}
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

export default FarmersPage;
