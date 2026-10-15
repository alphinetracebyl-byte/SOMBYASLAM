import { useState, useEffect, useCallback } from 'react';
import {
  Search, RefreshCw, MapPin, User, Tag, X,
  CheckCircle, XCircle, Clock, AlertTriangle,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { apiClient } from '@/api/client';
import s from './region-animals.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Animal {
  id: string;
  animalCode: string;
  species: string;
  breed?: string;
  sex: string;
  activeTagSerial?: string;
  status: string;
  currentPremisesCode?: string;
  currentPremisesName?: string;
  ownerName?: string;
  regionCode: string;
  registeredAt: string;
  coatColor?: string;
  weightKg?: number | null;
  ageMonths?: number | null;
}

interface AnimalPage {
  content: Animal[];
  totalElements: number;
  totalPages: number;
  number: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SPECIES_EMOJI: Record<string, string> = {
  CATTLE: '🐄', CAMEL: '🐪', GOAT: '🐐', SHEEP: '🐑',
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  SUBMITTED:   { label: 'Pending Verification', color: '#b45309', bg: '#fffbeb', Icon: Clock },
  VERIFIED:    { label: 'Verified',              color: '#15803d', bg: '#f0fdf4', Icon: CheckCircle },
  ACTIVE:      { label: 'Active',                color: '#1d4ed8', bg: '#eff6ff', Icon: CheckCircle },
  RESTRICTED:  { label: 'Restricted',            color: '#b91c1c', bg: '#fef2f2', Icon: AlertTriangle },
  REJECTED:    { label: 'Rejected',              color: '#b91c1c', bg: '#fef2f2', Icon: XCircle },
  DEAD:        { label: 'Dead',                  color: '#6b7280', bg: '#f3f4f6', Icon: XCircle },
  SLAUGHTERED: { label: 'Slaughtered',           color: '#6b7280', bg: '#f3f4f6', Icon: XCircle },
};

const SPECIES_OPTIONS = ['', 'CATTLE', 'CAMEL', 'GOAT', 'SHEEP'];
const STATUS_OPTIONS  = ['', 'SUBMITTED', 'VERIFIED', 'ACTIVE', 'RESTRICTED', 'REJECTED'];

// ── Page ──────────────────────────────────────────────────────────────────────

export function RegionAnimalsPage(): JSX.Element {
  const { regionCode, districtCode, roles } = useAuthStore();

  const [animals,       setAnimals]       = useState<Animal[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('');
  const [statusFilter,  setStatusFilter]  = useState('');
  const [page,          setPage]          = useState(0);
  const [totalPages,    setTotalPages]    = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [selected,      setSelected]      = useState<Animal | null>(null);

  const territory = [regionCode, districtCode].filter(Boolean).join(' / ') || 'Your Region';
  const role      = roles[0] ?? '';

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page, size: 20 };
    if (regionCode)    params.regionCode = regionCode;
    if (speciesFilter) params.species    = speciesFilter;
    if (statusFilter)  params.status     = statusFilter;
    if (search.trim()) params.query      = search.trim();

    apiClient.get<AnimalPage>('/animals', { params })
      .then(r => {
        setAnimals(r.data?.content ?? []);
        setTotalPages(r.data?.totalPages ?? 0);
        setTotalElements(r.data?.totalElements ?? 0);
      })
      .catch(() => {
        setAnimals([]);
        setTotalPages(0);
        setTotalElements(0);
      })
      .finally(() => setLoading(false));
  }, [regionCode, speciesFilter, statusFilter, search, page]);

  useEffect(() => { load(); }, [load]);

  const resetFilters = () => {
    setSearch('');
    setSpeciesFilter('');
    setStatusFilter('');
    setPage(0);
  };

  const hasFilters = search || speciesFilter || statusFilter;

  return (
    <div className={s.page}>

      {/* Header */}
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Animals Registry</h1>
          <p className={s.sub}>
            {territory} · {loading ? 'Loading…' : `${totalElements} animal${totalElements !== 1 ? 's' : ''} in your region`}
          </p>
        </div>
        <div className={s.headerRole}>
          <span className={s.rolePill}>{role.replace(/_/g, ' ')}</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className={s.toolbar}>
        <div className={s.searchWrap}>
          <Search size={14} className={s.searchIcon} />
          <input
            className={s.searchInput}
            placeholder="Search by animal code or tag serial…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
          />
          {search && (
            <button className={s.clearBtn} onClick={() => { setSearch(''); setPage(0); }}>
              <X size={12} />
            </button>
          )}
        </div>

        <select className={s.filterSel} value={speciesFilter}
          onChange={e => { setSpeciesFilter(e.target.value); setPage(0); }}>
          <option value="">All Species</option>
          {SPECIES_OPTIONS.filter(Boolean).map(sp => (
            <option key={sp} value={sp}>{SPECIES_EMOJI[sp]} {sp.charAt(0) + sp.slice(1).toLowerCase()}</option>
          ))}
        </select>

        <select className={s.filterSel} value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(0); }}>
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.filter(Boolean).map(st => (
            <option key={st} value={st}>{STATUS_CFG[st]?.label ?? st}</option>
          ))}
        </select>

        {hasFilters && (
          <button className={s.resetBtn} onClick={resetFilters}>Clear filters</button>
        )}

        <button className={s.refreshBtn} onClick={load} disabled={loading} title="Refresh">
          <RefreshCw size={14} strokeWidth={2} className={loading ? s.spin : ''} />
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className={s.tableWrap}>
          {[1, 2, 3, 4, 5].map(i => <div key={i} className={s.skeleton} />)}
        </div>
      ) : animals.length === 0 ? (
        <div className={s.empty}>
          <span className={s.emptyEmoji}>🐾</span>
          <div className={s.emptyTitle}>
            {hasFilters ? 'No animals match the current filters' : 'No animals found in your region'}
          </div>
          <div className={s.emptySub}>
            {hasFilters
              ? 'Try adjusting the species or status filter.'
              : 'Animals registered in your region will appear here once submitted.'}
          </div>
          {hasFilters && (
            <button className={s.resetBtn} style={{ marginTop: '0.5rem' }} onClick={resetFilters}>
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Animal</th>
                <th>Tag Serial</th>
                <th>Sex</th>
                <th>Premises</th>
                <th>Owner</th>
                <th>Registered</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {animals.map(a => {
                const cfg = STATUS_CFG[a.status] ?? STATUS_CFG.SUBMITTED;
                return (
                  <tr key={a.id} className={s.clickRow} onClick={() => setSelected(a)}>
                    <td>
                      <div className={s.animalCell}>
                        <span className={s.animalEmoji}>{SPECIES_EMOJI[a.species] ?? '🐾'}</span>
                        <div>
                          <div className={s.animalCode}>{a.animalCode}</div>
                          <div className={s.animalBreed}>
                            {a.species.charAt(0) + a.species.slice(1).toLowerCase()}
                            {a.breed ? ` · ${a.breed}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className={s.mono}>{a.activeTagSerial ?? '—'}</td>
                    <td>{a.sex.charAt(0) + a.sex.slice(1).toLowerCase().replace('_', ' ')}</td>
                    <td>
                      {a.currentPremisesCode
                        ? <span className={s.premisesCell}>
                            <MapPin size={11} />{a.currentPremisesCode}
                            {a.currentPremisesName ? ` · ${a.currentPremisesName}` : ''}
                          </span>
                        : <span className={s.dim}>—</span>}
                    </td>
                    <td>
                      {a.ownerName
                        ? <span className={s.ownerCell}><User size={11} />{a.ownerName}</span>
                        : <span className={s.dim}>—</span>}
                    </td>
                    <td className={s.dateCell}>
                      {new Date(a.registeredAt).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </td>
                    <td>
                      <span className={s.statusBadge} style={{ color: cfg.color, background: cfg.bg }}>
                        {cfg.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={s.pagination}>
          <button className={s.pageBtn} disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            Previous
          </button>
          <span className={s.pageInfo}>
            Page {page + 1} of {totalPages} · {totalElements} animals
          </span>
          <button className={s.pageBtn} disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
            Next
          </button>
        </div>
      )}

      {/* Animal detail modal */}
      {selected && (
        <div className={s.overlay} onClick={() => setSelected(null)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalHead}>
              <div className={s.modalHeadLeft}>
                <span className={s.modalEmoji}>{SPECIES_EMOJI[selected.species] ?? '🐾'}</span>
                <div>
                  <div className={s.modalAnimalCode}>{selected.animalCode}</div>
                  <div className={s.modalSub}>{selected.species} · {selected.breed ?? '—'}</div>
                </div>
              </div>
              <button className={s.closeBtn} onClick={() => setSelected(null)}><X size={18} /></button>
            </div>

            <div className={s.modalBody}>
              <div className={s.detailGrid}>
                <Detail label="Animal Code"  value={selected.animalCode} mono />
                <Detail label="Tag Serial"   value={selected.activeTagSerial ?? '—'} mono />
                <Detail label="Species"      value={selected.species} />
                <Detail label="Breed"        value={selected.breed ?? '—'} />
                <Detail label="Sex"          value={selected.sex} />
                <Detail label="Region"       value={selected.regionCode} />
                {selected.currentPremisesCode && (
                  <Detail label="Premises"
                    value={[selected.currentPremisesCode, selected.currentPremisesName].filter(Boolean).join(' · ')} mono />
                )}
                {selected.ownerName && <Detail label="Owner"  value={selected.ownerName} />}
                {selected.coatColor && <Detail label="Coat"   value={selected.coatColor} />}
                {selected.weightKg  && <Detail label="Weight" value={`${selected.weightKg} kg`} />}
                {selected.ageMonths && <Detail label="Age"    value={`${selected.ageMonths} months`} />}
                <Detail label="Registered"
                  value={new Date(selected.registeredAt).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })} />
              </div>

              {(() => {
                const cfg = STATUS_CFG[selected.status] ?? STATUS_CFG.SUBMITTED;
                return (
                  <div className={s.statusBanner} style={{ background: cfg.bg, borderColor: cfg.color + '44', color: cfg.color }}>
                    <cfg.Icon size={16} />
                    {cfg.label}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className={s.detail}>
      <div className={s.detailLabel}>{label}</div>
      <div className={`${s.detailValue}${mono ? ' ' + s.mono : ''}`}>{value || '—'}</div>
    </div>
  );
}

export default RegionAnimalsPage;
