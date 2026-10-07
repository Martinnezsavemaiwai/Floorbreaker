// One gameplay step, in a fixed order: player (may change floor) -> mobs -> boss.
import { updatePlayer } from './player.js';
import { updateMobs } from './mobs.js';
import { updateBoss } from './boss.js';

export function updateGame(dt) {
  if (updatePlayer(dt)) return; // walked through the portal: the new floor starts next step
  updateMobs(dt);
  updateBoss(dt);
}
export { updateFx } from './fx.js';
export { attack, skill } from './player.js';
export { hurtPlayer } from './combat.js';
export { startBossMove } from './boss.js';
