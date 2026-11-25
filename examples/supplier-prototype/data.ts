// 虚构数据与模拟接口。错误、禁用原因都由“服务端”返回，页面不自己推断。
import { ref, watch } from 'vue'
import { compareAmounts, sumAmounts } from '@/shared/money/amount'

export type Status = 'enabled' | 'frozen' | 'disabled'
export type Kind = 'domestic' | 'overseas'
export type Settle = 'prepay' | 'delivery' | 'monthly'
export type Scope = 'group' | 'org'

export interface Reference {
  type: string
  no: string
  date: string
}

export interface LogItem {
  at: string
  by: string
  text: string
}

export interface SupplierInput {
  code: string
  name: string
  kind: Kind
  creditCode: string
  country: string
  regNo: string
  settle: Settle
  termDays: string
  billDay: string
  creditLimit: string | null
  scope: Scope
  orgIds: string[]
  remark: string
}

export interface Supplier extends SupplierInput {
  id: string
  status: Status
  payable: string
  references: Reference[]
  log: LogItem[]
  createdAt: string
  createdBy: string
  updatedAt: string
  updatedBy: string
}

export interface Org {
  id: string
  code: string
  name: string
  region: string
  enabled: boolean
}

export const kindText: Record<Kind, string> = { domestic: '境内企业', overseas: '境外企业' }
export const settleText: Record<Settle, string> = { prepay: '预付', delivery: '货到付款', monthly: '月结' }
export const statusText: Record<Status, string> = { enabled: '启用', frozen: '冻结付款', disabled: '停用' }
export const countries = ['新加坡', '德国', '日本', '阿联酋', '中国香港']

export function settleLabel(s: Pick<SupplierInput, 'settle' | 'termDays'>) {
  return s.settle === 'monthly' ? `月结 ${s.termDays} 天` : settleText[s.settle]
}

/* ---------- 组织 ---------- */

const regions = ['华东', '华南', '华北', '西南']
export const orgs: Org[] = Array.from({ length: 22 }, (_, i) => ({
  id: `O${i + 1}`,
  code: `01${String(i + 1).padStart(2, '0')}`,
  name: `${regions[i % 4]}示例${['公司', '分公司', '项目部'][i % 3]} ${Math.floor(i / 4) + 1}`,
  region: regions[i % 4] as string,
  enabled: i % 9 !== 7,
}))
const orgById = new Map(orgs.map((o) => [o.id, o]))
export const orgName = (id: string) => orgById.get(id)?.name ?? id

export function scopeLabel(s: Pick<SupplierInput, 'scope' | 'orgIds'>) {
  if (s.scope === 'group') return '集团通用'
  return s.orgIds.length === 1 ? orgName(s.orgIds[0] as string) : `${s.orgIds.length} 个组织`
}

/* ---------- 供应商种子 ---------- */

const words = ['青禾', '远川', '拓石', '云岭', '北辰', '南湾', '启程', '金穗', '长风', '白桦', '临江', '盛合', '明川', '海拓', '松原', '雁回']
const trades = ['建材', '机电设备', '混凝土', '钢构', '劳务', '工程检测', '物流', '测绘']
const limits = ['500000.00', '1200000.00', '0.00', null, '12500000.00', '800000.00', '3000000.00']
const payables = ['1284300.00', '0.00', '-38200.50', '560000.00', '9875.36', '22408000.00']
const people = ['示例经办甲', '示例经办乙', '示例主管']

