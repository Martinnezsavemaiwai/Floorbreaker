// Field mobs. Floors reference these by id (see floors.ts).
// kind: 'beast' = 2-frame side sheet that flips, 'humanoid' = 4-direction character sheet.
// ranged: keeps its distance and fires a dodgeable shot after the wind-up instead of lunging.
export interface MobStats {
  name: string; img: string; white: string; kind: 'beast' | 'humanoid';
  hp: number; dmg: number; speed: number; wind: number; xp: number;
  radius: number; reach: number; attackRange: number; attackCd: number; lunge: number;
  respawn: number; chaseRange: number; wanderSpeed: number; wanderRange: number;
  knockback: { light: number; heavy: number };
  ranged?: { keep: number; range: number; shotSpeed: number; shotR: number; color: string };
}

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
  // ranged support mobs, one per floor
  koboldSlinger: { ...BASE, name: 'Kobold Slinger', img: 'slingerT', white: 'taurusWhite', kind: 'humanoid', hp: 30, dmg: 8, speed: 110, wind: 0.6, xp: 20,
    attackCd: 2.2, ranged: { keep: 170, range: 300, shotSpeed: 320, shotR: 7, color: '#d8b070' } },
  taurusJavelineer: { ...BASE, name: 'Taurus Javelineer', img: 'javelinT', white: 'playerWhite', kind: 'humanoid', hp: 60, dmg: 14, speed: 115, wind: 0.55, xp: 40,
    attackCd: 2, ranged: { keep: 180, range: 320, shotSpeed: 420, shotR: 8, color: '#ff9050' } },
  darkElfMage: { ...BASE, name: 'Dark Elf Mage', img: 'mageT', white: 'bossWhite', kind: 'humanoid', hp: 90, dmg: 20, speed: 115, wind: 0.7, xp: 60,
    attackCd: 2.4, ranged: { keep: 190, range: 340, shotSpeed: 260, shotR: 11, color: '#b080ff' } },
} satisfies Record<string, MobStats>;

export type MobId = keyof typeof MOBS;
