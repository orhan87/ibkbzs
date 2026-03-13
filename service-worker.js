// GÖVDAĞ İBKB — Service Worker
// Offline desteği + cache stratejisi

const CACHE_ADI = 'ibkb-v1';
const CACHE_DOSYALAR = [
  '/login.html',
  '/index.html',
  '/404.html',
  '/manifest.json'
];

// Install: temel dosyaları cache'e al
self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE_ADI).then(function(cache){
      return cache.addAll(CACHE_DOSYALAR);
    })
  );
  self.skipWaiting();
});

// Activate: eski cache'leri temizle
self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE_ADI; })
            .map(function(k){ return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Network-first, offline fallback
self.addEventListener('fetch', function(e){
  // Sadece GET isteklerini handle et
  if(e.request.method !== 'GET') return;
  // Supabase API isteklerini bypass et (her zaman network)
  if(e.request.url.includes('supabase.co')) return;

  e.respondWith(
    fetch(e.request)
      .then(function(res){
        // Başarılı network cevabını cache'e de yaz
        if(res && res.status === 200 && res.type === 'basic'){
          var resKopyasi = res.clone();
          caches.open(CACHE_ADI).then(function(cache){
            cache.put(e.request, resKopyasi);
          });
        }
        return res;
      })
      .catch(function(){
        // Network yoksa cache'den sun
        return caches.match(e.request).then(function(cached){
          return cached || caches.match('/login.html');
        });
      })
  );
});
