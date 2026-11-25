<script setup lang="ts">
// 首页：消息处理中心、订单执行跟踪、日常业务、待提交单据、常用应用、日历。版式按参照站，数字虚构。
import { computed, ref } from 'vue'
import { ArrowLeft, ArrowRight, Bell, Briefcase, Calendar, Collection, DataBoard, Document, DocumentChecked, EditPen, Files, Goods, List, Memo, MessageBox, Plus, RefreshRight, Right, Search, Stamp, Tickets, UserFilled, Wallet } from '@element-plus/icons-vue'
import AppIcon from '../parts/AppIcon.vue'
import RefInput from '../parts/RefInput.vue'

const emit = defineEmits<{ open: [key: string, title: string] }>()

const centers = [
  { label: '审批中心', n: 6, icon: Stamp, tone: 'blue' },
  { label: '业务中心', n: 12, icon: Briefcase, tone: 'teal' },
  { label: '预警中心', n: 2, icon: Bell, tone: 'orange' },
  { label: '通知中心', n: 9, icon: MessageBox, tone: 'violet' },
]
const track = [
  ['订单物料数量', '1,286.00', 'blue'],
  ['累计到货数量', '1,040.00', 'green'],
  ['累计入库数量', '1,012.00', 'blue'],
  ['累计发票数量', '960.00', 'green'],
  ['累计发票金额（万元）', '328.46', 'blue'],
  ['累计付款金额（万元）', '251.90', 'green'],
]
const daily = [['待报价', 3, '行'], ['合同待生效', 1, '份'], ['采购待下单', 8, '行'], ['未来7天采购待收货', 5, '行'], ['采购待收票', 4, '行']] as const
const pay = [['订单当前可付款', 2, '行'], ['订单逾期未付款', 1, '行']] as const
const drafts = [
  { label: '采购合同', n: 1, unit: '份', icon: Document, tone: 'teal' },
  { label: '采购订单', n: 3, unit: '张', icon: DocumentChecked, tone: 'blue' },
  { label: '到货单', n: 2, unit: '张', icon: Files, tone: 'orange' },
  { label: '进度确认单', n: 0, unit: '张', icon: Memo, tone: 'red' },
  { label: '采购发票', n: 1, unit: '张', icon: Tickets, tone: 'violet' },
]
const draft = ref(1)
const draftRows = computed(() =>
  Array.from({ length: drafts[draft.value]!.n }, (_, i) => ({ no: `CG202611${String(25 - i)}000${i + 1}`, who: ['示例建材有限公司', '示例机电股份有限公司', '示例钢构集团有限公司'][i % 3], amt: ['128,600.00', '46,200.00', '310,055.80'][i % 3], date: `2026-11-${25 - i}` })),
)
const appTab = ref<'often' | 'recent'>('often')
const often = [
  { t: '项目岗位', k: 'project-role', icon: UserFilled, tone: 'blue' as const },
  { t: '供应商-集团', k: 'supplier', icon: Collection, tone: 'slate' as const },
  { t: '采购订单维护', k: 'purchase', icon: Goods, tone: 'violet' as const },
  { t: '工程变更申请单维护', k: 'change-order', icon: EditPen, tone: 'teal' as const },
  { t: '工程变更原因', k: 'change-reason', icon: List, tone: 'orange' as const },
  { t: '付款申请', k: '', icon: Wallet, tone: 'red' as const },
  { t: '付款合同', k: '', icon: Document, tone: 'blue' as const },
  { t: '应收核销', k: '', icon: DataBoard, tone: 'teal' as const },
]
const recent = often.slice(0, 5)
const week = [['日', 22], ['一', 23], ['二', 24], ['三', 25], ['四', 26], ['五', 27], ['六', 28]] as const
</script>

