<script setup lang="ts">
// 列表页。列宽和表单是已认可的部分，四个版本共用；版本之间只换上方结构和详情的位置。
import { computed, nextTick, onMounted, reactive, ref, useTemplateRef, watch } from 'vue'
import {
  ArrowDown,
  Box,
  Close,
  Filter,
  Lock,
  Operation,
  Plus,
  QuestionFilled,
  Refresh,
  Search,
  Setting,
  WarningFilled,
} from '@element-plus/icons-vue'
import { VxeColumn, VxeTable, type VxeTableInstance } from 'vxe-table'
import { Decimal, formatAmount, isNegative, sumAmounts } from '@/shared/money/amount'
import { confirm, toast } from '@/shared/ui/feedback'
import ColumnSettings from './ColumnSettings.vue'
import {
  blankQuery,
  dataVersion,
  Forbidden,
  kindText,
  listSuppliers,
  pageState,
  removeSuppliers,
  scopeLabel,
  setStatus,
  settleLabel,
  settleText,
  statusText,
  variant,
  type ListResult,
  type Query,
  type RowResult,
  type Sort,
  type SortKey,
  type Status,
  type Supplier,
} from './data'
import RuleMark from './RuleMark.vue'
import SupplierDetail from './SupplierDetail.vue'
import SupplierForm from './SupplierForm.vue'
import SupplierProfile from './SupplierProfile.vue'

const isNext = computed(() => variant.value !== '0')
const hasBar = computed(() => variant.value === 'A' || variant.value === 'C')

/* ---------- 列 ---------- */

interface Column {
  key: keyof Supplier
  label: string
  width?: number
  minWidth?: number
  fixed?: 'left'
  align?: 'right'
  locked?: boolean
  sortable?: boolean
  help?: string
}

const columns: Column[] = [
  { key: 'code', label: '编码', width: 100, fixed: 'left', locked: true, sortable: true },
  { key: 'name', label: '供应商名称', minWidth: 180, fixed: 'left', locked: true },
  { key: 'status', label: '状态', width: 88, locked: true },
  { key: 'settle', label: '结算方式', width: 100 },
  {
    key: 'payable',
    label: '应付余额（元）',
    width: 188,
    align: 'right',
    sortable: true,
    help: '已审核应付单金额 − 已付金额 − 已核销预付。付款中的金额还没扣除。负数表示预付多于应付。',
  },
  { key: 'creditLimit', label: '信用额度（元）', width: 204, align: 'right', sortable: true, help: '“—”表示不设额度，0.00 表示不允许欠款。' },
  { key: 'references', label: '引用单据', width: 104, align: 'right' },
  { key: 'scope', label: '适用范围', minWidth: 148 },
  { key: 'updatedAt', label: '修改时间', width: 172, sortable: true },
  { key: 'updatedBy', label: '修改人', width: 108 },
  { key: 'kind', label: '类型', width: 96 },
  { key: 'creditCode', label: '信用代码 / 注册号', width: 188 },
  { key: 'createdAt', label: '新增时间', width: 172 },
  { key: 'remark', label: '备注', minWidth: 240 },
]
const defaultKeys = ['code', 'name', 'status', 'settle', 'payable', 'creditLimit', 'references', 'scope', 'updatedAt']
const shownKeys = ref<string[]>([...defaultKeys])
const shown = computed(() =>
  shownKeys.value.map((k) => columns.find((c) => c.key === k)).filter((c): c is Column => c !== undefined),
)
const columnsOpen = ref(false)

/* ---------- 查询 ---------- */

const form = reactive<Query>(blankQuery())
const applied = ref<Query>(blankQuery())
const expanded = ref(false)
const filterOpen = ref(false)
const status = ref<Status | 'all'>('all')
const page = reactive({ current: 1, size: 50 })
const sort = ref<Sort | null>(null)

const result = ref<ListResult | null>(null)
const loading = ref(false)
const freshId = ref('')
const error = ref('')
const missing = ref('')
let seq = 0

async function load() {
  const mine = ++seq
  freshId.value = ''
  loading.value = true
  error.value = ''
  missing.value = ''
  try {
    const data = await listSuppliers(applied.value, status.value, page, sort.value)
    if (mine !== seq) return
    const last = Math.max(1, Math.ceil(data.total / page.size))
    if (page.current > last) {
      page.current = last
      return load()
    }
    result.value = data
    syncDock()
  } catch (e) {
    if (mine !== seq) return
    if (e instanceof Forbidden) {
      missing.value = e.message
      result.value = null // 没有权限时清掉已显示的数据
    } else {
      error.value = e instanceof Error ? e.message : '未知错误'
    }
  } finally {
    if (mine === seq) loading.value = false
  }
}

