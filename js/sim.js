'use strict';

function simulate(numHands, R, onProgress, onDone){
  let net = 0, wins = 0, losses = 0, pushes = 0, bjs = 0, hands = 0;
  let shoe = [];
  function newShoeL(){
    shoe = [];
    for(let d = 0; d < R.decks; d++)
      for(const s of SUITS)
        for(const r of RANKS)
          shoe.push({ r: r, s: s });
    for(let i = shoe.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      const t = shoe[i]; shoe[i] = shoe[j]; shoe[j] = t;
    }
  }
  newShoeL();
  const cut = Math.max(15, Math.round(R.decks * 52 * 0.25));

  function playOne(){
    const p = [shoe.pop()], d = [shoe.pop()];
    p.push(shoe.pop()); d.push(shoe.pop());
    const up = cardVal(d[0]);
    const dBJ = handValue(d).total === 21;
    const pBJ = handValue(p).total === 21;
    if(dBJ && pBJ){ pushes++; return 0 }
    if(R.peek && up >= 10 && dBJ){ losses++; return -1 }
    if(pBJ){
      if(dBJ){ pushes++; return 0 }
      wins++; bjs++; return R.bjPay;
    }
    const arr = [{ cards: p, bet: 1, done: false, fromSplit: false, surr: false, bust: false, aces: false }];
    let splitDone = false;
    for(let i = 0; i < arr.length; i++){
      const h = arr[i];
      if(h.cards.length === 1){
        h.cards.push(shoe.pop());
        if(h.aces) h.done = true;
      }
      while(!h.done){
        const v = handValue(h.cards);
        if(v.total > 21){ h.bust = true; h.done = true; break }
        if(v.total === 21){ h.done = true; break }
        const isPair = h.cards.length === 2 && cardVal(h.cards[0]) === cardVal(h.cards[1]);
        const act = bookAction(
          { total: v.total, soft: v.soft, pair: isPair ? cardVal(h.cards[0]) : 0 },
          up,
          {
            canD: h.cards.length === 2 && (!h.fromSplit || R.das),
            canSp: isPair && !splitDone,
            canSu: h.cards.length === 2 && !h.fromSplit && arr.length === 1
          }
        );
        if(act === 'Stand') h.done = true;
        else if(act === 'Hit') h.cards.push(shoe.pop());
        else if(act === 'Double'){
          h.bet = 2;
          h.cards.push(shoe.pop());
          if(handValue(h.cards).total > 21) h.bust = true;
          h.done = true;
        }
        else if(act === 'Surrender'){ h.surr = true; h.done = true }
        else if(act === 'Split'){
          splitDone = true;
          const c2 = h.cards.pop();
          const aces = h.cards[0].r === 'A';
          h.fromSplit = true; h.aces = aces;
          arr.push({ cards: [c2], bet: 1, done: false, fromSplit: true, surr: false, bust: false, aces: aces });
          h.cards.push(shoe.pop());
          if(aces) h.done = true;
          else if(handValue(h.cards).total === 21) h.done = true;
        }
        else h.done = true;
      }
    }
    const anyLive = arr.some(function(h){ return !h.bust && !h.surr });
    if(anyLive){
      while(true){
        const dv = handValue(d);
        if(dv.total < 17 || (R.h17 && dv.total === 17 && dv.soft)) d.push(shoe.pop());
        else break;
      }
    }
    const dvT = handValue(d).total, dBust = dvT > 21;
    const dealerBJ2 = d.length === 2 && dvT === 21;
    let r = 0;
    for(const h of arr){
      if(h.surr){ r -= 0.5; losses++; continue }
      if(h.bust){ r -= h.bet; losses++; continue }
      if(dealerBJ2){ r -= h.bet; losses++; continue }
      const t = handValue(h.cards).total;
      if(dBust || t > dvT){ r += h.bet; wins++ }
      else if(t < dvT){ r -= h.bet; losses++ }
      else pushes++;
    }
    return r;
  }

  (function playChunk(){
    const end = Math.min(hands + 20000, numHands);
    for(; hands < end; hands++){
      if(shoe.length < cut) newShoeL();
      net += playOne();
    }
    if(onProgress) onProgress(hands, numHands, net);
    if(hands < numHands) setTimeout(playChunk, 0);
    else onDone({ hands: hands, net: net, wins: wins, losses: losses, pushes: pushes, bjs: bjs });
  })();
}

window.simExtras = function(){
  const el = $id('simSec');
  if(!el) return;
  el.innerHTML = '<div class="set-sec"><div class="set-label">Simulator — perfect basic strategy under the current rules</div><div class="pillrow">' +
    '<button class="pill" data-train="sim-10000">10k rounds</button>' +
    '<button class="pill" data-train="sim-100000">100k rounds</button>' +
    '<button class="pill" data-train="sim-500000">500k rounds</button>' +
    '</div><div id="simOut" style="font:500 12px/1.6 var(--sans);color:#d9cba2;margin-top:8px;min-height:16px"></div></div>';
};

window.simClick = function(k){
  if(k.indexOf('sim-') !== 0) return;
  const n = +k.slice(4);
  const out = $id('simOut');
  if(!out) return;
  out.textContent = 'Dealing…';
  simulate(n, Object.assign({}, S.rules), function(done, total){
    out.textContent = 'Dealing… ' + Math.round(100 * done / total) + '%';
  }, function(r){
    const edge = -r.net / r.hands * 100;
    const tot = r.wins + r.losses + r.pushes;
    out.innerHTML = '<b>' + r.hands.toLocaleString() + '</b> rounds played · simulated house edge <b>' + edge.toFixed(2) + '%</b> (rule-table estimate ' + houseEdge().toFixed(2) + '%)<br>' +
      'hands: win ' + (100 * r.wins / tot).toFixed(1) + '% · lose ' + (100 * r.losses / tot).toFixed(1) + '% · push ' + (100 * r.pushes / tot).toFixed(1) + '% · ' + r.bjs.toLocaleString() + ' blackjacks<br>' +
      'Betting $25 a round, expect about ' + fmt(-(edge / 100) * 25 * 100) + ' per 100 rounds in the long run.';
  });
};
