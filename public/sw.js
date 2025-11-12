// Service Worker for handling notifications
self.addEventListener('push', function(event) {
  const data = event.data?.json() ?? {};
  const title = data.title || 'Time Audit Check-in';
  const options = {
    body: data.body || 'What have you been working on?',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [200, 100, 200],
    tag: 'time-audit-notification',
    requireInteraction: false,
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});
