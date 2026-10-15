import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { fetchFarmerByCode, type Farmer } from './farmers.supabase';
import s from './public-farmer.module.css';

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

const STATUS_LABEL: Record<string, string> = {
  APPROVED: 'Verified', PENDING: 'Pending', SUSPENDED: 'Suspended', REJECTED: 'Rejected',
};

export function PublicFarmerPage(): JSX.Element {
  const { code }  = useParams<{ code: string }>();
  const [farmer,  setFarmer]  = useState<Farmer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    fetchFarmerByCode(code)
      .then(f => { setFarmer(f); setLoading(false); })
      .catch(() => { setError('Farmer not found.'); setLoading(false); });
  }, [code]);

  const publicUrl = typeof window !== 'undefined' ? window.location.href : '';

  if (loading) return (
    <div className={s.root}>
      <div className={s.card}><div className={s.loadMsg}>Loading…</div></div>
    </div>
  );

  if (error || !farmer) return (
    <div className={s.root}>
      <div className={s.card}>
        <div className={s.errorMsg}>
          <div className={s.errorTitle}>Record Not Found</div>
          <p>No farmer found with this client ID.</p>
        </div>
      </div>
    </div>
  );

  const initials  = farmer.fullName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const isApproved = farmer.status === 'APPROVED';

  return (
    <div className={s.root}>
      <div className={s.card}>

        {/* Header */}
        <div className={s.header}>
          <div className={s.headerLogo}>QXLITS</div>
          <div className={s.headerSub}>Somalia Livestock Identification & Traceability System</div>
        </div>

        {/* Avatar */}
        <div className={s.avatarWrap}>
          {farmer.photoUrl
            ? <img src={farmer.photoUrl} alt="" className={s.avatar}/>
            : <div className={s.avatarFallback}>{initials}</div>
          }
          <span className={`${s.statusDot} ${s['dot_' + farmer.status]}`}/>
        </div>

        {/* Name + status */}
        <div className={s.name}>{farmer.fullName}</div>
        <span className={`${s.statusBadge} ${s['badge_' + farmer.status]}`}>
          {STATUS_LABEL[farmer.status] ?? farmer.status}
        </span>

        {/* Client ID — large and prominent */}
        <div className={s.clientIdWrap}>
          <div className={s.clientIdLabel}>Client ID</div>
          <div className={s.clientId}>{farmer.farmerCode}</div>
        </div>

        {/* Key details */}
        <div className={s.details}>
          <DetailRow label="Region"     value={farmer.region}/>
          {farmer.village && <DetailRow label="Village" value={farmer.village}/>}
          <DetailRow label="Registered" value={fmtDate(farmer.createdAt)}/>
          {isApproved && farmer.approvedAt && (
            <DetailRow label="Verified On" value={fmtDate(farmer.approvedAt)}/>
          )}
        </div>

        {/* QR code */}
        <div className={s.qrWrap}>
          <QRCodeSVG value={publicUrl} size={96} level="M" />
          <div className={s.qrLabel}>Scan to verify</div>
        </div>

        {/* Footer */}
        <div className={s.footer}>
          Ministry of Livestock, Forestry &amp; Range — Federal Government of Somalia
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={s.detailRow}>
      <span className={s.detailLabel}>{label}</span>
      <span className={s.detailValue}>{value}</span>
    </div>
  );
}

export default PublicFarmerPage;
