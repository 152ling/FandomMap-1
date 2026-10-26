const CACHE_NAME = 'fanmap-v0.0.3';
const ASSETS = [
  './',
  '/index.html',
  '/Concert.html',
  '/SupportDetail.html',
  '/Bookmark.html',
  '/Profile.html',
  '/css/style.css',
  '/js/action.js',
  '/js/bookmark.js',
  '/js/color.js',
  '/js/common.js',
  '/js/concert.js',
  '/js/profile.js',
  '/js/state.js',
  '/js/support-data.js',
  '/js/support.js',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4.3.0',
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});