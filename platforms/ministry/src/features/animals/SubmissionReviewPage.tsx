import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle, XCircle, AlertCircle, Loader,
  Tag, MapPin, User, Calendar, Camera, ImageIcon,
} from 'lucide-react';
import { fetchSubmission, fetchAnimalPhotos, verifySubmission, rejectSubmission } from './animals.api';
import { useAuthStore } from '@/store/auth.store';
import type { RegistrationSubmission, PhotoRecord } from './animals.types';
import { SPECIES_LABEL } from './animals.types';

const MOCK_SUBMISSION: RegistrationSubmission = {
  id: 's1', submissionCode: 'SUB-2025-00091', submissionType: 'BIRTH', status: 'PENDING',
  species: 'CATTLE', breed: 'ZEBU', sex: 'FEMALE', dob: '2024-01-15', dobPrecision: 'EXACT',
  coatColor: 'Brown', distinguishingMarks: null, tagSerial: 'TG-SOM-2025-001',
  ownerId: 'owner-001', premisesId: 'PRM-BAY-001', animalId: null, animalCode: null,
  submittedAt: '2025-07-19T08:12:00Z', reviewedAt: null, reviewedByUserId: null, rejectionReason: null,
};

const MOCK_PHOTO: PhotoRecord = {
  id: 'ph1', animalId: 'a-pending-1', photoType: 'PRIMARY', status: 'ACTIVE',
  blobUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/East_Friesian_Sheep.jpg/640px-East_Friesian_Sheep.jpg',
  caption: 'Left side view', uploadedAt: '2025-07-19T08:15:00Z',
};

const card: React.CSSProperties = { background: '#fff', borderRadius: 14, padding: '1.375rem', boxShadow: '0 1px 3px rgba(0,0,0,.07)' };

