// The live game state, shared by systems, rendering and UI. One plain object instead of module-level `let`s,
// because ES module bindings can't be reassigned from other files.
import { BOSS_RULES } from '../data/bosses.js';

export const G = {
  P: null,             // player (null on the title screen)
  mobs: [], boss: null,
  texts: [], parts: [], rings: [],
  doorClosed: false, portal: null,
  floorIdx: 0, F: null, WALLS: [],
  run: null,           // { floor, kills, time, over?: 'dead' | 'win' }
  cam: { x: 0, y: 0 },
  shake: 0, time: 0, introT: 0,
};

export const rage = () => G.boss.hp < G.boss.maxHp * BOSS_RULES.rageAt;
