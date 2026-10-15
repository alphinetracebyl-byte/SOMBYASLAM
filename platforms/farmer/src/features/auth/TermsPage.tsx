import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import s from './terms.module.css';

type Tab = 'terms' | 'privacy';

const TERMS_SECTIONS = [
  {
    num: '01', title: 'Introduction',
    body: `QXLITS — the Somalia Livestock Identification and Traceability System — is an official digital platform operated by the Ministry of Livestock, Forestry and Range of the Federal Government of Somalia. It enables livestock owners, farmers, veterinary officers, field staff and other authorised persons to register animals, manage livestock records, apply for movement permits, access veterinary services and participate in national livestock data programmes.

These Terms of Use govern your access to and use of the QXLITS platform, including all web portals, mobile applications and associated services. By registering an account or using the platform, you confirm that you have read, understood and agreed to these Terms.`,
  },
  {
    num: '02', title: 'Definitions',
    items: [
      { term: 'Platform', def: 'The QXLITS web portals, mobile applications and any related digital services.' },
      { term: 'Ministry', def: 'The Ministry of Livestock, Forestry and Range of the Federal Government of Somalia.' },
      { term: 'User', def: 'Any person who registers for or accesses the platform, including farmers, field officers and ministry personnel.' },
      { term: 'Animal Record', def: 'Any data stored in QXLITS relating to the identification, health, movement or ownership of a specific animal.' },
      { term: 'Official Tag', def: 'An ear tag or other identification device issued under the authority of the Ministry.' },
      { term: 'Movement Permit', def: 'An official document authorising the movement of livestock between premises or across administrative boundaries.' },
    ],
  },
  {
    num: '03', title: 'Acceptance of Terms',
    body: `By clicking Create Account or by accessing any part of the QXLITS platform, you confirm that you have read and understood these Terms; you agree to be legally bound by them; and you confirm that all information you provide during registration is accurate, current and complete. You understand that providing false information may result in account suspension and referral to relevant authorities.

If you do not agree with any part of these Terms, you must not register for or use the platform.`,
  },
  {
    num: '04', title: 'User Eligibility',
    body: 'To register for a QXLITS farmer account you must be at least 18 years of age, be a resident of Somalia or hold recognised legal status to engage in livestock activities in Somalia, possess a valid Somali National ID, Passport, Refugee Card or Birth Certificate, and provide a valid Somali mobile phone number for account verification. The Ministry reserves the right to require additional verification documents from any user at any time.',
  },
  {
    num: '05', title: 'Account Registration',
    body: `When registering a QXLITS account, you agree to provide your full legal name as it appears on your official identification document; submit accurate location details for your principal premises or place of residence; keep your login credentials confidential and not share them with any other person; and notify the Ministry immediately if you believe your account has been accessed without authorisation.

Each individual or legal entity may hold only one farmer account. The Ministry may deactivate duplicate or fraudulent accounts without prior notice.`,
  },
  {
    num: '06', title: 'Permitted and Prohibited Use',
    permitted: [
      'Registering your livestock with official government identification tags.',
      'Submitting animal photographs for ministry verification.',
      'Applying for movement permits and veterinary health certificates.',
      'Viewing and managing your own animal records, health events and premises.',
      'Receiving notifications regarding livestock regulations, vaccination campaigns and disease alerts.',
    ],
    prohibited: [
      'Registering animals that you do not own or are not authorised to manage.',
      'Submitting false, misleading or fabricated records of any kind.',
      'Attempting to access, modify or delete records belonging to another user.',
      'Using the platform to facilitate illegal livestock trade or animal smuggling.',
      'Sharing your account credentials with any third party.',
      'Using automated scripts or bots without written Ministry approval.',
    ],
  },
  {
    num: '07', title: 'Livestock Data and Records',
    body: `All animal records created in QXLITS are official government records. Animal registration data, movement history, health records and tag assignments are permanent records and cannot be physically deleted. Ownership transfers, premises changes and tag replacements are tracked with full audit history. Completed movement records cannot be altered after confirmation.

The Ministry may access, audit and use your livestock data for national traceability, disease control and regulatory purposes. Data may be shared with veterinary authorities, border agencies and international livestock bodies as required by law or treaty.`,
  },
  {
    num: '08', title: 'Disclaimer and Limitation of Liability',
    body: `The QXLITS platform is provided on an "as is" basis for official government use. While the Ministry takes all reasonable steps to ensure accuracy and availability, it does not warrant that the platform will be uninterrupted or error-free, that all data is free from transmission errors, or that the platform will be available during maintenance windows.

To the maximum extent permitted by law, the Ministry shall not be liable for any indirect, incidental or consequential loss arising from your use of the platform, including loss of livestock value, loss of business opportunity or reliance on inaccurate data entries made by users.`,
  },
  {
    num: '09', title: 'Amendments and Governing Law',
    body: `The Ministry reserves the right to amend these Terms at any time. Where changes are material, registered users will be notified by SMS or platform notification at least 14 days before the changes take effect. Continued use after the effective date constitutes acceptance of the updated Terms.

These Terms are governed by the laws of the Federal Republic of Somalia. Any disputes arising from the use of the QXLITS platform shall be subject to the exclusive jurisdiction of the competent courts of Somalia.`,
  },
];

