import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

// mode=trials 只构建三项试验页，产物独立，不进正式包
export default defineConfig(({ mode }) => ({
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    outDir: mode === 'trials' ? 'dist-trials' : 'dist',
    chunkSizeWarningLimit: 1500,
    rolldownOptions: {
      input: mode === 'trials' ? 'trials.html' : 'index.html',
    },
  },
  // 本机的 localhost 会解析到 [::1] 且连不上，统一绑定 127.0.0.1
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { host: '127.0.0.1' },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
}))
