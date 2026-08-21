import { useEffect, useMemo, useState } from 'react';
import LeafletMap from '../LeafletMap';
import {
  deviceEmoji, formatTime, fuelLevel, fuelLiters, getDeviceGroups,
  getDeviceStats, getJson, getRoute, getTrips, KNOTS_TO_KMH, localDate,
  sendCommand, startOfDay, timeAgo,
} from '../api';
import GroupDialog from './GroupDialog';
import { ConfirmDialog, Icon, StatusDot } from '../ui';

// фильтр по связи: значение → подпись
const CONN = [
  ['all', 'Все'],
  ['online', 'Online'],
  ['off', 'Offline'],
];

const tripTime = (value) => new Date(value).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

const kmLabel = (meters) => (meters >= 10000
  ? Math.round(meters / 1000)
  : Math.round(meters / 100) / 10);

const PERIODS = [
  ['today', 'Сегодня'],
  ['week', 'Неделя'],
  ['month', 'Месяц'],
  ['custom', 'Период'],
];

export default function MapView({ vehicles, devices, positions, focus, mapGroupPreset }) {
  const [localFocus, setLocalFocus] = useState(focus);
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState('all');
  const [conn, setConn] = useState('all');
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [stats, setStats] = useState({}); // deviceId -> {distanceMeters, maxSpeedKnots, overspeedCount}

  // поездки и маршрут выбранного объекта — показываем прямо на этой карте
  const [trips, setTrips] = useState(null); // { rows, loading, error }
  const [track, setTrack] = useState(null);
  const [activeTrip, setActiveTrip] = useState(null);

  const clearTrips = () => { setTrips(null); setTrack(null); setActiveTrip(null); };


  const [groupDialog, setGroupDialog] = useState(null); // { group: null|{} }

  const reloadGroups = () => getDeviceGroups().then(setGroups).catch(() => {});
  useEffect(() => { reloadGroups(); }, []);

  // пришли из раздела «Группы» — сразу включаем этот фильтр
  useEffect(() => {
    if (mapGroupPreset?.groupId != null) setGroupId(mapGroupPreset.groupId);
  }, [mapGroupPreset]);

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
      return v.name.toLowerCase().includes(query);
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

  // фильтр действует и на маркеры карты; при показе маршрута на карте
  // остаётся только выбранная машина
  const [mapDevices, mapPositions] = useMemo(() => {
    const ids = track && selectedId != null
      ? new Set([selectedId])
      : new Set(filtered.map((v) => v.device.id));
    return [
      Object.fromEntries(Object.entries(devices).filter(([id]) => ids.has(Number(id)))),
      Object.fromEntries(Object.entries(positions).filter(([id]) => ids.has(Number(id)))),
    ];
  }, [filtered, devices, positions, track, selectedId]);

  const selected = selectedId != null ? vehicles.find((v) => v.device.id === selectedId) : null;

  const pick = (v) => {
    if (v.device.id !== selectedId) clearTrips();
    setSelectedId(v.device.id);
    setLocalFocus((f) => ({ id: v.device.id, seq: Math.max(f.seq, focus.seq) + 1 }));
  };

  const loadTrips = async (deviceId, range) => {
    setTrack(null);
    setActiveTrip(null);
    setTrips({ rows: [], loading: true });
    try {
      const rows = await getTrips(deviceId, range.from, range.to);
      // короче 100 м — не поездка, а дрейф GPS на стоянке
      setTrips({ rows: rows.filter((t) => (t.distance ?? 0) >= 100), loading: false });
    } catch (error) {
      setTrips({ rows: [], loading: false, error: error.message });
    }
  };

  const showTripTrack = async (trip, index) => {
    if (activeTrip === index) { setTrack(null); setActiveTrip(null); return; }
    setActiveTrip(index);
    try {
      setTrack(await getRoute(trip.deviceId, new Date(trip.startTime), new Date(trip.endTime)));
    } catch {
      setTrack(null);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      <div style={{ width: 420, flex: 'none', borderRight: '1px solid var(--color-divider)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* поиск + фильтры */}
        <div style={{ padding: '12px 12px 10px', borderBottom: '1px solid var(--color-divider)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <Icon name="search" size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.45 }} />
            <input
              className="input"
              placeholder="Поиск по названию…"
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
          <div className="chip-row">
            {groups.length > 0 && (
              <span className={`chip${groupId === 'all' ? ' chip-active' : ''}`} onClick={() => setGroupId('all')}>
                Все группы
              </span>
            )}
            {groups.map((g) => (
              <span key={g.id} className={`chip${groupId === g.id ? ' chip-active' : ''}`} onClick={() => setGroupId(groupId === g.id ? 'all' : g.id)}>
                {g.name} <span className="count">{g.deviceIds.length}</span>
                {g.own && (
                  <span
                    style={{ display: 'inline-flex', opacity: 0.7, padding: '2px 0 2px 2px' }}
                    title="Изменить группу"
                    onClick={(e) => { e.stopPropagation(); setGroupDialog({ group: g }); }}
                  >
                    <Icon name="pencil" size={11} />
                  </span>
                )}
              </span>
            ))}
          </div>
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
        <LeafletMap
          devices={mapDevices}
          positions={mapPositions}
          track={track}
          focusId={currentFocus.id}
          focusSeq={currentFocus.seq}
          onMarkerClick={(id) => {
            if (id !== selectedId) clearTrips();
            setSelectedId(id);
          }}
        />
        {selected && (
          <DetailPanel
            v={selected}
            stat={stats[selected.device.id]}
            onClose={() => { setSelectedId(null); clearTrips(); }}
            trips={trips}
            activeTrip={activeTrip}
            onLoadTrips={(range) => loadTrips(selected.device.id, range)}
            onPickTrip={showTripTrack}
          />
        )}
        {groupDialog && (
          <GroupDialog
            group={groupDialog.group}
            vehicles={vehicles}
            onClose={() => setGroupDialog(null)}
            onSaved={() => { setGroupDialog(null); reloadGroups(); }}
            onDeleted={(id) => {
              setGroupDialog(null);
              if (groupId === id) setGroupId('all');
              reloadGroups();
            }}
          />
        )}
      </div>
    </div>
  );
}

// нижняя панель: подробности выбранного объекта поверх карты
function DetailPanel({ v, stat, onClose, trips, activeTrip, onLoadTrips, onPickTrip }) {
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
    if (period === 'week') return { from: new Date(Date.now() - 7 * 864e5), to: new Date() };
    if (period === 'month') return { from: new Date(Date.now() - 30 * 864e5), to: new Date() };
    if (period === 'custom') {
      const from = new Date(`${customFrom}T00:00:00`);
      const to = new Date(`${customTo}T23:59:59`);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return null;
      return { from, to };
    }
    return null; // today — данные из props
  }, [period, customFrom, customTo]);

  // поездки грузятся сами: при выборе машины и при смене периода
  useEffect(() => {
    const r = period === 'today' ? { from: startOfDay(), to: new Date() } : range;
    if (r) onLoadTrips(r);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.device.id, period, customFrom, customTo]);

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

  const askEngine = () => {
    // модал подтверждения — сразу и обязательно; поддержку команды
    // проверяем параллельно и снимаем модал, только если её точно нет
    setEnginePending({ block: !blocked });
    getJson(`/commands/types?deviceId=${v.device.id}&textChannel=false`)
      .then((types) => {
        if (!types.some((t) => t.type === 'engineStop')) {
          setEnginePending(null);
          alert('Этот трекер не поддерживает удалённую блокировку двигателя');
        }
      })
      .catch(() => { /* проверить не смогли — модал остаётся, команду проверит бэкенд */ });
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

  const upd = p?.deviceTime ?? v.device.lastUpdate;
  const facts = [
    ['cpu', 'Модель', v.device.model],
    ['user', 'Водитель', v.device.attributes?.driver ?? v.device.contact],
    ['satellite', 'Спутники', a.sat],
    ['key', 'Зажигание', a.ignition != null ? yesNo(a.ignition) : null],
    ['navigation', 'Движение', a.motion != null ? yesNo(a.motion) : null],
    ['zap', 'Питание', a.power != null ? volts(a.power) : null],
    ['battery-medium', 'Батарея', a.battery != null ? volts(a.battery) : null],
    ['fuel', 'Топливо', fuel != null ? `${fuel}%${liters != null ? ` · ${liters} л` : ''}` : null],
    ['clock', 'Обновлено', upd ? `${formatTime(upd)} (${timeAgo(upd)})` : null],
  ].filter((f) => f[2] != null && f[2] !== '');

  return (
    <div
      style={{
        position: 'absolute', left: 12, right: 12, bottom: 12, zIndex: 1100,
        background: 'var(--color-surface)', border: '1px solid var(--color-divider)',
        borderRadius: 16, boxShadow: 'var(--shadow-lg)',
        maxHeight: '64%', overflow: 'auto',
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
            style={{
              fontSize: 12, padding: '4px 12px', borderRadius: 999,
              color: blocked ? 'var(--color-accent)' : '#c0392b',
              borderColor: 'currentColor',
            }}
            disabled={engineBusy || v.st === 'off'}
            title={v.st === 'off' ? 'Трекер offline' : undefined}
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
      <div style={{ display: 'flex', gap: 14, fontSize: 12.5, flexWrap: 'wrap', alignItems: 'center' }}>
        {shownStat && !loadingStat && (
          <>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }} title="Пробег за период">
              <Icon name="route" size={13} style={{ color: 'var(--color-accent)' }} />
              <b>{kmLabel(shownStat.distanceMeters)} км</b>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }} title="Макс. скорость за период">
              <Icon name="gauge" size={13} style={{ color: 'var(--color-accent-2)' }} />
              <b>{Math.round(shownStat.maxSpeedKnots * KNOTS_TO_KMH)} км/ч</b>
            </span>
            <span
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: shownStat.overspeedCount > 0 ? '#c0392b' : 'inherit' }}
              title="Превышений лимита скорости за период"
            >
              <Icon name="triangle-alert" size={13} />
              <b>{shownStat.overspeedCount}</b>
            </span>
          </>
        )}
        {facts.map(([icon, label, value]) => (
          <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }} title={label}>
            <Icon name={icon} size={13} style={{ opacity: 0.6 }} />
            <span className="text-muted">{label}:</span>
            <b style={{ fontWeight: 600 }}>{value}</b>
          </span>
        ))}
      </div>
      {p?.address && (
        <div className="text-muted" style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="map-pin" size={12} style={{ flex: 'none' }} />{p.address}
        </div>
      )}
      {trips && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600 }}>
            Поездки {trips.loading ? '' : `(${trips.rows.length})`}
            {!trips.loading && trips.rows.length > 0 && (
              <span className="text-muted" style={{ fontWeight: 400 }}> — нажмите, чтобы показать маршрут на карте</span>
            )}
          </div>
          {trips.loading && <div className="text-muted" style={{ fontSize: 12 }}>Загрузка…</div>}
          {trips.error && <div style={{ fontSize: 12, color: '#c0392b' }}>Не удалось загрузить: {trips.error}</div>}
          {!trips.loading && !trips.error && trips.rows.length === 0 && (
            <div className="text-muted" style={{ fontSize: 12 }}>За выбранный период поездок нет</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 168, overflow: 'auto' }}>
            {trips.rows.map((trip, index) => (
              <div
                key={`${trip.startTime}-${index}`}
                onClick={() => onPickTrip(trip, index)}
                style={{
                  border: '1px solid var(--color-divider)', borderRadius: 12, padding: '7px 10px',
                  cursor: 'pointer', fontSize: 12.5, display: 'flex', flexDirection: 'column', gap: 3,
                  ...(activeTrip === index ? {
                    borderColor: 'var(--color-accent)',
                    background: 'color-mix(in srgb, var(--color-accent) 8%, transparent)',
                  } : {}),
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <b>{tripTime(trip.startTime)} — {tripTime(trip.endTime)}</b>
                  <span className="text-muted">{new Date(trip.startTime).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}</span>
                  <span className="tag tag-neutral" style={{ marginLeft: 'auto', flex: 'none' }}>
                    {Math.round(trip.distance / 100) / 10} км
                  </span>
                </div>
                <div className="text-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {trip.startAddress || '—'} → {trip.endAddress || '—'}
                </div>
                <div className="text-muted" style={{ fontSize: 11.5 }}>
                  Макс. {Math.round((trip.maxSpeed ?? 0) * KNOTS_TO_KMH)} км/ч · {Math.round((trip.duration ?? 0) / 60000)} мин
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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
