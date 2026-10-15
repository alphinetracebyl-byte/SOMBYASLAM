import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle, ArrowLeft, Eye, EyeOff, Plus, X,
  ShieldOff, Beef, Navigation, Star, MapPin, Upload, FileText,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth.store';
import { LocationPickerMap } from './LocationPickerMap';
import s from './register-facility.module.css';

// ── Constants ─────────────────────────────────────────────────────────────────

const FACILITY_TYPES = [
  { value: 'QUARANTINE_STATION', label: 'Quarantine Station', icon: ShieldOff,  color: '#b91c1c' },
  { value: 'SLAUGHTERHOUSE',     label: 'Slaughterhouse',     icon: Beef,        color: '#7c3aed' },
  { value: 'CHECKPOINT',         label: 'Checkpoint',         icon: Navigation,  color: '#0891b2' },
];

const CHECKPOINT_TYPES = [
  { value: 'BORDER',   label: 'Border Post'          },
  { value: 'INTERNAL', label: 'Internal Checkpoint'  },
  { value: 'PORT',     label: 'Seaport / Airport'    },
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

const SECTIONS = [
  'Facility Information',
  'License & Compliance',
  'Documents',
  'Facility Staff',
  'Notes',
];

const NEXT_STEPS = [
  { title: 'Facility Registered',  body: 'The facility is saved with ACTIVE status and appears in the facilities list immediately.' },
  { title: 'Staff Added',          body: 'Staff members are linked to the facility. Their roles appear in the Export Portal.' },
  { title: 'Export Portal Access', body: 'Each staff email is used to set up their login account in the Export & Facilities Portal.' },
];

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

function genCode(type: string, region: string): string {
  const prefix = type === 'QUARANTINE_STATION' ? 'QS'
               : type === 'SLAUGHTERHOUSE'     ? 'SH'
               : 'CP';
  return `${prefix}-${region}-${String(Date.now()).slice(-5)}`;
}

function FilePickerBtn({ label, file, onPick, accept = '*/*' }: {
  label: string; file: File | null; onPick: (f: File) => void; accept?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className={s.filePicker}>
      <input
        ref={ref}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onPick(f); }}
      />
      <button type="button" className={s.filePickBtn} onClick={() => ref.current?.click()}>
        <Upload size={13} strokeWidth={2} /> {file ? 'Change file' : 'Choose file'}
      </button>
      {file
        ? <span className={s.fileName}><FileText size={12} strokeWidth={2} /> {file.name}</span>
        : <span className={s.fileNone}>No file selected</span>
      }
    </div>
  );
}

// ── Staff member type ─────────────────────────────────────────────────────────

