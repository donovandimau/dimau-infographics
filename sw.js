/* Dimau service worker (Workbox 7), copied from the shared Dimau PWA kit. Change APP and PRECACHE only.
   Pages are network-first so a new release reaches returning visitors on the next open; everything
   else is served from cache while refreshing in the background. The /v1/ template files are NOT
   precached here: apps load them directly and must always get the current release. */
importScripts('https://cdn.jsdelivr.net/npm/workbox-sw@7/build/workbox-sw.js');

const APP = 'dimau-infographics';
const VERSION = '2026-11-11-1';            // bump on every release
const PRECACHE = ['/', '/index.html', '/site.css', '/manifest.webmanifest', '/dimau-pwa.js', '/icons/icon.svg'];

workbox.setConfig({ debug: false });
workbox.core.setCacheNameDetails({ prefix: APP, suffix: VERSION });
workbox.precaching.precacheAndRoute(PRECACHE.map(url => ({ url, revision: VERSION })));
workbox.precaching.cleanupOutdatedCaches();

workbox.routing.registerRoute(
  ({ request }) => request.mode === 'navigate',
  new workbox.strategies.NetworkFirst({ cacheName: APP + '-pages', networkTimeoutSeconds: 4 })
);
workbox.routing.registerRoute(
  ({ url }) => url.origin === self.location.origin && (url.pathname.startsWith('/v1/') || url.pathname.startsWith('/templates/') || url.pathname === '/catalog.json'),
  new workbox.strategies.NetworkFirst({ cacheName: APP + '-library', networkTimeoutSeconds: 4 })
);
workbox.routing.registerRoute(
  ({ url }) => /fijian-assistant-api\.vercel\.app|cdn\.jsdelivr\.net|unpkg\.com|fonts\.(googleapis|gstatic)\.com/.test(url.hostname),
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: APP + '-libs',
    plugins: [new workbox.expiration.ExpirationPlugin({ maxEntries: 40, maxAgeSeconds: 30 * 24 * 3600 }), new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] })]
  })
);
workbox.routing.registerRoute(
  ({ request }) => request.destination === 'image' || request.destination === 'font',
  new workbox.strategies.CacheFirst({
    cacheName: APP + '-assets',
    plugins: [new workbox.expiration.ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 24 * 3600 }), new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] })]
  })
);
workbox.routing.registerRoute(({ url }) => /supabase\.co|stripe\.com/.test(url.hostname), new workbox.strategies.NetworkOnly());
self.addEventListener('message', e => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });
workbox.core.clientsClaim();
