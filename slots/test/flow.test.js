'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { webcrypto } = require('crypto');

function makeEl(){
  const el = {
    textContent: '', innerHTML: '', className: '', value: '', checked: false, disabled: false,
    style: {}, onclick: null, dataset: {}, children: [], clientHeight: 252, outerHTML: '',
    classList: { add: function(){}, remove: function(){}, toggle: function(){}, contains: function(){ return false } },
    appendChild: function(c){ this.children.push(c); return c },
    querySelector: function(){ if(!this._q) this._q = makeEl(); return this._q },
    querySelectorAll: function(){ return [] },
    addEventListener: function(){},
    getBoundingClientRect: function(){ return { width: 500, height: 252, left: 0, top: 0 } },
    getContext: function(){
      return { setTransform: function(){}, clearRect: function(){}, save: function(){}, restore: function(){},
        translate: function(){}, rotate: function(){}, beginPath: function(){}, arc: function(){},
        fill: function(){}, stroke: function(){}, scale: function(){}, globalAlpha: 1, fillStyle: '', strokeStyle: '', lineWidth: 1 };
    }
  };
  return el;
}

const elCache = {};
const storage = { 'bj-bank': '1000' };
let clock = 0;
const sandbox = {
  console: console, Math: Math, JSON: JSON, Object: Object, Array: Array, Number: Number, String: String,
  Promise: Promise, Uint8Array: Uint8Array, TextEncoder: TextEncoder,
  setTimeout: function(cb){ Promise.resolve().then(cb); return 0 },
  clearTimeout: function(){},
  requestAnimationFrame: function(cb){ Promise.resolve().then(function(){ clock += 40; cb(clock) }); return 0 },
  cancelAnimationFrame: function(){},
  performance: { now: function(){ clock += 120; return clock } },
  crypto: webcrypto,
  localStorage: {
    getItem: function(k){ return storage[k] == null ? null : storage[k] },
    setItem: function(k, v){ storage[k] = String(v) },
    removeItem: function(k){ delete storage[k] }
  },
  navigator: {}, location: { protocol: 'http:' },
  addEventListener: function(){}, dispatchEvent: function(){},
  document: {
    getElementById: function(id){ if(!elCache[id]) elCache[id] = makeEl(); return elCache[id] },
    createElement: function(){ return makeEl() },
    addEventListener: function(){}
  }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

['wallet.js', 'engine.js', 'game.js'].forEach(function(f){
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');
  vm.runInContext(src, sandbox, { filename: f });
});

const harness = `
(async function(){
  const startBank = W.bank;
  let fails = [];
  G.turbo = true;
  G.bet = 10;
  let spins = 0;
  for(let i = 0; i < 80; i++){
    if(W.bank < G.bet) break;
    await doSpin();
    let guard = 0;
    while((G.fsLeft > 0 || G.spinning) && guard++ < 4000){
      await new Promise(function(r){ setTimeout(r, 0) });
    }
    if(guard >= 4000) fails.push('spin ' + i + ' never settled (fsLeft=' + G.fsLeft + ' spinning=' + G.spinning + ')');
    spins++;
    if(W.bank < -0.001) fails.push('negative bank after spin ' + i + ': ' + W.bank);
    if(isNaN(W.bank)) fails.push('NaN bank after spin ' + i);
    const stored = JSON.parse(localStorage.getItem('bj-bank'));
    if(Math.abs(stored - W.bank) > 0.011) fails.push('stored wallet drift at spin ' + i + ': ' + stored + ' vs ' + W.bank);
  }
  const expectedNet = stats.won - stats.wagered;
  const actualNet = W.bank - startBank;
  if(Math.abs(expectedNet - actualNet) > 0.02) fails.push('accounting mismatch: stats say net ' + expectedNet.toFixed(2) + ', bank moved ' + actualNet.toFixed(2));
  return { fails: fails, spins: spins, baseSpins: stats.spins, wagered: stats.wagered, won: Math.round(stats.won * 100) / 100, bank: W.bank, fsRounds: stats.fsRounds };
})()
`;

vm.runInContext(harness, sandbox).then(function(r){
  console.log(JSON.stringify(r, null, 2));
  if(r.fails.length){ console.log('FAILED'); process.exit(1) }
  if(r.baseSpins !== r.spins){ console.log('FAILED: spin count mismatch'); process.exit(1) }
  console.log('ALL GOOD — ' + r.spins + ' paid spins (+' + r.fsRounds + ' free-spin rounds), wallet accounting exact');
  process.exit(0);
}).catch(function(e){
  console.log('HARNESS ERROR: ' + e.message + '\n' + e.stack);
  process.exit(1);
});
