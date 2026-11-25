// 列表样例的数据，全部虚构。只在模拟模式下打包。
import type { RefNode } from '@/shared/ui/RefPicker.vue'

export interface OrderRow {
  id: string
  orgId: string
  orgName: string
  type: string
  no: string
  date: string
  supplier: string
  qty: string
  amount: string
  status: 'draft' | 'doing' | 'done'
  maker: string
  makeTime: string
}

export const ORGS: RefNode[] = [
  {
    id: 'C1',
    code: '01',
    name: '示例采购中心',
    children: [
      { id: 'C2', code: '0101', name: '华东采购部' },
      { id: 'C3', code: '0102', name: '华南采购部' },
      { id: 'C4', code: '0103', name: '华北采购部', enabled: false },
    ],
  },
]
const names: Record<string, string> = { C1: '示例采购中心', C2: '华东采购部', C3: '华南采购部' }

const pick = <T>(list: T[], i: number): T => list[i % list.length]!
const p2 = (n: number) => String(n).padStart(2, '0')

export const ORDERS: OrderRow[] = Array.from({ length: 138 }, (_, i) => {
  const qty = 10 + ((i * 37) % 190)
  const price = 85 + ((i * 53) % 900)
  const orgId = pick(['C1', 'C2', 'C3'], i)
  const date = `2026-11-${p2(25 - (i % 24))}`
  return {
    id: `P${i}`,
    orgId,
    orgName: names[orgId]!,
    type: pick(['普通采购', '外包采购'], i),
    no: `CD2026${p2(11)}${String(200 - i).padStart(4, '0')}`,
    date,
    supplier: `示例${pick(['建材', '机电', '钢构', '物流', '检测', '劳务'], i)}${pick(['有限公司', '股份有限公司'], i)}`,
    qty: String(qty),
    // 留一张负数的红冲单，看负数样式
    amount: `${i % 29 === 11 ? '-' : ''}${qty * price}.${p2(i % 100)}`,
    status: pick(['draft', 'doing', 'done', 'done'] as const, i),
    maker: pick(['林一', '周二', '陈三'], i),
    makeTime: `${date} ${p2(8 + (i % 9))}:${p2((i * 7) % 60)}:${p2((i * 13) % 60)}`,
  }
})
