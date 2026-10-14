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
// art the game can do without (ChatGPT drafts in progress): a missing file just leaves IMG[name] unset
const OPTIONAL = ['door', 'door-boss'];
const optional = Promise.all(OPTIONAL.map(n => loadImg(n).then(img => { IMG[n] = img; }, () => {})));
export const ready = Promise.all([optional, ...[...SPRITES, ...SCENERY, 'sword', 'fog'].map(n => loadImg(n).then(img => {
  IMG[n] = img; IMG[n + 'White'] = tinted(img, 'source-in', '#fff');
  for (const [k, col] of Object.entries(TINTS[n] || {})) IMG[k] = tinted(img, 'multiply', col);
}))]);
