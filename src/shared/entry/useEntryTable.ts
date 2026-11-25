// 表内编辑：整张表进入编辑，一次保存全部改动的行。未保存、行级错误、幂等、版本冲突都在这里。
import { computed, reactive, ref, type Ref } from 'vue'
import type { FieldError } from '@/api/http'
import type { ConflictGroup } from '@/shared/ui/ConflictDialog.vue'
import { confirm, toast } from '@/shared/ui/feedback'
import type { EditColumn, EditError, EditRow } from '@/shared/ui/edit-table/types'
import { useSubmit } from './useSubmit'

export interface TableChanges<V> {
  /** tempId 只在这次保存里有效，服务端报错用它指到行 */
  created: (V & { tempId: string })[]
  updated: (V & { id: string; version: number })[]
  removed: { id: string; version: number }[]
}

/** 服务端返回的最新行：rows 是被别人改过的，removed 是被别人删掉的 */
export interface TableLatest<V> {
  rows: { id: string; version: number; values: V }[]
  removed: string[]
}

/** 一行去掉 id。EditRow 带索引签名，用 Omit 会把具名字段一起丢掉 */
export type RowValues<Row extends EditRow> = { [K in keyof Row as K extends 'id' ? never : K]: Row[K] }

export interface EntryTableOptions<Row extends EditRow> {
  columns: () => EditColumn<Row>[]
  /** 增行时的默认值 */
  blank: () => RowValues<Row>
  /** 现有行的版本号 */
  versionOf: (id: string) => number
  /** 表格自己的校验：提交正在编辑的格子并返回错误 */
  validate: () => Promise<EditError[]>
  focusCell: (rowId: string, key: string) => Promise<void>
  submit: (changes: TableChanges<RowValues<Row>>, idempotencyKey: string) => Promise<void>
  savedText?: string
  /** 409 的最新值怎么读；会遇到冲突的表必传 */
  readLatest?: (latest: Record<string, unknown>) => TableLatest<RowValues<Row>>
  /** 冲突对比时怎么称呼一行 */
  rowTitle?: (row: Row) => string
}

