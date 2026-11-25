// 页面结构护栏：选择器写不出来的三条，要数数、要看整页。其余页面规则在 guard.js。

const isButton = (node) => /^(?:el-button|[eE]lButton)$/.test(node.rawName)
const isDropdown = (node) => /^(?:el-dropdown|[eE]lDropdown)$/.test(node.rawName)
const attrs = (node) => node.startTag.attributes
const staticAttr = (node, name) => attrs(node).find((a) => !a.directive && a.key.name === name)
const directive = (node, name) => attrs(node).find((a) => a.directive && a.key.name.name === name)
const elements = (node) => node.children.filter((c) => c.type === 'VElement')

/** type="primary"，或 :type 里出现 'primary' */
function isPrimary(node, source) {
  if (!isButton(node) && !(isDropdown(node) && staticAttr(node, 'split-button'))) return false
  if (staticAttr(node, 'link')) return false
  if (staticAttr(node, 'type')?.value?.value === 'primary') return true
  const bound = attrs(node).find((a) => a.directive && a.key.name.name === 'bind' && a.key.argument?.name === 'type')
  return bound?.value ? /['"`]primary['"`]/.test(source.getText(bound.value)) : false
}

/** 同时能看到几个主按钮：v-if / v-else-if / v-else 是一组，取最多的那个 */
function primaries(node, source) {
  const found = isPrimary(node, source) ? [node] : []
  let chain = []
  const flush = () => {
    found.push(...chain.reduce((a, b) => (b.length > a.length ? b : a), []))
    chain = []
  }
  for (const child of elements(node)) {
    const inner = primaries(child, source)
    if (!directive(child, 'else') && !directive(child, 'else-if')) flush()
    chain.push(inner)
    if (!directive(child, 'if') && !directive(child, 'else') && !directive(child, 'else-if')) flush()
  }
  flush()
  return found
}

/** 表格单元格里的裸按钮；空态插槽里的“重新查询”“新增”不算 */
function rowButtons(node, inside = false) {
  const slot = node.rawName === 'template' ? directive(node, 'slot')?.key.argument?.name : undefined
  if (inside && slot?.startsWith('empty')) return []
  const here = inside && isButton(node) ? [node] : []
  const table = /^(?:DataTable|EditTable)$/.test(node.rawName)
  return [...here, ...elements(node).flatMap((c) => rowButtons(c, inside || table))]
}

function has(node, name) {
  return node.rawName === name || elements(node).some((c) => has(c, name))
}

/** 只看最外层的 <template> */
const onPage = (context, check) => {
  const { defineTemplateBodyVisitor } = context.sourceCode.parserServices
  if (!defineTemplateBodyVisitor) return {}
  return defineTemplateBodyVisitor({ "VElement[name='template'][parent.type='VDocumentFragment']": check })
}

export const pageStructure = {
  rules: {
    'one-primary': {
      meta: { type: 'problem', schema: [] },
      create: (context) =>
        onPage(context, (root) => {
          for (const node of primaries(root, context.sourceCode).slice(1)) {
            context.report({ loc: node.loc, message: '一页只有一个实心主按钮，其余用普通按钮。' })
          }
        }),
    },
    'row-actions': {
      meta: { type: 'problem', schema: [] },
      create: (context) =>
        onPage(context, (root) => {
          for (const node of rowButtons(root)) {
            context.report({ loc: node.loc, message: '操作列用 ActionBar：最多平铺 2 个，其余进“更多”。' })
          }
        }),
    },
    header: {
      meta: { type: 'problem', schema: [] },
      create: (context) =>
        onPage(context, (root) => {
          const [top] = elements(root)
          if (!has(root, 'PageHeader') && !has(root, 'BillPage')) {
            context.report({ loc: root.loc, message: '页面要有标题行：列表和表内编辑用 PageHeader，整页卡片用 BillPage。' })
          }
          const isPage = top && (top.rawName === 'BillPage' || /(?:^|\s)app-page(?:\s|$)/.test(staticAttr(top, 'class')?.value?.value ?? ''))
          if (!isPage) context.report({ loc: root.loc, message: '页面最外层是 <div class="app-page"> 或 BillPage。' })
        }),
    },
  },
}
