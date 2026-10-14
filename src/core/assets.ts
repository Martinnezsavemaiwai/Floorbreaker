// Sprites and scenery: our own art (art-src/ -> scripts/import_art.py).
// Character sheets: 4 columns
// (down/up/left/right) x 7 rows (0-3 walk, 4 attack) of square cells sized so each draws 1:1.
// Beasts: 2 side-view frames facing left. Scenery: tileable textures and loose pieces (see render/terrain.js).
export const IMG: Record<string, HTMLImageElement | HTMLCanvasElement> = {};

// 'source-in' = flat silhouette, 'multiply' = recolor keeping the pixel shading
export function tinted(img: HTMLImageElement, mode: GlobalCompositeOperation, col: string) {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d')!;
  g.drawImage(img, 0, 0); g.globalCompositeOperation = mode; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'destination-in'; g.drawImage(img, 0, 0);
  return c;
}
// rage forms of the bosses: the same art pushed toward red/orange
const TINTS: Record<string, Record<string, string>> = {
  treant: { treantRage: '#ff7050' }, merchant: { folkA: '#7fa8d8', folkB: '#b98c6a' }, // townsfolk reuse the merchant sheet
  boss1: { boss1Rage: '#ffb070' }, boss2: { boss2Rage: '#ff8a8a' }, boss4: { boss4Rage: '#c0a0ff' },
};
const SPRITES = ['player', 'merchant', 'slinger', 'taurus', 'javelin', 'guardian', 'elf', 'mage', 'knight', 'wraith', 'tideguard',
  'boss1', 'boss2', 'boss4', 'boar', 'piglet', 'shadowpig', 'tidalboar', 'crab', 'treant'];
const SCENERY = ['ground-1', 'ground-2', 'ground-3', 'ground-4', 'road', 'town', 'bossroom', 'wall', 'water',
  'tree-big', 'tree-dark', 'tree-small', 'fountain', 'patches-1', 'patches-2', 'patches-3', ...Array.from({ length: 8 }, (_, i) => `deco-${i + 1}`)];
const loadImg = (n: string) => { const i = new Image(); i.src = `assets/${n}.png`; return i.decode().then(() => i); };
// Headless (Node tests) there is no Image: nothing loads and IMG stays empty, so systems may read IMG safely
const headless = typeof Image === 'undefined';
// art the game can do without (ChatGPT drafts in progress): a missing file just leaves IMG[name] unset
const many = (n: string, k: number) => Array.from({ length: k }, (_, i) => `${n}-${i + 1}`);
const OPTIONAL = ['title-art', 'door', 'door-boss', 'shrine', 'portal', ...many('shots', 4), ...many('folk', 3),
  ...many('icons-arts', 6), ...many('icons-upgrades', 9), ...many('icons-elements', 4), ...many('town-props', 10),
  'house', 'stall', 'bird', 'gull', 'boss-gate', 'pillar', 'pillar-cracked', 'torch', 'rock', 'root-sprout', 'lanterns',
  ...many('coin', 4), ...many('xp-orb', 4), 'potion', 'platform', 'moss', ...many('icons-shop', 3), ...many('icons-shrine', 4)];
const optional = headless ? null : Promise.all(OPTIONAL.map(n => loadImg(n).then(img => { IMG[n] = img; }, () => {})));
export const ready = headless ? Promise.resolve() : Promise.all([optional, ...[...SPRITES, ...SCENERY, 'sword', 'fog'].map(n => loadImg(n).then(img => {
  IMG[n] = img; IMG[n + 'White'] = tinted(img, 'source-in', '#fff');
  for (const [k, col] of Object.entries(TINTS[n] || {})) IMG[k] = tinted(img, 'multiply', col);
}))]);

// Card and slot icons (art-src/icons-*.png, imported left to right in these orders); undefined until imported
const ICONS: Record<'art' | 'upgrade' | 'element', string[]> = {
  art: ['sonicLeap', 'horizontal', 'vorpal', 'crescent', 'riposte', 'shade'],
  upgrade: ['keenEdge', 'quickSlash', 'leapPower', 'leapCharge', 'vitality', 'lifesteal', 'swift', 'critical', 'secondWind'],
  element: ['ember', 'storm', 'thorn', 'tide'],
};
const ICON_FILE: Record<keyof typeof ICONS, string> = { art: 'icons-arts', upgrade: 'icons-upgrades', element: 'icons-elements' };
export const icon = (kind: keyof typeof ICONS, id: string) => { const i = ICONS[kind].indexOf(id); return i < 0 ? undefined : IMG[`${ICON_FILE[kind]}-${i + 1}`]; };
