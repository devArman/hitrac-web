import { useEffect, useMemo, useState } from 'react';
import LeafletMap from '../LeafletMap';
import {
  deviceEmoji, formatTime, fuelLevel, fuelLiters, getDeviceGroups,
  getDeviceStats, getJson, KNOTS_TO_KMH, localDate, sendCommand, timeAgo,
} from '../api';
import { ConfirmDialog, Icon, StatusDot } from '../ui';

// фильтр по связи: значение → подпись
const CONN = [
  ['all', 'Все'],
  ['online', 'На связи'],
  ['off', 'Не на связи'],
];

const kmLabel = (meters) => (meters >= 10000
  ? Math.round(meters / 1000)
  : Math.round(meters / 100) / 10);

const PERIODS = [
  ['today', 'Сегодня'],
  ['week', 'Неделя'],
  ['month', 'Месяц'],
  ['custom', 'Период'],
];

export default function MapView({ vehicles, devices, positions, focus, openTrips }) {
  const [localFocus, setLocalFocus] = useState(focus);
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState('all');
  const [conn, setConn] = useState('all');
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [stats, setStats] = useState({}); // deviceId -> {distanceMeters, maxSpeedKnots, overspeedCount}

  useEffect(() => { getDeviceGroups().then(setGroups).catch(() => {}); }, []);

  // суточная статистика: при открытии и раз в 3 минуты
  useEffect(() => {
    const load = () => getDeviceStats()
      .then((rows) => setStats(Object.fromEntries(rows.map((r) => [r.deviceId, r]))))
      .catch(() => {});
    load();
    const timer = setInterval(() => { if (document.visibilityState !== 'hidden') load(); }, 180000);
    return () => clearInterval(timer);
  }, []);

  const currentFocus = localFocus.seq >= focus.seq ? localFocus : focus;

  // сначала группа — от неё считаются счётчики в чипах связи
  const groupSet = useMemo(() => {
    const g = groups.find((x) => x.id === groupId);
    return g ? new Set(g.deviceIds) : null;
  }, [groups, groupId]);

  const inGroup = useMemo(() => {
    const query = q.trim().toLowerCase();
    return vehicles.filter((v) => {
      if (groupSet && !groupSet.has(v.device.id)) return false;
      if (!query) return true;
      return [v.name, v.plate, v.device.uniqueId, v.device.phone]
        .some((s) => s && String(s).toLowerCase().includes(query));
    });
  }, [vehicles, groupSet, q]);

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

  const selected = selectedId != null ? vehicles.find((v) => v.device.id === selectedId) : null;

  const pick = (v) => {
    setSelectedId(v.device.id);
    setLocalFocus((f) => ({ id: v.device.id, seq: Math.max(f.seq, focus.seq) + 1 }));
  };

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      <div style={{ width: 324, flex: 'none', borderRight: '1px solid var(--color-divider)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* поиск + фильтры */}
        <div style={{ padding: '12px 12px 10px', borderBottom: '1px solid var(--color-divider)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <Icon name="search" size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.45 }} />
            <input
              className="input"
              placeholder="Имя, номер, IMEI, SIM…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ borderRadius: 999, minHeight: 34, paddingLeft: 32, fontSize: 13 }}
            />
          </div>
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
            const stat = stats[v.device.id];
            const maxKmh = stat && Math.round(stat.maxSpeedKnots * KNOTS_TO_KMH);
            return (
              <div
                key={v.device.id}
                className={`veh-card${selectedId === v.device.id ? ' veh-card-active' : ''}`}
                onClick={() => pick(v)}
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
                {stat && (
                  <div className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }} title="Пробег сегодня">
                      <Icon name="route" size={12} />{kmLabel(stat.distanceMeters)} км
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }} title="Макс. скорость сегодня">
                      <Icon name="gauge" size={12} />макс {maxKmh} км/ч
                    </span>
                    {stat.overspeedCount > 0 && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#c0392b', marginLeft: 'auto' }} title="Превышений лимита скорости сегодня">
                        <Icon name="triangle-alert" size={12} />{stat.overspeedCount}
                      </span>
                    )}
                  </div>
                )}
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
      {/* карта + нижняя панель деталей */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', minWidth: 0 }}>
        <LeafletMap devices={mapDevices} positions={mapPositions} focusId={currentFocus.id} focusSeq={currentFocus.seq} />
        {selected && (
          <DetailPanel
            v={selected}
            stat={stats[selected.device.id]}
            onClose={() => setSelectedId(null)}
            openTrips={openTrips}
          />
        )}
      </div>
    </div>
  );
}

