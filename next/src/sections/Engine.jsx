import { useState } from 'react';
import { getJson, sendCommand } from '../api';
import { Blueprint, ConfirmDialog, StatusDot } from '../ui';

export default function Engine({ allVehicles }) {
  // blocked-состояние держим по атрибуту позиции blocked (его выставляет трекер)
  const [pending, setPending] = useState(null); // { vehicle, block }
  const [busy, setBusy] = useState({});
  const [supported, setSupported] = useState({});

  const checkSupport = async (deviceId) => {
    if (supported[deviceId] !== undefined) return supported[deviceId];
    try {
      const types = await getJson(`/commands/types?deviceId=${deviceId}&textChannel=false`);
      const ok = types.some((t) => t.type === 'engineStop');
      setSupported((s) => ({ ...s, [deviceId]: ok }));
      return ok;
    } catch {
      return false;
    }
  };

  const run = async () => {
    const { vehicle, block } = pending;
    setPending(null);
    setBusy((b) => ({ ...b, [vehicle.device.id]: true }));
    try {
      await sendCommand(vehicle.device.id, block ? 'engineStop' : 'engineResume');
      alert(block
        ? 'Команда блокировки отправлена. Двигатель заглохнет после остановки автомобиля.'
        : 'Команда разблокировки отправлена.');
    } catch (error) {
      alert(`Не удалось отправить команду: ${error.message}`);
    } finally {
      setBusy((b) => ({ ...b, [vehicle.device.id]: false }));
    }
  };

  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: 14, alignContent: 'start' }}>
      {allVehicles.map((v) => {
        const blocked = Boolean(v.position?.attributes?.blocked);
        return (
          <Blueprint key={v.device.id} style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <StatusDot color={v.dotColor} />
              <b>{v.name}</b>
              <span className="text-muted" style={{ marginLeft: 'auto', fontSize: 12 }}>{v.plate}</span>
            </div>
            <div className="text-muted" style={{ fontSize: 13 }}>
              Двигатель: <b style={{ color: blocked ? '#c0392b' : 'var(--color-accent)' }}>{blocked ? 'Заблокирован' : 'Работает'}</b>
            </div>
            <button
              className={blocked ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ width: '100%' }}
              disabled={busy[v.device.id] || v.st === 'off'}
              onClick={async () => {
                if (await checkSupport(v.device.id)) {
                  setPending({ vehicle: v, block: !blocked });
                } else {
                  alert('Этот трекер не поддерживает удалённую блокировку двигателя');
                }
              }}
            >
              {busy[v.device.id] ? 'Отправка…' : blocked ? 'Разблокировать' : 'Заблокировать'}
            </button>
          </Blueprint>
        );
      })}
      {pending && (
        <ConfirmDialog
          title={pending.block ? 'Заблокировать двигатель?' : 'Разблокировать двигатель?'}
          body={pending.block
            ? `${pending.vehicle.name} (${pending.vehicle.plate}): трекер получит команду блокировки. Двигатель заглохнет, когда автомобиль остановится.`
            : `${pending.vehicle.name} (${pending.vehicle.plate}): двигатель снова можно будет завести.`}
          confirmLabel={pending.block ? 'Заблокировать' : 'Разблокировать'}
          danger={pending.block}
          onConfirm={run}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
