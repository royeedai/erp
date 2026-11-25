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

describe('页面风格：结构', () => {
  templateCases(/不写原生结构标签/, [
    '<h2>供应商</h2>',
    '<table><tbody><tr><td>1</td></tr></tbody></table>',
    '<button>新增</button>',
    '<input>',
    '<aside />',
  ])
  templateCases(/不单独写 el-form/, [
    '<el-form inline><el-form-item label="名称"><el-input /></el-form-item></el-form>',
    '<ElForm />',
    '<DataTable><el-form /></DataTable>',
  ])
  templateCases(/分页由 DataTable 带/, ['<el-pagination :total="1" />', '<ElPagination />'])
  templateCases(/不直接写 el-dialog/, [
    '<el-dialog><el-input /></el-dialog>',
    '<ElDialog />',
    '<elDialog />',
    '<component is="el-dialog" />',
    '<component :is="\'ElDialog\'" />',
  ])
  scriptCases(/不直接写 el-dialog/, ["import { ElDialog } from 'element-plus'", "const c = resolveComponent('ElDialog')"])
  templateCases(/不用 el-drawer/, ['<el-drawer><el-input /></el-drawer>'])
  templateCases(/不用 el-tabs/, ['<el-tabs><el-tab-pane label="全部" /></el-tabs>'])
  templateCases(/不放常驻侧栏/, ['<el-aside><el-menu /></el-aside>', '<ElMenuItem />'])
  templateCases(/不用 el-card/, ['<el-card>1</el-card>'])
  templateCases(/页面不自己排/, ['<el-row><el-col :span="12" /></el-row>', '<el-space />'])
  templateCases(/不直接写 el-tree/, ['<el-tree :data="[]" />'])
  templateCases(/参照用 RefPicker/, [
    '<el-cascader />',
    '<el-tree-select />',
    '<el-autocomplete />',
    '<el-select remote />',
    '<el-select :remote-method="f" />',
  ])
  templateCases(/先补公共封装，不直接写 el-upload/, ['<el-upload />'])
  // 没登记的组件一律拦下，不用逐个列
  templateCases(/只能用登记过的 Element Plus 组件/, ['<el-steps />', '<ElCalendar />', '<el-carousel />', '<el-some-new-thing />'])
  scriptCases(/只能用登记过的 Element Plus 组件/, ["import { ElSteps } from 'element-plus'"])

  it.each([
    ['没有标题行', '<div class="app-page"><DataTable /></div>', /页面要有标题行/],
    ['最外层不是 app-page', '<div><PageHeader title="供应商" /></div>', /页面最外层是/],
  ])('%s', async (_name, code, expected) => {
    expect((await lint(template(code), FEATURE + 'SamplePage.vue')).join('\n')).toMatch(expected)
  })
})

describe('页面风格：交互', () => {
  templateCases(/一页只有一个实心主按钮/, [
    '<div><el-button type="primary">新增</el-button><el-button type="primary">导出</el-button></div>',
    '<div><el-button type="primary">新增</el-button><p><ElButton type="primary">导出</ElButton></p></div>',
    '<div><el-button :type="ok ? \'primary\' : undefined">新增</el-button><el-button type="primary">导出</el-button></div>',
    '<div><el-button type="primary">新增</el-button><el-button v-if="a" type="primary">甲</el-button><el-button v-else>乙</el-button></div>',
    '<div><el-button type="primary">新增</el-button><el-dropdown split-button type="primary">导出</el-dropdown></div>',
  ])
  templateCases(/按钮只有主按钮和普通按钮/, [
    '<el-button type="success">提交</el-button>',
    '<el-button type="warning">作废</el-button>',
    '<el-button type="danger">删除</el-button>',
    '<el-button :type="ok ? \'success\' : \'primary\'">提交</el-button>',
  ])
  templateCases(/不逐个设/, ['<el-button round>新增</el-button>', '<el-button plain>新增</el-button>', '<el-input size="large" />', '<el-select :size="s" />'])
  templateCases(/不叫“暂存”/, ['<el-button>暂存</el-button>', '<el-button>{{ \'暂存\' }}</el-button>', '<el-tooltip content="暂存" />'])
  scriptCases(/不叫“暂存”/, ["const actions = [{ action: 'draft', label: '暂存' }]"])
  templateCases(/按钮写具体动作/, ['<el-button>确定</el-button>', '<FormDialog save-text="确认" />'])
  scriptCases(/按钮写具体动作/, ["void confirm({ title: 'a', message: 'b', confirmText: '确定' })"])
  templateCases(/不用 el-popconfirm/, ['<el-popconfirm title="删除？"><template #reference><el-button>删除</el-button></template></el-popconfirm>'])
  templateCases(/不按状态推断/, [
    '<el-button v-if="row.status === \'draft\'">删除</el-button>',
    '<el-button v-show="row.billStatus !== 1">删除</el-button>',
    '<el-button :disabled="row.status !== \'draft\'">删除</el-button>',
    '<ActionBar v-if="row.approveState === 2 && ok" />',
    '<el-dropdown-item v-if="row.status == \'draft\'">删除</el-dropdown-item>',
  ])
  templateCases(/权限码只在/, ['<el-button v-if="perms.includes(\'project:role:edit\')">修改</el-button>'])
  scriptCases(/权限码只在/, ["const canEdit = has('project:role:edit')"])
  templateCases(/操作列用 ActionBar/, [
    '<DataTable><template #actions="{ row }"><el-button link @click="f(row)">修改</el-button><el-button link>提交</el-button><el-button link>复制</el-button><el-button link>删除</el-button></template></DataTable>',
    '<EditTable><template v-slot:actions><div><el-button link>修改</el-button></div></template></EditTable>',
    '<DataTable><template #cell-op="{ row }"><el-button link @click="f(row)">修改</el-button></template></DataTable>',
  ])
  templateCases(/不写“暂无数据”/, ['<p>暂无数据</p>', '<EmptyHint title="暂无数据" />', '<p>{{ \'暂无数据\' }}</p>'])
  templateCases(/不用 el-empty/, ['<el-empty />', '<el-result />'])
})

