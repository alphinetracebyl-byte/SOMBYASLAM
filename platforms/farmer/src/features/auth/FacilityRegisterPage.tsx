import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import s from './register.module.css';

const REGIONS = [
  'Awdal','Bakool','Banaadir','Bari','Bay','Galguduud','Gedo','Hiiraan',
  'Jubbada Dhexe','Jubbada Hoose','Mudug','Nugaal','Sanaag',
  'Shabeellaha Dhexe','Shabeellaha Hoose','Sool','Togdheer','Woqooyi Galbeed',
];

const schema = z.object({
  facilityName:    z.string().min(3, 'Facility name is required').max(150),
  facilityType:    z.enum([
    'QUARANTINE_STATION','SLAUGHTERHOUSE','EXPORT_CHECKPOINT','BORDER_POST','HOLDING_YARD',
  ], { message: 'Select a facility type' }),
  licenseNumber:   z.string().min(3, 'Licence number is required').max(60),
  capacity:        z.string().max(10).optional().or(z.literal('')),
  managerName:     z.string().min(3, 'Manager name is required').max(100),
  managerRole:     z.enum(['FACILITY_MANAGER','OWNER','GOVERNMENT_APPOINTED','VETERINARY_OFFICER'], {
    message: 'Select a role',
  }),
  phone:           z.string().min(6, 'Phone number is required').max(20),
  email:           z.string().email('Enter a valid email'),
  region:          z.string().min(1, 'Please select a region'),
  district:        z.string().min(2, 'District is required').max(100),
  address:         z.string().max(200).optional().or(z.literal('')),
  gpsLat:          z.string().max(20).optional().or(z.literal('')),
  gpsLng:          z.string().max(20).optional().or(z.literal('')),
  password:        z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

const NAV_SECTIONS = [
  { id: 'facility', label: 'Facility Information' },
  { id: 'manager',  label: 'Manager / Contact' },
  { id: 'location', label: 'Location' },
  { id: 'security', label: 'Account Security' },
];

const SECTION_REQUIRED: (keyof FormData)[][] = [
  ['facilityName', 'facilityType', 'licenseNumber'],
  ['managerName', 'managerRole', 'phone', 'email'],
  ['region', 'district'],
  ['password', 'confirmPassword'],
];

const FACILITY_TYPE_LABELS: Record<string, string> = {
  QUARANTINE_STATION: 'Quarantine Station',
  SLAUGHTERHOUSE:     'Slaughterhouse',
  EXPORT_CHECKPOINT:  'Export Checkpoint',
  BORDER_POST:        'Border Livestock Post',
  HOLDING_YARD:       'Holding / Fattening Yard',
};

export function FacilityRegisterPage(): JSX.Element {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [refCode, setRefCode] = useState('');

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema), mode: 'onBlur' });

  const values = watch();

  const sectionDone = (idx: number) =>
    SECTION_REQUIRED[idx].every(k => {
      const v = values[k as keyof FormData];
      return v !== undefined && v !== '' && !errors[k as keyof FormData];
    });

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const onSubmit = async (data: FormData) => {
    if (!agreed) return;
    setServerError(null);
    try {
      const ref = `FAC-${Date.now().toString(36).toUpperCase().slice(-6)}`;
      sessionStorage.setItem('pendingFacility', JSON.stringify({ ...data, ref }));
      setRefCode(ref);
      setSubmitted(true);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Submission failed. Please try again.');
    }
  };

  if (submitted) {
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
        </header>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', background: '#edf5ff' }}>
          <div style={{ background: '#fff', border: '1px solid #e2eaf4', borderRadius: 16, padding: '48px 40px', maxWidth: 540, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10213a', marginBottom: 8 }}>Application Submitted</h2>
            <p style={{ color: '#5b738a', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: 20 }}>
              Your facility registration application has been received. A Ministry inspector will
              contact you to schedule a facility inspection within <strong>7–14 working days</strong>.
            </p>
            <div style={{ background: '#edf5ff', borderRadius: 10, padding: '14px 20px', marginBottom: 28, display: 'inline-block' }}>
              <div style={{ fontSize: '0.75rem', color: '#0b5ed7', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>Application Reference</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f2170', letterSpacing: '0.05em' }}>{refCode}</div>
            </div>
            <p style={{ color: '#8a9bb0', fontSize: '0.8125rem', marginBottom: 28 }}>
              Keep this reference number. You will receive an SMS confirmation when your facility is approved and your portal access is created.
            </p>
            <button
              type="button"
              onClick={() => void navigate('/login')}
              style={{ background: '#0b5ed7', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 32px', fontSize: '0.9375rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
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
          <a className={s.topLink} href="#">About QXLITS</a>
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
                <div className={s.sideSub}>Facility Registration</div>
              </div>
            </div>
            <div className={s.sideBlock}>
              <div className={s.sideBlockTitle}>Facility Types</div>
              <div className={s.checkList}>
                {Object.entries(FACILITY_TYPE_LABELS).map(([, label]) => (
                  <li key={label} style={{ listStyle: 'none', display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 12, color: '#4b6280', lineHeight: 1.5 }}>
                    <span className={s.checkIcon}>🏢</span>{label}
                  </li>
                ))}
              </div>
            </div>
            <div className={s.sideBlock}>
              <div className={s.sideBlockTitle}>Form Sections</div>
              <nav className={s.sideNav}>
                {NAV_SECTIONS.map((sec, i) => {
                  const done = sectionDone(i);
                  return (
                    <button key={sec.id} type="button"
                      className={`${s.sideNavBtn}${done ? ` ${s.sideNavBtnDone}` : ''}`}
                      onClick={() => scrollTo(sec.id)}>
                      <span className={done ? s.sideNavNumDone : s.sideNavNum}>
                        {done ? '✓' : i + 1}
                      </span>
                      {sec.label}
                      {done && <span className={s.sideNavCheck}>✓</span>}
                    </button>
                  );
                })}
              </nav>
            </div>
            <div className={s.sideBlock}>
              <div className={s.sideBlockTitle}>What Happens Next</div>
              <ol className={s.stepsList}>
                <li><div className={s.stepsNum}>1</div><div><strong>Submit application</strong><span>Complete and submit this form</span></div></li>
                <li><div className={s.stepsNum}>2</div><div><strong>Ministry review</strong><span>Documents and licence verified within 7–14 days</span></div></li>
                <li><div className={s.stepsNum}>3</div><div><strong>Site inspection</strong><span>A Ministry inspector visits the facility</span></div></li>
                <li><div className={s.stepsNum}>4</div><div><strong>Facility code issued</strong><span>You receive your official facility code and portal access</span></div></li>
              </ol>
            </div>
            <div className={s.sideHelp}>
              <span className={s.sideHelpIcon}>ℹ️</span>
              <span>Need help? Contact the Ministry Livestock Facilities Office or call QXLITS Support.</span>
            </div>
            <div className={s.sideFooter}>
              Already have an account?{' '}
              <Link to="/login" className={s.sideLink}>Sign in here</Link>
            </div>
          </div>
        </aside>

        <form className={s.main} onSubmit={handleSubmit(onSubmit)} noValidate>

          {serverError && (
            <div className={s.errorBox} role="alert"><span>⚠</span> {serverError}</div>
          )}

          {/* ── 01 Facility Information ── */}
          <section id="facility" className={s.sec}>
            <div className={s.secHead}>
              <span className={sectionDone(0) ? s.secBadgeDone : s.secBadge}>{sectionDone(0) ? '✓' : '01'}</span>
              <h2 className={s.secTitle}>Facility Information</h2>
              {sectionDone(0) && <span className={s.secDoneLabel}>Complete</span>}
            </div>

            <div className={s.f}>
              <label className={s.lbl} htmlFor="facilityName">Facility Name <span className={s.req}>*</span></label>
              <input id="facilityName" className={`${s.inp}${errors.facilityName ? ` ${s.err}` : ''}`}
                type="text" placeholder="e.g. Mogadishu Port Quarantine Station" {...register('facilityName')} />
              {errors.facilityName && <p className={s.ferr}>{errors.facilityName.message}</p>}
            </div>

            <div className={s.grid2}>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="facilityType">Facility Type <span className={s.req}>*</span></label>
                <select id="facilityType" className={`${s.sel}${errors.facilityType ? ` ${s.err}` : ''}`} {...register('facilityType')}>
                  <option value="">Select type…</option>
                  {Object.entries(FACILITY_TYPE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
                {errors.facilityType && <p className={s.ferr}>{errors.facilityType.message}</p>}
              </div>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="licenseNumber">Facility Licence / Registration No. <span className={s.req}>*</span></label>
                <input id="licenseNumber" className={`${s.inp}${errors.licenseNumber ? ` ${s.err}` : ''}`}
                  type="text" placeholder="e.g. FAC-QS-2024-001" {...register('licenseNumber')} />
                {errors.licenseNumber && <p className={s.ferr}>{errors.licenseNumber.message}</p>}
              </div>
            </div>

            <div className={s.f} style={{ maxWidth: 240 }}>
              <label className={s.lbl} htmlFor="capacity">Animal Capacity <span className={s.opt}>optional</span></label>
              <input id="capacity" className={s.inp} type="number" min="1"
                placeholder="Max animals at one time" {...register('capacity')} />
            </div>
          </section>

          {/* ── 02 Manager / Contact ── */}
          <section id="manager" className={s.sec}>
            <div className={s.secHead}>
              <span className={sectionDone(1) ? s.secBadgeDone : s.secBadge}>{sectionDone(1) ? '✓' : '02'}</span>
              <h2 className={s.secTitle}>Manager / Contact Person</h2>
              {sectionDone(1) && <span className={s.secDoneLabel}>Complete</span>}
            </div>

            <div className={s.grid2}>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="managerName">Full Name <span className={s.req}>*</span></label>
                <input id="managerName" className={`${s.inp}${errors.managerName ? ` ${s.err}` : ''}`}
                  type="text" autoComplete="name" placeholder="Facility manager or owner" {...register('managerName')} />
                {errors.managerName && <p className={s.ferr}>{errors.managerName.message}</p>}
              </div>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="managerRole">Role <span className={s.req}>*</span></label>
                <select id="managerRole" className={`${s.sel}${errors.managerRole ? ` ${s.err}` : ''}`} {...register('managerRole')}>
                  <option value="">Select role…</option>
                  <option value="FACILITY_MANAGER">Facility Manager</option>
                  <option value="OWNER">Owner</option>
                  <option value="GOVERNMENT_APPOINTED">Government Appointed</option>
                  <option value="VETERINARY_OFFICER">Veterinary Officer In-Charge</option>
                </select>
                {errors.managerRole && <p className={s.ferr}>{errors.managerRole.message}</p>}
              </div>
            </div>

            <div className={s.grid2}>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="phone">Phone Number <span className={s.req}>*</span></label>
                <input id="phone" className={`${s.inp}${errors.phone ? ` ${s.err}` : ''}`}
                  type="tel" placeholder="+252612345678" {...register('phone')} />
                {errors.phone && <p className={s.ferr}>{errors.phone.message}</p>}
              </div>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="email">Email Address <span className={s.req}>*</span></label>
                <input id="email" className={`${s.inp}${errors.email ? ` ${s.err}` : ''}`}
                  type="email" autoComplete="email" placeholder="manager@facility.so" {...register('email')} />
                {errors.email && <p className={s.ferr}>{errors.email.message}</p>}
              </div>
            </div>
          </section>

          {/* ── 03 Location ── */}
          <section id="location" className={s.sec}>
            <div className={s.secHead}>
              <span className={sectionDone(2) ? s.secBadgeDone : s.secBadge}>{sectionDone(2) ? '✓' : '03'}</span>
              <h2 className={s.secTitle}>Location</h2>
              {sectionDone(2) && <span className={s.secDoneLabel}>Complete</span>}
            </div>

            <div className={s.grid3}>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="region">Region <span className={s.req}>*</span></label>
                <select id="region" className={`${s.sel}${errors.region ? ` ${s.err}` : ''}`} {...register('region')}>
                  <option value="">Select region…</option>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                {errors.region && <p className={s.ferr}>{errors.region.message}</p>}
              </div>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="district">District <span className={s.req}>*</span></label>
                <input id="district" className={`${s.inp}${errors.district ? ` ${s.err}` : ''}`}
                  type="text" placeholder="e.g. Hodan" {...register('district')} />
                {errors.district && <p className={s.ferr}>{errors.district.message}</p>}
              </div>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="address">Physical Address / Landmark <span className={s.opt}>optional</span></label>
                <input id="address" className={s.inp} type="text" placeholder="Street, building, nearby landmark" {...register('address')} />
              </div>
            </div>

            <div className={s.grid2} style={{ maxWidth: 400 }}>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="gpsLat">GPS Latitude <span className={s.opt}>optional</span></label>
                <input id="gpsLat" className={s.inp} type="text" placeholder="e.g. 2.0469" {...register('gpsLat')} />
              </div>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="gpsLng">GPS Longitude <span className={s.opt}>optional</span></label>
                <input id="gpsLng" className={s.inp} type="text" placeholder="e.g. 45.3182" {...register('gpsLng')} />
              </div>
            </div>
          </section>

          {/* ── 04 Account Security ── */}
          <section id="security" className={s.sec}>
            <div className={s.secHead}>
              <span className={sectionDone(3) ? s.secBadgeDone : s.secBadge}>{sectionDone(3) ? '✓' : '04'}</span>
              <h2 className={s.secTitle}>Account Security</h2>
              {sectionDone(3) && <span className={s.secDoneLabel}>Complete</span>}
            </div>
            <div className={s.grid2}>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="password">Password <span className={s.req}>*</span></label>
                <div className={s.pw}>
                  <input id="password" className={`${s.inp}${errors.password ? ` ${s.err}` : ''}`}
                    type={showPwd ? 'text' : 'password'} autoComplete="new-password"
                    placeholder="At least 8 characters" {...register('password')} />
                  <button type="button" className={s.showBtn} onClick={() => setShowPwd(v => !v)}>
                    {showPwd ? 'Hide' : 'Show'}
                  </button>
                </div>
                {errors.password && <p className={s.ferr}>{errors.password.message}</p>}
              </div>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="confirmPassword">Confirm Password <span className={s.req}>*</span></label>
                <div className={s.pw}>
                  <input id="confirmPassword" className={`${s.inp}${errors.confirmPassword ? ` ${s.err}` : ''}`}
                    type={showConfirm ? 'text' : 'password'} autoComplete="new-password"
                    placeholder="Repeat your password" {...register('confirmPassword')} />
                  <button type="button" className={s.showBtn} onClick={() => setShowConfirm(v => !v)}>
                    {showConfirm ? 'Hide' : 'Show'}
                  </button>
                </div>
                {errors.confirmPassword && <p className={s.ferr}>{errors.confirmPassword.message}</p>}
              </div>
            </div>
          </section>

          <label className={`${s.checkItem}${agreed ? ' ' + s.checkItemDone : ''}`} style={{ margin: '8px 0' }}>
            <input type="checkbox" className={s.checkBox} checked={agreed} onChange={e => setAgreed(e.target.checked)} />
            <span className={s.checkMark}>{agreed ? '✓' : ''}</span>
            <span className={s.checkText}>
              I confirm that all information is accurate and complete, I have legal authority to register this facility,
              and I agree to the QXLITS Terms of Use, Privacy Policy, and Ministry of Livestock facility approval process.
            </span>
          </label>

          <div className={s.formSubmit}>
            <p className={s.terms}>
              By submitting this application you agree to the{' '}
              <Link to="/terms" target="_blank" rel="noopener noreferrer" className={s.termsLink}>QXLITS Terms of Use &amp; Privacy Policy</Link>.
              Your facility information will be processed by the Federal Government of Somalia Ministry of Livestock, Forestry and Range.
            </p>
            <div className={s.submitRow}>
              <button type="submit"
                className={`${s.submitBtn}${!agreed ? ' ' + s.submitBtnDisabled : ''}`}
                disabled={isSubmitting || !agreed}>
                {isSubmitting ? 'Submitting…' : 'Submit Application →'}
              </button>
              <span className={s.signinNote}>
                Already have an account? <Link to="/login" className={s.termsLink}>Sign in</Link>
              </span>
            </div>
            {!agreed && (
              <p className={s.checklistHint}>Please tick the confirmation above before submitting.</p>
            )}
          </div>

        </form>
      </div>
    </div>
  );
}

export default FacilityRegisterPage;
