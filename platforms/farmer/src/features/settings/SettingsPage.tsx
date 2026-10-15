import { useState, useEffect } from 'react';
import { MapPin, UserCheck, Stethoscope } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import s from './settings.module.css';

type Tab = 'regions' | 'inspectors' | 'vets';

interface Region      { code: string; name: string; active: boolean; }
interface Inspector   { id: string; name: string; region_code: string; phone?: string; email?: string; license_number?: string; active: boolean; }
interface Vet         { id: string; name: string; region_code: string; specialization?: string; phone?: string; email?: string; license_number?: string; active: boolean; }

const TABS = [
  { key: 'regions'    as Tab, label: 'Regions',       Icon: MapPin      },
  { key: 'inspectors' as Tab, label: 'Inspectors',    Icon: UserCheck   },
  { key: 'vets'       as Tab, label: 'Veterinarians', Icon: Stethoscope },
];

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, fontWeight: 700,
      color: active ? '#16a34a' : '#9ca3af',
      background: active ? '#f0fdf4' : '#f9fafb',
      border: `1px solid ${active ? '#bbf7d0' : '#e5e7eb'}`,
      borderRadius: 20, padding: '2px 10px',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: active ? '#16a34a' : '#d1d5db', display: 'inline-block' }} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function RegionName({ code, regions }: { code: string; regions: Region[] }) {
  const r = regions.find(x => x.code === code);
  return <>{r ? r.name : code}</>;
}

function Empty({ message }: { message: string }) {
  return <div className={s.empty}>{message}</div>;
}

export function SettingsPage(): JSX.Element {
  const [tab, setTab]               = useState<Tab>('regions');
  const [regions, setRegions]       = useState<Region[]>([]);
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [vets, setVets]             = useState<Vet[]>([]);
  const [loadingI, setLoadingI]     = useState(false);
  const [loadingV, setLoadingV]     = useState(false);

  useEffect(() => {
    supabase
      .from('ministry_regions')
      .select('code, name, active')
      .order('name')
      .then(({ data }) => setRegions((data ?? []) as Region[]));
  }, []);

  useEffect(() => {
    if (tab !== 'inspectors') return;
    setLoadingI(true);
    supabase
      .from('regional_inspectors')
      .select('*')
      .order('name')
      .then(({ data }) => setInspectors((data ?? []) as Inspector[]))
      .finally(() => setLoadingI(false));
  }, [tab]);

  useEffect(() => {
    if (tab !== 'vets') return;
    setLoadingV(true);
    supabase
      .from('regional_vets')
      .select('*')
      .order('name')
      .then(({ data }) => setVets((data ?? []) as Vet[]))
      .finally(() => setLoadingV(false));
  }, [tab]);

  return (
    <div className={s.page}>
      <div className={s.tabBar}>
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            className={`${s.tab}${tab === key ? ' ' + s.tabActive : ''}`}
            onClick={() => setTab(key)}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      <div className={s.panel}>

        {/* ── Regions ─────────────────────────────────────────────── */}
        {tab === 'regions' && (
          regions.length === 0
            ? <Empty message="No regions loaded. Run the ministry-regions SQL migration in Supabase." />
            : (
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Region Name</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {regions.map(r => (
                    <tr key={r.code}>
                      <td><span className={s.code}>{r.code}</span></td>
                      <td>{r.name}</td>
                      <td><ActiveBadge active={r.active} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
        )}

        {/* ── Inspectors ──────────────────────────────────────────── */}
        {tab === 'inspectors' && (
          loadingI
            ? <Empty message="Loading…" />
            : inspectors.length === 0
              ? <Empty message="No inspectors registered. Run the regional_inspectors SQL migration in Supabase." />
              : (
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Region</th>
                      <th>Phone</th>
                      <th>Email</th>
                      <th>License No.</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspectors.map(i => (
                      <tr key={i.id}>
                        <td className={s.bold}>{i.name}</td>
                        <td><RegionName code={i.region_code} regions={regions} /></td>
                        <td>{i.phone ?? '—'}</td>
                        <td>{i.email ?? '—'}</td>
                        <td><span className={s.code}>{i.license_number ?? '—'}</span></td>
                        <td><ActiveBadge active={i.active} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
        )}

        {/* ── Veterinarians ───────────────────────────────────────── */}
        {tab === 'vets' && (
          loadingV
            ? <Empty message="Loading…" />
            : vets.length === 0
              ? <Empty message="No veterinarians registered. Run the regional_vets SQL migration in Supabase." />
              : (
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Region</th>
                      <th>Specialization</th>
                      <th>Phone</th>
                      <th>Email</th>
                      <th>License No.</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vets.map(v => (
                      <tr key={v.id}>
                        <td className={s.bold}>{v.name}</td>
                        <td><RegionName code={v.region_code} regions={regions} /></td>
                        <td>{v.specialization ?? '—'}</td>
                        <td>{v.phone ?? '—'}</td>
                        <td>{v.email ?? '—'}</td>
                        <td><span className={s.code}>{v.license_number ?? '—'}</span></td>
                        <td><ActiveBadge active={v.active} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
        )}

      </div>
    </div>
  );
}

export default SettingsPage;
