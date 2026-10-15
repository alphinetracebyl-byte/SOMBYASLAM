import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Beef, MapPin, AlertTriangle, ShieldOff, FileCheck, Tag,
  FileText, CheckCircle, AlertCircle, Info, TrendingUp, Headset, Biohazard,
} from 'lucide-react';
import { getBadge } from '@/utils/statusBadge';
import s from './dashboard.module.css';

const weeklyData = [
  { day: 'Mon', animals: 12, movements: 8 },
  { day: 'Tue', animals: 19, movements: 14 },
  { day: 'Wed', animals: 8, movements: 6 },
  { day: 'Thu', animals: 24, movements: 18 },
  { day: 'Fri', animals: 16, movements: 11 },
  { day: 'Sat', animals: 7, movements: 4 },
  { day: 'Sun', animals: 3, movements: 2 },
];

const CDN = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg';

const speciesData = [
  { name: 'Cattle', value: 42, count: '37,524', color: '#1e40af', img: `${CDN}/1f404.svg` },
  { name: 'Camel',  value: 28, count: '25,016', color: '#0ea5e9', img: `${CDN}/1f42a.svg` },
  { name: 'Goat',   value: 18, count: '16,082', color: '#6366f1', img: `${CDN}/1f410.svg` },
  { name: 'Sheep',  value: 12, count: '10,720', color: '#8b5cf6', img: `${CDN}/1f411.svg` },
];

const recentAnimals = [
  { id: 'SOM-2025-00142', species: 'Cattle', region: 'Mogadishu', owner: 'Abdi Hassan', status: 'ACTIVE', tag: 'TAG-001A' },
  { id: 'SOM-2025-00141', species: 'Camel', region: 'Kismayo', owner: 'Fadumo Warsame', status: 'ACTIVE', tag: 'TAG-002B' },
  { id: 'SOM-2025-00140', species: 'Goat', region: 'Baidoa', owner: 'Osman Ali', status: 'PENDING', tag: 'TAG-003C' },
  { id: 'SOM-2025-00139', species: 'Sheep', region: 'Garowe', owner: 'Halimo Nur', status: 'ACTIVE', tag: 'TAG-004D' },
  { id: 'SOM-2025-00138', species: 'Cattle', region: 'Bosaso', owner: 'Ahmed Duale', status: 'ACTIVE', tag: 'TAG-005E' },
];

const alerts = [
  { level: 'HIGH', title: 'FMD outbreak reported', region: 'Lower Shabelle', time: '2h ago' },
  { level: 'MED', title: 'Quarantine zone review due', region: 'Jubbaland', time: '5h ago' },
  { level: 'LOW', title: 'Vaccination campaign ending', region: 'Puntland', time: '1d ago' },
];

const ALERT_COLORS: Record<string, string> = {
  HIGH: '#ef4444', MED: '#f59e0b', LOW: '#22c55e',
};

const ALERT_ICONS = {
  HIGH: AlertCircle,
  MED: AlertTriangle,
  LOW: Info,
};

