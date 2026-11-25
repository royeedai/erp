<script setup lang="ts">
// 项目岗位（A 级，表内编辑档案）：标题行选项目组织，左边项目基本分类，右表增行、修改、删除，整表一次保存。
import { computed, nextTick, onActivated, ref, useTemplateRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DArrowLeft, RefreshRight, UserFilled } from '@element-plus/icons-vue'
import type { TreeInstance } from 'element-plus'
import { ApiError } from '@/api/http'
import { useGetOrgTree } from '@/api/generated/org/org'
import { deleteProjectRoles, saveProjectRoles, setProjectRoleStatus, useGetProjectCategoryTree, useListProjectRoles } from '@/api/generated/project-role/project-role'
import type { OrgNode, ProjectCategory, ProjectRole } from '@/api/generated/model'
import { useTab } from '@/app/tabs/tabHost'
import { useEntryTable, type RowValues } from '@/shared/entry/useEntryTable'
import ActionBar from '@/shared/ui/ActionBar.vue'
import ConflictDialog from '@/shared/ui/ConflictDialog.vue'
import DetailBar from '@/shared/ui/DetailBar.vue'
import EditTable from '@/shared/ui/edit-table/EditTable.vue'
import type { EditColumn, EditError, EditRow } from '@/shared/ui/edit-table/types'
import EmptyHint from '@/shared/ui/EmptyHint.vue'
import FolderIcon from '@/shared/ui/FolderIcon.vue'
import PageHeader from '@/shared/ui/PageHeader.vue'
import RefPicker from '@/shared/ui/RefPicker.vue'
import { alertError, confirm, toast } from '@/shared/ui/feedback'

const route = useRoute()
const router = useRouter()
const tab = useTab()

/* ---------- 组织、分类、显示停用：都在地址里 ---------- */

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const orgId = ref(str(route.query.org))
const categoryId = ref(str(route.query.category))
const showDisabled = ref(route.query.disabled === 'true')

const orgs = useGetOrgTree({ type: 'project' })
const tree = useGetProjectCategoryTree(computed(() => ({ orgId: orgId.value })), { query: { enabled: computed(() => orgId.value !== '') } })

const firstEnabled = (nodes: OrgNode[]): OrgNode | undefined => nodes.find((n) => n.enabled) ?? nodes.map((n) => firstEnabled(n.children)).find(Boolean)
watch(
  () => orgs.data.value,
  (list) => {
    if (list && !orgId.value) orgId.value = firstEnabled(list)?.id ?? ''
  },
  { immediate: true },
)

const nodes = computed(() => tree.data.value ?? [])
function findNode(list: ProjectCategory[], id: string): ProjectCategory | undefined {
  for (const n of list) {
    const hit = n.id === id ? n : findNode(n.children, id)
    if (hit) return hit
  }
  return undefined
}
const node = computed(() => findNode(nodes.value, categoryId.value))
watch(nodes, (list) => {
  if (list.length > 0 && !node.value) categoryId.value = list[0]!.id
})
watch([orgId, categoryId, showDisabled], () => {
  void router.replace({
    query: {
      ...(orgId.value ? { org: orgId.value } : {}),
      ...(categoryId.value ? { category: categoryId.value } : {}),
      ...(showDisabled.value ? { disabled: 'true' } : {}),
    },
  })
})
const label = (n: { code: string | null; name: string | null }) => `${n.code ?? ''} ${n.name ?? ''}`.trim()

const treeRef = useTemplateRef<TreeInstance>('treeRef')
async function selectNode(n: ProjectCategory) {
  if (n.id === categoryId.value) return
  if (entry.editing.value && !(await entry.cancel())) {
    treeRef.value?.setCurrentKey(categoryId.value)
    return
  }
  categoryId.value = n.id
}

/* ---------- 列表 ---------- */

