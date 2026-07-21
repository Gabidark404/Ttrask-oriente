// public/sw.js — Service Worker para PWA + Push
// TTRAKS ORIENTE v2.0

const CACHE_NAME = 'ttraks-v2';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    })
  );
  event.waitUntil(clients.claim());
});

// Fetch: Network-first for API, Cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and API requests 
  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;

  // For navigation requests: network-first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/')))
    );
    return;
  }

  // For fonts and static assets: cache-first
  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com' ||
    url.pathname.match(/\.(js|css|png|jpg|svg|ico|woff2?)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }
});

// Handle push notifications
self.addEventListener('push', (event) => {
  let payload = {
    title: 'TTRAKS ORIENTE',
    body: 'Nueva notificación del sistema',
    icon: '/icon-192.png',
    url: '/',
    tag: 'ttraks-notification',
  };

  if (event.data) {
    try {
      payload = { ...payload, ...JSON.parse(event.data.text()) };
    } catch (e) {
      payload.body = event.data.text();
    }
  }

  const options = {
    body: payload.body,
    icon: payload.icon || '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.tag || 'ttraks-notification',
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url: payload.url || '/' },
    actions: [
      { action: 'open', title: 'Abrir App' },
      { action: 'dismiss', title: 'Cerrar' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
