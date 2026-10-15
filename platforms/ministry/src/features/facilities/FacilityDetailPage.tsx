import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Pencil, Check, X, Plus, ShieldOff, Beef, Navigation, FileText, Image, ExternalLink, Eye, EyeOff, Upload } from 'lucide-react';
import { LocationPickerMap } from './LocationPickerMap';
import s from './register-facility.module.css';
import d from './facility-detail.module.css';

function FilePickerBtn({ label, file, onPick, accept = '*/*' }: {
  label: string; file: File | null; onPick: (f: File) => void; accept?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <input ref={ref} type="file" accept={accept} style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onPick(f); }} />
      <button type="button"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem',
          fontSize: '0.75rem', fontWeight: 600, background: '#f8fafc', border: '1px solid #e2e8f0',
          borderRadius: '6px', cursor: 'pointer', color: '#374151', fontFamily: 'inherit' }}
        onClick={() => ref.current?.click()}>
        <Upload size={12} /> {file ? 'Change file' : `Choose ${label}`}
      </button>
      {file
        ? <span style={{ fontSize: '0.72rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <FileText size={11} /> {file.name}
          </span>
        : <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>No file selected</span>
      }
    </div>
  );
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FACILITY_TYPES = [
  { value: 'QUARANTINE_STATION', label: 'Quarantine Station', icon: ShieldOff, color: '#b91c1c' },
  { value: 'SLAUGHTERHOUSE',     label: 'Slaughterhouse',     icon: Beef,       color: '#7c3aed' },
  { value: 'CHECKPOINT',         label: 'Checkpoint',         icon: Navigation, color: '#0891b2' },
];

const CHECKPOINT_TYPES = [
  { value: 'BORDER',   label: 'Border Post'         },
  { value: 'INTERNAL', label: 'Internal Checkpoint' },
  { value: 'PORT',     label: 'Seaport / Airport'   },
];

const SPECIES = [
  { value: 'CATTLE', label: 'Cattle', emoji: '🐄' },
  { value: 'CAMEL',  label: 'Camel',  emoji: '🐪' },
  { value: 'GOAT',   label: 'Goat',   emoji: '🐐' },
  { value: 'SHEEP',  label: 'Sheep',  emoji: '🐑' },
];

const SOMALIA_REGIONS = [
  { code: 'AWD', name: 'Awdal'           },
  { code: 'BAK', name: 'Bakool'          },
  { code: 'BAN', name: 'Banadir'         },
  { code: 'BAR', name: 'Bari'            },
  { code: 'BAY', name: 'Bay'             },
  { code: 'GAL', name: 'Galgaduud'       },
  { code: 'GED', name: 'Gedo'            },
  { code: 'HIR', name: 'Hiiraan'         },
  { code: 'MJU', name: 'Middle Jubba'    },
  { code: 'LJU', name: 'Lower Jubba'     },
  { code: 'MUD', name: 'Mudug'           },
  { code: 'NUG', name: 'Nugaal'          },
  { code: 'SAN', name: 'Sanaag'          },
  { code: 'MSH', name: 'Mid. Shabelle'   },
  { code: 'LSH', name: 'Low. Shabelle'   },
  { code: 'SOL', name: 'Sool'            },
  { code: 'TOG', name: 'Togdheer'        },
  { code: 'WOQ', name: 'Woqooyi Galbeed' },
];

const STAFF_ROLES: Record<string, { value: string; label: string; description: string; color: string }[]> = {
  QUARANTINE_STATION: [
    { value: 'QUARANTINE_SUPERVISOR', label: 'Station Supervisor', description: 'Overall management and accountability of the quarantine station', color: '#b91c1c' },
    { value: 'VETERINARY_OFFICER',    label: 'Veterinary Officer', description: 'Disease assessment, diagnosis and health certification of animals', color: '#1d4ed8' },
    { value: 'LAB_TECHNICIAN',        label: 'Lab Technician',     description: 'Sample collection, processing and laboratory diagnostic tests',    color: '#7c3aed' },
  ],
  SLAUGHTERHOUSE: [
    { value: 'SLAUGHTER_SUPERVISOR', label: 'Slaughter Supervisor', description: 'Overall facility operations and staff supervision',                      color: '#7c3aed' },
    { value: 'HALAL_SUPERVISOR',     label: 'Halal Supervisor',     description: 'Oversees and certifies halal compliance across all slaughter operations', color: '#15803d' },
    { value: 'MEAT_INSPECTOR',       label: 'Meat Inspector',       description: 'Meat hygiene, quality grading and food safety assessment',               color: '#d97706' },
  ],
  CHECKPOINT: [
    { value: 'INSPECTOR', label: 'Inspector', description: 'Movement document verification and animal count at the checkpoint', color: '#ea580c' },
  ],
};

const TIPS: Record<string, string[]> = {
  QUARANTINE_STATION: [
    'Use the official station name as registered with the Ministry of Livestock.',
    'Capacity is the total number of animals the station can hold at one time.',
    'The Station Supervisor is automatically set as main contact.',
    'Lab Technicians must be assigned to stations that handle sample collection.',
  ],
  SLAUGHTERHOUSE: [
    'Capacity is the maximum number of animals slaughtered per day.',
    'Every slaughterhouse requires at least one Halal Supervisor by law.',
    'The Veterinary Inspector must hold a valid government licence.',
    'Meat Quality Inspectors are required for export-certified facilities.',
  ],
  CHECKPOINT: [
    'Select Border Post for facilities at international borders.',
    'Select Internal for checkpoints on domestic livestock routes.',
    'Each checkpoint must have a Supervisor and at least one Inspector.',
    'Data Entry Officers are responsible for all QXLITS system entries.',
  ],
};

const TYPE_LABEL: Record<string, string> = {
  QUARANTINE_STATION: 'Quarantine Station',
  SLAUGHTERHOUSE:     'Slaughterhouse',
  CHECKPOINT:         'Checkpoint',
};

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  ACTIVE:    { bg: '#dcfce7', color: '#166534' },
  INACTIVE:  { bg: '#f3f4f6', color: '#6b7280' },
  SUSPENDED: { bg: '#fef3c7', color: '#92400e' },
  PENDING:   { bg: '#dbeafe', color: '#1d4ed8' },
};

