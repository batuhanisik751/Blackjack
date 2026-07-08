'use strict';

const SUIT_CH = ['♠', '♥', '♦', '♣'];
const RANK_CH = { 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };

function makeDeck(){
  const d = [];
  for(let r = 2; r <= 14; r++)
    for(let s = 0; s < 4; s++)
      d.push({ r: r, s: s });
  return d;
}

function shuffleWith(deck, rng){
  for(let i = deck.length - 1; i > 0; i--){
    const j = Math.floor(rng() * (i + 1));
    const t = deck[i]; deck[i] = deck[j]; deck[j] = t;
  }
  return deck;
}

const PK_PIPS = {
  '2': [[50,20],[50,80]],
  '3': [[50,20],[50,50],[50,80]],
  '4': [[32,20],[68,20],[32,80],[68,80]],
  '5': [[32,20],[68,20],[50,50],[32,80],[68,80]],
  '6': [[32,20],[68,20],[32,50],[68,50],[32,80],[68,80]],
  '7': [[32,20],[68,20],[50,35],[32,50],[68,50],[32,80],[68,80]],
  '8': [[32,20],[68,20],[50,35],[32,50],[68,50],[50,65],[32,80],[68,80]],
  '9': [[32,18],[68,18],[32,39],[68,39],[50,50],[32,61],[68,61],[32,82],[68,82]],
  '10': [[32,18],[68,18],[50,29],[32,40],[68,40],[32,60],[68,60],[50,71],[32,82],[68,82]]
};

function symCh(s){ return SUIT_CH[s] + '︎' }

function buildCardEl(c, faceUp){
  const rch = RANK_CH[c.r];
  const red = c.s === 1 || c.s === 2;
  const el = document.createElement('div');
  el.className = 'pcard' + (faceUp ? ' up' : '');
  let center = '';
  if(rch === 'A') center = '<div class="pace">' + symCh(c.s) + '</div>';
  else if(PK_PIPS[rch]) center = '<div class="ppips">' + PK_PIPS[rch].map(function(p){
    return '<span class="ppip' + (p[1] > 50 ? ' fl' : '') + '" style="left:' + p[0] + '%;top:' + p[1] + '%">' + symCh(c.s) + '</span>';
  }).join('') + '</div>';
  else center = '<div class="pcourt"><span>' + rch + '</span><i>' + symCh(c.s) + '</i></div>';
  el.innerHTML = '<div class="pc-in"><div class="pc-f pc-front ' + (red ? 'red' : 'blk') + '">' +
    '<div class="pidx"><b>' + rch + '</b><i>' + symCh(c.s) + '</i></div>' +
    '<div class="pidx pidx-b"><b>' + rch + '</b><i>' + symCh(c.s) + '</i></div>' +
    center + '</div><div class="pc-f pc-back"><div class="pbk"></div></div></div>';
  return el;
}

if(typeof module !== 'undefined' && module.exports){
  module.exports = { makeDeck: makeDeck, shuffleWith: shuffleWith, SUIT_CH: SUIT_CH, RANK_CH: RANK_CH };
}
