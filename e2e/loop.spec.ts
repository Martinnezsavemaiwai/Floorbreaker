// Full-loop tests in the real page: every screen a run passes through, in order, with no console errors.
// Fights are shortened through the dev-only __saoy hook (bosses take one lethal hit); everything else is real input.
import { test, expect, type Page } from '@playwright/test';

const hook = (page: Page, fn: string) => page.evaluate(`(s => (${fn}))(window.__saoy)`);
const state = (page: Page) => hook(page, 's.state') as Promise<string>;

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  return errors;
}

// Close whatever sits on top of play (story beats, level-up pickers) until a live character is in control
async function settle(page: Page) {
  for (let i = 0; i < 40; i++) {
    if (await page.locator('#story').isVisible()) await page.keyboard.press('Escape');
    else if (await page.locator('#upgrade').isVisible()) await page.keyboard.press('Digit1');
    else if (await state(page) === 'play') return;
    await page.waitForTimeout(150);
  }
  throw new Error('never got back into play, state: ' + await state(page));
}

// Poll a hook expression while keeping play unblocked (a level-up picker can pop up a step after settle)
async function until(page: Page, expr: string, timeout = 10_000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await hook(page, expr)) return;
    if (await page.locator('#upgrade').isVisible()) await page.keyboard.press('Digit1');
    await page.waitForTimeout(100);
  }
  throw new Error(`timed out waiting for ${expr}; state: ${await state(page)}`);
}

// Finish whatever floor we're on: towns and cleared rooms -> first door, rooms -> kill each wave, boss -> kill + portal
async function finishFloor(page: Page) {
  const from = await hook(page, 's.floorIdx') as number;
  await settle(page);
  const kind = await hook(page, 's.L.kind');
  if (kind === 'boss') {
    await hook(page, 's.P.x = s.boss.x - 160, s.P.y = s.boss.y, s.boss.awake = true, s.hurtEnemy(s.boss, s.boss.hp + 1, true)');
    if (from === 19) return;
    await until(page, '!!s.portal');
    await hook(page, 's.P.x = s.portal.x - 120, s.P.y = s.portal.y');
    await until(page, 's.portal.armed && s.portal.wait <= 0');
    await hook(page, 's.P.x = s.portal.x, s.P.y = s.portal.y');
  } else {
    if (kind === 'room') {
      await hook(page, 's.room.challenge && (s.room.challenge.left = 0.1)'); // fast-forward the 30 s challenge timer
      await until(page, '(s.mobs.forEach(m => m.hp > 0 && s.hurtEnemy(m, m.hp + 1, true)), s.doors.length > 0)', 30_000);
    }
    await until(page, 's.doors[0]?.armed'); // a door only works once you have been outside it
    await hook(page, 's.P.x = s.doors[0].x + 30, s.P.y = s.doors[0].y + 55');
  }
  await until(page, `s.floorIdx === ${from + 1}`);
}

async function diveIn(page: Page) {
  await page.locator('[data-act=start]:visible').click();
  await expect.poll(() => state(page), { timeout: 10_000 }).not.toBe('intro');
  await settle(page);
}

