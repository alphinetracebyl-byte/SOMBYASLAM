import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Props {
  lat:      number | null;
  lng:      number | null;
  onChange: (lat: number, lng: number) => void;
  height?:  string;
}

const PIN_SVG = `
  <svg width="28" height="36" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 22 14 22S28 23.333 28 14C28 6.268 21.732 0 14 0z"
      fill="#0f2170" stroke="#fff" stroke-width="2"/>
    <circle cx="14" cy="14" r="5.5" fill="#fff"/>
  </svg>`;

export function LocationPickerMap({ lat, lng, onChange, height = '260px' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);
  const markerRef    = useRef<L.Marker | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    (el as HTMLElement & { _leaflet_id?: number })._leaflet_id = undefined;

    const map = L.map(el, { zoomControl: true });
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const icon = L.divIcon({
      className: '',
      iconSize:    [28, 36],
      iconAnchor:  [14, 36],
      popupAnchor: [0, -36],
      html: PIN_SVG,
    });

    if (lat !== null && lng !== null) {
      map.setView([lat, lng], 10);
      markerRef.current = L.marker([lat, lng], { icon }).addTo(map);
    } else {
      map.setView([6.0, 46.0], 5);
    }

    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      if (markerRef.current) {
        markerRef.current.setLatLng([clickLat, clickLng]);
      } else {
        markerRef.current = L.marker([clickLat, clickLng], { icon }).addTo(map);
      }
      onChange(Math.round(clickLat * 1_000_000) / 1_000_000, Math.round(clickLng * 1_000_000) / 1_000_000);
    });

    return () => { mapRef.current?.remove(); mapRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (lat === null && markerRef.current && mapRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  }, [lat]);

  return (
    <div style={{ height, width: '100%' }}>
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
    </div>
  );
}

export default LocationPickerMap;
