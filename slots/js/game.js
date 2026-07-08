'use strict';

const $id = function(i){ return document.getElementById(i) };
const sleep = function(ms){ return new Promise(function(r){ setTimeout(r, ms) }) };

const bankAmtEl = $id('bankAmt'), reelsEl = $id('reels'), lineOvl = $id('lineOvl'),
  coinFx = $id('coinFx'), bannerEl = $id('banner'), fsBar = $id('fsBar'),
  betValEl = $id('betVal'), winValEl = $id('winVal'), winMsgEl = $id('winMsg'),
  betRow = $id('betRow'), btnSpin = $id('btnSpin'), spinLbl = $id('spinLbl'),
  btnTurbo = $id('btnTurbo'), btnAuto = $id('btnAuto'), cabinet = $id('cabinet'),
  ovPays = $id('ovPays'), paysBody = $id('paysBody'), btnPays = $id('btnPays'),
  btnPaysClose = $id('btnPaysClose'), ovCredit = $id('ovCredit'), btnCredit = $id('btnCredit'),
  btnSound = $id('btnSound');

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
  stop: function(){ noiseHit(.06, .3, 700) },
  scatter: function(n){ tone(880 + n * 220, .18, 'triangle', .14) },
  riser: function(){ for(let i = 0; i < 8; i++) tone(300 + i * 90, .12, 'sawtooth', .04, i * .09) },
  tick: function(){ tone(2400, .02, 'square', .022) },
  coin: function(){ tone(1900 + Math.random() * 900, .05, 'square', .05); tone(2600 + Math.random() * 600, .04, 'triangle', .04, .02) },
  winTier: function(t){ [523, 659, 784, 1047, 1319, 1568].slice(0, 3 + t).forEach(function(f, i){ tone(f * (1 + t * .12), .22, 'triangle', .12, i * .08) }) },
  fsIntro: function(){ [392, 494, 587, 784, 988].forEach(function(f, i){ tone(f, .3, 'triangle', .13, i * .12) }) }
};

function fmtC(n){
  n = Math.round(n * 100) / 100;
  const o = Number.isInteger(n) ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  return (n < 0 ? '−$' : '$') + Math.abs(n).toLocaleString('en-US', o);
}

