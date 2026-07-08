'use strict';

const SYMBOLS = {
  W:  { name: 'Royal Spade', ch: '♠', cls: 'wild', pays: { 3: 25, 4: 100, 5: 500 } },
  S:  { name: 'Star', ch: '⭐', cls: 'scat', pays: {} },
  H1: { name: 'Crown', ch: '👑', cls: 'h1', pays: { 2: 1, 3: 20, 4: 60, 5: 200 } },
  H2: { name: 'Champagne', ch: '🍾', cls: 'h2', pays: { 2: 1, 3: 15, 4: 40, 5: 100 } },
  H3: { name: 'Dice', ch: '🎲', cls: 'h3', pays: { 3: 10, 4: 25, 5: 80 } },
  H4: { name: 'Chip', ch: '🪙', cls: 'h4', pays: { 3: 8, 4: 20, 5: 60 } },
  L1: { name: 'Ace', ch: 'A', cls: 'l1', pays: { 3: 5, 4: 12, 5: 40 } },
  L2: { name: 'King', ch: 'K', cls: 'l2', pays: { 3: 4, 4: 10, 5: 30 } },
  L3: { name: 'Queen', ch: 'Q', cls: 'l3', pays: { 3: 3, 4: 8, 5: 25 } },
  L4: { name: 'Jack', ch: 'J', cls: 'l4', pays: { 3: 2, 4: 6, 5: 20 } }
};

const SCATTER_PAY = { 3: 2, 4: 5, 5: 20 };
const FREE_SPINS_AWARD = 10;
const FREE_MULT = 2;

function strip(counts){
  const out = [];
  Object.keys(counts).forEach(function(sym){
    for(let i = 0; i < counts[sym]; i++) out.push(sym);
  });
  return out;
}

const REELS = [
  strip({ H1: 4, H2: 4, H3: 5, H4: 5, L1: 7, L2: 7, L3: 8, L4: 8, S: 2 }),
  strip({ W: 3, H1: 4, H2: 4, H3: 5, H4: 5, L1: 7, L2: 7, L3: 8, L4: 8, S: 2 }),
  strip({ W: 4, H1: 4, H2: 4, H3: 5, H4: 5, L1: 7, L2: 7, L3: 8, L4: 8, S: 2 }),
  strip({ W: 3, H1: 4, H2: 4, H3: 5, H4: 5, L1: 7, L2: 7, L3: 8, L4: 8, S: 2 }),
  strip({ H1: 4, H2: 4, H3: 5, H4: 5, L1: 7, L2: 7, L3: 8, L4: 8, S: 2 })
];

const LINES = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [2, 1, 2, 1, 2]
];
const NUM_LINES = LINES.length;

function spinReels(rng){
  const grid = [];
  const stops = [];
  for(let r = 0; r < 5; r++){
    const st = REELS[r];
    const idx = Math.floor(rng() * st.length);
    stops.push(idx);
    grid.push([st[idx], st[(idx + 1) % st.length], st[(idx + 2) % st.length]]);
  }
  return { grid: grid, stops: stops };
}

function evaluateSpin(grid, lineBet, mult){
  mult = mult || 1;
  const wins = [];
  let total = 0;
  for(let li = 0; li < LINES.length; li++){
    const line = LINES[li];
    const syms = line.map(function(row, col){ return grid[col][row] });
    let lead = null;
    for(const s of syms){ if(s !== 'W'){ lead = s; break } }
    let bestWin = 0, bestSym = null, bestCount = 0;
    if(lead && lead !== 'S'){
      let count = 0;
      for(const s of syms){
        if(s === lead || s === 'W') count++;
        else break;
      }
      const pay = SYMBOLS[lead].pays[count] || 0;
      if(pay > 0){ bestWin = pay * lineBet; bestSym = lead; bestCount = count }
    }
    let wildRun = 0;
    for(const s of syms){ if(s === 'W') wildRun++; else break }
    if(wildRun >= 3){
      const wpay = (SYMBOLS.W.pays[wildRun] || 0) * lineBet;
      if(wpay > bestWin){ bestWin = wpay; bestSym = 'W'; bestCount = wildRun }
    }
    if(bestWin > 0){
      wins.push({
        line: li, sym: bestSym, count: bestCount,
        win: Math.round(bestWin * mult * 100) / 100,
        cells: line.slice(0, bestCount).map(function(row, col){ return [col, row] })
      });
      total += bestWin * mult;
    }
  }
  let scatters = 0;
  const scatterCells = [];
  for(let c = 0; c < 5; c++)
    for(let r = 0; r < 3; r++)
      if(grid[c][r] === 'S'){ scatters++; scatterCells.push([c, r]) }
  let scatterWin = 0, freeSpins = 0;
  if(scatters >= 3){
    scatterWin = (SCATTER_PAY[Math.min(5, scatters)] || 0) * lineBet * NUM_LINES * mult;
    freeSpins = FREE_SPINS_AWARD;
  }
  total = Math.round((total + scatterWin) * 100) / 100;
  return {
    wins: wins, total: total,
    scatters: scatters, scatterCells: scatterCells,
    scatterWin: Math.round(scatterWin * 100) / 100,
    freeSpins: freeSpins
  };
}

if(typeof module !== 'undefined' && module.exports){
  module.exports = {
    SYMBOLS: SYMBOLS, REELS: REELS, LINES: LINES, NUM_LINES: NUM_LINES,
    SCATTER_PAY: SCATTER_PAY, FREE_SPINS_AWARD: FREE_SPINS_AWARD, FREE_MULT: FREE_MULT,
    spinReels: spinReels, evaluateSpin: evaluateSpin
  };
}
