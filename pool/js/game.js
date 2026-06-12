'use strict';

const cv = document.getElementById('tableCv');
const ctx = cv.getContext('2d');
const DPR = Math.min(2, window.devicePixelRatio || 1);
const VW = 1000, VH = 520;
cv.width = VW * DPR; cv.height = VH * DPR;
ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

const msgEl = document.getElementById('msgEl');
const bankAmtEl = document.getElementById('bankAmt');
const potAmtEl = document.getElementById('potAmt');
const pBadge = document.getElementById('pBadge');
const cBadge = document.getElementById('cBadge');
const pTray = document.getElementById('pTray');
const cTray = document.getElementById('cTray');
const pPanel = document.getElementById('pPanel');
const cPanel = document.getElementById('cPanel');
const cName = document.getElementById('cName');
const powerFill = document.getElementById('powerFill');
const bannerEl = document.getElementById('banner');
const ovMatch = document.getElementById('ovMatch');
const mTitle = document.getElementById('mTitle');
const mBody = document.getElementById('mBody');
const mRow = document.getElementById('mRow');
const btnSound = document.getElementById('btnSound');

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
  g.gain.linearRampToValueAtTime(vol || .1, t + .008);
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
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.1;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, c.currentTime);
  g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + dur);
  src.connect(f); f.connect(g); g.connect(c.destination); src.start();
}
const SFX = {
  clack: function(v){ noiseHit(.04, .3 * v + .04, 2600 + v * 1200) },
  thud: function(v){ noiseHit(.05, Math.min(.2, v * .05), 420) },
  drop: function(){ noiseHit(.09, .3, 240); tone(140, .18, 'sine', .14, .02) },
  strike: function(v){ noiseHit(.05, .22 + v * .2, 1500) },
  win: function(){ [523, 659, 784, 1047].forEach(function(f, i){ tone(f, .24, 'triangle', .13, i * .1) }) },
  lose: function(){ tone(220, .35, 'sawtooth', .06); tone(110, .45, 'triangle', .09, .14) }
};

const HUES = { 1: '#f4c20d', 2: '#2563c9', 3: '#d63031', 4: '#7a3bbb', 5: '#ef7d22', 6: '#1f9d55', 7: '#8e2333' };
function ballColor(id){
  if(id === 8) return '#16161e';
  const base = id > 8 ? id - 8 : id;
  return HUES[base];
}
function groupOf(id){ return id < 8 ? 'solid' : 'stripe' }

const G = {
  phase: 'stake',
  balls: [], turn: 'p',
  pGroup: null, cGroup: null,
  breakerP: true, wasBreak: false,
  ballInHand: false, kitchenOnly: false, dragCue: false,
  shotPots: [], firstContact: null, shotBy: 'p',
  stake: 0, diffKey: 'easy', mult: 1,
  aimAngle: 0, power: 0, charging: false, chargeDir: 1,
  mouse: { x: 500, y: 260 },
  aiAim: null,
  over: false
};

function cueBall(){ return G.balls.find(function(b){ return b.id === 0 }) }
function ballById(id){ return G.balls.find(function(b){ return b.id === id }) }
function remainingOf(g){
  return G.balls.filter(function(b){ return !b.sunk && b.id !== 0 && b.id !== 8 && groupOf(b.id) === g }).length;
}
function groupFor(who){ return who === 'p' ? G.pGroup : G.cGroup }
function on8(who){
  const g = groupFor(who);
  return !!g && remainingOf(g) === 0;
}

function makeBalls(){
  function shuffle(a){ for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t } return a }
  const solids = shuffle([1, 2, 3, 4, 5, 6, 7]);
  const stripes = shuffle([9, 10, 11, 12, 13, 14, 15]);
  const slots = [];
  for(let r = 0; r < 5; r++)
    for(let c = 0; c <= r; c++)
      slots.push({ r: r, c: c });
  const ids = new Array(15).fill(null);
  ids[4] = 8;
  ids[10] = solids.pop();
  ids[14] = stripes.pop();
  const rest = shuffle(solids.concat(stripes));
  for(let i = 0; i < 15; i++) if(ids[i] == null) ids[i] = rest.pop();
  const balls = [{ id: 0, x: 255, y: 260, vx: 0, vy: 0, sunk: false }];
  slots.forEach(function(s, i){
    balls.push({
      id: ids[i],
      x: FOOT_SPOT.x + s.r * (BALL_R * 2 - 1) * 0.87,
      y: FOOT_SPOT.y - s.r * BALL_R + s.c * (BALL_R * 2 + 0.6),
      vx: 0, vy: 0, sunk: false
    });
  });
  return balls;
}

