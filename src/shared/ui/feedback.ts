// 全工程唯一允许 import ElMessage / ElMessageBox 的位置。业务代码只用 toast / confirm。
import { h } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { markMessageBoxOrigin } from '@/theme/motion'

export const toast = {
  success: (message: string) => ElMessage({ type: 'success', message }),
  warning: (message: string) => ElMessage({ type: 'warning', message }),
  /** 只用于短暂提示；需要处理的失败用对话框列明细 */
  error: (message: string) => ElMessage({ type: 'error', message }),
}

export interface ConfirmOptions {
  title: string
  message: string
  /** 按钮文案写动作本身，如“作废”“删除” */
  confirmText?: string
  cancelText?: string
  /** 不可逆或破坏性动作：红色按钮，焦点默认在取消 */
  danger?: boolean
}

const body = (title: string, message: string) => h('div', [h('h3', title), h('p', message)])

/** 返回 true 表示确认；取消和关闭都是 false，不抛异常 */
export async function confirm(options: ConfirmOptions): Promise<boolean> {
  markMessageBoxOrigin()
  try {
    await ElMessageBox.confirm(body(options.title, options.message), '提示信息', {
      type: 'warning',
      confirmButtonText: options.confirmText ?? '确定',
      cancelButtonText: options.cancelText ?? '取消',
      confirmButtonType: options.danger ? 'danger' : 'primary',
      autofocus: !options.danger,
      closeOnClickModal: false,
      distinguishCancelAndClose: true,
    })
    return true
  } catch {
    return false
  }
}

/** 填一个短文本，例如查询方案的名称。取消返回 null */
export async function promptText(options: ConfirmOptions & { label: string; max?: number }): Promise<string | null> {
  const max = options.max ?? 20
  markMessageBoxOrigin()
  try {
    const result: unknown = await ElMessageBox.prompt(body(options.title, options.message), '提示信息', {
      confirmButtonText: options.confirmText ?? '确定',
      cancelButtonText: options.cancelText ?? '取消',
      inputPlaceholder: options.label,
      inputValidator: (v) => {
        const text = (v ?? '').trim()
        if (text === '') return `请填写${options.label}`
        return text.length <= max || `最多 ${max} 个字`
      },
      closeOnClickModal: false,
    })
    return result !== null && typeof result === 'object' && 'value' in result ? String(result.value).trim() : null
  } catch {
    return null
  }
}

/** 不可逆动作：必须填原因。返回原因文本，取消返回 null */
export async function confirmWithReason(options: ConfirmOptions & { reasonLabel?: string }): Promise<string | null> {
  markMessageBoxOrigin()
  try {
    const result: unknown = await ElMessageBox.prompt(body(options.title, options.message), '提示信息', {
      confirmButtonText: options.confirmText ?? '确定',
      cancelButtonText: options.cancelText ?? '取消',
      confirmButtonType: options.danger ? 'danger' : 'primary',
      inputPlaceholder: options.reasonLabel ?? '请填写原因',
      inputType: 'textarea',
      inputValidator: (v) => (v ?? '').trim().length > 0 || '必须填写原因',
      closeOnClickModal: false,
    })
    return result !== null && typeof result === 'object' && 'value' in result ? String(result.value).trim() : null
  } catch {
    return null
  }
}

/** 必须处理的失败：不会自动消失 */
export async function alertError(title: string, message: string): Promise<void> {
  markMessageBoxOrigin()
  try {
    await ElMessageBox.alert(body(title, message), '提示信息', { type: 'error', confirmButtonText: '知道了', closeOnClickModal: false })
  } catch {
    /* 关闭即可 */
  }
}
