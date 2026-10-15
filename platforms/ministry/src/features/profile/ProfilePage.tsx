import { useState, useRef } from 'react';
import { Camera, Edit2, Check, X } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import s from './profile.module.css';

export function ProfilePage(): JSX.Element {
  const { userId, roles, territoryType } = useAuthStore();
  const role = roles[0] ?? 'MINISTRY_OFFICER';

  const [photo, setPhoto]     = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saved,   setSaved]   = useState(false);
  const fileRef               = useRef<HTMLInputElement>(null);

  function handleSave() { setEditing(false); setSaved(true); setTimeout(() => setSaved(false), 3000); }
  function handleCancel() { setEditing(false); }

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className={s.pageWrap}>
    <div className={s.page}>
      {saved && (
        <div style={{ position: 'fixed', top: 20, right: 24, zIndex: 9999, background: '#166534', color: '#fff', padding: '0.75rem 1.25rem', borderRadius: 10, fontSize: '0.875rem', fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,.18)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Check size={15} /> Profile saved successfully.
        </div>
      )}

      <aside className={s.photoCard}>
        <div className={s.avatarWrap}>
          {photo
            ? <img src={photo} alt="Profile" className={s.avatarImg} />
            : <div className={s.avatarInitials}>AO</div>
          }
          <button type="button" className={s.cameraBtn} title="Change photo" onClick={() => fileRef.current?.click()}>
            <Camera size={14} strokeWidth={1.75} color="#fff" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className={s.fileInput} onChange={handlePhoto} />
        </div>

        <div className={s.photoName}>Ahmed Omar Hassan</div>
        <div className={s.photoRole}>Ministry Administrator</div>

        <div className={s.statusPill}>
          <span className={s.statusDot} /> Active
        </div>

        <div className={s.photoMeta}>
          <div className={s.photoMetaRow}><span className={s.photoMetaLabel}>Officer ID</span><span className={s.photoMetaVal}>{userId ? userId.slice(0, 14) + '…' : '—'}</span></div>
          <div className={s.photoMetaRow}><span className={s.photoMetaLabel}>Role</span><span className={s.photoMetaVal}>{role}</span></div>
          <div className={s.photoMetaRow}><span className={s.photoMetaLabel}>Territory</span><span className={s.photoMetaVal}>{territoryType ?? 'National'}</span></div>
          <div className={s.photoMetaRow}><span className={s.photoMetaLabel}>Registered</span><span className={s.photoMetaVal}>2023-11-08</span></div>
        </div>
      </aside>

      <div className={s.detailsCard}>
        <div className={s.detailsHeader}>
          <div>
            <h1 className={s.detailsTitle}>Profile Details</h1>
            <p className={s.detailsSub}>Your registered information with QXLITS Ministry Portal</p>
          </div>
          {editing ? (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className={s.editBtn} onClick={handleCancel}><X size={14} /> Cancel</button>
              <button type="button" className={s.doneBtn} onClick={handleSave}><Check size={14} /> Save Changes</button>
            </div>
          ) : (
            <button type="button" className={s.editBtn} onClick={() => setEditing(true)}><Edit2 size={14} /> Edit Profile</button>
          )}
        </div>

        <Section title="Personal Details">
          <Row label="Full Name"     value="Ahmed Omar Hassan" editable={editing} />
          <Row label="Date of Birth" value="1978-03-12"        editable={editing} />
          <Row label="Gender"        value="Male"               editable={editing} />
        </Section>

        <Section title="Contact Information">
          <Row label="Primary Phone"  value="+252 61 345 6789"           editable={editing} />
          <Row label="Email Address"  value="ahmed.hassan@molfd.gov.so"  editable={editing} />
        </Section>

        <Section title="Identity Documents">
          <Row label="ID Type"   value="Government Staff ID" editable={editing} />
          <Row label="ID Number" value="GOV-2023-00471"      editable={editing} mono />
          <Row label="ID Status" value="Verified" status="green" />
        </Section>

        <Section title="Assignment">
          <Row label="Department"      value="Livestock Identification"  editable={editing} />
          <Row label="Territory"       value={territoryType ?? 'National'} />
          <Row label="Office Location" value="Mogadishu HQ"              editable={editing} />
        </Section>

        <Section title="Account Security" last>
          <Row label="Password"       value="••••••••••••" />
          <Row label="Last Login"     value="2026-07-31 at 09:15 UTC" mono />
          <Row label="Account Status" value="Active" status="green" />
        </Section>
      </div>
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

function Row({ label, value, editable, mono, status }: {
  label: string; value: string; editable?: boolean; mono?: boolean; status?: 'green' | 'red';
}) {
  const [val, setVal] = useState(value);
  return (
    <div className={s.row}>
      <span className={s.rowLabel}>{label}</span>
      {editable
        ? <input className={s.rowInput} value={val} onChange={e => setVal(e.target.value)} />
        : status
          ? <span className={status === 'green' ? s.valueGreen : s.valueRed}>{value}</span>
          : <span className={`${s.rowValue}${mono ? ' ' + s.mono : ''}`}>{val}</span>
      }
    </div>
  );
}

export default ProfilePage;
