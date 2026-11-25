import { delay, http, HttpResponse } from 'msw'
import type {
  AllowedAction,
  ApiErrorBody,
  FieldError,
  ProjectCategory,
  ProjectRole,
  ProjectRoleDelete,
  ProjectRoleList,
  ProjectRoleSave,
  ProjectRoleValues,
  RowResult,
} from '@/api/generated/model'
import { categories, homeSummary, projectOrgs, seedRoles, users, type CategoryRecord, type MockUser, type RoleRecord } from './seed'

// 内存数据，刷新即还原
let roles = seedRoles()
/** 幂等：同一个标识只做一次，重发直接返回上次的范围 */
const idempotent = new Set<string>()
let nextId = 1000
let expired = false
let failNextList = false
let failNextSave = 0

const LATENCY = 120

function fail(status: number, body: ApiErrorBody) {
  return HttpResponse.json({ traceId: `mock-${Date.now().toString(36)}`, ...body }, { status })
}

function userOf(request: Request): MockUser | undefined {
  if (expired) return undefined
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  return users.find((u) => `mock-token-${u.id}` === token)
}

const unauthorized = () => fail(401, { code: 'UNAUTHORIZED', message: '登录已失效，请重新登录' })
const forbidden = (permission: string) => fail(403, { code: 'FORBIDDEN', message: '没有权限', permission })
const notFound = () => fail(404, { code: 'NOT_FOUND', message: '岗位不存在，可能已被删除' })

