import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export interface MapPoint {
  id: string;
  name: string;
  code: string;
  lat: number;
  lng: number;
  animalCount: number;
  type: string;
}

interface Props {
  points: MapPoint[];
  height?: string;
}

export function PremisesMap({ points, height = '100%' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Destroy any existing Leaflet instance on this container
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
    // Clear the internal Leaflet ID so it doesn't refuse to re-initialize
    (el as HTMLElement & { _leaflet_id?: number })._leaflet_id = undefined;

    const map = L.map(el, { zoomControl: true });
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    if (points.length === 0) {
      map.setView([6.0, 46.0], 5);
    } else {
      const markers = points.map(p => {
        const m = L.marker([p.lat, p.lng]).addTo(map);
        m.bindPopup(
          `<div style="min-width:160px">
            <strong style="font-size:0.85rem">${p.name}</strong><br/>
            <span style="font-size:0.72rem;color:#64748b;font-family:monospace">${p.code}</span><br/>
            <span style="font-size:0.75rem">${p.type} &middot; ${p.animalCount} animals</span>
          </div>`
        );
        return m;
      });

      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds(), { padding: [48, 48] });
    }

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} style={{ height, width: '100%' }} />;
}
