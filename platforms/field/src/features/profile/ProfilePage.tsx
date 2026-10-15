import { useState, useEffect, useRef } from 'react';
import { Camera, Edit2, Check, X } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase';
import s from './profile.module.css';

interface RegRecord {
  full_name: string | null;
  email: string;
  phone: string | null;
  alt_phone: string | null;
  id_number: string | null;
  role: string;
  territory_type: string | null;
  region_code: string | null;
  position_title: string | null;
  department: string | null;
  office_name: string | null;
  office_id: string | null;
  start_date: string | null;
  status: string;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  FIELD_INSPECTOR:        'Field Inspector',
  VETERINARY_OFFICER:     'Veterinary Officer',
  SLAUGHTERHOUSE_OFFICER: 'Slaughterhouse Officer',
  QUARANTINE_OFFICER:     'Quarantine Officer',
  CHECKPOINT_OFFICER:     'Checkpoint Officer',
  REGIONAL_ADMIN:         'Regional Admin',
  NATIONAL_ADMIN:         'National Admin',
};

export function ProfilePage(): JSX.Element {
  const { userId, roles, territoryType, regionCode } = useAuthStore();
  const role = roles[0] ?? 'FIELD_INSPECTOR';

  const [reg,     setReg]     = useState<RegRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [photo,   setPhoto]   = useState<string | null>(null);
  const fileRef               = useRef<HTMLInputElement>(null);

  // Edit form state
  const [editName,  setEditName]  = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAlt,   setEditAlt]   = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) { setLoading(false); return; }

      const { data } = await supabase
        .from('user_registrations')
        .select('full_name, email, phone, alt_phone, id_number, role, territory_type, region_code, position_title, department, office_name, office_id, start_date, status, created_at')
        .eq('email', user.email)
        .maybeSingle();

      setReg(data ?? null);
      setEditName(data?.full_name  ?? '');
      setEditPhone(data?.phone     ?? '');
      setEditAlt(data?.alt_phone   ?? '');
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    if (!reg) return;
    await supabase.from('user_registrations').update({
      full_name: editName.trim() || null,
      phone:     editPhone.trim() || null,
      alt_phone: editAlt.trim() || null,
    }).eq('email', reg.email);

    setReg(r => r ? { ...r, full_name: editName || null, phone: editPhone || null, alt_phone: editAlt || null } : r);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const displayName = reg?.full_name ?? reg?.email ?? '—';
  const initials    = displayName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  const territory   = [reg?.region_code ?? regionCode].filter(Boolean).join(' / ') || territoryType || '—';

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Loading profile…</div>;
  }

  return (
    <div className={s.page}>
      {saved && (
        <div style={{ position: 'fixed', top: 20, right: 24, zIndex: 9999, background: '#166534', color: '#fff', padding: '0.75rem 1.25rem', borderRadius: 10, fontSize: '0.875rem', fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,.18)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Check size={15}/> Profile saved successfully.
        </div>
      )}

      {/* ── Left: photo card ── */}
      <aside className={s.photoCard}>
        <div className={s.avatarWrap}>
          {photo
            ? <img src={photo} alt="Profile" className={s.avatarImg}/>
            : <div className={s.avatarInitials}>{initials}</div>
          }
          <button type="button" className={s.cameraBtn} title="Change photo" onClick={() => fileRef.current?.click()}>
            <Camera size={14} strokeWidth={1.75} color="#fff"/>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className={s.fileInput} onChange={handlePhoto}/>
        </div>

        <div className={s.photoName}>{displayName}</div>
        <div className={s.photoRole}>{ROLE_LABELS[role] ?? role.replace(/_/g, ' ')}</div>

        <div className={s.statusPill}>
          <span className={s.statusDot}/> {reg?.status ?? 'PENDING'}
        </div>

        <div className={s.photoMeta}>
          <div className={s.photoMetaRow}><span className={s.photoMetaLabel}>User ID</span><span className={s.photoMetaVal}>{userId ? userId.slice(0, 14) + '…' : '—'}</span></div>
          <div className={s.photoMetaRow}><span className={s.photoMetaLabel}>Role</span><span className={s.photoMetaVal}>{role.replace(/_/g, ' ')}</span></div>
          <div className={s.photoMetaRow}><span className={s.photoMetaLabel}>Territory</span><span className={s.photoMetaVal}>{territory}</span></div>
          {reg?.start_date && (
            <div className={s.photoMetaRow}><span className={s.photoMetaLabel}>Start Date</span><span className={s.photoMetaVal}>{new Date(reg.start_date).toLocaleDateString()}</span></div>
          )}
          <div className={s.photoMetaRow}><span className={s.photoMetaLabel}>Registered</span><span className={s.photoMetaVal}>{reg ? new Date(reg.created_at).toLocaleDateString() : '—'}</span></div>
        </div>
      </aside>

      {/* ── Right: details ── */}
      <div className={s.detailsCard}>

        <div className={s.detailsHeader}>
          <div>
            <h1 className={s.detailsTitle}>Profile Details</h1>
            <p className={s.detailsSub}>Your registered information with QXLITS Field Portal</p>
          </div>
          {editing ? (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className={s.editBtn} onClick={() => setEditing(false)}><X size={14}/> Cancel</button>
              <button type="button" className={s.doneBtn} onClick={handleSave}><Check size={14}/> Save Changes</button>
            </div>
          ) : (
            <button type="button" className={s.editBtn} onClick={() => setEditing(true)}><Edit2 size={14}/> Edit Profile</button>
          )}
        </div>

        {!reg ? (
          <div style={{ padding: '2rem', color: '#94a3b8', fontSize: '0.875rem' }}>
            No registration record found for this account. Contact the Ministry to link your profile.
          </div>
        ) : <>

          <Section title="Personal Details">
            <Row label="Full Name">
              {editing ? <input className={s.rowInput} value={editName} onChange={e => setEditName(e.target.value)}/> : <span className={s.rowValue}>{reg.full_name ?? '—'}</span>}
            </Row>
            <Row label="Email Address"><span className={s.rowValue}>{reg.email}</span></Row>
            <Row label="National ID"><span className={`${s.rowValue} ${s.mono}`}>{reg.id_number ?? '—'}</span></Row>
          </Section>

          <Section title="Contact Information">
            <Row label="Primary Phone">
              {editing ? <input className={s.rowInput} value={editPhone} onChange={e => setEditPhone(e.target.value)}/> : <span className={s.rowValue}>{reg.phone ?? '—'}</span>}
            </Row>
            <Row label="Alternative Phone">
              {editing ? <input className={s.rowInput} value={editAlt} onChange={e => setEditAlt(e.target.value)}/> : <span className={s.rowValue}>{reg.alt_phone ?? '—'}</span>}
            </Row>
          </Section>

          <Section title="Assignment">
            <Row label="Role"><span className={s.rowValue}>{ROLE_LABELS[reg.role] ?? reg.role.replace(/_/g, ' ')}</span></Row>
            {reg.position_title && <Row label="Position"><span className={s.rowValue}>{reg.position_title}</span></Row>}
            {reg.department     && <Row label="Department"><span className={s.rowValue}>{reg.department}</span></Row>}
            <Row label="Territory"><span className={s.rowValue}>{reg.territory_type ?? '—'}</span></Row>
            {reg.region_code    && <Row label="Region"><span className={`${s.rowValue} ${s.mono}`}>{reg.region_code}</span></Row>}
            {reg.start_date     && <Row label="Start Date"><span className={s.rowValue}>{new Date(reg.start_date).toLocaleDateString()}</span></Row>}
          </Section>

          {(reg.office_name || reg.office_id) && (
            <Section title="Office Details">
              {reg.office_name && <Row label="Office Name"><span className={s.rowValue}>{reg.office_name}</span></Row>}
              {reg.office_id   && <Row label="Office ID"><span className={`${s.rowValue} ${s.mono}`}>{reg.office_id}</span></Row>}
            </Section>
          )}

          <Section title="Account" last>
            <Row label="Status">
              <span style={{ fontWeight: 700, color: reg.status === 'ACTIVE' ? '#16a34a' : reg.status === 'PENDING' ? '#b45309' : '#dc2626' }}>
                {reg.status}
              </span>
            </Row>
            <Row label="Registered"><span className={s.rowValue}>{new Date(reg.created_at).toLocaleDateString()}</span></Row>
          </Section>

        </>}

      </div>
    </div>
  );
}

function Section({ title, children, last }: { title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={`${s.section}${last ? ' ' + s.sectionLast : ''}`}>
      <div className={s.sectionTitle}>{title}</div>
      <div className={s.sectionRows}>{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={s.row}>
      <span className={s.rowLabel}>{label}</span>
      {children}
    </div>
  );
}

export default ProfilePage;
