import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ST, vehicleState, KNOTS_TO_KMH } from './api';

const YEREVAN = [40.1792, 44.4991];

function markerIcon(color) {
  return L.divIcon({
    className: '',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    html: `<div style="width:22px;height:22px;border-radius:50%;background:${color};
      border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
  });
}

/**
 * Карта на Leaflet: живые маркеры устройств, трек, геозоны.
 * devices/positions — карты по id; track — массив позиций; geofences — массив Traccar-геозон.
 * focusId — id устройства, к которому надо подлететь (меняется извне).
 */
export default function LeafletMap({ devices, positions, track, geofences, focusId, focusSeq }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(new Map());
  const layersRef = useRef([]);
  const fittedRef = useRef(false);

  useEffect(() => {
    const map = L.map(containerRef.current, { zoomControl: true }).setView(YEREVAN, 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);
    mapRef.current = map;
    // контейнер растягивается флексом после монтирования — без этого Leaflet
    // рисует тайлы только на первоначальный размер
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(containerRef.current);
    return () => { observer.disconnect(); map.remove(); };
  }, []);

  // маркеры устройств
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !devices) return;
    const markers = markersRef.current;
    const seen = new Set();
    Object.values(devices).forEach((device) => {
      const position = positions?.[device.id];
      if (!position) return;
      seen.add(device.id);
      const { st } = vehicleState(device, position);
      const speed = Math.round(position.speed * KNOTS_TO_KMH);
      const latlng = [position.latitude, position.longitude];
      const label = `<b>${device.name}</b><br>${ST[st].label}${st === 'move' ? ` · ${speed} км/ч` : ''}`;
      let marker = markers.get(device.id);
      if (!marker) {
        marker = L.marker(latlng, { icon: markerIcon(ST[st].dot) }).addTo(map).bindTooltip(label);
        markers.set(device.id, marker);
      } else {
        marker.setLatLng(latlng);
        marker.setIcon(markerIcon(ST[st].dot));
        marker.setTooltipContent(label);
      }
    });
    markers.forEach((marker, id) => {
      if (!seen.has(id)) { marker.remove(); markers.delete(id); }
    });
    if (!fittedRef.current && seen.size > 0) {
      fittedRef.current = true;
      const bounds = L.latLngBounds([...markers.values()].map((m) => m.getLatLng()));
      map.fitBounds(bounds.pad(0.25), { maxZoom: 14 });
    }
  }, [devices, positions]);

  // трек и геозоны
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    layersRef.current.forEach((layer) => layer.remove());
    layersRef.current = [];

    if (track && track.length > 1) {
      const line = L.polyline(track.map((p) => [p.latitude, p.longitude]), {
        color: '#0C7FC3', weight: 4, opacity: 0.85,
      }).addTo(map);
      layersRef.current.push(line);
      map.fitBounds(line.getBounds().pad(0.15));
    }

    (geofences ?? []).forEach((geofence) => {
      const layer = parseArea(geofence.area);
      if (layer) {
        layer.bindTooltip(geofence.name);
        layer.addTo(map);
        layersRef.current.push(layer);
      }
    });
    if (!track && geofences?.length) {
      const group = L.featureGroup(layersRef.current);
      if (group.getLayers().length) map.fitBounds(group.getBounds().pad(0.2));
    }
  }, [track, geofences]);

  // фокус на устройстве
  useEffect(() => {
    const map = mapRef.current;
    const position = focusId != null ? positions?.[focusId] : null;
    if (map && position) map.flyTo([position.latitude, position.longitude], 15, { duration: 0.8 });
  }, [focusId, focusSeq]);

  return <div ref={containerRef} style={{ flex: 1, minHeight: 0 }} />;
}

// Traccar WKT: CIRCLE (lat lon, r) | POLYGON ((lat lon, ...)) | LINESTRING (...)
function parseArea(area) {
  const style = { color: '#019178', weight: 2, fillOpacity: 0.08 };
  let m = area.match(/CIRCLE\s*\(\s*([\d.-]+)\s+([\d.-]+)\s*,\s*([\d.]+)\s*\)/i);
  if (m) return L.circle([+m[1], +m[2]], { radius: +m[3], ...style });
  m = area.match(/POLYGON\s*\(\(\s*(.+)\s*\)\)/i);
  if (m) {
    const points = m[1].split(',').map((pair) => pair.trim().split(/\s+/).map(Number));
    return L.polygon(points, style);
  }
  m = area.match(/LINESTRING\s*\(\s*(.+)\s*\)/i);
  if (m) {
    const points = m[1].split(',').map((pair) => pair.trim().split(/\s+/).map(Number));
    return L.polyline(points, style);
  }
  return null;
}
