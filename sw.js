const CACHE_NAME = 'gymscience-pwa-v2';

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.svg',
  './brand/logo.jpg',
  './brand/logo.svg',
  './brand/ai-coach.jpg',
  './brand/push.jpg',
  './brand/pull.jpg',
  './brand/legs.jpg'
];

// Instala el Service Worker y pre-cachea el app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_URLS).catch((err) => {
          console.warn('Pre-cache warning en algunos recursos:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Limpia cachés antiguas y toma el control inmediatamente
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Estrategia de respuesta inteligente para funcionamiento 100% Offline
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Solo interceptar peticiones GET
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Ignorar esquemas que no sean http o https (ej. chrome-extension:)
  if (!url.protocol.startsWith('http')) return;

  // 1. Peticiones de navegación (cuando el usuario entra o recarga la página)
  // Intentar red primero para obtener la versión más reciente, pero si no hay internet (offline), servir index.html de la caché
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          return (await caches.match('./index.html')) || (await caches.match('./'));
        })
    );
    return;
  }

  // 2. Videos o GIFs de ejercicios alojados en CDNs externos (jsdelivr, github, etc.)
  // Si no hay conexión o falla la red, se devuelve 503 limpio para que el UI muestre el estado offline sin errores feos
  if (
    url.hostname.includes('jsdelivr.net') ||
    url.hostname.includes('github') ||
    url.pathname.endsWith('.gif') ||
    url.pathname.endsWith('.mp4')
  ) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(null, {
          status: 503,
          statusText: 'Offline - Video o GIF requiere conexión a internet'
        });
      })
    );
    return;
  }

  // 3. Recursos estáticos (JS, CSS, imágenes locales, SVG, Google Fonts)
  // Estrategia: Cache First con fallback a Red y guardado dinámico en caché
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((networkResponse) => {
          // Solo cachear respuestas válidas (200 o opacas de CDNs de fuentes)
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Fallback para recursos no disponibles offline
          return new Response('', { status: 408, headers: { 'Content-Type': 'text/plain' } });
        });
    })
  );
});
