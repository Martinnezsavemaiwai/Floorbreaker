// One gameplay step, in a fixed order: player (may change floor) -> doors -> room waves -> mobs -> boss.
import { updatePlayer } from './player.js';
import { updateMobs } from './mobs.js';
import { updateBoss } from './boss.js';
import { updateArena } from './arena.js';
import { updateMerchant } from './merchant.js';
import { updateFolk } from './townsfolk.js';
import { updateHints } from './hints.js';
import { updateRoom, updateDoors } from './rooms.js';
import { G } from '../world/state.ts';
import { assistOn } from '../world/floor.ts';

export function updateGame(dt) {
  if (assistOn()) G.run.assisted = true; // the record notes runs that used assist at any point
  if (updatePlayer(dt)) return; // walked through the portal: the new floor starts next step
  if (updateDoors()) return; // walked through a door: same
  updateRoom(dt);
  updateMerchant(dt);
  updateFolk(dt);
  updateMobs(dt);
  updateBoss(dt);
  updateArena(dt);
  updateHints(dt);
}
export { updateFx } from './fx.js';
export { attack, skill, roll } from './player.js';
export { hurtPlayer, hurtEnemy } from './combat.js';
export { startBossMove } from './boss.js';
