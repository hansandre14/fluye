/* Fluye PWA v1: only public, explicitly listed resources enter Cache Storage. */
const CACHE = 'fluye-pwa-public-v1';
const PUBLIC_FILES = [
  '/offline.html', '/instalar.html', '/pwa/offline.css', '/pwa/offline.js',
  '/manifest.webmanifest', '/icons/fluye.svg', '/icons/fluye-192.png',
  '/icons/fluye-512.png', '/icons/fluye-maskable-512.png', '/icons/apple-touch-icon.png',
];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PUBLIC_FILES)));
  // A new version waits for existing app windows to close before taking control.
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('fluye-pwa-public-') && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  // Never intercept mutations, API traffic, or requests to another origin.
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => {
      const cache = await caches.open(CACHE);
      const publicPage = !url.search && PUBLIC_FILES.includes(url.pathname)
        ? await cache.match(url.pathname) : null;
      return publicPage || (await cache.match('/offline.html')) || Response.error();
    }));
    return;
  }
  if (!url.search && PUBLIC_FILES.includes(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      return (await cache.match(url.pathname)) || fetch(request);
    })());
  }
});
