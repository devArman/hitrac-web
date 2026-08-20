import { useEffect, useState } from 'react';
import { deviceEmoji, fuelLevel, fuelLiters, getSummary, startOfDay } from '../api';
import { Icon } from '../ui';

export default function MobileObjects({ vehicles, openDetail }) {
  const [kmToday, setKmToday] = useState({});

  useEffect(() => {
    const ids = vehicles.map((v) => v.device.id);
    if (!ids.length) return;
    getSummary(ids, startOfDay(), new Date())
      .then((rows) => setKmToday(Object.fromEntries(rows.map((r) => [r.deviceId, Math.round((r.distance ?? 0) / 1000)]))))
      .catch(() => {});
    // при открытии вкладки; повтор, когда приехал список машин
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles.length > 0]);

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 'calc(8px + env(safe-area-inset-top)) 12px 8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {vehicles.map((v) => {
        const fuel = fuelLevel(v.position);
        return (
          <div
            key={v.device.id}
            onClick={() => openDetail(v.device.id)}
            style={{ border: '1px solid var(--color-divider)', borderRadius: 10, background: 'var(--color-surface)', padding: 12, display: 'flex', flexDirection: 'column', gap: 6, minHeight: 44, cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: v.dotColor }} />
              <b style={{ fontSize: 15 }}>{deviceEmoji(v.device) ? `${deviceEmoji(v.device)} ` : ''}{v.name}</b>
              <span className="text-muted" style={{ marginLeft: 'auto', fontSize: 12 }}>{v.plate}</span>
            </div>
            <div className="text-muted" style={{ display: 'flex', gap: 12, fontSize: 12, alignItems: 'center' }}>
              <span>{v.stLine}</span>
              {fuel != null && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="fuel" size={12} />{fuel}%{fuelLiters(v.position) != null && ` · ${fuelLiters(v.position)} л`}</span>}
              <span style={{ marginLeft: 'auto', color: 'var(--color-accent)' }}>{kmToday[v.device.id] ?? '—'} км</span>
            </div>
          </div>
        );
      })}
      {vehicles.length === 0 && <div className="text-muted" style={{ padding: 12, fontSize: 13 }}>Нет объектов</div>}
    </div>
  );
}
