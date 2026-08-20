import { useEffect, useState } from 'react';
import LeafletMap from '../LeafletMap';
import { getJson } from '../api';
import { Blueprint } from '../ui';

export default function Geozones() {
  const [zones, setZones] = useState(null);

  useEffect(() => {
    getJson('/geofences').then(setZones).catch(() => setZones([]));
  }, []);

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      <div style={{ width: 360, flex: 'none', borderRight: '1px solid var(--color-divider)', overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {zones === null && <div className="text-muted" style={{ fontSize: 13 }}>Загрузка…</div>}
        {zones?.length === 0 && <div className="text-muted" style={{ fontSize: 13 }}>Геозон пока нет — их настроит оператор HiTrack по вашей заявке</div>}
        {zones?.map((zone) => (
          <Blueprint key={zone.id} style={{ padding: 10, fontSize: 13 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <b>{zone.name}</b>
              <span className="tag tag-accent-2" style={{ marginLeft: 'auto' }}>{zone.area.split(/[\s(]/)[0]}</span>
            </div>
            {zone.description && <div className="text-muted" style={{ fontSize: 12 }}>{zone.description}</div>}
          </Blueprint>
        ))}
      </div>
      <LeafletMap geofences={zones ?? []} />
    </div>
  );
}
