// 护栏清单：拦什么、提示改用什么。规则正文见 docs/standards/engineering.md。
// 这里管脚本和模板；样式文件和 <style> 由 stylelint.config.js 管。

/** 业务目录能直接引入的包，其余一律拦下 */
const BUSINESS_PACKAGES = [
  'vue',
  'vue-router',
  'pinia',
  '@tanstack/vue-query',
  'element-plus',
  '@element-plus/icons-vue',
  'decimal.js',
]
/** 业务目录里的测试文件额外可用 */
const TEST_PACKAGES = ['vitest', '@vue/test-utils']

const MSG = {
  vxe: '只有 src/shared/ui/ 能用 vxe-table；页面用 DataTable / EditTable。',
  feedback: '提示和确认用 @/shared/ui/feedback 的 toast / confirm / confirmWithReason / alertError。',
  table: '列表和明细用 DataTable / EditTable，不用 el-table。',
  number: '金额用 AmountInput，不用 el-input-number（只能绑数字，且限制在安全整数内）。',
  elementPlus: '从 element-plus 按名字引入，不走子路径、默认导入和整体导入。',
  request: '用 src/api/generated 里 orval 生成的函数，不写裸请求。',
  ui: '只用 Element Plus 和 vxe-table，不引入第二套 UI 库。',
  allow: `业务目录只能引入 ${BUSINESS_PACKAGES.join('、')}，以及 @/ 和相对路径。`,
  color: '颜色只用 src/theme/ 里的 CSS 变量，不写颜色值。',
  duration: '动画时长只用 var(--app-dur-fast / mid / slow)，不写时间值。',
  animate: '动效只用 src/theme/motion.css 的变量和类，不手写 animate()。',
  storage: '业务数据不写浏览器存储；登录态和用户偏好在 src/app/ 里处理。',
  legacy: '只用 <script setup lang="ts">，不写 Options API、this 和 Vue 2 写法。',
  external: '模板写在 .vue 里，不用 <template src>。',
  component: '业务页面只能用登记过的 Element Plus 组件，缺的先补公共封装，清单在 lint/guard.js。',
  native: '业务页面不写原生结构标签，用公共封装。',
  inlineStyle: '业务页面不写样式，尺寸和外观由公共封装决定。',
  className: 'class 只用 app- 开头的公共类，业务页面没有自己的样式。',
  buttonType: '按钮只有主按钮和普通按钮；危险动作的红色由 confirm({ danger: true }) 给。',
  buttonLook: '按钮和控件的大小、形状统一由 src/theme/ 给，不逐个设。',
  status: '能不能做看接口返回的 allowedActions，不按状态推断。',
  permission: '权限码只在 src/app/permissions.ts 登记，页面用 PERM。',
  empty: '空态用 EmptyHint 写明原因和下一步，不写“暂无数据”。',
  draft: '没有无占用草稿能力就不叫“暂存”，按钮用保存、保存新增、保存提交。',
  vague: '按钮写具体动作，不写“确定”“确认”。',
  numeric: '金额、数量是字符串，用 @/shared/money/amount 计算和显示；页码这类整数用 Number.parseInt(x, 10)。',
  date: '日期按接口给的字符串显示，不在页面里格式化。',
  form: '录入用 FormDialog 或整页卡片，查询用 QueryBar，不单独写 el-form。',
  reference: '参照用 RefPicker，不用远程搜索的下拉。',
}

/* ---------- 业务页面能用的组件 ---------- */