const DOC_LABEL: Record<string, string> = {
  LICENSE:       'Licence Document',
  ACCREDITATION: 'Accreditation Certificate',
  PHOTO:         'Facility Photo',
  OTHER:         'Document',
};

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'];

function isImage(url: string): boolean {
  const ext = url.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXTS.includes(ext);
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Facility {
  id:                         string;
  facility_code:              string;
  facility_name:              string;
  facility_type:              string;
  checkpoint_type:            string | null;
  status:                     string;
  region_code:                string;
  location_address:           string | null;
  latitude:                   number | null;
  longitude:                  number | null;
  capacity:                   number | null;
  species_handled:            string[] | null;
  quarantine_types_supported: string[] | null;
  license_number:             string | null;
  license_expiry_date:        string | null;
  issuing_authority:          string | null;
  accreditation_body:         string | null;
  contact_name:               string | null;
  contact_phone:              string | null;
  notes:                      string | null;
  created_at:                 string;
}

interface StaffRow {
  _id:           string;
  dbId?:         string;
  name:          string;
  role:          string;
  email:         string;
  tempPassword?: string;
  phone:         string;
  nationalId:    string;
  isMainContact: boolean;
}

interface FacilityDoc {
  id:            string;
  document_type: string;
  file_name:     string;
  file_url:      string;
  uploaded_at:   string;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function FacilityDetailPage(): JSX.Element {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [facility,      setFacility]      = useState<Facility | null>(null);
  const [occupiedCount, setOccupiedCount] = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [editing,       setEditing]       = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState('');
  const [staffList,     setStaffList]     = useState<StaffRow[]>([]);
  const [staffToDelete, setStaffToDelete] = useState<string[]>([]);
  const [documents,     setDocuments]     = useState<FacilityDoc[]>([]);
  const [previewDoc,    setPreviewDoc]    = useState<FacilityDoc | null>(null);

  const staffSnap = useRef<StaffRow[]>([]);

  // ── Edit form state ──────────────────────────────────────────────────────
  const [fType,       setFType]       = useState('QUARANTINE_STATION');
  const [fCpType,     setFCpType]     = useState('BORDER');
  const [fName,       setFName]       = useState('');
  const [fRegion,     setFRegion]     = useState('');
  const [fAddress,    setFAddress]    = useState('');
  const [fLat,        setFLat]        = useState<number | null>(null);
  const [fLng,        setFLng]        = useState<number | null>(null);
  const [fCapacity,   setFCapacity]   = useState('');
  const [fSpecies,    setFSpecies]    = useState<string[]>([]);
  const [fLicense,    setFLicense]    = useState('');
  const [fLicenseExp, setFLicenseExp] = useState('');
  const [fAuthority,  setFAuthority]  = useState('');
  const [fAccred,     setFAccred]     = useState('');
  const [fNotes,      setFNotes]      = useState('');

  // ── Add-staff mini-form ──────────────────────────────────────────────────
  const [sName,       setSName]       = useState('');
  const [sRole,       setSRole]       = useState('');
  const [sEmail,      setSEmail]      = useState('');
  const [sPwd,        setSPwd]        = useState('');
  const [showPwd,     setShowPwd]     = useState(false);
  const [sPhone,      setSPhone]      = useState('');
  const [sNatId,      setSNatId]      = useState('');
  const [sNatIdFile,  setSNatIdFile]  = useState<File | null>(null);
  const [sCertFile,   setSCertFile]   = useState<File | null>(null);
  const [sMain,       setSMain]       = useState(false);
  const [sError,      setSError]      = useState('');
  const [staffDocFiles, setStaffDocFiles] = useState<Map<string, { nationalId?: File; cert?: File }>>(new Map());

  // ── Document upload (edit mode) ───────────────────────────────────────────
  const [docLicense, setDocLicense] = useState<File | null>(null);
  const [docAccred,  setDocAccred]  = useState<File | null>(null);
  const [docPhoto,   setDocPhoto]   = useState<File | null>(null);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [facRes, staffRes, docRes, countRes] = await Promise.all([
        supabase.from('facilities').select('*').eq('id', id).single(),
        supabase.from('facility_staff')
          .select('id, staff_name, staff_role, email, temp_password, phone, national_id, is_main_contact, status')
          .eq('facility_id', id)
          .neq('status', 'INACTIVE')
          .order('is_main_contact', { ascending: false }),
        supabase.from('facility_documents')
          .select('id, document_type, file_name, file_url, uploaded_at')
          .eq('facility_id', id)
          .order('uploaded_at', { ascending: true }),
        supabase.from('quarantine_batch_animals')
          .select('id', { count: 'exact', head: true })
          .eq('facility_id', id)
          .in('status', ['ACTIVE', 'ON_HOLD']),
      ]);

      if (!facRes.data) { setLoading(false); return; }

      const f = facRes.data as unknown as Facility;
      setFacility(f);
      setOccupiedCount(countRes.count ?? 0);

      const rows: StaffRow[] = ((staffRes.data ?? []) as {
        id: string; staff_name: string; staff_role: string;
        email: string | null; temp_password: string | null;
        phone: string | null; national_id: string | null;
        is_main_contact: boolean;
      }[]).map(r => ({
        _id:           r.id,
        dbId:          r.id,
        name:          r.staff_name,
        role:          r.staff_role,
        email:         r.email          ?? '',
        tempPassword:  r.temp_password  ?? '',
        phone:         r.phone          ?? '',
        nationalId:    r.national_id    ?? '',
        isMainContact: r.is_main_contact,
      }));

      setStaffList(rows);
      staffSnap.current = rows;

      setDocuments((docRes.data ?? []) as FacilityDoc[]);
      setLoading(false);
    };
    void load();
  }, [id]);

  // ── Start / cancel edit ───────────────────────────────────────────────────
  const startEdit = () => {
    if (!facility) return;
    setFType(facility.facility_type);
    setFCpType(facility.checkpoint_type ?? 'BORDER');
    setFName(facility.facility_name);
    setFRegion(facility.region_code);
    setFAddress(facility.location_address ?? '');
    setFLat(facility.latitude);
    setFLng(facility.longitude);
    setFCapacity(facility.capacity != null ? String(facility.capacity) : '');
    setFSpecies(facility.species_handled ?? []);
    setFLicense(facility.license_number ?? '');
    setFLicenseExp(facility.license_expiry_date ?? '');
    setFAuthority(facility.issuing_authority ?? '');
    setFAccred(facility.accreditation_body ?? '');
    setFNotes(facility.notes ?? '');
    staffSnap.current = staffList.map(x => ({ ...x }));
    setStaffToDelete([]);
    setEditing(true);
    setError('');
  };

  const cancelEdit = () => {
    setStaffList(staffSnap.current.map(x => ({ ...x })));
    setStaffToDelete([]);
    setStaffDocFiles(new Map());
    setSName(''); setSRole(''); setSEmail(''); setSPwd(''); setSPhone(''); setSNatId('');
    setSNatIdFile(null); setSCertFile(null); setSMain(false); setSError('');
    setDocLicense(null); setDocAccred(null); setDocPhoto(null);
    setEditing(false);
    setError('');
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!facility) return;
    if (!fName.trim()) { setError('Facility name is required.'); return; }
    if (!fRegion)      { setError('Region is required.'); return; }

    setSaving(true);
    setError('');

    const mainContact = staffList.find(x => x.isMainContact) ?? staffList[0];

    const { error: upErr } = await supabase
      .from('facilities')
      .update({
        facility_name:       fName.trim(),
        facility_type:       fType,
        checkpoint_type:     fType === 'CHECKPOINT' ? fCpType : null,
        region_code:         fRegion,
        location_address:    fAddress.trim()   || null,
        latitude:            fLat,
        longitude:           fLng,
        capacity:            fCapacity          ? parseInt(fCapacity, 10) : null,
        species_handled:     fSpecies.length > 0 ? fSpecies : null,
        license_number:      fLicense.trim()   || null,
        license_expiry_date: fLicenseExp        || null,
        issuing_authority:   fAuthority.trim() || null,
        accreditation_body:  fAccred.trim()    || null,
        contact_name:        mainContact?.name  || null,
        contact_phone:       mainContact?.phone || null,
        notes:               fNotes.trim()     || null,
        updated_at:          new Date().toISOString(),
      })
      .eq('id', facility.id);

    if (upErr) {
      setError('Failed to save: ' + upErr.message);
      setSaving(false);
      return;
    }

    if (staffToDelete.length > 0) {
      await supabase.from('facility_staff').update({ status: 'INACTIVE' }).in('id', staffToDelete);
    }

    for (const st of staffList.filter(x => x.dbId)) {
      await supabase.from('facility_staff')
        .update({ is_main_contact: st.isMainContact })
        .eq('id', st.dbId!);
    }

    const ext = (f: File) => f.name.split('.').pop() ?? 'bin';
    for (const st of staffList.filter(x => !x.dbId)) {
      const { data: inserted } = await supabase.from('facility_staff')
        .insert({
          facility_id:     facility.id,
          facility_code:   facility.facility_code,
          staff_name:      st.name,
          staff_role:      st.role,
          email:           st.email         || null,
          temp_password:   st.tempPassword  || null,
          phone:           st.phone         || null,
          national_id:     st.nationalId    || null,
          is_main_contact: st.isMainContact,
          status:          'ACTIVE',
        })
        .select('id')
        .single();
      if (!inserted) continue;
      st.dbId = (inserted as { id: string }).id;
      st._id  = (inserted as { id: string }).id;
      const staffId = st.dbId;
      const docs = staffDocFiles.get(st._id) ?? staffDocFiles.get(String(st._id));
      if (!docs) continue;
      const uploadStaffDoc = async (file: File, docType: string) => {
        const path = `${facility.facility_code}/staff/${st.role}-${staffId}/${docType}.${ext(file)}`;
        const { error } = await supabase.storage.from('facility-docs').upload(path, file, { upsert: true });
        if (error) return null;
        const { data } = supabase.storage.from('facility-docs').getPublicUrl(path);
        return data.publicUrl;
      };
      const [natIdUrl, certUrl] = await Promise.all([
        docs.nationalId ? uploadStaffDoc(docs.nationalId, 'national_id') : Promise.resolve(null),
        docs.cert       ? uploadStaffDoc(docs.cert,       'certificate') : Promise.resolve(null),
      ]);
      const staffDocs = [
        natIdUrl && { facility_staff_id: staffId, facility_id: facility.id, document_type: 'NATIONAL_ID', file_url: natIdUrl, file_name: docs.nationalId?.name ?? '' },
        certUrl  && { facility_staff_id: staffId, facility_id: facility.id, document_type: 'CERTIFICATE', file_url: certUrl,  file_name: docs.cert?.name       ?? '' },
      ].filter(Boolean);
      if (staffDocs.length > 0) await supabase.from('facility_staff_documents').insert(staffDocs);
    }
    setStaffDocFiles(new Map());

    // Upload new facility documents
    if (docLicense || docAccred || docPhoto) {
      const uploadFacDoc = async (file: File, docType: string): Promise<string | null> => {
        const fileExt = file.name.split('.').pop() ?? 'bin';
        const path = `${facility.facility_code}/${docType}.${fileExt}`;
        const { error: storErr } = await supabase.storage.from('facility-docs').upload(path, file, { upsert: true });
        if (storErr) {
          setError(`Document upload failed (${docType}): ${storErr.message}`);
          return null;
        }
        const { data } = supabase.storage.from('facility-docs').getPublicUrl(path);
        return data.publicUrl;
      };
      const [licUrl, accUrl, phUrl] = await Promise.all([
        docLicense ? uploadFacDoc(docLicense, 'license')       : Promise.resolve(null),
        docAccred  ? uploadFacDoc(docAccred,  'accreditation') : Promise.resolve(null),
        docPhoto   ? uploadFacDoc(docPhoto,   'photo')         : Promise.resolve(null),
      ]);
      const newFacDocs = [
        licUrl && { facility_id: facility.id, facility_code: facility.facility_code, document_type: 'LICENSE',       file_url: licUrl, file_name: docLicense?.name ?? '' },
        accUrl && { facility_id: facility.id, facility_code: facility.facility_code, document_type: 'ACCREDITATION', file_url: accUrl, file_name: docAccred?.name  ?? '' },
        phUrl  && { facility_id: facility.id, facility_code: facility.facility_code, document_type: 'PHOTO',         file_url: phUrl,  file_name: docPhoto?.name   ?? '' },
      ].filter(Boolean);
      if (newFacDocs.length > 0) {
        const { data: inserted, error: docInsErr } = await supabase.from('facility_documents').insert(newFacDocs).select();
        if (docInsErr) {
          setError(`Document record save failed: ${docInsErr.message}`);
        } else if (inserted) {
          setDocuments(prev => [...prev, ...(inserted as FacilityDoc[])]);
        }
      }
    }
    setDocLicense(null); setDocAccred(null); setDocPhoto(null);

    setFacility(prev => prev ? {
      ...prev,
      facility_name:       fName.trim(),
      facility_type:       fType,
      checkpoint_type:     fType === 'CHECKPOINT' ? fCpType : null,
      region_code:         fRegion,
      location_address:    fAddress.trim()    || null,
      latitude:            fLat,
      longitude:           fLng,
      capacity:            fCapacity ? parseInt(fCapacity, 10) : null,
      species_handled:     fSpecies.length > 0 ? fSpecies : null,
      license_number:      fLicense.trim()    || null,
      license_expiry_date: fLicenseExp         || null,
      issuing_authority:   fAuthority.trim()  || null,
      accreditation_body:  fAccred.trim()     || null,
      contact_name:        mainContact?.name   || null,
      contact_phone:       mainContact?.phone  || null,
      notes:               fNotes.trim()      || null,
    } : null);

    staffSnap.current = staffList.map(x => ({ ...x }));
    setStaffToDelete([]);
    setSName(''); setSRole(''); setSEmail(''); setSPhone(''); setSNatId(''); setSMain(false);
    setEditing(false);
    setSaving(false);
  };

  // ── Staff helpers ─────────────────────────────────────────────────────────
  const removeStaff = (_id: string, dbId?: string) => {
    setStaffList(prev => prev.filter(x => x._id !== _id));
    if (dbId) setStaffToDelete(prev => [...prev, dbId]);
  };

  const setMainContact = (_id: string) =>
    setStaffList(prev => prev.map(x => ({ ...x, isMainContact: x._id === _id })));

  const addStaff = () => {
    if (!sName.trim()) { setSError('Name is required.'); return; }
    if (!sRole)        { setSError('Role is required.'); return; }
    setSError('');
    const _id    = Date.now().toString();
    const asMain = sMain || staffList.length === 0;
    if (asMain) setStaffList(prev => prev.map(x => ({ ...x, isMainContact: false })));
    setStaffList(prev => [...prev, {
      _id, name: sName.trim(), role: sRole,
      email: sEmail.trim(), tempPassword: sPwd.trim() || undefined,
      phone: sPhone.trim(), nationalId: sNatId.trim(),
      isMainContact: asMain,
    }]);
    if (sNatIdFile || sCertFile) {
      setStaffDocFiles(prev => {
        const m = new Map(prev);
        m.set(_id, { nationalId: sNatIdFile ?? undefined, cert: sCertFile ?? undefined });
        return m;
      });
    }
    setSName(''); setSRole(''); setSEmail(''); setSPwd(''); setSPhone(''); setSNatId('');
    setSNatIdFile(null); setSCertFile(null); setSMain(false);
  };

  // ── Guards ────────────────────────────────────────────────────────────────
  if (loading) return <div className={d.loading}>Loading facility…</div>;
  if (!facility) return <div className={d.loading}>Facility not found.</div>;

  const st          = STATUS_STYLE[facility.status] ?? STATUS_STYLE.INACTIVE;
  const currentType = editing ? fType : facility.facility_type;
  const availRoles  = STAFF_ROLES[currentType] ?? [];
  const tips        = TIPS[currentType] ?? [];
  const typeColor   = FACILITY_TYPES.find(t => t.value === currentType)?.color ?? '#374151';
  const regionName  = SOMALIA_REGIONS.find(r => r.code === facility.region_code)?.name ?? facility.region_code;

  const fmtDate = (v?: string | null) =>
    v ? new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const viewLat = facility.latitude;
  const viewLng = facility.longitude;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={s.page}>

      {/* ══ Left: help panel ══ */}
      <aside className={s.helpPanel}>
        <button className={s.backBtn} onClick={() => navigate('/facilities')}>
          <ArrowLeft size={13} strokeWidth={2.5} /> Back to Facilities
        </button>

        <div className={d.facSummary}>
          <div className={d.facCode}>{facility.facility_code}</div>
          <div className={d.facName}>{facility.facility_name}</div>
          <span className={d.statusBadge} style={{ background: st.bg, color: st.color }}>
            {facility.status}
          </span>
        </div>

        <div className={s.helpBlock}>
          <div className={s.helpBlockTitle}>SECTIONS</div>
          {['Facility Information', 'License & Compliance', 'Documents', 'Staff', 'Notes', 'Registration'].map((sec, i) => (
            <div key={sec} className={s.helpStep}>
              <div className={s.helpStepNum}>{i + 1}</div>
              <div className={s.helpStepLabel}>{sec}</div>
            </div>
          ))}
        </div>

        <div className={s.requiredNote}>
          Changes are saved immediately to the database. Staff marked inactive are excluded from portal access and reports.
        </div>
      </aside>

      {/* ══ Main form area ══ */}
      <div className={s.formArea}>

        {/* Page header */}
        <div className={d.pageHeader}>
          <div className={d.pageHeaderLeft}>
            <span className={d.pageTitle}>{facility.facility_name}</span>
            <span className={d.statusBadge} style={{ background: st.bg, color: st.color }}>
              {facility.status}
            </span>
          </div>
          {!editing ? (
            <button className={d.editBtn} onClick={startEdit}>
              <Pencil size={13} strokeWidth={2} /> Edit Facility
            </button>
          ) : (
            <div className={d.editActions}>
              <button className={d.cancelBtn2} onClick={cancelEdit} disabled={saving}>
                <X size={13} /> Cancel
              </button>
              <button className={d.saveBtn2} onClick={() => void handleSave()} disabled={saving}>
                <Check size={13} /> {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>

        {error && <div className={s.saveError}>{error}</div>}

        {/* ── Section 1: Facility Information ── */}
        <div className={s.section}>
          <div className={s.sectionTitle}>FACILITY INFORMATION</div>

          {editing ? (
            <div className={s.typeCards}>
              {FACILITY_TYPES.map(({ value, label, icon: Icon, color }) => (
                <button
                  key={value}
                  className={`${s.typeCard}${fType === value ? ' ' + s.typeCardActive : ''}`}
                  style={fType === value ? { borderColor: color, background: '#fafafa' } : {}}
                  onClick={() => { setFType(value); setFSpecies([]); setSRole(''); }}
                >
                  <Icon size={20} strokeWidth={1.5} style={{ color }} />
                  <span style={fType === value ? { color } : {}}>{label}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className={d.typeDisplay}>
              {(() => { const Icon = FACILITY_TYPES.find(t => t.value === facility.facility_type)?.icon ?? ShieldOff; return <Icon size={18} strokeWidth={1.5} style={{ color: typeColor }} />; })()}
              <span style={{ color: typeColor, fontWeight: 700, fontSize: '0.9rem' }}>
                {TYPE_LABEL[facility.facility_type] ?? facility.facility_type}
              </span>
              {facility.checkpoint_type && (
                <span className={d.cpTypeBadge}>
                  {CHECKPOINT_TYPES.find(c => c.value === facility.checkpoint_type)?.label ?? facility.checkpoint_type}
                </span>
              )}
            </div>
          )}

          <div className={s.facilityInfoRow}>
            <div className={s.facilityFields}>

              {editing && fType === 'CHECKPOINT' && (
                <div className={s.field}>
                  <label className={s.label}>Checkpoint Type</label>
                  <select className={s.select} value={fCpType} onChange={e => setFCpType(e.target.value)}>
                    {CHECKPOINT_TYPES.map(ct => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
                  </select>
                </div>
              )}

              <div className={s.fieldRow}>
                <div className={s.field} style={{ flex: 2 }}>
                  <label className={s.label}>Facility Name</label>
                  {editing
                    ? <input className={s.input} value={fName} onChange={e => setFName(e.target.value)} />
                    : <div className={d.readOnly}>{facility.facility_name}</div>
                  }
                </div>
                <div className={s.field}>
                  <label className={s.label}>Region</label>
                  {editing
                    ? (
                      <select className={s.select} value={fRegion} onChange={e => setFRegion(e.target.value)}>
                        <option value="">Select region</option>
                        {SOMALIA_REGIONS.map(r => <option key={r.code} value={r.code}>{r.name} ({r.code})</option>)}
                      </select>
                    )
                    : <div className={d.readOnly}>{regionName}</div>
                  }
                </div>
              </div>

              <div className={s.field}>
                <label className={s.label}>Location / Address</label>
                {editing
                  ? <input className={s.input} value={fAddress} onChange={e => setFAddress(e.target.value)} />
                  : <div className={d.readOnly}>{facility.location_address || <span style={{ opacity: 0.4 }}>—</span>}</div>
                }
              </div>

              {(currentType === 'QUARANTINE_STATION' || currentType === 'SLAUGHTERHOUSE') && (
                <>
                  <div className={s.field} style={{ maxWidth: 220 }}>
                    <label className={s.label}>
                      {currentType === 'SLAUGHTERHOUSE' ? 'Daily Slaughter Capacity' : 'Animal Holding Capacity'}
                    </label>
                    {editing
                      ? <input className={s.input} type="number" min="0" value={fCapacity} onChange={e => setFCapacity(e.target.value)} />
                      : <div className={d.readOnly}>{facility.capacity?.toLocaleString() ?? <span style={{ opacity: 0.4 }}>—</span>}</div>
                    }
                  </div>
                  <div className={s.field}>
                    <label className={s.label}>Species Handled</label>
                    {editing ? (
                      <div className={s.speciesIcons}>
                        {SPECIES.map(sp => (
                          <button
                            key={sp.value}
                            type="button"
                            className={`${s.speciesIcon}${fSpecies.includes(sp.value) ? ' ' + s.speciesIconActive : ''}`}
                            onClick={() => setFSpecies(prev => prev.includes(sp.value) ? prev.filter(x => x !== sp.value) : [...prev, sp.value])}
                          >
                            <span className={s.speciesEmoji}>{sp.emoji}</span>
                            <span className={s.speciesIconLabel}>{sp.label}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className={d.speciesDisplay}>
                        {(facility.species_handled ?? []).length > 0
                          ? (facility.species_handled ?? []).map(sp => (
                              <span key={sp} className={d.speciesPill}>
                                {SPECIES.find(x => x.value === sp)?.emoji ?? ''} {sp.charAt(0) + sp.slice(1).toLowerCase()}
                              </span>
                            ))
                          : <span style={{ opacity: 0.4, fontSize: '0.82rem' }}>—</span>
                        }
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Map — key forces remount on mode change so onChange closure stays fresh */}
            <div className={s.facilityMap}>
              <label className={s.label}>
                📍 Location Pin
                {editing && <span className={s.labelHint}> — click to place</span>}
              </label>
              <div className={s.mapSquare}>
                <LocationPickerMap
                  key={editing ? 'map-edit' : 'map-view'}
                  lat={editing ? fLat : viewLat}
                  lng={editing ? fLng : viewLng}
                  onChange={editing ? (la, ln) => { setFLat(la); setFLng(ln); } : () => {}}
                  height="100%"
                />
              </div>
              {(editing ? (fLat !== null && fLng !== null) : (viewLat !== null && viewLng !== null)) && (
                <div className={s.coordDisplay}>
                  <span>
                    {(editing ? fLat : viewLat)?.toFixed(5)},&nbsp;
                    {(editing ? fLng : viewLng)?.toFixed(5)}
                  </span>
                  {editing && (
                    <button className={s.clearCoordBtn} onClick={() => { setFLat(null); setFLng(null); }}>
                      <X size={12} /> Clear
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Quarantine Capacity & Occupancy (QUARANTINE_STATION only) ── */}
        {facility.facility_type === 'QUARANTINE_STATION' && (
          <div className={s.section}>
            <div className={s.sectionTitle}>QUARANTINE CAPACITY &amp; OCCUPANCY</div>
            {(() => {
              const totalCap    = facility.capacity;
              const hasCapacity = totalCap !== null && totalCap > 0;
              const pct         = hasCapacity ? (occupiedCount / totalCap!) * 100 : 0;
              const filledCells = Math.min(Math.round(pct), 100);
              const isOver      = hasCapacity && occupiedCount > totalCap!;

              const SPECIES_LABELS: Record<string, string> = {
                CATTLE: 'Cattle', CAMEL: 'Camels', GOAT: 'Goats', SHEEP: 'Sheep',
              };
              const QTYPE_LABELS: Record<string, string> = {
                EXPORT: 'Export Hold', IMPORT: 'Import Inspection',
                DISEASE_CONTROL: 'Disease Control', ROUTINE: 'Routine Health',
              };

              if (!hasCapacity) {
                return (
                  <div style={{ fontSize: '0.84rem', color: '#94a3b8', padding: '0.5rem 0' }}>
                    Capacity not configured by this facility.
                  </div>
                );
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {/* Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 18px)', gap: '3px', width: 'fit-content' }}>
                    {Array.from({ length: 100 }, (_, i) => (
                      <div key={i} style={{
                        width: 18, height: 18, borderRadius: 3,
                        background: i < filledCells ? '#0f2170' : '#e2e8f0',
                      }} />
                    ))}
                  </div>

                  {/* Count */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '0.9rem', fontWeight: 700, color: isOver ? '#92400e' : '#0f172a',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {occupiedCount.toLocaleString()} / {totalCap!.toLocaleString()} animals
                    </span>
                    <span style={{
                      fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.55rem',
                      borderRadius: 20, background: isOver ? '#fef3c7' : '#f1f5f9',
                      color: isOver ? '#92400e' : '#64748b',
                    }}>
                      {isOver
                        ? `${Math.round(pct)}% — over capacity`
                        : `${Math.round(pct)}% occupied`}
                    </span>
                  </div>

                  {/* Species badges */}
                  {(facility.species_handled?.length ?? 0) > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.73rem', fontWeight: 600, color: '#94a3b8', minWidth: 52 }}>Accepts:</span>
                      {facility.species_handled!.map(sp => (
                        <span key={sp} style={{
                          fontSize: '0.72rem', fontWeight: 600, color: '#334155',
                          background: '#f1f5f9', border: '1px solid #e2e8f0',
                          padding: '0.18rem 0.55rem', borderRadius: 20,
                        }}>
                          {SPECIES_LABELS[sp] ?? sp}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Quarantine types badges */}
                  {(facility.quarantine_types_supported?.length ?? 0) > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.73rem', fontWeight: 600, color: '#94a3b8', minWidth: 52 }}>Handles:</span>
                      {facility.quarantine_types_supported!.map(qt => (
                        <span key={qt} style={{
                          fontSize: '0.72rem', fontWeight: 600, color: '#334155',
                          background: '#f1f5f9', border: '1px solid #e2e8f0',
                          padding: '0.18rem 0.55rem', borderRadius: 20,
                        }}>
                          {QTYPE_LABELS[qt] ?? qt}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ── Section 2: License & Compliance ── */}
        <div className={s.section}>
          <div className={s.sectionTitle}>LICENSE &amp; COMPLIANCE</div>

          <div className={s.fieldRow}>
            <div className={s.field}>
              <label className={s.label}>License Number</label>
              {editing
                ? <input className={s.input} value={fLicense} onChange={e => setFLicense(e.target.value)} />
                : <div className={d.readOnly}>{facility.license_number || <span style={{ opacity: 0.4 }}>—</span>}</div>
              }
            </div>
            <div className={s.field}>
              <label className={s.label}>License Expiry Date</label>
              {editing
                ? <input className={s.input} type="date" value={fLicenseExp} onChange={e => setFLicenseExp(e.target.value)} />
                : <div className={d.readOnly}>{fmtDate(facility.license_expiry_date)}</div>
              }
            </div>
          </div>

          <div className={s.fieldRow}>
            <div className={s.field}>
              <label className={s.label}>Issuing Authority</label>
              {editing
                ? <input className={s.input} value={fAuthority} onChange={e => setFAuthority(e.target.value)} />
                : <div className={d.readOnly}>{facility.issuing_authority || <span style={{ opacity: 0.4 }}>—</span>}</div>
              }
            </div>
            <div className={s.field}>
              <label className={s.label}>Accreditation Body</label>
              {editing
                ? <input className={s.input} value={fAccred} onChange={e => setFAccred(e.target.value)} />
                : <div className={d.readOnly}>{facility.accreditation_body || <span style={{ opacity: 0.4 }}>—</span>}</div>
              }
            </div>
          </div>
        </div>

        {/* ── Section 3: Documents ── */}
        <div className={s.section}>
          <div className={s.sectionTitle}>DOCUMENTS</div>
          {documents.length === 0 && !editing && (
            <div className={d.emptyStaff}>No documents uploaded for this facility.</div>
          )}
          {documents.length > 0 && (
            <div className={d.docGrid}>
              {documents.map(doc => {
                const img = isImage(doc.file_url);
                return (
                  <div key={doc.id} className={d.docCard}>
                    {img ? (
                      <div className={d.docThumb}>
                        <img src={doc.file_url} alt={doc.file_name} className={d.docThumbImg} />
                      </div>
                    ) : (
                      <div className={d.docThumbPdf}>
                        <FileText size={32} strokeWidth={1.5} style={{ color: '#94a3b8' }} />
                      </div>
                    )}
                    <div className={d.docCardBody}>
                      <div className={d.docType}>{DOC_LABEL[doc.document_type] ?? doc.document_type}</div>
                      <div className={d.docName}>{doc.file_name}</div>
                      <div className={d.docDate}>Uploaded {fmtDate(doc.uploaded_at)}</div>
                    </div>
                    <div className={d.docCardActions}>
                      <button className={d.docPreviewBtn} onClick={() => setPreviewDoc(doc)}>
                        <Image size={13} /> Preview
                      </button>
                      <a className={d.docOpenBtn} href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink size={13} /> Open
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {editing && (
            <div className={s.staffDocRow} style={{ marginTop: documents.length > 0 ? '1rem' : 0 }}>
              <div className={s.staffDocItem}>
                <div className={s.staffDocLabel}>Licence Document</div>
                <FilePickerBtn label="Licence PDF" file={docLicense} onPick={setDocLicense} accept=".pdf,.jpg,.jpeg,.png" />
              </div>
              <div className={s.staffDocItem}>
                <div className={s.staffDocLabel}>Accreditation Certificate</div>
                <FilePickerBtn label="Accreditation PDF" file={docAccred} onPick={setDocAccred} accept=".pdf,.jpg,.jpeg,.png" />
              </div>
              <div className={s.staffDocItem}>
                <div className={s.staffDocLabel}>Facility Photo</div>
                <FilePickerBtn label="Photo" file={docPhoto} onPick={setDocPhoto} accept=".jpg,.jpeg,.png,.webp" />
              </div>
            </div>
          )}
        </div>

        {/* ── Section 4: Staff ── */}
        <div className={s.section}>
          <div className={s.sectionTitle}>FACILITY STAFF</div>

          {staffList.length > 0 ? (
            <div className={d.staffTableWrap}>
              <table className={d.staffTable}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Email (login)</th>
                    {editing && <th>Password</th>}
                    <th>Phone</th>
                    <th>Main Contact</th>
                    {editing && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {staffList.map(st => {
                    const roleInfo = availRoles.find(r => r.value === st.role);
                    return (
                      <tr key={st._id} className={st.isMainContact ? d.staffRowMain : ''}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                            <div className={d.avatar}>
                              {st.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 600, fontSize: '0.82rem', color: '#111827' }}>{st.name}</span>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, fontSize: '0.78rem', color: roleInfo?.color ?? '#475569' }}>
                            {roleInfo?.label ?? st.role}
                          </span>
                        </td>
                        <td><span style={{ fontSize: '0.78rem', color: '#6b7280' }}>{st.email || '—'}</span></td>
                        {editing && (
                          <td>
                            <span style={{ fontSize: '0.78rem', color: '#6b7280', fontFamily: 'monospace' }}>
                              {st.tempPassword ? '••••••••' : <span style={{ color: '#d1d5db' }}>—</span>}
                            </span>
                          </td>
                        )}
                        <td><span style={{ fontSize: '0.78rem', color: '#6b7280' }}>{st.phone || '—'}</span></td>
                        <td>
                          {st.isMainContact
                            ? <span className={d.mainBadge}>★ Main</span>
                            : editing
                              ? <button className={d.setMainBtn} onClick={() => setMainContact(st._id)}>☆ Set</button>
                              : <span style={{ color: '#d1d5db', fontSize: '0.78rem' }}>—</span>
                          }
                        </td>
                        {editing && (
                          <td>
                            <button className={d.removeBtn} onClick={() => removeStaff(st._id, st.dbId)}>✕</button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={d.emptyStaff}>No staff registered for this facility.</div>
          )}

          {editing && (
            <div className={s.addStaffForm}>
              <div className={s.addStaffTitle}>Add Staff Member</div>

              <div className={s.fieldRow}>
                <div className={s.field} style={{ flex: 2 }}>
                  <label className={s.label}>Full Name <span className={s.req}>*</span></label>
                  <input className={s.input} value={sName} onChange={e => setSName(e.target.value)} />
                </div>
                <div className={s.field}>
                  <label className={s.label}>Role <span className={s.req}>*</span></label>
                  <select className={s.select} value={sRole} onChange={e => setSRole(e.target.value)}>
                    <option value="">Select role</option>
                    {availRoles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
              </div>

              <div className={s.fieldRow}>
                <div className={s.field}>
                  <label className={s.label}>Email (for login)</label>
                  <input className={s.input} type="email" value={sEmail} onChange={e => setSEmail(e.target.value)} />
                </div>
                <div className={s.field}>
                  <label className={s.label}>Temporary Password</label>
                  <div className={s.pwdWrap}>
                    <input className={s.input}
                      type={showPwd ? 'text' : 'password'}
                      value={sPwd}
                      onChange={e => setSPwd(e.target.value)}
                      placeholder="Set login password"
                    />
                    <button className={s.pwdToggle} type="button" onClick={() => setShowPwd(v => !v)}>
                      {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className={s.fieldRow}>
                <div className={s.field}>
                  <label className={s.label}>Phone</label>
                  <input className={s.input} value={sPhone} onChange={e => setSPhone(e.target.value)} />
                </div>
                <div className={s.field}>
                  <label className={s.label}>National ID Number</label>
                  <input className={s.input} value={sNatId} onChange={e => setSNatId(e.target.value)} />
                </div>
              </div>

              <div className={s.staffDocRow}>
                <div className={s.staffDocItem}>
                  <div className={s.staffDocLabel}>National ID Copy</div>
                  <FilePickerBtn label="National ID" file={sNatIdFile} onPick={setSNatIdFile} accept=".pdf,.jpg,.jpeg,.png" />
                </div>
                <div className={s.staffDocItem}>
                  <div className={s.staffDocLabel}>Professional Certificate</div>
                  <FilePickerBtn label="Certificate" file={sCertFile} onPick={setSCertFile} accept=".pdf,.jpg,.jpeg,.png" />
                </div>
              </div>

              <div className={s.addStaffFooter}>
                <label className={s.mainCheck}>
                  <input type="checkbox" checked={sMain} onChange={e => setSMain(e.target.checked)} />
                  Set as Main Contact
                </label>
                {sError && <span className={s.staffError}>{sError}</span>}
                <button className={s.addStaffBtn} onClick={addStaff}>
                  <Plus size={14} strokeWidth={2.5} /> Add to List
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Section 5: Notes ── */}
        <div className={s.section}>
          <div className={s.sectionTitle}>NOTES</div>
          <div className={s.field}>
            <label className={s.label}>Additional Notes</label>
            {editing
              ? <textarea className={s.textarea} rows={3} value={fNotes} onChange={e => setFNotes(e.target.value)} />
              : <div className={d.readOnly} style={{ minHeight: 52 }}>
                  {facility.notes || <span style={{ opacity: 0.4 }}>No notes</span>}
                </div>
            }
          </div>
        </div>

        {/* ── Section 6: Registration details ── */}
        <div className={s.section}>
          <div className={s.sectionTitle}>REGISTRATION DETAILS</div>
          <div className={s.fieldRow}>
            <div className={s.field}>
              <label className={s.label}>Facility Code</label>
              <div className={d.readOnly}>
                <code style={{ fontFamily: 'monospace', color: '#1d4ed8', fontWeight: 700 }}>{facility.facility_code}</code>
              </div>
            </div>
            <div className={s.field}>
              <label className={s.label}>Registered On</label>
              <div className={d.readOnly}>{fmtDate(facility.created_at)}</div>
            </div>
            <div className={s.field}>
              <label className={s.label}>Primary Contact</label>
              <div className={d.readOnly}>
                {facility.contact_name
                  ? <span>{facility.contact_name}{facility.contact_phone ? ` · ${facility.contact_phone}` : ''}</span>
                  : <span style={{ opacity: 0.4 }}>—</span>
                }
              </div>
            </div>
          </div>
        </div>

        {editing && (
          <div className={s.formFooter}>
            <button className={s.cancelBtn} onClick={cancelEdit} disabled={saving}>Cancel</button>
            <button className={s.saveBtn} onClick={() => void handleSave()} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}

      </div>

      {/* ══ Right: tips panel ══ */}
      <aside className={s.tipsPanel}>
        <div className={s.tipsSection}>
          <div className={s.tipsTitle}>TIPS</div>
          <ul className={s.tipsList}>
            {tips.map((tip, i) => <li key={i}>{tip}</li>)}
          </ul>
        </div>
        <div className={s.tipsSection}>
          <div className={s.tipsTitle} style={{ color: typeColor }}>
            STAFF ROLES — {TYPE_LABEL[currentType]}
          </div>
          <div className={s.roleList}>
            {availRoles.map(r => (
              <div key={r.value} className={s.roleItem}>
                <div className={s.roleName} style={{ color: r.color }}>{r.label}</div>
                <div className={s.roleDesc}>{r.description}</div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* ══ Document preview modal ══ */}
      {previewDoc && (
        <div className={d.previewOverlay} onClick={() => setPreviewDoc(null)}>
          <div className={d.previewModal} onClick={e => e.stopPropagation()}>
            <div className={d.previewHeader}>
              <div>
                <div className={d.previewDocType}>{DOC_LABEL[previewDoc.document_type] ?? previewDoc.document_type}</div>
                <div className={d.previewDocName}>{previewDoc.file_name}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <a className={d.previewOpenLink} href={previewDoc.file_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={14} /> Open in new tab
                </a>
                <button className={d.previewCloseBtn} onClick={() => setPreviewDoc(null)}>
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className={d.previewBody}>
              {isImage(previewDoc.file_url) ? (
                <img src={previewDoc.file_url} alt={previewDoc.file_name} className={d.previewImg} />
              ) : (
                <iframe
                  src={previewDoc.file_url}
                  title={previewDoc.file_name}
                  className={d.previewIframe}
                />
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default FacilityDetailPage;
