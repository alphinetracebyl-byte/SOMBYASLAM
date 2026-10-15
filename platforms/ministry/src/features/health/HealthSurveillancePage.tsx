import { useState, useEffect } from 'react';
import { Activity, AlertTriangle, Shield, Syringe } from 'lucide-react';
import client from '@/api/client';
import s from './health.module.css';

interface DiseaseCase { id: string; caseCode: string; disease: string; status: string; premisesCode?: string; regionCode: string; reportedAt: string; confirmedAt?: string; }
interface VaccinationCampaign { id: string; campaignCode: string; campaignName: string; status: string; targetRegionCode: string; vaccineProduct: string; plannedAnimalCount: number; actualAnimalCount: number; plannedStartDate: string; }
interface MovementRestriction { id: string; restrictionCode: string; animalId?: string; premisesId?: string; reason: string; diseaseSuspected?: string; imposedAt: string; status: string; }

const STATUS_COLOR: Record<string, string> = {
  SUSPECTED: '#d97706', CONFIRMED: '#dc2626', NEGATIVE: '#16a34a', CLOSED: '#64748b',
  PLANNED: '#0b5ed7', ACTIVE: '#059669', COMPLETED: '#16a34a', CANCELLED: '#94a3b8',
};

const DISEASE_TABS = ['Disease Cases', 'Vaccination Campaigns', 'Movement Restrictions', 'Health Events'];

export function HealthSurveillancePage(): JSX.Element {
  const [tab, setTab] = useState(0);
  const [cases, setCases] = useState<DiseaseCase[]>([]);
  const [campaigns, setCampaigns] = useState<VaccinationCampaign[]>([]);
  const [restrictions, setRestrictions] = useState<MovementRestriction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      client.get('/disease-cases', { params: { size: 50 } }).then(r => setCases(r.data.content ?? [])).catch(() => setCases([])),
      client.get('/vaccination-campaigns', { params: { size: 50 } }).then(r => setCampaigns(r.data.content ?? [])).catch(() => setCampaigns([])),
      client.get('/movement-restrictions', { params: { status: 'ACTIVE', size: 50 } }).then(r => setRestrictions(r.data.content ?? [])).catch(() => setRestrictions([])),
    ]).finally(() => setLoading(false));
  }, []);

  const confirmedCases = cases.filter(c => c.status === 'CONFIRMED');

  return (
    <div className={s.page}>
      {confirmedCases.length > 0 && (
        <div className={s.alertBanner}>
          <AlertTriangle size={18} color="#dc2626"/>
          <strong>{confirmedCases.length} confirmed disease case{confirmedCases.length > 1 ? 's' : ''}</strong> — immediate action required
        </div>
      )}

      <div className={s.kpiRow}>
        <div className={s.kpi}><AlertTriangle size={20} color="#d97706"/><div><div className={s.kpiVal}>{cases.filter(c => c.status === 'SUSPECTED').length}</div><div className={s.kpiLabel}>Suspected Cases</div></div></div>
        <div className={s.kpi}><Shield size={20} color="#dc2626"/><div><div className={s.kpiVal}>{confirmedCases.length}</div><div className={s.kpiLabel}>Confirmed Cases</div></div></div>
        <div className={s.kpi}><Syringe size={20} color="#0b5ed7"/><div><div className={s.kpiVal}>{campaigns.filter(c => c.status === 'ACTIVE').length}</div><div className={s.kpiLabel}>Active Campaigns</div></div></div>
        <div className={s.kpi}><Activity size={20} color="#dc2626"/><div><div className={s.kpiVal}>{restrictions.length}</div><div className={s.kpiLabel}>Active Restrictions</div></div></div>
      </div>

      <div className={s.tabs}>
        {DISEASE_TABS.map((t, i) => (
          <button key={i} className={`${s.tab}${tab === i ? ' ' + s.tabActive : ''}`} onClick={() => setTab(i)}>{t}</button>
        ))}
      </div>

      {loading ? <div className={s.loading}>Loading…</div> : (
        <>
          {tab === 0 && (
            <div className={s.card}>
              <table className={s.table}>
                <thead><tr><th className={s.th}>Case Code</th><th className={s.th}>Disease</th><th className={s.th}>Region</th><th className={s.th}>Status</th><th className={s.th}>Reported</th></tr></thead>
                <tbody>
                  {cases.length === 0 ? <tr><td colSpan={5} className={s.empty}>No disease cases</td></tr> :
                    cases.map(c => (
                      <tr key={c.id} className={s.tr}>
                        <td className={s.td}><span className={s.code}>{c.caseCode}</span></td>
                        <td className={s.td}>{c.disease}</td>
                        <td className={s.td}>{c.regionCode}</td>
                        <td className={s.td}><span className={s.badge} style={{color: STATUS_COLOR[c.status] ?? '#64748b', background: (STATUS_COLOR[c.status] ?? '#64748b') + '18'}}>{c.status}</span></td>
                        <td className={s.td}>{new Date(c.reportedAt).toLocaleDateString()}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          )}

          {tab === 1 && (
            <div className={s.grid2}>
              {campaigns.length === 0 ? <div className={s.empty}>No campaigns</div> :
                campaigns.map(c => (
                  <div key={c.id} className={s.campaignCard}>
                    <div className={s.campaignTop}><span className={s.code}>{c.campaignCode}</span><span className={s.badge} style={{color: STATUS_COLOR[c.status] ?? '#64748b', background: (STATUS_COLOR[c.status] ?? '#64748b') + '18'}}>{c.status}</span></div>
                    <div className={s.campaignName}>{c.campaignName}</div>
                    <div className={s.campaignMeta}>{c.vaccineProduct} · {c.targetRegionCode}</div>
                    <div className={s.progressWrap}>
                      <div className={s.progressBar} style={{width: `${Math.min(100, (c.actualAnimalCount / Math.max(1, c.plannedAnimalCount)) * 100)}%`}}/>
                    </div>
                    <div className={s.progressLabel}>{c.actualAnimalCount} / {c.plannedAnimalCount} animals</div>
                  </div>
                ))
              }
            </div>
          )}

          {tab === 2 && (
            <div className={s.card}>
              <table className={s.table}>
                <thead><tr><th className={s.th}>Code</th><th className={s.th}>Reason</th><th className={s.th}>Disease Suspected</th><th className={s.th}>Imposed</th><th className={s.th}>Status</th></tr></thead>
                <tbody>
                  {restrictions.length === 0 ? <tr><td colSpan={5} className={s.empty}>No active restrictions</td></tr> :
                    restrictions.map(r => (
                      <tr key={r.id} className={s.tr}>
                        <td className={s.td}><span className={s.code}>{r.restrictionCode}</span></td>
                        <td className={s.td}>{r.reason}</td>
                        <td className={s.td}>{r.diseaseSuspected ?? '—'}</td>
                        <td className={s.td}>{new Date(r.imposedAt).toLocaleDateString()}</td>
                        <td className={s.td}><span className={s.badge} style={{color:'#dc2626', background:'#dc262618'}}>{r.status}</span></td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          )}

          {tab === 3 && (
            <div className={s.empty} style={{padding: '3rem'}}>Health events view — filter by animal or premises above</div>
          )}
        </>
      )}
    </div>
  );
}

export default HealthSurveillancePage;
