'use strict';

const CACHE = 'royal-casino-v5';
const ASSETS = [
  '.', 'index.html', 'manifest.json', 'icon.svg',
  'blackjack/', 'blackjack/index.html', 'blackjack/css/styles.css',
  'blackjack/js/utils.js', 'blackjack/js/dom.js', 'blackjack/js/audio.js', 'blackjack/js/cards.js',
  'blackjack/js/state.js', 'blackjack/js/sidebets.js', 'blackjack/js/render.js', 'blackjack/js/fx.js',
  'blackjack/js/strategy.js', 'blackjack/js/coach.js', 'blackjack/js/game.js', 'blackjack/js/daily.js',
  'blackjack/js/achieve.js', 'blackjack/js/trainer.js', 'blackjack/js/sim.js', 'blackjack/js/fair.js',
  'blackjack/js/run.js', 'blackjack/js/main.js',
  'pool/', 'pool/index.html', 'pool/css/pool.css',
  'pool/js/wallet.js', 'pool/js/physics.js', 'pool/js/ai.js', 'pool/js/game.js',
  'poker/', 'poker/index.html', 'poker/css/poker.css',
  'poker/js/wallet.js', 'poker/js/cards.js', 'poker/js/eval.js', 'poker/js/engine.js',
  'poker/js/ai.js', 'poker/js/game.js',
  'slots/', 'slots/index.html', 'slots/css/slots.css',
  'slots/js/wallet.js', 'slots/js/engine.js', 'slots/js/game.js'
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
        if(n.ok){
          const cl = n.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, cl) });
        }
        return n;
      })
      .catch(function(){ return caches.match(e.request, { ignoreSearch: true }) })
  );
});
