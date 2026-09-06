/* Service Worker cho MQTT Control Panel
 * - Nhận push từ server (Web Push) để hiện thông báo nền
 * - Nhận postMessage từ tab để hiện thông báo khi tab đang ở nền
 * - Bắt sự kiện notificationclick để mở trang điều khiển
 */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

function parseData(raw) {
  try {
    return JSON.parse(raw);
  } catch (e) {
    return { title: 'MQTT Message', body: raw };
  }
}

function buildOptions(data, tag) {
  return {
    body: String(data.body || '').slice(0, 500),
    icon: '/mqtt/icon.png',
    badge: '/mqtt/icon.png',
    tag: 'mqtt-' + (tag || 'all'),
    renotify: false,
    data: { url: data.url || '/mqtt' },
  };
}

self.addEventListener('push', (event) => {
  let data = { title: 'MQTT Message', body: 'Có bản tin MQTT mới', topic: null, url: '/mqtt' };
  if (event.data) {
    const parsed = parseData(event.data.text());
    if (parsed && typeof parsed === 'object') data = Object.assign({}, data, parsed);
    else data.body = String(parsed == null ? '' : parsed);
  }
  const options = buildOptions(data, data.topic);
  event.waitUntil(self.registration.showNotification(data.title || 'MQTT Message', options));
});

self.addEventListener('message', (event) => {
  if (!event.data || event.data.type !== 'mqtt-message-notification') return;
  const d = event.data;
  const options = buildOptions(d, d.topic);
  event.waitUntil(self.registration.showNotification(d.title || 'MQTT Message', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/mqtt';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('url' in client) {
          client.navigate(url);
          client.focus();
          return;
        }
      }
      return self.clients.openWindow(url);
    })
  );
});