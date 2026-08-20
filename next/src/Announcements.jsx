import { useEffect, useState } from 'react';
import { api, formatTime, getJson } from './api';
import { Blueprint } from './ui';

export const getAnnouncements = () => getJson('/announcements');
export const markAnnouncementRead = (id) => api(`/announcements/${id}/read`, { method: 'POST' });

/** Всплывающее окно с непрочитанными объявлениями — по одному, «Понятно» отмечает прочтение. */
export function AnnouncementsModal() {
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    getAnnouncements()
      .then((list) => setQueue(list.filter((a) => !a.read)))
      .catch(() => {});
  }, []);

  const current = queue[0];
  if (!current) return null;

  const dismiss = async () => {
    setQueue((q) => q.slice(1));
    try { await markAnnouncementRead(current.id); } catch { /* отметим в следующий раз */ }
  };

  return (
    <div className="dialog-backdrop" style={{ zIndex: 2000 }}>
      <div className="dialog">
        <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--color-accent)' }}>
          Объявление · {formatTime(current.createdAt)}
        </div>
        <div className="dialog-title">{current.subject}</div>
        <div className="dialog-body" style={{ whiteSpace: 'pre-wrap' }}>{current.body}</div>
        <div className="dialog-actions">
          {queue.length > 1 && <span className="text-muted" style={{ marginRight: 'auto', fontSize: 12, alignSelf: 'center' }}>ещё {queue.length - 1}</span>}
          <button className="btn btn-primary" onClick={dismiss}>Понятно</button>
        </div>
      </div>
    </div>
  );
}

/** Список объявлений — блок для раздела «Уведомления». */
export function AnnouncementsList() {
  const [list, setList] = useState(null);

  useEffect(() => {
    getAnnouncements().then(setList).catch(() => setList([]));
  }, []);

  if (!list?.length) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
      <h6 style={{ margin: 0 }}>Объявления</h6>
      {list.map((a) => (
        <Blueprint key={a.id} style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <b style={{ fontSize: 14 }}>{a.subject}</b>
            {!a.read && <span className="tag tag-accent">новое</span>}
            <span className="text-muted" style={{ marginLeft: 'auto', fontSize: 12 }}>{formatTime(a.createdAt)}</span>
          </div>
          <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{a.body}</div>
        </Blueprint>
      ))}
    </div>
  );
}
