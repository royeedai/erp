<script setup lang="ts" generic="Row extends EditRow">
// 可编辑表：vxe-table（免费版）+ EditCell。单据明细和表内编辑共用；键盘规则自己定，不依赖企业版的区域功能。
import { computed, inject, nextTick, provide, ref, useTemplateRef, watch } from 'vue'
import { Setting } from '@element-plus/icons-vue'
import { VxeColumn, VxeTable, type VxeTableInstance, type VxeTablePropTypes } from 'vxe-table'
import { formatAmount, isNegative, sumAmounts } from '@/shared/money/amount'
import ColumnSettings from '../ColumnSettings.vue'
import { CHECK_WIDTH, DEFAULT_DENSITY, densityKey, SEQ_WIDTH, type Density } from '../columns'
import { useScrollSync } from '../useScrollSync'
import { useShownColumns } from '../useShownColumns'
import EditCell from './EditCell.vue'
import {
  editTableKey,
  type CellChange,
  type CellEditor,
  type EditColumn,
  type EditError,
  type EditRow,
  type EditValue,
} from './types'

const props = withDefaults(
  defineProps<{
    rows: Row[]
    columns: EditColumn<Row>[]
    height?: number | string
    readonly?: boolean
    totalLabel?: string
    /** 第一列勾选 */
    selectable?: boolean
    /** 操作列宽 */
    actionsWidth?: number
    /** 记住列设置用的名字，全局唯一；有操作列时表头最右端是列设置 */
    tableKey?: string
    /** 要改的格子：表格上方列出来，点了跳过去 */
    problems?: EditError[]
    loading?: boolean
  }>(),
  { height: 480, readonly: false, totalLabel: '明细合计', selectable: false, actionsWidth: 140, tableKey: undefined, problems: () => [], loading: false },
)

const emit = defineEmits<{ change: [change: CellChange<Row>]; 'reach-end': [] }>()
const selection = defineModel<Row[]>('selection', { default: () => [] })
const slots = defineSlots<
  { [K in `cell-${string}`]?: (props: { row: Row }) => unknown } & {
    /** 操作列 */
    actions?: (props: { row: Row }) => unknown
    empty?: () => unknown
  }
>()

const density = inject(densityKey, ref<Density>(DEFAULT_DENSITY))
const settings = ref(false)
const { shown, shownKeys, defaults, save } = useShownColumns(() => props.columns, () => props.tableKey)

const tableRef = useTemplateRef<VxeTableInstance<Row>>('tableRef')
const { sync } = useScrollSync(tableRef as never, () => shownKeys.value.join())
let editor: CellEditor | null = null

provide(editTableKey, {
  register: (e) => {
    editor = e
  },
  unregister: (e) => {
    if (editor === e) editor = null
  },
  write: (row, key, value) => {
    const target = row as Row
    const k = key as Extract<keyof Row, string>
    const previous = target[k] as EditValue
    ;(target as EditRow)[key] = value
    emit('change', { row: target, key: k, value, previous })
  },
})

/* ---------- 可编辑判断与展示 ---------- */

function canEdit(column: EditColumn<Row>, row: Row): boolean {
  if (props.readonly || !column.editable) return false
  return typeof column.editable === 'function' ? column.editable(row) : true
}

const columnByKey = computed(() => new Map(props.columns.map((c) => [c.key as string, c])))

const optionLabels = computed(() => {
  const maps = new Map<string, Map<string, string>>()
  for (const c of props.columns) {
    if (c.kind === 'select') maps.set(c.key, new Map(c.options?.map((o) => [o.value, o.label])))
  }
  return maps
})

function isNumeric(column: EditColumn<Row>) {
  return column.kind === 'amount' || column.kind === 'quantity'
}

