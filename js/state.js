'use strict';

const RESHUFFLE = 78;

const S = {
  bankroll: store.get('bj-bank', 1000),
  bet: 0,
  lastBet: store.get('bj-lastbet', 0),
  shoe: [], runCount: 0,
  phase: 'betting',
  hands: [], active: 0, dealer: [], insurance: 0,
  stats: store.get('bj-stats', { hands: 0, wins: 0, losses: 0, pushes: 0, bjs: 0, net: 0, bigWin: 0, streak: 0, bestStreak: 0, loans: 0 })
};

let busy = false;

function newShoe(){
  S.shoe = [];
  for(let d = 0; d < 6; d++)
    for(const s of SUITS)
      for(const r of RANKS)
        S.shoe.push({ r: r, s: s });
  for(let i = S.shoe.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    const t = S.shoe[i]; S.shoe[i] = S.shoe[j]; S.shoe[j] = t;
  }
  S.runCount = 0;
  renderShoe();
}

function draw(){
  if(!S.shoe.length) newShoe();
  return S.shoe.pop();
}

function countCard(c){
  const v = cardVal(c);
  if(v >= 2 && v <= 6) S.runCount++;
  else if(v >= 10) S.runCount--;
  if(ovStats.classList.contains('show')) renderStatsPanel();
}

function handValue(cards){
  let t = 0, a = 0;
  for(const c of cards){ t += cardVal(c); if(c.r === 'A') a++ }
  while(t > 21 && a > 0){ t -= 10; a-- }
  return { total: t, soft: a > 0 };
}

function isBJ(h){
  return !h.fromSplit && h.cards.length === 2 && handValue(h.cards).total === 21;
}

function inPlay(){
  if(S.phase === 'betting') return S.bet;
  if(S.phase === 'settle') return 0;
  return S.hands.reduce(function(a, h){ return a + h.bet }, 0) + S.insurance;
}

function saveBank(){ store.set('bj-bank', S.bankroll + inPlay()) }
function saveStats(){ store.set('bj-stats', S.stats) }
