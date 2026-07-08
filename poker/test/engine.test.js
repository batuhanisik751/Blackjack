'use strict';

const { buildPots, distributePots } = require('../js/engine.js');

let pass = 0, fail = 0;
function ok(cond, name){ if(cond){ pass++ } else { fail++; console.log('FAIL: ' + name) } }
function P(id, committed, folded){ return { id: id, committed: committed, folded: !!folded } }

let pots = buildPots([P('a', 100), P('b', 100), P('c', 100)]);
ok(pots.length === 1 && pots[0].amount === 300 && pots[0].eligible.length === 3, 'simple single pot');

pots = buildPots([P('a', 50), P('b', 100), P('c', 100)]);
ok(pots.length === 2, 'all-in creates side pot');
ok(pots[0].amount === 150 && pots[0].eligible.length === 3, 'main pot 150 all eligible');
ok(pots[1].amount === 100 && pots[1].eligible.length === 2 && pots[1].eligible.indexOf('a') < 0, 'side pot excludes short stack');

pots = buildPots([P('a', 20), P('b', 50), P('c', 100), P('d', 100)]);
ok(pots.length === 3, 'two all-ins create three pots');
ok(pots[0].amount === 80, 'main = 20x4');
ok(pots[1].amount === 90, 'mid = 30x3');
ok(pots[2].amount === 100, 'top = 50x2');

pots = buildPots([P('a', 100), P('b', 100), P('c', 60, true)]);
ok(pots.length === 1 && pots[0].amount === 260, 'folded chips stay in pot');
ok(pots[0].eligible.indexOf('c') < 0, 'folded player not eligible');

pots = buildPots([P('a', 30), P('b', 100), P('c', 100), P('d', 45, true)]);
ok(pots[0].amount === 30 * 3 + 30 && pots[0].eligible.length === 3, 'folded money in main layer');
ok(pots[1].amount === 70 * 2 + 15 && pots[1].eligible.length === 2, 'folded overflow into side layer');

let r = distributePots([{ amount: 300, eligible: ['a', 'b', 'c'] }], { a: 500, b: 400, c: 300 });
ok(r.payouts.a === 300 && !r.payouts.b, 'best hand takes pot');

r = distributePots([{ amount: 300, eligible: ['a', 'b', 'c'] }], { a: 500, b: 500, c: 300 });
ok(r.payouts.a === 150 && r.payouts.b === 150, 'split pot');

r = distributePots([{ amount: 25, eligible: ['a', 'b'] }], { a: 9, b: 9 });
ok(Math.round((r.payouts.a + r.payouts.b) * 100) / 100 === 25, 'odd split conserves money');

r = distributePots(
  [{ amount: 150, eligible: ['a', 'b', 'c'] }, { amount: 100, eligible: ['b', 'c'] }],
  { a: 900, b: 100, c: 500 }
);
ok(r.payouts.a === 150, 'short stack wins main only');
ok(r.payouts.c === 100, 'second-best wins side');

r = distributePots(
  [{ amount: 90, eligible: ['a', 'b', 'c'] }, { amount: 60, eligible: ['b', 'c'] }],
  { a: 100, b: 100, c: 50 }
);
ok(r.payouts.a === 45 && r.payouts.b === 45 + 60, 'tie in main, b sweeps side');

const total = (function(){
  const pots2 = buildPots([P('a', 33.5), P('b', 77.25), P('c', 77.25), P('d', 12, true)]);
  const sum = pots2.reduce(function(s, p){ return s + p.amount }, 0);
  return Math.round(sum * 100) / 100;
})();
ok(total === Math.round((33.5 + 77.25 + 77.25 + 12) * 100) / 100, 'pot layering conserves every cent');

console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
