'use strict';

async function sweepTable(){
  const cards = app.querySelectorAll('.hand .card');
  if(cards.length){
    cards.forEach(function(el, i){
      el.style.transitionDelay = (i * 30) + 'ms';
      el.classList.remove('dbl');
      el.classList.add('discard');
    });
    SFX.flip();
    await wait(480 + cards.length * 30);
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
    await wait(330);
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
  if(S.shoe.length < shufflePoint()){
    msg('Shuffling a fresh six-deck shoe…');
    SFX.shuffle();
    shoeStack.classList.add('shuffling');
    await wait(1050);
    shoeStack.classList.remove('shuffling');
    newShoe();
    toast('New shoe in play');
  }
  S.lastBet = S.bet;
  store.set('bj-lastbet', S.lastBet);
  S.lastSide = Object.assign({}, S.side);
  store.set('bj-lastside', S.lastSide);
  await sweepTable();
  S.hands = [{ cards: [], bet: S.bet, doubled: false, surrendered: false, busted: false, fromSplit: false, splitAces: false, done: false }];
  S.active = 0; S.dealer = []; S.insurance = 0; S.bet = 0; S.insFree = false;
  S.phase = 'dealing'; saveBank();
  S.wasAllIn = S.bankroll === 0;
  S.preRoundBank = S.bankroll + inPlay();
  rebuildHands(); renderBet(); updateButtons();
  msg('Dealing…');
  await dealTo(0);
  await dealDealerCard(true);
  await dealTo(0);
  await dealDealerCard(false);
  await resolveEarlySides();
  const up = cardVal(S.dealer[0]);
  if(up === 11 && S.bankroll >= S.hands[0].bet / 2){
    const take = await offerInsurance();
    coachInsurance(take);
    if(take){
      S.insurance = S.hands[0].bet / 2;
      S.insFree = !!(S.mode === 'run' && S.run && S.run.perks.insFree);
      if(!S.insFree) S.bankroll -= S.insurance;
      saveBank(); renderBankroll();
      SFX.chip();
      toast(S.insFree ? 'Insurance comped by the house' : 'Insurance bought: ' + fmt(S.insurance));
      await wait(350);
    }
  }
  if(up >= 10 && S.rules.peek){
    msg('Dealer checks for blackjack…');
    const hole = dealerHand.children[1];
    hole.classList.add('peek');
    await wait(950);
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
    await wait(380);
    if(S.side.bust > 0) await dealerTurn();
    else await settleRound();
    return;
  }
  S.phase = 'player'; busy = false;
  updateButtons(); renderActive();
  msg('Your move');
}

async function actHit(){
  if(btnHit.disabled) return;
  coachNote('Hit');
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
    await wait(680);
    await advance();
  }else if(S.mode === 'run' && S.run && S.run.perks.charlie && h.cards.length >= 5){
    toast('Five-card Charlie!');
    h.done = true;
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
  coachNote('Stand');
  busy = true; updateButtons();
  S.hands[S.active].done = true;
  await advance();
}

async function actDouble(){
  if(btnDouble.disabled) return;
  coachNote('Double');
  busy = true; updateButtons();
  const i = S.active, h = S.hands[i];
  const freeD = S.mode === 'run' && S.run && S.run.perks.freeDouble && !S.run.freeDoubleUsed;
  if(freeD){ S.run.freeDoubleUsed = true; h.freeDble = true }
  else S.bankroll -= h.bet;
  h.bet *= 2; h.doubled = true;
  saveBank(); renderBankroll(); renderBet(); renderBetBadges();
  SFX.chip();
  flyChip(bankWrap, betCircle, Math.min(500, h.bet / 2 >= 100 ? 100 : 25));
  toast(freeD ? 'Double down — on the house!' : 'Double down — one card');
  await wait(330);
  await dealTo(i, { dbl: true });
  const t = handValue(h.cards).total;
  if(t > 21){
    h.busted = true;
    setTag(i, 'Bust', 'lose');
    SFX.lose();
    const w = $id('hw' + i);
    if(w) shakeEl(w);
    await wait(620);
  }
  h.done = true;
  await advance();
}

async function actSplit(){
  if(btnSplit.disabled) return;
  coachNote('Split');
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
  await wait(420);
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
  coachNote('Surrender');
  busy = true; updateButtons();
  const h = S.hands[0];
  h.surrendered = true; h.done = true;
  setTag(0, 'Surrender', 'push');
  toast('Surrendered — half the bet comes back');
  await wait(550);
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
        await wait(380);
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
  await wait(320);
  await revealHole();
  const live = S.hands.some(function(h){ return !h.busted && !h.surrendered }) || S.side.bust > 0;
  if(live){
    msg('Dealer plays…');
    while(true){
      const dvv = handValue(S.dealer);
      if(dvv.total < 17 || (S.rules.h17 && dvv.total === 17 && dvv.soft)){
        await wait(430);
        await dealDealerCard(true);
      }else break;
    }
    if(handValue(S.dealer).total > 21) msg('Dealer busts!');
  }
  await wait(560);
  await settleRound();
}

async function settleRound(){
  S.phase = 'settle';
  updateButtons(); renderActive();
  const dv = handValue(S.dealer).total, dBust = dv > 21;
  const dealerBJ = S.dealer.length === 2 && dv === 21;
  resolveBuster(dBust);
  const statsBak = S.mode === 'free' ? null : JSON.parse(JSON.stringify(S.stats));
  const RP = (S.mode === 'run' && S.run) ? S.run.perks : {};
  let stake = S.insFree ? 0 : S.insurance, ret = 0, bjHit = false;
  const res = [];
  for(const h of S.hands){
    stake += h.freeDble ? h.bet / 2 : h.bet;
    let r = 0, txt = '', cls = '';
    if(h.surrendered){
      const sr = RP.surr75 ? 0.75 : 0.5;
      r = h.bet * sr; txt = '−' + fmt(h.bet * (1 - sr)).slice(1); cls = 'push'; S.stats.losses++;
    }
    else if(h.busted){ r = 0; txt = 'Bust −' + fmt(h.bet).slice(1); cls = 'lose'; S.stats.losses++ }
    else if(isBJ(h)){
      if(dealerBJ){ r = h.bet; txt = 'Push'; cls = 'push'; S.stats.pushes++ }
      else{
        const bjp = RP.bj2x ? 2 : S.rules.bjPay;
        r = h.bet * (1 + bjp); txt = 'Blackjack +' + fmt(h.bet * bjp).slice(1); cls = 'bj'; S.stats.wins++; S.stats.bjs++; bjHit = true;
      }
    }
    else if(RP.charlie && h.cards.length >= 5){ r = h.bet * 2; txt = 'Charlie +' + fmt(h.bet).slice(1); cls = 'win'; S.stats.wins++ }
    else if(dealerBJ){ r = 0; txt = '−' + fmt(h.bet).slice(1); cls = 'lose'; S.stats.losses++ }
    else{
      const t = handValue(h.cards).total;
      if(dBust || t > dv){ r = h.bet * 2; txt = 'Win +' + fmt(h.bet).slice(1); cls = 'win'; S.stats.wins++ }
      else if(t < dv){ r = 0; txt = '−' + fmt(h.bet).slice(1); cls = 'lose'; S.stats.losses++ }
      else{
        r = h.bet * (RP.pushWin ? 1.25 : 1);
        txt = RP.pushWin ? 'Push +' + fmt(h.bet * 0.25).slice(1) : 'Push';
        cls = 'push'; S.stats.pushes++;
      }
    }
    if(h.freeDble){
      if(r === h.bet * 2) r = h.bet * 1.5;
      else if(r === h.bet * 1.25) r = h.bet * 0.75;
      else if(r === h.bet) r = h.bet / 2;
    }
    ret += r;
    res.push({ txt: txt, cls: cls });
  }
  if(S.insurance > 0 && dealerBJ){
    ret += S.insurance * (S.insFree ? 2 : 3);
    toast('Insurance pays ' + fmt(S.insurance * 2));
  }
  S.stats.hands += S.hands.length;
  const net = ret - stake + S.sideNet;
  S.sideNet = 0;
  S.bankroll += ret;
  saveBank();
  S.stats.net += net;
  if(net > S.stats.bigWin) S.stats.bigWin = net;
  S.stats.streak = net > 0 ? S.stats.streak + 1 : (net < 0 ? 0 : S.stats.streak);
  if(S.stats.streak > S.stats.bestStreak) S.stats.bestStreak = S.stats.streak;
  S.lastNet = net; S.lastBJ = bjHit;
  if(statsBak) S.stats = statsBak; else { saveStats(); pushHistory(); }
  res.forEach(function(r, i){ setTag(i, r.txt, r.cls) });
  renderBankroll(); renderBet();
  const allPush = res.every(function(r){ return r.cls === 'push' });
  if(bjHit){ await hitStop(); showBanner('Blackjack!', 'bj'); SFX.big(); confetti(190, true) }
  else if(net > 0){
    showBanner('You win +' + fmt(net).slice(1), 'win');
    SFX.win(S.stats.streak);
    if(net >= 100) confetti(Math.min(240, Math.round(80 + net / 2)), false);
  }
  else if(net < 0){
    const allSurr = S.hands.every(function(h){ return h.surrendered });
    const allBust = S.hands.every(function(h){ return h.busted });
    if(allSurr){ showBanner('Surrendered −' + fmt(net).slice(2), 'push'); SFX.lose() }
    else if(allPush){ showBanner('Push — insurance lost', 'push'); SFX.push() }
    else{ showBanner((dealerBJ ? 'Dealer blackjack ' : allBust ? 'Bust ' : 'Dealer wins ') + '−' + fmt(net).slice(2), 'lose'); SFX.lose() }
    if(net <= -100) shakeEl(app);
  }
  else{ showBanner('Push', 'push'); SFX.push() }
  if(window.checkAwards) checkAwards('round', { net: net, bjHit: bjHit, res: res });
  payoutFx(net);
  await wait(1950);
  enterBetting();
}

async function settleDealerBJ(){
  S.phase = 'settle';
  updateButtons(); renderActive();
  resolveBuster(false);
  const statsBak = S.mode === 'free' ? null : JSON.parse(JSON.stringify(S.stats));
  const h = S.hands[0];
  let ret = 0;
  const stake = h.bet + (S.insFree ? 0 : S.insurance);
  if(S.insurance > 0){
    ret += S.insurance * (S.insFree ? 2 : 3);
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
  const net = ret - stake + S.sideNet;
  S.sideNet = 0;
  S.bankroll += ret;
  saveBank();
  S.stats.net += net;
  if(net > S.stats.bigWin) S.stats.bigWin = net;
  S.stats.streak = net > 0 ? S.stats.streak + 1 : (net < 0 ? 0 : S.stats.streak);
  if(S.stats.streak > S.stats.bestStreak) S.stats.bestStreak = S.stats.streak;
  S.lastNet = net; S.lastBJ = false;
  if(statsBak) S.stats = statsBak; else { saveStats(); pushHistory(); }
  renderBankroll(); renderBet();
  if(net > 0) SFX.win();
  if(window.checkAwards) checkAwards('round', { net: net, bjHit: false, res: [] });
  await wait(1950);
  enterBetting();
}

function enterBetting(){
  S.phase = 'betting'; S.insurance = 0; busy = false;
  renderBet(); updateButtons(); renderActive();
  bannerT = setTimeout(hideBanner, 2600);
  applyHeater();
  if(S.mode !== 'free' && window.modeAfterRound && window.modeAfterRound()) return;
  msg((S.lastBet ? 'Place your bet — or press Rebet' : 'Place your bet') +
    (S.mode === 'free' && S.stats.streak >= 3 ? ' · ' + S.stats.streak + ' win streak 🔥' : ''));
  if(S.bankroll < 5 && S.bet === 0){
    $id('loanText').textContent = 'The pit boss looks you over, sighs, and slides a fresh $1,000 across the felt. The house keeps track of these things. (Loan #' + (S.stats.loans + 1) + ')';
    ovLoan.classList.add('show');
  }else if(S.shoe.length < shufflePoint()){
    toast('Shoe is running low — shuffling on the next deal');
  }
  if(window.maybeCountQuiz) window.maybeCountQuiz();
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
  S.bankroll += S.bet + sideTotal();
  S.bet = 0;
  S.side = { pp: 0, tp: 0, ll: 0, bust: 0 };
  saveBank();
  SFX.chip();
  flyChip(betCircle, bankWrap, 25);
  renderBankroll(); renderBet(); renderSide(); updateButtons();
}

function rebet(){
  if(btnRebet.disabled) return;
  S.bankroll += S.bet + sideTotal();
  S.bet = S.lastBet;
  S.side = Object.assign({}, S.lastSide);
  S.bankroll -= S.bet + sideTotal();
  saveBank();
  SFX.chip();
  flyChip(btnRebet, betCircle, S.lastBet >= 100 ? 100 : S.lastBet >= 25 ? 25 : 5);
  renderBankroll(); renderBet(); renderSide(); updateButtons();
}
