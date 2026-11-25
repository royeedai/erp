// 唯一的请求出口。业务代码只用 orval 生成的函数，不直接调这里，更不写裸 fetch。

export interface FieldError {
  /** 表内编辑：错误在哪一行；新增的行用提交时的 tempId */
  rowId?: string
  field: string
  message: string
}

export type ApiErrorKind =
  | 'network' // 连不上
  | 'timeout' // 超时：结果未知，写操作不能自动重发
  | 'unauthorized' // 401
  | 'forbidden' // 403
  | 'conflict' // 409
  | 'invalid' // 422 字段错误
  | 'business' // 其他 4xx
  | 'server' // 5xx

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number
  readonly code: string
  readonly traceId: string | undefined
  readonly permission: string | undefined
  readonly fieldErrors: FieldError[]
  readonly latest: Record<string, unknown> | undefined
  readonly references: string[]

  constructor(kind: ApiErrorKind, status: number, body: Record<string, unknown>) {
    super(typeof body.message === 'string' ? body.message : DEFAULT_MESSAGE[kind])
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
    this.code = typeof body.code === 'string' ? body.code : kind.toUpperCase()
    this.traceId = typeof body.traceId === 'string' ? body.traceId : undefined
    this.permission = typeof body.permission === 'string' ? body.permission : undefined
    this.fieldErrors = Array.isArray(body.fieldErrors) ? (body.fieldErrors as FieldError[]) : []
    this.latest = (body.latest as Record<string, unknown> | undefined) ?? undefined
    this.references = Array.isArray(body.references) ? (body.references as string[]) : []
  }
}

const DEFAULT_MESSAGE: Record<ApiErrorKind, string> = {
  network: '网络连接失败，请检查网络后重试',
  timeout: '请求超时，结果未知。请先查询是否已成功，不要重复提交',
  unauthorized: '登录已失效，请重新登录',
  forbidden: '没有权限',
  conflict: '数据已被他人修改',
  invalid: '填写内容有误',
  business: '操作未完成',
  server: '服务器出错，请稍后重试',
}

interface HttpConfig {
  baseUrl: string
  timeoutMs: number
  getToken: () => string | null
  onUnauthorized: () => void
}

const config: HttpConfig = {
  baseUrl: '/api',
  timeoutMs: 30_000,
  getToken: () => null,
  onUnauthorized: () => {},
}

export function configureHttp(options: Partial<HttpConfig>) {
  Object.assign(config, options)
}

function kindOf(status: number): ApiErrorKind {
  if (status === 401) return 'unauthorized'
  if (status === 403) return 'forbidden'
  if (status === 409) return 'conflict'
  if (status === 422) return 'invalid'
  return status >= 500 ? 'server' : 'business'
}

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined
  const text = await response.text()
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return { message: undefined }
  }
}

/** orval 约定的导出名：让生成的 hook 把错误类型标成 ApiError */
export type ErrorType<_Body = unknown> = ApiError

/** orval 的 mutator：成功返回数据，失败一律抛 ApiError */
export async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  const token = config.getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const timeout = AbortSignal.timeout(config.timeoutMs)
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout

  let response: Response
  try {
    response = await fetch(config.baseUrl + url, { ...options, headers, signal })
  } catch (error) {
    // 主动取消（切页、重新查询）不是错误，原样抛给 Vue Query 处理
    if (options.signal?.aborted) throw error
    throw new ApiError(timeout.aborted ? 'timeout' : 'network', 0, {})
  }

  const body = await readBody(response)
  if (response.ok) return body as T

  const error = new ApiError(kindOf(response.status), response.status, (body ?? {}) as Record<string, unknown>)
  // 登录接口自己的 401 是“账号或密码错误”，不是会话失效
  if (error.kind === 'unauthorized' && token) config.onUnauthorized()
  throw error
}

/** 每次“打开新增表单”生成一次，同一次提交重试用同一个值 */
export function newIdempotencyKey(): string {
  return crypto.randomUUID()
}
