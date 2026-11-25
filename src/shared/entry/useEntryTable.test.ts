import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/api/http'
import type { EditColumn, EditError, EditRow } from '@/shared/ui/edit-table/types'
import { useEntryTable, type RowValues, type TableChanges } from './useEntryTable'

const feedback = vi.hoisted(() => ({ confirm: vi.fn(), alertError: vi.fn(), success: vi.fn() }))
vi.mock('@/shared/ui/feedback', () => ({
  confirm: feedback.confirm,
  alertError: feedback.alertError,
  toast: { success: feedback.success, warning: vi.fn(), error: vi.fn() },
}))

interface Row extends EditRow {
  code: string | null
  name: string | null
  on: boolean
}
const columns: EditColumn<Row>[] = [
  { key: 'code', label: '编码', kind: 'code', editable: true, required: true },
  { key: 'name', label: '名称', kind: 'text', editable: true },
  { key: 'on', label: '启用', kind: 'switch', editable: true },
]
const ROWS: Row[] = [
  { id: 'a', code: 'A', name: '甲', on: true },
  { id: 'b', code: 'B', name: '乙', on: false },
]

function setup(submit: (c: TableChanges<RowValues<Row>>, key: string) => Promise<void> = async () => {}, validate: () => Promise<EditError[]> = async () => []) {
  const focusCell = vi.fn(async () => {})
  const send = vi.fn(submit)
  const entry = useEntryTable<Row>({
    columns: () => columns,
    blank: () => ({ code: null, name: null, on: true }),
    versionOf: (id) => (id === 'a' ? 3 : 7),
    validate,
    focusCell,
    submit: send,
    readLatest: (latest) => latest as never,
  })
  entry.start(ROWS)
  return { entry, send, focusCell }
}
const fail = (kind: 'invalid' | 'conflict' | 'server', body: Record<string, unknown>) => new ApiError(kind, 400, body)

beforeEach(() => {
  feedback.confirm.mockReset().mockResolvedValue(true)
  feedback.alertError.mockReset().mockResolvedValue(undefined)
  feedback.success.mockReset()
})

describe('改动', () => {
  it('只提交改过的行：新增带临时号，修改和删除带版本号', async () => {
    const { entry, send } = setup()
    entry.draft.value[0]!.name = '甲二'
    const added = entry.addRow()
    added.code = 'C'
    entry.removeRows(['b'])
    expect(await entry.save()).toBe(true)
    expect(send.mock.calls[0]![0]).toEqual({
      created: [{ tempId: added.id, code: 'C', name: null, on: true }],
      updated: [{ id: 'a', version: 3, code: 'A', name: '甲二', on: true }],
      removed: [{ id: 'b', version: 7 }],
    })
    expect(entry.editing.value).toBe(false)
    expect(feedback.success).toHaveBeenCalledWith('已保存')
  })

  it('改了又改回来、增了又删掉，都不算改动，保存不发请求', async () => {
    const { entry, send } = setup()
    entry.draft.value[0]!.name = '甲二'
    entry.draft.value[0]!.name = '甲'
    entry.removeRows([entry.addRow().id])
    expect(entry.dirty.value).toBe(false)
    expect(await entry.save()).toBe(true)
    expect(send).not.toHaveBeenCalled()
    expect(feedback.success).not.toHaveBeenCalled()
  })

  it('草稿不影响原来的行', () => {
    const { entry } = setup()
    entry.draft.value[0]!.name = '改'
    expect(ROWS[0]!.name).toBe('甲')
  })
})

describe('取消', () => {
  it('没改动不问；有改动才问，选继续编辑就留下', async () => {
    const { entry } = setup()
    expect(await entry.cancel()).toBe(true)
    expect(feedback.confirm).not.toHaveBeenCalled()
    entry.start(ROWS)
    const row = entry.addRow()
    expect(entry.dirty.value).toBe(false)
    expect(await entry.cancel()).toBe(true)
    expect(feedback.confirm).not.toHaveBeenCalled()
    entry.start(ROWS)
    entry.addRow().code = 'C'
    expect(row.code).toBeNull()
    feedback.confirm.mockResolvedValue(false)
    expect(await entry.cancel()).toBe(false)
    expect(entry.editing.value).toBe(true)
    expect(entry.draft.value).toHaveLength(3)
  })
})

