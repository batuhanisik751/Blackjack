'use strict';

if(typeof require !== 'undefined' && typeof evalSeven === 'undefined'){
  var _ev = require('./eval.js');
  var evalSeven = _ev.evalSeven;
  var _cd = require('./cards.js');
  var makeDeck = _cd.makeDeck;
}

const PERSONAS = {
  tanya: { key: 'tanya', name: 'Tight Tanya', tag: 'Only plays premium', avatar: '🦊', vpip: 0.2, aggr: 0.72, bluff: 0.07, sticky: 0.25 },
  lou:   { key: 'lou', name: 'Loose Lou', tag: 'Never met a flop he didn’t like', avatar: '🐻', vpip: 0.58, aggr: 0.22, bluff: 0.08, sticky: 0.85 },
  ricky: { key: 'ricky', name: 'River Ricky', tag: 'Lives and dies on fifth street', avatar: '🦈', vpip: 0.38, aggr: 0.6, bluff: 0.26, sticky: 0.5 }
};

function preflopScore(hole){
  const hi = Math.max(hole[0].r, hole[1].r), lo = Math.min(hole[0].r, hole[1].r);
  const pts = { 14: 10, 13: 8, 12: 7, 11: 6 };
  let s = pts[hi] || hi / 2;
  if(hole[0].r === hole[1].r) s = Math.max(5, s * 2);
  if(hole[0].s === hole[1].s) s += 2;
  const gap = hi - lo;
  if(hole[0].r !== hole[1].r){
    if(gap === 1) s += 1;
    else if(gap === 2) s -= 1;
    else if(gap === 3) s -= 2;
    else if(gap >= 4) s -= 4;
    if(gap <= 2 && hi < 12) s += 1;
  }
  return s;
}

function equity(hole, board, numOpp, iters, rng){
  rng = rng || Math.random;
  const used = {};
  hole.concat(board).forEach(function(c){ used[c.r + '.' + c.s] = 1 });
  const base = makeDeck().filter(function(c){ return !used[c.r + '.' + c.s] });
  let win = 0;
  for(let t = 0; t < iters; t++){
    const deck = base.slice();
    for(let i = deck.length - 1; i > 0; i--){
      const j = Math.floor(rng() * (i + 1));
      const tmp = deck[i]; deck[i] = deck[j]; deck[j] = tmp;
    }
    let di = 0;
    const fullBoard = board.slice();
    while(fullBoard.length < 5) fullBoard.push(deck[di++]);
    const mine = evalSeven(hole.concat(fullBoard)).score;
    let beaten = false, tied = false;
    for(let o = 0; o < numOpp; o++){
      const oppScore = evalSeven([deck[di++], deck[di++]].concat(fullBoard)).score;
      if(oppScore > mine){ beaten = true; break }
      if(oppScore === mine) tied = true;
    }
    if(!beaten) win += tied ? 0.5 : 1;
  }
  return win / iters;
}

function aiDecide(ctx){
  const P = ctx.persona, rng = ctx.rng || Math.random;
  const toCall = ctx.toCall, pot = ctx.pot, stack = ctx.stack, bb = ctx.bb;
  const jitter = (rng() - 0.5) * 0.06;

  function clampRaise(to){
    to = Math.min(ctx.stack + ctx.myBet, Math.max(ctx.minRaiseTo, Math.round(to)));
    return { act: 'raise', to: to };
  }

  if(ctx.street === 'pre'){
    const s = preflopScore(ctx.hole);
    const openThresh = 9.5 - P.vpip * 9;
    const facingRaise = toCall > bb;
    if(facingRaise){
      const need = 11 - P.sticky * 4 + (toCall / bb > 6 ? 2 : 0);
      if(s >= need + 4 && rng() < P.aggr) return clampRaise(ctx.currentBet * 3);
      if(s >= need || rng() < P.sticky * 0.15) return { act: 'call' };
      return { act: 'fold' };
    }
    if(s >= openThresh + 3.5 || (s >= openThresh && rng() < P.aggr)) return clampRaise(bb * (2.5 + rng() * 1.5) + toCall);
    if(toCall === 0) return { act: 'check' };
    if(s >= openThresh - 1 || rng() < P.vpip * 0.4) return { act: 'call' };
    return { act: 'fold' };
  }

  const eq = equity(ctx.hole, ctx.board, Math.max(1, ctx.numOpp), ctx.iters || 120, rng);
  const potOdds = toCall > 0 ? toCall / (pot + toCall) : 0;

  if(toCall === 0){
    const wantBluff = rng() < P.bluff && eq < 0.34 && ctx.street !== 'pre';
    const strongBet = eq > 0.58 + jitter && rng() < P.aggr + 0.25;
    if(strongBet || wantBluff){
      const frac = wantBluff ? 0.55 + rng() * 0.25 : 0.45 + eq * 0.6 * rng() + 0.15;
      return clampRaise(pot * frac);
    }
    return { act: 'check' };
  }

  const margin = 0.04 - P.sticky * 0.07 + jitter;
  if(eq > 0.72 && rng() < P.aggr && ctx.canRaise) return clampRaise(ctx.currentBet + pot * (0.6 + rng() * 0.5));
  if(eq > potOdds + margin) return { act: 'call' };
  if(rng() < P.bluff * 0.4 && ctx.canRaise && ctx.street === 'river' && toCall < pot * 0.4) return clampRaise(ctx.currentBet + pot * 0.9);
  if(toCall >= stack && eq > 0.5) return { act: 'call' };
  return { act: 'fold' };
}

if(typeof module !== 'undefined' && module.exports){
  module.exports = { PERSONAS: PERSONAS, preflopScore: preflopScore, equity: equity, aiDecide: aiDecide };
}
