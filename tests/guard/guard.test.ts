// @vitest-environment node
// 护栏回归：每种违规和常见绕法都要报错，合规写法不能误伤。样例只在内存里，不落到 src/。
import { ESLint } from 'eslint'
import stylelint from 'stylelint'
import { describe, expect, it } from 'vitest'

const eslint = new ESLint()

async function lint(code: string, filePath: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath })
  return (result?.messages ?? []).filter((m) => m.severity === 2).map((m) => `${m.ruleId}: ${m.message}`)
}

async function lintStyle(code: string, filePath: string): Promise<string[]> {
  const { results } = await stylelint.lint({ code, codeFilename: filePath })
  return results.flatMap((r) => r.warnings.map((w) => `${w.rule}: ${w.text}`))
}

const FEATURE = 'src/features/guard/sample/'
const script = (body: string) => `<script setup lang="ts">\n${body}\n</script>\n\n<template><div /></template>\n`
const template = (body: string, setup = '') => `<script setup lang="ts">\n${setup}\n</script>\n\n<template>${body}</template>\n`
const style = (body: string) => `<template><div class="x" /></template>\n\n<style>\n.x { ${body} }\n</style>\n`

/** 脚本样例同时按 .vue 和 .ts 各跑一遍 */
function scriptCases(expected: RegExp, samples: string[]) {
  it.each(samples)('脚本 %s', async (code) => {
    expect((await lint(script(code), FEATURE + 'Sample.vue')).join('\n')).toMatch(expected)
    expect((await lint(code + '\n', FEATURE + 'sample.ts')).join('\n')).toMatch(expected)
  })
}
function templateCases(expected: RegExp, samples: string[]) {
  it.each(samples)('模板 %s', async (code) => {
    expect((await lint(template(code), FEATURE + 'Sample.vue')).join('\n')).toMatch(expected)
  })
}
/** 样式样例同时按 <style> 和 .css 各跑一遍 */
function styleCases(expected: RegExp, samples: string[]) {
  it.each(samples)('样式 %s', async (code) => {
    expect((await lintStyle(style(code), FEATURE + 'Sample.vue')).join('\n')).toMatch(expected)
    expect((await lintStyle(`.x { ${code} }\n`, FEATURE + 'sample.css')).join('\n')).toMatch(expected)
  })
}

describe('vxe-table', () => {
  scriptCases(/只有 src\/shared\/ui\/ 能用 vxe-table/, [
    "import { VxeTable } from 'vxe-table'",
    "import type { VxeTableInstance } from 'vxe-table'",
    "import 'vxe-table/es/style.css'",
    "import XEUtils from 'xe-utils'",
    "import { VxeSelect } from 'vxe-pc-ui'",
    "import { VxeUI } from '@vxe-ui/core'",
    "export { VxeTable } from 'vxe-table'",
    "const m = await import('vxe-table')",
    "type T = import('vxe-table').VxeTableInstance",
    "const c = resolveComponent('vxe-table')",
  ])
  templateCases(/只有 src\/shared\/ui\/ 能用 vxe-table/, [
    '<vxe-table />',
    '<VxeColumn />',
    '<component is="vxe-grid" />',
    '<component :is="\'VxeTable\'" />',
  ])
})

describe('ElMessage / ElMessageBox', () => {
  scriptCases(/toast \/ confirm/, [
    "import { ElMessage } from 'element-plus'",
    "import { ElMessageBox as Box } from 'element-plus'",
    "import { ElNotification } from 'element-plus'",
    "import * as EP from 'element-plus'",
    "export { ElMessage } from 'element-plus'",
    'proxy.$message({ message: 1 })',
    "globals['$message']({ message: 1 })",
  ])
  scriptCases(/不走子路径、默认导入和整体导入/, [
    "import EP from 'element-plus'",
    "import { ElMessage } from 'element-plus/es/components/message/index'",
    "const ep = await import('element-plus')",
  ])
  templateCases(/toast \/ confirm/, ['<div @click="$message(\'x\')" />', '<div @click="() => $confirm(\'x\')" />'])
})

