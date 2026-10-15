import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle, ArrowLeft, Eye, EyeOff, Upload, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth.store';
import { logActivity } from '@/lib/activity';
import s from './register-user.module.css';

// ── Constants ─────────────────────────────────────────────────────────────────

const REGIONS = [
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

const ROLES_WITH_REGION = ['REGIONAL_ADMIN', 'VETERINARY_OFFICER', 'FIELD_INSPECTOR'];

const ROLE_TERRITORY: Record<string, string> = {
  NATIONAL_ADMIN:     'NATIONAL',
  REGIONAL_ADMIN:     'REGIONAL',
  VETERINARY_OFFICER: 'REGIONAL',
  FIELD_INSPECTOR:    'REGIONAL',
};

const EMPTY_FORM = {
  fullName: '', email: '', password: '', phone: '', altPhone: '', idNumber: '',
  licenceNumber: '',
  role: 'FIELD_INSPECTOR', regionCode: '',
  officeId: '', officeName: '', officeLocation: '', positionTitle: '', department: '',
  startDate: new Date().toISOString().slice(0, 10), notes: '',
};

const SECTIONS = [
  'Personal Information',
  'Role & Assignment',
  'Office Details',
  'Identity Documents',
  'Notes',
];

const NEXT_STEPS = [
  { title: 'Record Saved',    body: 'The user record is saved to the system with status Pending.' },
  { title: 'Account Created', body: 'A login account will be activated once email is configured.' },
  { title: 'Region Access',   body: 'The user is assigned to their region and gains access to the field portal.' },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export function RegisterUserPage(): JSX.Element {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id?: string }>();
  const isEdit = !!editId;
  const { userId, roles: authRoles } = useAuthStore();

  const [form,        setForm]        = useState(EMPTY_FORM);
  const [saving,      setSaving]      = useState(false);
  const [saveError,   setSaveError]   = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showPwd,     setShowPwd]     = useState(false);

  const [photoFile,    setPhotoFile]    = useState<File | null>(null);
  const [idFrontFile,  setIdFrontFile]  = useState<File | null>(null);
  const [idBackFile,   setIdBackFile]   = useState<File | null>(null);
  const [photoPreview,    setPhotoPreview]    = useState<string | null>(null);
  const [idFrontPreview,  setIdFrontPreview]  = useState<string | null>(null);
  const [idBackPreview,   setIdBackPreview]   = useState<string | null>(null);

  const photoRef   = useRef<HTMLInputElement>(null);
  const frontRef   = useRef<HTMLInputElement>(null);
  const backRef    = useRef<HTMLInputElement>(null);

  const pickFile = (
    setter: (f: File | null) => void,
    previewSetter: (s: string | null) => void,
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setter(file);
    if (file) {
      const r = new FileReader();
      r.onload = () => previewSetter(r.result as string);
      r.readAsDataURL(file);
    } else {
      previewSetter(null);
    }
  };

  const uploadToStorage = async (file: File, folder: string, name: string): Promise<string | null> => {
    const ext  = file.name.split('.').pop() ?? 'bin';
    const path = `${folder}/${name}.${ext}`;
    const { error } = await supabase.storage.from('staff-docs').upload(path, file, { upsert: true, contentType: file.type });
    if (error) return null;
    return supabase.storage.from('staff-docs').getPublicUrl(path).data.publicUrl;
  };

  useEffect(() => {
    if (!editId) return;
    supabase.from('user_registrations').select('*').eq('id', editId).single()
      .then(({ data }) => {
        if (!data) return;
        setForm({
          fullName:      data.full_name      ?? '',
          email:         data.email,
          password:      '',
          phone:         data.phone          ?? '',
          altPhone:      data.alt_phone      ?? '',
          idNumber:       data.id_number       ?? '',
          licenceNumber:  data.licence_number  ?? '',
          role:           data.role,
          regionCode:    data.region_code    ?? '',
          officeId:      data.office_id      ?? '',
          officeName:    data.office_name    ?? '',
          officeLocation: data.office_location ?? '',
          positionTitle: data.position_title ?? '',
          department:    data.department     ?? '',
          startDate:     data.start_date     ?? new Date().toISOString().slice(0, 10),
          notes:         data.notes          ?? '',
        });
      });
  }, [editId]);

  const set = (k: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);

    const f = form;

    const payload = {
      full_name:        f.fullName.trim()       || null,
      email:            f.email.trim(),
      phone:            f.phone.trim()          || null,
      alt_phone:        f.altPhone.trim()       || null,
      id_number:        f.idNumber.trim()       || null,
      licence_number:   f.licenceNumber.trim() || null,
      role:             f.role,
      region_code:      f.regionCode            || null,
      territory_type:   ROLE_TERRITORY[f.role]  ?? 'REGIONAL',
      office_id:        f.officeId.trim()       || null,
      office_name:      f.officeName.trim()     || null,
      office_location:  f.officeLocation.trim() || null,
      position_title:   f.positionTitle.trim()  || null,
      department:       f.department.trim()     || null,
      start_date:       f.startDate             || null,
      notes:            f.notes.trim()          || null,
    };

    if (isEdit) {
      const folder = editId!;
      const [photoUrl, idFrontUrl, idBackUrl] = await Promise.all([
        photoFile   ? uploadToStorage(photoFile,   folder, 'profile') : Promise.resolve(null),
        idFrontFile ? uploadToStorage(idFrontFile, folder, 'id-front') : Promise.resolve(null),
        idBackFile  ? uploadToStorage(idBackFile,  folder, 'id-back')  : Promise.resolve(null),
      ]);
      const editPayload = {
        ...payload,
        ...(photoUrl   ? { photo_url:     photoUrl }   : {}),
        ...(idFrontUrl ? { id_front_url:  idFrontUrl } : {}),
        ...(idBackUrl  ? { id_back_url:   idBackUrl }  : {}),
      };
      const { error } = await supabase.from('user_registrations').update(editPayload).eq('id', editId!);
      setSaving(false);
      if (error) { setSaveError(error.message); return; }
      navigate('/users');
      return;
    }

    // Create mode — create auth account first
    if (f.password.length < 6) {
      setSaveError('Temporary password must be at least 6 characters.');
      setSaving(false);
      return;
    }
    const { data: authData, error: authError } = await supabase.auth.signUp({ email: f.email.trim(), password: f.password });
    if (authError && !authError.message.includes('already registered')) {
      setSaveError('Auth error: ' + authError.message);
      setSaving(false);
      return;
    }
    const folder = authData?.user?.id ?? f.email.trim().replace(/[^a-z0-9]/gi, '_');
    const [photoUrl, idFrontUrl, idBackUrl] = await Promise.all([
      photoFile   ? uploadToStorage(photoFile,   folder, 'profile') : Promise.resolve(null),
      idFrontFile ? uploadToStorage(idFrontFile, folder, 'id-front') : Promise.resolve(null),
      idBackFile  ? uploadToStorage(idBackFile,  folder, 'id-back')  : Promise.resolve(null),
    ]);

    const { error } = await supabase.from('user_registrations').insert({
      ...payload,
      photo_url:        photoUrl    ?? null,
      id_front_url:     idFrontUrl  ?? null,
      id_back_url:      idBackUrl   ?? null,
      status:           'ACTIVE',
      registered_by:    authRoles[0]  ?? 'NATIONAL_ADMIN',
      registered_by_id: userId        ?? null,
    });

    if (error) {
      setSaveError(error.message.includes('does not exist')
        ? 'Table not found. Run invitations-migration.sql in Supabase Dashboard → SQL Editor first.'
        : error.message);
      setSaving(false);
      return;
    }

    void logActivity({
      category:      'USER',
      level:         'INFO',
      title:         'Internal user registered',
      detail:        `${f.fullName.trim()} registered as ${f.role.replace(/_/g, ' ')}`,
      actorRole:     authRoles[0] ?? 'NATIONAL_ADMIN',
      region:        f.regionCode || null,
      userId:        userId ?? undefined,
    });

    setSaveSuccess(true);
    setSaving(false);
  };

  if (saveSuccess) {
    return (
      <div className={s.successPage}>
        <CheckCircle size={52} color="#16a34a" strokeWidth={1.5}/>
        <h2 className={s.successTitle}>Internal User Registered</h2>
        <p className={s.successSub}>The user account and registration record have been saved. Share the temporary password with the user so they can log in.</p>
        <div className={s.successActions}>
          <button className={s.successBtn} onClick={() => { setForm(EMPTY_FORM); setSaveSuccess(false); setPhotoFile(null); setIdFrontFile(null); setIdBackFile(null); setPhotoPreview(null); setIdFrontPreview(null); setIdBackPreview(null); }}>Register Another</button>
          <button className={s.successBtnOutline} onClick={() => navigate('/users')}>Back to Users</button>
        </div>
      </div>
    );
  }

  return (
    <div className={s.page}>

      {/* ── Left: Help panel ── */}
      <aside className={s.helpPanel}>
        <div className={s.helpBrand}>
          <div className={s.helpBrandIcon}>SL</div>
          <div>
            <div className={s.helpBrandName}>QXLITS</div>
            <div className={s.helpBrandSub}>{isEdit ? 'Edit Internal User' : 'Internal User'}</div>
          </div>
        </div>

        <div className={s.helpBlock}>
          <div className={s.helpBlockTitle}>SECTIONS</div>
          {SECTIONS.map((label, i) => (
            <div key={i} className={s.helpStep}>
              <span className={s.helpStepNum}>{i + 1}</span>
              <span className={s.helpStepLabel}>{label}</span>
            </div>
          ))}
        </div>

        <div className={s.helpBlock}>
          <div className={s.helpBlockTitle}>WHAT HAPPENS NEXT</div>
          {NEXT_STEPS.map((item, i) => (
            <div key={i} className={s.helpNext}>
              <span className={s.helpNextNum}>{i + 1}</span>
              <div>
                <div className={s.helpNextTitle}>{item.title}</div>
                <div className={s.helpNextBody}>{item.body}</div>
              </div>
            </div>
          ))}
        </div>

        <div className={s.helpNote}>
          All registered users require approval before accessing the system. Ensure the ID number and email are verified before submitting.
        </div>

        <button className={s.backBtn} onClick={() => navigate('/users')}>
          <ArrowLeft size={14}/> Back to Users
        </button>
      </aside>

      {/* ── Right: Form ── */}
      <div className={s.formCol}>
        <div className={s.formHeaderCard}>
          <h1 className={s.formTitle}>{isEdit ? 'Edit Internal User' : 'Register Internal User'}</h1>
          <p className={s.formSub}>{isEdit ? 'Update the user details and press Save Changes.' : 'Fill in the details below to register a new internal user.'}</p>
        </div>

        <form onSubmit={handleSubmit} className={s.form}>

          <div className={s.formSection}>
            <div className={s.sectionTitle}>Personal Information</div>
            <div className={s.field}>
              <label className={s.label}>Full Name <span className={s.labelNote}>(as per Office ID)</span></label>
              <input className={s.input} value={form.fullName} onChange={set('fullName')}/>
            </div>
            <div className={s.row}>
              <div className={s.field}>
                <label className={s.label}>National ID Number</label>
                <input className={s.input} value={form.idNumber} onChange={set('idNumber')}/>
              </div>
              <div className={s.field}>
                <label className={s.label}>
                  Vet / Inspector Licence No.
                  {(form.role === 'VETERINARY_OFFICER' || form.role === 'FIELD_INSPECTOR') && (
                    <span style={{ marginLeft: '0.25rem', fontSize: '0.7rem', color: '#6b7280' }}>(printed on movement permits)</span>
                  )}
                </label>
                <input
                  className={s.input}
                  value={form.licenceNumber}
                  onChange={set('licenceNumber')}
                  placeholder={form.role === 'VETERINARY_OFFICER' ? 'e.g. VET-SOM-00123' : 'Optional'}
                />
              </div>
            </div>
            <div className={s.row}>
              <div className={s.field}>
                <label className={s.label}>Email <span className={s.required}>*</span></label>
                <input className={s.input} type="email" value={form.email} onChange={set('email')} required/>
              </div>
            </div>
            {!isEdit && (
              <div className={s.field}>
                <label className={s.label}>
                  Temporary Password <span className={s.required}>*</span>
                  <span className={s.labelNote}> (user logs in with this)</span>
                </label>
                <div className={s.pwdWrap}>
                  <input
                    className={s.input}
                    type={showPwd ? 'text' : 'password'}
                    value={form.password}
                    onChange={set('password')}
                    required
                    minLength={6}
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button type="button" className={s.pwdToggle} onClick={() => setShowPwd(p => !p)}>
                    {showPwd ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
              </div>
            )}
            <div className={s.row}>
              <div className={s.field}>
                <label className={s.label}>Phone</label>
                <input className={s.input} value={form.phone} onChange={set('phone')}/>
              </div>
              <div className={s.field}>
                <label className={s.label}>Alternative Phone</label>
                <input className={s.input} value={form.altPhone} onChange={set('altPhone')}/>
              </div>
            </div>
          </div>

          <div className={s.formSection}>
            <div className={s.sectionTitle}>Role & Assignment</div>
            <div className={s.row}>
              <div className={s.field}>
                <label className={s.label}>Role</label>
                <select className={s.input} value={form.role} onChange={e => {
                  const role = e.target.value;
                  setForm(p => ({ ...p, role, regionCode: ROLES_WITH_REGION.includes(role) ? p.regionCode : '' }));
                }}>
                  {['NATIONAL_ADMIN','REGIONAL_ADMIN','VETERINARY_OFFICER','FIELD_INSPECTOR'].map(r => (
                    <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div className={s.field}>
                <label className={s.label}>Position Title</label>
                <input className={s.input} value={form.positionTitle} onChange={set('positionTitle')}/>
              </div>
            </div>
            <div className={s.row}>
              <div className={s.field}>
                <label className={s.label}>Department</label>
                <input className={s.input} value={form.department} onChange={set('department')}/>
              </div>
              <div className={s.field}>
                <label className={s.label}>Assignment Start Date</label>
                <input className={s.input} type="date" value={form.startDate} onChange={set('startDate')}/>
              </div>
            </div>
            {ROLES_WITH_REGION.includes(form.role) && (
              <div className={s.field}>
                <label className={s.label}>
                  Region {!form.regionCode && <span className={s.required}>* required</span>}
                </label>
                <div className={s.regionGrid}>
                  {REGIONS.map(r => (
                    <button
                      key={r.code}
                      type="button"
                      className={`${s.regionCard}${form.regionCode === r.code ? ' ' + s.regionCardActive : ''}`}
                      onClick={() => setForm(p => ({ ...p, regionCode: r.code }))}
                    >
                      <span className={s.regionCode}>{r.code}</span>
                      <span className={s.regionName}>{r.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className={s.formSection}>
            <div className={s.sectionTitle}>Office Details</div>
            <div className={s.row}>
              <div className={s.field}>
                <label className={s.label}>Office ID</label>
                <input className={s.input} value={form.officeId} onChange={set('officeId')}/>
              </div>
              <div className={s.field}>
                <label className={s.label}>Office Name</label>
                <input className={s.input} value={form.officeName} onChange={set('officeName')}/>
              </div>
            </div>
            <div className={s.field}>
              <label className={s.label}>Office Location / Address</label>
              <input className={s.input} value={form.officeLocation} onChange={set('officeLocation')}/>
            </div>
          </div>

          <div className={s.formSection}>
            <div className={s.sectionTitle}>Identity Documents</div>
            <div className={s.docGrid}>

              {/* Profile Photo */}
              <div className={s.docZone} onClick={() => photoRef.current?.click()}>
                {photoPreview
                  ? <>
                      <img src={photoPreview} alt="Profile" className={s.docPreviewImg}/>
                      <button type="button" className={s.docRemoveBtn} onClick={e => { e.stopPropagation(); setPhotoFile(null); setPhotoPreview(null); }}><X size={12}/></button>
                    </>
                  : <div className={s.docPlaceholder}><Upload size={20} strokeWidth={1.5}/><span>Profile Photo</span><span className={s.docHint}>Click to upload</span></div>
                }
                <input ref={photoRef} type="file" accept="image/*" className={s.docInput} onChange={pickFile(setPhotoFile, setPhotoPreview)}/>
              </div>

              {/* ID Front */}
              <div className={s.docZone} onClick={() => frontRef.current?.click()}>
                {idFrontPreview
                  ? <>
                      <img src={idFrontPreview} alt="ID Front" className={s.docPreviewImg}/>
                      <button type="button" className={s.docRemoveBtn} onClick={e => { e.stopPropagation(); setIdFrontFile(null); setIdFrontPreview(null); }}><X size={12}/></button>
                    </>
                  : <div className={s.docPlaceholder}><Upload size={20} strokeWidth={1.5}/><span>ID Document — Front</span><span className={s.docHint}>Click to upload</span></div>
                }
                <input ref={frontRef} type="file" accept="image/*" className={s.docInput} onChange={pickFile(setIdFrontFile, setIdFrontPreview)}/>
              </div>

              {/* ID Back */}
              <div className={s.docZone} onClick={() => backRef.current?.click()}>
                {idBackPreview
                  ? <>
                      <img src={idBackPreview} alt="ID Back" className={s.docPreviewImg}/>
                      <button type="button" className={s.docRemoveBtn} onClick={e => { e.stopPropagation(); setIdBackFile(null); setIdBackPreview(null); }}><X size={12}/></button>
                    </>
                  : <div className={s.docPlaceholder}><Upload size={20} strokeWidth={1.5}/><span>ID Document — Back</span><span className={s.docHint}>Click to upload</span></div>
                }
                <input ref={backRef} type="file" accept="image/*" className={s.docInput} onChange={pickFile(setIdBackFile, setIdBackPreview)}/>
              </div>

            </div>
          </div>

          <div className={s.formSection}>
            <div className={s.sectionTitle}>Notes</div>
            <div className={s.field}>
              <textarea className={s.textarea} rows={3} value={form.notes} onChange={set('notes')}/>
            </div>
          </div>

          {saveError && <div className={s.errorBox}>{saveError}</div>}

          <div className={s.actions}>
            <button type="button" className={s.cancelBtn} onClick={() => navigate('/users')}>Cancel</button>
            <button type="submit" className={s.submitBtn} disabled={saving}>
              {saving ? (isEdit ? 'Saving…' : 'Registering…') : (isEdit ? 'Save Changes' : 'Register User')}
            </button>
          </div>

        </form>
      </div>

      {/* ── Right: Help card ── */}
      <aside className={s.helpCard}>
        <div className={s.helpCardSection}>
          <div className={s.helpCardTitle}>Tips</div>
          <ul className={s.helpCardList}>
            <li>Use the official full name as it appears on the national ID.</li>
            <li>Email is required — it will be used for login once configured.</li>
            <li>Select the correct region — this controls which data the user can access.</li>
            <li>Start date helps track when the user becomes active in the field.</li>
          </ul>
        </div>

        <div className={s.helpCardSection}>
          <div className={s.helpCardTitle}>Required Fields</div>
          <div className={s.helpCardPills}>
            <span className={s.pill}>Email</span>
            <span className={s.pill}>Role</span>
            <span className={s.pill}>Region (field roles)</span>
          </div>
        </div>

        <div className={s.helpCardSection}>
          <div className={s.helpCardTitle}>Role Guide</div>
          <div className={s.roleGuideList}>
            {[
              { role: 'NATIONAL ADMIN',     desc: 'Full system access across all regions.' },
              { role: 'REGIONAL ADMIN',      desc: 'Manages users and data within a region.' },
              { role: 'VETERINARY OFFICER',  desc: 'Reviews movement requests and health events.' },
              { role: 'FIELD INSPECTOR',     desc: 'Verifies animal registrations on the ground.' },
            ].map(r => (
              <div key={r.role} className={s.roleGuideItem}>
                <div className={s.roleGuideRole}>{r.role}</div>
                <div className={s.roleGuideDesc}>{r.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </aside>

    </div>
  );
}

export default RegisterUserPage;
