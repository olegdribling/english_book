// Минимальный Service Worker — нужен только для PWA install prompt
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
