import React, { useRef, useState } from 'react';
import { CreditCard, BookOpen } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { uploadFarmerFile } from './auth.supabase';
import s from './register.module.css';

const REGIONS = [
  'Awdal','Bakool','Banaadir','Bari','Bay','Galguduud','Gedo','Hiiraan',
  'Jubbada Dhexe','Jubbada Hoose','Mudug','Nugaal','Sanaag',
  'Shabeellaha Dhexe','Shabeellaha Hoose','Sool','Togdheer','Woqooyi Galbeed',
];

const DISTRICTS = [
  'Abdal Aziz','Afgooye','Afmadow','Abudwak',
  'Badhaadhe','Baidoa','Baki','Balcad','Baardheere','Bandarbeyla','Baraawe','Belet Weyne',
  'Beled Hawo','Borama','Bosaso','Bondhere','Burao','Bulo Burte','Buur Hakaba','Burtinle',
  'Ceel Afweyn','Ceel Barde','Ceel Buur','Ceel Dheer','Ceel Waaq','Ceerigaavo',
  'Daynile','Dharkenley','Diinsoor','Dhusamareeb','Doolow',
  'Eyl',
  'Gabiley','Gaalkacyo','Garbahaarey',
  'Hargeisa','Hawl Wadag','Heliwa','Hobyo','Hodan','Howlwadag',
  'Iskushuban',
  'Jalalaqsi','Jamame','Jariban','Jilib','Jowhar',
  'Kahda','Karaan','Kismayo','Kolbiyo','Kurtunwaarey',
  'Laas Caanood','Laasqoray','Luuq','Lughaye',
  'Mahas','Mahaday','Marka',
  'Oddur','Owdweyne',
  'Qandala','Qansahdhere','Qardho','Qoryooley',
  'Rab Dhuure',
  'Saakow','Sabiid','Shangani','Shibis',
  'Taleh','Tayeeglow',
  'Wadajir','Wajid','Wanlaweyn','Warta Nabadda',
  'Xarardheere','Xudun',
  'Yaaqshiid',
  'Zeylac',
];

const schema = z.object({
  nationalId:      z.string().min(5,'National ID is required').max(30),
  idType:          z.enum(['NATIONAL_ID','PASSPORT'],{message:'Please select ID type'}),
  accountType:     z.enum(['INDIVIDUAL','COMPANY'],{message:'Please select an account type'}),
  companyName:     z.string().max(200).optional(),
  licenseNumber:   z.string().max(100).optional(),
  companyAddress:  z.string().max(300).optional(),
  fullName:        z.string().min(3,'Full name must be at least 3 characters').max(100),
  dateOfBirth:     z.string().min(1,'Date of birth is required'),
  gender:          z.enum(['MALE','FEMALE','OTHER'],{message:'Please select a gender'}),
  phoneE164:       z.string().min(6,'Phone number is required'),
  altPhone:        z.string().min(6,'Enter a valid phone number').or(z.literal('')).optional(),
  email:           z.string().email('Enter a valid email address').min(1,'Email is required'),
  region:          z.string().min(1,'Please select your region'),
  village:         z.string().max(100).optional(),
  password:        z.string().min(8,'Password must be at least 8 characters'),
  confirmPassword: z.string(),
})
.refine(d=>d.password===d.confirmPassword,{message:'Passwords do not match',path:['confirmPassword']})
.refine(d=>d.accountType!=='COMPANY'||!!d.companyName?.trim(),{message:'Company name is required',path:['companyName']})
.refine(d=>d.accountType!=='COMPANY'||!!d.licenseNumber?.trim(),{message:'Business licence number is required',path:['licenseNumber']})
.refine(d=>d.accountType!=='COMPANY'||!!d.companyAddress?.trim(),{message:'Company address is required',path:['companyAddress']});

type FormData = z.infer<typeof schema>;

const NAV_SECTIONS = [
  {id:'identity',     label:'Identity Documents'},
  {id:'account-type', label:'Account Type'},
  {id:'personal',     label:'Authorized Representative'},
  {id:'contact',      label:'Contact Info'},
  {id:'location',     label:'Location'},
  {id:'security',     label:'Accounts'},
];

