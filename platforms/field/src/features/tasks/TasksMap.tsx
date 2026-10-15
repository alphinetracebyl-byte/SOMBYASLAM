import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export type TaskPinType = 'verification' | 'movement' | 'inspection' | 'destination';

export interface TaskPin {
  id:       string;
  code:     string;
  name:     string;
  lat:      number;
  lng:      number;
  taskType: TaskPinType;
  label:    string;
}

export interface TaskRoute {
  id:      string;
  label:   string;
  fromLat: number;
  fromLng: number;
  toLat:   number;
  toLng:   number;
}

const TYPE_COLOR: Record<TaskPinType, string> = {
  verification: '#2563eb',
  movement:     '#ea580c',
  inspection:   '#16a34a',
  destination:  '#9333ea',
};

const TYPE_LABEL: Record<TaskPinType, string> = {
  verification: 'Animal Verification',
  movement:     'Movement Request',
  inspection:   'Pre-Movement Inspection',
  destination:  'Destination Check',
};

const ROUTE_COLOR = '#16a34a'; // green for inspection routes

interface Props {
  pins:    TaskPin[];
  routes?: TaskRoute[];
  height?: string;
}

export function TasksMap({ pins, routes = [], height = '100%' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);

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

    const allLayers: L.Layer[] = [];

    // ── Draw inspection route lines first (behind pins) ──
    routes.forEach(r => {
      const line = L.polyline(
        [[r.fromLat, r.fromLng], [r.toLat, r.toLng]],
        { color: ROUTE_COLOR, weight: 3, opacity: 0.75, dashArray: '6 4' }
      ).addTo(map);
      line.bindTooltip(
        `<span style="font-size:0.75rem;font-weight:600;color:#166534">${r.label}</span>`,
        { sticky: true }
      );
      allLayers.push(line);
    });

    // ── Draw pin markers ──
    if (pins.length === 0 && routes.length === 0) {
      map.setView([6.0, 46.0], 5);
    } else {
      pins.forEach(p => {
        const color = TYPE_COLOR[p.taskType];

        const icon = L.divIcon({
          className:   '',
          iconSize:    [28, 36],
          iconAnchor:  [14, 36],
          popupAnchor: [0, -36],
          html: `
            <svg width="28" height="36" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 22 14 22S28 23.333 28 14C28 6.268 21.732 0 14 0z"
                fill="${color}" stroke="#fff" stroke-width="2"/>
              <circle cx="14" cy="14" r="5.5" fill="#fff"/>
            </svg>`,
        });

        const m = L.marker([p.lat, p.lng], { icon }).addTo(map);
        m.bindPopup(
          `<div style="min-width:180px;font-family:Inter,system-ui,sans-serif">
            <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:${color};margin-bottom:4px">
              ${TYPE_LABEL[p.taskType]}
            </div>
            <div style="font-size:0.875rem;font-weight:600;color:#111827">${p.name}</div>
            <div style="font-size:0.72rem;color:#6b7280;font-family:monospace;margin-top:2px">${p.code}</div>
            ${p.label ? `<div style="font-size:0.8rem;color:#374151;margin-top:6px;border-top:1px solid #f3f4f6;padding-top:6px">${p.label}</div>` : ''}
          </div>`
        );
        allLayers.push(m);
      });

      const group = L.featureGroup(allLayers);
      if (group.getBounds().isValid()) {
        map.fitBounds(group.getBounds(), { padding: [40, 40], maxZoom: 10 });
      } else {
        map.setView([6.0, 46.0], 5);
      }
    }

    return () => { mapRef.current?.remove(); mapRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins, routes]);

  return (
    <div style={{ height, width: '100%', borderRadius: 12, overflow: 'hidden' }}>
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
    </div>
  );
}
