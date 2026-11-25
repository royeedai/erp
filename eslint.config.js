import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import { defineConfig, globalIgnores } from 'eslint/config'
import tseslint from 'typescript-eslint'
import { guard } from './lint/guard.js'
import { pageStructure } from './lint/page-structure.js'

export default defineConfig([
  globalIgnores([
    // 会话的 worktree 会建在这里面
    '.claude/',
    'dist*/',
    'test-results/',
    'playwright-report/',
    // orval 产物，由 pnpm check:api 保证没有手改
    'src/api/generated/',
    // 样页原型和对比页，不进工程；样页选版后归档
    'examples/',
    'element-theme/',
    '独立报告/',
  ]),

  /* ---------- 通用 ---------- */
  js.configs.recommended,
  tseslint.configs.recommended,
  vue.configs['flat/essential'],
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
  {
    files: ['**/*.{ts,vue}'],
    rules: {
      // 未定义的名字由 vue-tsc 管
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },

  /* ---------- 写法：只有 <script setup lang="ts"> ---------- */
  {
    files: ['src/**/*.{ts,vue}'],
    rules: {
      'vue/component-api-style': ['error', ['script-setup']],
      'vue/block-lang': ['error', { script: { lang: 'ts' }, template: { allowNoLang: true }, style: { allowNoLang: true } }],
      // 模板里只能用自己引入的组件和 Element Plus，挡住全局注册的其他组件
      'vue/no-undef-components': ['error', { ignorePatterns: ['^el-', '^router-(view|link)$'] }],
    },
  },
  {
    files: ['src/**/*.{js,jsx,mjs,cjs,tsx,mts,cts}'],
    rules: { 'no-restricted-syntax': ['error', { selector: 'Program', message: 'src/ 下只写 .ts 和 .vue。' }] },
  },

  /* ---------- 护栏：默认全拦，逐处放行 ---------- */
  { files: ['src/**/*.{ts,vue}'], rules: guard({ this: true }) },
  { files: ['src/**/*.vue'], rules: guard() },
  { files: ['src/app/**/*.ts'], rules: guard({ this: true, storage: true }) },
  { files: ['src/app/**/*.vue'], rules: guard({ storage: true }) },
  { files: ['src/api/http.ts'], rules: guard({ this: true, fetch: true }) },
  { files: ['src/theme/**/*.ts'], rules: guard({ color: true }) },
  { files: ['src/shared/ui/**/*.{ts,vue}'], rules: guard({ vxe: true }) },
  { files: ['src/shared/ui/feedback.ts'], rules: guard({ feedback: true }) },
  // 样例页是给人和 AI 照抄的，和业务页面守一样的页面规则
  { files: ['src/samples/**/*.{ts,vue}'], rules: guard({ page: true }) },
  {
    files: ['src/features/**/*.vue', 'src/samples/**/*.vue'],
    plugins: { page: pageStructure },
    rules: { 'page/one-primary': 'error', 'page/row-actions': 'error' },
  },
  {
    files: ['src/features/**/*Page.vue'],
    plugins: { page: pageStructure },
    rules: { 'page/header': 'error' },
  },
  {
    files: ['src/features/**/*.{ts,vue}'],
    rules: {
      ...guard({ business: true }),
      // 关掉模板里的 <!-- eslint-disable -->
      'vue/comment-directive': 'off',
    },
    // 业务目录不许用注释关规则
    linterOptions: { noInlineConfig: true },
  },
  { files: ['src/features/**/*.test.ts'], rules: guard({ business: true, test: true }) },
])
