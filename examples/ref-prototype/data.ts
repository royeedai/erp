// 虚构数据。应用目录是通用业务名词，只用来看导航的密度。
import { reactive } from 'vue'

export interface AppItem {
  key: string
  title: string
  path: [domain: string, module: string, group: string]
}

/** 能点开的六个页面 */
export const PAGES: AppItem[] = [
  { key: 'project-role', title: '项目岗位', path: ['项目管理', '基础设置', '项目人员'] },
  { key: 'change-reason', title: '工程变更原因', path: ['生产制造', '工程变更', '工程变更'] },
  { key: 'change-order', title: '工程变更申请单维护', path: ['生产制造', '工程变更', '工程变更'] },
  { key: 'supplier', title: '供应商-集团', path: ['基础平台', '基础数据', '供应商信息'] },
  { key: 'purchase', title: '采购订单维护', path: ['供应链', '采购管理', '采购订单'] },
]

const catalog: [string, [string, [string, string[]][]][]][] = [
  ['项目管理', [
    ['基础设置', [['项目人员', ['项目岗位', '项目人员类型']], ['项目分类', ['项目基本分类', '项目类型', '项目阶段']]]],
    ['项目立项', [['立项', ['项目立项', '立项变更', '项目关闭']]]],
    ['项目启动', [['启动', ['项目经理任命', '项目计划']]]],
    ['项目预算', [['预算', ['项目预算', '预算调整', '预算阶段对比']]]],
    ['合同管理', [['收款合同', ['收款合同', '收款合同补充协议']], ['付款合同', ['付款合同', '付款合同补充协议']]]],
    ['项目决算', [['决算', ['项目决算单']]]],
  ]],
  ['生产制造', [
    ['工程变更', [['工程变更', ['工程变更原因', '工程变更申请单维护', '工程变更单维护', '工艺变更单维护', '工程变更分析']]]],
    ['销售运营计划', [['计划', ['销售运营计划']]]],
    ['需求管理', [['需求', ['需求维护', '需求分析']]]],
    ['主生产计划', [['计划', ['主生产计划']]]],
    ['物料需求计划', [['计划', ['物料需求计划']]]],
    ['车间管理', [['车间', ['派工单', '完工报告']]]],
  ]],
  ['供应链', [
    ['采购管理', [['采购订单', ['采购订单维护', '采购订单执行查询']], ['采购合同', ['采购合同维护']]]],
    ['库存管理', [['库存', ['入库单', '出库单']]]],
    ['销售管理', [['销售', ['销售订单']]]],
  ]],
  ['财务会计', [
    ['应收管理', [['应收日常业务', ['应收单管理', '收款单管理']], ['核销处理', ['应收核销', '应收核销结果查询']]]],
    ['应付管理', [['应付日常业务', ['应付单管理', '付款单管理']], ['核销处理', ['应付核销', '应付核销结果查询']]]],
    ['总账', [['凭证', ['凭证查询']]]],
    ['资产管理', [['借用', ['资产借用申请', '借用归还台账']]]],
  ]],
  ['资金管理', [
    ['付款管理', [['付款', ['付款申请', '资金付款']]]],
    ['资金计划', [['计划', ['计划编制', '付款计划核定']]]],
    ['银行账户', [['账户', ['银行账户', '银行对账']]]],
  ]],
  ['人力资本', [
    ['人力设置', [['设置', ['岗位序列']]]],
    ['假勤管理', [['假勤', ['请假申请']]]],
    ['薪酬管理', [['薪酬', ['薪资发放']]]],
  ]],
  ['基础平台', [
    ['基础数据', [['供应商信息', ['供应商-集团', '供应商-业务单元']], ['客户信息', ['客户-集团']]]],
    ['流程中心', [['流程', ['审批中心', '我的流程中心']]]],
  ]],
]

export const APPS: AppItem[] = catalog.flatMap(([domain, modules]) =>
  modules.flatMap(([module, groups]) =>
    groups.flatMap(([group, titles]) =>
      titles.map((title) => ({
        key: PAGES.find((p) => p.title === title)?.key ?? '',
        title,
        path: [domain, module, group] as [string, string, string],
      })),
    ),
  ),
)

/* ---------- 项目岗位 ---------- */

export interface CategoryNode {
  id: string
  label: string
  /** 能不能在这个节点下维护岗位，由接口给 */
  canMaintain: boolean
  children?: CategoryNode[]
}

export const CATEGORIES: CategoryNode[] = [
  {
    id: 'root',
    label: '项目基本分类',
    canMaintain: false,
    children: [
      {
        id: 'TZ',
        label: 'TZ 投资类',
        canMaintain: true,
        children: [
          { id: 'TZ-001', label: 'TZ-001 固定资产投资类', canMaintain: true },
          { id: 'TZ-002', label: 'TZ-002 股权投资类', canMaintain: true },
          { id: 'TZ-003', label: 'TZ-003 其他投资类', canMaintain: true },
        ],
      },
      {
        id: 'GC',
        label: 'GC 工程类',
        canMaintain: true,
        children: [
          { id: 'GC-001', label: 'GC-001 房建工程', canMaintain: true },
          { id: 'GC-002', label: 'GC-002 市政工程', canMaintain: true },
        ],
      },
      { id: 'XX', label: 'XX 信息化类', canMaintain: true },
    ],
  },
]

export interface RoleRow {
  id: string
  code: string
  name: string
  isManager: boolean
  enabled: boolean
  remark: string
  [k: string]: unknown
}