describe('el-table', () => {
  scriptCases(/不用 el-table/, [
    "import { ElTable } from 'element-plus'",
    "import { ElTableColumn, ElTableV2 } from 'element-plus'",
    "const c = resolveComponent('ElTable')",
  ])
  templateCases(/不用 el-table/, [
    '<el-table />',
    '<ElTable />',
    '<elTable />',
    '<el-table-column />',
    '<el-table-v2 />',
    '<component is="el-table" />',
    '<component :is="\'el-table\'" />',
  ])
})

describe('el-input-number', () => {
  scriptCases(/不用 el-input-number/, [
    "import { ElInputNumber } from 'element-plus'",
    "const c = resolveComponent('el-input-number')",
  ])
  templateCases(/不用 el-input-number/, [
    '<el-input-number />',
    '<ElInputNumber />',
    '<component is="el-input-number" />',
    '<component :is="\'ElInputNumber\'" />',
  ])
})

describe('硬编码颜色', () => {
  scriptCases(/不写颜色值/, [
    "const c = '#fff'",
    "const c = '#1D5BBF'",
    "const c = '#1D5BBF80'",
    'const c = `1px solid #d5dce5`',
    "const c = 'rgba(0, 0, 0, .5)'",
    "const c = 'hsl(210 50% 40%)'",
    "const s = { color: 'red' }",
    "const s = { 'background-color': 'white' }",
    "const s = { borderColor: ok ? 'green' : 'var(--x)' }",
    "el.style.backgroundColor = 'tomato'",
    "el.style.cssText = 'color: red'",
    "el.style.setProperty('--x', 'navy')",
  ])
  templateCases(/不写颜色值/, [
    '<div style="color: #fff" />',
    '<div style="border: 1px solid red" />',
    '<div :style="{ color: \'#fff\' }" />',
    '<div :style="{ backgroundColor: \'white\' }" />',
    '<div :style="`color: ${ok ? \'red\' : \'\'}`" />',
    '<el-tag color="#fff" />',
    '<el-icon color="red" />',
    '<el-progress :color="\'orange\'" />',
    '<el-switch active-color="green" />',
    '<svg><path fill="black" /></svg>',
  ])
  styleCases(/不写颜色值/, [
    'color: #fff;',
    'color: red;',
    'background: rgb(0 0 0 / 50%);',
    'border: 1px solid rgba(0, 0, 0, .1);',
    'box-shadow: 0 0 4px hsl(0 0% 0% / 10%);',
    '--x: #1D5BBF;',
    '--x: white;',
    'background: linear-gradient(red, var(--y));',
    'color: color-mix(in srgb, var(--a) 50%, transparent);',
    'color: var(--x, #fff);',
  ])
})

describe('硬编码动画时长', () => {
  scriptCases(/不写时间值/, [
    "const s = { transition: 'opacity .3s' }",
    "const s = { animationDuration: '200ms' }",
    "el.style.transition = 'all 300ms'",
    "el.style.cssText = 'transition: all .3s'",
    "el.style.setProperty('--x', '300ms')",
  ])
  scriptCases(/不手写 animate/, ['el.animate([], 300)'])
  templateCases(/不写时间值/, [
    '<div style="transition: opacity .3s" />',
    '<div :style="{ transition: \'opacity .3s\' }" />',
    '<Transition :duration="300"><div /></Transition>',
    '<transition-group duration="300"><div key="a" /></transition-group>',
  ])
  styleCases(/不写时间值/, [
    'transition: opacity .3s;',
    'transition: opacity var(--app-dur-fast), transform 200ms;',
    'transition-duration: 300ms;',
    'animation: app-x 1s linear;',
    'animation-delay: 0.5s;',
    '--x: .3s;',
    'transition: opacity calc(.4s * var(--s));',
  ])
})

