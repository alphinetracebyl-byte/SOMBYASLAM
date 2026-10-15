import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  UserCheck, UserX, Plus, UserPlus, X, Edit2,
  PauseCircle, Save, Trash2, Building2, Users, Wheat,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import s from './users.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MinistryUser {
  id: string; full_name: string | null; email: string; phone: string | null;
  alt_phone: string | null; id_number: string | null; role: string;
  territory_type: string | null; region_code: string | null;
  position_title: string | null; department: string | null;
  office_name: string | null; office_id: string | null;
  office_location: string | null; start_date: string | null;
  notes: string | null; status: string; registered_by: string | null;
  created_at: string;
}

interface FarmerUser {
  id: string; farmer_code: string; full_name: string;
  phone_e164: string; alt_phone: string | null; email: string | null;
  national_id: string; id_type: string;
  date_of_birth: string | null; gender: string | null;
  region: string; village: string | null;
  account_type: string; company_name: string | null;
  rejection_reason: string | null;
  approved_at: string | null; approved_by: string | null;
  status: string; created_at: string;
}

interface FacilityStaff {
  id: string; facility_id: string; facility_code: string;
  staff_name: string; staff_role: string; email: string | null;
  phone: string | null; national_id: string | null;
  is_main_contact: boolean; auth_account_created: boolean;
  registered_by_name: string | null;
  status: string; created_at: string;
}

type Tab = 'ministry' | 'farmers' | 'facility';

type EditForm = {
  full_name: string; email: string; phone: string; alt_phone: string;
  id_number: string; role: string; region_code: string;
  position_title: string; department: string;
  office_id: string; office_name: string; office_location: string;
  start_date: string; notes: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const REGIONS = [
  { code: 'AWD', name: 'Awdal' }, { code: 'BAK', name: 'Bakool' },
  { code: 'BAN', name: 'Banadir' }, { code: 'BAR', name: 'Bari' },
  { code: 'BAY', name: 'Bay' }, { code: 'GAL', name: 'Galgaduud' },
  { code: 'GED', name: 'Gedo' }, { code: 'HIR', name: 'Hiraan' },
  { code: 'MJU', name: 'Middle Juba' }, { code: 'LJU', name: 'Lower Juba' },
  { code: 'MUD', name: 'Mudug' }, { code: 'NUG', name: 'Nugaal' },
  { code: 'SAN', name: 'Sanaag' }, { code: 'MSH', name: 'Mid. Shabelle' },
  { code: 'LSH', name: 'Low. Shabelle' }, { code: 'SOL', name: 'Sool' },
  { code: 'TOG', name: 'Togdheer' }, { code: 'WOG', name: 'Woqooyi Galbeed' },
];

const ROLES_WITH_REGION = ['REGIONAL_ADMIN', 'VETERINARY_OFFICER', 'FIELD_INSPECTOR'];

const ROLE_TERRITORY: Record<string, string> = {
  NATIONAL_ADMIN: 'NATIONAL', REGIONAL_ADMIN: 'REGIONAL',
  VETERINARY_OFFICER: 'REGIONAL', FIELD_INSPECTOR: 'REGIONAL',
};

const ROLE_COLORS: Record<string, { color: string; bg: string }> = {
  NATIONAL_ADMIN:       { color: '#7e22ce', bg: '#fdf4ff' },
  REGIONAL_ADMIN:       { color: '#1d4ed8', bg: '#eff6ff' },
  VETERINARY_OFFICER:   { color: '#166534', bg: '#f0fdf4' },
  FIELD_INSPECTOR:      { color: '#92400e', bg: '#fffbeb' },
  QUARANTINE_SUPERVISOR:{ color: '#b91c1c', bg: '#fef2f2' },
  VETERINARY_OFFICER_F: { color: '#166534', bg: '#f0fdf4' },
  LAB_TECHNICIAN:       { color: '#0891b2', bg: '#ecfeff' },
  SLAUGHTER_SUPERVISOR: { color: '#7c3aed', bg: '#faf5ff' },
  HALAL_SUPERVISOR:     { color: '#15803d', bg: '#f0fdf4' },
  MEAT_INSPECTOR:       { color: '#d97706', bg: '#fffbeb' },
  INSPECTOR:            { color: '#ea580c', bg: '#fff7ed' },
  FARMER:               { color: '#64748b', bg: '#f8fafc' },
};

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  ACTIVE:    { color: '#16a34a', bg: '#16a34a18' },
  APPROVED:  { color: '#16a34a', bg: '#16a34a18' },
  PENDING:   { color: '#b45309', bg: '#b4530918' },
  SUSPENDED: { color: '#7c3aed', bg: '#7c3aed18' },
  INACTIVE:  { color: '#dc2626', bg: '#dc262618' },
  REJECTED:  { color: '#dc2626', bg: '#dc262618' },
};

const FACILITY_ROLE_LABELS: Record<string, string> = {
  QUARANTINE_SUPERVISOR: 'Quarantine Supervisor',
  VETERINARY_OFFICER:    'Veterinary Officer',
  LAB_TECHNICIAN:        'Lab Technician',
  SLAUGHTER_SUPERVISOR:  'Slaughter Supervisor',
  HALAL_SUPERVISOR:      'Halal Supervisor',
  MEAT_INSPECTOR:        'Meat Inspector',
  INSPECTOR:             'Inspector',
};

