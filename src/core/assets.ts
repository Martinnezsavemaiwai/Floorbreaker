// Sprites (Ninja Adventure, CC0, pixel-boy).
// Character sheets: 16x16 frames, columns = down/up/left/right, rows 0-3 walk, row 4 attack.
export const IMG: Record<string, HTMLImageElement | HTMLCanvasElement> = {};

// 'source-in' = flat silhouette, 'multiply' = recolor keeping the pixel shading
export function tinted(img: HTMLImageElement, mode: GlobalCompositeOperation, col: string) {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d')!;
  g.drawImage(img, 0, 0); g.globalCompositeOperation = mode; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'destination-in'; g.drawImage(img, 0, 0);
  return c;
}
const TINTS: Record<string, Record<string, string>> = {
  taurus: { taurusT: '#d09a70', slingerT: '#a8c878', merchantT: '#f0c860', guardT: '#8a96a8', tideGuardT: '#6aa0c8' }, village: { treeRage: '#ff7050' }, player: { javelinT: '#e07050', wraithT: '#60e0d0' }, boar: { tidalBoar: '#80c8ff', shadowPig: '#9a80c8' },
  boss: { boss1: '#ff4a3a', boss1Rage: '#ff9a30', boss2: '#b070ff', boss2Rage: '#ff50b0', elfT: '#8a78c0', mageT: '#50c8c0', knightT: '#6a6a90', boss4: '#80e0ff', boss4Rage: '#a0a0ff' },
};
const loadImg = (n: string) => { const i = new Image(); i.src = `assets/${n}.png`; return i.decode().then(() => i); };
export const ready = Promise.all(['player', 'boar', 'taurus', 'boss', 'shadow', 'sword', 'floor', 'interior', 'village', 'fog'].map(n => loadImg(n).then(img => {
  IMG[n] = img; IMG[n + 'White'] = tinted(img, 'source-in', '#fff');
  for (const [k, col] of Object.entries(TINTS[n] || {})) IMG[k] = tinted(img, 'multiply', col);
})));
