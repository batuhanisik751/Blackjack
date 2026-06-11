'use strict';

const $id = function(i){ return document.getElementById(i) };

const sleep = function(ms){ return new Promise(function(r){ setTimeout(r, ms) }) };

const store = {
  get: function(k, d){
    try{
      const v = localStorage.getItem(k);
      if(v == null) return d;
      const p = JSON.parse(v);
      return p == null ? d : p;
    }catch(e){ return d }
  },
  set: function(k, v){
    try{ localStorage.setItem(k, JSON.stringify(v)) }catch(e){}
  }
};

function fmt(n){
  n = Math.round(n * 100) / 100;
  const neg = n < 0;
  n = Math.abs(n);
  const opts = Number.isInteger(n)
    ? { maximumFractionDigits: 0 }
    : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  return (neg ? '−$' : '$') + n.toLocaleString('en-US', opts);
}

const SPEEDF = { relaxed: 1.45, normal: 1, fast: 0.55, instant: 0.15 };

const wait = function(ms){
  let f = 1;
  try{ f = SPEEDF[S.opts.speed] || 1 }catch(e){}
  return sleep(Math.round(ms * f));
};

function xmur3(str){
  let h = 1779033703 ^ str.length;
  for(let i = 0; i < str.length; i++){
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function(){
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^ (h >>> 16)) >>> 0;
  };
}

function mulberry32(a){
  return function(){
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededRng(str){
  return mulberry32(xmur3(String(str))());
}
