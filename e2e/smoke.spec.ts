// Smoke test: the real page boots, Dive In reaches gameplay, the prologue pages and skips, input works, pause opens, no errors.
// Not a pixel comparison (canvas output varies by GPU) — it checks state through the dev-only __saoy hook.
import { test, expect } from '@playwright/test';

test('title -> Dive In -> story -> play -> pause, with no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto('/');
  await expect(page.locator('#title-screen')).toBeVisible();
  await page.locator('#start-btn').click();
  await page.locator('#name-input').press('Enter'); // keep the offered name

  // the intro (the title glass shatters) runs ~2s, then the play scene takes over
  // a fresh save opens the floor 1 prologue: Enter turns the page, Esc skips the rest
  await expect(page.locator('#story')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('#story-page')).toHaveText(/^1 \//);
  await page.keyboard.press('Enter');
  await expect(page.locator('#story-page')).toHaveText(/^2 \//);
  await page.keyboard.press('Escape');
  await expect(page.locator('#story')).toBeHidden();
  await page.waitForFunction(() => (window as any).__saoy?.state === 'play');

  // the canvas actually draws the world (not a blank/black frame)
  const lit = await page.evaluate(() => {
    const c = document.getElementById('c') as HTMLCanvasElement;
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    let bright = 0;
    for (let i = 0; i < d.length; i += 4 * 97) if (d[i] + d[i + 1] + d[i + 2] > 150) bright++;
    return bright;
  });
  expect(lit).toBeGreaterThan(100);

  // holding D walks the player right
  const x0 = await page.evaluate(() => (window as any).__saoy.P.x);
  await page.keyboard.down('KeyD'); await page.waitForTimeout(400); await page.keyboard.up('KeyD');
  expect(await page.evaluate(() => (window as any).__saoy.P.x)).toBeGreaterThan(x0 + 40);

  // J swings the sword (attack cooldown starts)
  await page.keyboard.press('KeyJ');
  expect(await page.evaluate(() => (window as any).__saoy.P.atkCd)).toBeGreaterThan(0);

  // Esc pauses and shows the menu; Esc again resumes
  await page.keyboard.press('Escape');
  await expect(page.locator('#pause')).toBeVisible();
  expect(await page.evaluate(() => (window as any).__saoy.state)).toBe('paused');
  await page.keyboard.press('Escape');
  await expect(page.locator('#pause')).toBeHidden();

  expect(errors).toEqual([]);
});
