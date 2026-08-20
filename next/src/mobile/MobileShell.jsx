import { useEffect, useMemo, useState } from 'react';
import { ST, vehicleState } from '../api';
import { Icon } from '../ui';
import { AnnouncementsModal, AnnouncementsScreen } from '../Announcements';
import MobileMap from './MobileMap';
import MobileObjects from './MobileObjects';
import MobileDetail from './MobileDetail';
import MobileEvents from './MobileEvents';
import MobileProfile from './MobileProfile';

const TABS = [
  ['map', 'Карта', 'map'],
  ['objects', 'Объекты', 'truck'],
  ['events', 'События', 'bell'],
  ['profile', 'Профиль', 'user'],
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

export default function MobileShell({ user, setUser, devices, positions }) {
  const [tab, setTab] = useHashSection(TABS.map(([id]) => id), 'map');
  const [detailId, setDetailId] = useState(null); // открытая карточка объекта
  const [trackFor, setTrackFor] = useState(null); // «построить трек» на карте
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') ?? 'light');

  useEffect(() => { localStorage.setItem('theme', theme); }, [theme]);

  const vehicles = useMemo(() => {
    const list = Object.values(devices).map((device) => {
      const position = positions[device.id];
      const { st, speed } = vehicleState(device, position);
      return {
        device, position, st, speed,
        name: device.name,
        plate: device.attributes?.plate ?? device.attributes?.registration ?? device.uniqueId,
        stLabel: ST[st].label, dotColor: ST[st].dot,
        stLine: st === 'move' ? `Движется · ${speed} км/ч` : ST[st].label,
      };
    });
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [devices, positions]);

  const [showAnnouncements, setShowAnnouncements] = useState(false);

  const openDetail = (id) => { setDetailId(id); };
  const buildTrack = (id) => { setTrackFor(id); setDetailId(null); setTab('map'); };

  const common = { user, setUser, vehicles, devices, positions, openDetail, theme, setTheme, openAnnouncements: () => setShowAnnouncements(true) };

  return (
    <div data-theme={theme} style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'var(--font-body)', overflow: 'hidden' }}>
      <AnnouncementsModal />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {tab === 'map' && <MobileMap {...common} trackFor={trackFor} clearTrack={() => setTrackFor(null)} />}
        {tab === 'objects' && <MobileObjects {...common} />}
        {tab === 'events' && <MobileEvents {...common} />}
        {tab === 'profile' && <MobileProfile {...common} />}
        {showAnnouncements && <AnnouncementsScreen onClose={() => setShowAnnouncements(false)} />}
        {detailId != null && (
          <MobileDetail
            {...common}
            vehicle={vehicles.find((v) => v.device.id === detailId)}
            onClose={() => setDetailId(null)}
            onBuildTrack={() => buildTrack(detailId)}
          />
        )}
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-around', flex: 'none',
        padding: '8px 8px calc(8px + env(safe-area-inset-bottom))',
        background: 'var(--color-surface)', borderTop: '1px solid var(--color-divider)',
      }}>
        {TABS.map(([id, label, icon]) => (
          <div
            key={id}
            onClick={() => { setTab(id); setDetailId(null); }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              fontSize: 10, minWidth: 44, cursor: 'pointer',
              color: tab === id ? 'var(--color-accent)' : 'color-mix(in srgb, var(--color-text) 45%, transparent)',
            }}
          >
            <Icon name={icon} size={20} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
