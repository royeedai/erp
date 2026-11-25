// 一张表单的录入：未保存、字段错误、幂等、版本冲突。对话框和整页卡片共用。
import { computed, reactive, ref, watch } from 'vue'
import { confirm, toast } from '@/shared/ui/feedback'
import type { ConflictGroup } from '@/shared/ui/ConflictDialog.vue'
import { useSubmit } from './useSubmit'

export interface SubmitContext {
  /** 新增时为 0；409 选“保留我的值”后是最新版本 */
  version: number
  idempotencyKey: string
}

/** 会遇到版本冲突的表单必传：最新数据怎么变成表单值、每个字段怎么显示 */
export interface FormConflict<T> {
  toValues: (latest: Record<string, unknown>) => T
  fields: { key: Extract<keyof T, string>; label: string; text?: (values: T) => string }[]
}

export interface EntryFormOptions<T extends object, R> {
  /** 开始录入时取初值 */
  initial: () => T
  /** 编辑时的当前版本号，新增为 0 */
  version: () => number
  submit: (values: T, context: SubmitContext) => Promise<R>
  savedText: () => string
  validate: () => Promise<boolean>
  /** 服务端字段错误落到字段旁之后，聚焦第一个 */
  focusError: () => Promise<void>
  conflict?: () => FormConflict<T> | undefined
}

export function useEntryForm<T extends object, R>(options: EntryFormOptions<T, R>) {
  const { saving, renew, run } = useSubmit()
  const form = reactive({ ...options.initial() }) as T
  const errors = reactive<Record<string, string>>({})
  const saved = ref(JSON.stringify(form))
  const dirty = computed(() => JSON.stringify(form) !== saved.value)
  let baseVersion = options.version()

  const conflictOpen = ref(false)
  const conflictMessage = ref('')
  const conflictGroups = ref<ConflictGroup[]>([])
  let latest: { values: T; version: number } | null = null

  function load(values: T) {
    Object.assign(form, values)
    saved.value = JSON.stringify(form)
    for (const k of Object.keys(errors)) delete errors[k]
  }
  /** 开始一次新的录入：取初值、换幂等标识 */
  function start() {
    load(options.initial())
    baseVersion = options.version()
    conflictOpen.value = false
    renew()
  }

  // 改了哪个字段，就清掉它的服务端错误
  watch(
    () => ({ ...form }),
    (now, before) => {
      for (const k of Object.keys(errors)) if (now[k as keyof T] !== before[k as keyof T]) delete errors[k]
    },
  )

  /** 返回保存结果；没成功返回 null */
  async function save(): Promise<{ result: R } | null> {
    let result: R | undefined
    const ok = await run({
      validate: options.validate,
      submit: async (idempotencyKey) => {
        result = await options.submit({ ...form }, { version: baseVersion, idempotencyKey })
        saved.value = JSON.stringify(form)
      },
      onInvalid: async (list) => {
        for (const f of list) if (f.field in form) errors[f.field] = f.message
        await options.focusError()
        return list.filter((f) => !(f.field in form))
      },
      onConflict: (message, data) => {
        const how = options.conflict?.()
        if (!how) return false
        const theirs = how.toValues(data)
        // 用户选定以哪份为准之前不动版本号，直接关掉对比框时下次保存还会再提示
        latest = { values: theirs, version: Number(data.version) }
        conflictMessage.value = message
        conflictGroups.value = [
          {
            fields: how.fields.map((f) => {
              const text = f.text ?? ((v: T) => String(v[f.key] ?? ''))
              return { label: f.label, mine: text(form), latest: text(theirs) }
            }),
          },
        ]
        conflictOpen.value = true
        return true
      },
    })
    if (!ok) return null
    toast.success(options.savedText())
    return { result: result as R }
  }

  function useLatest() {
    if (!latest) return
    load(latest.values)
    baseVersion = latest.version
    conflictOpen.value = false
  }
  /** 以我的值为准：版本号换成最新的，由调用方再存一次 */
  function keepMine() {
    if (!latest) return
    baseVersion = latest.version
    conflictOpen.value = false
  }

  /** 有改动才问；返回能不能离开 */
  async function confirmLeave(): Promise<boolean> {
    if (saving.value) return false
    if (!dirty.value) return true
    return confirm({
      title: '放弃修改',
      message: '有未保存的内容，离开后会丢失。',
      confirmText: '放弃修改',
      cancelText: '继续填写',
      danger: true,
    })
  }

  return {
    form,
    errors,
    saving,
    dirty,
    start,
    save,
    confirmLeave,
    conflict: { open: conflictOpen, message: conflictMessage, groups: conflictGroups, useLatest, keepMine },
  }
}