const params = computed(() => ({ orgId: orgId.value, categoryId: categoryId.value, includeDisabled: showDisabled.value }))
const list = useListProjectRoles(params, { query: { enabled: computed(() => orgId.value !== '' && node.value !== undefined) } })
const error = computed(() => (list.error.value instanceof ApiError ? list.error.value : null))
const roles = computed(() => (error.value?.kind === 'forbidden' ? [] : (list.data.value?.list ?? [])))
const byId = computed(() => new Map(roles.value.map((r) => [r.id, r])))
const inherited = computed(() => list.data.value?.inheritedFrom)

interface RoleRow extends EditRow {
  code: string | null
  name: string | null
  isManager: boolean
  enabled: boolean
  remark: string | null
}
type RoleValues = RowValues<RoleRow>
const toValues = (r: ProjectRole): RoleValues => ({
  code: r.code,
  name: r.name,
  isManager: r.isManager,
  enabled: r.enabled,
  remark: r.remark ?? null,
  refCount: String(r.refCount),
  updatedBy: r.updatedBy,
  updatedAt: r.updatedAt,
})
const viewRows = computed<RoleRow[]>(() => roles.value.map((r) => ({ id: r.id, ...toValues(r) })))

// 切回本页签时刷新：别处可能改过；正在编辑就不动
let first = true
onActivated(() => {
  if (first) first = false
  else if (!entry.editing.value) void list.refetch()
})

const canEditRow = (row: RoleRow) => entry.isNew(row.id) || allowedOf(row, 'edit').allowed
const columns: EditColumn<RoleRow>[] = [
  { key: 'code', label: '岗位编码', kind: 'code', width: 120, editable: canEditRow, required: true, maxLength: 20, validate: checkCode },
  { key: 'name', label: '岗位名称', kind: 'text', width: 160, editable: canEditRow, required: true, maxLength: 30 },
  { key: 'isManager', label: '是否项目经理', kind: 'switch', width: 120, editable: canEditRow, required: true },
  { key: 'enabled', label: '启用状态', kind: 'switch', width: 120, editable: canEditRow, required: true, switchText: ['已启用', '已停用'] },
  { key: 'remark', label: '备注', kind: 'text', width: 240, editable: canEditRow, maxLength: 200 },
  { key: 'refCount', label: '引用项目', kind: 'quantity', scale: 0, width: 104, hidden: true },
  { key: 'updatedBy', label: '最后修改人', kind: 'text', width: 108, hidden: true },
  { key: 'updatedAt', label: '最后修改时间', kind: 'text', width: 172, hidden: true },
]
function checkCode(value: string | null): string | null {
  return value && !/^[A-Za-z0-9_-]{1,20}$/.test(value) ? '只能用字母、数字、下划线和短横线' : null
}

/* ---------- 表内编辑 ---------- */

const table = useTemplateRef<{ validate(): Promise<EditError[]>; focusCell(rowId: string, key: string): Promise<void>; clearSelection(): Promise<void> }>('table')
const selection = ref<RoleRow[]>([])

const entry = useEntryTable<RoleRow>({
  columns: () => columns,
  blank: () => ({ code: null, name: null, isManager: false, enabled: true, remark: null, refCount: '0', updatedBy: null, updatedAt: null }),
  versionOf: (id) => byId.value.get(id)?.version ?? 0,
  validate: async () => (await table.value?.validate()) ?? [],
  focusCell: async (rowId, key) => table.value?.focusCell(rowId, key),
  rowTitle: label,
  async submit(changes, idempotencyKey) {
    const values = (r: RoleValues) => ({ code: r.code?.trim() ?? '', name: r.name?.trim() ?? '', isManager: r.isManager, enabled: r.enabled, remark: r.remark?.trim() || null })
    await saveProjectRoles(
      {
        orgId: orgId.value,
        categoryId: categoryId.value,
        created: changes.created.map((r) => ({ ...values(r), tempId: r.tempId })),
        updated: changes.updated.map((r) => ({ ...values(r), id: r.id, version: r.version })),
        removed: changes.removed,
      },
      { 'Idempotency-Key': idempotencyKey },
    )
    await list.refetch()
  },
  readLatest: (latest) => ({
    rows: (latest.rows as ProjectRole[]).map((r) => ({ id: r.id, version: r.version, values: toValues(r) })),
    removed: latest.removed as string[],
  }),
})
const { editing, draft, errors, saving, dirty } = entry
const { open: conflictOpen, message: conflictMessage, groups: conflictGroups } = entry.conflict
watch(dirty, (v) => tab.setDirty(v))