function xmur3(str){
  let h = 1779033703 ^ str.length;
  for(let i = 0; i < str.length; i++){ h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19) }
  return function(){ h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^ (h >>> 16)) >>> 0 };
}
function mulberry32(a){
  return function(){ a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 };
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

const BETS = [5, 10, 25, 50, 100, 250];
const G = {
  bet: 10,
  spinning: false,
  turbo: false,
  auto: 0,
  fsLeft: 0, fsTotal: 0, fsWon: 0,
  seed: randomSeedHex(),
  seedHash: '',
  spinNo: 0,
  grid: null
};
sha256hex(G.seed).then(function(h){ G.seedHash = h });

const stats = (function(){
  try{
    const s = JSON.parse(localStorage.getItem('sl-stats'));
    if(s && ['spins', 'wagered', 'won', 'biggest', 'fsRounds'].every(function(k){ return typeof s[k] === 'number' && isFinite(s[k]) })) return s;
  }catch(e){}
  return { spins: 0, wagered: 0, won: 0, biggest: 0, fsRounds: 0 };
})();
function saveStats(){ try{ localStorage.setItem('sl-stats', JSON.stringify(stats)) }catch(e){} }
function persistFS(){
  try{
    if(G.fsLeft > 0) localStorage.setItem('sl-fs', JSON.stringify({ left: G.fsLeft, total: G.fsTotal, won: G.fsWon, bet: G.bet }));
    else localStorage.removeItem('sl-fs');
  }catch(e){}
}

function tileHTML(sym){
  const s = SYMBOLS[sym];
  const inner = (sym === 'W') ? s.ch : (s.cls[0] === 'l' ? s.ch : s.ch);
  return '<div class="tile ' + s.cls + '" data-sym="' + sym + '">' + inner + '</div>';
}
function randSym(reel){
  const st = REELS[reel];
  return st[Math.floor(Math.random() * st.length)];
}

const reelWins = [];
function buildReels(){
  reelsEl.innerHTML = '';
  for(let r = 0; r < 5; r++){
    const win = document.createElement('div');
    win.className = 'reelwin';
    const strip = document.createElement('div');
    strip.className = 'rstrip';
    let h = '';
    for(let i = 0; i < 12; i++) h += tileHTML(randSym(r));
    strip.innerHTML = h + h.slice(0, 0);
    win.appendChild(strip);
    reelsEl.appendChild(win);
    reelWins.push(win);
  }
}

function setReelFinal(r, col){
  const win = reelWins[r];
  const strip = win.querySelector('.rstrip');
  let h = '';
  for(let i = 0; i < 3; i++) h += tileHTML(randSym(r));
  h += tileHTML(col[0]) + tileHTML(col[1]) + tileHTML(col[2]);
  strip.innerHTML = h;
  strip.style.transition = 'none';
  strip.style.transform = 'translateY(0)';
  strip.getBoundingClientRect();
  const tile = win.clientHeight / 3;
  strip.style.transition = 'transform ' + (G.turbo ? 0.24 : 0.5) + 's cubic-bezier(.22,.8,.3,1.18)';
  strip.style.transform = 'translateY(' + (-3 * tile) + 'px)';
}

function updateHud(){
  bankAmtEl.textContent = fmtC(G.dispBank != null ? G.dispBank : W.bank);
  betValEl.textContent = fmtC(G.bet);
  btnTurbo.textContent = G.turbo ? 'Turbo on' : 'Turbo off';
  btnTurbo.classList.toggle('on', G.turbo);
  btnAuto.textContent = G.auto > 0 ? 'Auto ' + G.auto : 'Auto';
  btnAuto.classList.toggle('on', G.auto > 0);
  spinLbl.textContent = G.fsLeft > 0 ? 'FREE' : (G.auto > 0 ? G.auto : 'SPIN');
  betRow.querySelectorAll('.pill').forEach(function(b){
    const v = +b.dataset.bet;
    b.classList.toggle('sel', v === G.bet);
    b.disabled = G.spinning || G.fsLeft > 0 || v > W.bank;
  });
  fsBar.textContent = G.fsLeft > 0 ? '✦ Free spins — ' + G.fsLeft + ' left · all wins ×' + FREE_MULT + ' · won ' + fmtC(G.fsWon) + ' ✦' : '';
  cabinet.classList.toggle('fs', G.fsLeft > 0);
}

let bannerT = 0;
function banner(t, mega){
  bannerEl.textContent = t;
  bannerEl.className = 'sl-banner show' + (mega ? ' mega' : '');
  clearTimeout(bannerT);
  bannerT = setTimeout(function(){ bannerEl.className = 'sl-banner' }, 2200);
}

let coins = [];
let coinRaf = 0;
function coinShower(n){
  const r = coinFx.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  coinFx.width = r.width * dpr; coinFx.height = r.height * dpr;
  const ctx = coinFx.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  coins = [];
  for(let i = 0; i < n; i++){
    coins.push({
      x: r.width / 2 + (Math.random() - .5) * 120, y: r.height * .55,
      vx: (Math.random() - .5) * 7, vy: -(Math.random() * 8 + 5),
      g: .32, rr: 4 + Math.random() * 4, a: Math.random() * Math.PI, va: (Math.random() - .5) * .4,
      t: 0, life: 70 + Math.random() * 40
    });
  }
  cancelAnimationFrame(coinRaf);
  let frame = 0;
  (function step(){
    ctx.clearRect(0, 0, r.width, r.height);
    let alive = false;
    for(const p of coins){
      if(p.t > p.life) continue;
      alive = true;
      p.x += p.vx; p.vy += p.g; p.y += p.vy; p.a += p.va; p.t++;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.a);
      ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
      ctx.scale(1, Math.abs(Math.cos(p.a * 2)) * .7 + .3);
      ctx.beginPath(); ctx.arc(0, 0, p.rr, 0, 7);
      ctx.fillStyle = '#f3cf6f'; ctx.fill();
      ctx.strokeStyle = '#8a6d1d'; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.restore();
      if(frame % 6 === 0 && p.t < 20) SFX.coin();
    }
    frame++;
    if(alive && frame < 150) coinRaf = requestAnimationFrame(step);
    else ctx.clearRect(0, 0, r.width, r.height);
  })();
}