describe('浏览器存储', () => {
  scriptCases(/不写浏览器存储/, [
    "localStorage.setItem('a', 'b')",
    "sessionStorage.getItem('a')",
    "window.localStorage.getItem('a')",
    "globalThis['sessionStorage'].getItem('a')",
    'const { localStorage: s } = window',
    "indexedDB.open('a')",
    "document.cookie = 'a=b'",
  ])
})

describe('裸请求', () => {
  scriptCases(/不写裸请求/, [
    "void fetch('/api/x')",
    "void window.fetch('/api/x')",
    'const x = new XMLHttpRequest()',
    "const s = new WebSocket('wss://x')",
    "navigator.sendBeacon('/x')",
    "import axios from 'axios'",
    "const m = await import('axios')",
    "import { request } from '@/api/http'",
    "import { request } from '../../../api/http'",
  ])
})

describe('Options API 与 Vue 2 写法', () => {
  const component = async (code: string) => (await lint(code, FEATURE + 'Sample.vue')).join('\n')

  it.each([
    ['data 选项', "<script lang=\"ts\">\nexport default { data() { return { a: 1 } } }\n</script>\n<template><div>{{ a }}</div></template>\n"],
    ['methods 选项', "<script lang=\"ts\">\nexport default { methods: { go() {} } }\n</script>\n<template><div /></template>\n"],
    ['setup 选项', "<script lang=\"ts\">\nexport default { setup() { return {} } }\n</script>\n<template><div /></template>\n"],
    [
      'defineComponent',
      "<script lang=\"ts\">\nimport { defineComponent } from 'vue'\nexport default defineComponent({ data() { return { a: 1 } } })\n</script>\n<template><div /></template>\n",
    ],
  ])('%s', async (_name, code) => {
    expect(await component(code)).toMatch(/vue\/component-api-style/)
  })

  it('.ts 里的 defineComponent', async () => {
    const code = "import { defineComponent } from 'vue'\nexport const A = defineComponent({ data() { return { a: 1 } } })\n"
    expect((await lint(code, FEATURE + 'sample.ts')).join('\n')).toMatch(/不写 Options API/)
  })

  it('<template src>', async () => {
    expect(await component('<template src="./x.html"></template>\n')).toMatch(/不用 <template src>/)
  })

  it('普通 script 和 script setup 并存，两块都检查', async () => {
    const code = [
      '<script lang="ts">',
      "export const a = () => localStorage.getItem('a')",
      '</script>',
      '<script setup lang="ts">',
      "const b = () => sessionStorage.getItem('b')",
      '</script>',
      '<template><div @click="b" /></template>',
      '',
    ].join('\n')
    const found = await component(code)
    expect(found).toMatch(/'localStorage'/)
    expect(found).toMatch(/'sessionStorage'/)
  })

  it('没写 lang="ts"', async () => {
    expect(await component('<script setup>\nconst a = 1\n</script>\n<template><div>{{ a }}</div></template>\n')).toMatch(/vue\/block-lang/)
  })

  scriptCases(/不写 Options API/, ['const f = function () { return this }', 'defineOptions({ data() { return {} } })', 'defineOptions({ mixins: [] })'])
  templateCases(/不写 Options API/, ['<div @click="this.go()" />'])

  it.each([
    ['slot-scope', '<el-select><template slot-scope="{ row }">{{ row }}</template></el-select>', /no-deprecated-slot-scope-attribute/],
    ['slot 属性', '<el-select><div slot="x" /></el-select>', /no-deprecated-slot-attribute/],
    ['.sync', '<el-dialog :visible.sync="a" />', /no-deprecated-v-bind-sync/],
    ['.native', '<el-button @click.native="a" />', /no-deprecated-v-on-native-modifier/],
    ['过滤器', '<div>{{ a | b }}</div>', /no-deprecated-filter/],
    ['$listeners', '<el-button v-on="$listeners" />', /no-deprecated-dollar-listeners-api/],
    ['$set', '<div @click="$set(a, 1, 2)" />', /不写 Options API/],
  ])('%s', async (_name, code, expected) => {
    expect(await component(template(code, 'const a = 1'))).toMatch(expected)
  })

  it('beforeDestroy', async () => {
    const code = '<script lang="ts">\nexport default { beforeDestroy() {} }\n</script>\n<template><div /></template>\n'
    expect(await component(code)).toMatch(/no-deprecated-destroyed-lifecycle/)
  })

  it.each(['sample.js', 'sample.tsx', 'sample.jsx', 'sample.mjs'])('不能写 %s', async (name) => {
    expect((await lint('export const a = 1\n', FEATURE + name)).join('\n')).toMatch(/只写 \.ts 和 \.vue/)
  })
})

