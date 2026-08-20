import { useEffect, useMemo, useState } from 'react';
import LeafletMap from '../LeafletMap';
import { getRoute, getTrips, localDate, KNOTS_TO_KMH } from '../api';
import { Blueprint } from '../ui';

const timeOnly = (value) => new Date(value).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

export default function Trips({ allVehicles }) {
  const [deviceId, setDeviceId] = useState(null);
  const [date, setDate] = useState(() => localDate());
  const [trips, setTrips] = useState([]);
  const [track, setTrack] = useState(null);
  const [loading, setLoading] = useState(false);

  const selected = deviceId ?? allVehicles[0]?.device.id ?? null;

  const range = useMemo(() => {
    const from = new Date(`${date}T00:00:00`);
    const to = new Date(`${date}T23:59:59`);
    return { from, to };
  }, [date]);

  useEffect(() => {
    if (selected == null) return;
    setLoading(true);
    Promise.all([
      getTrips(selected, range.from, range.to),
      getRoute(selected, range.from, range.to),
    ])
      .then(([tripList, route]) => {
        setTrips(tripList);
        setTrack(route.length > 1 ? route : null);
      })
      .catch(() => { setTrips([]); setTrack(null); })
      .finally(() => setLoading(false));
  }, [selected, range]);

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      <div style={{ width: 320, flex: 'none', borderRight: '1px solid var(--color-divider)', overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="field">
          <label>Объект</label>
          <select className="input" value={selected ?? ''} onChange={(e) => setDeviceId(Number(e.target.value))}>
            {allVehicles.map((v) => (
              <option key={v.device.id} value={v.device.id}>{v.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Дата</label>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <h6 style={{ margin: '6px 0 0' }}>Поездки за день</h6>
        {loading && <div className="text-muted" style={{ fontSize: 13 }}>Загрузка…</div>}
        {!loading && trips.length === 0 && <div className="text-muted" style={{ fontSize: 13 }}>Поездок не найдено</div>}
        {trips.map((trip, index) => (
          <Blueprint key={index} style={{ padding: 10, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <b>{timeOnly(trip.startTime)} — {timeOnly(trip.endTime)}</b>
              <span style={{ marginLeft: 'auto' }} className="tag tag-neutral">{Math.round(trip.distance / 1000)} км</span>
            </div>
            <div className="text-muted">{trip.startAddress || '—'} → {trip.endAddress || '—'}</div>
            <div className="text-muted" style={{ fontSize: 12 }}>
              Макс. {Math.round(trip.maxSpeed * KNOTS_TO_KMH)} км/ч · {Math.round(trip.duration / 60000)} мин
            </div>
          </Blueprint>
        ))}
      </div>
      <LeafletMap track={track} />
    </div>
  );
}
