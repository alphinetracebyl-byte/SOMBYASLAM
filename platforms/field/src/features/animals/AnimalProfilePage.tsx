import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Tag, Heart, Syringe, History } from 'lucide-react';
import s from './field-animal-profile.module.css';

// ── Types ──────────────────────────────────────────────────────────────────────

type TagColor   = 'yellow' | 'orange' | 'green' | 'blue' | 'red';
type TagType    = 'RFID' | 'EAR_TAG';
type TagStatus  = 'TAGGED' | 'UNTAGGED';

interface HealthEvent {
  date:    string;
  type:    'OBSERVATION' | 'TREATMENT' | 'DIAGNOSIS';
  notes:   string;
  by:      string;
  outcome: string;
}

interface TagRecord {
  serial:    string;
  type:      TagType;
  color:     TagColor;
  issuedAt:  string;
  isActive:  boolean;
  remark?:   string;
}

interface FieldAnimalProfile {
  id:           string;
  name:         string;
  species:      string;
  breed:        string;
  sex:          'M' | 'F';
  ageMonths:    number;
  weightKg:     number;
  features:     string;
  tagStatus:    TagStatus;
  tagSerial?:   string;
  tagType?:     TagType;
  tagColor?:    TagColor;
  premisesName: string;
  premisesCode: string;
  regionName:   string;
  status:       string;
  healthEvents: HealthEvent[];
  tagHistory:   TagRecord[];
}

// ── Mock data ──────────────────────────────────────────────────────────────────

const A1_PROFILE: FieldAnimalProfile = {
  id:           'a1',
  name:         'Zebu Bull #1',
  species:      'Cattle',
  breed:        'Somali Zebu',
  sex:          'M',
  ageMonths:    36,
  weightKg:     280,
  features:     'White patch on forehead',
  tagStatus:    'TAGGED',
  tagSerial:    '9001000441',
  tagType:      'RFID',
  tagColor:     'yellow',
  premisesName: 'Daynile Farm',
  premisesCode: 'SOM-MOG-004',
  regionName:   'Banaadir',
  status:       'ACTIVE',
  healthEvents: [
    { date: '10 Jun 2026', type: 'OBSERVATION', notes: 'Routine health inspection — animal appears healthy, good body condition', by: 'Dr. Hassan Omar', outcome: 'No action required' },
    { date: '18 Feb 2026', type: 'TREATMENT',   notes: 'Minor laceration on right hind leg, cleaned and dressed', by: 'Dr. Amina Farah', outcome: 'Fully resolved' },
    { date: '05 Oct 2025', type: 'DIAGNOSIS',   notes: 'Suspected mineral deficiency — prescribed selenium supplement', by: 'Dr. Hassan Omar', outcome: 'Resolved after 6-week treatment' },
  ],
  tagHistory: [
    { serial: '9001000441', type: 'RFID', color: 'yellow', issuedAt: '15 Jul 2026', isActive: true },
  ],
};

const GENERIC_PROFILE: FieldAnimalProfile = {
  id:           'generic',
  name:         'Animal Profile',
  species:      'Goat',
  breed:        'Somali',
  sex:          'F',
  ageMonths:    18,
  weightKg:     32,
  features:     '',
  tagStatus:    'UNTAGGED',
  premisesName: 'Daynile Farm',
  premisesCode: 'SOM-MOG-004',
  regionName:   'Banaadir',
  status:       'ACTIVE',
  healthEvents: [],
  tagHistory:   [],
};

