import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, MapPin, X, CalendarDays, Tag } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import s from './market-calendar.module.css';

interface Market {
  id: number;
  date: string;
  name: string;
  location: string;
  region: string;
  species: string[];
  status: 'upcoming' | 'completed';
  note?: string;
  lat: number;
  lon: number;
}

const MARKETS: Market[] = [
  { id: 1,  date: '2026-07-06', name: 'Kismayo Central Market',    location: 'Kismayo',    region: 'Lower Jubba',     species: ['Goat','Sheep'],                  status: 'completed', lat: 0.3582,  lon: 42.5454 },
  { id: 2,  date: '2026-07-07', name: 'Baidoa Weekly Market',      location: 'Baidoa',     region: 'Bay',             species: ['Cattle','Goat'],                 status: 'completed', lat: 3.1182,  lon: 43.6500 },
  { id: 3,  date: '2026-07-09', name: 'Garowe Livestock Fair',     location: 'Garowe',     region: 'Nugaal',          species: ['Camel','Sheep'],                 status: 'completed', lat: 8.4054,  lon: 48.4845 },
  { id: 4,  date: '2026-07-11', name: 'Beledweyne Market',         location: 'Beledweyne', region: 'Hiiraan',         species: ['Cattle'],                        status: 'completed', lat: 4.7358,  lon: 45.2036 },
  { id: 5,  date: '2026-07-13', name: 'Bosaso Livestock Exchange', location: 'Bosaso',     region: 'Bari',            species: ['Camel','Goat'],                  status: 'completed', lat: 11.2828, lon: 49.1847, note: 'Export-grade camels' },
  { id: 6,  date: '2026-07-14', name: 'Bakara Livestock Market',   location: 'Mogadishu',  region: 'Banadir',         species: ['Cattle','Camel'],                status: 'completed', lat: 2.0469,  lon: 45.3182 },
  { id: 7,  date: '2026-07-16', name: 'Marka Coastal Market',      location: 'Marka',      region: 'Lower Shabelle',  species: ['Goat'],                          status: 'completed', lat: 1.7148,  lon: 44.7702 },
  { id: 8,  date: '2026-07-17', name: 'Jowhar Market Day',         location: 'Jowhar',     region: 'Middle Shabelle', species: ['Cattle','Sheep'],                status: 'completed', lat: 2.7823,  lon: 45.4971 },
  { id: 9,  date: '2026-07-19', name: 'Hargeisa Grand Market',     location: 'Hargeisa',   region: 'Woqooyi Galbeed', species: ['Cattle','Camel','Goat','Sheep'], status: 'completed', lat: 9.5590,  lon: 44.0650, note: 'Major annual fair' },
  { id: 10, date: '2026-07-21', name: 'Bakara Livestock Market',   location: 'Mogadishu',  region: 'Banadir',         species: ['Cattle','Camel'],                status: 'completed', lat: 2.0469,  lon: 45.3182 },
  { id: 11, date: '2026-07-23', name: 'Kismayo Central Market',    location: 'Kismayo',    region: 'Lower Jubba',     species: ['Goat','Sheep'],                  status: 'completed', lat: 0.3582,  lon: 42.5454 },
  { id: 12, date: '2026-07-24', name: 'Baidoa Weekly Market',      location: 'Baidoa',     region: 'Bay',             species: ['Cattle','Goat'],                 status: 'completed', lat: 3.1182,  lon: 43.6500 },
  { id: 13, date: '2026-07-26', name: 'Garowe Livestock Fair',     location: 'Garowe',     region: 'Nugaal',          species: ['Camel','Sheep'],                 status: 'completed', lat: 8.4054,  lon: 48.4845 },
  { id: 14, date: '2026-07-28', name: 'Bakara Livestock Market',   location: 'Mogadishu',  region: 'Banadir',         species: ['Cattle','Camel'],                status: 'completed', lat: 2.0469,  lon: 45.3182 },
  { id: 15, date: '2026-07-30', name: 'Berbera Port Market',       location: 'Berbera',    region: 'Sahil',           species: ['Camel','Cattle'],                status: 'completed', lat: 10.4396, lon: 45.0145, note: 'Export staging point' },
  { id: 16, date: '2026-08-04', name: 'Bakara Livestock Market',   location: 'Mogadishu',  region: 'Banadir',         species: ['Cattle','Camel'],                status: 'upcoming',  lat: 2.0469,  lon: 45.3182 },
  { id: 17, date: '2026-08-06', name: 'Kismayo Central Market',    location: 'Kismayo',    region: 'Lower Jubba',     species: ['Goat','Sheep'],                  status: 'upcoming',  lat: 0.3582,  lon: 42.5454 },
  { id: 18, date: '2026-08-07', name: 'Baidoa Weekly Market',      location: 'Baidoa',     region: 'Bay',             species: ['Cattle','Goat'],                 status: 'upcoming',  lat: 3.1182,  lon: 43.6500 },
  { id: 19, date: '2026-08-09', name: 'Garowe Livestock Fair',     location: 'Garowe',     region: 'Nugaal',          species: ['Camel','Sheep'],                 status: 'upcoming',  lat: 8.4054,  lon: 48.4845 },
  { id: 20, date: '2026-08-11', name: 'Beledweyne Market',         location: 'Beledweyne', region: 'Hiiraan',         species: ['Cattle'],                        status: 'upcoming',  lat: 4.7358,  lon: 45.2036 },
  { id: 21, date: '2026-08-13', name: 'Bosaso Livestock Exchange', location: 'Bosaso',     region: 'Bari',            species: ['Camel','Goat'],                  status: 'upcoming',  lat: 11.2828, lon: 49.1847, note: 'Export-grade camels' },
  { id: 22, date: '2026-08-14', name: 'Jowhar Market Day',         location: 'Jowhar',     region: 'Middle Shabelle', species: ['Cattle','Sheep'],                status: 'upcoming',  lat: 2.7823,  lon: 45.4971 },
  { id: 23, date: '2026-08-16', name: 'Marka Coastal Market',      location: 'Marka',      region: 'Lower Shabelle',  species: ['Goat'],                          status: 'upcoming',  lat: 1.7148,  lon: 44.7702 },
  { id: 24, date: '2026-08-18', name: 'Bakara Livestock Market',   location: 'Mogadishu',  region: 'Banadir',         species: ['Cattle','Camel'],                status: 'upcoming',  lat: 2.0469,  lon: 45.3182 },
  { id: 25, date: '2026-08-20', name: 'Kismayo Central Market',    location: 'Kismayo',    region: 'Lower Jubba',     species: ['Goat','Sheep'],                  status: 'upcoming',  lat: 0.3582,  lon: 42.5454 },
  { id: 26, date: '2026-08-21', name: 'Afgooye Market',            location: 'Afgooye',    region: 'Lower Shabelle',  species: ['Cattle'],                        status: 'upcoming',  lat: 2.1400,  lon: 45.1200 },
  { id: 27, date: '2026-08-23', name: 'Garowe Livestock Fair',     location: 'Garowe',     region: 'Nugaal',          species: ['Camel'],                         status: 'upcoming',  lat: 8.4054,  lon: 48.4845 },
  { id: 28, date: '2026-08-25', name: 'Hargeisa Grand Market',     location: 'Hargeisa',   region: 'Woqooyi Galbeed', species: ['Cattle','Camel','Goat','Sheep'], status: 'upcoming',  lat: 9.5590,  lon: 44.0650, note: 'Largest market in NW Somalia' },
  { id: 29, date: '2026-08-27', name: 'Baidoa Weekly Market',      location: 'Baidoa',     region: 'Bay',             species: ['Cattle','Goat'],                 status: 'upcoming',  lat: 3.1182,  lon: 43.6500 },
  { id: 30, date: '2026-08-28', name: 'Berbera Port Market',       location: 'Berbera',    region: 'Sahil',           species: ['Camel','Cattle'],                status: 'upcoming',  lat: 10.4396, lon: 45.0145, note: 'Export staging point' },
  { id: 31, date: '2026-08-30', name: 'Kismayo Central Market',    location: 'Kismayo',    region: 'Lower Jubba',     species: ['Goat','Sheep'],                  status: 'upcoming',  lat: 0.3582,  lon: 42.5454 },
  { id: 32, date: '2026-09-01', name: 'Bakara Livestock Market',   location: 'Mogadishu',  region: 'Banadir',         species: ['Cattle','Camel'],                status: 'upcoming',  lat: 2.0469,  lon: 45.3182 },
  { id: 33, date: '2026-09-03', name: 'Kismayo Central Market',    location: 'Kismayo',    region: 'Lower Jubba',     species: ['Goat','Sheep'],                  status: 'upcoming',  lat: 0.3582,  lon: 42.5454 },
  { id: 34, date: '2026-09-05', name: 'Bosaso Livestock Exchange', location: 'Bosaso',     region: 'Bari',            species: ['Camel','Goat'],                  status: 'upcoming',  lat: 11.2828, lon: 49.1847 },
];

