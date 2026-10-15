import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase';
import s from '../quarantine/quarantine.module.css';

const PATH_TO_TAB: Record<string, string> = {
  '/slaughter/receiving':    'receiving',
  '/slaughter/antemortem':  'antemortem',
  '/slaughter/halal':       'halal',
  '/slaughter/events':      'events',
  '/slaughter/postmortem':  'postmortem',
  '/slaughter/dispatch':    'dispatch',
  '/slaughter/certificates': 'certs',
};

export function SlaughterDashboard(): JSX.Element {
  const { setActiveTab } = useOutletContext<{ activeTab: string; setActiveTab: (id: string) => void }>();
  const { facilityId, staffRole } = useAuthStore();
  const today = new Date().toISOString().slice(0, 10);

  const [stats, setStats] = useState({
    received: 0, antePending: 0, readySlaughter: 0,
    slaughteredToday: 0, postPending: 0, cleared: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { void loadStats(); }, [facilityId]);

  async function loadStats() {
    if (!facilityId) return;
    setLoading(true);
    const [recv, ante, ready, slau, post, clr] = await Promise.all([
      supabase.from('slaughter_records').select('id', { count: 'exact', head: true })
        .eq('facility_id', facilityId).eq('status', 'RECEIVED'),
      supabase.from('slaughter_records').select('id', { count: 'exact', head: true })
        .eq('facility_id', facilityId).eq('status', 'ANTE_MORTEM_PENDING'),
      supabase.from('slaughter_records').select('id', { count: 'exact', head: true })
        .eq('facility_id', facilityId).eq('status', 'ANTE_MORTEM_PASSED'),
      supabase.from('slaughter_records').select('id', { count: 'exact', head: true })
        .eq('facility_id', facilityId).eq('slaughter_date', today),
      supabase.from('slaughter_records').select('id', { count: 'exact', head: true })
        .eq('facility_id', facilityId).eq('status', 'SLAUGHTERED'),
      supabase.from('slaughter_records').select('id', { count: 'exact', head: true })
        .eq('facility_id', facilityId).eq('status', 'POST_MORTEM_PASSED'),
    ]);
    setStats({
      received:         recv.count ?? 0,
      antePending:      ante.count ?? 0,
      readySlaughter:   ready.count ?? 0,
      slaughteredToday: slau.count ?? 0,
      postPending:      post.count ?? 0,
      cleared:          clr.count ?? 0,
    });
    setLoading(false);
  }

  const canSupervise = ['SLAUGHTER_SUPERVISOR'].includes(staffRole ?? '');
  const canInspect   = ['MEAT_INSPECTOR', 'VETERINARY_OFFICER', 'SLAUGHTER_SUPERVISOR'].includes(staffRole ?? '');
  const canHalal     = ['HALAL_SUPERVISOR', 'SLAUGHTER_SUPERVISOR'].includes(staffRole ?? '');

  const statCards = [
    { label: 'Awaiting Ante-mortem',  value: stats.received,          cls: s.stat_amber  },
    { label: 'Ante-mortem Pending',   value: stats.antePending,       cls: s.stat_orange },
    { label: 'Ready to Slaughter',    value: stats.readySlaughter,    cls: s.stat_green  },
    { label: 'Slaughtered Today',     value: stats.slaughteredToday,  cls: s.stat_teal   },
    { label: 'Post-mortem Pending',   value: stats.postPending,       cls: s.stat_blue   },
    { label: 'Cleared for Dispatch',  value: stats.cleared,           cls: s.stat_purple },
  ];

  const actions = [
    { icon: '🚛', title: 'Animal Receiving',        desc: 'Accept animals from movement permits',   tab: 'receiving',  show: true           },
    { icon: '🔬', title: 'Ante-mortem Inspection',  desc: 'Pre-slaughter health assessment',         tab: 'antemortem', show: canInspect      },
    { icon: '☪',  title: 'Halal Verification',      desc: 'Verify halal compliance before slaughter', tab: 'halal',    show: canHalal || canInspect },
    { icon: '⚡', title: 'Slaughter Events',         desc: 'Record slaughter line and carcass codes', tab: 'events',    show: canSupervise    },
    { icon: '🧪', title: 'Post-mortem Inspection',  desc: 'Carcass and organ inspection',            tab: 'postmortem', show: canInspect      },
    { icon: '📦', title: 'Export Dispatch',          desc: 'Build and manage export consignments',   tab: 'dispatch',   show: canSupervise || canInspect },
    { icon: '📜', title: 'Certificates',             desc: 'Health and export certificates',         tab: 'certs',      show: true            },
  ].filter(a => a.show);

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.pageTitle}>Slaughterhouse Operations</h1>
          <p className={s.pageSub}>Live tracking — {today}</p>
        </div>
        <button className={s.refreshBtn} onClick={() => void loadStats()}>↺ Refresh</button>
      </div>

      <div className={s.statGrid}>
        {loading
          ? <div className={s.empty} style={{ gridColumn: '1/-1' }}>Loading stats…</div>
          : statCards.map(c => (
            <div key={c.label} className={`${s.statCard} ${c.cls}`}>
              <div className={s.statValue}>{c.value}</div>
              <div className={s.statLabel}>{c.label}</div>
            </div>
          ))
        }
      </div>

      <div>
        <h2 className={s.sectionTitle}>Workflow</h2>
        <div className={s.actionGrid}>
          {actions.map(a => (
            <button key={a.tab} className={s.actionCard} onClick={() => setActiveTab(a.tab)}>
              <span className={s.actionIcon}>{a.icon}</span>
              <div>
                <div className={s.actionTitle}>{a.title}</div>
                <div className={s.actionDesc}>{a.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SlaughterDashboard;
