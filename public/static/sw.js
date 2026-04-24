// ============================================================
//  PetitesAnnoncesIvoire.com — Service Worker PWA
// ============================================================
const CACHE_NAME = 'pai-cache-v2'
const STATIC_ASSETS = [
  '/',
  '/static/app.js',
  '/static/styles.css',
  '/static/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css',
]

// ── Installation : mise en cache des ressources statiques ────
self.addEventListener('install', (e) => {
  self.skipWaiting()
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(STATIC_ASSETS.filter(url => !url.startsWith('https://cdn')))
    ).catch(() => {})
  )
})

// ── Activation : nettoyage des anciens caches ────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// ── Fetch : stratégie network-first pour les API, cache-first pour static ──
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)

  // Ignorer les requêtes non-GET et les API
  if (e.request.method !== 'GET') return
  if (url.pathname.startsWith('/api/')) return

  // Pour les assets statiques : cache-first
  if (url.pathname.startsWith('/static/') || url.pathname === '/') {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached
        return fetch(e.request).then(res => {
          if (res && res.status === 200) {
            const clone = res.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone))
          }
          return res
        }).catch(() => caches.match('/'))
      })
    )
    return
  }

  // Pour les annonces directes /annonce/xxx : renvoyer la SPA
  if (url.pathname.startsWith('/annonce/')) {
    e.respondWith(
      caches.match('/').then(cached => cached || fetch('/'))
    )
    return
  }

  // Réseau sinon
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  )
})
