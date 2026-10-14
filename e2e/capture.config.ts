// Slow, manual runs only (not part of npm run check): design-review captures and the bot playthrough
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.', testMatch: ['capture.review.ts', 'playthrough.bot.ts', 'press.capture.ts'], timeout: 60_000,
  use: { baseURL: 'http://localhost:5173', channel: 'chrome', headless: true },
  webServer: { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: true, timeout: 60_000 },
});
