<script setup lang="ts">
// 列表样例：标题行、查询行、状态页签、表格、合计行、底部全套。数据虚构，只在模拟模式下出现，不进正式包。
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { FormRules } from 'element-plus'
import { ArrowDown, Goods, RefreshRight } from '@element-plus/icons-vue'
import { ApiError } from '@/api/http'
import { PERM } from '@/app/permissions'
import { usePreferencesStore } from '@/app/preferences.store'
import { useTab } from '@/app/tabs/tabHost'
import { formatAmount, sumAmounts } from '@/shared/money/amount'
import ActionBar from '@/shared/ui/ActionBar.vue'
import type { DataColumn } from '@/shared/ui/columns'
import DataTable from '@/shared/ui/DataTable.vue'
import { toast } from '@/shared/ui/feedback'
import FormDialog from '@/shared/ui/FormDialog.vue'
import PageHeader from '@/shared/ui/PageHeader.vue'
import QueryBar from '@/shared/ui/QueryBar.vue'
import RefPicker from '@/shared/ui/RefPicker.vue'
import StatusTabs from '@/shared/ui/StatusTabs.vue'
import StatusTag from '@/shared/ui/StatusTag.vue'
import { ORDERS, ORGS, type OrderRow } from './data'

const PAGE = 'list-sample'
const route = useRoute()
const router = useRouter()
const prefs = usePreferencesStore()
const tab = useTab()

interface Form {
  orgId: string
  dates: string[] | null
  no: string
  supplier: string
}
const blank = (): Form => ({ orgId: '', dates: ['2026-11-01', '2026-11-30'], no: '', supplier: '' })
const form = reactive<Form>(blank())
const asked = ref<Form | null>(null)
const tried = ref(false)
const status = ref('all')
const page = ref(1)
const size = ref(50)
const loading = ref(false)
const error = ref<ApiError | null>(null)
const selection = ref<OrderRow[]>([])

const missing = computed(() => (asked.value ? [] : ['采购组织']))

/* ---------- 查询 ---------- */

async function run() {
  tried.value = true
  if (!form.orgId || !form.dates) {
    asked.value = null
    if (!form.dates) toast.warning('订单日期必填')
    return
  }
  loading.value = true
  error.value = null
  await new Promise((r) => setTimeout(r, 150))
  loading.value = false
  // 样例专用：供应商填“出错”“无权”看这两种空态
  if (form.supplier === '出错') error.value = new ApiError('server', 500, { traceId: 'sample-1' })
  if (form.supplier === '无权') error.value = new ApiError('forbidden', 403, { permission: PERM.projectRoleView })
  asked.value = { ...form }
  page.value = 1
  void router.replace({ query: { org: form.orgId, ...(form.no ? { no: form.no } : {}) } })
}
function reset() {
  Object.assign(form, blank(), { orgId: form.orgId })
  status.value = 'all'
  scheme.value = 'default'
  void run()
}
if (typeof route.query.org === 'string') {
  form.orgId = route.query.org
  if (typeof route.query.no === 'string') form.no = route.query.no
  void run()
}

const matched = computed(() => {
  const q = asked.value
  if (!q?.dates || error.value) return []
  return ORDERS.filter(
    (r) => (q.orgId === 'C1' || r.orgId === q.orgId) && r.date >= q.dates![0]! && r.date <= q.dates![1]! && r.no.includes(q.no.trim()) && r.supplier.includes(q.supplier.trim()),
  )
})
const byStatus = computed(() => (status.value === 'all' ? matched.value : matched.value.filter((r) => r.status === status.value)))
const rows = computed(() => byStatus.value.slice((page.value - 1) * size.value, page.value * size.value))
const filtered = computed(() => status.value !== 'all' || !!asked.value?.no || !!asked.value?.supplier)

