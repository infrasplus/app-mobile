// Service Worker Principal - NÃO inclui OneSignal aqui
// O OneSignal tem seu próprio SW em /OneSignalSDKWorker.js

const CACHE_NAME = 'sp-cache-v3';
const OFFLINE_URL = '/offline.html';

// Lista de arquivos essenciais para cache
const ESSENTIAL_FILES = [
  '/',
  '/index.html',
  OFFLINE_URL,
  '/icons/icon-512.png',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Cacheando arquivos essenciais');
      return cache.addAll(ESSENTIAL_FILES);
    }).then(() => {
      console.log('[SW] Instalação completa, ativando imediatamente');
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => 
            cacheName !== CACHE_NAME &&
            cacheName !== 'auth-backup-v1' &&
            cacheName !== 'install-bridge' &&
            cacheName !== 'sp-auth-cache-v1'
          )
          .map((cacheName) => {
            console.log('[SW] Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => {
      console.log('[SW] Ativação completa, assumindo controle');
      return self.clients.claim();
    })
  );
});

// Estratégia de cache: Network First com fallback para cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Ignora requisições não-GET
  if (request.method !== 'GET') {
    return;
  }
  
  // Ignora requisições do OneSignal
  if (request.url.includes('onesignal.com')) {
    return;
  }
  
  // Para navegação, usa network-first com fallback offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache da resposta se for bem-sucedida
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          console.log('[SW] Offline, buscando do cache:', request.url);
          const cached = await caches.match(request);
          return cached || caches.match(OFFLINE_URL);
        })
    );
    return;
  }
  
  // Para recursos estáticos
  if (request.destination === 'image' || request.destination === 'font') {
    // Imagens e fontes: cache-first
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        }).catch(() => new Response('', { status: 404 }));
      })
    );
    return;
  }
  // Scripts e CSS: cache-first (arquivos são versionados pelo Vite com hash)
  if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }
});