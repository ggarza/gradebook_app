/* Gradebook — offline support.
   Network first: when online, always fetch the latest app from the server and refresh the saved copy.
   When offline (or the network takes more than 4 seconds), use the saved copy. No student data is ever cached here;
   grades live only in the browser's local storage.
   Other apps on the same github.io site share this origin's caches, so only caches named gradebook-… are ever touched. */
const PREFIX = 'gradebook-';
const CACHE = PREFIX + 'v1';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    /* Keeps refreshing the saved copy even if the page has already been given the cached one. */
    const net = fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()).catch(() => {}); return res; });
    e.waitUntil(net.catch(() => {}));
    try {
      return await Promise.race([
        net,
        new Promise((_, reject) => setTimeout(() => reject(new Error('slow')), 4000))
      ]);
    } catch (err) {
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate') return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
      return Response.error();
    }
  })());
});