const tabs = computed(() => {
  const count = (s: OrderRow['status']) => (asked.value && !error.value ? matched.value.filter((r) => r.status === s).length : undefined)
  return [
    { key: 'draft', label: '待提交', count: count('draft') },
    { key: 'doing', label: '审批中', count: count('doing') },
    { key: 'done', label: '执行中', count: count('done') },
    { key: 'all', label: '全部' },
  ]
})
const summary = computed(() => ({
  label: '本页合计',
  values: {
    qty: formatAmount(sumAmounts(rows.value.map((r) => r.qty), 0), 0),
    amount: formatAmount(sumAmounts(rows.value.map((r) => r.amount), 2), 2),
  },
}))

/* ---------- 查询方案 ---------- */

const scheme = ref('default')
const schemes = computed(() => [{ key: 'default', label: '快速查询' }, ...prefs.schemesOf(PAGE).map((s) => ({ key: s.key, label: s.label, own: true }))])
function pickScheme(key: string) {
  scheme.value = key
  const saved = prefs.schemesOf(PAGE).find((s) => s.key === key)
  Object.assign(form, blank(), saved?.values ?? { orgId: form.orgId })
  void run()
}
function saveScheme(label: string) {
  scheme.value = prefs.saveScheme(PAGE, label, { ...form })
  toast.success('已存为查询方案')
}
function removeScheme(key: string) {
  prefs.removeScheme(PAGE, key)
  scheme.value = 'default'
  toast.success('已删除查询方案')
}

/* ---------- 表格 ---------- */

const columns: DataColumn<OrderRow>[] = [
  { key: 'no', label: '订单编号', kind: 'docNo' },
  { key: 'orgName', label: '采购组织', kind: 'org' },
  { key: 'type', label: '订单类型', kind: 'enum' },
  { key: 'date', label: '订单日期', kind: 'date' },
  { key: 'supplier', label: '供应商', kind: 'name' },
  { key: 'qty', label: '总数量', kind: 'count' },
  { key: 'amount', label: '总价税合计（CNY）', kind: 'amount', scale: 2 },
  { key: 'status', label: '单据状态', kind: 'status' },
  { key: 'maker', label: '制单人', kind: 'user' },
  { key: 'makeTime', label: '制单时间', kind: 'time', hidden: true },
]
const statusText = { draft: '自由', doing: '审批中', done: '审批通过' }
const actions = [
  { action: 'edit', label: '修改' },
  { action: 'submit', label: '提交' },
  { action: 'copy', label: '复制' },
  { action: 'delete', label: '删除', danger: true },
]
const allowed = (r: OrderRow) => [
  { action: 'edit', allowed: true },
  { action: 'submit', allowed: r.status === 'draft', reason: `已${statusText[r.status]}` },
  { action: 'copy', allowed: true },
  { action: 'delete', allowed: r.status === 'draft', reason: '只有草稿能删' },
]
const todo = (what: string) => toast.warning(`样例没有做：${what}`)
function create(source: string) {
  if (source === '自制') formOpen.value = true
  else todo(source)
}

/* ---------- 录入对话框样例 ---------- */

interface Draft {
  code: string
  name: string
}
const formOpen = ref(false)
const rules: FormRules = {
  code: [{ required: true, whitespace: true, message: '请填写编码' }],
  name: [{ required: true, whitespace: true, message: '请填写名称' }],
}
/** 样例专用：编码填 DUP 看字段错误，填 BUSY 看版本冲突 */
async function submitForm(values: Draft, { version }: { version: number }) {
  await new Promise((r) => setTimeout(r, 150))
  if (values.code === 'DUP') throw new ApiError('invalid', 422, { message: '填写内容有误', fieldErrors: [{ field: 'code', message: '编码已被占用' }] })
  if (values.code === 'BUSY' && version < 2) throw new ApiError('conflict', 409, { message: '示例同事刚修改过', latest: { version: 2, code: 'BUSY', name: '同事改的' } })
  return values
}
const conflict = {
  toValues: (latest: Record<string, unknown>): Draft => ({ code: String(latest.code), name: String(latest.name) }),
  fields: [
    { key: 'code' as const, label: '编码' },
    { key: 'name' as const, label: '名称' },
  ],
}
</script>

