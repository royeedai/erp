<script setup lang="ts">
// 工程变更申请单：单据列表（标题行、查询行、状态页签、表格、底部）和整页新增。
import { computed, nextTick, reactive, ref, useTemplateRef } from 'vue'
import { ArrowDown, CaretBottom, DocumentChecked, FullScreen, RefreshRight } from '@element-plus/icons-vue'
import { toast } from '@/shared/ui/feedback'
import { CHANGE_ORDERS, REASONS, type Row } from '../data'
import ConfirmBox from '../parts/ConfirmBox.vue'
import Grid, { type Col } from '../parts/Grid.vue'
import GridFoot from '../parts/GridFoot.vue'
import QueryRow from '../parts/QueryRow.vue'
import RefInput from '../parts/RefInput.vue'
import StatusTabs from '../parts/StatusTabs.vue'
import TitleRow from '../parts/TitleRow.vue'

defineOptions({ inheritAttrs: false })

const mode = ref<'list' | 'card'>('list')
const box = useTemplateRef<InstanceType<typeof ConfirmBox>>('box')

/* ---------- 列表 ---------- */
const rows = reactive<Row[]>([...CHANGE_ORDERS])
const form = reactive({ planOrg: '', dates: ['2026-11-01', '2026-11-25'] as string[] | null, no: '', applyOrg: '', dept: '' })
const asked = reactive({ planOrg: '', from: '2026-11-01', to: '2026-11-25', no: '', dept: '' })
const missing = ref(false)
const tab = ref('draft')
const page = ref(1)
const size = ref(50)
const picked = ref<Row[]>([])
const grid = useTemplateRef<InstanceType<typeof Grid>>('grid')
const has = (a: unknown, b: string) => !b || String(a).includes(b)
const matched = computed(() =>
  missing.value ? [] : rows.filter((r) => has(r.planOrg, asked.planOrg) && has(r.no, asked.no) && has(r.dept, asked.dept) && String(r.date) >= asked.from && String(r.date) <= asked.to),
)
const of: Record<string, string> = { draft: '自由', doing: '审批中', done: '审批通过' }
const byTab = computed(() => (tab.value === 'all' ? matched.value : matched.value.filter((r) => r.status === of[tab.value])))
const shown = computed(() => byTab.value.slice((page.value - 1) * size.value, page.value * size.value))
const tabs = computed(() => [
  ...[['draft', '待提交'], ['doing', '审批中'], ['done', '执行中']].map(([key, label]) => ({ key: key!, label: label!, count: matched.value.filter((r) => r.status === of[key!]).length })),
  { key: 'all', label: '全部' },
])
function search() {
  missing.value = !form.dates
  if (missing.value) return
  Object.assign(asked, { planOrg: form.planOrg.trim(), no: form.no.trim(), dept: form.dept.trim(), from: form.dates![0], to: form.dates![1] })
  page.value = 1
  grid.value?.clear()
}
function reset() {
  Object.assign(form, { planOrg: '', no: '', applyOrg: '', dept: '', dates: ['2026-11-01', '2026-11-25'] })
  search()
}
const cols: Col[] = [
  { key: 'planOrg', title: '计划组织' },
  { key: 'no', title: '申请单号', width: 150 },
  { key: 'date', title: '申请日期' },
  { key: 'applyOrg', title: '申请组织' },
  { key: 'dept', title: '申请部门' },
  { key: 'applicant', title: '申请人' },
  { key: 'status', title: '单据状态' },
  { key: 'remark', title: '备注' },
  { key: 'maker', title: '制单人' },
  { key: 'makeDate', title: '制单日期' },
  { key: 'approver', title: '审批人' },
  { key: 'approveDate', title: '审批日期' },
  { key: 'creator', title: '创建人' },
  { key: 'createdAt', title: '创建时间', width: 240 },
]
async function remove(list: Row[]) {
  const bad = list.filter((r) => r.status !== '自由')
  if (bad.length) return toast.warning(`${bad[0]!.no} 已${bad[0]!.status}，只有待提交的能删`)
  if (!(await box.value!.ask({ title: '删除', message: `删除 ${list.length} 张申请单？删除后不能恢复。`, ok: '删除', cancel: '不删' }))) return
  for (const r of list) rows.splice(rows.indexOf(r), 1)
  grid.value?.clear()
  toast.success('已删除')
}
function submit(list: Row[]) {
  for (const r of list) if (r.status === '自由') r.status = '审批中'
  grid.value?.clear()
  toast.success('已提交')
}

