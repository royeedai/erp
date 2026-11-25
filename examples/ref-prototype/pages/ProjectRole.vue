<script setup lang="ts">
// 项目岗位：标题行选项目组织，左树是项目基本分类，右表增行、修改、删除，整表一次保存。
import { computed, nextTick, reactive, ref, useTemplateRef } from 'vue'
import { CaretBottom, DArrowLeft, FolderOpened, FullScreen, Grid as GridIcon, RefreshRight } from '@element-plus/icons-vue'
import { alertError, toast } from '@/shared/ui/feedback'
import { CATEGORIES, ORGS, ROLES, type CategoryNode, type RoleRow } from '../data'
import ConfirmBox from '../parts/ConfirmBox.vue'
import Grid, { type Col } from '../parts/Grid.vue'
import RefIcon from '../parts/RefIcon.vue'
import TitleRow from '../parts/TitleRow.vue'

defineOptions({ inheritAttrs: false })

const org = ref('示例集团')
const orgOpen = ref(false)
const orgPick = ref('示例集团')
const orgQuery = ref('')
const orgList = computed(() => (orgQuery.value.trim() ? ORGS[0]!.children.filter((o) => o.label.includes(orgQuery.value.trim())) : ORGS))
const showOff = ref(false)
const treeOpen = ref(true)
const listOpen = ref(true)
const full = ref(false)
const node = ref<CategoryNode>(CATEGORIES[0]!)

const editing = ref(false)
const draft = ref<RoleRow[]>([])
const before = ref('')
const bad = ref<string[]>([])
const picked = ref<RoleRow[]>([])
const grid = useTemplateRef<InstanceType<typeof Grid>>('grid')
const box = useTemplateRef<InstanceType<typeof ConfirmBox>>('box')

const saved = computed(() => ROLES[node.value.id] ?? [])
const rows = computed(() => (editing.value ? draft.value : saved.value.filter((r) => showOff.value || r.enabled)))
const dirty = computed(() => editing.value && JSON.stringify(draft.value) !== before.value)

const cols: Col[] = [
  { key: 'code', title: '岗位编码', edit: 'text', required: true },
  { key: 'name', title: '岗位名称', edit: 'text', required: true },
  { key: 'isManager', title: '是否项目经理', edit: 'switch', required: true },
  { key: 'enabled', title: '启用状态', edit: 'switch', required: true },
  { key: 'remark', title: '备注', edit: 'text', width: 240 },
]

