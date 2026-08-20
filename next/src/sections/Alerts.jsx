import { useEffect, useState } from 'react';
import { formatTime, getEvents } from '../api';

const EVENT_KINDS = {
  deviceOverspeed: { type: 'Скорость', tagClass: 'tag tag-outline', text: () => 'превышение скорости' },
  geofenceExit: { type: 'Геозона', tagClass: 'tag tag-accent-2', text: () => 'выезд из геозоны' },
  geofenceEnter: { type: 'Геозона', tagClass: 'tag tag-accent-2', text: () => 'въезд в геозону' },
  deviceFuelDrop: { type: 'Топливо', tagClass: 'tag tag-outline', text: () => 'резкое падение уровня топлива' },
  deviceFuelIncrease: { type: 'Топливо', tagClass: 'tag tag-accent', text: () => 'заправка' },
  deviceOffline: { type: 'Связь', tagClass: 'tag tag-neutral', text: () => 'потеря связи' },
  deviceOnline: { type: 'Связь', tagClass: 'tag tag-accent', text: () => 'снова на связи' },
  deviceMoving: { type: 'Движение', tagClass: 'tag tag-accent', text: () => 'начало движения' },
  deviceStopped: { type: 'Движение', tagClass: 'tag tag-accent-2', text: () => 'остановка' },
  ignitionOn: { type: 'Зажигание', tagClass: 'tag tag-accent', text: () => 'зажигание включено' },
  ignitionOff: { type: 'Зажигание', tagClass: 'tag tag-accent-2', text: () => 'зажигание выключено' },
  alarm: { type: 'Тревога', tagClass: 'tag tag-outline', text: (e) => `тревога: ${e.attributes?.alarm ?? ''}` },
};

export default function Alerts({ allVehicles, focusOnMap }) {
  const [events, setEvents] = useState(null);

  useEffect(() => {
    const ids = allVehicles.map((v) => v.device.id);
    if (!ids.length) { setEvents([]); return; }
    const from = new Date(Date.now() - 48 * 3600 * 1000);
    getEvents(ids, from, new Date())
      .then((list) => setEvents(list.sort((a, b) => new Date(b.eventTime) - new Date(a.eventTime)).slice(0, 60)))
      .catch(() => setEvents([]));
    // события за последние 48 часов, разово при открытии
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nameById = Object.fromEntries(allVehicles.map((v) => [v.device.id, v.name]));

  if (events === null) return <div className="text-muted" style={{ padding: 20 }}>Загрузка…</div>;

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 860 }}>
      {events.length === 0 && <div className="text-muted">За последние 48 часов событий нет</div>}
      {events.map((event) => {
        const kind = EVENT_KINDS[event.type] ?? { type: event.type, tagClass: 'tag tag-neutral', text: () => '' };
        return (
          <div key={event.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 12px', border: '1px solid var(--color-divider)' }}>
            <span className={kind.tagClass} style={{ flex: 'none' }}>{kind.type}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14 }}><b>{nameById[event.deviceId] ?? `#${event.deviceId}`}</b> — {kind.text(event)}</div>
              <div className="text-muted" style={{ fontSize: 12 }}>{formatTime(event.eventTime)}</div>
            </div>
            <button className="btn btn-ghost" style={{ marginLeft: 'auto', fontSize: 12 }} onClick={() => focusOnMap(event.deviceId)}>На карте</button>
          </div>
        );
      })}
    </div>
  );
}
