import { useState } from 'react';
import { login } from './api';
import { Blueprint } from './ui';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onLogin(await login(email, password));
    } catch {
      setError('Неверный email или пароль');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'grid', placeItems: 'center', background: 'var(--color-bg)' }}>
      <Blueprint style={{ width: 'min(360px, 90vw)', padding: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/next/logo.svg" alt="HiTrack" style={{ width: 38, height: 38 }} />
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 19, letterSpacing: '.04em' }}>HITRACK</div>
            <div style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', opacity: 0.55 }}>Кабинет клиента</div>
          </div>
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="field">
            <label>Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label>Пароль</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <div style={{ fontSize: 13, color: '#c0392b' }}>{error}</div>}
          <button className="btn btn-primary btn-block" type="submit" disabled={busy || !email || !password}>
            Войти
          </button>
        </form>
      </Blueprint>
    </div>
  );
}
