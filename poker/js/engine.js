'use strict';

function buildPots(players){
  const levels = Array.from(new Set(
    players.filter(function(p){ return p.committed > 0 }).map(function(p){ return p.committed })
  )).sort(function(a, b){ return a - b });
  const pots = [];
  let prev = 0;
  for(const lv of levels){
    let amount = 0;
    for(const p of players){
      amount += Math.max(0, Math.min(p.committed, lv) - Math.min(p.committed, prev));
    }
    const eligible = players
      .filter(function(p){ return !p.folded && p.committed >= lv })
      .map(function(p){ return p.id });
    if(amount > 0){
      const last = pots[pots.length - 1];
      if(last && sameIds(last.eligible, eligible)) last.amount += amount;
      else pots.push({ amount: amount, eligible: eligible });
    }
    prev = lv;
  }
  return pots;
}

function sameIds(a, b){
  if(a.length !== b.length) return false;
  for(let i = 0; i < a.length; i++) if(a[i] !== b[i]) return false;
  return true;
}

function distributePots(pots, scores){
  const payouts = {};
  const winners = [];
  for(const pot of pots){
    let best = -1;
    for(const id of pot.eligible){
      if(scores[id] != null && scores[id] > best) best = scores[id];
    }
    const winIds = pot.eligible.filter(function(id){ return scores[id] === best });
    const base = Math.floor((pot.amount / winIds.length) * 100) / 100;
    let remainder = Math.round((pot.amount - base * winIds.length) * 100) / 100;
    winIds.forEach(function(id, i){
      let share = base;
      if(remainder >= 0.01){ share = Math.round((share + 0.01) * 100) / 100; remainder = Math.round((remainder - 0.01) * 100) / 100 }
      payouts[id] = Math.round(((payouts[id] || 0) + share) * 100) / 100;
    });
    winners.push({ amount: pot.amount, ids: winIds });
  }
  return { payouts: payouts, winners: winners };
}

if(typeof module !== 'undefined' && module.exports){
  module.exports = { buildPots: buildPots, distributePots: distributePots };
}
