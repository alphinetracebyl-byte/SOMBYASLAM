import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Edit2, Save, X, PauseCircle, CheckCircle, XCircle,
  FileText, AlertTriangle, ChevronRight, Home, Plus, Trash2, Clock,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  fetchFarmer, approveFarmer, rejectFarmer,
  suspendFarmer, reinstateFarmer, updateFarmer,
  fetchFarmerPremises, fetchPremisesBatches, fetchBatchAnimals,
  fetchFarmerDocuments, uploadFarmerDocument, deleteFarmerDocument,
  fetchFarmerActivityLog, notifyFarmer,
  type Farmer, type FarmerAnimal, type FarmerPremises, type Batch, type FarmerDocument, type FarmerActivityLog,
} from './farmers.supabase';
import { logActivity } from '@/lib/activity';
import { useAuthStore } from '@/store/auth.store';
import s from './farmers.module.css';

const REGIONS = [
  'Awdal','Bakool','Banaadir','Bari','Bay','Galguduud','Gedo','Hiiraan',
  'Jubbada Dhexe','Jubbada Hoose','Mudug','Nugaal','Sanaag',
  'Shabeellaha Dhexe','Shabeellaha Hoose','Sool','Togdheer','Woqooyi Galbeed',
];

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const DOC_TYPES = [
  'Vaccination Certificate', 'Health Certificate', 'Veterinary Certificate',
  'Movement Permit', 'Export Permit', 'Land Title',
  'Livestock Registration', 'Government ID', 'Other',
];

const STATUS_PILL: Record<string, string> = {
  ACTIVE: s.pillApproved, APPROVED: s.pillApproved,
  PENDING: s.pillPending,
  INACTIVE: s.pillSuspended, SUSPENDED: s.pillSuspended, REJECTED: s.pillRejected,
  EXPORTED: s.pillExported, SLAUGHTERED: s.pillRejected, DEAD: s.pillRejected,
};

type ModalMode = 'reject' | 'suspend' | null;
type Tab = 'overview' | 'documents' | 'activity_log';

function buildChanges(original: Farmer, d: Partial<Farmer>): string {
  const fields: [keyof Farmer, string][] = [
    ['fullName', 'Full Name'], ['dateOfBirth', 'Date of Birth'],
    ['gender', 'Gender'], ['idType', 'ID Type'], ['nationalId', 'ID Number'],
    ['region', 'Region'], ['village', 'Village'],
    ['phoneE164', 'Phone'], ['altPhone', 'Alt Phone'], ['email', 'Email'],
  ];
  const changed = fields
    .filter(([k]) => d[k] !== undefined && d[k] !== original[k])
    .map(([, label]) => label);
  return changed.length > 0 ? `Changed: ${changed.join(', ')}` : 'No fields changed';
}

