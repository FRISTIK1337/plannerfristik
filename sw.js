const CACHE_NAME = 'fristik-planner-v4-repaired';
const APP_SHELL = ["./","./index.html","./style.css","./app.js","./manifest.webmanifest","./assets/favicon.svg","./assets/app-icon-192.png","./assets/app-icon-512.png","./assets/images/cases/basic.jpg","./assets/images/cases/epic.jpg","./assets/images/cases/legendary.jpg","./assets/images/cases/rare.jpg","./assets/images/characters/dio.jpg","./assets/images/characters/jotaro.jpg","./assets/images/embedded/embedded-01.png","./assets/images/embedded/embedded-02.jpg","./assets/images/embedded/embedded-03.jpg","./assets/images/embedded/embedded-04.jpg","./assets/images/embedded/embedded-05.jpg","./assets/images/embedded/embedded-06.jpg","./assets/images/embedded/embedded-07.jpg","./assets/images/embedded/embedded-08.jpg","./assets/images/embedded/embedded-09.jpg","./assets/images/embedded/embedded-10.jpg","./assets/images/embedded/embedded-11.svg","./assets/images/embedded/embedded-12.svg","./assets/images/embedded/embedded-13.jpg","./assets/images/embedded/embedded-14.jpg","./assets/images/embedded/embedded-15.jpg","./assets/images/embedded/embedded-16.jpg","./assets/images/embedded/embedded-17.jpg","./assets/images/embedded/embedded-18.jpg","./assets/images/embedded/embedded-19.jpg","./assets/images/embedded/embedded-20.jpg","./assets/images/embedded/embedded-21.jpg","./assets/images/forms/gohan-beast.jpg","./assets/images/forms/goku-blue.jpg","./assets/images/forms/goku-ssj.jpg","./assets/images/forms/goku-ultra-instinct.jpg","./assets/images/forms/luffy-gear2.jpg","./assets/images/forms/luffy-gear4.jpg","./assets/images/forms/luffy-gear5.jpg","./assets/images/forms/naruto-kurama.jpg","./assets/images/forms/naruto-six-paths.jpg","./assets/images/forms/vegeta-blue.jpg","./assets/images/forms/vegeta-ego.jpg","./assets/images/forms/zoro-ashura.jpg","./assets/images/forms/zoro-king-of-hell.jpg","./assets/images/stands/star-platinum-world.jpg","./assets/images/stands/star-platinum.jpg","./assets/images/stands/the-world-over-heaven.jpg","./assets/images/stands/the-world.jpg"];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(response => {
      const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy)); return response;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if (response && response.ok) { const copy=response.clone(); caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy)); } return response;
  })));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients => {
    for (const client of clients) { if ('focus' in client) return client.focus(); }
    if (self.clients.openWindow) return self.clients.openWindow('./');
  }));
});
