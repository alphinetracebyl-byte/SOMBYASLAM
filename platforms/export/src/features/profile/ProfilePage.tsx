import { useEffect, useState, useRef } from 'react';
import { Check, FileText, ExternalLink, Trash2, Upload, Plus } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase';
import s from './profile.module.css';

interface StaffProfile {
  staffName:    string;
  staffRole:    string;
  email:        string;
  phone:        string | null;
  facilityCode: string;
  facilityName: string;
  facilityType: string;
  status:       string;
  createdAt:    string | null;
}

interface StaffDoc {
  id:           string;
  documentType: string;
  label:        string;
  fileUrl:      string;
  uploadedAt:   string;
}

const DOC_TYPES = [
  { value: 'EMPLOYMENT_LETTER', label: 'Employment Letter'    },
  { value: 'TRAINING_CERT',     label: 'Training Certificate' },
  { value: 'PERMIT',            label: 'Permit / Licence'     },
  { value: 'CERTIFICATE',       label: 'Certificate'          },
  { value: 'NATIONAL_ID',       label: 'National ID'          },
  { value: 'OTHER',             label: 'Other'                },
];

function toInitials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}
function fmtRole(role: string) {
  return role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}
function fmtFacilityType(type: string) {
  const map: Record<string, string> = {
    QUARANTINE_STATION: 'Quarantine Station',
    SLAUGHTERHOUSE:     'Slaughterhouse',
    CHECKPOINT:         'Border Checkpoint',
  };
  return map[type] ?? type;
}
function fmtDocType(t: string) {
  return DOC_TYPES.find(d => d.value === t)?.label ?? t;
}
function fmtDate(iso: string) { return iso.slice(0, 10); }

async function fetchDocs(staffId: string): Promise<StaffDoc[]> {
  const { data } = await supabase
    .from('facility_staff_documents')
    .select('id, document_type, file_name, file_url, created_at')
    .eq('facility_staff_id', staffId)
    .order('created_at', { ascending: false });
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id:           r.id            as string,
    documentType: r.document_type as string,
    label:        (r.file_name as string) || (r.document_type as string),
    fileUrl:      r.file_url      as string,
    uploadedAt:   (r.created_at as string) ?? '',
  }));
}

