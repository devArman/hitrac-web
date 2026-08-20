import { useEffect, useState } from 'react';
import { fuelLevel, getSummary, startOfDay } from '../api';

export default function Fleet({ vehicles, focusOnMap }) {
  const [kmToday, setKmToday] = useState({});

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
                <td><b>{v.name}</b></td>
                <td>{v.plate}</td>
                <td><span className={v.tagClass}>{v.stLabel}</span></td>
                <td>{v.speedLabel}</td>
                <td>
                  {fuel != null ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 70, height: 5, background: 'var(--color-neutral-200)' }}>
                        <div style={{ height: '100%', background: 'var(--color-accent)', width: `${fuel}%` }} />
                      </div>
                      {fuel}%
                    </div>
                  ) : <span className="text-muted">—</span>}
                </td>
                <td>{kmToday[v.device.id] ?? '—'} км</td>
                <td className="text-muted">{v.device.attributes?.driver ?? v.device.contact ?? '—'}</td>
                <td><button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => focusOnMap(v.device.id)}>На карте</button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
