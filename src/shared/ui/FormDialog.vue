<script setup lang="ts" generic="T extends object, R">
// 录入对话框：三档宽度、未保存确认、服务端字段错误、聚焦首个错误、幂等、409 对比、继续新增，页面不再自写。
import { computed, nextTick, reactive, ref, useTemplateRef, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ApiError, newIdempotencyKey } from '@/api/http'
import ConflictDialog, { type ConflictField } from './ConflictDialog.vue'
import { alertError, confirm, toast } from './feedback'

export interface SubmitContext {
  /** 新增时为 0；409 选“保留我的值”后是最新版本 */
  version: number
  idempotencyKey: string
}

const props = withDefaults(
  defineProps<{
    title: string
    /** sm 520、md 640、lg 860 */
    size?: 'sm' | 'md' | 'lg'
    labelWidth?: string
    rules?: FormRules
    /** 打开和“继续新增”时取初值 */
    initial: () => T
    /** 编辑时传当前版本号 */
    version?: number
    submit: (values: T, context: SubmitContext) => Promise<R>
    savedText: string
    /** 新增时传，显示“保存并继续新增” */
    addable?: boolean
    /** 会遇到版本冲突的表单必传：最新数据怎么变成表单值、每个字段怎么显示 */
    conflict?: {
      toValues: (latest: Record<string, unknown>) => T
      fields: { key: Extract<keyof T, string>; label: string; text?: (value: T) => string }[]
    }
  }>(),
  { size: 'sm', labelWidth: '80px', rules: undefined, version: 0, addable: false, conflict: undefined },
)
const visible = defineModel<boolean>({ required: true })
const emit = defineEmits<{ saved: [result: R]; 'dirty-change': [dirty: boolean] }>()
defineSlots<{ default(slot: { form: T; errors: Record<string, string> }): unknown }>()

const WIDTH = { sm: 520, md: 640, lg: 860 }

const formRef = useTemplateRef<FormInstance>('formRef')
// 包一层再给模板用：模板会对顶层变量解 Ref，泛型解不开
const state = { form: reactive({ ...props.initial() }) as T }
const form = state.form
const errors = reactive<Record<string, string>>({})
const saved = ref(JSON.stringify(form))
const saving = ref(false)
const round = ref(0)
let baseVersion = 0
let idempotencyKey = ''

const dirty = computed(() => visible.value && JSON.stringify(form) !== saved.value)
watch(dirty, (v) => emit('dirty-change', v))

const conflictOpen = ref(false)
const conflictMessage = ref('')
const conflictFields = ref<ConflictField[]>([])
let latest: { values: T; version: number } | null = null

function load(values: T) {
  Object.assign(form, values)
  saved.value = JSON.stringify(form)
  for (const k of Object.keys(errors)) delete errors[k]
}

async function start() {
  load(props.initial())
  baseVersion = props.version
  idempotencyKey = newIdempotencyKey()
  conflictOpen.value = false
  // 换一个新的表单实例：清空字段会触发旧实例的 change 校验，它是异步的，清不干净
  round.value++
  await nextTick()
}
watch(visible, (open) => {
  if (open) void start()
})

// 改了哪个字段，就清掉它的服务端错误
watch(
  () => ({ ...form }),
  (now, before) => {
    for (const k of Object.keys(errors)) {
      if (now[k as keyof T] !== before[k as keyof T]) delete errors[k]
    }
  },
)

async function focusFirst(selector: string) {
  await nextTick()
  const el = (formRef.value?.$el as HTMLElement | undefined)?.querySelector<HTMLElement>(selector)
  el?.scrollIntoView({ block: 'center' })
  el?.focus()
}
const FOCUSABLE = ':is(input, textarea, button)'