function display(column: EditColumn<Row>, row: Row): string {
  const raw = row[column.key] as EditValue | undefined
  if (column.kind === 'switch') return (column.switchText ?? ['是', '否'])[raw ? 0 : 1]
  const value = raw as string | null | undefined
  if (isNumeric(column)) return formatAmount(value, column.scale ?? 2)
  // 编辑时能填的空格就空着，不写“—”
  if (value === null || value === undefined || value === '') return canEdit(column, row) ? '' : '—'
  if (column.kind === 'select') return optionLabels.value.get(column.key)?.get(value) ?? value
  return value
}

function onSwitch(column: EditColumn<Row>, row: Row, value: boolean) {
  emit('change', { row, key: column.key, value, previous: !value })
}

/* ---------- 勾选与行样式 ---------- */

function syncSelection() {
  selection.value = (tableRef.value?.getCheckboxRecords() ?? []) as Row[]
}
async function clearSelection() {
  await tableRef.value?.clearCheckboxRow()
  syncSelection()
}
// 行没了，勾选也跟着没
watch(
  () => props.rows.map((r) => r.id).join(),
  async () => {
    if (!props.selectable) return
    await nextTick()
    syncSelection()
  },
)

const problemText = computed(() => new Map(props.problems.map((e) => [`${e.rowId}:${e.key}`, e.message])))
function cellClass({ row, column }: { row: Row; column: { field: string } }) {
  const c = columnByKey.value.get(column.field)
  if (!c) return ''
  if (problemText.value.has(`${row.id}:${c.key}`)) return 'app-cell-error'
  return !props.readonly && !canEdit(c, row) ? 'app-cell-readonly' : ''
}

/* ---------- 合计 ---------- */

const totals = computed(() => {
  const result: Record<string, string> = {}
  for (const c of props.columns) {
    if (c.total) result[c.key] = sumAmounts(props.rows.map((r) => r[c.key] as string | null), c.scale ?? 2)
  }
  return result
})

const footerData = computed(() => {
  const line: Record<string, string> = { seq: props.totalLabel }
  for (const c of props.columns) if (c.total) line[c.key] = formatAmount(totals.value[c.key], c.scale ?? 2)
  return [line]
})

/* ---------- 校验 ---------- */

const rules = computed(() => {
  const map: Record<string, VxeTablePropTypes.EditRules[string]> = {}
  for (const c of props.columns) {
    if (!c.editable || (!c.required && !c.validate)) continue
    map[c.key] = [
      {
        required: c.required,
        validator: ({ cellValue, row }: { cellValue: string | null; row: Row }) => {
          if (c.required && (cellValue === null || cellValue === '' || cellValue === undefined)) {
            return new Error(`${c.label}不能为空`)
          }
          const message = c.validate?.(cellValue, row)
          if (message) return new Error(message)
        },
      },
    ]
  }
  return map as VxeTablePropTypes.EditRules
})

async function validate(): Promise<EditError[]> {
  editor?.commit()
  const errMap = await tableRef.value?.fullValidate(props.rows)
  if (!errMap) return []
  const order = new Map(props.columns.map((c, i) => [c.key as string, i]))
  const rowNo = new Map(props.rows.map((r, i) => [r.id, i + 1]))
  const errors: EditError[] = []
  for (const list of Object.values(errMap)) {
    for (const item of list as { row: Row; column: { field: string }; rule: { $options?: unknown; content?: string; message?: string } }[]) {
      const column = columnByKey.value.get(item.column.field)
      errors.push({
        rowId: item.row.id,
        rowNo: rowNo.get(item.row.id) ?? 0,
        key: item.column.field,
        label: column?.label ?? item.column.field,
        message: String(item.rule.content ?? item.rule.message ?? ''),
      })
    }
  }
  return errors.sort((a, b) => a.rowNo - b.rowNo || (order.get(a.key) ?? 0) - (order.get(b.key) ?? 0))
}

/* ---------- 键盘 ---------- */

/**
 * 激活某一格。
 * 不用 setEditCell 自带的滚动：它要等 vxe 的 setTimeout(30ms)，这期间焦点在页面上，
 * 快打字或扫码枪的按键会丢失或落到别的格。这里只触发滚动的同步部分，等一次 nextTick 就激活，
 * 全程在微任务里完成，下一个按键事件插不进来。
 */
