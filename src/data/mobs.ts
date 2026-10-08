// Field mobs. Floors reference these by id (see floors.ts).
// kind: 'beast' = 2-frame side sheet that flips, 'humanoid' = 4-direction character sheet.
// ranged: keeps its distance and fires a dodgeable shot after the wind-up instead of lunging.
// armor: normal hits do 25% and don't stagger; a heavy hit (combo finisher / Blade Art) breaks it for `regen` s.
// scale: sprite/body size (swarm mobs are small).
export interface MobStats {
  name: string; img: string; white: string; kind: 'beast' | 'humanoid';
  hp: number; dmg: number; speed: number; wind: number; xp: number; col: number; // col = money dropped
  radius: number; reach: number; attackRange: number; attackCd: number; lunge: number;
  respawn: number; chaseRange: number; wanderSpeed: number; wanderRange: number;
  knockback: { light: number; heavy: number };
  ranged?: { keep: number; range: number; shotSpeed: number; shotR: number; color: string };
  armor?: { regen: number }; scale?: number;
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
  frenzyBoar: { ...BASE, name: 'Wild Tusker', img: 'boar', white: 'boarWhite', kind: 'beast', hp: 45, dmg: 10, speed: 140, wind: 0.35, xp: 25, col: 5 },
  taurusSoldier: { ...BASE, name: 'Taurus Soldier', img: 'taurus', white: 'taurusWhite', kind: 'humanoid', hp: 90, dmg: 16, speed: 125, wind: 0.4, xp: 45, col: 8 },
  darkElf: { ...BASE, name: 'Dark Elf Warrior', img: 'elf', white: 'elfWhite', kind: 'humanoid', hp: 140, dmg: 22, speed: 135, wind: 0.35, xp: 70, col: 12 },
  // ranged support mobs, one per floor
  houndfangSlinger: { ...BASE, name: 'Houndfang Slinger', img: 'slinger', white: 'slingerWhite', kind: 'humanoid', hp: 30, dmg: 8, speed: 110, wind: 0.6, xp: 20, col: 6,
    attackCd: 2.2, ranged: { keep: 170, range: 300, shotSpeed: 320, shotR: 7, color: '#d8b070' } },
  taurusJavelineer: { ...BASE, name: 'Taurus Javelineer', img: 'javelin', white: 'javelinWhite', kind: 'humanoid', hp: 60, dmg: 14, speed: 115, wind: 0.55, xp: 40, col: 10,
    attackCd: 2, ranged: { keep: 180, range: 320, shotSpeed: 420, shotR: 8, color: '#ff9050' } },
  darkElfMage: { ...BASE, name: 'Dark Elf Mage', img: 'mage', white: 'mageWhite', kind: 'humanoid', hp: 90, dmg: 20, speed: 115, wind: 0.7, xp: 60, col: 14,
    attackCd: 2.4, ranged: { keep: 190, range: 340, shotSpeed: 260, shotR: 11, color: '#b080ff' } },
  // swarms (come in groups) and armored guardians
  piglet: { ...BASE, name: 'Boar Piglet', img: 'piglet', white: 'pigletWhite', kind: 'beast', hp: 14, dmg: 5, speed: 175, wind: 0.25, xp: 6, col: 1,
    radius: 10, scale: 0.65, respawn: 10 },
  taurusGuardian: { ...BASE, name: 'Taurus Guardian', img: 'guardian', white: 'guardianWhite', kind: 'humanoid', hp: 260, dmg: 30, speed: 80, wind: 0.6, xp: 90, col: 18,
    radius: 20, scale: 1.3, armor: { regen: 3 }, knockback: { light: 0, heavy: 300 }, respawn: 12 },
  elfKnight: { ...BASE, name: 'Dark Elf Knight', img: 'knight', white: 'knightWhite', kind: 'humanoid', hp: 360, dmg: 36, speed: 90, wind: 0.55, xp: 120, col: 24,
    radius: 20, scale: 1.3, armor: { regen: 3 }, knockback: { light: 0, heavy: 300 }, respawn: 12 },
  shadowPiglet: { ...BASE, name: 'Shadow Piglet', img: 'shadowpig', white: 'shadowpigWhite', kind: 'beast', hp: 30, dmg: 9, speed: 185, wind: 0.25, xp: 12, col: 2,
    radius: 10, scale: 0.65, respawn: 10 },
  tideGuardian: { ...BASE, name: 'Tide Guardian', img: 'tideguard', white: 'tideguardWhite', kind: 'humanoid', hp: 460, dmg: 42, speed: 90, wind: 0.55, xp: 150, col: 30,
    radius: 20, scale: 1.3, armor: { regen: 2.5 }, knockback: { light: 0, heavy: 300 }, respawn: 12 },
  crabling: { ...BASE, name: 'Tide Crabling', img: 'crab', white: 'crabWhite', kind: 'beast', hp: 45, dmg: 12, speed: 190, wind: 0.22, xp: 16, col: 3,
    radius: 10, scale: 0.65, respawn: 10 },
  // floor 4 (Canalis, the water town)
  tidalBoar: { ...BASE, name: 'Tidal Boar', img: 'tidalboar', white: 'tidalboarWhite', kind: 'beast', hp: 200, dmg: 28, speed: 160, wind: 0.32, xp: 100, col: 16 },
  waterWraith: { ...BASE, name: 'Water Wraith', img: 'wraith', white: 'wraithWhite', kind: 'humanoid', hp: 120, dmg: 24, speed: 120, wind: 0.6, xp: 85, col: 18,
    attackCd: 2.2, ranged: { keep: 190, range: 340, shotSpeed: 340, shotR: 9, color: '#6fd8ff' } },
} satisfies Record<string, MobStats>;

export type MobId = keyof typeof MOBS;
