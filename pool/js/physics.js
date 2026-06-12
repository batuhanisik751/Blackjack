'use strict';

const BALL_R = 11;
const PF = { x0: 60, y0: 60, x1: 940, y1: 460 };
const KITCHEN_X = PF.x0 + 220;
const FOOT_SPOT = { x: 720, y: 260 };

const POCKETS = [
  { x: PF.x0 + 4, y: PF.y0 + 4, r: 22 },
  { x: 500, y: PF.y0 - 9, r: 19 },
  { x: PF.x1 - 4, y: PF.y0 + 4, r: 22 },
  { x: PF.x0 + 4, y: PF.y1 - 4, r: 22 },
  { x: 500, y: PF.y1 + 9, r: 19 },
  { x: PF.x1 - 4, y: PF.y1 - 4, r: 22 }
];

const FR = 0.9912;
const REST_BALL = 0.96;
const REST_CUSHION = 0.78;
const STOP_V = 0.018;
const MAX_LAUNCH = 7.6;

function physStep(balls, ev){
  let moving = false;
  for(const b of balls){
    if(b.sunk) continue;
    if(b.vx === 0 && b.vy === 0) continue;
    b.x += b.vx;
    b.y += b.vy;
    b.vx *= FR;
    b.vy *= FR;
    if(b.vx * b.vx + b.vy * b.vy < STOP_V * STOP_V){ b.vx = 0; b.vy = 0 }
    else moving = true;

    let pocketed = false;
    for(const pk of POCKETS){
      const dx = b.x - pk.x, dy = b.y - pk.y;
      if(dx * dx + dy * dy < pk.r * pk.r){
        b.sunk = true;
        b.sinkX = pk.x; b.sinkY = pk.y; b.sinkT = 0;
        b.vx = 0; b.vy = 0;
        if(ev.pot) ev.pot(b);
        pocketed = true;
        break;
      }
    }
    if(pocketed) continue;

    let nearPocket = false;
    for(const pk of POCKETS){
      const dx = b.x - pk.x, dy = b.y - pk.y;
      const z = pk.r + BALL_R + 9;
      if(dx * dx + dy * dy < z * z){ nearPocket = true; break }
    }
    if(!nearPocket){
      if(b.x < PF.x0 + BALL_R && b.vx < 0){ b.x = PF.x0 + BALL_R; b.vx = -b.vx * REST_CUSHION; if(ev.cushion) ev.cushion(Math.abs(b.vx)) }
      else if(b.x > PF.x1 - BALL_R && b.vx > 0){ b.x = PF.x1 - BALL_R; b.vx = -b.vx * REST_CUSHION; if(ev.cushion) ev.cushion(Math.abs(b.vx)) }
      if(b.y < PF.y0 + BALL_R && b.vy < 0){ b.y = PF.y0 + BALL_R; b.vy = -b.vy * REST_CUSHION; if(ev.cushion) ev.cushion(Math.abs(b.vy)) }
      else if(b.y > PF.y1 - BALL_R && b.vy > 0){ b.y = PF.y1 - BALL_R; b.vy = -b.vy * REST_CUSHION; if(ev.cushion) ev.cushion(Math.abs(b.vy)) }
    }else{
      if(b.x < PF.x0 - 16 || b.x > PF.x1 + 16 || b.y < PF.y0 - 16 || b.y > PF.y1 + 16){
        let np = POCKETS[0], nd = Infinity;
        for(const pk of POCKETS){
          const d = (b.x - pk.x) * (b.x - pk.x) + (b.y - pk.y) * (b.y - pk.y);
          if(d < nd){ nd = d; np = pk }
        }
        b.sunk = true;
        b.sinkX = np.x; b.sinkY = np.y; b.sinkT = 0;
        b.vx = 0; b.vy = 0;
        if(ev.pot) ev.pot(b);
      }
    }
  }

  for(let i = 0; i < balls.length; i++){
    const a = balls[i];
    if(a.sunk) continue;
    for(let j = i + 1; j < balls.length; j++){
      const c = balls[j];
      if(c.sunk) continue;
      const dx = c.x - a.x, dy = c.y - a.y;
      const d2 = dx * dx + dy * dy;
      const min = BALL_R * 2;
      if(d2 < min * min && d2 > 0.000001){
        const d = Math.sqrt(d2);
        const nx = dx / d, ny = dy / d;
        const overlap = (min - d) / 2;
        a.x -= nx * overlap; a.y -= ny * overlap;
        c.x += nx * overlap; c.y += ny * overlap;
        const dvn = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
        if(dvn < 0){
          const imp = -(1 + REST_BALL) * dvn / 2;
          a.vx -= imp * nx; a.vy -= imp * ny;
          c.vx += imp * nx; c.vy += imp * ny;
          if(ev.clack) ev.clack(Math.min(1, Math.abs(dvn) / 9));
          if(ev.contact && (a.id === 0 || c.id === 0)) ev.contact(a.id === 0 ? c.id : a.id);
          moving = true;
        }
      }
    }
  }
  return moving;
}

function rayBalls(balls, x, y, ux, uy, ignoreId){
  let bestT = Infinity, hit = null;
  for(const b of balls){
    if(b.sunk || b.id === ignoreId) continue;
    const rx = b.x - x, ry = b.y - y;
    const proj = rx * ux + ry * uy;
    if(proj <= 0) continue;
    const perp2 = (rx * rx + ry * ry) - proj * proj;
    const R2 = (BALL_R * 2) * (BALL_R * 2);
    if(perp2 > R2) continue;
    const t = proj - Math.sqrt(R2 - perp2);
    if(t > 0 && t < bestT){ bestT = t; hit = b }
  }
  return hit ? { t: bestT, ball: hit } : null;
}

function rayCushion(x, y, ux, uy){
  let t = Infinity;
  if(ux < 0) t = Math.min(t, (PF.x0 + BALL_R - x) / ux);
  if(ux > 0) t = Math.min(t, (PF.x1 - BALL_R - x) / ux);
  if(uy < 0) t = Math.min(t, (PF.y0 + BALL_R - y) / uy);
  if(uy > 0) t = Math.min(t, (PF.y1 - BALL_R - y) / uy);
  return t === Infinity ? 1200 : t;
}
