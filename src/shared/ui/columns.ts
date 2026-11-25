// 列按字段类型取默认宽度、对齐和固定位置，页面不逐列写宽度。数值的依据见 docs/standards/list.md。
import type { InjectionKey, Ref } from 'vue'

export type ColumnKind = 'code' | 'name' | 'status' | 'enum' | 'amount' | 'count' | 'org' | 'time' | 'user'

export interface DataColumn<Row> {
  key: Extract<keyof Row, string>
  label: string
  kind: ColumnKind
  /** 显示的文字；需要标签、链接时用 cell-<key> 插槽 */
  text?: (row: Row) => string
  /** 金额小数位 */
  scale?: number
}

export interface ColumnLayout {
  width?: number
  minWidth?: number
  align?: 'left' | 'center' | 'right'
  fixed?: 'left' | 'right'
}

export const COLUMN_LAYOUT: Record<ColumnKind, ColumnLayout> = {
  code: { width: 100, fixed: 'left' },
  name: { minWidth: 180, fixed: 'left' },
  status: { width: 88 },
  enum: { width: 100 },
  amount: { width: 188, align: 'right' },
  count: { width: 104, align: 'right' },
  org: { minWidth: 148 },
  time: { width: 172 },
  user: { width: 108 },
}

export const ACTIONS_WIDTH = 140

/** 表格行高：宽松 / 默认 / 紧凑 */
export const DENSITIES = [40, 36, 32] as const
export type Density = (typeof DENSITIES)[number]
export const DENSITY_TEXT: Record<Density, string> = { 40: '宽松', 36: '默认', 32: '紧凑' }

/** 用户偏好由 src/app 提供；没提供时用默认行高 */
export const densityKey: InjectionKey<Ref<Density>> = Symbol('app-density')
