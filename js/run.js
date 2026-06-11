'use strict';

const RUN_TARGETS = [400, 550, 750, 1000, 1350, 1800, 2400, 3200];

const PERKS = [
  { id: 'bj2x', name: 'Royal payday', desc: 'Blackjack pays 2:1' },
  { id: 'freeDouble', name: 'House money', desc: 'First double each round is on the house — lose it and only your original bet is gone' },
  { id: 'surr75', name: 'Soft exit', desc: 'Surrender returns 75% of the bet' },
  { id: 'stipend', name: 'Allowance', desc: '+$75 added at the start of every round' },
  { id: 'pushWin', name: 'Tiebreaker', desc: 'Pushes pay you 25% of the bet' },
  { id: 'charlie', name: 'Five-card Charlie', desc: 'Five-card hands under 22 win automatically' },
  { id: 'insFree', name: 'Comped insurance', desc: 'Insurance costs nothing, still pays 2:1' }
];

function runBest(){ return store.get('bj-run', { clears: 0, bestRound: 0, bestBank: 0 }) }

window.openRun = function(){
  if(S.mode === 'run'){
    if(S.phase !== 'betting' || busy){ toast('Finish the hand first'); return }
    runTitle.textContent = 'Run — round ' + S.run.round;
    runBody.innerHTML = '<p>Walk away now? The run ends and your career bankroll comes back.</p>';
    runRow.innerHTML = '<button class="tbtn" id="rKeep">Keep going</button><button class="gbtn" id="rEnd">End the run</button>';
    $id('rKeep').onclick = function(){ ovRun.classList.remove('show') };
    $id('rEnd').onclick = function(){ ovRun.classList.remove('show'); finishRun(false) };
    ovRun.classList.add('show');
    return;
  }
  if(S.mode !== 'free' || S.phase !== 'betting' || busy){ toast('Finish what you are doing first'); return }
  const b = runBest();
  runTitle.textContent = 'Run mode';
  runBody.innerHTML =
    '<p>Start with <b>$300</b> and survive 8 rounds of rising bankroll targets — 5 hands per round to hit the number. ' +
    'Clear a round, pick one of three table-bending perks. Miss a target and the run is over.</p>' +
    '<p style="font:400 12px var(--sans)">Targets: ' + RUN_TARGETS.map(function(t){ return '$' + t }).join(' → ') + '</p>' +
    (b.bestRound ? '<p>Best: round ' + b.bestRound + ' · ' + fmt(b.bestBank) + (b.clears ? ' · ' + b.clears + ' full clear' + (b.clears > 1 ? 's' : '') : '') + '</p>' : '');
  runRow.innerHTML = '<button class="tbtn" id="rCancel">Not now</button><button class="gbtn" id="rStart">Take the seat</button>';
  $id('rCancel').onclick = function(){ ovRun.classList.remove('show') };
  $id('rStart').onclick = startRun;
  ovRun.classList.add('show');
};

function startRun(){
  if(S.mode !== 'free' || S.phase !== 'betting' || busy) return;
  if(S.bet > 0 || sideTotal() > 0){
    S.bankroll += S.bet + sideTotal();
    S.bet = 0;
    S.side = { pp: 0, tp: 0, ll: 0, bust: 0 };
    saveBank();
  }
  S.freeBank = S.bankroll;
  S.mode = 'run';
  S.bankroll = 300;
  S.lastBet = 0;
  S.run = { round: 1, maxRounds: 8, handsLeft: 5, perks: {}, taken: [], freeDoubleUsed: false };
  newShoe();
  ovRun.classList.remove('show');
  hideBanner();
  btnRun.textContent = 'Exit run';
  renderBankroll(); renderBet(); renderSide(); updateButtons(); renderModeBadge();
  msg('Run round 1 — reach ' + fmt(RUN_TARGETS[0]) + ' within 5 hands');
  toast('The pit boss is watching. Good luck.');
}

