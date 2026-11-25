<script setup lang="ts">
// 样例页：项目岗位（A 级，树 + 列表 + 表单）
import { computed, onActivated, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { keepPreviousData } from '@tanstack/vue-query'
import { DArrowLeft, DArrowRight, Plus } from '@element-plus/icons-vue'
import { ApiError } from '@/api/http'
import { useGetOrgTree } from '@/api/generated/org/org'
import { deleteProjectRole, setProjectRoleStatus, useListProjectRoles } from '@/api/generated/project-role/project-role'
import type { ListProjectRolesParams, OrgNode, ProjectRole } from '@/api/generated/model'
import { PERM } from '@/app/permissions'
import { useSessionStore } from '@/app/session.store'
import { useTab } from '@/app/tabs/tabHost'
import ActionBar, { type ActionItem } from '@/shared/ui/ActionBar.vue'
import type { DataColumn } from '@/shared/ui/columns'
import DataTable from '@/shared/ui/DataTable.vue'
import QueryBar, { type QueryTab } from '@/shared/ui/QueryBar.vue'
import StatusTag from '@/shared/ui/StatusTag.vue'
import { alertError, confirm, toast } from '@/shared/ui/feedback'
import RoleFormDialog from './RoleFormDialog.vue'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const tab = useTab()

/* ---------- 组织树 ---------- */

const orgs = useGetOrgTree()
const treeOpen = ref(true)

function findOrg(nodes: OrgNode[], id: string): OrgNode | undefined {
  for (const n of nodes) {
    if (n.id === id) return n
    const hit = findOrg(n.children, id)
    if (hit) return hit
  }
  return undefined
}

/* ---------- 查询条件：已生效的进 URL，正在填的是草稿 ---------- */

type Criteria = Pick<ListProjectRolesParams, 'orgId' | 'keyword' | 'enabled' | 'page' | 'size'>

function readCriteria(): Criteria {
  const q = route.query
  const enabled = q.enabled === 'true' ? true : q.enabled === 'false' ? false : undefined
  return {
    orgId: typeof q.org === 'string' ? q.org : 'G',
    keyword: typeof q.keyword === 'string' && q.keyword ? q.keyword : undefined,
    enabled,
    page: Math.max(1, Number(q.page) || 1),
    size: Number(q.size) || 50,
  }
}

const criteria = reactive<Criteria>(readCriteria())
const keyword = ref(criteria.keyword ?? '')

function apply(patch: Partial<Criteria>) {
  Object.assign(criteria, patch)
  void router.replace({
    query: {
      org: criteria.orgId,
      ...(criteria.keyword ? { keyword: criteria.keyword } : {}),
      ...(criteria.enabled === undefined ? {} : { enabled: String(criteria.enabled) }),
      ...(criteria.page > 1 ? { page: String(criteria.page) } : {}),
      ...(criteria.size !== 50 ? { size: String(criteria.size) } : {}),
    },
  })
}

function search() {
  const value = keyword.value.trim() || undefined
  const unchanged = value === criteria.keyword && criteria.page === 1
  apply({ keyword: value, page: 1 })
  if (unchanged) void list.refetch()
}
function clearFilter() {
  keyword.value = ''
  apply({ keyword: undefined, enabled: undefined, page: 1 })
}

const status = computed({
  get: () => (criteria.enabled === undefined ? 'all' : criteria.enabled ? 'enabled' : 'disabled'),
  set: (key: string) => apply({ enabled: key === 'all' ? undefined : key === 'enabled', page: 1 }),
})

/* ---------- 列表 ---------- */

const list = useListProjectRoles(
  computed(() => ({ ...criteria })),
  { query: { placeholderData: keepPreviousData } },
)
const rows = computed<ProjectRole[]>(() => list.data.value?.list ?? [])
const total = computed(() => list.data.value?.total ?? 0)
const error = computed(() => (list.error.value instanceof ApiError ? list.error.value : null))
const filtered = computed(() => criteria.keyword !== undefined || criteria.enabled !== undefined)
const currentOrg = computed(() => findOrg(orgs.data.value ?? [], criteria.orgId))
const canCreate = computed(() => session.has(PERM.projectRoleCreate))

const tabs = computed<QueryTab[]>(() => {
  // 查询失败时条数未知，不显示
  const counts = error.value ? undefined : list.data.value?.counts
  return [
    { key: 'all', label: '全部', count: counts?.all },
    { key: 'enabled', label: '启用', count: counts?.enabled },
    { key: 'disabled', label: '已停用', count: counts?.disabled },
  ]
})

// 切回本页签时刷新：别处可能改过
let first = true
onActivated(() => {
  if (first) first = false
  else void list.refetch()
})

// 删到当前页空了就退一页
watch([rows, total], () => {
  if (rows.value.length === 0 && total.value > 0 && criteria.page > 1) apply({ page: Math.max(1, criteria.page - 1) })
})

const columns: DataColumn<ProjectRole>[] = [
  { key: 'code', label: '岗位编码', kind: 'code' },
  { key: 'name', label: '岗位名称', kind: 'name' },
  { key: 'enabled', label: '状态', kind: 'status' },
  { key: 'isManager', label: '经理岗位', kind: 'enum', text: (r) => (r.isManager ? '是' : '否') },
  { key: 'refCount', label: '引用项目', kind: 'count' },
  { key: 'orgName', label: '所属组织', kind: 'org' },
  { key: 'updatedAt', label: '最后修改', kind: 'time' },
]

function actionItems(row: ProjectRole): ActionItem[] {
  return [
    { action: 'edit', label: '编辑' },
    row.enabled ? { action: 'disable', label: '停用' } : { action: 'enable', label: '启用' },
    { action: 'delete', label: '删除', danger: true },
  ]
}
const titleOf = (row: ProjectRole) => `${row.code} ${row.name}`
const canDisable = (row: ProjectRole) => row.allowedActions.some((a) => a.action === 'disable' && a.allowed)

/* ---------- 动作 ---------- */

const dialogOpen = ref(false)
const editing = ref<ProjectRole | null>(null)

function openForm(row: ProjectRole | null) {
  editing.value = row
  dialogOpen.value = true
}

async function setEnabled(row: ProjectRole, enabled: boolean) {
  await setProjectRoleStatus(row.id, { enabled, version: row.version })
  toast.success(enabled ? '已启用' : '已停用')
  return true
}

/** 不能删：给原因；能停用就给“改为停用”。返回是否做了改动 */
async function explainBlocked(row: ProjectRole, reason: string): Promise<boolean> {
  if (!canDisable(row)) {
    await alertError(`不能删除 ${row.code}`, reason)
    return false
  }
  const ok = await confirm({
    title: `不能删除 ${row.code}`,
    message: `${reason}。停用后新单据选不到，历史单据仍显示原值。`,
    confirmText: '改为停用',
  })
  return ok && setEnabled(row, false)
}

async function act(row: ProjectRole, action: string): Promise<boolean> {
  if (action === 'enable') return setEnabled(row, true)
  if (action === 'disable') {
    const ok = await confirm({
      title: '停用岗位',
      message: `停用“${titleOf(row)}”？停用后新单据选不到，历史单据仍显示原值。`,
      confirmText: '停用',
    })
    return ok && setEnabled(row, false)
  }
  const ok = await confirm({
    title: '删除岗位',
    message: `删除“${titleOf(row)}”？删除后不能恢复。`,
    confirmText: '删除',
    danger: true,
  })
  if (!ok) return false
  await deleteProjectRole(row.id, { version: row.version })
  toast.success('已删除')
  return true
}

/** 改动过或失败了就刷新：失败时数据可能已被他人改动，要拿最新的行和可办动作 */
async function guarded(row: ProjectRole, job: () => Promise<boolean>) {
  try {
    if (!(await job())) return
  } catch (e) {
    if (!(e instanceof ApiError)) throw e
    if (e.references.length > 0) await guarded(row, () => explainBlocked(row, `${e.message}：${e.references.join('、')}`))
    else await alertError('操作未完成', e.message)
  }
  await list.refetch()
}

function run(action: string, row: ProjectRole) {
  if (action === 'edit') openForm(row)
  else void guarded(row, () => act(row, action))
}
</script>

<template>
  <div class="app-page role-page">
    <div v-show="treeOpen" class="app-panel role-tree">
      <el-tree
        v-loading="orgs.isLoading.value"
        :data="orgs.data.value ?? []"
        node-key="id"
        :props="{ label: 'name', children: 'children' }"
        :current-node-key="criteria.orgId"
        default-expand-all
        highlight-current
        :expand-on-click-node="false"
        @node-click="(n: OrgNode) => apply({ orgId: n.id, page: 1 })"
      />
    </div>
    <el-button
      class="role-fold"
      text
      :icon="treeOpen ? DArrowLeft : DArrowRight"
      :aria-label="treeOpen ? '收起组织树' : '展开组织树'"
      @click="treeOpen = !treeOpen"
    />
    <div class="app-panel role-main">
      <QueryBar
        v-model:tab="status"
        v-model:keyword="keyword"
        :tabs="tabs"
        placeholder="编码或名称"
        @search="search"
        @refresh="list.refetch()"
      >
        <template #primary>
          <el-button v-if="canCreate" type="primary" :icon="Plus" @click="openForm(null)">新增岗位</el-button>
        </template>
      </QueryBar>
      <div class="role-table">
        <DataTable
          noun="岗位"
          :rows="rows"
          :columns="columns"
          :total="total"
          :page="criteria.page"
          :size="criteria.size"
          :loading="list.isFetching.value"
          :error="error"
          :filtered="filtered"
          @update:page="(page) => apply({ page })"
          @update:size="(size) => apply({ size, page: 1 })"
          @retry="list.refetch()"
          @clear-filter="clearFilter"
        >
          <template #cell-enabled="{ row }">
            <StatusTag :tone="row.enabled ? 'done' : 'draft'" :text="row.enabled ? '启用' : '已停用'" />
          </template>
          <template #actions="{ row }">
            <ActionBar
              :actions="actionItems(row)"
              :allowed="row.allowedActions"
              @run="(action) => run(action, row)"
              @blocked="(_action, reason) => guarded(row, () => explainBlocked(row, reason))"
            />
          </template>
          <template #empty-action>
            <el-button v-if="canCreate" @click="openForm(null)">新增岗位</el-button>
          </template>
        </DataTable>
      </div>
    </div>
    <RoleFormDialog
      v-model="dialogOpen"
      :target="editing"
      :org-id="criteria.orgId"
      :org-name="currentOrg?.name ?? ''"
      @saved="list.refetch()"
      @dirty-change="tab.setDirty"
    />
  </div>
</template>

<style>
.role-page {
  height: 100%;
  display: flex;
}
.role-tree {
  width: 180px;
  flex: none;
  overflow: auto;
}
.role-fold.el-button {
  width: 16px;
  flex: none;
  align-self: center;
  padding: 0;
}
.role-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.role-table {
  flex: 1;
  min-height: 0;
}
</style>
