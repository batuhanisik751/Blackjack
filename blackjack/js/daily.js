'use strict';

const modeBadge = $id('modeBadge');

function todayKey(){
  const dt = new Date();
  return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
}
function yesterKey(){
  const dt = new Date(Date.now() - 86400000);
  return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
}
function dailyNum(){
  return Math.max(1, Math.round((Date.parse(todayKey()) - Date.parse('2026-01-01')) / 86400000) + 1);
}
function nextDailyIn(){
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const mins = Math.round((next - now) / 60000);
  return Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm';
}

function renderModeBadge(){
  if(S.mode === 'daily') modeBadge.textContent = 'Daily #' + dailyNum() + ' · ' + Math.min(S.daily.hands + 1, S.daily.max) + '/' + S.daily.max;
  else if(S.mode === 'run' && S.run) modeBadge.textContent = 'Run · round ' + S.run.round + '/' + S.run.maxRounds;
  else modeBadge.textContent = '';
}

function copyText(t){
  function fallback(){
    const ta = document.createElement('textarea');
    ta.value = t;
    document.body.appendChild(ta);
    ta.select();
    try{ document.execCommand('copy'); toast('Copied to clipboard') }catch(e){ toast('Copy failed — select and copy manually') }
    ta.remove();
  }
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(t).then(function(){ toast('Copied to clipboard') }, fallback);
  }else fallback();
}

function dailyShareText(score, results){
  const map = { W: '🟩', L: '🟥', P: '🟨', B: '🟦' };
  const counts = { W: 0, L: 0, P: 0, B: 0 };
  let grid = '';
  for(const ch of results){ counts[ch] = (counts[ch] || 0) + 1; grid += map[ch] || '' }
  return '♠ Royal Blackjack Daily #' + dailyNum() + '\n' +
    'Score: ' + fmt(score) + ' · ' + (counts.W + counts.B) + 'W ' + counts.L + 'L ' + counts.P + 'P' +
    (counts.B ? ' · ' + counts.B + ' blackjack' + (counts.B > 1 ? 's' : '') : '') + '\n' + grid;
}

window.openDaily = function(){
  if(S.mode === 'daily'){
    if(S.phase !== 'betting' || busy){ toast('Finish the hand first'); return }
    dailyTitle.textContent = 'Daily #' + dailyNum();
    dailyBody.innerHTML = '<p>End the daily now and lock in <b>' + fmt(S.bankroll) + '</b> as your final score?</p>';
    dailyRow.innerHTML = '<button class="tbtn" id="dKeep">Keep playing</button><button class="gbtn" id="dEnd">Lock it in</button>';
    $id('dKeep').onclick = function(){ ovDaily.classList.remove('show') };
    $id('dEnd').onclick = function(){ ovDaily.classList.remove('show'); finishDaily() };
    ovDaily.classList.add('show');
    return;
  }
  if(S.mode !== 'free' || S.phase !== 'betting' || busy){ toast('Finish what you are doing first'); return }
  const d = store.get('bj-daily', { streak: 0, last: '', history: {} });
  const rec = d.history[todayKey()];
  if(rec){
    showDailyResult(rec.score, rec.results || '', d.streak, rec.final === false);
    return;
  }
  dailyTitle.textContent = 'Daily #' + dailyNum();
  dailyBody.innerHTML =
    '<p>One shot per day. Everyone in the world gets this <b>exact same shuffle</b>. You start with $1,000 and play ' +
    '15 hands — side bets, doubles, splits, all of it. Your final bankroll is your score.</p>' +
    '<p>Leaving early locks in your score, and a refresh counts as an abandoned attempt — bet wisely.</p>' +
    (d.streak ? '<p>Current daily streak: <b>' + d.streak + '</b> 🔥</p>' : '');
  dailyRow.innerHTML = '<button class="tbtn" id="dCancel">Not today</button><button class="gbtn" id="dStart">Deal me in</button>';
  $id('dCancel').onclick = function(){ ovDaily.classList.remove('show') };
  $id('dStart').onclick = startDaily;
  ovDaily.classList.add('show');
};

