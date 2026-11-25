<script setup lang="ts" generic="Row extends { id: string }">
// 列表：vxe-table + el-pagination。区分“没有数据 / 筛选为空 / 查询失败 / 无权”四种空态。
import { computed, useTemplateRef } from 'vue'
import { VxeColumn, VxeTable, type VxeTableInstance } from 'vxe-table'
import type { ApiError } from '@/api/http'

export interface ListColumn<R> {
  key: Extract<keyof R, string> | (string & {})
  label: string
  width?: number
  minWidth?: number
  fixed?: 'left' | 'right'
  align?: 'left' | 'center' | 'right'
}

const props = withDefaults(
  defineProps<{
    rows: Row[]
    columns: ListColumn<Row>[]
    total: number
    page: number
    size: number
    loading?: boolean
    error?: ApiError | null
    /** 是否带了查询条件，决定空态文案 */
    filtered?: boolean
  }>(),
  { loading: false, error: null, filtered: false },
)

const emit = defineEmits<{ 'update:page': [page: number]; 'update:size': [size: number]; retry: [] }>()

defineSlots<Record<`cell-${string}`, (props: { row: Row }) => unknown>>()

const tableRef = useTemplateRef<VxeTableInstance<Row>>('tableRef')

const emptyText = computed(() => (props.filtered ? '没有符合条件的数据，试试调整查询条件' : '还没有数据'))
// 403 时不能继续显示之前查到的内容
const visibleRows = computed(() => (props.error?.kind === 'forbidden' ? [] : props.rows))

defineExpose({ table: tableRef })
</script>

<template>
  <div class="app-list-table">
    <el-alert
      v-if="error && error.kind !== 'forbidden'"
      class="app-list-error"
      type="error"
      :closable="false"
      :title="error.message"
      show-icon
    >
      <el-button link type="primary" @click="emit('retry')">重新查询</el-button>
      <span v-if="error.traceId" class="app-trace">追踪号 {{ error.traceId }}</span>
    </el-alert>
    <div v-loading="loading" class="app-list-body">
      <VxeTable
        ref="tableRef"
        :data="visibleRows"
        height="100%"
        border="inner"
        :row-config="{ keyField: 'id', isHover: true, isCurrent: true }"
      >
        <VxeColumn
          v-for="c in columns"
          :key="c.key"
          :field="c.key"
          :title="c.label"
          :width="c.width"
          :min-width="c.minWidth"
          :fixed="c.fixed"
          :align="c.align ?? 'left'"
        >
          <template #default="{ row }">
            <slot :name="`cell-${c.key}`" :row="row">{{ (row as Record<string, unknown>)[c.key] ?? '—' }}</slot>
          </template>
        </VxeColumn>
        <template #empty>
          <el-result
            v-if="error?.kind === 'forbidden'"
            icon="error"
            title="没有权限查看"
            :sub-title="error.permission ? `缺少权限：${error.permission}` : '请联系管理员开通'"
          />
          <span v-else-if="error" class="app-list-empty">查询失败，条件已保留</span>
          <span v-else class="app-list-empty">{{ emptyText }}</span>
        </template>
      </VxeTable>
    </div>
    <div class="app-list-foot">
      <el-pagination
        :current-page="page"
        :page-size="size"
        :total="error?.kind === 'forbidden' ? 0 : total"
        :page-sizes="[20, 50, 100, 200]"
        layout="total, sizes, prev, pager, next"
        background
        @update:current-page="(v: number) => emit('update:page', v)"
        @update:page-size="(v: number) => emit('update:size', v)"
      />
    </div>
  </div>
</template>

<style>
.app-list-table {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}
.app-list-error {
  margin-bottom: var(--app-space-2);
}
.app-trace {
  margin-left: var(--app-space-3);
  color: var(--el-text-color-secondary);
}
.app-list-body {
  flex: 1;
  min-height: 0;
}
.app-list-empty {
  color: var(--el-text-color-secondary);
}
.app-list-foot {
  flex: none;
  display: flex;
  justify-content: flex-end;
  padding-top: var(--app-space-3);
}
</style>