function search() {
  filterOpen.value = false
  applied.value = { ...form }
  page.current = 1
  clearSelection()
  void load()
}
function reset() {
  Object.assign(form, blankQuery())
  status.value = 'all'
  search()
}
function onStatus() {
  page.current = 1
  clearSelection()
  void load()
}
function pickStatus(key: Status | 'all') {
  if (status.value === key) return
  status.value = key
  onStatus()
}
function onSort({ field, order }: { field: string; order: string | null }) {
  sort.value = order ? { key: field as SortKey, order: order as Sort['order'] } : null
  page.current = 1
  void load()
}
onMounted(load)
watch([pageState, dataVersion], () => {
  clearSelection()
  void load()
})
watch(variant, () => {
  closeDock()
  filterOpen.value = false
})

const hasFilter = computed(() => JSON.stringify(applied.value) !== JSON.stringify(blankQuery()) || status.value !== 'all')
const moreCount = computed(() => [form.kind, form.scope, form.referenced].filter(Boolean).length)
const keyLabels = { name: '名称', code: '编码', creditCode: '信用代码' } as const
const keyPlaceholder = computed(() => ({ name: '输入名称', code: '输入编码', creditCode: '输入信用代码或注册号' })[form.keyField])
const statusTabs = computed(() =>
  (['all', 'enabled', 'frozen', 'disabled'] as const).map((k) => ({
    key: k,
    label: k === 'all' ? '全部' : statusText[k],
    count: error.value ? undefined : result.value?.counts[k],
    payable: error.value ? undefined : result.value?.payables[k],
  })),
)

/** 已生效的筛选条件，逐个可去掉；关键字就显示在搜索框里，不重复列 */
const chips = computed(() => {
  const q = applied.value
  const list: { key: keyof Query; text: string }[] = []
  if (q.settle) list.push({ key: 'settle', text: `结算方式：${settleText[q.settle]}` })
  if (q.range && (q.range[0] || q.range[1])) {
    const label = q.dateField === 'updatedAt' ? '修改日期' : '新增日期'
    list.push({ key: 'range', text: `${label}：${q.range[0] || '不限'} 至 ${q.range[1] || '不限'}` })
  }
  if (q.kind) list.push({ key: 'kind', text: `类型：${kindText[q.kind]}` })
  if (q.scope) list.push({ key: 'scope', text: `适用范围：${q.scope === 'group' ? '集团通用' : '指定组织'}` })
  if (q.referenced) list.push({ key: 'referenced', text: q.referenced === 'yes' ? '已被引用' : '未被引用' })
  return list
})
function dropChip(key: keyof Query) {
  Object.assign(form, { [key]: blankQuery()[key] })
  search()
}
function setRange(index: 0 | 1, value: string | null) {
  const next: [string, string] = [form.range?.[0] ?? '', form.range?.[1] ?? '']
  next[index] = value ?? ''
  form.range = next[0] || next[1] ? next : null
}

/* ---------- 表格 ---------- */

const tableRef = useTemplateRef<VxeTableInstance<Supplier>>('tableRef')
const density = ref<40 | 36 | 32>(36)
const selected = ref<Supplier[]>([])

function syncSelection() {
  const t = tableRef.value
  selected.value = t ? [...t.getCheckboxRecords(true), ...t.getCheckboxReserveRecords(true)] : []
}
function clearSelection() {
  void tableRef.value?.clearCheckboxRow()
  void tableRef.value?.clearCheckboxReserve()
  selected.value = []
}

const footer = computed(() => {
  const r = result.value
  if (!r) return []
  const line = (label: string, creditLimit: string, payable: string) => ({
    code: label,
    creditLimit: formatAmount(creditLimit),
    payable: formatAmount(payable),
  })
  const lines = [line('查询结果合计', r.sums.creditLimit, r.sums.payable)]
  if (selected.value.length > 0) {
    lines.push(
      line(
        `已选 ${selected.value.length} 条合计`,
        sumAmounts(selected.value.map((s) => s.creditLimit)),
        sumAmounts(selected.value.map((s) => s.payable)),
      ),
    )
  }
  return lines
})

// 合计行数变化后，vxe 不会自己重算表体高度
watch(
  () => footer.value.length,
  () => void nextTick(() => tableRef.value?.recalculate(true)),
)

function display(row: Supplier, key: keyof Supplier): string {
  switch (key) {
    case 'settle':
      return settleLabel(row)
    case 'scope':
      return scopeLabel(row)
    case 'kind':
      return kindText[row.kind]
    case 'creditCode':
      return row.creditCode || row.regNo
    default:
      return String(row[key] ?? '') || '—'
  }
}
function amountClass(value: string | null) {
  if (value === null || new Decimal(value).isZero()) return 'is-zero'
  return isNegative(value) ? 'is-negative' : ''
}
const statusClass = { enabled: 'is-done', frozen: 'is-watch', disabled: 'is-draft' } as const

/* ---------- 增、改、查 ---------- */

const formOpen = ref(false)
const target = ref<Supplier | null>(null)
const detailOpen = ref(false)
const detail = ref<Supplier | null>(null)
const docked = computed(() => variant.value === 'C' && detail.value !== null)

