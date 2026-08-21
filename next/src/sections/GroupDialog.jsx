import { useState } from 'react';
import { createDeviceGroup, deleteDeviceGroup, updateDeviceGroup } from '../api';
import { ConfirmDialog } from '../ui';

// своя группа клиента: название + выбор устройств из доступных
export default function GroupDialog({ group, vehicles, onClose, onSaved, onDeleted }) {
  const [name, setName] = useState(group?.name ?? '');
  const [ids, setIds] = useState(() => new Set(group?.deviceIds ?? []));
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const query = q.trim().toLowerCase();
  const list = vehicles.filter((v) => !query
    || [v.name, v.plate].some((s) => s && String(s).toLowerCase().includes(query)));

  const toggle = (id) => setIds((s) => {
    const next = new Set(s);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const save = async () => {
    if (!name.trim()) { alert('Введите название группы'); return; }
    setBusy(true);
    try {
      const data = { name: name.trim(), deviceIds: [...ids] };
      if (group) await updateDeviceGroup(group.id, data);
      else await createDeviceGroup(data);
      onSaved();
    } catch (error) {
      alert(`Не удалось сохранить: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await deleteDeviceGroup(group.id);
      onDeleted(group.id);
    } catch (error) {
      alert(`Не удалось удалить: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-title">{group ? `Группа — ${group.name}` : 'Новая группа'}</div>
        <div className="field">
          <label>Название</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Например: Мои грузовики" />
        </div>
        <div className="field">
          <label>Устройства ({ids.size} выбрано)</label>
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск…" style={{ marginBottom: 6, minHeight: 32, fontSize: 13 }} />
          <div style={{ maxHeight: 240, overflow: 'auto', border: '1px solid var(--color-divider)', borderRadius: 10, padding: 4, display: 'flex', flexDirection: 'column' }}>
            {list.map((v) => (
              <label key={v.device.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '5px 8px', borderRadius: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={ids.has(v.device.id)} onChange={() => toggle(v.device.id)} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</span>
                <span className="text-muted" style={{ fontSize: 11, flex: 'none' }}>{v.plate}</span>
              </label>
            ))}
            {list.length === 0 && <div className="text-muted" style={{ fontSize: 12, padding: 8 }}>Ничего не найдено</div>}
          </div>
        </div>
        <div className="dialog-actions">
          {group && (
            <button className="btn btn-secondary" style={{ marginRight: 'auto', color: '#c0392b', borderColor: 'currentColor' }} disabled={busy} onClick={() => setConfirmDelete(true)}>
              Удалить
            </button>
          )}
          <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary" disabled={busy} onClick={save}>
            {busy ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </div>
      {confirmDelete && (
        <ConfirmDialog
          title="Удалить группу?"
          body={`Группа «${group.name}» будет удалена. Устройства при этом не пострадают.`}
          confirmLabel="Удалить"
          danger
          onConfirm={remove}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
