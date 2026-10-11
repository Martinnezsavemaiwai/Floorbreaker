// Progress that outlives a run: Memory Shards and the Blade Arts they unlock (stored in meta, see core/save.ts).
import { G } from '../world/state.ts';
import { meta, saveMeta } from '../core/save.ts';
import { SKILLS } from '../data/skills.ts';
import { shardsFor, FLOOR_COUNT } from '../data/run.ts';

// Called once when a run ends; returns the shards earned so the result screen can show them
export function awardShards(cleared) {
  const n = shardsFor(G.run.kills, cleared ? FLOOR_COUNT : G.run.floor - 1, G.run.bosses, cleared);
  meta.shards += n; saveMeta();
  return n;
}
// Starting Arts are always in the run's pool; 'unlock' Arts join it once bought with Memory Shards
export const isUnlocked = id => SKILLS[id]?.pool === 'start' || SKILLS[id]?.pool === 'fixed' || meta.unlocked.includes(id);
export function unlockSkill(id) {
  const S = SKILLS[id];
  if (!S || S.pool !== 'unlock' || isUnlocked(id) || meta.shards < S.cost) return false;
  meta.shards -= S.cost; meta.unlocked.push(id); saveMeta();
  return true;
}