function respot8(){
  const e = ballById(8);
  let x = FOOT_SPOT.x, y = FOOT_SPOT.y;
  for(let k = 0; k < 40; k++){
    const blocked = G.balls.some(function(b){
      return !b.sunk && b.id !== 8 && (b.x - x) * (b.x - x) + (b.y - y) * (b.y - y) < (BALL_R * 2.1) * (BALL_R * 2.1);
    });
    if(!blocked) break;
    x += 14; if(x > PF.x1 - BALL_R){ x = FOOT_SPOT.x; y += 14 }
  }
  e.sunk = false; e.x = x; e.y = y; e.vx = 0; e.vy = 0;
}

const EV = {
  pot: function(b){ G.shotPots.push(b.id); SFX.drop() },
  clack: function(v){ SFX.clack(v) },
  cushion: function(v){ SFX.thud(v) },
  contact: function(id){ if(G.firstContact == null) G.firstContact = id }
};

function startMatch(){
  G.balls = makeBalls();
  G.pGroup = null; G.cGroup = null;
  G.turn = G.breakerP ? 'p' : 'c';
  G.wasBreak = true;
  G.ballInHand = true;
  G.kitchenOnly = true;
  G.shotPots = []; G.firstContact = null;
  G.over = false; G.aiAim = null; G.power = 0; G.charging = false;
  hideBanner();
  ovMatch.classList.remove('show');
  updateHud();
  if(G.turn === 'p'){
    G.phase = 'place';
    msg('Your break — drag the cue ball in the kitchen, release, then aim and hold to charge');
  }else{
    G.phase = 'ai';
    const cue = cueBall();
    cue.x = 250 + Math.random() * 40;
    cue.y = 220 + Math.random() * 80;
    G.ballInHand = false; G.kitchenOnly = false;
    msg(DIFFS[G.diffKey].name + ' breaks…');
    setTimeout(function(){
      const ang = Math.atan2(FOOT_SPOT.y - cue.y, FOOT_SPOT.x - cue.x) + (Math.random() - 0.5) * 0.02;
      G.aiAim = { angle: ang, power: 1 };
      setTimeout(function(){ G.aiAim = null; shoot(ang, 1) }, 900);
    }, 800);
  }
}

function shoot(angle, power){
  const cue = cueBall();
  if(cue.sunk) return;
  SFX.strike(power);
  const sp = MAX_LAUNCH * (0.25 + 0.75 * power);
  cue.vx = Math.cos(angle) * sp;
  cue.vy = Math.sin(angle) * sp;
  G.shotBy = G.turn;
  G.shotPots = [];
  G.firstContact = null;
  G.ballInHand = false; G.kitchenOnly = false;
  G.phase = 'moving';
  G.power = 0; G.charging = false;
  powerFill.style.height = '0%';
}

