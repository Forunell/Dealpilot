import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests', fullyParallel: false, workers: 1,
  timeout: 30000, expect: { timeout: 7000 },
  use: { channel: 'msedge', headless: true, baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1000 }, locale: 'uk-UA', timezoneId: 'Europe/Kyiv', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  reporter: [['list'], ['html', { open: 'never' }]],
  webServer: { command: 'npm run dev -- --port 5173 --strictPort', url: 'http://127.0.0.1:5173', reuseExistingServer: !process.env.CI, timeout: 30000 },
})
