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

const TITLES = {
  map: 'Карта', fleet: 'Автопарк', tracks: 'История поездок', reports: 'Отчёты',
  alerts: 'Уведомления и события', geo: 'Геозоны', engine: 'Управление двигателем', settings: 'Настройки',
};


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
  const [search, setSearch] = useState('');
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter((v) => v.name.toLowerCase().includes(q) || String(v.plate).toLowerCase().includes(q));
  }, [vehicles, search]);

  const online = vehicles.filter((v) => v.st !== 'off').length;

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

  const sectionProps = { vehicles: filtered, allVehicles: vehicles, positions, devices, user, setUser, focusOnMap, focus, openTrips, tripsPreset };

  return (
    <div data-theme={theme} style={{ display: 'flex', height: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'var(--font-body)', overflow: 'hidden' }}>
      <AnnouncementsModal />
      {/* sidebar */}
      <div style={{ width: 216, flex: 'none', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--color-divider)', background: 'var(--color-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--color-divider)' }}>
          <img src="/logo.svg" alt="HiTrack" style={{ width: 34, height: 34 }} />
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 17, letterSpacing: '.04em' }}>HITRACK</div>
            <div style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', opacity: 0.55 }}>Кабинет клиента</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 8px', flex: 1, overflow: 'auto' }}>
          {NAV.map(([id, label, icon]) => {
            const active = section === id;
            return (
              <div
                key={id}
                onClick={() => setSection(id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', cursor: 'pointer', fontSize: 14,
                  borderLeft: `2px solid ${active ? 'var(--color-accent)' : 'transparent'}`,
                  background: active ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)' : 'transparent',
                  color: active ? 'var(--color-accent)' : 'inherit',
                }}
              >
                <Icon name={icon} />
                <span>{label}</span>
              </div>
            );
          })}
        </div>
        <div style={{ padding: 12, borderTop: '1px solid var(--color-divider)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="blueprint" style={{ padding: 10, fontSize: 12 }}>
            <i className="corner tl" /><i className="corner tr" /><i className="corner bl" /><i className="corner br" />
            <div style={{ letterSpacing: '.1em', textTransform: 'uppercase', fontSize: 10, color: 'var(--color-accent)' }}>Тариф</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 19 }}>3 000 ֏ / мес</div>
            <div className="text-muted" style={{ fontSize: 11 }}>{vehicles.length} трекеров</div>
          </div>
          <button className="btn btn-secondary btn-block" style={{ marginTop: 0 }} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
            <Icon name={theme === 'light' ? 'moon' : 'sun'} size={15} />
            {theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
          </button>
        </div>
      </div>
      {/* main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderBottom: '1px solid var(--color-divider)', flex: 'none' }}>
          <h4 style={{ margin: 0, fontSize: 21 }}>{TITLES[section]}</h4>
          <span className="tag tag-accent" style={{ gap: 6 }}>
            <span style={{ width: 7, height: 7, background: 'var(--color-accent)', borderRadius: '50%', animation: 'pulse 1.6s infinite' }} />
            {online} на связи
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <AnnouncementsBell onClick={() => setShowAnnouncements((v) => !v)} />
              {showAnnouncements && <AnnouncementsPanel onClose={() => setShowAnnouncements(false)} />}
            </div>
            <input className="input" placeholder="Поиск объекта…" style={{ width: 220, minHeight: 32 }} value={search} onChange={(e) => setSearch(e.target.value)} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <span style={{ width: 28, height: 28, display: 'grid', placeItems: 'center', borderRadius: 8, background: 'var(--grad-brand)', color: '#fff', fontFamily: 'var(--font-heading)', fontSize: 13 }}>
                {initials}
              </span>
              {user.name || user.email}
            </div>
          </div>
        </div>
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
