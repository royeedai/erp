import type { InjectionKey } from 'vue'

export type EditKind = 'text' | 'code' | 'amount' | 'quantity' | 'date' | 'select'

export interface SelectOption {
  value: string
  label: string
}

/** 明细行必须有稳定 ID；字段值统一是字符串或 null，金额、数量也是 */
export type EditRow = { id: string } & Record<string, string | null>

export interface EditColumn<Row extends EditRow = EditRow> {
  key: Extract<keyof Row, string>
  label: string
  kind: EditKind
  width?: number
  minWidth?: number
  fixed?: 'left' | 'right'
  /** 不写即只读；函数用于“按行决定能不能改” */
  editable?: boolean | ((row: Row) => boolean)
  required?: boolean
  /** amount / quantity 的小数位 */
  scale?: number
  maxInteger?: number
  allowNegative?: boolean
  options?: SelectOption[]
  /** 参与合计 */
  total?: boolean
  /** 返回错误文案，合法返回 null */
  validate?: (value: string | null, row: Row) => string | null
}

export interface EditError {
  rowId: string
  /** 从 1 开始的行号，用于“第 8 行·申请金额” */
  rowNo: number
  key: string
  label: string
  message: string
}

export interface CellChange<Row extends EditRow = EditRow> {
  row: Row
  key: Extract<keyof Row, string>
  value: string | null
  previous: string | null
}

/** 正在编辑的单元格向表格登记自己，表格统一控制提交和取消 */
export interface CellEditor {
  commit(): void
  cancel(): void
  /** 浮层（下拉、日期面板）是否展开，展开时方向键和回车交给它自己处理 */
  isPopupOpen(): boolean
}

export interface EditTableContext {
  register(editor: CellEditor): void
  unregister(editor: CellEditor): void
  write(row: EditRow, key: string, value: string | null): void
}

export const editTableKey: InjectionKey<EditTableContext> = Symbol('app-edit-table')
