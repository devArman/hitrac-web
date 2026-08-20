import { useEffect, useState } from 'react';
import LeafletMap from '../LeafletMap';
import { api, getJson, updateMe } from '../api';
import { Blueprint } from '../ui';


// area для Traccar ограничена 4096 символами: 5 знаков (~1 м) и прореживание до ~190 точек
function buildPolygonArea(points) {
  const maxPoints = 190;
  const thinned = points.length > maxPoints
    ? points.filter((_, i) => i % Math.ceil(points.length / maxPoints) === 0)
    : points;
  return `POLYGON((${thinned.map((p) => `${p.latitude.toFixed(5)} ${p.longitude.toFixed(5)}`).join(', ')}))`;
}

export default function Geozones({ user, setUser }) {
  const [zones, setZones] = useState(null);
  const [drawing, setDrawing] = useState(false);
  const [points, setPoints] = useState([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState(null); // показываем на карте только выбранную зону

  const load = () => getJson('/geofences').then(setZones).catch(() => setZones([]));
  useEffect(() => { load(); }, []);

  const save = async () => {
    setBusy(true);
    try {
      const area = buildPolygonArea(points);
      await api('/geofences', { method: 'POST', body: JSON.stringify({ name: name.trim(), area }) });
      setDrawing(false);
      setPoints([]);
      setName('');
      load();
    } catch (e) {
      alert(`Не удалось сохранить: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  // критичность выхода из зоны: critical | normal (по умолчанию) | hidden
  const exitPrefs = user?.prefs?.geofenceExit ?? {};
  const setExitMode = (zoneId, mode) => {
    const next = { ...exitPrefs };
    if (mode === 'normal') delete next[zoneId]; else next[zoneId] = mode;
    updateMe({ prefs: { ...(user?.prefs ?? {}), geofenceExit: next } }).then(setUser).catch(() => {});
  };

  const remove = async (zone) => {
    if (!window.confirm(`Удалить геозону «${zone.name}»?`)) return;
    try {
      await api(`/geofences/${zone.id}`, { method: 'DELETE' });
      load();
    } catch (e) {
      alert(`Не удалось удалить: ${e.message}`);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      <div style={{ width: 360, flex: 'none', borderRight: '1px solid var(--color-divider)', overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {!drawing && (
          <button className="btn btn-primary" onClick={() => { setDrawing(true); setPoints([]); setName(''); }}>
            + Новая геозона
          </button>
        )}
        {drawing && (
          <Blueprint style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <b style={{ fontSize: 14 }}>Новая геозона</b>
            <div className="text-muted" style={{ fontSize: 12 }}>
              Кликай по карте, чтобы поставить углы зоны (минимум 3 точки). Точек: {points.length}
            </div>
            <input className="input" placeholder="Название, например «Склад»" value={name} onChange={(e) => setName(e.target.value)} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} disabled={busy || points.length < 3 || !name.trim()} onClick={save}>
                {busy ? 'Сохранение…' : 'Сохранить'}
              </button>
              <button className="btn btn-secondary" onClick={() => setPoints(points.slice(0, -1))} disabled={!points.length}>↶</button>
              <button className="btn btn-secondary" onClick={() => { setDrawing(false); setPoints([]); }}>Отмена</button>
            </div>
          </Blueprint>
        )}
        {zones === null && <div className="text-muted" style={{ fontSize: 13 }}>Загрузка…</div>}
        {zones?.length === 0 && <div className="text-muted" style={{ fontSize: 13 }}>Геозон пока нет — создай свою кнопкой выше</div>}
        {zones?.length > 0 && selectedId == null && (
          <div className="text-muted" style={{ fontSize: 12 }}>Нажми на геозону, чтобы увидеть её на карте</div>
        )}
        {zones?.map((zone) => (
          <Blueprint
            key={zone.id}
            onClick={() => setSelectedId(selectedId === zone.id ? null : zone.id)}
            style={{
              padding: 10, fontSize: 13, cursor: 'pointer',
              ...(selectedId === zone.id ? {
                borderColor: 'var(--color-accent)',
                background: 'color-mix(in srgb, var(--color-accent) 8%, transparent)',
              } : {}),
            }}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <b>{zone.name}</b>
              <span className={zone.shared ? 'tag tag-accent-2' : 'tag tag-accent'} style={{ marginLeft: 'auto' }}>
                {zone.shared ? 'общая' : 'моя'}
              </span>
              {zone.own && (
                <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={(e) => { e.stopPropagation(); remove(zone); }}>Удалить</button>
              )}
            </div>
            {zone.description && <div className="text-muted" style={{ fontSize: 12 }}>{zone.description}</div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }} onClick={(e) => e.stopPropagation()}>
              <span className="text-muted" style={{ fontSize: 11 }}>Выход:</span>
              <div className="seg" style={{ display: 'flex' }}>
                {[['critical', 'Критично'], ['normal', 'Обычно'], ['hidden', 'Скрыть']].map(([mode, label]) => {
                  const active = (exitPrefs[zone.id] ?? 'normal') === mode;
                  return (
                    <span
                      key={mode}
                      className="seg-opt"
                      onClick={() => setExitMode(zone.id, mode)}
                      style={{
                        padding: '3px 8px', fontSize: 11,
                        ...(active ? (mode === 'critical'
                          ? { background: '#c0392b', color: '#fff' }
                          : { background: 'var(--color-accent)', color: 'var(--color-bg)' }) : {}),
                      }}
                    >
                      {label}
                    </span>
                  );
                })}
              </div>
            </div>
          </Blueprint>
        ))}
      </div>
      <LeafletMap
        geofences={(zones ?? []).filter((z) => z.id === selectedId)}
        onMapClick={drawing ? (p) => setPoints((prev) => [...prev, p]) : undefined}
        drawPoints={drawing ? points : []}
      />
    </div>
  );
}
