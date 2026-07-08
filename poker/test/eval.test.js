'use strict';

const { evalFive, evalSeven, evalAny, scoreCat, scoreName } = require('../js/eval.js');

function C(str){
  const suits = { s: 0, h: 1, d: 2, c: 3 };
  const ranks = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, T: 10, J: 11, Q: 12, K: 13, A: 14 };
  return str.trim().split(/\s+/).map(function(t){ return { r: ranks[t[0]], s: suits[t[1]] } });
}

let pass = 0, fail = 0;
function ok(cond, name){
  if(cond){ pass++ }
  else{ fail++; console.log('FAIL: ' + name) }
}

ok(scoreCat(evalFive(C('As Ks Qs Js Ts'))) === 8, 'royal flush is straight flush cat');
ok(scoreName(evalFive(C('As Ks Qs Js Ts'))) === 'Royal flush', 'royal flush name');
ok(scoreCat(evalFive(C('5h 4h 3h 2h Ah'))) === 8, 'wheel straight flush');
ok(scoreCat(evalFive(C('9c 9d 9h 9s 2c'))) === 7, 'quads');
ok(scoreCat(evalFive(C('9c 9d 9h 2s 2c'))) === 6, 'full house');
ok(scoreCat(evalFive(C('Ks 9s 7s 4s 2s'))) === 5, 'flush');
ok(scoreCat(evalFive(C('9c 8d 7h 6s 5c'))) === 4, 'straight');
ok(scoreCat(evalFive(C('5c 4d 3h 2s Ac'))) === 4, 'wheel straight');
ok(scoreCat(evalFive(C('9c 9d 9h 4s 2c'))) === 3, 'trips');
ok(scoreCat(evalFive(C('9c 9d 4h 4s 2c'))) === 2, 'two pair');
ok(scoreCat(evalFive(C('9c 9d 7h 4s 2c'))) === 1, 'pair');
ok(scoreCat(evalFive(C('Kc 9d 7h 4s 2c'))) === 0, 'high card');

ok(evalFive(C('9c 8d 7h 6s 5c')) > evalFive(C('5c 4d 3h 2s Ac')), 'nine-high straight beats wheel');
ok(evalFive(C('Ac Ad Ah Ks Kc')) > evalFive(C('Kc Kd Kh As Ac')), 'aces full beats kings full');
ok(evalFive(C('2s 2d 2h 2c 3s')) > evalFive(C('Ac Ad Ah Ks Kc')), 'quad deuces beat aces full');
ok(evalFive(C('7s 6s 5s 4s 3s')) > evalFive(C('As Ad Ac Ah Ks')), 'straight flush beats quads');
ok(evalFive(C('As Ks 9s 4s 2s')) > evalFive(C('Ks Qs 9s 4s 2s')), 'ace-high flush beats king-high flush');
ok(evalFive(C('As Ah Kd Kc 9s')) > evalFive(C('As Ah Qd Qc Ks')), 'aces-kings beats aces-queens two pair');
ok(evalFive(C('As Ah Kd Kc 9s')) > evalFive(C('As Ah Kd Kc 8s')), 'two pair kicker breaks tie');
ok(evalFive(C('9s 9h Ad 7c 4s')) > evalFive(C('9d 9c Ah 7s 3s')), 'pair kicker chain');
ok(evalFive(C('Ah Kd 9c 7s 4h')) > evalFive(C('Ah Kd 9c 7s 3h')), 'high-card last kicker');
ok(evalFive(C('As Ah Ad Kc Ks')) === evalFive(C('Ac Ah Ad Kd Kh')), 'identical hands tie');

const s7 = evalSeven(C('As Ks 2h 7d Qs Js Ts'));
ok(scoreCat(s7.score) === 8 && scoreName(s7.score) === 'Royal flush', '7-card finds royal');
ok(scoreCat(evalSeven(C('9c 9d 2h 9h 4s 9s 2c')).score) === 7, '7-card finds quads');
ok(scoreCat(evalSeven(C('Ah Kh 4h 9h 2c 3d 8h')).score) === 5, '7-card finds flush');
ok(scoreCat(evalSeven(C('5c 4d 3h 2s Ac Kd Qh')).score) === 4, '7-card finds wheel');
ok(scoreCat(evalSeven(C('2c 2d 3h 3s 4c 4d Kh')).score) === 2, 'three pairs = two pair best');
const board = evalSeven(C('Ac Kc Qc Jc Tc 2d 3h'));
ok(scoreName(board.score) === 'Royal flush', 'board royal plays');

ok(evalSeven(C('As Ad 9c 7h 4s Kd 2c')).score > evalSeven(C('Ks Kd 9c 7h 4s Ad 2c')).score, 'AA beats KK on same board');
ok(evalSeven(C('7h 6h 9c 8h 5s Kd 2c')).score > evalSeven(C('As Ad 9c 8h 5s Kd 2c')).score, 'straight beats aces');

ok(scoreCat(evalAny(C('As Ah')).score) === 1, 'partial: pocket pair reads as pair');
ok(scoreCat(evalAny(C('As Kh')).score) === 0, 'partial: unpaired reads high card');
ok(scoreCat(evalAny(C('As Ah 9c 9d Kh 2s')).score) === 2, '6-card two pair');
ok(scoreName(evalFive(C('9c 9d 4h 4s 2c'))) === 'Two pair, nines and fours', 'two pair name');
ok(scoreName(evalFive(C('9c 9d 9h 2s 2c'))) === 'Full house, nines over twos', 'full house name');

let deterministic = true;
for(let t = 0; t < 2000; t++){
  const deck = [];
  for(let r = 2; r <= 14; r++) for(let s = 0; s < 4; s++) deck.push({ r: r, s: s });
  for(let i = deck.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); const tmp = deck[i]; deck[i] = deck[j]; deck[j] = tmp }
  const seven = deck.slice(0, 7);
  const a = evalSeven(seven).score;
  const b = evalSeven(seven.slice().reverse()).score;
  if(a !== b){ deterministic = false; break }
}
ok(deterministic, 'evaluation is order-independent (2000 random hands)');

console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
