import { useState, useRef, useEffect } from 'react';
import { Camera, Edit2, Check, X, Upload, Trash2, FileText, ExternalLink, Plus, Loader, Building2, UserCheck, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';
import {
  fetchPremisesAccounts, createPremisesAccount, updatePremisesAccount, deletePremisesAccount,
  type PremisesAccount,
} from '@/features/premises/premises-accounts.supabase';
import s from './profile.module.css';

/* ── Types ── */

interface Draft {
  fullName:    string;
  dateOfBirth: string;
  phoneE164:   string;
  altPhone:    string;
  email:       string;
}

interface FarmerProfile {
  fullName:    string;
  dateOfBirth: string | null;
  gender:      string | null;
  phoneE164:   string;
  altPhone:    string | null;
  email:       string | null;
  nationalId:  string;
  idType:      string;
  region:      string;
  village:     string | null;
  photoUrl:    string | null;
  idFrontUrl:  string | null;
  idBackUrl:   string | null;
  status:      string;
  createdAt:   string;
}

interface PremisesRow {
  id: string; premisesCode: string; premisesName: string;
  status: string; regionCode: string;
}

interface FarmerDoc {
  id:           string;
  documentType: string;
  label:        string;
  fileUrl:      string;
  uploadedAt:   string;
}

/* ── Constants ── */

const DOC_TYPES = [
  { value: 'LAND_DOCUMENT',     label: 'Land / Grazing Document' },
  { value: 'VETERINARY_RECORD', label: 'Veterinary Record'       },
  { value: 'PERMIT',            label: 'Permit / Licence'        },
  { value: 'CERTIFICATE',       label: 'Certificate'             },
  { value: 'IDENTITY',          label: 'Additional ID'           },
  { value: 'OTHER',             label: 'Other'                   },
];

/* ── Helpers ── */

function toInitials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}
function fmtGender(g: string | null) {
  if (!g) return '—';
  return g === 'MALE' ? 'Male' : g === 'FEMALE' ? 'Female' : 'Prefer not to say';
}
function fmtIdType(t: string) {
  return t === 'NATIONAL_ID' ? 'National ID Card' : t === 'PASSPORT' ? 'Passport' : t;
}
function fmtDocType(t: string) {
  return DOC_TYPES.find(d => d.value === t)?.label ?? t;
}
function fmtDate(iso: string) { return iso.slice(0, 10); }

/* ── Supabase ── */

async function fetchDocs(farmerId: string): Promise<FarmerDoc[]> {
  const { data } = await supabase
    .from('farmer_documents')
    .select('id, document_type, label, file_url, uploaded_at')
    .eq('farmer_id', farmerId)
    .order('uploaded_at', { ascending: false });
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id:           r.id           as string,
    documentType: r.document_type as string,
    label:        r.label        as string,
    fileUrl:      r.file_url     as string,
    uploadedAt:   r.uploaded_at  as string,
  }));
}

