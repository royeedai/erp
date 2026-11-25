<script setup lang="ts">
// 试验一的页面：表头表单 + 200 行可编辑明细。同一组件开多张单据。
import { onActivated, onDeactivated, onMounted, onUnmounted, reactive, ref, useTemplateRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useTab } from '@/app/tabs/tabHost'
import AmountInput from '@/shared/ui/AmountInput.vue'
import EditTable from '@/shared/ui/edit-table/EditTable.vue'
import { makeRows, trialColumns, type TrialRow } from './data'
import { afterPaint, logOf, probe, track } from './probe'

const route = useRoute()
const tab = useTab()
const id = String(route.params.id)
const log = logOf(id)

const form = reactive({
  vendor: '',
  project: '',
  contract: '',
  bankAccount: '',
  amount: null as string | null,
  payDate: '',
  method: 'TT',
  reason: '',
  remark1: '',
  remark2: '',
})
const rows = ref<TrialRow[]>(makeRows(200, Number(id) + 1))
const table = useTemplateRef<{ focusCell(rowId: string, key: string): Promise<void> }>('table')

track(rows.value)
tab.setTitle(`付款申请 ${id}`)
watch(form, () => tab.setDirty(true), { deep: true })
watch(
  () => route.fullPath,
  () => log.routeChanges++,
)
onMounted(() => log.mounted++)
onUnmounted(() => log.unmounted++)
onActivated(() => {
  log.activated++
  afterPaint((at) => (probe.lastPaint = { key: id, at }))
})
onDeactivated(() => log.deactivated++)

defineExpose({ table })
</script>

<template>
  <div class="bill" :data-bill="id">
    <el-form label-width="90px" class="bill-form">
      <el-form-item label="供应商"><el-input v-model="form.vendor" data-field="vendor" /></el-form-item>
      <el-form-item label="项目"><el-input v-model="form.project" /></el-form-item>
      <el-form-item label="合同"><el-input v-model="form.contract" /></el-form-item>
      <el-form-item label="银行账号"><el-input v-model="form.bankAccount" /></el-form-item>
      <el-form-item label="申请金额"><AmountInput v-model="form.amount" data-field="amount" /></el-form-item>
      <el-form-item label="付款日期">
        <el-date-picker v-model="form.payDate" type="date" value-format="YYYY-MM-DD" />
      </el-form-item>
      <el-form-item label="付款方式">
        <el-select v-model="form.method">
          <el-option label="电汇" value="TT" />
          <el-option label="银行承兑" value="BA" />
        </el-select>
      </el-form-item>
      <el-form-item label="事由"><el-input v-model="form.reason" /></el-form-item>
      <el-form-item label="备注一"><el-input v-model="form.remark1" type="textarea" :rows="4" /></el-form-item>
      <el-form-item label="备注二"><el-input v-model="form.remark2" type="textarea" :rows="4" /></el-form-item>
    </el-form>
    <EditTable ref="table" :rows="rows" :columns="trialColumns" :height="460" />
    <div style="height: 400px" />
  </div>
</template>

<style>
.bill {
  padding: 16px;
}
.bill-form {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0 16px;
}
</style>
