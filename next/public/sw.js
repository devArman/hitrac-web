// «Самоликвидатор»: у прежнего кабинета был service worker. Эта версия
// сносит его регистрацию и кеши у всех старых клиентов, после чего страница
// перезагружается уже без воркера. Новое приложение SW не использует.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((c) => c.navigate(c.url));
  })());
});