function openForm(s: Supplier | null) {
  detailOpen.value = false
  target.value = s
  formOpen.value = true
}
function openDetail(s: Supplier) {
  detail.value = s
  if (variant.value === 'C') markCurrent(s)
  else detailOpen.value = true
}

/* C：详情停靠在右侧，点行或按上下键切换 */
function markCurrent(s: Supplier) {
  void nextTick(() => {
    const row = tableRef.value?.getRowById(s.id)
    if (row) void tableRef.value?.setCurrentRow(row)
  })
}
function closeDock() {
  if (variant.value === 'C' || detail.value) detail.value = null
  void tableRef.value?.clearCurrentRow()
}
function syncDock() {
  if (variant.value !== 'C' || !detail.value) return
  const latest = result.value?.list.find((x) => x.id === detail.value?.id)
  if (latest) openDetail(latest)
  else closeDock()
}
function onCell({ row, column }: { row: Supplier; column: { type: string | null; field?: string } }) {
  if (variant.value !== 'C' || column.type === 'checkbox' || !column.field) return
  openDetail(row)
}
function onArrow(step: 1 | -1) {
  if (!docked.value) return
  const list = result.value?.list ?? []
  const next = list[list.findIndex((x) => x.id === detail.value?.id) + step]
  if (!next) return
  openDetail(next)
  const row = tableRef.value?.getRowById(next.id)
  if (row) void tableRef.value?.scrollToRow(row)
}
function onKey(e: KeyboardEvent) {
  if (!docked.value || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return
  e.preventDefault()
  onArrow(e.key === 'ArrowDown' ? 1 : -1)
}
watch(docked, () => void nextTick(() => tableRef.value?.recalculate(true)))

async function onSaved(s: Supplier) {
  const isNew = target.value === null
  if (isNew) page.current = 1
  await load()
  freshId.value = s.id
  await nextTick()
  if (result.value?.list.some((x) => x.id === s.id)) {
    const row = tableRef.value?.getRowById(s.id)
    if (row) void tableRef.value?.scrollToRow(row)
  } else if (isNew) {
    toast.warning(`${s.code} 已保存，但不符合当前筛选条件，所以没有显示`)
  }
}

/* ---------- 停用、删除 ---------- */

const blocked = ref<Supplier | null>(null)
const blockedOpen = ref(false)
const batch = ref<{ title: string; rows: RowResult[] } | null>(null)
const batchOpen = ref(false)

async function changeStatus(s: Supplier, to: Status) {
  if (to !== 'enabled') {
    const ok = await confirm({
      title: `${to === 'disabled' ? '停用' : '冻结付款'} ${s.code}？`,
      message:
        to === 'disabled'
          ? `停用后新单据不能再选“${s.name}”。${s.references.length ? `已引用它的 ${s.references.length} 张单据不受影响，仍显示原名称。` : ''}`
          : `冻结后“${s.name}”仍可做应付单，但不能提交付款申请。`,
      confirmText: to === 'disabled' ? '停用' : '冻结付款',
    })
    if (!ok) return
  }
  await setStatus([s.id], to)
  toast.success(`${s.code} 已${to === 'enabled' ? '启用' : to === 'disabled' ? '停用' : '冻结付款'}`)
  blockedOpen.value = false
  await load()
}

async function remove(s: Supplier) {
  if (s.references.length > 0) {
    blocked.value = s
    blockedOpen.value = true
    return
  }
  const ok = await confirm({
    title: `删除 ${s.code}？`,
    message: `“${s.name}”没有被任何单据引用，可以删除。删除后不能恢复。`,
    confirmText: '删除',
    danger: true,
  })
  if (!ok) return
  await removeSuppliers([s.id])
  toast.success(`已删除 ${s.code}`)
  clearSelection()
  await load()
}

async function runBatch(kind: 'disable' | 'delete') {
  const items = [...selected.value]
  const ids = items.map((s) => s.id)
  const used = items.filter((s) => s.references.length > 0).length
  const ok = await confirm({
    title: kind === 'delete' ? `删除已选 ${items.length} 条？` : `停用已选 ${items.length} 条？`,
    message:
      kind === 'delete'
        ? `其中 ${used} 条已被单据引用，会被跳过；其余 ${items.length - used} 条删除后不能恢复。`
        : '停用后新单据不能再选这些供应商，已有单据不受影响。',
    confirmText: kind === 'delete' ? '删除' : '停用',
    danger: kind === 'delete',
  })
  if (!ok) return
  const rows = kind === 'delete' ? await removeSuppliers(ids) : await setStatus(ids, 'disabled')
  clearSelection()
  await load()
  const failed = rows.filter((r) => !r.ok)
  if (failed.length === 0) return toast.success(`${rows.length} 条已${kind === 'delete' ? '删除' : '停用'}`)
  batch.value = { title: kind === 'delete' ? '批量删除结果' : '批量停用结果', rows }
  batchOpen.value = true
}

async function copyCode(code: string) {
  try {
    await navigator.clipboard.writeText(code)
    toast.success(`已复制 ${code}`)
  } catch {
    toast.warning('浏览器没有允许复制')
  }
}

function onView(command: string) {
  if (command === 'columns') columnsOpen.value = true
  else if (command === 'refresh') void load()
  else density.value = Number(command) as 40 | 36 | 32
}
</script>

<template>
  <div class="page" :class="{ 'is-next': isNext, [`is-${variant}`]: true }">
    <!-- 现版和 B 有标题行；A、C 的页面名只在页签上出现一次 -->
    <div v-if="!hasBar" class="page-head">
      <h1 class="app-page-title">供应商档案</h1>
      <span v-if="!isNext" class="page-tag">示例数据</span>
      <span class="grow" />
      <RuleMark rule="primary" />
      <el-button type="primary" :icon="isNext ? Plus : undefined" :disabled="!!missing" @click="openForm(null)">新增供应商</el-button>
    </div>

    <div v-if="missing" class="panel state">
      <el-icon v-if="isNext" class="state-icon"><Lock /></el-icon>
      <h2>没有查看供应商档案的权限</h2>
      <p>缺少权限码 <code>{{ missing }}</code>，请联系管理员开通。</p>
    </div>

    <template v-else>
      <!-- B：状态和应付金额合在一起，点卡片就是筛选 -->
      <div v-if="variant === 'B'" class="cards" role="tablist" aria-label="按状态查看">
        <button
          v-for="t in statusTabs"
          :key="t.key"
          type="button"
          role="tab"
          class="card"
          :class="[`is-${t.key}`, { 'is-on': status === t.key }]"
          :aria-selected="status === t.key"
          @click="pickStatus(t.key)"
        >
          <span class="card-top"><span class="card-label">{{ t.label }}</span><span class="card-count">{{ t.count ?? '—' }} 家</span></span>
          <b class="app-num" :class="{ 'is-negative': t.payable && isNegative(t.payable) }">{{ t.payable === undefined ? '—' : formatAmount(t.payable) }}</b>
          <small>应付余额（元）</small>
        </button>
      </div>

      <div class="panel">
        <!-- A、C：一行工具条 -->
        <template v-if="hasBar">
          <div class="bar">
            <div class="seg" role="tablist" aria-label="按状态查看">
              <button
                v-for="t in statusTabs"
                :key="t.key"
                type="button"
                role="tab"
                :class="{ 'is-on': status === t.key }"
                :aria-selected="status === t.key"
                @click="pickStatus(t.key)"
              >
                {{ t.label }}<i>{{ t.count ?? '' }}</i>
              </button>
            </div>
            <RuleMark rule="tabs" />
            <span class="grow" />
            <el-input
              v-model="form.keyword"
              class="bar-search"
              clearable
              :placeholder="`${keyPlaceholder}，回车查询`"
              aria-label="查询内容"
              @keyup.enter="search"
              @clear="search"
            >
              <template #prefix>
                <el-dropdown trigger="click" @command="(k: Query['keyField']) => (form.keyField = k)">
                  <button type="button" class="bar-field" aria-label="查询字段">{{ keyLabels[form.keyField] }}<el-icon><ArrowDown /></el-icon></button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item v-for="(label, k) in keyLabels" :key="k" :command="k">{{ label }}</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </template>
              <template #suffix><el-icon class="is-clickable" aria-label="查询" @click="search"><Search /></el-icon></template>
            </el-input>
            <RuleMark rule="combo" />
            <el-popover v-model:visible="filterOpen" trigger="click" placement="bottom-end" :width="452" popper-class="filter-pop">
              <template #reference>
                <el-button :icon="Filter" :class="{ 'has-filter': chips.length > 0 }">筛选<b v-if="chips.length" class="bar-n">{{ chips.length }}</b></el-button>
              </template>
              <form class="filter" @submit.prevent="search">
                <div class="filter-row">
                  <span>结算方式</span>
                  <el-radio-group v-model="form.settle" size="small">
                    <el-radio-button value="" label="全部" />
                    <el-radio-button value="monthly" label="月结" />
                    <el-radio-button value="prepay" label="预付" />
                    <el-radio-button value="delivery" label="货到付款" />
                  </el-radio-group>
                </div>
                <div class="filter-row">
                  <span>供应商类型</span>
                  <el-radio-group v-model="form.kind" size="small">
                    <el-radio-button value="" label="全部" />
                    <el-radio-button value="domestic" label="境内企业" />
                    <el-radio-button value="overseas" label="境外企业" />
                  </el-radio-group>
                </div>
                <div class="filter-row">
                  <span>适用范围</span>
                  <el-radio-group v-model="form.scope" size="small">
                    <el-radio-button value="" label="全部" />
                    <el-radio-button value="group" label="集团通用" />
                    <el-radio-button value="org" label="指定组织" />
                  </el-radio-group>
                </div>
                <div class="filter-row">
                  <span>是否被引用</span>
                  <el-radio-group v-model="form.referenced" size="small">
                    <el-radio-button value="" label="全部" />
                    <el-radio-button value="yes" label="是" />
                    <el-radio-button value="no" label="否" />
                  </el-radio-group>
                </div>
                <div class="filter-row">
                  <span>日期</span>
                  <el-radio-group v-model="form.dateField" size="small">
                    <el-radio-button value="updatedAt" label="修改日期" />
                    <el-radio-button value="createdAt" label="新增日期" />
                  </el-radio-group>
                </div>
                <div class="filter-row">
                  <span />
                  <el-date-picker
                    :model-value="form.range?.[0] || null"
                    type="date"
                    value-format="YYYY-MM-DD"
                    placeholder="开始"
                    :teleported="false"
                    style="width: 148px"
                    @update:model-value="(v: string | null) => setRange(0, v)"
                  />
                  <span class="filter-to">至</span>
                  <el-date-picker
                    :model-value="form.range?.[1] || null"
                    type="date"
                    value-format="YYYY-MM-DD"
                    placeholder="结束"
                    :teleported="false"
                    style="width: 148px"
                    @update:model-value="(v: string | null) => setRange(1, v)"
                  />
                </div>
                <div class="filter-foot">
                  <el-button link type="primary" @click="reset">清空条件</el-button>
                  <el-button type="primary" plain native-type="submit">查询</el-button>
                </div>
              </form>
            </el-popover>
            <el-dropdown trigger="click" @command="onView">
              <el-button :icon="Operation">视图</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="columns" :icon="Setting">设置显示列</el-dropdown-item>
                  <el-dropdown-item command="refresh" :icon="Refresh">刷新</el-dropdown-item>
                  <el-dropdown-item v-for="[v, label] in [[40, '宽松'], [36, '默认'], [32, '紧凑']]" :key="v" :command="String(v)" :divided="v === 40">
                    行高 {{ label }}{{ density === v ? ' ✓' : '' }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <RuleMark rule="columns" />
            <el-button type="primary" :icon="Plus" @click="openForm(null)">新增供应商</el-button>
            <RuleMark rule="primary" />
          </div>
          <div v-if="chips.length" class="chips">
            <el-tag v-for="c in chips" :key="c.key" type="info" effect="plain" closable @close="dropChip(c.key)">{{ c.text }}</el-tag>
            <el-button link type="primary" @click="reset">清空条件</el-button>
          </div>
        </template>

        <!-- B：条件名写在控件里，不再单独占标签位 -->
        <form v-else-if="variant === 'B'" class="line" @submit.prevent="search">
          <el-input v-model="form.keyword" class="bar-search" clearable :placeholder="keyPlaceholder" aria-label="查询内容" @clear="search">
            <template #prefix>
              <el-dropdown trigger="click" @command="(k: Query['keyField']) => (form.keyField = k)">
                <button type="button" class="bar-field" aria-label="查询字段">{{ keyLabels[form.keyField] }}<el-icon><ArrowDown /></el-icon></button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item v-for="(label, k) in keyLabels" :key="k" :command="k">{{ label }}</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </template>
          </el-input>
          <el-select v-model="form.settle" style="width: 168px" clearable placeholder="全部" aria-label="结算方式">
            <template #prefix>结算方式</template>
            <el-option label="月结" value="monthly" />
            <el-option label="预付" value="prepay" />
            <el-option label="货到付款" value="delivery" />
          </el-select>
          <el-select v-model="form.scope" style="width: 168px" clearable placeholder="全部" aria-label="适用范围">
            <template #prefix>适用范围</template>
            <el-option label="集团通用" value="group" />
            <el-option label="指定组织" value="org" />
          </el-select>
          <el-select v-model="form.kind" style="width: 152px" clearable placeholder="全部" aria-label="类型">
            <template #prefix>类型</template>
            <el-option label="境内企业" value="domestic" />
            <el-option label="境外企业" value="overseas" />
          </el-select>
          <el-button type="primary" plain native-type="submit">查询</el-button>
          <el-button @click="reset">重置</el-button>
          <span class="grow" />
          <el-dropdown trigger="click" @command="onView">
            <el-button :icon="Operation">视图</el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="columns" :icon="Setting">设置显示列</el-dropdown-item>
                <el-dropdown-item command="refresh" :icon="Refresh">刷新</el-dropdown-item>
                <el-dropdown-item v-for="[v, label] in [[40, '宽松'], [36, '默认'], [32, '紧凑']]" :key="v" :command="String(v)" :divided="v === 40">
                  行高 {{ label }}{{ density === v ? ' ✓' : '' }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </form>

        <!-- 现版 -->
        <template v-else>
          <form class="query" @submit.prevent="search">
            <div class="combo">
              <el-select v-model="form.keyField" style="width: 100px" aria-label="查询字段">
                <el-option label="名称" value="name" />
                <el-option label="编码" value="code" />
                <el-option label="信用代码" value="creditCode" />
              </el-select>
              <el-input v-model="form.keyword" style="width: 176px" clearable :placeholder="keyPlaceholder" aria-label="查询内容" />
              <RuleMark rule="combo" />
            </div>
            <label class="cond">
              <span>结算方式</span>
              <el-select v-model="form.settle" style="width: 112px" clearable placeholder="全部">
                <el-option label="月结" value="monthly" />
                <el-option label="预付" value="prepay" />
                <el-option label="货到付款" value="delivery" />
              </el-select>
            </label>
            <div class="combo">
              <el-select v-model="form.dateField" style="width: 100px" aria-label="日期类型">
                <el-option label="修改日期" value="updatedAt" />
                <el-option label="新增日期" value="createdAt" />
              </el-select>
              <el-date-picker
                v-model="form.range"
                type="daterange"
                value-format="YYYY-MM-DD"
                start-placeholder="开始"
                end-placeholder="结束"
                range-separator="–"
                style="width: 232px"
              />
            </div>
            <template v-if="expanded">
              <label class="cond">
                <span>类型</span>
                <el-select v-model="form.kind" style="width: 112px" clearable placeholder="全部">
                  <el-option label="境内企业" value="domestic" />
                  <el-option label="境外企业" value="overseas" />
                </el-select>
              </label>
              <label class="cond">
                <span>适用范围</span>
                <el-select v-model="form.scope" style="width: 112px" clearable placeholder="全部">
                  <el-option label="集团通用" value="group" />
                  <el-option label="指定组织" value="org" />
                </el-select>
              </label>
              <label class="cond">
                <span>是否被引用</span>
                <el-select v-model="form.referenced" style="width: 96px" clearable placeholder="全部">
                  <el-option label="是" value="yes" />
                  <el-option label="否" value="no" />
                </el-select>
              </label>
            </template>
            <div class="query-actions">
              <el-button type="primary" plain native-type="submit">查询</el-button>
              <el-button @click="reset">重置</el-button>
              <el-button link type="primary" @click="expanded = !expanded">
                {{ expanded ? '收起' : moreCount ? `更多条件（${moreCount}）` : '更多条件' }}
              </el-button>
              <RuleMark rule="inline" />
            </div>
          </form>
          <div class="tabs-row">
            <el-tabs v-model="status" @tab-change="onStatus">
              <el-tab-pane v-for="t in statusTabs" :key="t.key" :name="t.key">
                <template #label>{{ t.label }}<span class="tab-count">{{ t.count ?? '' }}</span></template>
              </el-tab-pane>
            </el-tabs>
            <RuleMark rule="tabs" />
            <span class="grow" />
            <el-tooltip content="刷新" placement="top">
              <el-button text :icon="Refresh" aria-label="刷新" @click="load" />
            </el-tooltip>
            <el-dropdown trigger="click" @command="(v: 40 | 36 | 32) => (density = v)">
              <el-button text :icon="Operation" aria-label="行高" title="行高" />
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item :command="40">宽松 40{{ density === 40 ? ' ✓' : '' }}</el-dropdown-item>
                  <el-dropdown-item :command="36">默认 36{{ density === 36 ? ' ✓' : '' }}</el-dropdown-item>
                  <el-dropdown-item :command="32">紧凑 32{{ density === 32 ? ' ✓' : '' }}</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-tooltip content="设置显示列" placement="top">
              <el-button text :icon="Setting" aria-label="设置显示列" @click="columnsOpen = true" />
            </el-tooltip>
            <RuleMark rule="columns" />
          </div>
        </template>

        <div class="split">
          <div class="split-main">
            <!-- 表格 -->
            <div
              v-loading="loading"
              class="table-box"
              :tabindex="docked ? 0 : undefined"
              @keydown="onKey"
            >
              <div v-if="error" class="state">
                <el-icon v-if="isNext" class="state-icon is-fail"><WarningFilled /></el-icon>
                <h2>查询失败</h2>
                <p>{{ error }}。查询条件已保留。</p>
                <el-button @click="load">重新查询</el-button>
              </div>
              <VxeTable
                v-else
                :key="shownKeys.join()"
                ref="tableRef"
                :data="result?.list ?? []"
                height="100%"
                border="inner"
                :row-config="{ keyField: 'id', isHover: true, isCurrent: variant === 'C' }"
                :cell-config="{ height: density }"
                :checkbox-config="{ reserve: true, highlight: true, trigger: 'cell' }"
                :sort-config="{ remote: true, trigger: 'cell', defaultSort: sort ? { field: sort.key, order: sort.order } : undefined }"
                :row-class-name="({ row }) => (row.id === freshId ? 'is-fresh' : '')"
                :show-footer="(result?.total ?? 0) > 0"
                :footer-data="footer"
                :footer-cell-class-name="({ column }) => (['payable', 'creditLimit'].includes(column.field) ? 'app-num' : '')"
                @checkbox-change="syncSelection"
                @checkbox-all="syncSelection"
                @sort-change="onSort"
                @cell-click="onCell"
              >
                <VxeColumn type="checkbox" width="44" fixed="left" align="center" />
                <VxeColumn
                  v-for="c in shown"
                  :key="c.key"
                  :field="c.key"
                  :title="c.label"
                  :width="c.width"
                  :min-width="c.minWidth"
                  :fixed="c.fixed"
                  :align="c.align"
                  :sortable="c.sortable"
                >
                  <template #header>
                    <span class="th">
                      {{ c.label }}
                      <el-tooltip v-if="c.help" :content="c.help" placement="top" popper-class="help-tip">
                        <span class="th-help" tabindex="0" :aria-label="`${c.label}口径：${c.help}`" @click.stop>
                          <el-icon><QuestionFilled /></el-icon>
                        </span>
                      </el-tooltip>
                      <RuleMark v-if="c.key === 'payable'" rule="help" />
                      <RuleMark v-if="c.key === 'references'" rule="refs" />
                    </span>
                  </template>
                  <template #default="{ row }: { row: Supplier }">
                    <template v-if="c.key === 'code'">
                      <el-button link type="primary" @click.stop="openDetail(row)">{{ row.code }}</el-button>
                    </template>
                    <template v-else-if="c.key === 'status'">
                      <span v-if="isNext && row.status !== 'frozen'" class="dot" :class="`is-${row.status}`">{{ statusText[row.status] }}</span>
                      <span v-else class="status" :class="statusClass[row.status]">{{ statusText[row.status] }}</span>
                    </template>
                    <span v-else-if="c.key === 'payable' || c.key === 'creditLimit'" class="app-num" :class="amountClass(row[c.key])">{{ formatAmount(row[c.key]) }}</span>
                    <template v-else-if="c.key === 'references'">
                      <span v-if="row.references.length === 0" class="muted">0</span>
                      <el-popover v-else trigger="click" placement="left" :width="300">
                        <template #reference>
                          <button type="button" class="ref-count" @click.stop>{{ row.references.length }}</button>
                        </template>
                        <strong class="pop-title">引用单据</strong>
                        <ul class="pop-list">
                          <li v-for="r in row.references" :key="r.no"><span>{{ r.type }}</span><span>{{ r.no }}</span><span>{{ r.date }}</span></li>
                        </ul>
                      </el-popover>
                    </template>
                    <template v-else>{{ display(row, c.key) }}</template>
                  </template>
                  <template v-if="c.key === 'code'" #footer="{ row }">
                    <span class="foot-label">{{ row.code }}<RuleMark v-if="row.code === '查询结果合计'" rule="total" /></span>
                  </template>
                </VxeColumn>
                <VxeColumn v-if="!docked" title="操作" width="140" fixed="right">
                  <template #default="{ row }: { row: Supplier }">
                    <span class="row-actions">
                      <el-button link type="primary" @click="openForm(row)">编辑</el-button>
                      <el-button v-if="row.status === 'enabled'" link type="primary" @click="changeStatus(row, 'disabled')">停用</el-button>
                      <el-button v-else link type="primary" @click="changeStatus(row, 'enabled')">{{ row.status === 'frozen' ? '解冻' : '启用' }}</el-button>
                      <el-dropdown trigger="click">
                        <el-button link type="primary" :aria-label="`${row.code} 更多操作`">更多</el-button>
                        <template #dropdown>
                          <el-dropdown-menu>
                            <el-dropdown-item @click="copyCode(row.code)">复制编码</el-dropdown-item>
                            <el-dropdown-item v-if="row.status === 'enabled'" @click="changeStatus(row, 'frozen')">冻结付款</el-dropdown-item>
                            <el-dropdown-item divided :class="row.references.length ? 'is-blocked' : 'is-danger'" @click="remove(row)">
                              删除<small v-if="row.references.length">已被 {{ row.references.length }} 张单据引用</small>
                            </el-dropdown-item>
                          </el-dropdown-menu>
                        </template>
                      </el-dropdown>
                    </span>
                  </template>
                </VxeColumn>
                <template #empty>
                  <div v-if="!loading" class="state">
                    <template v-if="hasFilter">
                      <el-icon v-if="isNext" class="state-icon"><Search /></el-icon>
                      <h2>没有符合条件的供应商</h2>
                      <p>换个条件，或清掉筛选看全部。</p>
                      <el-button @click="reset">清掉筛选</el-button>
                    </template>
                    <template v-else>
                      <el-icon v-if="isNext" class="state-icon"><Box /></el-icon>
                      <h2>还没有供应商</h2>
                      <p>新增后才能在应付单、付款申请里选用。</p>
                      <el-button @click="openForm(null)">新增供应商</el-button>
                    </template>
                  </div>
                </template>
              </VxeTable>
            </div>

            <!-- 底栏 -->
            <div class="bottom" :class="{ 'has-selection': selected.length > 0 }">
              <template v-if="selected.length > 0">
                <span>已选 <b>{{ selected.length }}</b> 条</span>
                <el-button @click="runBatch('disable')">批量停用</el-button>
                <el-button @click="runBatch('delete')">批量删除</el-button>
                <el-button link type="primary" @click="clearSelection">取消选择</el-button>
              </template>
              <span v-else-if="!error && !isNext" class="muted">勾选后可批量停用、删除</span>
              <span v-else-if="!error" class="muted app-num">共 {{ result?.total ?? 0 }} 条</span>
              <RuleMark rule="bottom" />
              <span class="grow" />
              <el-pagination
                v-if="!error"
                v-model:current-page="page.current"
                v-model:page-size="page.size"
                :size="isNext ? 'small' : 'default'"
                :page-sizes="[20, 50, 100]"
                :total="result?.total ?? 0"
                :layout="isNext ? 'sizes, prev, pager, next' : 'total, sizes, prev, pager, next'"
                @current-change="load"
                @size-change="load"
              />
            </div>
          </div>

          <!-- C：停靠详情 -->
          <aside v-if="docked && detail" class="dock" aria-label="供应商详情">
            <div class="dock-body">
              <el-button class="dock-close" link :icon="Close" aria-label="关闭详情" @click="closeDock" />
              <SupplierProfile :supplier="detail" />
            </div>
            <div class="dock-foot">
              <span class="muted">点行或按 ↑ ↓ 切换</span>
              <span class="grow" />
              <el-dropdown trigger="click">
                <el-button>更多</el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item v-if="detail.status === 'enabled'" @click="changeStatus(detail, 'disabled')">停用</el-dropdown-item>
                    <el-dropdown-item v-else @click="changeStatus(detail, 'enabled')">{{ detail.status === 'frozen' ? '解冻' : '启用' }}</el-dropdown-item>
                    <el-dropdown-item v-if="detail.status === 'enabled'" @click="changeStatus(detail, 'frozen')">冻结付款</el-dropdown-item>
                    <el-dropdown-item divided :class="detail.references.length ? 'is-blocked' : 'is-danger'" @click="remove(detail)">
                      删除<small v-if="detail.references.length">已被 {{ detail.references.length }} 张单据引用</small>
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <el-button type="primary" plain @click="openForm(detail)">编辑</el-button>
            </div>
          </aside>
        </div>
      </div>
    </template>

    <SupplierForm v-model="formOpen" :target="target" @saved="onSaved" />
    <SupplierDetail v-if="!isNext" v-model="detailOpen" :supplier="detail" @edit="openForm" />
    <el-drawer v-else v-model="detailOpen" size="480" class="pf-drawer" title="供应商详情">
      <SupplierProfile v-if="detail" :supplier="detail" />
      <template #footer>
        <el-button @click="detailOpen = false">关闭</el-button>
        <el-button type="primary" @click="openForm(detail)">编辑</el-button>
      </template>
    </el-drawer>
    <ColumnSettings v-model="columnsOpen" :options="columns" :selected="shownKeys" :defaults="defaultKeys" @confirm="(k) => (shownKeys = k)" />

    <el-dialog v-model="blockedOpen" width="520" :title="`${blocked?.code ?? ''} 不能删除`">
      <template v-if="blocked">
        <p class="dialog-text">“{{ blocked.name }}”已被 {{ blocked.references.length }} 张单据引用。不想再用，可以改为停用，已有单据不受影响。<RuleMark rule="blocked" /></p>
        <table class="mini">
          <thead><tr><th>单据类型</th><th>单号</th><th>业务日期</th></tr></thead>
          <tbody><tr v-for="r in blocked.references" :key="r.no"><td>{{ r.type }}</td><td>{{ r.no }}</td><td>{{ r.date }}</td></tr></tbody>
        </table>
      </template>
      <template #footer>
        <el-button @click="blockedOpen = false">关闭</el-button>
        <el-button v-if="blocked?.status !== 'disabled'" type="primary" @click="blocked && changeStatus(blocked, 'disabled')">改为停用</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="batchOpen" width="640" :title="batch?.title" :close-on-click-modal="false">
      <template v-if="batch">
        <p class="dialog-text">
          成功 {{ batch.rows.filter((r) => r.ok).length }} 条，失败 {{ batch.rows.filter((r) => !r.ok).length }} 条。
        </p>
        <div class="mini-scroll">
          <table class="mini">
            <thead><tr><th>编码</th><th>名称</th><th>结果</th><th>原因</th></tr></thead>
            <tbody>
              <tr v-for="r in [...batch.rows].sort((a, b) => Number(a.ok) - Number(b.ok))" :key="r.id">
                <td>{{ r.code }}</td><td>{{ r.name }}</td>
                <td><span class="status" :class="r.ok ? 'is-done' : 'is-fail'">{{ r.ok ? '成功' : '失败' }}</span></td>
                <td>{{ r.reason || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
      <template #footer><el-button type="primary" @click="batchOpen = false">知道了</el-button></template>
    </el-dialog>
  </div>
</template>
