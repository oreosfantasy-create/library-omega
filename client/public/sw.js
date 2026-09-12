const CACHE_NAME = 'omega-library-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/library-omega-cat.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Cache dinámico para libros y portadas de S3/Forge
  const isBookOrCover = url.pathname.includes('/manus-storage/') || 
                       url.pathname.includes('s3.amazonaws.com');

  if (isBookOrCover) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        
        return fetch(event.request).then((response) => {
          // Solo cachear respuestas válidas
          if (!response || response.status !== 200 || response.type !== 'basic' && response.type !== 'cors') {
            return response;
          }
          
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          
          return response;
        });
      })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