describe('页面风格：视觉', () => {
  styleCases(/业务页面不写样式/, [
    'font-size: 15px;',
    'padding: 13px;',
    'border-radius: 10px;',
    'height: 40px !important;',
    'font-weight: 600;',
    'font-family: serif;',
    'margin: var(--app-space-2);',
  ])
  it.each([
    ['深度选择器', '.a :deep(.el-button) { height: 40px; }'],
    ['引入别的样式', "@import './x.css';"],
  ])('样式 %s', async (_name, css) => {
    const expected = /业务页面不写样式/
    expect((await lintStyle(`<template><div /></template>\n\n<style>\n${css}\n</style>\n`, FEATURE + 'Sample.vue')).join('\n')).toMatch(expected)
    expect((await lintStyle(`<template><div /></template>\n\n<style scoped>\n${css}\n</style>\n`, FEATURE + 'Sample.vue')).join('\n')).toMatch(expected)
    expect((await lintStyle(`${css}\n`, 'src/samples/sample.css')).join('\n')).toMatch(expected)
  })
  it('样式换语言也不行', async () => {
    expect((await lint('<template><div /></template>\n\n<style lang="scss">\n.a { b: c }\n</style>\n', FEATURE + 'Sample.vue')).join('\n')).toMatch(/vue\/block-lang/)
  })
  templateCases(/业务页面不写样式/, ['<p style="margin-top: 7px; width: 333px">1</p>', '<p :style="{ width: \'200px\' }">1</p>', '<p :style="s">1</p>'])
  templateCases(/class 只用 app- 开头/, ['<div class="flex gap-4 p-2" />', '<div class="app-page my-page" />', '<div class="red" />'])
  templateCases(/状态用 StatusTag/, ['<el-tag type="success">已通过</el-tag>', '<ElTag />', '<el-badge />'])
  templateCases(/vue\/no-v-html/, ['<div v-html="x" />'])
})

