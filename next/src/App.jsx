import { useCallback, useEffect, useRef, useState } from 'react';
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
  const socketRef = useRef(null);

  useEffect(() => {
    getSession().then(setUser).catch(() => {}).finally(() => setChecked(true));
  }, []);

  const connectSocket = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const socket = new WebSocket(`${protocol}://${window.location.host}/api/socket`);
    socketRef.current = socket;
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.devices) {
        setDevices((prev) => {
          const next = { ...prev };
          data.devices.forEach((d) => { next[d.id] = d; });
          return next;
        });
      }
      if (data.positions) {
        setPositions((prev) => {
          const next = { ...prev };
          data.positions.forEach((p) => { next[p.deviceId] = p; });
          return next;
        });
      }
    };
    socket.onclose = () => {
      socketRef.current = null;
      setTimeout(() => { if (document.visibilityState !== 'hidden') connectSocket(); }, 5000);
    };
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    Promise.all([getJson('/devices'), getJson('/positions')]).then(([deviceList, positionList]) => {
      setDevices(Object.fromEntries(deviceList.map((d) => [d.id, d])));
      setPositions(Object.fromEntries(positionList.map((p) => [p.deviceId, p])));
      connectSocket();
    });
    return () => socketRef.current?.close();
  }, [user, connectSocket]);

  if (!checked) return null;
  if (!user) return <Login onLogin={setUser} />;
  const ShellComponent = isMobile ? MobileShell : Shell;
  return <ShellComponent user={user} setUser={setUser} devices={devices} positions={positions} />;
}
