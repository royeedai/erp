import type { EditColumn, EditRow } from '@/shared/ui/edit-table/types'

// 试验数据：15 列，其中 8 列可编辑；固定种子，保证每次一样
export interface TrialRow extends EditRow {
  itemCode: string
  itemName: string
  spec: string
  unit: string
  sourceNo: string
  sourceLine: string
  payable: string
  paid: string
  applyAmount: string | null
  taxAmount: string | null
  quantity: string | null
  dueDate: string | null
  payMethod: string | null
  account: string | null
  remark: string | null
}

const methods = [
  { value: 'TT', label: '电汇' },
  { value: 'BA', label: '银行承兑' },
  { value: 'CK', label: '支票' },
  { value: 'CS', label: '现金' },
]

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s
  }
}

/** 用整数分拼字符串，不经过浮点 */
function cents(n: number): string {
  const text = String(n).padStart(3, '0')
  return `${text.slice(0, -2)}.${text.slice(-2)}`
}

export function makeRows(count: number, seed = 1): TrialRow[] {
  const next = rng(seed)
  return Array.from({ length: count }, (_, i) => {
    const payable = 100_000 + (next() % 900_000_000)
    return {
      id: `r${i + 1}`,
      itemCode: `0${10000 + i}`,
      itemName: `示例物料 ${i + 1}`,
      spec: `规格 ${(next() % 90) + 10}`,
      unit: ['件', '套', '米', '吨'][next() % 4] as string,
      sourceNo: `CGDD20261124${String(i + 1).padStart(4, '0')}`,
      sourceLine: String((i % 9) + 1),
      payable: cents(payable),
      paid: cents(Math.floor(payable / 3)),
      applyAmount: cents(1 + (next() % 90_000_000)),
      taxAmount: cents(next() % 9_000_000),
      quantity: `${(next() % 900) + 1}.${String(next() % 1000).padStart(3, '0')}`,
      dueDate: `2026-12-${String((next() % 28) + 1).padStart(2, '0')}`,
      payMethod: methods[next() % 4]!.value,
      account: `6222${String(next()).padStart(10, '0')}`,
      remark: i % 5 === 0 ? '分期支付' : null,
    }
  })
}

export const trialColumns: EditColumn<TrialRow>[] = [
  { key: 'itemCode', label: '物料编码', kind: 'code', width: 100, fixed: 'left' },
  { key: 'itemName', label: '物料名称', kind: 'text', width: 140, editable: true, required: true },
  { key: 'spec', label: '规格', kind: 'text', width: 100, editable: true },
  { key: 'unit', label: '单位', kind: 'text', width: 70 },
  { key: 'sourceNo', label: '来源单号', kind: 'code', width: 160 },
  { key: 'payable', label: '应付金额', kind: 'amount', width: 150, total: true },
  { key: 'paid', label: '已付金额', kind: 'amount', width: 150, total: true },
  {
    key: 'applyAmount',
    label: '申请金额',
    kind: 'amount',
    width: 170,
    editable: true,
    required: true,
    total: true,
    validate: (value) => (value !== null && value.startsWith('-') ? '申请金额不能为负' : null),
  },
  { key: 'taxAmount', label: '税额', kind: 'amount', width: 150, editable: true, total: true },
  { key: 'quantity', label: '数量', kind: 'quantity', scale: 3, width: 130, editable: true, total: true },
  { key: 'dueDate', label: '到期日', kind: 'date', width: 150, editable: true, required: true },
  { key: 'payMethod', label: '付款方式', kind: 'select', width: 130, editable: true, required: true, options: methods },
  { key: 'account', label: '收款账号', kind: 'code', width: 170 },
  { key: 'sourceLine', label: '来源行', kind: 'text', width: 80 },
  { key: 'remark', label: '备注', kind: 'text', minWidth: 160, editable: true },
]