// нижняя панель: подробности выбранного объекта поверх карты
function DetailPanel({ v, stat, onClose, openTrips }) {
  const p = v.position;
  const a = p?.attributes ?? {};
  const fuel = fuelLevel(p);
  const liters = fuelLiters(p);
  const volts = (x) => `${Math.round(x * 10) / 10} В`;
  const yesNo = (x) => (x ? 'Вкл' : 'Выкл');

  // статистика за выбранный период; «Сегодня» — из общего списка (живая)
  const [period, setPeriod] = useState('today');
  const [customFrom, setCustomFrom] = useState(() => localDate());
  const [customTo, setCustomTo] = useState(() => localDate());
  const [fetched, setFetched] = useState(null);
  const [loadingStat, setLoadingStat] = useState(false);

  const range = useMemo(() => {
    if (period === 'week') return { from: new Date(Date.now() - 7 * 864e5) };
    if (period === 'month') return { from: new Date(Date.now() - 30 * 864e5) };
    if (period === 'custom') {
      const from = new Date(`${customFrom}T00:00:00`);
      const to = new Date(`${customTo}T23:59:59`);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return null;
      return { from, to };
    }
    return null; // today — данные из props
  }, [period, customFrom, customTo]);

  useEffect(() => {
    if (period === 'today' || !range) { setFetched(null); return undefined; }
    let alive = true;
    setLoadingStat(true);
    getDeviceStats({ deviceId: v.device.id, from: range.from, to: range.to })
      .then((rows) => {
        if (alive) setFetched(rows[0] ?? { distanceMeters: 0, maxSpeedKnots: 0, overspeedCount: 0 });
      })
      .catch(() => { if (alive) setFetched(null); })
      .finally(() => { if (alive) setLoadingStat(false); });
    return () => { alive = false; };
  }, [v.device.id, period, range]);

  const shownStat = period === 'today' ? stat : fetched;

  // блокировка двигателя — та же логика, что в разделе «Двигатель»
  const blocked = Boolean(a.blocked);
  const [enginePending, setEnginePending] = useState(null); // { block }
  const [engineBusy, setEngineBusy] = useState(false);

  const askEngine = async () => {
    try {
      const types = await getJson(`/commands/types?deviceId=${v.device.id}&textChannel=false`);
      if (!types.some((t) => t.type === 'engineStop')) {
        alert('Этот трекер не поддерживает удалённую блокировку двигателя');
        return;
      }
    } catch { /* спросим всё равно — проверит бэкенд */ }
    setEnginePending({ block: !blocked });
  };

  const runEngine = async () => {
    const { block } = enginePending;
    setEnginePending(null);
    setEngineBusy(true);
    try {
      await sendCommand(v.device.id, block ? 'engineStop' : 'engineResume');
      alert(block
        ? 'Команда блокировки отправлена. Двигатель заглохнет после остановки автомобиля.'
        : 'Команда разблокировки отправлена.');
    } catch (error) {
      alert(`Не удалось отправить команду: ${error.message}`);
    } finally {
      setEngineBusy(false);
    }
  };

  const rows = [
    ['Гос. номер', v.plate],
    ['Модель', v.device.model],
    ['IMEI', v.device.uniqueId],
    ['SIM', v.device.phone],
    ['Водитель', v.device.attributes?.driver ?? v.device.contact],
    p && ['Координаты', `${p.latitude.toFixed(5)}, ${p.longitude.toFixed(5)}`],
    p?.altitude != null && ['Высота', `${Math.round(p.altitude)} м`],
    a.sat != null && ['Спутники', a.sat],
    a.rssi != null && ['GSM', a.rssi],
    a.ignition != null && ['Зажигание', yesNo(a.ignition)],
    a.motion != null && ['Движение', yesNo(a.motion)],
    a.power != null && ['Питание', volts(a.power)],
    a.battery != null && ['Батарея', volts(a.battery)],
    fuel != null && ['Топливо', `${fuel}%${liters != null ? ` · ${liters} л` : ''}`],
    ['Обновлено', p?.deviceTime || v.device.lastUpdate
      ? `${formatTime(p?.deviceTime ?? v.device.lastUpdate)} (${timeAgo(p?.deviceTime ?? v.device.lastUpdate)})`
      : null],
  ].filter((r) => r && r[1] != null && r[1] !== '');

  return (
    <div
      style={{
        position: 'absolute', left: 12, right: 12, bottom: 12, zIndex: 1100,
        background: 'var(--color-surface)', border: '1px solid var(--color-divider)',
        borderRadius: 16, boxShadow: 'var(--shadow-lg)',
        maxHeight: '46%', overflow: 'auto',
        padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <StatusDot color={v.dotColor} size={9} />
        <b style={{ fontSize: 16 }}>{deviceEmoji(v.device) ? `${deviceEmoji(v.device)} ` : ''}{v.name}</b>
        <span className={v.tagClass}>{v.stLabel}</span>
        {v.st === 'move' && <span style={{ fontWeight: 600, fontSize: 13 }}>{v.speedLabel}</span>}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className="btn btn-secondary"
            style={{ fontSize: 12, padding: '4px 12px', borderRadius: 999 }}
            onClick={() => openTrips(v.device.id)}
          >
            <Icon name="route" size={13} />Поездки
          </button>
          <button
            className="btn btn-secondary"
            style={{
              fontSize: 12, padding: '4px 12px', borderRadius: 999,
              color: blocked ? 'var(--color-accent)' : '#c0392b',
              borderColor: 'currentColor',
            }}
            disabled={engineBusy || v.st === 'off'}
            title={v.st === 'off' ? 'Трекер не на связи' : undefined}
            onClick={askEngine}
          >
            <Icon name="power" size={13} />
            {engineBusy ? 'Отправка…' : blocked ? 'Разблокировать' : 'Блокировка'}
          </button>
          <span
            onClick={onClose}
            style={{ cursor: 'pointer', opacity: 0.6, display: 'inline-flex', padding: 4 }}
            title="Закрыть"
          >
            <Icon name="x" size={16} />
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {PERIODS.map(([id, label]) => (
          <span key={id} className={`chip${period === id ? ' chip-active' : ''}`} onClick={() => setPeriod(id)}>
            {label}
          </span>
        ))}
        {period === 'custom' && (
          <>
            <input type="date" className="input" value={customFrom} max={customTo}
              onChange={(e) => setCustomFrom(e.target.value)}
              style={{ width: 140, minHeight: 30, borderRadius: 999, fontSize: 12, padding: '2px 12px' }} />
            <span className="text-muted" style={{ fontSize: 12 }}>—</span>
            <input type="date" className="input" value={customTo} min={customFrom} max={localDate()}
              onChange={(e) => setCustomTo(e.target.value)}
              style={{ width: 140, minHeight: 30, borderRadius: 999, fontSize: 12, padding: '2px 12px' }} />
          </>
        )}
        {loadingStat && <span className="text-muted" style={{ fontSize: 12 }}>Загрузка…</span>}
      </div>
      {shownStat && !loadingStat && (
        <div style={{ display: 'flex', gap: 16, fontSize: 13, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Icon name="route" size={13} style={{ color: 'var(--color-accent)' }} />
            Пробег: <b>{kmLabel(shownStat.distanceMeters)} км</b>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Icon name="gauge" size={13} style={{ color: 'var(--color-accent-2)' }} />
            Макс. скорость: <b>{Math.round(shownStat.maxSpeedKnots * KNOTS_TO_KMH)} км/ч</b>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: shownStat.overspeedCount > 0 ? '#c0392b' : 'inherit' }}>
            <Icon name="triangle-alert" size={13} />
            Превышений: <b>{shownStat.overspeedCount}</b>
          </span>
        </div>
      )}
      {p?.address && (
        <div className="text-muted" style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="map-pin" size={12} style={{ flex: 'none' }} />{p.address}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
        {rows.map(([label, value]) => (
          <div key={label} style={{ background: 'var(--color-neutral-100)', borderRadius: 10, padding: '7px 10px', minWidth: 0 }}>
            <div className="text-muted" style={{ fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase' }}>{label}</div>
            <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={String(value)}>{value}</div>
          </div>
        ))}
      </div>
      {enginePending && (
        <ConfirmDialog
          title={enginePending.block ? 'Заблокировать двигатель?' : 'Разблокировать двигатель?'}
          body={enginePending.block
            ? `${v.name} (${v.plate}): трекер получит команду блокировки. Двигатель заглохнет, когда автомобиль остановится.`
            : `${v.name} (${v.plate}): двигатель снова можно будет завести.`}
          confirmLabel={enginePending.block ? 'Заблокировать' : 'Разблокировать'}
          danger={enginePending.block}
          onConfirm={runEngine}
          onCancel={() => setEnginePending(null)}
        />
      )}
    </div>
  );
}