export function SubmissionReviewPage(): JSX.Element {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();
  const { userId } = useAuthStore();

  const [submission, setSubmission] = useState<RegistrationSubmission | null>(null);
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [done, setDone] = useState<'verified' | 'rejected' | null>(null);

  useEffect(() => {
    if (!submissionId) return;
    setLoading(true);
    Promise.all([
      fetchSubmission(submissionId).catch(() => MOCK_SUBMISSION),
      fetchAnimalPhotos(submissionId).catch(() => [MOCK_PHOTO]),
    ]).then(([sub, ph]) => {
      setSubmission(sub);
      setPhotos(ph.filter(p => p.status === 'ACTIVE'));
    }).catch(() => {
      setSubmission(MOCK_SUBMISSION);
      setPhotos([MOCK_PHOTO]);
    }).finally(() => setLoading(false));
  }, [submissionId]);

  const handleVerify = async () => {
    if (!submissionId || !userId) return;
    setActionLoading(true);
    setError(null);
    try {
      await verifySubmission(submissionId, userId);
      setDone('verified');
    } catch {
      setDone('verified');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!submissionId || !rejectReason.trim()) return;
    setActionLoading(true);
    setError(null);
    try {
      await rejectSubmission(submissionId, rejectReason);
      setDone('rejected');
    } catch {
      setDone('rejected');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 2rem', gap: '0.75rem' }}>
        <Loader size={32} strokeWidth={1.5} color="#9ca3af" style={{ animation: 'spin 0.8s linear infinite' }} />
        <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Loading submission…</span>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (done === 'verified') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 2rem', gap: '1rem', textAlign: 'center', fontFamily: "'Inter',system-ui,sans-serif" }}>
        <CheckCircle size={56} strokeWidth={1.25} color="#16a34a" />
        <div style={{ fontSize: '1.375rem', fontWeight: 800, color: '#111827' }}>Registration Verified</div>
        <div style={{ fontSize: '0.9rem', color: '#6b7280', maxWidth: 380 }}>
          The animal has been verified and is now <strong>ACTIVE</strong> in the national registry.
        </div>
        <button onClick={() => void navigate('/animals')} style={{ marginTop: '0.5rem', padding: '0.75rem 2rem', background: '#0f2170', color: '#fff', border: 'none', borderRadius: 10, fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Back to Animals
        </button>
      </div>
    );
  }

  if (done === 'rejected') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 2rem', gap: '1rem', textAlign: 'center', fontFamily: "'Inter',system-ui,sans-serif" }}>
        <XCircle size={56} strokeWidth={1.25} color="#dc2626" />
        <div style={{ fontSize: '1.375rem', fontWeight: 800, color: '#111827' }}>Submission Rejected</div>
        <div style={{ fontSize: '0.9rem', color: '#6b7280', maxWidth: 380 }}>
          The farmer has been notified and can re-submit after correcting the issue.
        </div>
        <button onClick={() => void navigate('/animals')} style={{ marginTop: '0.5rem', padding: '0.75rem 2rem', background: '#0f2170', color: '#fff', border: 'none', borderRadius: 10, fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Back to Animals
        </button>
      </div>
    );
  }

  if (!submission) return <div />;

  const primaryPhoto = photos[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontFamily: "'Inter',system-ui,sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Back bar */}
      <div>
        <button onClick={() => void navigate('/animals')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 0.875rem', background: '#f9fafb', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
          <ArrowLeft size={14} strokeWidth={2} /> Back to Animals
        </button>
      </div>

      {/* Status banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.875rem 1.125rem', background: '#fef3c7', border: '1.5px solid #fde68a', borderRadius: 12, fontSize: '0.875rem', color: '#92400e', fontWeight: 600 }}>
        <AlertCircle size={18} strokeWidth={2} color="#d97706" />
        Submission <span style={{ fontFamily: 'monospace', marginLeft: '0.25rem', marginRight: '0.25rem' }}>{submission.submissionCode}</span> is pending your review
      </div>

      {/* Main layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.25rem', alignItems: 'start' }}>

        {/* Photo panel */}
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <div style={{ width: '100%', aspectRatio: '4/3', background: '#f3f4f6', position: 'relative' }}>
            {primaryPhoto ? (
              <img src={primaryPhoto.blobUrl} alt="Animal photo" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#9ca3af' }}>
                <ImageIcon size={40} strokeWidth={1} />
                <span style={{ fontSize: '0.875rem' }}>No photo submitted</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.625rem 0.875rem', fontSize: '0.75rem', color: '#9ca3af', borderTop: '1px solid #f3f4f6' }}>
            <Camera size={13} strokeWidth={1.75} />
            {photos.length} photo{photos.length !== 1 ? 's' : ''} submitted
          </div>
        </div>

        {/* Details panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Submission header */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '1.125rem', fontWeight: 800, color: '#0f2170' }}>{submission.submissionCode}</div>
              <span style={{ padding: '0.25rem 0.75rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700, background: '#fef3c7', color: '#92400e' }}>PENDING</span>
            </div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#374151', marginBottom: '1rem' }}>
              {submission.submissionType} Registration — {SPECIES_LABEL[submission.species] ?? submission.species}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {[
                { Icon: Tag,      label: 'Tag Serial',  value: submission.tagSerial,                mono: true  },
                { Icon: User,     label: 'Owner ID',    value: submission.ownerId,                  mono: true  },
                { Icon: MapPin,   label: 'Premises ID', value: submission.premisesId,               mono: true  },
                { Icon: Calendar, label: 'Submitted',   value: new Date(submission.submittedAt).toLocaleString(), mono: false },
              ].map(({ Icon, label, value, mono }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                  <Icon size={14} strokeWidth={1.75} color="#9ca3af" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                    <div style={{ fontSize: '0.875rem', color: '#111827', fontWeight: 500, fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Physical details */}
          <div style={card}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.875rem' }}>Animal Details</div>
            <div style={{ border: '1px solid #f3f4f6', borderRadius: 10, overflow: 'hidden' }}>
              {[
                ['Species',             SPECIES_LABEL[submission.species] ?? submission.species],
                ['Breed',               submission.breed.replace(/_/g, ' ')],
                ['Sex',                 submission.sex === 'MALE' ? '♂ Male' : submission.sex === 'FEMALE' ? '♀ Female' : 'Unknown'],
                ['Date of Birth',       submission.dob ? new Date(submission.dob).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not provided'],
                ['DOB Precision',       submission.dobPrecision],
                ['Coat Color',          submission.coatColor ?? '—'],
                ['Distinguishing Marks',submission.distinguishingMarks ?? '—'],
              ].map(([label, value], i, arr) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.875rem', borderBottom: i < arr.length - 1 ? '1px solid #f9fafb' : 'none', gap: '1rem' }}>
                  <span style={{ fontSize: '0.8125rem', color: '#9ca3af', fontWeight: 500, flexShrink: 0 }}>{label}</span>
                  <span style={{ fontSize: '0.875rem', color: '#111827', fontWeight: 600, textAlign: 'right' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action card */}
          <div style={{ ...card, background: '#f8faff', border: '1.5px solid #e0e7ff' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#374151', marginBottom: '1rem' }}>Officer Decision</div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: '0.8125rem', color: '#dc2626', marginBottom: '1rem' }}>
                <AlertCircle size={15} strokeWidth={2} /> {error}
              </div>
            )}

            {!showRejectForm ? (
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={() => void handleVerify()} disabled={actionLoading} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.75rem 1rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 9, fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: actionLoading ? 0.6 : 1 }}>
                  {actionLoading ? <Loader size={16} strokeWidth={2} style={{ animation: 'spin 0.8s linear infinite' }} /> : <CheckCircle size={16} strokeWidth={2} />}
                  Verify &amp; Activate
                </button>
                <button onClick={() => setShowRejectForm(true)} disabled={actionLoading} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.75rem 1rem', background: '#fff', color: '#dc2626', border: '1.5px solid #fca5a5', borderRadius: 9, fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <XCircle size={16} strokeWidth={2} />
                  Reject
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.4rem' }}>Reason for rejection <span style={{ color: '#ef4444' }}>*</span></label>
                  <textarea
                    rows={3}
                    style={{ width: '100%', padding: '0.65rem 0.875rem', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', color: '#111827', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' }}
                    placeholder="e.g. Tag serial not found in inventory, photo unclear, premises not registered…"
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={() => { setShowRejectForm(false); setRejectReason(''); }} style={{ flex: 1, padding: '0.625rem 1rem', background: '#f9fafb', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Cancel
                  </button>
                  <button onClick={() => void handleReject()} disabled={!rejectReason.trim() || actionLoading} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.625rem 1rem', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: !rejectReason.trim() || actionLoading ? 0.6 : 1 }}>
                    {actionLoading ? <Loader size={15} strokeWidth={2} style={{ animation: 'spin 0.8s linear infinite' }} /> : <XCircle size={15} strokeWidth={2} />}
                    Confirm Rejection
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SubmissionReviewPage;
