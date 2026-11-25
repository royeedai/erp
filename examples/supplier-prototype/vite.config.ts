// 样页专用配置：独立端口、独立缓存，不影响主工程的 5173 和试验构建。
// 启动：pnpm exec vite --config examples/supplier-prototype/vite.config.ts
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

const at = (path: string) => fileURLToPath(new URL(path, import.meta.url))

export default defineConfig({
  root: at('.'),
  cacheDir: at('../../node_modules/.vite-supplier-prototype'),
  plugins: [vue()],
  resolve: { alias: { '@': at('../../src') } },
  server: { host: '127.0.0.1', port: 5183, strictPort: true, fs: { allow: [at('../..')] } },
})