function seed(): Supplier[] {
  return Array.from({ length: 63 }, (_, i) => {
    const overseas = i % 11 === 6
    const refCount = [3, 0, 1, 5, 0, 2, 0][i % 7] as number
    const settle = (['monthly', 'prepay', 'delivery', 'monthly'] as const)[i % 4] as Settle
    const day = String((i % 24) + 1).padStart(2, '0')
    const scope: Scope = i % 3 === 1 ? 'org' : 'group'
    const by = people[i % 3] as string
    const trade = trades[(i * 3 + Math.floor(i / 16)) % 8] as string
    return {
      id: `S${i + 1}`,
      code: `GYS${String(i + 1).padStart(4, '0')}`,
      name: overseas ? `Sample ${words[i % 16]} Trading ${i + 1} Ltd.` : `${words[i % 16]}${trade}（示例）`,
      kind: overseas ? 'overseas' : 'domestic',
      creditCode: overseas ? '' : `91000000MA${String(i + 1).padStart(8, '0')}`,
      country: overseas ? (countries[i % 5] as string) : '',
      regNo: overseas ? `REG-${20260 + i}` : '',
      settle,
      termDays: settle === 'monthly' ? (['30', '45', '60'][i % 3] as string) : '',
      billDay: settle === 'monthly' ? '25' : '',
      creditLimit: i === 4 ? '99999999999999.99' : (limits[i % 7] ?? null),
      scope,
      orgIds: scope === 'org' ? orgs.filter((o) => o.enabled).slice(i % 5, (i % 5) + 1 + (i % 3)).map((o) => o.id) : [],
      remark: i % 8 === 0 ? '2026 年度框架协议供应商，付款前核对对账单' : '',
      status: i % 13 === 9 ? 'disabled' : i % 17 === 5 ? 'frozen' : 'enabled',
      payable: refCount === 0 ? '0.00' : i === 14 ? '86500000123.45' : (payables[i % 6] as string),
      references: Array.from({ length: refCount }, (_, k) => ({
        type: ['应付单', '付款申请', '采购合同'][k % 3] as string,
        no: `${['YF', 'FK', 'HT'][k % 3]}202611${String(i * 7 + k + 1).padStart(4, '0')}`,
        date: `2026-11-${String(((i + k) % 20) + 1).padStart(2, '0')}`,
      })),
      log: [{ at: `2026-10-${day} 09:30:00`, by, text: '新增档案' }],
      createdAt: `2026-10-${day} 09:30:00`,
      createdBy: by,
      updatedAt: `2026-11-${day} 1${i % 8}:2${i % 6}:08`,
      updatedBy: people[(i + 1) % 3] as string,
    } satisfies Supplier
  }).map((s, i) =>
    i === 2 ? { ...s, name: '示例国际工程设备租赁与技术服务（集团）股份有限公司华东分公司' } : s,
  )
}

let rows = seed()

/* ---------- 样页控制：切换页面状态 ---------- */

export type PageState = 'normal' | 'empty' | 'error' | 'forbidden'
export const pageState = ref<PageState>('normal')
export const showRules = ref(false)

/* 版本切换：#now 现版，#a 单行工具条，#b 指标在前，#c 列表加详情（也认 ?v=0/A/B/C） */
export type Variant = '0' | 'A' | 'B' | 'C'
const byHash: Record<string, Variant> = { now: '0', a: 'A', b: 'B', c: 'C' }
function variantFromUrl(): Variant {
  const named = byHash[location.hash.slice(1)]
  if (named) return named
  const v = new URLSearchParams(location.search).get('v')
  return v === '0' || v === 'B' || v === 'C' ? v : 'A'
}
export const variant = ref<Variant>(variantFromUrl())
window.addEventListener('hashchange', () => (variant.value = variantFromUrl()))
watch(variant, (v) => {
  try {
    history.replaceState(null, '', `#${Object.keys(byHash).find((k) => byHash[k] === v)}`)
  } catch {
    /* 嵌在受限的页面里时改不了地址，不影响切换 */
  }
})

export const dataVersion = ref(0)
export function resetData() {
  rows = seed()
  pageState.value = 'normal'
  dataVersion.value++
}

/* ---------- 模拟接口 ---------- */

export class FieldFail extends Error {
  readonly fields: Partial<Record<keyof SupplierInput, string>>
  constructor(fields: Partial<Record<keyof SupplierInput, string>>) {
    super('字段校验未通过')
    this.fields = fields
  }
}
export class Forbidden extends Error {}

