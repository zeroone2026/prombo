// Prombo Progressive Web App Service Worker
const CACHE_NAME = 'prombo-v5';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/manifest.json?v=3',
  '/favicon.svg',
  '/favicon.ico',
  '/icon.svg',
  '/icon.svg?v=3',
  '/favicon-32x32.png',
  '/favicon-32x32.png?v=3',
  '/icon-192.png',
  '/icon-192.png?v=3',
  '/icon-512.png',
  '/icon-512.png?v=3',
  '/apple-touch-icon.png',
  '/apple-touch-icon.png?v=3',
  '/maskable-icon-512.png',
  '/maskable-icon-512.png?v=3',
  '/logo.png',
];

// 1. Install Event: Cache Core Shell Assets & Skip Waiting Immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .catch((err) => console.warn('[PWA SW] Precache warning:', err))
  );
});

// 2. Activate Event: Clean up outdated caches immediately and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              console.log('[PWA SW] Deleting legacy cache:', name);
              return caches.delete(name);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// Message listener to trigger cache purge or skip waiting from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n))));
  }
});

// 3. Fetch Event: Network-First for Navigation & Application Scripts, Stale-While-Revalidate for Static Media
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Ignore external API endpoints (Supabase, Google Fonts, Ads, Analytics) to prevent caching dynamic data
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api') ||
    url.pathname.includes('/rest/v1/') ||
    url.pathname.includes('/auth/v1/')
  ) {
    return;
  }

  // HTML Page Navigation: Network-First with Offline Fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          const fallback = await caches.match('/index.html');
          return fallback || caches.match('/');
        })
    );
    return;
  }

  // Application Scripts (JS / Assets): Network-First to guarantee security patches & auth logic
  if (url.pathname.endsWith('.js') || url.pathname.includes('/assets/') || url.pathname.includes('.ts')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // PWA App Icons & Manifest: Strictly Network-First to guarantee immediate icon updates & prevent stale cache
  const isIconOrManifest =
    url.pathname.includes('icon-192') ||
    url.pathname.includes('icon-512') ||
    url.pathname.includes('apple-touch-icon') ||
    url.pathname.includes('maskable-icon') ||
    url.pathname.includes('favicon') ||
    url.pathname.includes('icon.svg') ||
    url.pathname.includes('manifest.json') ||
    url.pathname.includes('logo.png');

  if (isIconOrManifest) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Other Static Assets (Images, Fonts, CSS): Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
