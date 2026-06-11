'use strict';

function randomSeed(){
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.prototype.map.call(a, function(b){ return b.toString(16).padStart(2, '0') }).join('');
}

function sha256hex(str){
  if(!window.crypto || !crypto.subtle) return Promise.resolve('(hashing unavailable in this context)');
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(function(buf){
    return Array.prototype.map.call(new Uint8Array(buf), function(b){ return b.toString(16).padStart(2, '0') }).join('');
  });
}

window.fairNewSeed = function(){
  const log = store.get('bj-fair', []);
  log.forEach(function(e){ e.active = false });
  const seed = randomSeed();
  const entry = { h: '', s: seed, t: Date.now(), active: true };
  log.push(entry);
  while(log.length > 12) log.shift();
  store.set('bj-fair', log);
  sha256hex(seed).then(function(hx){
    const cur = store.get('bj-fair', []);
    const m = cur.find(function(x){ return x.s === seed });
    if(m){ m.h = hx; store.set('bj-fair', cur) }
    if(ovFair.classList.contains('show')) window.renderFair();
  });
  return seed;
};

window.renderFair = function(){
  const log = store.get('bj-fair', []).slice().reverse();
  let h = '<p>Every shoe is shuffled from a random seed. The seed’s SHA-256 hash is committed while the shoe is live, and the seed itself is revealed once the shoe retires — so you can re-run the shuffle and confirm the deck was fixed before any card was dealt.</p>' +
    '<p style="font:400 11px var(--sans);color:#a99c78">Verify it yourself: hash = SHA-256(seed); shuffle = Fisher-Yates over the ordered ' +
    S.rules.decks + '-deck shoe driven by mulberry32(xmur3(seed)) — both functions ship in js/utils.js. Daily-challenge shoes use the public date seed instead.</p>';
  if(!log.length) h += '<p>No shoes logged yet — deal a hand.</p>';
  log.forEach(function(e){
    h += '<div class="fair-e' + (e.active ? ' on' : '') + '"><b>' + (e.active ? 'Live shoe' : new Date(e.t).toLocaleString()) + '</b>' +
      '<span>hash: ' + (e.h || 'computing…') + '</span>' +
      (e.active ? '<span>seed: revealed when this shoe retires</span>' : '<span>seed: ' + e.s + '</span>') +
      '</div>';
  });
  fairBody.innerHTML = h;
};