async function uploadDoc(staffId: string, facilityId: string, facilityCode: string, staffRole: string, file: File, documentType: string): Promise<void> {
  const ext  = file.name.split('.').pop() ?? 'bin';
  const path = `${facilityCode}/staff/${staffRole}-${staffId}/${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from('facility-docs').upload(path, file, { upsert: true });
  if (upErr) throw new Error(upErr.message);
  const { data: { publicUrl } } = supabase.storage.from('facility-docs').getPublicUrl(path);
  const { error } = await supabase.from('facility_staff_documents').insert({
    facility_staff_id: staffId,
    facility_id:       facilityId,
    document_type:     documentType,
    file_url:          publicUrl,
    file_name:         file.name,
  });
  if (error) throw new Error(error.message);
}

async function deleteDoc(docId: string, fileUrl: string): Promise<void> {
  try {
    const match = fileUrl.match(/facility-docs\/(.+)$/);
    if (match) await supabase.storage.from('facility-docs').remove([decodeURIComponent(match[1])]);
  } catch { /* non-fatal */ }
  const { error } = await supabase.from('facility_staff_documents').delete().eq('id', docId);
  if (error) throw new Error(error.message);
}

export function ProfilePage(): JSX.Element {
  const { staffId, staffName, staffRole, facilityId, facilityCode, facilityName, facilityType } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'profile' | 'documents'>('profile');

  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved,   setSaved]   = useState(false);

  const [docs,       setDocs]       = useState<StaffDoc[]>([]);
  const [docsLoaded, setDocsLoaded] = useState(false);
  const [addOpen,    setAddOpen]    = useState(false);
  const [docType,    setDocType]    = useState(DOC_TYPES[0].value);
  const [docFile,    setDocFile]    = useState<File | null>(null);
  const [uploading,  setUploading]  = useState(false);
  const [deleting,   setDeleting]   = useState<string | null>(null);
  const [docErr,     setDocErr]     = useState<string | null>(null);

  const docFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fallback: StaffProfile = {
      staffName:    staffName    ?? '—',
      staffRole:    staffRole    ?? '—',
      email:        '—',
      phone:        null,
      facilityCode: facilityCode ?? '—',
      facilityName: facilityName ?? '—',
      facilityType: facilityType ?? '—',
      status:       'ACTIVE',
      createdAt:    null,
    };

    if (!staffId) { setProfile(fallback); setLoading(false); return; }

    supabase
      .from('facility_staff')
      .select('staff_name, staff_role, email, phone, facility_code, status, created_at')
      .eq('id', staffId)
      .single()
      .then(({ data }) => {
        if (!data) { setProfile(fallback); return; }
        const r = data as Record<string, string | null>;
        setProfile({
          staffName:    r.staff_name    ?? staffName    ?? '—',
          staffRole:    r.staff_role    ?? staffRole    ?? '—',
          email:        r.email         ?? '—',
          phone:        r.phone,
          facilityCode: r.facility_code ?? facilityCode ?? '—',
          facilityName: facilityName    ?? '—',
          facilityType: facilityType    ?? '—',
          status:       r.status        ?? 'ACTIVE',
          createdAt:    r.created_at,
        });
      })
      .finally(() => setLoading(false));
  }, [staffId]);

  useEffect(() => {
    if (!staffId) { setDocsLoaded(true); return; }
    fetchDocs(staffId).then(d => { setDocs(d); setDocsLoaded(true); });
  }, [staffId]);

  const handleUpload = async () => {
    if (!staffId || !docFile) return;
    setDocErr(null); setUploading(true);
    try {
      await uploadDoc(staffId, facilityId ?? '', facilityCode ?? '', staffRole ?? '', docFile, docType);
      const refreshed = await fetchDocs(staffId);
      setDocs(refreshed);
      setAddOpen(false); setDocFile(null); setDocType(DOC_TYPES[0].value);
      if (docFileRef.current) docFileRef.current.value = '';
    } catch (err) {
      setDocErr(err instanceof Error ? err.message : 'Upload failed.');
    } finally { setUploading(false); }
  };

  const handleDelete = async (doc: StaffDoc) => {
    if (!window.confirm(`Delete "${doc.label}"?`)) return;
    setDeleting(doc.id);
    try {
      await deleteDoc(doc.id, doc.fileUrl);
      setDocs(prev => prev.filter(d => d.id !== doc.id));
    } finally { setDeleting(null); }
  };

  const name     = profile?.staffName ?? staffName ?? '—';
  const initials = name !== '—' ? toInitials(name) : '?';
  const status   = profile?.status ?? 'ACTIVE';

  return (
    <div className={s.pageWrap}>
      <div className={s.page}>
        {saved && (
          <div style={{ position:'fixed', top:20, right:24, zIndex:9999, background:'#166534', color:'#fff', padding:'0.75rem 1.25rem', borderRadius:10, fontSize:'0.875rem', fontWeight:600, boxShadow:'0 4px 16px rgba(0,0,0,.18)', display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <Check size={15} /> Saved successfully.
          </div>
        )}

        {/* ── Left: identity card ── */}
        <aside className={s.photoCard}>
          <div className={s.avatarWrap}>
            <div className={s.avatarInitials}>{initials}</div>
          </div>

          <div className={s.photoName}>{name}</div>
          <div className={s.photoRole}>{fmtRole(profile?.staffRole ?? staffRole ?? '')}</div>

          <div className={s.statusPill}>
            <span className={s.statusDot} /> {status}
          </div>

          <div className={s.photoMeta}>
            <div className={s.photoMetaRow}>
              <span className={s.photoMetaLabel}>Facility Code</span>
              <span className={s.photoMetaVal}>{profile?.facilityCode ?? facilityCode ?? '—'}</span>
            </div>
            <div className={s.photoMetaRow}>
              <span className={s.photoMetaLabel}>Facility</span>
              <span className={s.photoMetaVal}>{profile?.facilityName ?? facilityName ?? '—'}</span>
            </div>
            <div className={s.photoMetaRow}>
              <span className={s.photoMetaLabel}>Type</span>
              <span className={s.photoMetaVal}>{fmtFacilityType(profile?.facilityType ?? facilityType ?? '')}</span>
            </div>
          </div>
        </aside>

        {/* ── Right: tabbed card ── */}
        <div className={s.mainCard}>

          <div className={s.tabBar}>
            <button
              className={`${s.tab}${activeTab === 'profile' ? ' ' + s.tabActive : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              Profile Details
            </button>
            <button
              className={`${s.tab}${activeTab === 'documents' ? ' ' + s.tabActive : ''}`}
              onClick={() => setActiveTab('documents')}
            >
              My Documents
              {docs.length > 0 && <span className={s.tabBadge}>{docs.length}</span>}
            </button>

            <div className={s.tabActions}>
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
                  <Section title="Staff Information">
                    <Row label="Full Name"  value={profile.staffName} />
                    <Row label="Staff Role" value={fmtRole(profile.staffRole)} />
                    <Row label="Status"     value={profile.status} status={profile.status === 'ACTIVE' ? 'green' : 'red'} />
                  </Section>
                  <Section title="Facility Details">
                    <Row label="Facility Code" value={profile.facilityCode} mono />
                    <Row label="Facility Name" value={profile.facilityName} />
                    <Row label="Facility Type" value={fmtFacilityType(profile.facilityType)} />
                  </Section>
                  <Section title="Contact" last={!profile.createdAt}>
                    <Row label="Email Address" value={profile.email || '—'} />
                    <Row label="Phone Number"  value={profile.phone ?? '—'} />
                  </Section>
                  {profile.createdAt && (
                    <Section title="Account" last>
                      <Row label="Password"   value="••••••••••••" />
                      <Row label="Registered" value={fmtDate(profile.createdAt)} mono />
                    </Section>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Documents tab ── */}
          {activeTab === 'documents' && (
            <div className={s.tabBody}>

              {addOpen && (
                <div className={s.uploadForm}>
                  <div className={s.uploadRow}>
                    <div className={s.uploadField}>
                      <label className={s.uploadLabel}>Document Type</label>
                      <select className={s.uploadSel} value={docType} onChange={e => setDocType(e.target.value)}>
                        {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className={s.uploadFileRow}>
                    <input ref={docFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      style={{ display:'none' }} onChange={e => setDocFile(e.target.files?.[0] ?? null)} />
                    <button type="button" className={s.chooseFileBtn} onClick={() => docFileRef.current?.click()}>
                      <Upload size={13} /> {docFile ? docFile.name : 'Choose file…'}
                    </button>
                    {docFile && <span className={s.fileSize}>{(docFile.size / 1024).toFixed(0)} KB</span>}
                    <button type="button" className={s.uploadSubmitBtn} disabled={!docFile || uploading} onClick={() => void handleUpload()}>
                      {uploading ? 'Uploading…' : 'Upload'}
                    </button>
                    <button type="button" className={s.cancelUploadBtn} onClick={() => { setAddOpen(false); setDocFile(null); setDocErr(null); }}>
                      Cancel
                    </button>
                  </div>
                  {docErr && <p className={s.docErr}>{docErr}</p>}
                </div>
              )}

              <Section title="My Documents" last>
                {!docsLoaded ? (
                  <div className={s.tabMsg}>Loading documents…</div>
                ) : docs.length === 0 ? (
                  <div className={s.docsEmpty}>
                    <FileText size={28} strokeWidth={1} color="#cbd5e1" />
                    <span>No documents uploaded yet. Click Add Document to upload one.</span>
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
                            disabled={deleting === doc.id} onClick={() => void handleDelete(doc)}>
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

function Row({ label, value, mono, status }: {
  label: string; value: string; mono?: boolean; status?: 'green' | 'red';
}) {
  return (
    <div className={s.row}>
      <span className={s.rowLabel}>{label}</span>
      {status
        ? <span className={status === 'green' ? s.valueGreen : s.valueRed}>{value}</span>
        : <span className={`${s.rowValue}${mono ? ' ' + s.mono : ''}`}>{value}</span>
      }
    </div>
  );
}

export default ProfilePage;
