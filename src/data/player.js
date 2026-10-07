// Player stats and combat tuning — every gameplay number for the player lives here.
export const PLAYER = {
  hp: 100, atk: 10, radius: 14, speed: 220,
  perLevel: { hp: 20, atk: 3 },
  xpToNext: lv => lv * 50,
  townRegen: 15,     // HP per second inside the safe zone
  // i-frames after a hit. Bot full runs: none 1/4 wins, 0.6s 5/6, 0.4s 7/8 — they mostly stop simultaneous multi-hits
  invTime: 0.4,
  inputBuffer: 0.15, // an early attack/skill press is kept this long and fires as soon as it's allowed
  attack: { cd: 0.32, swing: 0.2, range: 55, halfArc: Math.PI * 0.4, dmgRand: 3 },
  skill: { name: 'Sonic Leap', cd: 3, dashTime: 0.18, dashSpeed: 900, delay: 0.5, dmgMult: 2.5, hitRadius: 35 },
  knockback: { light: 280, heavy: 520, heavyFrom: 20 }, // hits of heavyFrom+ damage knock harder
};
