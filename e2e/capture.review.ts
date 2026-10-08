// Not a test: captures the menus for design review into .impeccable/review/. Run with
//   npx playwright test --config e2e/capture.config.ts
import { test } from '@playwright/test';

const out = (n: string) => `.impeccable/review/${n}.png`;
const hook = (page: any, fn: string) => page.evaluate(`(s => (${fn}))(window.__saoy)`);

async function seed(page: any, lang: 'th' | 'en') {
  await page.goto('/');
  await page.evaluate((lang: string) => {
    localStorage.clear();
    const env = (data: unknown) => JSON.stringify({ v: 1, savedAt: '', data });
    localStorage.setItem('saoy.settings', env({ lang }));
    localStorage.setItem('saoy.meta', env({ best: { floor: 2, lv: 9, time: 640, kills: 120, cleared: false }, shards: 34, storySeen: [] }));
  }, lang);
  await page.reload();
  await page.waitForTimeout(800);
}

test('desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await seed(page, 'en');
  await page.screenshot({ path: out('desktop') });
  await seed(page, 'th');
  await page.screenshot({ path: out('desktop-th') });
  await page.locator('#title-screen [data-act=skills]').click(); await page.waitForTimeout(400);
  await page.screenshot({ path: out('desktop-skills') });
  await page.keyboard.press('Escape');
  await page.locator('#start-btn').click();
  await page.locator('#story').waitFor({ state: 'visible', timeout: 10_000 }); await page.waitForTimeout(300);
  await page.screenshot({ path: out('desktop-story') });
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await hook(page, 's.P.pendingUpgrades = 1');
  await page.locator('#upgrade').waitFor({ state: 'visible' }); await page.waitForTimeout(300);
  await page.screenshot({ path: out('desktop-levelup') });
  await page.keyboard.press('Digit1'); await page.waitForTimeout(200);
  while (await page.locator('#upgrade').isVisible()) { await page.keyboard.press('Digit1'); await page.waitForTimeout(200); }
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  await page.screenshot({ path: out('desktop-pause') });
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  await hook(page, 's.P.inv = 0, s.hurtPlayer(9999)');
  await page.locator('#result').waitFor({ state: 'visible' }); await page.waitForTimeout(500);
  await page.screenshot({ path: out('desktop-dead') });
});

test('mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page, 'th');
  await page.screenshot({ path: out('mobile') });
});
