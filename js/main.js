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

rack.querySelectorAll('.chip').forEach(function(el){
  el.addEventListener('click', function(){ placeChip(+el.dataset.d) });
});

btnStats.addEventListener('click', function(){
  renderStatsPanel();
  ovStats.classList.add('show');
});
btnStatsClose.addEventListener('click', function(){ ovStats.classList.remove('show') });
btnRules.addEventListener('click', function(){ ovRules.classList.add('show') });
btnRulesClose.addEventListener('click', function(){ ovRules.classList.remove('show') });

btnReset.addEventListener('click', function(){
  if(S.phase !== 'betting') return;
  S.bet = 0; S.bankroll = 1000;
  S.stats = { hands: 0, wins: 0, losses: 0, pushes: 0, bjs: 0, net: 0, bigWin: 0, streak: 0, bestStreak: 0, loans: 0 };
  saveBank(); saveStats();
  renderBankroll(); renderBet(); updateButtons(); renderStatsPanel();
  toast('Fresh start: $1,000');
});

btnLoan.addEventListener('click', function(){
  ovLoan.classList.remove('show');
  S.bankroll += 1000;
  S.stats.loans++;
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
    if(e.key === 'Escape') closeOverlays();
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

newShoe();
bankAmt.textContent = fmt(S.bankroll);
btnSound.textContent = muted ? 'Sound off' : 'Sound on';
renderBet(); updateButtons(); renderShoe();
msg('Place your bet');
if(S.bankroll < 5){
  $id('loanText').textContent = 'The pit boss looks you over, sighs, and slides a fresh $1,000 across the felt. The house keeps track of these things. (Loan #' + (S.stats.loans + 1) + ')';
  ovLoan.classList.add('show');
}