const PRIVACY_SECTIONS = [
  {
    num: '01', title: 'About This Policy',
    body: `The Ministry of Livestock, Forestry and Range is committed to protecting the personal information of QXLITS users. This Privacy Policy explains what data we collect, how we use it, who we share it with and what rights you have. Your data is processed in accordance with the national data protection framework of the Federal Government of Somalia.

This Policy applies to all users of the QXLITS platform, including farmers, field officers, ministry personnel and any other persons who interact with the platform or its associated services.`,
  },
  {
    num: '02', title: 'What We Collect',
    items: [
      { term: 'Identity', def: 'Full name, date of birth, gender, national ID number and ID document type.' },
      { term: 'Contact', def: 'Primary phone number, alternative phone and email address.' },
      { term: 'Location', def: 'Region, district, village and optional GPS coordinates for your registered premises.' },
      { term: 'Livestock records', def: 'Animal species, breed, tag numbers, health events, movement history and ownership history.' },
      { term: 'Documents', def: 'Photographs of identity documents and animal images uploaded for verification.' },
      { term: 'Technical data', def: 'IP address, browser type, device identifiers and session timestamps for security and audit purposes.' },
    ],
  },
  {
    num: '03', title: 'How We Use Your Data',
    body: `We use your personal information to verify your identity and activate your account; to maintain official national livestock records as required by Somali law; to issue movement permits, health certificates and other regulatory documents; to send you important notifications about your livestock, regulatory changes and disease alerts; and to produce national livestock statistics and policy reports in anonymised or aggregated form.

We do not use your personal data for commercial marketing or advertising purposes.`,
  },
  {
    num: '04', title: 'Who We Share Your Data With',
    items: [
      { term: 'Ministry departments', def: 'Veterinary, quarantine, inspection and export certification offices within the Ministry of Livestock.' },
      { term: 'Government agencies', def: 'Customs, border control, police and other federal or state agencies where legally required.' },
      { term: 'International bodies', def: 'AU-IBAR, FAO, OIE and similar organisations for disease reporting and traceability programmes under international agreements.' },
      { term: 'Technology partners', def: 'Microsoft Azure and other cloud service providers who process data under strict data processing agreements on behalf of the Ministry.' },
    ],
  },
  {
    num: '05', title: 'Data Retention',
    body: `Livestock records, movement history and audit logs are retained permanently as they form part of the official national traceability record. Personal identity information is retained for the duration of your account and for a minimum of seven years after account closure, as required by national regulatory obligations.

Inactive accounts may be suspended after 24 months of non-use but personal and livestock records will be preserved in accordance with this retention schedule.`,
  },
  {
    num: '06', title: 'Security',
    body: `QXLITS is hosted on Microsoft Azure infrastructure with enterprise-grade security controls including encryption at rest and in transit, role-based access control, multi-factor authentication for ministry officers, continuous monitoring and automated threat detection.

Despite these measures, no internet-based system can be guaranteed completely secure. You are responsible for keeping your account password confidential and for notifying the Ministry if you suspect unauthorised access.`,
  },
  {
    num: '07', title: 'Your Rights',
    body: `Subject to applicable Somali law, you have the right to request access to the personal data we hold about you; to request correction of inaccurate personal information; to raise a complaint about how your data is handled; and to request account deactivation (note that livestock records cannot be deleted as they are permanent government records).

To exercise any of these rights, please contact your district livestock office or the Ministry data officer using the contact details below.`,
  },
  {
    num: '08', title: 'Cookies and Tracking',
    body: `The QXLITS platform uses essential session cookies to maintain your login state and protect against cross-site request forgery. We do not use third-party advertising cookies or tracking pixels. Analytical data used to improve platform performance is collected in anonymised form only.

You may configure your browser to reject cookies, but this may prevent certain platform features from functioning correctly.`,
  },
  {
    num: '09', title: 'Contact and Complaints',
    contact: true,
  },
];

