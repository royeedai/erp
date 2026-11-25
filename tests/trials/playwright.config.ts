import { fileURLToPath } from 'node:url'
import { defineConfig } from '@playwright/test'

// 用本机 Chrome 跑试验，不下载浏览器。产物是生产构建。
export default defineConfig({
  testDir: '.',
  timeout: 6 * 60_000,
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  outputDir: '../../test-results',
  use: {
    channel: 'chrome',
    actionTimeout: 10_000,
    headless: true,
    viewport: { width: 1366, height: 768 },
    baseURL: 'http://127.0.0.1:4174/trials.html',
  },
  webServer: {
    command: 'pnpm exec vite build --mode trials && pnpm exec vite preview --mode trials --port 4174 --strictPort',
    url: 'http://127.0.0.1:4174/trials.html',
    cwd: fileURLToPath(new URL('../..', import.meta.url)),
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
