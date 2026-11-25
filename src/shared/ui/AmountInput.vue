<script setup lang="ts">
// 金额输入：el-input + 字符串。聚焦时显示纯数字，失焦后显示千分位，编辑中不重排文本，所以光标不跳。
import { computed, nextTick, onBeforeUnmount, ref, useTemplateRef } from 'vue'
import type { InputInstance } from 'element-plus'
import {
  draftToAmount,
  formatAmount,
  isTypingAllowed,
  parseAmount,
  toHalfWidth,
  toScale,
  type Amount,
  type AmountRule,
} from '@/shared/money/amount'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue: Amount
    scale?: number
    maxInteger?: number
    allowNegative?: boolean
    disabled?: boolean
    placeholder?: string
    /** 聚焦时全选，便于直接覆盖录入 */
    selectOnFocus?: boolean
  }>(),
  { scale: 2, maxInteger: 20, allowNegative: true, disabled: false, placeholder: '', selectOnFocus: true },
)

const emit = defineEmits<{
  'update:modelValue': [value: Amount]
  change: [value: Amount]
  invalid: [reason: string]
}>()

const inputRef = useTemplateRef<InputInstance>('inputRef')
const draft = ref<string | null>(null)
const hint = ref('')
let valueOnFocus: Amount = null
let hintTimer: ReturnType<typeof setTimeout> | undefined

const rule = computed<AmountRule>(() => ({
  scale: props.scale,
  maxInteger: props.maxInteger,
  allowNegative: props.allowNegative,
}))

const text = computed(() => {
  if (draft.value !== null) return draft.value
  return props.modelValue ? formatAmount(props.modelValue, props.scale) : ''
})

const nativeInput = computed(() => inputRef.value?.input ?? undefined)

function showHint(reason: string) {
  hint.value = reason
  emit('invalid', reason)
  clearTimeout(hintTimer)
  hintTimer = setTimeout(() => (hint.value = ''), 3000)
}

function onFocus() {
  valueOnFocus = props.modelValue
  draft.value = props.modelValue ?? ''
  if (props.selectOnFocus) void nextTick(() => nativeInput.value?.select())
}

// 首次点击聚焦时，浏览器会在 mouseup 里取消全选，拦一次
let justFocusedByMouse = false
function onMousedown() {
  justFocusedByMouse = document.activeElement !== nativeInput.value
}
function onMouseup(e: MouseEvent) {
  if (justFocusedByMouse && props.selectOnFocus) e.preventDefault()
  justFocusedByMouse = false
}

function onInput(raw: string) {
  const next = toHalfWidth(raw).replace(/[,\s]/g, '')
  if (!isTypingAllowed(next, rule.value)) return
  hint.value = ''
  draft.value = next
  emit('update:modelValue', draftToAmount(next))
}

function onPaste(e: ClipboardEvent) {
  const el = nativeInput.value
  if (!el) return
  const pasted = e.clipboardData?.getData('text/plain') ?? ''
  e.preventDefault()
  const start = el.selectionStart ?? 0
  const end = el.selectionEnd ?? 0
  const current = draft.value ?? ''

  if (start === 0 && end === current.length) {
    const result = parseAmount(pasted, rule.value)
    if (!result.ok) return showHint(result.reason)
    hint.value = ''
    draft.value = result.value ?? ''
    emit('update:modelValue', result.value)
    return
  }
  // 插入到已有数字中间：只接受合并后仍合法的纯数字片段
  const piece = toHalfWidth(pasted).replace(/[,\s]/g, '')
  const merged = current.slice(0, start) + piece + current.slice(end)
  if (!/^[\d.-]*$/.test(piece) || !isTypingAllowed(merged, rule.value)) return showHint('粘贴后不是有效的金额')
  hint.value = ''
  draft.value = merged
  emit('update:modelValue', draftToAmount(merged))
  const caret = start + piece.length
  void nextTick(() => el.setSelectionRange(caret, caret))
}

function commit() {
  if (draft.value === null) return
  const value = toScale(draftToAmount(draft.value), props.scale)
  draft.value = null
  if (value !== props.modelValue) emit('update:modelValue', value)
  if (value !== valueOnFocus) emit('change', value)
}

onBeforeUnmount(() => {
  clearTimeout(hintTimer)
  commit()
})

defineExpose({ commit, focus: () => inputRef.value?.focus() })
</script>

<template>
  <el-input
    v-bind="$attrs"
    ref="inputRef"
    class="app-amount-input"
    inputmode="decimal"
    autocomplete="off"
    :model-value="text"
    :disabled="disabled"
    :placeholder="placeholder"
    :validate-event="false"
    @update:model-value="onInput"
    @focus="onFocus"
    @blur="commit"
    @paste="onPaste"
    @mousedown="onMousedown"
    @mouseup="onMouseup"
  />
  <el-tooltip
    v-if="hint"
    :visible="true"
    :virtual-ref="nativeInput"
    virtual-triggering
    placement="bottom-start"
    :content="hint"
  />
</template>

<style>
.app-amount-input .el-input__inner {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
</style>
