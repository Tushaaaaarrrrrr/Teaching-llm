// GENz IITian LMS — Service Worker (Push Notifications & Offline Engine)
// This file is merged into the main PWA service worker by next-pwa.

const CACHE_NAME = 'genz-offline-shell-v1';
const PRECACHE_URLS = [
  '/offline.html',
  '/pdf.worker.min.mjs',
  '/favicon.ico',
  '/logo.png',
];

// 1. INSTALL: Precache critical offline fallback and PDF worker
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_URLS).catch(function (err) {
        console.warn('Precache failed:', err);
      });
    })
  );
  self.skipWaiting();
});

// 2. ACTIVATE: Claim clients immediately and clean old caches
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          if (key !== CACHE_NAME && key.startsWith('genz-offline-')) {
            return caches.delete(key);
          }
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// 3. FETCH: Intercept navigations & offline assets so browser never shows dinosaur
self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Intercept Navigation requests (address bar, reload, client navigation)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(function (response) {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(async function () {
          // Device is offline!
          // A. Try exact URL match from cache
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) {
            return cachedResponse;
          }

          // B. Match /downloads or /dashboard routes
          if (url.pathname.startsWith('/downloads')) {
            const cachedDownloads = await caches.match('/downloads');
            if (cachedDownloads) return cachedDownloads;
          }
          if (url.pathname.startsWith('/dashboard')) {
            const cachedDash = await caches.match('/dashboard');
            if (cachedDash) return cachedDash;
          }

          // C. Return styled offline fallback page
          const offlinePage = await caches.match('/offline.html');
          if (offlinePage) {
            return offlinePage;
          }

          return new Response('You are offline. Please reconnect.', {
            headers: { 'Content-Type': 'text/html' },
          });
        })
    );
    return;
  }

  // Intercept PDF worker script so PDF rendering never fails offline
  if (url.pathname === '/pdf.worker.min.mjs') {
    event.respondWith(
      caches.match(event.request).then(function (cached) {
        if (cached) return cached;
        return fetch(event.request).then(function (response) {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(event.request, clone);
            });
          }
          return response;
        });
      })
    );
    return;
  }
});

// 4. PUSH NOTIFICATIONS
self.addEventListener('push', function (event) {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'New Announcement', body: event.data.text() };
  }

  const title = data.title || 'GENz IITian';
  const options = {
    body: data.body || 'You have a new announcement.',
    icon: data.icon || '/android-chrome-192x192.png',
    badge: data.badge || '/favicon-32x32.png',
    tag: data.tag || 'announcement',
    image: data.imageUrl || data.image || null,
    actions: data.ctaText ? [{ action: 'cta', title: data.ctaText }] : [],
    data: { url: data.ctaLink || data.url || '/announcements' },
    vibrate: [200, 100, 200],
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 5. NOTIFICATION CLICK
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : '/announcements';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
