// Player stats and combat tuning — every gameplay number for the player lives here.
export interface PlayerStats {
  hp: number; atk: number; radius: number; speed: number;
  perLevel: { hp: number; atk: number };
  xpToNext: (lv: number) => number;
  townRegen: number; invTime: number; inputBuffer: number;
  attack: { cd: number; swing: number; range: number; halfArc: number; dmgRand: number };
  combo: { window: number; mult: number; range: number; halfArc: number; cdMult: number; lunge: number };
  roll: { time: number; speed: number; cd: number };
  knockback: { light: number; heavy: number; heavyFrom: number };
}

export const PLAYER = {
  hp: 100, atk: 10, radius: 14, speed: 220,
  perLevel: { hp: 14, atk: 2 }, // lowered from 20/3 when level-up picks arrived; bot runs (12 seeds): 9 wins fully levelled, 1 under-levelled
  xpToNext: lv => lv * 50,
  townRegen: 15,     // HP per second inside the safe zone
  // i-frames after a hit. Bot full runs: none 1/4 wins, 0.6s 5/6, 0.4s 7/8 — they mostly stop simultaneous multi-hits
  invTime: 0.4,
  inputBuffer: 0.15, // an early attack/skill press is kept this long and fires as soon as it's allowed
  attack: { cd: 0.32, swing: 0.2, range: 55, halfArc: Math.PI * 0.4, dmgRand: 3 },
  // every 3rd swing in a chain (next press within `window` s of the last one ending) is a finisher:
  // more damage, a wider/longer arc, heavy knockback + stagger, a short step forward and a longer recovery
  combo: { window: 0.45, mult: 1.6, range: 70, halfArc: Math.PI * 0.6, cdMult: 1.4, lunge: 260 },
  roll: { time: 0.22, speed: 620, cd: 0.7 }, // dodge roll: i-frames for its whole duration
  // Sword Skills live in skills.ts
  knockback: { light: 280, heavy: 520, heavyFrom: 20 }, // hits of heavyFrom+ damage knock harder
} satisfies PlayerStats;
