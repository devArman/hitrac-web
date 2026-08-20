import { useEffect, useState } from 'react';
import LeafletMap from '../LeafletMap';
import { fuelLevel, getSummary, getTrips, sendCommand, startOfDay, KNOTS_TO_KMH } from '../api';
import { ConfirmDialog, Icon } from '../ui';

export default function MobileDetail({ vehicle, devices, positions, onClose, onBuildTrack }) {
  const [stats, setStats] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!vehicle) return;
    Promise.all([
      getSummary([vehicle.device.id], startOfDay(), new Date()),
      getTrips(vehicle.device.id, startOfDay(), new Date()),
    ]).then(([summary, trips]) => {
      const row = summary[0] ?? {};
      setStats({
        km: Math.round((row.distance ?? 0) / 1000),
        hours: row.engineHours ? (row.engineHours / 3600000).toFixed(1) : null,
        maxSpeed: row.maxSpeed ? Math.round(row.maxSpeed * KNOTS_TO_KMH) : 0,
        trips: trips.length,
      });
    }).catch(() => setStats({}));
    // разово при открытии карточки
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle?.device.id]);

  if (!vehicle) return null;

  const fuel = fuelLevel(vehicle.position);
  const blocked = Boolean(vehicle.position?.attributes?.blocked);
  const address = vehicle.position?.address
    ?? (vehicle.position ? `${vehicle.position.latitude.toFixed(4)}, ${vehicle.position.longitude.toFixed(4)}` : '—');

  const cards = [
    { k: 'Пробег сегодня', v: stats ? `${stats.km ?? 0} км` : '…' },
    { k: 'Моточасы', v: stats?.hours ? `${stats.hours} ч` : '—' },
    { k: 'Макс. скорость', v: stats ? `${stats.maxSpeed ?? 0} км/ч` : '…' },
    { k: 'Поездок сегодня', v: stats ? `${stats.trips ?? 0}` : '…' },
  ];

  const toggleEngine = async () => {
    setConfirming(false);
    setBusy(true);
    try {
      await sendCommand(vehicle.device.id, blocked ? 'engineResume' : 'engineStop');
      alert(blocked ? 'Команда разблокировки отправлена.' : 'Команда блокировки отправлена. Двигатель заглохнет после остановки.');
    } catch (error) {
      alert(`Не удалось отправить команду: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  const one = { [vehicle.device.id]: vehicle.device };

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 1100, background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', gap: 10, padding: 'calc(10px + env(safe-area-inset-top)) 12px 12px', overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="btn btn-ghost" onClick={onClose} style={{ padding: 6 }}><Icon name="arrow-left" size={18} /></button>
        <b style={{ fontSize: 17, fontFamily: 'var(--font-heading)', letterSpacing: '.02em' }}>{vehicle.name}</b>
        <span className="text-muted" style={{ marginLeft: 'auto', fontSize: 12 }}>{vehicle.plate}</span>
      </div>
      <div style={{ height: 180, position: 'relative', border: '1px solid var(--color-divider)', display: 'flex', flex: 'none' }}>
        <LeafletMap devices={one} positions={positions} focusId={vehicle.device.id} focusSeq={1} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: vehicle.dotColor }} />
        <b style={{ fontSize: 17, fontFamily: 'var(--font-heading)', letterSpacing: '.02em' }}>{vehicle.stLine}</b>
        <span className="text-muted" style={{ marginLeft: 'auto', fontSize: 12, textAlign: 'right' }}>{address}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {cards.map((c) => (
          <div key={c.k} style={{ border: '1px solid var(--color-divider)', padding: 10 }}>
            <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--color-accent)' }}>{c.k}</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22 }}>{c.v}</div>
          </div>
        ))}
      </div>
      {fuel != null && (
        <div style={{ border: '1px solid var(--color-divider)', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span className="text-muted">Топливо (ДУТ)</span><b>{fuel}%</b>
          </div>
          <div style={{ height: 6, background: 'color-mix(in srgb, var(--color-text) 12%, transparent)' }}>
            <div style={{ height: '100%', width: `${fuel}%`, background: 'var(--grad-brand)' }} />
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
        <button className="btn btn-primary" style={{ flex: 1, padding: '12px 0', letterSpacing: '.05em' }} onClick={onBuildTrack}>
          ПОСТРОИТЬ ТРЕК
        </button>
        <button
          className="btn btn-secondary"
          style={{ flex: 1, padding: '12px 0', letterSpacing: '.05em' }}
          disabled={busy || vehicle.st === 'off'}
          onClick={() => setConfirming(true)}
        >
          {busy ? 'ОТПРАВКА…' : blocked ? 'РАЗБЛОКИРОВКА' : 'БЛОКИРОВКА'}
        </button>
      </div>
      {confirming && (
        <ConfirmDialog
          title={blocked ? 'Разблокировать двигатель?' : 'Заблокировать двигатель?'}
          body={blocked
            ? `${vehicle.name}: двигатель снова можно будет завести.`
            : `${vehicle.name}: трекер получит команду блокировки. Двигатель заглохнет, когда автомобиль остановится.`}
          confirmLabel={blocked ? 'Разблокировать' : 'Заблокировать'}
          danger={!blocked}
          onConfirm={toggleEngine}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
