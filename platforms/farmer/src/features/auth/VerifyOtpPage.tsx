import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { registerFarmer } from './auth.supabase';
import s from './verify-otp.module.css';

const DIGIT_COUNT = 4;

export function VerifyOtpPage(): JSX.Element {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const phoneLast4 = params.get('phoneLast4') ?? '????';

  const [digits, setDigits]         = useState<string[]>(Array(DIGIT_COUNT).fill(''));
  const [error,  setError]          = useState<string | null>(null);
  const [success, setSuccess]       = useState(false);
  const [farmerCode, setFarmerCode] = useState('');
  const [submitting, setSubmit]     = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { inputs.current[0]?.focus(); }, []);

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const handleChange = (i: number, val: string) => {
    const ch = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = ch;
    setDigits(next);
    if (ch && i < DIGIT_COUNT - 1) inputs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, DIGIT_COUNT);
    if (!text) return;
    e.preventDefault();
    const next = [...digits];
    text.split('').forEach((c, i) => { next[i] = c; });
    setDigits(next);
    inputs.current[Math.min(text.length, DIGIT_COUNT - 1)]?.focus();
  };

  const code = digits.join('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (code.length < DIGIT_COUNT) { setError('Please enter all 4 digits.'); return; }
    setSubmit(true);
    try {
      const raw = sessionStorage.getItem('pendingFarmer');
      if (!raw) throw new Error('Session expired. Please register again.');
      const data = JSON.parse(raw);
      /* OTP verification will be wired to an SMS gateway later.
         For now, any 6-digit code is accepted in trial mode. */
      const result = await registerFarmer(data);
      sessionStorage.removeItem('pendingFarmer');
      setFarmerCode(result.farmerCode);
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setSubmit(false);
    }
  };

  return (
    <div className={s.page}>

      {/* ── Left hero ── */}
      <aside className={s.hero}>
        <div className={s.heroLogo}>
          <div className={s.heroMark}>S</div>
          <div>
            <div className={s.heroName}>QXLITS</div>
            <div className={s.heroSub}>Livestock Identification &amp; Traceability</div>
          </div>
        </div>
        <h2 className={s.heroTagline}>
          One step away from<br/>
          <span className={s.heroAccent}>your farmer account</span>
        </h2>
        <p className={s.heroDesc}>
          Verify your phone number to complete registration. Your account will be reviewed
          by the Ministry within 1–3 working days.
        </p>
        <div className={s.heroSteps}>
          {[
            ['✓','Registration submitted','Your details have been saved'],
            ['2','Verify phone','Enter the 4-digit code sent to your number'],
            ['3','Ministry review','Approval within 1–3 working days'],
            ['4','Start using QXLITS','Register animals, apply for permits'],
          ].map(([num, title, sub]) => (
            <div key={title} className={`${s.heroStep}${num==='✓'?' '+s.heroStepDone:num==='2'?' '+s.heroStepActive:''}`}>
              <div className={s.heroStepNum}>{num}</div>
              <div>
                <div className={s.heroStepTitle}>{title}</div>
                <div className={s.heroStepSub}>{sub}</div>
              </div>
            </div>
          ))}
        </div>
        <div className={s.heroFooter}>Federal Government of Somalia · Ministry of Livestock</div>
      </aside>

      {/* ── Right panel ── */}
      <main className={s.panel}>
        <div className={s.card}>

          {/* Brand */}
          <div className={s.cardBrand}>
            <div className={s.cardMark}>S</div>
            <div className={s.cardBrandText}>
              <div className={s.cardBrandName}>QXLITS</div>
              <div className={s.cardBrandSub}>Farmer Portal</div>
            </div>
          </div>

          <h1 className={s.title}>Verify Your Phone</h1>
          <p className={s.subtitle}>
            We sent a 4-digit code to the number ending in{' '}
            <span className={s.phone}>****{phoneLast4}</span>
          </p>

          {/* Trial banner */}
          <div className={s.trialBanner}>
            <div className={s.trialRow}>
              <span className={s.trialIcon}>📱</span>
              <div>
                <div className={s.trialTitle}>One last step</div>
                <div className={s.trialSub}>Your account will be created once your phone is verified.</div>
              </div>
            </div>
            <div className={s.trialNote}>
              For testing, use: <strong>5555</strong>
            </div>
          </div>

          {success ? (
            <div className={s.successBox}>
              <div className={s.successIcon}>✓</div>
              <div className={s.successTitle}>Account Created!</div>
              {farmerCode && (
                <div className={s.successCode}>
                  <span className={s.successCodeLabel}>Your Farmer Code</span>
                  <span className={s.successCodeValue}>{farmerCode}</span>
                </div>
              )}
              <div className={s.successSub}>Your application is pending Ministry review. You will be notified once approved.</div>
              <button className={s.successLoginBtn} onClick={() => navigate('/login')}>Go to Login →</button>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate>

              <div className={s.digitLabel}>Enter 4-digit code</div>
              <div className={s.digitRow} onPaste={handlePaste}>
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={el => { inputs.current[i] = el; }}
                    className={`${s.digitBox}${error ? ' ' + s.digitBoxErr : d ? ' ' + s.digitBoxFilled : ''}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={e => handleChange(i, e.target.value)}
                    onKeyDown={e => handleKey(i, e)}
                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  />
                ))}
              </div>

              {error && <p className={s.err} role="alert">{error}</p>}

              <button type="submit" className={s.btn} disabled={submitting || code.length < DIGIT_COUNT}>
                {submitting ? (
                  <><span className={s.spinner}/> Verifying…</>
                ) : (
                  'Verify & Continue →'
                )}
              </button>

              <div className={s.resend}>
                Didn't receive a code?{' '}
                <button type="button" className={s.resendLink} onClick={() => setDigits(Array(DIGIT_COUNT).fill(''))}>
                  Resend code
                </button>
              </div>

            </form>
          )}

          <div className={s.cardFooter}>
            <Link to="/login" className={s.backLink}>← Back to login</Link>
          </div>

        </div>
      </main>

    </div>
  );
}

export default VerifyOtpPage;