function resolveShot(){
  const shooter = G.shotBy, opp = shooter === 'p' ? 'c' : 'p';
  const wasBreak = G.wasBreak; G.wasBreak = false;
  let pots = G.shotPots.filter(function(id){ return id !== 0 });
  const scratch = cueBall().sunk;
  const myG = groupFor(shooter);
  const open = !G.pGroup;

  let fcFoul = false, fcReason = '';
  if(G.firstContact == null){ fcFoul = true; fcReason = 'nothing hit' }
  else{
    const fg = G.firstContact === 8 ? 'eight' : groupOf(G.firstContact);
    if(myG){
      const potsOwnPre = pots.filter(function(id){ return id !== 8 && groupOf(id) === myG }).length;
      const wasOn8 = (remainingOf(myG) + potsOwnPre) === 0;
      if(!(fg === myG || (wasOn8 && fg === 'eight'))){ fcFoul = true; fcReason = 'wrong ball first' }
    }else if(fg === 'eight' && !wasBreak){ fcFoul = true; fcReason = '8-ball first on an open table' }
  }

  if(pots.indexOf(8) >= 0){
    if(wasBreak){
      respot8();
      pots = pots.filter(function(id){ return id !== 8 });
      toast8('8-ball off the break — re-spotted');
    }else{
      const potsOwn = myG ? pots.filter(function(id){ return id !== 8 && groupOf(id) === myG }).length : 0;
      const clearedBefore = myG && (remainingOf(myG) + potsOwn) === 0;
      const shooterWins = clearedBefore && !scratch && !fcFoul;
      settleMatch(shooter === 'p' ? shooterWins : !shooterWins,
        shooterWins ? (shooter === 'p' ? 'You sank the 8-ball!' : DIFFS[G.diffKey].name + ' sank the 8-ball')
        : (scratch ? 'Scratched on the 8-ball' : fcFoul ? 'The 8-ball dropped on a foul shot' : 'The 8-ball went down early'));
      return;
    }
  }

  let foul = false, reason = '';
  if(scratch){ foul = true; reason = 'scratch' }
  else if(fcFoul){ foul = true; reason = fcReason }

  if(open && !wasBreak && !foul && pots.length){
    const first = pots.find(function(id){ return id !== 8 });
    if(first != null){
      const g = groupOf(first);
      if(shooter === 'p'){ G.pGroup = g; G.cGroup = g === 'solid' ? 'stripe' : 'solid' }
      else{ G.cGroup = g; G.pGroup = g === 'solid' ? 'stripe' : 'solid' }
    }
  }

  if(scratch){
    const cue = cueBall();
    cue.sunk = false; cue.vx = 0; cue.vy = 0;
    cue.x = 255; cue.y = 260;
    let tries = 0;
    while(G.balls.some(function(b){ return b !== cue && !b.sunk && (b.x - cue.x) * (b.x - cue.x) + (b.y - cue.y) * (b.y - cue.y) < (BALL_R * 2.05) * (BALL_R * 2.05) }) && tries++ < 50){
      cue.x += 16;
      if(cue.x > PF.x1 - BALL_R){ cue.x = PF.x0 + BALL_R + 10; cue.y += 16; if(cue.y > PF.y1 - BALL_R) cue.y = PF.y0 + BALL_R + 10 }
    }
  }

  const sgNow = groupFor(shooter);
  const pottedOwn = sgNow
    ? pots.some(function(id){ return id !== 8 && groupOf(id) === sgNow })
    : pots.some(function(id){ return id !== 8 });
  const again = !foul && pottedOwn;
  G.turn = again ? shooter : opp;

  if(foul){
    G.ballInHand = true;
    G.kitchenOnly = wasBreak && scratch;
    showBanner('Foul — ' + reason, 'foul');
    SFX.lose();
  }

  updateHud();
  const who = G.turn;
  if(who === 'c'){
    scheduleAI();
  }else{
    G.phase = G.ballInHand ? 'place' : 'aim';
    const g = groupFor('p');
    let m = again && shooter === 'p' ? 'Nice — shoot again' : 'Your shot';
    if(G.ballInHand) m = 'Ball in hand — drag the cue ball anywhere' + (G.kitchenOnly ? ' in the kitchen' : '') + ', then aim';
    if(on8('p')) m += ' · you are on the 8-ball';
    else if(g) m += ' · you are ' + g + 's';
    msg(m);
  }
}

function aiTargets(){
  const g = G.cGroup;
  if(!g) return [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15].filter(function(id){ const b = ballById(id); return b && !b.sunk });
  if(remainingOf(g) === 0) return [8];
  return G.balls.filter(function(b){ return !b.sunk && b.id !== 0 && b.id !== 8 && groupOf(b.id) === g }).map(function(b){ return b.id });
}

