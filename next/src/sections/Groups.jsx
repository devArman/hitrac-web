import { useEffect, useState } from 'react';
import { getDeviceGroups } from '../api';
import { Icon } from '../ui';
import GroupDialog from './GroupDialog';

// раздел «Группы»: общие (админские) — просмотр, свои — создание/правка/удаление
export default function Groups({ vehicles, openMapWithGroup }) {
  const [groups, setGroups] = useState([]);
  const [dialog, setDialog] = useState(null); // { group: null|{} }

  const reload = () => getDeviceGroups().then(setGroups).catch(() => {});
  useEffect(() => { reload(); }, []);

  const nameById = new Map(vehicles.map((v) => [v.device.id, v.name]));
  const online = (g) => g.deviceIds.filter((id) => {
    const v = vehicles.find((x) => x.device.id === id);
    return v && v.st !== 'off';
  }).length;

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h4 style={{ margin: 0 }}>Группы объектов</h4>
        <button className="btn btn-primary" style={{ marginLeft: 'auto', borderRadius: 999 }} onClick={() => setDialog({ group: null })}>
          <Icon name="plus" size={14} />Создать группу
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {groups.map((g) => {
          const preview = g.deviceIds.slice(0, 3).map((id) => nameById.get(id)).filter(Boolean).join(', ');
          return (
            <div key={g.id} className="veh-card" style={{ cursor: 'default', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name={g.own ? 'user' : 'shield'} size={14} style={{ color: 'var(--color-accent)' }} />
                <b style={{ fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</b>
                <span className={g.own ? 'tag tag-accent' : 'tag tag-neutral'} style={{ marginLeft: 'auto', flex: 'none' }}>
                  {g.own ? 'Моя' : 'Общая'}
                </span>
              </div>
              <div className="text-muted" style={{ fontSize: 12.5 }}>
                {g.deviceIds.length} объектов · {online(g)} online
              </div>
              {preview && (
                <div className="text-muted" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {preview}{g.deviceIds.length > 3 ? '…' : ''}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                <button className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 12px', borderRadius: 999 }} onClick={() => openMapWithGroup(g.id)}>
                  <Icon name="map" size={12} />На карте
                </button>
                {g.own && (
                  <button className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 12px', borderRadius: 999 }} onClick={() => setDialog({ group: g })}>
                    <Icon name="pencil" size={12} />Изменить
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {groups.length === 0 && (
          <div className="text-muted" style={{ fontSize: 13 }}>
            Групп пока нет — создайте свою кнопкой выше.
          </div>
        )}
      </div>
      {dialog && (
        <GroupDialog
          group={dialog.group}
          vehicles={vehicles}
          onClose={() => setDialog(null)}
          onSaved={() => { setDialog(null); reload(); }}
          onDeleted={() => { setDialog(null); reload(); }}
        />
      )}
    </div>
  );
}
