'use strict';

function bookAction(spec, up, opts){
  const R = S.rules;
  const t = spec.total, soft = spec.soft;
  const enhc10 = !R.peek && up >= 10;
  const canD = opts.canD && !enhc10;
  const canSp = opts.canSp;
  const canSu = R.surrender && opts.canSu;
  if(canSp){
    const p = spec.pair;
    if(p === 11) return (enhc10 && up === 11) ? 'Hit' : 'Split';
    if(p === 8){
      if(R.h17 && up === 11 && canSu) return 'Surrender';
      if(enhc10) return canSu ? 'Surrender' : 'Hit';
      return 'Split';
    }
    if(p === 9) return (up >= 2 && up <= 9 && up !== 7) ? 'Split' : 'Stand';
    if(p === 7) return up <= 7 ? 'Split' : 'Hit';
    if(p === 6) return (up <= 6 && (up >= 3 || R.das)) ? 'Split' : 'Hit';
    if(p === 4) return (R.das && (up === 5 || up === 6)) ? 'Split' : 'Hit';
    if(p === 2 || p === 3) return (up <= 7 && (up >= 4 || R.das)) ? 'Split' : 'Hit';
  }
  if(canSu && !soft){
    if(t === 16 && up >= 9) return 'Surrender';
    if(t === 15 && up === 10) return 'Surrender';
    if(R.h17 && up === 11 && (t === 15 || t === 17)) return 'Surrender';
  }
  if(soft){
    if(t >= 19){
      if(t === 19 && up === 6 && R.h17) return canD ? 'Double' : 'Stand';
      return 'Stand';
    }
    if(t === 18){
      if(up >= 3 && up <= 6) return canD ? 'Double' : 'Stand';
      if(up === 2) return (R.h17 && canD) ? 'Double' : 'Stand';
      return (up === 7 || up === 8) ? 'Stand' : 'Hit';
    }
    if(t === 17) return (up >= 3 && up <= 6 && canD) ? 'Double' : 'Hit';
    if(t === 15 || t === 16) return (up >= 4 && up <= 6 && canD) ? 'Double' : 'Hit';
    return (up >= 5 && up <= 6 && canD) ? 'Double' : 'Hit';
  }
  if(t >= 17) return 'Stand';
  if(t >= 13) return up <= 6 ? 'Stand' : 'Hit';
  if(t === 12) return (up >= 4 && up <= 6) ? 'Stand' : 'Hit';
  if(t === 11) return (canD && (up <= 10 || S.rules.h17)) ? 'Double' : 'Hit';
  if(t === 10) return (canD && up <= 9) ? 'Double' : 'Hit';
  if(t === 9) return (up >= 3 && up <= 6 && canD) ? 'Double' : 'Hit';
  return 'Hit';
}

function bookSays(h, up){
  const v = handValue(h.cards);
  const isPair = h.cards.length === 2 && cardVal(h.cards[0]) === cardVal(h.cards[1]);
  return bookAction(
    { total: v.total, soft: v.soft, pair: isPair ? cardVal(h.cards[0]) : 0 },
    up,
    {
      canD: h.cards.length === 2 && S.bankroll >= h.bet && (!h.fromSplit || S.rules.das),
      canSp: isPair && S.hands.length === 1 && S.bankroll >= h.bet,
      canSu: h.cards.length === 2 && S.hands.length === 1 && !h.fromSplit
    }
  );
}

function houseEdge(){
  const R = S.rules;
  let e = 0.50;
  e += { 1: -0.48, 2: -0.19, 4: -0.06, 6: 0, 8: 0.02 }[R.decks] || 0;
  if(R.h17) e += 0.22;
  if(R.bjPay !== 1.5) e += 1.39;
  if(!R.das) e += 0.14;
  if(!R.surrender) e += 0.08;
  if(!R.peek) e += 0.11;
  return e;
}

window.rulesExtras = function(){
  const R = S.rules;
  let h = '<div class="set-sec"><div class="set-label">Table rules · est. house edge ' + houseEdge().toFixed(2) + '%</div><div class="pillrow">';
  h += '<button class="pill" data-set="rule" data-v="decks">' + R.decks + ' deck' + (R.decks > 1 ? 's' : '') + '</button>';
  h += '<button class="pill" data-set="rule" data-v="h17">' + (R.h17 ? 'Dealer hits soft 17' : 'Dealer stands on 17s') + '</button>';
  h += '<button class="pill" data-set="rule" data-v="bjpay">' + (R.bjPay === 1.5 ? 'Blackjack 3:2' : 'Blackjack 6:5') + '</button>';
  h += '<button class="pill" data-set="rule" data-v="das">' + (R.das ? 'Double after split' : 'No double after split') + '</button>';
  h += '<button class="pill" data-set="rule" data-v="sur">' + (R.surrender ? 'Surrender allowed' : 'No surrender') + '</button>';
  h += '<button class="pill" data-set="rule" data-v="peek">' + (R.peek ? 'US peek' : 'European no-peek') + '</button>';
  h += '</div><p style="font:400 11px var(--sans);color:#a99c78;margin:8px 0 0">Tap to change. A fresh shoe shuffles on the next deal; the coach, hint, and chart all adapt.</p></div>';
  return h;
};

function showHint(){
  if(btnHint.disabled) return;
  const h = S.hands[S.active];
  const a = bookSays(h, cardVal(S.dealer[0]));
  msg('Book says: ' + a.toLowerCase());
  const map = { Hit: btnHit, Stand: btnStand, Double: btnDouble, Split: btnSplit, Surrender: btnSurrender };
  const b = map[a];
  if(b && !b.disabled){
    b.classList.remove('pulse');
    void b.offsetWidth;
    b.classList.add('pulse');
  }
}
