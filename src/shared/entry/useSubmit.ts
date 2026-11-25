// 录入共用的提交：上锁防连点、幂等标识、按错误种类分派。整页卡片、对话框、表内编辑都用它，页面不自写。
import { ref } from 'vue'
import { ApiError, newIdempotencyKey, type FieldError } from '@/api/http'
import { alertError } from '@/shared/ui/feedback'

export interface SubmitHandlers {
  /** 先校验；返回 false 就不提交。校验是异步的，放在锁里，连点不会重入 */
  validate?: () => Promise<boolean>
  submit: (idempotencyKey: string) => Promise<void>
  /** 422：把能对上的字段错误放到字段旁，返回对不上的 */
  onInvalid?: (errors: FieldError[]) => FieldError[] | Promise<FieldError[]>
  /** 409 带最新值：返回 true 表示已接手，不再弹失败 */
  onConflict?: (message: string, latest: Record<string, unknown>) => boolean
}

export function useSubmit() {
  const saving = ref(false)
  let key = newIdempotencyKey()

  /** 开始一次新的录入时调用；失败重试沿用同一个标识 */
  function renew() {
    key = newIdempotencyKey()
  }

  /** 返回是否提交成功 */
  async function run(handlers: SubmitHandlers): Promise<boolean> {
    if (saving.value) return false
    saving.value = true
    try {
      if (handlers.validate && !(await handlers.validate())) return false
      await handlers.submit(key)
      renew()
      return true
    } catch (e) {
      if (!(e instanceof ApiError)) throw e
      await fail(e, handlers)
      return false
    } finally {
      saving.value = false
    }
  }

  async function fail(e: ApiError, handlers: SubmitHandlers) {
    if (e.kind === 'invalid') {
      // 表单上没有的字段不能悄悄丢掉
      const lost = (await handlers.onInvalid?.(e.fieldErrors)) ?? e.fieldErrors
      if (lost.length > 0 || e.fieldErrors.length === 0) {
        await alertError('没有保存成功', [e.message, ...lost.map((f) => f.message)].join('；'))
      }
      return
    }
    if (e.kind === 'conflict' && e.latest && handlers.onConflict?.(e.message, e.latest)) return
    // 需要处理的失败用对话框，不用会自动消失的提示
    await alertError('没有保存成功', [e.message, ...e.references].join('；'))
  }

  return { saving, renew, run }
}