function getAnimalProfile(id: string): FieldAnimalProfile {
  return id === 'a1' ? A1_PROFILE : { ...GENERIC_PROFILE, id };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const SPECIES_EMOJI: Record<string, string> = {
  Cattle: '🐄', Camel: '🐪', Goat: '🐐', Sheep: '🐑',
};

// ── Tag SVG Components ─────────────────────────────────────────────────────────

function RFIDTag({ serial, color = 'yellow' }: { serial?: string; color?: TagColor }) {
  const fills: Record<TagColor, { body: string; stroke: string; text: string; sub: string }> = {
    yellow: { body: '#eab308', stroke: '#713f12', text: '#1c1917', sub: '#422006' },
    orange: { body: '#fed7aa', stroke: '#f97316', text: '#7c2d12', sub: '#9a3412' },
    green:  { body: '#bbf7d0', stroke: '#16a34a', text: '#14532d', sub: '#166534' },
    blue:   { body: '#bfdbfe', stroke: '#3b82f6', text: '#1e3a8a', sub: '#1e40af' },
    red:    { body: '#fecaca', stroke: '#ef4444', text: '#7f1d1d', sub: '#991b1b' },
  };
  const c = fills[color] ?? fills.yellow;
  return (
    <svg width="140" height="120" viewBox="0 0 110 100" style={{ display: 'block' }}>
      <rect x="40" y="2" width="30" height="18" rx="6" fill={c.body} stroke={c.stroke} strokeWidth="2" />
      <circle cx="55" cy="11" r="4.5" fill="#e5e7eb" stroke={c.stroke} strokeWidth="1.5" />
      <circle cx="55" cy="11" r="2" fill="white" />
      <rect x="2" y="14" width="106" height="84" rx="14" fill={c.body} stroke={c.stroke} strokeWidth="2" />
      <rect x="14" y="27" width="18" height="13" rx="2" fill="rgba(0,0,0,0.3)" />
      <rect x="16" y="29" width="14" height="9" rx="1" fill="#1e293b" />
      <path d="M76,28 Q81,34 76,40" fill="none" stroke={c.sub} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M81,25 Q89,34 81,43" fill="none" stroke={c.sub} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <text x="55" y="57" fontSize="6.5" fill={c.sub} fontFamily="monospace" textAnchor="middle" letterSpacing="1.5">ID NUMBER</text>
      <text x="55" y="70" fontSize="11" fill={c.text} fontFamily="monospace" fontWeight="bold" textAnchor="middle">{(serial ?? 'UNASSIGNED').slice(-10)}</text>
    </svg>
  );
}

function EarTag({ serial, color = 'yellow' }: { serial?: string; color?: TagColor }) {
  const fills: Record<TagColor, { body: string; stroke: string; text: string }> = {
    yellow: { body: '#eab308', stroke: '#713f12', text: '#1c1917' },
    orange: { body: '#fed7aa', stroke: '#f97316', text: '#7c2d12' },
    green:  { body: '#bbf7d0', stroke: '#16a34a', text: '#14532d' },
    blue:   { body: '#bfdbfe', stroke: '#3b82f6', text: '#1e3a8a' },
    red:    { body: '#fecaca', stroke: '#ef4444', text: '#7f1d1d' },
  };
  const c = fills[color] ?? fills.yellow;
  return (
    <svg width="140" height="120" viewBox="0 0 110 100" style={{ display: 'block' }}>
      <rect x="40" y="2" width="30" height="18" rx="6" fill={c.body} stroke={c.stroke} strokeWidth="2" />
      <circle cx="55" cy="11" r="4.5" fill="#e5e7eb" stroke={c.stroke} strokeWidth="1.5" />
      <circle cx="55" cy="11" r="2" fill="white" />
      <rect x="2" y="14" width="106" height="84" rx="14" fill={c.body} stroke={c.stroke} strokeWidth="2" />
      <text x="55" y="57" fontSize="6.5" fill={c.text} fontFamily="monospace" textAnchor="middle" letterSpacing="1.5">EAR TAG</text>
      <text x="55" y="70" fontSize="11" fill={c.text} fontFamily="monospace" fontWeight="bold" textAnchor="middle">{(serial ?? 'PENDING').slice(-10)}</text>
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

// ── Event type badge ───────────────────────────────────────────────────────────

function EventTypeBadge({ type }: { type: HealthEvent['type'] }) {
  const map = {
    OBSERVATION: { bg: '#f1f5f9', color: '#475569', label: 'OBSERVATION' },
    TREATMENT:   { bg: '#dbeafe', color: '#1e40af', label: 'TREATMENT'   },
    DIAGNOSIS:   { bg: '#ffedd5', color: '#9a3412', label: 'DIAGNOSIS'   },
  };
  const v = map[type];
  return (
    <span className={s.eventBadge} style={{ background: v.bg, color: v.color }}>
      {v.label}
    </span>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export function AnimalProfilePage(): JSX.Element {
  const { animalId } = useParams<{ animalId: string }>();
  const navigate = useNavigate();
  const profile = getAnimalProfile(animalId ?? '');
  const emoji = SPECIES_EMOJI[profile.species] ?? '🐾';

  function handleBack() {
    void navigate(-1);
  }

  function tagSvg() {
    if (profile.tagStatus !== 'TAGGED') return <UnassignedTag />;
    if (profile.tagType === 'EAR_TAG') return <EarTag serial={profile.tagSerial} color={profile.tagColor} />;
    return <RFIDTag serial={profile.tagSerial} color={profile.tagColor} />;
  }

  return (
    <div className={s.page}>

      {/* ── Left Sidebar ── */}
      <div className={s.sidebar}>

        <button className={s.backBtn} onClick={handleBack}>
          <ArrowLeft size={14} />
          <span>Back</span>
        </button>

        {/* Tag SVG */}
        <div className={s.tagWrap}>{tagSvg()}</div>

        {/* Animal ID */}
        {profile.tagStatus === 'TAGGED' && profile.tagSerial && (
          <div className={s.animalIdDisplay}>{profile.tagSerial}</div>
        )}

        <div className={s.sidebarDivider} />

        {/* Quick info */}
        <div className={s.infoBlock}>
          <div className={s.infoLabel}>Name</div>
          <div className={s.infoVal}>{profile.name}</div>
        </div>

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
            <span className={s.quickLabel}>Sex</span>
            <span className={s.quickVal}>{profile.sex === 'M' ? '♂ M' : '♀ F'}</span>
          </div>
          <div className={s.quickFact}>
            <span className={s.quickLabel}>Age</span>
            <span className={s.quickVal}>{profile.ageMonths} mo</span>
          </div>
          <div className={s.quickFact}>
            <span className={s.quickLabel}>Weight</span>
            <span className={s.quickVal}>{profile.weightKg} kg</span>
          </div>
          <div className={s.quickFact}>
            <span className={s.quickLabel}>Status</span>
            <span className={s.quickVal}>{profile.status}</span>
          </div>
        </div>

        <div className={s.sidebarDivider} />

        {profile.features ? (
          <div className={s.featuresBox}>
            <div className={s.featuresLabel}>Distinctive features</div>
            <div className={s.featuresVal}>{profile.features}</div>
          </div>
        ) : null}

      </div>

      {/* ── Main Content ── */}
      <div className={s.main}>

        {/* Location Section */}
        <div className={s.section}>
          <div className={s.sectionHead}>
            <MapPin size={16} color="#0d9488" />
            <span>Current Location</span>
          </div>
          <div className={s.locationCard}>
            <div className={s.locationRow}>
              <div>
                <div className={s.premisesName}>{profile.premisesName}</div>
                <div className={s.premisesCode}>{profile.premisesCode}</div>
              </div>
              <span className={s.statusBadge} style={{ background: '#dcfce7', color: '#166534' }}>
                ACTIVE
              </span>
            </div>
            <div className={s.locationMeta}>
              <MapPin size={12} color="#64748b" />
              <span>{profile.regionName} region</span>
            </div>
          </div>
        </div>

        {/* Health Events Section */}
        <div className={s.section}>
          <div className={s.sectionHead}>
            <Heart size={16} color="#0d9488" />
            <span>Health Events</span>
          </div>
          {profile.healthEvents.length === 0 ? (
            <div className={s.empty}>No health events recorded.</div>
          ) : (
            <div className={s.timeline}>
              {profile.healthEvents.map((ev, i) => (
                <div key={i} className={s.timelineItem}>
                  <div className={s.timelineLeft}>
                    <span
                      className={s.timelineDot}
                      style={{
                        background: ev.type === 'TREATMENT' ? '#3b82f6'
                                  : ev.type === 'DIAGNOSIS' ? '#f97316'
                                  : '#94a3b8',
                      }}
                    />
                    {i < profile.healthEvents.length - 1 && <div className={s.timelineLine} />}
                  </div>
                  <div className={s.timelineContent}>
                    <div className={s.timelineHeader}>
                      <span className={s.timelineDate}>{ev.date}</span>
                      <EventTypeBadge type={ev.type} />
                    </div>
                    <div className={s.timelineNotes}>{ev.notes}</div>
                    <div className={s.timelineMeta}>
                      <span className={s.timelineBy}>
                        <Syringe size={11} /> {ev.by}
                      </span>
                      <span className={s.timelineOutcome}>{ev.outcome}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tag History Section */}
        <div className={s.section}>
          <div className={s.sectionHead}>
            <History size={16} color="#0d9488" />
            <span>Tag History</span>
          </div>
          {profile.tagHistory.length === 0 ? (
            <div className={s.empty}>No tag records. Animal is currently untagged.</div>
          ) : (
            <div className={s.tagHistoryList}>
              {profile.tagHistory.map((t, i) => (
                <div key={i} className={s.tagHistoryRow}>
                  <div className={s.tagHistoryLeft}>
                    <Tag size={14} color={t.isActive ? '#0d9488' : '#94a3b8'} />
                  </div>
                  <div className={s.tagHistoryContent}>
                    <div className={s.tagHistorySerial}>{t.serial}</div>
                    <div className={s.tagHistoryMeta}>
                      {t.type} · {t.color} · Issued {t.issuedAt}
                    </div>
                    {t.remark && <div className={s.tagHistoryRemark}>{t.remark}</div>}
                  </div>
                  <span
                    className={s.statusBadge}
                    style={t.isActive
                      ? { background: '#ccfbf1', color: '#0f766e' }
                      : { background: '#f1f5f9', color: '#64748b' }}
                  >
                    {t.isActive ? 'ACTIVE' : 'RETIRED'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default AnimalProfilePage;
