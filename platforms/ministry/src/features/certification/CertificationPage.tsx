import { useState } from 'react';
import {
  FileText, CheckCircle, XCircle, Clock, AlertTriangle,
  Plus, Printer, ShieldCheck, ChevronDown, ChevronUp,
} from 'lucide-react';
import s from './certification.module.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ExportStatus = 'DRAFT' | 'PENDING_REVIEW' | 'ISSUED' | 'REJECTED' | 'EXPIRED' | 'REVOKED';
type QCCStatus = 'PENDING' | 'ISSUED' | 'REVOKED';
type InspectionResult = 'PENDING' | 'PASSED' | 'FAILED';

interface ConsignmentAnimal {
  id: string; animalId: string; tagSerial: string; species: string; breed: string;
  sex: 'M' | 'F'; ageMonths: number; weightKg: number; originFarm: string;
  inspection: InspectionResult;
}

interface ExportConsignment {
  id: string; consignmentCode: string; certNo?: string;
  exporterCode: string; exporterName: string;
  destinationCountry: string; portOfExit: string;
  species: string; animalCount: number; status: ExportStatus;
  quarantineRef?: string; certifyingOfficer?: string;
  issuedAt?: string; expiresAt?: string; createdAt: string;
  rejectionReason?: string;
  animals: ConsignmentAnimal[];
  vaccinations: string[]; testsConducted: string[];
}

