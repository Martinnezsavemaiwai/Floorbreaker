import { defineConfig } from 'vite';

// base './' = relative asset URLs, so one build works on itch.io (zip) and GitHub Pages (/repo/ path)
export default defineConfig({
  base: './',
  server: { port: 5173 },
  // Headless sims run in Node: the game logic must not touch the DOM
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
