'use strict';

const ACH_DEFS = [
  { id: 'first-win', name: 'On the board', desc: 'Win your first hand' },
  { id: 'first-bj', name: 'Natural', desc: 'Hit your first blackjack' },
  { id: 'streak3', name: 'Heating up', desc: 'Win 3 rounds in a row' },
  { id: 'streak5', name: 'On fire', desc: 'Win 5 rounds in a row' },
  { id: 'streak8', name: 'Unconscious', desc: 'Win 8 rounds in a row' },
  { id: 'big-win', name: 'Nice pot', desc: 'Win $250+ in a single round' },
  { id: 'monster-win', name: 'Table captain', desc: 'Win $750+ in a single round' },
  { id: 'split-sweep', name: 'Double trouble', desc: 'Win both hands of a split' },
  { id: 'double-win', name: 'Pressed it', desc: 'Win a doubled-down hand' },
  { id: 'five-card', name: 'The long way', desc: 'Win with five or more cards' },
  { id: 'comeback', name: 'Back from the dead', desc: 'Win a round while under $100' },
  { id: 'high-roller', name: 'High roller', desc: 'Bet $500+ on one hand' },
  { id: 'all-in', name: 'Nerves of steel', desc: 'Win a round with every dollar on the table' },
  { id: 'hands-100', name: 'Regular', desc: 'Play 100 hands' },
  { id: 'hands-500', name: 'Fixture', desc: 'Play 500 hands' },
  { id: 'rich-2k', name: 'Up big', desc: 'Reach a $2,500 bankroll' },
  { id: 'rich-10k', name: 'Whale', desc: 'Reach a $10,000 bankroll' },
  { id: 'pp-hit', name: 'Twins', desc: 'Hit a Perfect Pairs side bet' },
  { id: 'tp-big', name: 'Poker hands', desc: 'Hit 30:1 or better on 21+3' },
  { id: 'buster-big', name: 'Demolition', desc: 'Hit a 5+ card Buster' },
  { id: 'daily-first', name: 'Ritual begins', desc: 'Finish a daily challenge' },
  { id: 'daily-streak3', name: 'Creature of habit', desc: 'Reach a 3-day daily streak' },
  { id: 'loan-shark', name: 'House favorite', desc: 'Take 3 house loans' },
  { id: 'student', name: 'Student of the game', desc: 'Make 50 book-perfect plays' },
  { id: 'counter', name: 'Eyes on the shoe', desc: 'Pass 10 count quizzes' },
  { id: 'run-clear', name: 'Run for the ages', desc: 'Clear all 8 rounds of a Run' }
];

const COSMETICS = {
  back: [
    { id: 'crimson', name: 'Crimson', ach: null },
    { id: 'navy', name: 'Navy', ach: 'first-bj' },
    { id: 'emeraldb', name: 'Emerald', ach: 'streak3' },
    { id: 'gold', name: 'Gold', ach: 'rich-2k' },
    { id: 'midnight', name: 'Midnight', ach: 'daily-first' }
  ],
  felt: [
    { id: 'emerald', name: 'Casino green', ach: null },
    { id: 'burgundy', name: 'Burgundy', ach: 'hands-100' },
    { id: 'midnightf', name: 'Midnight blue', ach: 'streak5' },
    { id: 'charcoal', name: 'Charcoal', ach: 'big-win' },
    { id: 'royal', name: 'Royal purple', ach: 'rich-10k' }
  ]
};

function achName(id){
  const d = ACH_DEFS.find(function(a){ return a.id === id });
  return d ? d.name : id;
}

function hasAch(id){ return !!S.ach[id] }

function award(id){
  if(S.ach[id]) return;
  S.ach[id] = Date.now();
  store.set('bj-ach', S.ach);
  const d = ACH_DEFS.find(function(a){ return a.id === id });
  toast('🏆 Achievement: ' + (d ? d.name + ' — ' + d.desc : id));
  SFX.win(4);
  const unlock = [].concat(COSMETICS.back, COSMETICS.felt).find(function(c){ return c.ach === id });
  if(unlock) setTimeout(function(){ toast('Unlocked the ' + unlock.name + ' style — check Settings') }, 2400);
  if(ovAch.classList.contains('show')) window.renderAchievements();
}

