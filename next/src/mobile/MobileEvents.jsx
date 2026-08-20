import { useEffect, useState } from 'react';
import { alarmName, getEvents, getJson, overspeedText } from '../api';

const KINDS = {
  deviceOverspeed: ['Скорость', '#e8a13c', (e) => overspeedText(e)],
  geofenceExit: ['Геозона', '#3aa4e4', (e, zones) => `выезд из геозоны${zones?.[e.geofenceId] ? ` «${zones[e.geofenceId]}»` : ''}`],
  geofenceEnter: ['Геозона', '#3aa4e4', (e, zones) => `въезд в геозону${zones?.[e.geofenceId] ? ` «${zones[e.geofenceId]}»` : ''}`],
  deviceFuelDrop: ['Топливо', '#e8a13c', () => 'резкое падение уровня топлива'],
  deviceFuelIncrease: ['Топливо', '#17bd9c', () => 'заправка'],
  deviceOffline: ['Связь', '#8a9699', () => 'потеря связи'],
  deviceOnline: ['Связь', '#17bd9c', () => 'снова на связи'],
  deviceMoving: ['Движение', '#17bd9c', () => 'начало движения'],
  deviceStopped: ['Движение', '#3aa4e4', () => 'остановка'],
  ignitionOn: ['Зажигание', '#17bd9c', () => 'зажигание включено'],
  ignitionOff: ['Зажигание', '#3aa4e4', () => 'зажигание выключено'],
  alarm: ['Тревога', '#e8a13c', (e) => `тревога: ${alarmName(e.attributes?.alarm)}`],
};

function timeLabel(value) {
  const date = new Date(value);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (date >= today) return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (date >= new Date(today.getTime() - 86400000)) return 'Вчера';
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

export default function MobileEvents({ vehicles, user }) {
  const [events, setEvents] = useState(null);
  const [zoneNames, setZoneNames] = useState(null);

  // имена геозон для текста событий «въезд/выезд»
  useEffect(() => {
    getJson('/geofences')
      .then((zones) => setZoneNames(Object.fromEntries(zones.map((z) => [z.id, z.name]))))
      .catch(() => setZoneNames({}));
  }, []);

  useEffect(() => {
    const ids = vehicles.map((v) => v.device.id);
    if (!ids.length) { setEvents([]); return; }
    getEvents(ids, new Date(Date.now() - 48 * 3600 * 1000), new Date())
      .then((list) => setEvents(list.sort((a, b) => new Date(b.eventTime) - new Date(a.eventTime)).slice(0, 60)))
      .catch(() => setEvents([]));
    // события за 48 часов; повтор, когда приехал список машин
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles.length > 0]);

  const nameById = Object.fromEntries(vehicles.map((v) => [v.device.id, v.name]));

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 'calc(8px + env(safe-area-inset-top)) 12px 8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {events === null && <div className="text-muted" style={{ padding: 12, fontSize: 13 }}>Загрузка…</div>}
      {events?.length === 0 && <div className="text-muted" style={{ padding: 12, fontSize: 13 }}>За последние 48 часов событий нет</div>}
      {events?.filter((e) => !(e.type === 'geofenceExit' && user?.prefs?.geofenceExit?.[e.geofenceId] === 'hidden')).map((event) => {
        const [type, color, text] = KINDS[event.type] ?? [event.type, '#8a9699', () => ''];
        const zoneCritical = event.type === 'geofenceExit' && user?.prefs?.geofenceExit?.[event.geofenceId] === 'critical';
        return (
          <div key={event.id} style={{ border: zoneCritical ? '1px solid #c0392b' : '1px solid var(--color-divider)', background: zoneCritical ? 'color-mix(in srgb, #c0392b 6%, transparent)' : 'transparent', borderRadius: 10, padding: '11px 12px', display: 'flex', flexDirection: 'column', gap: 4, minHeight: 44 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', padding: '2px 8px', border: `1px solid ${color}`, color }}>{type}</span>
              <span className="text-muted" style={{ marginLeft: 'auto', fontSize: 11 }}>{timeLabel(event.eventTime)}</span>
            </div>
            <div style={{ fontSize: 13.5 }}><b>{nameById[event.deviceId] ?? `#${event.deviceId}`}</b> — {text(event, zoneNames)}</div>
          </div>
        );
      })}
    </div>
  );
}
