import { delay, http, HttpResponse } from 'msw'
import type { AllowedAction, ApiErrorBody, OrgNode, ProjectRole } from '@/api/generated/model'
import { orgTree, seedRoles, users, type MockUser, type RoleRecord } from './seed'

// 内存数据，刷新即还原
let roles = seedRoles()
const idempotent = new Map<string, RoleRecord>()
let nextId = 1000
let expired = false

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

function flatOrgs(nodes: OrgNode[]): OrgNode[] {
  return nodes.flatMap((n) => [n, ...flatOrgs(n.children)])
}
const orgName = (id: string) => flatOrgs(orgTree).find((o) => o.id === id)?.name ?? id

function now(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/** 行级动作由“后端”算好，前端不按状态推断 */
function actionsOf(role: RoleRecord, user: MockUser, viewingOrg: string): AllowedAction[] {
  const deny = (reason: string): AllowedAction[] =>
    (['edit', role.enabled ? 'disable' : 'enable', 'delete'] as const).map((action) => ({ action, allowed: false, reason }))
  if (!user.canMaintainRole) return deny('没有“项目岗位-维护”权限')
  if (role.orgId !== viewingOrg) return deny('集团岗位只能在集团下维护')
  return [
    { action: 'edit', allowed: true },
    { action: role.enabled ? 'disable' : 'enable', allowed: true },
    role.references.length > 0
      ? { action: 'delete', allowed: false, reason: `已被 ${role.references.length} 个项目引用，不能删除，可以停用` }
      : { action: 'delete', allowed: true },
  ]
}

function toDto(role: RoleRecord, user: MockUser, viewingOrg = role.orgId): ProjectRole {
  const { references, ...rest } = role
  return {
    ...rest,
    orgName: orgName(role.orgId),
    refCount: references.length,
    allowedActions: actionsOf(role, user, viewingOrg),
  }
}

interface RoleInput {
  code: string
  name: string
  isManager: boolean
  remark?: string | null
}

function validate(input: RoleInput, orgId: string, selfId?: string) {
  const errors: { field: string; message: string }[] = []
  const peers = roles.filter((r) => r.orgId === orgId && r.id !== selfId)
  const sameCode = peers.find((r) => r.code === input.code)
  if (sameCode) errors.push({ field: 'code', message: `岗位编码已被“${sameCode.name}”使用` })
  const manager = peers.find((r) => r.isManager)
  if (input.isManager && manager) {
    errors.push({ field: 'isManager', message: `${orgName(orgId)}已有经理岗位“${manager.name}”，每个组织只能有一个` })
  }
  return errors
}

const invalid = (fieldErrors: { field: string; message: string }[]) =>
  fail(422, { code: 'INVALID', message: '填写内容有误', fieldErrors })

const conflict = (role: RoleRecord, user: MockUser) =>
  fail(409, {
    code: 'VERSION_CONFLICT',
    message: `${role.updatedBy} 在 ${role.updatedAt} 修改过这条数据`,
    latest: { ...toDto(role, user) },
  })

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

  http.get('/api/orgs/tree', async ({ request }) => {
    await delay(LATENCY)
    return userOf(request) ? HttpResponse.json(orgTree) : unauthorized()
  }),

  http.get('/api/project-roles', async ({ request }) => {
    await delay(LATENCY)
    const user = userOf(request)
    if (!user) return unauthorized()
    if (!user.permissions.includes('project:role:view')) return forbidden('project:role:view')
    const q = new URL(request.url).searchParams
    const orgId = q.get('orgId') ?? 'G'
    const keyword = (q.get('keyword') ?? '').trim()
    const enabled = q.get('enabled')
    const page = Number(q.get('page') ?? 1)
    const size = Number(q.get('size') ?? 50)
    const matched = roles
      .filter((r) => r.orgId === orgId || r.orgId === 'G')
      .filter((r) => !keyword || r.name.includes(keyword) || r.code.includes(keyword))
      .filter((r) => enabled === null || String(r.enabled) === enabled)
    return HttpResponse.json({
      list: matched.slice((page - 1) * size, page * size).map((r) => toDto(r, user, orgId)),
      total: matched.length,
    })
  }),

  http.post('/api/project-roles', async ({ request }) => {
    await delay(LATENCY)
    const user = userOf(request)
    if (!user) return unauthorized()
    if (!user.permissions.includes('project:role:create')) return forbidden('project:role:create')
    const key = request.headers.get('Idempotency-Key') ?? ''
    const done = idempotent.get(key)
    if (done) return HttpResponse.json(toDto(done, user), { status: 201 })
    const body = (await request.json()) as RoleInput & { orgId: string }
    const errors = validate(body, body.orgId)
    if (errors.length > 0) return invalid(errors)
    const record: RoleRecord = {
      id: `R${nextId++}`,
      orgId: body.orgId,
      code: body.code,
      name: body.name,
      isManager: body.isManager,
      enabled: true,
      remark: body.remark ?? null,
      references: [],
      version: 1,
      updatedAt: now(),
      updatedBy: user.name,
    }
    roles = [record, ...roles]
    if (key) idempotent.set(key, record)
    return HttpResponse.json(toDto(record, user), { status: 201 })
  }),

  http.put('/api/project-roles/:id', async ({ request, params }) => {
    await delay(LATENCY)
    const user = userOf(request)
    if (!user) return unauthorized()
    if (!user.canMaintainRole) return forbidden('project:role:edit')
    const role = roles.find((r) => r.id === params.id)
    if (!role) return fail(404, { code: 'NOT_FOUND', message: '岗位不存在，可能已被删除' })
    const body = (await request.json()) as RoleInput & { version: number }
    if (body.version !== role.version) return conflict(role, user)
    const errors = validate(body, role.orgId, role.id)
    if (errors.length > 0) return invalid(errors)
    Object.assign(role, {
      code: body.code,
      name: body.name,
      isManager: body.isManager,
      remark: body.remark ?? null,
      version: role.version + 1,
      updatedAt: now(),
      updatedBy: user.name,
    })
    return HttpResponse.json(toDto(role, user))
  }),

  http.put('/api/project-roles/:id/status', async ({ request, params }) => {
    await delay(LATENCY)
    const user = userOf(request)
    if (!user) return unauthorized()
    if (!user.canMaintainRole) return forbidden('project:role:edit')
    const role = roles.find((r) => r.id === params.id)
    if (!role) return fail(404, { code: 'NOT_FOUND', message: '岗位不存在，可能已被删除' })
    const body = (await request.json()) as { enabled: boolean; version: number }
    if (body.version !== role.version) return conflict(role, user)
    Object.assign(role, { enabled: body.enabled, version: role.version + 1, updatedAt: now(), updatedBy: user.name })
    return HttpResponse.json(toDto(role, user))
  }),

  http.delete('/api/project-roles/:id', async ({ request, params }) => {
    await delay(LATENCY)
    const user = userOf(request)
    if (!user) return unauthorized()
    if (!user.canMaintainRole) return forbidden('project:role:edit')
    const role = roles.find((r) => r.id === params.id)
    if (!role) return fail(404, { code: 'NOT_FOUND', message: '岗位不存在，可能已被删除' })
    if (role.references.length > 0) {
      return fail(409, {
        code: 'REFERENCED',
        message: `“${role.name}”已被 ${role.references.length} 个项目引用，不能删除`,
        references: role.references,
      })
    }
    const version = Number(new URL(request.url).searchParams.get('version'))
    if (version !== role.version) return conflict(role, user)
    roles = roles.filter((r) => r.id !== role.id)
    return new HttpResponse(null, { status: 204 })
  }),

  // ---------- 仅供测试：模拟“别人”的动作和会话失效 ----------
  http.post('/api/__mock/expire', () => {
    expired = true
    return new HttpResponse(null, { status: 204 })
  }),
  http.post('/api/__mock/roles/:id/touch', ({ params }) => {
    const role = roles.find((r) => r.id === params.id)
    if (!role) return fail(404, { code: 'NOT_FOUND', message: '不存在' })
    Object.assign(role, { name: `${role.name}（他人改）`, version: role.version + 1, updatedAt: now(), updatedBy: '示例同事' })
    return HttpResponse.json({ version: role.version })
  }),
  http.post('/api/__mock/roles/:id/reference', ({ params }) => {
    const role = roles.find((r) => r.id === params.id)
    if (!role) return fail(404, { code: 'NOT_FOUND', message: '不存在' })
    role.references.push('XM2026099 示例项目九十九')
    return HttpResponse.json({ count: role.references.length })
  }),
]
