import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  ArrowLeft, MapPin, User, Phone, Tag, Heart,
  Navigation, Syringe, Info, Building2, Package,
  FileText, Download, CheckCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth.store';
import s from './farmer-animal-profile.module.css';
import { FarmerPremisesMap } from './FarmerPremisesMap';

// ── Types ──────────────────────────────────────────────────────────────────────

type TagStatus     = 'TAGGED' | 'UNTAGGED';
type HealthStatus  = 'HEALTHY' | 'RESTRICTED' | 'UNDER_TREATMENT';
type VaxStatus     = 'CURRENT' | 'DUE_SOON' | 'OVERDUE';
type EventType     = 'OBSERVATION' | 'TREATMENT' | 'DIAGNOSIS';
type CertType      = 'REGISTRATION' | 'MOVEMENT_PERMIT' | 'HEALTH_CERT' | 'VAX_CERT';
type CertStatus    = 'VALID' | 'EXPIRED' | 'REVOKED';

interface Vaccination {
  vaccine:   string;
  disease:   string;
  date:      string;
  nextDue:   string;
  by:        string;
  status:    VaxStatus;
}

interface HealthEvent {
  date:    string;
  type:    EventType;
  notes:   string;
  by:      string;
  outcome: string;
}

interface MovementRecord {
  date:       string;
  fromName:   string;
  fromCode:   string;
  toName:     string;
  toCode:     string;
  reason:     string;
  permit:     string;
  approvedBy: string;
}

interface OwnershipRecord {
  owner:     string;
  from:      string;
  to:        string | null;
  notes:     string;
  isCurrent: boolean;
}

interface Certificate {
  id:         string;
  name:       string;
  type:       CertType;
  docNo:      string;
  issuedDate: string;
  expiryDate: string | null;
  issuedBy:   string;
  status:     CertStatus;
}