const SPECIES_STYLE: Record<string, { bg: string; color: string }> = {
  Cattle: { bg: '#dbeafe', color: '#1d4ed8' },
  Camel:  { bg: '#e0f2fe', color: '#0369a1' },
  Goat:   { bg: '#ede9fe', color: '#6d28d9' },
  Sheep:  { bg: '#fce7f3', color: '#be185d' },
};

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const TODAY = '2026-08-16';

const pad = (n: number) => String(n).padStart(2, '0');

function mapUrl(lat: number, lon: number): string {
  const d = 0.12;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lon-d},${lat-d},${lon+d},${lat+d}&layer=mapnik&marker=${lat},${lon}`;
}

function mapsShareUrl(lat: number, lon: number): string {
  return `https://maps.google.com/?q=${lat},${lon}`;
}

export function MarketCalendarPage(): JSX.Element {
  const [year, setYear]         = useState(2026);
  const [month, setMonth]       = useState(7);
  const [selected, setSelected] = useState<Market | null>(null);

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  const byDate = useMemo(() => {
    const map: Record<string, Market[]> = {};
    for (const m of MARKETS) { (map[m.date] ??= []).push(m); }
    return map;
  }, []);

  const daysInMonth    = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const cells: Array<number | null> = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthPrefix    = `${year}-${pad(month + 1)}`;
  const upcomingCount  = MARKETS.filter(m => m.status === 'upcoming'  && m.date.startsWith(monthPrefix)).length;
  const completedCount = MARKETS.filter(m => m.status === 'completed' && m.date.startsWith(monthPrefix)).length;

  const monthMarkets = useMemo(() =>
    MARKETS
      .filter(m => m.date.startsWith(monthPrefix))
      .sort((a, b) => a.date.localeCompare(b.date)),
    [monthPrefix],
  );

  const formattedDate = selected
    ? new Date(selected.date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : '';

  return (
    <div className={s.page}>

      {/* ── Header ── */}
      <div className={s.header}>
        <div className={s.navGroup}>
          <button className={s.navBtn} onClick={prevMonth}><ChevronLeft size={18} strokeWidth={2} /></button>
          <h2 className={s.monthTitle}>{MONTH_NAMES[month]} {year}</h2>
          <button className={s.navBtn} onClick={nextMonth}><ChevronRight size={18} strokeWidth={2} /></button>
        </div>
        <div className={s.headerRight}>
          <span className={`${s.pill} ${s.pillBlue}`}>{upcomingCount} Upcoming</span>
          <span className={`${s.pill} ${s.pillGreen}`}>{completedCount} Completed</span>
          <div className={s.legendWrap}>
            <span className={s.legendItem}><span className={s.legendBox} style={{ background: '#2563eb' }} /> Upcoming</span>
            <span className={s.legendItem}><span className={s.legendBox} style={{ background: '#16a34a' }} /> Completed</span>
          </div>
        </div>
      </div>

      {/* ── Desktop calendar grid ── */}
      <div className={s.cal}>
        <div className={s.dayLabels}>
          {DAY_LABELS.map(d => <div key={d} className={s.dayLabel}>{d}</div>)}
        </div>
        <div className={s.grid}>
          {cells.map((day, i) => {
            if (day === null) return <div key={`b${i}`} className={s.blank} />;

            const ds        = `${year}-${pad(month + 1)}-${pad(day)}`;
            const markets   = byDate[ds] ?? [];
            const isToday   = ds === TODAY;
            const isWeekend = i % 7 === 0 || i % 7 === 6;

            const cellCls = [s.cell, isToday && s.cellToday, isWeekend && s.cellWeekend]
              .filter(Boolean).join(' ');

            return (
              <div key={ds} className={cellCls}>
                <div className={s.dayNum}>
                  <span className={`${s.dayNumInner}${isToday ? ' ' + s.todayNum : ''}`}>{day}</span>
                </div>
                <div className={s.events}>
                  {markets.map(m => (
                    <button
                      key={m.id}
                      className={`${s.event} ${m.status === 'upcoming' ? s.eventUp : s.eventDone}`}
                      onClick={() => setSelected(m)}
                    >
                      <span className={s.eventName}>{m.name}</span>
                      <div className={s.animalRow}>
                        {m.species.map(sp => (
                          <span
                            key={sp}
                            className={s.animalTag}
                            style={{ background: SPECIES_STYLE[sp]?.bg, color: SPECIES_STYLE[sp]?.color }}
                          >{sp}</span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Mobile agenda list ── */}
      <div className={s.agendaList}>
        {monthMarkets.length === 0 ? (
          <div className={s.agendaEmpty}>No markets scheduled for {MONTH_NAMES[month]} {year}.</div>
        ) : (
          monthMarkets.map(m => {
            const d = new Date(m.date + 'T00:00:00');
            const isToday = m.date === TODAY;
            return (
              <button
                key={m.id}
                className={`${s.agendaCard} ${m.status === 'upcoming' ? s.agendaCardUp : s.agendaCardDone}`}
                onClick={() => setSelected(m)}
              >
                {/* Date block */}
                <div className={`${s.agendaDate} ${isToday ? s.agendaDateToday : ''}`}>
                  <span className={s.agendaDay}>{d.getDate()}</span>
                  <span className={s.agendaMon}>{MONTH_NAMES[d.getMonth()].slice(0, 3).toUpperCase()}</span>
                </div>

                {/* Info */}
                <div className={s.agendaInfo}>
                  <div className={s.agendaName}>{m.name}</div>
                  <div className={s.agendaLoc}>
                    <MapPin size={11} strokeWidth={2} />
                    {m.location}, {m.region}
                  </div>
                  <div className={s.agendaSpecies}>
                    {m.species.map(sp => (
                      <span
                        key={sp}
                        className={s.agendaChip}
                        style={{ background: SPECIES_STYLE[sp]?.bg, color: SPECIES_STYLE[sp]?.color }}
                      >{sp}</span>
                    ))}
                  </div>
                </div>

                {/* Status badge */}
                <span className={`${s.agendaBadge} ${m.status === 'upcoming' ? s.agendaBadgeUp : s.agendaBadgeDone}`}>
                  {m.status === 'upcoming' ? 'Upcoming' : 'Done'}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* ── Modal popup ── */}
      {selected && (
        <div className={s.overlay} onClick={() => setSelected(null)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div className={`${s.modalHeader} ${selected.status === 'upcoming' ? s.modalHeaderUp : s.modalHeaderDone}`}>
              <div>
                <div className={s.modalStatus}>
                  {selected.status === 'upcoming' ? 'Upcoming Market' : 'Completed Market'}
                </div>
                <div className={s.modalTitle}>{selected.name}</div>
              </div>
              <button className={s.modalClose} onClick={() => setSelected(null)}>
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            {/* Modal body */}
            <div className={s.modalBody}>

              {/* Left — details */}
              <div className={s.modalInfo}>
                <div className={s.infoRow}>
                  <CalendarDays size={15} strokeWidth={2} color="#6b7280" />
                  <span>{formattedDate}</span>
                </div>
                <div className={s.infoRow}>
                  <MapPin size={15} strokeWidth={2} color="#6b7280" />
                  <span>{selected.location}, {selected.region}</span>
                </div>
                {selected.note && (
                  <div className={s.modalNote}>{selected.note}</div>
                )}
                <div className={s.modalSectionLabel}>Livestock Types</div>
                <div className={s.modalSpecies}>
                  {selected.species.map(sp => (
                    <span
                      key={sp}
                      className={s.modalChip}
                      style={{ background: SPECIES_STYLE[sp]?.bg, color: SPECIES_STYLE[sp]?.color }}
                    >
                      {sp}
                    </span>
                  ))}
                </div>
                <div className={s.modalSectionLabel}>Coordinates</div>
                <div className={s.modalCoords}>
                  <Tag size={12} strokeWidth={2} color="#9ca3af" />
                  {selected.lat.toFixed(4)}° N, {selected.lon.toFixed(4)}° E
                </div>
                <div className={s.modalSectionLabel}>Share Location</div>
                <div className={s.qrWrap}>
                  <QRCodeSVG
                    value={mapsShareUrl(selected.lat, selected.lon)}
                    size={130}
                    bgColor="#ffffff"
                    fgColor="#111827"
                    level="M"
                  />
                  <span className={s.qrHint}>Scan to open in Google Maps</span>
                </div>
              </div>

              {/* Right — map */}
              <div className={s.modalMap}>
                <iframe
                  title={`Map of ${selected.location}`}
                  src={mapUrl(selected.lat, selected.lon)}
                  scrolling="no"
                />
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default MarketCalendarPage;