function startDaily(){
  if(S.mode !== 'free' || S.phase !== 'betting' || busy) return;
  if(S.bet > 0 || sideTotal() > 0){
    S.bankroll += S.bet + sideTotal();
    S.bet = 0;
    S.side = { pp: 0, tp: 0, ll: 0, bust: 0 };
    saveBank();
  }
  const d = store.get('bj-daily', { streak: 0, last: '', history: {} });
  const today = todayKey();
  if(d.history[today] == null){
    d.streak = (d.last === yesterKey()) ? d.streak + 1 : 1;
    d.last = today;
    d.history[today] = { score: 0, results: '', final: false };
    const keys = Object.keys(d.history).sort();
    while(keys.length > 40) delete d.history[keys.shift()];
    store.set('bj-daily', d);
  }
  S.freeBank = S.bankroll;
  S.mode = 'daily';
  S.bankroll = 1000;
  S.daily = { hands: 0, max: 15, results: [], key: today };
  S.lastBet = 0;
  S.rng = seededRng('royal-bj-daily-' + today);
  newShoe();
  ovDaily.classList.remove('show');
  hideBanner();
  btnDaily.textContent = 'Exit daily';
  renderBankroll(); renderBet(); renderSide(); updateButtons(); renderModeBadge();
  msg('Daily — hand 1 of ' + S.daily.max + ' · place your bet');
  toast('Daily #' + dailyNum() + ' — everyone plays this exact shoe');
}

function dailyAfterRound(){
  const D = S.daily;
  D.hands++;
  D.results.push(S.lastBJ ? 'B' : S.lastNet > 0 ? 'W' : S.lastNet < 0 ? 'L' : 'P');
  if(D.hands >= D.max || S.bankroll < 5){
    finishDaily();
    return true;
  }
  renderModeBadge();
  msg('Daily — hand ' + (D.hands + 1) + ' of ' + D.max + ' · place your bet');
  return true;
}

function finishDaily(){
  S.bankroll += S.bet + sideTotal();
  S.bet = 0;
  S.side = { pp: 0, tp: 0, ll: 0, bust: 0 };
  const key = (S.daily && S.daily.key) || todayKey();
  const score = Math.round(S.bankroll * 100) / 100;
  const results = S.daily.results.join('');
  const d = store.get('bj-daily', { streak: 0, last: '', history: {} });
  d.history[key] = { score: score, results: results, final: true };
  store.set('bj-daily', d);
  if(window.checkAwards) checkAwards('daily', { streak: d.streak });
  S.mode = 'free';
  S.rng = null;
  S.bankroll = S.freeBank != null ? S.freeBank : 1000;
  S.freeBank = null;
  S.daily = null;
  newShoe();
  saveBank();
  btnDaily.textContent = 'Daily';
  renderBankroll(); renderBet(); renderSide(); updateButtons(); renderModeBadge();
  msg('Back at the regular table — place your bet');
  showDailyResult(score, results, d.streak, false);
}

function showDailyResult(score, results, streak, abandoned){
  const map = { W: '🟩', L: '🟥', P: '🟨', B: '🟦' };
  let grid = '';
  for(const ch of results) grid += map[ch] || '';
  dailyTitle.textContent = 'Daily #' + dailyNum() + (abandoned ? ' — abandoned' : ' — done');
  dailyBody.innerHTML =
    '<p style="font-size:26px;font-weight:800;color:#f6dd9a;margin:4px 0 10px">' + fmt(score) + '</p>' +
    (grid ? '<p style="font-size:17px;letter-spacing:2px;margin:0 0 10px">' + grid + '</p>' : '') +
    (streak ? '<p>Daily streak: <b>' + streak + '</b> 🔥</p>' : '') +
    '<p>Next daily in ' + nextDailyIn() + '.</p>';
  dailyRow.innerHTML = '<button class="tbtn" id="dShare">Share result</button><button class="gbtn" id="dClose">Close</button>';
  $id('dShare').onclick = function(){ copyText(dailyShareText(score, results)) };
  $id('dClose').onclick = function(){ ovDaily.classList.remove('show') };
  ovDaily.classList.add('show');
}

window.modeAfterRound = function(){
  if(S.mode === 'daily') return dailyAfterRound();
  if(S.mode === 'run' && window.runAfterRound) return window.runAfterRound();
  return false;
};
