'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { webcrypto } = require('crypto');

const LOGS = [];

function makeEl(){
  const el = {
    textContent: '', innerHTML: '', className: '', value: '', min: '', max: '', step: '', checked: false,
    style: {}, onclick: null, oninput: null, scrollTop: 0, scrollHeight: 0,
    children: [],
    classList: { add: function(){}, remove: function(){}, toggle: function(){}, contains: function(){ return false } },
    appendChild: function(c){ this.children.push(c); if(typeof c.textContent === 'string') LOGS.push(c.textContent); return c },
    removeChild: function(c){ const i = this.children.indexOf(c); if(i >= 0) this.children.splice(i, 1); return c },
    querySelector: function(){ return null },
    querySelectorAll: function(){ return [] },
    addEventListener: function(){}
  };
  Object.defineProperty(el, 'firstChild', { get: function(){ return this.children[0] || null } });
  return el;
}

const elCache = {};
const storage = {};
const sandbox = {
  console: console,
  Math: Math, JSON: JSON, Object: Object, Array: Array, Number: Number, String: String,
  Promise: Promise, Uint8Array: Uint8Array, TextEncoder: TextEncoder,
  setTimeout: function(cb){ Promise.resolve().then(cb); return 0 },
  clearTimeout: function(){},
  setInterval: function(){ return 0 },
  crypto: webcrypto,
  performance: { now: function(){ return Date.now() } },
  localStorage: {
    getItem: function(k){ return storage[k] == null ? null : storage[k] },
    setItem: function(k, v){ storage[k] = String(v) },
    removeItem: function(k){ delete storage[k] }
  },
  navigator: {},
  location: { protocol: 'http:' },
  document: {
    getElementById: function(id){ if(!elCache[id]) elCache[id] = makeEl(); return elCache[id] },
    createElement: function(){ return makeEl() }
  }
};
sandbox.addEventListener = function(){};
sandbox.dispatchEvent = function(){};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

['wallet.js', 'cards.js', 'eval.js', 'engine.js', 'ai.js', 'game.js'].forEach(function(f){
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');
  vm.runInContext(src, sandbox, { filename: f });
});

const HANDS = +(process.argv[2] || 250);

const harness = `
(async function(){
  window.__autoPilot = true;
  T.autoNext = false;
  W.bank = 100000;
  T.stakes = STAKES[0];
  T.phase = 'playing';
  T.dealer = 0;
  T.players = [
    { id: 'you', seat: 0, name: 'You', human: true, stack: 50000, hole: [], bet: 0, committed: 0, inHand: true },
    { id: 'tanya', seat: 1, name: PERSONAS.tanya.name, persona: PERSONAS.tanya, stack: 50000, hole: [], bet: 0, committed: 0, inHand: true },
    { id: 'lou', seat: 2, name: PERSONAS.lou.name, persona: PERSONAS.lou, stack: 50000, hole: [], bet: 0, committed: 0, inHand: true },
    { id: 'ricky', seat: 3, name: PERSONAS.ricky.name, persona: PERSONAS.ricky, stack: 50000, hole: [], bet: 0, committed: 0, inHand: true }
  ];
  const bankStart = W.bank;
  let worstDrift = 0, fails = [], showdowns = 0, folds = 0, allins = 0, raises = 0;
  for(let h = 0; h < ${HANDS}; h++){
    const before = T.players.reduce(function(s, p){ return s + p.stack }, 0);
    const logStart = __LOGS.length;
    try{
      await runHand();
    }catch(e){
      fails.push('hand ' + (h + 1) + ' threw: ' + e.message + ' | ' + (e.stack || '').split('\\n')[1]);
      break;
    }
    const after = T.players.reduce(function(s, p){ return s + p.stack }, 0);
    const slice = __LOGS.slice(logStart).join(' || ');
    const reloaded = slice.indexOf('reloads') >= 0;
    const drift = Math.abs(after - before);
    if(!reloaded){
      if(drift > worstDrift) worstDrift = drift;
      if(drift > 0.02) fails.push('hand ' + (h + 1) + ' money drift ' + drift.toFixed(4));
    }
    if(potTotal() !== 0) fails.push('hand ' + (h + 1) + ' pot not cleared: ' + potTotal());
    T.players.forEach(function(p){
      if(p.stack < -0.001) fails.push('hand ' + (h + 1) + ' negative stack ' + p.name + ' ' + p.stack);
      if(isNaN(p.stack)) fails.push('hand ' + (h + 1) + ' NaN stack ' + p.name);
    });
    if(slice.indexOf('shows') >= 0) showdowns++;
    if(slice.indexOf('uncontested') >= 0) folds++;
    if(slice.indexOf('ALL IN') >= 0 || slice.indexOf('all in') >= 0) allins++;
    if(slice.indexOf('raises to') >= 0 || slice.indexOf('bets ') >= 0) raises++;
    if(fails.length > 4) break;
  }
  if(W.bank !== bankStart) fails.push('wallet bank mutated during play: ' + W.bank);
  return {
    hands: ${HANDS},
    fails: fails,
    worstDrift: worstDrift,
    showdowns: showdowns,
    uncontested: folds,
    handsWithAllIn: allins,
    handsWithAggression: raises
  };
})()
`;

sandbox.__LOGS = LOGS;

vm.runInContext(harness, sandbox).then(function(r){
  console.log(JSON.stringify(r, null, 2));
  if(r.fails.length){ console.log('FAILED'); process.exit(1) }
  const sane = r.showdowns > 0 && r.uncontested > 0 && r.handsWithAggression > r.hands * 0.3;
  if(!sane){ console.log('FAILED: implausible game dynamics'); process.exit(1) }
  console.log('ALL GOOD — ' + r.hands + ' full hands, zero money drift beyond ' + r.worstDrift.toFixed(4));
  process.exit(0);
}).catch(function(e){
  console.log('HARNESS ERROR: ' + e.message + '\n' + e.stack);
  process.exit(1);
});
