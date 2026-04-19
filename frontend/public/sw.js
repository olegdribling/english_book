// Минимальный Service Worker — нужен для PWA install prompt на Android Chrome
const CACHE = 'litgrade-v1';

// При установке — кэшируем основные ресурсы
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll(['/', '/manifest.json', '/icon-192.png', '/icon-512.png'])
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  self.clients.claim();
});

// Сеть в приоритете, фолбэк на кэш
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
