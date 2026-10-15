import { useEffect, useState, useCallback } from 'react';
import { Database, RefreshCw, Search, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth.store';
import s from './database.module.css';

const TABLES = [
  { name: 'farmers',             label: 'Farmers'             },
  { name: 'farmer_premises',     label: 'My Farms'            },
  { name: 'animals',             label: 'Animals'             },
  { name: 'batches',             label: 'Batches'             },
  { name: 'animal_photos',       label: 'Animal Photos'       },
  { name: 'incoming_movements',  label: 'Incoming Movements'  },
  { name: 'outgoing_movements',  label: 'Outgoing Movements'  },
  { name: 'exported_batches',    label: 'Exported Batches'    },
  { name: 'farmer_documents',    label: 'Farmer Documents'    },
  { name: 'ministry_regions',    label: 'Ministry Regions'    },
  { name: 'regional_inspectors', label: 'Regional Inspectors' },
  { name: 'regional_vets',       label: 'Regional Vets'       },
  { name: 'app_settings',        label: 'App Settings'        },
];

const PAGE_SIZE = 50;
const RESETTABLE = ['animals', 'batches'];

// Owner column name per table (must match RLS policy)
const OWNER_COL: Record<string, string> = {
  animals: 'current_owner_id',
  batches: 'owner_id',
};

export function DatabasePage(): JSX.Element {
  const { userId } = useAuthStore();
  const [selected, setSelected]     = useState(TABLES[0].name);
  const [rows, setRows]             = useState<Record<string, unknown>[]>([]);
  const [columns, setColumns]       = useState<string[]>([]);
  const [counts, setCounts]         = useState<Record<string, number>>({});
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [search, setSearch]         = useState('');
  const [page, setPage]             = useState(0);
  const [resetting, setResetting]   = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Fetch row counts for all tables
  useEffect(() => {
    TABLES.forEach(({ name }) => {
      supabase
        .from(name)
        .select('*', { count: 'exact', head: true })
        .then(({ count }) => {
          if (count !== null) {
            setCounts(prev => ({ ...prev, [name]: count }));
          }
        });
    });
  }, []);

  const loadTable = useCallback(async (tableName: string, pageNum = 0) => {
    setLoading(true);
    setError(null);
    setRows([]);
    setColumns([]);

    const from = pageNum * PAGE_SIZE;
    const to   = from + PAGE_SIZE - 1;

    const { data, error: err } = await supabase
      .from(tableName)
      .select('*')
      .range(from, to);

    setLoading(false);
    if (err) { setError(err.message); return; }

    const records = (data ?? []) as Record<string, unknown>[];
    setRows(records);
    if (records.length > 0) {
      setColumns(Object.keys(records[0]));
    }
  }, []);

  useEffect(() => {
    setPage(0);
    setSearch('');
    setConfirmReset(false);
    void loadTable(selected, 0);
  }, [selected, loadTable]);

  async function resetTable() {
    if (!userId) return;
    setResetting(true);
    setError(null);

    const ownerCol = OWNER_COL[selected];
    const { error: err } = await supabase
      .from(selected)
      .delete()
      .eq(ownerCol, userId);

    setResetting(false);
    setConfirmReset(false);
    if (err) { setError(`Delete failed: ${err.message}`); return; }
    setCounts(prev => ({ ...prev, [selected]: 0 }));
    void loadTable(selected, 0);
  }

  const filteredRows = search
    ? rows.filter(row =>
        Object.values(row).some(v =>
          String(v ?? '').toLowerCase().includes(search.toLowerCase())
        )
      )
    : rows;

  function fmt(val: unknown): string {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  }

  function isLong(val: unknown): boolean {
    return String(val ?? '').length > 40;
  }

  const totalCount = counts[selected] ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  function goPage(p: number) {
    setPage(p);
    void loadTable(selected, p);
  }

  return (
    <div className={s.page}>
      {/* ── Sidebar ── */}
      <aside className={s.sidebar}>
        <div className={s.sidebarHead}>
          <Database size={15} strokeWidth={2} />
          <span>Database Tables</span>
          <span className={s.sidebarTotal}>{TABLES.length}</span>
        </div>
        <div className={s.tableList}>
          {TABLES.map(t => (
            <button
              key={t.name}
              className={`${s.tableBtn}${selected === t.name ? ' ' + s.tableBtnActive : ''}`}
              onClick={() => setSelected(t.name)}
            >
              <span className={s.tableBtnName}>{t.label}</span>
              {counts[t.name] !== undefined && (
                <span className={s.tableCount}>{counts[t.name]}</span>
              )}
            </button>
          ))}
        </div>
      </aside>

      {/* ── Main ── */}
      <div className={s.main}>
        {/* Header */}
        <div className={s.mainHead}>
          <div className={s.mainHeadLeft}>
            <div className={s.mainTitle}>{TABLES.find(t => t.name === selected)?.label}</div>
            <div className={s.mainSub}>
              <code className={s.tableName}>{selected}</code>
              {totalCount > 0 && <span className={s.mainCount}>{totalCount.toLocaleString()} rows</span>}
            </div>
          </div>
          <div className={s.mainHeadRight}>
            <div className={s.searchBox}>
              <Search size={13} color="#94a3b8" strokeWidth={2} />
              <input
                className={s.searchInput}
                placeholder="Filter rows…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button
              className={s.refreshBtn}
              onClick={() => void loadTable(selected, page)}
              disabled={loading}
            >
              <RefreshCw size={14} strokeWidth={2} className={loading ? s.spinning : ''} />
            </button>
            {RESETTABLE.includes(selected) && (
              confirmReset ? (
                <div className={s.confirmRow}>
                  <span className={s.confirmText}>Delete all rows?</span>
                  <button
                    className={s.confirmYes}
                    onClick={() => void resetTable()}
                    disabled={resetting}
                  >
                    {resetting ? 'Deleting…' : 'Yes, Reset'}
                  </button>
                  <button
                    className={s.confirmNo}
                    onClick={() => setConfirmReset(false)}
                    disabled={resetting}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  className={s.resetBtn}
                  onClick={() => setConfirmReset(true)}
                  title={`Reset ${selected} table`}
                >
                  <Trash2 size={14} strokeWidth={2} /> Reset
                </button>
              )
            )}
          </div>
        </div>

        {/* Content */}
        <div className={s.tableWrap}>
          {loading ? (
            <div className={s.stateBox}>
              <RefreshCw size={24} color="#cbd5e1" strokeWidth={1.5} className={s.spinning} />
              <p>Loading {selected}…</p>
            </div>
          ) : error ? (
            <div className={s.stateBox}>
              <p className={s.errorText}>{error}</p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className={s.stateBox}>
              <Database size={32} color="#cbd5e1" strokeWidth={1.5} />
              <p>{search ? 'No rows match your filter' : 'This table is empty'}</p>
            </div>
          ) : (
            <table className={s.table}>
              <thead>
                <tr>
                  <th className={s.thNum}>#</th>
                  {columns.map(col => (
                    <th key={col} className={s.th}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, i) => (
                  <tr key={i} className={s.tr}>
                    <td className={s.tdNum}>{page * PAGE_SIZE + i + 1}</td>
                    {columns.map(col => (
                      <td
                        key={col}
                        className={`${s.td}${isLong(row[col]) ? ' ' + s.tdLong : ''}`}
                        title={fmt(row[col])}
                      >
                        {row[col] === null || row[col] === undefined
                          ? <span className={s.null}>null</span>
                          : fmt(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={s.pagination}>
            <button
              className={s.pageBtn}
              disabled={page === 0}
              onClick={() => goPage(page - 1)}
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <span className={s.pageInfo}>
              Page {page + 1} of {totalPages} · rows {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)}
            </span>
            <button
              className={s.pageBtn}
              disabled={page >= totalPages - 1}
              onClick={() => goPage(page + 1)}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default DatabasePage;