interface StaffMember {
  _id:           string;
  name:          string;
  role:          string;
  email:         string;
  tempPassword:  string;
  phone:         string;
  nationalId:    string;
  isMainContact: boolean;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function RegisterFacilityPage(): JSX.Element {
  const navigate = useNavigate();
  const { userId, roles } = useAuthStore();
  const roleLabel = (roles[0] ?? '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

  // ── Facility fields ────────────────────────────────────────────────────────
  const [fType,        setFType]        = useState('QUARANTINE_STATION');
  const [fCpType,      setFCpType]      = useState('BORDER');
  const [fName,        setFName]        = useState('');
  const [fRegion,      setFRegion]      = useState('');
  const [fAddress,     setFAddress]     = useState('');
  const [fLat,         setFLat]         = useState<number | null>(null);
  const [fLng,         setFLng]         = useState<number | null>(null);
  const [fCapacity,    setFCapacity]    = useState('');
  const [fSpecies,     setFSpecies]     = useState<string[]>([]);
  const [fLicense,     setFLicense]     = useState('');
  const [fLicenseExp,  setFLicenseExp]  = useState('');
  const [fAuthority,   setFAuthority]   = useState('');
  const [fAccred,      setFAccred]      = useState('');
  const [fNotes,       setFNotes]       = useState('');

  // ── Facility document files ────────────────────────────────────────────────
  const [docLicense, setDocLicense] = useState<File | null>(null);
  const [docAccred,  setDocAccred]  = useState<File | null>(null);
  const [docPhoto,   setDocPhoto]   = useState<File | null>(null);

  // ── Staff list ─────────────────────────────────────────────────────────────
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  // Per-staff doc files keyed by staff._id
  const [staffDocFiles, setStaffDocFiles] = useState<Map<string, { nationalId?: File; cert?: File }>>(new Map());

  // ── Add-staff form ─────────────────────────────────────────────────────────
  const [sName,       setSName]       = useState('');
  const [sRole,       setSRole]       = useState('');
  const [sEmail,      setSEmail]      = useState('');
  const [sPwd,        setSPwd]        = useState('');
  const [sPhone,      setSPhone]      = useState('');
  const [sNatId,      setSNatId]      = useState('');
  const [sMain,       setSMain]       = useState(false);
  const [showPwd,     setShowPwd]     = useState(false);
  const [sNatIdFile,  setSNatIdFile]  = useState<File | null>(null);
  const [sCertFile,   setSCertFile]   = useState<File | null>(null);
  const [sError,      setSError]      = useState('');

  // ── Submit state ───────────────────────────────────────────────────────────
  const [saving,      setSaving]      = useState(false);
  const [saveError,   setSaveError]   = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const toggleSpecies = (sp: string) =>
    setFSpecies(prev => prev.includes(sp) ? prev.filter(x => x !== sp) : [...prev, sp]);

  const addStaff = () => {
    if (!sName.trim()) { setSError('Staff name is required.'); return; }
    if (!sRole)        { setSError('Please select a role.'); return; }
    setSError('');
    const id = Date.now().toString();
    const isFirst = staffList.length === 0;
    const asMain  = sMain || isFirst;
    if (asMain) {
      setStaffList(prev => prev.map(x => ({ ...x, isMainContact: false })));
    }
    setStaffList(prev => [...prev, {
      _id: id, name: sName.trim(), role: sRole, email: sEmail.trim(),
      tempPassword: sPwd, phone: sPhone.trim(), nationalId: sNatId.trim(),
      isMainContact: asMain,
    }]);
    if (sNatIdFile || sCertFile) {
      setStaffDocFiles(prev => {
        const m = new Map(prev);
        m.set(id, { nationalId: sNatIdFile ?? undefined, cert: sCertFile ?? undefined });
        return m;
      });
    }
    setSName(''); setSRole(''); setSEmail(''); setSPwd('');
    setSPhone(''); setSNatId(''); setSMain(false);
    setSNatIdFile(null); setSCertFile(null);
  };

  const removeStaff = (id: string) => {
    setStaffList(prev => prev.filter(x => x._id !== id));
    setStaffDocFiles(prev => { const m = new Map(prev); m.delete(id); return m; });
  };

  const setMainContact = (id: string) =>
    setStaffList(prev => prev.map(x => ({ ...x, isMainContact: x._id === id })));

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!fName.trim()) { setSaveError('Facility name is required.'); return; }
    if (!fRegion)      { setSaveError('Region is required.'); return; }
    setSaving(true);
    setSaveError('');

    const { data: me } = await supabase.auth.getUser();
    const byId   = me.user?.id ?? userId ?? '';
    const mainContact = staffList.find(x => x.isMainContact);
    const facCode = genCode(fType, fRegion);

    // 1. Insert facility
    const { data: fac, error: facErr } = await supabase
      .from('facilities')
      .insert({
        facility_code:       facCode,
        facility_name:       fName.trim(),
        facility_type:       fType,
        checkpoint_type:     fType === 'CHECKPOINT' ? fCpType : null,
        status:              'ACTIVE',
        region_code:         fRegion,
        location_address:    fAddress.trim()   || null,
        latitude:            fLat,
        longitude:           fLng,
        capacity:            fCapacity         ? parseInt(fCapacity, 10)  : null,
        species_handled:     fSpecies.length > 0 ? fSpecies : null,
        license_number:      fLicense.trim()   || null,
        license_expiry_date: fLicenseExp        || null,
        issuing_authority:   fAuthority.trim() || null,
        accreditation_body:  fAccred.trim()    || null,
        contact_name:        mainContact?.name  || null,
        contact_phone:       mainContact?.phone || null,
        notes:               fNotes.trim()     || null,
        registered_by_id:    byId,
        registered_by_name:  roleLabel,
      })
      .select('id, facility_code')
      .single();

    if (facErr || !fac) {
      setSaveError('Failed to register facility. ' + (facErr?.message ?? ''));
      setSaving(false);
      return;
    }

    const facilityId   = fac.id as string;
    const facilityCode = fac.facility_code as string;

    // 2. Upload facility documents
    const uploadFacDoc = async (file: File | null, docType: string, ext: string) => {
      if (!file) return null;
      const path = `${facilityCode}/${docType}.${ext}`;
      const { error } = await supabase.storage.from('facility-docs').upload(path, file, { upsert: true });
      if (error) return null;
      const { data } = supabase.storage.from('facility-docs').getPublicUrl(path);
      return data.publicUrl;
    };

    const ext = (f: File) => f.name.split('.').pop() ?? 'bin';
    const [licenseUrl, accredUrl, photoUrl] = await Promise.all([
      uploadFacDoc(docLicense, 'license',       docLicense ? ext(docLicense) : 'bin'),
      uploadFacDoc(docAccred,  'accreditation', docAccred  ? ext(docAccred)  : 'bin'),
      uploadFacDoc(docPhoto,   'photo',         docPhoto   ? ext(docPhoto)   : 'bin'),
    ]);

    // Insert facility document records
    const facDocs = [
      licenseUrl && { facility_id: facilityId, facility_code: facilityCode, document_type: 'LICENSE',       file_url: licenseUrl, file_name: docLicense?.name ?? '' },
      accredUrl  && { facility_id: facilityId, facility_code: facilityCode, document_type: 'ACCREDITATION', file_url: accredUrl,  file_name: docAccred?.name  ?? '' },
      photoUrl   && { facility_id: facilityId, facility_code: facilityCode, document_type: 'PHOTO',         file_url: photoUrl,   file_name: docPhoto?.name   ?? '' },
    ].filter(Boolean);

    if (facDocs.length > 0) {
      await supabase.from('facility_documents').insert(facDocs);
    }

    // 3. Insert staff one at a time (to track IDs for document linking)
    for (const st of staffList) {
      const { data: insertedStaff } = await supabase
        .from('facility_staff')
        .insert({
          facility_id:        facilityId,
          facility_code:      facilityCode,
          staff_name:         st.name,
          staff_role:         st.role,
          email:              st.email    || null,
          temp_password:      st.tempPassword || null,
          phone:              st.phone    || null,
          national_id:        st.nationalId || null,
          is_main_contact:    st.isMainContact,
          status:             'ACTIVE',
          registered_by_id:   byId,
          registered_by_name: roleLabel,
        })
        .select('id')
        .single();

      if (!insertedStaff) continue;
      const staffId  = insertedStaff.id as string;
      const docs     = staffDocFiles.get(st._id);
      if (!docs) continue;

      const uploadStaffDoc = async (file: File | null, docType: string) => {
        if (!file) return null;
        const path = `${facilityCode}/staff/${st.role}-${staffId}/${docType}.${ext(file)}`;
        const { error } = await supabase.storage.from('facility-docs').upload(path, file, { upsert: true });
        if (error) return null;
        const { data } = supabase.storage.from('facility-docs').getPublicUrl(path);
        return data.publicUrl;
      };

      const [natIdUrl, certUrl] = await Promise.all([
        uploadStaffDoc(docs.nationalId ?? null, 'national_id'),
        uploadStaffDoc(docs.cert       ?? null, 'certificate'),
      ]);

      const staffDocs = [
        natIdUrl && { facility_staff_id: staffId, facility_id: facilityId, document_type: 'NATIONAL_ID',   file_url: natIdUrl, file_name: docs.nationalId?.name ?? '' },
        certUrl  && { facility_staff_id: staffId, facility_id: facilityId, document_type: 'CERTIFICATE',   file_url: certUrl,  file_name: docs.cert?.name       ?? '' },
      ].filter(Boolean);

      if (staffDocs.length > 0) {
        await supabase.from('facility_staff_documents').insert(staffDocs);
      }
    }

    setSaveSuccess(true);
    setSaving(false);
    setTimeout(() => navigate('/facilities'), 2000);
  };

