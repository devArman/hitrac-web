import { useEffect, useMemo, useState } from 'react';
import { ST, vehicleState } from './api';
import { Icon } from './ui';
import { AnnouncementsBell, AnnouncementsModal, AnnouncementsPanel } from './Announcements';
import MapView from './sections/MapView';
import Fleet from './sections/Fleet';
import Trips from './sections/Trips';
import Reports from './sections/Reports';
import Alerts from './sections/Alerts';
import Geozones from './sections/Geozones';
import Engine from './sections/Engine';
import Settings from './sections/Settings';

const NAV = [
  ['map', 'Карта', 'map'],
  ['fleet', 'Автопарк', 'truck'],
  ['tracks', 'Поездки', 'route'],
  ['reports', 'Отчёты', 'chart-column'],
  ['alerts', 'Уведомления', 'bell'],
  ['geo', 'Геозоны', 'hexagon'],
  ['engine', 'Двигатель', 'power'],
  ['settings', 'Настройки', 'settings'],
];

// раздел живёт в URL (#/map, #/fleet…): F5 возвращает туда же, работает «назад»
function useHashSection(valid, fallback) {
  const read = () => {
    const h = window.location.hash.replace(/^#\/?/, '');
    return valid.includes(h) ? h : fallback;
  };
  const [section, setSection] = useState(read);
  useEffect(() => {
    const onHash = () => setSection(read());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (window.location.hash.replace(/^#\/?/, '') !== section) {
      window.history.replaceState(null, '', `#/${section}`);
    }
  }, [section]);
  return [section, setSection];
}

export default function Shell({ user, setUser, devices, positions }) {
  const [section, setSection] = useHashSection(NAV.map(([id]) => id), 'map');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') ?? 'light');
  const [focus, setFocus] = useState({ id: null, seq: 0 });
  const [showAnnouncements, setShowAnnouncements] = useState(false);

  useEffect(() => { localStorage.setItem('theme', theme); }, [theme]);

  const vehicles = useMemo(() => {
    const list = Object.values(devices).map((device) => {
      const position = positions[device.id];
      const { st, speed } = vehicleState(device, position);
      return {
        device,
        position,
        st,
        speed,
        name: device.name,
        plate: device.attributes?.plate ?? device.attributes?.registration ?? device.uniqueId,
        stLabel: ST[st].label,
        tagClass: ST[st].tag,
        dotColor: ST[st].dot,
        speedLabel: st === 'move' ? `${speed} км/ч` : '—',
      };
    });
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [devices, positions]);

  const focusOnMap = (deviceId) => {
    setSection('map');
    setFocus((f) => ({ id: deviceId, seq: f.seq + 1 }));
  };

  // открыть «Поездки» с уже выбранной машиной (кнопка в панели на карте)
  const [tripsPreset, setTripsPreset] = useState(null);
  const openTrips = (deviceId) => {
    setTripsPreset({ deviceId });
    setSection('tracks');
  };

  const initials = (user.name || user.email).split(/[\s@]+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('');

  const sectionProps = { vehicles, allVehicles: vehicles, positions, devices, user, setUser, focusOnMap, focus, openTrips, tripsPreset };

  return (
    <div data-theme={theme} style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'var(--font-body)', overflow: 'hidden' }}>
      <AnnouncementsModal />
      {/* верхняя панель: логотип + горизонтальное меню */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '0 16px', borderBottom: '1px solid var(--color-divider)', background: 'var(--color-surface)', flex: 'none', minHeight: 56 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 'none' }}>
          <img src="/logo.svg" alt="HiTrack" style={{ width: 30, height: 30 }} />
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 16, letterSpacing: '.04em', lineHeight: 1.1 }}>HITRACK</div>
            <div style={{ fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', opacity: 0.55 }}>Кабинет клиента</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {NAV.map(([id, label, icon]) => {
            const active = section === id;
            return (
              <div
                key={id}
                onClick={() => setSection(id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '7px 13px', cursor: 'pointer',
                  fontSize: 13.5, whiteSpace: 'nowrap', borderRadius: 999,
                  background: active ? 'color-mix(in srgb, var(--color-accent) 13%, transparent)' : 'transparent',
                  color: active ? 'var(--color-accent)' : 'inherit',
                }}
              >
                <Icon name={icon} size={15} />
                <span>{label}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 'none' }}>
          <div style={{ position: 'relative' }}>
            <AnnouncementsBell onClick={() => setShowAnnouncements((v) => !v)} />
            {showAnnouncements && <AnnouncementsPanel onClose={() => setShowAnnouncements(false)} />}
          </div>
          <button
            className="btn btn-secondary"
            style={{ padding: 7, borderRadius: 999 }}
            title={theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          >
            <Icon name={theme === 'light' ? 'moon' : 'sun'} size={15} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ width: 28, height: 28, display: 'grid', placeItems: 'center', borderRadius: 999, background: 'var(--grad-brand)', color: '#fff', fontFamily: 'var(--font-heading)', fontSize: 13 }}>
              {initials}
            </span>
            {user.name || user.email}
          </div>
        </div>
      </div>
      {/* main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          {section === 'map' && <MapView {...sectionProps} />}
          {section === 'fleet' && <Fleet {...sectionProps} />}
          {section === 'tracks' && <Trips {...sectionProps} />}
          {section === 'reports' && <Reports {...sectionProps} />}
          {section === 'alerts' && <Alerts {...sectionProps} />}
          {section === 'geo' && <Geozones {...sectionProps} />}
          {section === 'engine' && <Engine {...sectionProps} />}
          {section === 'settings' && <Settings {...sectionProps} />}
        </div>
      </div>
    </div>
  );
}