let seq = 0
async function startEdit() {
  if (editing.value) return
  draft.value = saved.value.map((r) => reactive({ ...r }))
  before.value = JSON.stringify(draft.value)
  bad.value = []
  editing.value = true
  await nextTick()
}
async function addRow() {
  await startEdit()
  const row = reactive<RoleRow>({ id: `new${++seq}`, code: '', name: '', isManager: false, enabled: true, remark: '' })
  draft.value.push(row)
  await grid.value?.focusCell(row, 'code')
}
async function editRows() {
  await startEdit()
  const first = draft.value[0]
  if (first) await grid.value?.focusCell(first, 'code')
}
function dropDraft(row: { id: string }) {
  draft.value = draft.value.filter((r) => r.id !== row.id)
  bad.value = bad.value.filter((k) => !k.startsWith(`${row.id}:`))
}
async function save() {
  const errors: { row: RoleRow; no: number; key: string; text: string }[] = []
  draft.value.forEach((r, i) => {
    if (!r.code.trim()) errors.push({ row: r, no: i + 1, key: 'code', text: '岗位编码不能为空' })
    else if (draft.value.some((x) => x !== r && x.code.trim() === r.code.trim())) errors.push({ row: r, no: i + 1, key: 'code', text: '岗位编码重复' })
    if (!r.name.trim()) errors.push({ row: r, no: i + 1, key: 'name', text: '岗位名称不能为空' })
  })
  bad.value = errors.map((e) => `${e.row.id}:${e.key}`)
  if (errors.length) {
    const first = errors[0]!
    toast.warning(`第 ${first.no} 行·${first.text}${errors.length > 1 ? `，共 ${errors.length} 处` : ''}`)
    await grid.value?.focusCell(first.row, first.key)
    return
  }
  ROLES[node.value.id] = draft.value.map((r) => ({ ...r }))
  editing.value = false
  grid.value?.clear()
  toast.success('已保存')
}
async function leave() {
  if (dirty.value && !(await box.value!.ask({ title: '取消', message: '有未保存的改动，取消后会丢失。', ok: '放弃改动', cancel: '继续编辑' }))) return false
  editing.value = false
  bad.value = []
  grid.value?.clear()
  return true
}
async function selectNode(data: CategoryNode) {
  if (data.id === node.value.id) return
  if (editing.value && !(await leave())) {
    tree.value?.setCurrentKey(node.value.id)
    return
  }
  node.value = data
  grid.value?.clear()
}
const tree = useTemplateRef<{ setCurrentKey(k: string): void }>('tree')
async function remove(list: RoleRow[]) {
  const used = list.filter((r) => r.isManager)
  if (used.length) {
    await alertError('不能删除', `${used.map((r) => `${r.code} ${r.name}`).join('、')} 已被项目引用，可以改为停用`)
    return
  }
  const ok = await box.value!.ask({ title: '删除', message: `删除 ${list.map((r) => `${r.code} ${r.name}`).join('、')}？删除后不能恢复。`, ok: '删除', cancel: '不删' })
  if (!ok) return
  ROLES[node.value.id] = saved.value.filter((r) => !list.some((x) => x.id === r.id))
  grid.value?.clear()
  toast.success('已删除')
}
function toggleRow(row: RoleRow) {
  row.enabled = !row.enabled
  toast.success(row.enabled ? '已启用' : '已停用')
}
</script>

