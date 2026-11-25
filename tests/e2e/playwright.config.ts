import { fileURLToPath } from 'node:url'
import { defineConfig } from '@playwright/test'

// 端到端：mock 构建 + 本机 Chrome
export default defineConfig({
  testDir: '.',
  timeout: 60_000,
  expect: { timeout: 5_000 },
  workers: 1,
  retries: 0,
  reporter: [['list']],
  outputDir: '../../test-results/e2e',
  use: {
    channel: 'chrome',
    headless: true,
    actionTimeout: 8_000,
    viewport: { width: 1366, height: 768 },
    baseURL: 'http://127.0.0.1:4173',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'pnpm exec vite build --mode mock && pnpm exec vite preview --mode mock --port 4173 --strictPort',
    cwd: fileURLToPath(new URL('../..', import.meta.url)),
    url: 'http://127.0.0.1:4173/',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
