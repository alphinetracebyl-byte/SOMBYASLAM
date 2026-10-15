import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import s from './register.module.css';

const REGIONS = [
  'Awdal','Bakool','Banaadir','Bari','Bay','Galguduud','Gedo','Hiiraan',
  'Jubbada Dhexe','Jubbada Hoose','Mudug','Nugaal','Sanaag',
  'Shabeellaha Dhexe','Shabeellaha Hoose','Sool','Togdheer','Woqooyi Galbeed',
];

const LIVESTOCK_TYPES = ['Cattle', 'Camels', 'Goats', 'Sheep', 'Mixed'];

const DEST_COUNTRIES = [
  'United Arab Emirates', 'Saudi Arabia', 'Oman', 'Qatar', 'Kuwait',
  'Bahrain', 'Malaysia', 'Egypt', 'Kenya', 'Other',
];

type Errs = Record<string, string>;

const EMPTY = {
  businessName: '', businessType: '', registrationNumber: '', taxId: '',
  exportLicenseNumber: '', contactName: '', contactRole: '', phone: '',
  altPhone: '', email: '', region: '', district: '', address: '',
  password: '', confirmPassword: '',
};

export function ExporterRegisterPage(): JSX.Element {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [livestock, setLivestock] = useState<string[]>([]);
  const [destinations, setDestinations] = useState<string[]>([]);
  const [errors, setErrors] = useState<Errs>({});
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [refCode, setRefCode] = useState('');

  const set = (k: keyof typeof EMPTY) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }));

  const toggleLivestock = (v: string) =>
    setLivestock(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);

  const toggleDest = (v: string) =>
    setDestinations(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);

  const validate = (): Errs => {
    const e: Errs = {};
    if (!form.businessName.trim())       e.businessName       = 'Business name is required';
    if (!form.businessType)              e.businessType       = 'Select a business type';
    if (!form.registrationNumber.trim()) e.registrationNumber = 'Registration number is required';
    if (!form.contactName.trim())        e.contactName        = 'Contact name is required';
    if (!form.contactRole)               e.contactRole        = 'Select a role';
    if (!form.phone.trim())              e.phone              = 'Phone number is required';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
                                         e.email              = 'Enter a valid email address';
    if (!form.region)                    e.region             = 'Select a region';
    if (!form.district.trim())           e.district           = 'District is required';
    if (livestock.length === 0)          e.livestock          = 'Select at least one livestock type';
    if (!form.password || form.password.length < 8)
                                         e.password           = 'Password must be at least 8 characters';
    if (form.password !== form.confirmPassword)
                                         e.confirmPassword    = 'Passwords do not match';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return;
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      const first = document.querySelector('[data-err]');
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setLoading(true);
    try {
      const ref = `EXP-${Date.now().toString(36).toUpperCase().slice(-6)}`;
      sessionStorage.setItem('pendingExporter', JSON.stringify({ ...form, livestock, destinations, ref }));
      setRefCode(ref);
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  const done0 = !!(form.businessName && form.businessType && form.registrationNumber);
  const done1 = !!(form.contactName && form.contactRole && form.phone && form.email);
  const done2 = !!(form.region && form.district);
  const done3 = livestock.length > 0;
  const done4 = !!(form.password && form.confirmPassword && form.password === form.confirmPassword && form.password.length >= 8);

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const NAVS = [
    { id: 'business', label: 'Business Information', done: done0 },
    { id: 'contact',  label: 'Contact Person',        done: done1 },
    { id: 'location', label: 'Business Location',     done: done2 },
    { id: 'export',   label: 'Export Details',         done: done3 },
    { id: 'security', label: 'Account Security',       done: done4 },
  ];

  if (submitted) {
    return (
      <div className={s.page}>
        <header className={s.topbar}>
          <div className={s.brand}>
            <div className={s.brandMark}>S</div>
            <div><div className={s.brandName}>QXLITS</div></div>
          </div>
        </header>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
          <div style={{ background: '#fff', border: '1px solid #e2eaf4', borderRadius: 16, padding: '48px 40px', maxWidth: 540, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10213a', marginBottom: 8 }}>Application Submitted</h2>
            <p style={{ color: '#5b738a', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: 20 }}>
              Your exporter registration has been received. The Ministry of Livestock will review your
              business documents within <strong>5–7 working days</strong>.
            </p>
            <div style={{ background: '#edf5ff', borderRadius: 10, padding: '14px 24px', marginBottom: 28, display: 'inline-block' }}>
              <div style={{ fontSize: '0.7rem', color: '#0f2170', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Application Reference</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f2170', letterSpacing: '0.06em' }}>{refCode}</div>
            </div>
            <p style={{ color: '#8a9bb0', fontSize: '0.8125rem', marginBottom: 28 }}>
              Keep this reference number. You will receive an SMS and email when your account is activated.
            </p>
            <button type="button" onClick={() => void navigate('/login')}
              style={{ background: '#0f2170', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 32px', fontSize: '0.9375rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Return to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          <a className={s.topLink} href="#">Contact Ministry</a>
          <a className={s.helpLink} href="#">Help &amp; Support</a>
        </div>
      </header>

      <div className={s.layout}>

        <aside className={s.sidebar}>
          <div className={s.sideInner}>
            <div className={s.sideBrand}>
              <div className={s.sideMark}>S</div>
              <div>
                <div className={s.sideName}>QXLITS</div>
                <div className={s.sideSub}>Exporter Registration</div>
              </div>
            </div>
            <div className={s.sideBlock}>
              <div className={s.sideBlockTitle}>Form Sections</div>
              <nav className={s.sideNav}>
                {NAVS.map((n, i) => (
                  <button key={n.id} type="button"
                    className={`${s.sideNavBtn}${n.done ? ' ' + s.sideNavBtnDone : ''}`}
                    onClick={() => scrollTo(n.id)}>
                    <span className={n.done ? s.sideNavNumDone : s.sideNavNum}>{n.done ? '✓' : i + 1}</span>
                    {n.label}
                    {n.done && <span className={s.sideNavCheck}>✓</span>}
                  </button>
                ))}
              </nav>
            </div>
            <div className={s.sideBlock}>
              <div className={s.sideBlockTitle}>What Happens Next</div>
              <ol className={s.stepsList}>
                <li><div className={s.stepsNum}>1</div><div><strong>Submit application</strong><span>Complete and submit this form</span></div></li>
                <li><div className={s.stepsNum}>2</div><div><strong>Document review</strong><span>Ministry verifies business documents in 5–7 working days</span></div></li>
                <li><div className={s.stepsNum}>3</div><div><strong>Account activated</strong><span>You receive SMS and email confirmation</span></div></li>
                <li><div className={s.stepsNum}>4</div><div><strong>Apply for permits</strong><span>Request export permits and health certificates online</span></div></li>
              </ol>
            </div>
            <div className={s.sideHelp}>
              <span className={s.sideHelpIcon}>ℹ️</span>
              <span>Questions? Contact the Ministry Export Licensing Office or call QXLITS Support.</span>
            </div>
            <div className={s.sideFooter}>
              Already registered? <Link to="/login" className={s.sideLink}>Sign in here</Link>
            </div>
          </div>
        </aside>

        <form className={s.main} onSubmit={handleSubmit} noValidate>

          {/* 01 Business Information */}
          <section id="business" className={s.sec}>
            <div className={s.secHead}>
              <span className={done0 ? s.secBadgeDone : s.secBadge}>{done0 ? '✓' : '01'}</span>
              <h2 className={s.secTitle}>Business Information</h2>
              {done0 && <span className={s.secDoneLabel}>Complete</span>}
            </div>

            <div className={s.f}>
              <label className={s.lbl} htmlFor="businessName">Business / Company Name <span className={s.req}>*</span></label>
              <input id="businessName" className={`${s.inp}${errors.businessName ? ' ' + s.err : ''}`}
                type="text" placeholder="e.g. Mogadishu Livestock Export Ltd."
                value={form.businessName} onChange={set('businessName')} data-err={errors.businessName || undefined} />
              {errors.businessName && <p className={s.ferr}>{errors.businessName}</p>}
            </div>

            <div className={s.grid2}>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="businessType">Business Type <span className={s.req}>*</span></label>
                <select id="businessType" className={`${s.sel}${errors.businessType ? ' ' + s.err : ''}`}
                  value={form.businessType} onChange={set('businessType')}>
                  <option value="">Select type…</option>
                  <option value="SOLE_TRADER">Sole Trader</option>
                  <option value="PARTNERSHIP">Partnership</option>
                  <option value="LLC">Limited Liability Company</option>
                  <option value="COMPANY">Public / Private Company</option>
                  <option value="COOPERATIVE">Cooperative</option>
                </select>
                {errors.businessType && <p className={s.ferr}>{errors.businessType}</p>}
              </div>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="registrationNumber">Business Registration No. <span className={s.req}>*</span></label>
                <input id="registrationNumber" className={`${s.inp}${errors.registrationNumber ? ' ' + s.err : ''}`}
                  type="text" placeholder="e.g. BR-2024-00123"
                  value={form.registrationNumber} onChange={set('registrationNumber')} />
                {errors.registrationNumber && <p className={s.ferr}>{errors.registrationNumber}</p>}
              </div>
            </div>

            <div className={s.grid2}>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="taxId">Tax ID / NIF <span className={s.opt}>optional</span></label>
                <input id="taxId" className={s.inp} type="text" placeholder="Tax identification number"
                  value={form.taxId} onChange={set('taxId')} />
              </div>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="exportLicenseNumber">Export Licence Number <span className={s.opt}>optional</span></label>
                <input id="exportLicenseNumber" className={s.inp} type="text" placeholder="If already issued"
                  value={form.exportLicenseNumber} onChange={set('exportLicenseNumber')} />
              </div>
            </div>
          </section>

          {/* 02 Contact Person */}
          <section id="contact" className={s.sec}>
            <div className={s.secHead}>
              <span className={done1 ? s.secBadgeDone : s.secBadge}>{done1 ? '✓' : '02'}</span>
              <h2 className={s.secTitle}>Contact Person</h2>
              {done1 && <span className={s.secDoneLabel}>Complete</span>}
            </div>

            <div className={s.grid2}>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="contactName">Full Name <span className={s.req}>*</span></label>
                <input id="contactName" className={`${s.inp}${errors.contactName ? ' ' + s.err : ''}`}
                  type="text" placeholder="Authorised contact person"
                  value={form.contactName} onChange={set('contactName')} />
                {errors.contactName && <p className={s.ferr}>{errors.contactName}</p>}
              </div>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="contactRole">Role / Designation <span className={s.req}>*</span></label>
                <select id="contactRole" className={`${s.sel}${errors.contactRole ? ' ' + s.err : ''}`}
                  value={form.contactRole} onChange={set('contactRole')}>
                  <option value="">Select role…</option>
                  <option value="OWNER">Owner</option>
                  <option value="DIRECTOR">Director</option>
                  <option value="MANAGER">General Manager</option>
                  <option value="AUTHORIZED_AGENT">Authorised Agent</option>
                </select>
                {errors.contactRole && <p className={s.ferr}>{errors.contactRole}</p>}
              </div>
            </div>

            <div className={s.grid3}>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="phone">Primary Phone <span className={s.req}>*</span></label>
                <input id="phone" className={`${s.inp}${errors.phone ? ' ' + s.err : ''}`}
                  type="tel" placeholder="+252612345678"
                  value={form.phone} onChange={set('phone')} />
                {errors.phone && <p className={s.ferr}>{errors.phone}</p>}
              </div>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="altPhone">Alternative Phone <span className={s.opt}>optional</span></label>
                <input id="altPhone" className={s.inp} type="tel" placeholder="+252612345678"
                  value={form.altPhone} onChange={set('altPhone')} />
              </div>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="email">Email Address <span className={s.req}>*</span></label>
                <input id="email" className={`${s.inp}${errors.email ? ' ' + s.err : ''}`}
                  type="email" placeholder="contact@company.com"
                  value={form.email} onChange={set('email')} />
                {errors.email && <p className={s.ferr}>{errors.email}</p>}
              </div>
            </div>
          </section>

          {/* 03 Business Location */}
          <section id="location" className={s.sec}>
            <div className={s.secHead}>
              <span className={done2 ? s.secBadgeDone : s.secBadge}>{done2 ? '✓' : '03'}</span>
              <h2 className={s.secTitle}>Business Location</h2>
              {done2 && <span className={s.secDoneLabel}>Complete</span>}
            </div>

            <div className={s.grid3}>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="region">Region <span className={s.req}>*</span></label>
                <select id="region" className={`${s.sel}${errors.region ? ' ' + s.err : ''}`}
                  value={form.region} onChange={set('region')}>
                  <option value="">Select region…</option>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                {errors.region && <p className={s.ferr}>{errors.region}</p>}
              </div>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="district">District <span className={s.req}>*</span></label>
                <input id="district" className={`${s.inp}${errors.district ? ' ' + s.err : ''}`}
                  type="text" placeholder="e.g. Hodan"
                  value={form.district} onChange={set('district')} />
                {errors.district && <p className={s.ferr}>{errors.district}</p>}
              </div>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="address">Physical Address <span className={s.opt}>optional</span></label>
                <input id="address" className={s.inp} type="text" placeholder="Street, building, area"
                  value={form.address} onChange={set('address')} />
              </div>
            </div>
          </section>

          {/* 04 Export Details */}
          <section id="export" className={s.sec}>
            <div className={s.secHead}>
              <span className={done3 ? s.secBadgeDone : s.secBadge}>{done3 ? '✓' : '04'}</span>
              <h2 className={s.secTitle}>Export Details</h2>
              {done3 && <span className={s.secDoneLabel}>Complete</span>}
            </div>

            <div className={s.f}>
              <label className={s.lbl}>Livestock Types Exported <span className={s.req}>*</span></label>
              <div className={s.chipGroup}>
                {LIVESTOCK_TYPES.map(item => (
                  <button key={item} type="button"
                    className={`${s.chip}${livestock.includes(item) ? ' ' + s.chipOn : ''}`}
                    onClick={() => toggleLivestock(item)}>
                    {livestock.includes(item) && '✓ '}{item}
                  </button>
                ))}
              </div>
              {errors.livestock && <p className={s.ferr}>{errors.livestock}</p>}
            </div>

            <div className={s.f} style={{ marginTop: 8 }}>
              <label className={s.lbl}>Destination Countries <span className={s.opt}>optional — select all that apply</span></label>
              <div className={s.chipGroup}>
                {DEST_COUNTRIES.map(item => (
                  <button key={item} type="button"
                    className={`${s.chip}${destinations.includes(item) ? ' ' + s.chipOn : ''}`}
                    onClick={() => toggleDest(item)}>
                    {destinations.includes(item) && '✓ '}{item}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* 05 Account Security */}
          <section id="security" className={s.sec}>
            <div className={s.secHead}>
              <span className={done4 ? s.secBadgeDone : s.secBadge}>{done4 ? '✓' : '05'}</span>
              <h2 className={s.secTitle}>Account Security</h2>
              {done4 && <span className={s.secDoneLabel}>Complete</span>}
            </div>
            <div className={s.grid2}>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="password">Password <span className={s.req}>*</span></label>
                <div className={s.pw}>
                  <input id="password" className={`${s.inp}${errors.password ? ' ' + s.err : ''}`}
                    type={showPwd ? 'text' : 'password'} placeholder="At least 8 characters"
                    value={form.password} onChange={set('password')} />
                  <button type="button" className={s.showBtn} onClick={() => setShowPwd(v => !v)}>
                    {showPwd ? 'Hide' : 'Show'}
                  </button>
                </div>
                {errors.password && <p className={s.ferr}>{errors.password}</p>}
              </div>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="confirmPassword">Confirm Password <span className={s.req}>*</span></label>
                <div className={s.pw}>
                  <input id="confirmPassword" className={`${s.inp}${errors.confirmPassword ? ' ' + s.err : ''}`}
                    type={showConfirm ? 'text' : 'password'} placeholder="Repeat your password"
                    value={form.confirmPassword} onChange={set('confirmPassword')} />
                  <button type="button" className={s.showBtn} onClick={() => setShowConfirm(v => !v)}>
                    {showConfirm ? 'Hide' : 'Show'}
                  </button>
                </div>
                {errors.confirmPassword && <p className={s.ferr}>{errors.confirmPassword}</p>}
              </div>
            </div>
          </section>

          {/* Agree + Submit */}
          <label className={s.agreeRow} onClick={() => setAgreed(v => !v)}>
            <span className={`${s.agreeBox}${agreed ? ' ' + s.agreeBoxOn : ''}`}>{agreed ? '✓' : ''}</span>
            <span className={s.agreeText}>
              I confirm all information is accurate, I am an authorised representative of the stated business,
              and I agree to the QXLITS Terms of Use, Privacy Policy, and Ministry approval process.
            </span>
          </label>

          <div className={s.formFooter}>
            <p className={s.footerNote}>
              By submitting you agree to the{' '}
              <Link to="/terms" target="_blank" rel="noopener noreferrer" className={s.footerLink}>QXLITS Terms of Use &amp; Privacy Policy</Link>.
              Your information will be processed by the Federal Government of Somalia Ministry of Livestock, Forestry and Range.
            </p>
            <div className={s.submitRow}>
              <button type="submit" className={s.submitBtn} disabled={loading || !agreed}>
                {loading ? 'Submitting…' : 'Submit Application →'}
              </button>
              <span className={s.submitNote}>
                Already registered?{' '}
                <Link to="/login" className={s.submitNoteLink}>Sign in</Link>
              </span>
            </div>
            {!agreed && <p className={s.hintErr}>Please tick the confirmation above before submitting.</p>}
          </div>

        </form>
      </div>
    </div>
  );
}

export default ExporterRegisterPage;
