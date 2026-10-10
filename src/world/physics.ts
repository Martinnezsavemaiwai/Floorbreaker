// Circle-vs-rect collision against trees/gates (+ the boss door while it's shut), axis-separated so things slide.
import { G } from './state.ts';
import { clamp, type Point } from '../core/math.ts';

type Body = Point & { r: number };
type Pushable = Body & { kx: number; ky: number };

export function hitWall(e: Body) {
  const ws = G.doorClosed && G.L!.door ? [...G.WALLS, G.L!.door] : G.WALLS;
  return ws.some(w => {
    const cx = clamp(e.x, w.x, w.x + w.w), cy = clamp(e.y, w.y, w.y + w.h);
    return (e.x - cx) ** 2 + (e.y - cy) ** 2 < e.r * e.r;
  });
}
export function move(e: Body, dx: number, dy: number, minX = 0, maxX = G.L!.w) {
  e.x += dx; if (hitWall(e) || e.x < e.r + minX || e.x > maxX - e.r) e.x -= dx;
  e.y += dy; if (hitWall(e) || e.y < e.r || e.y > G.L!.h - e.r) e.y -= dy;
}
export function knock(e: Pushable, from: Point, power: number) { const a = Math.atan2(e.y - from.y, e.x - from.x); e.kx = Math.cos(a) * power; e.ky = Math.sin(a) * power; }
export function applyKnock(e: Pushable, dt: number, minX = 0, maxX = G.L!.w) {
  if (Math.abs(e.kx) + Math.abs(e.ky) < 5) return;
  move(e, e.kx * dt, e.ky * dt, minX, maxX);
  const f = Math.pow(0.0005, dt); e.kx *= f; e.ky *= f;
}
