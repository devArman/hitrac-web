import { useEffect, useState } from 'react';
import { getSummary, localDate } from '../api';
import { Blueprint } from '../ui';

const fmt = (n) => n.toLocaleString('ru-RU');

export default function Reports({ allVehicles }) {
  const [from, setFrom] = useState(() => localDate(new Date()).slice(0, 8) + '01');
  const [to, setTo] = useState(() => localDate());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const build = () => {
    const ids = allVehicles.map((v) => v.device.id);
    if (!ids.length) return;
    setLoading(true);
    getSummary(ids, new Date(`${from}T00:00:00`), new Date(`${to}T23:59:59`))
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  // сформировать при открытии — и повторить, когда приехал список машин (прямой заход по URL)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (allVehicles.length) build(); }, [allVehicles.length > 0]);

  const nameById = Object.fromEntries(allVehicles.map((v) => [v.device.id, v.name]));
  const totalKm = Math.round(rows.reduce((s, r) => s + (r.distance ?? 0), 0) / 1000);
  const totalFuel = Math.round(rows.reduce((s, r) => s + (r.spentFuel ?? 0), 0));
  const totalHours = Math.round(rows.reduce((s, r) => s + (r.engineHours ?? 0), 0) / 3600000);
  const maxSpeed = Math.round(rows.reduce((s, r) => Math.max(s, r.maxSpeed ?? 0), 0) * 1.852);

  const cards = [
    { k: 'Пробег', v: `${fmt(totalKm)} км`, sub: 'за период, весь парк' },
    { k: 'Топливо', v: totalFuel ? `${fmt(totalFuel)} л` : '—', sub: 'расход по данным трекеров' },
    { k: 'Моточасы', v: totalHours ? `${fmt(totalHours)} ч` : '—', sub: 'суммарно' },
    { k: 'Макс. скорость', v: `${maxSpeed} км/ч`, sub: 'по всем объектам' },
  ];

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="field" style={{ width: 180 }}><label>С</label><input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="field" style={{ width: 180 }}><label>По</label><input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <button className="btn btn-primary" onClick={build} disabled={loading}>{loading ? 'Формируется…' : 'Сформировать'}</button>
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
              <td>{r.averageSpeed ? `${Math.round(r.averageSpeed * 1.852)} км/ч` : '—'}</td>
              <td>{r.maxSpeed ? `${Math.round(r.maxSpeed * 1.852)} км/ч` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
