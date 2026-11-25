<script setup lang="ts">
// 试验二的页面：200 行 × 15 列，8 列可编辑
import { ref, useTemplateRef } from 'vue'
import EditTable from '@/shared/ui/edit-table/EditTable.vue'
import type { EditError } from '@/shared/ui/edit-table/types'
import { makeRows, trialColumns, type TrialRow } from './data'

const rows = ref<TrialRow[]>(makeRows(200, 7))
const table = useTemplateRef<{
  validate(): Promise<EditError[]>
  focusCell(rowId: string, key: string): Promise<void>
  totals: Record<string, string>
}>('table')
const errors = ref<EditError[]>([])

async function runValidate() {
  const started = performance.now()
  errors.value = (await table.value?.validate()) ?? []
  return performance.now() - started
}

;(window as unknown as Record<string, unknown>).__edit = {
  rows: () => JSON.parse(JSON.stringify(rows.value)) as TrialRow[],
  setValue: (rowId: string, key: string, value: string | null) => {
    const row = rows.value.find((r) => r.id === rowId)
    if (row) (row as Record<string, string | null>)[key] = value
  },
  totals: () => ({ ...table.value?.totals }),
  validate: async () => ({ ms: await runValidate(), errors: JSON.parse(JSON.stringify(errors.value)) as EditError[] }),
  focusCell: (rowId: string, key: string) => table.value?.focusCell(rowId, key),
}
</script>

<template>
  <div style="padding: 16px">
    <EditTable ref="table" :rows="rows" :columns="trialColumns" :height="560" />
    <ol data-errors>
      <li v-for="e in errors" :key="`${e.rowId}:${e.key}`">
        <el-button link type="danger" @click="table?.focusCell(e.rowId, e.key)">
          第 {{ e.rowNo }} 行·{{ e.label }}：{{ e.message }}
        </el-button>
      </li>
    </ol>
  </div>
</template>
