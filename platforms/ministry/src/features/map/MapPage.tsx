import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X } from 'lucide-react';
import s from './map.module.css';

const FARMS: Array<{
  id: string; name: string; owner: string; region: string;
  lat: number; lng: number; animals: number; status: 'ACTIVE' | 'SUSPENDED';
}> = [
  { id: 'PRM-001', name: 'Hassan Farm', owner: 'Abdi Hassan', region: 'Banaadir', lat: 2.046, lng: 45.318, animals: 42, status: 'ACTIVE' },
  { id: 'PRM-002', name: 'Warsame Ranch', owner: 'Fadumo Warsame', region: 'Jubbada Hoose', lat: -0.358, lng: 42.545, animals: 87, status: 'ACTIVE' },
  { id: 'PRM-003', name: 'Ali Grazing Land', owner: 'Osman Ali', region: 'Bay', lat: 3.117, lng: 43.648, animals: 23, status: 'ACTIVE' },
  { id: 'PRM-004', name: 'Nur Livestock', owner: 'Halimo Nur', region: 'Nugaal', lat: 8.405, lng: 48.485, animals: 118, status: 'ACTIVE' },
  { id: 'PRM-005', name: 'Duale Herd', owner: 'Ahmed Duale', region: 'Bari', lat: 11.284, lng: 49.178, animals: 64, status: 'ACTIVE' },
  { id: 'PRM-006', name: 'Hargeisa Plains', owner: 'Sahra Egal', region: 'Woqooyi Galbeed', lat: 9.560, lng: 44.065, animals: 156, status: 'ACTIVE' },
  { id: 'PRM-007', name: 'Berbera Station', owner: 'Mahad Hersi', region: 'Sahil', lat: 10.439, lng: 45.016, animals: 39, status: 'SUSPENDED' },
  { id: 'PRM-008', name: 'Merca Pasture', owner: 'Ifrah Jama', region: 'Shabeellaha Hoose', lat: 1.706, lng: 44.778, animals: 71, status: 'ACTIVE' },
  { id: 'PRM-009', name: 'Galkayo Farm', owner: 'Yasin Farah', region: 'Mudug', lat: 6.766, lng: 47.433, animals: 33, status: 'ACTIVE' },
  { id: 'PRM-010', name: 'Hiiraan Cattle', owner: 'Deeqa Omar', region: 'Hiiraan', lat: 4.736, lng: 45.204, animals: 95, status: 'ACTIVE' },
  { id: 'PRM-011', name: 'Afgoye Farms', owner: 'Cabdi Maxamed', region: 'Shabeellaha Hoose', lat: 2.145, lng: 45.119, animals: 28, status: 'ACTIVE' },
  { id: 'PRM-012', name: 'Luuq Ranch', owner: 'Fowsia Guure', region: 'Gedo', lat: 3.803, lng: 42.544, animals: 61, status: 'ACTIVE' },
];

type FilterStatus = 'ALL' | 'ACTIVE' | 'SUSPENDED';