/** 业务页面和样例页能直接用的 Element Plus 组件，其余一律拦下 */
const PAGE_COMPONENTS = [
  'alert',
  'button',
  'button-group',
  'checkbox',
  'checkbox-group',
  'date-picker',
  'dropdown',
  'dropdown-item',
  'dropdown-menu',
  'form',
  'form-item',
  'icon',
  'input',
  'option',
  'option-group',
  'radio',
  'radio-button',
  'radio-group',
  'select',
  'switch',
  'tooltip',
]
/** 有替代封装的，写明改用什么 */
const PAGE_INSTEAD = [
  ['pagination', '分页由 DataTable 带，不单独写 el-pagination。'],
  ['dialog', '录入用 FormDialog，确认用 confirm()，选参照用 RefPicker，不直接写 el-dialog。'],
  ['drawer', '录入用表内编辑、整页卡片或 FormDialog，不用 el-drawer。'],
  ['tabs|tab-pane', '状态页签用 StatusTabs，不用 el-tabs。'],
  ['menu|menu-item|menu-item-group|sub-menu|aside|container|main|header|footer', '外壳在 src/app/layout/，不放常驻侧栏。'],
  ['card', '列表和单据的面板是直角，不用 el-card。'],
  ['row|col|space|divider', '版式由公共封装给，页面不自己排。'],
  ['empty|result', '空态用 EmptyHint，不用 el-empty、el-result。'],
  ['tag|badge', '状态用 StatusTag，不用 el-tag。'],
  ['popconfirm', '确认用 confirm()，不用 el-popconfirm。'],
  ['page-header', '标题行用 PageHeader。'],
  ['tree|tree-v2', '左树右表用 TreeLayout，选参照用 RefPicker，不直接写 el-tree。'],
  ['autocomplete|cascader|cascader-panel|transfer|tree-select|select-v2', '参照用 RefPicker。'],
  ['upload', '附件封装还没有，先补公共封装，不直接写 el-upload。'],
]
const pascal = (name) => name.replace(/(?:^|-)([a-z])/g, (_, c) => c.toUpperCase())
/** el-dialog、ElDialog、elDialog 三种写法都算 */
const elName = (names) => `(?:el-(?:${names.join('|')})|[eE]l(?:${names.map(pascal).join('|')}))`
const PAGE_ALLOWED = elName([...PAGE_COMPONENTS, 'table', 'table-column', 'table-v2', 'auto-resizer', 'input-number', ...PAGE_INSTEAD.flatMap(([n]) => n.split('|'))])
/** 没登记、也没有专门提示的 */
const PAGE_UNKNOWN = `^(?!${PAGE_ALLOWED}$)(?:el-[a-z]|[eE]l[A-Z])[A-Za-z0-9-]*$`
/** 原生结构标签 */
const NATIVE = '^(?:h[1-6]|table|thead|tbody|tfoot|tr|td|th|button|input|select|textarea|form|aside|nav|header|footer|main|dialog|iframe)$'

/* ---------- 引入 ---------- */

const VXE = '(?:vxe-table|vxe-pc-ui|xe-utils|@vxe-ui)(?:\\/|$)'
const REQUEST_LIB = '(?:axios|ky|ofetch|got|superagent|umi-request|alova|jquery)(?:\\/|$)'
const SECOND_UI =
  '(?:ant-design-vue|antdv-next|@ant-design|@arco-design|tdesign-[\\w-]+|naive-ui|vuetify|primevue|@primevue|quasar|view-ui-plus|iview|element-ui|vant|@vant|@nutui|@varlet|@opentiny|@headlessui|reka-ui|radix-vue|@nuxt\\/ui|bootstrap-vue[\\w-]*|@ionic|ag-grid[\\w-]*|@ag-grid[\\w-]*|handsontable|@handsontable|@tanstack\\/vue-table|@tanstack\\/table-core)(?:\\/|$)'
/** element-plus 子路径里只放行语言包和全量样式 */
const ELEMENT_PLUS_DEEP = 'element-plus\\/(?!(?:es|lib)\\/locale\\/|dist\\/index\\.css$)'