<template>
  <div class="r-home">
    <div class="r-home-left">
      <section class="r-card is-msg">
        <h3>消息处理中心</h3>
        <div class="r-msg">
          <span class="r-msg-face"><el-icon :size="30"><UserFilled /></el-icon></span>
          <div class="r-msg-hi"><b>你好！示例管理员</b><p>今天有 6 条审批等你处理</p></div>
          <div class="r-msg-list">
            <button v-for="c in centers" :key="c.label" type="button" class="r-msg-tile" :class="`is-${c.tone}`" @click="emit('open', '', c.label)">
              <i><el-icon :size="18"><component :is="c.icon" /></el-icon></i><span><b>{{ c.n }}</b>{{ c.label }}</span>
            </button>
          </div>
        </div>
        <el-icon class="r-card-refresh"><RefreshRight /></el-icon>
      </section>
      <section class="r-card is-track r-span">
        <header><h3>采购订单执行跟踪</h3><i /><el-input placeholder="订单编号" /><RefInput placeholder="供应商" /><RefInput placeholder="物料" /><button type="button" class="r-query-go" aria-label="查询"><el-icon><Search /></el-icon></button></header>
        <div class="r-track">
          <div v-for="[label, n, tone] in track" :key="label" :class="`is-${tone}`"><span>{{ label }}</span><el-icon><Right /></el-icon><b class="r-num">{{ n }}</b></div>
        </div>
        <el-icon class="r-card-refresh"><RefreshRight /></el-icon>
      </section>
      <section class="r-card is-daily">
        <h3>日常业务</h3>
        <div class="r-daily"><div v-for="[label, n, unit] in daily" :key="label"><span>{{ label }}</span><p><b>{{ n }}</b>{{ unit }}</p></div></div>
        <el-icon class="r-card-refresh"><RefreshRight /></el-icon>
      </section>
      <section class="r-card is-draft">
        <h3>待提交单据</h3>
        <div class="r-drafts">
          <button v-for="(d, i) in drafts" :key="d.label" type="button" :class="[`is-${d.tone}`, { 'is-on': i === draft }]" @click="draft = i">
            <i><el-icon :size="17"><component :is="d.icon" /></el-icon></i><span>{{ d.label }}<em><b>{{ d.n }}</b>{{ d.unit }}</em></span>
          </button>
        </div>
        <div v-if="draftRows.length" class="r-draft-rows"><div v-for="r in draftRows" :key="r.no"><a>{{ r.no }}</a><span>{{ r.who }}</span><span class="r-num">{{ r.amt }}</span><span>{{ r.date }}</span></div></div>
        <p v-else class="r-draft-none">没有待提交的{{ drafts[draft]!.label }}</p>
      </section>
    </div>
    <div class="r-home-right">
      <section class="r-card is-chart"><p>本月采购金额，图表在报表阶段接</p></section>
      <div class="r-track-space" />
      <section class="r-card is-pay">
        <h3>付款计划提醒</h3>
        <div class="r-daily"><div v-for="[label, n, unit] in pay" :key="label"><span>{{ label }}</span><p><b>{{ n }}</b>{{ unit }}</p></div></div>
        <el-icon class="r-card-refresh"><RefreshRight /></el-icon>
      </section>
      <section class="r-card is-apps">
        <header class="r-apps-tabs"><button type="button" :class="{ 'is-on': appTab === 'often' }" @click="appTab = 'often'">常用应用</button><button type="button" :class="{ 'is-on': appTab === 'recent' }" @click="appTab = 'recent'">最近访问</button><i /><el-icon><Plus /></el-icon></header>
        <div class="r-apps"><button v-for="a in appTab === 'often' ? often : recent" :key="a.t" type="button" @click="emit('open', a.k, a.t)"><AppIcon :icon="a.icon" :tone="a.tone" :size="34" /><span>{{ a.t }}</span></button></div>
      </section>
      <section class="r-card is-cal">
        <header><b>2026年 11月</b><el-icon><ArrowLeft /></el-icon><el-icon><ArrowRight /></el-icon><i /><el-icon><Plus /></el-icon></header>
        <div class="r-week"><div v-for="[w, d] in week" :key="w" :class="{ 'is-on': d === 25 }"><span>{{ w }}</span><b>{{ d }}</b></div></div>
        <p class="r-cal-none"><el-icon><Calendar /></el-icon>今天没有日程<a>+立即添加日程</a></p>
      </section>
    </div>
  </div>
</template>