const wait = (ms = 260) => new Promise((resolve) => setTimeout(resolve, ms))
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T
function now() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export interface Query {
  keyField: 'name' | 'code' | 'creditCode'
  keyword: string
  settle: Settle | ''
  dateField: 'updatedAt' | 'createdAt'
  range: [string, string] | null
  kind: Kind | ''
  scope: Scope | ''
  referenced: 'yes' | 'no' | ''
}
export const blankQuery = (): Query => ({
  keyField: 'name',
  keyword: '',
  settle: '',
  dateField: 'updatedAt',
  range: null,
  kind: '',
  scope: '',
  referenced: '',
})

export type SortKey = 'code' | 'creditLimit' | 'payable' | 'updatedAt'
export interface Sort {
  key: SortKey
  order: 'asc' | 'desc'
}

export interface ListResult {
  list: Supplier[]
  total: number
  counts: Record<Status | 'all', number>
  sums: { creditLimit: string; payable: string }
  /** 各状态的应付余额合计，范围同 counts */
  payables: Record<Status | 'all', string>
}

function matches(s: Supplier, q: Query) {
  const word = q.keyword.trim().toLowerCase()
  if (word) {
    const value = q.keyField === 'creditCode' ? s.creditCode || s.regNo : s[q.keyField]
    if (!value.toLowerCase().includes(word)) return false
  }
  if (q.settle && s.settle !== q.settle) return false
  if (q.kind && s.kind !== q.kind) return false
  if (q.scope && s.scope !== q.scope) return false
  if (q.referenced && s.references.length > 0 !== (q.referenced === 'yes')) return false
  if (q.range) {
    const day = s[q.dateField].slice(0, 10)
    if ((q.range[0] && day < q.range[0]) || (q.range[1] && day > q.range[1])) return false
  }
  return true
}

function compare(a: Supplier, b: Supplier, key: SortKey) {
  if (key === 'code' || key === 'updatedAt') return a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0
  return compareAmounts(a[key] ?? '-1', b[key] ?? '-1')
}

export async function listSuppliers(
  q: Query,
  status: Status | 'all',
  page: { current: number; size: number },
  sort: Sort | null,
): Promise<ListResult> {
  await wait()
  if (pageState.value === 'error') throw new Error('查询超时（追踪号 demo-5f21）')
  if (pageState.value === 'forbidden') throw new Forbidden('base:supplier:view')
  const source = pageState.value === 'empty' ? [] : rows
  const hit = source.filter((s) => matches(s, q))
  const counts = { all: hit.length, enabled: 0, frozen: 0, disabled: 0 }
  for (const s of hit) counts[s.status]++
  const inTab = status === 'all' ? hit : hit.filter((s) => s.status === status)
  const sorted = sort
    ? [...inTab].sort((a, b) => compare(a, b, sort.key) * (sort.order === 'asc' ? 1 : -1))
    : inTab
  const start = (page.current - 1) * page.size
  return {
    list: clone(sorted.slice(start, start + page.size)),
    total: inTab.length,
    counts,
    sums: {
      creditLimit: sumAmounts(inTab.map((s) => s.creditLimit)),
      payable: sumAmounts(inTab.map((s) => s.payable)),
    },
    payables: {
      all: sumAmounts(hit.map((s) => s.payable)),
      enabled: sumAmounts(hit.filter((s) => s.status === 'enabled').map((s) => s.payable)),
      frozen: sumAmounts(hit.filter((s) => s.status === 'frozen').map((s) => s.payable)),
      disabled: sumAmounts(hit.filter((s) => s.status === 'disabled').map((s) => s.payable)),
    },
  }
}

export const nextCode = () =>
  `GYS${String(Math.max(0, ...rows.map((s) => Number(/^GYS(\d+)$/.exec(s.code)?.[1] ?? 0))) + 1).padStart(4, '0')}`