const LINE_COLORS = ['#f6dd9a', '#9df0b3', '#9ecbff', '#ff9d9d', '#e8c7ff', '#ffd28a', '#8ff0e8', '#ffb3d9', '#c8f08f', '#f0a8f0'];
function cellCenter(col, row){
  return [col * 100 + 50, row * 84 + 42];
}
function drawWinLines(wins){
  let h = '';
  for(const w of wins){
    const pts = [];
    for(let c = 0; c < w.count; c++){
      const row = LINES[w.line][c];
      const p = cellCenter(c, row);
      pts.push(p[0] + ',' + p[1]);
    }
    h += '<polyline points="' + pts.join(' ') + '" stroke="' + LINE_COLORS[w.line] + '" style="color:' + LINE_COLORS[w.line] + '"><animate attributeName="stroke-opacity" values="0;1;1" dur="0.4s"/></polyline>';
  }
  lineOvl.innerHTML = h;
}
function markHits(cells){
  const tiles = [];
  for(let r = 0; r < 5; r++){
    const strip = reelWins[r].querySelectorAll('.tile');
    tiles.push([strip[3], strip[4], strip[5]]);
  }
  cells.forEach(function(cr){
    const t = tiles[cr[0]] && tiles[cr[0]][cr[1]];
    if(t) t.classList.add('hit');
  });
  reelsEl.classList.add('dimwins');
}
function clearWinFx(){
  lineOvl.innerHTML = '';
  reelsEl.classList.remove('dimwins');
  reelsEl.querySelectorAll('.tile.hit').forEach(function(t){ t.classList.remove('hit') });
}

async function countUp(el, to, ms){
  const t0 = performance.now();
  return new Promise(function(res){
    (function step(t){
      const p = Math.min(1, (t - t0) / ms);
      el.textContent = fmtC(to * (1 - Math.pow(1 - p, 2)));
      if(p % 0.13 < 0.02) SFX.tick();
      if(p < 1) requestAnimationFrame(step);
      else{ el.textContent = fmtC(to); res() }
    })(t0);
  });
}

