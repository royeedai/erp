import { fileURLToPath } from 'node:url'
import { defineConfig } from '@playwright/test'

// 开发服务冒烟：确认 vite dev 下 MSW 插件、样式、热更新入口都正常
export default defineConfig({
  testDir: '.',
  testMatch: 'dev-smoke.ts',
  timeout: 60_000,
  workers: 1,
  reporter: [['list']],
  outputDir: '../../test-results/dev',
  use: { channel: 'chrome', headless: true, actionTimeout: 10_000, viewport: { width: 1366, height: 768 }, baseURL: 'http://127.0.0.1:5199' },
  webServer: {
    command: 'pnpm exec vite --port 5199 --strictPort',
    cwd: fileURLToPath(new URL('../..', import.meta.url)),
    url: 'http://127.0.0.1:5199/',
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
