import { useNavigate, Link } from 'react-router-dom';
import s from './register-select.module.css';

const TYPES = [
  {
    icon: '🚢',
    title: 'Exporter / Trading Company',
    desc: 'For livestock export businesses and trading companies. Apply for export permits, health certificates and manage international livestock documentation.',
    path: '/register/exporter',
  },
  {
    icon: '🏢',
    title: 'Quarantine / Slaughter Facility',
    desc: 'For quarantine stations, slaughterhouses, export checkpoints and border posts. Register your facility for Ministry approval and portal access.',
    path: '/register/facility',
  },
];

export function RegisterSelectPage(): JSX.Element {
  const navigate = useNavigate();

  return (
    <div className={s.page}>

      <header className={s.topbar}>
        <div className={s.brand}>
          <div className={s.brandMark}>S</div>
          <div>
            <div className={s.brandName}>QXLITS</div>
            <div className={s.brandSub}>Livestock Identification &amp; Traceability System</div>
          </div>
        </div>
        <div className={s.topRight}>
          <a className={s.topLink} href="#">About QXLITS</a>
          <a className={s.topLink} href="#">Contact Ministry</a>
          <a className={s.helpLink} href="#">Help &amp; Support</a>
        </div>
      </header>

      <nav className={s.breadcrumb} aria-label="breadcrumb">
        <span>&#8962;</span>
        <span className={s.breadSep}>›</span>
        <span>Government Services</span>
        <span className={s.breadSep}>›</span>
        <Link to="/login" style={{ color: 'inherit', textDecoration: 'none' }}>Export &amp; Facilities Portal</Link>
        <span className={s.breadSep}>›</span>
        <strong>Create Account</strong>
      </nav>

      <div className={s.body}>
        <div className={s.inner}>

          <div className={s.eyebrow}>&#127981; Ministry of Livestock, Forestry and Range</div>

          <h1 className={s.heading}>Create a QXLITS Account</h1>
          <p className={s.sub}>
            Select your account type to begin your registration application.
            All accounts are subject to Ministry review and approval before access is granted.
          </p>

          <div className={s.notice}>
            <span className={s.noticeIcon}>ℹ️</span>
            <p className={s.noticeText}>
              <strong>Documents required before you start.</strong>{' '}
              Have your business registration certificate, facility licence, and contact details ready.
              Applications without valid documentation will not be approved.
            </p>
          </div>

          <div className={s.cards}>
            {TYPES.map(t => (
              <button
                key={t.path}
                className={s.card}
                onClick={() => void navigate(t.path)}
                type="button"
              >
                <div className={s.cardIcon}>{t.icon}</div>
                <h2 className={s.cardTitle}>{t.title}</h2>
                <p className={s.cardDesc}>{t.desc}</p>
                <span className={s.cardCta}>Start registration →</span>
              </button>
            ))}
          </div>

          <p className={s.signin}>
            Already have an account?{' '}
            <Link to="/login" className={s.signinLink}>Sign in here</Link>
          </p>

        </div>
      </div>

    </div>
  );
}

export default RegisterSelectPage;
