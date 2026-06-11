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
  btnClear.disabled = !(betting && S.bet > 0);
  btnRebet.disabled = !(betting && S.lastBet > 0 && (S.bankroll + S.bet) >= S.lastBet);
  btnDeal.disabled = !(betting && S.bet >= 5);
  const playing = S.phase === 'player' && !busy;
  const h = playing ? S.hands[S.active] : null;
  btnHit.disabled = !playing;
  btnStand.disabled = !playing;
  btnDouble.disabled = !(playing && h && h.cards.length === 2 && S.bankroll >= h.bet);
  btnSplit.disabled = !(playing && h && h.cards.length === 2 && S.hands.length === 1 && cardVal(h.cards[0]) === cardVal(h.cards[1]) && S.bankroll >= h.bet);
  btnSurrender.disabled = !(playing && h && h.cards.length === 2 && S.hands.length === 1 && !h.fromSplit);
  btnHint.disabled = !playing;
}

function renderStatsPanel(){
  const st = S.stats;
  const wr = st.hands ? Math.round(100 * st.wins / st.hands) : 0;
  const tc = S.shoe.length ? (S.runCount / (S.shoe.length / 52)) : 0;
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
}

function closeOverlays(){
  [ovStats, ovRules, ovLoan].forEach(function(o){ o.classList.remove('show') });
}
