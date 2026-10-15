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

const LIVESTOCK_TYPES = ['Cattle','Camels','Goats','Sheep','Mixed'];
const DEST_COUNTRIES = [
  'United Arab Emirates','Saudi Arabia','Oman','Qatar','Kuwait',
  'Bahrain','Malaysia','Egypt','Kenya','Other',
];

const schema = z.object({
  businessName:        z.string().min(2, 'Business name is required').max(150),
  businessType:        z.enum(['SOLE_TRADER','PARTNERSHIP','LLC','COMPANY','COOPERATIVE'], { message: 'Select a business type' }),
  registrationNumber:  z.string().min(3, 'Registration number is required').max(60),
  taxId:               z.string().max(60).optional().or(z.literal('')),
  exportLicenseNumber: z.string().max(60).optional().or(z.literal('')),
  contactName:         z.string().min(3, 'Contact name is required').max(100),
  contactRole:         z.enum(['OWNER','DIRECTOR','MANAGER','AUTHORIZED_AGENT'], { message: 'Select a role' }),
  phone:               z.string().min(6, 'Phone number is required').max(20),
  altPhone:            z.string().max(20).optional().or(z.literal('')),
  email:               z.string().email('Enter a valid email'),
  region:              z.string().min(1, 'Please select a region'),
  district:            z.string().min(2, 'District is required').max(100),
  address:             z.string().max(200).optional().or(z.literal('')),
  livestock:           z.array(z.string()).min(1, 'Select at least one livestock type'),
  destinations:        z.array(z.string()).optional(),
  password:            z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword:     z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

const NAV_SECTIONS = [
  { id: 'business',  label: 'Business Information' },
  { id: 'contact',   label: 'Contact Person' },
  { id: 'location',  label: 'Business Location' },
  { id: 'export',    label: 'Export Details' },
  { id: 'security',  label: 'Account Security' },
];

const SECTION_REQUIRED: (keyof FormData)[][] = [
  ['businessName', 'businessType', 'registrationNumber'],
  ['contactName', 'contactRole', 'phone', 'email'],
  ['region', 'district'],
  ['livestock'],
  ['password', 'confirmPassword'],
];

export function ExporterRegisterPage(): JSX.Element {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [refCode, setRefCode] = useState('');

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema), mode: 'onBlur',
      defaultValues: { livestock: [], destinations: [] } });

  const values = watch();

  const sectionDone = (idx: number) =>
    SECTION_REQUIRED[idx].every(k => {
      const v = values[k as keyof FormData];
      if (Array.isArray(v)) return v.length > 0;
      return v !== undefined && v !== '' && !errors[k as keyof FormData];
    });

  const toggleLivestock = (item: string) => {
    const cur = values.livestock ?? [];
    setValue('livestock', cur.includes(item) ? cur.filter(x => x !== item) : [...cur, item], { shouldValidate: true });
  };

  const toggleDest = (item: string) => {
    const cur = values.destinations ?? [];
    setValue('destinations', cur.includes(item) ? cur.filter(x => x !== item) : [...cur, item]);
  };

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const onSubmit = async (data: FormData) => {
    if (!agreed) return;
    setServerError(null);
    try {
      const ref = `EXP-${Date.now().toString(36).toUpperCase().slice(-6)}`;
      sessionStorage.setItem('pendingExporter', JSON.stringify({ ...data, ref }));
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
              Your exporter registration has been received by the Ministry of Livestock.
              A review officer will verify your business documents within <strong>5–7 working days</strong>.
            </p>
            <div style={{ background: '#edf5ff', borderRadius: 10, padding: '14px 20px', marginBottom: 28, display: 'inline-block' }}>
              <div style={{ fontSize: '0.75rem', color: '#0b5ed7', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>Application Reference</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f2170', letterSpacing: '0.05em' }}>{refCode}</div>
            </div>
            <p style={{ color: '#8a9bb0', fontSize: '0.8125rem', marginBottom: 28 }}>
              Keep this reference number for your records. You will receive an SMS and email notification when your account is activated.
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
                <div className={s.sideSub}>Exporter Registration</div>
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
                <li><div className={s.stepsNum}>2</div><div><strong>Document review</strong><span>Ministry verifies your business registration within 5–7 working days</span></div></li>
                <li><div className={s.stepsNum}>3</div><div><strong>Account activated</strong><span>You receive SMS and email confirmation</span></div></li>
                <li><div className={s.stepsNum}>4</div><div><strong>Apply for permits</strong><span>Request export permits and health certificates online</span></div></li>
              </ol>
            </div>
            <div className={s.sideHelp}>
              <span className={s.sideHelpIcon}>ℹ️</span>
              <span>Questions? Contact the Ministry Export Licensing Office or call QXLITS Support.</span>
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

          {/* ── 01 Business Information ── */}
          <section id="business" className={s.sec}>
            <div className={s.secHead}>
              <span className={sectionDone(0) ? s.secBadgeDone : s.secBadge}>{sectionDone(0) ? '✓' : '01'}</span>
              <h2 className={s.secTitle}>Business Information</h2>
              {sectionDone(0) && <span className={s.secDoneLabel}>Complete</span>}
            </div>

            <div className={s.f}>
              <label className={s.lbl} htmlFor="businessName">Business / Company Name <span className={s.req}>*</span></label>
              <input id="businessName" className={`${s.inp}${errors.businessName ? ` ${s.err}` : ''}`}
                type="text" placeholder="e.g. Mogadishu Livestock Export Ltd." {...register('businessName')} />
              {errors.businessName && <p className={s.ferr}>{errors.businessName.message}</p>}
            </div>

            <div className={s.grid2}>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="businessType">Business Type <span className={s.req}>*</span></label>
                <select id="businessType" className={`${s.sel}${errors.businessType ? ` ${s.err}` : ''}`} {...register('businessType')}>
                  <option value="">Select type…</option>
                  <option value="SOLE_TRADER">Sole Trader</option>
                  <option value="PARTNERSHIP">Partnership</option>
                  <option value="LLC">Limited Liability Company</option>
                  <option value="COMPANY">Public / Private Company</option>
                  <option value="COOPERATIVE">Cooperative</option>
                </select>
                {errors.businessType && <p className={s.ferr}>{errors.businessType.message}</p>}
              </div>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="registrationNumber">Business Registration No. <span className={s.req}>*</span></label>
                <input id="registrationNumber" className={`${s.inp}${errors.registrationNumber ? ` ${s.err}` : ''}`}
                  type="text" placeholder="e.g. BR-2024-00123" {...register('registrationNumber')} />
                {errors.registrationNumber && <p className={s.ferr}>{errors.registrationNumber.message}</p>}
              </div>
            </div>

            <div className={s.grid2}>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="taxId">Tax ID / NIF <span className={s.opt}>optional</span></label>
                <input id="taxId" className={s.inp} type="text" placeholder="Tax identification number" {...register('taxId')} />
              </div>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="exportLicenseNumber">Export Licence Number <span className={s.opt}>optional</span></label>
                <input id="exportLicenseNumber" className={s.inp} type="text" placeholder="If already issued" {...register('exportLicenseNumber')} />
              </div>
            </div>
          </section>

          {/* ── 02 Contact Person ── */}
          <section id="contact" className={s.sec}>
            <div className={s.secHead}>
              <span className={sectionDone(1) ? s.secBadgeDone : s.secBadge}>{sectionDone(1) ? '✓' : '02'}</span>
              <h2 className={s.secTitle}>Contact Person</h2>
              {sectionDone(1) && <span className={s.secDoneLabel}>Complete</span>}
            </div>

            <div className={s.grid2}>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="contactName">Full Name <span className={s.req}>*</span></label>
                <input id="contactName" className={`${s.inp}${errors.contactName ? ` ${s.err}` : ''}`}
                  type="text" autoComplete="name" placeholder="Authorised contact person" {...register('contactName')} />
                {errors.contactName && <p className={s.ferr}>{errors.contactName.message}</p>}
              </div>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="contactRole">Role / Designation <span className={s.req}>*</span></label>
                <select id="contactRole" className={`${s.sel}${errors.contactRole ? ` ${s.err}` : ''}`} {...register('contactRole')}>
                  <option value="">Select role…</option>
                  <option value="OWNER">Owner</option>
                  <option value="DIRECTOR">Director</option>
                  <option value="MANAGER">General Manager</option>
                  <option value="AUTHORIZED_AGENT">Authorised Agent</option>
                </select>
                {errors.contactRole && <p className={s.ferr}>{errors.contactRole.message}</p>}
              </div>
            </div>

            <div className={s.grid3}>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="phone">Primary Phone <span className={s.req}>*</span></label>
                <input id="phone" className={`${s.inp}${errors.phone ? ` ${s.err}` : ''}`}
                  type="tel" placeholder="+252612345678" {...register('phone')} />
                {errors.phone && <p className={s.ferr}>{errors.phone.message}</p>}
              </div>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="altPhone">Alternative Phone <span className={s.opt}>optional</span></label>
                <input id="altPhone" className={s.inp} type="tel" placeholder="+252612345678" {...register('altPhone')} />
              </div>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="email">Email Address <span className={s.req}>*</span></label>
                <input id="email" className={`${s.inp}${errors.email ? ` ${s.err}` : ''}`}
                  type="email" autoComplete="email" placeholder="contact@company.com" {...register('email')} />
                {errors.email && <p className={s.ferr}>{errors.email.message}</p>}
              </div>
            </div>
          </section>

          {/* ── 03 Business Location ── */}
          <section id="location" className={s.sec}>
            <div className={s.secHead}>
              <span className={sectionDone(2) ? s.secBadgeDone : s.secBadge}>{sectionDone(2) ? '✓' : '03'}</span>
              <h2 className={s.secTitle}>Business Location</h2>
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
                  type="text" placeholder="e.g. Mogadishu" {...register('district')} />
                {errors.district && <p className={s.ferr}>{errors.district.message}</p>}
              </div>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="address">Physical Address <span className={s.opt}>optional</span></label>
                <input id="address" className={s.inp} type="text" placeholder="Street, building, area" {...register('address')} />
              </div>
            </div>
          </section>

          {/* ── 04 Export Details ── */}
          <section id="export" className={s.sec}>
            <div className={s.secHead}>
              <span className={sectionDone(3) ? s.secBadgeDone : s.secBadge}>{sectionDone(3) ? '✓' : '04'}</span>
              <h2 className={s.secTitle}>Export Details</h2>
              {sectionDone(3) && <span className={s.secDoneLabel}>Complete</span>}
            </div>

            <div className={s.f}>
              <label className={s.lbl}>Livestock Types Exported <span className={s.req}>*</span></label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
                {LIVESTOCK_TYPES.map(item => {
                  const selected = (values.livestock ?? []).includes(item);
                  return (
                    <button key={item} type="button"
                      onClick={() => toggleLivestock(item)}
                      style={{
                        padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                        fontFamily: 'inherit', cursor: 'pointer', transition: 'all 0.12s',
                        border: selected ? '2px solid #0b5ed7' : '2px solid #d1dce9',
                        background: selected ? '#edf5ff' : '#fff',
                        color: selected ? '#0b5ed7' : '#4b6280',
                      }}>
                      {selected && '✓ '}{item}
                    </button>
                  );
                })}
              </div>
              {errors.livestock && <p className={s.ferr}>{errors.livestock.message}</p>}
            </div>

            <div className={s.f} style={{ marginTop: 8 }}>
              <label className={s.lbl}>Destination Countries <span className={s.opt}>optional — select all that apply</span></label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
                {DEST_COUNTRIES.map(item => {
                  const selected = (values.destinations ?? []).includes(item);
                  return (
                    <button key={item} type="button"
                      onClick={() => toggleDest(item)}
                      style={{
                        padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        fontFamily: 'inherit', cursor: 'pointer', transition: 'all 0.12s',
                        border: selected ? '2px solid #0b5ed7' : '2px solid #d1dce9',
                        background: selected ? '#edf5ff' : '#fff',
                        color: selected ? '#0b5ed7' : '#4b6280',
                      }}>
                      {selected && '✓ '}{item}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ── 05 Account Security ── */}
          <section id="security" className={s.sec}>
            <div className={s.secHead}>
              <span className={sectionDone(4) ? s.secBadgeDone : s.secBadge}>{sectionDone(4) ? '✓' : '05'}</span>
              <h2 className={s.secTitle}>Account Security</h2>
              {sectionDone(4) && <span className={s.secDoneLabel}>Complete</span>}
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
              I confirm that all information provided is accurate, I am an authorised representative of the stated business,
              and I agree to the QXLITS Terms of Use, Privacy Policy, and Ministry of Livestock approval process.
            </span>
          </label>

          <div className={s.formSubmit}>
            <p className={s.terms}>
              By submitting this application you agree to the{' '}
              <Link to="/terms" target="_blank" rel="noopener noreferrer" className={s.termsLink}>QXLITS Terms of Use &amp; Privacy Policy</Link>.
              Your business information will be processed by the Federal Government of Somalia Ministry of Livestock, Forestry and Range.
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

export default ExporterRegisterPage;
