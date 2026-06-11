'use strict';

function evalPP(c1, c2){
  if(c1.r !== c2.r) return 0;
  if(c1.s === c2.s) return 25;
  const red = function(s){ return s === '♥' || s === '♦' };
  return red(c1.s) === red(c2.s) ? 12 : 6;
}

function rankOrd(c){
  return c.r === 'A' ? 14 : c.r === 'K' ? 13 : c.r === 'Q' ? 12 : c.r === 'J' ? 11 : +c.r;
}

function evalTP(a, b, c){
  const suited = a.s === b.s && b.s === c.s;
  const trips = a.r === b.r && b.r === c.r;
  const o = [a, b, c].map(rankOrd).sort(function(x, y){ return x - y });
  const straight = (o[1] === o[0] + 1 && o[2] === o[1] + 1) || (o[0] === 2 && o[1] === 3 && o[2] === 14);
  if(trips && suited) return 100;
  if(straight && suited) return 40;
  if(trips) return 30;
  if(straight) return 10;
  if(suited) return 5;
  return 0;
}

function evalLL(a, b, c){
  const v = handValue([a, b, c]).total;
  const suited = a.s === b.s && b.s === c.s;
  const sevens = a.r === '7' && b.r === '7' && c.r === '7';
  const is678 = [a, b, c].map(function(x){ return x.r }).sort().join('') === '678';
  if(sevens) return suited ? 200 : 50;
  if(is678) return suited ? 100 : 30;
  if(v === 21) return suited ? 15 : 3;
  if(v === 20 || v === 19) return 2;
  return 0;
}

function busterMult(n){
  return n >= 8 ? 250 : n === 7 ? 50 : n === 6 ? 15 : n === 5 ? 4 : 2;
}

const SIDE_NAMES = { pp: 'Perfect Pairs', tp: '21+3', ll: 'Lucky Lucky', bust: 'Buster' };

function placeSide(k){
  if(S.phase !== 'betting' || busy) return;
  if(S.side[k] >= 100){ toast('Side bet cap is $100'); return }
  if(S.bankroll < 5){ toast('Not enough bankroll'); shakeEl(bankWrap); return }
  S.bankroll -= 5; S.side[k] += 5;
  saveBank(); SFX.chip();
  const spot = document.querySelector('.side-spot[data-side="' + k + '"]');
  if(spot) flyChip(rack.querySelector('[data-d="5"]'), spot, 5);
  renderBankroll(); renderSide(); updateButtons();
}

function renderSide(){
  const on = S.phase === 'betting' && !busy;
  ['pp', 'tp', 'll', 'bust'].forEach(function(k){
    const el = $id('ssamt-' + k);
    if(!el) return;
    el.textContent = S.side[k] ? fmt(S.side[k]) : '';
    el.closest('.side-spot').classList.toggle('off', !on);
  });
}

function flashSide(k, won){
  const spot = document.querySelector('.side-spot[data-side="' + k + '"]');
  if(!spot) return;
  spot.classList.add(won ? 'hit' : 'miss');
  setTimeout(function(){ spot.classList.remove('hit', 'miss') }, 1800);
}

async function resolveEarlySides(){
  const p = S.hands[0].cards, up = S.dealer[0];
  const defs = [
    { k: 'pp', m: evalPP(p[0], p[1]) },
    { k: 'tp', m: evalTP(p[0], p[1], up) },
    { k: 'll', m: evalLL(p[0], p[1], up) }
  ];
  let any = false;
  for(const d of defs){
    const stake = S.side[d.k];
    if(!stake) continue;
    any = true;
    S.side[d.k] = 0;
    if(d.m > 0){
      S.bankroll += stake * (d.m + 1);
      S.sideNet += stake * d.m;
      flashSide(d.k, true);
      toast(SIDE_NAMES[d.k] + ' hits ' + d.m + ':1 — +' + fmt(stake * d.m).slice(1));
      SFX.win();
      if(window.checkAwards) checkAwards('side', { k: d.k, m: d.m });
      await wait(950);
    }else{
      S.sideNet -= stake;
      flashSide(d.k, false);
    }
  }
  if(any){ saveBank(); renderBankroll(); renderSide() }
}

function resolveBuster(dBust){
  const stake = S.side.bust;
  if(!stake) return;
  S.side.bust = 0;
  if(dBust){
    const m = busterMult(S.dealer.length);
    S.bankroll += stake * (m + 1);
    S.sideNet += stake * m;
    flashSide('bust', true);
    toast('Buster pays ' + m + ':1 — +' + fmt(stake * m).slice(1));
    SFX.win();
    if(window.checkAwards) checkAwards('side', { k: 'bust', m: m });
  }else{
    S.sideNet -= stake;
    flashSide('bust', false);
  }
  renderSide();
}
