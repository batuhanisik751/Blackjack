'use strict';

async function sweepTable(){
  const cards = app.querySelectorAll('.hand .card');
  if(cards.length){
    cards.forEach(function(el, i){
      el.style.transitionDelay = (i * 30) + 'ms';
      el.classList.add('discard');
    });
    SFX.flip();
    await sleep(480 + cards.length * 30);
  }
  dealerHand.innerHTML = '';
  playerRow.innerHTML = '';
  hideBanner();
}

async function dealTo(i, opts){
  const c = draw();
  S.hands[i].cards.push(c);
  const el = await flyCard(c, $id('hand' + i), true);
  if(opts && opts.dbl) el.classList.add('dbl');
  countCard(c);
  renderScores(); renderShoe();
  return el;
}

async function dealDealerCard(faceUp){
  const c = draw();
  S.dealer.push(c);
  await flyCard(c, dealerHand, faceUp);
  if(faceUp) countCard(c);
  renderScores(); renderShoe();
}

async function revealHole(){
  const el = dealerHand.children[1];
  if(el && !el.classList.contains('faceup')){
    el.classList.add('faceup');
    SFX.flip();
    countCard(S.dealer[1]);
    await sleep(330);
    renderScores();
  }
}

function offerInsurance(){
  return new Promise(function(res){
    insText.textContent = 'The dealer shows an ace. Insurance costs ' + fmt(S.hands[0].bet / 2) + ' and pays 2 to 1 if the dealer has blackjack.';
    ovInsurance.classList.add('show');
    function done(v){
      ovInsurance.classList.remove('show');
      btnInsYes.onclick = null;
      btnInsNo.onclick = null;
      res(v);
    }
    btnInsYes.onclick = function(){ done(true) };
    btnInsNo.onclick = function(){ done(false) };
  });
}

async function deal(){
  if(btnDeal.disabled || busy || S.phase !== 'betting' || S.bet < 5) return;
  busy = true; updateButtons(); hideBanner();
  if(S.shoe.length < RESHUFFLE){
    msg('Shuffling a fresh six-deck shoe…');
    SFX.shuffle();
    shoeStack.classList.add('shuffling');
    await sleep(1050);
    shoeStack.classList.remove('shuffling');
    newShoe();
    toast('New shoe in play');
  }
  S.lastBet = S.bet;
  store.set('bj-lastbet', S.lastBet);
  await sweepTable();
  S.hands = [{ cards: [], bet: S.bet, doubled: false, surrendered: false, busted: false, fromSplit: false, splitAces: false, done: false }];
  S.active = 0; S.dealer = []; S.insurance = 0; S.bet = 0;
  S.phase = 'dealing'; saveBank();
  rebuildHands(); renderBet(); updateButtons();
  msg('Dealing…');
  await dealTo(0);
  await dealDealerCard(true);
  await dealTo(0);
  await dealDealerCard(false);
  const up = cardVal(S.dealer[0]);
  if(up === 11 && S.bankroll >= S.hands[0].bet / 2){
    const take = await offerInsurance();
    if(take){
      S.insurance = S.hands[0].bet / 2;
      S.bankroll -= S.insurance;
      saveBank(); renderBankroll();
      SFX.chip();
      toast('Insurance bought: ' + fmt(S.insurance));
      await sleep(350);
    }
  }
  if(up >= 10){
    msg('Dealer checks for blackjack…');
    const hole = dealerHand.children[1];
    hole.classList.add('peek');
    await sleep(950);
    hole.classList.remove('peek');
    if(handValue(S.dealer).total === 21){
      await revealHole();
      await settleDealerBJ();
      return;
    }
    if(S.insurance > 0) toast('No blackjack — insurance lost');
    else toast('No blackjack');
  }
  if(isBJ(S.hands[0])){
    await revealHole();
    await sleep(380);
    await settleRound();
    return;
  }
  S.phase = 'player'; busy = false;
  updateButtons(); renderActive();
  msg('Your move');
}

async function actHit(){
  if(btnHit.disabled) return;
  busy = true; updateButtons();
  const i = S.active, h = S.hands[i];
  await dealTo(i);
  const t = handValue(h.cards).total;
  if(t > 21){
    h.busted = true; h.done = true;
    setTag(i, 'Bust', 'lose');
    SFX.lose();
    const w = $id('hw' + i);
    if(w) shakeEl(w);
    await sleep(680);
    await advance();
  }else if(t === 21){
    h.done = true;
    await advance();
  }else{
    busy = false; updateButtons();
  }
}

async function actStand(){
  if(btnStand.disabled) return;
  busy = true; updateButtons();
  S.hands[S.active].done = true;
  await advance();
}

