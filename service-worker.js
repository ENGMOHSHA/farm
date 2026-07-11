// ملف service-worker.js المحدث لتجنب خطأ 404 ومشاكل تعليق الأزرار
const CACHE_NAME = 'farm-expenses-v3';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // تمرير الطلبات مباشرة للإنترنت دون كاش معقد يسبب 404
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});