<style>
.r-home { height: 100%; box-sizing: border-box; position: relative; display: grid; grid-template-columns: 2fr 1fr; gap: 8px; padding: 14px 40px 20px 32px; overflow: auto; background: linear-gradient(160deg, #EEF1FA 0%, #EDEDF9 45%, #DDE4F5 100%); }
.r-home-left, .r-home-right { display: grid; gap: 8px; min-width: 0; }
.r-home-left { grid-template-rows: auto auto auto 1fr; }
.r-home-right { grid-template-rows: auto auto auto auto 1fr; }
.r-card { position: relative; box-sizing: border-box; padding: 12px 14px; border-radius: 8px; background: #FFFFFF; min-width: 0; }
.r-card h3 { font-size: 14px; line-height: 20px; color: #25252B; }
.r-card-refresh { position: absolute; left: 12px; bottom: 8px; font-size: 14px; color: #B4B3BB; cursor: pointer; }
.r-card.is-msg, .r-card.is-chart { height: 184px; }
.r-card.is-msg { background: radial-gradient(circle at 100% 100%, #FDEBEC 0, #FFFFFF 180px), #FFFFFF; }
.r-card.is-chart { display: flex; align-items: center; justify-content: center; color: var(--r-text-3); }
.r-msg { display: flex; align-items: center; margin-top: 22px; }
.r-msg-face { flex: none; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; border: 1px solid #C9D2EA; border-radius: 50%; background: #F2F5FD; color: #7E95CC; }
.r-msg-hi { width: 160px; flex: none; margin-left: 12px; }
.r-msg-hi b { font-size: 13px; font-weight: 400; }
.r-msg-hi p { margin-top: 2px; color: var(--r-text-3); }
.r-msg-list { flex: 1; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 0 4% 0 26px; }
.r-msg-tile { height: 84px; display: flex; align-items: center; gap: 15px; padding: 0 0 0 14%; border: none; border-radius: 8px; font-size: 12px; text-align: left; color: #35353B; cursor: pointer; }
.r-msg-tile i { flex: none; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; border-radius: 50%; color: #FFFFFF; }
.r-msg-tile b { display: block; font-size: 20px; line-height: 24px; font-weight: 400; }
.r-msg-tile.is-blue { background: #E8EDFF; } .r-msg-tile.is-blue i { background: #4580F4; box-shadow: 0 4px 10px rgba(69, 128, 244, 0.35); } .r-msg-tile.is-blue b { color: #4580F4; }
.r-msg-tile.is-teal { background: #DEF3F5; } .r-msg-tile.is-teal i { background: #0FC3BD; box-shadow: 0 4px 10px rgba(15, 195, 189, 0.35); } .r-msg-tile.is-teal b { color: #10A7A2; }
.r-msg-tile.is-orange { background: #FDE8E2; } .r-msg-tile.is-orange i { background: #F6895A; box-shadow: 0 4px 10px rgba(246, 137, 90, 0.35); } .r-msg-tile.is-orange b { color: #EE7742; }
.r-msg-tile.is-violet { background: #F3EBFE; } .r-msg-tile.is-violet i { background: #8F79EC; box-shadow: 0 4px 10px rgba(143, 121, 236, 0.35); } .r-msg-tile.is-violet b { color: #8068E4; }
.r-card.is-track { height: 184px; }
.r-home-left > .r-span { width: calc(150% + 8px); z-index: 1; }
.r-track-space { height: 184px; }
.r-card.is-track header { display: flex; align-items: center; gap: 6px; height: 26px; }
.r-card.is-track header > i:not(.el-icon) { flex: 1; }
.r-card.is-track header .el-input { width: 172px; }
.r-track { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-top: 8px; }
.r-track > div { position: relative; height: 104px; box-sizing: border-box; padding: 18px 14px; border-radius: 6px; border-right: 3px solid; background: linear-gradient(#F6F4FA, #FFFFFF); box-shadow: 0 2px 6px rgba(60, 60, 100, 0.1); }
.r-track > div > .el-icon { position: absolute; top: 18px; right: 14px; font-size: 18px; }
.r-track .el-icon svg { stroke: currentColor; stroke-width: 60px; }
.r-track .is-blue { border-right-color: #4B82E6; } .r-track .is-blue .el-icon { color: #4B82E6; }
.r-track .is-green { border-right-color: #36B368; } .r-track .is-green .el-icon { color: #36B368; }
.r-track b { display: block; margin-top: 26px; font-size: 20px; line-height: 26px; font-weight: 400; }
.r-track span { color: #35353B; }
.r-card.is-daily, .r-card.is-pay { height: 232px; }
.r-card.is-daily { background: linear-gradient(120deg, #F7F8FF 0%, #FFFFFF 40%, #EDF1FF 100%); }
.r-card.is-pay { background: linear-gradient(120deg, #FFF9FA 0%, #FFFFFF 55%, #FBF1F3 100%); }
.r-daily { display: flex; margin-top: 60px; padding-left: 32px; }
.r-daily > div { flex: 1; min-width: 0; padding-left: 0; border-left: 1px solid transparent; }
.r-daily > div + div { padding-left: 22px; border-left-color: #E6E6F0; }
.r-daily span { font-size: 14px; color: var(--r-text-3); white-space: nowrap; }
.r-daily p, .r-drafts em { margin-top: 10px; color: var(--r-text-4); font-style: normal; display: block; }
.r-daily b { margin-right: 4px; font-size: 24px; line-height: 30px; font-weight: 400; color: #1F1F25; }
.r-card.is-draft { min-height: 400px; background: linear-gradient(#FAF8FD 0, #FAF8FD 152px, #FFFFFF 152px); }
.r-drafts { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin: 16px 16px 0; }
.r-drafts button { height: 76px; display: flex; align-items: center; gap: 12px; padding: 0 0 0 15px; border: none; border-radius: 6px; background: none; font-size: 14px; text-align: left; color: var(--r-text-3); cursor: pointer; }
.r-drafts button.is-on { background: #ECEFFE; } .r-drafts button.is-on b { color: var(--r-blue); }
.r-drafts i { flex: none; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
.r-drafts em { margin-top: 2px; font-size: 12px; } .r-drafts em b { margin-right: 3px; font-size: 24px; line-height: 30px; font-weight: 400; color: #1F1F25; }
.r-drafts .is-teal i { background: #D3F1EF; color: #10B0AA; } .r-drafts .is-blue i { background: #DAE8FB; color: #2C78EA; } .r-drafts .is-orange i { background: #FCE9D6; color: #F0932B; } .r-drafts .is-red i { background: #FCE0E0; color: #EB5757; } .r-drafts .is-violet i { background: #E8E0F6; color: #7C56C9; }
.r-draft-rows { margin: 30px 16px 0; }
.r-draft-rows > div { display: grid; grid-template-columns: 1.4fr 2fr 1fr 1fr; line-height: 32px; border-bottom: 1px solid var(--r-row-line); }
.r-draft-rows a { color: var(--r-link); cursor: pointer; }
.r-draft-rows .r-num { text-align: right; padding-right: 60px; }
.r-draft-none { padding-top: 110px; text-align: center; color: var(--r-text-4); }
.r-card.is-apps { height: 184px; }
.r-apps-tabs { display: flex; gap: 24px; align-items: center; }
.r-apps-tabs > i:not(.el-icon) { flex: 1; }
.r-apps-tabs > .el-icon { font-size: 16px; }
.r-apps-tabs button { position: relative; padding: 0 0 4px; border: none; background: none; font-size: 14px; color: var(--r-text-3); cursor: pointer; font-weight: 700; }
.r-apps-tabs button.is-on { color: #25252B; } .r-apps-tabs button.is-on::after { content: ''; position: absolute; left: 50%; bottom: 0; width: 24px; height: 2px; margin-left: -12px; background: var(--r-primary); }
.r-apps { display: grid; grid-template-columns: repeat(8, 1fr); gap: 4px; margin-top: 12px; }
@media (max-width: 1900px) { .r-apps { grid-template-columns: repeat(4, 1fr); } .r-card.is-apps { height: auto; min-height: 184px; } }
.r-apps button { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 0; border: none; background: none; font-size: 12px; line-height: 16px; color: #35353B; cursor: pointer; }
.r-card.is-cal { min-height: 300px; }
.r-card.is-cal header { display: flex; align-items: center; gap: 4px; font-size: 16px; } .r-card.is-cal header b { font-weight: 400; margin-right: 6px; } .r-card.is-cal header > i:not(.el-icon) { flex: 1; } .r-card.is-cal header .el-icon { padding: 2px; font-size: 12px; background: #F0EFF5; } .r-card.is-cal header .el-icon:last-child { padding: 0; font-size: 16px; background: none; }
.r-week { display: grid; grid-template-columns: repeat(7, 1fr); margin: 14px -4px 0; padding-bottom: 10px; box-shadow: 0 2px 6px rgba(60, 60, 100, 0.1); border-radius: 6px; text-align: center; }
.r-week span { display: block; line-height: 30px; font-size: 13px; color: #9A9FBD; } .r-week b { display: inline-block; width: 60px; line-height: 34px; border-radius: 6px; font-size: 13px; } .r-week .is-on b { background: #F1F1F6; font-size: 18px; color: var(--r-primary); }
.r-cal-none { display: flex; justify-content: center; align-items: center; gap: 6px; margin-top: 60px; color: var(--r-text-4); } .r-cal-none a { color: var(--r-link); text-decoration: underline; cursor: pointer; }
</style>
