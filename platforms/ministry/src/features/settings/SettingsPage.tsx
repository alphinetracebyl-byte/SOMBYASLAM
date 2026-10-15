import { useEffect, useState } from 'react';
import {
  getAutoApproval,
  setAutoApproval,
  getMovementTaskMode,
  setMovementTaskMode,
  getDeliverySettings,
  saveDeliverySettings,
  getEscalationDays,
  setEscalationDays,
  getTagReplacementApproval,
  setTagReplacementApproval,
  type MovementTaskMode,
} from './settings.supabase';
import s from './settings.module.css';

export function SettingsPage(): JSX.Element {
  const [autoApproval,   setAutoApprovalLocal] = useState(true);
  const [taskMode,       setTaskMode]          = useState<MovementTaskMode>('BOTH');
  const [deliveryName,   setDeliveryName]      = useState('');
  const [deliveryEmail,  setDeliveryEmail]     = useState('');
  const [deliveryPhone,  setDeliveryPhone]     = useState('');
  const [loading,        setLoading]           = useState(true);
  const [savingAuto,     setSavingAuto]        = useState(false);
  const [savingMove,     setSavingMove]        = useState(false);
  const [savingDelivery, setSavingDelivery]    = useState(false);
  const [toast,          setToast]             = useState<{ msg: string; ok: boolean } | null>(null);

  // Inspection settings
  const [escalationDays,    setEscalationDaysLocal]    = useState(2);
  const [savingEsc,         setSavingEsc]              = useState(false);
  // Tag replacement settings
  const [tagReplApproval,   setTagReplApprovalLocal]   = useState(true);
  const [savingTagRepl,     setSavingTagRepl]          = useState(false);

  useEffect(() => {
    Promise.all([getAutoApproval(), getMovementTaskMode(), getEscalationDays(), getTagReplacementApproval()])
      .then(([auto, mode, days, tagRepl]) => {
        setAutoApprovalLocal(auto);
        setTaskMode(mode);
        setEscalationDaysLocal(days);
        setTagReplApprovalLocal(tagRepl);
      })
      .finally(() => setLoading(false));
    const ds = getDeliverySettings();
    setDeliveryName(ds.name); setDeliveryEmail(ds.email); setDeliveryPhone(ds.phone);
  }, []);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveAuto = async () => {
    setSavingAuto(true);
    try { await setAutoApproval(autoApproval); showToast('Saved.'); }
    catch { showToast('Failed to save.', false); }
    finally { setSavingAuto(false); }
  };

  const handleSaveMove = async () => {
    setSavingMove(true);
    try { await setMovementTaskMode(taskMode); showToast('Saved.'); }
    catch { showToast('Failed to save.', false); }
    finally { setSavingMove(false); }
  };

  const handleSaveDelivery = () => {
    setSavingDelivery(true);
    saveDeliverySettings({ name: deliveryName, email: deliveryEmail, phone: deliveryPhone });
    showToast('Saved.');
    setSavingDelivery(false);
  };

  const handleSaveEscalation = async () => {
    setSavingEsc(true);
    try { await setEscalationDays(escalationDays); showToast('Escalation threshold saved.'); }
    catch { showToast('Failed to save.', false); }
    finally { setSavingEsc(false); }
  };

  const handleSaveTagRepl = async () => {
    setSavingTagRepl(true);
    try { await setTagReplacementApproval(tagReplApproval); showToast('Saved.'); }
    catch { showToast('Failed to save.', false); }
    finally { setSavingTagRepl(false); }
  };

  return (
    <div className={s.page}>
      {toast && (
        <div className={`${s.toast}${toast.ok ? '' : ' ' + s.toastErr}`}>{toast.msg}</div>
      )}

      <div className={s.pageHead}>
        <h1 className={s.pageTitle}>Settings</h1>
        <p className={s.pageSub}>System configuration for the Ministry portal</p>
      </div>

      {loading ? (
        <div className={s.loading}>Loading…</div>
      ) : (
        <>
        <div className={s.grid}>
          <div className={s.colLeft}>
          {/* ── 1. Farmer Registration ── */}
          <div className={s.section}>
            <div className={s.sectionTitle}>
              <span className={s.rowNum}>1</span>Farmer Registration
            </div>
            <div className={s.settingRow}>
              <div className={s.settingInfo}>
                <div className={s.settingLabel}>Approval Mode</div>
                <div className={s.settingDesc}>Choose how new farmer registrations are handled when submitted.</div>
              </div>

              <div className={s.modeCards}>
                <button
                  className={`${s.modeCard}${autoApproval ? ' ' + s.modeCardActive : ''}`}
                  onClick={() => setAutoApprovalLocal(true)}
                >
                  <span className={s.modeIcon}>⚡</span>
                  <span className={s.modeName}>Auto Approval</span>
                  <span className={s.modeHint}>Farmer accounts are activated immediately after registration. No manual review is needed. Officers can still suspend or deactivate accounts at any time.</span>
                  {autoApproval && <span className={s.modeCheck}>✓</span>}
                </button>

                <button
                  className={`${s.modeCard}${!autoApproval ? ' ' + s.modeCardActive : ''}`}
                  onClick={() => setAutoApprovalLocal(false)}
                >
                  <span className={s.modeIcon}>👤</span>
                  <span className={s.modeName}>Ministry Approval</span>
                  <span className={s.modeHint}>Every new registration is held as Pending. A Ministry officer must review the application and manually approve or reject it before the farmer can use the system.</span>
                  {!autoApproval && <span className={s.modeCheck}>✓</span>}
                </button>
              </div>

              <div className={s.settingActions}>
                <button className={s.btnSave} onClick={handleSaveAuto} disabled={savingAuto}>
                  {savingAuto ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>

          {/* ── 2. Movement Workflow ── */}
          <div className={s.section}>
            <div className={s.sectionTitle}>
              <span className={s.rowNum}>2</span>Movement Workflow
            </div>
            <div className={s.settingRow}>
              <div className={s.settingInfo}>
                <div className={s.settingLabel}>Movement Review Assignment</div>
                <div className={s.settingDesc}>Choose which field roles receive a task when a farmer submits a movement request.</div>
              </div>

              <div className={s.modeCards}>
                <button
                  className={`${s.modeCard}${taskMode === 'FIELD_INSPECTOR' ? ' ' + s.modeCardActive : ''}`}
                  onClick={() => setTaskMode('FIELD_INSPECTOR')}
                >
                  <span className={s.modeIcon}>🔍</span>
                  <span className={s.modeName}>Field Inspector Only</span>
                  <span className={s.modeHint}>When a farmer submits a movement request, a task is assigned only to the Field Inspector in the origin region. The inspector visits the site to verify the animals and confirm movement details before the Ministry reviews.</span>
                  {taskMode === 'FIELD_INSPECTOR' && <span className={s.modeCheck}>✓</span>}
                </button>

                <button
                  className={`${s.modeCard}${taskMode === 'VETERINARY_OFFICER' ? ' ' + s.modeCardActive : ''}`}
                  onClick={() => setTaskMode('VETERINARY_OFFICER')}
                >
                  <span className={s.modeIcon}>🩺</span>
                  <span className={s.modeName}>Veterinary Officer Only</span>
                  <span className={s.modeHint}>When a movement is requested, a task is assigned only to the Veterinary Officer in the origin region. The vet reviews health certificates, checks disease status, and confirms the animals are fit to move before Ministry approval.</span>
                  {taskMode === 'VETERINARY_OFFICER' && <span className={s.modeCheck}>✓</span>}
                </button>

                <button
                  className={`${s.modeCard}${taskMode === 'BOTH' ? ' ' + s.modeCardActive : ''}`}
                  onClick={() => setTaskMode('BOTH')}
                >
                  <span className={s.modeIcon}>✅</span>
                  <span className={s.modeName}>Both Field Roles</span>
                  <span className={s.modeHint}>Tasks are assigned to both the Field Inspector and the Veterinary Officer. The inspector verifies animals on-site while the vet confirms health status. Both must complete their checks before the Ministry can approve the movement.</span>
                  {taskMode === 'BOTH' && <span className={s.modeCheck}>✓</span>}
                </button>
              </div>

              <div className={s.settingActions}>
                <button className={s.btnSave} onClick={handleSaveMove} disabled={savingMove}>
                  {savingMove ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>

          </div>{/* /colLeft */}

          <div className={s.colRight}>
          {/* ── 3. Tag Delivery Company ── */}
          <div className={s.section}>
            <div className={s.sectionTitle}>
              <span className={s.rowNum}>3</span>Tag Delivery Company
            </div>
            <div className={s.inputSection}>
              <div className={s.inputRow}>
                <span className={s.inputLabel}>Company Name</span>
                <input className={s.input} value={deliveryName} onChange={e => setDeliveryName(e.target.value)} placeholder="e.g. Somalia Postal Service" />
              </div>
              <div className={s.inputRow}>
                <span className={s.inputLabel}>Email Address</span>
                <input className={s.input} type="email" value={deliveryEmail} onChange={e => setDeliveryEmail(e.target.value)} placeholder="delivery@company.com" />
              </div>
              <div className={s.inputRow}>
                <span className={s.inputLabel}>Contact Phone</span>
                <input className={s.input} type="tel" value={deliveryPhone} onChange={e => setDeliveryPhone(e.target.value)} placeholder="+252 61 234 5678" />
              </div>
              <div className={s.inputActions}>
                <button className={s.btnSave} onClick={handleSaveDelivery} disabled={savingDelivery}>Save</button>
              </div>
            </div>
          </div>
          </div>{/* /colRight */}
        </div>

        {/* ── 4. Pre-Movement Inspection ── */}
        <div className={s.section}>
          <div className={s.sectionTitle}>
            <span className={s.rowNum}>4</span>Pre-Movement Inspection
          </div>
          <div className={s.settingRow}>
            <div className={s.settingInfo}>
              <div className={s.settingLabel}>Escalation Threshold</div>
              <div className={s.settingDesc}>
                If a pre-movement inspection is assigned but not started within this many days, the Ministry is alerted on the Movements page and the manual re-assign button becomes available.
                Inspections are automatically assigned to the field inspector or veterinary officer registered to the movement's origin region in User Management.
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input
                type="number" min={1} max={30}
                value={escalationDays}
                onChange={e => setEscalationDaysLocal(Math.max(1, Number(e.target.value)))}
                style={{ width: 72, padding: '0.4rem 0.625rem', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: '0.875rem', fontFamily: 'inherit', outline: 'none' }}
              />
              <span style={{ fontSize: '0.8125rem', color: '#374151' }}>days</span>
              <button className={s.btnSave} onClick={handleSaveEscalation} disabled={savingEsc} style={{ marginLeft: '0.5rem' }}>
                {savingEsc ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>

        {/* ── 5. Tag Replacement ── */}
        <div className={s.section}>
          <div className={s.sectionTitle}>
            <span className={s.rowNum}>5</span>Tag Replacement
          </div>
          <div className={s.settingRow}>
            <div className={s.settingInfo}>
              <div className={s.settingLabel}>Replacement Approval Mode</div>
              <div className={s.settingDesc}>Choose whether tag replacement requests submitted by farmers require Ministry review, or are processed automatically when a new serial is provided.</div>
            </div>
            <div className={s.modeCards}>
              <button
                className={`${s.modeCard}${tagReplApproval ? ' ' + s.modeCardActive : ''}`}
                onClick={() => setTagReplApprovalLocal(true)}
              >
                <span className={s.modeIcon}>👤</span>
                <span className={s.modeName}>Requires Ministry Approval</span>
                <span className={s.modeHint}>Tag replacement requests are held as Pending. A Ministry officer must review each request, enter the official new serial number, and approve or reject before the animal record is updated.</span>
                {tagReplApproval && <span className={s.modeCheck}>✓</span>}
              </button>
              <button
                className={`${s.modeCard}${!tagReplApproval ? ' ' + s.modeCardActive : ''}`}
                onClick={() => setTagReplApprovalLocal(false)}
              >
                <span className={s.modeIcon}>⚡</span>
                <span className={s.modeName}>Auto Approve</span>
                <span className={s.modeHint}>When a farmer submits a replacement request and provides a new tag serial, the system immediately updates the animal record and marks the request as Approved. No Ministry review is required.</span>
                {!tagReplApproval && <span className={s.modeCheck}>✓</span>}
              </button>
            </div>
            <div className={s.settingActions}>
              <button className={s.btnSave} onClick={handleSaveTagRepl} disabled={savingTagRepl}>
                {savingTagRepl ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>

        </>
      )}
    </div>
  );
}

export default SettingsPage;
