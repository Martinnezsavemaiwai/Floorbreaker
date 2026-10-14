// Not part of npm run check (slow): a bot plays whole runs in the real page through real keyboard events,
// with the game clock fast-forwarded. Every overlay a player meets (story, level-up picker, shop, portal,
// ending, result) is handled through the UI. Run with
//   npx playwright test --config e2e/capture.config.ts e2e/playthrough.bot.ts
import { test, expect, type Page } from '@playwright/test';

// The bot runs inside the page. It is the tests/harness.ts bot, but it only acts through key events.
const BOT = `(() => {
  const s = window.__saoy, log = [], seen = new Set();
  const key = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true }));
  const tap = code => { key(code, true); key(code, false); };
  const held = {};
  const hold = (code, on) => { if (!!held[code] !== on) { held[code] = on; key(code, on); } };
  const visible = id => document.getElementById(id).classList.contains('on');
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  let floor = -1, last = { x: 0, y: 0 }, stuck = 0, detour = 0, side = 1, dx = 0, dy = 0, tries = 0, free = 0, frames = 0;
  const walkTo = (tx, ty) => {
    const P = s.P;
    if (detour > 0) { detour--; [tx, ty] = [P.x + dx, P.y + dy]; } // fixed straight sidestep, alternating sides and growing per try (see tests/harness.ts)
    else if (Math.hypot(P.x - last.x, P.y - last.y) < 0.5 && Math.hypot(tx - P.x, ty - P.y) > 30) { free = 0; if (++stuck > 60) { stuck = 0; detour = 40 * ++tries; side = -side; [dx, dy] = [-(ty - P.y) * side, (tx - P.x) * side]; } }
    else { stuck = 0; if (++free > 300) tries = 0; }
    last = { x: P.x, y: P.y };
    hold('KeyD', tx > P.x + 5); hold('KeyA', tx < P.x - 5); hold('KeyS', ty > P.y + 5); hold('KeyW', ty < P.y - 5);
  };
  const stop = () => ['KeyW', 'KeyA', 'KeyS', 'KeyD'].forEach(k => hold(k, false));
  const away = (f, k = 5) => walkTo(s.P.x + (s.P.x - f.x) * k + 1, s.P.y + (s.P.y - f.y) * k + 1);
  const aim = e => { s.mouse.x = e.x - s.cam.x; s.mouse.y = e.y - s.cam.y; };
  const note = m => { if (!seen.has(m)) { seen.add(m); log.push((s.run?.time ?? 0).toFixed(0) + 's ' + m); } };

  function overlays() { // the UI a player has to click through; returns true while one is open
    if (document.querySelector('dialog[open]')) { note('confirm dialog'); tap('Escape'); return true; }
    if (visible('story')) { note('story ' + document.getElementById('story-who').textContent); tap('Enter'); return true; }
    if (visible('upgrade')) { note('picker'); tap(document.getElementById('upgrade-cards').children.length < 3 ? 'Digit1' : 'Digit' + (1 + (frames % 3))); return true; }
    if (visible('shop')) { note('shop'); tap('Digit1'); tap('Digit2'); tap('Escape'); return true; }
    if (visible('shrine')) { note('shrine (unexpected)'); tap('Escape'); return true; }
    if (visible('pause')) { note('paused (unexpected)'); tap('Escape'); return true; }
    return false;
  }
  const useArts = tg => { // fire each Art by what it is for (see tests/harness.ts)
    const P = s.P, d = dist(P, tg);
    const winding = s.mobs.some(m => m.hp > 0 && m.wind > 0 && dist(P, m) < 120) || (tg === s.boss && ['slam', 'charge', 'leap'].includes(s.boss.act) && d < 150 && s.boss.t < 0.5);
    [['KeyK', 0], ['KeyL', 1], ['KeyI', 2]].forEach(([code, i]) => {
      const id = P.skills[i];
      if (!id || P.skillCd[i] > 0) return;
      if (id === 'riposte' ? winding : id === 'crescent' ? d < 360 : id === 'shade' ? d < 220 : d < tg.r + 50) tap(code);
    });
  };
  const fight = tg => { // the nearest live mob: step out of its telegraph, otherwise close in and swing
    const P = s.P; aim(tg); useArts(tg);
    if (tg.wind > 0 && tg.wind < 0.2) { away(tg, 3); if (dist(P, tg) < 80) tap('Space'); return; }
    walkTo(tg.x, tg.y);
    if (dist(P, tg) < tg.r + 50) tap('KeyJ');
  };
  const arena = () => { // arena rules for the boss fight (see tests/harness.ts); true when it took over movement this frame
    const P = s.P, A = s.arena, boss = s.boss, AR = s.ARENA;
    if (!A) return false;
    if (boss.stun > 0) [['KeyK', 0], ['KeyL', 1], ['KeyI', 2]].forEach(([code, i]) => { if (P.skills[i] && P.skillCd[i] <= 0) tap(code); });
    const rock = A.rocks.find(r => dist(P, r) < AR.rockfall.radius + P.r + 10);
    if (rock) { away(rock); return true; }
    const f = A.flood;
    if (f && (f.warn > 0 || f.on > 0)) {
      const pl = AR.flood.platforms.map(([x, y]) => ({ x, y })).sort((a, b) => dist(P, a) - dist(P, b))[0];
      walkTo(pl.x, pl.y); if (dist(P, boss) < boss.r + 50) tap('KeyJ'); return true;
    }
    const sprout = A.id === 'fog' && s.mobs.filter(m => m.sprout && m.hp > 0 && dist(P, m) < 300).sort((a, b) => dist(P, a) - dist(P, b))[0];
    if (sprout) { fight(sprout); return true; }
    return false;
  };
  function think() { // same decision order as the tests/harness.ts bot
    frames++;
    if (overlays()) { stop(); return; }
    const P = s.P, boss = s.boss, mobs = s.mobs, L = s.L;
    if (!P || s.state !== 'play') return;
    if (s.floorIdx !== floor) { floor = s.floorIdx; note('reached floor ' + (s.floorIdx + 1) + ' (' + s.L.kind + ')'); }
    if (P.hp < P.maxHp * 0.35 && P.potions > 0) { tap('KeyQ'); note('drank potion'); }
    if (s.portal) return s.portal.armed ? walkTo(s.portal.x, s.portal.y) : away(s.portal);
    // town: walk to the merchant and press E (the shop overlay above does the buying)
    if (L.kind === 'town' && L.merchant && P.col >= 40 && P.potions < 3) {
      if (dist(P, L.merchant) > 40) return walkTo(L.merchant.x, L.merchant.y + 30);
      stop(); tap('KeyE'); return;
    }
    const R = s.room;
    if (R && R.type === 'spring' && !R.healed && L.fountain) return walkTo(L.fountain.x, L.fountain.y + 70); // drink first
    if (R && R.type === 'shop' && L.merchant && P.col >= 40 && P.potions < 3) { // the shop overlay above does the buying
      if (dist(P, L.merchant) > 40) return walkTo(L.merchant.x, L.merchant.y + 30);
      stop(); tap('KeyE'); return;
    }
    // shrines: walk past
    if (s.doors.length) { const d = s.doors.find(x => x.armed) || s.doors[0]; return walkTo(d.x + d.w / 2, d.y + d.h / 2); }
    if (L.kind === 'room') {
      const tg = mobs.filter(m => m.hp > 0).sort((a, b) => dist(P, a) - dist(P, b))[0];
      return tg ? fight(tg) : walkTo(L.w / 2, L.h / 2);
    }
    if (L.kind !== 'boss') return;
    if (P.x < L.roomX + 80) return walkTo(L.roomX + 100, L.h / 2);
    const adds = mobs.filter(m => m.hp > 0 && m.summoned).sort((a, b) => dist(P, a) - dist(P, b))[0];
    const act = boss.act; aim(boss); useArts(boss);
    const spot = act === 'roots' && boss.spots && boss.spots.find(p => dist(p, P) < 100);
    if (arena()) return;
    if (spot) { away(spot); if (boss.t < 0.3) tap('Space'); }
    else if (act === 'slam' && dist(P, boss) < 170) { away(boss); if (boss.t < 0.3) tap('Space'); }
    else if (act === 'leap' && dist(P, boss.to) < 140) away(boss.to);
    else if (act === 'volley' && dist(P, boss) < 260) away(boss);
    else if (act === 'charge') walkTo(P.x, P.y + (Math.sin(boss.ang) > 0 ? -200 : 200));
    else if (adds && dist(P, adds) < 120) { aim(adds); walkTo(adds.x, adds.y); tap('KeyJ'); }
    else { walkTo(boss.x, boss.y); if (dist(P, boss) < boss.r + 50) tap('KeyJ'); }
  }
  function invariants() {
    const P = s.P; if (!P) return;
    for (const e of [P, ...(s.boss.hp > 0 ? [s.boss] : []), ...s.mobs.filter(m => m.hp > 0)]) {
      if (![e.x, e.y].every(Number.isFinite)) note('BUG non-finite position');
      if (e !== s.boss && s.hitWall(e)) note('BUG entity inside a wall');
    }
    if (!(P.hp <= P.maxHp)) note('BUG hp above max');
    if (P.col < 0 || P.potions < 0) note('BUG negative gold/potions');
  }
  window.__bot = { log, done: false, frames: () => frames };
  const timer = setInterval(() => {
    for (let i = 0; i < 30 && !window.__bot.done; i++) {
      think(); s.tick(1 / 60); invariants();
      if (s.run?.over) { stop(); note('run over: ' + s.run.over + ' on floor ' + (s.floorIdx + 1) + ' at Lv.' + s.P.lv); note('build: ' + JSON.stringify(s.P.skills) + ' mods ' + JSON.stringify(s.P.mods) + ' evolved ' + JSON.stringify(s.P.evolved)); window.__bot.done = true; clearInterval(timer); }
    }
  }, 16);
})()`;