export function FarmerDetailPage(): JSX.Element {
  const { id }     = useParams<{ id: string }>();
  const { userId } = useAuthStore();

  const [farmer,   setFarmer]   = useState<Farmer | null>(null);
  const [premises, setPremises] = useState<FarmerPremises[]>([]);
  const [docs,     setDocs]     = useState<FarmerDocument[]>([]);
  const [loading,  setLoading]  = useState(true);

  // document upload state
  const [addDocOpen, setAddDocOpen] = useState(false);
  const [docType,    setDocType]    = useState('');
  const [docLabel,   setDocLabel]   = useState('');
  const [docFile,    setDocFile]    = useState<File | null>(null);
  const [uploading,  setUploading]  = useState(false);
  const [deleting,   setDeleting]   = useState<string | null>(null);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [toast,    setToast]    = useState<{ msg: string; ok: boolean } | null>(null);
  const [modal,    setModal]    = useState<ModalMode>(null);
  const [reason,   setReason]   = useState('');
  const [editing,      setEditing]      = useState(false);
  const [draft,        setDraft]        = useState<Partial<Farmer>>({});
  const [tab,          setTab]          = useState<Tab>('overview');
  const [activityLog,  setActivityLog]  = useState<FarmerActivityLog[]>([]);
  const [logLoading,   setLogLoading]   = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [f, p, d] = await Promise.all([fetchFarmer(id), fetchFarmerPremises(id), fetchFarmerDocuments(id)]);
      setFarmer(f); setPremises(p); setDocs(d);
    } catch { setError('Failed to load farmer.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [id]);

  const loadLog = async () => {
    if (!id) return;
    setLogLoading(true);
    try { setActivityLog(await fetchFarmerActivityLog(id)); }
    catch { /* non-fatal */ }
    finally { setLogLoading(false); }
  };

  useEffect(() => { if (tab === 'activity_log') void loadLog(); }, [tab, id]);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 3500);
  };
  const closeModal = () => { setModal(null); setReason(''); };

  const handleApprove = async () => {
    if (!farmer) return;
    setSaving(true);
    try {
      await approveFarmer(farmer.id, userId ?? 'ministry-officer');
      void logActivity({ category: 'USER', level: 'SUCCESS', title: 'Farmer approved', detail: `${farmer.fullName} (${farmer.farmerCode}) registration approved`, actorRole: userId ?? undefined, farmerId: farmer.id, referenceCode: farmer.farmerCode });
      void notifyFarmer(farmer.email ?? '', farmer.fullName, farmer.farmerCode, 'APPROVED');
      showToast(`${farmer.fullName} approved.`); await load();
      if (tab === 'activity_log') void loadLog();
    } catch { showToast('Approval failed.', false); } finally { setSaving(false); }
  };
  const handleReject = async () => {
    if (!farmer || reason.trim().length < 10) return;
    setSaving(true);
    try {
      await rejectFarmer(farmer.id, reason.trim()); closeModal();
      void logActivity({ category: 'USER', level: 'ERROR', title: 'Farmer rejected', detail: `Reason: ${reason.trim()}`, actorRole: userId ?? undefined, farmerId: farmer.id, referenceCode: farmer.farmerCode });
      void notifyFarmer(farmer.email ?? '', farmer.fullName, farmer.farmerCode, 'REJECTED', reason.trim());
      showToast(`${farmer.fullName} rejected.`); await load();
      if (tab === 'activity_log') void loadLog();
    } catch { showToast('Rejection failed.', false); } finally { setSaving(false); }
  };
  const handleSuspend = async () => {
    if (!farmer || reason.trim().length < 10) return;
    setSaving(true);
    try {
      await suspendFarmer(farmer.id, reason.trim()); closeModal();
      void logActivity({ category: 'USER', level: 'WARNING', title: 'Farmer account suspended', detail: `Reason: ${reason.trim()}`, actorRole: userId ?? undefined, farmerId: farmer.id, referenceCode: farmer.farmerCode });
      void notifyFarmer(farmer.email ?? '', farmer.fullName, farmer.farmerCode, 'SUSPENDED', reason.trim());
      showToast(`${farmer.fullName} suspended.`); await load();
      if (tab === 'activity_log') void loadLog();
    } catch { showToast('Suspension failed.', false); } finally { setSaving(false); }
  };
  const handleReinstate = async () => {
    if (!farmer) return;
    setSaving(true);
    try {
      await reinstateFarmer(farmer.id, userId ?? 'ministry-officer');
      void logActivity({ category: 'USER', level: 'SUCCESS', title: 'Farmer reinstated', detail: `${farmer.fullName} account reinstated`, actorRole: userId ?? undefined, farmerId: farmer.id, referenceCode: farmer.farmerCode });
      void notifyFarmer(farmer.email ?? '', farmer.fullName, farmer.farmerCode, 'REINSTATED');
      showToast(`${farmer.fullName} reinstated.`); await load();
      if (tab === 'activity_log') void loadLog();
    } catch { showToast('Reinstatement failed.', false); } finally { setSaving(false); }
  };
  const handleSaveEdit = async () => {
    if (!farmer) return;
    setSaving(true);
    const changeDetail = buildChanges(farmer, draft);
    try {
      await updateFarmer(farmer.id, {
        fullName: draft.fullName, dateOfBirth: draft.dateOfBirth ?? undefined,
        gender: draft.gender ?? undefined, region: draft.region,
        village: draft.village ?? undefined, phoneE164: draft.phoneE164,
        altPhone: draft.altPhone ?? undefined, email: draft.email ?? undefined,
        nationalId: draft.nationalId, idType: draft.idType,
      });
      void logActivity({ category: 'USER', level: 'INFO', title: 'Farmer profile edited', detail: changeDetail, actorRole: userId ?? undefined, farmerId: farmer.id, referenceCode: farmer.farmerCode });
      setEditing(false); showToast('Record updated.'); await load();
      if (tab === 'activity_log') void loadLog();
    } catch { showToast('Update failed.', false); } finally { setSaving(false); }
  };

  const handleUploadDoc = async () => {
    if (!farmer || !docFile || !docType) return;
    setUploading(true);
    try {
      await uploadFarmerDocument(farmer.id, userId ?? 'officer', docFile, docLabel || docType, docType);
      setAddDocOpen(false); setDocType(''); setDocLabel(''); setDocFile(null);
      showToast('Document uploaded.'); await load();
    } catch { showToast('Upload failed.', false); } finally { setUploading(false); }
  };

  const handleDeleteDoc = async (doc: FarmerDocument) => {
    setDeleting(doc.id);
    try {
      await deleteFarmerDocument(doc.id, doc.fileUrl);
      showToast('Document removed.'); await load();
    } catch { showToast('Delete failed.', false); } finally { setDeleting(null); }
  };

  if (loading) return <div className={s.pageCenter}>Loading…</div>;
  if (error || !farmer) return <div className={s.pageCenter}>{error ?? 'Not found.'}</div>;

  const isPending   = farmer.status === 'PENDING';
  const isApproved  = farmer.status === 'APPROVED';
  const isSuspended = farmer.status === 'SUSPENDED';
  const isRejected  = farmer.status === 'REJECTED';
  const initials    = farmer.fullName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const TABS: { key: Tab; label: string; icon?: React.ReactNode }[] = [
    { key: 'overview',     label: 'Overview'      },
    { key: 'documents',    label: 'Documents'     },
    { key: 'activity_log', label: 'Activity Log', icon: <Clock size={13}/> },
  ];

  return (
    <div className={s.detailPage}>
      {toast && <div className={`${s.toast}${toast.ok ? '' : ' ' + s.toastErr}`}>{toast.msg}</div>}

      {/* ── Modal ── */}
      {modal && (
        <div className={s.overlay}>
          <div className={s.modal}>
            <div className={s.modalHead}>
              <h3 className={s.modalTitle}>{modal === 'reject' ? 'Reject Application' : 'Suspend Account'}</h3>
              <button type="button" className={s.modalClose} onClick={closeModal}><X size={18}/></button>
            </div>
            <p className={s.modalSub}>
              {modal === 'reject'
                ? <><strong>{farmer.fullName}</strong>'s registration will be rejected. Provide a clear reason.</>
                : <><strong>{farmer.fullName}</strong>'s account will be suspended from all services.</>
              }
            </p>
            <textarea className={s.reasonBox} rows={4}
              placeholder={modal === 'reject' ? 'e.g. ID document is unclear.' : 'e.g. Suspected fraudulent registration.'}
              value={reason} onChange={e => setReason(e.target.value)}/>
            {reason.trim().length > 0 && reason.trim().length < 10 && (
              <p className={s.fieldErr}>Reason must be at least 10 characters.</p>
            )}
            <div className={s.modalActions}>
              <button className={s.btnGhost} onClick={closeModal}>Cancel</button>
              <button
                className={modal === 'reject' ? s.btnModalReject : s.btnSuspend}
                disabled={saving || reason.trim().length < 10}
                onClick={modal === 'reject' ? handleReject : handleSuspend}
              >
                {modal === 'reject' ? <XCircle size={14}/> : <PauseCircle size={14}/>}
                {modal === 'reject' ? (saving ? 'Rejecting…' : 'Confirm Rejection') : (saving ? 'Suspending…' : 'Confirm Suspension')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Document modal ── */}
      {addDocOpen && (
        <div className={s.overlay}>
          <div className={s.modal}>
            <div className={s.modalHead}>
              <h3 className={s.modalTitle}>Add Document</h3>
              <button className={s.modalClose} onClick={() => { setAddDocOpen(false); setDocType(''); setDocLabel(''); setDocFile(null); }}><X size={18}/></button>
            </div>
            <p className={s.modalSub}>Upload a supporting document for <strong>{farmer?.fullName}</strong>.</p>

            <div className={s.addDocForm}>
              <div className={s.addDocField}>
                <label className={s.addDocLabel}>Document Type <span className={s.req}>*</span></label>
                <select className={s.addDocSelect} value={docType} onChange={e => setDocType(e.target.value)}>
                  <option value="">Select type…</option>
                  {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className={s.addDocField}>
                <label className={s.addDocLabel}>Label <span className={s.addDocHint}>(optional — defaults to type)</span></label>
                <input className={s.addDocInput} value={docLabel} onChange={e => setDocLabel(e.target.value)} placeholder={docType || 'e.g. 2024 Vaccination Record'}/>
              </div>
              <div className={s.addDocField}>
                <label className={s.addDocLabel}>File <span className={s.req}>*</span></label>
                <input
                  type="file" accept="image/*,.pdf"
                  className={s.addDocFile}
                  onChange={e => setDocFile(e.target.files?.[0] ?? null)}
                />
                {docFile && <div className={s.addDocFileName}>{docFile.name} ({(docFile.size / 1024).toFixed(0)} KB)</div>}
              </div>
            </div>

            <div className={s.modalActions}>
              <button className={s.btnGhost} onClick={() => { setAddDocOpen(false); setDocType(''); setDocLabel(''); setDocFile(null); }}>Cancel</button>
              <button
                className={s.btnPrimary}
                disabled={!docFile || !docType || uploading}
                onClick={handleUploadDoc}
              >
                {uploading ? 'Uploading…' : 'Upload Document'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={s.profileLayout}>

        {/* ── Sidebar ── */}
        <aside className={s.sidebar}>
          <div className={s.sideCard}>
            <div className={s.sideAvatarWrap}>
              {farmer.photoUrl
                ? <img src={farmer.photoUrl} alt="" className={s.sideAvatar}/>
                : <div className={s.sideAvatarFallback}>{initials}</div>
              }
              <span className={`${s.sideDot} ${s['dot_' + farmer.status]}`}/>
            </div>

            {editing
              ? <input className={s.sideNameInput} value={draft.fullName ?? ''} onChange={e => setDraft({ ...draft, fullName: e.target.value })}/>
              : <div className={s.sideName}>{farmer.fullName}</div>
            }
            <div className={s.sideSubtitle}>Livestock Farmer</div>
            <span className={`${s.statusPill} ${STATUS_PILL[farmer.status] ?? s.pillPending}`}>
              {farmer.status.charAt(0) + farmer.status.slice(1).toLowerCase()}
            </span>

            {/* Permanent Client ID */}
            <div className={s.clientIdBlock}>
              <div className={s.clientIdLabel}>Client ID</div>
              <div className={s.clientIdValue}>{farmer.farmerCode}</div>
            </div>

            {/* QR code — links to public profile, no login needed */}
            <div className={s.sideQR}>
              <QRCodeSVG
                value={`${window.location.origin}/f/${farmer.farmerCode}`}
                size={110}
                level="M"
              />
              <div className={s.sideQRLabel}>Scan to view public profile</div>
            </div>

            <div className={s.sideMeta}>
              <MetaRow label="Phone"      value={farmer.phoneE164}/>
              <MetaRow label="Region"     value={farmer.region}/>
              <MetaRow label="Village"    value={farmer.village ?? '—'}/>
              <MetaRow label="Registered" value={fmtDate(farmer.createdAt)}/>
              {farmer.approvedAt && <MetaRow label="Approved" value={fmtDate(farmer.approvedAt)}/>}
            </div>

            <div className={s.sideActions}>
              {editing ? (
                <>
                  <button className={s.btnFull} onClick={() => setEditing(false)} disabled={saving}><X size={13}/> Cancel</button>
                  <button className={s.btnFullDark} onClick={handleSaveEdit} disabled={saving}><Save size={13}/> {saving ? 'Saving…' : 'Save Changes'}</button>
                </>
              ) : (
                <>
                  <button className={s.btnFull} onClick={() => { setDraft({ ...farmer }); setEditing(true); }}><Edit2 size={13}/> Edit Profile</button>
                  {isPending && <>
                    <button className={s.btnFullApprove} disabled={saving} onClick={handleApprove}><CheckCircle size={13}/> {saving ? 'Approving…' : 'Approve'}</button>
                    <button className={s.btnFullReject} onClick={() => setModal('reject')}><XCircle size={13}/> Reject</button>
                  </>}
                  {isApproved  && <button className={s.btnFullSuspend} onClick={() => setModal('suspend')}><PauseCircle size={13}/> Suspend Account</button>}
                  {isSuspended && <button className={s.btnFullApprove} disabled={saving} onClick={handleReinstate}><CheckCircle size={13}/> {saving ? '…' : 'Reinstate'}</button>}
                </>
              )}
            </div>
          </div>

          {isSuspended && farmer.rejectionReason && (
            <div className={s.bannerWarn}>
              <PauseCircle size={14} style={{ flexShrink: 0, marginTop: 1 }}/>
              <div><strong>Suspension Reason</strong><p>{farmer.rejectionReason}</p></div>
            </div>
          )}
          {isRejected && farmer.rejectionReason && (
            <div className={s.bannerErr}>
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }}/>
              <div><strong>Rejection Reason</strong><p>{farmer.rejectionReason}</p></div>
            </div>
          )}
        </aside>

        {/* ── Right column ── */}
        <div className={s.mainColumn}>

          {/* Main card — fixed height */}
          <div className={s.main}>
            <div className={s.tabBar}>
              {TABS.map(t => (
                <button key={t.key} className={`${s.tabBtn}${tab === t.key ? ' ' + s.tabBtnActive : ''}`} onClick={() => setTab(t.key)}>
                  {t.icon}{t.label}
                </button>
              ))}
            </div>

            <div className={s.tabBody}>
              {tab === 'overview' && (
                <div className={s.overviewWrap}>
                  <FieldSection title="Personal Details">
                    <Field label="Full Name"    value={editing ? <input className={s.fieldInp} value={draft.fullName ?? ''} onChange={e => setDraft({...draft, fullName: e.target.value})}/> : farmer.fullName}/>
                    <Field label="Date of Birth" value={editing ? <input className={s.fieldInp} type="date" value={draft.dateOfBirth ?? ''} onChange={e => setDraft({...draft, dateOfBirth: e.target.value})}/> : fmtDate(farmer.dateOfBirth)}/>
                    <Field label="Gender"       value={editing ? <select className={s.fieldInp} value={draft.gender ?? ''} onChange={e => setDraft({...draft, gender: e.target.value})}><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option></select> : farmer.gender ?? '—'}/>
                    <Field label="ID Type"      value={editing ? <select className={s.fieldInp} value={draft.idType ?? ''} onChange={e => setDraft({...draft, idType: e.target.value})}><option value="NATIONAL_ID">National ID</option><option value="PASSPORT">Passport</option></select> : farmer.idType.replace(/_/g,' ')}/>
                    <Field label="ID Number"    value={editing ? <input className={s.fieldInp} value={draft.nationalId ?? ''} onChange={e => setDraft({...draft, nationalId: e.target.value})}/> : <span className={s.mono}>{farmer.nationalId}</span>}/>
                    <Field label="Farmer Code"  value={<span className={s.mono}>{farmer.farmerCode}</span>}/>
                  </FieldSection>

                  <FieldSection title="Contact Information">
                    <Field label="Phone"     value={editing ? <input className={s.fieldInp} value={draft.phoneE164 ?? ''} onChange={e => setDraft({...draft, phoneE164: e.target.value})}/> : farmer.phoneE164}/>
                    <Field label="Alt Phone" value={editing ? <input className={s.fieldInp} value={draft.altPhone ?? ''} onChange={e => setDraft({...draft, altPhone: e.target.value})}/> : farmer.altPhone ?? '—'}/>
                    <Field label="Email"     value={editing ? <input className={s.fieldInp} value={draft.email ?? ''} onChange={e => setDraft({...draft, email: e.target.value})}/> : farmer.email ?? '—'}/>
                  </FieldSection>

                  <FieldSection title="Identity Documents">
                    <div className={s.idDocGrid}>
                      <div className={s.idDocCard}>
                        {farmer.idFrontUrl
                          ? <img src={farmer.idFrontUrl} alt="ID Front" className={s.idDocThumb}/>
                          : <div className={s.idDocMissing}>Not uploaded</div>
                        }
                        <div className={s.idDocCaption}>ID Document — Front</div>
                      </div>
                      <div className={s.idDocCard}>
                        {farmer.idBackUrl
                          ? <img src={farmer.idBackUrl} alt="ID Back" className={s.idDocThumb}/>
                          : <div className={s.idDocMissing}>Not uploaded</div>
                        }
                        <div className={s.idDocCaption}>ID Document — Back</div>
                      </div>
                      {farmer.photoUrl && (
                        <div className={s.idDocCard}>
                          <img src={farmer.photoUrl} alt="Profile Photo" className={s.idDocThumb} style={{ objectPosition: 'top' }}/>
                          <div className={s.idDocCaption}>Profile Photo</div>
                        </div>
                      )}
                    </div>
                  </FieldSection>

                  <FieldSection title="Location">
                    <Field label="Region"   value={editing ? <select className={s.fieldInp} value={draft.region ?? ''} onChange={e => setDraft({...draft, region: e.target.value})}>{REGIONS.map(r => <option key={r} value={r}>{r}</option>)}</select> : farmer.region}/>
                    <Field label="Village"  value={editing ? <input className={s.fieldInp} value={draft.village ?? ''} onChange={e => setDraft({...draft, village: e.target.value})}/> : farmer.village ?? '—'}/>
                  </FieldSection>

                  <FieldSection title="Registration Record">
                    <Field label="Status"       value={<span className={`${s.statusPill} ${STATUS_PILL[farmer.status] ?? s.pillPending}`}>{farmer.status.charAt(0) + farmer.status.slice(1).toLowerCase()}</span>}/>
                    <Field label="Approved At"  value={fmtDateTime(farmer.approvedAt)}/>
                    <Field label="Approved By"  value={farmer.approvedBy ?? '—'}/>
                    <Field label="Submitted"    value={fmtDateTime(farmer.createdAt)}/>
                    <Field label="Last Updated" value={fmtDateTime(farmer.updatedAt)}/>
                  </FieldSection>
                </div>
              )}

              {tab === 'documents' && (
                <div className={s.docsWrap}>

                  {/* Official ID documents */}
                  <div className={s.docsSectionTitle}>Official Identity Documents</div>
                  <div className={s.docsGrid}>
                    <DocCard title="ID Document — Front">
                      {farmer.idFrontUrl ? <img src={farmer.idFrontUrl} alt="ID Front" className={s.docImg}/> : <div className={s.docMissing}>No image uploaded</div>}
                    </DocCard>
                    <DocCard title="ID Document — Back">
                      {farmer.idBackUrl ? <img src={farmer.idBackUrl} alt="ID Back" className={s.docImg}/> : <div className={s.docMissing}>No image uploaded</div>}
                    </DocCard>
                    {farmer.photoUrl && (
                      <DocCard title="Profile Photo">
                        <img src={farmer.photoUrl} alt="Profile" className={s.docImgPortrait}/>
                      </DocCard>
                    )}
                  </div>

                  {/* Additional documents */}
                  <div className={s.docsSectionBar}>
                    <div className={s.docsSectionTitle}>Additional Documents</div>
                    <button className={s.btnAddDoc} onClick={() => setAddDocOpen(true)}>
                      <Plus size={13}/> Add Document
                    </button>
                  </div>

                  {docs.length === 0
                    ? <div className={s.docsEmpty}>No additional documents uploaded yet.</div>
                    : (
                      <div className={s.docsExtraGrid}>
                        {docs.map(doc => {
                          const isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.fileUrl);
                          return (
                            <div key={doc.id} className={s.docExtraCard}>
                              <div className={s.docExtraHead}>
                                <div>
                                  <div className={s.docExtraLabel}>{doc.label}</div>
                                  <div className={s.docExtraType}>{doc.documentType}</div>
                                </div>
                                <button
                                  className={s.docDeleteBtn}
                                  disabled={deleting === doc.id}
                                  onClick={() => handleDeleteDoc(doc)}
                                  title="Remove document"
                                >
                                  <Trash2 size={12}/>
                                </button>
                              </div>
                              <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className={s.docExtraPreview}>
                                {isImg
                                  ? <img src={doc.fileUrl} alt={doc.label} className={s.docExtraImg}/>
                                  : <div className={s.docExtraPdf}><FileText size={28}/><span>View PDF</span></div>
                                }
                              </a>
                              <div className={s.docExtraMeta}>
                                {doc.uploadedBy} · {fmtDate(doc.uploadedAt)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )
                  }
                </div>
              )}
              {tab === 'activity_log' && (
                <div className={s.logWrap}>
                  {logLoading
                    ? <div className={s.logEmpty}>Loading activity log…</div>
                    : activityLog.length === 0
                      ? <div className={s.logEmpty}>No activity recorded for this farmer yet.</div>
                      : <div className={s.logList}>
                          {activityLog.map(entry => (
                            <div key={entry.id} className={s.logItem}>
                              <div className={`${s.logDot} ${s['logDot_' + entry.level]}`}/>
                              <div className={s.logContent}>
                                <div className={s.logTitle}>{entry.title}</div>
                                {entry.detail && <div className={s.logDetail}>{entry.detail}</div>}
                                <div className={s.logMeta}>
                                  {entry.actorRole && <span>{entry.actorRole.replace(/_/g, ' ')}</span>}
                                  {entry.actorRole && <span className={s.logMetaSep}>·</span>}
                                  <span>{fmtDateTime(entry.createdAt)}</span>
                                  <span className={s.logMetaSep}>·</span>
                                  <span className={s.logCategoryBadge}>{entry.category}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                  }
                </div>
              )}
            </div>
          </div>

          {/* ── Premises → Batches → Animals accordion ── */}
          <div className={s.accordion}>
            <div className={s.accordionHead}>
              <Home size={14}/> Farm Premises
              <span className={s.accordionCount}>{premises.length}</span>
            </div>
            {premises.length === 0
              ? <div className={s.accordionEmpty}>No premises registered under this farmer.</div>
              : premises.map(p => <PremisesRow key={p.id} premises={p}/>)
            }
          </div>

        </div>
      </div>
    </div>
  );
}

/* ══ Level 1 — Premises row ══ */
function PremisesRow({ premises }: { premises: FarmerPremises }) {
  const [open,    setOpen]    = useState(false);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded,  setLoaded]  = useState(false);

  const toggle = async () => {
    if (!open && !loaded) {
      setLoading(true);
      const data = await fetchPremisesBatches(premises.id);
      setBatches(data);
      setLoading(false);
      setLoaded(true);
    }
    setOpen(v => !v);
  };

  return (
    <div className={s.L1Item}>
      <div className={s.L1Row} onClick={toggle}>
        <ChevronRight size={13} className={`${s.accChevron}${open ? ' ' + s.accChevronOpen : ''}`}/>
        <span className={s.mono}>{premises.premisesCode}</span>
        <span className={s.accName}>{premises.name}</span>
        <span className={s.accMeta}>{premises.premisesType}</span>
        <span className={s.accMeta}>{premises.region}</span>
        <span className={`${s.statusPill} ${STATUS_PILL[premises.status] ?? s.pillPending}`}>
          {premises.status.charAt(0) + premises.status.slice(1).toLowerCase()}
        </span>
      </div>

      {open && (
        <div className={s.L1Inner}>
          {loading
            ? <div className={s.accLoading}>Loading batches…</div>
            : batches.length === 0
              ? <div className={s.accEmpty}>No batches found for this premises.</div>
              : batches.map(b => <BatchRow key={b.id} batch={b}/>)
          }
        </div>
      )}
    </div>
  );
}

/* ══ Level 2 — Batch row ══ */
function BatchRow({ batch }: { batch: Batch }) {
  const [open,    setOpen]    = useState(false);
  const [animals, setAnimals] = useState<FarmerAnimal[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded,  setLoaded]  = useState(false);

  const toggle = async () => {
    if (!open && !loaded) {
      setLoading(true);
      const data = await fetchBatchAnimals(batch.id);
      setAnimals(data);
      setLoading(false);
      setLoaded(true);
    }
    setOpen(v => !v);
  };

  return (
    <div className={s.L2Item}>
      <div className={s.L2Row} onClick={toggle}>
        <ChevronRight size={12} className={`${s.accChevron}${open ? ' ' + s.accChevronOpen : ''}`}/>
        <span className={s.mono}>{batch.batchCode}</span>
        <span className={s.accName}>{batch.species}</span>
        <span className={s.accMeta}>{batch.animalCount} animals</span>
        <span className={s.accMeta}>{batch.batchDate ? new Date(batch.batchDate).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</span>
        <span className={`${s.statusPill} ${STATUS_PILL[batch.status] ?? s.pillPending}`}>
          {batch.status.charAt(0) + batch.status.slice(1).toLowerCase()}
        </span>
      </div>

      {open && (
        <div className={s.L2Inner}>
          {loading
            ? <div className={s.accLoading}>Loading animals…</div>
            : animals.length === 0
              ? <div className={s.accEmpty}>No animals found in this batch.</div>
              : (
                <table className={s.L3Table}>
                  <thead><tr>
                    <th>Tag Number</th><th>Species</th><th>Breed</th><th>Sex</th><th>Status</th><th>Registered</th>
                  </tr></thead>
                  <tbody>
                    {animals.map(a => (
                      <tr key={a.id}>
                        <td><span className={s.mono}>{a.tagNumber}</span></td>
                        <td>{a.species}</td>
                        <td>{a.breed ?? '—'}</td>
                        <td>{a.sex}</td>
                        <td><span className={`${s.statusPill} ${STATUS_PILL[a.status] ?? s.pillPending}`}>{a.status.charAt(0)+a.status.slice(1).toLowerCase()}</span></td>
                        <td>{new Date(a.createdAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
          }
        </div>
      )}
    </div>
  );
}

/* ── Shared helpers ── */

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={s.sideMetaRow}>
      <span className={s.sideMetaLabel}>{label}</span>
      <span className={s.sideMetaVal}>{value}</span>
    </div>
  );
}

function FieldSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={s.fieldSection}>
      <div className={s.fieldSectionTitle}>{title}</div>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className={s.field}>
      <div className={s.fieldLabel}>{label}</div>
      <div className={s.fieldVal}>{value}</div>
    </div>
  );
}

function DocCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={s.docCard}>
      <div className={s.docCardTitle}><FileText size={11}/> {title}</div>
      <div className={s.docCardBody}>{children}</div>
    </div>
  );
}

export default FarmerDetailPage;
