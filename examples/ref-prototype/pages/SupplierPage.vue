<script setup lang="ts">
// 供应商-集团：档案列表（没有状态页签）和整页档案卡片（字段多，分组可折叠，带子表页签）。
import { computed, reactive, ref, useTemplateRef } from 'vue'
import { ArrowDown, Download, RefreshRight } from '@element-plus/icons-vue'
import { toast } from '@/shared/ui/feedback'
import { SUPPLIERS, type Row } from '../data'
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
const grid = useTemplateRef<InstanceType<typeof Grid>>('grid')
const showOff = ref(false)
const form = reactive({ org: '示例集团', category: '', code: '', name: '', short: '' })
const asked = ref({ ...form })
const page = ref(1)
const size = ref(50)
const picked = ref<Row[]>([])
const has = (a: unknown, b: string) => !b.trim() || String(a).includes(b.trim())
const rows = computed(() => (asked.value.org ? SUPPLIERS.filter((r) => has(r.category, asked.value.category) && has(r.code, asked.value.code) && has(r.name, asked.value.name) && has(r.short, asked.value.short)) : []))
const shown = computed(() => rows.value.slice((page.value - 1) * size.value, page.value * size.value))
function search() {
  asked.value = { ...form }
  page.value = 1
  grid.value?.clear()
}
function reset() {
  Object.assign(form, { org: '示例集团', category: '', code: '', name: '', short: '' })
  search()
}
const cols: Col[] = [
  { key: 'attach', title: '附件', width: 80 },
  { key: 'org', title: '所属组织' },
  { key: 'code', title: '供应商编码' },
  { key: 'name', title: '供应商名称', width: 220 },
  { key: 'short', title: '供应商简称' },
  { key: 'mnemonic', title: '助记码' },
  { key: 'category', title: '供应商基本分类' },
  { key: 'area', title: '地区分类' },
  { key: 'status', title: '供应商状态' },
  { key: 'finType', title: '财务组织供应商类型', width: 150 },
  { key: 'tax', title: '统一社会信用代码', width: 180 },
  { key: 'parent', title: '上级供应商' },
  { key: 'founded', title: '成立日期' },
]

const blank = () => ({ code: '', name: '', en: '', short: '', mnemonic: '', category: '', area: '', tax: '', parent: '', rate: '', zone: '北京时间(UTC+08:00)', fmt: '中文简体', industry: '', eco: '', capital: '', founded: '', legal: '', taxType: '', remark: '', finType: '外部单位', retail: false, inspect: false, carrier: false, mobile: false, buy: false, inner: false })
const card = reactive(blank())
const before = ref('')
const bad = ref<string[]>([])
const open = reactive<Record<string, boolean>>({ 供应商性质: true, 联系信息: false, 状态信息: false, 版本信息: false, 审计信息: false })
const sub = ref('contact')
function openCard() {
  Object.assign(card, blank())
  before.value = JSON.stringify(card)
  bad.value = []
  mode.value = 'card'
}
function save() {
  bad.value = [['code', card.code], ['name', card.name], ['category', card.category]].filter(([, v]) => !v).map(([k]) => k!)
  if (bad.value.length) return toast.warning('标红的必填项没有填')
  toast.success('已保存')
  mode.value = 'list'
}
async function cancel() {
  if (JSON.stringify(card) !== before.value && !(await box.value!.ask({ title: '取消', message: '这个供应商还没保存，取消后会丢失。', ok: '放弃填写', cancel: '继续填写' }))) return
  mode.value = 'list'
}
async function remove(list: Row[]) {
  if (!(await box.value!.ask({ title: '删除', message: `删除 ${list.length} 个供应商？删除后不能恢复。`, ok: '删除', cancel: '不删' }))) return
  toast.success('已删除')
  grid.value?.clear()
}
</script>