export function TermsPage(): JSX.Element {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('terms');

  const sections = tab === 'terms' ? TERMS_SECTIONS : PRIVACY_SECTIONS;

  return (
    <div className={s.page}>

      {/* ── Topbar (matches login page) ── */}
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
          <button className={s.backBtn} onClick={() => navigate(-1)}>&#8592; Back</button>
        </div>
      </header>

      {/* ── Breadcrumb ── */}
      <nav className={s.breadcrumb} aria-label="breadcrumb">
        <span>&#8962;</span>
        <span className={s.breadSep}>›</span>
        <span>Government Services</span>
        <span className={s.breadSep}>›</span>
        <span>QXLITS Farmer Portal</span>
        <span className={s.breadSep}>›</span>
        <strong>Legal Documents</strong>
      </nav>

      {/* ── Tab bar ── */}
      <div className={s.titleBar}>
        <div className={s.titleBarInner}>
          <div className={s.tabs}>
            <button
              className={tab === 'terms' ? `${s.tab} ${s.tabActive}` : s.tab}
              onClick={() => setTab('terms')}
            >
              Terms of Use
            </button>
            <button
              className={tab === 'privacy' ? `${s.tab} ${s.tabActive}` : s.tab}
              onClick={() => setTab('privacy')}
            >
              Privacy Policy
            </button>
          </div>
          <div className={s.titleMeta}>
            <span className={s.govPill}>&#127981; Ministry of Livestock, Forestry and Range</span>
            <span className={s.versionPill}>Effective 1 July 2026 · Version 1.0</span>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className={s.body}>
        <div className={s.docTitle}>
          <h2>{tab === 'terms' ? 'Terms of Use' : 'Privacy Policy'}</h2>
          <span className={s.docBadge}>Official Government Document</span>
        </div>

        <div className={s.sections}>
          {sections.map((sec) => (
            <div key={sec.num} className={s.sec}>
              <div className={s.secNum}>{sec.num}</div>
              <div className={s.secBody}>
                <h3 className={s.secTitle}>{sec.title}</h3>

                {'body' in sec && sec.body && (
                  sec.body.split('\n\n').map((para, i) => (
                    <p key={i} className={s.para}>{para}</p>
                  ))
                )}

                {'items' in sec && sec.items && (
                  <dl className={s.dl}>
                    {sec.items.map((it) => (
                      <div key={it.term} className={s.dlRow}>
                        <dt className={s.dt}>{it.term}</dt>
                        <dd className={s.dd}>{it.def}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                {'permitted' in sec && (
                  <div className={s.twoCol}>
                    <div className={s.colCard}>
                      <div className={s.colHead}>
                        <span className={s.dotGreen} />
                        Permitted
                      </div>
                      <ul className={s.colList}>
                        {sec.permitted!.map((item, i) => <li key={i}>{item}</li>)}
                      </ul>
                    </div>
                    <div className={s.colCard}>
                      <div className={s.colHead}>
                        <span className={s.dotRed} />
                        Prohibited
                      </div>
                      <ul className={s.colList}>
                        {sec.prohibited!.map((item, i) => <li key={i}>{item}</li>)}
                      </ul>
                    </div>
                  </div>
                )}

                {'contact' in sec && (
                  <div className={s.contactGrid}>
                    <div className={s.contactItem}>
                      <span className={s.contactIcon}>&#128204;</span>
                      <div>
                        <strong>Ministry of Livestock, Forestry and Range</strong>
                        <span>Federal Government of Somalia</span>
                        <span>Mogadishu, Somalia</span>
                      </div>
                    </div>
                    <div className={s.contactItem}>
                      <span className={s.contactIcon}>&#9993;</span>
                      <div>
                        <strong>Email</strong>
                        <a href="mailto:qxlits@livestock.gov.so" className={s.contactLink}>qxlits@livestock.gov.so</a>
                      </div>
                    </div>
                    <div className={s.contactItem}>
                      <span className={s.contactIcon}>&#128222;</span>
                      <div>
                        <strong>Helpdesk</strong>
                        <span>+252 61 234 5678</span>
                      </div>
                    </div>
                    <div className={s.contactItem}>
                      <span className={s.contactIcon}>&#128336;</span>
                      <div>
                        <strong>Office hours</strong>
                        <span>Sunday – Thursday, 08:00–16:00 EAT</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className={s.footer}>
          <button className={s.footerBtn} onClick={() => navigate(-1)}>&#8592; Back to Registration</button>
          <p className={s.footerNote}>© 2026 Federal Government of Somalia — Ministry of Livestock, Forestry and Range. All rights reserved.</p>
        </div>
      </div>

    </div>
  );
}

export default TermsPage;