async function doSpin(){
  if(G.spinning) return;
  const isFree = G.fsLeft > 0;
  let betNote = '';
  if(!isFree){
    if(G.bet > W.bank){
      if(W.bank < BETS[0]){ ovCredit.classList.add('show'); G.auto = 0; updateHud(); return }
      G.bet = BETS.filter(function(b){ return b <= W.bank }).pop() || BETS[0];
      betNote = 'Bet lowered to ' + fmtC(G.bet) + ' · ';
    }
  }
  G.spinning = true;
  clearWinFx();
  winValEl.textContent = '—';
  winMsgEl.textContent = betNote + (isFree ? 'Free spin!' : 'Good luck…');
  btnSpin.disabled = true;

  G.spinNo++;
  const rng = mulberry32(xmur3(G.seed + ':' + G.spinNo)());
  const spin = spinReels(rng);
  const mult = isFree ? FREE_MULT : 1;
  const lineBet = G.bet / NUM_LINES;
  const res = evaluateSpin(spin.grid, lineBet, mult);

  const preBank = W.bank;
  if(!isFree){
    if(G.bet > W.bank){ G.spinning = false; btnSpin.disabled = false; updateHud(); return }
    W.bank = Math.round((W.bank - G.bet + res.total) * 100) / 100;
    stats.spins++;
    stats.wagered += G.bet;
  }else{
    W.bank = Math.round((W.bank + res.total) * 100) / 100;
    G.fsLeft--;
    G.fsWon = Math.round((G.fsWon + res.total) * 100) / 100;
  }
  stats.won += res.total;
  if(res.total > stats.biggest) stats.biggest = res.total;
  if(res.freeSpins > 0){
    G.fsLeft += res.freeSpins;
    if(!isFree){ G.fsTotal = res.freeSpins; G.fsWon = res.total; stats.fsRounds++ }
    else G.fsTotal += res.freeSpins;
  }
  W.save();
  saveStats();
  persistFS();
  G.dispBank = isFree ? preBank : Math.round((preBank - G.bet) * 100) / 100;
  updateHud();

  reelWins.forEach(function(w, i){
    w.classList.add('spinning');
    w.classList.toggle('turbo', G.turbo);
    w.classList.remove('antic');
  });

  const baseDur = G.turbo ? 260 : 700;
  const gap = G.turbo ? 90 : 240;
  let scattersSoFar = 0;
  for(let r = 0; r < 5; r++){
    let extra = 0;
    if(!G.turbo && scattersSoFar >= 2 && r >= 3){
      extra = 1100;
      reelWins[r].classList.add('antic');
      SFX.riser();
    }
    await sleep(r === 0 ? baseDur : gap + extra);
    reelWins[r].classList.remove('spinning');
    setReelFinal(r, spin.grid[r]);
    SFX.stop();
    const colScatters = spin.grid[r].filter(function(s){ return s === 'S' }).length;
    if(colScatters > 0){
      scattersSoFar += colScatters;
      SFX.scatter(scattersSoFar);
    }
  }
  await sleep(G.turbo ? 260 : 560);
  reelWins.forEach(function(w){ w.classList.remove('antic') });

  G.dispBank = null;
  updateHud();

  if(res.total > 0){
    const allCells = [];
    res.wins.forEach(function(w){ w.cells.forEach(function(c){ allCells.push(c) }) });
    res.scatterCells.forEach(function(c){ allCells.push(c) });
    drawWinLines(res.wins);
    markHits(allCells);
    const x = res.total / G.bet;
    const tier = x >= 25 ? 3 : x >= 10 ? 2 : x >= 4 ? 1 : 0;
    SFX.winTier(tier);
    if(tier >= 3){ banner('MEGA WIN', true); coinShower(120) }
    else if(tier === 2){ banner('BIG WIN'); coinShower(70) }
    else if(tier === 1) coinShower(30);
    winMsgEl.textContent = res.wins.length ? res.wins.length + ' line' + (res.wins.length > 1 ? 's' : '') + ' hit' : 'Scatter pay!';
    await countUp(winValEl, res.total, tier >= 2 ? 1600 : 750);
  }else{
    winMsgEl.textContent = isFree ? '' : 'So close — spin again';
  }

  if(res.freeSpins > 0){
    SFX.fsIntro();
    banner(isFree ? '+10 FREE SPINS' : 'FREE SPINS!', !isFree);
    await sleep(1600);
  }

  G.spinning = false;
  updateHud();

  if(G.fsLeft > 0){
    await sleep(G.turbo ? 350 : 800);
    doSpin();
    return;
  }
  if(G.fsTotal > 0 && G.fsLeft === 0){
    banner('Free spins paid ' + fmtC(G.fsWon));
    winMsgEl.textContent = 'Free spins over — ' + fmtC(G.fsWon) + ' from ' + G.fsTotal + ' spins';
    G.fsTotal = 0;
    persistFS();
    updateHud();
    await sleep(1200);
  }
  btnSpin.disabled = false;
  if(G.auto > 0){
    if(W.bank < G.bet || res.total >= G.bet * 10){
      G.auto = 0;
      updateHud();
      if(res.total >= G.bet * 10) winMsgEl.textContent += ' · autoplay stopped on big win';
      return;
    }
    await sleep(G.turbo ? 250 : 650);
    while(ovPays.classList.contains('show')) await sleep(400);
    launchAuto();
  }
}

function launchAuto(){
  if(G.auto <= 0 || G.spinning || G.fsLeft > 0) return;
  G.auto--;
  updateHud();
  doSpin();
}

