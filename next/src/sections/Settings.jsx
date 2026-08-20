import { useState } from 'react';
import { updateMe } from '../api';
import { Blueprint } from '../ui';

const ALERT_OPTIONS = [
  ['overspeed', 'Превышение скорости'],
  ['geofence', 'Выход из геозоны'],
  ['fuel', 'Слив топлива'],
  ['offline', 'Потеря связи'],
];

const loadAlerts = () => {
  try { return JSON.parse(localStorage.getItem('clientAlerts')) ?? { overspeed: true, geofence: true, offline: true }; }
  catch { return { overspeed: true, geofence: true, offline: true }; }
};

export default function Settings({ user, setUser, allVehicles }) {
  const [name, setName] = useState(user.name ?? '');
  const [phone, setPhone] = useState(user.phone ?? '');
  const [password, setPassword] = useState('');
  const [alerts, setAlerts] = useState(loadAlerts);
  const [status, setStatus] = useState(null);

  const save = async () => {
    setStatus('saving');
    try {
      const updated = await updateMe({ name, phone, ...(password ? { password } : {}) });
      setUser(updated);
      setPassword('');
      setStatus('saved');
      setTimeout(() => setStatus(null), 2500);
    } catch (error) {
      setStatus(`Ошибка: ${error.message}`);
    }
  };

  const toggle = (key) => {
    const next = { ...alerts, [key]: !alerts[key] };
    setAlerts(next);
    localStorage.setItem('clientAlerts', JSON.stringify(next));
  };

  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 900, alignContent: 'start' }}>
      <Blueprint style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h5 style={{ margin: 0 }}>Профиль</h5>
        <div className="field"><label>Имя</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="field"><label>Телефон</label><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        <div className="field"><label>Email (логин)</label><input className="input" value={user.email} disabled /></div>
        <div className="field"><label>Новый пароль (если нужно сменить)</label><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={save} disabled={status === 'saving'}>
            {status === 'saving' ? 'Сохранение…' : 'Сохранить'}
          </button>
          {status === 'saved' && <span style={{ fontSize: 13, color: 'var(--color-accent)' }}>Сохранено</span>}
          {status?.startsWith?.('Ошибка') && <span style={{ fontSize: 13, color: '#c0392b' }}>{status}</span>}
        </div>
      </Blueprint>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Blueprint style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h5 style={{ margin: 0 }}>Уведомления</h5>
          {ALERT_OPTIONS.map(([key, label]) => (
            <label className="radio" key={key}>
              <input type="checkbox" checked={Boolean(alerts[key])} onChange={() => toggle(key)} />
              <span className="dot" />
              {label}
            </label>
          ))}
        </Blueprint>
        <Blueprint style={{ padding: 16 }}>
          <h5 style={{ margin: '0 0 6px' }}>Тариф</h5>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 26 }}>
            3 000 ֏ <span className="text-muted" style={{ fontSize: 14 }}>/ трекер / мес</span>
          </div>
          <div className="text-muted" style={{ fontSize: 13 }}>
            Оборудование, установка и поддержка включены · трекеров: {allVehicles.length}
          </div>
        </Blueprint>
      </div>
    </div>
  );
}