export function MapPage(): JSX.Element {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [selected, setSelected] = useState<typeof FARMS[0] | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [5.5, 46.5],
      zoom: 6,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(map);

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const filtered = FARMS.filter(f => {
      const matchStatus = filter === 'ALL' || f.status === filter;
      const matchSearch = search === '' ||
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.owner.toLowerCase().includes(search.toLowerCase()) ||
        f.region.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });

    filtered.forEach(farm => {
      const isActive = farm.status === 'ACTIVE';
      const icon = L.divIcon({
        className: '',
        html: `
          <div style="
            width:36px;height:36px;border-radius:50%;
            background:${isActive ? '#1d4ed8' : '#94a3b8'};
            border:3px solid ${isActive ? '#fff' : '#e2e8f0'};
            box-shadow:0 2px 8px rgba(0,0,0,0.25);
            display:flex;align-items:center;justify-content:center;
            color:#fff;font-size:11px;font-weight:700;
            cursor:pointer;
          ">${farm.animals}</div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([farm.lat, farm.lng], { icon })
        .addTo(map)
        .on('click', () => setSelected(farm));

      markersRef.current.push(marker);
    });
  }, [filter, search]);

  const zoomTo = (farm: typeof FARMS[0]) => {
    mapRef.current?.flyTo([farm.lat, farm.lng], 12, { duration: 1.2 });
    setSelected(farm);
  };

  const filtered = FARMS.filter(f => {
    const matchStatus = filter === 'ALL' || f.status === filter;
    const matchSearch = search === '' ||
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.owner.toLowerCase().includes(search.toLowerCase()) ||
      f.region.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className={s.page}>

      {/* Left panel */}
      <div className={s.panel}>
        <div className={s.panelHeader}>
          <div className={s.panelTitle}>Registered Premises</div>
          <div className={s.panelCount}>{filtered.length} of {FARMS.length}</div>
        </div>

        <input
          className={s.search}
          placeholder="Search farm, owner, region…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div className={s.filterRow}>
          {(['ALL', 'ACTIVE', 'SUSPENDED'] as FilterStatus[]).map(f => (
            <button
              key={f}
              className={`${s.filterBtn}${filter === f ? ' ' + s.filterActive : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        <div className={s.farmList}>
          {filtered.map(farm => (
            <div
              key={farm.id}
              className={`${s.farmItem}${selected?.id === farm.id ? ' ' + s.farmItemActive : ''}`}
              onClick={() => zoomTo(farm)}
            >
              <div className={s.farmDot} style={{ background: farm.status === 'ACTIVE' ? '#1d4ed8' : '#94a3b8' }} />
              <div className={s.farmInfo}>
                <div className={s.farmName}>{farm.name}</div>
                <div className={s.farmMeta}>{farm.owner} · {farm.region}</div>
              </div>
              <div className={s.farmAnimals}>
                <div className={s.farmCount}>{farm.animals}</div>
                <div className={s.farmCountLabel}>animals</div>
              </div>
            </div>
          ))}
        </div>

        <div className={s.panelStats}>
          <div className={s.panelStat}>
            <span className={s.panelStatVal}>{FARMS.reduce((a, f) => a + f.animals, 0)}</span>
            <span className={s.panelStatLabel}>Total Animals</span>
          </div>
          <div className={s.panelStat}>
            <span className={s.panelStatVal}>{FARMS.filter(f => f.status === 'ACTIVE').length}</span>
            <span className={s.panelStatLabel}>Active Farms</span>
          </div>
          <div className={s.panelStat}>
            <span className={s.panelStatVal}>{FARMS.filter(f => f.status === 'SUSPENDED').length}</span>
            <span className={s.panelStatLabel}>Suspended</span>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className={s.mapWrap}>
        <div ref={containerRef} className={s.map} />

        {/* Map overlay legend */}
        <div className={s.legend}>
          <div className={s.legendItem}>
            <div className={s.legendDot} style={{ background: '#1d4ed8' }} />
            <span>Active — marker = animal count</span>
          </div>
          <div className={s.legendItem}>
            <div className={s.legendDot} style={{ background: '#94a3b8' }} />
            <span>Suspended</span>
          </div>
        </div>

        {/* Selected farm card */}
        {selected && (
          <div className={s.infoCard}>
            <div className={s.infoCardHeader}>
              <div className={s.infoCardTitle}>{selected.name}</div>
              <button className={s.infoCardClose} onClick={() => setSelected(null)}><X size={14} strokeWidth={2} /></button>
            </div>
            <div className={s.infoRow}><span>ID</span><strong>{selected.id}</strong></div>
            <div className={s.infoRow}><span>Owner</span><strong>{selected.owner}</strong></div>
            <div className={s.infoRow}><span>Region</span><strong>{selected.region}</strong></div>
            <div className={s.infoRow}><span>Animals</span><strong>{selected.animals}</strong></div>
            <div className={s.infoRow}>
              <span>Status</span>
              <span className={s.infoBadge} style={{
                background: selected.status === 'ACTIVE' ? '#dbeafe' : '#f1f5f9',
                color: selected.status === 'ACTIVE' ? '#1d4ed8' : '#64748b',
              }}>
                {selected.status}
              </span>
            </div>
            <div className={s.infoRow}><span>Coords</span><strong>{selected.lat.toFixed(3)}, {selected.lng.toFixed(3)}</strong></div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MapPage;
