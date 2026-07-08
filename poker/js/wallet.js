'use strict';

const W = {
  bank: 1000,
  stake: 0,
  load: function(){
    try{
      const v = localStorage.getItem('bj-bank');
      if(v != null){
        const p = JSON.parse(v);
        if(typeof p === 'number' && isFinite(p)) this.bank = Math.round(p * 100) / 100;
      }
    }catch(e){}
  },
  save: function(){
    try{ localStorage.setItem('bj-bank', JSON.stringify(Math.round((this.bank + this.stake) * 100) / 100)) }catch(e){}
  },
  placeStake: function(amount){
    if(this.stake > 0) return false;
    if(amount > this.bank) return false;
    this.bank -= amount;
    this.stake = amount;
    this.save();
    return true;
  },
  settleWin: function(mult){
    const ret = this.stake + this.stake * mult;
    this.bank += ret;
    this.stake = 0;
    this.save();
    return ret;
  },
  settleLoss: function(){
    this.stake = 0;
    this.save();
  },
  refundStake: function(){
    this.bank += this.stake;
    this.stake = 0;
    this.save();
  },
  takeLoan: function(){
    this.bank += 1000;
    this.save();
    try{
      let s = null;
      try{ s = JSON.parse(localStorage.getItem('bj-stats')) }catch(e){}
      if(!s || typeof s !== 'object' || typeof s.loans !== 'number'){
        s = { hands: 0, wins: 0, losses: 0, pushes: 0, bjs: 0, net: 0, bigWin: 0, streak: 0, bestStreak: 0, loans: 0 };
      }
      s.loans++;
      localStorage.setItem('bj-stats', JSON.stringify(s));
    }catch(e){}
  }
};

W.load();

function fmtMoney(n){
  n = Math.round(n * 100) / 100;
  const o = Number.isInteger(n) ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  return (n < 0 ? '−$' : '$') + Math.abs(n).toLocaleString('en-US', o);
}

window.addEventListener('storage', function(e){
  if(e.key === 'bj-bank' && W.stake === 0){
    W.load();
    if(window.onBankSync) window.onBankSync();
    else if(window.updateHud) window.updateHud();
  }
});
