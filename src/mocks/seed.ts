// 模拟数据，全部虚构。只在 VITE_MOCK=1 时打包。
import type { OrgNode } from '@/api/generated/model'
import usersJson from './users.json'

export interface MockUser {
  id: string
  username: string
  password: string
  name: string
  permissions: string[]
  /** 能否维护项目岗位（由后端判断，前端只看 allowedActions） */
  canMaintainRole: boolean
}

export const users: MockUser[] = usersJson

export const orgTree: OrgNode[] = [
  {
    id: 'G',
    code: '00',
    name: '示例集团',
    level: 'group',
    children: [
      { id: 'O1', code: '0101', name: '华东公司', level: 'org', children: [] },
      { id: 'O2', code: '0102', name: '华南公司', level: 'org', children: [] },
      { id: 'O3', code: '0103', name: '华北公司', level: 'org', children: [] },
    ],
  },
]

export interface RoleRecord {
  id: string
  orgId: string
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

const names = ['造价工程师', '安全员', '施工员', '资料员', '质量员', '材料员', '测量员', '预算员', '劳务员', '机械员']

function role(id: number, orgId: string, name: string, extra: Partial<RoleRecord> = {}): RoleRecord {
  return {
    id: `R${id}`,
    orgId,
    code: `GW${String(id).padStart(4, '0')}`,
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
    role(1, 'G', '集团项目总监', { isManager: true, references: ['XM2026001 示例项目一'] }),
    role(2, 'G', '集团合约专员'),
    role(3, 'O1', '项目经理', {
      isManager: true,
      references: ['XM2026001 示例项目一', 'XM2026002 示例项目二', 'XM2026007 示例项目七'],
    }),
    role(4, 'O1', '项目副经理', { references: ['XM2026002 示例项目二'] }),
    role(5, 'O1', '见习工程师', { enabled: false, remark: '2026 年起停用，历史项目仍显示' }),
    role(6, 'O2', '项目经理', { isManager: true }),
  ]
  // 凑够分页
  for (let i = 0; i < 64; i++) {
    list.push(role(100 + i, 'O1', `${names[i % names.length]}${i >= names.length ? ` ${Math.floor(i / names.length)}` : ''}`))
  }
  return list
}
