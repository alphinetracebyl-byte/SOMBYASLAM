import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit2, Save, X, MapPin,
  CheckCircle, Clock, XCircle, AlertCircle, ImageIcon,
  Shield, Leaf, FileText,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase';
import s from './premisesInfo.module.css';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface Premises {
  id: string;
  premisesCode: string;
  premisesName: string;
  premisesType: string;
  status: string;
  regionCode: string;
  physicalAddress: string;
  gpsLatitude: number;
  gpsLongitude: number;
  areaHectares?: number;
  capacityAnimals?: number;
  allowedSpecies?: string;
  licenseNumber?: string;
  licenseExpiryDate?: string;
  notes?: string;
}

interface Photo {
  id: string;
  fileName: string;
  fileUrl: string;
  docType: string;
}

interface FormState {
  premisesName: string;
  physicalAddress: string;
  areaHectares: string;
  capacityAnimals: string;
  licenseNumber: string;
  licenseExpiryDate: string;
  notes: string;
}

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; Icon: React.ElementType }
> = {
  APPROVED:  { label: 'Approved',  color: '#16a34a', bg: '#dcfce7', Icon: CheckCircle },
  SUBMITTED: { label: 'Submitted', color: '#0b5ed7', bg: '#dbeafe', Icon: Clock },
  DRAFT:     { label: 'Draft',     color: '#64748b', bg: '#f1f5f9', Icon: Clock },
  REJECTED:  { label: 'Rejected',  color: '#dc2626', bg: '#fee2e2', Icon: XCircle },
  SUSPENDED: { label: 'Suspended', color: '#d97706', bg: '#fef3c7', Icon: AlertCircle },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PremisesInfoPage() {
  const { code } = useParams<{ code: string }>();
  const { userId } = useAuthStore();
  const navigate = useNavigate();

  const [premises, setPremises] = useState<Premises | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [animalCount, setAnimalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<FormState>({
    premisesName: '',
    physicalAddress: '',
    areaHectares: '',
    capacityAnimals: '',
    licenseNumber: '',
    licenseExpiryDate: '',
    notes: '',
  });

  // -------------------------------------------------------------------------
  // Fetch data
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!code || !userId) return;

    async function load() {
      setLoading(true);

      const { data: pData } = await supabase
        .from('farmer_premises')
        .select('*')
        .eq('premises_code', code)
        .eq('user_id', userId)
        .single();

      if (!pData) { setLoading(false); return; }

      const d = pData as Record<string, unknown>;
      setPremises({
        id:                d.id as string,
        premisesCode:      d.premises_code as string,
        premisesName:      d.premises_name as string,
        premisesType:      d.premises_type as string,
        status:            d.status as string,
        regionCode:        d.region_code as string,
        physicalAddress:   d.physical_address as string,
        gpsLatitude:       Number(d.gps_latitude),
        gpsLongitude:      Number(d.gps_longitude),
        areaHectares:      d.area_hectares != null ? Number(d.area_hectares) : undefined,
        capacityAnimals:   d.capacity_animals != null ? Number(d.capacity_animals) : undefined,
        allowedSpecies:    d.allowed_species as string | undefined,
        licenseNumber:     d.license_number as string | undefined,
        licenseExpiryDate: d.license_expiry_date as string | undefined,
        notes:             d.notes as string | undefined,
      });

      try {
        const { data: photoData } = await supabase
          .from('farmer_documents')
          .select('id, file_name, file_url, doc_type')
          .eq('premises_code', code);
        if (photoData) {
          setPhotos((photoData as Array<Record<string, unknown>>).map(r => ({
            id:       r.id as string,
            fileName: r.file_name as string,
            fileUrl:  r.file_url as string,
            docType:  r.doc_type as string,
          })));
        }
      } catch {
        // photos are optional — ignore errors
      }

      try {
        const { count } = await supabase
          .from('farmer_animals')
          .select('id', { count: 'exact', head: true })
          .eq('premises_code', code);
        setAnimalCount(count ?? 0);
      } catch {
        // animal count is optional — ignore errors
      }

      setLoading(false);
    }

    void load();
  }, [code, userId]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  function enterEditMode() {
    if (!premises) return;
    setForm({
      premisesName:      premises.premisesName ?? '',
      physicalAddress:   premises.physicalAddress ?? '',
      areaHectares:      premises.areaHectares != null ? String(premises.areaHectares) : '',
      capacityAnimals:   premises.capacityAnimals != null ? String(premises.capacityAnimals) : '',
      licenseNumber:     premises.licenseNumber ?? '',
      licenseExpiryDate: premises.licenseExpiryDate ?? '',
      notes:             premises.notes ?? '',
    });
    setEditMode(true);
  }

  async function handleSave() {
    if (!premises) return;
    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from('farmer_premises')
      .update({
        premises_name:       form.premisesName,
        physical_address:    form.physicalAddress,
        area_hectares:       form.areaHectares !== '' ? Number(form.areaHectares) : null,
        capacity_animals:    form.capacityAnimals !== '' ? Number(form.capacityAnimals) : null,
        license_number:      form.licenseNumber || null,
        license_expiry_date: form.licenseExpiryDate || null,
        notes:               form.notes || null,
      })
      .eq('premises_code', code)
      .eq('user_id', userId);

    if (updateError) {
      setError(updateError.message || 'Failed to save changes.');
      setSaving(false);
      return;
    }

    setPremises(prev =>
      prev
        ? {
            ...prev,
            premisesName:      form.premisesName,
            physicalAddress:   form.physicalAddress,
            areaHectares:      form.areaHectares !== '' ? Number(form.areaHectares) : undefined,
            capacityAnimals:   form.capacityAnimals !== '' ? Number(form.capacityAnimals) : undefined,
            licenseNumber:     form.licenseNumber || undefined,
            licenseExpiryDate: form.licenseExpiryDate || undefined,
            notes:             form.notes || undefined,
          }
        : prev
    );

    setSaving(false);
    setEditMode(false);
  }

  function handleCancel() {
    setEditMode(false);
    setError(null);
  }

  const setF =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [key]: e.target.value }));

  // -------------------------------------------------------------------------
  // Loading skeleton
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className={s.page}>
        <div className={s.topBar} />
        <div className={s.skeletonWrap}>
          <div className={s.skeleton} style={{ height: 260 }} />
          <div className={s.skeleton} style={{ height: 160 }} />
          <div className={s.skeleton} style={{ height: 140 }} />
          <div className={s.skeleton} style={{ height: 120 }} />
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Not found
  // -------------------------------------------------------------------------

  if (!premises) {
    return (
      <div className={s.page}>
        <div className={s.notFound}>
          <p>Farm not found.</p>
          <button className={s.backBtn} onClick={() => navigate('/premises')}>
            <ArrowLeft size={14} /> Back to Farms
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Status badge config
  // -------------------------------------------------------------------------

  const cfg = STATUS_CONFIG[premises.status] ?? STATUS_CONFIG.DRAFT;

  // -------------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------------

  return (
    <div className={s.page}>

      {/* Sticky top bar */}
      <div className={s.topBar}>
        <button className={s.backBtn} onClick={() => navigate('/premises')}>
          <ArrowLeft size={14} /> Back to Farms
        </button>
        <div className={s.topActions}>
          {!editMode ? (
            <button className={s.editBtn} onClick={enterEditMode}><Edit2 size={13} /> Edit Details</button>
          ) : (
            <>
              <button className={s.cancelBtn} onClick={handleCancel}><X size={13} /> Cancel</button>
              <button className={s.saveBtn} onClick={handleSave} disabled={saving}>
                <Save size={13} /> {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Hero */}
      <div className={s.hero}>
        <div className={s.heroInner}>
          <div className={s.heroTop}>
            <div>
              <div className={s.heroCode} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: '0.5rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', lineHeight: 1 }}>Farm ID</span>
                {premises.premisesCode}
              </div>
              {editMode
                ? <input className={s.heroNameInput} value={form.premisesName} onChange={setF('premisesName')} />
                : <h1 className={s.heroName}>{premises.premisesName}</h1>
              }
              <div className={s.heroMeta}>
                <span className={s.heroPill}><MapPin size={10} /> {premises.regionCode}</span>
                <span className={s.heroPill}>{premises.premisesType.replace(/_/g, ' ')}</span>
                {premises.allowedSpecies && premises.allowedSpecies.split(',').map(sp => (
                  <span key={sp} className={s.heroPill}>{sp.trim()}</span>
                ))}
              </div>
            </div>
            <span className={s.statusBadge} style={{ color: cfg.color, background: cfg.bg }}>
              <cfg.Icon size={12} /> {cfg.label}
            </span>
          </div>

          {/* Stat boxes */}
          <div className={s.heroStats}>
            <div className={s.heroStat}>
              <div className={s.heroStatNum}>{animalCount}</div>
              <div className={s.heroStatLbl}>Animals</div>
            </div>
            <div className={s.heroStatDivider} />
            <div className={s.heroStat}>
              <div className={s.heroStatNum}>{premises.areaHectares ?? '—'}</div>
              <div className={s.heroStatLbl}>Hectares</div>
            </div>
            <div className={s.heroStatDivider} />
            <div className={s.heroStat}>
              <div className={s.heroStatNum}>{premises.capacityAnimals ?? '—'}</div>
              <div className={s.heroStatLbl}>Capacity</div>
            </div>
            <div className={s.heroStatDivider} />
            <div className={s.heroStat}>
              <div className={s.heroStatNum}>{premises.allowedSpecies?.split(',').length ?? 0}</div>
              <div className={s.heroStatLbl}>Species</div>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className={s.body}>
        {error && <div className={s.errorBanner}>{error}</div>}

        {/* Location card */}
        <div className={`${s.card} ${s.cardBlue}`}>
          <div className={s.cardHeader}>
            <div className={s.cardIcon} style={{ background: '#eff6ff', color: '#1d4ed8' }}><MapPin size={16} /></div>
            <div className={s.cardTitle}>Location</div>
          </div>
          <div className={s.fieldGrid}>
            <div className={s.field}>
              <div className={s.fieldLabel}>Region</div>
              <div className={s.fieldValue}>{premises.regionCode}</div>
            </div>
            <div className={s.field}>
              <div className={s.fieldLabel}>GPS Latitude</div>
              <div className={s.fieldValueMono}>{premises.gpsLatitude?.toFixed(5)}</div>
            </div>
            <div className={s.field}>
              <div className={s.fieldLabel}>GPS Longitude</div>
              <div className={s.fieldValueMono}>{premises.gpsLongitude?.toFixed(5)}</div>
            </div>
            <div className={`${s.field} ${s.fieldFull}`}>
              <div className={s.fieldLabel}>Physical Address</div>
              {editMode
                ? <input className={s.inp} value={form.physicalAddress} onChange={setF('physicalAddress')} />
                : <div className={s.fieldValue}>{premises.physicalAddress || <span className={s.fieldEmpty}>Not provided</span>}</div>
              }
            </div>
          </div>
        </div>

        {/* Livestock card */}
        <div className={`${s.card} ${s.cardGreen}`}>
          <div className={s.cardHeader}>
            <div className={s.cardIcon} style={{ background: '#f0fdf4', color: '#16a34a' }}><Leaf size={16} /></div>
            <div className={s.cardTitle}>Livestock Details</div>
          </div>
          <div className={s.fieldGrid}>
            <div className={s.field}>
              <div className={s.fieldLabel}>Allowed Species</div>
              <div className={s.speciesTags}>
                {premises.allowedSpecies
                  ? premises.allowedSpecies.split(',').map(sp => (
                      <span key={sp} className={s.speciesTag}>{sp.trim()}</span>
                    ))
                  : <span className={s.fieldEmpty}>None specified</span>
                }
              </div>
            </div>
            <div className={s.field}>
              <div className={s.fieldLabel}>Area (Hectares)</div>
              {editMode
                ? <input className={s.inp} type="number" value={form.areaHectares} onChange={setF('areaHectares')} />
                : <div className={s.fieldValue}>{premises.areaHectares != null ? `${premises.areaHectares} ha` : <span className={s.fieldEmpty}>—</span>}</div>
              }
            </div>
            <div className={s.field}>
              <div className={s.fieldLabel}>Animal Capacity</div>
              {editMode
                ? <input className={s.inp} type="number" value={form.capacityAnimals} onChange={setF('capacityAnimals')} />
                : <div className={s.fieldValue}>{premises.capacityAnimals != null ? `${premises.capacityAnimals} animals` : <span className={s.fieldEmpty}>—</span>}</div>
              }
            </div>
          </div>
        </div>

        {/* License card */}
        <div className={`${s.card} ${s.cardPurple}`}>
          <div className={s.cardHeader}>
            <div className={s.cardIcon} style={{ background: '#f5f3ff', color: '#7c3aed' }}><Shield size={16} /></div>
            <div className={s.cardTitle}>Licensing</div>
          </div>
          <div className={s.fieldGrid}>
            <div className={s.field}>
              <div className={s.fieldLabel}>License Number</div>
              {editMode
                ? <input className={s.inp} value={form.licenseNumber} onChange={setF('licenseNumber')} />
                : <div className={s.fieldValueMono}>{premises.licenseNumber || <span className={s.fieldEmpty}>Not provided</span>}</div>
              }
            </div>
            <div className={s.field}>
              <div className={s.fieldLabel}>Expiry Date</div>
              {editMode
                ? <input className={s.inp} type="date" value={form.licenseExpiryDate} onChange={setF('licenseExpiryDate')} />
                : <div className={s.fieldValue}>{premises.licenseExpiryDate || <span className={s.fieldEmpty}>Not provided</span>}</div>
              }
            </div>
          </div>
        </div>

        {/* Notes card */}
        <div className={`${s.card} ${s.cardAmber}`}>
          <div className={s.cardHeader}>
            <div className={s.cardIcon} style={{ background: '#fffbeb', color: '#d97706' }}><FileText size={16} /></div>
            <div className={s.cardTitle}>Notes</div>
          </div>
          {editMode
            ? <textarea className={s.textarea} rows={4} value={form.notes} onChange={setF('notes')} placeholder="Add notes about this premises…" />
            : <div className={s.notesText}>{premises.notes || 'No notes added.'}</div>
          }
        </div>

        {/* Photos card */}
        <div className={s.card}>
          <div className={s.cardHeader}>
            <div className={s.cardIcon} style={{ background: '#f8fafc', color: '#475569' }}><ImageIcon size={16} /></div>
            <div className={s.cardTitle}>Photos &amp; Documents</div>
          </div>
          {photos.length === 0 ? (
            <div className={s.photosEmpty}>
              <ImageIcon size={40} color="#e2e8f0" />
              <p>No photos uploaded yet</p>
              <span>Photos added during registration will appear here</span>
            </div>
          ) : (
            <div className={s.photosGrid}>
              {photos.map(ph => (
                <div key={ph.id} className={s.photoThumb}>
                  <img src={ph.fileUrl} alt={ph.fileName} className={s.photoImg} />
                  <div className={s.photoName}>{ph.fileName}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PremisesInfoPage;
