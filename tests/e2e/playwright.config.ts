import { fileURLToPath } from 'node:url'
import { defineConfig } from '@playwright/test'

// 端到端：mock 构建 + 本机 Chrome。几个 worktree 同时跑时用 E2E_PORT 错开端口
const PORT = process.env.E2E_PORT ?? '4173'

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
    baseURL: `http://127.0.0.1:${PORT}`,
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `pnpm exec vite build --mode mock && pnpm exec vite preview --mode mock --port ${PORT} --strictPort`,
    cwd: fileURLToPath(new URL('../..', import.meta.url)),
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
