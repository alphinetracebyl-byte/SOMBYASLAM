import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Tag, MapPin, User, Calendar, Camera,
  AlertCircle, Loader, ImageIcon,
} from 'lucide-react';
import { fetchAnimal, fetchAnimalPhotos } from './animals.api';
import type { AnimalSummary, PhotoRecord } from './animals.types';
import { StatusBadge } from './components/StatusBadge';
import s from './animal-detail.module.css';

const SPECIES_LABEL: Record<string, string> = {
  CATTLE: 'Cattle', CAMEL: 'Camel', GOAT: 'Goat', SHEEP: 'Sheep',
};

export function AnimalDetailPage(): JSX.Element {
  const { animalId } = useParams<{ animalId: string }>();
  const navigate = useNavigate();

  const [animal, setAnimal] = useState<AnimalSummary | null>(null);
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePhoto, setActivePhoto] = useState<PhotoRecord | null>(null);

  useEffect(() => {
    if (!animalId) return;
    setLoading(true);
    Promise.all([fetchAnimal(animalId), fetchAnimalPhotos(animalId)])
      .then(([a, p]) => {
        setAnimal(a);
        setPhotos(p.filter(ph => ph.status === 'ACTIVE'));
        setActivePhoto(p.find(ph => ph.photoType === 'PRIMARY' && ph.status === 'ACTIVE') ?? p[0] ?? null);
      })
      .catch(() => setError('Failed to load animal. Please try again.'))
      .finally(() => setLoading(false));
  }, [animalId]);

  if (loading) {
    return (
      <div className={s.center}>
        <Loader size={32} strokeWidth={1.5} color="#9ca3af" className={s.spin} />
        <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Loading animal profile…</span>
      </div>
    );
  }

  if (error || !animal) {
    return (
      <div className={s.center}>
        <AlertCircle size={40} strokeWidth={1.5} color="#ef4444" />
        <span style={{ color: '#374151', fontSize: '0.9rem' }}>{error ?? 'Animal not found'}</span>
        <button className={s.backBtn} onClick={() => void navigate('/animals')}>
          <ArrowLeft size={15} strokeWidth={2} /> Back to Animals
        </button>
      </div>
    );
  }

  return (
    <div className={s.page}>

      {/* Back + header */}
      <div className={s.topBar}>
        <button className={s.backBtn} onClick={() => void navigate('/animals')}>
          <ArrowLeft size={15} strokeWidth={2} /> My Animals
        </button>
      </div>

      <div className={s.layout}>

        {/* Left: Photo panel */}
        <div className={s.photoPanel}>
          <div className={s.primaryPhoto}>
            {activePhoto ? (
              <img src={activePhoto.blobUrl} alt="Animal" className={s.photoImg} />
            ) : (
              <div className={s.noPhoto}>
                <ImageIcon size={48} strokeWidth={1} color="#d1d5db" />
                <span>No photo available</span>
              </div>
            )}
          </div>

          {photos.length > 1 && (
            <div className={s.thumbRow}>
              {photos.map(p => (
                <button
                  key={p.id}
                  className={`${s.thumb}${activePhoto?.id === p.id ? ' ' + s.thumbActive : ''}`}
                  onClick={() => setActivePhoto(p)}
                >
                  <img src={p.blobUrl} alt="" className={s.thumbImg} />
                </button>
              ))}
            </div>
          )}

          <div className={s.photoMeta}>
            <Camera size={13} strokeWidth={1.75} color="#9ca3af" />
            <span>{photos.length} photo{photos.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Right: Details */}
        <div className={s.details}>

          {/* Identity card */}
          <div className={s.card}>
            <div className={s.cardHeader}>
              <div className={s.animalCode}>{animal.animalCode}</div>
              <StatusBadge status={animal.status} />
            </div>
            <div className={s.animalTitle}>
              {SPECIES_LABEL[animal.species] ?? animal.species} — {animal.breed.replace(/_/g, ' ')}
            </div>

            <div className={s.attrs}>
              <Attr icon={<Tag size={14} strokeWidth={1.75} />} label="Active Tag" value={animal.activeTagSerial ?? 'No tag assigned'} mono />
              <Attr icon={<User size={14} strokeWidth={1.75} />} label="Owner ID" value={animal.currentOwnerId} mono />
              <Attr icon={<MapPin size={14} strokeWidth={1.75} />} label="Farm" value={animal.currentPremisesId} mono />
              <Attr icon={<Calendar size={14} strokeWidth={1.75} />} label="Date of Birth" value={animal.dob ? new Date(animal.dob).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : `Unknown (${animal.dobPrecision})`} />
              <Attr icon={<Calendar size={14} strokeWidth={1.75} />} label="Registered" value={new Date(animal.registeredAt).toLocaleDateString()} />
            </div>
          </div>

          {/* Physical characteristics */}
          <div className={s.card}>
            <div className={s.sectionTitle}>Physical Characteristics</div>
            <div className={s.propGrid}>
              <PropRow label="Sex" value={animal.sex === 'MALE' ? '♂ Male' : animal.sex === 'FEMALE' ? '♀ Female' : 'Unknown'} />
              <PropRow label="Species" value={SPECIES_LABEL[animal.species] ?? animal.species} />
              <PropRow label="Breed" value={animal.breed.replace(/_/g, ' ')} />
              <PropRow label="Coat Color" value={animal.coatColor ?? '—'} />
              <PropRow label="Distinguishing Marks" value={animal.distinguishingMarks ?? '—'} />
              <PropRow label="Source" value={animal.sourceType} />
            </div>
          </div>

          {/* Status history placeholder */}
          {animal.terminatedAt && (
            <div className={s.card} style={{ background: '#fef2f2', border: '1.5px solid #fecaca' }}>
              <div className={s.sectionTitle} style={{ color: '#dc2626' }}>Animal Terminated</div>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                Status changed to <strong>{animal.status}</strong> on {new Date(animal.terminatedAt).toLocaleDateString()}.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Attr({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }): JSX.Element {
  return (
    <div className={s.attr}>
      <span className={s.attrIcon}>{icon}</span>
      <div className={s.attrBody}>
        <span className={s.attrLabel}>{label}</span>
        <span className={`${s.attrValue}${mono ? ' ' + s.mono : ''}`}>{value}</span>
      </div>
    </div>
  );
}

function PropRow({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className={s.propRow}>
      <span className={s.propLabel}>{label}</span>
      <span className={s.propValue}>{value}</span>
    </div>
  );
}

export default AnimalDetailPage;
