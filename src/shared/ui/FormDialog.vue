<script setup lang="ts" generic="T extends object, R">
// 录入对话框：三档宽度、单列表单。未保存、字段错误、幂等、409 都在 useEntryForm 里。
import { nextTick, ref, useTemplateRef, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { useEntryForm, type FormConflict, type SubmitContext } from '@/shared/entry/useEntryForm'
import ConflictDialog from './ConflictDialog.vue'

const props = withDefaults(
  defineProps<{
    title: string
    /** sm 520、md 640、lg 860 */
    size?: 'sm' | 'md' | 'lg'
    labelWidth?: string
    rules?: FormRules
    /** 打开和“保存新增”时取初值 */
    initial: () => T
    /** 编辑时传当前版本号 */
    version?: number
    submit: (values: T, context: SubmitContext) => Promise<R>
    savedText: string
    /** 主按钮写具体动作 */
    saveText?: string
    /** 新增时传，显示“保存新增” */
    addable?: boolean
    conflict?: FormConflict<T>
  }>(),
  { size: 'sm', labelWidth: '80px', rules: undefined, version: 0, saveText: '保存', addable: false, conflict: undefined },
)
const visible = defineModel<boolean>({ required: true })
const emit = defineEmits<{ saved: [result: R]; 'dirty-change': [dirty: boolean] }>()
defineSlots<{ default(slot: { form: T; errors: Record<string, string> }): unknown }>()

const WIDTH = { sm: 520, md: 640, lg: 860 }
const FOCUSABLE = ':is(input, textarea, button)'

const formRef = useTemplateRef<FormInstance>('formRef')
const round = ref(0)

async function focusFirst(selector: string) {
  await nextTick()
  const el = (formRef.value?.$el as HTMLElement | undefined)?.querySelector<HTMLElement>(selector)
  el?.scrollIntoView({ block: 'center' })
  el?.focus()
}
const focusError = () => focusFirst(`.el-form-item.is-error ${FOCUSABLE}`)

const entry = useEntryForm<T, R>({
  initial: () => props.initial(),
  version: () => props.version,
  submit: (values, context) => props.submit(values, context),
  savedText: () => props.savedText,
  validate: async () => {
    const ok = !!(await formRef.value?.validate().catch(() => false))
    if (!ok) await focusError()
    return ok
  },
  focusError,
  conflict: () => props.conflict,
})
// 包一层再给模板用：模板会对顶层变量解 Ref，泛型解不开
const state = { form: entry.form }
const { errors, saving } = entry
const { open: conflictOpen, message: conflictMessage, groups: conflictGroups } = entry.conflict

watch(
  () => visible.value && entry.dirty.value,
  (v) => emit('dirty-change', v),
)
async function start() {
  entry.start()
  // 换一个新的表单实例：清空字段会触发旧实例的 change 校验，它是异步的，清不干净
  round.value++
  await nextTick()
}
watch(visible, (open) => {
  if (open) void start()
})

async function save(again: boolean) {
  const done = await entry.save()
  if (!done) return
  emit('saved', done.result)
  if (again) {
    await start()
    await focusFirst(FOCUSABLE)
  } else {
    visible.value = false
  }
}
async function keepMine() {
  entry.conflict.keepMine()
  await save(false)
}
async function requestClose() {
  if (await entry.confirmLeave()) visible.value = false
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
      <el-button type="primary" :loading="saving" @click="save(false)">{{ saveText }}</el-button>
      <el-button v-if="addable" :disabled="saving" @click="save(true)">保存新增</el-button>
      <el-button :disabled="saving" @click="requestClose">取消</el-button>
    </template>
  </el-dialog>
  <ConflictDialog
    v-model="conflictOpen"
    :message="conflictMessage"
    :groups="conflictGroups"
    @use-latest="entry.conflict.useLatest"
    @keep-mine="keepMine"
  />
</template>

<style>
.app-form-dialog .el-dialog__body {
  max-height: 66vh;
  padding: 20px 12px 4px;
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
  color: var(--el-text-color-secondary);
}
</style>
