import { useState } from 'react';
import { FileText, CheckCircle, Clock, XCircle, ShieldCheck, Printer, QrCode, ArrowRight } from 'lucide-react';
import s from './certificates.module.css';

type CertKind = 'EXPORT' | 'QUARANTINE_CLEARANCE';
type CertStatus = 'ISSUED' | 'PENDING' | 'EXPIRED' | 'REVOKED';

interface FarmerCert {
  id: string;
  kind: CertKind;
  certNo: string;
  description: string;
  issuedAt?: string;
  expiresAt?: string;
  status: CertStatus;
  detail: Record<string, string>;
  animals?: { animalId: string; tagSerial: string; species: string }[];
}

const CERTS: FarmerCert[] = [
  {
    id: 'c1', kind: 'EXPORT', certNo: 'EHC-SOM-2026-0041',
    description: '150 Cattle — Export to Saudi Arabia',
    issuedAt: '2026-07-28', expiresAt: '2026-08-28', status: 'ISSUED',
    detail: {
      'Certificate No':     'EHC-SOM-2026-0041',
      'Consignment Code':   'EC-2026-00041',
      'Exporter':           'Barwaaqo Livestock Exports Ltd',
      'Destination':        '🇸🇦 Saudi Arabia',
      'Port of Exit':       'Mogadishu Port',
      'Species':            'Cattle',
      'Animal Count':       '150',
      'Vaccinations':       'FMD, CBPP, BQ, Anthrax',
      'Tests (Negative)':   'Brucellosis, TB, RVF, PPR',
      'Quarantine Ref':     'QCC-2026-001',
      'Certifying Officer': 'Dr. Abdi Warsame',
      'Date of Issue':      '2026-07-28',
      'Valid Until':        '2026-08-28',
    },
    animals: [
      { animalId: 'SOB-2026-0441', tagSerial: 'RFID-2026-00441', species: 'Cattle' },
      { animalId: 'SOB-2026-0442', tagSerial: 'RFID-2026-00442', species: 'Cattle' },
      { animalId: 'SOB-2026-0443', tagSerial: 'RFID-2026-00443', species: 'Cattle' },
    ],
  },
  {
    id: 'c2', kind: 'QUARANTINE_CLEARANCE', certNo: 'QCC-2026-001',
    description: 'Daynile Zone Clearance — 340 animals',
    issuedAt: '2026-07-12', status: 'ISSUED',
    detail: {
      'Certificate No':       'QCC-2026-001',
      'Zone Reference':       'MOG-Q-2026-001',
      'Zone Name':            'Daynile Quarantine Zone',
      'Region':               'Banaadir',
      'Premises Covered':     'SOM-MOG-004, SOM-MOG-007, SOM-MOG-009',
      'Animals Cleared':      '340',
      'Hold Period':          '2026-06-10 → 2026-07-10 (30 days)',
      'Tests (Negative)':     'FMD (ELISA), CBPP (CFT), Anthrax, RVF (PCR)',
      'Clearance Basis':      '30-day isolation completed. All serology negative.',
      'Issuing Vet Officer':  'Dr. Fadumo Hirsi',
      'Date of Issue':        '2026-07-12',
    },
  },
  {
    id: 'c3', kind: 'EXPORT', certNo: 'EHC-SOM-2026-0038',
    description: '80 Goat — Export to UAE',
    issuedAt: '2026-06-15', expiresAt: '2026-07-15', status: 'EXPIRED',
    detail: {
      'Certificate No':     'EHC-SOM-2026-0038',
      'Consignment Code':   'EC-2026-00038',
      'Destination':        '🇦🇪 UAE',
      'Port of Exit':       'Berbera Port',
      'Species':            'Goat',
      'Animal Count':       '80',
      'Date of Issue':      '2026-06-15',
      'Valid Until':        '2026-07-15',
      'Certifying Officer': 'Dr. Abdi Warsame',
    },
  },
  {
    id: 'c4', kind: 'EXPORT', certNo: 'EC-2026-00042',
    description: '80 Camel — Export to UAE (Pending)',
    status: 'PENDING',
    detail: {
      'Consignment Code': 'EC-2026-00042',
      'Destination':      '🇦🇪 UAE',
      'Port of Exit':     'Berbera Port',
      'Species':          'Camel',
      'Animal Count':     '80',
      'Status':           'Awaiting Ministry review',
    },
  },
];

function generateQRSVG(data: string): string {
  const CELL = 8; const SIZE = 21;
  let hash = 0;
  for (let i = 0; i < data.length; i++) { hash = ((hash << 5) - hash + data.charCodeAt(i)) | 0; }
  let seed = Math.abs(hash);
  const rand = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0xffffffff; };
  const grid: boolean[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
  const finder = (r: number, c: number) => {
    for (let dr = 0; dr < 7; dr++) for (let dc = 0; dc < 7; dc++) {
      const isOuter = dr === 0 || dr === 6 || dc === 0 || dc === 6;
      const isInner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
      if (r + dr < SIZE && c + dc < SIZE) grid[r + dr][c + dc] = isOuter || isInner;
    }
  };
  finder(0, 0); finder(0, 14); finder(14, 0);
  for (let r = 8; r < SIZE; r++) for (let c = 8; c < SIZE; c++) grid[r][c] = rand() > 0.5;
  const cells: string[] = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++)
    if (grid[r][c]) cells.push(`<rect x="${c * CELL}" y="${r * CELL}" width="${CELL}" height="${CELL}" fill="#000"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE * CELL}" height="${SIZE * CELL}" viewBox="0 0 ${SIZE * CELL} ${SIZE * CELL}"><rect width="100%" height="100%" fill="#fff"/>${cells.join('')}</svg>`;
}

