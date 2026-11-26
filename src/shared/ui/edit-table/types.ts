import type { InjectionKey } from 'vue'

export type EditKind = 'text' | 'code' | 'amount' | 'quantity' | 'date' | 'select' | 'switch'

export interface SelectOption {
  value: string
  label: string
}

/** 明细行必须有稳定 ID；字段值是字符串或 null（金额、数量也是），开关是布尔 */
export type EditValue = string | boolean | null
export type EditRow = { id: string } & Record<string, EditValue>

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
  /** 开关列浏览时显示的文字，依次是真、假；默认“是 / 否” */
  switchText?: [on: string, off: string]
  /** 录入长度上限 */
  maxLength?: number
  /** 默认不显示，在列设置里可以加回来 */
  hidden?: boolean
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
  value: EditValue
  previous: EditValue
}

/** 正在编辑的单元格向表格登记自己，表格统一控制提交和取消 */
export interface CellEditor {
  commit(): void
  cancel(): void
  /** 浮层是否展开，展开时 Esc 先关浮层 */
  isPopupOpen(): boolean
  /** 展开的下拉正在用回车选项；日期框键入后也会展开面板，但回车仍应确认并前进 */
  ownsEnter(): boolean
  /** 补进格子还没拿到焦点时按下的字，替换选中的部分 */
  insert(text: string): void
}

export interface EditTableContext {
  register(editor: CellEditor): void
  unregister(editor: CellEditor): void
  write(row: EditRow, key: string, value: EditValue): void
}

export const editTableKey: InjectionKey<EditTableContext> = Symbol('app-edit-table')
