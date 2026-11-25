<script setup lang="ts">
// 采购订单：新增先选来源，“自制”排第一；金额列、合计行、主表和主子表切换。
import { computed, reactive, ref, useTemplateRef } from 'vue'
import { ArrowDown, Expand, Goods, RefreshRight, Switch } from '@element-plus/icons-vue'
import { formatAmount, sumAmounts } from '@/shared/money/amount'
import { toast } from '@/shared/ui/feedback'
import { PURCHASES, type Row } from '../data'
import Grid, { type Col } from '../parts/Grid.vue'
import GridFoot from '../parts/GridFoot.vue'
import QueryRow from '../parts/QueryRow.vue'
import RefInput from '../parts/RefInput.vue'
import StatusTabs from '../parts/StatusTabs.vue'
import TitleRow from '../parts/TitleRow.vue'

defineOptions({ inheritAttrs: false })

const form = reactive({ org: '', dates: ['2026-11-01', '2026-11-25'] as string[] | null, supplier: '', item: '', mine: true })
const asked = ref({ org: '', supplier: '' })
const tab = ref('all')
const view = ref<'main' | 'sub'>('main')
const page = ref(1)
const size = ref(50)
const picked = ref<Row[]>([])
const grid = useTemplateRef<InstanceType<typeof Grid>>('grid')
const of: Record<string, string> = { draft: '自由', doing: '审批中', done: '审批通过' }
const has = (a: unknown, b: string) => !b.trim() || String(a).includes(b.trim())
const matched = computed(() => PURCHASES.filter((r) => has(r.org, asked.value.org) && has(r.supplier, asked.value.supplier)))
const byTab = computed(() => (tab.value === 'all' ? matched.value : matched.value.filter((r) => r.status === of[tab.value])))
const slice = computed(() => byTab.value.slice((page.value - 1) * size.value, page.value * size.value))
const shown = computed(() => slice.value.map((r) => ({ ...r, qtyText: formatAmount(String(r.qty), 2), amountText: formatAmount(String(r.amount), 2) })))
const tabs = computed(() => [
  ...[['draft', '待提交'], ['doing', '审批中'], ['done', '执行中']].map(([key, label]) => ({ key: key!, label: label!, count: matched.value.filter((r) => r.status === of[key!]).length })),
  { key: 'all', label: '全部' },
])
const total = computed(() => ({
  __label: '本页合计',
  qtyText: formatAmount(sumAmounts(slice.value.map((r) => String(r.qty)), 2), 2),
  amountText: formatAmount(sumAmounts(slice.value.map((r) => String(r.amount)), 2), 2),
}))
function search() {
  asked.value = { org: form.org, supplier: form.supplier }
  page.value = 1
  grid.value?.clear()
}
function reset() {
  Object.assign(form, { org: '', supplier: '', item: '' })
  search()
}
const cols: Col[] = [
  { key: 'attach', title: '附件', width: 64 },
  { key: 'org', title: '采购组织', width: 160 },
  { key: 'type', title: '订单类型' },
  { key: 'no', title: '订单编号', width: 160 },
  { key: 'date', title: '订单日期' },
  { key: 'supplier', title: '供应商', width: 220 },
  { key: 'qtyText', title: '总数量', align: 'right', num: true },
  { key: 'amountText', title: '总价税合计（CNY）', align: 'right', num: true, width: 170 },
  { key: 'status', title: '单据状态' },
]
</script>

<template>
  <div class="r-page">
    <TitleRow title="采购订单维护" :icon="Goods" tone="violet">
      <el-dropdown trigger="click" @command="(c: string) => toast.warning(`原型里没有做：${c}`)">
        <el-button type="primary">新增<el-icon class="el-icon--right"><ArrowDown /></el-icon></el-button>
        <template #dropdown><el-dropdown-menu><el-dropdown-item command="自制">自制</el-dropdown-item><el-dropdown-item v-for="k in ['请购单', '采购合同', '销售订单']" :key="k" :command="k">{{ k }}</el-dropdown-item></el-dropdown-menu></template>
      </el-dropdown>
      <el-button :disabled="!picked.length">删除</el-button>
      <el-dropdown class="r-split" split-button trigger="click" :disabled="!picked.length">提交<template #dropdown><el-dropdown-menu><el-dropdown-item>收回</el-dropdown-item></el-dropdown-menu></template></el-dropdown>
      <el-dropdown v-for="k in ['辅助功能', '联查']" :key="k" trigger="click"><el-button>{{ k }}<el-icon class="el-icon--right"><ArrowDown /></el-icon></el-button><template #dropdown><el-dropdown-menu><el-dropdown-item>{{ k === '联查' ? '单据追溯' : '附件' }}</el-dropdown-item></el-dropdown-menu></template></el-dropdown>
      <el-dropdown class="r-split" split-button trigger="click" :disabled="!picked.length">打印<template #dropdown><el-dropdown-menu><el-dropdown-item>输出</el-dropdown-item></el-dropdown-menu></template></el-dropdown>
      <el-button class="r-icon-btn" :icon="RefreshRight" aria-label="刷新" @click="search" />
    </TitleRow>
    <QueryRow @search="search" @reset="reset">
      <RefInput v-model="form.org" placeholder="采购组织" required />
      <el-date-picker v-model="form.dates" class="is-wide r-dates is-req" type="daterange" value-format="YYYY-MM-DD" range-separator="~" :clearable="false" />
      <RefInput v-model="form.supplier" placeholder="供应商" />
      <RefInput v-model="form.item" placeholder="物料" />
      <label class="r-mine">需要我处理的单据<el-checkbox v-model="form.mine" /></label>
    </QueryRow>
    <div class="r-body">
      <div class="r-main">
        <StatusTabs v-model="tab" :tabs="tabs" @update:model-value="page = 1">
          <el-button-group><el-button :class="{ 'is-on': view === 'main' }" :icon="Expand" @click="view = 'main'">主表显示</el-button><el-button :class="{ 'is-on': view === 'sub' }" :icon="Switch" @click="((view = 'sub'), toast.warning('原型里没有做主子表'))">主子表显示</el-button></el-button-group>
        </StatusTabs>
        <div class="r-fill">
          <Grid ref="grid" :rows="shown" :cols="cols" :total="total" empty-text="没有符合条件的采购订单" empty-note="换个条件，或点“…”清空条件" @selection="(l) => (picked = l as Row[])">
            <template #cell-attach="{ row }"><a class="r-a">{{ row.attach ? '1 个' : '' }}</a></template>
            <template #cell-no="{ row }"><a class="r-a">{{ row.no }}</a></template>
            <template #ops="{ row }"><el-button link>修改</el-button><el-button link :disabled="row.status !== '自由'">提交</el-button><el-button link>更多</el-button></template>
          </Grid>
        </div>
        <GridFoot v-model:page="page" v-model:size="size" :total="byTab.length" :picked="picked.length" />
      </div>
    </div>
  </div>
</template>
