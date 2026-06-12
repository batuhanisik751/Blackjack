'use strict';

btnDeal.addEventListener('click', deal);
btnHit.addEventListener('click', actHit);
btnStand.addEventListener('click', actStand);
btnDouble.addEventListener('click', actDouble);
btnSplit.addEventListener('click', actSplit);
btnSurrender.addEventListener('click', actSurrender);
btnClear.addEventListener('click', clearBet);
btnRebet.addEventListener('click', rebet);
btnHint.addEventListener('click', showHint);
btnCoach.addEventListener('click', toggleCoach);

rack.querySelectorAll('.chip').forEach(function(el){
  el.addEventListener('click', function(){ placeChip(+el.dataset.d) });
});
$id('sideRow').addEventListener('click', function(e){
  const spot = e.target.closest('.side-spot');
  if(spot) placeSide(spot.dataset.side);
});

btnMenu.addEventListener('click', function(){ openPanel(ovMenu) });
btnMenuClose.addEventListener('click', function(){ ovMenu.classList.remove('show') });
btnStats.addEventListener('click', function(){
  renderStatsPanel();
  openPanel(ovStats);
});
btnStatsClose.addEventListener('click', function(){ ovStats.classList.remove('show') });
btnRules.addEventListener('click', function(){ openPanel(ovRules) });
btnRulesClose.addEventListener('click', function(){ ovRules.classList.remove('show') });
mSettings.addEventListener('click', function(){ renderSettings(); openPanel(ovSettings) });
btnSettingsClose.addEventListener('click', function(){ ovSettings.classList.remove('show') });
function comingSoon(el){ el.innerHTML = '<p>Coming soon in this build…</p>' }
mAch.addEventListener('click', function(){ if(window.renderAchievements) window.renderAchievements(); else comingSoon(achBody); openPanel(ovAch) });
btnAchClose.addEventListener('click', function(){ ovAch.classList.remove('show') });
mTrainer.addEventListener('click', function(){ if(window.renderTrainer) window.renderTrainer(); else comingSoon(trainBody); openPanel(ovTrainer) });
btnTrainerClose.addEventListener('click', function(){ ovTrainer.classList.remove('show') });
mChart.addEventListener('click', function(){ if(window.renderChart) window.renderChart(); else comingSoon(chartBody); openPanel(ovChart) });
btnChartClose.addEventListener('click', function(){ ovChart.classList.remove('show') });
mFair.addEventListener('click', function(){ if(window.renderFair) window.renderFair(); else comingSoon(fairBody); openPanel(ovFair) });
btnFairClose.addEventListener('click', function(){ ovFair.classList.remove('show') });
btnDaily.addEventListener('click', function(){ if(window.openDaily) window.openDaily(); else toast('Daily challenge arrives later in this build') });
btnRun.addEventListener('click', function(){ if(window.openRun) window.openRun(); else toast('Run mode arrives later in this build') });
setBody.addEventListener('click', function(e){
  const b = e.target.closest('[data-set]');
  if(!b) return;
  if(b.dataset.set === 'speed'){
    S.opts.speed = b.dataset.v;
    saveOpts(); applyCosmetics(); renderSettings();
  }
  if(b.dataset.set === 'rule'){
    if(S.mode !== 'free'){ toast('Rules are locked during ' + S.mode + ' mode'); return }
    if(S.phase !== 'betting' || busy){ toast('Finish the hand first'); return }
    const R = S.rules, k = b.dataset.v;
    if(k === 'decks') R.decks = R.decks === 1 ? 2 : R.decks === 2 ? 4 : R.decks === 4 ? 6 : R.decks === 6 ? 8 : 1;
    else if(k === 'h17') R.h17 = !R.h17;
    else if(k === 'bjpay') R.bjPay = R.bjPay === 1.5 ? 1.2 : 1.5;
    else if(k === 'das') R.das = !R.das;
    else if(k === 'sur') R.surrender = !R.surrender;
    else if(k === 'peek') R.peek = !R.peek;
    saveRules();
    newShoe();
    renderArc(); renderSettings(); updateButtons();
    toast('Rules updated — fresh shoe in play');
  }
  if(window.settingsClick) window.settingsClick(b);
});