describe('第二套 UI 库', () => {
  scriptCases(/不引入第二套 UI 库/, [
    "import { Button } from 'ant-design-vue'",
    "import 'ant-design-vue/dist/reset.css'",
    "import { NButton } from 'naive-ui'",
    "import { Button } from '@arco-design/web-vue'",
    "import { Button } from 'tdesign-vue-next'",
    "import { AgGridVue } from 'ag-grid-vue3'",
    "const m = await import('vuetify')",
  ])
  scriptCases(/业务目录只能引入/, [
    "import { X } from 'some-unknown-ui'",
    "import { useStorage } from '@vueuse/core'",
    "const m = await import('some-unknown-ui')",
    'const m = await import(name)',
  ])
  templateCases(/vue\/no-undef-components/, ['<a-button />', '<n-button />', '<v-btn />'])
})

describe('注释关不掉', () => {
  it('脚本和模板', async () => {
    const code = [
      '<script setup lang="ts">',
      '/* eslint-disable */',
      '// eslint-disable-next-line no-restricted-globals',
      "localStorage.setItem('a', 'b')",
      '</script>',
      '',
      '<!-- eslint-disable -->',
      '<template>',
      '  <!-- eslint-disable-next-line vue/no-restricted-syntax -->',
      '  <el-table />',
      '</template>',
      '',
    ].join('\n')
    const found = (await lint(code, FEATURE + 'Sample.vue')).join('\n')
    expect(found).toMatch(/不写浏览器存储/)
    expect(found).toMatch(/不用 el-table/)
  })
  it.each([
    '/* stylelint-disable */\n.x { color: #fff; }\n',
    '.x {\n  /* stylelint-disable-next-line color-no-hex */\n  color: #fff;\n}\n',
    '.x { color: #fff; /* stylelint-disable-line */ }\n',
  ])('样式 %j', async (code) => {
    expect((await lintStyle(code, FEATURE + 'sample.css')).join('\n')).toMatch(/不写颜色值/)
    expect((await lintStyle(`<style>\n${code}</style>\n`, FEATURE + 'Sample.vue')).join('\n')).toMatch(/不写颜色值/)
  })
  it('@ts-ignore', async () => {
    expect((await lint('// @ts-ignore\nexport const a: number = 1\n', FEATURE + 'sample.ts')).join('\n')).toMatch(/ban-ts-comment/)
  })
})

