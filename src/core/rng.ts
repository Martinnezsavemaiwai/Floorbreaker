// Seeded PRNG (mulberry32) for everything that affects gameplay — AI choices, wander targets, damage rolls —
// so a test or replay with the same seed + inputs plays out identically. Purely visual randomness
// (particles, torch flicker) keeps using Math.random.
let state = (Math.random() * 2 ** 32) >>> 0;

export function seedRng(seed: number) { state = seed >>> 0; }

export function rng() {
  state = (state + 0x6d2b79f5) >>> 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