interface AnimalProfile {
  id:               string;
  seq:              number;
  tagStatus:        TagStatus;
  tagSerial?:       string;
  tagType?:         string;
  healthStatus:     HealthStatus;
  species:          string;
  breed:            string;
  sex:              'M' | 'F';
  dob:              string;
  dobPrecision:     string;
  ageMonths:        number;
  weightKg:         number;
  coatColor:        string;
  features:         string;
  bodyCondition:    number;
  nationalId:       string;
  certNo:           string;
  source:           string;
  registeredAt:     string;
  registeredBy:     string;
  premises:         string;
  premisesCode:     string;
  premisesType:     string;
  premisesStatus:   string;
  owner:            string;
  phone:            string;
  region:           string;
  premisesLat?:     number;
  premisesLng?:     number;
  batchCode:        string;
  batchName:        string;
  vaccinations:     Vaccination[];
  healthEvents:     HealthEvent[];
  movements:        MovementRecord[];
  ownershipHistory: OwnershipRecord[];
  certificates:     Certificate[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function toTitleCase(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

const SPECIES_EMOJI: Record<string, string> = {
  Cattle: '🐄', Camel: '🐪', Goat: '🐐', Sheep: '🐑',
};

function fmtDate(d: string): string {
  if (!d || d === '—') return d;
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Tag SVG Components ─────────────────────────────────────────────────────────

function RFIDTag({ serial }: { serial?: string }) {
  return (
    <svg width="140" height="120" viewBox="0 0 110 100" style={{ display: 'block' }}>
      <rect x="40" y="2" width="30" height="18" rx="6" fill="#eab308" stroke="#713f12" strokeWidth="2" />
      <circle cx="55" cy="11" r="4.5" fill="#e5e7eb" stroke="#713f12" strokeWidth="1.5" />
      <circle cx="55" cy="11" r="2" fill="white" />
      <rect x="2" y="14" width="106" height="84" rx="14" fill="#eab308" stroke="#713f12" strokeWidth="2" />
      <rect x="14" y="27" width="18" height="13" rx="2" fill="rgba(0,0,0,0.3)" />
      <rect x="16" y="29" width="14" height="9" rx="1" fill="#1e293b" />
      <path d="M76,28 Q81,34 76,40" fill="none" stroke="#422006" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M81,25 Q89,34 81,43" fill="none" stroke="#422006" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <text x="55" y="57" fontSize="6.5" fill="#422006" fontFamily="monospace" textAnchor="middle" letterSpacing="1.5">ID NUMBER</text>
      <text x="55" y="70" fontSize="11" fill="#1c1917" fontFamily="monospace" fontWeight="bold" textAnchor="middle">{(serial ?? 'UNASSIGNED').slice(-10)}</text>
    </svg>
  );
}

function UnassignedTag() {
  return (
    <svg width="140" height="120" viewBox="0 0 110 100" style={{ display: 'block' }}>
      <rect x="40" y="2" width="30" height="18" rx="6" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
      <circle cx="55" cy="11" r="4.5" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.5" />
      <circle cx="55" cy="11" r="2" fill="white" />
      <rect x="2" y="14" width="106" height="84" rx="14" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="6 3" />
      <text x="55" y="62" fontSize="8" fill="#cbd5e1" fontFamily="monospace" fontWeight="bold" textAnchor="middle">UNTAGGED</text>
    </svg>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function BodyConditionDots({ score, max = 5 }: { score: number; max?: number }) {
  return (
    <span className={s.bcsRow}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={i < score ? s.bcsDotFilled : s.bcsDotEmpty} />
      ))}
      <span className={s.bcsLabel}>({score} / {max})</span>
    </span>
  );
}

function VaxStatusBadge({ status }: { status: VaxStatus }) {
  const map: Record<VaxStatus, { bg: string; color: string; label: string }> = {
    CURRENT:  { bg: '#dcfce7', color: '#166534', label: 'CURRENT'   },
    DUE_SOON: { bg: '#fef3c7', color: '#92400e', label: 'DUE SOON'  },
    OVERDUE:  { bg: '#fee2e2', color: '#991b1b', label: 'OVERDUE'   },
  };
  const v = map[status];
  return (
    <span className={s.inlineBadge} style={{ background: v.bg, color: v.color }}>
      {v.label}
    </span>
  );
}

function EventTypeBadge({ type }: { type: EventType }) {
  const map: Record<EventType, { bg: string; color: string; label: string }> = {
    OBSERVATION: { bg: '#f1f5f9', color: '#475569', label: 'OBSERVATION' },
    TREATMENT:   { bg: '#dbeafe', color: '#1e40af', label: 'TREATMENT'   },
    DIAGNOSIS:   { bg: '#ffedd5', color: '#9a3412', label: 'DIAGNOSIS'   },
  };
  const v = map[type];
  return (
    <span className={s.inlineBadge} style={{ background: v.bg, color: v.color }}>
      {v.label}
    </span>
  );
}

function EventDot({ type }: { type: EventType }) {
  const colorMap: Record<EventType, string> = {
    OBSERVATION: '#94a3b8',
    TREATMENT:   '#3b82f6',
    DIAGNOSIS:   '#f97316',
  };
  return (
    <span className={s.timelineDot} style={{ background: colorMap[type] }} />
  );
}

// ── Section: Identity & Registration ──────────────────────────────────────────

function IdentitySection({ p }: { p: AnimalProfile }) {
  return (
    <div className={s.section}>
      <div className={s.sectionHead}>
        <Tag size={16} color="#0b5ed7" />
        <span>Identity &amp; Registration</span>
      </div>
      <table className={s.kvTable}>
        <tbody>
          <tr className={s.kvRowEven}>
            <td className={s.kvKey}>Animal ID</td>
            <td className={s.kvVal}><span className={s.monoBlue}>{p.tagSerial ?? '—'}</span></td>
          </tr>
          <tr className={s.kvRowOdd}>
            <td className={s.kvKey}>Tag Type</td>
            <td className={s.kvVal}>{p.tagType ?? '—'}</td>
          </tr>
          <tr className={s.kvRowOdd}>
            <td className={s.kvKey}>Tag Status</td>
            <td className={s.kvVal}>
              {p.tagStatus === 'TAGGED'
                ? <span className={s.inlineBadge} style={{ background: '#dcfce7', color: '#166534' }}>TAGGED</span>
                : <span className={s.inlineBadge} style={{ background: '#f1f5f9', color: '#64748b' }}>UNTAGGED</span>}
            </td>
          </tr>
          <tr className={s.kvRowEven}>
            <td className={s.kvKey}>Registration Date</td>
            <td className={s.kvVal}>{fmtDate(p.registeredAt)}</td>
          </tr>
          <tr className={s.kvRowOdd}>
            <td className={s.kvKey}>Registered By</td>
            <td className={s.kvVal}>{p.registeredBy}</td>
          </tr>
          <tr className={s.kvRowEven}>
            <td className={s.kvKey}>Certificate No.</td>
            <td className={s.kvVal}><span className={s.monoNeutral}>{p.certNo}</span></td>
          </tr>
          <tr className={s.kvRowOdd}>
            <td className={s.kvKey}>Source</td>
            <td className={s.kvVal}>{p.source}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Section: Physical Profile ──────────────────────────────────────────────────

function PhysicalSection({ p }: { p: AnimalProfile }) {
  const emoji = SPECIES_EMOJI[p.species] ?? '🐾';
  return (
    <div className={s.section}>
      <div className={s.sectionHead}>
        <Info size={16} color="#0b5ed7" />
        <span>Physical Profile</span>
      </div>
      <table className={s.kvTable}>
        <tbody>
          <tr className={s.kvRowEven}>
            <td className={s.kvKey}>Species</td>
            <td className={s.kvVal}>{emoji} {p.species}</td>
          </tr>
          <tr className={s.kvRowOdd}>
            <td className={s.kvKey}>Breed</td>
            <td className={s.kvVal}>{p.breed}</td>
          </tr>
          <tr className={s.kvRowEven}>
            <td className={s.kvKey}>Sex</td>
            <td className={s.kvVal}>{p.sex === 'M' ? '♂ Male' : '♀ Female'}</td>
          </tr>
          <tr className={s.kvRowOdd}>
            <td className={s.kvKey}>Date of Birth</td>
            <td className={s.kvVal}>{p.dob}{p.dobPrecision ? <span className={s.dimNote}> ({p.dobPrecision})</span> : null}</td>
          </tr>
          <tr className={s.kvRowEven}>
            <td className={s.kvKey}>Age</td>
            <td className={s.kvVal}>{p.ageMonths} months</td>
          </tr>
          <tr className={s.kvRowOdd}>
            <td className={s.kvKey}>Current Weight</td>
            <td className={s.kvVal}>{p.weightKg} kg</td>
          </tr>
          <tr className={s.kvRowEven}>
            <td className={s.kvKey}>Coat Color</td>
            <td className={s.kvVal}>{p.coatColor || '—'}</td>
          </tr>
          <tr className={s.kvRowOdd}>
            <td className={s.kvKey}>Distinctive Features</td>
            <td className={s.kvVal}>{p.features || '—'}</td>
          </tr>
          <tr className={s.kvRowEven}>
            <td className={s.kvKey}>Body Condition Score</td>
            <td className={s.kvVal}><BodyConditionDots score={p.bodyCondition} /></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Section: Current Location ──────────────────────────────────────────────────

function LocationSection({ p }: { p: AnimalProfile }) {
  const emoji = SPECIES_EMOJI[p.species] ?? '🐾';
  return (
    <div className={s.section}>
      <div className={s.sectionHead}>
        <MapPin size={16} color="#0b5ed7" />
        <span>Current Location</span>
      </div>

      <div className={s.locationCard}>
        <div className={s.locationCardTop}>
          <div>
            <div className={s.premisesNameBig}>{p.premises}</div>
            <div className={s.premisesCodeMono}>{p.premisesCode}</div>
          </div>
          <span className={s.inlineBadge} style={{ background: '#dcfce7', color: '#166534', alignSelf: 'flex-start' }}>
            {p.premisesStatus}
          </span>
        </div>

        <div className={s.locationChipRow}>
          <span className={s.ownerChip}><User size={12} />{p.owner}</span>
          <span className={s.ownerChip}><Phone size={12} />{p.phone}</span>
        </div>

        <div className={s.locationPillRow}>
          <span className={s.regionPill}><MapPin size={11} /> {p.region} region</span>
          <span className={s.regionPill}><Building2 size={11} /> {p.premisesType}</span>
          <span className={s.inlineBadge} style={{ background: '#dcfce7', color: '#166534' }}>APPROVED</span>
        </div>
      </div>

      <div className={s.batchInfoBox}>
        <div className={s.batchInfoRow}>
          <Package size={14} color="#7c3aed" />
          <span className={s.batchInfoLabel}>Batch ID</span>
          <span className={s.batchCodeMono}>{p.batchCode}</span>
        </div>
        <div className={s.batchInfoName}>{p.batchName}</div>
        <div className={s.batchInfoSpecies}>
          {emoji} {p.species} · {p.breed}
        </div>
      </div>

      {p.premisesLat != null && p.premisesLng != null && (
        <FarmerPremisesMap lat={p.premisesLat} lng={p.premisesLng} name={p.premises} code={p.premisesCode} />
      )}
    </div>
  );
}

// ── Section: Vaccination Record ────────────────────────────────────────────────

function VaccinationSection({ vaccinations, flat }: { vaccinations: Vaccination[]; flat?: boolean }) {
  const inner = vaccinations.length === 0
    ? <div className={s.emptySection}>No vaccination records.</div>
    : (
      <div className={s.tableWrap}>
        <table className={s.dataTable}>
          <thead>
            <tr>
              <th>Vaccine</th><th>Disease</th><th>Date</th><th>Next Due</th><th>By</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {vaccinations.map((v, i) => (
              <tr key={i}>
                <td className={s.tdStrong}>{v.vaccine}</td>
                <td>{v.disease}</td>
                <td className={s.tdMono}>{v.date}</td>
                <td className={s.tdMono}>{v.nextDue}</td>
                <td>{v.by}</td>
                <td><VaxStatusBadge status={v.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  if (flat) return <>{inner}</>;
  return (
    <div className={s.section}>
      <div className={s.sectionHead}><Syringe size={16} color="#0b5ed7" /><span>Vaccination Record</span></div>
      {inner}
    </div>
  );
}

// ── Section: Health Events ─────────────────────────────────────────────────────

function HealthEventsSection({ events, flat }: { events: HealthEvent[]; flat?: boolean }) {
  const inner = events.length === 0
    ? <div className={s.emptySection}>No health events recorded.</div>
    : (
      <div className={s.timeline}>
        {events.map((ev, i) => (
          <div key={i} className={s.timelineItem}>
            <div className={s.timelineLeft}>
              <EventDot type={ev.type} />
              {i < events.length - 1 && <div className={s.timelineLine} />}
            </div>
            <div className={s.timelineContent}>
              <div className={s.timelineHeader}>
                <span className={s.timelineDate}>{ev.date}</span>
                <EventTypeBadge type={ev.type} />
              </div>
              <div className={s.timelineNotes}>{ev.notes}</div>
              <div className={s.timelineMeta}>
                <span className={s.timelineBy}><User size={11} /> {ev.by}</span>
                <span className={s.timelineOutcome}>{ev.outcome}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  if (flat) return <>{inner}</>;
  return (
    <div className={s.section}>
      <div className={s.sectionHead}><Heart size={16} color="#0b5ed7" /><span>Health Events</span></div>
      {inner}
    </div>
  );
}

// ── Section: Files & Certificates ─────────────────────────────────────────────

const CERT_CFG: Record<CertType, { label: string; bg: string; color: string }> = {
  REGISTRATION:    { label: 'Registration',    bg: '#eff6ff', color: '#1d4ed8' },
  MOVEMENT_PERMIT: { label: 'Movement Permit', bg: '#f0f9ff', color: '#0369a1' },
  HEALTH_CERT:     { label: 'Health Cert',     bg: '#f0fdf4', color: '#166534' },
  VAX_CERT:        { label: 'Vaccination',     bg: '#faf5ff', color: '#7c3aed' },
};

function FilesSection({ certificates, flat }: { certificates: Certificate[]; flat?: boolean }) {
  const inner = certificates.length === 0
    ? <div className={s.emptySection}>No certificates on file.</div>
    : (
      <div className={s.certGrid}>
        {certificates.map(cert => {
          const cfg = CERT_CFG[cert.type];
          const expired = cert.status === 'EXPIRED';
          return (
            <div key={cert.id} className={s.certCard}>
              <div className={s.certCardTop}>
                <div className={s.certIconWrap} style={{ background: cfg.bg }}>
                  <FileText size={18} color={cfg.color} strokeWidth={1.5} />
                </div>
                <div className={s.certMeta}>
                  <span className={s.certName}>{cert.name}</span>
                  <span className={s.certDocNo}>{cert.docNo}</span>
                </div>
              </div>
              <div className={s.certRows}>
                <div className={s.certRow}><span className={s.certKey}>Type</span><span className={s.inlineBadge} style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span></div>
                <div className={s.certRow}><span className={s.certKey}>Issued</span><span className={s.certVal}>{cert.issuedDate}</span></div>
                <div className={s.certRow}><span className={s.certKey}>Expires</span><span className={s.certVal} style={expired ? { color: '#dc2626', fontWeight: 700 } : {}}>{cert.expiryDate ?? 'No expiry'}</span></div>
                <div className={s.certRow}><span className={s.certKey}>Issued by</span><span className={s.certVal}>{cert.issuedBy}</span></div>
              </div>
              <div className={s.certCardFooter}>
                <span className={s.inlineBadge} style={expired ? { background: '#fee2e2', color: '#991b1b' } : { background: '#dcfce7', color: '#166534' }}>
                  {expired ? 'EXPIRED' : <><CheckCircle size={10} /> VALID</>}
                </span>
                <button className={s.certDownloadBtn}><Download size={11} /> Download</button>
              </div>
            </div>
          );
        })}
      </div>
    );
  if (flat) return <>{inner}</>;
  return (
    <div className={s.section}>
      <div className={s.sectionHead}><FileText size={16} color="#0b5ed7" /><span>Files &amp; Certificates</span></div>
      {inner}
    </div>
  );
}

// ── Right panel: Movement Journey ──────────────────────────────────────────────

type JourneyNode =
  | { kind: 'stop'; name: string; code: string; isCurrent: boolean; isOrigin: boolean }
  | { kind: 'leg';  date: string; reason: string; permit: string; approvedBy: string };

function buildJourney(movements: MovementRecord[]): JourneyNode[] {
  if (movements.length === 0) return [];
  const sorted = [...movements].sort((a, b) => a.date.localeCompare(b.date));
  const nodes: JourneyNode[] = [];
  nodes.push({ kind: 'stop', name: sorted[0].fromName, code: sorted[0].fromCode, isCurrent: false, isOrigin: true });
  sorted.forEach((mv, i) => {
    nodes.push({ kind: 'leg', date: mv.date, reason: mv.reason, permit: mv.permit, approvedBy: mv.approvedBy });
    nodes.push({ kind: 'stop', name: mv.toName, code: mv.toCode, isCurrent: i === sorted.length - 1, isOrigin: false });
  });
  return nodes;
}

function MovementJourneyPanel({ movements, premises, premisesCode }: {
  movements: MovementRecord[]; premises: string; premisesCode: string;
}) {
  const nodes = buildJourney(movements);

  const displayNodes: JourneyNode[] = nodes.length > 0
    ? [...nodes].reverse()
    : [{ kind: 'stop', name: premises, code: premisesCode, isCurrent: true, isOrigin: true }];

  const stopCount = displayNodes.filter(n => n.kind === 'stop').length;
  const legCount  = displayNodes.filter(n => n.kind === 'leg').length;

  return (
    <div className={s.journeyPanel}>
      <div className={s.journeyPanelHeader}>
        <Navigation size={14} strokeWidth={2} color="#0b5ed7" />
        <span>Movement Journey</span>
      </div>
      <div className={s.journeyPanelSub}>{stopCount} stop{stopCount !== 1 ? 's' : ''} · {legCount} movement{legCount !== 1 ? 's' : ''}</div>

      <div className={s.journeyFlow}>
        {displayNodes.map((node, i) => {
          if (node.kind === 'leg') return (
            <div key={i} className={s.journeyLeg}>
              <div className={s.journeyLegLine} />
              <div className={s.journeyLegCard}>
                <span className={s.journeyLegDate}>{fmtDate(node.date)}</span>
                <span className={s.journeyLegReason}>{node.reason}</span>
                <span className={s.journeyLegPermit}>{node.permit}</span>
                <span className={s.journeyLegBy}>{node.approvedBy}</span>
              </div>
            </div>
          );

          const dotClass = node.isCurrent ? s.journeyDotCurrent
            : node.isOrigin ? s.journeyDotOrigin
            : s.journeyDotMid;

          return (
            <div key={i} className={s.journeyStopRow}>
              <div className={`${s.journeyDot} ${dotClass}`} />
              <div className={s.journeyStopInfo}>
                <span className={s.journeyStopName}>{node.name}</span>
                <span className={s.journeyStopCode}>{node.code}</span>
                {node.isCurrent && <span className={s.journeyBadgeCurrent}>Current</span>}
                {node.isOrigin && !node.isCurrent && <span className={s.journeyBadgeOrigin}>Origin</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Section: Ownership History ─────────────────────────────────────────────────

function OwnershipSection({ history }: { history: OwnershipRecord[] }) {
  if (history.length === 0) {
    return (
      <div className={s.section}>
        <div className={s.sectionHead}>
          <User size={16} color="#0b5ed7" />
          <span>Ownership History</span>
        </div>
        <div className={s.emptySection}>No ownership records.</div>
      </div>
    );
  }

  return (
    <div className={s.section}>
      <div className={s.sectionHead}>
        <User size={16} color="#0b5ed7" />
        <span>Ownership History</span>
      </div>
      <div className={s.timeline}>
        {history.map((rec, i) => (
          <div key={i} className={s.timelineItem}>
            <div className={s.timelineLeft}>
              <span className={s.timelineDot} style={{ background: rec.isCurrent ? '#22c55e' : '#94a3b8' }} />
              {i < history.length - 1 && <div className={s.timelineLine} />}
            </div>
            <div className={s.timelineContent}>
              <div className={s.timelineHeader}>
                <span className={s.ownershipName}>{rec.owner}</span>
                {rec.isCurrent && (
                  <span className={s.inlineBadge} style={{ background: '#dcfce7', color: '#166534' }}>CURRENT</span>
                )}
              </div>
              <div className={s.ownershipPeriod}>
                {rec.from} → {rec.to ?? 'Present'}
              </div>
              <div className={s.timelineNotes}>{rec.notes}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

const SEX_MAP: Record<string, 'M' | 'F'> = { MALE: 'M', FEMALE: 'F', UNKNOWN: 'M' };

async function loadAnimalProfile(animalId: string, farmerName: string | null): Promise<AnimalProfile | null> {
  const { data: row, error } = await supabase
    .from('animals')
    .select(`id, animal_code, batch_id, seq, species, breed, sex,
             dob, dob_precision, age_months, weight_kg,
             coat_color, distinguishing_marks, body_condition_score,
             tag_serial, tag_type, tag_status,
             submission_type, health_status,
             current_premises_id, registered_at`)
    .eq('id', animalId)
    .single();

  if (error || !row) return null;

  // Fetch premises
  let prem: { premises_name: string; premises_type: string; status: string; region_code: string; gps_latitude: number | null; gps_longitude: number | null } | null = null;
  if (row.current_premises_id) {
    const { data: p } = await supabase
      .from('farmer_premises')
      .select('premises_name, premises_type, status, region_code, gps_latitude, gps_longitude')
      .eq('premises_code', row.current_premises_id)
      .single();
    prem = p ?? null;
  }

  // Fetch batch
  let batch: { batch_code: string; batch_name: string } | null = null;
  if (row.batch_id) {
    const { data: b } = await supabase
      .from('batches')
      .select('batch_code, batch_name')
      .eq('id', row.batch_id)
      .single();
    batch = b ?? null;
  }

  const species   = toTitleCase(row.species as string);
  const tagStatus = (row.tag_status as string) === 'TAGGED' ? 'TAGGED' : 'UNTAGGED';
  const rawHealth = row.health_status as string;
  const healthStatus: HealthStatus =
    rawHealth === 'RESTRICTED' ? 'RESTRICTED'
    : rawHealth === 'UNDER_TREATMENT' ? 'UNDER_TREATMENT'
    : 'HEALTHY';

  const ownerHistory: OwnershipRecord[] = farmerName
    ? [{ owner: farmerName, from: row.registered_at ? fmtDate(row.registered_at as string) : '—', to: null, notes: 'Registered owner', isCurrent: true }]
    : [];

  const base: AnimalProfile = {
    id:              row.id as string,
    seq:             (row.seq as number) ?? 1,
    tagStatus:       tagStatus as TagStatus,
    healthStatus,
    species,
    breed:           row.breed as string,
    sex:             SEX_MAP[row.sex as string] ?? 'M',
    dob:             row.dob ? fmtDate(row.dob as string) : '—',
    dobPrecision:    row.dob_precision ? toTitleCase(row.dob_precision as string) : '',
    ageMonths:       (row.age_months as number) ?? 0,
    weightKg:        (row.weight_kg as number) ?? 0,
    coatColor:       (row.coat_color as string) ?? '',
    features:        (row.distinguishing_marks as string) ?? '',
    bodyCondition:   (row.body_condition_score as number) ?? 3,
    nationalId:      row.animal_code as string,
    certNo:          '—',
    source:          toTitleCase(row.submission_type as string),
    registeredAt:    row.registered_at as string,
    registeredBy:    '—',
    premises:        prem?.premises_name ?? (row.current_premises_id as string) ?? '—',
    premisesCode:    (row.current_premises_id as string) ?? '—',
    premisesType:    prem?.premises_type ?? '—',
    premisesStatus:  prem?.status ?? '—',
    owner:           farmerName ?? '—',
    phone:           '—',
    region:          prem?.region_code ?? '—',
    batchCode:       batch?.batch_code ?? '—',
    batchName:       batch?.batch_name ?? '—',
    vaccinations:    [],
    healthEvents:    [],
    movements:       [],
    ownershipHistory: ownerHistory,
    certificates:    [],
  };
  if (row.tag_serial)   base.tagSerial = row.tag_serial as string;
  if (row.tag_type)     base.tagType   = row.tag_type as string;
  if (prem?.gps_latitude  != null) base.premisesLat = prem.gps_latitude;
  if (prem?.gps_longitude != null) base.premisesLng = prem.gps_longitude;
  return base;
}

type RecordTab = 'vaccinations' | 'health' | 'files';

export function AnimalProfilePage(): JSX.Element {
  const { animalId } = useParams<{ animalId: string }>();
  const navigate = useNavigate();
  const farmerName = useAuthStore(s => s.farmerName);

  const [profile,    setProfile]    = useState<AnimalProfile | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [notFound,   setNotFound]   = useState(false);
  const [recordTab,  setRecordTab]  = useState<RecordTab>('vaccinations');

  useEffect(() => {
    if (!animalId) { setNotFound(true); setLoading(false); return; }
    setLoading(true);
    loadAnimalProfile(animalId, farmerName)
      .then(p => { if (p) setProfile(p); else setNotFound(true); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [animalId, farmerName]);

  if (loading) {
    return (
      <div className={s.page}>
        <div className={s.main} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#64748b' }}>
          Loading animal profile…
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className={s.page}>
        <div className={s.main} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
          <p style={{ color: '#64748b', fontSize: '1rem' }}>Animal not found.</p>
          <button className={s.backBtn} onClick={() => void navigate(-1)}>
            <ArrowLeft size={14} /><span>Go back</span>
          </button>
        </div>
      </div>
    );
  }

  const emoji = SPECIES_EMOJI[profile.species] ?? '🐾';

  return (
    <div className={s.page}>

      {/* ── Left Sidebar ── */}
      <div className={s.sidebar}>

        <button className={s.backBtn} onClick={() => void navigate(-1)}>
          <ArrowLeft size={14} />
          <span>Back</span>
        </button>

        <div className={s.photoPlaceholder}>
          <span className={s.photoIcon}>📷</span>
          <span className={s.photoLabel}>Upload Photo</span>
        </div>

        <div className={s.badgeRow}>
          <span className={s.seqBadge}>#{profile.seq}</span>
          <span className={`${s.sexBadge} ${profile.sex === 'M' ? s.sexM : s.sexF}`}>
            {profile.sex === 'M' ? '♂ M' : '♀ F'}
          </span>
        </div>

        <div className={s.tagWrap}>
          {profile.tagStatus === 'TAGGED'
            ? <RFIDTag serial={profile.tagSerial} />
            : <UnassignedTag />}
        </div>


        <div className={s.sidebarDivider} />

        <div className={s.quickGrid}>
          <div className={s.quickFact}>
            <span className={s.quickLabel}>Species</span>
            <span className={s.quickVal}>{emoji} {profile.species}</span>
          </div>
          <div className={s.quickFact}>
            <span className={s.quickLabel}>Breed</span>
            <span className={s.quickVal}>{profile.breed}</span>
          </div>
          <div className={s.quickFact}>
            <span className={s.quickLabel}>Age</span>
            <span className={s.quickVal}>{profile.ageMonths} mo</span>
          </div>
          <div className={s.quickFact}>
            <span className={s.quickLabel}>Weight</span>
            <span className={s.quickVal}>{profile.weightKg} kg</span>
          </div>
        </div>

        <div className={s.sidebarDivider} />

        <div className={s.healthBadgeWrap}>
          {profile.healthStatus === 'HEALTHY' && (
            <span className={s.healthBadgeHealthy}>HEALTHY</span>
          )}
          {profile.healthStatus === 'RESTRICTED' && (
            <span className={s.healthBadgeRestricted}>RESTRICTED</span>
          )}
          {profile.healthStatus === 'UNDER_TREATMENT' && (
            <span className={s.healthBadgeTreatment}>UNDER TREATMENT</span>
          )}
        </div>

        <div className={s.sidebarDivider} />

        <div className={s.actionBtns}>
          <button className={s.actionBtn}>
            <Tag size={13} />
            Print Tag
          </button>
          <button className={s.actionBtn}>
            <Heart size={13} />
            Health Event
          </button>
        </div>

      </div>

      {/* ── Center Main ── */}
      <div className={s.main}>
        <IdentitySection  p={profile} />
        <PhysicalSection  p={profile} />

        {/* ── Record Tabs ── */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '0 8px', gap: 4 }}>
            {([['vaccinations', 'Vaccination Record'], ['health', 'Health Events'], ['files', 'Files & Certificates']] as [RecordTab, string][]).map(([tab, label]) => (
              <button key={tab} onClick={() => setRecordTab(tab)} style={{ padding: '8px 16px', background: recordTab === tab ? '#eff6ff' : 'none', border: 'none', borderRadius: 8, margin: '6px 0', cursor: 'pointer', fontSize: 13, fontWeight: recordTab === tab ? 700 : 500, color: recordTab === tab ? '#0b5ed7' : '#374151', fontFamily: 'inherit' }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ padding: 20 }}>
            {recordTab === 'vaccinations' && <VaccinationSection  vaccinations={profile.vaccinations} flat />}
            {recordTab === 'health'       && <HealthEventsSection events={profile.healthEvents}       flat />}
            {recordTab === 'files'        && <FilesSection        certificates={profile.certificates} flat />}
          </div>
        </div>

        <LocationSection  p={profile} />
        <OwnershipSection history={profile.ownershipHistory} />
      </div>

      {/* ── Right Journey Panel ── */}
      <MovementJourneyPanel
        movements={profile.movements}
        premises={profile.premises}
        premisesCode={profile.premisesCode}
      />

    </div>
  );
}

export default AnimalProfilePage;