function toEditForm(u: MinistryUser): EditForm {
  return {
    full_name: u.full_name ?? '', email: u.email,
    phone: u.phone ?? '', alt_phone: u.alt_phone ?? '',
    id_number: u.id_number ?? '', role: u.role,
    region_code: u.region_code ?? '',
    position_title: u.position_title ?? '', department: u.department ?? '',
    office_id: u.office_id ?? '', office_name: u.office_name ?? '',
    office_location: u.office_location ?? '',
    start_date: u.start_date ?? '', notes: u.notes ?? '',
  };
}

function initials(name: string | null, fallback: string): string {
  const src = name ?? fallback;
  return src.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
}

const fmtDate = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

// ── Page ──────────────────────────────────────────────────────────────────────

export function UsersPage(): JSX.Element {
  const navigate = useNavigate();
  const { id: idParam } = useParams<{ id?: string }>();

  const [tab, setTab] = useState<Tab>('ministry');

  // Ministry
  const [ministryUsers, setMinistryUsers] = useState<MinistryUser[]>([]);
  const [ministryLoading, setMinistryLoading] = useState(true);
  const [ministryError, setMinistryError] = useState<string | null>(null);
  const [selectedMinistry, setSelectedMinistry] = useState<MinistryUser | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);

  // Farmers
  const [farmers, setFarmers] = useState<FarmerUser[]>([]);
  const [farmersLoading, setFarmersLoading] = useState(false);
  const [farmersError, setFarmersError] = useState<string | null>(null);
  const [selectedFarmer, setSelectedFarmer] = useState<FarmerUser | null>(null);

  // Facility Staff
  const [facilityStaff, setFacilityStaff] = useState<FacilityStaff[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<FacilityStaff | null>(null);

  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // ── Load Ministry Users ──────────────────────────────────────────────────────
  const loadMinistry = async () => {
    setMinistryLoading(true); setMinistryError(null);
    const { data, error } = await supabase
      .from('user_registrations').select('*').order('created_at', { ascending: false });
    if (error) setMinistryError(error.message);
    else setMinistryUsers(data ?? []);
    setMinistryLoading(false);
  };

  // ── Load Farmer Users ────────────────────────────────────────────────────────
  const loadFarmers = async () => {
    setFarmersLoading(true); setFarmersError(null);
    const { data, error } = await supabase
      .from('farmers')
      .select('id, farmer_code, full_name, phone_e164, alt_phone, email, national_id, id_type, date_of_birth, gender, region, village, account_type, company_name, rejection_reason, approved_at, approved_by, status, created_at')
      .order('created_at', { ascending: false });
    if (error) setFarmersError(error.message);
    else setFarmers((data ?? []) as FarmerUser[]);
    setFarmersLoading(false);
  };

  // ── Load Facility Staff ──────────────────────────────────────────────────────
  const loadStaff = async () => {
    setStaffLoading(true); setStaffError(null);
    const { data, error } = await supabase
      .from('facility_staff')
      .select('id, facility_id, facility_code, staff_name, staff_role, email, phone, national_id, is_main_contact, auth_account_created, registered_by_name, status, created_at')
      .order('created_at', { ascending: false });
    if (error) setStaffError(error.message);
    else setFacilityStaff((data ?? []) as FacilityStaff[]);
    setStaffLoading(false);
  };

  useEffect(() => { void loadMinistry(); }, []);
  useEffect(() => {
    if (tab === 'farmers' && farmers.length === 0) void loadFarmers();
    if (tab === 'facility' && facilityStaff.length === 0) void loadStaff();
  }, [tab]);

  useEffect(() => {
    if (idParam && ministryUsers.length > 0 && !selectedMinistry) {
      const u = ministryUsers.find(u => u.id === idParam);
      if (u) { setSelectedMinistry(u); setEditMode(false); setEditForm(null); }
    }
  }, [idParam, ministryUsers]);

  // ── Ministry actions ─────────────────────────────────────────────────────────
  const setMinistryStatus = async (id: string, status: string) => {
    setActionBusy(id);
    await supabase.from('user_registrations').update({ status }).eq('id', id);
    setMinistryUsers(prev => prev.map(u => u.id === id ? { ...u, status } : u));
    setSelectedMinistry(prev => prev?.id === id ? { ...prev, status } : prev);
    setActionBusy(null);
  };

  const deleteMinistryUser = async (id: string) => {
    setActionBusy(id);
    await supabase.from('user_registrations').update({ status: 'INACTIVE' }).eq('id', id);
    setMinistryUsers(prev => prev.filter(u => u.id !== id));
    setSelectedMinistry(null);
    setConfirmDelete(null);
    setActionBusy(null);
  };

  const setF = (k: keyof EditForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setEditForm(f => f ? { ...f, [k]: e.target.value } : f);

  const saveMinistryEdit = async () => {
    if (!selectedMinistry || !editForm) return;
    setSaving(true);
    const patch = {
      full_name:       editForm.full_name.trim()       || null,
      email:           editForm.email.trim(),
      phone:           editForm.phone.trim()           || null,
      alt_phone:       editForm.alt_phone.trim()       || null,
      id_number:       editForm.id_number.trim()       || null,
      role:            editForm.role,
      territory_type:  ROLE_TERRITORY[editForm.role]   ?? 'REGIONAL',
      region_code:     editForm.region_code            || null,
      position_title:  editForm.position_title.trim()  || null,
      department:      editForm.department.trim()      || null,
      office_id:       editForm.office_id.trim()       || null,
      office_name:     editForm.office_name.trim()     || null,
      office_location: editForm.office_location.trim() || null,
      start_date:      editForm.start_date             || null,
      notes:           editForm.notes.trim()           || null,
    };
    const { error } = await supabase.from('user_registrations').update(patch).eq('id', selectedMinistry.id);
    setSaving(false);
    if (!error) {
      const updated = { ...selectedMinistry, ...patch };
      setMinistryUsers(prev => prev.map(u => u.id === selectedMinistry.id ? updated : u));
      setSelectedMinistry(updated);
      setEditMode(false);
    }
  };

  // ── Farmer actions ───────────────────────────────────────────────────────────
  const setFarmerStatus = async (id: string, status: string) => {
    setActionBusy(id);
    await supabase.from('farmers').update({ status }).eq('id', id);
    setFarmers(prev => prev.map(f => f.id === id ? { ...f, status } : f));
    setSelectedFarmer(prev => prev?.id === id ? { ...prev, status } : prev);
    setActionBusy(null);
  };

  const deleteFarmer = async (id: string) => {
    setActionBusy(id);
    await supabase.from('farmers').update({ status: 'REJECTED' }).eq('id', id);
    setFarmers(prev => prev.filter(f => f.id !== id));
    setSelectedFarmer(null);
    setConfirmDelete(null);
    setActionBusy(null);
  };

  // ── Facility Staff actions ───────────────────────────────────────────────────
  const setStaffStatus = async (id: string, status: string) => {
    setActionBusy(id);
    await supabase.from('facility_staff').update({ status }).eq('id', id);
    setFacilityStaff(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    setSelectedStaff(prev => prev?.id === id ? { ...prev, status } : prev);
    setActionBusy(null);
  };

  const deleteStaff = async (id: string) => {
    setActionBusy(id);
    await supabase.from('facility_staff').update({ status: 'INACTIVE' }).eq('id', id);
    setFacilityStaff(prev => prev.filter(s => s.id !== id));
    setSelectedStaff(null);
    setConfirmDelete(null);
    setActionBusy(null);
  };

  // ── Counts ───────────────────────────────────────────────────────────────────
  const tabs: { key: Tab; label: string; icon: typeof Users; count: number }[] = [
    { key: 'ministry', label: 'Ministry Users',  icon: Users,    count: ministryUsers.length },
    { key: 'farmers',  label: 'Farmer Users',    icon: Wheat,    count: farmers.length },
    { key: 'facility', label: 'Facility Staff',  icon: Building2, count: facilityStaff.length },
  ];

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className={s.page}>

      {/* Header */}
      <div className={s.header}>
        <div>
          <h1 className={s.title}>User Management</h1>
          <p className={s.sub}>Manage ministry officers, registered farmers and facility staff</p>
        </div>
        {tab === 'ministry' && (
          <button className={s.inviteBtn} onClick={() => navigate('/users/register')}>
            <Plus size={15}/><UserPlus size={15}/> Register User
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className={s.tabBar}>
        {tabs.map(t => (
          <button
            key={t.key}
            className={`${s.tabBtn} ${tab === t.key ? s.tabBtnActive : ''}`}
            onClick={() => setTab(t.key)}
          >
            <t.icon size={14} strokeWidth={2} />
            {t.label}
            {t.count > 0 && <span className={s.tabCount}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* ══ MINISTRY USERS ════════════════════════════════════════════════════ */}
      {tab === 'ministry' && (
        <div className={s.card}>
          {ministryError && <div className={s.errBar}>{ministryError}</div>}
          {ministryLoading ? <div className={s.loading}>Loading users…</div> : (
            <table className={s.table}>
              <thead>
                <tr>
                  <th className={s.th}>User</th>
                  <th className={s.th}>Phone</th>
                  <th className={s.th}>Role</th>
                  <th className={s.th}>Position / Dept</th>
                  <th className={s.th}>Region</th>
                  <th className={s.th}>Status</th>
                  <th className={s.th}>Registered</th>
                  <th className={s.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ministryUsers.length === 0
                  ? <tr><td colSpan={8} className={s.empty}>No ministry users found</td></tr>
                  : ministryUsers.map(u => {
                    const rc = ROLE_COLORS[u.role] ?? ROLE_COLORS.FARMER;
                    const st = STATUS_STYLE[u.status] ?? STATUS_STYLE.INACTIVE;
                    return (
                      <tr key={u.id} className={s.tr}>
                        <td className={s.td}>
                          <div className={s.userCell}>
                            <div className={s.avatar}>{initials(u.full_name, u.email)}</div>
                            <div>
                              <div className={s.userName}>{u.full_name ?? '—'}</div>
                              <div className={s.userEmail}>{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className={s.td}>{u.phone ?? '—'}</td>
                        <td className={s.td}>
                          <span className={s.roleTag} style={{ color: rc.color, background: rc.bg }}>
                            {u.role.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className={s.td}>
                          <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{u.position_title ?? '—'}</div>
                          {u.department && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{u.department}</div>}
                        </td>
                        <td className={s.td}>
                          {u.region_code
                            ? <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0b5ed7' }}>{u.region_code}</span>
                            : <span style={{ color: '#cbd5e1' }}>—</span>}
                        </td>
                        <td className={s.td}>
                          <span className={s.statusBadge} style={{ color: st.color, background: st.bg }}>{u.status}</span>
                        </td>
                        <td className={s.td} style={{ whiteSpace: 'nowrap', color: '#94a3b8', fontSize: '0.8125rem' }}>
                          {fmtDate(u.created_at)}
                        </td>
                        <td className={s.td} style={{ whiteSpace: 'nowrap' }}>
                          <div className={s.actionBtns}>
                            <button className={s.editBtn} onClick={() => { setSelectedMinistry(u); setEditForm(toEditForm(u)); setEditMode(true); }}>
                              <Edit2 size={11}/> Edit
                            </button>
                            {u.status === 'ACTIVE'
                              ? <button className={s.suspendBtn} disabled={actionBusy === u.id} onClick={() => setMinistryStatus(u.id, 'SUSPENDED')}>
                                  <PauseCircle size={11}/> Suspend
                                </button>
                              : <button className={s.activateBtn} disabled={actionBusy === u.id} onClick={() => setMinistryStatus(u.id, 'ACTIVE')}>
                                  <UserCheck size={11}/> Activate
                                </button>
                            }
                            <button className={s.deleteBtn} disabled={actionBusy === u.id} onClick={() => setConfirmDelete(u.id)}>
                              <Trash2 size={11}/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ══ FARMER USERS ══════════════════════════════════════════════════════ */}
      {tab === 'farmers' && (
        <div className={s.card}>
          {farmersError && <div className={s.errBar}>{farmersError}</div>}
          {farmersLoading ? <div className={s.loading}>Loading farmers…</div> : (
            <table className={s.table}>
              <thead>
                <tr>
                  <th className={s.th}>Farmer</th>
                  <th className={s.th}>Farmer Code</th>
                  <th className={s.th}>Phone</th>
                  <th className={s.th}>National ID</th>
                  <th className={s.th}>Region</th>
                  <th className={s.th}>Status</th>
                  <th className={s.th}>Registered</th>
                  <th className={s.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {farmers.length === 0
                  ? <tr><td colSpan={8} className={s.empty}>No farmers found</td></tr>
                  : farmers.map(f => {
                    const st = STATUS_STYLE[f.status] ?? STATUS_STYLE.INACTIVE;
                    return (
                      <tr key={f.id} className={s.tr} onClick={() => setSelectedFarmer(f)} style={{ cursor: 'pointer' }}>
                        <td className={s.td}>
                          <div className={s.userCell}>
                            <div className={s.avatar}>{initials(f.full_name, f.farmer_code)}</div>
                            <div>
                              <div className={s.userName}>{f.full_name}</div>
                              <div className={s.userEmail}>{f.email ?? '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td className={s.td}>
                          <code style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1d4ed8', fontSize: '0.8125rem' }}>{f.farmer_code}</code>
                        </td>
                        <td className={s.td}>{f.phone_e164}</td>
                        <td className={s.td} style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{f.national_id}</td>
                        <td className={s.td}>{f.region}</td>
                        <td className={s.td}>
                          <span className={s.statusBadge} style={{ color: st.color, background: st.bg }}>{f.status}</span>
                        </td>
                        <td className={s.td} style={{ whiteSpace: 'nowrap', color: '#94a3b8', fontSize: '0.8125rem' }}>
                          {fmtDate(f.created_at)}
                        </td>
                        <td className={s.td} onClick={e => e.stopPropagation()}>
                          <div className={s.actionBtns}>
                            {(f.status === 'APPROVED' || f.status === 'ACTIVE')
                              ? <button className={s.suspendBtn} disabled={actionBusy === f.id} onClick={() => setFarmerStatus(f.id, 'SUSPENDED')}>
                                  <PauseCircle size={11}/> Suspend
                                </button>
                              : <button className={s.activateBtn} disabled={actionBusy === f.id} onClick={() => setFarmerStatus(f.id, 'APPROVED')}>
                                  <UserCheck size={11}/> Activate
                                </button>
                            }
                            <button className={s.deleteBtn} disabled={actionBusy === f.id} onClick={() => setConfirmDelete(f.id)}>
                              <Trash2 size={11}/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ══ FACILITY STAFF ════════════════════════════════════════════════════ */}
      {tab === 'facility' && (
        <div className={s.card}>
          {staffError && <div className={s.errBar}>{staffError}</div>}
          {staffLoading ? <div className={s.loading}>Loading facility staff…</div> : (
            <table className={s.table}>
              <thead>
                <tr>
                  <th className={s.th}>Staff Member</th>
                  <th className={s.th}>Facility</th>
                  <th className={s.th}>Role</th>
                  <th className={s.th}>Phone</th>
                  <th className={s.th}>National ID</th>
                  <th className={s.th}>Main Contact</th>
                  <th className={s.th}>Status</th>
                  <th className={s.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {facilityStaff.length === 0
                  ? <tr><td colSpan={8} className={s.empty}>No facility staff found</td></tr>
                  : facilityStaff.map(st => {
                    const rc = ROLE_COLORS[st.staff_role] ?? ROLE_COLORS.FARMER;
                    const ss = STATUS_STYLE[st.status] ?? STATUS_STYLE.INACTIVE;
                    return (
                      <tr key={st.id} className={s.tr} onClick={() => setSelectedStaff(st)} style={{ cursor: 'pointer' }}>
                        <td className={s.td}>
                          <div className={s.userCell}>
                            <div className={s.avatar}>{initials(st.staff_name, st.facility_code)}</div>
                            <div>
                              <div className={s.userName}>{st.staff_name}</div>
                              <div className={s.userEmail}>{st.email ?? '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td className={s.td}>
                          <code style={{ fontFamily: 'monospace', fontWeight: 700, color: '#7c3aed', fontSize: '0.8125rem' }}>{st.facility_code}</code>
                        </td>
                        <td className={s.td}>
                          <span className={s.roleTag} style={{ color: rc.color, background: rc.bg }}>
                            {FACILITY_ROLE_LABELS[st.staff_role] ?? st.staff_role.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className={s.td}>{st.phone ?? '—'}</td>
                        <td className={s.td} style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{st.national_id ?? '—'}</td>
                        <td className={s.td}>
                          {st.is_main_contact
                            ? <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0891b2' }}>★ Main</span>
                            : <span style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>—</span>}
                        </td>
                        <td className={s.td}>
                          <span className={s.statusBadge} style={{ color: ss.color, background: ss.bg }}>{st.status}</span>
                        </td>
                        <td className={s.td} onClick={e => e.stopPropagation()}>
                          <div className={s.actionBtns}>
                            {st.status === 'ACTIVE'
                              ? <button className={s.suspendBtn} disabled={actionBusy === st.id} onClick={() => setStaffStatus(st.id, 'INACTIVE')}>
                                  <PauseCircle size={11}/> Suspend
                                </button>
                              : <button className={s.activateBtn} disabled={actionBusy === st.id} onClick={() => setStaffStatus(st.id, 'ACTIVE')}>
                                  <UserCheck size={11}/> Activate
                                </button>
                            }
                            <button className={s.deleteBtn} disabled={actionBusy === st.id} onClick={() => setConfirmDelete(st.id)}>
                              <Trash2 size={11}/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ══ CONFIRM DELETE ════════════════════════════════════════════════════ */}
      {confirmDelete && (
        <div className={s.drawerOverlay} onClick={() => setConfirmDelete(null)}>
          <div className={s.confirmBox} onClick={e => e.stopPropagation()}>
            <UserX size={28} style={{ color: '#dc2626' }} />
            <div className={s.confirmTitle}>Confirm removal</div>
            <div className={s.confirmMsg}>
              This user will be marked inactive and lose portal access. This action can be reversed by reactivating the account.
            </div>
            <div className={s.confirmBtns}>
              <button className={s.cancelBtn2} onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button
                className={s.confirmDeleteBtn}
                disabled={actionBusy === confirmDelete}
                onClick={() => {
                  if (tab === 'ministry') void deleteMinistryUser(confirmDelete);
                  else if (tab === 'farmers') void deleteFarmer(confirmDelete);
                  else void deleteStaff(confirmDelete);
                }}
              >
                <Trash2 size={13}/> {actionBusy === confirmDelete ? 'Removing…' : 'Remove User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MINISTRY USER DRAWER ══════════════════════════════════════════════ */}
      {selectedMinistry && (() => {
        const u = selectedMinistry;
        const cfg = ROLE_COLORS[u.role] ?? ROLE_COLORS.FARMER;
        const st  = STATUS_STYLE[u.status] ?? STATUS_STYLE.INACTIVE;
        const f   = editForm;
        const close = () => { setSelectedMinistry(null); setEditMode(false); setEditForm(null); };
        return (
          <div className={s.drawerOverlay} onClick={close}>
            <div className={s.drawer} onClick={e => e.stopPropagation()}>
              <div className={s.drawerHead}>
                <div className={s.drawerAvatar}>{initials(u.full_name, u.email)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className={s.drawerName}>{u.full_name ?? '—'}</div>
                  <div className={s.drawerEmail}>{u.email}</div>
                  <span className={s.statusBadge} style={{ color: st.color, background: st.bg, marginTop: 4, display: 'inline-block' }}>{u.status}</span>
                </div>
                <button className={s.drawerClose} onClick={close}><X size={15}/></button>
              </div>
              <div className={s.drawerBody}>
                <div className={s.drawerCols}>
                  <div className={s.drawerCol}>
                    <div className={s.drawerSection}>
                      <div className={s.drawerSectionTitle}>Personal Information</div>
                      <div className={s.drawerGrid}>
                        <div className={s.drawerField} style={{ gridColumn: '1 / -1' }}>
                          <div className={s.drawerLabel}>Full Name</div>
                          {editMode ? <input className={s.drawerInput} value={f?.full_name} onChange={setF('full_name')}/> : <div className={s.drawerValue}>{u.full_name ?? '—'}</div>}
                        </div>
                        <div className={s.drawerField}>
                          <div className={s.drawerLabel}>Email</div>
                          {editMode ? <input className={s.drawerInput} type="email" value={f?.email} onChange={setF('email')}/> : <div className={s.drawerValue}>{u.email}</div>}
                        </div>
                        <div className={s.drawerField}>
                          <div className={s.drawerLabel}>Phone</div>
                          {editMode ? <input className={s.drawerInput} value={f?.phone} onChange={setF('phone')}/> : <div className={s.drawerValue}>{u.phone ?? '—'}</div>}
                        </div>
                        <div className={s.drawerField}>
                          <div className={s.drawerLabel}>National ID</div>
                          {editMode ? <input className={s.drawerInput} value={f?.id_number} onChange={setF('id_number')}/> : <div className={s.drawerValue} style={{ fontFamily: 'monospace' }}>{u.id_number ?? '—'}</div>}
                        </div>
                        <div className={s.drawerField}>
                          <div className={s.drawerLabel}>Alt Phone</div>
                          {editMode ? <input className={s.drawerInput} value={f?.alt_phone} onChange={setF('alt_phone')}/> : <div className={s.drawerValue}>{u.alt_phone ?? '—'}</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={s.drawerCol}>
                    <div className={s.drawerSection}>
                      <div className={s.drawerSectionTitle}>Role & Assignment</div>
                      <div className={s.drawerGrid}>
                        <div className={s.drawerField}>
                          <div className={s.drawerLabel}>Role</div>
                          {editMode
                            ? <select className={s.drawerSelect} value={f?.role} onChange={setF('role')}>
                                {['NATIONAL_ADMIN','REGIONAL_ADMIN','VETERINARY_OFFICER','FIELD_INSPECTOR'].map(r => (
                                  <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                                ))}
                              </select>
                            : <span className={s.roleTag} style={{ color: cfg.color, background: cfg.bg, fontSize: '0.75rem' }}>{u.role.replace(/_/g, ' ')}</span>}
                        </div>
                        <div className={s.drawerField}>
                          <div className={s.drawerLabel}>Region</div>
                          {editMode
                            ? <select className={s.drawerSelect} value={f?.region_code} onChange={setF('region_code')} disabled={!ROLES_WITH_REGION.includes(f?.role ?? '')}>
                                <option value="">— None —</option>
                                {REGIONS.map(r => <option key={r.code} value={r.code}>{r.code} — {r.name}</option>)}
                              </select>
                            : <div className={s.drawerValue} style={{ fontFamily: 'monospace', color: '#0b5ed7', fontWeight: 700 }}>{u.region_code ?? '—'}</div>}
                        </div>
                        <div className={s.drawerField}>
                          <div className={s.drawerLabel}>Position</div>
                          {editMode ? <input className={s.drawerInput} value={f?.position_title} onChange={setF('position_title')}/> : <div className={s.drawerValue}>{u.position_title ?? '—'}</div>}
                        </div>
                        <div className={s.drawerField}>
                          <div className={s.drawerLabel}>Department</div>
                          {editMode ? <input className={s.drawerInput} value={f?.department} onChange={setF('department')}/> : <div className={s.drawerValue}>{u.department ?? '—'}</div>}
                        </div>
                        <div className={s.drawerField}>
                          <div className={s.drawerLabel}>Start Date</div>
                          {editMode ? <input className={s.drawerInput} type="date" value={f?.start_date} onChange={setF('start_date')}/> : <div className={s.drawerValue}>{fmtDate(u.start_date)}</div>}
                        </div>
                        <div className={s.drawerField}>
                          <div className={s.drawerLabel}>Office Name</div>
                          {editMode ? <input className={s.drawerInput} value={f?.office_name} onChange={setF('office_name')}/> : <div className={s.drawerValue}>{u.office_name ?? '—'}</div>}
                        </div>
                        <div className={s.drawerField}>
                          <div className={s.drawerLabel}>Office Location</div>
                          {editMode ? <input className={s.drawerInput} value={f?.office_location} onChange={setF('office_location')}/> : <div className={s.drawerValue}>{u.office_location ?? '—'}</div>}
                        </div>
                      </div>
                    </div>
                    <div className={s.drawerSection}>
                      <div className={s.drawerSectionTitle}>Notes</div>
                      {editMode
                        ? <textarea className={s.drawerTextarea} rows={3} value={f?.notes} onChange={setF('notes')}/>
                        : <div className={s.drawerValue} style={{ whiteSpace: 'pre-wrap', color: u.notes ? '#334155' : '#cbd5e1' }}>{u.notes ?? 'No notes'}</div>}
                    </div>
                  </div>
                </div>
              </div>
              <div className={s.drawerFoot}>
                {editMode ? <>
                  <button className={s.drawerSaveBtn} onClick={saveMinistryEdit} disabled={saving}><Save size={13}/> {saving ? 'Saving…' : 'Save'}</button>
                  <button className={s.drawerCancelEditBtn} onClick={() => setEditMode(false)}>Cancel</button>
                </> : <>
                  <button className={s.drawerEditBtn} onClick={() => { setEditForm(toEditForm(u)); setEditMode(true); }}><Edit2 size={13}/> Edit</button>
                  {u.status === 'ACTIVE'
                    ? <button className={s.drawerSuspendBtn} onClick={() => setMinistryStatus(u.id, 'SUSPENDED')}><PauseCircle size={13}/> Suspend</button>
                    : <button className={s.drawerActivateBtn} onClick={() => setMinistryStatus(u.id, 'ACTIVE')}><UserCheck size={13}/> Activate</button>}
                  <button className={s.drawerDeleteBtn} onClick={() => setConfirmDelete(u.id)}><Trash2 size={13}/> Remove</button>
                </>}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══ FARMER DRAWER ════════════════════════════════════════════════════ */}
      {selectedFarmer && (() => {
        const f  = selectedFarmer;
        const st = STATUS_STYLE[f.status] ?? STATUS_STYLE.INACTIVE;
        const close = () => setSelectedFarmer(null);
        return (
          <div className={s.drawerOverlay} onClick={close}>
            <div className={s.drawer} onClick={e => e.stopPropagation()}>
              <div className={s.drawerHead}>
                <div className={s.drawerAvatar}>{initials(f.full_name, f.farmer_code)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className={s.drawerName}>{f.full_name}</div>
                  <div className={s.drawerEmail}><code style={{ fontFamily: 'monospace', color: '#1d4ed8', fontWeight: 700 }}>{f.farmer_code}</code></div>
                  <span className={s.statusBadge} style={{ color: st.color, background: st.bg, marginTop: 4, display: 'inline-block' }}>{f.status}</span>
                </div>
                <button className={s.drawerClose} onClick={close}><X size={15}/></button>
              </div>
              <div className={s.drawerBody}>
                <div className={s.drawerCols}>
                  <div className={s.drawerCol}>
                    <div className={s.drawerSection}>
                      <div className={s.drawerSectionTitle}>Personal Details</div>
                      <div className={s.drawerGrid}>
                        <div className={s.drawerField}><div className={s.drawerLabel}>Phone</div><div className={s.drawerValue}>{f.phone_e164}</div></div>
                        <div className={s.drawerField}><div className={s.drawerLabel}>Alt Phone</div><div className={s.drawerValue}>{f.alt_phone ?? '—'}</div></div>
                        <div className={s.drawerField}><div className={s.drawerLabel}>Email</div><div className={s.drawerValue}>{f.email ?? '—'}</div></div>
                        <div className={s.drawerField}><div className={s.drawerLabel}>Date of Birth</div><div className={s.drawerValue}>{fmtDate(f.date_of_birth)}</div></div>
                        <div className={s.drawerField}><div className={s.drawerLabel}>Gender</div><div className={s.drawerValue}>{f.gender ?? '—'}</div></div>
                        <div className={s.drawerField}><div className={s.drawerLabel}>Account Type</div><div className={s.drawerValue}>{f.account_type}</div></div>
                        {f.account_type === 'COMPANY' && (
                          <div className={s.drawerField} style={{ gridColumn: '1 / -1' }}><div className={s.drawerLabel}>Company Name</div><div className={s.drawerValue}>{f.company_name ?? '—'}</div></div>
                        )}
                      </div>
                    </div>
                    <div className={s.drawerSection}>
                      <div className={s.drawerSectionTitle}>Identity</div>
                      <div className={s.drawerGrid}>
                        <div className={s.drawerField}><div className={s.drawerLabel}>National ID</div><div className={s.drawerValue} style={{ fontFamily: 'monospace' }}>{f.national_id}</div></div>
                        <div className={s.drawerField}><div className={s.drawerLabel}>ID Type</div><div className={s.drawerValue}>{f.id_type}</div></div>
                      </div>
                    </div>
                  </div>
                  <div className={s.drawerCol}>
                    <div className={s.drawerSection}>
                      <div className={s.drawerSectionTitle}>Location</div>
                      <div className={s.drawerGrid}>
                        <div className={s.drawerField}><div className={s.drawerLabel}>Region</div><div className={s.drawerValue}>{f.region}</div></div>
                        <div className={s.drawerField}><div className={s.drawerLabel}>Village</div><div className={s.drawerValue}>{f.village ?? '—'}</div></div>
                      </div>
                    </div>
                    <div className={s.drawerSection}>
                      <div className={s.drawerSectionTitle}>Registration</div>
                      <div className={s.drawerGrid}>
                        <div className={s.drawerField}><div className={s.drawerLabel}>Registered</div><div className={s.drawerValue}>{fmtDate(f.created_at)}</div></div>
                        {f.approved_at && <div className={s.drawerField}><div className={s.drawerLabel}>Approved</div><div className={s.drawerValue}>{fmtDate(f.approved_at)}</div></div>}
                        {f.approved_by && <div className={s.drawerField} style={{ gridColumn: '1 / -1' }}><div className={s.drawerLabel}>Approved By</div><div className={s.drawerValue}>{f.approved_by}</div></div>}
                        {f.rejection_reason && (
                          <div className={s.drawerField} style={{ gridColumn: '1 / -1' }}>
                            <div className={s.drawerLabel}>Rejection Reason</div>
                            <div className={s.drawerValue} style={{ color: '#dc2626' }}>{f.rejection_reason}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className={s.drawerFoot}>
                {(f.status === 'APPROVED' || f.status === 'ACTIVE')
                  ? <button className={s.drawerSuspendBtn} disabled={actionBusy === f.id} onClick={() => setFarmerStatus(f.id, 'SUSPENDED')}><PauseCircle size={13}/> Suspend</button>
                  : <button className={s.drawerActivateBtn} disabled={actionBusy === f.id} onClick={() => setFarmerStatus(f.id, 'APPROVED')}><UserCheck size={13}/> Activate</button>}
                <button className={s.drawerDeleteBtn} disabled={actionBusy === f.id} onClick={() => setConfirmDelete(f.id)}><Trash2 size={13}/> Remove</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══ FACILITY STAFF DRAWER ════════════════════════════════════════════ */}
      {selectedStaff && (() => {
        const st  = selectedStaff;
        const rc  = ROLE_COLORS[st.staff_role] ?? ROLE_COLORS.FARMER;
        const ss  = STATUS_STYLE[st.status] ?? STATUS_STYLE.INACTIVE;
        const close = () => setSelectedStaff(null);
        return (
          <div className={s.drawerOverlay} onClick={close}>
            <div className={s.drawer} onClick={e => e.stopPropagation()}>
              <div className={s.drawerHead}>
                <div className={s.drawerAvatar}>{initials(st.staff_name, st.facility_code)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className={s.drawerName}>{st.staff_name}</div>
                  <div className={s.drawerEmail}>{st.email ?? '—'}</div>
                  <span className={s.statusBadge} style={{ color: ss.color, background: ss.bg, marginTop: 4, display: 'inline-block' }}>{st.status}</span>
                </div>
                <button className={s.drawerClose} onClick={close}><X size={15}/></button>
              </div>
              <div className={s.drawerBody}>
                <div className={s.drawerSection}>
                  <div className={s.drawerSectionTitle}>Staff Details</div>
                  <div className={s.drawerGrid}>
                    <div className={s.drawerField}>
                      <div className={s.drawerLabel}>Role</div>
                      <span className={s.roleTag} style={{ color: rc.color, background: rc.bg, fontSize: '0.75rem' }}>
                        {FACILITY_ROLE_LABELS[st.staff_role] ?? st.staff_role.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className={s.drawerField}><div className={s.drawerLabel}>Facility Code</div><div className={s.drawerValue} style={{ fontFamily: 'monospace', color: '#7c3aed', fontWeight: 700 }}>{st.facility_code}</div></div>
                    <div className={s.drawerField}><div className={s.drawerLabel}>Phone</div><div className={s.drawerValue}>{st.phone ?? '—'}</div></div>
                    <div className={s.drawerField}><div className={s.drawerLabel}>National ID</div><div className={s.drawerValue} style={{ fontFamily: 'monospace' }}>{st.national_id ?? '—'}</div></div>
                    <div className={s.drawerField}><div className={s.drawerLabel}>Main Contact</div><div className={s.drawerValue}>{st.is_main_contact ? 'Yes' : 'No'}</div></div>
                    <div className={s.drawerField}><div className={s.drawerLabel}>Auth Account</div><div className={s.drawerValue}>{st.auth_account_created ? 'Created' : 'Not created'}</div></div>
                    <div className={s.drawerField}><div className={s.drawerLabel}>Registered</div><div className={s.drawerValue}>{fmtDate(st.created_at)}</div></div>
                    {st.registered_by_name && (
                      <div className={s.drawerField} style={{ gridColumn: '1 / -1' }}><div className={s.drawerLabel}>Registered By</div><div className={s.drawerValue}>{st.registered_by_name}</div></div>
                    )}
                    <div className={s.drawerField}>
                      <div className={s.drawerLabel}>Facility Profile</div>
                      <button className={s.editBtn} onClick={() => { close(); navigate('/facilities/' + st.facility_id); }}>
                        <Building2 size={11}/> Open Facility
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className={s.drawerFoot}>
                {st.status === 'ACTIVE'
                  ? <button className={s.drawerSuspendBtn} disabled={actionBusy === st.id} onClick={() => setStaffStatus(st.id, 'INACTIVE')}><PauseCircle size={13}/> Suspend</button>
                  : <button className={s.drawerActivateBtn} disabled={actionBusy === st.id} onClick={() => setStaffStatus(st.id, 'ACTIVE')}><UserCheck size={13}/> Activate</button>}
                <button className={s.drawerDeleteBtn} disabled={actionBusy === st.id} onClick={() => setConfirmDelete(st.id)}><Trash2 size={13}/> Remove</button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}

export default UsersPage;
