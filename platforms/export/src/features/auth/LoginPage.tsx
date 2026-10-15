import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase';
import s from './login.module.css';

const ANNOUNCEMENTS = [
  '📋 Facility Registration: Quarantine stations, slaughterhouses and checkpoints must be registered by the Ministry before staff can log in.',
  '💉 Vaccination Records: All quarantine stations must upload vaccination verification records for animals before release.',
  '📜 Halal Certification: Slaughterhouses are required to submit monthly halal compliance reports to the Ministry.',
  '🏷️ Movement Clearance: Border checkpoints must verify QXLITS movement permits before allowing livestock to cross.',
  '📣 Export Health Certificates: New digital export certificate process is active — average processing time 5-7 working days.',
  '🔒 Account Access: Your account is set up by the Ministry. Contact your Ministry administrator if you cannot log in.',
];

const FEATURES = [
  'Record daily inspections, animal arrivals and health assessments at your facility.',
  'Issue quarantine release certificates and slaughter records with digital signatures.',
  'Verify movement permits and livestock clearances at border checkpoints.',
  'View real-time reports on facility activity, capacity and compliance status.',
];

const INFO = [
  { title: 'Quarantine Stations',  body: 'Manage animal health inspections, lab tests and quarantine release certificates.' },
  { title: 'Slaughterhouses',      body: 'Record daily slaughter, halal certification and meat hygiene inspection results.' },
  { title: 'Border Checkpoints',   body: 'Verify movement permits, inspect animals and issue border crossing clearances.' },
  { title: 'Ministry Registered',  body: 'Your facility and account must be registered by the Ministry before login.' },
];

export function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const { setSession, isAuthenticated } = useAuthStore();

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError || !authData.session) {
        setError(authError?.message ?? 'Invalid email or password.');
        setLoading(false);
        return;
      }

      const { session, user } = authData;

      const { data: staff } = await supabase
        .from('facility_staff')
        .select('id, staff_name, staff_role, facility_id, facility_code, status')
        .eq('email', user.email ?? '')
        .eq('status', 'ACTIVE')
        .maybeSingle();

      if (!staff) {
        await supabase.auth.signOut();
        setError('Your account is not registered in QXLITS. Contact the Ministry of Livestock to have your facility and account set up.');
        setLoading(false);
        return;
      }

      const { data: facility } = await supabase
        .from('facilities')
        .select('id, facility_name, facility_type, status')
        .eq('id', staff.facility_id)
        .maybeSingle();

      if (!facility || facility.status !== 'ACTIVE') {
        await supabase.auth.signOut();
        setError('Your facility is not active. Contact the Ministry of Livestock.');
        setLoading(false);
        return;
      }

      setSession({
        accessToken:  session.access_token,
        refreshToken: session.refresh_token,
        userId:       user.id,
        staffId:      staff.id as string,
        staffName:    staff.staff_name as string,
        staffRole:    staff.staff_role as string,
        facilityId:   facility.id as string,
        facilityCode: staff.facility_code as string,
        facilityName: facility.facility_name as string,
        facilityType: facility.facility_type as string,
      });
      void navigate('/dashboard');
    } catch {
      setError('Could not connect. Check your internet connection and try again.');
      setLoading(false);
    }
  };

  return (
    <div className={s.page}>

      {/* Topbar */}
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
          <a className={s.topLink} href="#">Contact Ministry</a>
          <select className={s.langSelect} aria-label="Language">
            <option>English</option>
            <option>Somali</option>
            <option>Arabic</option>
          </select>
          <a className={s.helpLink} href="#">Help &amp; Support</a>
        </div>
      </header>

      {/* Breadcrumb */}
      <nav className={s.breadcrumb} aria-label="breadcrumb">
        <span>&#8962;</span>
        <span className={s.breadSep}>&#8250;</span>
        <span>Government Services</span>
        <span className={s.breadSep}>&#8250;</span>
        <strong>QXLITS Export &amp; Facilities Portal</strong>
      </nav>

      {/* Announcement ticker */}
      <div className={s.announcementBar} role="marquee" aria-live="off">
        <span className={s.announceLabel}>&#128226; Announcements</span>
        <div className={s.tickerWrap}>
          <span className={s.tickerTrack}>
            {ANNOUNCEMENTS.join(' ◆ ')}
          </span>
        </div>
      </div>

      {/* Hero */}
      <section className={s.hero}>

        <div className={s.heroCopy}>
          <div className={s.govLabel}>
            <span className={s.govIcon}>&#127981;</span>
            Ministry of Livestock, Forestry and Range
          </div>
          <h1 className={s.heroTitle}>
            Secure access to the export and facilities management platform
          </h1>
          <p className={s.lead}>
            For staff at quarantine stations, slaughterhouses and border checkpoints —
            record inspections, issue certificates and manage livestock clearances
            from the official government system.
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

        {/* Login panel */}
        <div className={s.loginPanel}>
          <h2>Sign in to QXLITS</h2>
          <p className={s.loginIntro}>Export &amp; Facilities Portal — use your Ministry-registered email.</p>

          <div className={s.ministryNote}>
            <span className={s.ministryNoteIcon}>&#8505;</span>
            <span>
              Your facility and account must be <strong>registered by the Ministry</strong> before
              you can sign in. Contact your Ministry administrator if you need access.
            </span>
          </div>

          {error && (
            <div className={s.errorBox} role="alert">
              <span>&#9888;</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>

            <div className={s.field}>
              <label className={s.label} htmlFor="email">Email address</label>
              <input
                id="email"
                className={s.input}
                type="email"
                placeholder="Enter your registered email"
                value={email}
                onChange={e => setEmail(e.target.value)}
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
              <a className={s.forgotLink} href="#">Forgot password?</a>
            </div>

            <button className={s.submitBtn} type="submit" disabled={loading}>
              {loading ? 'Connecting…' : 'Sign in securely'}
            </button>

            <div className={s.orDivider}><span>OR</span></div>

            <button type="button" className={s.createBtn} onClick={() => void navigate('/register/facility')}>
              Create a QXLITS account
            </button>

          </form>

          <div className={s.support}>
            Need help?{' '}
            <a className={s.supportLink} href="#">Contact QXLITS IT Support</a>{' '}
            or your <a className={s.supportLink} href="#">Ministry administrator</a>.
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
