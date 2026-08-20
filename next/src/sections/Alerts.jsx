import { useEffect, useMemo, useState } from 'react';
import { formatTime, getAlerts, getEvents, getJson, localDate } from '../api';

const EVENT_KINDS = {
  deviceOverspeed: { type: 'Скорость', tagClass: 'tag tag-outline', text: () => 'превышение скорости' },
  geofenceExit: { type: 'Геозона', tagClass: 'tag tag-accent-2', text: (e, zones) => `выезд из геозоны${zones?.[e.geofenceId] ? ` «${zones[e.geofenceId]}»` : ''}` },
  geofenceEnter: { type: 'Геозона', tagClass: 'tag tag-accent-2', text: (e, zones) => `въезд в геозону${zones?.[e.geofenceId] ? ` «${zones[e.geofenceId]}»` : ''}` },
  deviceFuelDrop: { type: 'Топливо', tagClass: 'tag tag-outline', text: () => 'резкое падение уровня топлива' },
  deviceFuelIncrease: { type: 'Топливо', tagClass: 'tag tag-accent', text: () => 'заправка' },
  deviceOffline: { type: 'Связь', tagClass: 'tag tag-neutral', text: () => 'потеря связи' },
  deviceOnline: { type: 'Связь', tagClass: 'tag tag-accent', text: () => 'снова на связи' },
  deviceMoving: { type: 'Движение', tagClass: 'tag tag-accent', text: () => 'начало движения' },
  deviceStopped: { type: 'Движение', tagClass: 'tag tag-accent-2', text: () => 'остановка' },
  ignitionOn: { type: 'Зажигание', tagClass: 'tag tag-accent', text: () => 'зажигание включено' },
  ignitionOff: { type: 'Зажигание', tagClass: 'tag tag-accent-2', text: () => 'зажигание выключено' },
  alarm: { type: 'Тревога', tagClass: 'tag tag-outline', text: (e) => `тревога: ${e.attributes?.alarm ?? ''}` },
  fuelLow: { type: 'Топливо', tagClass: 'tag tag-outline', text: (e) => e.message },
  towing: { type: 'Эвакуатор', tagClass: 'tag tag-outline', text: (e) => e.message },
};

const KIND_OPTIONS = [...new Set(Object.values(EVENT_KINDS).map((k) => k.type))];

export default function Alerts({ allVehicles, focusOnMap }) {
  const [events, setEvents] = useState(null);
  const [deviceId, setDeviceId] = useState('');
  const [kind, setKind] = useState('');
  const [from, setFrom] = useState(() => localDate(new Date(Date.now() - 2 * 86400000)));
  const [to, setTo] = useState(() => localDate());
  const [zoneNames, setZoneNames] = useState(null);

  // имена геозон для текста событий «въезд/выезд»
  useEffect(() => {
    getJson('/geofences')
      .then((zones) => setZoneNames(Object.fromEntries(zones.map((z) => [z.id, z.name]))))
      .catch(() => setZoneNames({}));
  }, []);

  useEffect(() => {
    const ids = deviceId ? [Number(deviceId)] : allVehicles.map((v) => v.device.id);
    if (!ids.length) { setEvents([]); return; }
    setEvents(null);
    const fromDate = new Date(`${from}T00:00:00`);
    const toDate = new Date(`${to}T23:59:59`);
    Promise.all([
      getEvents(ids, fromDate, toDate).catch(() => []),
      getAlerts(`?from=${fromDate.toISOString()}&to=${toDate.toISOString()}${deviceId ? `&deviceId=${deviceId}` : ''}`).catch(() => []),
    ]).then(([eventList, alertList]) => {
      const ours = alertList.map((a) => ({
        id: `ht-${a.id}`,
        deviceId: a.deviceId,
        type: a.type,
        eventTime: a.createdAt,
        message: a.message,
      }));
      setEvents([...eventList, ...ours]
        .sort((a, b) => new Date(b.eventTime) - new Date(a.eventTime))
        .slice(0, 200));
    });
    // повтор при смене фильтров и когда приехал список машин (прямой заход по URL)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allVehicles.length > 0, deviceId, from, to]);

  const nameById = Object.fromEntries(allVehicles.map((v) => [v.device.id, v.name]));

  const filtered = useMemo(() => {
    if (!events) return null;
    if (!kind) return events;
    return events.filter((e) => (EVENT_KINDS[e.type]?.type ?? e.type) === kind);
  }, [events, kind]);

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 900 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="field" style={{ width: 190 }}>
          <label>Объект</label>
          <select className="input" value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
            <option value="">Все объекты</option>
            {allVehicles.map((v) => <option key={v.device.id} value={v.device.id}>{v.name}</option>)}
          </select>
        </div>
        <div className="field" style={{ width: 170 }}>
          <label>Событие</label>
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">Все события</option>
            {KIND_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div className="field" style={{ width: 160 }}>
          <label>С</label>
          <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="field" style={{ width: 160 }}>
          <label>По</label>
          <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>
      {filtered === null && <div className="text-muted">Загрузка…</div>}
      {filtered?.length === 0 && <div className="text-muted">Событий за выбранный период нет</div>}
      {filtered?.map((event) => {
        const k = EVENT_KINDS[event.type] ?? { type: event.type, tagClass: 'tag tag-neutral', text: () => '' };
        return (
          <div key={event.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 12px', border: '1px solid var(--color-divider)', borderRadius: 10 }}>
            <span className={k.tagClass} style={{ flex: 'none' }}>{k.type}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14 }}><b>{nameById[event.deviceId] ?? `#${event.deviceId}`}</b> — {k.text(event, zoneNames)}</div>
              <div className="text-muted" style={{ fontSize: 12 }}>{formatTime(event.eventTime)}</div>
            </div>
            <button className="btn btn-ghost" style={{ marginLeft: 'auto', fontSize: 12 }} onClick={() => focusOnMap(event.deviceId)}>На карте</button>
          </div>
        );
      })}
    </div>
  );
}
