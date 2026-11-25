<script setup lang="ts">
// 表格：勾选、序号、数据列、操作列，列设置在表头最右端；可整表进入编辑；合计固定在最下面一行。
import { computed, nextTick, ref, useSlots, useTemplateRef } from 'vue'
import { VxeColumn, VxeTable, type VxeTableInstance } from 'vxe-table'
import { Setting } from '@element-plus/icons-vue'
import ColumnDrawer from './ColumnDrawer.vue'

export interface Col {
  key: string
  title: string
  width?: number
  align?: 'left' | 'right'
  /** 编辑时：文本、开关；不写就是只读 */
  edit?: 'text' | 'switch'
  required?: boolean
  fixed?: 'left'
  num?: boolean
}

type AnyRow = { id: string } & Record<string, unknown>

const props = withDefaults(
  defineProps<{
    rows: AnyRow[]
    cols: Col[]
    editing?: boolean
    opsWidth?: number
    total?: Record<string, string> | null
    noun?: string
    /** 没数据时给的说明 */
    emptyText?: string
    emptyNote?: string
    /** 出错的格子：行号:列名 */
    bad?: string[]
  }>(),
  { editing: false, opsWidth: 188, total: null, noun: '数据', emptyText: '暂无数据', emptyNote: '', bad: () => [] },
)
const emit = defineEmits<{ selection: [rows: AnyRow[]]; change: [row: AnyRow, key: string]; open: [row: AnyRow] }>()
const slots = useSlots()

const table = useTemplateRef<VxeTableInstance>('table')
const drawer = ref(false)
const shown = ref(props.cols.map((c) => c.key))
const visible = computed(() => shown.value.flatMap((k) => props.cols.find((c) => c.key === k) ?? []))

function emitSelection() {
  emit('selection', (table.value?.getCheckboxRecords() ?? []) as AnyRow[])
}
const isBad = (row: AnyRow, key: string) => props.bad.includes(`${row.id}:${key}`)
const badClass = ({ row, column }: { row: AnyRow; column: { field: string } }) => (isBad(row, column.field) ? 'r-bad' : '')
const isReadonly = (c: Col) => props.editing && !c.edit

async function focusCell(row: AnyRow, key: string) {
  // 点表格外的按钮时，vxe 会在这之后才收起正在编辑的格子；先收完再开，不然焦点会被它清掉
  await table.value?.clearEdit()
  await new Promise((r) => setTimeout(r, 30))
  await openCell(row, key)
}
/** 键盘跳格走这里：全程在微任务里，下一个按键插不进来 */
async function openCell(row: AnyRow, key: string) {
  await table.value?.setCurrentRow(row)
  void table.value?.scrollToRow(row, key)
  await nextTick()
  await table.value?.setEditCell(row, key, { isPos: false } as object)
  await nextTick()
  const el = table.value?.$el as HTMLElement | undefined
  el?.querySelector<HTMLInputElement>('.vxe-body--column .el-input__inner')?.focus()
}
function clear() {
  void table.value?.clearCheckboxRow()
  void table.value?.clearEdit()
  emitSelection()
}
async function toNext(row: AnyRow, key: string) {
  const editable = visible.value.filter((c) => c.edit === 'text').map((c) => c.key)
  const i = editable.indexOf(key)
  const nextKey = editable[i + 1]
  if (nextKey) return openCell(row, nextKey)
  const next = props.rows[props.rows.findIndex((r) => r.id === row.id) + 1]
  if (next && editable[0]) return openCell(next, editable[0])
  await table.value?.clearEdit()
}
defineExpose({ focusCell, clear })
</script>

<template>
  <div class="r-grid" :class="{ 'is-editing': editing }">
    <VxeTable
      ref="table"
      :data="rows"
      height="100%"
      border
      :row-config="{ keyField: 'id', isHover: true, isCurrent: true }"
      :cell-config="{ height: 24 }"
      :header-cell-config="{ height: 25 }"
      :footer-cell-config="{ height: 24 }"
      :checkbox-config="{ highlight: true }"
      :edit-config="{ trigger: 'click', mode: 'cell', showIcon: false, enabled: editing, autoClear: true }"
      :cell-class-name="badClass"
      :virtual-y-config="{ enabled: true, gt: 0 }"
      :show-footer="total !== null"
      :footer-data="total ? [total] : []"
      :show-footer-overflow="false"
      :merge-footer-items="total ? [{ row: 0, col: 0, rowspan: 1, colspan: 2 }] : []"
      @checkbox-change="emitSelection"
      @checkbox-all="emitSelection"
      @cell-dblclick="({ row }: { row: AnyRow }) => emit('open', row)"
    >
      <VxeColumn type="checkbox" width="45" align="center" fixed="left" :field="total ? '__label' : undefined" />
      <VxeColumn type="seq" title="序号" width="60" fixed="left" />
      <VxeColumn
        v-for="c in visible"
        :key="c.key"
        :field="c.key"
        :title="c.title"
        :width="c.width ?? 120"
        :align="c.align ?? 'left'"
        :fixed="c.fixed"
        :header-class-name="editing && c.required ? 'r-req' : ''"
        :class-name="isReadonly(c) ? 'r-ro' : c.num ? 'r-num' : ''"
        :edit-render="c.edit === 'text' ? {} : undefined"
      >
        <template #default="{ row }">
          <slot :name="`cell-${c.key}`" :row="row">
            <el-switch v-if="c.edit === 'switch' && editing" v-model="row[c.key]" :aria-label="c.title" @change="emit('change', row, c.key)" />
            <template v-else-if="c.edit === 'switch'">{{ row[c.key] ? (c.key === 'enabled' ? '已启用' : '是') : c.key === 'enabled' ? '已停用' : '否' }}</template>
            <template v-else>{{ row[c.key] }}</template>
          </slot>
        </template>
        <template v-if="c.edit === 'text'" #edit="{ row }">
          <el-input v-model="row[c.key]" :aria-label="c.title" autocomplete="off" @input="emit('change', row, c.key)" @keydown.enter.stop.prevent="toNext(row, c.key)" />
        </template>
      </VxeColumn>
      <VxeColumn min-width="10" />
      <VxeColumn v-if="slots.ops" title="操作" :width="opsWidth" fixed="right" :show-overflow="false">
        <template #header>
          操作
          <button type="button" class="r-gear" aria-label="列设置" title="列设置" @click="drawer = true"><el-icon><Setting /></el-icon></button>
        </template>
        <template #default="{ row }"><span class="r-ops"><slot name="ops" :row="row" /></span></template>
      </VxeColumn>
      <template #empty>
        <div class="r-empty">
          <svg width="22" height="26" viewBox="0 0 22 26" fill="none" aria-hidden="true">
            <rect x="1.5" y="3.5" width="19" height="21" rx="2.5" fill="#F3F1F7" stroke="#CFCDD6" />
            <rect x="7" y="1" width="8" height="5" rx="1.5" fill="#DDDBE4" />
            <path d="M6 11h10M6 15h10M6 19h6" stroke="#CFCDD6" stroke-width="1.4" />
          </svg>
          <span>{{ emptyText }}<em v-if="emptyNote">{{ emptyNote }}</em><slot name="empty" /></span>
        </div>
      </template>
    </VxeTable>
    <ColumnDrawer v-model="drawer" v-model:shown="shown" :cols="cols" />
  </div>
</template>

<style>
.r-empty { display: flex; align-items: center; justify-content: center; gap: 12px; color: var(--r-text-3); }
.r-empty em { display: block; font-style: normal; color: var(--r-text-4); }
</style>
