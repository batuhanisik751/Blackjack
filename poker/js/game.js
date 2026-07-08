'use strict';

const $id = function(i){ return document.getElementById(i) };
const sleep = function(ms){ return new Promise(function(r){ setTimeout(r, ms) }) };

const bankAmtEl = $id('bankAmt'), potAmtEl = $id('potAmt'), boardEl = $id('board'),
  msgEl = $id('msgEl'), logEl = $id('logEl'), bannerEl = $id('banner'),
  actBar = $id('actBar'), btnFold = $id('btnFold'), btnCheck = $id('btnCheck'),
  btnRaise = $id('btnRaise'), raiseSlider = $id('raiseSlider'), raiseAmt = $id('raiseAmt'),
  presetRow = $id('presetRow'), handName = $id('handName'), oddsEl = $id('oddsEl'),
  ovTable = $id('ovTable'), tTitle = $id('tTitle'), tBody = $id('tBody'), tRow = $id('tRow'),
  btnSound = $id('btnSound'), btnLeave = $id('btnLeave'), dealerBtn = $id('dealerBtn'),
  chkOdds = $id('chkOdds'), chkAuto = $id('chkAuto');

let AC = null;
let muted = false;
try{ muted = JSON.parse(localStorage.getItem('bj-muted')) === true }catch(e){}
function ac(){
  if(muted) return null;
  if(!AC){ try{ AC = new (window.AudioContext || window.webkitAudioContext)() }catch(e){ return null } }
  if(AC && AC.state === 'suspended') AC.resume();
  return AC;
}
function tone(f, dur, type, vol, delay){
  const c = ac(); if(!c) return;
  const t = c.currentTime + (delay || 0);
  const o = c.createOscillator(), g = c.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol || .1, t + .01);
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + .05);
}
function noiseHit(dur, vol, freq){
  const c = ac(); if(!c) return;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for(let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, c.currentTime);
  g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + dur);
  src.connect(f); f.connect(g); g.connect(c.destination); src.start();
}
const SFX = {
  card: function(){ noiseHit(.06, .22, 2100) },
  chip: function(){ tone(2700 + Math.random() * 500, .035, 'square', .06); tone(2000, .04, 'square', .05, .026) },
  chips: function(){ for(let i = 0; i < 3; i++) setTimeout(SFX.chip, i * 55) },
  knock: function(){ noiseHit(.05, .3, 500) },
  fold: function(){ noiseHit(.07, .12, 900) },
  win: function(){ [523, 659, 784, 1047].forEach(function(f, i){ tone(f, .22, 'triangle', .12, i * .09) }) },
  lose: function(){ tone(220, .3, 'sawtooth', .05); tone(110, .4, 'triangle', .07, .12) },
  alert: function(){ tone(880, .09, 'triangle', .09); tone(1100, .09, 'triangle', .09, .1) }
};

function fmtC(n){
  n = Math.round(n * 100) / 100;
  const o = Number.isInteger(n) ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  return '$' + Math.abs(n).toLocaleString('en-US', o);
}