<template>
  <div class="app-page">
    <PageHeader title="列表样例" :icon="Goods" tone="violet">
      <el-dropdown trigger="click" @command="create">
        <el-button type="primary">新增<el-icon class="el-icon--right"><ArrowDown /></el-icon></el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="自制">自制</el-dropdown-item>
            <el-dropdown-item command="请购单">请购单</el-dropdown-item>
            <el-dropdown-item command="采购合同">采购合同</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <el-button :disabled="selection.length === 0" @click="todo('批量删除')">删除</el-button>
      <el-dropdown split-button trigger="click" :disabled="selection.length === 0" @click="todo('批量提交')">
        提交
        <template #dropdown><el-dropdown-menu><el-dropdown-item @click="todo('收回')">收回</el-dropdown-item></el-dropdown-menu></template>
      </el-dropdown>
      <el-button class="app-icon-btn" :icon="RefreshRight" aria-label="刷新" title="刷新" @click="run" />
    </PageHeader>
    <QueryBar :scheme="scheme" :schemes="schemes" @update:scheme="pickScheme" @save-scheme="saveScheme" @remove-scheme="removeScheme" @search="run" @reset="reset">
      <RefPicker v-model="form.orgId" :nodes="ORGS" title="采购组织" scope="有权查看的采购组织" required :invalid="tried && !form.orgId" />
      <el-date-picker
        v-model="form.dates"
        class="app-dates is-wide is-required"
        type="daterange"
        value-format="YYYY-MM-DD"
        range-separator="~"
        start-placeholder="订单日期起"
        end-placeholder="订单日期止"
      />
      <el-input v-model="form.no" name="no" placeholder="订单编号" clearable />
      <el-input v-model="form.supplier" name="supplier" placeholder="供应商" clearable />
      <template #advanced>
        <el-form label-width="80px">
          <el-form-item label="订单编号"><el-input v-model="form.no" /></el-form-item>
          <el-form-item label="供应商"><el-input v-model="form.supplier" /></el-form-item>
        </el-form>
      </template>
    </QueryBar>
    <div class="app-page-body">
      <div class="app-page-main">
        <StatusTabs v-model="status" :tabs="tabs" @update:model-value="page = 1" />
        <div class="app-page-fill">
          <DataTable
            v-model:selection="selection"
            v-model:page="page"
            v-model:size="size"
            :table-key="PAGE"
            noun="采购订单"
            :rows="rows"
            :columns="columns"
            :total="byStatus.length"
            :loading="loading"
            :error="error"
            :filtered="filtered"
            :missing="missing"
            :summary="summary"
            @retry="((form.supplier = ''), run())"
            @clear-filter="reset"
          >
            <template #cell-no="{ row }"><a class="app-link">{{ row.no }}</a></template>
            <template #cell-status="{ row }"><StatusTag :tone="row.status" :text="statusText[row.status]" /></template>
            <template #actions="{ row }">
              <ActionBar :actions="actions" :allowed="allowed(row)" @run="(a) => todo(a)" @blocked="(_a, reason) => toast.warning(reason)" />
            </template>
          </DataTable>
        </div>
      </div>
    </div>
    <FormDialog
      v-model="formOpen"
      title="自制"
      :rules="rules"
      :initial="() => ({ code: '', name: '' })"
      :submit="submitForm"
      :conflict="conflict"
      saved-text="已保存"
      addable
      @dirty-change="tab.setDirty"
    >
      <template #default="{ form: draft, errors }">
        <el-form-item label="编码" prop="code" :error="errors.code"><el-input v-model="draft.code" class="app-w-sm" name="sample-code" /></el-form-item>
        <el-form-item label="名称" prop="name" :error="errors.name"><el-input v-model="draft.name" class="app-w-md" name="sample-name" /></el-form-item>
      </template>
    </FormDialog>
  </div>
</template>