btnReset.addEventListener('click', function(){
  if(S.phase !== 'betting' || busy) return;
  if(S.mode !== 'free'){ toast('Reset is locked during ' + S.mode + ' mode'); return }
  S.bet = 0; S.side = { pp: 0, tp: 0, ll: 0, bust: 0 }; S.bankroll = 1000;
  S.stats = { hands: 0, wins: 0, losses: 0, pushes: 0, bjs: 0, net: 0, bigWin: 0, streak: 0, bestStreak: 0, loans: 0 };
  saveBank(); saveStats();
  renderBankroll(); renderBet(); updateButtons(); renderStatsPanel();
  toast('Fresh start: $1,000');
});

btnLoan.addEventListener('click', function(){
  ovLoan.classList.remove('show');
  S.bankroll += 1000;
  S.stats.loans++;
  if(window.checkAwards) checkAwards('loan', {});
  saveBank(); saveStats();
  renderBankroll(); updateButtons();
  SFX.win();
  toast('The house credits you $1,000… it remembers.');
});

btnSound.addEventListener('click', function(){
  muted = !muted;
  store.set('bj-muted', muted);
  btnSound.textContent = muted ? 'Sound off' : 'Sound on';
});

document.addEventListener('keydown', function(e){
  if(ovInsurance.classList.contains('show')){
    const k = e.key.toLowerCase();
    if(k === 'y') btnInsYes.click();
    if(k === 'n') btnInsNo.click();
    return;
  }
  if(document.querySelector('#bjApp .overlay.show')){
    if(e.key === 'Escape'){
      const q = $id('ovQuiz');
      if(q && q.classList.contains('show')){
        const pills = q.querySelectorAll('#quizOpts .pill');
        const skip = pills.length ? pills[pills.length - 1] : null;
        if(skip && skip.textContent === 'Skip') skip.click();
      }else closeOverlays();
    }
    return;
  }
  const k = e.key.toLowerCase();
  if(k === 'h') btnHit.click();
  else if(k === 's') btnStand.click();
  else if(k === 'd') btnDouble.click();
  else if(k === 'p') btnSplit.click();
  else if(k === 'u') btnSurrender.click();
  else if(k === 'r') btnRebet.click();
  else if(k === 'c') btnClear.click();
  else if(k === 'b') showHint();
  else if(k === 'k') toggleCoach();
  else if(k === 'm') btnSound.click();
  else if(k === '1') placeChip(5);
  else if(k === '2') placeChip(25);
  else if(k === '3') placeChip(100);
  else if(k === '4') placeChip(500);
  else if(e.key === 'Enter' || e.key === ' '){
    if(!btnDeal.disabled){
      e.preventDefault();
      btnDeal.click();
    }
  }
});

if('serviceWorker' in navigator && location.protocol !== 'file:'){
  try{ navigator.serviceWorker.register('../sw.js') }catch(e){}
}

newShoe();
applyCosmetics();
btnCoach.classList.toggle('on', S.opts.coach);
bankAmt.textContent = fmt(S.bankroll);
btnSound.textContent = muted ? 'Sound off' : 'Sound on';
renderBet(); updateButtons(); renderShoe();
msg('Place your bet');
if(S.bankroll < 5){
  $id('loanText').textContent = 'The pit boss looks you over, sighs, and slides a fresh $1,000 across the felt. The house keeps track of these things. (Loan #' + (S.stats.loans + 1) + ')';
  ovLoan.classList.add('show');
}

window.addEventListener('storage', function(e){
  if(e.key !== 'bj-bank') return;
  if(S.mode !== 'free' || S.phase !== 'betting' || busy || S.bet > 0 || sideTotal() > 0) return;
  const v = store.get('bj-bank', null);
  if(typeof v === 'number' && isFinite(v)){
    S.bankroll = v;
    renderBankroll(); updateButtons();
  }
});
