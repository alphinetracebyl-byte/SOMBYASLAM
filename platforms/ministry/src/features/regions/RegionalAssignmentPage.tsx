import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, UserCheck, Users, Plus, X, Search, Loader, UserX, PlusCircle, Phone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import s from './regional-assignment.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Region {
  code: string;
  name: string;
}

interface Officer {
  id:              string;
  fullName?:       string;
  email?:          string;
  phone?:          string;
  altPhone?:       string;
  idNumber?:       string;
  roles:           string[];
  positionTitle?:  string;
  department?:     string;
  officeName?:     string;
  officeId?:       string;
  officeLocation?: string;
  startDate?:      string;
  regionCode?:     string;
  status:          string;
  registeredBy?:   string;
  createdAt?:      string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_REGIONS: Region[] = [
  { code: 'AWD', name: 'Awdal' },
  { code: 'BAK', name: 'Bakool' },
  { code: 'BAN', name: 'Banadir' },
  { code: 'BAR', name: 'Bari' },
  { code: 'BAY', name: 'Bay' },
  { code: 'GAL', name: 'Galgaduud' },
  { code: 'GED', name: 'Gedo' },
  { code: 'HIR', name: 'Hiraan' },
  { code: 'MJU', name: 'Middle Juba' },
  { code: 'LJU', name: 'Lower Juba' },
  { code: 'MUD', name: 'Mudug' },
  { code: 'NUG', name: 'Nugaal' },
  { code: 'SAN', name: 'Sanaag' },
  { code: 'MSH', name: 'Mid. Shabelle' },
  { code: 'LSH', name: 'Low. Shabelle' },
  { code: 'SOL', name: 'Sool' },
  { code: 'TOG', name: 'Togdheer' },
  { code: 'WOG', name: 'Woqooyi Galbeed' },
];

const FIELD_ROLES = ['FIELD_INSPECTOR', 'VETERINARY_OFFICER', 'SOCIAL_WORKER', 'CHECKPOINT_OFFICER'];

const ROLE_LABEL: Record<string, string> = {
  FIELD_INSPECTOR:    'Field Inspector',
  VETERINARY_OFFICER: 'Vet Officer',
  SOCIAL_WORKER:      'Social Worker',
  CHECKPOINT_OFFICER: 'Checkpoint Officer',
};

const ROLE_CFG: Record<string, { color: string; bg: string }> = {
  FIELD_INSPECTOR:    { color: '#92400e', bg: '#fffbeb' },
  VETERINARY_OFFICER: { color: '#166534', bg: '#f0fdf4' },
  SOCIAL_WORKER:      { color: '#1d4ed8', bg: '#eff6ff' },
  CHECKPOINT_OFFICER: { color: '#7e22ce', bg: '#fdf4ff' },
};

const STATUS_CFG: Record<string, { color: string; bg: string }> = {
  ACTIVE:    { color: '#16a34a', bg: '#16a34a18' },
  SUSPENDED: { color: '#7c3aed', bg: '#7c3aed18' },
  INACTIVE:  { color: '#dc2626', bg: '#dc262618' },
  PENDING:   { color: '#b45309', bg: '#b4530918' },
};

const STORAGE_KEY = 'qxlits_custom_regions';

function loadCustomRegions(): Region[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch { return []; }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function RegionalAssignmentPage(): JSX.Element {
  const navigate = useNavigate();
  const [officers,      setOfficers]      = useState<Officer[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [customRegions, setCustomRegions] = useState<Region[]>(loadCustomRegions);
  const [selectedReg,   setSelectedReg]   = useState<string | null>(null);
  const [showAssign,    setShowAssign]     = useState(false);
  const [showAddRegion, setShowAddRegion] = useState(false);
  const [newRegion,     setNewRegion]     = useState({ code: '', name: '' });
  const [addError,      setAddError]      = useState('');
  const [search,        setSearch]        = useState('');
  const [roleFilter,    setRoleFilter]    = useState('');
  const [assigning,     setAssigning]     = useState<string | null>(null);
  const [unassigning,   setUnassigning]   = useState<string | null>(null);

  const allRegions = useMemo(
    () => [...DEFAULT_REGIONS, ...customRegions],
    [customRegions],
  );

  const loadOfficers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('user_registrations')
      .select('*')
      .in('role', FIELD_ROLES)
      .order('created_at', { ascending: false });
    setOfficers(
      (data ?? []).map((r: Record<string, unknown>) => ({
        id:             r.id as string,
        fullName:       r.full_name as string | undefined,
        email:          r.email as string | undefined,
        phone:          r.phone as string | undefined,
        altPhone:       r.alt_phone as string | undefined,
        idNumber:       r.id_number as string | undefined,
        roles:          [r.role as string],
        positionTitle:  r.position_title as string | undefined,
        department:     r.department as string | undefined,
        officeName:     r.office_name as string | undefined,
        officeId:       r.office_id as string | undefined,
        officeLocation: r.office_location as string | undefined,
        startDate:      r.start_date as string | undefined,
        regionCode:     (r.region_code as string) ?? undefined,
        status:         r.status as string,
        registeredBy:   r.registered_by as string | undefined,
        createdAt:      r.created_at as string | undefined,
      }))
    );
    setLoading(false);
  };

  useEffect(() => { void loadOfficers(); }, []);

  const handleAddRegion = () => {
    const code = newRegion.code.trim().toUpperCase();
    const name = newRegion.name.trim();
    if (!code || !name) { setAddError('Both fields are required.'); return; }
    if (allRegions.some(r => r.code === code)) {
      setAddError(`Region code "${code}" already exists.`);
      return;
    }
    const updated = [...customRegions, { code, name }];
    setCustomRegions(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setNewRegion({ code: '', name: '' });
    setAddError('');
    setShowAddRegion(false);
  };

  const regionOfficers = useMemo(
    () => officers.filter(o => o.regionCode === selectedReg),
    [officers, selectedReg],
  );

  const candidates = useMemo(() => {
    const q = search.toLowerCase();
    return officers.filter(o => {
      const notHere   = o.regionCode !== selectedReg;
      const roleMatch = !roleFilter || o.roles.includes(roleFilter);
      const nameMatch = !q
        || (o.fullName ?? '').toLowerCase().includes(q)
        || (o.email ?? '').toLowerCase().includes(q)
        || (o.phone ?? '').toLowerCase().includes(q);
      return notHere && roleMatch && nameMatch;
    });
  }, [officers, selectedReg, search, roleFilter]);

  const assign = async (officer: Officer) => {
    if (!selectedReg) return;
    setAssigning(officer.id);
    const { error } = await supabase
      .from('user_registrations')
      .update({ region_code: selectedReg })
      .eq('id', officer.id);
    if (!error) {
      setOfficers(prev =>
        prev.map(o => o.id === officer.id ? { ...o, regionCode: selectedReg } : o),
      );
    }
    setAssigning(null);
  };

  const unassign = async (officer: Officer) => {
    setUnassigning(officer.id);
    const { error } = await supabase
      .from('user_registrations')
      .update({ region_code: null })
      .eq('id', officer.id);
    if (!error) {
      setOfficers(prev =>
        prev.map(o => o.id === officer.id ? { ...o, regionCode: undefined } : o),
      );
    }
    setUnassigning(null);
  };

  const openAssign = () => { setShowAssign(true); setSearch(''); setRoleFilter(''); };

  const totalAssigned   = officers.filter(o => o.regionCode).length;
  const totalUnassigned = officers.filter(o => !o.regionCode).length;
  const selectedName    = allRegions.find(r => r.code === selectedReg)?.name ?? selectedReg;

  return (
    <div className={s.page}>

      {/* Header */}
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Regional Assignments</h1>
          <p className={s.sub}>
            Assign Field Inspectors and Veterinary Officers to Somalia's 18 regions
          </p>
        </div>
        <div className={s.headerRight}>
          <div className={s.headerStats}>
            <div className={s.headerStat}>
              <span className={s.headerStatVal}>{totalAssigned}</span>
              <span className={s.headerStatLbl}>Assigned</span>
            </div>
            <div className={s.headerStatDiv} />
            <div className={s.headerStat}>
              <span className={s.headerStatVal}
                style={{ color: totalUnassigned > 0 ? '#d97706' : '#16a34a' }}>
                {totalUnassigned}
              </span>
              <span className={s.headerStatLbl}>Unassigned</span>
            </div>
            <div className={s.headerStatDiv} />
            <div className={s.headerStat}>
              <span className={s.headerStatVal}>{allRegions.length}</span>
              <span className={s.headerStatLbl}>Regions</span>
            </div>
          </div>
          <button
            className={s.addRegionBtn}
            onClick={() => { setShowAddRegion(true); setNewRegion({ code: '', name: '' }); setAddError(''); }}
          >
            <PlusCircle size={15} /> Add Region
          </button>
        </div>
      </div>

      {/* Region grid */}
      {loading ? (
        <div className={s.grid}>
          {[...Array(18)].map((_, i) => <div key={i} className={s.skelCard} />)}
        </div>
      ) : (
        <div className={s.grid}>
          {allRegions.map(region => {
            const ros  = officers.filter(o => o.regionCode === region.code);
            const fis  = ros.filter(o => o.roles.includes('FIELD_INSPECTOR')).length;
            const vets = ros.filter(o => o.roles.includes('VETERINARY_OFFICER')).length;
            const active = selectedReg === region.code;

            return (
              <div
                key={region.code}
                className={`${s.regionCard}${active ? ' ' + s.regionCardActive : ''}`}
                onClick={() => setSelectedReg(active ? null : region.code)}
              >
                <div className={s.regionTop}>
                  <div>
                    <div className={s.regionName}>{region.name}</div>
                    <div className={s.regionCode}>{region.code}</div>
                  </div>
                  <MapPin size={13} strokeWidth={1.75}
                    color={active ? '#0b5ed7' : '#cbd5e1'} />
                </div>

                <div className={s.regionCounts}>
                  <div className={s.regionCount}>
                    <span className={s.regionCountNum}
                      style={{ color: fis > 0 ? '#92400e' : '#cbd5e1' }}>{fis}</span>
                    <span className={s.regionCountLbl}>Inspectors</span>
                  </div>
                  <div className={s.regionCountDiv} />
                  <div className={s.regionCount}>
                    <span className={s.regionCountNum}
                      style={{ color: vets > 0 ? '#166534' : '#cbd5e1' }}>{vets}</span>
                    <span className={s.regionCountLbl}>Vet Officers</span>
                  </div>
                </div>

                {ros.length === 0 && (
                  <div className={s.noOfficers}>No officers assigned</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Region detail panel */}
      {selectedReg && (
        <div className={s.panel}>
          <div className={s.panelHead}>
            <div>
              <div className={s.panelTitle}>{selectedName} Region</div>
              <div className={s.panelSub}>
                {regionOfficers.length} officer{regionOfficers.length !== 1 ? 's' : ''} assigned
              </div>
            </div>
            <div className={s.panelActions}>
              <button className={s.assignBtn} onClick={openAssign}>
                <Plus size={14} /> Assign Officer
              </button>
              <button className={s.panelCloseBtn} onClick={() => setSelectedReg(null)}>
                <X size={15} />
              </button>
            </div>
          </div>

          {regionOfficers.length === 0 ? (
            <div className={s.panelEmpty}>
              <Users size={34} strokeWidth={1.25} color="#cbd5e1" />
              <span>No officers assigned to this region yet.</span>
              <button className={s.assignBtnSm} onClick={openAssign}>
                <Plus size={13} /> Assign First Officer
              </button>
            </div>
          ) : (
            <div className={s.tableWrap}>
              <table className={s.officerTable}>
                <thead>
                  <tr>
                    <th className={s.officerTh}>User</th>
                    <th className={s.officerTh}>Phone</th>
                    <th className={s.officerTh}>National ID</th>
                    <th className={s.officerTh}>Role</th>
                    <th className={s.officerTh}>Position / Dept</th>
                    <th className={s.officerTh}>Office</th>
                    <th className={s.officerTh}>Start Date</th>
                    <th className={s.officerTh}>Registered</th>
                    <th className={s.officerTh}>Status</th>
                    <th className={s.officerTh}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {regionOfficers.map(o => {
                    const role  = o.roles.find(r => FIELD_ROLES.includes(r));
                    const cfg   = ROLE_CFG[role ?? ''] ?? { color: '#64748b', bg: '#f8fafc' };
                    const stCfg = STATUS_CFG[o.status] ?? STATUS_CFG.INACTIVE;
                    return (
                      <tr
                        key={o.id}
                        className={s.officerTr}
                        onClick={() => navigate(`/users/${o.id}`)}
                        title="Open full profile"
                      >
                        <td className={s.officerTd}>
                          <div className={s.userCell}>
                            <div className={s.avatar}>{(o.fullName ?? 'U')[0].toUpperCase()}</div>
                            <div>
                              <div className={s.officerName}>{o.fullName ?? o.id.slice(0, 8)}</div>
                              <div className={s.officerEmail}>{o.email ?? '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td className={s.officerTd} style={{ whiteSpace: 'nowrap', color: '#475569' }}>
                          {o.phone ?? '—'}
                          {o.altPhone && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{o.altPhone}</div>}
                        </td>
                        <td className={s.officerTd} style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                          {o.idNumber ?? '—'}
                        </td>
                        <td className={s.officerTd}>
                          {role && (
                            <span className={s.roleBadge} style={{ color: cfg.color, background: cfg.bg }}>
                              {ROLE_LABEL[role] ?? role}
                            </span>
                          )}
                        </td>
                        <td className={s.officerTd}>
                          <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.8125rem' }}>{o.positionTitle ?? '—'}</div>
                          {o.department && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{o.department}</div>}
                        </td>
                        <td className={s.officerTd}>
                          <div style={{ fontSize: '0.8125rem', color: '#334155' }}>{o.officeName ?? '—'}</div>
                          {o.officeLocation && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{o.officeLocation}</div>}
                        </td>
                        <td className={s.officerTd} style={{ whiteSpace: 'nowrap', color: '#475569' }}>
                          {o.startDate ? new Date(o.startDate).toLocaleDateString() : '—'}
                        </td>
                        <td className={s.officerTd} style={{ whiteSpace: 'nowrap', color: '#94a3b8', fontSize: '0.8125rem' }}>
                          {o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td className={s.officerTd}>
                          <span className={s.statusBadge} style={{ color: stCfg.color, background: stCfg.bg }}>
                            {o.status}
                          </span>
                        </td>
                        <td className={s.officerTd} onClick={e => e.stopPropagation()}>
                          <button
                            className={s.removeBtn}
                            onClick={() => void unassign(o)}
                            disabled={unassigning === o.id}
                            title="Remove from region"
                          >
                            {unassigning === o.id
                              ? <Loader size={12} className={s.spin} />
                              : <UserX size={13} />}
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Assign Officer Modal */}
      {showAssign && (
        <div className={s.overlay} onClick={() => setShowAssign(false)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>

            <div className={s.modalHead}>
              <div>
                <div className={s.modalTitle}>Assign Officer to {selectedName}</div>
                <div className={s.modalSub}>Select a field officer to assign to this region</div>
              </div>
              <button className={s.modalCloseBtn} onClick={() => setShowAssign(false)}>
                <X size={16} />
              </button>
            </div>

            <div className={s.modalFilters}>
              <div className={s.searchWrap}>
                <Search size={13} className={s.searchIcon} />
                <input
                  className={s.searchInput}
                  placeholder="Search by name, email or phone…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <select className={s.roleSel} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                <option value="">All Roles</option>
                {FIELD_ROLES.map(r => (
                  <option key={r} value={r}>{ROLE_LABEL[r] ?? r}</option>
                ))}
              </select>
            </div>

            <div className={s.modalList}>
              {candidates.length === 0 ? (
                <div className={s.modalEmpty}>No officers found</div>
              ) : candidates.map(o => {
                const role  = o.roles.find(r => FIELD_ROLES.includes(r));
                const cfg   = ROLE_CFG[role ?? ''] ?? { color: '#64748b', bg: '#f8fafc' };
                const stCfg = STATUS_CFG[o.status] ?? STATUS_CFG.INACTIVE;
                return (
                  <div key={o.id} className={s.candidateRow}>
                    <div className={s.avatar}>{(o.fullName ?? 'U')[0].toUpperCase()}</div>
                    <div className={s.officerInfo}>
                      <div className={s.officerName}>{o.fullName ?? o.id.slice(0, 8)}</div>
                      <div className={s.officerEmail}>
                        {o.email}
                        {o.regionCode && (
                          <span className={s.currentRegion}> · currently in {o.regionCode}</span>
                        )}
                      </div>
                      {o.phone && (
                        <div className={s.officerPhone}><Phone size={10} /> {o.phone}</div>
                      )}
                      <div className={s.officerMeta}>
                        {o.positionTitle && <span className={s.metaItem}>{o.positionTitle}</span>}
                        {o.department    && <span className={s.metaItem}>{o.department}</span>}
                        {o.officeName    && <span className={s.metaItem}>{o.officeName}</span>}
                        {o.idNumber      && <span className={s.metaItem} style={{ fontFamily: 'monospace' }}>ID: {o.idNumber}</span>}
                      </div>
                    </div>
                    <div className={s.officerBadges}>
                      {role && (
                        <span className={s.roleBadge} style={{ color: cfg.color, background: cfg.bg }}>
                          {ROLE_LABEL[role] ?? role}
                        </span>
                      )}
                      <span className={s.statusBadge} style={{ color: stCfg.color, background: stCfg.bg }}>
                        {o.status}
                      </span>
                    </div>
                    <button
                      className={s.assignRowBtn}
                      onClick={() => assign(o)}
                      disabled={assigning === o.id}
                    >
                      {assigning === o.id
                        ? <Loader size={12} className={s.spin} />
                        : <UserCheck size={13} />}
                      Assign
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Add Region Modal */}
      {showAddRegion && (
        <div className={s.overlay} onClick={() => setShowAddRegion(false)}>
          <div className={s.modal} style={{ maxHeight: 'unset' }} onClick={e => e.stopPropagation()}>
            <div className={s.modalHead}>
              <div>
                <div className={s.modalTitle}>Add New Region</div>
                <div className={s.modalSub}>Region will appear in the grid immediately</div>
              </div>
              <button className={s.modalCloseBtn} onClick={() => setShowAddRegion(false)}>
                <X size={16} />
              </button>
            </div>

            <div className={s.addRegionForm}>
              <div className={s.addRegionField}>
                <label className={s.addRegionLabel}>Region Code <span className={s.req}>*</span></label>
                <input
                  className={s.addRegionInput}
                  placeholder="e.g. HIR"
                  maxLength={10}
                  value={newRegion.code}
                  onChange={e => { setNewRegion(p => ({ ...p, code: e.target.value })); setAddError(''); }}
                />
                <span className={s.addRegionHint}>Short uppercase code, unique across all regions</span>
              </div>
              <div className={s.addRegionField}>
                <label className={s.addRegionLabel}>Region Name <span className={s.req}>*</span></label>
                <input
                  className={s.addRegionInput}
                  placeholder="e.g. Hiraan"
                  value={newRegion.name}
                  onChange={e => { setNewRegion(p => ({ ...p, name: e.target.value })); setAddError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleAddRegion()}
                />
              </div>
              {addError && <div className={s.addRegionError}>{addError}</div>}
              <div className={s.addRegionActions}>
                <button
                  className={s.modalCloseBtn}
                  style={{ width: 'auto', padding: '0 1rem', fontSize: '0.875rem' }}
                  onClick={() => setShowAddRegion(false)}
                >
                  Cancel
                </button>
                <button className={s.assignBtn} onClick={handleAddRegion}>
                  <Plus size={14} /> Add Region
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default RegionalAssignmentPage;