const roleRow = (id: string, code: string, name: string, isManager = false, enabled = true, remark = ''): RoleRow => ({ id, code, name, isManager, enabled, remark })

export const ROLES = reactive<Record<string, RoleRow[]>>({
  'TZ': [roleRow('r1', 'TZ01', '投资负责人', true), roleRow('r2', 'TZ02', '投资专员')],
  'GC': [
    roleRow('r3', 'GC01', '项目经理', true, true, '立项时必须指定'),
    roleRow('r4', 'GC02', '项目副经理'),
    roleRow('r5', 'GC03', '造价工程师'),
    roleRow('r6', 'GC04', '安全员'),
    roleRow('r7', 'GC05', '施工员'),
    roleRow('r8', 'GC06', '资料员'),
    roleRow('r9', 'GC07', '见习工程师', false, false, '2026 年起停用'),
  ],
  'GC-001': [roleRow('r10', 'FJ01', '项目经理', true), roleRow('r11', 'FJ02', '栋号长')],
})

export const ORGS = [
  { id: 'o1', label: '示例集团', children: [{ id: 'o2', label: '华东项目部' }, { id: 'o3', label: '华南项目部' }, { id: 'o4', label: '华北项目部' }] },
]

/* ---------- 工程变更原因 ---------- */

export interface ReasonRow {
  id: string
  code: string
  name: string
  desc: string
  status: string
  creator: string
  createdAt: string
  editor: string
  editedAt: string
  [k: string]: unknown
}

export const REASONS = reactive<ReasonRow[]>(
  [['10', '设计改良'], ['20', '技术改进'], ['30', '安全改进'], ['40', '修正错误'], ['50', '其他']].map(([code, name], i) => ({
    id: `c${i}`,
    code: code!,
    name: name!,
    desc: '',
    status: '已启用',
    creator: '示例管理员',
    createdAt: '2026-11-24 21:26:39',
    editor: '',
    editedAt: '',
  })),
)

/* ---------- 列表 ---------- */

export type Cell = string | number | boolean
export type Row = { id: string } & Record<string, Cell>

const p = (n: number, len = 2) => String(n).padStart(len, '0')
const pick = <T,>(list: T[], i: number): T => list[i % list.length]!
const people = ['林一', '周二', '陈三', '赵四', '吴五']
const orgs = ['华东计划部', '华南计划部', '华北计划部']
const depts = ['工艺部', '设计部', '质量部', '工程部']

export const CHANGE_ORDERS: Row[] = Array.from({ length: 46 }, (_, i) => ({
  id: `o${i}`,
  planOrg: pick(orgs, i),
  no: `GCBG2026${p(11)}${p(60 - i, 4)}`,
  date: `2026-11-${p(24 - (i % 20))}`,
  applyOrg: pick(['示例制造公司', '示例装备公司'], i),
  dept: pick(depts, i),
  applicant: pick(people, i),
  status: pick(['自由', '自由', '审批中', '审批通过', '自由', '审批中'], i),
  remark: pick(['', '图纸版本更新', '', '客户要求', ''], i),
  maker: pick(people, i + 1),
  makeDate: `2026-11-${p(24 - (i % 20))}`,
  approver: pick(['', '', '', '孙六'], i),
  approveDate: pick(['', '', '', '2026-11-22'], i),
  creator: pick(people, i + 1),
  createdAt: `2026-11-${p(24 - (i % 20))} 0${8 + (i % 2)}:${p((i * 7) % 60)}:${p((i * 13) % 60)}`,
}))

export const SUPPLIERS: Row[] = Array.from({ length: 63 }, (_, i) => ({
  id: `s${i}`,
  attach: i % 5 === 0 ? 1 : 0,
  org: '示例集团',
  code: `GYS${p(i + 1, 5)}`,
  name: `示例${pick(['建材', '机电', '钢构', '物流', '检测', '劳务'], i)}${pick(['有限公司', '股份有限公司', '集团有限公司'], i)}${i >= 6 ? ` ${Math.floor(i / 6)}` : ''}`,
  short: `示例${pick(['建材', '机电', '钢构', '物流', '检测', '劳务'], i)}`,
  mnemonic: pick(['SLJC', 'SLJD', 'SLGG', 'SLWL', 'SLJCE', 'SLLW'], i),
  category: pick(['材料类', '设备类', '分包类', '服务类'], i),
  area: pick(['华东', '华南', '华北', '西南'], i),
  status: pick(['已核准', '已核准', '已核准', '未核准'], i),
  finType: pick(['外部单位', '内部单位'], i % 9 === 0 ? 1 : 0),
  tax: `91310000MA${p(1000 + i, 6)}X`,
  parent: '',
  founded: `20${p(5 + (i % 19))}-0${1 + (i % 9)}-1${i % 9}`,
}))

export const PURCHASES: Row[] = Array.from({ length: 38 }, (_, i) => {
  const qty = 10 + ((i * 37) % 190)
  const price = 85 + ((i * 53) % 900)
  return {
    id: `p${i}`,
    attach: i % 4 === 0 ? 1 : 0,
    org: pick(['示例采购中心', '华东采购部'], i),
    type: pick(['普通采购', '外包采购'], i),
    no: `CD2026${p(11)}${p(80 - i, 4)}`,
    date: `2026-11-${p(25 - (i % 20))}`,
    supplier: String(SUPPLIERS[i]!.name),
    qty: qty.toFixed(2),
    amount: (qty * price).toFixed(2),
    status: pick(['自由', '审批中', '审批通过', '审批通过'], i),
  }
})