async function uploadDoc(farmerId: string, file: File, label: string, documentType: string): Promise<void> {
  const ext  = file.name.split('.').pop() ?? 'bin';
  const path = `${farmerId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error: upErr } = await supabase.storage.from('farmer-documents').upload(path, file);
  if (upErr) throw new Error(upErr.message);
  const { data: { publicUrl } } = supabase.storage.from('farmer-documents').getPublicUrl(path);
  const { error } = await supabase.from('farmer_documents').insert({
    farmer_id:     farmerId,
    document_type: documentType,
    label:         label || documentType,
    file_url:      publicUrl,
    uploaded_by:   farmerId,
    uploaded_at:   new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

async function deleteDoc(docId: string, fileUrl: string): Promise<void> {
  try {
    const match = fileUrl.match(/farmer-documents\/(.+)$/);
    if (match) await supabase.storage.from('farmer-documents').remove([match[1]]);
  } catch { /* storage cleanup non-fatal */ }
  const { error } = await supabase.from('farmer_documents').delete().eq('id', docId);
  if (error) throw new Error(error.message);
}

/* ── Component ── */

export function ProfilePage(): JSX.Element {
  const { userId, farmerId, farmerCode, farmerStatus } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'profile' | 'documents' | 'premises-accounts'>('profile');

  const [profile,  setProfile]  = useState<FarmerProfile | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [photo,    setPhoto]    = useState<string | null>(null);
  const [editing,  setEditing]  = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [draft,    setDraft]    = useState<Draft | null>(null);

  const [docs,          setDocs]          = useState<FarmerDoc[]>([]);
  const [docsLoaded,    setDocsLoaded]    = useState(false);
  const [addOpen,       setAddOpen]       = useState(false);
  const [docType,       setDocType]       = useState(DOC_TYPES[0].value);
  const [docLabel,      setDocLabel]      = useState('');
  const [docFile,       setDocFile]       = useState<File | null>(null);
  const [uploading,     setUploading]     = useState(false);
  const [deleting,      setDeleting]      = useState<string | null>(null);
  const [docErr,        setDocErr]        = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Premises accounts tab
  const [premises,      setPremises]      = useState<PremisesRow[]>([]);
  const [paAccounts,    setPaAccounts]    = useState<PremisesAccount[]>([]);
  const [paLoading,     setPaLoading]     = useState(false);
  const [paModal,       setPaModal]       = useState<PremisesRow | null>(null);
  const [paRepName,     setPaRepName]     = useState('');
  const [paEmail,       setPaEmail]       = useState('');
  const [paPassword,    setPaPassword]    = useState('');
  const [paShowPwd,     setPaShowPwd]     = useState(false);
  const [paSubmitting,  setPaSubmitting]  = useState(false);
  const [paError,       setPaError]       = useState<string | null>(null);
  const [paDeleting,    setPaDeleting]    = useState<string | null>(null);

  const photoRef   = useRef<HTMLInputElement>(null);
  const docFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('farmers')
      .select('full_name, date_of_birth, gender, phone_e164, alt_phone, email, national_id, id_type, region, village, photo_url, id_front_url, id_back_url, status, created_at')
      .eq('user_id', userId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        const r = data as Record<string, string | null>;
        setProfile({
          fullName:    r.full_name    as string,
          dateOfBirth: r.date_of_birth,
          gender:      r.gender,
          phoneE164:   r.phone_e164  as string,
          altPhone:    r.alt_phone,
          email:       r.email,
          nationalId:  r.national_id as string,
          idType:      r.id_type     as string,
          region:      r.region      as string,
          village:     r.village,
          photoUrl:    r.photo_url,
          idFrontUrl:  r.id_front_url,
          idBackUrl:   r.id_back_url,
          status:      r.status      as string,
          createdAt:   r.created_at  as string,
        });
        setDraft({
          fullName:    r.full_name    as string,
          dateOfBirth: (r.date_of_birth as string | null) ?? '',
          phoneE164:   r.phone_e164  as string,
          altPhone:    (r.alt_phone  as string | null) ?? '',
          email:       (r.email      as string | null) ?? '',
        });
        if (r.photo_url) setPhoto(r.photo_url as string);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    if (!farmerId) return;
    fetchDocs(farmerId).then(d => { setDocs(d); setDocsLoaded(true); });
  }, [farmerId]);

  useEffect(() => {
    if (activeTab !== 'premises-accounts' || !farmerId || !userId) return;
    setPaLoading(true);
    Promise.all([
      supabase.from('farmer_premises').select('id, premises_code, premises_name, status, region_code').eq('user_id', userId).order('created_at'),
      fetchPremisesAccounts(farmerId),
    ]).then(([{ data: pRows }, accounts]) => {
      setPremises((pRows ?? []).map((r: Record<string, unknown>) => ({
        id:           r.id as string,
        premisesCode: r.premises_code as string,
        premisesName: r.premises_name as string,
        status:       r.status as string,
        regionCode:   r.region_code as string,
      })));
      setPaAccounts(accounts);
    }).catch(console.error).finally(() => setPaLoading(false));
  }, [activeTab, farmerId, userId]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;

    // Show instant local preview
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);

    if (!farmerId || !userId) return;
    setPhotoUploading(true);
    try {
      const ext  = file.name.split('.').pop() ?? 'jpg';
      const path = `${farmerId}/profile.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('farmer-photos')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('farmer-photos').getPublicUrl(path);
      const { error: dbErr } = await supabase
        .from('farmers')
        .update({ photo_url: publicUrl })
        .eq('user_id', userId);
      if (dbErr) throw dbErr;
      setPhoto(publicUrl);
      setProfile(prev => prev ? { ...prev, photoUrl: publicUrl } : prev);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Photo upload failed:', err);
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSave = async () => {
    if (!userId || !profile || !draft) return;
    setSaving(true);
    try {
      const patch: Record<string, string | null> = {};
      const changed: string[] = [];

      if (draft.fullName !== profile.fullName) {
        patch.full_name = draft.fullName;
        changed.push('Full Name');
      }
      const dob = draft.dateOfBirth || null;
      if (dob !== profile.dateOfBirth) {
        patch.date_of_birth = dob;
        changed.push('Date of Birth');
      }
      if (draft.phoneE164 !== profile.phoneE164) {
        patch.phone_e164 = draft.phoneE164;
        changed.push('Phone');
      }
      const alt = draft.altPhone || null;
      if (alt !== profile.altPhone) {
        patch.alt_phone = alt;
        changed.push('Alt Phone');
      }
      const email = draft.email || null;
      if (email !== profile.email) {
        patch.email = email;
        changed.push('Email');
      }

      if (Object.keys(patch).length > 0) {
        const { error } = await supabase.from('farmers').update(patch).eq('user_id', userId);
        if (error) throw error;
        setProfile(prev => prev ? { ...prev,
          fullName:    draft.fullName,
          dateOfBirth: dob,
          phoneE164:   draft.phoneE164,
          altPhone:    alt,
          email:       email,
        } : prev);
      }

      void logActivity({
        category:  'USER',
        level:     'INFO',
        title:     'Profile updated by farmer',
        detail:    changed.length > 0 ? `Changed: ${changed.join(', ')}` : 'Saved with no field changes',
        actorRole: 'Farmer',
        userId:    userId ?? null,
        farmerId:  farmerId ?? null,
        region:    profile.region,
      });

      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Profile save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async () => {
    if (!farmerId || !docFile) return;
    setDocErr(null); setUploading(true);
    try {
      await uploadDoc(farmerId, docFile, docLabel, docType);
      const refreshed = await fetchDocs(farmerId);
      setDocs(refreshed);
      setAddOpen(false); setDocLabel(''); setDocFile(null); setDocType(DOC_TYPES[0].value);
      if (docFileRef.current) docFileRef.current.value = '';
    } catch (err) {
      setDocErr(err instanceof Error ? err.message : 'Upload failed.');
    } finally { setUploading(false); }
  };

  const handleDelete = async (doc: FarmerDoc) => {
    if (!farmerId || !window.confirm(`Delete "${doc.label}"?`)) return;
    setDeleting(doc.id);
    try {
      await deleteDoc(doc.id, doc.fileUrl);
      setDocs(prev => prev.filter(d => d.id !== doc.id));
    } finally { setDeleting(null); }
  };

  const handleCreatePaAccount = async () => {
    if (!paModal || !farmerId) return;
    setPaError(null); setPaSubmitting(true);
    try {
      const account = await createPremisesAccount({
        premisesId:         paModal.id,
        premisesCode:       paModal.premisesCode,
        farmerId,
        representativeName: paRepName.trim(),
        email:              paEmail.trim(),
        password:           paPassword,
      });
      setPaAccounts(prev => [...prev, account]);
      setPaModal(null); setPaRepName(''); setPaEmail(''); setPaPassword('');
    } catch (err) {
      setPaError(err instanceof Error ? err.message : 'Failed to create account.');
    } finally { setPaSubmitting(false); }
  };

  const handleTogglePaStatus = async (account: PremisesAccount) => {
    const next = account.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await updatePremisesAccount(account.id, { status: next });
    setPaAccounts(prev => prev.map(a => a.id === account.id ? { ...a, status: next } : a));
  };

  const handleDeletePaAccount = async (account: PremisesAccount) => {
    if (!window.confirm(`Remove representative account for ${account.premisesCode}?`)) return;
    setPaDeleting(account.id);
    try {
      await deletePremisesAccount(account.id);
      setPaAccounts(prev => prev.filter(a => a.id !== account.id));
    } finally { setPaDeleting(null); }
  };

  const name     = profile?.fullName ?? '—';
  const initials = name !== '—' ? toInitials(name) : '?';
  const status   = profile?.status ?? farmerStatus ?? '—';

  return (
    <div className={s.pageWrap}>
    <div className={s.page}>
      {saved && (
        <div style={{ position:'fixed', top:20, right:24, zIndex:9999, background:'#166534', color:'#fff', padding:'0.75rem 1.25rem', borderRadius:10, fontSize:'0.875rem', fontWeight:600, boxShadow:'0 4px 16px rgba(0,0,0,.18)', display:'flex', alignItems:'center', gap:'0.5rem' }}>
          <Check size={15} /> Profile saved successfully.
        </div>
      )}

      {/* ── Left: photo card ── */}
      <aside className={s.photoCard}>
        <div className={s.avatarWrap}>
          {photo
            ? <img src={photo} alt="Profile" className={s.avatarImg} />
            : <div className={s.avatarInitials}>{initials}</div>
          }
          <button
            type="button"
            className={s.cameraBtn}
            title={photoUploading ? 'Uploading…' : 'Change photo'}
            disabled={photoUploading}
            onClick={() => !photoUploading && photoRef.current?.click()}
          >
            {photoUploading
              ? <Loader size={13} color="#fff" style={{ animation: 'spin 0.7s linear infinite' }} />
              : <Camera size={14} strokeWidth={1.75} color="#fff" />}
          </button>
          <input ref={photoRef} type="file" accept="image/*" className={s.fileInput} onChange={e => { void handlePhotoChange(e); }} />
        </div>

        <div className={s.photoName}>{name}</div>
        <div className={s.photoRole}>Livestock Farmer</div>

        <div className={s.statusPill}>
          <span className={s.statusDot} /> {status}
        </div>

        <div className={s.photoMeta}>
          <div className={s.photoMetaRow}><span className={s.photoMetaLabel}>Farmer Code</span><span className={s.photoMetaVal}>{farmerCode ?? '—'}</span></div>
          <div className={s.photoMetaRow}><span className={s.photoMetaLabel}>Region</span><span className={s.photoMetaVal}>{profile?.region ?? '—'}</span></div>
        </div>

        {farmerCode && (
          <div className={s.qrWrap}>
            <div className={s.qrClientId}>{farmerCode}</div>
            <QRCodeSVG
              value={`${window.location.origin.replace(':3000', ':3001')}/f/${farmerCode}`}
              size={110}
              level="M"
              includeMargin={false}
            />
            <div className={s.qrHint}>Scan to view public profile</div>
          </div>
        )}
      </aside>

      {/* ── Right: tabbed card ── */}
      <div className={s.mainCard}>

        {/* Tab bar */}
        <div className={s.tabBar}>
          <button className={`${s.tab}${activeTab === 'profile' ? ' ' + s.tabActive : ''}`}
            onClick={() => setActiveTab('profile')}>
            Profile Details
          </button>
          <button className={`${s.tab}${activeTab === 'documents' ? ' ' + s.tabActive : ''}`}
            onClick={() => setActiveTab('documents')}>
            My Documents
            {docs.length > 0 && <span className={s.tabBadge}>{docs.length}</span>}
          </button>
          <button className={`${s.tab}${activeTab === 'premises-accounts' ? ' ' + s.tabActive : ''}`}
            onClick={() => setActiveTab('premises-accounts')}>
            Farm Accounts
            {paAccounts.length > 0 && <span className={s.tabBadge}>{paAccounts.length}</span>}
          </button>

          {/* Tab-specific actions */}
          <div className={s.tabActions}>
            {activeTab === 'profile' && (
              editing ? (
                <>
                  <button className={s.cancelBtn} onClick={() => {
                    setEditing(false);
                    if (profile) setDraft({ fullName: profile.fullName, dateOfBirth: profile.dateOfBirth ?? '', phoneE164: profile.phoneE164, altPhone: profile.altPhone ?? '', email: profile.email ?? '' });
                  }}><X size={13} /> Cancel</button>
                  <button className={s.doneBtn} disabled={saving} onClick={() => { void handleSave(); }}>
                    {saving ? <Loader size={13} style={{ animation:'spin 0.7s linear infinite' }} /> : <Check size={13} />} {saving ? 'Saving…' : 'Save'}
                  </button>
                </>
              ) : (
                <button className={s.editBtn} onClick={() => setEditing(true)}><Edit2 size={13} /> Edit Profile</button>
              )
            )}
            {activeTab === 'documents' && (
              <button className={s.addDocBtn} onClick={() => setAddOpen(o => !o)}>
                <Plus size={13} strokeWidth={2.5} /> Add Document
              </button>
            )}
          </div>
        </div>

        {/* ── Profile tab ── */}
        {activeTab === 'profile' && (
          <div className={s.tabBody}>
            {loading ? (
              <div className={s.tabMsg}>Loading profile…</div>
            ) : !profile ? (
              <div className={s.tabMsg} style={{ color:'#ef4444' }}>Could not load profile data.</div>
            ) : (
              <>
                <Section title="Personal Details">
                  <Row label="Full Name"     value={editing && draft ? draft.fullName : profile.fullName}           editable={editing} onChange={v => setDraft(d => d ? { ...d, fullName: v } : d)} />
                  <Row label="Date of Birth" value={editing && draft ? draft.dateOfBirth : (profile.dateOfBirth ?? '—')} editable={editing} onChange={v => setDraft(d => d ? { ...d, dateOfBirth: v } : d)} />
                  <Row label="Gender"        value={fmtGender(profile.gender)} />
                </Section>
                <Section title="Contact Information">
                  <Row label="Primary Phone"     value={editing && draft ? draft.phoneE164 : profile.phoneE164}       editable={editing} onChange={v => setDraft(d => d ? { ...d, phoneE164: v } : d)} />
                  <Row label="Alternative Phone" value={editing && draft ? draft.altPhone  : (profile.altPhone ?? '—')} editable={editing} onChange={v => setDraft(d => d ? { ...d, altPhone: v } : d)} />
                  <Row label="Email Address"     value={editing && draft ? draft.email     : (profile.email    ?? '—')} editable={editing} onChange={v => setDraft(d => d ? { ...d, email: v } : d)} />
                </Section>
                <Section title="Identity Documents">
                  <Row label="ID Type"   value={fmtIdType(profile.idType)} />
                  <Row label="ID Number" value={profile.nationalId} mono />
                  <Row label="ID Status" value="Verified" status="green" />
                </Section>
                <Section title="Location">
                  <Row label="Region"               value={profile.region} />
                  <Row label="Village / Settlement" value={profile.village ?? '—'} />
                </Section>
                <Section title="Account Security" last>
                  <Row label="Password"       value="••••••••••••" />
                  <Row label="Registered"     value={fmtDate(profile.createdAt)} mono />
                  <Row label="Account Status" value={status} status={status === 'APPROVED' ? 'green' : 'red'} />
                </Section>
              </>
            )}
          </div>
        )}

        {/* ── Documents tab ── */}
        {activeTab === 'documents' && (
          <div className={s.tabBody}>

            {/* Upload form */}
            {addOpen && (
              <div className={s.uploadForm}>
                <div className={s.uploadRow}>
                  <div className={s.uploadField}>
                    <label className={s.uploadLabel}>Document Type</label>
                    <select className={s.uploadSel} value={docType} onChange={e => setDocType(e.target.value)}>
                      {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className={s.uploadField}>
                    <label className={s.uploadLabel}>Label / Description</label>
                    <input className={s.uploadInp} type="text" placeholder="e.g. Land title — Baidoa farm"
                      value={docLabel} onChange={e => setDocLabel(e.target.value)} />
                  </div>
                </div>
                <div className={s.uploadFileRow}>
                  <input ref={docFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    style={{ display:'none' }} onChange={e => setDocFile(e.target.files?.[0] ?? null)} />
                  <button type="button" className={s.chooseFileBtn} onClick={() => docFileRef.current?.click()}>
                    <Upload size={13} /> {docFile ? docFile.name : 'Choose file…'}
                  </button>
                  {docFile && <span className={s.fileSize}>{(docFile.size / 1024).toFixed(0)} KB</span>}
                  <button type="button" className={s.uploadSubmitBtn} disabled={!docFile || uploading} onClick={handleUpload}>
                    {uploading ? 'Uploading…' : 'Upload'}
                  </button>
                  <button type="button" className={s.cancelUploadBtn} onClick={() => { setAddOpen(false); setDocFile(null); setDocErr(null); }}>
                    Cancel
                  </button>
                </div>
                {docErr && <p className={s.docErr}>{docErr}</p>}
              </div>
            )}

            {/* Official ID documents from registration */}
            {!loading && profile && (
              <Section title="Official Identity Documents">
                <div className={s.idDocGrid}>
                  {profile.photoUrl && (
                    <IdDocCard label="Profile Photo" url={profile.photoUrl} />
                  )}
                  {profile.idFrontUrl && (
                    <IdDocCard label="ID Front" url={profile.idFrontUrl} />
                  )}
                  {profile.idBackUrl && (
                    <IdDocCard label="ID Back" url={profile.idBackUrl} />
                  )}
                  {!profile.photoUrl && !profile.idFrontUrl && !profile.idBackUrl && (
                    <p style={{ color:'#94a3b8', fontSize:'0.875rem' }}>No identity documents were uploaded during registration.</p>
                  )}
                </div>
              </Section>
            )}

            {/* Additional uploaded documents */}
            <Section title="Additional Documents" last>
              {!docsLoaded ? (
                <div className={s.tabMsg}>Loading documents…</div>
              ) : docs.length === 0 ? (
                <div className={s.docsEmpty}>
                  <FileText size={28} strokeWidth={1} color="#cbd5e1" />
                  <span>No additional documents uploaded yet. Click Add Document to upload one.</span>
                </div>
              ) : (
                <div className={s.docsList}>
                  {docs.map(doc => (
                    <div key={doc.id} className={s.docRow}>
                      <div className={s.docIcon}><FileText size={16} strokeWidth={1.5} color="#64748b" /></div>
                      <div className={s.docInfo}>
                        <div className={s.docLabel}>{doc.label}</div>
                        <div className={s.docMeta}>
                          <span className={s.docTypeBadge}>{fmtDocType(doc.documentType)}</span>
                          <span className={s.docDate}>{fmtDate(doc.uploadedAt)}</span>
                        </div>
                      </div>
                      <div className={s.docActions}>
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className={s.docViewBtn} title="Open">
                          <ExternalLink size={13} strokeWidth={1.75} />
                        </a>
                        <button type="button" className={s.docDeleteBtn} title="Delete"
                          disabled={deleting === doc.id} onClick={() => handleDelete(doc)}>
                          <Trash2 size={13} strokeWidth={1.75} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

          </div>
        )}

        {/* ── Premises Accounts tab ── */}
        {activeTab === 'premises-accounts' && (
          <div className={s.tabBody}>

            {/* Create-account modal */}
            {paModal && (
              <div style={{ position:'fixed', inset:0, background:'rgba(10,26,60,0.55)', zIndex:9000, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
                <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:440, padding:'2rem', boxShadow:'0 20px 60px rgba(0,0,0,.25)', position:'relative' }}>
                  <button onClick={() => { setPaModal(null); setPaError(null); }} style={{ position:'absolute', top:'1rem', right:'1rem', background:'#f1f5f9', border:'none', borderRadius:'50%', width:30, height:30, cursor:'pointer', fontSize:'1rem' }}>✕</button>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.625rem', marginBottom:'1.25rem' }}>
                    <Building2 size={20} color="#0b5ed7"/>
                    <div>
                      <div style={{ fontWeight:700, fontSize:'0.9375rem', color:'#0f172a' }}>Set Representative</div>
                      <div style={{ fontSize:'0.75rem', color:'#64748b' }}>{paModal.premisesCode} · {paModal.premisesName}</div>
                    </div>
                  </div>

                  {paError && (
                    <div style={{ display:'flex', gap:'0.5rem', background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:8, padding:'0.625rem 0.875rem', marginBottom:'1rem', fontSize:'0.8125rem', color:'#dc2626' }}>
                      <AlertCircle size={14} style={{ flexShrink:0, marginTop:1 }}/> {paError}
                    </div>
                  )}

                  <div style={{ display:'flex', flexDirection:'column', gap:'0.875rem' }}>
                    <div>
                      <label style={{ display:'block', fontSize:'0.8125rem', fontWeight:600, color:'#374151', marginBottom:'0.375rem' }}>Representative Name <span style={{ color:'#ef4444' }}>*</span></label>
                      <input value={paRepName} onChange={e => setPaRepName(e.target.value)} style={{ width:'100%', border:'1.5px solid #e2e8f0', borderRadius:8, padding:'0.5rem 0.75rem', fontSize:'0.875rem', boxSizing:'border-box' }} placeholder="Full name"/>
                    </div>
                    <div>
                      <label style={{ display:'block', fontSize:'0.8125rem', fontWeight:600, color:'#374151', marginBottom:'0.375rem' }}>Email Address <span style={{ color:'#ef4444' }}>*</span></label>
                      <input type="email" value={paEmail} onChange={e => setPaEmail(e.target.value)} style={{ width:'100%', border:'1.5px solid #e2e8f0', borderRadius:8, padding:'0.5rem 0.75rem', fontSize:'0.875rem', boxSizing:'border-box' }} placeholder="rep@example.com"/>
                    </div>
                    <div>
                      <label style={{ display:'block', fontSize:'0.8125rem', fontWeight:600, color:'#374151', marginBottom:'0.375rem' }}>Password <span style={{ color:'#ef4444' }}>*</span></label>
                      <div style={{ position:'relative' }}>
                        <input type={paShowPwd ? 'text' : 'password'} value={paPassword} onChange={e => setPaPassword(e.target.value)} style={{ width:'100%', border:'1.5px solid #e2e8f0', borderRadius:8, padding:'0.5rem 2.5rem 0.5rem 0.75rem', fontSize:'0.875rem', boxSizing:'border-box' }} placeholder="At least 8 characters"/>
                        <button type="button" onClick={() => setPaShowPwd(v => !v)} style={{ position:'absolute', right:'0.625rem', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94a3b8' }}>
                          {paShowPwd ? <EyeOff size={15}/> : <Eye size={15}/>}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div style={{ display:'flex', gap:'0.75rem', marginTop:'1.5rem' }}>
                    <button onClick={() => { setPaModal(null); setPaError(null); }} style={{ flex:1, padding:'0.625rem', borderRadius:8, border:'1.5px solid #e2e8f0', background:'#f8fafc', fontSize:'0.875rem', fontWeight:600, cursor:'pointer', color:'#64748b' }}>Cancel</button>
                    <button onClick={() => { void handleCreatePaAccount(); }} disabled={paSubmitting || !paRepName.trim() || !paEmail.trim() || paPassword.length < 8}
                      style={{ flex:2, padding:'0.625rem', borderRadius:8, border:'none', background:'#0b5ed7', color:'#fff', fontSize:'0.875rem', fontWeight:700, cursor:'pointer', opacity:(paSubmitting || !paRepName.trim() || !paEmail.trim() || paPassword.length < 8) ? 0.6 : 1 }}>
                      {paSubmitting ? 'Creating…' : 'Create Account →'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <Section title="Farm Representative Accounts" last>
              <p style={{ fontSize:'0.8125rem', color:'#64748b', marginBottom:'1.25rem', lineHeight:1.55 }}>
                Each farm can have one representative account. The representative can sign in and view only their assigned farm.
              </p>

              {paLoading ? (
                <div className={s.tabMsg}>Loading farms…</div>
              ) : premises.length === 0 ? (
                <div className={s.docsEmpty}>
                  <Building2 size={28} strokeWidth={1} color="#cbd5e1"/>
                  <span>No farms registered yet. Register a farm first to set up representative accounts.</span>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                  {premises.map(p => {
                    const account = paAccounts.find(a => a.premisesId === p.id);
                    return (
                      <div key={p.id} style={{ border:'1.5px solid #e2eaf4', borderRadius:12, padding:'1rem 1.25rem', display:'flex', alignItems:'center', gap:'1rem', flexWrap:'wrap' }}>
                        {/* Premises info */}
                        <div style={{ flex:1, minWidth:180 }}>
                          <div style={{ fontWeight:700, fontSize:'0.875rem', color:'#0f172a' }}>{p.premisesName}</div>
                          <div style={{ fontSize:'0.75rem', color:'#64748b', marginTop:2 }}>{p.premisesCode} · {p.regionCode}</div>
                          <span style={{ display:'inline-block', marginTop:4, fontSize:'0.6875rem', fontWeight:700, padding:'1px 8px', borderRadius:20, background: p.status === 'APPROVED' ? '#dcfce7' : '#fef9c3', color: p.status === 'APPROVED' ? '#166534' : '#92400e' }}>
                            {p.status}
                          </span>
                        </div>

                        {/* Rep info or empty */}
                        {account ? (
                          <div style={{ flex:2, minWidth:200 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:2 }}>
                              <UserCheck size={13} color="#0b5ed7"/>
                              <span style={{ fontWeight:600, fontSize:'0.875rem', color:'#0f172a' }}>{account.representativeName}</span>
                              <span style={{ fontSize:'0.6875rem', fontWeight:700, padding:'1px 7px', borderRadius:20, background: account.status === 'ACTIVE' ? '#dcfce7' : '#f1f5f9', color: account.status === 'ACTIVE' ? '#166534' : '#64748b' }}>
                                {account.status}
                              </span>
                            </div>
                            <div style={{ fontSize:'0.75rem', color:'#64748b' }}>{account.email}</div>
                          </div>
                        ) : (
                          <div style={{ flex:2, minWidth:200, fontSize:'0.8125rem', color:'#94a3b8', fontStyle:'italic' }}>
                            No representative assigned
                          </div>
                        )}

                        {/* Actions */}
                        <div style={{ display:'flex', gap:'0.5rem', flexShrink:0 }}>
                          {account ? (
                            <>
                              <button onClick={() => { void handleTogglePaStatus(account); }}
                                style={{ fontSize:'0.75rem', fontWeight:600, padding:'4px 12px', borderRadius:6, border:'1.5px solid #e2eaf4', background:'#f8fafc', cursor:'pointer', color:'#374151' }}>
                                {account.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                              </button>
                              <button onClick={() => { void handleDeletePaAccount(account); }} disabled={paDeleting === account.id}
                                style={{ fontSize:'0.75rem', fontWeight:600, padding:'4px 12px', borderRadius:6, border:'1.5px solid #fca5a5', background:'#fff', cursor:'pointer', color:'#dc2626' }}>
                                {paDeleting === account.id ? '…' : 'Remove'}
                              </button>
                            </>
                          ) : (
                            <button onClick={() => { setPaModal(p); setPaError(null); setPaRepName(''); setPaEmail(''); setPaPassword(''); }}
                              style={{ fontSize:'0.75rem', fontWeight:700, padding:'4px 14px', borderRadius:6, border:'none', background:'#0b5ed7', color:'#fff', cursor:'pointer' }}>
                              + Set Representative
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>

          </div>
        )}

      </div>
    </div>
    </div>
  );
}

/* ── ID doc card (image preview + open link) ── */
function IdDocCard({ label, url }: { label: string; url: string }) {
  const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(url) || url.includes('supabase');
  return (
    <div className={s.idDocCard}>
      {isImage ? (
        <img src={url} alt={label} className={s.idDocImg} />
      ) : (
        <div className={s.idDocFile}><FileText size={32} strokeWidth={1} color="#94a3b8" /></div>
      )}
      <div className={s.idDocFooter}>
        <span className={s.idDocLabel}>{label}</span>
        <a href={url} target="_blank" rel="noopener noreferrer" className={s.idDocLink}>
          <ExternalLink size={12} /> Open
        </a>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function Section({ title, children, last }: { title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={`${s.section}${last ? ' ' + s.sectionLast : ''}`}>
      <div className={s.sectionTitle}>{title}</div>
      <div className={s.sectionRows}>{children}</div>
    </div>
  );
}

function Row({ label, value, editable, onChange, mono, status }: {
  label: string; value: string; editable?: boolean; onChange?: (v: string) => void; mono?: boolean; status?: 'green' | 'red';
}) {
  return (
    <div className={s.row}>
      <span className={s.rowLabel}>{label}</span>
      {editable
        ? <input className={s.rowInput} value={value} onChange={e => onChange?.(e.target.value)} />
        : status
          ? <span className={status === 'green' ? s.valueGreen : s.valueRed}>{value}</span>
          : <span className={`${s.rowValue}${mono ? ' ' + s.mono : ''}`}>{value}</span>
      }
    </div>
  );
}

export default ProfilePage;
