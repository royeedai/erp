<script setup lang="ts" generic="Row extends { id: string }">
// 列表：vxe-table + el-pagination。勾选、序号、按类型排宽的列、操作列、列设置、合计行、底部；五种空态各带下一步入口，加载中不露空态。
import { computed, inject, nextTick, ref, useTemplateRef, watch } from 'vue'
import { VxeColumn, VxeTable, type VxeTableInstance } from 'vxe-table'
import { Setting } from '@element-plus/icons-vue'
import type { ApiError } from '@/api/http'
import { formatAmount, isNegative } from '@/shared/money/amount'
import ColumnSettings from './ColumnSettings.vue'
import { ACTIONS_WIDTH, CHECK_WIDTH, COLUMN_LAYOUT, DEFAULT_DENSITY, densityKey, GEAR_WIDTH, SEQ_WIDTH, type DataColumn, type Density } from './columns'
import EmptyHint from './EmptyHint.vue'
import { useScrollSync } from './useScrollSync'
import { useShownColumns } from './useShownColumns'

const props = withDefaults(
  defineProps<{
    rows: Row[]
    columns: DataColumn<Row>[]
    total: number
    page: number
    size: number
    /** 数据的名称，用在空态里，例如“岗位” */
    noun: string
    loading?: boolean
    error?: ApiError | null
    /** 是否带了查询条件，决定空态 */
    filtered?: boolean
    /** 没填的必填条件；非空表示没有执行查询 */
    missing?: string[]
    /** 合计行：写明范围，例如“本页合计”；键是列名，值是算好的文字 */
    summary?: { label: string; values: Record<string, string> } | null
    /** 记住列设置用的名字，全局唯一 */
    tableKey?: string
  }>(),
  { loading: false, error: null, filtered: false, missing: () => [], summary: null, tableKey: undefined },
)

const emit = defineEmits<{
  'update:page': [page: number]
  'update:size': [size: number]
  retry: []
  'clear-filter': []
  'row-open': [row: Row]
}>()
const selection = defineModel<Row[]>('selection', { default: () => [] })

const slots = defineSlots<
  { [K in `cell-${string}`]?: (props: { row: Row }) => unknown } & {
    /** 操作列 */
    actions?: (props: { row: Row }) => unknown
    /** 没数据时的下一步，例如新增按钮 */
    'empty-action'?: () => unknown
  }
>()

const tableRef = useTemplateRef<VxeTableInstance<Row>>('tableRef')
const density = inject(densityKey, ref<Density>(DEFAULT_DENSITY))
const settings = ref(false)
const { shown, shownKeys, defaults, save } = useShownColumns(() => props.columns, () => props.tableKey)
const { sync } = useScrollSync(tableRef as never, () => shownKeys.value.join())

/** 只有排在最前面的一段才固定，中间的名称列不固定 */
const layouts = computed(() => {
  let leading = true
  return shown.value.map((c) => {
    const layout = COLUMN_LAYOUT[c.kind]
    leading &&= layout.fixed === 'left'
    return { column: c, layout: leading ? layout : { ...layout, fixed: undefined } }
  })
})

const forbidden = computed(() => props.error?.kind === 'forbidden')
const notQueried = computed(() => props.missing.length > 0)
// 403 和缺条件时不能继续显示之前查到的内容
const visibleRows = computed(() => (forbidden.value || notQueried.value ? [] : props.rows))
/** 没查、查不到数也没有旧数据：条数未知，不显示“共 0 条” */
const unknownTotal = computed(() => notQueried.value || (props.error !== null && visibleRows.value.length === 0))

const footer = computed(() => (props.summary ? [{ _label: props.summary.label, ...props.summary.values }] : []))

function syncSelection() {
  selection.value = (tableRef.value?.getCheckboxRecords() ?? []) as Row[]
}
async function clearSelection() {
  await tableRef.value?.clearCheckboxRow()
  syncSelection()
}
// 换了一批数据，勾选就作废
watch(visibleRows, async () => {
  if (selection.value.length === 0) return
  await nextTick()
  await clearSelection()
})

function valueOf(row: Row, c: DataColumn<Row>): unknown {
  return row[c.key]
}
function textOf(row: Row, c: DataColumn<Row>): string {
  if (c.text) return c.text(row) || '—'
  const value = valueOf(row, c)
  if (c.kind === 'amount') return formatAmount(value as string | null, c.scale)
  return value === null || value === undefined || value === '' ? '—' : String(value)
}
const isNumber = (c: DataColumn<Row>) => c.kind === 'amount' || c.kind === 'count'
const negative = (row: Row, c: DataColumn<Row>) => c.kind === 'amount' && isNegative(valueOf(row, c) as string | null)

defineExpose({ clearSelection })
</script>

