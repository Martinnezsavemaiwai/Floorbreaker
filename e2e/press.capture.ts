// Not a test: captures itch.io page media into press/ (gitignored; page.screenshot creates the folders). Run with
//   npx playwright test --config e2e/capture.config.ts e2e/press.capture.ts
// then: node scripts/press-video.mjs   (stitches the clip frames into press/trailer.mp4 and press/gameplay.gif)
//
// Screens: real scenes staged through the dev handle, captured at the itch embed size (960x640, 1:1 with the canvas).
// Clip: the page clock is faked, so each frame advances exactly 1/30 s of game time (the bot plays at normal speed)
// and the frames come out smooth however slow the capture is.
import { test, type Page } from '@playwright/test';
import { BOT } from './playthrough.bot.ts';

const SCREENS = 'press/screens', FRAMES = 'press/frames';
const hook = (page: Page, fn: string) => page.evaluate(`(async s => { ${fn} })(window.__saoy)`);
// the bot without its fast-forward: one decision per 16 ms of (fake) time, and the game's own loop runs the clock
const LIVE_BOT = BOT.replace('for (let i = 0; i < 30 &&', 'for (let i = 0; i < 1 &&').replace('think(); s.tick(1 / 60); invariants();', 'think();');

async function boot(page: Page, lang: 'en' | 'th', best = { floor: 12, lv: 11, time: 1720, kills: 340, cleared: false }, flash = true) {
  await page.goto('/');
  await page.evaluate(([l, b, f]) => {
    localStorage.clear();
    const env = (data: unknown) => JSON.stringify({ v: 3, savedAt: '', data }); // SAVE_VERSION in src/core/save.ts (v1 would migrate the best run to an "old version" record)
    localStorage.setItem('saoy.settings', env({ lang: l, aim: 'mouse', hints: false, flash: f }));
    localStorage.setItem('saoy.meta', env({ best: b, shards: 60, storySeen: ['intro', 'floor1', 'floor2', 'floor3', 'floor4'] }));
  }, [lang, best, flash] as const);
  await page.reload();
  await page.evaluate(() => (window as any).__saoy.ready);
  await page.evaluate(() => document.fonts.ready);
}
// a fresh run with a build that has seen a few floors: three Arts with mods, some upgrades, a little Gold
const startRun = (page: Page, floor: number, lv = 9) => hook(page, `
  s.newGame(); s.loadFloor(${floor});
  const { gainXp } = await import('/src/systems/combat.js');
  const { cardsFor, applyCard, nextPick } = await import('/src/systems/build.js');
  const { PLAYER } = await import('/src/data/player.ts');
  while (s.P.lv < ${lv}) gainXp(PLAYER.xpToNext(s.P.lv) - s.P.xp);
  for (let k = nextPick(); k; k = nextPick()) { let c = cardsFor(k), f; while ((f = applyCard(c[0], k))) c = f; }
  s.P.col = 260; s.P.potions = 2; s.P.hp = s.P.maxHp; s.run.name = 'Rin';
  for (let i = 0; i < 20; i++) { document.querySelectorAll('[data-act=resume],[data-act=storySkip]').forEach(b => b.offsetParent && b.click()); s.tick(0.05); }
`);
const keepAlive = (page: Page) => hook(page, 's.P.hp = Math.max(s.P.hp, s.P.maxHp * .55); s.P.potions = 2;'); // staged shots, not a balance test
// run the clock in small steps until the scene reads well (no hit flash mid-frame, the hazard on screen), or give up
async function until(page: Page, cond: string, maxMs = 6000) {
  for (let t = 0; t < maxMs; t += 50) {
    if (await page.evaluate(`(s => !!(${cond}))(window.__saoy)`)) return;
    await keepAlive(page); await page.clock.runFor(50);
  }
}
const calm = 's.P.hurt <= 0 && s.mobs.every(m => !(m.hurt > 0))'; // nobody mid-flash
const hideBanners = (page: Page) => page.addStyleTag({ content: '#toast,#boss-card,#moment{visibility:hidden !important}' });

test.describe.configure({ timeout: 900_000 });

