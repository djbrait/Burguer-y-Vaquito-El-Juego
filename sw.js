const CACHE_NAME = 'burguer-vaquito-v6';
const ASSETS = [
  './',
  './index.html',
  './styles.css?v=6',
  './manifest.json',
  './js/audio.js?v=6',
  './js/sprites.js?v=6',
  './js/network.js?v=6',
  './js/game.js?v=6',
  './assets/sprites/atlas.json?v=4',
  './assets/sprites/vaquito.png?v=4',
  './assets/sprites/burguer.png?v=4',
  './assets/sprites/super_vaquito.png?v=4',
  './assets/sprites/super_burguer.png?v=4',
  './assets/sprites/jack.png?v=4',
  './assets/sprites/super_jack.png?v=4',
  './assets/sprites/vaquita.png?v=4',
  './assets/sprites/super_vaquita.png?v=4',
  './assets/sprites/flex.png?v=4',
  './assets/sprites/super_flex.png?v=4',
  './assets/sprites/hater.png?v=4',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