function now(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/* ---------- 分类 ---------- */

/** 从根到这个分类的路径，找不到返回空 */
function pathTo(id: string, nodes = categories): CategoryRecord[] {
  for (const n of nodes) {
    if (n.id === id) return [n]
    const rest = pathTo(id, n.children)
    if (rest.length > 0) return [n, ...rest]
  }
  return []
}
const NO_RIGHT = '没有“项目岗位-维护”权限'
function toCategory(n: CategoryRecord, user: MockUser): ProjectCategory {
  const reason = n.locked ?? (user.canMaintainRole ? undefined : NO_RIGHT)
  return {
    id: n.id,
    code: n.code,
    name: n.name,
    canMaintain: reason === undefined,
    ...(reason === undefined ? {} : { reason }),
    children: n.children.map((c) => toCategory(c, user)),
  }
}

/* ---------- 岗位 ---------- */

const title = (r: { code: string; name: string }) => `${r.code} ${r.name}`
const referenced = (r: RoleRecord) => `已被 ${r.references.length} 个项目引用，不能删除，可以停用`

/** 行级动作由“后端”算好，前端不按状态推断 */
function actionsOf(role: RoleRecord, user: MockUser): AllowedAction[] {
  const toggle = role.enabled ? 'disable' : 'enable'
  if (!user.canMaintainRole) return (['edit', toggle, 'delete'] as const).map((action) => ({ action, allowed: false, reason: NO_RIGHT }))
  return [
    { action: 'edit', allowed: true },
    { action: toggle, allowed: true },
    role.references.length > 0 ? { action: 'delete', allowed: false, reason: referenced(role) } : { action: 'delete', allowed: true },
  ]
}

function toDto(role: RoleRecord, user: MockUser): ProjectRole {
  const { references, ...rest } = role
  return { ...rest, refCount: references.length, allowedActions: actionsOf(role, user) }
}

const inScope = (orgId: string, categoryId: string) => roles.filter((r) => r.orgId === orgId && r.categoryId === categoryId)

function listOf(orgId: string, categoryId: string, includeDisabled: boolean, user: MockUser): ProjectRoleList {
  const own = inScope(orgId, categoryId)
  const list = own.filter((r) => includeDisabled || r.enabled).map((r) => toDto(r, user))
  if (own.length > 0) return { list }
  // 没定义岗位时向上找最近的父分类
  for (const parent of pathTo(categoryId).slice(0, -1).reverse()) {
    const count = inScope(orgId, parent.id).filter((r) => r.enabled).length
    if (count > 0) return { list, inheritedFrom: { categoryId: parent.id, categoryName: `${parent.code} ${parent.name}`.trim(), count } }
  }
  return { list }
}

function checkRows(body: ProjectRoleSave): FieldError[] {
  const gone = new Set(body.removed.map((r) => r.id))
  const touched = new Set(body.updated.map((r) => r.id))
  const rows: (ProjectRoleValues & { rowId: string })[] = [
    ...inScope(body.orgId, body.categoryId)
      .filter((r) => !gone.has(r.id) && !touched.has(r.id))
      .map((r) => ({ ...r, rowId: '' })),
    ...body.updated.map((r) => ({ ...r, rowId: r.id })),
    ...body.created.map((r) => ({ ...r, rowId: r.tempId })),
  ]
  const errors: FieldError[] = []
  for (const r of rows) {
    if (r.rowId === '') continue
    if (r.code.trim() === '') errors.push({ rowId: r.rowId, field: 'code', message: '岗位编码不能为空' })
    if (r.name.trim() === '') errors.push({ rowId: r.rowId, field: 'name', message: '岗位名称不能为空' })
    const same = rows.find((o) => o !== r && o.code === r.code)
    if (same) errors.push({ rowId: r.rowId, field: 'code', message: `岗位编码已被“${same.name}”使用` })
    // 【待定】经理唯一的范围业务没答复。这里只为演示服务端报错，按同组织同分类模拟；前端不写这条规则
    const manager = rows.find((o) => o !== r && o.isManager && o.enabled)
    if (r.isManager && r.enabled && manager) errors.push({ rowId: r.rowId, field: 'isManager', message: `已有启用的项目经理岗位“${title(manager)}”` })
  }
  return errors
}

export const handlers = [
  http.post('/api/auth/login', async ({ request }) => {
    await delay(LATENCY)
    const body = (await request.json()) as { username: string; password: string }
    const user = users.find((u) => u.username === body.username && u.password === body.password)
    expired = false
    if (!user) return fail(401, { code: 'BAD_CREDENTIALS', message: '账号或密码错误' })
    return HttpResponse.json({
      token: `mock-token-${user.id}`,
      me: { id: user.id, name: user.name, permissions: user.permissions },
    })
  }),

  http.get('/api/auth/me', async ({ request }) => {
    await delay(LATENCY)
    const user = userOf(request)
    if (!user) return unauthorized()
    return HttpResponse.json({ id: user.id, name: user.name, permissions: user.permissions })
  }),

  http.post('/api/auth/logout', () => new HttpResponse(null, { status: 204 })),

  http.get('/api/home/summary', async ({ request }) => {
    await delay(LATENCY)
    const user = userOf(request)
    if (!user) return unauthorized()
    if (failNextList) {
      failNextList = false
      return fail(500, { code: 'SERVER_ERROR', message: '服务器出错，请稍后重试' })
    }
    return HttpResponse.json(homeSummary[user.id])
  }),

  http.get('/api/orgs/tree', async ({ request }) => {
    await delay(LATENCY)
    return userOf(request) ? HttpResponse.json(projectOrgs) : unauthorized()
  }),

  http.get('/api/project-categories/tree', async ({ request }) => {
    await delay(LATENCY)
    const user = userOf(request)
    if (!user) return unauthorized()
    return HttpResponse.json(categories.map((n) => toCategory(n, user)))
  }),

  http.get('/api/project-roles', async ({ request }) => {
    await delay(LATENCY)
    const user = userOf(request)
    if (!user) return unauthorized()
    if (!user.permissions.includes('project:role:view')) return forbidden('project:role:view')
    if (failNextList) {
      failNextList = false
      return fail(500, { code: 'SERVER_ERROR', message: '服务器出错，请稍后重试' })
    }
    const q = new URL(request.url).searchParams
    return HttpResponse.json(listOf(q.get('orgId') ?? '', q.get('categoryId') ?? '', q.get('includeDisabled') === 'true', user))
  }),

  http.post('/api/project-roles/batch-save', async ({ request }) => {
    await delay(LATENCY)
    const user = userOf(request)
    if (!user) return unauthorized()
    if (!user.canMaintainRole) return forbidden('project:role:edit')
    if (failNextSave > 0) {
      failNextSave--
      return fail(500, { code: 'SERVER_ERROR', message: '服务器出错，请稍后重试' })
    }
    const body = (await request.json()) as ProjectRoleSave
    const key = request.headers.get('Idempotency-Key') ?? ''
    if (key && idempotent.has(key)) return HttpResponse.json(listOf(body.orgId, body.categoryId, true, user))

    const stale: ProjectRole[] = []
    const removed: string[] = []
    for (const r of [...body.updated, ...body.removed]) {
      const current = roles.find((x) => x.id === r.id)
      if (!current) removed.push(r.id)
      else if (current.version !== r.version) stale.push(toDto(current, user))
    }
    if (stale.length > 0 || removed.length > 0) {
      const who = stale[0] ? `${stale[0].updatedBy} 在 ${stale[0].updatedAt} 修改过` : '别人刚删除过'
      return fail(409, { code: 'VERSION_CONFLICT', message: `${who}这张表里的数据`, latest: { rows: stale, removed } })
    }
    const locked = roles.filter((r) => body.removed.some((x) => x.id === r.id) && r.references.length > 0)
    if (locked.length > 0) {
      return fail(409, { code: 'REFERENCED', message: `${locked.map(title).join('、')}${referenced(locked[0]!)}`, references: locked.flatMap((r) => r.references) })
    }
    const fieldErrors = checkRows(body)
    if (fieldErrors.length > 0) return fail(422, { code: 'INVALID', message: '填写内容有误', fieldErrors })

    const stamp = { updatedAt: now(), updatedBy: user.name }
    const values = (v: ProjectRoleValues) => ({ code: v.code.trim(), name: v.name.trim(), isManager: v.isManager, enabled: v.enabled, remark: v.remark ?? null })
    roles = roles.filter((r) => !body.removed.some((x) => x.id === r.id))
    for (const r of body.updated) {
      const current = roles.find((x) => x.id === r.id)
      if (current) Object.assign(current, values(r), stamp, { version: current.version + 1 })
    }
    for (const r of body.created) {
      roles.push({ id: `R${nextId++}`, orgId: body.orgId, categoryId: body.categoryId, ...values(r), references: [], version: 1, ...stamp })
    }
    if (key) idempotent.add(key)
    return HttpResponse.json(listOf(body.orgId, body.categoryId, true, user))
  }),

  http.post('/api/project-roles/batch-delete', async ({ request }) => {
    await delay(LATENCY)
    const user = userOf(request)
    if (!user) return unauthorized()
    if (!user.canMaintainRole) return forbidden('project:role:edit')
    const { items } = (await request.json()) as ProjectRoleDelete
    const results: RowResult[] = items.map(({ id, version }) => {
      const r = roles.find((x) => x.id === id)
      if (!r) return { id, title: id, ok: false, message: '已被别人删除' }
      if (r.references.length > 0) return { id, title: title(r), ok: false, message: referenced(r), references: r.references }
      if (r.version !== version) return { id, title: title(r), ok: false, message: `${r.updatedBy} 刚修改过，请刷新后再删` }
      roles = roles.filter((x) => x.id !== id)
      return { id, title: title(r), ok: true }
    })
    return HttpResponse.json(results)
  }),

  http.put('/api/project-roles/:id/status', async ({ request, params }) => {
    await delay(LATENCY)
    const user = userOf(request)
    if (!user) return unauthorized()
    if (!user.canMaintainRole) return forbidden('project:role:edit')
    const role = roles.find((r) => r.id === params.id)
    if (!role) return notFound()
    const body = (await request.json()) as { enabled: boolean; version: number }
    if (body.version !== role.version) {
      return fail(409, { code: 'VERSION_CONFLICT', message: `${role.updatedBy} 在 ${role.updatedAt} 修改过这条数据，已刷新，请再操作一次` })
    }
    Object.assign(role, { enabled: body.enabled, version: role.version + 1, updatedAt: now(), updatedBy: user.name })
    return HttpResponse.json(toDto(role, user))
  }),

  // ---------- 仅供测试：模拟“别人”的动作、会话失效和出错 ----------
  http.post('/api/__mock/expire', () => {
    expired = true
    return new HttpResponse(null, { status: 204 })
  }),
  http.post('/api/__mock/fail-list', () => {
    failNextList = true
    return new HttpResponse(null, { status: 204 })
  }),
  http.post('/api/__mock/fail-save', () => {
    failNextSave = 1
    return new HttpResponse(null, { status: 204 })
  }),
  http.post('/api/__mock/roles/:id/touch', ({ params }) => {
    const role = roles.find((r) => r.id === params.id)
    if (!role) return notFound()
    Object.assign(role, { name: `${role.name}（他人改）`, version: role.version + 1, updatedAt: now(), updatedBy: '示例同事' })
    return HttpResponse.json({ version: role.version })
  }),
  http.post('/api/__mock/roles/:id/remove', ({ params }) => {
    roles = roles.filter((r) => r.id !== params.id)
    return new HttpResponse(null, { status: 204 })
  }),
  http.post('/api/__mock/roles/:id/reference', ({ params }) => {
    const role = roles.find((r) => r.id === params.id)
    if (!role) return notFound()
    role.references.push('XM2026099 示例项目九十九')
    return HttpResponse.json({ count: role.references.length })
  }),
]
