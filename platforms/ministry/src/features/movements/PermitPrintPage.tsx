import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Printer, ArrowLeft, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface PermitData {
  permit_number: string;
  movement_code: string;
  inspection_code: string | null;
  destination_check_code: string | null;
  valid_from: string;
  valid_to: string | null;
  conditions: string | null;
  animal_count: number;
  animal_ids: string[];
  origin_premises_code: string;
  origin_premises_name: string;
  origin_region_code: string;
  destination_premises_code: string;
  destination_premises_name: string;
  destination_region_code: string;
  owner_name: string;
  movement_type_code: string;
  purpose: string;
  vehicle_registration: string | null;
  issued_by_id: string | null;
  issued_by_name: string;
  issued_by_licence: string | null;
  permit_type: string | null;
  species_summary: string | null;
  owner_national_id: string | null;
  transporter_name: string | null;
  sex_breakdown: string | null;
  created_at: string;
}

interface InspectionData {
  inspection_code: string;
  assigned_to_name: string;
  assigned_to_role: string;
  submitted_at: string | null;
  overall_decision: string | null;
  inspected_count: number | null;
  passed_count: number | null;
  failed_count: number | null;
  conditions_noted: string | null;
  region_code: string | null;
}

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  P2P:  'Premises-to-Premises',
  F2M:  'Farm to Market',
  M2P:  'Market to Premises',
  F2Q:  'Farm to Quarantine',
  Q2S:  'Quarantine to Slaughter',
  Q2E:  'Quarantine to Export',
  TRH:  'Transhumance',
  EMG:  'Emergency',
};