async function playOnce(page: Page, lang: 'th' | 'en') {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/');
  await page.evaluate(l => { localStorage.clear(); localStorage.setItem('saoy.settings', JSON.stringify({ v: 1, savedAt: '', data: { lang: l, aim: 'mouse' } })); }, lang);
  await page.reload();
  await page.locator('#start-btn').click();
  await page.locator('#name-input').press('Enter'); // keep the offered name
  await expect.poll(() => page.evaluate(() => (window as any).__saoy.state), { timeout: 10_000 }).not.toBe('intro');
  await page.evaluate(BOT);
  await expect.poll(() => page.evaluate(() => (window as any).__bot.done), { timeout: 1_200_000, intervals: [2000] }).toBe(true);
  // the run's end must hand over to the result screen (after the ending story on a clear)
  for (let i = 0; i < 20 && !(await page.locator('#result').isVisible()); i++) {
    if (await page.locator('#story').isVisible()) await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
  }
  await expect(page.locator('#result')).toBeVisible();
  const log = await page.evaluate(() => (window as any).__bot.log);
  console.log(`--- ${lang} run ---\n` + log.join('\n') + `\nresult: ${await page.locator('#result-title').textContent()} | ${await page.locator('#result-msg').textContent()}\nerrors: ${JSON.stringify(errors)}`);
  await page.locator('#result [data-act=home]').click();
  await expect(page.locator('#title-screen')).toBeVisible();
  return { log, errors };
}

test.describe.configure({ timeout: 1_500_000 });
for (const lang of ['th', 'en'] as const) {
  test(`bot plays a full run (${lang})`, async ({ page }) => {
    const { log, errors } = await playOnce(page, lang);
    expect(errors).toEqual([]);
    expect(log.filter((l: string) => l.includes('BUG') || l.includes('unexpected'))).toEqual([]);
  });
}
