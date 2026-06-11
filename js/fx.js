'use strict';

async function flyCard(c, container, faceUp){
  const el = buildCard(c, false);
  container.appendChild(el);
  const sr = shoeStack.getBoundingClientRect(), cr = el.getBoundingClientRect();
  el.style.transition = 'none';
  el.style.transform = 'translate(' + (sr.left - cr.left) + 'px,' + (sr.top - cr.top) + 'px) rotate(48deg) scale(.85)';
  el.getBoundingClientRect();
  el.style.transition = '';
  SFX.deal();
  el.style.transform = '';
  await sleep(440);
  if(faceUp){
    el.classList.add('faceup');
    SFX.flip();
    await sleep(290);
  }
  return el;
}

function chipEl(d, small){
  const el = document.createElement('div');
  el.className = 'chip chip-' + d + (small ? ' s' : '');
  el.innerHTML = '<span>$' + d + '</span>';
  return el;
}

function flyChip(fromEl, toEl, d){
  const ar = app.getBoundingClientRect(), fr = fromEl.getBoundingClientRect(), tr = toEl.getBoundingClientRect();
  const el = chipEl(d);
  el.classList.add('fly');
  el.style.left = (fr.left - ar.left + fr.width / 2 - 23) + 'px';
  el.style.top = (fr.top - ar.top + fr.height / 2 - 23) + 'px';
  app.appendChild(el);
  el.getBoundingClientRect();
  el.style.transform = 'translate(' + ((tr.left + tr.width / 2) - (fr.left + fr.width / 2)) + 'px,' + ((tr.top + tr.height / 2) - (fr.top + fr.height / 2)) + 'px) rotate(520deg)';
  el.style.opacity = '.92';
  setTimeout(function(){ el.remove() }, 620);
}

function payoutFx(net){
  if(net > 0){
    const d = net >= 500 ? 500 : net >= 100 ? 100 : 25;
    const n = Math.min(6, Math.max(2, Math.round(net / 40)));
    for(let i = 0; i < n; i++)
      setTimeout(function(){ flyChip(dealerHand, bankWrap, d); SFX.chip() }, i * 95);
  }else if(net < 0){
    for(let i = 0; i < 3; i++)
      setTimeout(function(){ flyChip(betCircle, shoeStack, 25) }, i * 85);
  }
}

function confetti(n, gold){
  const c = fxCanvas, ctx = c.getContext('2d');
  const r = app.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  c.width = r.width * dpr;
  c.height = r.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const colors = gold
    ? ['#f6d77b', '#d4af37', '#fff3c4', '#e8b430', '#ffffff']
    : ['#f6d77b', '#7bd68a', '#ff9d9d', '#9ecbff', '#ffffff'];
  const P = [];
  for(let i = 0; i < n; i++) P.push({
    x: r.width / 2 + (Math.random() - .5) * 180, y: r.height * .36,
    vx: (Math.random() - .5) * 9.5, vy: -(Math.random() * 9 + 4),
    g: .26 + Math.random() * .12, w: 5 + Math.random() * 6, h: 3 + Math.random() * 4,
    a: Math.random() * Math.PI, va: (Math.random() - .5) * .42,
    c: colors[Math.floor(Math.random() * colors.length)],
    life: 85 + Math.random() * 45
  });
  let frame = 0;
  cancelAnimationFrame(confetti._raf);
  function step(){
    ctx.clearRect(0, 0, r.width, r.height);
    let alive = false;
    for(const p of P){
      if(frame > p.life) continue;
      alive = true;
      p.x += p.vx; p.vy += p.g; p.y += p.vy; p.vx *= .99; p.a += p.va;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.a);
      ctx.globalAlpha = Math.max(0, 1 - frame / p.life);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    frame++;
    if(alive && frame < 170) confetti._raf = requestAnimationFrame(step);
    else ctx.clearRect(0, 0, r.width, r.height);
  }
  confetti._raf = requestAnimationFrame(step);
}
