/* Retire the previous offline shell; HTML now comes from the network. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => /^sbm-contech/.test(key)).map(key => caches.delete(key)));
    await self.clients.claim();
    await self.registration.unregister();
  })());
});