<template>
  <!-- 固定列会让每行画三遍，50 行也要虚拟滚动：实测首屏比不开快约三倍 -->
  <div class="app-data-table">
    <el-alert v-if="error && !unknownTotal" class="app-data-error" type="error" :closable="false" show-icon :title="error.message">
      <el-button link @click="emit('retry')">重新查询</el-button>
      <span v-if="error.traceId" class="app-data-trace">追踪号 {{ error.traceId }}</span>
    </el-alert>
    <div v-loading="loading" class="app-data-body app-grid">
      <VxeTable
        ref="tableRef"
        :data="visibleRows"
        height="100%"
        border
        :row-config="{ keyField: 'id', isHover: true, isCurrent: true }"
        :cell-config="{ height: density }"
        :header-cell-config="{ height: 25 }"
        :footer-cell-config="{ height: 25 }"
        :checkbox-config="{ highlight: true }"
        :seq-config="{ startIndex: (page - 1) * size }"
        :virtual-y-config="{ enabled: true, gt: 0 }"
        :show-footer="summary !== null && visibleRows.length > 0"
        :footer-data="footer"
        :merge-footer-items="summary ? [{ row: 0, col: 0, rowspan: 1, colspan: 2 }] : []"
        @checkbox-change="syncSelection"
        @checkbox-all="syncSelection"
        @column-resizable-change="sync"
        @cell-dblclick="({ row }: { row: Row }) => emit('row-open', row)"
      >
        <VxeColumn type="checkbox" field="_label" :width="CHECK_WIDTH" align="center" footer-align="left" fixed="left" />
        <VxeColumn type="seq" title="序号" :width="SEQ_WIDTH" fixed="left" />
        <VxeColumn
          v-for="{ column: c, layout } in layouts"
          :key="c.key"
          :field="c.key"
          :title="c.label"
          v-bind="layout"
          :class-name="isNumber(c) ? 'app-num' : undefined"
          :footer-class-name="isNumber(c) ? 'app-num' : undefined"
        >
          <template #default="{ row }">
            <slot :name="`cell-${c.key}`" :row="row">
              <span :class="{ 'app-negative': negative(row, c) }">{{ textOf(row, c) }}</span>
            </slot>
          </template>
        </VxeColumn>
        <VxeColumn min-width="10" />
        <VxeColumn :title="slots.actions ? '操作' : ''" :width="slots.actions ? ACTIONS_WIDTH : GEAR_WIDTH" fixed="right" :show-overflow="false">
          <template #header>
            {{ slots.actions ? '操作' : '' }}
            <button type="button" class="app-table-gear" aria-label="表格设置" title="表格设置" @click="settings = true"><el-icon><Setting /></el-icon></button>
          </template>
          <template #default="{ row }"><slot name="actions" :row="row" /></template>
        </VxeColumn>
        <template #empty>
          <EmptyHint v-if="forbidden" title="没有权限查看" :note="error?.permission ? `缺少权限：${error.permission}` : '请联系管理员开通'" />
          <EmptyHint v-else-if="notQueried" title="还没有查询" :note="`先填${missing.join('、')}，再点查询`" />
          <EmptyHint v-else-if="error" title="查询失败" :note="`${error.message}。查询条件已保留${error.traceId ? `，追踪号 ${error.traceId}` : ''}`">
            <el-button @click="emit('retry')">重新查询</el-button>
          </EmptyHint>
          <template v-else-if="!loading">
            <EmptyHint v-if="filtered" :title="`没有符合条件的${noun}`" note="换个条件，或清空条件看全部">
              <el-button @click="emit('clear-filter')">清空条件</el-button>
            </EmptyHint>
            <EmptyHint v-else :title="`还没有${noun}`"><slot name="empty-action" /></EmptyHint>
          </template>
        </template>
      </VxeTable>
    </div>
    <div class="app-data-foot">
      <span>已选 {{ selection.length }} 条</span>
      <el-pagination
        v-if="!unknownTotal"
        :current-page="page"
        :page-size="size"
        :total="total"
        :page-sizes="[20, 50, 100, 200]"
        layout="total, prev, pager, next, sizes, jumper"
        @update:current-page="(v: number) => emit('update:page', v)"
        @update:page-size="(v: number) => emit('update:size', v)"
      />
    </div>
    <ColumnSettings v-model="settings" :columns="columns" :shown="shownKeys" :defaults="defaults" @save="save" />
  </div>
</template>

<style>
.app-data-table {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}
.app-data-error {
  flex: none;
}
.app-data-trace {
  margin-left: var(--app-space-3);
  color: var(--el-text-color-secondary);
}
.app-data-body {
  flex: 1;
  min-height: 0;
}
.app-data-foot {
  box-sizing: border-box;
  height: var(--app-foot-height);
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 30px;
  border-top: 1px solid var(--app-row-line);
  background: var(--app-bg-container);
}
.app-data-foot .el-pagination {
  --el-pagination-font-size: 12px;
  --el-pagination-button-width: 18px;
  --el-pagination-button-height: 18px;
  --el-pagination-hover-color: var(--app-accent);
  gap: 6px;
  color: var(--el-text-color-regular);
}
.app-data-foot .el-pagination > * {
  margin: 0;
}
.app-data-foot .el-pager li {
  margin: 0 3px;
  padding: 0 3px;
  border-radius: var(--app-radius-control);
  font-size: 12px;
  font-weight: 400;
}
.app-data-foot .el-pager li.is-active {
  background: var(--app-page-current);
  color: var(--app-bg-container);
}
.app-data-foot .el-pagination__sizes .el-select {
  width: 90px;
}
.app-data-foot .el-pagination__jump,
.app-data-foot .el-pagination__total {
  font-size: 12px;
}
.app-data-foot .el-pagination__editor.el-input {
  width: 46px;
}
/* 行操作平时是链接色，禁用的灰掉 */
.app-data-table .app-action-bar {
  gap: var(--app-space-3);
}
</style>
