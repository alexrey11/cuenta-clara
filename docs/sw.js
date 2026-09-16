const CACHE_NAME = 'cuenta-clara-v2';
const BASE_URL = '/cuenta-clara';

const urlsToCache = [
    `${BASE_URL}/`,
    `${BASE_URL}/index.html`,
    `${BASE_URL}/manifest.json`,
    `${BASE_URL}/icon-192.png`,
    `${BASE_URL}/icon-512.png`
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});