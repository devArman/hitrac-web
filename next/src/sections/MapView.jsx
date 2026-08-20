import { useState } from 'react';
import LeafletMap from '../LeafletMap';
import { fuelLevel } from '../api';
import { Blueprint, Icon, StatusDot } from '../ui';

export default function MapView({ vehicles, devices, positions, focus }) {
  const [localFocus, setLocalFocus] = useState(focus);

  const currentFocus = localFocus.seq >= focus.seq ? localFocus : focus;

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      <div style={{ width: 290, flex: 'none', borderRight: '1px solid var(--color-divider)', overflow: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {vehicles.map((v) => {
          const fuel = fuelLevel(v.position);
          return (
            <Blueprint
              key={v.device.id}
              onClick={() => setLocalFocus((f) => ({ id: v.device.id, seq: Math.max(f.seq, focus.seq) + 1 }))}
              style={{ padding: 10, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <StatusDot color={v.dotColor} />
                <b style={{ fontSize: 14 }}>{v.name}</b>
                <span className="text-muted" style={{ marginLeft: 'auto', fontSize: 12 }}>{v.plate}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
                <span className={v.tagClass}>{v.stLabel}</span>
                <span className="text-muted">{v.speedLabel}</span>
                {fuel != null && (
                  <span className="text-muted" style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="fuel" size={12} />{fuel}%
                  </span>
                )}
              </div>
            </Blueprint>
          );
        })}
        {vehicles.length === 0 && <div className="text-muted" style={{ fontSize: 13, padding: 8 }}>Нет объектов</div>}
      </div>
      <LeafletMap devices={devices} positions={positions} focusId={currentFocus.id} focusSeq={currentFocus.seq} />
    </div>
  );
}
