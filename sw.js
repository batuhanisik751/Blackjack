'use strict';

const CACHE = 'royal-bj-v1';
const ASSETS = [
  '.', 'index.html', 'css/styles.css', 'manifest.json', 'icon.svg',
  'js/utils.js', 'js/dom.js', 'js/audio.js', 'js/cards.js', 'js/state.js',
  'js/sidebets.js', 'js/render.js', 'js/fx.js', 'js/strategy.js', 'js/coach.js',
  'js/game.js', 'js/daily.js', 'js/achieve.js', 'js/trainer.js', 'js/sim.js',
  'js/fair.js', 'js/main.js'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE)
      .then(function(c){ return c.addAll(ASSETS) })
      .then(function(){ return self.skipWaiting() })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys()
      .then(function(ks){ return Promise.all(ks.filter(function(k){ return k !== CACHE }).map(function(k){ return caches.delete(k) })) })
      .then(function(){ return self.clients.claim() })
  );
});

self.addEventListener('fetch', function(e){
  if(e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(function(n){
        const cl = n.clone();
        caches.open(CACHE).then(function(c){ c.put(e.request, cl) });
        return n;
      })
      .catch(function(){ return caches.match(e.request, { ignoreSearch: true }) })
  );
});
