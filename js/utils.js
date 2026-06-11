'use strict';

const $id = function(i){ return document.getElementById(i) };

const sleep = function(ms){ return new Promise(function(r){ setTimeout(r, ms) }) };

const store = {
  get: function(k, d){
    try{
      const v = localStorage.getItem(k);
      return v == null ? d : JSON.parse(v);
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
