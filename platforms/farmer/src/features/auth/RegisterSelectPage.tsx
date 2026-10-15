import { useNavigate, Link } from 'react-router-dom';
import s from './register-select.module.css';

const ACCOUNT_TYPES = [
  {
    icon: '🌾',
    title: 'Farmer / Livestock Owner',
    desc: 'For individual livestock owners, pastoralists and smallholder farmers. Also for registered companies, cooperatives and organisations owning livestock.',
    desc2: 'Register animals, apply for movement permits and veterinary services.',
    badge: null as string | null,
    path: '/register',
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
        <Link to="/login" style={{ color: 'inherit', textDecoration: 'none' }}>QXLITS Portal</Link>
        <span className={s.breadSep}>›</span>
        <strong>Create Account</strong>
      </nav>

      <div className={s.body}>
        <div className={s.inner}>

          <div className={s.eyebrow}>
            &#127981; Ministry of Livestock, Forestry and Range
          </div>

          <h1 className={s.heading}>Create a QXLITS Account</h1>
          <p className={s.sub}>
            Select the account type that matches your role in Somalia&apos;s livestock sector.
            All accounts require Ministry review before activation.
          </p>

          {/* Who this registration is for */}
          <div style={{
            background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 12,
            padding: '1rem 1.25rem', margin: '1.25rem 0', textAlign: 'left',
          }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#92400e', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              ⚠️ This portal is for premises owners only
            </div>
            <p style={{ fontSize: '0.8125rem', color: '#78350f', margin: '0 0 0.625rem', lineHeight: 1.55 }}>
              Register here only if you own or manage one of the following premises types:
            </p>
            <ul style={{ margin: '0 0 0.75rem', paddingLeft: '1.25rem', fontSize: '0.8125rem', color: '#78350f', lineHeight: 1.8 }}>
              <li><strong>Farm</strong> — Permanent farming land</li>
              <li><strong>Pastoral Camp</strong> — Temporary pastoral site</li>
              <li><strong>Grazing Area</strong> — Open communal grazing</li>
              <li><strong>Watering Point</strong> — Water source location</li>
              <li><strong>Livestock Market</strong> — Animal trading market</li>
            </ul>
            <p style={{ fontSize: '0.8125rem', color: '#78350f', margin: 0, lineHeight: 1.55 }}>
              If you own or operate a <strong>Quarantine Station</strong> or <strong>Slaughterhouse</strong>, please register through the{' '}
              <a href="#" style={{ color: '#b45309', fontWeight: 700, textDecoration: 'underline' }}>
                QXLITS Facility Portal →
              </a>
            </p>
          </div>

          {/* What you'll need */}
          <div className={s.needsBlock}>
            <div className={s.needsTitle}>📋 What you&apos;ll need before you start</div>
            <div className={s.needsGrid}>
              {[
                { icon: '🪪', label: 'National ID or Passport',            note: 'Required for all applicants'       },
                { icon: '🪪', label: 'National ID or Passport of Representative', note: 'Required for all applicants'  },
                { icon: '📱', label: 'Active phone number',               note: 'For OTP verification'               },
                { icon: '✉️', label: 'Email address',                     note: 'Used as your sign-in username'      },
                { icon: '📷', label: 'Recent clear photo',                note: 'Profile photo or company logo'      },
                { icon: '📄', label: 'Business licence',                   note: 'Companies & organisations only'     },
              ].map(item => (
                <div key={item.label} className={s.needsItem}>
                  <span className={s.needsIcon}>{item.icon}</span>
                  <div>
                    <div className={s.needsLabel}>{item.label}</div>
                    <div className={s.needsNote}>{item.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={s.cards}>
            {ACCOUNT_TYPES.map(t => (
              <button
                key={t.path}
                className={s.card}
                onClick={() => void navigate(t.path)}
                type="button"
              >
                <div className={s.cardIcon}>{t.icon}</div>
                {t.badge && <span className={s.badge}>{t.badge}</span>}
                <h2 className={s.cardTitle}>{t.title}</h2>
                <p className={s.cardDesc}>{t.desc}</p>
                <p className={s.cardDesc} style={{ marginTop: '0.5rem' }}>{t.desc2}</p>
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
