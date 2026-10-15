import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase';
import s from './login.module.css';

const IS_DEV = import.meta.env.DEV;

const ANNOUNCEMENTS = [
  '📋 Registration Update: Online animal registration is now open for all regions — verify and activate farmer accounts at your checkpoint.',
  '💉 Vaccination Campaign: FMD and CBPP vaccination drive underway in Bay, Bakool, and Hiraan — 01 Aug to 30 Sep 2026.',
  '📜 Movement Permits: Verify movement permits digitally at every checkpoint — paper permits are no longer accepted after 01 Sep 2026.',
  '🏷️ Tag Verification: All cattle and camels must carry official QXLITS ear tags — report untagged animals immediately.',
  '📡 Offline Mode: The QXLITS field app supports full offline operation — records sync automatically when connectivity is restored.',
  '📞 Field Support: Contact the QXLITS field helpdesk for device or connectivity issues at your checkpoint.',
];

const FEATURES = [
  'Scan and verify official ear tags and movement permits at checkpoints.',
  'Record checkpoint passes, anomalies and exceptions in real time.',
  'Confirm departures and arrivals with full offline support.',
  'Sync field records automatically when connectivity is restored.',
];

const INFO = [
  { title: 'Offline-first design', body: 'Record checkpoints and confirm movements without an internet connection.' },
  { title: 'Movement verification', body: 'Instantly verify movement permits and animal tag data at the field.' },
  { title: 'Real-time sync', body: 'Field records sync automatically to the national system when connectivity returns.' },
  { title: 'Full audit trail', body: 'Every checkpoint record is timestamped, signed and stored for ministry review.' },
];



const FIELD_ROLES = [
  'FIELD_INSPECTOR',
  'VETERINARY_OFFICER',
  'SLAUGHTERHOUSE_OFFICER',
  'QUARANTINE_OFFICER',
  'SOCIAL_WORKER',
  'CHECKPOINT_OFFICER',
] as const;

export function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const { setSession, isAuthenticated } = useAuthStore();

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const [username, setUsername]   = useState('');
  const [password, setPassword]   = useState('');
  const [showPwd,  setShowPwd]    = useState(false);
  const [remember, setRemember]   = useState(false);
  const [loading,  setLoading]    = useState(false);
  const [error,    setError]      = useState<string | null>(null);
  const [devRole,  setDevRole]    = useState<typeof FIELD_ROLES[number]>('FIELD_INSPECTOR');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: username.trim(),
        password,
      });
      if (authError || !authData.session) {
        setError(authError?.message ?? 'Login failed. Check your email and password.');
        setLoading(false);
        return;
      }

      const { session, user } = authData;

      // Look up registration record for role and territory
      const { data: reg } = await supabase
        .from('user_registrations')
        .select('role, territory_type, region_code')
        .eq('email', user.email)
        .maybeSingle();

      setSession({
        accessToken:   session.access_token,
        refreshToken:  session.refresh_token,
        userId:        user.id,
        roles:         reg?.role ? [reg.role] : ['FIELD_INSPECTOR'],
        territoryType: reg?.territory_type ?? 'REGIONAL',
        regionCode:    reg?.region_code ?? null,
        districtCode:  null,
      });
      void navigate('/dashboard');
    } catch {
      setError('Could not connect. Check your internet connection and try again.');
      setLoading(false);
    }
  };

  return (
    <div className={s.page}>

      {/* ── Topbar ── */}
      <header className={s.topbar}>
        <div className={s.brand}>
          <div className={s.brandMark}>S</div>
          <div>
            <div className={s.brandName}>QXLITS</div>
            <div className={s.brandSub}>Somalia Livestock Identification &amp; Traceability System</div>
          </div>
        </div>
        <div className={s.topCenter}>
          <div className={s.searchWrap}>
            <span className={s.searchIcon}>&#128269;</span>
            <input className={s.searchInput} type="search" placeholder="Search QXLITS…" aria-label="Search" />
          </div>
        </div>
        <div className={s.topRight}>
          <a className={s.topLink} href="#">About QXLITS</a>
          <a className={s.topLink} href="#">Field Guides</a>
          <a className={s.topLink} href="#">Contact Ministry</a>
          <select className={s.langSelect} aria-label="Language">
            <option>English</option>
            <option>Somali</option>
            <option>Arabic</option>
          </select>
          <a className={s.helpLink} href="#">Help &amp; Support</a>
        </div>
      </header>

      {/* ── Breadcrumb ── */}
      <nav className={s.breadcrumb} aria-label="breadcrumb">
        <span>&#8962;</span>
        <span className={s.breadSep}>›</span>
        <span>Government Services</span>
        <span className={s.breadSep}>›</span>
        <strong>QXLITS Field Officer Portal</strong>
      </nav>

      {/* ── Announcement Ticker ── */}
      <div className={s.announcementBar} role="marquee" aria-live="off">
        <span className={s.announceLabel}>&#128226; Announcements</span>
        <div className={s.tickerWrap}>
          <span className={s.tickerTrack}>
            {ANNOUNCEMENTS.join(' ◆ ')}
          </span>
        </div>
      </div>

      {/* ── Hero ── */}
      <section className={s.hero}>

        <div className={s.heroCopy}>
          <div className={s.govLabel}>
            <span className={s.govIcon}>&#127981;</span>
            Ministry of Livestock, Forestry and Range
          </div>
          <h1 className={s.heroTitle}>
            Field officer access to Somalia&apos;s livestock movement tracking system
          </h1>
          <p className={s.lead}>
            Record animal checkpoints, verify movement permits, confirm arrivals and
            report exceptions from the field — with full offline support for remote areas.
          </p>
          <div className={s.featureGrid}>
            {FEATURES.map((f, i) => (
              <div key={i} className={s.feature}>
                <span className={s.featureIcon}>{i + 1}</span>
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Login panel ── */}
        <div className={s.loginPanel}>
          <h2>Sign in to QXLITS</h2>
          <p className={s.loginIntro}>Field Portal — enter your officer credentials to continue.</p>

          {error && (
            <div className={s.errorBox} role="alert">
              <span>&#9888;</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>

            <div className={s.field}>
              <label className={s.label} htmlFor="username">Email address</label>
              <input
                id="username"
                className={s.input}
                type="email"
                placeholder="Enter your email address"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className={s.field}>
              <label className={s.label} htmlFor="password">Password</label>
              <div className={s.pwWrap}>
                <input
                  id="password"
                  className={s.input}
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button type="button" className={s.showBtn} onClick={() => setShowPwd(v => !v)}>
                  {showPwd ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className={s.rowMeta}>
              <label className={s.remember}>
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                Keep me signed in
              </label>
              <a className={s.forgotLink} href="/forgot-password">Forgot password?</a>
            </div>

            <button className={s.submitBtn} type="submit" disabled={loading}>
              {loading ? 'Connecting…' : 'Sign in securely'}
            </button>


            <p className={s.loginIntro} style={{ marginTop: 14, fontSize: 13, color: '#66758a', textAlign: 'center' }}>
              Field officer accounts are created by the Ministry. Contact your district livestock office if you need access.
            </p>
          </form>

          <div className={s.support}>
            Need help? Contact your{' '}
            <a className={s.supportLink} href="#">district livestock office</a>.
          </div>
        </div>

        <div className={s.graphic} aria-hidden="true" />
      </section>

      <div className={s.infoStrip}>
        {INFO.map((item, i) => (
          <div key={i} className={s.infoItem}>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </div>
        ))}
      </div>

    </div>
  );
}

export default LoginPage;