const STATUS_STYLE: Record<CertStatus, { color: string; bg: string; Icon: React.ElementType; label: string }> = {
  ISSUED:  { color: '#059669', bg: '#ecfdf5', Icon: CheckCircle, label: 'Issued' },
  PENDING: { color: '#d97706', bg: '#fffbeb', Icon: Clock,        label: 'Pending' },
  EXPIRED: { color: '#94a3b8', bg: '#f1f5f9', Icon: XCircle,      label: 'Expired' },
  REVOKED: { color: '#7c3aed', bg: '#f5f3ff', Icon: XCircle,      label: 'Revoked' },
};

const KIND_LABEL: Record<CertKind, string> = {
  EXPORT:               'Export Health Certificate',
  QUARANTINE_CLEARANCE: 'Quarantine Clearance Certificate',
};

type FilterKind = 'ALL' | CertKind;
type FilterStatus = 'ALL' | CertStatus;

export function CertificatesPage(): JSX.Element {
  const [kindFilter,   setKindFilter]   = useState<FilterKind>('ALL');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');
  const [selected,     setSelected]     = useState<FarmerCert | null>(CERTS[0]);

  const visible = CERTS.filter(c =>
    (kindFilter   === 'ALL' || c.kind   === kindFilter)   &&
    (statusFilter === 'ALL' || c.status === statusFilter)
  );

  return (
    <div className={s.page}>

      {/* Left panel */}
      <div className={s.leftPanel}>

        {/* KPIs */}
        <div className={s.kpiRow}>
          {[
            { label: 'Total',   value: CERTS.length,                                    color: '#0b5ed7' },
            { label: 'Issued',  value: CERTS.filter(c => c.status === 'ISSUED').length,  color: '#059669' },
            { label: 'Pending', value: CERTS.filter(c => c.status === 'PENDING').length, color: '#d97706' },
          ].map(k => (
            <div key={k.label} className={s.kpiChip}>
              <span className={s.kpiNum} style={{ color: k.color }}>{k.value}</span>
              <span className={s.kpiLbl}>{k.label}</span>
            </div>
          ))}
        </div>

        {/* Kind filter */}
        <div className={s.filterRow}>
          {(['ALL', 'EXPORT', 'QUARANTINE_CLEARANCE'] as FilterKind[]).map(k => (
            <button
              key={k}
              className={`${s.filterBtn}${kindFilter === k ? ' ' + s.filterBtnActive : ''}`}
              onClick={() => setKindFilter(k)}
            >
              {k === 'ALL' ? 'All' : k === 'EXPORT' ? 'Export' : 'Quarantine'}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className={s.filterRow}>
          {(['ALL', 'ISSUED', 'PENDING', 'EXPIRED'] as FilterStatus[]).map(st => (
            <button
              key={st}
              className={`${s.filterBtn}${statusFilter === st ? ' ' + s.filterBtnActive : ''}`}
              onClick={() => setStatusFilter(st)}
            >
              {st === 'ALL' ? 'All Status' : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Certificate list */}
        <div className={s.certList}>
          {visible.length === 0 && (
            <div className={s.emptyList}>No certificates found</div>
          )}
          {visible.map(cert => {
            const ss = STATUS_STYLE[cert.status];
            return (
              <button
                key={cert.id}
                className={`${s.certCard}${selected?.id === cert.id ? ' ' + s.certCardActive : ''}`}
                onClick={() => setSelected(cert)}
              >
                <div className={s.certCardTop}>
                  <span className={s.certKindTag}>
                    {cert.kind === 'EXPORT' ? <FileText size={11} /> : <ShieldCheck size={11} />}
                    {cert.kind === 'EXPORT' ? 'EXPORT' : 'QCC'}
                  </span>
                  <span className={s.certStatusBadge} style={{ color: ss.color, background: ss.bg }}>
                    <ss.Icon size={10} /> {ss.label}
                  </span>
                </div>
                <div className={s.certCardNo}>{cert.certNo}</div>
                <div className={s.certCardDesc}>{cert.description}</div>
                {cert.issuedAt && (
                  <div className={s.certCardDate}>Issued: {cert.issuedAt}</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right panel */}
      <div className={s.rightPanel}>
        {!selected ? (
          <div className={s.emptyDetail}>
            <QrCode size={48} color="#c7dff7" />
            <p>Select a certificate to view details</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Status banner for non-issued */}
            {selected.status === 'PENDING' && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '0.875rem 1.125rem', display: 'flex', alignItems: 'center', gap: 10, color: '#92400e', fontSize: '0.875rem', fontWeight: 500 }}>
                <Clock size={16} color="#d97706" />
                This certificate is awaiting review and issuance by the Ministry of Livestock.
              </div>
            )}
            {selected.status === 'EXPIRED' && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '0.875rem 1.125rem', display: 'flex', alignItems: 'center', gap: 10, color: '#64748b', fontSize: '0.875rem', fontWeight: 500 }}>
                <XCircle size={16} color="#94a3b8" />
                This certificate has expired. Contact the Ministry to renew if needed.
              </div>
            )}

            {/* Certificate card */}
            {(selected.status === 'ISSUED' || selected.status === 'EXPIRED') && (
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>

                {/* QR code */}
                <div style={{ background: '#fff', borderRadius: 12, padding: '1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'inline-block', flexShrink: 0 }}>
                  <div dangerouslySetInnerHTML={{ __html: generateQRSVG(selected.certNo) }} />
                  <p style={{ fontSize: '0.6875rem', color: '#94a3b8', textAlign: 'center', margin: '0.5rem 0 0', fontFamily: 'monospace' }}>
                    {selected.certNo}
                  </p>
                </div>

                {/* Certificate detail */}
                <div style={{ flex: 1, minWidth: 280, background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: '1.25rem 1.5rem', fontFamily: 'monospace', fontSize: '0.8125rem', lineHeight: 1.7 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#0f172a', marginBottom: 2 }}>FEDERAL REPUBLIC OF SOMALIA</div>
                  <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#0f172a', marginBottom: '0.5rem' }}>MINISTRY OF LIVESTOCK, FORESTRY AND RANGE</div>
                  <div style={{ borderBottom: '2px solid #0b5ed7', marginBottom: '0.75rem' }} />
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0b5ed7', marginBottom: '0.5rem' }}>
                    {KIND_LABEL[selected.kind].toUpperCase()}
                  </div>
                  <div style={{ borderBottom: '1px solid #e2e8f0', marginBottom: '0.75rem' }} />
                  {Object.entries(selected.detail).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', gap: '0.5rem' }}>
                      <span style={{ color: '#64748b', minWidth: 140, flexShrink: 0 }}>{k}:</span>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{v}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '0.75rem', paddingTop: '0.5rem', color: '#64748b', fontSize: '0.75rem' }}>
                    Verify at qxlits.gov.so · QXLITS Authorized
                  </div>
                </div>
              </div>
            )}

            {/* Pending detail view */}
            {selected.status === 'PENDING' && (
              <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: '1.25rem 1.5rem', fontFamily: 'monospace', fontSize: '0.8125rem', lineHeight: 1.7 }}>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a', marginBottom: '0.75rem' }}>
                  {KIND_LABEL[selected.kind]} — {selected.certNo}
                </div>
                <div style={{ borderBottom: '1px solid #e2e8f0', marginBottom: '0.75rem' }} />
                {Object.entries(selected.detail).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', gap: '0.5rem' }}>
                    <span style={{ color: '#64748b', minWidth: 140, flexShrink: 0 }}>{k}:</span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{v}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Animals table (if present) */}
            {selected.animals && selected.animals.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                <div style={{ padding: '0.875rem 1.125rem', borderBottom: '1px solid #f1f5f9', fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>
                  Animals Covered ({selected.animals.length} shown of {selected.detail['Animal Count'] ?? selected.animals.length})
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Animal ID', 'Tag Serial', 'Species'].map(h => (
                        <th key={h} style={{ padding: '0.625rem 1rem', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selected.animals.map((a, i) => (
                      <tr key={a.animalId} style={{ borderTop: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.625rem 1rem', fontFamily: 'monospace', fontWeight: 600, color: '#0b5ed7' }}>{a.animalId}</td>
                        <td style={{ padding: '0.625rem 1rem', fontFamily: 'monospace', color: '#334155' }}>{a.tagSerial}</td>
                        <td style={{ padding: '0.625rem 1rem', color: '#334155' }}>{a.species}</td>
                      </tr>
                    ))}
                    {parseInt(selected.detail['Animal Count'] ?? '0') > selected.animals.length && (
                      <tr style={{ borderTop: '1px solid #f1f5f9' }}>
                        <td colSpan={3} style={{ padding: '0.625rem 1rem', color: '#94a3b8', fontSize: '0.8125rem', textAlign: 'center' }}>
                          + {parseInt(selected.detail['Animal Count'] ?? '0') - selected.animals.length} more animals in this consignment
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Actions */}
            {(selected.status === 'ISSUED' || selected.status === 'EXPIRED') && (
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => window.print()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#0b5ed7', color: '#fff', border: 'none', borderRadius: 8, padding: '0 1.25rem', height: 38, fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
                >
                  <Printer size={14} /> Print Certificate
                </button>
                <a
                  href={`/certificates/${selected.id}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f1f5f9', color: '#334155', borderRadius: 8, padding: '0 1.25rem', height: 38, fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}
                >
                  View Full <ArrowRight size={13} />
                </a>
              </div>
            )}

          </div>
        )}
      </div>

    </div>
  );
}

export default CertificatesPage;
