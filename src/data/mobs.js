// Field mobs. Floors reference these by id (see floors.js).
// kind: 'beast' = 2-frame side sheet that flips, 'humanoid' = 4-direction character sheet.
const BASE = {
  radius: 16,
  reach: 24,        // lunge still hits if the player is within radius + player radius + reach
  attackRange: 8,   // starts winding up within radius + player radius + attackRange
  attackCd: 1, lunge: 0.15,
  respawn: 6, chaseRange: 260, wanderSpeed: 50, wanderRange: 80,
  knockback: { light: 260, heavy: 480 },
};

export const MOBS = {
  frenzyBoar: { ...BASE, name: 'Frenzy Boar', img: 'boar', white: 'boarWhite', kind: 'beast', hp: 45, dmg: 10, speed: 140, wind: 0.35, xp: 25 },
  taurusSoldier: { ...BASE, name: 'Taurus Soldier', img: 'taurusT', white: 'taurusWhite', kind: 'humanoid', hp: 90, dmg: 16, speed: 125, wind: 0.4, xp: 45 },
  darkElf: { ...BASE, name: 'Dark Elf Warrior', img: 'elfT', white: 'bossWhite', kind: 'humanoid', hp: 140, dmg: 22, speed: 135, wind: 0.35, xp: 70 },
};
