// Клиент hitrac-api (/v2): наш JWT, устройства и позиции из нашей БД,
// Traccar-специфика (отчёты, команды, геозоны) — через прокси нашего бэкенда.

const TOKEN_KEY = 'ht_token';

export async function api(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(`/v2${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (response.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    throw new Error('unauthorized');
  }
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try { message = (await response.json()).message ?? message; } catch { /* not json */ }
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }
  return response;
}

export const getJson = (path) => api(path).then((r) => r.json());

export const getSession = () => {
  if (!localStorage.getItem(TOKEN_KEY)) return Promise.reject(new Error('no token'));
  return getJson('/me');
};

export const login = async (email, password) => {
  const response = await fetch('/v2/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error('bad credentials');
  const result = await response.json();
  localStorage.setItem(TOKEN_KEY, result.accessToken);
  return result.user;
};

export const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  return Promise.resolve();
};

export const sendCommand = (deviceId, type) =>
  api('/commands/send', { method: 'POST', body: JSON.stringify({ deviceId, type }) });

export const updateMe = (patch) =>
  api('/me', { method: 'PATCH', body: JSON.stringify(patch) }).then((r) => r.json());

export const getDeviceSettings = () => getJson('/device-settings');
export const saveDeviceSettings = (deviceId, settings) =>
  api(`/device-settings/${deviceId}`, { method: 'POST', body: JSON.stringify(settings) }).then((r) => r.json());
export const getAlerts = (params = '') => getJson(`/alerts${params}`);

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

// ── производные значения ──

export const KNOTS_TO_KMH = 1.852;

// человекочитаемые названия тревог Traccar (attributes.alarm)
export const ALARM_NAMES = {
  hardAcceleration: 'резкое ускорение',
  hardBraking: 'резкое торможение',
  hardCornering: 'резкий поворот',
  overspeed: 'превышение скорости',
  powerCut: 'отключение питания',
  powerRestored: 'питание восстановлено',
  lowBattery: 'низкий заряд батареи',
  lowPower: 'низкое питание',
  vibration: 'вибрация',
  tow: 'буксировка',
  sos: 'SOS',
};
export const alarmName = (alarm) => ALARM_NAMES[alarm] ?? alarm ?? '';

// «превышение скорости — 92 км/ч при лимите 60 км/ч»
export function overspeedText(event) {
  const a = event.attributes ?? {};
  const speed = typeof a.speed === 'number' ? Math.round(a.speed * KNOTS_TO_KMH) : null;
  const limit = typeof a.speedLimit === 'number' ? Math.round(a.speedLimit * KNOTS_TO_KMH) : null;
  if (speed != null && limit != null) return `превышение скорости — ${speed} км/ч при лимите ${limit} км/ч`;
  if (limit != null) return `превышение скорости — лимит ${limit} км/ч`;
  return 'превышение скорости';
}

export function vehicleState(device, position) {
  const speed = position ? Math.round(position.speed * KNOTS_TO_KMH) : 0;
  if (device.status !== 'online') return { st: 'off', speed: 0 };
  return speed > 3 ? { st: 'move', speed } : { st: 'park', speed: 0 };
}

export const ST = {
  move: { label: 'Движется', tag: 'tag tag-accent', dot: '#01a586' },
  park: { label: 'Стоянка', tag: 'tag tag-accent-2', dot: '#0c7fc3' },
  off: { label: 'Не на связи', tag: 'tag tag-neutral', dot: '#98989b' },
};

export function fuelLiters(position) {
  const value = position?.attributes?.fuelLiters;
  return value == null ? null : Math.round(value);
}

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
