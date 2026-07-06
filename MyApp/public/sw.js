// Deliberately does not cache anything. This app is online-only by design (see
// MyApp/src/lib/query-client.tsx) — a driver's Tolo recovery/payment data must always be
// current, never served stale from a cache. This service worker exists purely so the browser
// considers the app installable (Chrome/Android's "Add to Home Screen" criteria include an
// active service worker); every fetch just passes straight through to the network.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