function xmur3(str){
  let h = 1779033703 ^ str.length;
  for(let i = 0; i < str.length; i++){
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function(){
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^ (h >>> 16)) >>> 0;
  };
}
function mulberry32(a){
  return function(){
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function randomSeedHex(){
  const a = new Uint8Array(12);
  crypto.getRandomValues(a);
  return Array.prototype.map.call(a, function(b){ return b.toString(16).padStart(2, '0') }).join('');
}
function sha256hex(str){
  if(!window.crypto || !crypto.subtle) return Promise.resolve('');
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(function(buf){
    return Array.prototype.map.call(new Uint8Array(buf), function(b){ return b.toString(16).padStart(2, '0') }).join('');
  });
}

const STAKES = [
  { sb: 1, bb: 2, min: 80, max: 200, name: 'Kitchen table · $1/$2' },
  { sb: 5, bb: 10, min: 400, max: 1000, name: 'Back room · $5/$10' },
  { sb: 25, bb: 50, min: 2000, max: 5000, name: 'High stakes · $25/$50' }
];

const T = {
  phase: 'lobby',
  stakes: STAKES[0],
  players: [],
  dealer: 0,
  deck: [], board: [],
  street: 'pre',
  currentBet: 0, lastRaise: 0,
  handNo: 0,
  autoNext: true,
  showOdds: false,
  handLive: false,
  seed: '', leaving: false
};

const stats = (function(){
  try{
    const s = JSON.parse(localStorage.getItem('pk-stats'));
    if(s && typeof s.hands === 'number') return s;
  }catch(e){}
  return { hands: 0, won: 0, showdownsWon: 0, biggestPot: 0, net: 0 };
})();
function saveStats(){ try{ localStorage.setItem('pk-stats', JSON.stringify(stats)) }catch(e){} }

function me(){ return T.players[0] }
function unfolded(){ return T.players.filter(function(p){ return p.inHand && !p.folded }) }
function potTotal(){ return T.players.reduce(function(s, p){ return s + p.committed }, 0) }

function syncWallet(){
  const m = me();
  W.stake = m ? Math.round((m.stack + m.committed) * 100) / 100 : 0;
  W.save();
  bankAmtEl.textContent = fmtC(W.bank);
}

function log(t, cls){
  const d = document.createElement('div');
  d.className = 'lg' + (cls ? ' ' + cls : '');
  d.textContent = t;
  logEl.appendChild(d);
  while(logEl.children.length > 40) logEl.removeChild(logEl.firstChild);
  logEl.scrollTop = logEl.scrollHeight;
}
function msg(t){ msgEl.textContent = t }
let bannerT = 0;
function banner(t, cls){
  bannerEl.textContent = t;
  bannerEl.className = 'pk-banner show ' + (cls || '');
  clearTimeout(bannerT);
  bannerT = setTimeout(function(){ bannerEl.className = 'pk-banner' }, 2600);
}

function seatEl(i){ return $id('seat' + i) }
function renderSeat(p){
  $id('stack' + p.seat).textContent = fmtC(p.stack);
  const bs = $id('bet' + p.seat);
  bs.innerHTML = p.bet > 0 ? '<span class="bchip"></span>' + fmtC(p.bet) : '';
  seatEl(p.seat).classList.toggle('folded', !!p.folded);
  seatEl(p.seat).classList.toggle('allin', !!p.allIn && !p.folded);
}
function renderAll(){
  T.players.forEach(renderSeat);
  potAmtEl.textContent = potTotal() > 0 ? fmtC(potTotal()) : '';
  dealerBtn.className = 'dealer-btn d' + T.dealer;
  bankAmtEl.textContent = fmtC(W.bank);
}
function setTurn(seat){
  T.players.forEach(function(p){ seatEl(p.seat).classList.toggle('turn', p.seat === seat) });
}

function commit(p, amt){
  amt = Math.min(amt, p.stack);
  amt = Math.round(amt * 100) / 100;
  p.stack = Math.round((p.stack - amt) * 100) / 100;
  p.bet = Math.round((p.bet + amt) * 100) / 100;
  p.committed = Math.round((p.committed + amt) * 100) / 100;
  if(p.stack === 0) p.allIn = true;
  if(p.human) syncWallet();
  renderSeat(p);
  renderAll();
  return amt;
}

function dealCardTo(container, card, faceUp, delay){
  return new Promise(function(res){
    setTimeout(function(){
      const el = buildCardEl(card, false);
      container.appendChild(el);
      el.classList.add('dealt');
      SFX.card();
      setTimeout(function(){
        if(faceUp) el.classList.add('up');
        res(el);
      }, 210);
    }, delay || 0);
  });
}

async function collectBets(){
  let any = false;
  T.players.forEach(function(p){ if(p.bet > 0) any = true });
  if(!any) return;
  T.players.forEach(function(p){
    if(p.bet > 0){
      const b = $id('bet' + p.seat);
      b.classList.add('sweep');
      setTimeout(function(){ b.classList.remove('sweep'); p.bet = 0; renderSeat(p) }, 380);
    }
  });
  SFX.chips();
  await sleep(430);
  renderAll();
}

function activeOrderFrom(startSeat){
  const out = [];
  for(let k = 0; k < 4; k++){
    const p = T.players[(startSeat + k) % 4];
    if(p.inHand) out.push(p);
  }
  return out;
}

function settled(){
  const live = unfolded();
  if(live.length < 2) return true;
  return live.every(function(p){ return p.allIn || (p.acted && p.bet === T.currentBet) });
}

async function bettingRound(street){
  T.street = street;
  T.players.forEach(function(p){ p.acted = false });
  if(street !== 'pre'){
    T.currentBet = 0;
    T.lastRaise = T.stakes.bb;
  }
  let idx = street === 'pre' ? nextInHand(T.bbSeat != null ? T.bbSeat : (T.dealer + 2) % 4) : (T.dealer + 1) % 4;
  let guard = 0;
  while(guard++ < 120){
    if(settled()) break;
    const p = T.players[idx % 4];
    idx++;
    if(!p.inHand || p.folded || p.allIn) continue;
    if(p.acted && p.bet === T.currentBet) continue;
    setTurn(p.seat);
    updateHandName();
    let a;
    if(p.human) a = await playerAct(p);
    else a = await aiTurn(p);
    if(T.leaving) return;
    applyAction(p, a);
    if(unfolded().length < 2) break;
  }
  setTurn(-1);
  await collectBets();
}

function applyAction(p, a){
  const toCall = Math.round((T.currentBet - p.bet) * 100) / 100;
  if(a.act === 'fold'){
    p.folded = true; p.acted = true;
    $id('hole' + p.seat).classList.add('mucked');
    SFX.fold();
    log(p.name + ' folds');
  }else if(a.act === 'check'){
    p.acted = true;
    SFX.knock();
    log(p.name + ' checks');
  }else if(a.act === 'call'){
    const paid = commit(p, toCall);
    p.acted = true;
    SFX.chip();
    log(p.name + (p.allIn ? ' calls ' + fmtC(paid) + ' — all in!' : ' calls ' + fmtC(paid)), p.allIn ? 'hot' : '');
  }else if(a.act === 'raise'){
    let to = Math.min(a.to, p.bet + p.stack);
    to = Math.round(to * 100) / 100;
    const raiseSize = Math.round((to - T.currentBet) * 100) / 100;
    commit(p, to - p.bet);
    if(raiseSize >= T.lastRaise - 0.001){
      T.lastRaise = raiseSize;
      T.players.forEach(function(q){ if(q !== p) q.acted = false });
    }
    if(to > T.currentBet) T.currentBet = to;
    p.acted = true;
    SFX.chips();
    log(p.name + (p.allIn ? ' is ALL IN for ' + fmtC(to) : (T.currentBet === to && raiseSize > 0 ? ' raises to ' + fmtC(to) : ' bets ' + fmtC(to))), p.allIn ? 'hot' : (raiseSize >= T.stakes.bb * 4 ? 'hot' : ''));
  }
  renderAll();
}

function playerAct(p){
  return new Promise(function(res){
    if(window.__autoPilot){
      aiTurn(p).then(res);
      return;
    }
    const toCall = Math.round((T.currentBet - p.bet) * 100) / 100;
    const canRaise = (!p.acted || p.bet === T.currentBet) && p.stack > toCall;
    const minTo = Math.min(Math.round((T.currentBet + T.lastRaise) * 100) / 100, p.bet + p.stack);
    const maxTo = Math.round((p.bet + p.stack) * 100) / 100;
    actBar.classList.add('show');
    SFX.alert();
    btnCheck.textContent = toCall > 0 ? 'Call ' + fmtC(Math.min(toCall, p.stack)) : 'Check';
    btnFold.style.display = toCall > 0 ? '' : 'none';
    const raiseWrap = $id('raiseWrap');
    raiseWrap.style.display = canRaise ? '' : 'none';
    if(canRaise){
      raiseSlider.min = minTo;
      raiseSlider.max = maxTo;
      raiseSlider.step = T.stakes.sb;
      raiseSlider.value = Math.min(maxTo, Math.max(minTo, T.currentBet > 0 ? T.currentBet * 2.5 : T.stakes.bb * 3));
      syncRaiseLabel();
      const pot = potTotal();
      presetRow.innerHTML = '';
      [['Min', minTo], ['⅓ pot', T.currentBet + (pot + toCall) / 3], ['½ pot', T.currentBet + (pot + toCall) * 0.5], ['Pot', T.currentBet + (pot + toCall)], ['All in', maxTo]].forEach(function(pr){
        const b = document.createElement('button');
        b.className = 'pill';
        b.textContent = pr[0];
        b.onclick = function(){
          raiseSlider.value = Math.max(minTo, Math.min(maxTo, Math.round(pr[1])));
          syncRaiseLabel();
        };
        presetRow.appendChild(b);
      });
    }
    updateOdds(p);
    function cleanup(){
      actBar.classList.remove('show');
      btnFold.onclick = btnCheck.onclick = btnRaise.onclick = null;
      document.onkeydown = null;
    }
    btnFold.onclick = function(){ cleanup(); res({ act: 'fold' }) };
    btnCheck.onclick = function(){ cleanup(); res({ act: toCall > 0 ? 'call' : 'check' }) };
    btnRaise.onclick = function(){
      let to = Math.max(minTo, Math.min(maxTo, +raiseSlider.value));
      if(maxTo - to < T.stakes.sb) to = maxTo;
      cleanup(); res({ act: 'raise', to: to });
    };
    document.onkeydown = function(e){
      const k = e.key.toLowerCase();
      if(k === 'f' && toCall > 0) btnFold.onclick();
      else if(k === 'c') btnCheck.onclick();
      else if(k === 'r' && canRaise) btnRaise.onclick();
      else if(k === 'a' && canRaise){ raiseSlider.value = maxTo; syncRaiseLabel(); btnRaise.onclick() }
    };
  });
}
function syncRaiseLabel(){
  const v = +raiseSlider.value;
  raiseAmt.textContent = fmtC(v);
  btnRaise.textContent = (T.currentBet > 0 ? 'Raise to ' : 'Bet ') + fmtC(v);
}
raiseSlider.addEventListener('input', syncRaiseLabel);

async function aiTurn(p){
  await sleep(650 + Math.random() * 1100);
  if(T.leaving) return { act: 'fold' };
  const toCall = Math.round((T.currentBet - p.bet) * 100) / 100;
  const canRaise = (!p.acted || p.bet === T.currentBet) && p.stack > toCall;
  const a = aiDecide({
    persona: p.persona || PERSONAS.tanya,
    hole: p.hole,
    board: T.board,
    street: T.street,
    toCall: toCall,
    currentBet: T.currentBet,
    minRaiseTo: Math.round((T.currentBet + T.lastRaise) * 100) / 100,
    myBet: p.bet,
    pot: potTotal(),
    stack: p.stack,
    bb: T.stakes.bb,
    numOpp: unfolded().length - 1,
    canRaise: canRaise
  });
  if(a.act === 'raise' && !canRaise) return { act: toCall > 0 ? 'call' : 'check' };
  if(a.act === 'check' && toCall > 0) return { act: 'fold' };
  return a;
}

function updateHandName(){
  const m = me();
  if(!m || !m.inHand || m.folded || !m.hole.length){ handName.textContent = ''; return }
  const r = evalAny(m.hole.concat(T.board));
  handName.textContent = scoreName(r.score);
}
function updateOdds(p){
  if(!T.showOdds){ oddsEl.textContent = ''; return }
  const opp = unfolded().length - 1;
  if(opp < 1){ oddsEl.textContent = ''; return }
  const eq = equity(p.hole, T.board, opp, 180);
  oddsEl.textContent = 'win odds ~' + Math.round(eq * 100) + '%';
}

async function runHand(){
  if(T.handLive || T.phase !== 'playing') return;
  T.handLive = true;
  T.handNo++;
  T.board = [];
  boardEl.innerHTML = '';
  bannerEl.className = 'pk-banner';
  T.players.forEach(function(p){
    p.folded = false; p.allIn = false; p.acted = false;
    p.bet = 0; p.committed = 0; p.hole = [];
    p.inHand = p.stack > 0;
    $id('hole' + p.seat).innerHTML = '';
    $id('hole' + p.seat).classList.remove('mucked', 'winner');
    seatEl(p.seat).classList.remove('folded', 'allin');
  });
  const inHand = T.players.filter(function(p){ return p.inHand });
  if(inHand.length < 2){ T.handLive = false; return }

  do{ T.dealer = (T.dealer + 1) % 4 } while(!T.players[T.dealer].inHand);
  renderAll();

  T.seed = randomSeedHex();
  const rng = mulberry32(xmur3(T.seed)());
  T.deck = shuffleWith(makeDeck(), rng);
  sha256hex(T.seed).then(function(h){ if(h) log('Hand #' + T.handNo + ' — deck committed ' + h.slice(0, 16) + '…', 'dim') });

  const sbSeat = nextInHand(T.dealer), bbSeat = nextInHand(sbSeat);
  T.bbSeat = bbSeat;
  commit(T.players[sbSeat], T.stakes.sb);
  commit(T.players[bbSeat], T.stakes.bb);
  T.currentBet = T.stakes.bb;
  T.lastRaise = T.stakes.bb;
  log('— Hand #' + T.handNo + ' · blinds ' + fmtC(T.stakes.sb) + '/' + fmtC(T.stakes.bb) + ' · ' + T.players[T.dealer].name + ' deals —', 'hdr');
  msg('Dealing…');

  for(let round = 0; round < 2; round++){
    for(let k = 1; k <= 4; k++){
      const p = T.players[(T.dealer + k) % 4];
      if(!p.inHand) continue;
      const c = T.deck.pop();
      p.hole.push(c);
      await dealCardTo($id('hole' + p.seat), c, p.human, 0);
    }
  }
  updateHandName();

  await bettingRound('pre');
  if(T.leaving) return endLeaving();

  const streets = [['flop', 3], ['turn', 1], ['river', 1]];
  for(const st of streets){
    if(unfolded().length < 2) break;
    T.deck.pop();
    for(let i = 0; i < st[1]; i++){
      const c = T.deck.pop();
      T.board.push(c);
      await dealCardTo(boardEl, c, true, i * 160);
    }
    await sleep(320);
    updateHandName();
    log('· ' + st[0] + ': ' + T.board.map(cardStr).join(' '), 'dim');
    if(unfolded().filter(function(p){ return !p.allIn }).length > 1){
      await bettingRound(st[0]);
      if(T.leaving) return endLeaving();
    }else{
      await sleep(650);
    }
  }

  await showdown();
  T.handLive = false;
  syncWallet();
  log('seed revealed: ' + T.seed, 'dim');

  const m = me();
  if(m.stack <= 0){ offerRebuy(); return }
  T.players.forEach(function(p){
    if(!p.human && p.stack < T.stakes.bb * 10){
      p.stack = aiBuyin();
      log(p.name + ' reloads to ' + fmtC(p.stack), 'dim');
      renderSeat(p);
    }
  });
  if(T.autoNext){
    msg('Next hand…');
    await sleep(3600);
    if(!T.handLive && T.phase === 'playing' && !ovTable.classList.contains('show')) runHand();
  }else{
    msg('Ready when you are');
    showNextBtn();
  }
}

function endLeaving(){
  T.handLive = false;
  T.leaving = false;
}

function cardStr(c){ return RANK_CH[c.r] + SUIT_CH[c.s] }
function nextInHand(seat){
  let s = seat;
  do{ s = (s + 1) % 4 } while(!T.players[s].inHand);
  return s;
}

async function showdown(){
  const live = unfolded();
  const m = me();
  const myCommit = m.committed;
  if(live.length === 1){
    const w = live[0];
    const amount = potTotal();
    w.stack = Math.round((w.stack + amount) * 100) / 100;
    T.players.forEach(function(p){ p.committed = 0; p.bet = 0 });
    syncWallet();
    banner(w.name + ' takes ' + fmtC(amount), w.human ? 'win' : '');
    log(w.name + ' wins ' + fmtC(amount) + ' uncontested', w.human ? 'win' : '');
    if(w.human){ SFX.win(); stats.won++; stats.net += amount - myCommit }
    else stats.net -= myCommit;
    stats.hands++;
    if(amount > stats.biggestPot) stats.biggestPot = amount;
    saveStats();
    potAmtEl.classList.add('paid');
    setTimeout(function(){ potAmtEl.classList.remove('paid') }, 700);
    renderAll();
    await sleep(1400);
    return;
  }

  msg('Showdown');
  for(const p of live){
    if(!p.human){
      const hEl = $id('hole' + p.seat);
      hEl.querySelectorAll('.pcard').forEach(function(el){ el.classList.add('up') });
      SFX.card();
      await sleep(340);
    }
  }
  const scores = {};
  const names = {};
  for(const p of live){
    const r = evalSeven(p.hole.concat(T.board));
    scores[p.id] = r.score;
    names[p.id] = scoreName(r.score);
    log(p.name + ' shows ' + p.hole.map(cardStr).join(' ') + ' — ' + names[p.id]);
  }
  const pots = buildPots(T.players.map(function(p){ return { id: p.id, committed: p.committed, folded: !p.inHand || p.folded } }));
  const result = distributePots(pots, scores);
  const totalPot = pots.reduce(function(s, p){ return s + p.amount }, 0);

  let headline = null;
  for(const p of T.players){
    const win = result.payouts[p.id];
    if(win){
      p.stack = Math.round((p.stack + win) * 100) / 100;
      $id('hole' + p.seat).classList.add('winner');
      log(p.name + ' wins ' + fmtC(win) + ' with ' + names[p.id], p.human ? 'win' : 'hot');
      if(!headline || win > headline.win) headline = { p: p, win: win };
    }
  }
  if(headline){
    banner(headline.p.name + ' wins ' + fmtC(headline.win) + ' — ' + names[headline.p.id], headline.p.human ? 'win' : '');
  }
  const meWon = result.payouts[m.id] || 0;
  if(m.inHand && !m.folded){
    if(meWon > 0){ SFX.win(); stats.won++; stats.showdownsWon++ }
    else SFX.lose();
  }
  stats.hands++;
  stats.net += meWon - myCommit;
  if(totalPot > stats.biggestPot) stats.biggestPot = totalPot;
  saveStats();
  T.players.forEach(function(p){ p.committed = 0; p.bet = 0 });
  syncWallet();
  potAmtEl.classList.add('paid');
  setTimeout(function(){ potAmtEl.classList.remove('paid') }, 700);
  renderAll();
  await sleep(2400);
}

function aiBuyin(){
  return T.stakes.min + Math.round(Math.random() * (T.stakes.max - T.stakes.min) / T.stakes.bb) * T.stakes.bb;
}

function showNextBtn(){
  tTitle.textContent = 'Hand over';
  tBody.innerHTML = '';
  tRow.innerHTML = '<button class="gbtn" id="tNext">Deal next hand</button>';
  $id('tNext').onclick = function(){
    if(T.handLive) return;
    ovTable.classList.remove('show');
    runHand();
  };
  ovTable.classList.add('show');
}

function offerRebuy(){
  tTitle.textContent = 'Felted!';
  const min = Math.min(T.stakes.min, Math.max(T.stakes.bb * 20, 0));
  tBody.innerHTML = '<p class="tlede">The table took everything. Reload from your wallet (' + fmtC(W.bank) + ')?</p>';
  tRow.innerHTML = '<a class="tbtn" href="../">Lobby</a><button class="tbtn" id="tOut">Leave table</button>' +
    (W.bank >= min ? '<button class="gbtn" id="tRebuy">Rebuy ' + fmtC(Math.min(T.stakes.max, Math.max(min, Math.min(W.bank, T.stakes.min)))) + '</button>' : '');
  $id('tOut').onclick = leaveTable;
  const rb = $id('tRebuy');
  if(rb) rb.onclick = function(){
    if(T.handLive || me().stack > 0) return;
    const amt = Math.min(T.stakes.max, Math.max(min, Math.min(W.bank, T.stakes.min)));
    if(amt > W.bank) return;
    W.bank = Math.round((W.bank - amt) * 100) / 100;
    me().stack = amt;
    syncWallet();
    ovTable.classList.remove('show');
    renderAll();
    runHand();
  };
  ovTable.classList.add('show');
}

function leaveTable(){
  const m = me();
  if(m){
    W.bank = Math.round((W.bank + m.stack) * 100) / 100;
    m.stack = 0;
  }
  W.stake = 0;
  W.save();
  T.phase = 'lobby';
  ovTable.classList.remove('show');
  showBuyIn();
}

function showBuyIn(){
  T.phase = 'lobby';
  W.load();
  if(W.bank < T.stakes.min) T.stakes = STAKES[0];
  tTitle.textContent = 'Royal Hold’em';
  let h = '<p class="tlede">No-limit Texas Hold’em against three regulars, each with their own game. Buy in from your casino wallet (' + fmtC(W.bank) + ') — chips come back when you leave.</p>';
  h += '<div class="set-label">Stakes</div><div class="pillrow">';
  STAKES.forEach(function(s, i){
    h += '<button class="pill' + (s === T.stakes ? ' sel' : '') + '" data-st="' + i + '"' + (W.bank < s.min ? ' disabled' : '') + '>' + s.name + '</button>';
  });
  h += '</div><div class="set-label" style="margin-top:14px">Buy-in <span id="biLabel"></span></div>';
  h += '<input type="range" id="biSlider" style="width:100%">';
  h += '<div class="opps"><b>At the table:</b> ' + Object.keys(PERSONAS).map(function(k){ const p = PERSONAS[k]; return p.avatar + ' ' + p.name + ' <i>(' + p.tag.toLowerCase() + ')</i>' }).join(' · ') + '</div>';
  if(W.bank < STAKES[0].min){
    h += '<p class="tlede" style="color:#ffadad">Not enough for the smallest table. The house can float you.</p>';
  }
  tBody.innerHTML = h;
  tRow.innerHTML = (W.bank < STAKES[0].min ? '<button class="tbtn" id="tLoan">Take $1,000 credit</button>' : '') +
    '<a class="tbtn" href="../">Lobby</a><button class="gbtn" id="tSit"' + (W.bank < STAKES[0].min ? ' disabled' : '') + '>Take a seat</button>';
  const slider = $id('biSlider'), lab = $id('biLabel');
  function syncSlider(){
    const s = T.stakes;
    slider.min = s.min;
    slider.max = Math.min(s.max, Math.floor(W.bank));
    slider.step = s.bb * 5;
    if(+slider.value < +slider.min || +slider.value > +slider.max) slider.value = Math.min(+slider.max, s.min);
    lab.textContent = fmtC(+slider.value) + ' (' + Math.round(slider.value / s.bb) + ' big blinds)';
  }
  tBody.querySelectorAll('[data-st]').forEach(function(b){
    b.onclick = function(){ T.stakes = STAKES[+b.dataset.st]; showBuyIn() };
  });
  if(W.bank >= T.stakes.min) syncSlider();
  slider.oninput = syncSlider;
  const lo = $id('tLoan');
  if(lo) lo.onclick = function(){ W.takeLoan(); showBuyIn() };
  $id('tSit').onclick = function(){
    if(T.phase !== 'lobby') return;
    const amt = Math.max(T.stakes.min, Math.min(+slider.value || T.stakes.min, W.bank));
    if(amt > W.bank) return;
    sitDown(amt);
  };
  ovTable.classList.add('show');
}

function sitDown(buyin){
  W.bank = Math.round((W.bank - buyin) * 100) / 100;
  W.stake = buyin;
  W.save();
  const keys = Object.keys(PERSONAS);
  T.players = [
    { id: 'you', seat: 0, name: 'You', human: true, stack: buyin, hole: [], bet: 0, committed: 0, inHand: true },
    { id: 'tanya', seat: 1, name: PERSONAS.tanya.name, persona: PERSONAS.tanya, stack: aiBuyin(), hole: [], bet: 0, committed: 0, inHand: true },
    { id: 'lou', seat: 2, name: PERSONAS.lou.name, persona: PERSONAS.lou, stack: aiBuyin(), hole: [], bet: 0, committed: 0, inHand: true },
    { id: 'ricky', seat: 3, name: PERSONAS.ricky.name, persona: PERSONAS.ricky, stack: aiBuyin(), hole: [], bet: 0, committed: 0, inHand: true }
  ];
  keys.forEach(function(k, i){
    $id('name' + (i + 1)).textContent = PERSONAS[k].avatar + ' ' + PERSONAS[k].name;
  });
  T.dealer = Math.floor(Math.random() * 4);
  T.phase = 'playing';
  ovTable.classList.remove('show');
  logEl.innerHTML = '';
  log('You sit down with ' + fmtC(buyin) + ' at ' + T.stakes.name, 'hdr');
  renderAll();
  syncWallet();
  runHand();
}

btnLeave.addEventListener('click', function(){
  if(T.handLive){ msg('Finish the hand first'); return }
  leaveTable();
});
btnSound.addEventListener('click', function(){
  muted = !muted;
  try{ localStorage.setItem('bj-muted', JSON.stringify(muted)) }catch(e){}
  btnSound.textContent = muted ? 'Sound off' : 'Sound on';
});
chkOdds.addEventListener('change', function(){
  T.showOdds = chkOdds.checked;
  if(!T.showOdds) oddsEl.textContent = '';
});
chkAuto.addEventListener('change', function(){ T.autoNext = chkAuto.checked });

window.onBankSync = function(){ bankAmtEl.textContent = fmtC(W.bank) };

btnSound.textContent = muted ? 'Sound off' : 'Sound on';
chkAuto.checked = true;
renderAll();
showBuyIn();

if('serviceWorker' in navigator && location.protocol !== 'file:'){
  try{ navigator.serviceWorker.register('../sw.js') }catch(e){}
}