describe('放行的位置', () => {
  it('合规的业务页面不误伤', async () => {
    const code = [
      '<script setup lang="ts">',
      "import { computed, ref } from 'vue'",
      "import { useRoute } from 'vue-router'",
      "import { storeToRefs } from 'pinia'",
      "import { keepPreviousData } from '@tanstack/vue-query'",
      "import type { FormInstance } from 'element-plus'",
      "import { Search } from '@element-plus/icons-vue'",
      "import { ApiError, newIdempotencyKey } from '@/api/http'",
      "import { useListProjectRoles } from '@/api/generated/project-role/project-role'",
      "import AmountInput from '@/shared/ui/AmountInput.vue'",
      "import DataTable from '@/shared/ui/DataTable.vue'",
      "import { toast } from '@/shared/ui/feedback'",
      "import Child from './Child.vue'",
      "defineOptions({ name: 'SamplePage', inheritAttrs: false })",
      "const form = ref<FormInstance>()",
      "const amount = ref<string | null>('0.00')",
      "const orderNo = computed(() => '#' + newIdempotencyKey())",
      "const color = 'var(--el-color-primary)'",
      "const used = [useRoute, storeToRefs, keepPreviousData, Search, ApiError, useListProjectRoles, toast, form, orderNo]",
      '</script>',
      '',
      '<template>',
      '  <div class="red" :style="{ color, width: \'200px\' }" :title="String(used.length)">',
      '    <el-form ref="form"><el-form-item label="金额"><AmountInput v-model="amount" /></el-form-item></el-form>',
      '    <el-tag type="success" effect="light">已完成</el-tag>',
      '    <Transition name="fade"><Child v-loading="false" /></Transition>',
      '    <DataTable noun="岗位" :rows="[]" :columns="[]" :total="0" :page="1" :size="50" />',
      '    <RouterLink to="/home">返回</RouterLink>',
      '  </div>',
      '</template>',
      '',
      '<style>',
      '.red {',
      '  color: var(--el-color-primary);',
      '  border: 1px solid transparent;',
      '  background: currentColor;',
      '  transition: opacity var(--app-dur-mid) var(--app-ease-slide);',
      '  white-space: nowrap;',
      '}',
      '</style>',
      '',
    ].join('\n')
    expect(await lint(code, FEATURE + 'Sample.vue')).toEqual([])
    expect(await lintStyle(code, FEATURE + 'Sample.vue')).toEqual([])
  })

  it('业务测试文件可以用 vitest', async () => {
    const code = "import { it } from 'vitest'\nimport { mount } from '@vue/test-utils'\nit('a', () => void mount)\n"
    expect(await lint(code, FEATURE + 'sample.test.ts')).toEqual([])
  })

  it.each([
    ['vxe 在 shared/ui', "import { VxeTable } from 'vxe-table'\nexport const a = VxeTable\n", 'src/shared/ui/sample.ts'],
    ['ElMessage 在 feedback.ts', "import { ElMessage } from 'element-plus'\nexport const a = ElMessage\n", 'src/shared/ui/feedback.ts'],
    ['fetch 在 api/http.ts', "export const a = () => fetch('/x')\n", 'src/api/http.ts'],
    ['sessionStorage 在 app', "export const a = () => sessionStorage.getItem('x')\n", 'src/app/sample.ts'],
    ['颜色在 theme', "export const a = '#1D5BBF'\n", 'src/theme/sample.ts'],
  ])('%s', async (_name, code, file) => {
    expect(await lint(code, file)).toEqual([])
  })

  it.each([
    ['ElMessage 不在 shared/ui 的其他文件', "import { ElMessage } from 'element-plus'\nexport const a = ElMessage\n", 'src/shared/ui/sample.ts'],
    ['vxe 不在 app', "import { VxeTable } from 'vxe-table'\nexport const a = VxeTable\n", 'src/app/sample.ts'],
    ['fetch 不在 shared', "export const a = () => fetch('/x')\n", 'src/shared/sample.ts'],
    ['存储不在 shared', "export const a = () => localStorage.getItem('x')\n", 'src/shared/sample.ts'],
    ['颜色不在 app', "export const a = '#1D5BBF'\n", 'src/app/sample.ts'],
    ['第二套 UI 库不在 app', "import { Button } from 'ant-design-vue'\nexport const a = Button\n", 'src/app/sample.ts'],
  ])('%s', async (_name, code, file) => {
    expect(await lint(code, file)).not.toEqual([])
  })
})
