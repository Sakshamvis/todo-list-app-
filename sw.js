var CACHE_NAME = 'desk-eco-v5';
var FILES = [
    './',
    './index.html',
    './css/style.css',
    './css/scene.css',
    './css/todo.css',
    './js/particles.js',
    './js/audio.js',
    './js/scene.js',
    './js/app.js',
    './manifest.json'
];

self.addEventListener('install', function (e) {
    e.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            return cache.addAll(FILES);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', function (e) {
    e.waitUntil(
        caches.keys().then(function (names) {
            return Promise.all(
                names.filter(function (n) { return n !== CACHE_NAME; })
                     .map(function (n) { return caches.delete(n); })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', function (e) {
    e.respondWith(
        caches.match(e.request).then(function (cached) {
            return cached || fetch(e.request).then(function (response) {
                if (response && response.status === 200 && response.type === 'basic') {
                    var clone = response.clone();
                    caches.open(CACHE_NAME).then(function (cache) {
                        cache.put(e.request, clone);
                    });
                }
                return response;
            });
        })
    );
});
