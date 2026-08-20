// Тонкая обёртка над Traccar API (относительные пути — nginx проксирует /api на Traccar)

export async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text.split('\n')[0] || `HTTP ${response.status}`);
  }
  return response;
}

export const getJson = (path) => api(path, { headers: { Accept: 'application/json' } }).then((r) => r.json());

export const getSession = () => getJson('/session');

export const login = (email, password) =>
  api('/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email, password }),
  }).then((r) => r.json());

export const logout = () => api('/session', { method: 'DELETE' });

export const sendCommand = (deviceId, type) =>
  api('/commands/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId, type, attributes: {} }),
  });

export const updateUser = (user) =>
  api(`/users/${user.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  }).then((r) => r.json());

const query = (params) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    (Array.isArray(v) ? v : [v]).forEach((x) => q.append(k, x));
  });
  return q.toString();
};

export const getTrips = (deviceId, from, to) =>
  getJson(`/reports/trips?${query({ deviceId, from: from.toISOString(), to: to.toISOString() })}`);

export const getRoute = (deviceId, from, to) =>
  getJson(`/reports/route?${query({ deviceId, from: from.toISOString(), to: to.toISOString() })}`);

export const getSummary = (deviceIds, from, to) =>
  getJson(`/reports/summary?${query({ deviceId: deviceIds, from: from.toISOString(), to: to.toISOString() })}`);

export const getEvents = (deviceIds, from, to) =>
  getJson(`/reports/events?${query({ deviceId: deviceIds, from: from.toISOString(), to: to.toISOString() })}`);

// ── производные значения из данных Traccar ──

export const KNOTS_TO_KMH = 1.852;

export function vehicleState(device, position) {
  const speed = position ? Math.round(position.speed * KNOTS_TO_KMH) : 0;
  if (device.status !== 'online' && device.status !== 'unknown') return { st: 'off', speed: 0 };
  if (device.status === 'unknown') return { st: 'off', speed: 0 };
  return speed > 3 ? { st: 'move', speed } : { st: 'park', speed: 0 };
}

export const ST = {
  move: { label: 'Движется', tag: 'tag tag-accent', dot: '#01a586' },
  park: { label: 'Стоянка', tag: 'tag tag-accent-2', dot: '#0c7fc3' },
  off: { label: 'Не на связи', tag: 'tag tag-neutral', dot: '#98989b' },
};

export function fuelLevel(position) {
  const a = position?.attributes ?? {};
  const value = a.fuel ?? a.fuelLevel ?? a.fuel1 ?? null;
  return value == null ? null : Math.round(value);
}

export function formatTime(value) {
  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

export function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// локальная дата YYYY-MM-DD (toISOString даёт UTC и сдвигает день)
export function localDate(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}