export function DashboardPage(): JSX.Element {
  const [dockVisible, setDockVisible] = useState(true);
  const lastY = useRef(0);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setDockVisible(y < lastY.current || y < 20);
      lastY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className={s.page}>

      <div className={s.header}>
        <div>
          <h1 className={s.pageTitle}>National Overview</h1>
          <p className={s.pageSub}>Somalia Livestock Identification and Traceability — Live monitoring dashboard</p>
        </div>
        <div className={s.headerActions}>
          <Link to="/tags" className={s.btnTags}>
            <Tag size={14} strokeWidth={1.75} /> Tag Management
          </Link>
          <Link to="/disease-cases" className={s.btnDisease}>
            <Biohazard size={14} strokeWidth={1.75} /> Disease Cases
          </Link>
          <Link to="/reporting" className={s.btnSecondary}>
            <TrendingUp size={14} strokeWidth={1.75} /> Export Report
          </Link>
        </div>
      </div>

      {/* KPI row */}
      <div className={s.kpiRow}>
        <KpiCard Icon={Beef}          label="Total Animals"    value="89,342" change="+247 today"     to="/animals" />
        <KpiCard Icon={MapPin}        label="Movements Today"  value="63"     change="12 pending"   to="/movements" />
        <KpiCard Icon={AlertTriangle} label="Health Alerts"    value="3"      change="1 critical"   to="/health" />
        <KpiCard Icon={ShieldOff}     label="Quarantine Zones" value="2"      change="active"        to="/quarantine" />
        <KpiCard Icon={FileCheck}     label="Certs Issued"     value="128"    change="this month"   to="/certification" />
        <KpiCard Icon={Tag}           label="Tags Distributed" value="1,204"  change="this quarter" to="/tags" />
      </div>

      {/* Charts row */}
      <div className={s.chartsRow}>
        <div className={s.card} style={{ flex: '1.4' }}>
          <div className={s.cardHeader}>
            <div>
              <div className={s.cardTitle}>Weekly Registrations &amp; Movements</div>
              <div className={s.cardSub}>This week's activity across all regions</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={165}>
            <AreaChart data={weeklyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gAnimals" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gMoves" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', fontSize: 12 }} />
              <Area type="monotone" dataKey="animals" name="Registrations" stroke="#3b82f6" strokeWidth={2} fill="url(#gAnimals)" dot={{ fill: '#3b82f6', r: 3 }} />
              <Area type="monotone" dataKey="movements" name="Movements" stroke="#22c55e" strokeWidth={2} fill="url(#gMoves)" dot={{ fill: '#22c55e', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className={s.card} style={{ flex: '0.6' }}>
          <div className={s.cardHeader}>
            <div>
              <div className={s.cardTitle}>Species Distribution</div>
              <div className={s.cardSub}>National herd composition</div>
            </div>
          </div>

          <div className={s.speciesGrid}>
            {speciesData.map((sp) => (
              <div key={sp.name} className={s.speciesCard}>
                <div className={s.speciesCardTop}>
                  <img src={sp.img} alt={sp.name} width={34} height={34} />
                </div>
                <div className={s.speciesCardBody}>
                  <div className={s.speciesCardName}>{sp.name}</div>
                  <div className={s.speciesCardCount} style={{ color: sp.color }}>{sp.count}</div>
                  <div className={s.speciesCardPct}>{sp.value}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Data row */}
      <div className={s.dataRow}>
        <div className={s.card} style={{ flex: '1.4' }}>
          <div className={s.cardHeader}>
            <div>
              <div className={s.cardTitle}>Recent Animal Registrations</div>
              <div className={s.cardSub}>Latest entries across all regions</div>
            </div>
            <Link to="/animals" className={s.viewAllLink}>View All →</Link>
          </div>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Animal ID</th><th>Species</th><th>Region</th>
                  <th>Owner</th><th>Tag</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentAnimals.map((a) => (
                  <tr key={a.id}>
                    <td className={s.tableId}>{a.id}</td>
                    <td>{a.species}</td>
                    <td>{a.region}</td>
                    <td>{a.owner}</td>
                    <td className={s.tableId}>{a.tag}</td>
                    <td>
                      {(() => { const b = getBadge(a.status); return (
                        <span className={s.statusBadge} style={{ background: b.bg, color: b.color }}>{b.label}</span>
                      ); })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={s.card} style={{ flex: '0.6' }}>
          <div className={s.cardHeader}>
            <div className={s.cardTitle}>Health Alerts</div>
            <Link to="/health" className={s.viewAllLink}>View All →</Link>
          </div>
          <div className={s.alertList}>
            {alerts.map((a, i) => {
              const Icon = ALERT_ICONS[a.level as keyof typeof ALERT_ICONS];
              return (
                <div key={i} className={s.alertItem}>
                  <div className={s.alertBar} style={{ background: ALERT_COLORS[a.level] }} />
                  <div className={s.alertContent}>
                    <div className={s.alertTitle}>{a.title}</div>
                    <div className={s.alertMeta}>{a.region} · {a.time}</div>
                  </div>
                  <span className={s.alertLevel} style={{
                    background: ALERT_COLORS[a.level] + '22',
                    color: ALERT_COLORS[a.level],
                  }}>
                    <Icon size={11} strokeWidth={2} />
                    {a.level}
                  </span>
                </div>
              );
            })}
            <Link to="/health" className={s.alertMoreBtn}>View all health alerts →</Link>
          </div>
        </div>
      </div>

      {/* Bottom stats bar */}
      <div className={`${s.statsBar}${dockVisible ? '' : ' ' + s.statsBarHidden}`}>
        <BarStat Icon={Beef}        label="Total Animals"    value="89,342" />
        <BarStat Icon={Tag}         label="Tagged"           value="88,107" />
        <BarStat Icon={CheckCircle} label="Certified"        value="1,284"  />
        <BarStat Icon={MapPin}      label="Movements (MTD)"  value="1,847"  />
        <BarStat Icon={ShieldOff}   label="Quarantine"       value="2 zones" />
        <BarStat Icon={FileText}    label="Regions Active"   value="18 / 18" />
        <div className={s.dockDivider} />
        <button className={s.supportBtn} title="Support Chat">
          <Headset size={26} strokeWidth={1.5} color="#0b5ed7" />
        </button>
      </div>
    </div>
  );
}

function KpiCard({ Icon, label, value, change, to }: {
  Icon: React.ElementType; label: string; value: string; change: string; to?: string;
}) {
  const inner = (
    <>
      <div className={s.kpiTop}>
        <Icon size={20} strokeWidth={1.5} color="#111827" />
      </div>
      <div className={s.kpiValue}>{value}</div>
      <div className={s.kpiLabel}>{label}</div>
      <div className={s.kpiChange}>{change}</div>
    </>
  );
  return to
    ? <Link to={to} className={s.kpiCard}>{inner}</Link>
    : <div className={s.kpiCard}>{inner}</div>;
}

function BarStat({ Icon, label, value }: { Icon: React.ElementType; label: string; value: string }) {
  return (
    <div className={s.barStat}>
      <Icon size={18} strokeWidth={1.5} color="#0b5ed7" />
      <div>
        <div className={s.barStatValue}>{value}</div>
        <div className={s.barStatLabel}>{label}</div>
      </div>
    </div>
  );
}

export default DashboardPage;