function scheduleAI(){
  G.phase = 'ai';
  const D = DIFFS[G.diffKey];
  msg(D.name + ' is thinking…');
  setTimeout(function(){
    if(G.over) return;
    if(G.ballInHand){
      const spot = aiPlaceCue(G.balls, aiTargets(), G.kitchenOnly);
      const cue = cueBall();
      cue.sunk = false; cue.vx = 0; cue.vy = 0;
      cue.x = spot.x; cue.y = spot.y;
      G.ballInHand = false; G.kitchenOnly = false;
    }
    const shot = aiDecide(G.balls, cueBall(), aiTargets(), D);
    G.aiAim = { angle: shot.angle, power: shot.power };
    msg(D.name + ' lines it up…');
    setTimeout(function(){
      if(G.over) return;
      G.aiAim = null;
      shoot(shot.angle, shot.power);
    }, 1000);
  }, 850);
}

function settleMatch(playerWon, detail){
  G.phase = 'over';
  G.over = true;
  G.breakerP = !G.breakerP;
  let net;
  if(playerWon){
    const ret = W.settleWin(G.mult);
    net = ret - G.stake_;
    showBanner('You win +' + fmtMoney(G.stake_ * G.mult).slice(1), 'win');
    SFX.win();
    confetti();
  }else{
    W.settleLoss();
    net = -G.stake_;
    showBanner(DIFFS[G.diffKey].name + ' wins', 'lose');
    SFX.lose();
  }
  updateHud();
  setTimeout(function(){ showResult(playerWon, detail, net) }, 1700);
}

function msg(t){ msgEl.textContent = t }
function toast8(t){ msg(t) }
let bannerT = 0;
function showBanner(t, cls){
  bannerEl.textContent = t;
  bannerEl.className = 'pl-banner show ' + cls;
  clearTimeout(bannerT);
  bannerT = setTimeout(function(){ bannerEl.className = 'pl-banner' }, 2400);
}
function hideBanner(){ clearTimeout(bannerT); bannerEl.className = 'pl-banner' }

let confs = [];
function confetti(){
  confs = [];
  for(let i = 0; i < 130; i++){
    confs.push({
      x: 500 + (Math.random() - .5) * 240, y: 200,
      vx: (Math.random() - .5) * 8, vy: -(Math.random() * 8 + 3),
      g: .25, w: 5 + Math.random() * 5, h: 3 + Math.random() * 3,
      a: Math.random() * Math.PI, va: (Math.random() - .5) * .4,
      c: ['#f6d77b', '#7bd68a', '#ff9d9d', '#9ecbff', '#ffffff'][Math.floor(Math.random() * 5)],
      life: 80 + Math.random() * 40, t: 0
    });
  }
}

window.onBankSync = function(){
  updateHud();
  if(G.phase === 'stake' && ovMatch.classList.contains('show')) showStakeOverlay();
};

function updateHud(){
  bankAmtEl.textContent = fmtMoney(W.bank);
  potAmtEl.textContent = W.stake ? fmtMoney(W.stake + W.stake * G.mult) : '—';
  cName.textContent = DIFFS[G.diffKey].name;
  pBadge.textContent = G.pGroup ? (on8('p') ? 'on the 8 ●' : G.pGroup + 's') : 'open';
  cBadge.textContent = G.cGroup ? (on8('c') ? 'on the 8 ●' : G.cGroup + 's') : 'open';
  pPanel.classList.toggle('turn', G.turn === 'p' && !G.over);
  cPanel.classList.toggle('turn', G.turn === 'c' && !G.over);
  function tray(el, g){
    if(!g){ el.innerHTML = ''; return }
    let h = '';
    G.balls.forEach(function(b){
      if(b.id === 0 || b.id === 8) return;
      if(groupOf(b.id) !== g) return;
      h += '<span class="mini' + (b.sunk ? ' down' : '') + (b.id > 8 ? ' stripe' : '') + '" style="--c:' + ballColor(b.id) + '"></span>';
    });
    el.innerHTML = h;
  }
  tray(pTray, G.pGroup);
  tray(cTray, G.cGroup);
}

