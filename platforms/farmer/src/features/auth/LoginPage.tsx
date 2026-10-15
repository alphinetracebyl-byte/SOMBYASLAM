import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { loginFarmer } from './auth.supabase';
import s from './login.module.css';

const IS_DEV = import.meta.env.DEV;

const ANNOUNCEMENTS = [
  '📋 Registration Update: Online animal registration is now open for all regions — visit your district livestock office to get started.',
  '💉 Vaccination Campaign: FMD and CBPP vaccination drive underway in Bay, Bakool, and Hiraan — 01 Aug to 30 Sep 2026.',
  '📜 Movement Permits: Online permit applications are now live — submit your request at least 48 hours before planned movement.',
  '🏷️ Tagging Deadline: All cattle and camels must carry official QXLITS ear tags before 31 December 2026. Penalties apply.',
  '📣 New Service: Export health certificates can now be requested online — processing time 5–7 working days.',
  '📞 Helpdesk: For technical support or account issues, contact your district livestock office or call QXLITS Support.',
];

const FEATURES = [
  'Register cattle, camels, goats and sheep with official government tags.',
  'Submit animal photos for ministry verification and record activation.',
  'Apply for movement permits and veterinary health certificates online.',
  'View your complete herd, health history and export status records.',
];

const INFO = [
  { title: 'National livestock registry', body: 'Centralized records for owners, premises, animals and official identification tags.' },
  { title: 'Role-based access', body: 'Different access for farmers, vets, ministry teams, markets and export facilities.' },
  { title: 'Complete audit history', body: 'Important changes are recorded with the responsible user, date and time.' },
  { title: 'Secure cloud platform', body: 'Designed for Microsoft Azure deployment, monitoring, backups and resilience.' },
];


export function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const { setFarmerSession } = useAuthStore();

  const [username, setUsername]   = useState('');
  const [password, setPassword]   = useState('');
  const [showPwd,  setShowPwd]    = useState(false);
  const [remember, setRemember]   = useState(false);
  const [loading,  setLoading]    = useState(false);
  const [error,    setError]      = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const session = await loginFarmer(username, password);
      setFarmerSession(session);
      void navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
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
            <div className={s.brandSub}>Livestock Identification &amp; Traceability System</div>
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
          <a className={s.topLink} href="#">User Guides</a>
          <Link className={s.topLink} to="/terms" target="_blank" rel="noopener noreferrer">Privacy Policy</Link>
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
        <strong>QXLITS Farmer Portal</strong>
      </nav>

      {/* ── Announcement Ticker ── */}
      <div className={s.announcementBar} role="marquee" aria-live="off">
        <span className={s.announceLabel}>&#128226; Announcements</span>
        <div className={s.tickerWrap}>
          <span className={s.tickerTrack}>
            {ANNOUNCEMENTS.join(' ◆ ')}
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
            Secure access to your livestock records and government services
          </h1>
          <p className={s.lead}>
            Register animals, apply for movement permits and access veterinary services
            from the official platform for Somalia&apos;s livestock owners.
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
          <p className={s.loginIntro}>Farmer Portal — enter your account details to continue.</p>

          {error && (
            <div className={s.errorBox} role="alert">
              <span>&#9888;</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>


            <div className={s.field}>
              <label className={s.label} htmlFor="username">Email address or phone number</label>
              <input
                id="username"
                className={s.input}
                type="text"
                placeholder="Enter your email or phone number"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
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

            <div className={s.sep}>OR</div>

            <button
              type="button"
              className={s.secondBtn}
              onClick={() => void navigate('/register/select')}
            >
              Create a QXLITS account
            </button>
          </form>

          <div className={s.support}>
            Need help? Contact your{' '}
            <a className={s.supportLink} href="#">district livestock office</a>{' '}
            or <a className={s.supportLink} href="#">QXLITS Support</a>.
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
