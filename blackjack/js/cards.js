'use strict';

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const PIPS = {
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

function cardVal(c){
  if(c.r === 'A') return 11;
  if(c.r === '10' || c.r === 'J' || c.r === 'Q' || c.r === 'K') return 10;
  return +c.r;
}

function sym(s){ return s + '︎' }

function buildCard(c, faceUp){
  const red = c.s === '♥' || c.s === '♦';
  const el = document.createElement('div');
  el.className = 'card' + (faceUp ? ' faceup' : '');
  el.style.setProperty('--tilt', ((Math.random() * 4) - 2).toFixed(2) + 'deg');
  let center = '';
  if(c.r === 'A'){
    center = '<div class="ace">' + sym(c.s) + '</div>';
  }else if(PIPS[c.r]){
    center = '<div class="pips">' + PIPS[c.r].map(function(p){
      return '<span class="pip' + (p[1] > 50 ? ' fl' : '') + '" style="left:' + p[0] + '%;top:' + p[1] + '%">' + sym(c.s) + '</span>';
    }).join('') + '</div>';
  }else{
    center = '<div class="court"><span class="crt">' + c.r + '</span><span class="cst">' + sym(c.s) + '</span></div>';
  }
  el.innerHTML = '<div class="card-inner"><div class="cface front ' + (red ? 'red' : 'blk') + '">' +
    '<div class="idx"><b>' + c.r + '</b><i>' + sym(c.s) + '</i></div>' +
    '<div class="idx idx-b"><b>' + c.r + '</b><i>' + sym(c.s) + '</i></div>' +
    center + '</div><div class="cface backside"><div class="bk"></div></div></div>';
  return el;
}
