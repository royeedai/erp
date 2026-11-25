// 列按字段类型取默认宽度、对齐和固定位置，页面不逐列写宽度。数值的依据见 docs/standards/list.md。
import type { InjectionKey, Ref } from 'vue'

export type ColumnKind = 'code' | 'docNo' | 'name' | 'status' | 'enum' | 'amount' | 'count' | 'org' | 'date' | 'time' | 'user'

export interface DataColumn<Row> {
  key: Extract<keyof Row, string>
  label: string
  kind: ColumnKind
  /** 显示的文字；需要标签、链接时用 cell-<key> 插槽 */
  text?: (row: Row) => string
  /** 金额小数位 */
  scale?: number
  /** 默认不显示，在列设置里可以加回来 */
  hidden?: boolean
}

export interface ColumnLayout {
  width?: number
  align?: 'left' | 'center' | 'right'
  fixed?: 'left' | 'right'
}

export const COLUMN_LAYOUT: Record<ColumnKind, ColumnLayout> = {
  code: { width: 100, fixed: 'left' },
  docNo: { width: 150, fixed: 'left' },
  name: { width: 180, fixed: 'left' },
  status: { width: 88 },
  enum: { width: 100 },
  amount: { width: 188, align: 'right' },
  count: { width: 104, align: 'right' },
  org: { width: 148 },
  date: { width: 108 },
  time: { width: 172 },
  user: { width: 108 },
}

export const CHECK_WIDTH = 45
export const SEQ_WIDTH = 60
export const ACTIONS_WIDTH = 140
/** 列设置的按钮挂在操作列表头；没有操作列时单独占一列 */
export const GEAR_WIDTH = 40

/** 表格行高：宽松 / 适中 / 默认 */
export const DENSITIES = [32, 28, 24] as const
export type Density = (typeof DENSITIES)[number]
export const DEFAULT_DENSITY: Density = 24
export const DENSITY_TEXT: Record<Density, string> = { 32: '宽松', 28: '适中', 24: '默认' }

/** 用户偏好由 src/app 提供；没提供时用默认行高 */
export const densityKey: InjectionKey<Ref<Density>> = Symbol('app-density')

/** 各表显示哪些列，由 src/app 提供；没提供时只在页面里有效 */
export interface ColumnPrefs {
  get(table: string): string[] | undefined
  /** 传 undefined 表示恢复默认 */
  set(table: string, keys: string[] | undefined): void
}
export const columnPrefsKey: InjectionKey<ColumnPrefs> = Symbol('app-column-prefs')
