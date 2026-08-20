import { useEffect, useMemo, useRef, useState } from 'react';
import LeafletMap from '../LeafletMap';
import { getRoute, getTrips, localDate, KNOTS_TO_KMH } from '../api';
import { Icon } from '../ui';
import { Blueprint } from '../ui';

const timeOnly = (value) => new Date(value).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

export default function Trips({ allVehicles }) {
  const [deviceId, setDeviceId] = useState(null);
  const [date, setDate] = useState(() => localDate());
  const [trips, setTrips] = useState([]);
  const [track, setTrack] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null); // индекс выбранной поездки

  // воспроизведение трека: виртуальное время двигается с выбранной скоростью
  const [playing, setPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(60);
  const [playTime, setPlayTime] = useState(null); // мс epoch виртуального времени
  const playTimer = useRef(null);

  const trackStart = track?.length ? new Date(track[0].fixTime).getTime() : null;
  const trackEnd = track?.length ? new Date(track[track.length - 1].fixTime).getTime() : null;

  useEffect(() => {
    // новый трек — сбрасываем плеер
    setPlaying(false);
    setPlayTime(null);
  }, [track]);

  useEffect(() => {
    if (!playing) { clearInterval(playTimer.current); return undefined; }
    playTimer.current = setInterval(() => {
      setPlayTime((t) => {
        const next = (t ?? trackStart) + 200 * playSpeed;
        if (trackEnd != null && next >= trackEnd) { setPlaying(false); return trackEnd; }
        return next;
      });
    }, 200);
    return () => clearInterval(playTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, playSpeed, trackStart, trackEnd]);

  // позиция маркера в виртуальный момент времени (линейная интерполяция между точками)
  const playMarker = useMemo(() => {
    if (!track?.length || playTime == null) return null;
    let i = track.findIndex((p) => new Date(p.fixTime).getTime() >= playTime);
    if (i <= 0) i = playTime <= new Date(track[0].fixTime).getTime() ? 1 : track.length - 1;
    const a = track[i - 1];
    const b = track[i];
    const ta = new Date(a.fixTime).getTime();
    const tb = new Date(b.fixTime).getTime();
    const k = tb === ta ? 0 : Math.min(1, Math.max(0, (playTime - ta) / (tb - ta)));
    return {
      latitude: a.latitude + k * (b.latitude - a.latitude),
      longitude: a.longitude + k * (b.longitude - a.longitude),
      course: b.course ?? a.course ?? 0,
      speed: Math.round(((a.speed ?? 0) + k * ((b.speed ?? 0) - (a.speed ?? 0))) * KNOTS_TO_KMH),
    };
  }, [track, playTime]);

  const selected = deviceId ?? allVehicles[0]?.device.id ?? null;

  const range = useMemo(() => {
    const from = new Date(`${date}T00:00:00`);
    const to = new Date(`${date}T23:59:59`);
    return { from, to };
  }, [date]);

  useEffect(() => {
    if (selected == null) return;
    setLoading(true);
    setSelectedTrip(null);
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

  // клик по поездке — на карте только её маршрут; повторный клик — снова весь день
  const pickTrip = async (trip, index) => {
    if (selectedTrip === index) {
      setSelectedTrip(null);
      const route = await getRoute(selected, range.from, range.to).catch(() => []);
      setTrack(route.length > 1 ? route : null);
      return;
    }
    setSelectedTrip(index);
    const route = await getRoute(selected, new Date(trip.startTime), new Date(trip.endTime)).catch(() => []);
    setTrack(route.length > 1 ? route : null);
  };

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
        {selectedTrip != null && (
          <div className="text-muted" style={{ fontSize: 12 }}>
            Показан маршрут выбранной поездки — клик по ней ещё раз вернёт весь день
          </div>
        )}
        {loading && <div className="text-muted" style={{ fontSize: 13 }}>Загрузка…</div>}
        {!loading && trips.length === 0 && <div className="text-muted" style={{ fontSize: 13 }}>Поездок не найдено</div>}
        {track && track.length > 1 && (
          <div className="blueprint" style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <i className="corner tl" /><i className="corner tr" /><i className="corner bl" /><i className="corner br" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                className="btn btn-primary"
                style={{ padding: '6px 10px' }}
                onClick={() => {
                  if (!playing && (playTime == null || playTime >= trackEnd)) setPlayTime(trackStart);
                  setPlaying(!playing);
                }}
              >
                <Icon name={playing ? 'pause' : 'play'} size={14} />
              </button>
              <div className="seg" style={{ display: 'flex' }}>
                {[10, 60, 300].map((s) => (
                  <span key={s} className="seg-opt" onClick={() => setPlaySpeed(s)}
                    style={{ padding: '4px 8px', fontSize: 12, ...(playSpeed === s ? { background: 'var(--color-accent)', color: 'var(--color-bg)' } : {}) }}>
                    ×{s}
                  </span>
                ))}
              </div>
              {playMarker && (
                <span className="text-muted" style={{ marginLeft: 'auto', fontSize: 12 }}>
                  {new Date(playTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} · {playMarker.speed} км/ч
                </span>
              )}
            </div>
            <input
              type="range"
              min={trackStart}
              max={trackEnd}
              step={1000}
              value={playTime ?? trackStart}
              onChange={(e) => { setPlayTime(Number(e.target.value)); }}
              style={{ width: '100%', accentColor: 'var(--color-accent)' }}
            />
          </div>
        )}
        {trips.map((trip, index) => (
          <Blueprint
            key={index}
            onClick={() => pickTrip(trip, index)}
            style={{
              padding: 10, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4, cursor: 'pointer',
              ...(selectedTrip === index ? {
                borderColor: 'var(--color-accent)',
                background: 'color-mix(in srgb, var(--color-accent) 8%, transparent)',
              } : {}),
            }}
          >
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
      <LeafletMap track={track} playMarker={playMarker} />
    </div>
  );
}