function renderPays(){
  let h = '<div class="paygrid">';
  ['W', 'H1', 'H2', 'H3', 'H4', 'L1', 'L2', 'L3', 'L4'].forEach(function(k){
    const s = SYMBOLS[k];
    const pays = Object.keys(s.pays).sort().map(function(n){ return n + '× = <i>' + s.pays[n] + '</i>' }).join(' · ');
    h += '<div class="payc"><b>' + s.ch + '</b>' + s.name + (k === 'W' ? ' (wild — substitutes all but ⭐)' : '') + '<br>' + pays + '</div>';
  });
  h += '<div class="payc"><b>⭐</b>Star (scatter)<br>3+ anywhere: <i>' + SCATTER_PAY[3] + '×/' + SCATTER_PAY[4] + '×/' + SCATTER_PAY[5] + '×</i> total bet + <i>10 free spins ×2</i></div>';
  h += '</div>';
  h += '<p class="paynote">Pays are × line bet (total bet ÷ 10) unless marked. Wins pay left to right on 10 fixed lines; only the highest win per line pays.</p>';
  h += '<p class="paynote"><b style="color:#f6dd9a">Published reel strips</b> (symbol counts per reel, exactly as the engine draws them):<br>';
  REELS.forEach(function(st, i){
    const counts = {};
    st.forEach(function(s){ counts[s] = (counts[s] || 0) + 1 });
    h += 'Reel ' + (i + 1) + ': ' + Object.keys(counts).map(function(k){ return SYMBOLS[k].ch + '×' + counts[k] }).join(' ') + '<br>';
  });
  h += 'Simulated RTP ≈ 97–98% over 400k spins (see slots/test in the repo).</p>';
  h += '<p class="paynote"><b style="color:#f6dd9a">Provably fair:</b> this session\'s spins derive from seed committed as<br><code>' + (G.seedHash || 'computing…') + '</code><br>Spin n uses mulberry32(xmur3(seed + ":" + n)). <button class="tbtn" id="btnReveal" style="margin-top:6px">Reveal seed (ends this sequence)</button></p>';
  h += '<div class="statrow"><span>Session spins</span><b>' + stats.spins + '</b><span>Wagered</span><b>' + fmtC(stats.wagered) + '</b><span>Won</span><b>' + fmtC(stats.won) + '</b><span>Session RTP</span><b>' + (stats.wagered ? (stats.won / stats.wagered * 100).toFixed(1) + '%' : '—') + '</b><span>Biggest win</span><b>' + fmtC(stats.biggest) + '</b><span>Free-spin rounds</span><b>' + stats.fsRounds + '</b></div>';
  paysBody.innerHTML = h;
  const rv = $id('btnReveal');
  if(rv) rv.onclick = function(){
    const old = G.seed;
    G.seed = randomSeedHex();
    G.spinNo = 0;
    sha256hex(G.seed).then(function(hh){ G.seedHash = hh; renderPays() });
    rv.outerHTML = '<span style="color:#9df0b3">revealed: <code>' + old + '</code> — new seed committed</span>';
  };
}

BETS.forEach(function(b){
  const el = document.createElement('button');
  el.className = 'pill';
  el.dataset.bet = b;
  el.textContent = fmtC(b);
  el.onclick = function(){
    if(G.spinning || G.fsLeft > 0) return;
    G.bet = b;
    updateHud();
  };
  betRow.appendChild(el);
});

btnSpin.addEventListener('click', function(){ if(!G.spinning && G.fsLeft === 0) doSpin() });
btnTurbo.addEventListener('click', function(){ G.turbo = !G.turbo; updateHud() });
btnAuto.addEventListener('click', function(){
  const wasIdle = G.auto === 0;
  G.auto = G.auto === 0 ? 10 : G.auto === 10 ? 25 : G.auto === 25 ? 50 : 0;
  updateHud();
  if(wasIdle && G.auto > 0) launchAuto();
});
btnPays.addEventListener('click', function(){ renderPays(); ovPays.classList.add('show') });
btnPaysClose.addEventListener('click', function(){ ovPays.classList.remove('show') });
btnCredit.addEventListener('click', function(){ W.takeLoan(); ovCredit.classList.remove('show'); updateHud() });
btnSound.addEventListener('click', function(){
  muted = !muted;
  try{ localStorage.setItem('bj-muted', JSON.stringify(muted)) }catch(e){}
  btnSound.textContent = muted ? 'Sound off' : 'Sound on';
});
document.addEventListener('keydown', function(e){
  if(e.key === ' '){
    e.preventDefault();
    if(e.repeat) return;
    if(!G.spinning && G.fsLeft === 0 && !btnSpin.disabled && !ovPays.classList.contains('show')) doSpin();
  }
  else if(e.key === 'Escape') ovPays.classList.remove('show');
});
window.onBankSync = function(){ updateHud() };

btnSound.textContent = muted ? 'Sound off' : 'Sound on';
buildReels();
(function restoreFS(){
  try{
    const fs = JSON.parse(localStorage.getItem('sl-fs'));
    if(fs && typeof fs.left === 'number' && fs.left > 0 && fs.left < 200){
      G.fsLeft = fs.left;
      G.fsTotal = typeof fs.total === 'number' ? fs.total : fs.left;
      G.fsWon = typeof fs.won === 'number' ? fs.won : 0;
      if(BETS.indexOf(fs.bet) >= 0) G.bet = fs.bet;
      winMsgEl.textContent = 'Welcome back — resuming your free spins';
      setTimeout(function(){ if(G.fsLeft > 0 && !G.spinning) doSpin() }, 1400);
    }
  }catch(e){}
})();
updateHud();
if(W.bank < BETS[0] && G.fsLeft === 0) ovCredit.classList.add('show');

if('serviceWorker' in navigator && location.protocol !== 'file:'){
  try{ navigator.serviceWorker.register('../sw.js') }catch(e){}
}