/** 不是相对路径和 @/，不在白名单，也没被上面的专门条目拦下 */
function notAllowed(packages) {
  const exact = packages.map((name) => name.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')).join('|')
  return `^(?!\\.{1,2}\\/|@\\/|element-plus\\/|(?:${exact})$|${VXE}|${REQUEST_LIB}|${SECOND_UI})`
}

function restrictedImports({ vxe, feedback, business, page, test }) {
  const named = (importNames, message) => ({ name: 'element-plus', importNames, message })
  const paths = [
    named(['ElTable', 'ElTableColumn', 'ElTableV2', 'ElAutoResizer'], MSG.table),
    named(['ElInputNumber'], MSG.number),
  ]
  const patterns = [
    { regex: `^${REQUEST_LIB}`, message: MSG.request },
    { regex: `^${SECOND_UI}`, message: MSG.ui },
    { regex: `^${ELEMENT_PLUS_DEEP}`, message: MSG.elementPlus },
  ]
  if (!feedback) paths.push(named(['ElMessage', 'ElMessageBox', 'ElNotification'], MSG.feedback))
  if (!vxe) patterns.push({ regex: `^${VXE}`, message: MSG.vxe })
  if (page) {
    patterns.push({ regex: '^element-plus$', importNamePattern: `^(?!${PAGE_ALLOWED}$)El[A-Z]`, message: MSG.component })
    for (const [names, message] of PAGE_INSTEAD) {
      paths.push(named(names.split('|').map((n) => `El${pascal(n)}`), message))
    }
  }
  if (business) {
    paths.push(named(['default'], MSG.elementPlus), { name: 'vue', importNames: ['defineComponent'], message: MSG.legacy })
    patterns.push(
      { regex: '(?:^@|\\/)\\/?api\\/http(?:\\.ts)?$', importNames: ['request', 'configureHttp'], message: MSG.request },
      { regex: '^\\..*\\/node_modules\\/', message: MSG.allow },
      { regex: notAllowed(test ? [...BUSINESS_PACKAGES, ...TEST_PACKAGES] : BUSINESS_PACKAGES), message: MSG.allow },
    )
  }
  return { paths, patterns }
}

/** no-restricted-imports 只管静态引入，动态 import() 和类型里的 import() 用选择器补 */
function dynamicImports({ vxe, business, test }) {
  // esquery 的正则里不能出现斜杠
  const match = (regex, message) =>
    ['ImportExpression', 'TSImportType'].map((type) => ({
      selector: `${type}[source.value=/${regex.replaceAll('\\/', '\\x2f')}/]`,
      message,
    }))
  const list = [...match(`^${REQUEST_LIB}`, MSG.request), ...match(`^${SECOND_UI}`, MSG.ui)]
  if (!vxe) list.push(...match(`^${VXE}`, MSG.vxe))
  if (business) {
    list.push(
      ...match('^element-plus', MSG.elementPlus),
      ...match(notAllowed(test ? [...BUSINESS_PACKAGES, ...TEST_PACKAGES] : BUSINESS_PACKAGES), MSG.allow),
      { selector: "ImportExpression[source.type!='Literal']", message: MSG.allow },
    )
  }
  return list
}

/* ---------- 颜色与时长 ---------- */

/** CSS 命名颜色；transparent、currentColor 不算 */
const NAMED =
  'aliceblue|antiquewhite|aqua|aquamarine|azure|beige|bisque|black|blanchedalmond|blue|blueviolet|brown|burlywood|cadetblue|chartreuse|chocolate|coral|cornflowerblue|cornsilk|crimson|cyan|dark(?:blue|cyan|goldenrod|gr[ae]y|green|khaki|magenta|olivegreen|orange|orchid|red|salmon|seagreen|slateblue|slategr[ae]y|turquoise|violet)|deeppink|deepskyblue|dimgr[ae]y|dodgerblue|firebrick|floralwhite|forestgreen|fuchsia|gainsboro|ghostwhite|gold|goldenrod|gr[ae]y|green|greenyellow|honeydew|hotpink|indianred|indigo|ivory|khaki|lavender|lavenderblush|lawngreen|lemonchiffon|light(?:blue|coral|cyan|goldenrodyellow|gr[ae]y|green|pink|salmon|seagreen|skyblue|slategr[ae]y|steelblue|yellow)|lime|limegreen|linen|magenta|maroon|medium(?:aquamarine|blue|orchid|purple|seagreen|slateblue|springgreen|turquoise|violetred)|midnightblue|mintcream|mistyrose|moccasin|navajowhite|navy|oldlace|olive|olivedrab|orange|orangered|orchid|pale(?:goldenrod|green|turquoise|violetred)|papayawhip|peachpuff|peru|pink|plum|powderblue|purple|rebeccapurple|red|rosybrown|royalblue|saddlebrown|salmon|sandybrown|seagreen|seashell|sienna|silver|skyblue|slateblue|slategr[ae]y|snow|springgreen|steelblue|tan|teal|thistle|tomato|turquoise|violet|wheat|white|whitesmoke|yellow|yellowgreen'
const NAMED_WORD = `(?<![\\w#-])(?:${NAMED})(?![\\w-])`
const COLOR_VALUE =
  '(?:#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\\w-])|(?<![\\w-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\\()'
/** 取值是颜色的样式属性名，驼峰和短横线写法都算 */
const COLOR_PROP = '(?:color$|^background|^border|^outline|^fill$|^stroke$|shadow$)'
const COLOR_DECLARATION = `(?:color|background|border|outline|fill|stroke|shadow)[\\w-]*\\s*:[^;]*${NAMED_WORD}`
const TIME = '(?<![\\w.#-])(?:\\d+\\.?\\d*|\\.\\d+)m?s(?![\\w-])'
const MOTION_PROP = '^(?:transition|animation)'
const MOTION_DECLARATION = `(?:transition|animation)[\\w-]*\\s*:[^;]*${TIME}`

/** 字符串和模板字符串各一条 */
const text = (parent, regex, message) => [
  { selector: `${parent} Literal[value=/${regex}/i]`.trim(), message },
  { selector: `${parent} TemplateElement[value.raw=/${regex}/i]`.trim(), message },
]

/** 样式对象 { color: … } 和直接赋值 el.style.color = … */
const styleValue = (prop, regex, message) => [
  ...text(`Property[key.name=/${prop}/i]`, regex, message),
  ...text(`Property[key.value=/${prop}/i]`, regex, message),
  ...text(`AssignmentExpression[left.property.name=/${prop}/i]`, regex, message),
]

/* ---------- 组件名 ---------- */

const COMPONENTS = [
  { name: '^el-?(?:table(?:-?column|-?v2)?|auto-?resizer)$', message: MSG.table },
  { name: '^el-?input-?number$', message: MSG.number },
  { name: '^vxe-?[a-z]', message: MSG.vxe, skip: 'vxe' },
]
/** Element Plus 挂在全局属性上的提示方法 */
const GLOBAL_FEEDBACK = '^\\$(?:message|msgbox|alert|confirm|prompt|notify)$'
/** Vue 2 的实例方法和属性 */
const VUE2_GLOBAL = '^\\$(?:set|delete|on|off|once|children|listeners|scopedSlots|destroy)$'
/** 说不清做什么的按钮名 */
const VAGUE = '^\\s*(?:确定|确认|OK)\\s*$'
const IMPORT_PARENT = 'ImportDeclaration, ExportNamedDeclaration, ExportAllDeclaration, ImportExpression, TSImportType'

/* ---------- 选择器 ---------- */

/** 业务页面：金额、日期、权限码、文案，脚本和模板表达式共用 */
function pageExpressions() {
  return [
    { selector: 'CallExpression[callee.name=/^(?:Number|parseFloat)$/]', message: MSG.numeric },
    { selector: "CallExpression[callee.object.name='Number'][callee.property.name='parseFloat']", message: MSG.numeric },
    { selector: 'CallExpression[callee.property.name=/^(?:toFixed|toPrecision)$/]', message: MSG.numeric },
    { selector: "UnaryExpression[operator='+']", message: MSG.numeric },
    { selector: "MemberExpression[object.name='Intl']", message: MSG.date },
    { selector: 'CallExpression[callee.property.name=/^toLocale(?:Date|Time)?String$/]', message: MSG.date },
    { selector: 'Literal[value=/^[a-z][\\w-]*:[a-z][\\w-]*:[a-z][\\w-]*$/i]', message: MSG.permission },
    ...text('', '暂无数据', MSG.empty),
    ...text('', '暂存', MSG.draft),
    { selector: `Property[key.name=/^(?:confirmText|saveText)$/] > Literal[value=/${VAGUE}/]`, message: MSG.vague },
    ...PAGE_INSTEAD.map(([names, message]) => ({
      selector: `:not(${IMPORT_PARENT}) > Literal[value=/^${elName(names.split('|'))}$/]`,
      message,
    })),
  ]
}

/** 脚本和模板表达式共用 */
function expressionSelectors({ vxe, color, page }) {
  const list = [
    { selector: `MemberExpression[property.name=/${GLOBAL_FEEDBACK}/]`, message: MSG.feedback },
    { selector: `MemberExpression[property.value=/${GLOBAL_FEEDBACK}/]`, message: MSG.feedback },
    { selector: `MemberExpression[property.name=/${VUE2_GLOBAL}/]`, message: MSG.legacy },
    { selector: "CallExpression[callee.property.name='animate']", message: MSG.animate },
    ...styleValue(MOTION_PROP, TIME, MSG.duration),
    ...text('', MOTION_DECLARATION, MSG.duration),
    ...text("CallExpression[callee.property.name='setProperty']", TIME, MSG.duration),
  ]
  for (const c of COMPONENTS) {
    if (c.skip === 'vxe' && vxe) continue
    list.push({ selector: `:not(${IMPORT_PARENT}) > Literal[value=/${c.name}/i]`, message: c.message })
  }
  if (page) list.push(...pageExpressions())
  if (!color) {
    list.push(
      ...text('', COLOR_VALUE, MSG.color),
      ...text('', COLOR_DECLARATION, MSG.color),
      ...styleValue(COLOR_PROP, NAMED_WORD, MSG.color),
      ...text("CallExpression[callee.property.name='setProperty']", NAMED_WORD, MSG.color),
    )
  }
  return list
}

function scriptSelectors(allow) {
  const list = [...expressionSelectors(allow), ...dynamicImports(allow)]
  if (!allow.this) list.push({ selector: 'ThisExpression', message: MSG.legacy })
  // defineOptions 里也能写 data、methods、mixins
  list.push({
    selector: "CallExpression[callee.name='defineOptions'] > ObjectExpression > :not(Property[key.name=/^(?:name|inheritAttrs)$/])",
    message: MSG.legacy,
  })
  return list
}

/** 业务页面的模板：组件、原生标签、样式、按钮、操作列、文案 */
function pageTemplate(attr, bound) {
  const button = 'VElement[rawName=/^(?:el-button|[eE]lButton)$/]'
  const select = 'VElement[rawName=/^(?:el-select|[eE]lSelect)$/]'
  const el = 'VElement[rawName=/^(?:el-|[eE]l[A-Z])/] > VStartTag >'
  const act = 'VElement[rawName=/^(?:el-button|[eE]lButton|el-dropdown-item|[eE]lDropdownItem|ActionBar)$/] > VStartTag >'
  const onStatus = (directive) => ({
    selector: `${act} ${directive} BinaryExpression[operator=/^[!=]==?$/] MemberExpression[property.name=/(?:status|state)$/i]`,
    message: MSG.status,
  })
  return [
    { selector: `VElement[rawName=/${PAGE_UNKNOWN}/]`, message: MSG.component },
    ...PAGE_INSTEAD.flatMap(([names, message]) => {
      const name = `^${elName(names.split('|'))}$`
      return [
        { selector: `VElement[rawName=/${name}/]`, message },
        { selector: `${attr('^is$')} > VLiteral[value=/${name}/]`, message },
      ]
    }),
    { selector: `VElement[rawName=/${NATIVE}/i]`, message: MSG.native },
    // 录入的 el-form 在 FormDialog、整页卡片里面，页面上只剩 QueryBar 的高级查询用得到
    { selector: 'VElement[rawName=/^(?:el-form|[eE]lForm)$/]:not(VElement[rawName=/^QueryBar$/] VElement)', message: MSG.form },
    { selector: attr('^style$'), message: MSG.inlineStyle },
    { selector: bound('^style$'), message: MSG.inlineStyle },
    { selector: `${attr('^class$')} > VLiteral:not([value=/^\\s*(?:(?:app-|is-|el-icon--)[\\w-]+\\s*)*$/])`, message: MSG.className },
    { selector: `${button} > VStartTag > ${attr('^type$')} > VLiteral:not([value='primary'])`, message: MSG.buttonType },
    ...text(`${button} > VStartTag > ${bound('^type$')}`, '^(?:success|warning|danger|info|text)$', MSG.buttonType),
    { selector: `${button} > VStartTag > ${attr('^(?:plain|round|circle|bg|text|color|dark)$')}`, message: MSG.buttonLook },
    { selector: `${el} ${attr('^size$')}`, message: MSG.buttonLook },
    { selector: `${el} ${bound('^size$')}`, message: MSG.buttonLook },
    onStatus('VAttribute[directive=true][key.name.name=/^(?:if|else-if|show)$/]'),
    onStatus(bound('^disabled$')),
    { selector: `${select} > VStartTag > ${attr('^remote$')}`, message: MSG.reference },
    { selector: `${select} > VStartTag > ${bound('^remote')}`, message: MSG.reference },
    ...['VText', 'VLiteral'].flatMap((node) => [
      { selector: `${node}[value=/暂无数据/]`, message: MSG.empty },
      { selector: `${node}[value=/暂存/]`, message: MSG.draft },
    ]),
    { selector: `${button} > VText[value=/${VAGUE}/]`, message: MSG.vague },
    { selector: `${attr('^(?:confirm-?text|save-?text)$')} > VLiteral[value=/${VAGUE}/]`, message: MSG.vague },
  ]
}

function templateSelectors(allow) {
  const attr = (name) => `VAttribute[directive=false][key.name=/${name}/]`
  const bound = (name) => `VAttribute[directive=true][key.argument.name=/${name}/]`
  const transition = 'VElement[rawName=/^transition(?:-?group)?$/i] > VStartTag >'
  const colorAttr = '(?:^|-)color$|^(?:fill|stroke|bgcolor)$'
  const list = [
    ...expressionSelectors(allow),
    { selector: 'ThisExpression', message: MSG.legacy },
    // <template src> 引出去的文件不会被检查
    { selector: "VElement[rawName='template'] > VStartTag > VAttribute[directive=false][key.name='src']", message: MSG.external },
    { selector: `Identifier[name=/${GLOBAL_FEEDBACK}/]`, message: MSG.feedback },
    { selector: `Identifier[name=/${VUE2_GLOBAL}/]`, message: MSG.legacy },
    { selector: `${attr('^style$')} > VLiteral[value=/${MOTION_DECLARATION}/i]`, message: MSG.duration },
    { selector: `${transition} ${attr('^duration$')}`, message: MSG.duration },
    { selector: `${transition} ${bound('^duration$')}`, message: MSG.duration },
  ]
  for (const c of COMPONENTS) {
    if (c.skip === 'vxe' && allow.vxe) continue
    list.push(
      { selector: `VElement[rawName=/${c.name}/i]`, message: c.message },
      { selector: `${attr('^is$')} > VLiteral[value=/${c.name}/i]`, message: c.message },
    )
  }
  if (allow.page) list.push(...pageTemplate(attr, bound))
  if (!allow.color) {
    list.push(
      { selector: `VLiteral[value=/${COLOR_VALUE}/i]`, message: MSG.color },
      { selector: `${attr('^style$')} > VLiteral[value=/${COLOR_DECLARATION}/i]`, message: MSG.color },
      { selector: `${attr(colorAttr)} > VLiteral[value=/${NAMED_WORD}/i]`, message: MSG.color },
      ...text(bound(`${colorAttr}|^style$`), NAMED_WORD, MSG.color),
    )
  }
  return list
}

/* ---------- 全局变量 ---------- */

const REQUEST_GLOBALS = ['fetch', 'XMLHttpRequest', 'EventSource', 'WebSocket']
const STORAGE_GLOBALS = ['localStorage', 'sessionStorage', 'indexedDB', 'caches', 'cookieStore']

function restrictedNames({ fetch, storage }) {
  const list = []
  if (!fetch) for (const name of REQUEST_GLOBALS) list.push({ name, message: MSG.request })
  if (!storage) for (const name of STORAGE_GLOBALS) list.push({ name, message: MSG.storage })
  return list
}

function restrictedProperties(allow) {
  const list = []
  for (const object of ['window', 'globalThis', 'self', 'top', 'parent']) {
    for (const { name, message } of restrictedNames(allow)) list.push({ object, property: name, message })
  }
  if (!allow.storage) list.push({ object: 'document', property: 'cookie', message: MSG.storage })
  if (!allow.fetch) list.push({ object: 'navigator', property: 'sendBeacon', message: MSG.request })
  return list
}

/**
 * 生成一组护栏规则。参数写的是放行什么，不写就是全拦。
 *
 * @param {object} [options]
 * @param {boolean} [options.vxe] 放行 vxe-table
 * @param {boolean} [options.feedback] 放行 ElMessage / ElMessageBox
 * @param {boolean} [options.fetch] 放行裸请求
 * @param {boolean} [options.storage] 放行浏览器存储
 * @param {boolean} [options.color] 放行颜色值
 * @param {boolean} [options.this] 放行 this
 * @param {boolean} [options.business] 业务目录：引入改用白名单，并带上 page
 * @param {boolean} [options.page] 页面风格：组件白名单、不写样式、按钮和文案
 * @param {boolean} [options.test] 业务目录的测试文件
 */
export function guard(options = {}) {
  const allow = { ...options, page: options.page ?? options.business }
  return {
    'no-restricted-imports': ['error', restrictedImports(allow)],
    'no-restricted-syntax': ['error', ...scriptSelectors(allow)],
    'vue/no-restricted-syntax': ['error', ...templateSelectors(allow)],
    'no-restricted-globals': ['error', ...restrictedNames(allow)],
    'no-restricted-properties': ['error', ...restrictedProperties(allow)],
    ...(allow.page ? { 'vue/no-v-html': 'error' } : {}),
  }
}