test('clear loop: title -> 20 floors (towns, rooms, doors, bosses, portals) -> ending -> result -> title', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = watchErrors(page);
  await page.goto('/');
  await expect(page.locator('#title-screen')).toBeVisible();
  await diveIn(page);

  // Floor 1 town: walk to the merchant, open the shop, buy a potion, leave
  await hook(page, 's.P.col = 999, s.P.x = s.L.merchant.x, s.P.y = s.L.merchant.y + 30');
  await page.keyboard.press('KeyE');
  await expect(page.locator('#shop')).toBeVisible();
  await page.keyboard.press('Digit1');
  await page.keyboard.press('Escape');
  await expect(page.locator('#shop')).toBeHidden();
  await settle(page);
  expect(await hook(page, 's.P.potions')).toBeGreaterThan(0);

  for (let f = 0; f < 20; f++) {
    await finishFloor(page);
    if (f === 4) expect(await hook(page, 's.P.evolved.length')).toBeGreaterThan(0); // first boss shard evolves an Art
  }

  // last boss down: ending story, then the clear result
  await expect.poll(() => state(page)).toBe('win');
  await expect(page.locator('#story')).toBeVisible({ timeout: 5_000 });
  while (await page.locator('#story').isVisible()) { await page.keyboard.press('Enter'); await page.waitForTimeout(100); }
  await expect(page.locator('#result')).toBeVisible();
  await expect(page.locator('#result')).toHaveClass(/clear/);
  await expect(page.locator('#result-shards')).not.toBeEmpty();

  // back to the title: the record shows, there is nothing to continue
  await page.locator('#result [data-act=home]').click();
  await expect(page.locator('#title-screen')).toBeVisible();
  await expect(page.locator('#record')).not.toBeEmpty();
  await expect(page.locator('#continue-btn')).toBeHidden();
  expect(errors).toEqual([]);
});

test('death loop: die -> result -> new character -> play again', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await diveIn(page);
  await hook(page, 's.P.inv = 0, s.P.dash = 0, s.P.roll = 0, s.hurtPlayer(9999)');
  await expect(page.locator('#result')).toBeVisible({ timeout: 5_000 });
  await expect(page.locator('#result')).toHaveClass(/dead/);
  await page.locator('#result [data-act=start]').click();
  await expect.poll(() => state(page), { timeout: 10_000 }).not.toBe('intro');
  await settle(page);
  expect(await hook(page, 's.floorIdx')).toBe(0);
  expect(await hook(page, 's.P.lv')).toBe(1);
  expect(errors).toEqual([]);
});

test('suspend loop: pause -> save and quit -> continue keeps the run', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await diveIn(page);
  // town -> room 1 -> room 2 so there is progress worth keeping
  await finishFloor(page); await finishFloor(page);
  await settle(page);
  const lv = await hook(page, 's.P.lv');

  await page.keyboard.press('Escape');
  await expect(page.locator('#pause')).toBeVisible();
  await page.locator('#pause [data-act=saveQuit]').click();
  await expect(page.locator('#title-screen')).toBeVisible();
  await expect(page.locator('#continue-btn')).toBeVisible();

  await page.locator('#continue-btn').click();
  await expect.poll(() => state(page), { timeout: 10_000 }).not.toBe('intro');
  await settle(page);
  expect(await hook(page, 's.floorIdx')).toBe(2);
  expect(await hook(page, 's.P.lv')).toBe(lv);
  // the slot was consumed: back on the title there is nothing to continue until the next quit
  expect(await page.evaluate(() => Object.keys(localStorage).some(k => /suspend/i.test(k) && localStorage.getItem(k)))).toBe(false);
  expect(errors).toEqual([]);
});

test('language switch: EN/TH swaps the menus live and is remembered', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await page.locator('[data-lang=th]').click();
  await expect(page.locator('#start-btn small')).toHaveText('ตัวละครใหม่ ตายครั้งเดียวจบ');
  await page.locator('[data-lang=en]').click();
  await expect(page.locator('#start-btn small')).toHaveText('New character. One life.');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.reload();
  await expect(page.locator('[data-lang=en]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#title-screen [data-act=settings] .pane-title')).toHaveText('Settings');
  expect(errors).toEqual([]);
});

test('language switch from the pause menu re-renders the pause stats', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await page.locator('[data-lang=th]').click();
  await diveIn(page);
  await page.keyboard.press('Escape');
  await expect(page.locator('#pause-stats')).toContainText('เลเวล');
  await page.locator('#pause [data-act=settings]').click();
  await page.locator('#s-lang').selectOption('en');
  await page.keyboard.press('Escape');
  await expect(page.locator('#pause')).toBeVisible();
  await expect(page.locator('#pause-stats')).toContainText('Level');
  expect(errors).toEqual([]);
});

