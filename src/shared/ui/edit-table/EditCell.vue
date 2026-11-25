<script setup lang="ts">
// 单元格编辑器：自己持有草稿，按键只更新这一格；确认（Enter/Tab/点别处）才写回行数据，Esc 丢弃。
import { inject, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import AmountInput from '../AmountInput.vue'
import { editTableKey, type CellEditor, type EditColumn, type EditRow } from './types'

const props = defineProps<{ column: EditColumn; row: EditRow }>()

const table = inject(editTableKey)
if (!table) throw new Error('EditCell 只能在 EditTable 内使用')

const root = useTemplateRef<HTMLElement>('root')
const initial = props.row[props.column.key] ?? null
const draft = ref<string | null>(initial)
// 行和列在激活期间固定下来：表格滚动复用节点时 props 可能先于卸载变化
const row = props.row
const key = props.column.key
let finished = false

const editor: CellEditor = {
  commit() {
    if (finished) return
    // 日期框的键入文本要失焦才会解析，先让它失焦
    const active = document.activeElement
    if (active instanceof HTMLElement && root.value?.contains(active)) active.blur()
    finished = true
    const value = draft.value === '' ? null : draft.value
    if (value !== initial) table.write(row, key, value)
  },
  cancel() {
    finished = true
  },
  isPopupOpen() {
    return !!root.value?.querySelector('[aria-expanded="true"]')
  },
  ownsEnter() {
    return props.column.kind === 'select' && editor.isPopupOpen()
  },
}

onMounted(async () => {
  table.register(editor)
  // el-input 的焦点监听要等它自己挂载完才接上，同一拍里聚焦会丢事件
  await nextTick()
  const input = root.value?.querySelector<HTMLInputElement>('input')
  if (!input || finished) return
  input.focus()
  if (props.column.kind === 'text' || props.column.kind === 'code') input.select()
})
onBeforeUnmount(() => {
  // 点到别的格子、滚出可视区：视为确认
  editor.commit()
  table.unregister(editor)
})
</script>

<template>
  <div ref="root" class="app-edit-cell">
    <AmountInput
      v-if="column.kind === 'amount' || column.kind === 'quantity'"
      v-model="draft"
      :scale="column.scale ?? 2"
      :max-integer="column.maxInteger ?? 20"
      :allow-negative="column.allowNegative ?? true"
    />
    <el-select v-else-if="column.kind === 'select'" v-model="draft" filterable default-first-option :empty-values="[null, undefined]">
      <el-option v-for="o in column.options" :key="o.value" :value="o.value" :label="o.label" />
    </el-select>
    <el-date-picker
      v-else-if="column.kind === 'date'"
      v-model="draft"
      type="date"
      value-format="YYYY-MM-DD"
      format="YYYY-MM-DD"
      :automatic-dropdown="false"
      :clearable="false"
    />
    <el-input v-else v-model="draft" autocomplete="off" :validate-event="false" />
  </div>
</template>

<style>
.app-edit-cell {
  width: 100%;
}
.app-edit-cell .el-select,
.app-edit-cell .el-date-editor.el-input {
  width: 100%;
}
</style>