async function activate(row: Row, key: string) {
  const table = tableRef.value
  if (!table) return
  void table.scrollToRow(row, key)
  await nextTick()
  // 开关没有编辑态，直接把焦点给它：空格切换，回车到下一格
  if (columnByKey.value.get(key)?.kind === 'switch') {
    await table.clearEdit()
    table.getCellElement(row, key)?.querySelector<HTMLInputElement>('.el-switch__input')?.focus()
    return
  }
  // isPos 在 4.24.4 的源码里有（edit/hook.js 的 setEditCell），类型声明漏写；升级 vxe 时要重跑连按测试
  if (table.getCellElement(row, key)) await table.setEditCell(row, key, { isPos: false } as object)
  else await table.setEditCell(row, key)
}

/**
 * 从表格外面（按钮、错误摘要）跳到一格要几十毫秒：等 vxe 收起旧格子、新行渲染、编辑器挂载后才拿到焦点。
 * 这段时间焦点还在按钮上，按下的字会丢，回车还会再点一次按钮。所以先把按键存着，格子拿到焦点后按顺序补进去：
 * 字补进格子，回车、Tab 照常往下走。输入法正在拼字、带 Ctrl/Alt/⌘ 的、落在别的输入框里的按键不管。
 */
type HeldKey = { text: string } | { step: 1 | -1 }
let held: HeldKey[] | null = null

