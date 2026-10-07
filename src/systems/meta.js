// Progress that outlives a run: Memory Shards and the Sword Skills they unlock (stored in meta, see core/save.ts).
import { G } from '../world/state.ts';
import { meta, saveMeta } from '../core/save.ts';
import { SKILLS, shardsFor } from '../data/skills.ts';
import { FLOORS } from '../data/floors.ts';

// Called once when a run ends; returns the shards earned so the result screen can show them
export function awardShards(cleared) {
  const n = shardsFor(G.run.kills, cleared ? FLOORS.length : G.run.floor - 1, cleared);
  meta.shards += n; saveMeta();
  return n;
}
export const isUnlocked = id => meta.unlocked.includes(id);
export function unlockSkill(id) {
  const S = SKILLS[id];
  if (!S || isUnlocked(id) || meta.shards < S.cost) return false;
  meta.shards -= S.cost; meta.unlocked.push(id); meta.loadout = id; saveMeta(); // a fresh unlock goes straight into slot 2
  return true;
}
// Toggle a skill in/out of slot 2 (slot 1 is always Sonic Leap); applies from the next run
export function equipSkill(id) {
  if (id === 'sonicLeap' || !isUnlocked(id)) return;
  meta.loadout = meta.loadout === id ? null : id; saveMeta();
}