/* ---------- 整页新增 ---------- */
interface Line { id: string; lineNo: string; reason: string; content: string; made: string; [k: string]: unknown }
const blank = () => ({ planOrg: '', date: '2026-11-25', applyOrg: '', dept: '', applicant: '', status: '自由', remark: '' })
const card = reactive(blank())
const before = ref('')
const lines = ref<Line[]>([])
const linePicked = ref<Line[]>([])
const bad = ref<string[]>([])
const badFields = ref<string[]>([])
const more = ref(false)
const full = ref(false)
const detailOpen = ref(true)
const lineGrid = useTemplateRef<InstanceType<typeof Grid>>('lineGrid')
const locked = computed(() => card.planOrg === '')
const headReady = computed(() => !!card.planOrg && !!card.applyOrg && !!card.dept && !!card.applicant)
const lineCols: Col[] = [
  { key: 'lineNo', title: '行号' },
  { key: 'reason', title: '变更原因', edit: 'text', required: true, width: 160 },
  { key: 'content', title: '变更内容', edit: 'text', required: true, width: 320 },
  { key: 'made', title: '已生成变更单' },
]
const snap = () => JSON.stringify([card, lines.value])
async function openCard() {
  Object.assign(card, blank())
  lines.value = []
  bad.value = []
  badFields.value = []
  mode.value = 'card'
  before.value = snap()
  await nextTick()
  document.querySelector<HTMLInputElement>('.r-form .el-input__inner')?.focus()
}
const samples: Record<string, string[]> = { planOrg: ['华东计划部', '华南计划部'], applyOrg: ['示例制造公司', '示例装备公司'], dept: ['工艺部', '设计部', '质量部'], applicant: ['林一', '周二', '陈三'] }
type RefKey = 'planOrg' | 'applyOrg' | 'dept' | 'applicant'
const refKey = ref<RefKey | null>(null)
const refPick = ref('')
const refTitle: Record<RefKey, string> = { planOrg: '计划组织', applyOrg: '申请组织', dept: '申请部门', applicant: '申请人' }
function openRef(k: RefKey) {
  refPick.value = card[k]
  refKey.value = k
}
function takeRef() {
  if (refKey.value && refPick.value) {
    card[refKey.value] = refPick.value
    badFields.value = badFields.value.filter((x) => x !== refKey.value)
  }
  refKey.value = null
}
let seq = 0
async function addLine() {
  const row = reactive<Line>({ id: `l${++seq}`, lineNo: String((lines.value.length + 1) * 10), reason: '', content: '', made: '' })
  lines.value.push(row)
  await lineGrid.value?.focusCell(row, 'reason')
}
async function copyLines() {
  for (const l of linePicked.value) lines.value.push(reactive({ ...l, id: `l${++seq}`, lineNo: String((lines.value.length + 1) * 10) }))
}
function dropLines(ids: string[]) {
  lines.value = lines.value.filter((l) => !ids.includes(l.id))
  lineGrid.value?.clear()
}
async function save(kind: 'save' | 'new' | 'submit') {
  badFields.value = (['planOrg', 'applyOrg', 'dept', 'applicant'] as RefKey[]).filter((k) => !card[k])
  bad.value = lines.value.flatMap((l) => (['reason', 'content'] as const).filter((k) => !l[k].trim()).map((k) => `${l.id}:${k}`))
  if (badFields.value.length) return toast.warning(`请先填${badFields.value.map((k) => refTitle[k as RefKey]).join('、')}`)
  if (lines.value.length === 0) return toast.warning('变更明细至少要有一行')
  if (bad.value.length) {
    const [id, key] = bad.value[0]!.split(':')
    const row = lines.value.find((l) => l.id === id)!
    toast.warning(`第 ${lines.value.indexOf(row) + 1} 行·${key === 'reason' ? '变更原因' : '变更内容'}不能为空`)
    return lineGrid.value?.focusCell(row, key!)
  }
  rows.unshift({ id: `x${++seq}`, ...card, no: `GCBG202611${String(60 + seq).padStart(4, '0')}`, status: kind === 'submit' ? '审批中' : '自由', maker: '示例管理员', makeDate: '2026-11-25', approver: '', approveDate: '', creator: '示例管理员', createdAt: '2026-11-25 10:20:00' })
  toast.success(kind === 'submit' ? '已保存并提交' : '已保存')
  if (kind === 'new') await openCard()
  else mode.value = 'list'
}
async function cancel() {
  if (snap() !== before.value && !(await box.value!.ask({ title: '取消', message: '这张单据还没保存，取消后会丢失。', ok: '放弃单据', cancel: '继续填写' }))) return
  mode.value = 'list'
}
</script>