  // ── Success screen ─────────────────────────────────────────────────────────
  if (saveSuccess) {
    return (
      <div className={s.successWrap}>
        <CheckCircle size={52} strokeWidth={1.25} style={{ color: '#16a34a' }} />
        <h2 className={s.successTitle}>Facility Registered</h2>
        <p className={s.successBody}>Redirecting to the facilities list…</p>
      </div>
    );
  }

  const availableRoles = STAFF_ROLES[fType] ?? [];
  const tips = TIPS[fType] ?? [];
  const typeColor = FACILITY_TYPES.find(t => t.value === fType)?.color ?? '#374151';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={s.page}>

      {/* ══ Left: help panel ══ */}
      <aside className={s.helpPanel}>
        <button className={s.backBtn} onClick={() => navigate('/facilities')}>
          <ArrowLeft size={13} strokeWidth={2.5} /> Back to Facilities
        </button>

        <div className={s.helpBrand}>
          <div className={s.helpBrandIcon}>MO</div>
          <div>
            <div className={s.helpBrandName}>QXLITS</div>
            <div className={s.helpBrandSub}>Ministry Portal</div>
          </div>
        </div>

        <div className={s.helpBlock}>
          <div className={s.helpBlockTitle}>SECTIONS</div>
          {SECTIONS.map((sec, i) => (
            <div key={sec} className={s.helpStep}>
              <div className={s.helpStepNum}>{i + 1}</div>
              <div className={s.helpStepLabel}>{sec}</div>
            </div>
          ))}
        </div>