window.checkAwards = function(event, ctx){
  if(event === 'round'){
    const net = ctx.net, res = ctx.res || [];
    const won = res.some(function(r){ return r.cls === 'win' || r.cls === 'bj' });
    if(won || net > 0) award('first-win');
    if(ctx.bjHit) award('first-bj');
    if(net >= 250) award('big-win');
    if(net >= 750) award('monster-win');
    if(S.hands.length === 2 && res.length === 2 && res.every(function(r){ return r.cls === 'win' || r.cls === 'bj' })) award('split-sweep');
    S.hands.forEach(function(h, i){
      if(h.doubled && res[i] && res[i].cls === 'win') award('double-win');
      if(h.cards.length >= 5 && res[i] && res[i].cls === 'win') award('five-card');
      if(h.bet >= 500) award('high-roller');
    });
    if(S.wasAllIn && net > 0) award('all-in');
    if(net > 0 && S.preRoundBank != null && S.preRoundBank < 100) award('comeback');
    if(S.mode === 'free'){
      if(S.stats.streak >= 3) award('streak3');
      if(S.stats.streak >= 5) award('streak5');
      if(S.stats.streak >= 8) award('streak8');
      if(S.stats.hands >= 100) award('hands-100');
      if(S.stats.hands >= 500) award('hands-500');
      if(S.bankroll >= 2500) award('rich-2k');
      if(S.bankroll >= 10000) award('rich-10k');
    }
  }
  else if(event === 'side'){
    if(ctx.k === 'pp' && ctx.m > 0) award('pp-hit');
    if(ctx.k === 'tp' && ctx.m >= 30) award('tp-big');
    if(ctx.k === 'bust' && ctx.m >= 4) award('buster-big');
  }
  else if(event === 'daily'){
    award('daily-first');
    if(ctx.streak >= 3) award('daily-streak3');
  }
  else if(event === 'loan'){
    if(S.stats.loans >= 3) award('loan-shark');
  }
  else if(event === 'coach'){
    if(S.train.ok >= 50) award('student');
  }
  else if(event === 'quiz'){
    if(ctx.passes >= 10) award('counter');
  }
  else if(event === 'run'){
    award('run-clear');
  }
};

window.renderAchievements = function(){
  const got = Object.keys(S.ach).length;
  let h = '<p style="margin-top:0">' + got + ' of ' + ACH_DEFS.length + ' unlocked</p><div class="ach-grid">';
  ACH_DEFS.forEach(function(a){
    h += '<div class="ach' + (S.ach[a.id] ? '' : ' lk') + '"><b>' + (S.ach[a.id] ? '🏆 ' : '🔒 ') + a.name + '</b><span>' + a.desc + '</span></div>';
  });
  h += '</div>';
  achBody.innerHTML = h;
};

window.settingsExtras = function(){
  let h = '';
  ['felt', 'back'].forEach(function(kind){
    h += '<div class="set-sec"><div class="set-label">' + (kind === 'felt' ? 'Table felt' : 'Card back') + '</div><div class="pillrow">';
    COSMETICS[kind].forEach(function(c){
      const open = !c.ach || hasAch(c.ach);
      const sel = S.opts[kind === 'felt' ? 'felt' : 'back'] === c.id;
      h += '<button class="sw sw-' + kind + '-' + c.id + (sel ? ' sel' : '') + (open ? '' : ' lk') + '" data-set="' + kind + '" data-v="' + c.id + '" title="' + c.name + (open ? '' : ' — locked: ' + (ACH_DEFS.find(function(a){ return a.id === c.ach }) || {}).desc) + '"></button>';
    });
    h += '</div></div>';
  });
  return h;
};

window.settingsClick = function(b){
  const kind = b.dataset.set;
  if(kind !== 'felt' && kind !== 'back') return;
  const c = COSMETICS[kind].find(function(x){ return x.id === b.dataset.v });
  if(!c) return;
  if(c.ach && !hasAch(c.ach)){
    const a = ACH_DEFS.find(function(x){ return x.id === c.ach });
    toast('Locked — ' + (a ? a.desc.toLowerCase() : 'keep playing'));
    return;
  }
  S.opts[kind] = c.id;
  saveOpts(); applyCosmetics(); renderSettings();
};
