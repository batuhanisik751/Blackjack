'use strict';

const S = {
  bankroll: store.get('bj-bank', 1000),
  bet: 0,
  lastBet: store.get('bj-lastbet', 0),
  shoe: [], runCount: 0,
  phase: 'betting',
  hands: [], active: 0, dealer: [], insurance: 0,
  side: { pp: 0, tp: 0, ll: 0, bust: 0 },
  lastSide: Object.assign({ pp: 0, tp: 0, ll: 0, bust: 0 }, store.get('bj-lastside', {})),
  sideNet: 0,
  mode: 'free',
  rng: null,
  stats: store.get('bj-stats', { hands: 0, wins: 0, losses: 0, pushes: 0, bjs: 0, net: 0, bigWin: 0, streak: 0, bestStreak: 0, loans: 0 }),
  train: store.get('bj-train', { n: 0, ok: 0, cells: {} }),
  ach: store.get('bj-ach', {}),
  quiz: store.get('bj-quiz', { n: 0, ok: 0 }),
  opts: Object.assign({ speed: 'normal', coach: false, quiz: false, deviations: false, back: 'crimson', felt: 'emerald' }, store.get('bj-opts', {})),
  rules: Object.assign({ decks: 6, h17: false, bjPay: 1.5, das: true, surrender: true, peek: true }, store.get('bj-rules', {}))
};

let busy = false;

function saveOpts(){ store.set('bj-opts', S.opts) }
function saveRules(){ store.set('bj-rules', S.rules) }
function saveTrain(){ store.set('bj-train', S.train) }
function saveQuiz(){ store.set('bj-quiz', S.quiz) }

function rnd(){ return S.rng ? S.rng() : Math.random() }

function shufflePoint(){ return Math.max(15, Math.round(S.rules.decks * 52 * 0.25)) }

function newShoe(){
  let rf = S.rng;
  if(!rf && window.fairNewSeed && window.crypto) rf = seededRng(window.fairNewSeed());
  if(!rf) rf = Math.random;
  S.shoe = [];
  for(let d = 0; d < S.rules.decks; d++)
    for(const s of SUITS)
      for(const r of RANKS)
        S.shoe.push({ r: r, s: s });
  for(let i = S.shoe.length - 1; i > 0; i--){
    const j = Math.floor(rf() * (i + 1));
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

function sideTotal(){ return S.side.pp + S.side.tp + S.side.ll + S.side.bust }
function lastSideTotal(){ return S.lastSide.pp + S.lastSide.tp + S.lastSide.ll + S.lastSide.bust }

function inPlay(){
  if(S.phase === 'betting') return S.bet + sideTotal();
  if(S.phase === 'settle') return 0;
  return S.hands.reduce(function(a, h){ return a + h.bet }, 0) + S.insurance + sideTotal();
}

function saveBank(){ if(S.mode !== 'free') return; store.set('bj-bank', S.bankroll + inPlay()) }

function pushHistory(){
  const h = store.get('bj-history', []);
  h.push(Math.round(S.bankroll));
  while(h.length > 120) h.shift();
  store.set('bj-history', h);
}
function saveStats(){ store.set('bj-stats', S.stats) }