const rows = computed(() => (editing.value ? draft.value : viewRows.value))
/** 取消或保存后回到原来选中的行 */
let backTo: string | undefined

async function startEdit() {
  if (editing.value) return
  backTo = selection.value[0]?.id
  entry.start(viewRows.value)
  await nextTick()
}
async function addRow() {
  await startEdit()
  const row = entry.addRow()
  await table.value?.focusCell(row.id, 'code')
}
async function editRow(row?: RoleRow) {
  await startEdit()
  const target = row?.id ?? backTo ?? draft.value[0]?.id
  if (target) await table.value?.focusCell(target, 'code')
}
const canRemove = (row: RoleRow) => entry.isNew(row.id) || allowedOf(row, 'delete').allowed
function removeSelected() {
  const blocked = selection.value.filter((r) => !canRemove(r))
  entry.removeRows(selection.value.filter(canRemove).map((r) => r.id))
  if (blocked.length > 0) toast.warning(`${blocked.map(label).join('、')}不能删：${allowedOf(blocked[0]!, 'delete').reason ?? ''}`)
}
async function cancelEdit() {
  if (await entry.cancel()) await table.value?.clearSelection()
}

/* ---------- 浏览态的动作 ---------- */

function allowedOf(row: { id: string }, action: string) {
  return byId.value.get(row.id)?.allowedActions.find((a) => a.action === action) ?? { action, allowed: false, reason: '当前不可用' }
}
const rowActions = (row: RoleRow) => [
  { action: 'edit', label: '修改' },
  row.enabled ? { action: 'disable', label: '停用' } : { action: 'enable', label: '启用' },
  { action: 'delete', label: '删除' },
]

async function setEnabled(role: ProjectRole, enabled: boolean): Promise<boolean> {
  await setProjectRoleStatus(role.id, { enabled, version: role.version })
  toast.success(enabled ? '已启用' : '已停用')
  return true
}
/** 不能删：给原因；能停用就给“改为停用”。返回是否做了改动 */
async function explainBlocked(role: ProjectRole, reason: string): Promise<boolean> {
  if (!role.allowedActions.some((a) => a.action === 'disable' && a.allowed)) {
    await alertError(`不能删除 ${label(role)}`, reason)
    return false
  }
  const ok = await confirm({ title: `不能删除 ${label(role)}`, message: `${reason}。停用后新单据选不到，历史单据仍显示原值。`, confirmText: '改为停用' })
  if (ok) await setEnabled(role, false)
  return ok
}
async function removeRoles(targets: ProjectRole[]): Promise<boolean> {
  const ok = await confirm({
    title: '删除岗位',
    message: `删除${targets.length === 1 ? ` ${label(targets[0]!)}` : `选中的 ${targets.length} 个岗位`}？删除后不能恢复。`,
    confirmText: '删除',
    cancelText: '不删',
    danger: true,
  })
  if (!ok) return false
  const results = await deleteProjectRoles({ items: targets.map((r) => ({ id: r.id, version: r.version })) })
  const failed = results.filter((r) => !r.ok)
  if (failed.length === 0) {
    toast.success('已删除')
    return true
  }
  const only = targets.length === 1 ? targets[0] : undefined
  const why = failed.map((r) => `${r.title}：${r.message ?? '没有删除'}${r.references?.length ? `（${r.references.join('、')}）` : ''}`)
  if (only && failed[0]?.references?.length) await explainBlocked(only, why[0]!)
  else await alertError(`${results.length - failed.length} 个已删除，${failed.length} 个没删`, why.join('\n'))
  return true
}
/** 动过或失败了就刷新：失败时数据可能已被他人改动，要拿最新的行和可办动作。没动就不刷 */
async function guarded(job: () => Promise<boolean>) {
  try {
    if (!(await job())) return
  } catch (e) {
    if (!(e instanceof ApiError)) throw e
    await alertError('操作未完成', e.message)
  }
  await table.value?.clearSelection()
  await list.refetch()
}
async function run(action: string, row: RoleRow) {
  const role = byId.value.get(row.id)
  if (!role) return
  if (action === 'edit') return editRow(row)
  if (action === 'delete') return guarded(() => removeRoles([role]))
  if (action === 'enable') return guarded(() => setEnabled(role, true))
  const ok = await confirm({ title: '停用岗位', message: `停用 ${label(role)}？停用后新单据选不到，历史单据仍显示原值。`, confirmText: '停用' })
  if (ok) await guarded(() => setEnabled(role, false))
}
const deleteSelected = () => guarded(() => removeRoles(selection.value.flatMap((r) => byId.value.get(r.id) ?? [])))