export function useEntryTable<Row extends EditRow>(options: EntryTableOptions<Row>) {
  const { saving, renew, run } = useSubmit()
  const editing = ref(false)
  const draft = ref([]) as Ref<Row[]>
  const errors = ref<EditError[]>([])
  const before = ref(new Map<string, string>())
  const versions = new Map<string, number>()
  const removed = ref<string[]>([])
  let seq = 0

  const isNew = (id: string) => !before.value.has(id)
  const valuesOf = (row: Row): RowValues<Row> => {
    const { id: _id, ...values } = row
    return values as unknown as RowValues<Row>
  }
  const snapshot = (row: Row) => JSON.stringify(valuesOf(row))

  const changedRows = computed(() => draft.value.filter((r) => before.value.get(r.id) !== snapshot(r)))
  /** 增了行但一个字没填，不算改动：取消、切走都不问 */
  const untouched = (row: Row) => isNew(row.id) && snapshot(row) === JSON.stringify(options.blank())
  const dirty = computed(() => editing.value && (removed.value.length > 0 || changedRows.value.some((r) => !untouched(r))))

  /* ---------- 进入和退出 ---------- */

  function start(rows: Row[]) {
    if (editing.value) return
    draft.value = rows.map((r) => reactive({ ...r }) as Row)
    before.value = new Map(rows.map((r) => [r.id, snapshot(r)]))
    versions.clear()
    for (const r of rows) versions.set(r.id, options.versionOf(r.id))
    removed.value = []
    errors.value = []
    renew()
    editing.value = true
  }
  function stop() {
    editing.value = false
    draft.value = []
    errors.value = []
    removed.value = []
    conflictOpen.value = false
  }
  /** 有改动才问；没改过直接退出。返回是否退出了 */
  async function cancel(): Promise<boolean> {
    if (saving.value) return false
    if (dirty.value) {
      const ok = await confirm({
        title: '取消',
        message: '有未保存的改动，取消后会丢失。',
        confirmText: '放弃改动',
        cancelText: '继续编辑',
        danger: true,
      })
      if (!ok) return false
    }
    stop()
    return true
  }

  /* ---------- 行 ---------- */

  function addRow(): Row {
    const row = reactive({ id: `new-${++seq}`, ...options.blank() } as Row) as Row
    draft.value.push(row)
    return row
  }
  function removeRows(ids: string[]) {
    removed.value.push(...ids.filter((id) => !isNew(id)))
    draft.value = draft.value.filter((r) => !ids.includes(r.id))
    errors.value = renumber(errors.value.filter((e) => !ids.includes(e.rowId)))
  }
  /** 改了哪格，就清掉它的错误 */
  function onChange(rowId: string, key: string) {
    errors.value = errors.value.filter((e) => e.rowId !== rowId || e.key !== key)
  }
  function renumber(list: EditError[]): EditError[] {
    const no = new Map(draft.value.map((r, i) => [r.id, i + 1]))
    return list.map((e) => ({ ...e, rowNo: no.get(e.rowId) ?? 0 }))
  }

  /* ---------- 保存 ---------- */

  function changes(): TableChanges<RowValues<Row>> {
    const list = changedRows.value
    return {
      created: list.filter((r) => isNew(r.id)).map((r) => ({ ...valuesOf(r), tempId: r.id })),
      updated: list.filter((r) => !isNew(r.id)).map((r) => ({ ...valuesOf(r), id: r.id, version: versions.get(r.id) ?? 0 })),
      removed: removed.value.map((id) => ({ id, version: versions.get(id) ?? 0 })),
    }
  }

  async function focusFirst() {
    const first = errors.value[0]
    if (first) await options.focusCell(first.rowId, first.key)
  }

  /** 服务端的行级错误：能指到格子的落到格子上，指不到的返回去弹框 */
  function place(list: FieldError[]): FieldError[] {
    const columns = new Map(options.columns().map((c) => [c.key as string, c]))
    const lost: FieldError[] = []
    const found: EditError[] = []
    for (const f of list) {
      const rowNo = draft.value.findIndex((r) => r.id === f.rowId) + 1
      const column = columns.get(f.field)
      if (f.rowId && rowNo > 0 && column) found.push({ rowId: f.rowId, rowNo, key: f.field, label: column.label, message: f.message })
      else lost.push(f)
    }
    const order = [...columns.keys()]
    errors.value = found.sort((a, b) => a.rowNo - b.rowNo || order.indexOf(a.key) - order.indexOf(b.key))
    return lost
  }

  /** 没有改动时直接退出编辑。返回是否退出了编辑 */
  async function save(): Promise<boolean> {
    const ok = await run({
      validate: async () => {
        errors.value = await options.validate()
        await focusFirst()
        return errors.value.length === 0
      },
      submit: async (idempotencyKey) => {
        if (dirty.value) await options.submit(changes(), idempotencyKey)
      },
      onInvalid: async (list) => {
        const lost = place(list)
        await focusFirst()
        return lost
      },
      onConflict,
    })
    if (!ok) return false
    if (dirty.value) toast.success(options.savedText ?? '已保存')
    stop()
    return true
  }

  /* ---------- 版本冲突 ---------- */

  const conflictOpen = ref(false)
  const conflictMessage = ref('')
  const conflictGroups = ref<ConflictGroup[]>([])
  let latest: TableLatest<RowValues<Row>> | null = null

  function textOf(column: EditColumn<Row>, values: RowValues<Row>): string {
    const value = (values as Record<string, string | boolean | null>)[column.key]
    if (typeof value === 'boolean') return value ? '是' : '否'
    return column.options?.find((o) => o.value === value)?.label ?? value ?? ''
  }
  function onConflict(message: string, data: Record<string, unknown>): boolean {
    if (!options.readLatest) return false
    latest = options.readLatest(data)
    const title = (id: string) => {
      const row = draft.value.find((r) => r.id === id)
      return row ? (options.rowTitle?.(row) ?? `第 ${draft.value.indexOf(row) + 1} 行`) : '已删的行'
    }
    conflictMessage.value = message
    conflictGroups.value = [
      ...latest.rows.map((r) => {
        const mine = draft.value.find((d) => d.id === r.id)
        return {
          title: title(r.id),
          fields: mine ? options.columns().filter((c) => c.editable).map((c) => ({ label: c.label, mine: textOf(c, valuesOf(mine)), latest: textOf(c, r.values) })) : [],
          note: mine ? undefined : '你删了这一行，别人刚改过它',
        }
      }),
      ...latest.removed.map((id) => ({ title: title(id), fields: [], note: '这一行已被别人删除，不会再保存' })),
    ]
    conflictOpen.value = true
    return true
  }
  function dropGone(ids: string[]) {
    draft.value = draft.value.filter((r) => !ids.includes(r.id))
    removed.value = removed.value.filter((id) => !ids.includes(id))
  }
  /** 用最新值盖掉我的，停在编辑里 */
  function useLatest() {
    if (!latest) return
    for (const r of latest.rows) {
      versions.set(r.id, r.version)
      const mine = draft.value.find((d) => d.id === r.id)
      const fresh = { id: r.id, ...r.values } as Row
      before.value.set(r.id, snapshot(fresh))
      if (mine) Object.assign(mine, r.values)
      else {
        // 我删的、别人改过：恢复这一行
        removed.value = removed.value.filter((id) => id !== r.id)
        draft.value.push(reactive(fresh) as Row)
      }
    }
    dropGone(latest.removed)
    conflictOpen.value = false
  }
  /** 以我的值为准，用最新版本号再存一次 */
  async function keepMine(): Promise<boolean> {
    if (!latest) return false
    for (const r of latest.rows) versions.set(r.id, r.version)
    dropGone(latest.removed)
    conflictOpen.value = false
    return save()
  }

  return {
    editing,
    draft,
    errors,
    saving,
    dirty,
    isNew,
    start,
    cancel,
    stop,
    addRow,
    removeRows,
    onChange,
    save,
    focusCell: options.focusCell,
    conflict: { open: conflictOpen, message: conflictMessage, groups: conflictGroups, useLatest, keepMine },
  }
}