function showStakeOverlay(){
  G.phase = 'stake';
  mTitle.textContent = 'Royal Eight-Ball';
  let h = '<p class="mlede">Pick your stake and your opponent — winner takes the pot. Your wallet is shared with the blackjack table.</p>';
  h += '<div class="set-label">Stake</div><div class="pillrow" id="stakeRow">';
  [25, 50, 100, 250, 500].forEach(function(s){
    h += '<button class="pill stakep' + (s === pendingStake ? ' sel' : '') + '" data-stake="' + s + '"' + (s > W.bank ? ' disabled' : '') + '>$' + s + '</button>';
  });
  h += '</div><div class="set-label" style="margin-top:14px">Opponent</div><div class="diff-row">';
  Object.keys(DIFFS).forEach(function(k){
    const d = DIFFS[k];
    h += '<button class="diffc' + (k === pendingDiff ? ' sel' : '') + '" data-diff="' + k + '"><b>' + d.name + '</b><span>' + d.blurb + '</span><i>wins pay ' + (d.mult === 1 ? '1:1' : d.mult === 1.5 ? '3:2' : '2:1') + '</i></button>';
  });
  h += '</div>';
  if(W.bank < 25){
    h += '<p class="mlede" style="color:#ffadad">You are out of money. The house can float you — or win it back at the blackjack table.</p>';
  }
  mBody.innerHTML = h;
  mRow.innerHTML = (W.bank < 25 ? '<button class="tbtn" id="mLoan">Take $1,000 credit</button>' : '') +
    '<a class="tbtn" href="../">Lobby</a><button class="gbtn" id="mGo"' + (W.bank < 25 ? ' disabled' : '') + '>Rack ’em up</button>';
  mBody.querySelectorAll('[data-stake]').forEach(function(b){
    b.onclick = function(){ pendingStake = +b.dataset.stake; showStakeOverlay() };
  });
  mBody.querySelectorAll('[data-diff]').forEach(function(b){
    b.onclick = function(){ pendingDiff = b.dataset.diff; showStakeOverlay() };
  });
  const lo = document.getElementById('mLoan');
  if(lo) lo.onclick = function(){ W.takeLoan(); updateHud(); showStakeOverlay() };
  document.getElementById('mGo').onclick = function(){
    if(G.phase !== 'stake') return;
    if(pendingStake > W.bank){ pendingStake = 25; showStakeOverlay(); return }
    if(!W.placeStake(pendingStake)) return;
    G.stake_ = pendingStake;
    G.diffKey = pendingDiff;
    G.mult = DIFFS[pendingDiff].mult;
    updateHud();
    startMatch();
  };
  updateHud();
  ovMatch.classList.add('show');
}
let pendingStake = 50, pendingDiff = 'easy';

function showResult(won, detail, net){
  mTitle.textContent = won ? 'You win the rack' : 'The rack goes to ' + DIFFS[G.diffKey].name;
  mBody.innerHTML = '<p class="mlede">' + detail + '</p>' +
    '<p class="bigm ' + (won ? 'pos' : 'neg') + '">' + (won ? '+' : '−') + fmtMoney(Math.abs(net)).slice(1) + '</p>' +
    '<p class="mlede">Wallet: <b>' + fmtMoney(W.bank) + '</b></p>';
  mRow.innerHTML = '<a class="tbtn" href="../">Lobby</a><button class="tbtn" id="mChange">Change table</button><button class="gbtn" id="mAgain">Rematch</button>';
  document.getElementById('mChange').onclick = function(){ showStakeOverlay() };
  document.getElementById('mAgain').onclick = function(){
    if(G.phase !== 'over') return;
    if(G.stake_ > W.bank){ showStakeOverlay(); return }
    if(!W.placeStake(G.stake_)) return;
    updateHud();
    startMatch();
  };
  ovMatch.classList.add('show');
}

