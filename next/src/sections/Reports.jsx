import { useEffect, useState } from 'react';
import { getSummary, localDate, KNOTS_TO_KMH } from '../api';
import { Blueprint } from '../ui';

const fmt = (n) => n.toLocaleString('ru-RU');

const PERIODS = [
  ['today', 'Сегодня'],
  ['week', 'Неделя'],
  ['month', 'Месяц'],
  ['custom', 'Период'],
];

function periodRange(period, from, to) {
  const end = new Date();
  if (period === 'today') {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return [start, end];
  }
  if (period === 'week') return [new Date(Date.now() - 7 * 86400000), end];
  if (period === 'month') return [new Date(Date.now() - 30 * 86400000), end];
  return [new Date(`${from}T00:00:00`), new Date(`${to}T23:59:59`)];
}

export default function Reports({ allVehicles }) {
  const [period, setPeriod] = useState('week');
  const [deviceId, setDeviceId] = useState('');
  const [from, setFrom] = useState(() => localDate(new Date()).slice(0, 8) + '01');
  const [to, setTo] = useState(() => localDate());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ids = deviceId ? [Number(deviceId)] : allVehicles.map((v) => v.device.id);
    if (!ids.length) return;
    const [start, end] = periodRange(period, from, to);
    setLoading(true);
    getSummary(ids, start, end)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
    // повтор при смене фильтров и когда приехал список машин (прямой заход по URL)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allVehicles.length > 0, deviceId, period, from, to]);

  const nameById = Object.fromEntries(allVehicles.map((v) => [v.device.id, v.name]));
  const totalKm = Math.round(rows.reduce((s, r) => s + (r.distance ?? 0), 0) / 1000);
  const totalFuel = Math.round(rows.reduce((s, r) => s + (r.spentFuel ?? 0), 0));
  const totalHours = Math.round(rows.reduce((s, r) => s + (r.engineHours ?? 0), 0) / 3600000);
  const maxSpeed = Math.round(rows.reduce((s, r) => Math.max(s, r.maxSpeed ?? 0), 0) * KNOTS_TO_KMH);

  const cards = [
    { k: 'Пробег', v: `${fmt(totalKm)} км`, sub: deviceId ? nameById[deviceId] : 'за период, весь парк' },
    { k: 'Топливо', v: totalFuel ? `${fmt(totalFuel)} л` : '—', sub: 'расход по данным трекеров' },
    { k: 'Моточасы', v: totalHours ? `${fmt(totalHours)} ч` : '—', sub: 'суммарно' },
    { k: 'Макс. скорость', v: `${maxSpeed} км/ч`, sub: deviceId ? nameById[deviceId] : 'по всем объектам' },
  ];

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="field" style={{ width: 190 }}>
          <label>Объект</label>
          <select className="input" value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
            <option value="">Все объекты</option>
            {allVehicles.map((v) => <option key={v.device.id} value={v.device.id}>{v.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Период</label>
          <div className="seg" style={{ display: 'flex' }}>
            {PERIODS.map(([id, label]) => (
              <span
                key={id}
                className="seg-opt"
                onClick={() => setPeriod(id)}
                style={period === id ? { background: 'var(--color-accent)', color: 'var(--color-bg)' } : {}}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
        {period === 'custom' && (
          <>
            <div className="field" style={{ width: 160 }}>
              <label>С</label>
              <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="field" style={{ width: 160 }}>
              <label>По</label>
              <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </>
        )}
        {loading && <span className="text-muted" style={{ fontSize: 13, paddingBottom: 8 }}>Формируется…</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {cards.map((c) => (
          <Blueprint key={c.k} style={{ padding: 14 }}>
            <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--color-accent)' }}>{c.k}</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 28 }}>{c.v}</div>
            <div className="text-muted" style={{ fontSize: 12 }}>{c.sub}</div>
          </Blueprint>
        ))}
      </div>
      <table className="table">
        <thead>
          <tr><th>Объект</th><th>Пробег</th><th>Моточасы</th><th>Расход топлива</th><th>Ср. скорость</th><th>Макс. скорость</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.deviceId}>
              <td><b>{nameById[r.deviceId] ?? r.deviceName}</b></td>
              <td>{fmt(Math.round((r.distance ?? 0) / 1000))} км</td>
              <td>{r.engineHours ? `${Math.round(r.engineHours / 3600000)} ч` : '—'}</td>
              <td>{r.spentFuel ? `${Math.round(r.spentFuel)} л` : '—'}</td>
              <td>{r.averageSpeed ? `${Math.round(r.averageSpeed * KNOTS_TO_KMH)} км/ч` : '—'}</td>
              <td>{r.maxSpeed ? `${Math.round(r.maxSpeed * KNOTS_TO_KMH)} км/ч` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
