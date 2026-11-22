// Network-only navigation. Rider records, session data and Flutter assets
// retain their original response and caching policies.
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  const {request} = event;
  const url = new URL(request.url);
  if (request.method === 'GET' && request.mode === 'navigate' &&
      url.origin === self.location.origin && url.pathname === '/bp/') {
    event.respondWith(fetch(request));
  }
});
