// Sprites (Ninja Adventure, CC0, pixel-boy).
// Characters and mobs are our own art (art-src/ -> scripts/import_art.py). Character sheets: 4 columns
// (down/up/left/right) x 7 rows (0-3 walk, 4 attack) of square cells sized so each draws 1:1.
// Beasts: 2 side-view frames facing left. The terrain and the treant (village.png) are still from the pack.
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
  village: { treeRage: '#ff7050' }, boss1: { boss1Rage: '#ffb070' }, boss2: { boss2Rage: '#ff8a8a' }, boss4: { boss4Rage: '#c0a0ff' },
};
const SPRITES = ['player', 'merchant', 'slinger', 'taurus', 'javelin', 'guardian', 'elf', 'mage', 'knight', 'wraith', 'tideguard',
  'boss1', 'boss2', 'boss4', 'boar', 'piglet', 'shadowpig', 'tidalboar', 'crab'];
const loadImg = (n: string) => { const i = new Image(); i.src = `assets/${n}.png`; return i.decode().then(() => i); };
export const ready = Promise.all([...SPRITES, 'sword', 'floor', 'interior', 'village', 'fog'].map(n => loadImg(n).then(img => {
  IMG[n] = img; IMG[n + 'White'] = tinted(img, 'source-in', '#fff');
  for (const [k, col] of Object.entries(TINTS[n] || {})) IMG[k] = tinted(img, 'multiply', col);
})));
