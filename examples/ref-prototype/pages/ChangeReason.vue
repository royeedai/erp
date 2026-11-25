<script setup lang="ts">
// 工程变更原因：简单档案，表内编辑。动作在标题行，编辑中主按钮换成保存，取消在它右边。
import { computed, reactive, ref, useTemplateRef } from 'vue'
import { Memo, RefreshRight } from '@element-plus/icons-vue'
import { toast } from '@/shared/ui/feedback'
import { REASONS, type ReasonRow } from '../data'
import ConfirmBox from '../parts/ConfirmBox.vue'
import Grid, { type Col } from '../parts/Grid.vue'
import TitleRow from '../parts/TitleRow.vue'

defineOptions({ inheritAttrs: false })

const showOff = ref(false)
const editing = ref(false)
const draft = ref<ReasonRow[]>([])
const before = ref('')
const bad = ref<string[]>([])
const picked = ref<ReasonRow[]>([])
const grid = useTemplateRef<InstanceType<typeof Grid>>('grid')
const box = useTemplateRef<InstanceType<typeof ConfirmBox>>('box')
const rows = computed(() => (editing.value ? draft.value : REASONS.filter((r) => showOff.value || r.status === '已启用')))
const dirty = computed(() => editing.value && JSON.stringify(draft.value) !== before.value)

const cols: Col[] = [
  { key: 'code', title: '变更原因编码', edit: 'text', required: true },
  { key: 'name', title: '变更原因名称', edit: 'text', required: true },
  { key: 'desc', title: '描述', edit: 'text' },
  { key: 'status', title: '启用状态', required: true },
  { key: 'creator', title: '创建人' },
  { key: 'createdAt', title: '创建时间', width: 240 },
  { key: 'editor', title: '最后修改人' },
  { key: 'editedAt', title: '最后修改时间', width: 240 },
]
let seq = 0
function start() {
  if (editing.value) return
  draft.value = REASONS.map((r) => reactive({ ...r }))
  before.value = JSON.stringify(draft.value)
  editing.value = true
}
async function add() {
  start()
  const row = reactive<ReasonRow>({ id: `n${++seq}`, code: '', name: '', desc: '', status: '已启用', creator: '', createdAt: '', editor: '', editedAt: '' })
  draft.value.push(row)
  await grid.value?.focusCell(row, 'code')
}
async function edit() {
  start()
  if (draft.value[0]) await grid.value?.focusCell(draft.value[0], 'code')
}
async function save() {
  bad.value = draft.value.flatMap((r) => (['code', 'name'] as const).filter((k) => !r[k].trim()).map((k) => `${r.id}:${k}`))
  if (bad.value.length) {
    const [id, key] = bad.value[0]!.split(':')
    const row = draft.value.find((r) => r.id === id)!
    toast.warning(`第 ${draft.value.indexOf(row) + 1} 行·${key === 'code' ? '变更原因编码' : '变更原因名称'}不能为空`)
    await grid.value?.focusCell(row, key!)
    return
  }
  REASONS.splice(0, REASONS.length, ...draft.value.map((r) => ({ ...r, creator: r.creator || '示例管理员', createdAt: r.createdAt || '2026-11-25 10:20:00' })))
  editing.value = false
  grid.value?.clear()
  toast.success('已保存')
}
async function cancel() {
  if (dirty.value && !(await box.value!.ask({ title: '取消', message: '有未保存的改动，取消后会丢失。', ok: '放弃改动', cancel: '继续编辑' }))) return
  editing.value = false
  bad.value = []
  grid.value?.clear()
}
async function remove(list: ReasonRow[]) {
  if (editing.value) {
    draft.value = draft.value.filter((r) => !list.some((x) => x.id === r.id))
    return grid.value?.clear()
  }
  if (!(await box.value!.ask({ title: '删除', message: `删除 ${list.map((r) => `${r.code} ${r.name}`).join('、')}？删除后不能恢复。`, ok: '删除', cancel: '不删' }))) return
  REASONS.splice(0, REASONS.length, ...REASONS.filter((r) => !list.some((x) => x.id === r.id)))
  grid.value?.clear()
  toast.success('已删除')
}
function toggle(r: ReasonRow) {
  r.status = r.status === '已启用' ? '已停用' : '已启用'
  toast.success(r.status)
}
</script>

<template>
  <div class="r-page">
    <TitleRow title="工程变更原因" :icon="Memo" tone="orange">
      <template #after><el-checkbox v-model="showOff" style="margin-left: 18px" label="显示停用" :disabled="editing" /></template>
      <template v-if="editing">
        <el-button-group><el-button @click="add">新增</el-button><el-button :disabled="picked.length === 0" @click="remove(picked)">删除</el-button></el-button-group>
        <el-button type="primary" @click="save">保存</el-button><el-button @click="cancel">取消</el-button>
      </template>
      <template v-else>
        <el-button-group><el-button type="primary" @click="add">新增</el-button><el-button @click="edit">修改</el-button><el-button :disabled="picked.length === 0" @click="remove(picked)">删除</el-button></el-button-group>
        <el-dropdown class="r-split" split-button trigger="click" :disabled="picked.length === 0">启用<template #dropdown><el-dropdown-menu><el-dropdown-item>停用</el-dropdown-item></el-dropdown-menu></template></el-dropdown>
        <el-dropdown class="r-split" split-button trigger="click">打印<template #dropdown><el-dropdown-menu><el-dropdown-item>打印</el-dropdown-item><el-dropdown-item>输出</el-dropdown-item></el-dropdown-menu></template></el-dropdown>
        <el-button class="r-icon-btn" :icon="RefreshRight" aria-label="刷新" @click="toast.success('已刷新')" />
      </template>
    </TitleRow>
    <div class="r-body">
      <div class="r-main">
        <div class="r-fill">
          <Grid ref="grid" :rows="rows" :cols="cols" :editing="editing" :bad="bad" :ops-width="120" empty-text="还没有变更原因" @selection="(l) => (picked = l as ReasonRow[])" @change="(row, key) => (bad = bad.filter((k) => k !== `${row.id}:${key}`))">
            <template #ops="{ row }"><el-button link @click="remove([row as ReasonRow])">删除</el-button><el-button v-if="!editing" link @click="toggle(row as ReasonRow)">{{ row.status === '已启用' ? '停用' : '启用' }}</el-button></template>
          </Grid>
        </div>
      </div>
    </div>
    <ConfirmBox ref="box" />
  </div>
</template>