async function actDouble(){
  if(btnDouble.disabled) return;
  busy = true; updateButtons();
  const i = S.active, h = S.hands[i];
  S.bankroll -= h.bet; h.bet *= 2; h.doubled = true;
  saveBank(); renderBankroll(); renderBet(); renderBetBadges();
  SFX.chip();
  flyChip(bankWrap, betCircle, Math.min(500, h.bet / 2 >= 100 ? 100 : 25));
  toast('Double down — one card');
  await sleep(330);
  await dealTo(i, { dbl: true });
  const t = handValue(h.cards).total;
  if(t > 21){
    h.busted = true;
    setTag(i, 'Bust', 'lose');
    SFX.lose();
    const w = $id('hw' + i);
    if(w) shakeEl(w);
    await sleep(620);
  }
  h.done = true;
  await advance();
}

async function actSplit(){
  if(btnSplit.disabled) return;
  busy = true; updateButtons();
  const h = S.hands[0];
  const c2 = h.cards.pop();
  const aces = h.cards[0].r === 'A' && c2.r === 'A';
  h.fromSplit = true; h.splitAces = aces;
  S.hands.push({ cards: [c2], bet: h.bet, doubled: false, surrendered: false, busted: false, fromSplit: true, splitAces: aces, done: false });
  S.bankroll -= h.bet;
  saveBank(); renderBankroll();
  SFX.chip();
  rebuildHands(); renderBet();
  toast(aces ? 'Splitting aces — one card each' : 'Splitting the pair');
  await sleep(420);
  await dealTo(0);
  if(aces){
    h.done = true;
    await advance();
  }else if(handValue(h.cards).total === 21){
    h.done = true;
    toast('21!');
    await advance();
  }else{
    busy = false;
    updateButtons(); renderActive();
    msg('Hand 1 — your move');
  }
}

async function actSurrender(){
  if(btnSurrender.disabled) return;
  busy = true; updateButtons();
  const h = S.hands[0];
  h.surrendered = true; h.done = true;
  setTag(0, 'Surrender', 'push');
  toast('Surrendered — half the bet comes back');
  await sleep(550);
  await advance();
}

async function advance(){
  if(S.active < S.hands.length - 1){
    S.active++;
    renderActive();
    const h = S.hands[S.active];
    if(h.cards.length === 1){
      await dealTo(S.active);
      if(h.splitAces){
        h.done = true;
        await sleep(380);
        return advance();
      }
      if(handValue(h.cards).total === 21){
        h.done = true;
        toast('21!');
        return advance();
      }
    }
    S.phase = 'player'; busy = false;
    updateButtons(); renderActive();
    msg('Hand ' + (S.active + 1) + ' — your move');
  }else{
    await dealerTurn();
  }
}

async function dealerTurn(){
  S.phase = 'dealer';
  renderActive(); updateButtons();
  await sleep(320);
  await revealHole();
  const live = S.hands.some(function(h){ return !h.busted && !h.surrendered });
  if(live){
    msg('Dealer plays…');
    while(handValue(S.dealer).total < 17){
      await sleep(430);
      await dealDealerCard(true);
    }
    if(handValue(S.dealer).total > 21) msg('Dealer busts!');
  }
  await sleep(560);
  await settleRound();
}