function toWorld(e){
  const r = cv.getBoundingClientRect();
  return { x: (e.clientX - r.left) * (VW / r.width), y: (e.clientY - r.top) * (VH / r.height) };
}
function legalCueSpot(x, y){
  if(x < PF.x0 + BALL_R || x > PF.x1 - BALL_R || y < PF.y0 + BALL_R || y > PF.y1 - BALL_R) return false;
  if(G.kitchenOnly && x > KITCHEN_X) return false;
  return !G.balls.some(function(b){
    return b.id !== 0 && !b.sunk && (b.x - x) * (b.x - x) + (b.y - y) * (b.y - y) < (BALL_R * 2.05) * (BALL_R * 2.05);
  });
}

cv.addEventListener('pointermove', function(e){
  G.mouse = toWorld(e);
  if(G.phase === 'place' && G.dragCue){
    const cue = cueBall();
    if(legalCueSpot(G.mouse.x, G.mouse.y)){ cue.x = G.mouse.x; cue.y = G.mouse.y }
  }else if(G.phase === 'aim' && G.turn === 'p'){
    const cue = cueBall();
    G.aimAngle = Math.atan2(G.mouse.y - cue.y, G.mouse.x - cue.x);
  }
});
cv.addEventListener('pointerdown', function(e){
  e.preventDefault();
  G.mouse = toWorld(e);
  if(G.over || G.turn !== 'p') return;
  if(G.phase === 'place'){
    G.dragCue = true;
    const cue = cueBall();
    cue.sunk = false;
    if(legalCueSpot(G.mouse.x, G.mouse.y)){ cue.x = G.mouse.x; cue.y = G.mouse.y }
  }else if(G.phase === 'aim'){
    const cue = cueBall();
    G.aimAngle = Math.atan2(G.mouse.y - cue.y, G.mouse.x - cue.x);
    G.charging = true; G.power = 0; G.chargeDir = 1;
    G.phase = 'charge';
  }
});
window.addEventListener('pointerup', function(){
  if(G.dragCue){
    G.dragCue = false;
    if(G.phase === 'place'){
      const cue = cueBall();
      if(legalCueSpot(cue.x, cue.y)){
        G.phase = 'aim';
        msg('Aim with the mouse, hold to charge, release to shoot');
      }else{
        msg('Place the cue ball on a legal spot' + (G.kitchenOnly ? ' inside the kitchen line' : ''));
      }
    }
    return;
  }
  if(G.phase === 'charge'){
    G.charging = false;
    const p = G.power;
    if(p > 0.05) shoot(G.aimAngle, p);
    else{ G.phase = 'aim'; G.power = 0; powerFill.style.height = '0%' }
  }
});
btnSound.addEventListener('click', function(){
  muted = !muted;
  try{ localStorage.setItem('bj-muted', JSON.stringify(muted)) }catch(e){}
  btnSound.textContent = muted ? 'Sound off' : 'Sound on';
});

