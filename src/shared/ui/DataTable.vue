<script setup lang="ts" generic="Row extends { id: string }">
// 列表：vxe-table + el-pagination。列按类型排宽，四种空态各带下一步入口，加载中不露空态。
import { computed, inject, ref } from 'vue'
import { VxeColumn, VxeTable } from 'vxe-table'
import type { ApiError } from '@/api/http'
import { formatAmount, isNegative } from '@/shared/money/amount'
import { ACTIONS_WIDTH, COLUMN_LAYOUT, densityKey, type DataColumn, type Density } from './columns'

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
  }>(),
  { loading: false, error: null, filtered: false },
)

const emit = defineEmits<{
  'update:page': [page: number]
  'update:size': [size: number]
  retry: []
  'clear-filter': []
}>()

defineSlots<
  { [K in `cell-${string}`]?: (props: { row: Row }) => unknown } & {
    /** 操作列 */
    actions?: (props: { row: Row }) => unknown
    /** 没数据时的下一步，例如新增按钮 */
    'empty-action'?: () => unknown
  }
>()

const density = inject(densityKey, ref<Density>(36))

const forbidden = computed(() => props.error?.kind === 'forbidden')
// 403 时不能继续显示之前查到的内容
const visibleRows = computed(() => (forbidden.value ? [] : props.rows))
/** 查不到数也没有旧数据：条数未知，不显示“共 0 条” */
const unknownTotal = computed(() => props.error !== null && visibleRows.value.length === 0)

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
</script>

<template>
  <!-- 固定列会让每行画三遍，50 行也要虚拟滚动：实测首屏比不开快约三倍 -->
  <div class="app-data-table">
    <el-alert v-if="error && !unknownTotal" class="app-data-error" type="error" :closable="false" show-icon :title="error.message">
      <el-button link type="primary" @click="emit('retry')">重新查询</el-button>
      <span v-if="error.traceId" class="app-data-trace">追踪号 {{ error.traceId }}</span>
    </el-alert>
    <div v-loading="loading" class="app-data-body">
      <VxeTable
        :data="visibleRows"
        height="100%"
        border="inner"
        :row-config="{ keyField: 'id', isHover: true, isCurrent: true }"
        :cell-config="{ height: density }"
        :virtual-y-config="{ enabled: true, gt: 0 }"
      >
        <VxeColumn v-for="c in columns" :key="c.key" :field="c.key" :title="c.label" v-bind="COLUMN_LAYOUT[c.kind]">
          <template #default="{ row }">
            <slot :name="`cell-${c.key}`" :row="row">
              <span :class="{ 'app-num': isNumber(c), 'app-negative': negative(row, c) }">{{ textOf(row, c) }}</span>
            </slot>
          </template>
        </VxeColumn>
        <VxeColumn v-if="$slots.actions" title="操作" :width="ACTIONS_WIDTH" fixed="right" :show-overflow="false">
          <template #default="{ row }"><slot name="actions" :row="row" /></template>
        </VxeColumn>
        <template #empty>
          <div v-if="forbidden" class="app-data-empty">
            <strong>没有权限查看</strong>
            <span>{{ error?.permission ? `缺少权限：${error.permission}` : '请联系管理员开通' }}</span>
          </div>
          <div v-else-if="error" class="app-data-empty">
            <strong>查询失败</strong>
            <span>{{ error.message }}。查询条件已保留</span>
            <span v-if="error.traceId">追踪号 {{ error.traceId }}</span>
            <el-button @click="emit('retry')">重新查询</el-button>
          </div>
          <template v-else-if="!loading">
            <div v-if="filtered" class="app-data-empty">
              <strong>没有符合条件的{{ noun }}</strong>
              <span>换个条件，或清空条件看全部</span>
              <el-button @click="emit('clear-filter')">清空条件</el-button>
            </div>
            <div v-else class="app-data-empty">
              <strong>还没有{{ noun }}</strong>
              <slot name="empty-action" />
            </div>
          </template>
        </template>
      </VxeTable>
    </div>
    <div class="app-data-foot">
      <el-pagination
        v-if="!unknownTotal"
        :current-page="page"
        :page-size="size"
        :total="total"
        :page-sizes="[20, 50, 100, 200]"
        layout="total, ->, sizes, prev, pager, next"
        @update:current-page="(v: number) => emit('update:page', v)"
        @update:page-size="(v: number) => emit('update:size', v)"
      />
    </div>
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
  margin-bottom: var(--app-space-2);
}
.app-data-trace {
  margin-left: var(--app-space-3);
  color: var(--el-text-color-secondary);
}
.app-data-body {
  flex: 1;
  min-height: 0;
}
.app-data-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--app-space-2);
  color: var(--el-text-color-secondary);
}
.app-data-empty strong {
  font-size: var(--app-font-section);
  font-weight: var(--app-font-bold);
  line-height: 24px;
  color: var(--el-text-color-primary);
}
.app-data-foot {
  flex: none;
  min-height: 32px;
  padding-top: var(--app-space-3);
}
.app-negative {
  color: var(--el-color-danger);
}
/* 行操作平时压低，悬停到行才用主题色 */
.app-data-table .app-action-bar .el-button.is-link:not(.is-disabled) {
  color: var(--el-text-color-regular);
}
.app-data-table .row--hover .app-action-bar .el-button.is-link:not(.is-disabled),
.app-data-table .app-action-bar .el-button.is-link:not(.is-disabled):focus-visible {
  color: var(--el-color-primary);
}
</style>
