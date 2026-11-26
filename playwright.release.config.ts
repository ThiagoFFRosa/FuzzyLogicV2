import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests-release',
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:5181', browserName: 'chromium' },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 5181 --strictPort',
    url: 'http://127.0.0.1:5181',
  },
  reporter: 'list',
});
