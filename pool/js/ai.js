'use strict';

const DIFFS = {
  easy:  { name: 'Lounge Larry', err: 0.05,  powErr: 0.16, mult: 1,   blurb: 'Plays loose after a few drinks. Pays even money.' },
  pro:   { name: 'Pro Patricia', err: 0.02,  powErr: 0.08, mult: 1.5, blurb: 'Runs the local league. Pays 3:2.' },
  shark: { name: 'The Shark',    err: 0.007, powErr: 0.04, mult: 2,   blurb: 'You will hear the click before you see the shot. Pays 2:1.' }
};

function pathClear(balls, ax, ay, bx, by, ignore){
  const dx = bx - ax, dy = by - ay;
  const L = Math.hypot(dx, dy) || 0.001;
  const ux = dx / L, uy = dy / L;
  for(const o of balls){
    if(o.sunk || ignore.indexOf(o.id) >= 0) continue;
    const proj = (o.x - ax) * ux + (o.y - ay) * uy;
    const t = Math.max(0, Math.min(L, proj));
    const cx = ax + ux * t, cy = ay + uy * t;
    const dd = (o.x - cx) * (o.x - cx) + (o.y - cy) * (o.y - cy);
    const lim = BALL_R * 2 - 1.5;
    if(dd < lim * lim) return false;
  }
  return true;
}

function aiPlan(balls, cue, targetIds){
  let best = null;
  for(const tid of targetIds){
    const t = balls.find(function(b){ return b.id === tid && !b.sunk });
    if(!t) continue;
    for(const pk of POCKETS){
      const pdx = pk.x - t.x, pdy = pk.y - t.y;
      const pd = Math.hypot(pdx, pdy) || 1;
      const gx = t.x - (pdx / pd) * BALL_R * 2;
      const gy = t.y - (pdy / pd) * BALL_R * 2;
      const cdx = gx - cue.x, cdy = gy - cue.y;
      const cd = Math.hypot(cdx, cdy) || 1;
      const cut = (cdx * pdx + cdy * pdy) / (cd * pd);
      if(cut < 0.28) continue;
      if(!pathClear(balls, cue.x, cue.y, gx, gy, [0, tid])) continue;
      if(!pathClear(balls, t.x, t.y, pk.x, pk.y, [0, tid])) continue;
      const score = cut * 2.2 - cd / 900 - pd / 1100 + (pk.r > 20 ? 0.08 : 0);
      if(!best || score > best.score){
        const need = cd / Math.max(cut, 0.35) + pd * 1.7;
        const power = Math.max(0.18, Math.min(1, 0.16 + need / 950));
        best = { score: score, angle: Math.atan2(cdy, cdx), power: power, target: tid, pocket: pk, gx: gx, gy: gy };
      }
    }
  }
  return best;
}

function aiSafety(balls, cue, targetIds){
  let pick = null;
  for(const tid of targetIds){
    const t = balls.find(function(b){ return b.id === tid && !b.sunk });
    if(!t) continue;
    const d = Math.hypot(t.x - cue.x, t.y - cue.y) || 1;
    const gx = t.x - (t.x - cue.x) / d * BALL_R * 2;
    const gy = t.y - (t.y - cue.y) / d * BALL_R * 2;
    const clear = pathClear(balls, cue.x, cue.y, gx, gy, [0, tid]);
    if(clear && (!pick || d < pick.d)){
      pick = { d: d, angle: Math.atan2(t.y - cue.y, t.x - cue.x) };
    }
  }
  if(!pick){
    const t = balls.find(function(b){ return targetIds.indexOf(b.id) >= 0 && !b.sunk });
    if(t) pick = { d: 260, angle: Math.atan2(t.y - cue.y, t.x - cue.x) };
    else pick = { d: 260, angle: Math.random() * Math.PI * 2 };
  }
  return { angle: pick.angle, power: Math.max(0.16, Math.min(0.5, 0.14 + pick.d / 1500)), safety: true };
}

function aiPlaceCue(balls, targetIds, kitchenOnly){
  const xMax = kitchenOnly ? KITCHEN_X - BALL_R : PF.x1 - 28;
  function freeAt(x, y){
    return !balls.some(function(b){
      return !b.sunk && b.id !== 0 && (b.x - x) * (b.x - x) + (b.y - y) * (b.y - y) < (BALL_R * 2.3) * (BALL_R * 2.3);
    });
  }
  let best = null;
  for(let i = 0; i < 70; i++){
    const x = PF.x0 + 28 + Math.random() * (xMax - PF.x0 - 28);
    const y = PF.y0 + 28 + Math.random() * (PF.y1 - PF.y0 - 56);
    if(!freeAt(x, y)) continue;
    const plan = aiPlan(balls, { x: x, y: y }, targetIds);
    if(plan && (!best || plan.score > best.plan.score)) best = { x: x, y: y, plan: plan };
  }
  if(best) return best;
  for(let k = 0; k < 60; k++){
    const x = PF.x0 + 28 + Math.random() * (xMax - PF.x0 - 28);
    const y = PF.y0 + 28 + Math.random() * (PF.y1 - PF.y0 - 56);
    if(freeAt(x, y)) return { x: x, y: y, plan: null };
  }
  return { x: PF.x0 + 40, y: 260, plan: null };
}

function aiDecide(balls, cue, targetIds, diff){
  const plan = aiPlan(balls, cue, targetIds);
  let shot;
  if(plan){
    shot = { angle: plan.angle, power: plan.power, target: plan.target, pocket: plan.pocket };
  }else{
    shot = aiSafety(balls, cue, targetIds);
  }
  const g = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
  shot.angle += g * diff.err;
  shot.power = Math.max(0.14, Math.min(1, shot.power * (1 + (Math.random() - 0.5) * diff.powErr * 2)));
  return shot;
}
