'use strict';

const { PERSONAS, preflopScore, equity, aiDecide } = require('../js/ai.js');

let pass = 0, fail = 0;
function ok(cond, name){ if(cond){ pass++ } else { fail++; console.log('FAIL: ' + name) } }
function H(a, b, suited){ return [{ r: a, s: 0 }, { r: b, s: suited ? 0 : 1 }] }

const eqAA = equity(H(14, 14), [], 1, 800);
ok(eqAA > 0.8 && eqAA < 0.9, 'AA ~85% vs one random hand (got ' + eqAA.toFixed(3) + ')');
const eq72 = equity(H(7, 2), [], 1, 800);
ok(eq72 > 0.28 && eq72 < 0.42, '72o ~35% vs one random (got ' + eq72.toFixed(3) + ')');
const eqAA3 = equity(H(14, 14), [], 3, 800);
ok(eqAA3 > 0.55 && eqAA3 < 0.72, 'AA ~64% vs three (got ' + eqAA3.toFixed(3) + ')');
const nuts = equity(H(14, 13, true), [{ r: 12, s: 0 }, { r: 11, s: 0 }, { r: 10, s: 0 }], 2, 300);
ok(nuts > 0.95, 'royal flush equity ~100% (got ' + nuts.toFixed(3) + ')');

ok(preflopScore(H(14, 14)) > preflopScore(H(13, 13)), 'AA > KK preflop');
ok(preflopScore(H(14, 13, true)) > preflopScore(H(14, 2)), 'AKs > A2o');
ok(preflopScore(H(7, 2)) < 5, '72o is trash');

function decideMany(persona, ctx, n){
  const acts = { fold: 0, call: 0, check: 0, raise: 0 };
  for(let i = 0; i < n; i++){
    const a = aiDecide(Object.assign({ persona: PERSONAS[persona], iters: 60 }, ctx));
    acts[a.act]++;
  }
  return acts;
}

let acts = decideMany('tanya', { street: 'pre', hole: H(7, 2), toCall: 6, currentBet: 8, minRaiseTo: 14, myBet: 2, pot: 15, stack: 200, bb: 2, numOpp: 2, canRaise: true }, 60);
ok(acts.fold > 45, 'Tanya folds 72o to a raise (' + acts.fold + '/60)');

acts = decideMany('tanya', { street: 'pre', hole: H(14, 14), toCall: 6, currentBet: 8, minRaiseTo: 14, myBet: 2, pot: 15, stack: 200, bb: 2, numOpp: 2, canRaise: true }, 60);
ok(acts.fold === 0 && acts.raise > 25, 'Tanya never folds AA, usually 3-bets (' + acts.raise + ' raises)');

acts = decideMany('lou', { street: 'pre', hole: H(9, 7), toCall: 2, currentBet: 2, minRaiseTo: 4, myBet: 0, pot: 5, stack: 200, bb: 2, numOpp: 2, canRaise: true }, 60);
ok(acts.call + acts.raise > 30, 'Lou plays 97o to a limp price (' + (acts.call + acts.raise) + '/60 in)');

acts = decideMany('ricky', { street: 'river', hole: H(7, 2), toCall: 0, currentBet: 0, minRaiseTo: 4, myBet: 0, pot: 60, stack: 200, bb: 2, numOpp: 1, canRaise: true, board: [{ r: 14, s: 2 }, { r: 13, s: 3 }, { r: 9, s: 1 }, { r: 5, s: 2 }, { r: 3, s: 3 }] }, 80);
ok(acts.raise >= 8, 'Ricky bluffs rivers sometimes (' + acts.raise + '/80 bluffs)');

acts = decideMany('lou', { street: 'river', hole: H(7, 2), toCall: 0, currentBet: 0, minRaiseTo: 4, myBet: 0, pot: 60, stack: 200, bb: 2, numOpp: 1, canRaise: true, board: [{ r: 14, s: 2 }, { r: 13, s: 3 }, { r: 9, s: 1 }, { r: 5, s: 2 }, { r: 3, s: 3 }] }, 80);
ok(acts.check > 60, 'Lou mostly checks air (' + acts.check + '/80 checks)');

let clampOk = true;
for(let i = 0; i < 50; i++){
  const a = aiDecide({ persona: PERSONAS.tanya, street: 'pre', hole: H(14, 14), toCall: 6, currentBet: 8, minRaiseTo: 14, myBet: 2, pot: 15, stack: 30, bb: 2, numOpp: 2, canRaise: true, iters: 40 });
  if(a.act === 'raise' && a.to > 32){ clampOk = false; break }
}
ok(clampOk, 'raise never exceeds stack+bet (all-in clamp)');

const strong = equity(H(14, 14), [{ r: 14, s: 2 }, { r: 14, s: 3 }, { r: 2, s: 1 }], 1, 200);
ok(strong > 0.97, 'quad aces equity ~100% (got ' + strong.toFixed(3) + ')');

console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