<template>
  <div class="r-page">
    <TitleRow title="项目岗位" :icon="FolderOpened">
      <template #after>
        <button type="button" class="r-orgbox" :disabled="editing" aria-haspopup="dialog" @click="((orgPick = org), (orgOpen = true))"><i class="r-star">*</i><span>{{ org }}</span><RefIcon /></button>
        <el-checkbox v-model="showOff" class="r-showoff" label="显示停用岗位" :disabled="editing" />
      </template>
    </TitleRow>
    <div class="r-body">
      <aside v-show="treeOpen && !full" class="r-side">
        <el-tree ref="tree" class="r-tree" :data="CATEGORIES" node-key="id" :default-expanded-keys="['root']" :current-node-key="node.id" highlight-current :expand-on-click-node="false" :indent="26" @node-click="selectNode">
          <template #default="{ data, node: n }">
            <span class="r-node">
              <svg v-if="!n.isLeaf" width="17" height="14" viewBox="0 0 17 14" aria-hidden="true">
                <path d="M1 2.4C1 1.6 1.6 1 2.4 1h3.7l1.6 1.9h6.9c.8 0 1.4.6 1.4 1.4v7.3c0 .8-.6 1.4-1.4 1.4H2.4C1.6 13 1 12.4 1 11.6z" fill="#E5AE34" />
                <path v-if="n.expanded" d="M3.1 5.6h13.2c.5 0 .8.5.7.9l-1.5 5.6c-.1.5-.6.9-1.1.9H1.8c-.5 0-.8-.5-.7-.9l1.2-5.7c.1-.5.4-.8.8-.8z" fill="#FFD063" />
                <path v-else d="M1 4.8h15v6.8c0 .8-.6 1.4-1.4 1.4H2.4C1.6 13 1 12.4 1 11.6z" fill="#FCC84F" />
              </svg>
              {{ data.label }}
            </span>
          </template>
        </el-tree>
      </aside>
      <div class="r-main">
        <button v-if="!full" type="button" class="r-side-fold" :class="{ 'is-closed': !treeOpen }" :aria-label="treeOpen ? '收起分类树' : '展开分类树'" @click="treeOpen = !treeOpen"><el-icon><DArrowLeft /></el-icon></button>
        <div class="r-sub">
          <button type="button" class="r-sub-caret" :aria-label="listOpen ? '收起明细' : '展开明细'" @click="listOpen = !listOpen"><el-icon :class="{ 'is-closed': !listOpen }"><CaretBottom /></el-icon></button>
          <span class="r-sub-name">岗位 ({{ rows.length }})</span><span>已选 {{ picked.length }} 条</span><i />
          <template v-if="node.canMaintain">
            <template v-if="editing">
              <el-button @click="addRow">增行</el-button>
              <el-button-group><el-button type="primary" @click="save">保存</el-button><el-button @click="leave">取消</el-button></el-button-group>
            </template>
            <el-button-group v-else>
              <el-button type="primary" @click="addRow">增行</el-button>
              <el-button :disabled="rows.length === 0" @click="editRows">修改</el-button>
              <el-button :disabled="picked.length === 0" @click="remove(picked)">删除</el-button>
            </el-button-group>
          </template>
          <el-dropdown class="r-split" split-button trigger="click" :disabled="picked.length === 0 || editing">打印<template #dropdown><el-dropdown-menu><el-dropdown-item>打印</el-dropdown-item><el-dropdown-item>输出</el-dropdown-item></el-dropdown-menu></template></el-dropdown>
          <template v-if="!editing"><el-button class="r-icon-btn" :icon="RefreshRight" aria-label="刷新" @click="toast.success('已刷新')" /><el-button class="r-icon-btn" :icon="GridIcon" aria-label="视图" /></template>
          <el-button class="r-icon-btn" :icon="FullScreen" aria-label="全屏" @click="full = !full" />
        </div>
        <div v-show="listOpen" class="r-fill">
          <Grid
            ref="grid"
            :rows="rows"
            :cols="cols"
            :editing="editing"
            :bad="bad"
            :empty-text="node.canMaintain ? `${node.label}下还没有岗位` : '请先在左边选一个分类'"
            :empty-note="node.canMaintain ? '没定义岗位时，按上级分类的岗位取' : '这一层不能维护岗位'"
            @selection="(list) => (picked = list as RoleRow[])"
            @change="(row, key) => (bad = bad.filter((k) => k !== `${row.id}:${key}`))"
          >
            <template #ops="{ row }">
              <el-button v-if="editing" link @click="dropDraft(row)">删行</el-button>
              <template v-else>
                <el-button link @click="editRows">修改</el-button><el-button link @click="remove([row as RoleRow])">删除</el-button><el-button link @click="toggleRow(row as RoleRow)">{{ row.enabled ? '停用' : '启用' }}</el-button>
              </template>
            </template>
          </Grid>
        </div>
      </div>
    </div>

    <el-dialog v-model="orgOpen" title="项目组织" width="640px" align-center :close-on-click-modal="false">
      <div class="r-orgs">
        <div class="r-orgs-bar"><el-input v-model="orgQuery" placeholder="搜索项目组织" clearable /><el-checkbox label="显示停用" /></div>
        <el-tree class="r-tree" :data="orgList" node-key="label" default-expand-all highlight-current :expand-on-click-node="false" :current-node-key="orgPick" :indent="26" @node-click="(d: { label: string }) => (orgPick = d.label)">
          <template #default="{ data }"><span class="r-node">{{ data.label }}</span></template>
        </el-tree>
      </div>
      <template #footer><el-button type="primary" @click="((org = orgPick), (orgOpen = false))">确定</el-button><el-button @click="orgOpen = false">取消</el-button></template>
    </el-dialog>
    <ConfirmBox ref="box" />
  </div>
</template>