function holdKey(e: KeyboardEvent) {
  if (!held || e.isComposing || e.ctrlKey || e.altKey || e.metaKey) return
  const target = e.target
  if (target instanceof HTMLElement && (target.isContentEditable || /^(?:INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return
  if (e.key.length === 1) {
    const last = held.at(-1)
    if (last && 'text' in last) last.text += e.key
    else held.push({ text: e.key })
  } else if (e.key === 'Enter' || e.key === 'Tab') {
    held.push({ step: e.shiftKey ? -1 : 1 })
  } else {
    return
  }
  e.preventDefault()
  e.stopPropagation()
}

const rootRef = useTemplateRef<HTMLElement>('rootRef')
/** 等焦点进到表格里的输入框（格子编辑器或开关）；最多等 300ms */
async function focusSettled() {
  for (let waited = 0; waited < 300; waited += 10) {
    const active = document.activeElement
    if (active instanceof HTMLInputElement && rootRef.value?.contains(active)) return
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}

async function focusCell(rowId: string, key: string) {
  const own = held === null
  if (own) {
    held = []
    document.addEventListener('keydown', holdKey, true)
  }
  try {
    // 点表格外的按钮时，vxe 会在这之后才收起正在编辑的格子，马上开新格子会被它清掉焦点：先收完再开
    await tableRef.value?.clearEdit()
    await new Promise((resolve) => setTimeout(resolve, 30))
    const row = props.rows.find((r) => r.id === rowId)
    if (!row) return
    await tableRef.value?.setCurrentRow(row)
    await activate(row, key)
    if (!own) return
    // 按存下的顺序补；补的过程中新按的键也继续存着，直到全部补完才放手
    for (;;) {
      await focusSettled()
      const next = held?.shift()
      if (!next) break
      if ('text' in next) editor?.insert(next.text)
      else await move(next.step, switchCell(document.activeElement) ?? undefined)
    }
  } finally {
    if (own) {
      document.removeEventListener('keydown', holdKey, true)
      held = null
    }
  }
}

/** 当前格之后（或之前）的下一个可编辑格，跨行 */
function nextEditable(row: Row, key: string, step: 1 | -1): { row: Row; key: string } | null {
  let r = props.rows.indexOf(row)
  if (r === -1) r = props.rows.findIndex((x) => x.id === row.id)
  let c = props.columns.findIndex((x) => x.key === key)
  while (r >= 0 && r < props.rows.length) {
    c += step
    if (c < 0 || c >= props.columns.length) {
      r += step
      c = step > 0 ? -1 : props.columns.length
      continue
    }
    const targetRow = props.rows[r]
    const column = props.columns[c]
    if (targetRow && column && canEdit(column, targetRow)) return { row: targetRow, key: column.key }
  }
  return null
}

async function move(step: 1 | -1, from?: { row: Row; key: string }) {
  const cell = tableRef.value?.getEditCell()
  const at = from ?? (cell ? { row: cell.row as Row, key: cell.column.field } : null)
  if (!at) return
  editor?.commit()
  const next = nextEditable(at.row, at.key, step)
  if (next) {
    await activate(next.row, next.key)
  } else {
    await tableRef.value?.clearEdit()
    if (step > 0) emit('reach-end')
  }
}

async function cancel() {
  const cell = tableRef.value?.getEditCell()
  if (!cell) return
  editor?.cancel()
  await tableRef.value?.clearEdit()
  await nextTick()
  await tableRef.value?.setSelectCell(cell.row, cell.column)
}

/** 焦点在哪一行哪一列的开关上 */
function switchCell(target: EventTarget | null): { row: Row; key: string } | null {
  const td = target instanceof HTMLElement && target.classList.contains('el-switch__input') ? target.closest('td') : null
  const tr = td?.closest('tr')
  const row = tr ? tableRef.value?.getRowNode(tr)?.item : undefined
  const column = td ? tableRef.value?.getColumnNode(td)?.item : undefined
  return row && column ? { row: row as Row, key: column.field } : null
}

function onKeydown(e: KeyboardEvent) {
  if (e.isComposing || e.altKey || e.ctrlKey || e.metaKey) return
  const onSwitch = e.key === 'Enter' || e.key === 'Tab' ? switchCell(e.target) : null
  if (onSwitch) {
    e.preventDefault()
    e.stopPropagation()
    void move(e.shiftKey ? -1 : 1, onSwitch)
    return
  }
  if (!editor) return
  if (e.key === 'Enter' || e.key === 'Tab') {
    if (e.key === 'Enter' && editor.ownsEnter()) return
    e.preventDefault()
    e.stopPropagation()
    void move(e.shiftKey ? -1 : 1)
  } else if (e.key === 'Escape') {
    if (editor.isPopupOpen()) return
    e.preventDefault()
    e.stopPropagation()
    void cancel()
  }
}

const editConfig: VxeTablePropTypes.EditConfig<Row> = {
  trigger: 'click',
  mode: 'cell',
  showIcon: false,
  // 星号自己画：浏览时不显示，编辑时才带
  showAsterisk: false,
  showStatus: false,
  autoClear: true,
  isReuseKeep: false,
  beforeEditMethod: ({ row, column }) => {
    const c = columnByKey.value.get(column.field)
    return !!c && canEdit(c, row)
  },
}

defineExpose({ validate, focusCell, totals, clearSelection, commit: () => editor?.commit() })
</script>

<template>
  <div ref="rootRef" class="app-edit-table app-grid" :class="{ 'is-editing': !readonly }" :style="{ '--app-row-height': `${density}px` }" @keydown.capture="onKeydown">
    <div v-if="problems.length > 0" class="app-edit-problems" role="alert">
      <b>有 {{ problems.length }} 处要改</b>
      <button v-for="e in problems" :key="`${e.rowId}:${e.key}`" type="button" @click="focusCell(e.rowId, e.key)">
        第 {{ e.rowNo }} 行·{{ e.label }}：{{ e.message }}
      </button>
    </div>
    <div v-loading="loading" class="app-edit-body">
      <VxeTable
        ref="tableRef"
        :data="rows"
        :height="height"
        border
        :row-config="{ keyField: 'id', isHover: true, isCurrent: true }"
        :cell-config="{ height: density }"
        :header-cell-config="{ height: 25 }"
        :footer-cell-config="{ height: 25 }"
        :checkbox-config="{ highlight: true }"
        :cell-class-name="cellClass"
        :edit-config="editConfig"
        :edit-rules="rules"
        :valid-config="{ autoPos: false, autoClear: false, msgMode: 'full', showErrorBackground: true, showMessage: false }"
        :mouse-config="{ selected: true }"
        :keyboard-config="{ isArrow: true, isEdit: true, isEsc: false }"
        :virtual-y-config="{ enabled: true, gt: 30 }"
        :virtual-x-config="{ enabled: false }"
        :show-footer="Object.keys(totals).length > 0"
        :footer-data="footerData"
        @column-resizable-change="sync"
        @checkbox-change="syncSelection"
        @checkbox-all="syncSelection"
      >
        <VxeColumn v-if="selectable" type="checkbox" :width="CHECK_WIDTH" align="center" fixed="left" />
        <VxeColumn type="seq" field="seq" title="序号" :width="SEQ_WIDTH" fixed="left" />
        <VxeColumn
          v-for="c in shown"
          :key="c.key"
          :field="c.key"
          :title="c.label"
          :width="c.width"
          :min-width="c.minWidth"
          :fixed="c.fixed"
          :align="isNumeric(c) ? 'right' : 'left'"
          :edit-render="c.editable && c.kind !== 'switch' ? {} : undefined"
          :header-class-name="!readonly && c.editable && c.required ? 'app-col-required' : undefined"
          :class-name="isNumeric(c) ? 'app-num' : undefined"
          :footer-class-name="isNumeric(c) ? 'app-num' : undefined"
        >
          <template #default="{ row }">
            <slot :name="`cell-${c.key}`" :row="row">
              <el-switch
                v-if="c.kind === 'switch' && canEdit(c, row)"
                v-model="row[c.key]"
                :aria-label="c.label"
                @change="(v) => onSwitch(c, row, v === true)"
              />
              <span v-else :class="{ 'app-negative': isNumeric(c) && isNegative(row[c.key]) }" :title="problemText.get(`${row.id}:${c.key}`)">{{ display(c, row) }}</span>
            </slot>
          </template>
          <template #edit="{ row }">
            <EditCell :key="`${row.id}:${c.key}`" :column="c as unknown as EditColumn" :row="row" />
          </template>
        </VxeColumn>
        <VxeColumn v-if="slots.actions" min-width="10" />
        <VxeColumn v-if="slots.actions" title="操作" :width="actionsWidth" fixed="right" :show-overflow="false">
          <template #header>
            操作
            <button type="button" class="app-table-gear" aria-label="表格设置" title="表格设置" @click="settings = true"><el-icon><Setting /></el-icon></button>
          </template>
          <template #default="{ row }"><span class="app-edit-actions"><slot name="actions" :row="row" /></span></template>
        </VxeColumn>
        <template #empty><slot name="empty" /></template>
      </VxeTable>
    </div>
    <ColumnSettings v-if="slots.actions" v-model="settings" :columns="columns" :shown="shownKeys" :defaults="defaults" @save="save" />
  </div>
</template>

<style>
.app-edit-table {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.app-edit-body {
  flex: 1;
  min-height: 0;
}
.app-edit-problems {
  flex: none;
  max-height: 62px;
  display: flex;
  flex-wrap: wrap;
  gap: 2px var(--app-space-4);
  padding: 5px 12px;
  overflow: auto;
  background: var(--app-status-fail-bg);
  color: var(--app-status-fail-fg);
}
.app-edit-problems button {
  padding: 0;
  border: none;
  background: none;
  font-size: 12px;
  line-height: 18px;
  color: inherit;
  text-decoration: underline;
  cursor: pointer;
}
.app-grid .app-cell-error {
  box-shadow: 0 0 0 1px var(--el-color-danger) inset;
}
.app-edit-actions {
  display: inline-flex;
  align-items: center;
  gap: var(--app-space-3);
}
.app-edit-actions .el-button + .el-button {
  margin-left: 0;
}
.app-grid .vxe-body--column .el-switch {
  vertical-align: top;
}
</style>