async function settleRound(){
  S.phase = 'settle';
  updateButtons(); renderActive();
  const dv = handValue(S.dealer).total, dBust = dv > 21;
  let stake = S.insurance, ret = 0, bjHit = false;
  const res = [];
  for(const h of S.hands){
    stake += h.bet;
    let r = 0, txt = '', cls = '';
    if(h.surrendered){ r = h.bet / 2; txt = '−' + fmt(h.bet / 2).slice(1); cls = 'push'; S.stats.losses++ }
    else if(h.busted){ r = 0; txt = 'Bust −' + fmt(h.bet).slice(1); cls = 'lose'; S.stats.losses++ }
    else if(isBJ(h)){ r = h.bet * 2.5; txt = 'Blackjack +' + fmt(h.bet * 1.5).slice(1); cls = 'bj'; S.stats.wins++; S.stats.bjs++; bjHit = true }
    else{
      const t = handValue(h.cards).total;
      if(dBust || t > dv){ r = h.bet * 2; txt = 'Win +' + fmt(h.bet).slice(1); cls = 'win'; S.stats.wins++ }
      else if(t < dv){ r = 0; txt = '−' + fmt(h.bet).slice(1); cls = 'lose'; S.stats.losses++ }
      else{ r = h.bet; txt = 'Push'; cls = 'push'; S.stats.pushes++ }
    }
    ret += r;
    res.push({ txt: txt, cls: cls });
  }
  S.stats.hands += S.hands.length;
  const net = ret - stake;
  S.bankroll += ret;
  saveBank();
  S.stats.net += net;
  if(net > S.stats.bigWin) S.stats.bigWin = net;
  S.stats.streak = net > 0 ? S.stats.streak + 1 : (net < 0 ? 0 : S.stats.streak);
  if(S.stats.streak > S.stats.bestStreak) S.stats.bestStreak = S.stats.streak;
  saveStats();
  res.forEach(function(r, i){ setTag(i, r.txt, r.cls) });
  renderBankroll(); renderBet();
  const allPush = res.every(function(r){ return r.cls === 'push' });
  if(bjHit){ showBanner('Blackjack!', 'bj'); SFX.big(); confetti(190, true) }
  else if(net > 0){ showBanner('You win +' + fmt(net).slice(1), 'win'); SFX.win(); if(net >= 100) confetti(120, false) }
  else if(net < 0 && !allPush){
    const allBust = S.hands.every(function(h){ return h.busted });
    showBanner((allBust ? 'Bust ' : 'Dealer wins ') + '−' + fmt(net).slice(2), 'lose');
    SFX.lose();
  }
  else{ showBanner('Push', 'push'); SFX.push() }
  payoutFx(net);
  await sleep(1950);
  enterBetting();
}

async function settleDealerBJ(){
  S.phase = 'settle';
  updateButtons(); renderActive();
  const h = S.hands[0];
  let ret = 0;
  const stake = h.bet + S.insurance;
  if(S.insurance > 0){
    ret += S.insurance * 3;
    toast('Insurance pays ' + fmt(S.insurance * 2));
  }
  if(isBJ(h)){
    ret += h.bet;
    S.stats.pushes++;
    setTag(0, 'Push', 'push');
    showBanner('Push — both blackjack', 'push');
    SFX.push();
  }else{
    S.stats.losses++;
    setTag(0, '−' + fmt(h.bet).slice(1), 'lose');
    showBanner('Dealer blackjack', 'lose');
    SFX.lose();
  }
  S.stats.hands++;
  const net = ret - stake;
  S.bankroll += ret;
  saveBank();
  S.stats.net += net;
  if(net > S.stats.bigWin) S.stats.bigWin = net;
  S.stats.streak = net > 0 ? S.stats.streak + 1 : (net < 0 ? 0 : S.stats.streak);
  if(S.stats.streak > S.stats.bestStreak) S.stats.bestStreak = S.stats.streak;
  saveStats();
  renderBankroll(); renderBet();
  if(net > 0) SFX.win();
  await sleep(1950);
  enterBetting();
}

function enterBetting(){
  S.phase = 'betting'; S.insurance = 0; busy = false;
  renderBet(); updateButtons(); renderActive();
  msg(S.lastBet ? 'Place your bet — or press Rebet' : 'Place your bet');
  bannerT = setTimeout(hideBanner, 2600);
  if(S.bankroll < 5 && S.bet === 0){
    $id('loanText').textContent = 'The pit boss looks you over, sighs, and slides a fresh $1,000 across the felt. The house keeps track of these things. (Loan #' + (S.stats.loans + 1) + ')';
    ovLoan.classList.add('show');
  }else if(S.shoe.length < RESHUFFLE){
    toast('Shoe is running low — shuffling on the next deal');
  }
}

function placeChip(d){
  if(S.phase !== 'betting' || busy) return;
  if(S.bankroll < d){
    toast('Not enough bankroll');
    shakeEl(bankWrap);
    return;
  }
  S.bankroll -= d; S.bet += d;
  saveBank();
  SFX.chip();
  const rc = rack.querySelector('[data-d="' + d + '"]');
  if(rc) flyChip(rc, betCircle, d);
  renderBankroll(); renderBet(); updateButtons();
}

function clearBet(){
  if(btnClear.disabled) return;
  S.bankroll += S.bet; S.bet = 0;
  saveBank();
  SFX.chip();
  flyChip(betCircle, bankWrap, 25);
  renderBankroll(); renderBet(); updateButtons();
}

function rebet(){
  if(btnRebet.disabled) return;
  S.bankroll += S.bet;
  S.bet = S.lastBet;
  S.bankroll -= S.bet;
  saveBank();
  SFX.chip();
  flyChip(btnRebet, betCircle, S.lastBet >= 100 ? 100 : S.lastBet >= 25 ? 25 : 5);
  renderBankroll(); renderBet(); updateButtons();
}