const SECTION_REQUIRED: (keyof FormData)[][] = [
  ['nationalId', 'idType'],
  ['accountType'],
  ['fullName', 'dateOfBirth', 'gender'],
  ['phoneE164'],
  ['region'],
  ['email', 'password', 'confirmPassword'],
];


function readAsDataURL(file: File): Promise<string> {
  return new Promise(res => {
    const r = new FileReader();
    r.onload = e => res(e.target?.result as string);
    r.readAsDataURL(file);
  });
}

export function RegisterPage(): JSX.Element {
  const navigate = useNavigate();
  const [serverError,    setServerError]    = useState<string|null>(null);
  const [showPwd,        setShowPwd]        = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  // Profile photo
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string|null>(null);
  const [photoFile,    setPhotoFile]    = useState<File|null>(null);

  // ID documents
  const idFrontRef = useRef<HTMLInputElement>(null);
  const idBackRef  = useRef<HTMLInputElement>(null);
  const [idFrontPreview, setIdFrontPreview] = useState<string|null>(null);
  const [idBackPreview,  setIdBackPreview]  = useState<string|null>(null);
  const [idFrontFile,    setIdFrontFile]    = useState<File|null>(null);
  const [idBackFile,     setIdBackFile]     = useState<File|null>(null);

  // Company documents
  const licenseRef      = useRef<HTMLInputElement>(null);
  const addrProofRef    = useRef<HTMLInputElement>(null);
  const [licenseFile,      setLicenseFile]      = useState<File|null>(null);
  const [addrProofFile,    setAddrProofFile]    = useState<File|null>(null);
  const [licenseFileName,  setLicenseFileName]  = useState<string|null>(null);
  const [addrProofFileName,setAddrProofFileName]= useState<string|null>(null);

  const [agreed,      setAgreed]      = useState(false);
  const [declaredAuth, setDeclaredAuth] = useState(false);
  const [showIdModal, setShowIdModal] = useState(true);

  // Modal-local fields
  const [mIdType,   setMIdType]   = useState('');
  const [mIdNumber, setMIdNumber] = useState('');
  const [mIdName,   setMIdName]   = useState('');

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(await readAsDataURL(file));
  };

  const handleIdFront = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setIdFrontFile(file);
    setIdFrontPreview(await readAsDataURL(file));
  };

  const handleIdBack = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setIdBackFile(file);
    setIdBackPreview(await readAsDataURL(file));
  };

  const {register, handleSubmit, watch, setValue, formState:{errors,isSubmitting}} =
    useForm<FormData>({resolver: zodResolver(schema), mode: 'onBlur'});

  const handleModalContinue = () => {
    if (mIdName)   setValue('fullName',   mIdName,   {shouldValidate: true});
    if (mIdType)   setValue('idType',     mIdType as FormData['idType'],   {shouldValidate: true});
    if (mIdNumber) setValue('nationalId', mIdNumber, {shouldValidate: true});
    setShowIdModal(false);
  };

  const values = watch();
  const sectionDone = (idx: number) =>
    SECTION_REQUIRED[idx].every(k => {
      const v = values[k as keyof FormData];
      return v !== undefined && v !== '' && !errors[k as keyof FormData];
    });

  const onSubmit = async (data: FormData) => {
    if (!agreed) return;
    setServerError(null);
    try {
      const folder = data.phoneE164.replace('+', '');
      const [photoUrl, idFrontUrl, idBackUrl, licenseUrl, addrProofUrl] = await Promise.all([
        photoFile      ? uploadFarmerFile(photoFile,      `${folder}/photo`)        : Promise.resolve(undefined),
        idFrontFile    ? uploadFarmerFile(idFrontFile,    `${folder}/id-front`)     : Promise.resolve(undefined),
        idBackFile     ? uploadFarmerFile(idBackFile,     `${folder}/id-back`)      : Promise.resolve(undefined),
        licenseFile    ? uploadFarmerFile(licenseFile,    `${folder}/license`)      : Promise.resolve(undefined),
        addrProofFile  ? uploadFarmerFile(addrProofFile,  `${folder}/addr-proof`)   : Promise.resolve(undefined),
      ]);
      sessionStorage.setItem('pendingFarmer', JSON.stringify({
        accountType:    data.accountType,
        companyName:    data.companyName    || undefined,
        licenseNumber:  data.licenseNumber  || undefined,
        companyAddress: data.companyAddress || undefined,
        licenseUrl,
        addrProofUrl,
        fullName:    data.fullName,
        dateOfBirth: data.dateOfBirth,
        gender:      data.gender,
        phoneE164:   data.phoneE164,
        altPhone:    data.altPhone   || undefined,
        email:       data.email      || undefined,
        nationalId:  data.nationalId,
        idType:      data.idType,
        region:      data.region,
        village:     data.village    || undefined,
        password:    data.password,
        photoUrl,
        idFrontUrl,
        idBackUrl,
      }));
      navigate(`/verify-otp?phoneLast4=${data.phoneE164.slice(-4)}`);
    } catch(err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Failed to prepare registration. Please try again.');
    }
  };

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({behavior:'smooth', block:'start'});

  return (
    <div className={s.page}>

      {/* ── ID modal (full-screen, OTP style) ── */}
      {showIdModal && (
        <div className={s.modalOverlay}>
          <div className={s.modalSplit}>

            {/* Left hero */}
            <aside className={s.modalHero}>
              <div className={s.modalHeroLogo}>
                <div className={s.modalHeroMark}>S</div>
                <div>
                  <div className={s.modalHeroName}>QXLITS</div>
                  <div className={s.modalHeroSub}>Livestock Identification</div>
                </div>
              </div>
              <h2 className={s.modalHeroTitle}>
                Start with your<br/>
                <span className={s.modalHeroAccent}>Identity Document</span>
              </h2>
              <p className={s.modalHeroDesc}>
                We verify your ID to ensure every farmer account is legitimate and traceable.
                Your information is protected under the national data framework.
              </p>
              <div className={s.modalHeroSteps}>
                {[
                  ['🪪','Scan your ID','Upload front and back of your identity document'],
                  ['✍️','Confirm details','Your name and ID number are read from the card'],
                  ['📝','Complete form','Finish the registration form with pre-filled details'],
                  ['✅','Verify phone','Enter the OTP code to activate your account'],
                ].map(([ico,title,sub])=>(
                  <div key={title} className={s.modalHeroStep}>
                    <div className={s.modalHeroStepIco}>{ico}</div>
                    <div>
                      <div className={s.modalHeroStepTitle}>{title}</div>
                      <div className={s.modalHeroStepSub}>{sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </aside>

            {/* Right form */}
            <div className={s.modalPanel}>
              <button
                type="button"
                className={s.modalCloseBtn}
                onClick={() => setShowIdModal(false)}
                aria-label="Close"
              >
                ✕
              </button>
              <div className={s.modalBrand}>
                <div className={s.modalMark}>S</div>
                <div>
                  <div className={s.modalBrandName}>QXLITS</div>
                  <div className={s.modalBrandSub}>Authorized Representative</div>
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ background: '#dbeafe', padding: '0.625rem 1rem', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1.5px solid #bcd4f5', borderBottom: 'none' }}>
                  <span>🔏</span>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#1e40af', letterSpacing: '0.03em' }}>Authorization Declaration</span>
                </div>
                <div style={{ background: '#f0f6ff', border: '1.5px solid #bcd4f5', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '0.875rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <input type="checkbox" checked={declaredAuth} onChange={e => setDeclaredAuth(e.target.checked)} style={{ marginTop: '3px', flexShrink: 0, accentColor: '#0b5ed7', width: 15, height: 15 }}/>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#334155', lineHeight: 1.55 }}>
                      I confirm that I am an authorised representative with the legal authority to create and manage this account on behalf of my company or organisation, and that all information I provide is accurate and truthful.
                    </p>
                  </div>
                </div>
              </div>

              <h2 className={s.modalTitle}>Identity Verification</h2>
              <p className={s.modalSub}>Select your ID type, enter details, then upload photos of your document.</p>

              {/* 1 — ID Type cards */}
              <div className={s.mf}>
                <label className={s.mlbl}>ID Type <span className={s.req}>*</span></label>
                <div className={s.idTypeGrid}>
                  {([
                    ['NATIONAL_ID', <CreditCard size={32} strokeWidth={1.5}/>, 'National ID',  'Somali National ID Card'],
                    ['PASSPORT',    <BookOpen   size={32} strokeWidth={1.5}/>, 'Passport',     'International Passport'],
                  ] as [string, React.ReactNode, string, string][]).map(([val,ico,name,sub])=>(
                    <button key={val} type="button"
                      className={`${s.idTypeCard}${mIdType===val?' '+s.idTypeCardActive:''}`}
                      onClick={()=>setMIdType(val as string)}>
                      <span className={s.idTypeIco}>{ico}</span>
                      <span className={s.idTypeName}>{name as string}</span>
                      <span className={s.idTypeSub}>{sub as string}</span>
                      {mIdType===val && <span className={s.idTypeCheck}>✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2 — Reference / ID Number */}
              <div className={s.mf}>
                <label className={s.mlbl}>
                  {mIdType === 'PASSPORT' ? 'Passport Number' : 'ID Reference Number'}{' '}
                  <span className={s.req}>*</span>
                </label>
                <input className={s.minp} type="text"
                  value={mIdNumber} onChange={e=>setMIdNumber(e.target.value)}/>
              </div>

              {/* 3 — Name on ID */}
              <div className={s.mf}>
                <label className={s.mlbl}>Full Name (as on ID) <span className={s.req}>*</span></label>
                <input className={s.minp} type="text"
                  value={mIdName} onChange={e=>setMIdName(e.target.value)}/>
              </div>

              {/* 4 — Document photos */}
              <div className={s.mf}>
                <label className={s.mlbl}>Document Photos <span className={s.opt}>(optional)</span></label>
                <div className={s.idPhotoRow}>
                  <div className={`${s.idPhotoBox}${idFrontPreview?' '+s.idPhotoBoxFilled:''}`}
                    onClick={()=>idFrontRef.current?.click()}>
                    {idFrontPreview
                      ? <img src={idFrontPreview} alt="Front" className={s.idPhotoImg}/>
                      : <div className={s.idPhotoEmpty}>
                          <span className={s.idPhotoIco}>🪪</span>
                          <span className={s.idPhotoLbl}>Front</span>
                          <span className={s.idPhotoHint}>Tap to upload</span>
                        </div>
                    }
                    <div className={s.idPhotoTag}>Front</div>
                  </div>
                  <div className={`${s.idPhotoBox}${idBackPreview?' '+s.idPhotoBoxFilled:''}`}
                    onClick={()=>idBackRef.current?.click()}>
                    {idBackPreview
                      ? <img src={idBackPreview} alt="Back" className={s.idPhotoImg}/>
                      : <div className={s.idPhotoEmpty}>
                          <span className={s.idPhotoIco}>🪪</span>
                          <span className={s.idPhotoLbl}>Back</span>
                          <span className={s.idPhotoHint}>Tap to upload</span>
                        </div>
                    }
                    <div className={s.idPhotoTag}>Back</div>
                  </div>
                  <input ref={idFrontRef} type="file" accept="image/*,.pdf" style={{display:'none'}} onChange={handleIdFront}/>
                  <input ref={idBackRef}  type="file" accept="image/*,.pdf" style={{display:'none'}} onChange={handleIdBack}/>
                </div>
              </div>

              <button type="button" className={s.modalBtn} onClick={handleModalContinue}
                disabled={!mIdType || !mIdNumber || !mIdName || !declaredAuth}>
                Continue to Registration →
              </button>
            </div>

          </div>
        </div>
      )}

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
            <input className={s.searchInput} type="search" placeholder="Search QXLITS…" aria-label="Search"/>
          </div>
        </div>
        <div className={s.topRight}>
          <a className={s.topLink} href="#">About QXLITS</a>
          <a className={s.topLink} href="#">Farmer Guides</a>
          <a className={s.topLink} href="#">Contact Ministry</a>
          <select className={s.langSelect} aria-label="Language">
            <option>English</option><option>Somali</option><option>Arabic</option>
          </select>
          <a className={s.helpLink} href="#">Help &amp; Support</a>
        </div>
      </header>

      <div className={s.layout}>

        {/* ── Sidebar ── */}
        <aside className={s.sidebar}>
          <div className={s.sideInner}>
            <div className={s.sideBrand}>
              <div className={s.sideMark}>S</div>
              <div>
                <div className={s.sideName}>QXLITS</div>
                <div className={s.sideSub}>Farmer Registration</div>
              </div>
            </div>
            <div className={s.sideBlock}>
              <div className={s.sideBlockTitle}>Form Sections</div>
              <nav className={s.sideNav}>
                {NAV_SECTIONS.map((sec,i) => {
                  const done = sectionDone(i);
                  return (
                    <button key={sec.id} type="button"
                      className={`${s.sideNavBtn}${done ? ` ${s.sideNavBtnDone}` : ''}`}
                      onClick={()=>scrollTo(sec.id)}>
                      <span className={done ? s.sideNavNumDone : s.sideNavNum}>
                        {done ? '✓' : i+1}
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
                <li><div className={s.stepsNum}>1</div><div><strong>Verify your phone</strong><span>Enter the OTP code sent to your number</span></div></li>
                <li><div className={s.stepsNum}>2</div><div><strong>Ministry review</strong><span>Your application is reviewed within 1–3 working days</span></div></li>
                <li><div className={s.stepsNum}>3</div><div><strong>Account activated</strong><span>You receive an SMS confirmation when approved</span></div></li>
                <li><div className={s.stepsNum}>4</div><div><strong>Register your livestock</strong><span>Add animals, premises and apply for movement permits</span></div></li>
              </ol>
            </div>
            <div className={s.sideHelp}>
              <span className={s.sideHelpIcon}>ℹ️</span>
              <span>Need help? Call the QXLITS farmer helpline or visit your nearest district livestock office.</span>
            </div>
            <div className={s.sideFooter}>
              Already have an account?{' '}
              <Link to="/login" className={s.sideLink}>Sign in here</Link>
            </div>
          </div>
        </aside>

        {/* ── Main form ── */}
        <form className={s.main} onSubmit={handleSubmit(onSubmit)} noValidate>

          {serverError && (
            <div className={s.errorBox} role="alert"><span>&#9888;</span> {serverError}</div>
          )}

          {/* ── Profile Photo ── */}
          <div className={s.sec} style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div className={s.photoBox} onClick={() => photoInputRef.current?.click()} style={{ flexShrink: 0 }}>
              {photoPreview
                ? <img src={photoPreview} alt="Preview" className={s.photoImg}/>
                : <><div className={s.photoIconWrap}>📷</div><span className={s.photoLabel}>Upload</span></>
              }
            </div>
            <input ref={photoInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={handlePhotoChange}/>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#10213a', marginBottom: '0.3rem' }}>Profile Photo or Company Logo</div>
              <div style={{ fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.5 }}>
                Optional — upload a clear photo of yourself, or your company logo if registering as a company.
              </div>
              <button type="button" onClick={() => photoInputRef.current?.click()}
                style={{ marginTop: '0.625rem', fontSize: '0.8125rem', fontWeight: 600, color: '#0b5ed7', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                {photoPreview ? 'Change photo →' : 'Choose file →'}
              </button>
            </div>
          </div>

          {/* ── 01 Identity Documents ── */}
          <section id="identity" className={s.sec}>
            <div className={s.secHead}>
              <span className={sectionDone(0) ? s.secBadgeDone : s.secBadge}>
                {sectionDone(0) ? '✓' : '01'}
              </span>
              <h2 className={s.secTitle}>Identity Documents</h2>
              {sectionDone(0) && <span className={s.secDoneLabel}>Complete</span>}
            </div>
            {/* Values captured in modal — shown as read-only summary */}
            <div className={s.idSummary}>
              <div className={s.idSummaryItem}>
                <span className={s.idSummaryLabel}>ID Type</span>
                <span className={s.idSummaryValue}>{mIdType ? mIdType.replace(/_/g,' ') : '—'}</span>
              </div>
              <div className={s.idSummaryItem}>
                <span className={s.idSummaryLabel}>ID Number</span>
                <span className={s.idSummaryValue}>{mIdNumber || '—'}</span>
              </div>
              <button type="button" className={s.idSummaryEdit} onClick={()=>setShowIdModal(true)}>
                Edit
              </button>
            </div>
            {/* Hidden inputs so react-hook-form includes these values on submit */}
            <input type="hidden" {...register('idType')} />
            <input type="hidden" {...register('nationalId')} />

          </section>

          {/* ── 02 Account Type ── */}
          <section id="account-type" className={s.sec}>
            <div className={s.secHead}>
              <span className={sectionDone(1) ? s.secBadgeDone : s.secBadge}>
                {sectionDone(1) ? '✓' : '02'}
              </span>
              <h2 className={s.secTitle}>Account Type</h2>
              {sectionDone(1) && <span className={s.secDoneLabel}>Complete</span>}
            </div>

            <div className={s.f}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.375rem' }}>
                {[
                  { value: 'INDIVIDUAL', label: 'Individual', icon: '👤', desc: 'A single farmer or livestock owner registering under your own name.' },
                  { value: 'COMPANY',    label: 'Company',    icon: '🏢', desc: 'A registered business, cooperative, or organisation owning livestock.' },
                ].map(opt => {
                  const sel = watch('accountType') === opt.value;
                  return (
                    <label key={opt.value} style={{
                      display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                      border: `2px solid ${sel ? '#0b5ed7' : '#e2eaf4'}`,
                      borderRadius: 10, padding: '1rem',
                      cursor: 'pointer', background: sel ? '#f0f6ff' : '#fff',
                      transition: 'border-color 0.15s, background 0.15s',
                    }}>
                      <input type="radio" value={opt.value} {...register('accountType')} style={{ display: 'none' }}/>
                      <span style={{ fontSize: '1.75rem', lineHeight: 1, flexShrink: 0 }}>{opt.icon}</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: sel ? '#0b5ed7' : '#0f172a' }}>{opt.label}</span>
                        <span style={{ fontSize: '0.6875rem', color: '#64748b', lineHeight: 1.4 }}>{opt.desc}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
              {errors.accountType && <p className={s.ferr}>{errors.accountType.message}</p>}
            </div>

            {/* Company details — shown only when accountType === COMPANY */}
            {watch('accountType') === 'COMPANY' && (
              <div style={{ background: '#f0f6ff', border: '1.5px solid #bcd4f5', borderRadius: 12, padding: '1.25rem 1.25rem 1rem', marginTop: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#0b5ed7', marginBottom: '1rem' }}>
                  🏢 Company Details
                </div>
                <div className={s.f} style={{ marginBottom: '0.875rem' }}>
                  <label className={s.lbl} htmlFor="companyName">Company / Organisation Name <span className={s.req}>*</span></label>
                  <input id="companyName" className={`${s.inp}${errors.companyName?` ${s.err}`:''}`}
                    type="text" {...register('companyName')}/>
                  {errors.companyName && <p className={s.ferr}>{errors.companyName.message}</p>}
                </div>
                <div className={s.grid2} style={{ marginBottom: '0.875rem' }}>
                  <div className={s.f}>
                    <label className={s.lbl} htmlFor="licenseNumber">Business Licence Number <span className={s.req}>*</span></label>
                    <input id="licenseNumber" className={`${s.inp}${errors.licenseNumber?` ${s.err}`:''}`}
                      type="text" {...register('licenseNumber')}/>
                    {errors.licenseNumber && <p className={s.ferr}>{errors.licenseNumber.message}</p>}
                  </div>
                  <div className={s.f}>
                    <label className={s.lbl}>Licence Document <span className={s.opt}>optional</span></label>
                    <div
                      onClick={() => licenseRef.current?.click()}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', border: '1.5px dashed #93c5fd', borderRadius: 8, padding: '0.6rem 0.875rem', cursor: 'pointer', background: '#fff', fontSize: '0.8125rem', color: '#3b82f6' }}>
                      📎 {licenseFileName ?? 'Upload licence (PDF / image)'}
                    </div>
                    <input ref={licenseRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) { setLicenseFile(f); setLicenseFileName(f.name); } }}/>
                  </div>
                </div>
                <div className={s.f}>
                  <label className={s.lbl} htmlFor="companyAddress">Company Address <span className={s.req}>*</span></label>
                  <input id="companyAddress" className={`${s.inp}${errors.companyAddress?` ${s.err}`:''}`}
                    type="text" {...register('companyAddress')}/>
                  {errors.companyAddress && <p className={s.ferr}>{errors.companyAddress.message}</p>}
                </div>
              </div>
            )}
          </section>

          {/* ── 03 Personal Details ── */}
          <section id="personal" className={s.sec}>
            <div className={s.secHead}>
              <span className={sectionDone(2) ? s.secBadgeDone : s.secBadge}>
                {sectionDone(2) ? '✓' : '03'}
              </span>
              <h2 className={s.secTitle}>Authorized Representative</h2>
              {sectionDone(2) && <span className={s.secDoneLabel}>Complete</span>}
            </div>

            <div className={s.f}>
              <label className={s.lbl} htmlFor="fullName">Full Name (as on ID) <span className={s.req}>*</span></label>
              <input id="fullName" className={`${s.inp}${errors.fullName?` ${s.err}`:''}`}
                type="text" autoComplete="name" placeholder="Hassan Mohamed Ali" {...register('fullName')}/>
              {errors.fullName && <p className={s.ferr}>{errors.fullName.message}</p>}
            </div>
            <div className={s.grid2}>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="dateOfBirth">Date of Birth <span className={s.req}>*</span></label>
                <input id="dateOfBirth" className={`${s.inp}${errors.dateOfBirth?` ${s.err}`:''}`}
                  type="date" max={new Date().toISOString().split('T')[0]} {...register('dateOfBirth')}/>
                {errors.dateOfBirth && <p className={s.ferr}>{errors.dateOfBirth.message}</p>}
              </div>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="gender">Gender <span className={s.req}>*</span></label>
                <select id="gender" className={`${s.sel}${errors.gender?` ${s.err}`:''}`} {...register('gender')}>
                  <option value="">Select…</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Prefer not to say</option>
                </select>
                {errors.gender && <p className={s.ferr}>{errors.gender.message}</p>}
              </div>
            </div>

          </section>

          {/* ── 04 Contact ── */}
          <section id="contact" className={s.sec}>
            <div className={s.secHead}>
              <span className={sectionDone(3) ? s.secBadgeDone : s.secBadge}>
                {sectionDone(3) ? '✓' : '04'}
              </span>
              <h2 className={s.secTitle}>Contact Information</h2>
              {sectionDone(3) && <span className={s.secDoneLabel}>Complete</span>}
            </div>
            <div className={s.grid2}>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="phoneE164">Primary Phone <span className={s.req}>*</span></label>
                <input id="phoneE164" className={`${s.inp}${errors.phoneE164?` ${s.err}`:''}`}
                  type="tel" autoComplete="tel" placeholder="+252612345678" {...register('phoneE164')}/>
                {errors.phoneE164 && <p className={s.ferr}>{errors.phoneE164.message}</p>}
              </div>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="altPhone">Alternative Phone <span className={s.opt}>optional</span></label>
                <input id="altPhone" className={`${s.inp}${errors.altPhone?` ${s.err}`:''}`}
                  type="tel" placeholder="+252612345678" {...register('altPhone')}/>
                {errors.altPhone && <p className={s.ferr}>{errors.altPhone.message}</p>}
              </div>
            </div>
          </section>

          {/* ── 05 Location ── */}
          <section id="location" className={s.sec}>
            <div className={s.secHead}>
              <span className={sectionDone(4) ? s.secBadgeDone : s.secBadge}>
                {sectionDone(4) ? '✓' : '05'}
              </span>
              <h2 className={s.secTitle}>Location</h2>
              {sectionDone(4) && <span className={s.secDoneLabel}>Complete</span>}
            </div>
            <div className={s.grid2}>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="region">Region <span className={s.req}>*</span></label>
                <select id="region" className={`${s.sel}${errors.region?` ${s.err}`:''}`} {...register('region')}>
                  <option value="">Select region…</option>
                  {REGIONS.map(r=><option key={r} value={r}>{r}</option>)}
                </select>
                {errors.region && <p className={s.ferr}>{errors.region.message}</p>}
              </div>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="village">Village / Settlement <span className={s.opt}>optional</span></label>
                <input id="village" className={s.inp} type="text" placeholder="e.g. Bulo Burte" {...register('village')}/>
              </div>
            </div>
          </section>

          {/* ── 06 Accounts ── */}
          <section id="security" className={s.sec}>
            <div className={s.secHead}>
              <span className={sectionDone(5) ? s.secBadgeDone : s.secBadge}>
                {sectionDone(5) ? '✓' : '06'}
              </span>
              <h2 className={s.secTitle}>Accounts</h2>
              {sectionDone(5) && <span className={s.secDoneLabel}>Complete</span>}
            </div>
            <div className={s.f} style={{ marginBottom: '1.25rem' }}>
              <label className={s.lbl} htmlFor="email">Email Address <span className={s.req}>*</span></label>
              <input id="email" className={`${s.inp}${errors.email?` ${s.err}`:''}`}
                type="email" autoComplete="email" placeholder="example@email.com" {...register('email')}/>
              {errors.email && <p className={s.ferr}>{errors.email.message}</p>}
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.375rem', lineHeight: 1.4 }}>
                This email will be your sign-in username. Use a valid, accessible address — you cannot log in without it.
              </p>
            </div>
            <div className={s.grid2}>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="password">Password <span className={s.req}>*</span></label>
                <div className={s.pw}>
                  <input id="password" className={`${s.inp}${errors.password?` ${s.err}`:''}`}
                    type={showPwd?'text':'password'} autoComplete="new-password"
                    placeholder="At least 8 characters" {...register('password')}/>
                  <button type="button" className={s.showBtn} onClick={()=>setShowPwd(v=>!v)}>
                    {showPwd?'Hide':'Show'}
                  </button>
                </div>
                {errors.password && <p className={s.ferr}>{errors.password.message}</p>}
              </div>
              <div className={s.f}>
                <label className={s.lbl} htmlFor="confirmPassword">Confirm Password <span className={s.req}>*</span></label>
                <div className={s.pw}>
                  <input id="confirmPassword" className={`${s.inp}${errors.confirmPassword?` ${s.err}`:''}`}
                    type={showConfirmPwd?'text':'password'} autoComplete="new-password"
                    placeholder="Repeat your password" {...register('confirmPassword')}/>
                  <button type="button" className={s.showBtn} onClick={()=>setShowConfirmPwd(v=>!v)}>
                    {showConfirmPwd?'Hide':'Show'}
                  </button>
                </div>
                {errors.confirmPassword && <p className={s.ferr}>{errors.confirmPassword.message}</p>}
              </div>
            </div>
          </section>

          {/* ── Pre-submit confirmation ── */}
          <label className={`${s.checkItem}${agreed?' '+s.checkItemDone:''}`} style={{margin:'8px 0'}}>
            <input type="checkbox" className={s.checkBox} checked={agreed} onChange={e=>setAgreed(e.target.checked)}/>
            <span className={s.checkMark}>{agreed?'✓':''}</span>
            <span className={s.checkText}>
              I confirm all information is accurate, I am the legitimate owner of the submitted ID,
              and I agree to the QXLITS Terms of Use, Privacy Policy, and Ministry of Livestock approval process.
            </span>
          </label>

          <div className={s.formSubmit}>
            <p className={s.terms}>
              By creating an account you agree to the{' '}
              <Link to="/terms" target="_blank" rel="noopener noreferrer" className={s.termsLink}>QXLITS Terms of Use &amp; Privacy Policy</Link>.
              Your information will be processed by the Federal Government of Somalia
              Ministry of Livestock, Forestry and Range.
            </p>
            <div className={s.submitRow}>
              <button type="submit" className={`${s.submitBtn}${!agreed?' '+s.submitBtnDisabled:''}`}
                disabled={isSubmitting || !agreed}>
                {isSubmitting ? 'Preparing…' : 'Create Account →'}
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

export default RegisterPage;