export async function saveSupplier(id: string | null, input: SupplierInput): Promise<Supplier> {
  await wait(420)
  const fields: FieldFail['fields'] = {}
  const others = rows.filter((s) => s.id !== id)
  const sameName = others.find((s) => s.name === input.name)
  if (sameName) fields.name = `已有同名供应商，编码 ${sameName.code}`
  const sameCode = others.find((s) => s.code === input.code)
  if (sameCode) fields.code = `编码已被“${sameCode.name}”使用`
  const sameCredit = input.creditCode && others.find((s) => s.creditCode === input.creditCode)
  if (sameCredit) fields.creditCode = `该信用代码已登记在 ${sameCredit.code}“${sameCredit.name}”`
  if (Object.keys(fields).length > 0) throw new FieldFail(fields)

  const at = now()
  const by = '示例经办甲'
  const old = rows.find((s) => s.id === id)
  const saved: Supplier = old
    ? { ...old, ...input, code: old.code, kind: old.kind, updatedAt: at, updatedBy: by, log: [{ at, by, text: '修改档案' }, ...old.log] }
    : {
        ...input,
        id: `S${Date.now()}`,
        status: 'enabled',
        payable: '0.00',
        references: [],
        log: [{ at, by, text: '新增档案' }],
        createdAt: at,
        createdBy: by,
        updatedAt: at,
        updatedBy: by,
      }
  rows = old ? rows.map((s) => (s.id === id ? saved : s)) : [saved, ...rows]
  return clone(saved)
}

export interface RowResult {
  id: string
  code: string
  name: string
  ok: boolean
  reason: string
}

/** 删除：有引用的逐行返回失败原因，其余照常删除 */
export async function removeSuppliers(ids: string[]): Promise<RowResult[]> {
  await wait(420)
  const results = rows
    .filter((s) => ids.includes(s.id))
    .map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      ok: s.references.length === 0,
      reason: s.references.length === 0 ? '' : `已被 ${s.references.length} 张单据引用`,
    }))
  const gone = new Set(results.filter((r) => r.ok).map((r) => r.id))
  rows = rows.filter((s) => !gone.has(s.id))
  return results
}

export async function setStatus(ids: string[], status: Status): Promise<RowResult[]> {
  await wait(320)
  const at = now()
  const by = '示例经办甲'
  const results: RowResult[] = []
  rows = rows.map((s) => {
    if (!ids.includes(s.id)) return s
    const same = s.status === status
    results.push({ id: s.id, code: s.code, name: s.name, ok: !same, reason: same ? `已经是“${statusText[status]}”` : '' })
    return same
      ? s
      : { ...s, status, updatedAt: at, updatedBy: by, log: [{ at, by, text: `状态改为“${statusText[status]}”` }, ...s.log] }
  })
  return results
}

/* ---------- 规则标注 ---------- */

export const ruleList = {
  primary: { n: 1, text: '一页只有一个实心主按钮；“查询”用浅色', from: '图 01、20' },
  combo: { n: 2, text: '组合条件：先选查哪个字段再输入，日期同理，省出常用条件的位置', from: '图 18' },
  inline: { n: 3, text: '查询按钮跟在条件后面，不独占一行', from: '与微盟不同' },
  tabs: { n: 4, text: '状态页签只绑一套状态，数字是当前查询条件下的条数', from: '图 18、20' },
  columns: { n: 5, text: '列设置：可选字段与已选字段并排，可排序；编码、名称、状态不能隐藏', from: '图 62' },
  help: { n: 6, text: '金额列头说明口径', from: '图 01' },
  total: { n: 7, text: '合计写明范围：查询结果合计 / 已选合计', from: '方案第 4 节' },
  refs: { n: 8, text: '数量就地展开看明细', from: '图 53' },
  bottom: { n: 9, text: '批量操作和分页固定在表格底部', from: '图 20' },
  dialog: { n: 10, text: '录入用对话框：单列、标签对齐、控件定宽不拉满', from: '图 03、08' },
  locked: { n: 11, text: '保存后不能改的字段，新增时就提示', from: '图 10、60' },
  branch: { n: 12, text: '决定分支的字段在前，从属字段放灰底块；隐藏的不提交，切回时还原', from: '图 04、06' },
  picker: { n: 13, text: '参照弹层：右侧已选面板跨页保留，写明候选范围', from: '图 07、15' },
  blocked: { n: 14, text: '不能删除时给出原因和替代动作', from: '方案第 5 节' },
} as const
export type RuleKey = keyof typeof ruleList