function drawTable(){
  ctx.fillStyle = '#241509';
  ctx.fillRect(0, 0, VW, VH);
  const wood = ctx.createLinearGradient(0, 0, 0, VH);
  wood.addColorStop(0, '#5d3c1d'); wood.addColorStop(.5, '#4a2e14'); wood.addColorStop(1, '#3a2410');
  ctx.fillStyle = wood;
  roundRect(8, 8, VW - 16, VH - 16, 26); ctx.fill();
  ctx.strokeStyle = 'rgba(212,175,55,.5)'; ctx.lineWidth = 2;
  roundRect(16, 16, VW - 32, VH - 32, 20); ctx.stroke();
  const felt = ctx.createRadialGradient(500, 200, 80, 500, 260, 620);
  felt.addColorStop(0, '#1d6fa3'); felt.addColorStop(.55, '#155a86'); felt.addColorStop(1, '#0d3d5e');
  ctx.fillStyle = felt;
  roundRect(PF.x0 - 14, PF.y0 - 14, PF.x1 - PF.x0 + 28, PF.y1 - PF.y0 + 28, 14); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 28;
  roundRect(PF.x0 - 14 + 14, PF.y0 - 14 + 14, PF.x1 - PF.x0 + 28 - 28, PF.y1 - PF.y0 + 28 - 28, 6); ctx.stroke();
  if((G.phase === 'place' && G.kitchenOnly) || (G.wasBreak && G.phase !== 'moving')){
    ctx.strokeStyle = 'rgba(255,255,255,.22)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 7]);
    ctx.beginPath(); ctx.moveTo(KITCHEN_X, PF.y0); ctx.lineTo(KITCHEN_X, PF.y1); ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.fillStyle = 'rgba(255,255,255,.16)';
  for(let i = 1; i < 8; i++){
    if(i !== 4){ dot(PF.x0 + (PF.x1 - PF.x0) * i / 8, 36); dot(PF.x0 + (PF.x1 - PF.x0) * i / 8, VH - 36) }
  }
  for(let i = 1; i < 4; i++){ dot(36, PF.y0 + (PF.y1 - PF.y0) * i / 4); dot(VW - 36, PF.y0 + (PF.y1 - PF.y0) * i / 4) }
  for(const pk of POCKETS){
    ctx.beginPath();
    ctx.arc(pk.x, pk.y, pk.r + 4, 0, 7);
    ctx.fillStyle = '#2c1c0c'; ctx.fill();
    const pg = ctx.createRadialGradient(pk.x, pk.y, 2, pk.x, pk.y, pk.r + 2);
    pg.addColorStop(0, '#000'); pg.addColorStop(.8, '#0a0a0c'); pg.addColorStop(1, '#1c130a');
    ctx.beginPath(); ctx.arc(pk.x, pk.y, pk.r + 1, 0, 7);
    ctx.fillStyle = pg; ctx.fill();
    ctx.strokeStyle = 'rgba(212,175,55,.4)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(pk.x, pk.y, pk.r + 3, 0, 7); ctx.stroke();
  }
}
function dot(x, y){ ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 7); ctx.fill() }
function roundRect(x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBall(b){
  let x = b.x, y = b.y, r = BALL_R;
  if(b.sunk){
    if(b.sinkT == null || b.sinkT > 14) return;
    const k = b.sinkT / 14;
    x = b.x + (b.sinkX - b.x) * k;
    y = b.y + (b.sinkY - b.y) * k;
    r = BALL_R * (1 - k * 0.75);
    b.sinkT += 0.6;
  }
  ctx.beginPath(); ctx.ellipse(x + 3, y + 5, r * .95, r * .5, 0, 0, 7);
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.clip();
  const col = b.id === 0 ? '#f6f2e4' : ballColor(b.id);
  if(b.id > 8){
    ctx.fillStyle = '#f6f2e4'; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.fillStyle = col; ctx.fillRect(x - r, y - r * 0.62, r * 2, r * 1.24);
  }else{
    ctx.fillStyle = col; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const gl = ctx.createRadialGradient(x - r * .4, y - r * .45, 1, x, y, r * 1.5);
  gl.addColorStop(0, 'rgba(255,255,255,.85)');
  gl.addColorStop(.25, 'rgba(255,255,255,.18)');
  gl.addColorStop(.7, 'rgba(0,0,0,.05)');
  gl.addColorStop(1, 'rgba(0,0,0,.4)');
  ctx.fillStyle = gl;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  if(b.id > 0){
    ctx.beginPath(); ctx.arc(x, y, r * .48, 0, 7);
    ctx.fillStyle = '#f6f2e4'; ctx.fill();
    ctx.fillStyle = '#16161e';
    ctx.font = '700 ' + Math.max(6, r * .62) + 'px -apple-system, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(b.id, x, y + .5);
  }
  ctx.restore();
}

function drawAim(){
  const cue = cueBall();
  if(cue.sunk) return;
  let angle = null, power = 0;
  if((G.phase === 'aim' || G.phase === 'charge') && G.turn === 'p'){ angle = G.aimAngle; power = G.power }
  else if(G.aiAim){ angle = G.aiAim.angle; power = G.aiAim.power * .4 }
  if(angle == null) return;
  const ux = Math.cos(angle), uy = Math.sin(angle);
  const hit = rayBalls(G.balls, cue.x, cue.y, ux, uy, 0);
  const dist = hit ? hit.t : rayCushion(cue.x, cue.y, ux, uy);
  const gx = cue.x + ux * dist, gy = cue.y + uy * dist;
  ctx.setLineDash([5, 6]);
  ctx.strokeStyle = 'rgba(255,255,255,.5)';
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(cue.x + ux * (BALL_R + 2), cue.y + uy * (BALL_R + 2)); ctx.lineTo(gx, gy); ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.arc(gx, gy, BALL_R, 0, 7);
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.stroke();
  if(hit){
    const t = hit.ball;
    const ndx = t.x - gx, ndy = t.y - gy;
    const nd = Math.hypot(ndx, ndy) || 1;
    ctx.strokeStyle = 'rgba(246,221,154,.8)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(t.x, t.y);
    ctx.lineTo(t.x + ndx / nd * 46, t.y + ndy / nd * 46); ctx.stroke();
    const dn = ux * ndx / nd + uy * ndy / nd;
    let tx = ux - dn * ndx / nd, ty = uy - dn * ndy / nd;
    const tl = Math.hypot(tx, ty);
    if(tl > 0.12){
      tx /= tl; ty /= tl;
      ctx.strokeStyle = 'rgba(255,255,255,.3)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + tx * 30, gy + ty * 30); ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  const pull = 14 + power * 52;
  const bx = cue.x - ux * (BALL_R + pull), by = cue.y - uy * (BALL_R + pull);
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(angle);
  const sg = ctx.createLinearGradient(-250, 0, 0, 0);
  sg.addColorStop(0, '#2a1a0c'); sg.addColorStop(.55, '#8a5a2a'); sg.addColorStop(.9, '#c89b5a'); sg.addColorStop(1, '#e8d8b8');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.moveTo(-250, -4.4); ctx.lineTo(0, -2.4); ctx.lineTo(0, 2.4); ctx.lineTo(-250, 4.4);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3b7bd4';
  ctx.fillRect(-1.5, -2.4, 3, 4.8);
  ctx.restore();
}

function drawConfetti(){
  if(!confs.length) return;
  let alive = false;
  for(const p of confs){
    if(p.t > p.life) continue;
    alive = true;
    p.x += p.vx; p.vy += p.g; p.y += p.vy; p.a += p.va; p.t++;
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(p.a);
    ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
    ctx.fillStyle = p.c;
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  if(!alive) confs = [];
}

function draw(){
  drawTable();
  for(const b of G.balls) if(b.sunk) drawBall(b);
  for(const b of G.balls) if(!b.sunk) drawBall(b);
  if(G.phase === 'place' && G.turn === 'p'){
    const cue = cueBall();
    ctx.beginPath(); ctx.arc(cue.x, cue.y, BALL_R + 5, 0, 7);
    ctx.strokeStyle = 'rgba(246,221,154,.8)';
    ctx.setLineDash([4, 5]); ctx.lineWidth = 1.6; ctx.stroke(); ctx.setLineDash([]);
  }
  drawAim();
  drawConfetti();
}

let lastPhysT = performance.now();
setInterval(function(){
  const now = performance.now();
  const ticks = Math.max(1, Math.min(40, Math.round((now - lastPhysT) / 16)));
  const steps = Math.max(1, Math.min(220, Math.round((now - lastPhysT) / 5.5)));
  lastPhysT = now;
  if(G.charging){
    for(let i = 0; i < ticks; i++){
      G.power += 0.016 * G.chargeDir;
      if(G.power >= 1){ G.power = 1; G.chargeDir = -1 }
      if(G.power <= 0){ G.power = 0; G.chargeDir = 1 }
    }
    powerFill.style.height = Math.round(G.power * 100) + '%';
  }
  if(G.phase !== 'moving') return;
  let mv = false;
  for(let s = 0; s < steps; s++) mv = physStep(G.balls, EV) || mv;
  if(!mv) resolveShot();
}, 16);

function loop(){
  requestAnimationFrame(loop);
  draw();
}

G.stake_ = 0;
btnSound.textContent = muted ? 'Sound off' : 'Sound on';
G.balls = makeBalls();
updateHud();
showStakeOverlay();
loop();

if('serviceWorker' in navigator && location.protocol !== 'file:'){
  try{ navigator.serviceWorker.register('../sw.js') }catch(e){}
}