const DECISION_CFG: Record<string, { color: string; bg: string; label: string }> = {
  PASS:         { color: '#065f46', bg: '#d1fae5', label: 'PASS — Fit for Movement' },
  PARTIAL_PASS: { color: '#92400e', bg: '#fef3c7', label: 'CONDITIONAL PASS — Conditions Apply' },
  FAIL:         { color: '#991b1b', bg: '#fee2e2', label: 'FAIL — Not Fit for Movement' },
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

function fmtShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const PRINT_STYLES = `
  @media print {
    body { margin: 0; background: #fff !important; }
    .no-print { display: none !important; }
    .permit-doc { box-shadow: none !important; border: none !important; max-width: 100% !important; margin: 0 !important; padding: 1.5cm 2cm !important; }
    .permit-section { break-inside: avoid; }
    @page { size: A4; margin: 1.5cm 2cm; }
  }
`;

export function PermitPrintPage(): JSX.Element {
  const { permitNumber } = useParams<{ permitNumber: string }>();
  const [permit, setPermit] = useState<PermitData | null>(null);
  const [inspection, setInspection] = useState<InspectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!permitNumber) { setError('No permit number provided.'); setLoading(false); return; }
    void load(permitNumber);
  }, [permitNumber]);

  async function load(num: string) {
    setLoading(true);
    const { data: pRow, error: pErr } = await supabase
      .from('movement_permits')
      .select('*')
      .eq('permit_number', num)
      .maybeSingle();

    if (pErr || !pRow) {
      setError('Permit not found or access denied.');
      setLoading(false);
      return;
    }
    setPermit(pRow as PermitData);

    if ((pRow as PermitData).inspection_code) {
      const { data: iRow } = await supabase
        .from('movement_inspections')
        .select('inspection_code, assigned_to_name, assigned_to_role, submitted_at, overall_decision, inspected_count, passed_count, failed_count, conditions_noted, region_code')
        .eq('inspection_code', (pRow as PermitData).inspection_code!)
        .maybeSingle();
      if (iRow) setInspection(iRow as InspectionData);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Georgia, serif', color: '#6b7280' }}>
        Loading permit…
      </div>
    );
  }

  if (error || !permit) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Georgia, serif', gap: '1rem' }}>
        <XCircle size={40} color="#dc2626" />
        <div style={{ fontSize: '1.125rem', color: '#374151' }}>{error ?? 'Permit not found.'}</div>
        <button onClick={() => window.close()} style={{ border: 'none', background: '#f3f4f6', color: '#374151', padding: '0.5rem 1.25rem', borderRadius: 8, cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
          Close
        </button>
      </div>
    );
  }

  const typeLabel = MOVEMENT_TYPE_LABELS[permit.movement_type_code] ?? permit.movement_type_code;
  const decision  = inspection?.overall_decision ? DECISION_CFG[inspection.overall_decision] : null;

  const isExpired = permit.valid_to ? new Date(permit.valid_to) < new Date() : false;

  return (
    <div style={{ background: '#e5e7eb', minHeight: '100vh', padding: '1.5rem', fontFamily: 'Georgia, Times, serif' }}>
      <style>{PRINT_STYLES}</style>

      {/* Toolbar — hidden when printing */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', maxWidth: 900, marginLeft: 'auto', marginRight: 'auto' }}>
        <button
          onClick={() => window.close()}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: 'none', background: '#fff', color: '#374151', padding: '0.5rem 1rem', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.875rem', boxShadow: '0 1px 3px rgba(0,0,0,.1)' }}
        >
          <ArrowLeft size={15} /> Back
        </button>
        <button
          onClick={() => window.print()}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: 'none', background: '#1e3a5f', color: '#fff', padding: '0.5rem 1.25rem', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.875rem', fontWeight: 700, boxShadow: '0 1px 3px rgba(0,0,0,.15)' }}
        >
          <Printer size={15} /> Print Permit
        </button>
        {isExpired && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#fee2e2', color: '#991b1b', padding: '0.4rem 0.875rem', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600 }}>
            <AlertTriangle size={14} /> Permit Expired
          </div>
        )}
      </div>

      {/* A4 Document */}
      <div
        className="permit-doc"
        style={{
          background: '#fff',
          maxWidth: 900,
          margin: '0 auto',
          padding: '2.5rem 3rem 3rem',
          boxShadow: '0 4px 24px rgba(0,0,0,.12)',
          position: 'relative',
        }}
      >
        {/* Watermark for expired */}
        {isExpired && (
          <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%) rotate(-35deg)', fontSize: '5rem', fontWeight: 900, color: 'rgba(220,38,38,.08)', pointerEvents: 'none', userSelect: 'none', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
            EXPIRED
          </div>
        )}

        {/* ── Official Header ─────────────────────────────────────── */}
        <div style={{ borderBottom: '3px solid #1e3a5f', paddingBottom: '1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.7rem', letterSpacing: '0.12em', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Federal Republic of Somalia
            </div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e3a5f', lineHeight: 1.25 }}>
              Ministry of Livestock, Forestry and Range
            </div>
            <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.15rem' }}>
              Directorate of Veterinary Services
            </div>
          </div>

          {/* Permit badge top-right */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', color: '#9ca3af', textTransform: 'uppercase' }}>Document No.</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, fontFamily: 'monospace', color: '#1e3a5f', letterSpacing: '0.05em' }}>
              {permit.permit_number}
            </div>
            <div style={{ marginTop: '0.3rem', display: 'inline-block', padding: '0.2rem 0.6rem', background: isExpired ? '#fee2e2' : '#d1fae5', color: isExpired ? '#991b1b' : '#065f46', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', borderRadius: 4 }}>
              {isExpired ? 'Expired' : 'Issued'}
            </div>
          </div>
        </div>

        {/* ── Document Title ───────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Livestock Movement Permit
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
            Issued under the authority of the Livestock Identification and Traceability Act
          </div>
        </div>

        {/* ── Validity Strip ───────────────────────────────────────── */}
        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6, padding: '0.625rem 1rem', marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.8rem' }}>
            <span style={{ color: '#0c4a6e', fontWeight: 700 }}>Issue Date: </span>
            <span style={{ color: '#374151' }}>{fmtDate(permit.created_at)}</span>
          </div>
          <div style={{ fontSize: '0.8rem' }}>
            <span style={{ color: '#0c4a6e', fontWeight: 700 }}>Valid From: </span>
            <span style={{ color: '#374151' }}>{fmtDate(permit.valid_from)}</span>
          </div>
          <div style={{ fontSize: '0.8rem' }}>
            <span style={{ color: isExpired ? '#991b1b' : '#0c4a6e', fontWeight: 700 }}>Valid To: </span>
            <span style={{ color: isExpired ? '#991b1b' : '#374151', fontWeight: isExpired ? 700 : 400 }}>{fmtDate(permit.valid_to)}</span>
          </div>
          <div style={{ fontSize: '0.8rem' }}>
            <span style={{ color: '#0c4a6e', fontWeight: 700 }}>Type: </span>
            <span style={{ color: '#374151' }}>{typeLabel} ({permit.movement_type_code})</span>
          </div>
        </div>

        {/* ── Sections grid ───────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>

          {/* SECTION 1 — Owner */}
          <PermitSection title="Section 1 — Livestock Owner">
            <Row label="Owner Name">{permit.owner_name || '—'}</Row>
            {permit.owner_national_id && <Row label="National ID">{permit.owner_national_id}</Row>}
            <Row label="Movement Code"><Mono>{permit.movement_code}</Mono></Row>
            <Row label="Purpose">{permit.purpose || '—'}</Row>
          </PermitSection>

          {/* SECTION 2 — Origin */}
          <PermitSection title="Section 2 — Origin Premises">
            <Row label="Premises Code"><Mono>{permit.origin_premises_code}</Mono></Row>
            <Row label="Premises Name">{permit.origin_premises_name || '—'}</Row>
            <Row label="Region">{permit.origin_region_code || '—'}</Row>
          </PermitSection>

          {/* SECTION 3 — Destination */}
          <PermitSection title="Section 3 — Destination Premises">
            <Row label="Premises Code"><Mono>{permit.destination_premises_code}</Mono></Row>
            <Row label="Premises Name">{permit.destination_premises_name || '—'}</Row>
            <Row label="Region">{permit.destination_region_code || '—'}</Row>
          </PermitSection>

          {/* SECTION 4 — Transport */}
          <PermitSection title="Section 4 — Transport Details">
            <Row label="Vehicle Reg.">{permit.vehicle_registration || '—'}</Row>
            {permit.transporter_name && <Row label="Transporter">{permit.transporter_name}</Row>}
          </PermitSection>
        </div>

        {/* SECTION 5 — Livestock */}
        <PermitSection title="Section 5 — Livestock Details" style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem 2rem', marginBottom: permit.animal_ids?.length > 0 ? '0.875rem' : 0 }}>
            <Row label="Species">{permit.species_summary || '—'}</Row>
            <Row label="Total Count">{permit.animal_count}</Row>
            {permit.sex_breakdown && <Row label="Sex Breakdown">{permit.sex_breakdown}</Row>}
          </div>
          {permit.animal_ids?.length > 0 && (
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
                RFID Tags / Animal IDs ({permit.animal_ids.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {permit.animal_ids.map(id => (
                  <span key={id} style={{ fontFamily: 'monospace', fontSize: '0.7rem', background: '#f1f5f9', color: '#1e3a5f', padding: '0.15rem 0.4rem', borderRadius: 4, border: '1px solid #e2e8f0' }}>
                    {id}
                  </span>
                ))}
              </div>
            </div>
          )}
        </PermitSection>

        {/* SECTION 6 — Inspection */}
        {inspection && (
          <PermitSection title="Section 6 — Pre-Movement Inspection" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 2rem', marginBottom: '0.625rem' }}>
              <Row label="Inspection Code"><Mono>{inspection.inspection_code}</Mono></Row>
              <Row label="Inspector">{inspection.assigned_to_name} ({inspection.assigned_to_role.replace(/_/g, ' ')})</Row>
              <Row label="Date Completed">{fmtShort(inspection.submitted_at)}</Row>
              {inspection.inspected_count != null && <Row label="Animals Inspected">{inspection.inspected_count}</Row>}
              {inspection.passed_count != null && <Row label="Passed">{inspection.passed_count}</Row>}
              {inspection.failed_count != null && <Row label="Failed / Isolated">{inspection.failed_count}</Row>}
            </div>
            {decision && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.875rem', borderRadius: 6, background: decision.bg, color: decision.color, fontSize: '0.8rem', fontWeight: 700 }}>
                {inspection.overall_decision === 'PASS' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                {decision.label}
              </div>
            )}
            {inspection.conditions_noted && (
              <div style={{ marginTop: '0.625rem', fontSize: '0.8rem', color: '#374151', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 6, padding: '0.5rem 0.75rem' }}>
                <span style={{ fontWeight: 700, color: '#92400e' }}>Inspection Conditions: </span>
                {inspection.conditions_noted}
              </div>
            )}
          </PermitSection>
        )}

        {/* SECTION 7 — Conditions */}
        {permit.conditions && (
          <PermitSection title="Section 7 — Special Conditions &amp; Restrictions" style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.8rem', color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {permit.conditions}
            </div>
          </PermitSection>
        )}

        {/* ── Certification Block ──────────────────────────────────── */}
        <div style={{ border: '1.5px solid #1e3a5f', borderRadius: 6, padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#1e3a5f', marginBottom: '0.875rem' }}>
            Official Certification
          </div>
          <div style={{ fontSize: '0.8rem', color: '#374151', lineHeight: 1.7, marginBottom: '1rem' }}>
            I, the undersigned authorised veterinary officer, hereby certify that the livestock described in this
            permit have been inspected in accordance with the requirements of Somalia veterinary legislation and
            the IGAD Model Legal Framework for Livestock Identification and Traceability Systems, and are
            fit for the movement described herein.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem 2.5rem' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>Issued by</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>{permit.issued_by_name}</div>
              {permit.issued_by_licence && (
                <div style={{ fontSize: '0.75rem', color: '#6b7280', fontFamily: 'monospace' }}>
                  Vet. Licence: {permit.issued_by_licence}
                </div>
              )}
              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{fmtDate(permit.created_at)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>Signature &amp; Stamp</div>
              <div style={{ border: '1px dashed #9ca3af', borderRadius: 6, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d1d5db', fontSize: '0.75rem', fontStyle: 'italic' }}>
                [Official Signature &amp; Stamp]
              </div>
            </div>
          </div>
        </div>

        {/* ── Legal Warning ────────────────────────────────────────── */}
        <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 6, padding: '0.625rem 1rem', fontSize: '0.72rem', color: '#713f12', lineHeight: 1.6 }}>
          <strong>IMPORTANT:</strong> This permit is valid only for the specific movement, route, and period described above.
          Any alteration to this document renders it null and void. This permit must accompany the livestock
          at all times during transit and must be presented on demand to any authorised official.
          False declaration is a criminal offence under Somalia livestock legislation.
        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '1.75rem', paddingTop: '0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem', color: '#9ca3af' }}>
          <div>
            Ministry of Livestock, Forestry and Range — Federal Government of Somalia
          </div>
          <div style={{ fontFamily: 'monospace' }}>
            QXLITS | {permit.permit_number} | Generated {new Date().toLocaleDateString('en-GB')}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Small helper components ─────────────────────────────────────────────────

function PermitSection({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }): JSX.Element {
  return (
    <div className="permit-section" style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: '0.875rem 1rem', ...style }}>
      <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#1e3a5f', marginBottom: '0.625rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.4rem' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div style={{ display: 'flex', gap: '0.4rem', fontSize: '0.8rem', marginBottom: '0.3rem', alignItems: 'baseline' }}>
      <span style={{ color: '#9ca3af', minWidth: 110, flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#111827', fontWeight: 500 }}>{children}</span>
    </div>
  );
}

function Mono({ children }: { children: React.ReactNode }): JSX.Element {
  return <span style={{ fontFamily: 'monospace', fontSize: '0.85em' }}>{children}</span>;
}

export default PermitPrintPage;
