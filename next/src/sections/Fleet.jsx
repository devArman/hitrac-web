import { useEffect, useState } from 'react';
import { deviceEmoji, fuelLevel, fuelLiters, getDeviceSettings, getSummary, saveDeviceSettings, startOfDay } from '../api';

export default function Fleet({ vehicles, focusOnMap }) {
  const [kmToday, setKmToday] = useState({});
  const [settings, setSettings] = useState({}); // deviceId -> {speedLimitKmh, minFuelLiters}
  const [limits, setLimits] = useState(null); // диалог: { vehicle, speed, fuel }

  useEffect(() => {
    getDeviceSettings()
      .then((list) => setSettings(Object.fromEntries(list.map((s) => [s.deviceId, s]))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const ids = vehicles.map((v) => v.device.id);
    if (!ids.length) return;
    getSummary(ids, startOfDay(), new Date())
      .then((rows) => {
        const map = {};
        rows.forEach((row) => { map[row.deviceId] = Math.round((row.distance ?? 0) / 1000); });
        setKmToday(map);
      })
      .catch(() => {});
    // сводка при открытии; повтор, когда приехал список машин (прямой заход по URL)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles.length > 0]);

  return (
    <div style={{ padding: 20 }}>
      <table className="table">
        <thead>
          <tr>
            <th>Объект</th><th>Гос. номер</th><th>Статус</th><th>Скорость</th><th>Топливо</th><th>Пробег сегодня</th><th>Водитель</th><th />
          </tr>
        </thead>
        <tbody>
          {vehicles.map((v) => {
            const fuel = fuelLevel(v.position);
            return (
              <tr key={v.device.id}>
                <td><b>{deviceEmoji(v.device) ? `${deviceEmoji(v.device)} ` : ''}{v.name}</b></td>
                <td>{v.plate}</td>
                <td><span className={v.tagClass}>{v.stLabel}</span></td>
                <td>{v.speedLabel}</td>
                <td>
                  {fuel != null ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 70, height: 5, borderRadius: 3, overflow: 'hidden', background: 'var(--color-neutral-200)' }}>
                        <div style={{ height: '100%', background: 'var(--color-accent)', width: `${fuel}%` }} />
                      </div>
                      {fuel}%{fuelLiters(v.position) != null && <span className="text-muted"> · {fuelLiters(v.position)} л</span>}
                    </div>
                  ) : <span className="text-muted">—</span>}
                </td>
                <td>{kmToday[v.device.id] ?? '—'} км</td>
                <td className="text-muted">{v.device.attributes?.driver ?? v.device.contact ?? '—'}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => focusOnMap(v.device.id)}>На карте</button>
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: 12 }}
                    onClick={() => setLimits({
                      vehicle: v,
                      speed: settings[v.device.id]?.speedLimitKmh ?? '',
                      fuel: settings[v.device.id]?.minFuelLiters ?? '',
                    })}
                  >
                    Лимиты
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {limits && (
        <div className="dialog-backdrop" onClick={() => setLimits(null)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-title">Лимиты — {limits.vehicle.name}</div>
            <div className="field">
              <label>Лимит скорости, км/ч (пусто — выключено)</label>
              <input className="input" type="number" min="1" value={limits.speed}
                onChange={(e) => setLimits({ ...limits, speed: e.target.value })} placeholder="Например: 90" />
            </div>
            <div className="field">
              <label>Мин. остаток топлива, л (нужен датчик топлива)</label>
              <input className="input" type="number" min="1" value={limits.fuel}
                disabled={fuelLevel(limits.vehicle.position) == null}
                onChange={(e) => setLimits({ ...limits, fuel: e.target.value })}
                placeholder={fuelLevel(limits.vehicle.position) == null ? 'Датчик топлива не подключён' : 'Например: 50'} />
            </div>
            <div className="text-muted" style={{ fontSize: 12 }}>
              Превышение скорости и падение топлива ниже лимита появятся в «Уведомлениях».
            </div>
            <div className="dialog-actions">
              <button className="btn btn-secondary" onClick={() => setLimits(null)}>Отмена</button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  try {
                    const saved = await saveDeviceSettings(limits.vehicle.device.id, {
                      speedLimitKmh: limits.speed === '' ? null : Number(limits.speed),
                      minFuelLiters: limits.fuel === '' ? null : Number(limits.fuel),
                    });
                    setSettings({ ...settings, [saved.deviceId]: saved });
                    setLimits(null);
                  } catch (e) {
                    alert(`Не удалось сохранить: ${e.message}`);
                  }
                }}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
