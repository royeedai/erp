// 把样页打成不依赖本机服务的静态文件：一个 JS、一个 CSS，字体内嵌。
// pnpm exec vite build --config examples/supplier-prototype/vite.build.config.ts --outDir <目录>
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

const at = (path: string) => fileURLToPath(new URL(path, import.meta.url))

export default defineConfig({
  root: at('.'),
  base: './',
  plugins: [vue()],
  resolve: { alias: { '@': at('../../src') } },
  build: {
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 10_000_000,
    chunkSizeWarningLimit: 8000,
    rolldownOptions: {
      output: {
        format: 'iife',
        entryFileNames: 'app.js',
        assetFileNames: 'app[extname]',
      },
    },
  },
})
