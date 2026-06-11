'use strict';

function msg(t){ msgEl.textContent = t }

let toastT = 0;
function toast(t){
  toastEl.textContent = t;
  toastEl.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(function(){ toastEl.classList.remove('show') }, 2300);
}

let bannerT = 0;
function showBanner(t, cls){
  clearTimeout(bannerT);
  banner.textContent = t;
  banner.className = 'banner show ' + cls;
}
function hideBanner(){
  clearTimeout(bannerT);
  banner.className = 'banner';
  banner.textContent = '';
}

function pop(el){ el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop') }
function shakeEl(el){ el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake') }

let shown = S.bankroll, rafB = 0, bankT = 0;
function renderBankroll(){
  cancelAnimationFrame(rafB);
  clearTimeout(bankT);
  const from = shown, to = S.bankroll, t0 = performance.now(), dur = 550;
  function step(t){
    const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    shown = from + (to - from) * e;
    bankAmt.textContent = fmt(shown);
    if(p < 1) rafB = requestAnimationFrame(step);
  }
  rafB = requestAnimationFrame(step);
  bankT = setTimeout(function(){
    cancelAnimationFrame(rafB);
    shown = to;
    bankAmt.textContent = fmt(to);
  }, dur + 80);
}

function renderShoe(){ shoeN.textContent = S.shoe.length + ' cards' }

function renderBet(){
  const amt = S.phase === 'betting' ? S.bet : S.hands.reduce(function(a, h){ return a + h.bet }, 0);
  betAmt.textContent = amt ? fmt(amt) : '';
  betStack.innerHTML = '';
  let rem = amt, n = 0;
  for(const d of [500, 100, 25, 5]){
    while(rem >= d && n < 14){
      rem -= d;
      const ch = chipEl(d, true);
      ch.style.bottom = (n * 5) + 'px';
      ch.style.zIndex = n;
      betStack.appendChild(ch);
      n++;
    }
  }
  betCircle.classList.toggle('empty', amt === 0);
}

function wrapHTML(i){
  return '<div class="result-tag" id="tag' + i + '"></div><div class="hand" id="hand' + i + '"></div>' +
    '<div class="hand-meta"><span class="score-badge" id="score' + i + '"></span><span class="bet-badge" id="betb' + i + '"></span></div>';
}

function rebuildHands(){
  playerRow.innerHTML = '';
  S.hands.forEach(function(h, i){
    const w = document.createElement('div');
    w.className = 'hand-wrap';
    w.id = 'hw' + i;
    w.innerHTML = wrapHTML(i);
    playerRow.appendChild(w);
    const he = w.querySelector('.hand');
    h.cards.forEach(function(c){ he.appendChild(buildCard(c, true)) });
  });
  renderScores(); renderBetBadges(); renderActive();
}

function renderScores(){
  S.hands.forEach(function(h, i){
    const el = $id('score' + i);
    if(!el) return;
    if(!h.cards.length){ el.textContent = ''; el.classList.remove('on'); return }
    const v = handValue(h.cards);
    el.textContent = (v.soft && v.total < 21) ? (v.total - 10) + ' / ' + v.total : v.total;
    el.classList.add('on');
    el.classList.toggle('bust', v.total > 21);
    pop(el);
  });
  if(!S.dealer.length){
    dealerScore.textContent = '';
    dealerScore.classList.remove('on');
    dealerScore.classList.remove('bust');
  }else{
    const holeEl = dealerHand.children[1];
    const holeHidden = holeEl && !holeEl.classList.contains('faceup');
    if(holeHidden || S.dealer.length === 1){
      const u = cardVal(S.dealer[0]);
      dealerScore.textContent = 'Showing ' + (u === 11 ? 'A' : u);
      dealerScore.classList.remove('bust');
    }else{
      const v = handValue(S.dealer);
      dealerScore.textContent = v.total;
      dealerScore.classList.toggle('bust', v.total > 21);
    }
    dealerScore.classList.add('on');
    pop(dealerScore);
  }
}

function renderBetBadges(){
  S.hands.forEach(function(h, i){
    const el = $id('betb' + i);
    if(!el) return;
    el.textContent = fmt(h.bet);
    el.classList.add('on');
  });
}

function renderActive(){
  S.hands.forEach(function(h, i){
    const w = $id('hw' + i);
    if(!w) return;
    w.classList.toggle('active', S.phase === 'player' && i === S.active);
  });
}

function setTag(i, txt, cls){
  const el = $id('tag' + i);
  if(!el) return;
  el.textContent = txt;
  el.className = 'result-tag show ' + cls;
}

function updateButtons(){
  const betting = S.phase === 'betting' && !busy;
  rack.querySelectorAll('.chip').forEach(function(el){
    const d = +el.dataset.d;
    el.classList.toggle('off', !(betting && S.bankroll >= d));
  });
  btnClear.disabled = !(betting && (S.bet > 0 || sideTotal() > 0));
  btnRebet.disabled = !(betting && S.lastBet > 0 && (S.bankroll + S.bet + sideTotal()) >= (S.lastBet + lastSideTotal()));
  btnDeal.disabled = !(betting && S.bet >= 5);
  renderSide();
  const playing = S.phase === 'player' && !busy;
  const h = playing ? S.hands[S.active] : null;
  btnHit.disabled = !playing;
  btnStand.disabled = !playing;
  btnDouble.disabled = !(playing && h && h.cards.length === 2 && S.bankroll >= h.bet && (!h.fromSplit || S.rules.das));
  btnSplit.disabled = !(playing && h && h.cards.length === 2 && S.hands.length === 1 && cardVal(h.cards[0]) === cardVal(h.cards[1]) && S.bankroll >= h.bet);
  btnSurrender.disabled = !(playing && h && h.cards.length === 2 && S.hands.length === 1 && !h.fromSplit && S.rules.surrender);
  btnHint.disabled = !playing;
}

function applyHeater(){
  const st = S.mode === 'free' ? S.stats.streak : 0;
  app.dataset.heat = st >= 8 ? '3' : st >= 5 ? '2' : st >= 3 ? '1' : '';
}

function drawBankChart(){
  const c = $id('bkChart');
  if(!c) return;
  const hist = store.get('bj-history', []);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  if(hist.length < 2){
    ctx.fillStyle = 'rgba(232,219,180,.45)';
    ctx.font = '12px -apple-system, sans-serif';
    ctx.fillText('Bankroll graph appears after a few rounds', 10, 48);
    return;
  }
  const min = Math.min.apply(null, hist), max = Math.max.apply(null, hist), pad = 8;
  const sx = (c.width - 2 * pad) / (hist.length - 1);
  const sy = max > min ? (c.height - 2 * pad) / (max - min) : 1;
  if(min <= 1000 && max >= 1000 && max > min){
    const y = c.height - pad - (1000 - min) * sy;
    ctx.strokeStyle = 'rgba(255,255,255,.22)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(c.width - pad, y); ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.beginPath();
  hist.forEach(function(v, i){
    const x = pad + i * sx, y = c.height - pad - (v - min) * sy;
    if(i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  });
  ctx.strokeStyle = '#f6dd9a';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.lineTo(c.width - pad, c.height - pad);
  ctx.lineTo(pad, c.height - pad);
  ctx.closePath();
  ctx.fillStyle = 'rgba(246,221,154,.1)';
  ctx.fill();
  ctx.fillStyle = 'rgba(232,219,180,.6)';
  ctx.font = '10px -apple-system, sans-serif';
  ctx.fillText(fmt(max), 8, 12);
  ctx.fillText(fmt(min), 8, c.height - 4);
}

function renderStatsPanel(){
  const st = S.stats;
  const wr = st.hands ? Math.round(100 * st.wins / st.hands) : 0;
  const tc = window.trueCount ? window.trueCount() : 0;
  sgrid.innerHTML =
    '<span>Hands played</span><b>' + st.hands + '</b>' +
    '<span>Won / lost / pushed</span><b>' + st.wins + ' / ' + st.losses + ' / ' + st.pushes + '</b>' +
    '<span>Win rate</span><b>' + wr + '%</b>' +
    '<span>Blackjacks</span><b>' + st.bjs + '</b>' +
    '<span>Session net</span><b class="' + (st.net >= 0 ? 'pos' : 'neg') + '">' + fmt(st.net) + '</b>' +
    '<span>Biggest win</span><b>' + fmt(st.bigWin) + '</b>' +
    '<span>Streak (best)</span><b>' + st.streak + ' (' + st.bestStreak + ')</b>' +
    '<span>House loans</span><b>' + st.loans + '</b>' +
    '<span>Running count (Hi-Lo)</span><b>' + (S.runCount > 0 ? '+' : '') + S.runCount + '</b>' +
    '<span>True count</span><b>' + (tc > 0 ? '+' : '') + (Math.round(tc * 10) / 10) + '</b>';
  drawBankChart();
}

function closeOverlays(){
  [ovStats, ovRules, ovMenu, ovSettings, ovAch, ovTrainer, ovChart, ovFair].forEach(function(o){ o.classList.remove('show') });
}

function openPanel(ov){
  closeOverlays();
  ov.classList.add('show');
}

function renderSettings(){
  let h = '<div class="set-sec"><div class="set-label">Game speed</div><div class="pillrow">';
  [['relaxed','Relaxed'],['normal','Normal'],['fast','Fast'],['instant','Instant']].forEach(function(p){
    h += '<button class="pill' + (S.opts.speed === p[0] ? ' sel' : '') + '" data-set="speed" data-v="' + p[0] + '">' + p[1] + '</button>';
  });
  h += '</div></div>';
  h += window.rulesExtras ? window.rulesExtras() : '';
  h += window.settingsExtras ? window.settingsExtras() : '';
  setBody.innerHTML = h;
}

function renderArc(){
  const a1 = document.querySelector('.arc .a1 textPath');
  const a2 = document.querySelector('.arc .a2 textPath');
  if(a1) a1.textContent = 'Blackjack pays ' + (S.rules.bjPay === 1.5 ? '3 to 2' : '6 to 5');
  if(a2) a2.textContent = (S.rules.h17 ? 'Dealer hits soft 17' : 'Dealer stands on all 17s') + ' · Insurance pays 2 to 1';
}

function applyCosmetics(){
  app.dataset.speed = S.opts.speed;
  app.dataset.back = S.opts.back;
  app.dataset.felt = S.opts.felt;
  renderArc();
}
