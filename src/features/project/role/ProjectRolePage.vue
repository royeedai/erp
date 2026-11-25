<script setup lang="ts">
// 样例页：项目岗位（A 级，树 + 列表 + 表单）
import { computed, onActivated, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { keepPreviousData } from '@tanstack/vue-query'
import { ApiError } from '@/api/http'
import { useGetOrgTree } from '@/api/generated/org/org'
import { deleteProjectRole, setProjectRoleStatus, useListProjectRoles } from '@/api/generated/project-role/project-role'
import type { ListProjectRolesParams, OrgNode, ProjectRole } from '@/api/generated/model'
import { PERM } from '@/app/permissions'
import { useSessionStore } from '@/app/session.store'
import { useTab } from '@/app/tabs/tabHost'
import ActionBar, { type ActionItem } from '@/shared/ui/ActionBar.vue'
import ListTable, { type ListColumn } from '@/shared/ui/ListTable.vue'
import QueryBar from '@/shared/ui/QueryBar.vue'
import StatusTag from '@/shared/ui/StatusTag.vue'
import { alertError, confirm, toast } from '@/shared/ui/feedback'
import RoleFormDialog from './RoleFormDialog.vue'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const tab = useTab()

/* ---------- 组织树 ---------- */

const orgs = useGetOrgTree()

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
const draft = reactive<{ keyword: string; enabled: boolean | undefined }>({
  keyword: criteria.keyword ?? '',
  enabled: criteria.enabled,
})

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
  const keyword = draft.keyword.trim() || undefined
  const unchanged = keyword === criteria.keyword && draft.enabled === criteria.enabled && criteria.page === 1
  apply({ keyword, enabled: draft.enabled, page: 1 })
  if (unchanged) void list.refetch()
}
function reset() {
  draft.keyword = ''
  draft.enabled = undefined
  search()
}

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

const columns: ListColumn<ProjectRole>[] = [
  { key: 'code', label: '岗位编码', width: 110 },
  { key: 'name', label: '岗位名称', minWidth: 130 },
  { key: 'orgName', label: '所属组织', width: 100 },
  { key: 'isManager', label: '经理岗位', width: 78, align: 'center' },
  { key: 'enabled', label: '状态', width: 78, align: 'center' },
  { key: 'refCount', label: '引用数', width: 70, align: 'right' },
  { key: 'updatedAt', label: '最后修改', width: 160 },
  { key: 'actions', label: '操作', width: 150, fixed: 'right' },
]

function actionItems(row: ProjectRole): ActionItem[] {
  return [
    { action: 'edit', label: '编辑' },
    row.enabled ? { action: 'disable', label: '停用' } : { action: 'enable', label: '启用' },
    { action: 'delete', label: '删除', danger: true },
  ]
}

/* ---------- 动作 ---------- */

const dialogOpen = ref(false)
const editing = ref<ProjectRole | null>(null)

function openCreate() {
  editing.value = null
  dialogOpen.value = true
}

async function run(action: string, row: ProjectRole) {
  if (action === 'edit') {
    editing.value = row
    dialogOpen.value = true
    return
  }
  try {
    if (action === 'delete') {
      const ok = await confirm({
        title: '删除岗位',
        message: `删除“${row.code} ${row.name}”？删除后不能恢复。`,
        confirmText: '删除',
        danger: true,
      })
      if (!ok) return
      await deleteProjectRole(row.id, { version: row.version })
      toast.success('已删除')
    } else {
      const enable = action === 'enable'
      if (!enable) {
        const ok = await confirm({
          title: '停用岗位',
          message: `停用“${row.code} ${row.name}”？停用后新单据选不到，历史单据仍显示原值。`,
          confirmText: '停用',
        })
        if (!ok) return
      }
      await setProjectRoleStatus(row.id, { enabled: enable, version: row.version })
      toast.success(enable ? '已启用' : '已停用')
    }
    await list.refetch()
  } catch (e) {
    if (!(e instanceof ApiError)) throw e
    const detail = e.references.length > 0 ? `${e.message}：${e.references.join('、')}` : e.message
    await alertError('操作未完成', detail)
    // 数据可能已被他人改动，刷新拿最新的行和可办动作
    await list.refetch()
  }
}

async function onSaved() {
  await list.refetch()
}
</script>

<template>
  <div class="app-page role-page">
    <div class="app-panel role-tree">
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
    <div class="app-panel role-main">
      <QueryBar :loading="list.isFetching.value" @search="search" @reset="reset">
        <el-form-item label="编码或名称">
          <el-input v-model="draft.keyword" name="keyword" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="draft.enabled" placeholder="全部" clearable style="width: 120px" :empty-values="[null, undefined]">
            <el-option label="启用" :value="true" />
            <el-option label="停用" :value="false" />
          </el-select>
        </el-form-item>
        <template #extra>
          <el-button v-if="session.has(PERM.projectRoleCreate)" type="primary" @click="openCreate">新增岗位</el-button>
        </template>
      </QueryBar>
      <div class="role-table">
        <ListTable
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
        >
          <template #cell-isManager="{ row }">{{ row.isManager ? '是' : '' }}</template>
          <template #cell-enabled="{ row }">
            <StatusTag :tone="row.enabled ? 'done' : 'draft'" :text="row.enabled ? '启用' : '已停用'" />
          </template>
          <template #cell-actions="{ row }">
            <ActionBar :actions="actionItems(row)" :allowed="row.allowedActions" @run="(a) => run(a, row)" />
          </template>
        </ListTable>
      </div>
    </div>
    <RoleFormDialog
      v-model="dialogOpen"
      :target="editing"
      :org-id="criteria.orgId"
      :org-name="currentOrg?.name ?? ''"
      @saved="onSaved"
      @dirty-change="tab.setDirty"
    />
  </div>
</template>

<style>
.role-page {
  height: 100%;
  display: flex;
  gap: var(--app-space-3);
}
.role-tree {
  width: 180px;
  flex: none;
  overflow: auto;
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
