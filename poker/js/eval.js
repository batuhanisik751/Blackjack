'use strict';

const HAND_NAMES = ['High card', 'Pair', 'Two pair', 'Three of a kind', 'Straight', 'Flush', 'Full house', 'Four of a kind', 'Straight flush'];

function evalFive(cs){
  const ranks = cs.map(function(c){ return c.r }).sort(function(a, b){ return b - a });
  const suits = cs.map(function(c){ return c.s });
  const flush = suits.every(function(s){ return s === suits[0] });
  const counts = {};
  for(const r of ranks) counts[r] = (counts[r] || 0) + 1;
  const groups = Object.keys(counts).map(Number).map(function(r){ return { r: r, n: counts[r] } });
  groups.sort(function(a, b){ return b.n - a.n || b.r - a.r });

  let straightHigh = 0;
  const uniq = groups.map(function(g){ return g.r }).sort(function(a, b){ return b - a });
  if(uniq.length === 5){
    if(uniq[0] - uniq[4] === 4) straightHigh = uniq[0];
    else if(uniq[0] === 14 && uniq[1] === 5 && uniq[4] === 2) straightHigh = 5;
  }

  let cat, ks;
  if(flush && straightHigh){ cat = 8; ks = [straightHigh, 0, 0, 0, 0] }
  else if(groups[0].n === 4){ cat = 7; ks = [groups[0].r, groups[1].r, 0, 0, 0] }
  else if(groups[0].n === 3 && groups[1].n === 2){ cat = 6; ks = [groups[0].r, groups[1].r, 0, 0, 0] }
  else if(flush){ cat = 5; ks = [ranks[0], ranks[1], ranks[2], ranks[3], ranks[4]] }
  else if(straightHigh){ cat = 4; ks = [straightHigh, 0, 0, 0, 0] }
  else if(groups[0].n === 3){ cat = 3; ks = [groups[0].r, groups[1].r, groups[2].r, 0, 0] }
  else if(groups[0].n === 2 && groups[1].n === 2){ cat = 2; ks = [groups[0].r, groups[1].r, groups[2].r, 0, 0] }
  else if(groups[0].n === 2){ cat = 1; ks = [groups[0].r, groups[1].r, groups[2].r, groups[3].r, 0] }
  else{ cat = 0; ks = [ranks[0], ranks[1], ranks[2], ranks[3], ranks[4]] }

  return ((((cat * 15 + ks[0]) * 15 + ks[1]) * 15 + ks[2]) * 15 + ks[3]) * 15 + ks[4];
}

const COMBOS_7_5 = (function(){
  const out = [];
  for(let a = 0; a < 3; a++)
    for(let b = a + 1; b < 4; b++)
      for(let c = b + 1; c < 5; c++)
        for(let d = c + 1; d < 6; d++)
          for(let e = d + 1; e < 7; e++)
            out.push([a, b, c, d, e]);
  return out;
})();

function evalSeven(cs){
  let best = -1, bestIdx = null;
  for(const idx of COMBOS_7_5){
    const s = evalFive([cs[idx[0]], cs[idx[1]], cs[idx[2]], cs[idx[3]], cs[idx[4]]]);
    if(s > best){ best = s; bestIdx = idx }
  }
  return { score: best, best5: bestIdx.map(function(i){ return cs[i] }) };
}

function evalAny(cs){
  if(cs.length < 5){
    const P5 = Math.pow(15, 5), P4 = Math.pow(15, 4), P3 = Math.pow(15, 3);
    const counts = {};
    for(const c of cs){ counts[c.r] = (counts[c.r] || 0) + 1 }
    const groups = Object.keys(counts).map(Number).map(function(r){ return { r: r, n: counts[r] } });
    groups.sort(function(a, b){ return b.n - a.n || b.r - a.r });
    if(groups[0].n === 4) return { score: 7 * P5 + groups[0].r * P4, cat: 7 };
    if(groups[0].n === 3) return { score: 3 * P5 + groups[0].r * P4, cat: 3 };
    if(groups[0].n === 2 && groups[1] && groups[1].n === 2) return { score: 2 * P5 + groups[0].r * P4 + groups[1].r * P3, cat: 2 };
    if(groups[0].n === 2) return { score: 1 * P5 + groups[0].r * P4, cat: 1 };
    return { score: groups[0].r * P4, cat: 0 };
  }
  if(cs.length === 5) return { score: evalFive(cs) };
  if(cs.length === 6){
    let best = -1;
    for(let skip = 0; skip < 6; skip++){
      const five = cs.filter(function(_, i){ return i !== skip });
      const s = evalFive(five);
      if(s > best) best = s;
    }
    return { score: best };
  }
  return evalSeven(cs);
}

function scoreCat(score){ return Math.floor(score / Math.pow(15, 5)) }

function scoreName(score, cs){
  const cat = scoreCat(score);
  const k1 = Math.floor(score / Math.pow(15, 4)) % 15;
  const k2 = Math.floor(score / Math.pow(15, 3)) % 15;
  const RN = { 2: 'twos', 3: 'threes', 4: 'fours', 5: 'fives', 6: 'sixes', 7: 'sevens', 8: 'eights', 9: 'nines', 10: 'tens', 11: 'jacks', 12: 'queens', 13: 'kings', 14: 'aces' };
  const RS = { 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten', 11: 'jack', 12: 'queen', 13: 'king', 14: 'ace' };
  switch(cat){
    case 8: return k1 === 14 ? 'Royal flush' : 'Straight flush, ' + RS[k1] + ' high';
    case 7: return 'Four of a kind, ' + RN[k1];
    case 6: return 'Full house, ' + RN[k1] + ' over ' + RN[k2];
    case 5: return 'Flush, ' + RS[k1] + ' high';
    case 4: return 'Straight, ' + RS[k1] + ' high';
    case 3: return 'Three of a kind, ' + RN[k1];
    case 2: return 'Two pair, ' + RN[k1] + ' and ' + RN[k2];
    case 1: return 'Pair of ' + RN[k1];
    default: return RS[k1] ? (RS[k1][0].toUpperCase() + RS[k1].slice(1)) + ' high' : 'High card';
  }
}

if(typeof module !== 'undefined' && module.exports){
  module.exports = { evalFive: evalFive, evalSeven: evalSeven, evalAny: evalAny, scoreCat: scoreCat, scoreName: scoreName, HAND_NAMES: HAND_NAMES };
}
