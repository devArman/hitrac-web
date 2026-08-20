import { useEffect, useState } from 'react';
import { getJson, getSession } from './api';
import Login from './Login';
import Shell from './Shell';
import MobileShell from './mobile/MobileShell';

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 640px)').matches);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 640px)');
    const onChange = (e) => setMobile(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return mobile;
}

export default function App() {
  const isMobile = useIsMobile();
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);
  const [devices, setDevices] = useState({});
  const [positions, setPositions] = useState({});

  useEffect(() => {
    getSession().then(setUser).catch(() => {}).finally(() => setChecked(true));
  }, []);

  // живые данные: позиции каждые 5 секунд, устройства (статусы) каждые 30
  useEffect(() => {
    if (!user) return undefined;
    let alive = true;
    const loadDevices = () => getJson('/devices')
      .then((list) => { if (alive) setDevices(Object.fromEntries(list.map((d) => [d.id, d]))); })
      .catch(() => {});
    const loadPositions = () => getJson('/positions')
      .then((list) => { if (alive) setPositions(Object.fromEntries(list.map((p) => [p.deviceId, p]))); })
      .catch(() => {});
    loadDevices();
    loadPositions();
    const positionsTimer = setInterval(() => { if (document.visibilityState !== 'hidden') loadPositions(); }, 5000);
    const devicesTimer = setInterval(() => { if (document.visibilityState !== 'hidden') loadDevices(); }, 30000);
    return () => { alive = false; clearInterval(positionsTimer); clearInterval(devicesTimer); };
  }, [user]);

  if (!checked) return null;
  if (!user) return <Login onLogin={setUser} />;
  const ShellComponent = isMobile ? MobileShell : Shell;
  return <ShellComponent user={user} setUser={setUser} devices={devices} positions={positions} />;
}
