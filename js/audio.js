'use strict';

let AC = null, muted = store.get('bj-muted', false);

function ac(){
  if(muted) return null;
  if(!AC){
    try{ AC = new (window.AudioContext || window.webkitAudioContext)() }catch(e){ return null }
  }
  if(AC && AC.state === 'suspended') AC.resume();
  return AC;
}

function tone(f, dur, type, vol, delay, slide){
  const c = ac(); if(!c) return;
  const t = c.currentTime + (delay || 0);
  const o = c.createOscillator(), g = c.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(f, t);
  if(slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol || .12, t + .012);
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g); g.connect(c.destination);
  o.start(t); o.stop(t + dur + .06);
}

function noiseBurst(dur, vol, freq, delay){
  const c = ac(); if(!c) return;
  const t = c.currentTime + (delay || 0);
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for(let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = .8;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(c.destination);
  src.start(t);
}

const SFX = {
  deal: function(){ noiseBurst(.09, .3, 1700) },
  flip: function(){ noiseBurst(.06, .2, 2600); tone(880, .05, 'triangle', .05, .02) },
  chip: function(){ tone(2700 + Math.random() * 600, .035, 'square', .06); tone(2000, .045, 'square', .05, .028) },
  win: function(streak){
    const m = Math.pow(2, Math.min(streak || 0, 8) / 12);
    [523, 659, 784, 1047].forEach(function(f, i){ tone(f * m, .22, 'triangle', .12, i * .09) });
    if((streak || 0) >= 3) tone(1319 * m, .3, 'triangle', .1, .36);
  },
  big: function(){
    [523, 659, 784, 1047, 1319, 1568].forEach(function(f, i){ tone(f, .3, 'triangle', .13, i * .1) });
    [262, 330, 392].forEach(function(f, i){ tone(f, .85, 'sine', .06, .32 + i * .02) });
  },
  lose: function(){ tone(230, .3, 'sawtooth', .05, 0, 140); tone(115, .4, 'triangle', .08, .13) },
  push: function(){ tone(440, .12, 'sine', .08); tone(440, .12, 'sine', .08, .18) },
  shuffle: function(){ for(let i = 0; i < 7; i++) noiseBurst(.05, .14, 1100 + i * 320, i * .065) }
};