/* ---------- 布局 ---------- */

const treeOpen = ref(true)
const listOpen = ref(true)
const full = ref(false)
</script>

<template>
  <div class="app-page">
    <PageHeader v-show="!full" title="项目岗位" :icon="UserFilled">
      <template #after>
        <RefPicker
          v-model="orgId"
          class="role-org"
          :nodes="orgs.data.value ?? []"
          :loading="orgs.isLoading.value"
          title="项目组织"
          scope="有权维护的项目组织"
          required
          :disabled="editing"
        />
        <el-checkbox v-model="showDisabled" label="显示停用岗位" :disabled="editing" />
      </template>
    </PageHeader>
    <div class="app-page-body">
      <aside v-show="treeOpen && !full" v-loading="tree.isLoading.value" class="role-tree">
        <el-tree
          v-if="nodes.length > 0"
          ref="treeRef"
          class="app-tree"
          :data="nodes"
          node-key="id"
          highlight-current
          :default-expanded-keys="nodes.map((n) => n.id)"
          :current-node-key="categoryId"
          :expand-on-click-node="false"
          :indent="26"
          @node-click="(n: ProjectCategory) => selectNode(n)"
        >
          <template #default="{ data, node: n }">
            <span class="app-tree-node"><FolderIcon v-if="!n.isLeaf" :open="n.expanded" />{{ label(data as ProjectCategory) }}</span>
          </template>
        </el-tree>
        <EmptyHint v-else-if="!orgId" title="先选项目组织" note="选了组织才有分类" />
        <EmptyHint v-else-if="tree.isError.value" title="分类没取到"><el-button @click="tree.refetch()">重新查询</el-button></EmptyHint>
      </aside>
      <div class="app-page-main">
        <button v-if="!full" type="button" class="role-fold" :class="{ 'is-closed': !treeOpen }" :aria-label="treeOpen ? '收起分类树' : '展开分类树'" @click="treeOpen = !treeOpen">
          <el-icon><DArrowLeft /></el-icon>
        </button>
        <DetailBar v-model:open="listOpen" v-model:full="full" title="岗位" :count="rows.length" :selected="selection.length" :reason="node && !node.canMaintain ? node.reason : undefined">
          <template v-if="node?.canMaintain && editing">
            <el-button-group>
              <el-button :disabled="saving" @click="addRow">增行</el-button>
              <el-button :disabled="saving || selection.length === 0" @click="removeSelected">删行</el-button>
            </el-button-group>
            <el-button-group>
              <el-button type="primary" :loading="saving" @click="entry.save()">保存</el-button>
              <el-button :disabled="saving" @click="cancelEdit">取消</el-button>
            </el-button-group>
          </template>
          <template v-else>
            <el-button-group v-if="node?.canMaintain">
              <el-button type="primary" :disabled="!list.isSuccess.value" @click="addRow">增行</el-button>
              <el-button :disabled="rows.length === 0" @click="editRow()">修改</el-button>
              <el-button :disabled="selection.length === 0" @click="deleteSelected">删除</el-button>
            </el-button-group>
            <el-button class="app-icon-btn" :icon="RefreshRight" aria-label="刷新" title="刷新" @click="list.refetch()" />
          </template>
        </DetailBar>
        <el-alert v-if="error && rows.length > 0" type="error" :closable="false" show-icon :title="error.message">
          <el-button link @click="list.refetch()">重新查询</el-button>
        </el-alert>
        <div v-show="listOpen" class="app-page-fill">
          <EditTable
            ref="table"
            v-model:selection="selection"
            height="100%"
            selectable
            table-key="project-role"
            :rows="rows"
            :columns="columns"
            :readonly="!editing"
            :problems="errors"
            :loading="list.isFetching.value || saving"
            @change="(c) => entry.onChange(c.row.id, c.key)"
          >
            <template #actions="{ row }">
              <ActionBar
                v-if="editing"
                :actions="[{ action: 'remove', label: '删行' }]"
                :allowed="[{ action: 'remove', allowed: canRemove(row), reason: allowedOf(row, 'delete').reason }]"
                @run="entry.removeRows([row.id])"
              />
              <ActionBar
                v-else
                :actions="rowActions(row)"
                :allowed="byId.get(row.id)?.allowedActions ?? []"
                @run="(action) => run(action, row)"
                @blocked="(_action, reason) => guarded(() => explainBlocked(byId.get(row.id)!, reason))"
              />
            </template>
            <template #empty>
              <EmptyHint v-if="error?.kind === 'forbidden'" title="没有权限查看" :note="error.permission ? `缺少权限：${error.permission}` : '请联系管理员开通'" />
              <EmptyHint v-else-if="error" title="查询失败" :note="`${error.message}${error.traceId ? `，追踪号 ${error.traceId}` : ''}`">
                <el-button @click="list.refetch()">重新查询</el-button>
              </EmptyHint>
              <EmptyHint v-else-if="!orgId" title="还没有查询" note="先选项目组织" />
              <template v-else-if="!list.isFetching.value && node">
                <EmptyHint v-if="!node.canMaintain" title="这里没有岗位" :note="node.reason" />
                <EmptyHint v-else :title="`${label(node)}下还没有岗位`" :note="inherited ? `现在用的是上级分类 ${inherited.categoryName} 的 ${inherited.count} 个岗位` : '点增行开始录入'" />
              </template>
            </template>
          </EditTable>
        </div>
      </div>
    </div>
    <ConflictDialog v-model="conflictOpen" :message="conflictMessage" :groups="conflictGroups" @use-latest="entry.conflict.useLatest" @keep-mine="entry.conflict.keepMine" />
  </div>
</template>

<style>
.role-org.el-input {
  width: 190px;
  margin-right: var(--app-space-6);
}
.role-tree {
  flex: none;
  width: 22%;
  min-width: 240px;
  max-width: 509px;
  overflow: auto;
  border-right: 1px solid var(--app-panel-border);
  background: var(--app-bg-tree);
}
.role-tree > .app-empty {
  padding-top: 80px;
}
.role-fold {
  position: absolute;
  z-index: 8;
  left: -12px;
  top: 18px;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--app-bg-container);
  box-shadow: var(--app-shadow-float);
  font-size: 12px;
  color: var(--el-text-color-secondary);
  cursor: pointer;
}
.role-fold:focus-visible {
  outline: 2px solid var(--app-focus);
}
.role-fold.is-closed {
  left: -8px;
}
.role-fold.is-closed .el-icon {
  transform: rotate(180deg);
}
</style>
