import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, XCircle, AlertTriangle } from 'lucide-react';
import s from './location.map.module.css';

const SOMALIA_CENTER: [number, number] = [5.5, 46.5];

export function LocationMap(): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'denied' | 'unsupported'>('loading');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: SOMALIA_CENTER,
      zoom: 5,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(map);

    mapRef.current = map;

    if (!navigator.geolocation) {
      setStatus('unsupported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCoords({ lat, lng });
        setStatus('ok');

        map.setView([lat, lng], 13);

        const icon = L.divIcon({
          className: '',
          html: `
            <div style="position:relative;width:20px;height:20px;">
              <div style="
                width:20px;height:20px;border-radius:50%;
                background:#1d4ed8;border:3px solid #fff;
                box-shadow:0 2px 8px rgba(29,78,216,0.5);
              "></div>
              <div style="
                position:absolute;top:50%;left:50%;
                transform:translate(-50%,-50%);
                width:40px;height:40px;border-radius:50%;
                background:rgba(29,78,216,0.15);
                animation:pulse 2s infinite;
              "></div>
            </div>
          `,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        const marker = L.marker([lat, lng], { icon })
          .addTo(map)
          .bindPopup(`<strong>Your Location</strong><br/>${lat.toFixed(4)}, ${lng.toFixed(4)}`)
          .openPopup();

        markerRef.current = marker;
      },
      () => {
        setStatus('denied');
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className={s.card}>
      <div className={s.cardHeader}>
        <div>
          <div className={s.cardTitle}><MapPin size={14} strokeWidth={1.75} style={{ verticalAlign: 'middle', marginRight: 4 }} /> My Location</div>
          <div className={s.cardSub}>Current GPS position</div>
        </div>
        {status === 'ok' && coords && (
          <div className={s.coords}>
            {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
          </div>
        )}
      </div>

      <div className={s.mapWrap}>
        {status === 'loading' && (
          <div className={s.overlay}>
            <div className={s.spinner} />
            <span>Detecting location…</span>
          </div>
        )}
        {status === 'denied' && (
          <div className={s.overlay}>
            <span className={s.overlayIcon}><XCircle size={28} strokeWidth={1.5} color="#94a3b8" /></span>
            <span className={s.overlayMsg}>Location access denied</span>
            <span className={s.overlaySub}>Enable location in browser settings</span>
          </div>
        )}
        {status === 'unsupported' && (
          <div className={s.overlay}>
            <span className={s.overlayIcon}><AlertTriangle size={28} strokeWidth={1.5} color="#94a3b8" /></span>
            <span className={s.overlayMsg}>Geolocation not supported</span>
          </div>
        )}
        <div ref={containerRef} className={s.map} />
      </div>

      <div className={s.footer}>
        <span className={s.footerDot} style={{ background: status === 'ok' ? '#1d4ed8' : '#94a3b8' }} />
        {status === 'loading' && 'Detecting your location…'}
        {status === 'ok' && 'Location detected — click marker for coordinates'}
        {status === 'denied' && 'Location permission denied'}
        {status === 'unsupported' && 'Geolocation not available in this browser'}
      </div>
    </div>
  );
}

export default LocationMap;
