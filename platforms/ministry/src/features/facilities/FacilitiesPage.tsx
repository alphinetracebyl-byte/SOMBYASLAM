import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import s from './facilities.module.css';

interface Facility {
  id:                  string;
  facility_code:       string;
  facility_name:       string;
  facility_type:       string;
  checkpoint_type:     string | null;
  status:              string;
  region_code:         string;
  district_code:       string | null;
  location_address:    string | null;
  capacity:            number | null;
  species_handled:     string[] | null;
  license_number:      string | null;
  license_expiry_date: string | null;
  contact_name:        string | null;
  contact_phone:       string | null;
  notes:               string | null;
  registered_by_name:  string | null;
  created_at:          string;
}


const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  ACTIVE:    { bg: '#dcfce7', color: '#166534' },
  INACTIVE:  { bg: '#f3f4f6', color: '#6b7280' },
  SUSPENDED: { bg: '#fef3c7', color: '#92400e' },
  PENDING:   { bg: '#dbeafe', color: '#1d4ed8' },
};

const TYPE_COLOR: Record<string, string> = {
  QUARANTINE_STATION: '#b91c1c',
  SLAUGHTERHOUSE:     '#7c3aed',
  CHECKPOINT:         '#0891b2',
};

const TYPE_LABEL: Record<string, string> = {
  QUARANTINE_STATION: 'Quarantine Station',
  SLAUGHTERHOUSE:     'Slaughterhouse',
  CHECKPOINT:         'Checkpoint',
};

const TABS = [
  { key: '',                   label: 'All'                 },
  { key: 'QUARANTINE_STATION', label: 'Quarantine Stations' },
  { key: 'SLAUGHTERHOUSE',     label: 'Slaughterhouses'     },
  { key: 'CHECKPOINT',         label: 'Checkpoints'         },
  { key: '__PENDING__',        label: 'Pending Review'      },
];