test('screens', async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 640 });
  const shot = (n: string) => page.screenshot({ path: `${SCREENS}/${n}.png` });
  for (const lang of ['en', 'th'] as const) {
    await boot(page, lang); await page.waitForTimeout(600);
    await shot(`01-title-${lang}`);
  }
  await boot(page, 'en', undefined, false); // screenshots: no white hit flash
  await page.clock.install();
  await page.reload(); await page.evaluate(() => (window as any).__saoy.ready); await page.evaluate(() => document.fonts.ready);
  await hideBanners(page);
  await page.evaluate(LIVE_BOT);
  const play = async (ms: number) => { for (let t = 0; t < ms; t += 250) { await keepAlive(page); await page.clock.runFor(250); } };

  await startRun(page, 0, 4); await play(1500); await shot('02-town-firstlight');
  await startRun(page, 6, 7); await play(1800); await until(page, `s.mobs.filter(m => m.hp > 0).length >= 3 && s.mobs.some(m => m.hp > 0 && Math.hypot(m.x - s.P.x, m.y - s.P.y) < 160) && ${calm}`); await shot('03-fight-hornfield');
  await startRun(page, 14, 11); await hook(page, 's.P.x = s.L.roomX + 120;'); await play(5000); await until(page, `s.boss.act && !(s.boss.hurt > 0) && ${calm}`); await shot('04-boss-elderroot');
  await startRun(page, 19, 13); await hook(page, 's.P.x = s.L.roomX + 120;'); await play(4000); await until(page, `s.arena && s.arena.flood && s.arena.flood.on > 0 && !(s.boss.hurt > 0) && ${calm}`, 20000); await shot('05-boss-marisca-flood');
  await startRun(page, 10, 8); await play(1200); await shot('06-town-mistwell');
  // the level-up picker over a fight, and the town shop
  await startRun(page, 2, 5); await play(2500);
  await hook(page, 'window.__bot.done = true; s.P.pendingUpgrades = 1;'); await page.clock.runFor(400); await shot('07-levelup'); // the bot would take the card at once
  await page.keyboard.press('Digit1'); await page.clock.runFor(300);
  await startRun(page, 5, 6);
  await hook(page, 'window.__bot.done = true; const m = s.L.merchant; s.P.x = m.x; s.P.y = m.y + 30;');
  await page.clock.runFor(200); await page.keyboard.press('KeyE'); await page.clock.runFor(500); await shot('08-shop');
});

// the cover: the title key art and wordmark with the menu hidden (cropped to 630x500 by scripts/press-video.mjs)
test('cover source', async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 640 });
  await boot(page, 'en');
  await page.addStyleTag({ content: '#title-screen > *{visibility:hidden !important}' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'press/cover-source.png' });
});

test('clip frames', async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 640 });
  await boot(page, 'en', { floor: 1, lv: 1, time: 0, kills: 0, cleared: false });
  await page.clock.install();
  await page.reload(); await page.evaluate(() => (window as any).__saoy.ready); await page.evaluate(() => document.fonts.ready);
  let n = 0;
  const frame = async () => { await page.clock.runFor(1000 / 30); await page.screenshot({ path: `${FRAMES}/${String(n++).padStart(5, '0')}.png` }); };
  const record = async (seconds: number, alive = true) => { for (let i = 0; i < seconds * 30; i++) { if (alive && i % 8 === 0) await keepAlive(page); await frame(); } };
  // 1. title, then Dive In: the name window, the dive
  await record(2.5, false);
  await page.locator('#start-btn').click(); await record(0.8, false);
  await page.locator('#name-input').press('Enter'); await record(2.5, false);
  await page.evaluate(LIVE_BOT);
  // 2-5. a town, a room fight, two bosses (each a fresh staged run)
  for (const [floor, lv, secs, boss] of [[0, 3, 4, false], [6, 7, 8, false], [9, 10, 8, true], [19, 13, 9, true]] as const) {
    await startRun(page, floor, lv);
    if (boss) await hook(page, 's.P.x = s.L.roomX + 120;');
    await record(secs);
  }
  // 6. the level-up picker
  await hook(page, 'window.__bot.done = true; s.P.pendingUpgrades = 1;'); await record(1.6);
  console.log(`frames: ${n}`);
});
