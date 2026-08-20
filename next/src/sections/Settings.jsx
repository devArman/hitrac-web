import { useState } from 'react';
import { updateUser } from '../api';
import { Blueprint } from '../ui';

const ALERT_OPTIONS = [
  ['overspeed', 'Превышение скорости'],
  ['geofence', 'Выход из геозоны'],
  ['fuel', 'Слив топлива'],
  ['offline', 'Потеря связи'],
];

export default function Settings({ user, setUser, allVehicles }) {
  const [name, setName] = useState(user.name ?? '');
  const [phone, setPhone] = useState(user.phone ?? '');
  const [email, setEmail] = useState(user.email ?? '');
  const [alerts, setAlerts] = useState(() => user.attributes?.clientAlerts ?? { overspeed: true, geofence: true, offline: true });
  const [status, setStatus] = useState(null);

  const save = async () => {
    setStatus('saving');
    try {
      const updated = await updateUser({
        ...user, name, phone, email,
        attributes: { ...user.attributes, clientAlerts: alerts },
      });
      setUser(updated);
      setStatus('saved');
      setTimeout(() => setStatus(null), 2500);
    } catch (error) {
      setStatus(`Ошибка: ${error.message}`);
    }
  };

  const toggle = (key) => {
    setAlerts((a) => ({ ...a, [key]: !a[key] }));
    setStatus(null);
  };

  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 900, alignContent: 'start' }}>
      <Blueprint style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h5 style={{ margin: 0 }}>Профиль</h5>
        <div className="field"><label>Имя</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="field"><label>Телефон</label><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        <div className="field"><label>Email</label><input className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
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
          <div className="text-muted" style={{ fontSize: 11 }}>Не забудьте нажать «Сохранить» в профиле</div>
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