test('an elite room awards a new Blade Art through the picker', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await diveIn(page);
  await hook(page, "s.loadFloor(2, { type: 'elite', reward: null })");
  await settle(page);
  await until(page, '(s.mobs.forEach(m => m.hp > 0 && s.hurtEnemy(m, m.hp + 1, true)), s.rewards.length > 0 || s.P.skills[1] !== null)', 30_000);
  await expect(page.locator('#upgrade')).toBeVisible({ timeout: 5_000 });
  await page.keyboard.press('Digit1');
  await expect.poll(() => hook(page, 's.P.skills[1]')).not.toBeNull();
  expect(errors).toEqual([]);
});

test('a shrine offer goes through the window and the picker', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await diveIn(page);
  await hook(page, "s.loadFloor(2, { type: 'shrine', reward: null })");
  await settle(page);
  await hook(page, 's.P.skills[1] = "vorpal", s.P.col = 999, s.room.offers = ["gold", "curse"], s.P.x = 600, s.P.y = 450');
  await page.keyboard.press('KeyE');
  await expect(page.locator('#shrine')).toBeVisible();
  await page.keyboard.press('Digit1');
  await expect(page.locator('#upgrade')).toBeVisible({ timeout: 5_000 }); // evolve pick
  await page.keyboard.press('Digit1');
  await expect.poll(() => hook(page, 's.P.evolved.length')).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('the new Arts fire in the real page: Crescent Wave, Riposte and Shade Step', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await diveIn(page);
  await hook(page, "s.loadFloor(2, { type: 'battle', reward: 'gold' })");
  await settle(page);
  for (const id of ['crescent', 'riposte', 'shade']) {
    await until(page, 's.P.parry <= 0 && s.P.delay <= 0'); // a stance or recovery would only buffer the next press
    await hook(page, `(s.P.skills[1] = '${id}', s.P.skillCd[1] = 0)`);
    let x0 = 0;
    if (id === 'shade') { // a live mob 150 px dead ahead, so the teleport path runs (the no-target dash only moves 120)
      await until(page, 's.mobs.some(m => m.hp > 0)');
      x0 = await hook(page, '(s.P.ang = 0, s.mobs.find(m => m.hp > 0).x = s.P.x + 150, s.mobs.find(m => m.hp > 0).y = s.P.y, s.P.x)') as number;
    }
    await page.keyboard.press('KeyL');
    await expect.poll(() => hook(page, 's.P.skillCd[1]')).toBeGreaterThan(0);
    if (id === 'crescent') await expect.poll(() => hook(page, 's.waves.length')).toBeGreaterThan(0);
    if (id === 'riposte') await expect.poll(() => hook(page, 's.P.parry')).toBeGreaterThan(0);
    if (id === 'shade') await expect.poll(async () => (await hook(page, 's.P.x') as number) - x0).toBeGreaterThan(170);
  }
  expect(errors).toEqual([]);
});

test('a boss wakes with an intro card and falls with a defeat card', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await diveIn(page);
  await hook(page, 's.loadFloor(4)');
  await settle(page);
  await hook(page, 's.P.x = s.L.roomX + 120, s.P.y = s.L.h / 2');
  await expect(page.locator('#boss-card')).toHaveClass(/on/, { timeout: 3_000 });
  await expect(page.locator('#boss-card')).toBeVisible();
  await expect(page.locator('#boss-card-name')).toContainText('Grask');
  await hook(page, 's.hurtEnemy(s.boss, s.boss.hp + 1, true)');
  await expect(page.locator('#boss-card')).toHaveClass(/down/, { timeout: 3_000 });
  await page.waitForTimeout(300);                       // a stale animationcancel would strip the class by now
  await expect(page.locator('#boss-card')).toHaveClass(/down/);
  await expect(page.locator('#boss-card')).toBeVisible();
  expect(errors).toEqual([]);
});
