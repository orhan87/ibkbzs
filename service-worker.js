// GÖVDAĞ İBKB — Service Worker v2
// Offline desteği + cache + push bildirimleri

const CACHE_ADI = 'ibkb-v2';
const CACHE_DOSYALAR = [
  '/login.html',
  '/index.html',
  '/404.html',
  '/manifest.json'
];

// Install
self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE_ADI).then(function(cache){
      return cache.addAll(CACHE_DOSYALAR);
    })
  );
  self.skipWaiting();
});

// Activate
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

// Fetch: Network-first
self.addEventListener('fetch', function(e){
  if(e.request.method !== 'GET') return;
  if(e.request.url.includes('supabase.co')) return;
  e.respondWith(
    fetch(e.request)
      .then(function(res){
        if(res && res.status === 200 && res.type === 'basic'){
          var kopy = res.clone();
          caches.open(CACHE_ADI).then(function(cache){ cache.put(e.request, kopy); });
        }
        return res;
      })
      .catch(function(){
        return caches.match(e.request).then(function(cached){
          return cached || caches.match('/login.html');
        });
      })
  );
});

// Push bildirimi al
self.addEventListener('push', function(e){
  var data = {};
  try{ data = e.data ? e.data.json() : {}; }catch(err){}
  var baslik = data.title || 'İBKB Sorgulama';
  var secenekler = {
    body:    data.body    || 'Bildiriminiz var.',
    icon:    data.icon    || '/manifest.json',
    badge:   data.badge   || '/manifest.json',
    tag:     data.tag     || 'ibkb-bildirim',
    data:    data.url     || '/takip.html',
    requireInteraction: false,
    actions: data.actions || []
  };
  e.waitUntil(self.registration.showNotification(baslik, secenekler));
});

// Bildirime tıklama
self.addEventListener('notificationclick', function(e){
  e.notification.close();
  var url = e.notification.data || '/takip.html';
  e.waitUntil(
    clients.matchAll({type:'window', includeUncontrolled:true}).then(function(list){
      for(var i=0; i<list.length; i++){
        if(list[i].url.includes(self.location.origin)){
          return list[i].focus().then(function(c){ return c.navigate(url); });
        }
      }
      return clients.openWindow(url);
    })
  );
});

// Periyodik bildirim kontrolü (background sync)
self.addEventListener('periodicsync', function(e){
  if(e.tag === 'ibkb-ihracat-kontrol'){
    e.waitUntil(ihracatKontrolEt());
  }
});

async function ihracatKontrolEt(){
  // Client'lara mesaj gönder — kontrol yapmaları için
  var allClients = await clients.matchAll({type:'window', includeUncontrolled:true});
  allClients.forEach(function(c){ c.postMessage({type:'IHRACAT_KONTROL'}); });
}