export function FacilitiesPage(): JSX.Element {
  const navigate = useNavigate();

  const [tab,          setTab]          = useState('');
  const [facilities,   setFacilities]   = useState<Facility[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [loadError,    setLoadError]    = useState<string | null>(null);
  const [actionError,  setActionError]  = useState<string | null>(null);
  const [actionBusy,   setActionBusy]   = useState<string | null>(null);
  const [staffCounts,  setStaffCounts]  = useState<Record<string, number>>({});

  // ── Load ───────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from('facilities')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      setLoadError(`Could not load facilities: ${error.message} (code: ${error.code})`);
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as Facility[];
    setFacilities(rows);
    if (rows.length > 0) {
      const ids = rows.map(f => f.id);
      const { data: sc } = await supabase
        .from('facility_staff')
        .select('facility_id')
        .in('facility_id', ids)
        .eq('status', 'ACTIVE');
      const counts: Record<string, number> = {};
      (sc ?? []).forEach((r: { facility_id: string }) => {
        counts[r.facility_id] = (counts[r.facility_id] ?? 0) + 1;
      });
      setStaffCounts(counts);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Status actions ─────────────────────────────────────────────────────────
  const updateStatus = async (f: Facility, next: string) => {
    setActionBusy(f.id);
    setActionError(null);
    const { error } = await supabase
      .from('facilities')
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq('id', f.id);
    if (error) {
      setActionError(`Could not update status: ${error.message}`);
    } else {
      setFacilities(prev => prev.map(x => x.id === f.id ? { ...x, status: next } : x));
    }
    setActionBusy(null);
  };

  const approveFacility = (f: Facility) => updateStatus(f, 'ACTIVE');
  const toggleStatus    = (f: Facility) => updateStatus(f, f.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE');

  // ── Derived counts (always from full list) ────────────────────────────────
  const all        = facilities.length;
  const active     = facilities.filter(f => f.status === 'ACTIVE').length;
  const pending    = facilities.filter(f => f.status === 'PENDING').length;
  const quarantine = facilities.filter(f => f.facility_type === 'QUARANTINE_STATION').length;
  const slaughter  = facilities.filter(f => f.facility_type === 'SLAUGHTERHOUSE').length;
  const checkpoint = facilities.filter(f => f.facility_type === 'CHECKPOINT').length;

  // ── Filtered rows for table ───────────────────────────────────────────────
  const filtered = tab === '__PENDING__'
    ? facilities.filter(f => f.status === 'PENDING')
    : tab
    ? facilities.filter(f => f.facility_type === tab)
    : facilities;

  return (
    <div className={s.page}>

      {/* ── Summary ── */}
      <div className={s.summaryRow}>
        <div className={s.summaryCard}>
          <span className={s.summaryNum}>{all}</span>
          <span className={s.summaryLbl}>Total Facilities</span>
        </div>
        <div className={s.summaryCard}>
          <span className={s.summaryNum}>{active}</span>
          <span className={s.summaryLbl}>Active</span>
        </div>
        <div className={s.summaryCard}>
          <span className={s.summaryNum} style={pending > 0 ? { color: '#1d4ed8' } : undefined}>{pending}</span>
          <span className={s.summaryLbl}>Pending Review</span>
        </div>
        <div className={s.summaryCard}>
          <span className={s.summaryNum}>{quarantine}</span>
          <span className={s.summaryLbl}>Quarantine Stations</span>
        </div>
        <div className={s.summaryCard}>
          <span className={s.summaryNum}>{slaughter}</span>
          <span className={s.summaryLbl}>Slaughterhouses</span>
        </div>
        <div className={s.summaryCard}>
          <span className={s.summaryNum}>{checkpoint}</span>
          <span className={s.summaryLbl}>Checkpoints</span>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className={s.toolbar}>
        <div className={s.tabs}>
          {TABS.map(t => (
            <button
              key={t.key}
              className={`${s.tab}${tab === t.key ? ' ' + s.tabActive : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className={s.refreshBtn} onClick={load} title="Refresh">
            <RefreshCw size={14} />
          </button>
          <button className={s.registerBtn} onClick={() => navigate('/facilities/register')}>
            <Plus size={15} strokeWidth={2.5} /> Register Facility
          </button>
        </div>
      </div>

      {/* ── Errors ── */}
      {loadError && (
        <div style={{ padding: '0.875rem 1rem', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 10, fontSize: '0.875rem' }}>
          {loadError}
        </div>
      )}
      {actionError && (
        <div style={{ padding: '0.875rem 1rem', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 10, fontSize: '0.875rem' }}>
          {actionError}
        </div>
      )}

      {/* ── Table ── */}
      {loading ? (
        <div className={s.emptyState}>Loading facilities…</div>
      ) : filtered.length === 0 ? (
        <div className={s.emptyState}>
          <Building2 size={36} strokeWidth={1} style={{ color: '#d1d5db', marginBottom: '0.5rem' }} />
          <div style={{ fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>No facilities found</div>
          <div style={{ color: '#9ca3af', fontSize: '0.83rem' }}>
            {tab === '__PENDING__'
              ? 'No facilities are pending review.'
              : 'Register a quarantine station, slaughterhouse or checkpoint to get started.'}
          </div>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.tbl}>
            <thead>
              <tr>
                <th>CODE</th>
                <th>FACILITY</th>
                <th>TYPE</th>
                <th>REGION</th>
                <th>CAPACITY</th>
                <th>STAFF</th>
                <th>LICENSE</th>
                <th>CONTACT</th>
                <th>REGISTERED</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => {
                const ss = STATUS_STYLE[f.status] ?? STATUS_STYLE.INACTIVE;
                return (
                  <tr key={f.id} onClick={() => navigate('/facilities/' + f.id)}>
                    <td>
                      <code className={s.code}>{f.facility_code}</code>
                    </td>
                    <td>
                      <div className={s.cellName}>{f.facility_name}</div>
                      {f.location_address && <div className={s.cellSub}>{f.location_address}</div>}
                    </td>
                    <td>
                      <span className={s.typeBadge} style={{ color: TYPE_COLOR[f.facility_type] }}>
                        {TYPE_LABEL[f.facility_type] ?? f.facility_type}
                      </span>
                      {f.checkpoint_type && (
                        <div className={s.cellSub}>{f.checkpoint_type}</div>
                      )}
                    </td>
                    <td>
                      <span className={s.regionBadge}>{f.region_code}</span>
                      {f.district_code && <div className={s.cellSub}>{f.district_code}</div>}
                    </td>
                    <td>
                      {f.capacity
                        ? <span className={s.capacity}>{f.capacity.toLocaleString()}</span>
                        : <span className={s.cellSub}>—</span>}
                      {f.species_handled && f.species_handled.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
                          {f.species_handled.map(sp => (
                            <span key={sp} style={{ fontSize: '0.6rem', fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: '#f1f5f9', color: '#475569', textTransform: 'uppercase' }}>
                              {sp.slice(0, 3)}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={s.staffCount}>
                        {staffCounts[f.id] ?? 0} staff
                      </span>
                    </td>
                    <td>
                      {f.license_number ? (
                        <>
                          <div className={s.cellName}>{f.license_number}</div>
                          {f.license_expiry_date && (
                            <div className={s.cellSub}>Exp: {f.license_expiry_date}</div>
                          )}
                        </>
                      ) : <span className={s.cellSub}>—</span>}
                    </td>
                    <td>
                      {f.contact_name ? (
                        <>
                          <div className={s.cellName}>{f.contact_name}</div>
                          {f.contact_phone && <div className={s.cellSub}>{f.contact_phone}</div>}
                        </>
                      ) : <span className={s.cellSub}>—</span>}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                      <div style={{ color: '#6b7280' }}>{new Date(f.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                      {f.registered_by_name && <div style={{ color: '#9ca3af', fontSize: '0.72rem', marginTop: 2 }}>by {f.registered_by_name}</div>}
                    </td>
                    <td>
                      <span className={s.statusBadge} style={{ background: ss.bg, color: ss.color }}>
                        {f.status}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      {f.status === 'PENDING' ? (
                        <button
                          className={s.btnApprove}
                          disabled={actionBusy === f.id}
                          onClick={() => void approveFacility(f)}
                        >
                          <Clock size={13} /> {actionBusy === f.id ? '…' : 'Approve'}
                        </button>
                      ) : (
                        <button
                          className={f.status === 'ACTIVE' ? s.btnDeactivate : s.btnActivate}
                          disabled={actionBusy === f.id}
                          onClick={() => void toggleStatus(f)}
                        >
                          {actionBusy === f.id
                            ? '…'
                            : f.status === 'ACTIVE'
                            ? <><XCircle size={13} /> Deactivate</>
                            : <><CheckCircle size={13} /> Activate</>}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}

export default FacilitiesPage;