describe('错误', () => {
  it('校验没过不提交，聚焦第一处', async () => {
    const error: EditError = { rowId: 'b', rowNo: 2, key: 'code', label: '编码', message: '不能为空' }
    const { entry, send, focusCell } = setup(undefined, async () => [error])
    expect(await entry.save()).toBe(false)
    expect(send).not.toHaveBeenCalled()
    expect(focusCell).toHaveBeenCalledWith('b', 'code')
  })

  it('服务端错误按行按列排好；指不到格子的弹框，不丢', async () => {
    const { entry, focusCell } = setup(async () => {
      throw fail('invalid', {
        message: '有误',
        fieldErrors: [
          { rowId: 'b', field: 'name', message: '乙名重复' },
          { rowId: 'a', field: 'on', message: '不能停用' },
          { rowId: 'a', field: 'code', message: '编码重复' },
          { field: 'orgId', message: '组织不对' },
        ],
      })
    })
    entry.draft.value[0]!.name = '改'
    expect(await entry.save()).toBe(false)
    expect(entry.errors.value.map((e) => `${e.rowNo}${e.label}`)).toEqual(['1编码', '1启用', '2名称'])
    expect(focusCell).toHaveBeenCalledWith('a', 'code')
    expect(feedback.alertError).toHaveBeenCalledWith('没有保存成功', '有误；组织不对')
    entry.onChange('a', 'code')
    expect(entry.errors.value.map((e) => `${e.rowNo}${e.label}`)).toEqual(['1启用', '2名称'])
    // 删掉上面的行，行号跟着变
    entry.removeRows(['a'])
    expect(entry.errors.value.map((e) => `${e.rowNo}${e.label}`)).toEqual(['1名称'])
  })

  it('失败重试沿用幂等标识，成功后换新的', async () => {
    let times = 0
    const { entry, send } = setup(async () => {
      if (++times === 1) throw fail('server', { message: '出错' })
    })
    entry.draft.value[0]!.name = '改'
    expect(await entry.save()).toBe(false)
    expect(entry.editing.value).toBe(true)
    expect(await entry.save()).toBe(true)
    entry.start(ROWS)
    entry.draft.value[0]!.name = '再改'
    await entry.save()
    const keys = send.mock.calls.map((c) => c[1])
    expect(keys[0]).toBe(keys[1])
    expect(keys[2]).not.toBe(keys[0])
  })

  it('连点只提交一次', async () => {
    const { entry, send } = setup()
    entry.draft.value[0]!.name = '改'
    await Promise.all([entry.save(), entry.save(), entry.save()])
    expect(send).toHaveBeenCalledTimes(1)
  })
})

describe('版本冲突', () => {
  const latest = { rows: [{ id: 'a', version: 9, values: { code: 'A', name: '别人改', on: true } }], removed: ['b'] }
  const conflicted = () => {
    let times = 0
    const s = setup(async () => {
      if (++times === 1) throw fail('conflict', { message: '被改过', latest })
    })
    s.entry.draft.value[0]!.name = '我改'
    s.entry.draft.value[1]!.name = '乙改'
    return s
  }

  it('并列两边的值；别人删掉的写明不会再保存', async () => {
    const { entry } = conflicted()
    expect(await entry.save()).toBe(false)
    expect(entry.conflict.open.value).toBe(true)
    expect(entry.conflict.groups.value[0]!.fields.find((f) => f.label === '名称')).toEqual({ label: '名称', mine: '我改', latest: '别人改' })
    expect(entry.conflict.groups.value[1]!.note).toContain('已被别人删除')
  })

  it('保留我的：用最新版本号再存，别人删掉的行不再提交', async () => {
    const { entry, send } = conflicted()
    await entry.save()
    expect(await entry.conflict.keepMine()).toBe(true)
    expect(send.mock.calls[1]![0]).toEqual({ created: [], updated: [{ id: 'a', version: 9, code: 'A', name: '我改', on: true }], removed: [] })
  })

  it('改用最新：停在编辑里，没有剩下的改动', async () => {
    const { entry } = conflicted()
    await entry.save()
    entry.conflict.useLatest()
    expect(entry.editing.value).toBe(true)
    expect(entry.draft.value.map((r) => r.name)).toEqual(['别人改'])
    expect(entry.dirty.value).toBe(false)
  })

  it('我删的、别人改过：改用最新时恢复这一行', async () => {
    const s = setup(async () => {
      throw fail('conflict', { message: '被改过', latest: { rows: latest.rows, removed: [] } })
    })
    s.entry.removeRows(['a'])
    await s.entry.save()
    expect(s.entry.conflict.groups.value[0]!.note).toContain('你删了这一行')
    s.entry.conflict.useLatest()
    expect(s.entry.draft.value.map((r) => r.id).sort()).toEqual(['a', 'b'])
    expect(s.entry.dirty.value).toBe(false)
  })
})
