'use strict';

function bookSays(h, up){
  const v = handValue(h.cards), t = v.total;
  const canD = h.cards.length === 2 && S.bankroll >= h.bet;
  const canSp = h.cards.length === 2 && S.hands.length === 1 && cardVal(h.cards[0]) === cardVal(h.cards[1]) && S.bankroll >= h.bet;
  const canSu = h.cards.length === 2 && S.hands.length === 1 && !h.fromSplit;
  if(canSp){
    const p = cardVal(h.cards[0]);
    if(p === 11 || p === 8) return 'Split';
    if(p === 9) return (up >= 2 && up <= 9 && up !== 7) ? 'Split' : 'Stand';
    if(p === 7) return up <= 7 ? 'Split' : 'Hit';
    if(p === 6) return up <= 6 ? 'Split' : 'Hit';
    if(p === 4) return (up === 5 || up === 6) ? 'Split' : 'Hit';
    if(p === 2 || p === 3) return up <= 7 ? 'Split' : 'Hit';
  }
  if(canSu && !v.soft){
    if(t === 16 && up >= 9) return 'Surrender';
    if(t === 15 && up === 10) return 'Surrender';
  }
  if(v.soft){
    if(t >= 19) return 'Stand';
    if(t === 18){
      if(up >= 3 && up <= 6) return canD ? 'Double' : 'Stand';
      return (up === 2 || up === 7 || up === 8) ? 'Stand' : 'Hit';
    }
    if(t === 17) return (up >= 3 && up <= 6 && canD) ? 'Double' : 'Hit';
    if(t === 15 || t === 16) return (up >= 4 && up <= 6 && canD) ? 'Double' : 'Hit';
    return (up >= 5 && up <= 6 && canD) ? 'Double' : 'Hit';
  }
  if(t >= 17) return 'Stand';
  if(t >= 13) return up <= 6 ? 'Stand' : 'Hit';
  if(t === 12) return (up >= 4 && up <= 6) ? 'Stand' : 'Hit';
  if(t === 11) return (canD && up <= 10) ? 'Double' : 'Hit';
  if(t === 10) return (canD && up <= 9) ? 'Double' : 'Hit';
  if(t === 9) return (up >= 3 && up <= 6 && canD) ? 'Double' : 'Hit';
  return 'Hit';
}

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
