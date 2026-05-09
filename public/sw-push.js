// GENz IITian LMS — Push Notification Service Worker
// This file is served from /sw-push.js and handles incoming push events
// even when the browser tab is completely closed.

self.addEventListener('push', function (event) {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: 'New Announcement', body: event.data.text() };
  }

  const title   = data.title  || 'GENz IITian';
  const options = {
    body:    data.body    || 'You have a new announcement.',
    icon:    data.icon    || '/android-chrome-192x192.png',
    badge:   data.badge   || '/favicon-32x32.png',
    tag:     data.tag     || 'announcement',
    data:  { url: data.url || '/announcements' },
    vibrate: [200, 100, 200],
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// When user clicks the notification, open the app at the right page
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : '/announcements';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // If the app is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      // Otherwise, open a new tab
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
