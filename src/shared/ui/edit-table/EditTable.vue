<script setup lang="ts" generic="Row extends EditRow">
// 可编辑明细：vxe-table（免费版）+ EditCell。键盘规则自己定，不依赖企业版的区域功能。
import { computed, nextTick, provide, useTemplateRef } from 'vue'
import { VxeColumn, VxeTable, type VxeTableInstance, type VxeTablePropTypes } from 'vxe-table'
import { formatAmount, isNegative, sumAmounts } from '@/shared/money/amount'
import EditCell from './EditCell.vue'
import {
  editTableKey,
  type CellChange,
  type CellEditor,
  type EditColumn,
  type EditError,
  type EditRow,
} from './types'

const props = withDefaults(
  defineProps<{
    rows: Row[]
    columns: EditColumn<Row>[]
    height?: number | string
    readonly?: boolean
    totalLabel?: string
  }>(),
  { height: 480, readonly: false, totalLabel: '明细合计' },
)

const emit = defineEmits<{ change: [change: CellChange<Row>]; 'reach-end': [] }>()

const tableRef = useTemplateRef<VxeTableInstance<Row>>('tableRef')
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
    const previous = target[k] as string | null
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
  const value = row[column.key] as string | null | undefined
  if (isNumeric(column)) return formatAmount(value, column.scale ?? 2)
  if (value === null || value === undefined || value === '') return '—'
  if (column.kind === 'select') return optionLabels.value.get(column.key)?.get(value) ?? value
  return value
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
  // isPos 在 4.24.4 的源码里有（edit/hook.js 的 setEditCell），类型声明漏写；升级 vxe 时要重跑连按测试
  if (table.getCellElement(row, key)) await table.setEditCell(row, key, { isPos: false } as object)
  else await table.setEditCell(row, key)
}

async function focusCell(rowId: string, key: string) {
  const row = props.rows.find((r) => r.id === rowId)
  if (row) await activate(row, key)
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

async function move(step: 1 | -1) {
  const cell = tableRef.value?.getEditCell()
  if (!cell) return
  editor?.commit()
  const next = nextEditable(cell.row, cell.column.field, step)
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

function onKeydown(e: KeyboardEvent) {
  if (e.isComposing || e.altKey || e.ctrlKey || e.metaKey || !editor) return
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
  showStatus: false,
  autoClear: true,
  isReuseKeep: false,
  beforeEditMethod: ({ row, column }) => {
    const c = columnByKey.value.get(column.field)
    return !!c && canEdit(c, row)
  },
}

defineExpose({ validate, focusCell, totals, commit: () => editor?.commit() })
</script>

<template>
  <div class="app-edit-table" @keydown.capture="onKeydown">
    <VxeTable
      ref="tableRef"
      :data="rows"
      :height="height"
      border
      :row-config="{ keyField: 'id', isHover: true }"
      :cell-config="{ height: 36 }"
      :edit-config="editConfig"
      :edit-rules="rules"
      :valid-config="{ autoPos: false, autoClear: false, msgMode: 'full', showErrorBackground: true }"
      :mouse-config="{ selected: true }"
      :keyboard-config="{ isArrow: true, isEdit: true, isEsc: false }"
      :virtual-y-config="{ enabled: true, gt: 30 }"
      :virtual-x-config="{ enabled: false }"
      :show-footer="Object.keys(totals).length > 0"
      :footer-data="footerData"
    >
      <VxeColumn type="seq" field="seq" title="序号" width="64" fixed="left" align="center" />
      <VxeColumn
        v-for="c in columns"
        :key="c.key"
        :field="c.key"
        :title="c.label"
        :width="c.width"
        :min-width="c.minWidth"
        :fixed="c.fixed"
        :align="isNumeric(c) ? 'right' : 'left'"
        :edit-render="c.editable ? {} : undefined"
        :class-name="isNumeric(c) ? 'app-num' : undefined"
        :footer-class-name="isNumeric(c) ? 'app-num' : undefined"
      >
        <template #default="{ row }">
          <span :class="{ 'is-negative': isNumeric(c) && isNegative(row[c.key]) }">{{ display(c, row) }}</span>
        </template>
        <template #edit="{ row }">
          <EditCell :key="`${row.id}:${c.key}`" :column="c as unknown as EditColumn" :row="row" />
        </template>
      </VxeColumn>
    </VxeTable>
  </div>
</template>

<style>
.app-edit-table .app-num {
  font-variant-numeric: tabular-nums;
}
.app-edit-table .is-negative {
  color: var(--el-color-danger);
}
</style>
