import { useEffect, useMemo, useState } from 'react';
import LeafletMap from '../LeafletMap';
import { fuelLevel, getRoute, getSummary, startOfDay } from '../api';
import { Icon } from '../ui';
import { AnnouncementsBell } from '../Announcements';

export default function MobileMap({ user, vehicles, devices, positions, openDetail, trackFor, clearTrack, openAnnouncements }) {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [focus, setFocus] = useState({ id: null, seq: 0 });
  const [track, setTrack] = useState(null);
  const [kmToday, setKmToday] = useState({});

  useEffect(() => {
    const ids = vehicles.map((v) => v.device.id);
    if (!ids.length) return;
    getSummary(ids, startOfDay(), new Date())
      .then((rows) => setKmToday(Object.fromEntries(rows.map((r) => [r.deviceId, Math.round((r.distance ?? 0) / 1000)]))))
      .catch(() => {});
    // пробег за сегодня; повтор, когда приехал список машин
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles.length > 0]);

  // «построить трек» из карточки объекта
  useEffect(() => {
    if (trackFor == null) return;
    setSelected(trackFor);
    getRoute(trackFor, startOfDay(), new Date())
      .then((route) => setTrack(route.length > 1 ? route : null))
      .catch(() => setTrack(null));
  }, [trackFor]);

  const pick = (id) => {
    setSelected(id);
    setTrack(null);
    clearTrack();
    setSearch('');
    setFocus((f) => ({ id, seq: f.seq + 1 }));
  };

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return vehicles.filter((v) => v.name.toLowerCase().includes(q) || String(v.plate).toLowerCase().includes(q)).slice(0, 6);
  }, [search, vehicles]);

  const vehicle = vehicles.find((v) => v.device.id === selected);
  const fuel = vehicle ? fuelLevel(vehicle.position) : null;
  const initials = (user.name || user.email).split(/[\s@]+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('');

  const dayTrack = async () => {
    if (!vehicle) return;
    if (track) { setTrack(null); return; }
    try {
      const route = await getRoute(vehicle.device.id, startOfDay(), new Date());
      setTrack(route.length > 1 ? route : null);
    } catch { setTrack(null); }
  };

  return (
    <div style={{ position: 'relative', flex: 1, display: 'flex', minHeight: 0 }}>
      <LeafletMap devices={devices} positions={positions} track={track} focusId={focus.id} focusSeq={focus.seq} onMarkerClick={pick} />
      <div style={{ position: 'absolute', top: 'calc(10px + env(safe-area-inset-top))', left: 12, right: 12, display: 'flex', gap: 8, zIndex: 1000 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            className="input"
            placeholder="Поиск объекта…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ background: 'color-mix(in srgb, var(--color-bg) 92%, transparent)', minHeight: 42 }}
          />
          {matches.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderTop: 0, borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>
              {matches.map((v) => (
                <div key={v.device.id} onClick={() => pick(v.device.id)} style={{ padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, borderTop: '1px solid var(--color-divider)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: v.dotColor }} />
                  <b>{v.name}</b>
                  <span className="text-muted" style={{ marginLeft: 'auto', fontSize: 12 }}>{v.plate}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <span style={{ width: 42, height: 42, flex: 'none', display: 'grid', placeItems: 'center', borderRadius: 10, background: 'color-mix(in srgb, var(--color-bg) 92%, transparent)', border: '1px solid var(--color-divider)' }}>
          <AnnouncementsBell onClick={openAnnouncements} size={18} />
        </span>
        <span style={{ width: 42, height: 42, flex: 'none', display: 'grid', placeItems: 'center', borderRadius: 10, background: 'var(--grad-brand)', color: '#fff', fontFamily: 'var(--font-heading)' }}>
          {initials}
        </span>
      </div>
      {vehicle && (
        <div style={{
          position: 'absolute', left: 12, right: 12, bottom: 14, zIndex: 1000,
          background: 'color-mix(in srgb, var(--color-bg) 96%, transparent)',
          border: '1px solid var(--color-divider)', borderRadius: 12, padding: 12,
          display: 'flex', flexDirection: 'column', gap: 8, boxShadow: 'var(--shadow-lg)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => openDetail(vehicle.device.id)}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: vehicle.dotColor }} />
            <b style={{ fontSize: 15 }}>{vehicle.name}</b>
            <span className="text-muted" style={{ marginLeft: 'auto', fontSize: 12 }}>{vehicle.plate}</span>
          </div>
          <div className="text-muted" style={{ display: 'flex', gap: 14, fontSize: 12 }}>
            <span>{vehicle.stLine}</span>
            {fuel != null && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="fuel" size={12} />{fuel}%</span>}
            {kmToday[vehicle.device.id] != null && <span>{kmToday[vehicle.device.id]} км сегодня</span>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={track ? 'btn btn-secondary' : 'btn btn-primary'} style={{ flex: 1, letterSpacing: '.04em' }} onClick={dayTrack}>
              {track ? 'СКРЫТЬ ТРЕК' : 'ТРЕК ЗА ДЕНЬ'}
            </button>
            <button className="btn btn-secondary" style={{ flex: 1, letterSpacing: '.04em' }} onClick={() => openDetail(vehicle.device.id)}>
              КАРТОЧКА
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