<template>
  <div v-if="mode === 'list'" class="r-page">
    <TitleRow title="供应商-集团" :icon="Download" tone="slate">
      <template #after><el-checkbox v-model="showOff" style="margin-left: 24px" label="显示停用" /></template>
      <el-button-group><el-button type="primary" @click="openCard">新增</el-button><el-button :disabled="!picked.length" @click="remove(picked)">删除</el-button></el-button-group>
      <el-dropdown class="r-split" split-button trigger="click" :disabled="!picked.length">分配<template #dropdown><el-dropdown-menu><el-dropdown-item>取消分配</el-dropdown-item></el-dropdown-menu></template></el-dropdown>
      <el-dropdown class="r-split" split-button trigger="click" :disabled="!picked.length">启用<template #dropdown><el-dropdown-menu><el-dropdown-item>停用</el-dropdown-item></el-dropdown-menu></template></el-dropdown>
      <el-dropdown v-for="k in ['导入', '导出', '更多']" :key="k" trigger="click"><el-button>{{ k }}<el-icon class="el-icon--right"><ArrowDown /></el-icon></el-button><template #dropdown><el-dropdown-menu><el-dropdown-item>{{ k === '更多' ? '复制' : k }}</el-dropdown-item></el-dropdown-menu></template></el-dropdown>
      <el-button class="r-icon-btn" :icon="RefreshRight" aria-label="刷新" @click="search" />
    </TitleRow>
    <QueryRow @search="search" @reset="reset">
      <RefInput v-model="form.org" placeholder="所属组织" required />
      <RefInput v-model="form.category" placeholder="供应商基本分类" />
      <el-input v-model="form.code" placeholder="供应商编码" />
      <el-input v-model="form.name" placeholder="供应商名称" />
      <el-input v-model="form.short" placeholder="供应商简称" />
    </QueryRow>
    <div class="r-body">
      <div class="r-main">
        <div class="r-fill">
          <Grid ref="grid" :rows="shown" :cols="cols" :empty-text="asked.org ? '没有符合条件的供应商' : '还没有查询：缺少所属组织'" :empty-note="asked.org ? '换个条件，或点“…”清空条件' : '选了所属组织再查'" @selection="(l) => (picked = l as Row[])" @open="openCard">
            <template #cell-attach="{ row }"><a class="r-a">{{ row.attach ? '1 个' : '' }}</a></template>
            <template #cell-code="{ row }"><a class="r-a" @click="openCard">{{ row.code }}</a></template>
            <template #ops="{ row }"><el-button link @click="openCard">修改</el-button><el-button link @click="remove([row as Row])">删除</el-button><el-button link>更多</el-button></template>
          </Grid>
        </div>
        <GridFoot v-model:page="page" v-model:size="size" :total="rows.length" :picked="picked.length" />
      </div>
    </div>
  </div>

  <div v-else class="r-page">
    <TitleRow title="供应商-集团" :icon="Download" tone="slate">
      <el-button-group><el-button type="primary" @click="save">保存</el-button><el-button @click="save">保存新增</el-button></el-button-group><el-button @click="cancel">取消</el-button>
    </TitleRow>
    <div class="r-form-wrap r-form-top">
      <div class="r-form">
        <div class="r-f"><label><i class="r-star">*</i>所属组织</label><RefInput model-value="示例集团" disabled /></div>
        <div class="r-f" :class="{ 'is-bad': bad.includes('code') }"><label><i class="r-star">*</i>供应商编码</label><el-input v-model="card.code" /></div>
        <div class="r-f" :class="{ 'is-bad': bad.includes('name') }"><label><i class="r-star">*</i>供应商名称</label><el-input v-model="card.name" /></div>
        <div class="r-f"><label>供应商英文名称</label><el-input v-model="card.en" /></div>
      </div>
    </div>
    <div class="r-scroll">
      <section class="r-block">
        <h2>基本信息</h2>
        <div class="r-form">
          <div class="r-f"><label>供应商简称</label><el-input v-model="card.short" /></div>
          <div class="r-f"><label>助记码</label><el-input v-model="card.mnemonic" /></div>
          <div class="r-f" :class="{ 'is-bad': bad.includes('category') }"><label><i class="r-star">*</i>供应商基本分类</label><RefInput v-model="card.category" /></div>
          <div class="r-f"><label>地区分类</label><RefInput v-model="card.area" /></div>
          <div class="r-f"><label>对应客户</label><RefInput disabled /></div>
          <div class="r-f"><label>统一社会信用代码</label><el-input v-model="card.tax" /></div>
          <div class="r-f"><label>上级供应商</label><RefInput v-model="card.parent" /></div>
          <div class="r-f"><label>外币汇率类型</label><RefInput v-model="card.rate" /></div>
          <div class="r-f"><label><i class="r-star">*</i>时区</label><RefInput v-model="card.zone" /></div>
          <div class="r-f"><label><i class="r-star">*</i>数据格式</label><RefInput v-model="card.fmt" /></div>
          <div class="r-f"><label>所属经济行业</label><RefInput v-model="card.industry" /></div>
          <div class="r-f"><label>经济类型</label><RefInput v-model="card.eco" /></div>
          <div class="r-f"><label>注册资金</label><el-input v-model="card.capital" /></div>
          <div class="r-f"><label>成立日期</label><el-date-picker v-model="card.founded" type="date" value-format="YYYY-MM-DD" /></div>
          <div class="r-f"><label>法人</label><el-input v-model="card.legal" /></div>
          <div class="r-f"><label>供应商税类</label><RefInput v-model="card.taxType" /></div>
          <div class="r-f is-area"><label>备注</label><el-input v-model="card.remark" type="textarea" :rows="2" resize="none" /></div>
        </div>
        <template v-for="(v, g) in open" :key="g">
          <button type="button" class="r-group" @click="open[g] = !v">{{ v ? '-' : '+' }}{{ g }}</button>
          <div v-if="v && g === '供应商性质'" class="r-form">
            <div class="r-f"><label><i class="r-star">*</i>财务组织供应商类型</label><el-select v-model="card.finType"><el-option value="外部单位" label="外部单位" /><el-option value="内部单位" label="内部单位" /></el-select></div>
            <div class="r-f"><label>对应财务组织</label><RefInput :disabled="card.finType === '外部单位'" /></div>
            <div class="r-f"><label>散户</label><el-switch v-model="card.retail" /></div>
            <div class="r-f"><label>内部利润中心</label><el-checkbox v-model="card.inner" /></div>
            <div class="r-f"><label>外部检测机构</label><el-switch v-model="card.inspect" /></div>
            <div class="r-f"><label>承运商</label><el-switch v-model="card.carrier" /></div>
            <div class="r-f"><label>移动协同</label><el-switch v-model="card.mobile" /></div>
            <div class="r-f"><label>采购协同</label><el-switch v-model="card.buy" /></div>
          </div>
          <div v-else-if="v" class="r-form"><div v-for="k in ['一', '二', '三']" :key="k" class="r-f"><label>{{ g }}字段{{ k }}</label><el-input :disabled="g !== '联系信息'" /></div></div>
        </template>
        <div class="r-subtabs"><StatusTabs v-model="sub" :tabs="[{ key: 'contact', label: '供应商联系人' }, { key: 'tax', label: '供应商国家税类' }]" /></div>
        <div class="r-subgrid"><Grid :rows="[]" :cols="sub === 'contact' ? [{ key: 'a', title: '联系人' }, { key: 'b', title: '性别' }, { key: 'c', title: '职位' }, { key: 'd', title: '电话' }, { key: 'e', title: '手机' }, { key: 'f', title: '是否默认' }] : [{ key: 'a', title: '国家/地区' }, { key: 'b', title: '税类' }]" :key="sub" empty-text="还没有数据" /></div>
      </section>
    </div>
  </div>
  <ConfirmBox ref="box" />
</template>
