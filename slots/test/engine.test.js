'use strict';

const E = require('../js/engine.js');

let pass = 0, fail = 0;
function ok(cond, name){ if(cond){ pass++ } else { fail++; console.log('FAIL: ' + name) } }

function gridOf(rows){
  const grid = [[], [], [], [], []];
  for(let r = 0; r < 3; r++){
    const syms = rows[r].split(' ');
    for(let c = 0; c < 5; c++) grid[c][r] = syms[c];
  }
  return grid;
}

let r = E.evaluateSpin(gridOf(['L4 L4 L4 L4 L4', 'H1 H1 H1 L1 L2', 'L3 L2 L1 H2 H3']), 1);
ok(r.wins.some(function(w){ return w.line === 1 && w.sym === 'L4' && w.count === 5 && w.win === 20 }), 'top line 5xJ pays 20');
ok(r.wins.some(function(w){ return w.line === 0 && w.sym === 'H1' && w.count === 3 && w.win === 20 }), 'mid line 3x crown pays 20');

r = E.evaluateSpin(gridOf(['W H1 H1 L1 L2', 'L3 L2 L1 H2 H3', 'H4 H4 L1 L2 L3']), 1);
ok(r.wins.some(function(w){ return w.line === 1 && w.sym === 'H1' && w.count === 3 }), 'wild substitutes as leadoff');

r = E.evaluateSpin(gridOf(['W W W H1 L2', 'L3 L2 L1 H2 H3', 'H4 H4 L1 L2 L3']), 1);
const top = r.wins.find(function(w){ return w.line === 1 });
ok(top && top.sym === 'H1' && top.count === 4 && top.win === 60, 'WWW-H1 counts as 4 crowns (60) not 3 wilds (25)');

r = E.evaluateSpin(gridOf(['W W W L4 H1', 'L3 L2 L1 H2 H3', 'H4 H4 L1 L2 L3']), 1);
const t2 = r.wins.find(function(w){ return w.line === 1 });
ok(t2 && t2.sym === 'W' && t2.count === 3 && t2.win === 25, 'WWW-J takes wild pay 25 over 4xJ 6');

r = E.evaluateSpin(gridOf(['W W W W W', 'L3 L2 L1 H2 H3', 'H4 H4 L1 L2 L3']), 1);
ok(r.wins.find(function(w){ return w.line === 1 }).win === 500, 'five wilds pay 500');

r = E.evaluateSpin(gridOf(['S H1 L1 L2 L3', 'L3 S L1 H2 H3', 'H4 H4 S L2 L3']), 1);
ok(r.scatters === 3 && r.freeSpins === 10 && r.scatterWin === 2 * 1 * 10, '3 scatters: 10 free spins + 2x total bet');

r = E.evaluateSpin(gridOf(['S S S S S', 'L3 L2 L1 H2 H3', 'H4 H4 L1 L2 L3']), 1);
ok(r.scatters === 5 && r.scatterWin === 20 * 10, '5 scatters pay 20x total bet');

r = E.evaluateSpin(gridOf(['L4 L4 L4 L4 L4', 'L4 L4 L4 L4 L4', 'L4 L4 L4 L4 L4']), 2, 2);
ok(r.total === (20 * 2) * 2 * 10, 'multiplier and line bet apply to all 10 lines');

r = E.evaluateSpin(gridOf(['H1 L1 H1 L2 L3', 'L3 L2 L1 H2 H3', 'H4 H4 L1 L2 L3']), 1);
ok(r.wins.filter(function(w){ return w.line === 1 }).length === 0, 'broken sequence does not pay');

ok(E.LINES.length === 10 && E.LINES.every(function(l){ return l.length === 5 && l.every(function(v){ return v >= 0 && v <= 2 }) }), 'ten valid paylines');
ok(E.REELS.every(function(s, i){ return s.length > 30 && (i === 0 || i === 4 ? s.indexOf('W') < 0 : s.indexOf('W') >= 0) }), 'wilds only on reels 2-4');

function mulberry(a){ return function(){ a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }

const N = +(process.argv[2] || 400000);
const rng = mulberry(12345);
let wagered = 0, won = 0, hits = 0, fsTriggers = 0, fsQueue = 0, maxWin = 0;
for(let i = 0; i < N; i++){
  const lineBet = 1;
  const bet = lineBet * E.NUM_LINES;
  wagered += bet;
  const g = E.spinReels(rng);
  const res = E.evaluateSpin(g.grid, lineBet, 1);
  won += res.total;
  if(res.total > 0) hits++;
  if(res.total > maxWin) maxWin = res.total;
  if(res.freeSpins) { fsTriggers++; fsQueue += res.freeSpins }
  while(fsQueue > 0){
    fsQueue--;
    const fg = E.spinReels(rng);
    const fres = E.evaluateSpin(fg.grid, lineBet, E.FREE_MULT);
    won += fres.total;
    if(fres.total > maxWin) maxWin = fres.total;
    if(fres.freeSpins) fsQueue += fres.freeSpins;
    if(fsQueue > 500) fsQueue = 500;
  }
}
const rtp = won / wagered;
const hitFreq = hits / N;
console.log('RTP: ' + (rtp * 100).toFixed(2) + '% · hit freq: ' + (hitFreq * 100).toFixed(1) + '% · FS trigger: 1 in ' + Math.round(N / fsTriggers) + ' · max win: ' + maxWin + 'x line (' + (maxWin / 10) + 'x bet)');
ok(rtp > 0.92 && rtp < 0.99, 'RTP in target range (' + (rtp * 100).toFixed(2) + '%)');
ok(hitFreq > 0.11 && hitFreq < 0.45, 'hit frequency sane for a 10-line slot (' + (hitFreq * 100).toFixed(1) + '%)');
ok(fsTriggers > 0, 'free spins reachable');

console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