window.runAfterRound = function(){
  const R = S.run;
  R.handsLeft--;
  renderModeBadge();
  const target = RUN_TARGETS[R.round - 1];
  if(S.bankroll >= target){ roundClear(); return true }
  if(R.handsLeft <= 0 || S.bankroll < 5){ finishRun(false); return true }
  msg('Run round ' + R.round + ' — ' + R.handsLeft + ' hand' + (R.handsLeft > 1 ? 's' : '') + ' to reach ' + fmt(target));
  return true;
};

function roundClear(){
  const R = S.run;
  R.round++;
  renderModeBadge();
  if(R.round > R.maxRounds){ finishRun(true); return }
  SFX.win(5);
  const pool = PERKS.filter(function(p){ return R.taken.indexOf(p.id) < 0 });
  const offer = [];
  while(offer.length < Math.min(3, pool.length)){
    const p = pool[Math.floor(Math.random() * pool.length)];
    if(offer.indexOf(p) < 0) offer.push(p);
  }
  runTitle.textContent = 'Round ' + (R.round - 1) + ' cleared';
  runBody.innerHTML = '<p>Next target: <b>' + fmt(RUN_TARGETS[R.round - 1]) + '</b> in 5 hands. Pick a perk:</p>' +
    '<div class="perk-row">' + offer.map(function(p){
      return '<button class="perk" data-perk="' + p.id + '"><b>' + p.name + '</b><span>' + p.desc + '</span></button>';
    }).join('') + '</div>';
  runRow.innerHTML = '';
  runBody.querySelectorAll('.perk').forEach(function(el){
    el.onclick = function(){
      const id = el.dataset.perk;
      R.perks[id] = 1;
      R.taken.push(id);
      R.handsLeft = 5;
      R.freeDoubleUsed = false;
      if(R.perks.stipend){ S.bankroll += 75; renderBankroll(); toast('Allowance: +$75') }
      ovRun.classList.remove('show');
      renderModeBadge(); updateButtons();
      msg('Run round ' + R.round + ' — reach ' + fmt(RUN_TARGETS[R.round - 1]) + ' within 5 hands');
    };
  });
  ovRun.classList.add('show');
}

function finishRun(won){
  const R = S.run;
  S.bankroll += S.bet + sideTotal();
  S.bet = 0;
  S.side = { pp: 0, tp: 0, ll: 0, bust: 0 };
  const finalBank = S.bankroll;
  const b = runBest();
  if(won) b.clears++;
  if(R.round > b.bestRound) b.bestRound = Math.min(R.round, R.maxRounds);
  if(finalBank > b.bestBank) b.bestBank = finalBank;
  store.set('bj-run', b);
  if(won && window.checkAwards) checkAwards('run', {});
  S.mode = 'free';
  S.run = null;
  S.bankroll = S.freeBank != null ? S.freeBank : 1000;
  S.freeBank = null;
  newShoe();
  saveBank();
  btnRun.textContent = 'Run';
  renderBankroll(); renderBet(); renderSide(); updateButtons(); renderModeBadge();
  msg('Back at the regular table — place your bet');
  runTitle.textContent = won ? 'Run cleared!' : 'Run over';
  runBody.innerHTML = won
    ? '<p style="font-size:22px;font-weight:800;color:#f6dd9a">All 8 rounds cleared — ' + fmt(finalBank) + '</p><p>The pit boss quietly tears up your loan history. Legend status.</p>'
    : '<p>You made it to <b>round ' + R.round + '</b> with ' + fmt(finalBank) + '.</p><p>Best so far: round ' + b.bestRound + ' · ' + fmt(b.bestBank) + '</p>';
  runRow.innerHTML = '<button class="gbtn" id="rClose">Close</button>';
  $id('rClose').onclick = function(){ ovRun.classList.remove('show') };
  ovRun.classList.add('show');
  if(won) confetti(220, true);
}
