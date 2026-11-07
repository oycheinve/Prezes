/* Service worker gry „Prezes” – instalacja jako aplikacja (PWA) i działanie bez sieci.
   Strona (index.html): najpierw sieć, żeby każda nowa wersja z Vercela była od razu widoczna;
   bez sieci – ostatnia zapisana kopia. Ikony i manifest: z pamięci podręcznej.
   Zewnętrzne biblioteki (Tailwind, fonty): kopia z pamięci, odświeżana w tle. */
const VERSION = 'prezes-v3';   // nowa wersja = nowe ikony (stara pamięć jest kasowana)
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png', '/icons/apple-touch-icon.png', '/icons/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Strona gry: sieć, a bez zasięgu – zapisana kopia
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put('/index.html', copy)); return res; })
        .catch(() => caches.match('/index.html').then((r) => r || caches.match('/')))
    );
    return;
  }

  // Pliki gry z tej samej domeny: z pamięci, w razie braku – z sieci
  if (url.origin === self.location.origin) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    })));
    return;
  }

  // Tailwind i fonty: kopia z pamięci od razu, odświeżenie w tle
  event.respondWith(caches.open(VERSION).then((cache) => cache.match(req).then((hit) => {
    const net = fetch(req).then((res) => { if (res.ok || res.type === 'opaque') cache.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  })));
});
