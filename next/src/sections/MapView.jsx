import { useEffect, useMemo, useState } from 'react';
import LeafletMap from '../LeafletMap';
import { deviceEmoji, fuelLevel, fuelLiters, getDeviceGroups, timeAgo } from '../api';
import { Icon, StatusDot } from '../ui';

// фильтр по связи: значение → предикат
const CONN = [
  ['all', 'Все'],
  ['online', 'На связи'],
  ['off', 'Не на связи'],
];

export default function MapView({ vehicles, devices, positions, focus }) {
  const [localFocus, setLocalFocus] = useState(focus);
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState('all');
  const [conn, setConn] = useState('all');

  useEffect(() => { getDeviceGroups().then(setGroups).catch(() => {}); }, []);

  const currentFocus = localFocus.seq >= focus.seq ? localFocus : focus;

  // сначала группа — от неё считаются счётчики в чипах связи
  const groupSet = useMemo(() => {
    const g = groups.find((x) => x.id === groupId);
    return g ? new Set(g.deviceIds) : null;
  }, [groups, groupId]);

  const inGroup = useMemo(
    () => (groupSet ? vehicles.filter((v) => groupSet.has(v.device.id)) : vehicles),
    [vehicles, groupSet],
  );
  const counts = useMemo(() => ({
    all: inGroup.length,
    online: inGroup.filter((v) => v.st !== 'off').length,
    off: inGroup.filter((v) => v.st === 'off').length,
  }), [inGroup]);

  const filtered = useMemo(() => inGroup.filter((v) => {
    if (conn === 'online') return v.st !== 'off';
    if (conn === 'off') return v.st === 'off';
    return true;
  }), [inGroup, conn]);

  // фильтр действует и на маркеры карты
  const [mapDevices, mapPositions] = useMemo(() => {
    const ids = new Set(filtered.map((v) => v.device.id));
    return [
      Object.fromEntries(Object.entries(devices).filter(([id]) => ids.has(Number(id)))),
      Object.fromEntries(Object.entries(positions).filter(([id]) => ids.has(Number(id)))),
    ];
  }, [filtered, devices, positions]);

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      <div style={{ width: 324, flex: 'none', borderRight: '1px solid var(--color-divider)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* фильтры */}
        <div style={{ padding: '12px 12px 10px', borderBottom: '1px solid var(--color-divider)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="chip-row">
            {CONN.map(([id, label]) => (
              <span key={id} className={`chip${conn === id ? ' chip-active' : ''}`} onClick={() => setConn(id)}>
                {label} <span className="count">{counts[id]}</span>
              </span>
            ))}
          </div>
          {groups.length > 0 && (
            <div className="chip-row">
              <span className={`chip${groupId === 'all' ? ' chip-active' : ''}`} onClick={() => setGroupId('all')}>
                Все группы
              </span>
              {groups.map((g) => (
                <span key={g.id} className={`chip${groupId === g.id ? ' chip-active' : ''}`} onClick={() => setGroupId(groupId === g.id ? 'all' : g.id)}>
                  {g.name} <span className="count">{g.deviceIds.length}</span>
                </span>
              ))}
            </div>
          )}
        </div>
        {/* список */}
        <div style={{ flex: 1, overflow: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((v) => {
            const fuel = fuelLevel(v.position);
            const liters = fuelLiters(v.position);
            const updated = timeAgo(v.position?.deviceTime ?? v.device.lastUpdate);
            const address = v.position?.address;
            return (
              <div
                key={v.device.id}
                className={`veh-card${currentFocus.id === v.device.id ? ' veh-card-active' : ''}`}
                onClick={() => setLocalFocus((f) => ({ id: v.device.id, seq: Math.max(f.seq, focus.seq) + 1 }))}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <StatusDot color={v.dotColor} />
                  <b style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {deviceEmoji(v.device) ? `${deviceEmoji(v.device)} ` : ''}{v.name}
                  </b>
                  <span className="text-muted" style={{ marginLeft: 'auto', fontSize: 12, flex: 'none' }}>{v.plate}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
                  <span className={v.tagClass}>{v.stLabel}</span>
                  {v.st === 'move' && <span style={{ fontWeight: 600 }}>{v.speedLabel}</span>}
                  {updated && (
                    <span className="text-muted" style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, flex: 'none' }}>
                      <Icon name="clock" size={11} />{updated}
                    </span>
                  )}
                </div>
                {fuel != null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <Icon name="fuel" size={12} style={{ color: 'var(--color-accent)' }} />
                    <div style={{ flex: 1, height: 5, borderRadius: 999, overflow: 'hidden', background: 'var(--color-neutral-200)' }}>
                      <div style={{ height: '100%', borderRadius: 999, background: 'var(--color-accent)', width: `${Math.min(fuel, 100)}%` }} />
                    </div>
                    <span className="text-muted" style={{ flex: 'none' }}>{fuel}%{liters != null && ` · ${liters} л`}</span>
                  </div>
                )}
                {address && (
                  <div className="text-muted" style={{ fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Icon name="map-pin" size={11} style={{ flex: 'none' }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{address}</span>
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && <div className="text-muted" style={{ fontSize: 13, padding: 8 }}>Нет объектов по выбранным фильтрам</div>}
        </div>
      </div>
      <LeafletMap devices={mapDevices} positions={mapPositions} focusId={currentFocus.id} focusSeq={currentFocus.seq} />
    </div>
  );
}