describe('页面风格：数据', () => {
  scriptCases(/金额、数量是字符串/, [
    "const n = Number('12.30') + 0.1",
    'const n = parseFloat(row.amount)',
    'const n = Number.parseFloat(row.amount)',
    'const n = +row.amount',
    'const s = (1.005).toFixed(2)',
  ])
  templateCases(/金额、数量是字符串/, ['<span>{{ (1.005).toFixed(2) }}</span>', '<span>{{ Number(a) + Number(b) }}</span>'])
  scriptCases(/日期按接口给的字符串显示/, [
    'const s = new Date().toLocaleString()',
    "const s = new Date().toLocaleDateString('zh-CN')",
    "const f = new Intl.NumberFormat('zh-CN')",
  ])
  templateCases(/日期按接口给的字符串显示/, ['<span>{{ new Date().toLocaleString() }}</span>'])
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
      "import type { FormRules } from 'element-plus'",
      "import { Goods, RefreshRight } from '@element-plus/icons-vue'",
      "import { ApiError, newIdempotencyKey } from '@/api/http'",
      "import { useListProjectRoles } from '@/api/generated/project-role/project-role'",
      "import { PERM } from '@/app/permissions'",
      "import { formatAmount, sumAmounts } from '@/shared/money/amount'",
      "import ActionBar from '@/shared/ui/ActionBar.vue'",
      "import AmountInput from '@/shared/ui/AmountInput.vue'",
      "import DataTable from '@/shared/ui/DataTable.vue'",
      "import FormDialog from '@/shared/ui/FormDialog.vue'",
      "import PageHeader from '@/shared/ui/PageHeader.vue'",
      "import QueryBar from '@/shared/ui/QueryBar.vue'",
      "import StatusTabs from '@/shared/ui/StatusTabs.vue'",
      "import StatusTag from '@/shared/ui/StatusTag.vue'",
      "import { confirm, toast } from '@/shared/ui/feedback'",
      "import Child from './Child.vue'",
      "defineOptions({ name: 'SamplePage', inheritAttrs: false })",
      "const emit = defineEmits<{ 'update:page': [page: number] }>()",
      "const rules: FormRules = { name: [{ required: true, message: '请填写名称' }] }",
      "const amount = ref<string | null>('0.00')",
      "const total = computed(() => formatAmount(sumAmounts(['1.00', '2.00'], 2), 2))",
      "const orderNo = computed(() => '#' + newIdempotencyKey())",
      "const page = Number.parseInt('2', 10)",
      "const remove = () => confirm({ title: '删除', message: '删除后不能恢复', confirmText: '删除', danger: true })",
      "const used = [useRoute, storeToRefs, keepPreviousData, ApiError, useListProjectRoles, toast, orderNo, PERM, page, emit]",
      "const editing = ref(false)",
      "const row = { status: 'draft' }",
      '</script>',
      '',
      '<template>',
      '  <div class="app-page" :title="String(used.length)">',
      '    <PageHeader title="供应商" :icon="Goods">',
      '      <template #after><el-checkbox label="显示停用" /></template>',
      '      <el-button-group v-if="editing">',
      '        <el-button type="primary">保存</el-button>',
      '        <el-button>取消</el-button>',
      '      </el-button-group>',
      '      <el-button v-else type="primary">新增<el-icon class="el-icon--right"><Goods /></el-icon></el-button>',
      '      <el-button class="app-icon-btn" :icon="RefreshRight" aria-label="刷新" @click="remove" />',
      '    </PageHeader>',
      '    <QueryBar>',
      '      <el-input placeholder="名称" clearable />',
      '      <el-select filterable><el-option value="1" label="甲" /></el-select>',
      '      <el-date-picker class="app-dates is-wide is-required" type="daterange" />',
      '      <template #advanced><el-form label-width="80px"><el-form-item label="名称"><el-input /></el-form-item></el-form></template>',
      '    </QueryBar>',
      '    <div class="app-page-body">',
      '      <div class="app-page-main">',
      '        <StatusTabs model-value="all" :tabs="[{ key: \'all\', label: \'全部\' }]" />',
      '        <div class="app-page-fill">',
      '          <DataTable noun="供应商" :rows="[]" :columns="[]" :total="0" :page="1" :size="50" :summary="{ label: \'本页合计\', values: { amount: total } }">',
      '            <template #cell-name="{ row: r }"><a class="app-link">{{ r }}</a></template>',
      '            <template #cell-status><StatusTag tone="draft" text="草稿" /></template>',
      '            <template #actions><ActionBar :actions="[]" :allowed="[]" /></template>',
      '            <template #empty-action><el-button>新增</el-button></template>',
      '          </DataTable>',
      '        </div>',
      '      </div>',
      '    </div>',
      '    <el-alert v-if="row.status === \'draft\'" type="error" title="查询失败"><el-button link>重新查询</el-button></el-alert>',
      '    <FormDialog :model-value="false" title="供应商" :rules="rules" :initial="() => ({})" :submit="async () => 1" saved-text="已保存">',
      '      <el-form-item label="金额"><AmountInput v-model="amount" /></el-form-item>',
      '      <el-form-item label="启用"><el-switch /></el-form-item>',
      '    </FormDialog>',
      '    <Transition name="fade"><Child v-loading="false" /></Transition>',
      '    <RouterLink to="/home">返回</RouterLink>',
      '  </div>',
      '</template>',
      '',
    ].join('\n')
    expect(await lint(code, FEATURE + 'SamplePage.vue')).toEqual([])
    expect(await lintStyle(code, FEATURE + 'SamplePage.vue')).toEqual([])
  })

  it('封装自己的样式不误伤', async () => {
    const code = [
      '<template><div class="app-x" /></template>',
      '',
      '<style>',
      '.app-x {',
      '  color: var(--el-color-primary);',
      '  border: 1px solid transparent;',
      '  background: currentColor;',
      '  transition: opacity var(--app-dur-mid) var(--app-ease-slide);',
      '  white-space: nowrap;',
      '}',
      '</style>',
      '',
    ].join('\n')
    expect(await lint(code, 'src/shared/ui/SampleBox.vue')).toEqual([])
    expect(await lintStyle(code, 'src/shared/ui/SampleBox.vue')).toEqual([])
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