        <div className={s.helpBlock}>
          <div className={s.helpBlockTitle}>WHAT HAPPENS NEXT</div>
          {NEXT_STEPS.map((step, i) => (
            <div key={step.title} className={s.helpNext}>
              <div className={s.helpNextNum}>{i + 1}</div>
              <div>
                <div className={s.helpNextTitle}>{step.title}</div>
                <div className={s.helpNextBody}>{step.body}</div>
              </div>
            </div>
          ))}
        </div>

        <div className={s.requiredNote}>
          All registered facilities are immediately active. Staff email addresses
          will be used to configure login access to the Export &amp; Facilities Portal.
        </div>
      </aside>

      {/* ══ Main form ══ */}
      <div className={s.formArea}>

        {/* ── Section 1: Facility Information ── */}
        <div className={s.section}>
          <div className={s.sectionTitle}>FACILITY INFORMATION</div>

          {/* Type selector */}
          <div className={s.typeCards}>
            {FACILITY_TYPES.map(({ value, label, icon: Icon, color }) => (
              <div
                key={value}
                className={`${s.typeCard}${fType === value ? ' ' + s.typeCardActive : ''}`}
                style={fType === value ? { borderColor: color, background: '#fafafa' } : {}}
                onClick={() => { setFType(value); setFSpecies([]); }}
                role="button"
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { setFType(value); setFSpecies([]); } }}
              >
                <Icon size={22} strokeWidth={1.5} style={{ color }} />
                <span style={fType === value ? { color } : {}}>{label}</span>
              </div>
            ))}
          </div>

          {/* Two-column: fields left, map right */}
          <div className={s.facilityInfoRow}>
            <div className={s.facilityFields}>

              {fType === 'CHECKPOINT' && (
                <div className={s.field}>
                  <label className={s.label}>Checkpoint Type</label>
                  <select className={s.select} value={fCpType} onChange={e => setFCpType(e.target.value)}>
                    {CHECKPOINT_TYPES.map(ct => (
                      <option key={ct.value} value={ct.value}>{ct.label}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className={s.fieldRow}>
                <div className={s.field} style={{ flex: 2 }}>
                  <label className={s.label}>Facility Name <span className={s.req}>*</span></label>
                  <input className={s.input} value={fName} onChange={e => setFName(e.target.value)} />
                </div>
                <div className={s.field}>
                  <label className={s.label}>Region <span className={s.req}>*</span></label>
                  <select className={s.select} value={fRegion} onChange={e => setFRegion(e.target.value)}>
                    <option value="">Select region</option>
                    {SOMALIA_REGIONS.map(r => (
                      <option key={r.code} value={r.code}>{r.name} ({r.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={s.field}>
                <label className={s.label}>Location / Address</label>
                <input className={s.input} value={fAddress} onChange={e => setFAddress(e.target.value)} />
              </div>

              {(fType === 'QUARANTINE_STATION' || fType === 'SLAUGHTERHOUSE') && (
                <>
                  <div className={s.field}>
                    <label className={s.label}>
                      {fType === 'SLAUGHTERHOUSE' ? 'Daily Slaughter Capacity' : 'Animal Holding Capacity'}
                    </label>
                    <input
                      className={s.input}
                      type="number"
                      min="0"
                      value={fCapacity}
                      onChange={e => setFCapacity(e.target.value)}
                    />
                  </div>
                  <div className={s.field}>
                    <label className={s.label}>Species Handled</label>
                    <div className={s.speciesIcons}>
                      {SPECIES.map(sp => (
                        <button
                          key={sp.value}
                          type="button"
                          className={`${s.speciesIcon}${fSpecies.includes(sp.value) ? ' ' + s.speciesIconActive : ''}`}
                          onClick={() => toggleSpecies(sp.value)}
                        >
                          <span className={s.speciesEmoji}>{sp.emoji}</span>
                          <span className={s.speciesIconLabel}>{sp.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Map — right column */}
            <div className={s.facilityMap}>
              <label className={s.label}>
                <MapPin size={13} strokeWidth={2} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                Pin Location
                <span className={s.labelHint}> — click to place</span>
              </label>
              <div className={s.mapSquare}>
                <LocationPickerMap
                  lat={fLat}
                  lng={fLng}
                  onChange={(lat, lng) => { setFLat(lat); setFLng(lng); }}
                  height="100%"
                />
              </div>
              {fLat !== null && fLng !== null && (
                <div className={s.coordDisplay}>
                  <span>📍 {fLat.toFixed(5)}, {fLng.toFixed(5)}</span>
                  <button className={s.clearCoordBtn} onClick={() => { setFLat(null); setFLng(null); }}>
                    <X size={12} /> Clear
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Section 2: License & Compliance ── */}
        <div className={s.section}>
          <div className={s.sectionTitle}>LICENSE & COMPLIANCE</div>

          <div className={s.fieldRow}>
            <div className={s.field}>
              <label className={s.label}>License Number</label>
              <input className={s.input} value={fLicense} onChange={e => setFLicense(e.target.value)} />
            </div>
            <div className={s.field}>
              <label className={s.label}>License Expiry Date</label>
              <input className={s.input} type="date" value={fLicenseExp} onChange={e => setFLicenseExp(e.target.value)} />
            </div>
          </div>

          <div className={s.fieldRow}>
            <div className={s.field}>
              <label className={s.label}>Issuing Authority</label>
              <input className={s.input} value={fAuthority} onChange={e => setFAuthority(e.target.value)} />
            </div>
            <div className={s.field}>
              <label className={s.label}>Accreditation Body</label>
              <input className={s.input} value={fAccred} onChange={e => setFAccred(e.target.value)} />
            </div>
          </div>
        </div>

        {/* ── Section 3: Documents ── */}
        <div className={s.section}>
          <div className={s.sectionTitle}>DOCUMENTS</div>
          <p className={s.sectionNote}>
            Upload official documents for this facility. All files are stored securely and linked to the facility record.
          </p>

          <div className={s.docGrid}>
            <div className={s.docItem}>
              <div className={s.docItemLabel}>License Document</div>
              <div className={s.docItemHint}>Operating license or permit issued by the Ministry</div>
              <FilePickerBtn label="License Document" file={docLicense} onPick={setDocLicense} accept=".pdf,.jpg,.jpeg,.png" />
            </div>
            <div className={s.docItem}>
              <div className={s.docItemLabel}>Accreditation Certificate</div>
              <div className={s.docItemHint}>Official accreditation or certification document</div>
              <FilePickerBtn label="Accreditation Certificate" file={docAccred} onPick={setDocAccred} accept=".pdf,.jpg,.jpeg,.png" />
            </div>
            <div className={s.docItem}>
              <div className={s.docItemLabel}>Facility Photo</div>
              <div className={s.docItemHint}>Main exterior or aerial photo of the facility</div>
              <FilePickerBtn label="Facility Photo" file={docPhoto} onPick={setDocPhoto} accept=".jpg,.jpeg,.png,.webp" />
            </div>
          </div>
        </div>

        {/* ── Section 4: Facility Staff ── */}
        <div className={s.section}>
          <div className={s.sectionTitle}>FACILITY STAFF</div>
          <p className={s.sectionNote}>
            Add all staff members who work at this facility. The first person added (or the one marked as Main Contact)
            becomes the facility's primary contact. Email addresses will be used to set up login access.
          </p>

          {/* Staff list */}
          {staffList.length > 0 && (
            <div className={s.staffList}>
              {staffList.map(st => {
                const roleInfo = availableRoles.find(r => r.value === st.role);
                const docs = staffDocFiles.get(st._id);
                return (
                  <div key={st._id} className={s.staffCard}>
                    <div className={s.staffCardLeft}>
                      <div className={s.staffAvatar}>
                        {st.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                      <div className={s.staffInfo}>
                        <div className={s.staffName}>
                          {st.name}
                          {st.isMainContact && (
                            <span className={s.mainBadge}><Star size={10} strokeWidth={2.5} fill="currentColor" /> Main Contact</span>
                          )}
                        </div>
                        <div className={s.staffRole} style={{ color: roleInfo?.color ?? '#475569' }}>
                          {roleInfo?.label ?? st.role}
                        </div>
                        <div className={s.staffMeta}>
                          {st.email && <span>{st.email}</span>}
                          {st.phone && <span>{st.phone}</span>}
                          {docs && (docs.nationalId || docs.cert) && (
                            <span className={s.docsBadge}>
                              <FileText size={10} strokeWidth={2} />
                              {[docs.nationalId && 'ID', docs.cert && 'Cert'].filter(Boolean).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={s.staffCardActions}>
                      {!st.isMainContact && (
                        <button className={s.setMainBtn} onClick={() => setMainContact(st._id)} title="Set as main contact">
                          <Star size={13} />
                        </button>
                      )}
                      <button className={s.removeStaffBtn} onClick={() => removeStaff(st._id)} title="Remove">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add staff form */}
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
                  {availableRoles.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
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
                  <input
                    className={s.input}
                    type={showPwd ? 'text' : 'password'}
                    value={sPwd}
                    onChange={e => setSPwd(e.target.value)}
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

            {/* Staff document uploads */}
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
                <Plus size={15} strokeWidth={2.5} /> Add to List
              </button>
            </div>
          </div>
        </div>

        {/* ── Section 5: Notes ── */}
        <div className={s.section}>
          <div className={s.sectionTitle}>NOTES</div>
          <div className={s.field}>
            <label className={s.label}>Additional Notes</label>
            <textarea
              className={s.textarea}
              rows={3}
              value={fNotes}
              onChange={e => setFNotes(e.target.value)}
            />
          </div>
        </div>

        {/* ── Submit ── */}
        {saveError && <div className={s.saveError}>{saveError}</div>}
        <div className={s.formFooter}>
          <button className={s.cancelBtn} onClick={() => navigate('/facilities')}>Cancel</button>
          <button className={s.saveBtn} onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Registering…' : 'Register Facility'}
          </button>
        </div>
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
          <div className={s.tipsTitle}>REQUIRED FIELDS</div>
          <div className={s.requiredFields}>
            <span className={s.reqPill}>Facility Name</span>
            <span className={s.reqPill}>Region</span>
          </div>
        </div>

        <div className={s.tipsSection}>
          <div className={s.tipsTitle} style={{ color: typeColor }}>
            STAFF ROLES — {TYPE_LABEL[fType]}
          </div>
          <div className={s.roleList}>
            {availableRoles.map(r => (
              <div key={r.value} className={s.roleItem}>
                <div className={s.roleName} style={{ color: r.color }}>{r.label}</div>
                <div className={s.roleDesc}>{r.description}</div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

export default RegisterFacilityPage;
