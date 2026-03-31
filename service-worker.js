/* Manifest version: XYk3044d */
self.importScripts('./service-worker-assets.js');

const cacheNamePrefix = 'offline-cache-';
const cacheName = `${cacheNamePrefix}${self.assetsManifest.version}`;

const offlineAssetsInclude = [
    /\.dll$/, /\.pdb$/, /\.wasm$/, /\.html$/, /\.js$/, /\.json$/,
    /\.css$/, /\.woff2?$/, /\.png$/, /\.jpe?g$/, /\.gif$/, /\.ico$/,
    /\.blat$/, /\.dat$/, /\.webmanifest$/
];

const offlineAssetsExclude = [/^service-worker\.js$/];

self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const cache = await caches.open(cacheName);

        const requests = self.assetsManifest.assets
            .filter(a => offlineAssetsInclude.some(r => r.test(a.url)))
            .filter(a => !offlineAssetsExclude.some(r => r.test(a.url)))
            .map(a => new Request(a.url, {
                integrity: a.hash,
                cache: 'no-cache'
            }));

        await cache.addAll(requests);
        await cache.add('/index.html');

        self.skipWaiting();
    })());
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(
            keys.filter(k => k.startsWith(cacheNamePrefix) && k !== cacheName)
                .map(k => caches.delete(k))
        );

        await self.clients.claim();
    })());
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    event.respondWith((async () => {
        const cache = await caches.open(cacheName);

        const cached = await cache.match(event.request, { ignoreSearch: true });
        if (cached) return cached;

        if (event.request.mode === 'navigate') {
            const index = await cache.match('/index.html');
            if (index) return index;
        }

        try {
            return await fetch(event.request);
        } catch {
            return new Response('', { status: 503 });
        }
    })());
});