interface QCCert {
  id: string; certNo: string; zoneRef: string; zoneName: string;
  region: string; premisesCodes: string[]; animalCount: number;
  holdStart: string; holdEnd: string;
  clearanceBasis: string; testsNegative: string[];
  issuingVet: string; status: QCCStatus; issuedAt?: string;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const CONSIGNMENTS: ExportConsignment[] = [
  {
    id: 'ec-001', consignmentCode: 'EC-2026-00041', certNo: 'EHC-SOM-2026-0041',
    exporterCode: 'EXP-MOG-0012', exporterName: 'Barwaaqo Livestock Exports Ltd',
    destinationCountry: 'Saudi Arabia', portOfExit: 'Mogadishu Port',
    species: 'Cattle', animalCount: 150, status: 'ISSUED',
    quarantineRef: 'QCC-2026-001', certifyingOfficer: 'Dr. Abdi Warsame',
    issuedAt: '2026-07-28', expiresAt: '2026-08-28', createdAt: '2026-07-20',
    vaccinations: ['FMD', 'CBPP', 'BQ', 'Anthrax'],
    testsConducted: ['Brucellosis (Negative)', 'TB (Negative)', 'RVF (Negative)', 'PPR (Negative)'],
    animals: [
      { id: 'a1', animalId: 'SOB-2026-0441', tagSerial: 'RFID-2026-00441', species: 'Cattle', breed: 'Somali Zebu', sex: 'M', ageMonths: 36, weightKg: 280, originFarm: 'SOM-BAY-001', inspection: 'PASSED' },
      { id: 'a2', animalId: 'SOB-2026-0442', tagSerial: 'RFID-2026-00442', species: 'Cattle', breed: 'Somali Zebu', sex: 'M', ageMonths: 42, weightKg: 310, originFarm: 'SOM-BAY-001', inspection: 'PASSED' },
      { id: 'a3', animalId: 'SOB-2026-0443', tagSerial: 'RFID-2026-00443', species: 'Cattle', breed: 'Somali Zebu', sex: 'F', ageMonths: 28, weightKg: 240, originFarm: 'SOM-BAY-002', inspection: 'PASSED' },
    ],
  },
  {
    id: 'ec-002', consignmentCode: 'EC-2026-00042',
    exporterCode: 'EXP-MOG-0008', exporterName: 'Geel Star Exports',
    destinationCountry: 'UAE', portOfExit: 'Berbera Port',
    species: 'Camel', animalCount: 80, status: 'PENDING_REVIEW',
    quarantineRef: 'QCC-2026-002', createdAt: '2026-08-01',
    vaccinations: ['CCPP', 'RVF'],
    testsConducted: ['Brucellosis (Negative)', 'Trypanosomiasis (Negative)'],
    animals: [
      { id: 'b1', animalId: 'SOC-2026-0091', tagSerial: 'RFID-2026-00891', species: 'Camel', breed: 'Somali Dromedary', sex: 'M', ageMonths: 60, weightKg: 450, originFarm: 'SOM-TOG-001', inspection: 'PASSED' },
      { id: 'b2', animalId: 'SOC-2026-0092', tagSerial: 'RFID-2026-00892', species: 'Camel', breed: 'Somali Dromedary', sex: 'M', ageMonths: 54, weightKg: 420, originFarm: 'SOM-TOG-001', inspection: 'PENDING' },
    ],
  },
  {
    id: 'ec-003', consignmentCode: 'EC-2026-00043',
    exporterCode: 'EXP-KIS-0003', exporterName: 'Jubaland Livestock Co.',
    destinationCountry: 'Egypt', portOfExit: 'Kismayo Port',
    species: 'Sheep', animalCount: 200, status: 'DRAFT',
    createdAt: '2026-08-03',
    vaccinations: ['PPR', 'FMD'],
    testsConducted: [],
    animals: [
      { id: 'c1', animalId: 'SOS-2026-0201', tagSerial: 'RFID-2026-02001', species: 'Sheep', breed: 'Somali Blackhead', sex: 'M', ageMonths: 18, weightKg: 35, originFarm: 'SOM-JUB-004', inspection: 'PENDING' },
    ],
  },
  {
    id: 'ec-004', consignmentCode: 'EC-2026-00044',
    exporterCode: 'EXP-MOG-0015', exporterName: 'Hormuud Livestock',
    destinationCountry: 'Oman', portOfExit: 'Mogadishu Port',
    species: 'Goat', animalCount: 60, status: 'REJECTED',
    rejectionReason: 'Brucellosis test results not yet received from NAAH laboratory. Resubmit once test results are confirmed negative.',
    createdAt: '2026-07-25',
    vaccinations: ['PPR'],
    testsConducted: [],
    animals: [],
  },
];

const QCC_CERTS: QCCert[] = [
  {
    id: 'qcc-001', certNo: 'QCC-2026-001', zoneRef: 'MOG-Q-2026-001',
    zoneName: 'Daynile Quarantine Zone', region: 'Banaadir',
    premisesCodes: ['SOM-MOG-004', 'SOM-MOG-007', 'SOM-MOG-009'],
    animalCount: 340, holdStart: '2026-06-10', holdEnd: '2026-07-10',
    clearanceBasis: 'No new disease cases recorded. 30-day isolation period completed. All serology negative.',
    testsNegative: ['FMD (ELISA)', 'CBPP (CFT)', 'Anthrax (Culture)', 'RVF (PCR)'],
    issuingVet: 'Dr. Fadumo Hirsi', status: 'ISSUED', issuedAt: '2026-07-12',
  },
  {
    id: 'qcc-002', certNo: 'QCC-2026-002', zoneRef: 'BAY-Q-2026-003',
    zoneName: 'Baidoa Clearance Zone', region: 'Bay',
    premisesCodes: ['SOM-BAY-011', 'SOM-BAY-012'],
    animalCount: 180, holdStart: '2026-07-01', holdEnd: '2026-07-31',
    clearanceBasis: 'FMD outbreak resolved. Animals healthy. Waiting for final serology batch from Baidoa lab.',
    testsNegative: ['FMD (ELISA)', 'BQ (Culture)'],
    issuingVet: 'Dr. Ahmed Geele', status: 'PENDING',
  },
  {
    id: 'qcc-003', certNo: 'QCC-2026-003', zoneRef: 'GAR-Q-2026-001',
    zoneName: 'Garowe Export Hold', region: 'Nugaal',
    premisesCodes: ['SOM-GAR-003'],
    animalCount: 95, holdStart: '2026-08-01', holdEnd: '2026-08-21',
    clearanceBasis: 'Pre-export quarantine hold — 21-day isolation required for UAE export compliance.',
    testsNegative: [],
    issuingVet: '', status: 'PENDING',
  },
];

// ---------------------------------------------------------------------------
// QR SVG generator
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Status styles
// ---------------------------------------------------------------------------

const EXPORT_STATUS_STYLE: Record<ExportStatus, { color: string; bg: string; label: string }> = {
  DRAFT:          { color: '#64748b', bg: '#f1f5f9', label: 'Draft' },
  PENDING_REVIEW: { color: '#d97706', bg: '#fffbeb', label: 'Pending Review' },
  ISSUED:         { color: '#059669', bg: '#ecfdf5', label: 'Issued' },
  REJECTED:       { color: '#dc2626', bg: '#fef2f2', label: 'Rejected' },
  EXPIRED:        { color: '#94a3b8', bg: '#f8fafc', label: 'Expired' },
  REVOKED:        { color: '#7c3aed', bg: '#f5f3ff', label: 'Revoked' },
};

const QCC_STATUS_STYLE: Record<QCCStatus, { color: string; bg: string }> = {
  PENDING: { color: '#d97706', bg: '#fffbeb' },
  ISSUED:  { color: '#059669', bg: '#ecfdf5' },
  REVOKED: { color: '#7c3aed', bg: '#f5f3ff' },
};

const INSP_STYLE: Record<InspectionResult, { color: string; bg: string }> = {
  PENDING: { color: '#64748b', bg: '#f1f5f9' },
  PASSED:  { color: '#059669', bg: '#ecfdf5' },
  FAILED:  { color: '#dc2626', bg: '#fef2f2' },
};

// ---------------------------------------------------------------------------
// Shared helpers / constants
// ---------------------------------------------------------------------------

const COUNTRY_FLAG: Record<string, string> = {
  'Saudi Arabia': '🇸🇦',
  'UAE': '🇦🇪',
  'Egypt': '🇪🇬',
  'Oman': '🇴🇲',
  'Kuwait': '🇰🇼',
  'Qatar': '🇶🇦',
};

const flagFor = (country: string) => COUNTRY_FLAG[country] ?? '';

const INPUT_STYLE: React.CSSProperties = {
  width: '100%', padding: '0 0.75rem', height: 36,
  border: '1px solid #e2e8f0', borderRadius: 8,
  fontSize: '0.875rem', background: '#f8fafc',
  outline: 'none', boxSizing: 'border-box',
};

const BTN_PRIMARY: React.CSSProperties = {
  background: '#0b5ed7', color: '#fff', border: 'none', borderRadius: 8,
  padding: '0 1.25rem', height: 36, fontWeight: 600,
  fontSize: '0.875rem', cursor: 'pointer',
};

const BTN_CANCEL: React.CSSProperties = {
  background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: 8,
  padding: '0 1.25rem', height: 36, fontWeight: 600,
  fontSize: '0.875rem', cursor: 'pointer',
};

const BTN_GREEN: React.CSSProperties = { ...BTN_PRIMARY, background: '#059669' };
const BTN_RED: React.CSSProperties = { ...BTN_PRIMARY, background: '#dc2626' };

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function rand4(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// ---------------------------------------------------------------------------
// Inline form component
// ---------------------------------------------------------------------------

interface FieldProps {
  label: string;
  children: React.ReactNode;
}
function Field({ label, children }: FieldProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>{label}</label>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ExportTab
// ---------------------------------------------------------------------------

interface ExportTabProps {
  consignments: ExportConsignment[];
  onUpdate: (list: ExportConsignment[]) => void;
}

function ExportTab({ consignments, onUpdate }: ExportTabProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ExportStatus | 'ALL'>('ALL');
  const [showNewForm, setShowNewForm] = useState(false);

  // New consignment form state
  const [newExporterCode, setNewExporterCode] = useState('');
  const [newExporterName, setNewExporterName] = useState('');
  const [newCountry, setNewCountry] = useState('');
  const [newPort, setNewPort] = useState('');
  const [newSpecies, setNewSpecies] = useState('Cattle');
  const [newCount, setNewCount] = useState('');

  // Detail panel state
  const [qRefInput, setQRefInput] = useState('');
  const [vaccInput, setVaccInput] = useState('');
  const [testsInput, setTestsInput] = useState('');
  const [showAnimalForm, setShowAnimalForm] = useState(false);
  const [officerInput, setOfficerInput] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectArea, setShowRejectArea] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  // Add animal form state
  const [aAnimalId, setAAnimalId] = useState('');
  const [aTagSerial, setATagSerial] = useState('');
  const [aSpecies, setASpecies] = useState('');
  const [aBreed, setABreed] = useState('');
  const [aSex, setASex] = useState<'M' | 'F'>('M');
  const [aAge, setAAge] = useState('');
  const [aWeight, setAWeight] = useState('');
  const [aFarm, setAFarm] = useState('');

  const selected = consignments.find(c => c.id === selectedId) ?? null;

  // Sync detail inputs when selection changes
  const handleSelect = (c: ExportConsignment) => {
    setSelectedId(c.id);
    setQRefInput(c.quarantineRef ?? '');
    setVaccInput(c.vaccinations.join(', '));
    setTestsInput(c.testsConducted.join(', '));
    setOfficerInput(c.certifyingOfficer ?? '');
    setRejectReason('');
    setShowRejectArea(false);
    setShowAnimalForm(false);
  };

  const update = (updated: ExportConsignment) => {
    onUpdate(consignments.map(c => c.id === updated.id ? updated : c));
    setSelectedId(updated.id);
  };

  // KPI counts
  const total = consignments.length;
  const pendingCount = consignments.filter(c => c.status === 'PENDING_REVIEW').length;
  const issuedCount = consignments.filter(c => c.status === 'ISSUED').length;
  const rejectedCount = consignments.filter(c => c.status === 'REJECTED').length;

  // Filtered list
  const filtered = consignments.filter(c => {
    const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q
      || c.consignmentCode.toLowerCase().includes(q)
      || c.exporterName.toLowerCase().includes(q)
      || c.destinationCountry.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  // New consignment submit
  const handleNewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const seq = String(consignments.length + 45).padStart(5, '0');
    const newC: ExportConsignment = {
      id: `ec-${Date.now()}`,
      consignmentCode: `EC-2026-${seq}`,
      exporterCode: newExporterCode.trim(),
      exporterName: newExporterName.trim(),
      destinationCountry: newCountry.trim(),
      portOfExit: newPort.trim(),
      species: newSpecies,
      animalCount: parseInt(newCount) || 0,
      status: 'DRAFT',
      createdAt: todayISO(),
      vaccinations: [],
      testsConducted: [],
      animals: [],
    };
    onUpdate([...consignments, newC]);
    setShowNewForm(false);
    setNewExporterCode(''); setNewExporterName(''); setNewCountry('');
    setNewPort(''); setNewCount('');
    handleSelect(newC);
  };

  // Save details (quarantineRef, vaccinations, tests)
  const saveDetails = () => {
    if (!selected) return;
    update({
      ...selected,
      quarantineRef: qRefInput.trim() || undefined,
      vaccinations: vaccInput.split(',').map(v => v.trim()).filter(Boolean),
      testsConducted: testsInput.split(',').map(v => v.trim()).filter(Boolean),
    });
  };

  // Submit for review
  const submitForReview = () => {
    if (!selected) return;
    saveDetails();
    update({ ...selected, status: 'PENDING_REVIEW' });
  };

  // Issue certificate
  const issueCertificate = () => {
    if (!selected) return;
    const today = todayISO();
    update({
      ...selected,
      status: 'ISSUED',
      certNo: `EHC-SOM-2026-${rand4()}`,
      certifyingOfficer: officerInput.trim() || 'Ministry of Livestock Somalia',
      issuedAt: today,
      expiresAt: addDays(today, 30),
    });
  };

  // Reject
  const rejectConsignment = () => {
    if (!selected || !rejectReason.trim()) return;
    update({ ...selected, status: 'REJECTED', rejectionReason: rejectReason.trim() });
    setShowRejectArea(false);
  };

  // Revoke
  const revokeConsignment = () => {
    if (!selected) return;
    update({ ...selected, status: 'REVOKED' });
    setConfirmRevoke(false);
  };

  // Resubmit (REJECTED → DRAFT)
  const resubmit = () => {
    if (!selected) return;
    update({ ...selected, status: 'DRAFT', rejectionReason: undefined });
  };

  // Inspect animal
  const inspectAnimal = (animalId: string, result: InspectionResult) => {
    if (!selected) return;
    update({
      ...selected,
      animals: selected.animals.map(a => a.id === animalId ? { ...a, inspection: result } : a),
    });
  };

  // Add animal
  const handleAddAnimal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    const newAnimal: ConsignmentAnimal = {
      id: `animal-${Date.now()}`,
      animalId: aAnimalId.trim(),
      tagSerial: aTagSerial.trim(),
      species: aSpecies.trim(),
      breed: aBreed.trim(),
      sex: aSex,
      ageMonths: parseInt(aAge) || 0,
      weightKg: parseFloat(aWeight) || 0,
      originFarm: aFarm.trim(),
      inspection: 'PENDING',
    };
    update({ ...selected, animals: [...selected.animals, newAnimal] });
    setAAnimalId(''); setATagSerial(''); setASpecies(''); setABreed('');
    setASex('M'); setAAge(''); setAWeight(''); setAFarm('');
    setShowAnimalForm(false);
  };

  const canIssue = selected
    && selected.animals.length > 0
    && selected.animals.every(a => a.inspection === 'PASSED');

  const STATUS_FILTERS: Array<ExportStatus | 'ALL'> = ['ALL', 'DRAFT', 'PENDING_REVIEW', 'ISSUED', 'REJECTED'];

  return (
    <div style={{ display: 'flex', gap: '1rem', minHeight: 600, alignItems: 'flex-start' }}>
      {/* Left panel */}
      <div style={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* KPIs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {[
            { label: 'Total', value: total, icon: <FileText size={16} color="#64748b" /> },
            { label: 'Pending', value: pendingCount, icon: <Clock size={16} color="#d97706" /> },
            { label: 'Issued', value: issuedCount, icon: <CheckCircle size={16} color="#059669" /> },
            { label: 'Rejected', value: rejectedCount, icon: <XCircle size={16} color="#dc2626" /> },
          ].map(kpi => (
            <div key={kpi.label} className={s.kpi} style={{ flex: '1 1 120px', padding: '0.75rem 1rem', minWidth: 100 }}>
              <div className={s.kpiIcon} style={{ width: 32, height: 32, background: '#f1f5f9', borderRadius: 8 }}>
                {kpi.icon}
              </div>
              <div>
                <div className={s.kpiVal} style={{ fontSize: '1.25rem' }}>{kpi.value}</div>
                <div className={s.kpiLabel}>{kpi.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* New consignment button */}
        <button
          style={{ ...BTN_PRIMARY, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', width: '100%' }}
          onClick={() => setShowNewForm(v => !v)}
        >
          <Plus size={15} />
          {showNewForm ? 'Cancel' : 'New Consignment'}
        </button>

        {/* New consignment form */}
        {showNewForm && (
          <form
            onSubmit={handleNewSubmit}
            style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '1rem', display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#0f172a', marginBottom: 2 }}>New Consignment</div>
            <Field label="Exporter Code">
              <input style={INPUT_STYLE} required value={newExporterCode} onChange={e => setNewExporterCode(e.target.value)} placeholder="EXP-MOG-0001" />
            </Field>
            <Field label="Exporter Name">
              <input style={INPUT_STYLE} required value={newExporterName} onChange={e => setNewExporterName(e.target.value)} placeholder="Company name" />
            </Field>
            <Field label="Destination Country">
              <input style={INPUT_STYLE} required value={newCountry} onChange={e => setNewCountry(e.target.value)} placeholder="Saudi Arabia" />
            </Field>
            <Field label="Port of Exit">
              <input style={INPUT_STYLE} required value={newPort} onChange={e => setNewPort(e.target.value)} placeholder="Mogadishu Port" />
            </Field>
            <Field label="Species">
              <select
                style={INPUT_STYLE}
                value={newSpecies}
                onChange={e => setNewSpecies(e.target.value)}
              >
                {['Cattle', 'Camel', 'Goat', 'Sheep'].map(sp => (
                  <option key={sp}>{sp}</option>
                ))}
              </select>
            </Field>
            <Field label="Expected Animal Count">
              <input style={INPUT_STYLE} required type="number" min={1} value={newCount} onChange={e => setNewCount(e.target.value)} placeholder="0" />
            </Field>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button type="submit" style={BTN_PRIMARY}>Create</button>
              <button type="button" style={BTN_CANCEL} onClick={() => setShowNewForm(false)}>Cancel</button>
            </div>
          </form>
        )}

        {/* Search */}
        <input
          style={INPUT_STYLE}
          placeholder="Search consignments..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {/* Status filter */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {STATUS_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              style={{
                padding: '0.25rem 0.625rem',
                borderRadius: 20,
                border: '1px solid #e2e8f0',
                fontSize: '0.6875rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: statusFilter === f ? '#0b5ed7' : '#f8fafc',
                color: statusFilter === f ? '#fff' : '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {f === 'ALL' ? 'All' : (EXPORT_STATUS_STYLE[f as ExportStatus]?.label ?? f)}
            </button>
          ))}
        </div>

        {/* Consignment cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filtered.length === 0 && (
            <div className={s.muted} style={{ textAlign: 'center', padding: '1.5rem', fontSize: '0.875rem' }}>No consignments found.</div>
          )}
          {filtered.map(c => {
            const st = EXPORT_STATUS_STYLE[c.status];
            const isSelected = c.id === selectedId;
            return (
              <div
                key={c.id}
                onClick={() => handleSelect(c)}
                style={{
                  background: '#fff',
                  border: isSelected ? '2px solid #0b5ed7' : '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '0.75rem 1rem',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <span className={s.code} style={{ fontSize: '0.8rem' }}>{c.consignmentCode}</span>
                  <span
                    className={s.badge}
                    style={{ background: st.bg, color: st.color }}
                  >
                    {st.label}
                  </span>
                </div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b', marginBottom: 2 }}>{c.exporterName}</div>
                <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                  {flagFor(c.destinationCountry)} {c.destinationCountry}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>
                  {c.species} &bull; {c.animalCount} animals &bull; {c.createdAt}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {!selected && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 12, color: '#94a3b8' }}>
            <FileText size={48} strokeWidth={1} />
            <div style={{ fontSize: '0.9375rem', fontWeight: 500 }}>Select a consignment to view details</div>
            <div style={{ fontSize: '0.8125rem' }}>Or create a new consignment using the button on the left</div>
          </div>
        )}

        {/* DRAFT or PENDING_REVIEW */}
        {selected && (selected.status === 'DRAFT' || selected.status === 'PENDING_REVIEW') && (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span className={s.code} style={{ fontSize: '1rem' }}>{selected.consignmentCode}</span>
              <span
                className={s.badge}
                style={{ background: EXPORT_STATUS_STYLE[selected.status].bg, color: EXPORT_STATUS_STYLE[selected.status].color }}
              >
                {EXPORT_STATUS_STYLE[selected.status].label}
              </span>
              <span style={{ fontSize: '0.875rem', color: '#334155' }}>{selected.exporterName}</span>
              <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                {flagFor(selected.destinationCountry)} {selected.destinationCountry}
              </span>
            </div>

            {/* Details row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Port of Exit</div>
                <div style={{ fontSize: '0.875rem', color: '#1e293b', fontWeight: 500 }}>{selected.portOfExit}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Quarantine Reference</div>
                <input
                  style={{ ...INPUT_STYLE, width: '100%' }}
                  value={qRefInput}
                  onChange={e => setQRefInput(e.target.value)}
                  placeholder="QCC-2026-XXX"
                />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Vaccinations</div>
                <input
                  style={{ ...INPUT_STYLE, width: '100%' }}
                  value={vaccInput}
                  onChange={e => setVaccInput(e.target.value)}
                  placeholder="FMD, CBPP, BQ (comma-separated)"
                />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Tests Conducted</div>
                <input
                  style={{ ...INPUT_STYLE, width: '100%' }}
                  value={testsInput}
                  onChange={e => setTestsInput(e.target.value)}
                  placeholder="Brucellosis (Negative) (comma-separated)"
                />
              </div>
            </div>

            {/* Animal table */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>Animals ({selected.animals.length})</div>
                <button
                  style={{ ...BTN_PRIMARY, display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={() => setShowAnimalForm(v => !v)}
                >
                  <Plus size={14} />
                  {showAnimalForm ? 'Cancel' : 'Add Animal'}
                </button>
              </div>

              {/* Add animal form */}
              {showAnimalForm && (
                <form
                  onSubmit={handleAddAnimal}
                  style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '1rem', marginBottom: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}
                >
                  <Field label="Animal ID">
                    <input style={INPUT_STYLE} required value={aAnimalId} onChange={e => setAAnimalId(e.target.value)} placeholder="SOB-2026-XXXX" />
                  </Field>
                  <Field label="Tag Serial">
                    <input style={INPUT_STYLE} required value={aTagSerial} onChange={e => setATagSerial(e.target.value)} placeholder="RFID-2026-XXXXX" />
                  </Field>
                  <Field label="Species">
                    <input style={INPUT_STYLE} required value={aSpecies} onChange={e => setASpecies(e.target.value)} placeholder="Cattle" />
                  </Field>
                  <Field label="Breed">
                    <input style={INPUT_STYLE} required value={aBreed} onChange={e => setABreed(e.target.value)} placeholder="Somali Zebu" />
                  </Field>
                  <Field label="Sex">
                    <select style={INPUT_STYLE} value={aSex} onChange={e => setASex(e.target.value as 'M' | 'F')}>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                    </select>
                  </Field>
                  <Field label="Age (months)">
                    <input style={INPUT_STYLE} required type="number" min={1} value={aAge} onChange={e => setAAge(e.target.value)} placeholder="24" />
                  </Field>
                  <Field label="Weight (kg)">
                    <input style={INPUT_STYLE} required type="number" min={1} value={aWeight} onChange={e => setAWeight(e.target.value)} placeholder="250" />
                  </Field>
                  <Field label="Origin Farm">
                    <input style={INPUT_STYLE} required value={aFarm} onChange={e => setAFarm(e.target.value)} placeholder="SOM-BAY-001" />
                  </Field>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                    <button type="submit" style={BTN_PRIMARY}>Add</button>
                    <button type="button" style={BTN_CANCEL} onClick={() => setShowAnimalForm(false)}>Cancel</button>
                  </div>
                </form>
              )}

              {selected.animals.length === 0 ? (
                <div className={s.muted} style={{ textAlign: 'center', padding: '1.5rem', fontSize: '0.875rem' }}>No animals added yet.</div>
              ) : (
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {['Animal ID', 'Tag Serial', 'Species', 'Breed', 'Sex', 'Age', 'Weight', 'Origin Farm', 'Inspection', ''].map(h => (
                          <th key={h} style={{ padding: '0.625rem 0.75rem', textAlign: 'left', fontWeight: 700, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selected.animals.map(a => {
                        const inspSt = INSP_STYLE[a.inspection];
                        return (
                          <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.625rem 0.75rem' }}><span className={s.code}>{a.animalId}</span></td>
                            <td style={{ padding: '0.625rem 0.75rem', color: '#64748b' }}>{a.tagSerial}</td>
                            <td style={{ padding: '0.625rem 0.75rem', color: '#334155' }}>{a.species}</td>
                            <td style={{ padding: '0.625rem 0.75rem', color: '#334155' }}>{a.breed}</td>
                            <td style={{ padding: '0.625rem 0.75rem', color: '#334155' }}>{a.sex === 'M' ? 'Male' : 'Female'}</td>
                            <td style={{ padding: '0.625rem 0.75rem', color: '#334155' }}>{a.ageMonths}mo</td>
                            <td style={{ padding: '0.625rem 0.75rem', color: '#334155' }}>{a.weightKg}kg</td>
                            <td style={{ padding: '0.625rem 0.75rem' }}><span className={s.code} style={{ fontSize: '0.75rem' }}>{a.originFarm}</span></td>
                            <td style={{ padding: '0.625rem 0.75rem' }}>
                              <span className={s.badge} style={{ background: inspSt.bg, color: inspSt.color }}>{a.inspection}</span>
                            </td>
                            <td style={{ padding: '0.625rem 0.75rem' }}>
                              <select
                                value={a.inspection}
                                onChange={e => inspectAnimal(a.id, e.target.value as InspectionResult)}
                                style={{ ...INPUT_STYLE, width: 'auto', height: 28, padding: '0 0.5rem', fontSize: '0.75rem' }}
                              >
                                <option value="PENDING">Pending</option>
                                <option value="PASSED">Passed</option>
                                <option value="FAILED">Failed</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
              {selected.status === 'DRAFT' && (
                <button style={BTN_PRIMARY} onClick={submitForReview}>Submit for Review</button>
              )}
              {selected.status === 'PENDING_REVIEW' && (
                <>
                  <Field label="Certifying Officer">
                    <input
                      style={{ ...INPUT_STYLE, width: 220 }}
                      value={officerInput}
                      onChange={e => setOfficerInput(e.target.value)}
                      placeholder="Dr. Name Surname"
                    />
                  </Field>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <button
                      style={{ ...BTN_GREEN, opacity: canIssue ? 1 : 0.5, cursor: canIssue ? 'pointer' : 'not-allowed' }}
                      onClick={canIssue ? issueCertificate : undefined}
                      title={!canIssue ? 'All animals must pass inspection before issuing' : ''}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ShieldCheck size={15} /> Issue Certificate
                      </span>
                    </button>
                    <button style={BTN_RED} onClick={() => setShowRejectArea(v => !v)}>
                      {showRejectArea ? 'Cancel Reject' : 'Reject'}
                    </button>
                  </div>
                  {!canIssue && selected.animals.length > 0 && (
                    <div style={{ width: '100%', fontSize: '0.8125rem', color: '#d97706', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AlertTriangle size={14} />
                      All animals must have PASSED inspection before issuing.
                    </div>
                  )}
                </>
              )}
              <button style={{ ...BTN_CANCEL, marginLeft: 'auto' }} onClick={saveDetails}>Save Details</button>
            </div>

            {/* Reject area */}
            {showRejectArea && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '1rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#dc2626' }}>Rejection Reason</div>
                <textarea
                  style={{ ...INPUT_STYLE, height: 80, resize: 'vertical', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="State the reason for rejection..."
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={BTN_RED} onClick={rejectConsignment}>Confirm Rejection</button>
                  <button style={BTN_CANCEL} onClick={() => setShowRejectArea(false)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ISSUED */}
        {selected && selected.status === 'ISSUED' && (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
              {/* Certificate */}
              <div style={{ flex: 1, border: '2px solid #0f172a', borderRadius: 8, padding: '1.5rem', fontFamily: 'monospace' }}>
                <div style={{ textAlign: 'center', marginBottom: '1rem', borderBottom: '1px solid #0f172a', paddingBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', letterSpacing: '0.1em', fontWeight: 700, color: '#0f172a' }}>FEDERAL REPUBLIC OF SOMALIA</div>
                  <div style={{ fontSize: '0.75rem', letterSpacing: '0.1em', fontWeight: 700, color: '#0f172a' }}>MINISTRY OF LIVESTOCK, FORESTRY AND RANGE</div>
                  <div style={{ fontSize: '1rem', fontWeight: 900, marginTop: '0.5rem', letterSpacing: '0.05em' }}>EXPORT HEALTH CERTIFICATE</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1.5rem', fontSize: '0.8125rem' }}>
                  {[
                    ['Certificate No', selected.certNo],
                    ['Consignment Code', selected.consignmentCode],
                    ['Exporter', selected.exporterName],
                    ['Exporter Code', selected.exporterCode],
                    ['Destination Country', selected.destinationCountry],
                    ['Port of Exit', selected.portOfExit],
                    ['Date of Issue', selected.issuedAt],
                    ['Valid Until', selected.expiresAt],
                    ['Species', selected.species],
                    ['Animal Count', String(selected.animalCount)],
                    ['Quarantine Reference', selected.quarantineRef ?? 'N/A'],
                    ['Certifying Officer', selected.certifyingOfficer ?? 'N/A'],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <div style={{ fontSize: '0.6875rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 1 }}>{label}</div>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{val}</div>
                    </div>
                  ))}
                </div>
                {selected.vaccinations.length > 0 && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <div style={{ fontSize: '0.6875rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Vaccinations</div>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8125rem', color: '#0f172a' }}>
                      {selected.vaccinations.map(v => <li key={v}>{v}</li>)}
                    </ul>
                  </div>
                )}
                {selected.testsConducted.length > 0 && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <div style={{ fontSize: '0.6875rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Tests Conducted</div>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8125rem', color: '#0f172a' }}>
                      {selected.testsConducted.map(t => <li key={t}>{t}</li>)}
                    </ul>
                  </div>
                )}
                <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #0f172a', fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', textAlign: 'center', letterSpacing: '0.08em' }}>
                  QXLITS AUTHORIZED — MINISTRY OF LIVESTOCK SOMALIA
                </div>
              </div>

              {/* QR */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div
                  dangerouslySetInnerHTML={{ __html: generateQRSVG(selected.certNo ?? selected.consignmentCode) }}
                  style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 8 }}
                />
                <div style={{ fontSize: '0.6875rem', color: '#94a3b8', fontFamily: 'monospace' }}>{selected.certNo}</div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
              <button
                style={{ ...BTN_PRIMARY, display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => window.print()}
              >
                <Printer size={15} /> Print Certificate
              </button>
              <button style={BTN_RED} onClick={() => setConfirmRevoke(true)}>Revoke</button>
              {confirmRevoke && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', width: 420, boxShadow: '0 8px 32px rgba(0,0,0,.18)' }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: '#7f1d1d', marginBottom: '0.5rem' }}>Revoke Certificate?</div>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 1.5rem' }}>
                      Revoking <strong>{selected?.certNumber}</strong> is permanent and cannot be undone. The certificate will be marked invalid and the farmer will be notified.
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => setConfirmRevoke(false)} style={{ border: 'none', borderRadius: 8, padding: '0.45rem 1rem', background: '#f3f4f6', color: '#374151', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                      <button onClick={revokeConsignment} style={{ border: 'none', borderRadius: 8, padding: '0.45rem 1rem', background: '#dc2626', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Confirm Revoke</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* REJECTED */}
        {selected && selected.status === 'REJECTED' && (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className={s.code}>{selected.consignmentCode}</span>
              <span className={s.badge} style={{ background: EXPORT_STATUS_STYLE.REJECTED.bg, color: EXPORT_STATUS_STYLE.REJECTED.color }}>Rejected</span>
            </div>
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '1rem', display: 'flex', gap: 12 }}>
              <XCircle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#dc2626', marginBottom: 4 }}>Rejection Reason</div>
                <div style={{ fontSize: '0.875rem', color: '#7f1d1d', lineHeight: 1.6 }}>{selected.rejectionReason}</div>
              </div>
            </div>
            <button style={{ ...BTN_PRIMARY, alignSelf: 'flex-start' }} onClick={resubmit}>
              Revise &amp; Resubmit
            </button>
          </div>
        )}

        {/* REVOKED / EXPIRED */}
        {selected && (selected.status === 'REVOKED' || selected.status === 'EXPIRED') && (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className={s.code}>{selected.consignmentCode}</span>
              <span className={s.badge} style={{ background: EXPORT_STATUS_STYLE[selected.status].bg, color: EXPORT_STATUS_STYLE[selected.status].color }}>
                {EXPORT_STATUS_STYLE[selected.status].label}
              </span>
            </div>
            <div className={s.muted} style={{ fontSize: '0.875rem' }}>
              This certificate has been {selected.status.toLowerCase()}. No further actions are available.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// QCCTab
// ---------------------------------------------------------------------------

interface QCCTabProps {
  certs: QCCert[];
  onUpdate: (list: QCCert[]) => void;
}

function QCCTab({ certs, onUpdate }: QCCTabProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [vetInput, setVetInput] = useState('');

  // New QCC form state
  const [nZoneRef, setNZoneRef] = useState('');
  const [nZoneName, setNZoneName] = useState('');
  const [nRegion, setNRegion] = useState('');
  const [nPremises, setNPremises] = useState('');
  const [nAnimalCount, setNAnimalCount] = useState('');
  const [nHoldStart, setNHoldStart] = useState('');
  const [nHoldEnd, setNHoldEnd] = useState('');
  const [nBasis, setNBasis] = useState('');
  const [nTests, setNTests] = useState('');
  const [nVet, setNVet] = useState('');

  const selected = certs.find(c => c.id === selectedId) ?? null;

  const handleSelect = (c: QCCert) => {
    setSelectedId(c.id);
    setVetInput(c.issuingVet);
  };

  const update = (updated: QCCert) => {
    onUpdate(certs.map(c => c.id === updated.id ? updated : c));
  };

  const issueCert = () => {
    if (!selected) return;
    update({
      ...selected,
      status: 'ISSUED',
      issuedAt: todayISO(),
      issuingVet: vetInput.trim() || selected.issuingVet,
      certNo: selected.certNo || `QCC-2026-${rand4()}`,
    });
  };

  const handleNewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const seq = String(certs.length + 4).padStart(3, '0');
    const newCert: QCCert = {
      id: `qcc-${Date.now()}`,
      certNo: `QCC-2026-${seq}`,
      zoneRef: nZoneRef.trim(),
      zoneName: nZoneName.trim(),
      region: nRegion.trim(),
      premisesCodes: nPremises.split(',').map(p => p.trim()).filter(Boolean),
      animalCount: parseInt(nAnimalCount) || 0,
      holdStart: nHoldStart,
      holdEnd: nHoldEnd,
      clearanceBasis: nBasis.trim(),
      testsNegative: nTests.split(',').map(t => t.trim()).filter(Boolean),
      issuingVet: nVet.trim(),
      status: 'PENDING',
    };
    onUpdate([...certs, newCert]);
    setShowNewForm(false);
    setNZoneRef(''); setNZoneName(''); setNRegion(''); setNPremises('');
    setNAnimalCount(''); setNHoldStart(''); setNHoldEnd('');
    setNBasis(''); setNTests(''); setNVet('');
    handleSelect(newCert);
  };

  const total = certs.length;
  const issuedCount = certs.filter(c => c.status === 'ISSUED').length;
  const pendingCount = certs.filter(c => c.status === 'PENDING').length;

  return (
    <div style={{ display: 'flex', gap: '1rem', minHeight: 600, alignItems: 'flex-start' }}>
      {/* Left panel */}
      <div style={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* KPIs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {[
            { label: 'Total', value: total, icon: <FileText size={16} color="#64748b" /> },
            { label: 'Issued', value: issuedCount, icon: <CheckCircle size={16} color="#059669" /> },
            { label: 'Pending', value: pendingCount, icon: <Clock size={16} color="#d97706" /> },
          ].map(kpi => (
            <div key={kpi.label} className={s.kpi} style={{ flex: '1 1 100px', padding: '0.75rem 1rem', minWidth: 90 }}>
              <div className={s.kpiIcon} style={{ width: 32, height: 32, background: '#f1f5f9', borderRadius: 8 }}>
                {kpi.icon}
              </div>
              <div>
                <div className={s.kpiVal} style={{ fontSize: '1.25rem' }}>{kpi.value}</div>
                <div className={s.kpiLabel}>{kpi.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Issue New QCC toggle */}
        <button
          style={{ ...BTN_PRIMARY, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', width: '100%' }}
          onClick={() => setShowNewForm(v => !v)}
        >
          <Plus size={15} />
          {showNewForm ? 'Cancel' : 'Issue New QCC'}
        </button>

        {/* New QCC form */}
        {showNewForm && (
          <form
            onSubmit={handleNewSubmit}
            style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '1rem', display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#0f172a', marginBottom: 2 }}>New Quarantine Clearance</div>
            <Field label="Zone Reference">
              <input style={INPUT_STYLE} required value={nZoneRef} onChange={e => setNZoneRef(e.target.value)} placeholder="MOG-Q-2026-004" />
            </Field>
            <Field label="Zone Name">
              <input style={INPUT_STYLE} required value={nZoneName} onChange={e => setNZoneName(e.target.value)} placeholder="Zone Name" />
            </Field>
            <Field label="Region">
              <input style={INPUT_STYLE} required value={nRegion} onChange={e => setNRegion(e.target.value)} placeholder="Banaadir" />
            </Field>
            <Field label="Premises Codes (comma-separated)">
              <textarea
                style={{ ...INPUT_STYLE, height: 60, resize: 'vertical', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
                value={nPremises}
                onChange={e => setNPremises(e.target.value)}
                placeholder="SOM-MOG-001, SOM-MOG-002"
              />
            </Field>
            <Field label="Animal Count">
              <input style={INPUT_STYLE} required type="number" min={1} value={nAnimalCount} onChange={e => setNAnimalCount(e.target.value)} placeholder="100" />
            </Field>
            <Field label="Hold Start">
              <input style={INPUT_STYLE} required type="date" value={nHoldStart} onChange={e => setNHoldStart(e.target.value)} />
            </Field>
            <Field label="Hold End">
              <input style={INPUT_STYLE} required type="date" value={nHoldEnd} onChange={e => setNHoldEnd(e.target.value)} />
            </Field>
            <Field label="Clearance Basis">
              <textarea
                style={{ ...INPUT_STYLE, height: 70, resize: 'vertical', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
                required
                value={nBasis}
                onChange={e => setNBasis(e.target.value)}
                placeholder="Describe the basis for clearance..."
              />
            </Field>
            <Field label="Tests Negative (comma-separated)">
              <textarea
                style={{ ...INPUT_STYLE, height: 50, resize: 'vertical', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
                value={nTests}
                onChange={e => setNTests(e.target.value)}
                placeholder="FMD (ELISA), RVF (PCR)"
              />
            </Field>
            <Field label="Issuing Vet">
              <input style={INPUT_STYLE} value={nVet} onChange={e => setNVet(e.target.value)} placeholder="Dr. Name Surname" />
            </Field>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button type="submit" style={BTN_PRIMARY}>Create</button>
              <button type="button" style={BTN_CANCEL} onClick={() => setShowNewForm(false)}>Cancel</button>
            </div>
          </form>
        )}

        {/* QCC cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {certs.map(c => {
            const st = QCC_STATUS_STYLE[c.status];
            const isSelected = c.id === selectedId;
            return (
              <div
                key={c.id}
                onClick={() => handleSelect(c)}
                style={{
                  background: '#fff',
                  border: isSelected ? '2px solid #0b5ed7' : '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '0.75rem 1rem',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <span className={s.code} style={{ fontSize: '0.8rem' }}>{c.certNo}</span>
                  <span className={s.badge} style={{ background: st.bg, color: st.color }}>{c.status}</span>
                </div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b', marginBottom: 2 }}>{c.zoneName}</div>
                <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>{c.region}</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>
                  {c.animalCount} animals &bull; Hold ends {c.holdEnd}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {!selected && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 12, color: '#94a3b8' }}>
            <ShieldCheck size={48} strokeWidth={1} />
            <div style={{ fontSize: '0.9375rem', fontWeight: 500 }}>Select a clearance certificate to view details</div>
          </div>
        )}

        {/* PENDING */}
        {selected && selected.status === 'PENDING' && (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className={s.code}>{selected.certNo}</span>
              <span className={s.badge} style={{ background: QCC_STATUS_STYLE.PENDING.bg, color: QCC_STATUS_STYLE.PENDING.color }}>Pending</span>
            </div>

            {/* Zone details */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem' }}>
              {[
                ['Zone Reference', selected.zoneRef],
                ['Zone Name', selected.zoneName],
                ['Region', selected.region],
                ['Animal Count', String(selected.animalCount)],
                ['Hold Start', selected.holdStart],
                ['Hold End', selected.holdEnd],
              ].map(([label, val]) => (
                <div key={label}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: '0.875rem', color: '#1e293b', fontWeight: 500 }}>{val}</div>
                </div>
              ))}
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Premises Covered</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {selected.premisesCodes.map(p => (
                    <span key={p} className={s.code} style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: 6 }}>{p}</span>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Clearance Basis</div>
              <div style={{ fontSize: '0.875rem', color: '#334155', lineHeight: 1.7, background: '#f8fafc', borderRadius: 8, padding: '0.75rem 1rem' }}>{selected.clearanceBasis}</div>
            </div>

            {selected.testsNegative.length > 0 && (
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Tests Negative</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {selected.testsNegative.map(t => (
                    <span key={t} className={s.badge} style={{ background: '#ecfdf5', color: '#059669' }}>{t}</span>
                  ))}
                </div>
              </div>
            )}

            <Field label="Issuing Veterinary Officer">
              <input
                style={{ ...INPUT_STYLE, maxWidth: 320 }}
                value={vetInput}
                onChange={e => setVetInput(e.target.value)}
                placeholder="Dr. Name Surname"
              />
            </Field>

            <div style={{ paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
              <button style={{ ...BTN_GREEN, display: 'flex', alignItems: 'center', gap: 6 }} onClick={issueCert}>
                <ShieldCheck size={15} /> Issue Clearance Certificate
              </button>
            </div>
          </div>
        )}

        {/* ISSUED */}
        {selected && selected.status === 'ISSUED' && (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
              {/* Certificate */}
              <div style={{ flex: 1, border: '2px solid #0f172a', borderRadius: 8, padding: '1.5rem', fontFamily: 'monospace' }}>
                <div style={{ textAlign: 'center', marginBottom: '1rem', borderBottom: '1px solid #0f172a', paddingBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', letterSpacing: '0.1em', fontWeight: 700, color: '#0f172a' }}>FEDERAL REPUBLIC OF SOMALIA</div>
                  <div style={{ fontSize: '0.75rem', letterSpacing: '0.1em', fontWeight: 700, color: '#0f172a' }}>MINISTRY OF LIVESTOCK, FORESTRY AND RANGE</div>
                  <div style={{ fontSize: '1rem', fontWeight: 900, marginTop: '0.5rem', letterSpacing: '0.05em' }}>QUARANTINE CLEARANCE CERTIFICATE</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1.5rem', fontSize: '0.8125rem' }}>
                  {[
                    ['Certificate No', selected.certNo],
                    ['Zone Reference', selected.zoneRef],
                    ['Zone Name', selected.zoneName],
                    ['Region', selected.region],
                    ['Animals Cleared', String(selected.animalCount)],
                    ['Quarantine Hold Start', selected.holdStart],
                    ['Quarantine Hold End', selected.holdEnd],
                    ['Date of Issue', selected.issuedAt ?? 'N/A'],
                    ['Issuing Veterinary Officer', selected.issuingVet || 'N/A'],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <div style={{ fontSize: '0.6875rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 1 }}>{label}</div>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{val}</div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '0.75rem' }}>
                  <div style={{ fontSize: '0.6875rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Premises Covered</div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.8125rem' }}>{selected.premisesCodes.join(', ')}</div>
                </div>

                <div style={{ marginTop: '0.75rem' }}>
                  <div style={{ fontSize: '0.6875rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Clearance Basis</div>
                  <div style={{ fontSize: '0.8125rem', color: '#0f172a', lineHeight: 1.6 }}>{selected.clearanceBasis}</div>
                </div>

                {selected.testsNegative.length > 0 && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <div style={{ fontSize: '0.6875rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Tests Conducted (Negative)</div>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8125rem', color: '#0f172a' }}>
                      {selected.testsNegative.map(t => <li key={t}>{t}</li>)}
                    </ul>
                  </div>
                )}

                <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #0f172a', fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', textAlign: 'center', letterSpacing: '0.08em' }}>
                  QXLITS AUTHORIZED — MINISTRY OF LIVESTOCK SOMALIA
                </div>
              </div>

              {/* QR */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div
                  dangerouslySetInnerHTML={{ __html: generateQRSVG(selected.certNo) }}
                  style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 8 }}
                />
                <div style={{ fontSize: '0.6875rem', color: '#94a3b8', fontFamily: 'monospace' }}>{selected.certNo}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
              <button
                style={{ ...BTN_PRIMARY, display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => window.print()}
              >
                <Printer size={15} /> Print
              </button>
            </div>
          </div>
        )}

        {/* REVOKED */}
        {selected && selected.status === 'REVOKED' && (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className={s.code}>{selected.certNo}</span>
              <span className={s.badge} style={{ background: QCC_STATUS_STYLE.REVOKED.bg, color: QCC_STATUS_STYLE.REVOKED.color }}>Revoked</span>
            </div>
            <div className={s.muted} style={{ fontSize: '0.875rem' }}>
              This quarantine clearance certificate has been revoked and is no longer valid.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function CertificationPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<'export' | 'qcc'>('export');
  const [consignments, setConsignments] = useState<ExportConsignment[]>(CONSIGNMENTS);
  const [qccCerts, setQccCerts] = useState<QCCert[]>(QCC_CERTS);

  return (
    <div className={s.page}>
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Certification</h1>
          <p className={s.sub}>Export health certificates and quarantine clearance</p>
        </div>
      </div>
      <div className={s.tabs}>
        <button
          className={`${s.tab}${activeTab === 'export' ? ' ' + s.tabActive : ''}`}
          onClick={() => setActiveTab('export')}
        >
          Export Certificates
        </button>
        <button
          className={`${s.tab}${activeTab === 'qcc' ? ' ' + s.tabActive : ''}`}
          onClick={() => setActiveTab('qcc')}
        >
          Quarantine Clearance
        </button>
      </div>
      {activeTab === 'export'
        ? <ExportTab consignments={consignments} onUpdate={setConsignments} />
        : <QCCTab certs={qccCerts} onUpdate={setQccCerts} />
      }
    </div>
  );
}

export default CertificationPage;
