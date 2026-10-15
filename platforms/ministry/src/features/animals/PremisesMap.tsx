import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';
import s from './premises-map.module.css';

interface PremisesMapProps {
  lat:  number;
  lng:  number;
  name: string;
  code: string;
}

export function PremisesMap({ lat, lng, name, code }: PremisesMapProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: 13,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(map);

    const icon = L.divIcon({
      className: '',
      html: `
        <div style="position:relative;width:22px;height:22px;">
          <div style="
            width:22px;height:22px;border-radius:50%;
            background:#6366f1;border:3px solid #fff;
            box-shadow:0 2px 10px rgba(99,102,241,0.55);
          "></div>
          <div style="
            position:absolute;top:50%;left:50%;
            transform:translate(-50%,-50%);
            width:46px;height:46px;border-radius:50%;
            background:rgba(99,102,241,0.15);
          "></div>
        </div>
      `,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

    L.marker([lat, lng], { icon })
      .addTo(map)
      .bindPopup(`<strong>${name}</strong><br/><code style="font-size:11px">${code}</code>`)
      .openPopup();

    mapRef.current = map;

    return () => { map.remove(); mapRef.current = null; };
  }, [lat, lng, name, code]);

  return (
    <div className={s.mapCard}>
      <div className={s.mapHeader}>
        <MapPin size={13} color="#6366f1" />
        <span className={s.mapTitle}>{name}</span>
        <span className={s.mapCode}>{code}</span>
      </div>
      <div ref={containerRef} className={s.mapContainer} />
      <div className={s.mapFooter}>
        <span className={s.mapDot} />
        {lat.toFixed(4)}, {lng.toFixed(4)}
      </div>
    </div>
  );
}

export default PremisesMap;
