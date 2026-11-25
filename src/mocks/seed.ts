// 模拟数据，全部虚构。只在 VITE_MOCK=1 时打包。
import type { HomeSummary, OrgNode } from '@/api/generated/model'
import usersJson from './users.json'

export interface MockUser {
  id: string
  username: string
  password: string
  name: string
  permissions: string[]
  /** 能否维护项目岗位（由后端判断，前端只看 canMaintain 和 allowedActions） */
  canMaintainRole: boolean
}

export const users: MockUser[] = usersJson

/* ---------- 项目组织 ---------- */

export const projectOrgs: OrgNode[] = [
  {
    id: 'G',
    code: '01',
    name: '示例集团',
    enabled: true,
    children: [
      { id: 'O1', code: '0101', name: '华东项目部', enabled: true, children: [] },
      { id: 'O2', code: '0102', name: '华南项目部', enabled: true, children: [] },
      { id: 'O3', code: '0103', name: '华北项目部', enabled: false, children: [] },
    ],
  },
]

/* ---------- 项目基本分类 ---------- */

export interface CategoryRecord {
  id: string
  code: string
  name: string
  /** 不能维护岗位的原因；没有就能维护 */
  locked?: string
  children: CategoryRecord[]
}
const category = (id: string, code: string, name: string, children: CategoryRecord[] = []): CategoryRecord => ({ id, code, name, children })

export const categories: CategoryRecord[] = [
  {
    ...category('ROOT', '', '项目基本分类', [
      category('TZ', 'TZ', '投资类', [
        category('TZ1', 'TZ-001', '固定资产投资类'),
        category('TZ2', 'TZ-002', '股权投资类'),
        category('TZ3', 'TZ-003', '其他投资类'),
      ]),
      category('GC', 'GC', '工程类', [category('GC1', 'GC-001', '房建工程'), category('GC2', 'GC-002', '市政工程')]),
      category('XX', 'XX', '信息化类'),
    ]),
    locked: '这一层不能维护岗位，请选下面的分类',
  },
]

/* ---------- 岗位 ---------- */

export interface RoleRecord {
  id: string
  orgId: string
  categoryId: string
  code: string
  name: string
  isManager: boolean
  enabled: boolean
  remark: string | null
  references: string[]
  version: number
  updatedAt: string
  updatedBy: string
}

function role(id: number, categoryId: string, code: string, name: string, extra: Partial<RoleRecord> = {}): RoleRecord {
  return {
    id: `R${id}`,
    orgId: 'G',
    categoryId,
    code,
    name,
    isManager: false,
    enabled: true,
    remark: null,
    references: [],
    version: 1,
    updatedAt: '2026-11-20 09:30:00',
    updatedBy: '示例管理员',
    ...extra,
  }
}

export function seedRoles(): RoleRecord[] {
  const list: RoleRecord[] = [
    role(1, 'TZ', 'TZ01', '投资负责人', { isManager: true, references: ['XM2026001 示例项目一'] }),
    role(2, 'TZ', 'TZ02', '投资专员'),
    role(3, 'GC', 'GC01', '项目经理', {
      isManager: true,
      references: ['XM2026001 示例项目一', 'XM2026002 示例项目二', 'XM2026007 示例项目七'],
      remark: '立项时必须指定',
    }),
    role(4, 'GC', 'GC02', '项目副经理', { references: ['XM2026002 示例项目二'] }),
    role(5, 'GC', 'GC03', '造价工程师'),
    role(6, 'GC', 'GC04', '安全员'),
    role(7, 'GC', 'GC05', '施工员'),
    role(8, 'GC', 'GC06', '资料员'),
    role(9, 'GC', 'GC07', '见习工程师', { enabled: false, remark: '2026 年起停用，历史项目仍显示' }),
    role(10, 'GC1', 'FJ01', '项目经理', { isManager: true }),
    role(11, 'GC1', 'FJ02', '栋号长'),
  ]
  // 一张长表，看滚动
  const names = ['测量员', '材料员', '质量员', '预算员', '劳务员', '机械员']
  for (let i = 0; i < 60; i++) list.push(role(100 + i, 'XX', `XX${String(i + 1).padStart(3, '0')}`, `${names[i % names.length]!} ${Math.floor(i / names.length) + 1}`))
  return list
}

/* ---------- 首页 ---------- */

const drafts = (prefix: string, n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `${prefix}${i}`,
    no: `${prefix}202611${25 - i}000${i + 1}`,
    party: ['示例建材有限公司', '示例机电股份有限公司', '示例钢构有限公司'][i % 3]!,
    amount: ['128600.00', '46200.00', '310055.80'][i % 3]!,
    date: `2026-11-${25 - i}`,
  }))

/** 首期做哪几条业务还没定，卡片内容只为看版式 */
export const homeSummary: Record<string, HomeSummary> = {
  u1: {
    todos: { approval: 6, business: 12, warning: 2, notice: 9 },
    cards: [
      {
        key: 'track',
        type: 'metrics',
        title: '采购订单执行跟踪',
        span: 3,
        items: [
          { key: 'qty', label: '订单物料数量', value: '1286.00' },
          { key: 'arrive', label: '累计到货数量', value: '1040.00' },
          { key: 'stock', label: '累计入库数量', value: '1012.00' },
          { key: 'invoice', label: '累计发票数量', value: '960.00' },
          { key: 'invoiceAmt', label: '累计发票金额（万元）', value: '328.46' },
          { key: 'payAmt', label: '累计付款金额（万元）', value: '251.90' },
        ],
      },
      {
        key: 'daily',
        type: 'counts',
        title: '日常业务',
        span: 2,
        items: [
          { key: 'no-manager', label: '没定经理岗位的分类', value: '3', unit: '个', path: '/project/roles' },
          { key: 'contract', label: '合同待生效', value: '1', unit: '份' },
          { key: 'order', label: '采购待下单', value: '8', unit: '行' },
          { key: 'receive', label: '未来7天待收货', value: '5', unit: '行' },
        ],
      },
      {
        key: 'pay',
        type: 'counts',
        title: '付款计划提醒',
        span: 1,
        items: [
          { key: 'now', label: '订单当前可付款', value: '2', unit: '行' },
          { key: 'late', label: '订单逾期未付款', value: '1', unit: '行' },
        ],
      },
      {
        key: 'drafts',
        type: 'drafts',
        title: '待提交单据',
        span: 3,
        items: [
          { key: 'contract', label: '采购合同', value: '1', unit: '份', drafts: drafts('HT', 1) },
          { key: 'order', label: '采购订单', value: '3', unit: '张', drafts: drafts('CG', 3) },
          { key: 'arrive', label: '到货单', value: '2', unit: '张', drafts: drafts('DH', 2) },
          { key: 'progress', label: '进度确认单', value: '0', unit: '张', drafts: [] },
          { key: 'invoice', label: '采购发票', value: '1', unit: '张', drafts: drafts('FP', 1) },
        ],
      },
    ],
  },
  u2: { todos: { approval: 0, business: 0, warning: 0, notice: 3 }, cards: [] },
  u3: { todos: { approval: 0, business: 0, warning: 0, notice: 0 }, cards: [] },
}