<template>
  <div v-if="mode === 'list'" class="r-page">
    <TitleRow title="工程变更申请单维护" :icon="DocumentChecked" tone="slate">
      <el-button-group><el-button type="primary" @click="openCard">新增</el-button><el-button :disabled="!picked.length" @click="remove(picked)">删除</el-button></el-button-group>
      <el-dropdown class="r-split" split-button trigger="click" :disabled="!picked.length" @click="submit(picked)">提交<template #dropdown><el-dropdown-menu><el-dropdown-item>收回</el-dropdown-item></el-dropdown-menu></template></el-dropdown>
      <el-dropdown trigger="click"><el-button>辅助功能<el-icon class="el-icon--right"><ArrowDown /></el-icon></el-button><template #dropdown><el-dropdown-menu><el-dropdown-item>复制</el-dropdown-item><el-dropdown-item>附件</el-dropdown-item></el-dropdown-menu></template></el-dropdown>
      <el-button :disabled="picked.length !== 1">单据追溯</el-button>
      <el-dropdown class="r-split" split-button trigger="click" :disabled="!picked.length">打印<template #dropdown><el-dropdown-menu><el-dropdown-item>打印</el-dropdown-item><el-dropdown-item>输出</el-dropdown-item></el-dropdown-menu></template></el-dropdown>
      <el-button class="r-icon-btn" :icon="RefreshRight" aria-label="刷新" @click="search" />
    </TitleRow>
    <QueryRow @search="search" @reset="reset">
      <RefInput v-model="form.planOrg" placeholder="计划组织" required />
      <el-date-picker v-model="form.dates" class="is-wide r-dates is-req" :class="{ 'is-bad': missing }" type="daterange" value-format="YYYY-MM-DD" range-separator="~" start-placeholder="申请日期起" end-placeholder="申请日期止" :clearable="true" />
      <el-input v-model="form.no" placeholder="申请单号" />
      <RefInput v-model="form.applyOrg" placeholder="申请组织" />
      <RefInput v-model="form.dept" placeholder="申请部门" />
    </QueryRow>
    <div class="r-body">
      <div class="r-main">
        <StatusTabs v-model="tab" :tabs="tabs" @update:model-value="page = 1" />
        <div class="r-fill">
          <Grid ref="grid" :rows="shown" :cols="cols" :empty-text="missing ? '还没有查询：缺少申请日期' : '没有符合条件的申请单'" :empty-note="missing ? '填上申请日期再查' : '换个条件，或点“…”清空条件'" @selection="(l) => (picked = l as Row[])" @open="openCard">
            <template #ops="{ row }"><el-button link @click="openCard">修改</el-button><el-button link :disabled="row.status !== '自由'" @click="submit([row as Row])">提交</el-button><el-button link @click="remove([row as Row])">删除</el-button></template>
          </Grid>
        </div>
        <GridFoot v-model:page="page" v-model:size="size" :total="byTab.length" :picked="picked.length" />
      </div>
    </div>
  </div>

  <div v-else class="r-page">
    <TitleRow v-show="!full" title="工程变更申请单维护" :icon="DocumentChecked" tone="slate">
      <el-button-group><el-button type="primary" @click="save('save')">保存</el-button><el-button @click="save('new')">保存新增</el-button><el-button @click="save('submit')">保存提交</el-button></el-button-group>
      <el-button @click="cancel">取消</el-button>
    </TitleRow>
    <div v-show="!full" class="r-form-wrap">
      <div class="r-form">
        <div class="r-f" :class="{ 'is-bad': badFields.includes('planOrg') }"><label><i class="r-star">*</i>计划组织</label><RefInput v-model="card.planOrg" placeholder="先选计划组织" @open="openRef('planOrg')" /></div>
        <div class="r-f"><label><i class="r-star">*</i>申请日期</label><el-date-picker v-model="card.date" type="date" value-format="YYYY-MM-DD" :clearable="false" :disabled="locked" /></div>
        <div class="r-f" :class="{ 'is-bad': badFields.includes('applyOrg') }"><label><i class="r-star">*</i>申请组织</label><RefInput v-model="card.applyOrg" :disabled="locked" @open="openRef('applyOrg')" /></div>
        <div class="r-f" :class="{ 'is-bad': badFields.includes('dept') }"><label><i class="r-star">*</i>申请部门</label><RefInput v-model="card.dept" :disabled="locked" @open="openRef('dept')" /></div>
        <div class="r-f" :class="{ 'is-bad': badFields.includes('applicant') }"><label><i class="r-star">*</i>申请人</label><RefInput v-model="card.applicant" :disabled="locked" @open="openRef('applicant')" /></div>
        <div class="r-f"><label>单据状态</label><el-select v-model="card.status" disabled><el-option value="自由" label="自由" /></el-select></div>
        <div class="r-f"><label>备注</label><el-input v-model="card.remark" :disabled="locked" /></div>
      </div>
      <button type="button" class="r-group" @click="more = !more">{{ more ? '-' : '+' }}操作信息</button>
      <div v-if="more" class="r-form">
        <div v-for="k in ['制单人', '制单时间', '审批人', '审批时间']" :key="k" class="r-f"><label>{{ k }}</label><el-input disabled /></div>
      </div>
    </div>
    <div class="r-body">
      <div class="r-main">
        <div class="r-sub">
          <button type="button" class="r-sub-caret" aria-label="收起明细" @click="detailOpen = !detailOpen"><el-icon :class="{ 'is-closed': !detailOpen }"><CaretBottom /></el-icon></button>
          <span class="r-sub-name">变更明细 ({{ lines.length }})</span><span>已选 {{ linePicked.length }} 条</span><i />
          <span v-if="!headReady" class="r-why">填完计划组织、申请组织、申请部门、申请人才能增行</span>
          <el-button-group><el-button :disabled="!headReady" @click="addLine">增行</el-button><el-button :disabled="!linePicked.length" @click="dropLines(linePicked.map((l) => l.id))">删行</el-button><el-button :disabled="!linePicked.length" @click="copyLines">复制行</el-button></el-button-group>
          <el-button :disabled="lines.length < 2" @click="lines.forEach((l, i) => (l.lineNo = String((i + 1) * 10)))">重排行号</el-button>
          <el-button class="r-icon-btn" :icon="FullScreen" aria-label="全屏" @click="full = !full" />
        </div>
        <div v-show="detailOpen" class="r-fill">
          <Grid ref="lineGrid" :rows="lines" :cols="lineCols" editing :bad="bad" empty-text="还没有变更明细" :empty-note="`可选的变更原因：${REASONS.map((r) => r.name).join('、')}`" @selection="(l) => (linePicked = l as Line[])" @change="(row, key) => (bad = bad.filter((k) => k !== `${row.id}:${key}`))">
            <template #ops="{ row }"><el-button link @click="dropLines([row.id])">删行</el-button></template>
          </Grid>
        </div>
      </div>
    </div>
    <el-dialog :model-value="refKey !== null" :title="refKey ? refTitle[refKey] : ''" width="640px" align-center :close-on-click-modal="false" @close="refKey = null">
      <div class="r-orgs">
        <div class="r-orgs-bar"><el-input :placeholder="`搜索${refKey ? refTitle[refKey] : ''}`" /><el-checkbox label="显示停用" /></div>
        <div class="r-picks"><button v-for="s in refKey ? samples[refKey] : []" :key="s" type="button" :class="{ 'is-on': refPick === s }" @click="refPick = s" @dblclick="takeRef">{{ s }}</button></div>
      </div>
      <template #footer><el-button type="primary" :disabled="!refPick" @click="takeRef">确定</el-button><el-button @click="refKey = null">取消</el-button></template>
    </el-dialog>
  </div>
  <ConfirmBox ref="box" />
</template>
