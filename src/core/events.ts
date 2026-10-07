// Tiny event bus for things several systems react to (hit -> sound, death -> results screen...).
// Per-frame work and input don't go through here: hiding that control flow makes bugs hard to trace.
import type { MoveName } from '../data/bosses.ts';

// Every event and its payload. Emitting a misspelled event or the wrong payload is a type error.
export interface GameEvents {
  swing: void; skill: void; hit: { big: boolean }; dodge: void; levelUp: void;
  playerHurt: void; playerDeath: void; runOver: { cleared: boolean };
  mobWindup: void; mobDeath: void;
  bossWake: void; bossSummon: void; bossWind: MoveName; bossImpact: void; bossCharge: void; bossDeath: void;
  portalOpen: void; floorLoaded: number;
  hint: { title: string; sub: string };
}
type Name = keyof GameEvents;

const handlers: { [K in Name]?: ((data: GameEvents[K]) => void)[] } = {};
export function on<K extends Name>(name: K, fn: (data: GameEvents[K]) => void) {
  ((handlers[name] ??= []) as ((data: GameEvents[K]) => void)[]).push(fn);
}
export function emit<K extends Name>(name: K, ...data: GameEvents[K] extends void ? [] : [GameEvents[K]]) {
  for (const fn of (handlers[name] ?? []) as ((d: GameEvents[K]) => void)[]) fn(data[0] as GameEvents[K]);
}
