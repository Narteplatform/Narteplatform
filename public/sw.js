/* eslint-disable */
// Kill-switch Service Worker. Si auto-unregistra al primo update.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', async () => {
  try {
    if (self.registration) {
      try { await self.registration.unregister(); } catch (_e) {}
    }
    if (self.caches) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    const clientsList = await self.clients.matchAll({ type: 'window' });
    clientsList.forEach((c) => c.navigate(c.url));
  } catch (_e) {}
});
