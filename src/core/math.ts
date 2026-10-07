import { rng } from './rng.ts';

export interface Point { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }

// rand/pick draw from the seeded gameplay RNG
export const rand = (a: number, b: number) => a + Math.floor(rng() * (b - a + 1));
export const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const pick = <T>(a: readonly T[]): T => a[Math.floor(rng() * a.length)];
export const overlaps = (a: Rect, b: Rect, m = 0) => a.x < b.x + b.w + m && b.x < a.x + a.w + m && a.y < b.y + b.h + m && b.y < a.y + a.h + m;