async function save(again: boolean) {
  if (saving.value) return
  // 先上锁再校验：校验是异步的，连点会在校验期间重入
  saving.value = true
  try {
    if (!(await formRef.value?.validate().catch(() => false))) {
      await focusFirst(`.el-form-item.is-error ${FOCUSABLE}`)
      return
    }
    const result = await props.submit({ ...form }, { version: baseVersion, idempotencyKey })
    toast.success(props.savedText)
    saved.value = JSON.stringify(form)
    emit('saved', result)
    if (again) {
      await start()
      await focusFirst(FOCUSABLE)
    } else {
      visible.value = false
    }
  } catch (e) {
    await onError(e)
  } finally {
    saving.value = false
  }
}

async function onError(e: unknown) {
  if (!(e instanceof ApiError)) throw e
  if (e.kind === 'invalid') {
    // 表单上没有的字段不能悄悄丢掉
    const lost = e.fieldErrors.filter((f) => !(f.field in form))
    for (const f of e.fieldErrors) if (f.field in form) errors[f.field] = f.message
    if (lost.length > 0 || e.fieldErrors.length === 0) {
      await alertError('没有保存成功', [e.message, ...lost.map((f) => f.message)].join('；'))
    }
    await focusFirst(`.el-form-item.is-error ${FOCUSABLE}`)
    return
  }
  if (e.kind === 'conflict' && e.latest && props.conflict) {
    const theirs = props.conflict.toValues(e.latest)
    // 用户选定以哪份为准之前不动版本号，直接关掉对比框时下次保存还会再提示
    latest = { values: theirs, version: Number(e.latest.version) }
    conflictMessage.value = e.message
    conflictFields.value = props.conflict.fields.map((f) => {
      const text = f.text ?? ((v: T) => String(v[f.key] ?? ''))
      return { label: f.label, mine: text(form), latest: text(theirs) }
    })
    conflictOpen.value = true
    return
  }
  // 需要处理的失败用对话框，不用会自动消失的提示
  await alertError('没有保存成功', e.message)
}

function useLatest() {
  if (!latest) return
  load(latest.values)
  baseVersion = latest.version
  conflictOpen.value = false
}
async function keepMine() {
  if (!latest) return
  baseVersion = latest.version
  conflictOpen.value = false
  await save(false)
}

async function requestClose() {
  if (saving.value) return
  if (dirty.value) {
    const ok = await confirm({
      title: '放弃修改',
      message: '有未保存的内容，关闭后会丢失。',
      confirmText: '放弃修改',
      cancelText: '继续填写',
      danger: true,
    })
    if (!ok) return
  }
  visible.value = false
}
</script>

<template>
  <el-dialog
    class="app-form-dialog"
    :model-value="visible"
    :title="title"
    :width="WIDTH[size]"
    top="8vh"
    :close-on-click-modal="false"
    :before-close="requestClose"
  >
    <el-form :key="round" ref="formRef" :model="(state.form as Record<string, unknown>)" :rules="rules" :label-width="labelWidth" @submit.prevent>
      <slot :form="state.form" :errors="errors" />
    </el-form>
    <template #footer>
      <el-button :disabled="saving" @click="requestClose">取消</el-button>
      <el-button v-if="addable" :disabled="saving" @click="save(true)">保存并继续新增</el-button>
      <el-button type="primary" :loading="saving" @click="save(false)">保存</el-button>
    </template>
  </el-dialog>
  <ConflictDialog
    v-model="conflictOpen"
    :message="conflictMessage"
    :fields="conflictFields"
    @use-latest="useLatest"
    @keep-mine="keepMine"
  />
</template>

<style>
.app-form-dialog .el-dialog__body {
  max-height: 66vh;
  overflow-y: auto;
}
/* 控件四档定宽，不拉满整行 */
.app-w-xs {
  width: 110px;
}
.app-w-sm {
  width: 200px;
}
.app-w-md {
  width: 280px;
}
.app-w-lg {
  width: 400px;
}
.app-form-hint {
  margin-left: var(--app-space-3);
  font-size: var(--app-font-sm);
  color: var(--el-text-color-secondary);
}
</style>
