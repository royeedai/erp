<script setup lang="ts">
// 项目岗位的新增 / 编辑表单
import { computed, nextTick, reactive, ref, useTemplateRef, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ApiError, newIdempotencyKey } from '@/api/http'
import { createProjectRole, updateProjectRole } from '@/api/generated/project-role/project-role'
import type { ProjectRole } from '@/api/generated/model'
import { alertError, confirm, toast } from '@/shared/ui/feedback'
import ConflictDialog, { type ConflictField } from '@/shared/ui/ConflictDialog.vue'

const props = defineProps<{
  /** 打开时的目标：新增传 null */
  target: ProjectRole | null
  orgId: string
  orgName: string
}>()
const visible = defineModel<boolean>({ required: true })
const emit = defineEmits<{ saved: [role: ProjectRole]; 'dirty-change': [dirty: boolean] }>()

interface RoleForm {
  code: string
  name: string
  isManager: boolean
  remark: string
}

const blank = (): RoleForm => ({ code: '', name: '', isManager: false, remark: '' })
const fromRole = (r: ProjectRole): RoleForm => ({
  code: r.code,
  name: r.name,
  isManager: r.isManager,
  remark: r.remark ?? '',
})

const formRef = useTemplateRef<FormInstance>('formRef')
const form = reactive<RoleForm>(blank())
const initial = ref<RoleForm>(blank())
const version = ref(0)
const saving = ref(false)
const serverErrors = reactive<Record<string, string>>({})
let idempotencyKey = ''

const conflict = reactive<{ open: boolean; message: string; fields: ConflictField[]; latest: ProjectRole | null }>({
  open: false,
  message: '',
  fields: [],
  latest: null,
})

const isEdit = computed(() => props.target !== null)
const dirty = computed(
  () => visible.value && (Object.keys(initial.value) as (keyof RoleForm)[]).some((k) => form[k] !== initial.value[k]),
)
watch(dirty, (v) => emit('dirty-change', v))

const rules: FormRules = {
  code: [
    { required: true, whitespace: true, message: '请填写岗位编码' },
    { pattern: /^[A-Za-z0-9_-]{1,20}$/, message: '只能用字母、数字、下划线和短横线，最多 20 位' },
  ],
  name: [
    { required: true, whitespace: true, message: '请填写岗位名称' },
    { max: 30, message: '最多 30 个字' },
  ],
  remark: [{ max: 200, message: '最多 200 个字' }],
}

function load(value: RoleForm) {
  Object.assign(form, value)
  initial.value = { ...value }
  for (const k of Object.keys(serverErrors)) delete serverErrors[k]
}

watch(visible, async (open) => {
  if (!open) return
  load(props.target ? fromRole(props.target) : blank())
  version.value = props.target?.version ?? 0
  idempotencyKey = newIdempotencyKey()
  conflict.open = false
  await nextTick()
  formRef.value?.clearValidate()
})

/** 改了字段就清掉它的服务端错误 */
function clearServerError(field: string) {
  delete serverErrors[field]
}

async function save() {
  if (saving.value) return
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    const body = {
      code: form.code.trim(),
      name: form.name.trim(),
      isManager: form.isManager,
      remark: form.remark.trim() === '' ? null : form.remark.trim(),
    }
    const saved = props.target
      ? await updateProjectRole(props.target.id, { ...body, version: version.value })
      : await createProjectRole({ ...body, orgId: props.orgId }, { 'Idempotency-Key': idempotencyKey })
    toast.success(isEdit.value ? '已保存' : '已新增')
    initial.value = { ...form }
    visible.value = false
    emit('saved', saved)
  } catch (e) {
    await handleError(e)
  } finally {
    saving.value = false
  }
}

async function handleError(e: unknown) {
  if (!(e instanceof ApiError)) throw e
  if (e.kind === 'invalid') {
    for (const f of e.fieldErrors) serverErrors[f.field] = f.message
    return
  }
  if (e.kind === 'conflict' && e.latest) {
    const latest = e.latest as unknown as ProjectRole
    const theirs = fromRole(latest)
    conflict.latest = latest
    conflict.message = e.message
    conflict.fields = [
      { label: '岗位编码', mine: form.code, latest: theirs.code },
      { label: '岗位名称', mine: form.name, latest: theirs.name },
      { label: '经理岗位', mine: form.isManager ? '是' : '否', latest: theirs.isManager ? '是' : '否' },
      { label: '备注', mine: form.remark, latest: theirs.remark },
    ]
    conflict.open = true
    return
  }
  // 需要处理的失败用对话框，不用会自动消失的提示
  await alertError('保存失败', e.message)
}

function useLatest() {
  if (!conflict.latest) return
  load(fromRole(conflict.latest))
  version.value = conflict.latest.version
  conflict.open = false
}

async function keepMine() {
  if (!conflict.latest) return
  version.value = conflict.latest.version
  conflict.open = false
  await save()
}

async function requestClose() {
  if (dirty.value) {
    const ok = await confirm({
      title: '放弃修改',
      message: '有未保存的内容，关闭后会丢失。',
      confirmText: '放弃修改',
      danger: true,
    })
    if (!ok) return
  }
  visible.value = false
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="isEdit ? `编辑岗位 ${target?.code}` : '新增岗位'"
    width="560px"
    :close-on-click-modal="false"
    :before-close="requestClose"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="88px" @submit.prevent="save">
      <el-form-item label="所属组织">{{ isEdit ? target?.orgName : orgName }}</el-form-item>
      <el-form-item label="岗位编码" prop="code" :error="serverErrors.code">
        <el-input v-model="form.code" name="code" maxlength="20" @input="clearServerError('code')" />
      </el-form-item>
      <el-form-item label="岗位名称" prop="name" :error="serverErrors.name">
        <el-input v-model="form.name" name="name" maxlength="30" @input="clearServerError('name')" />
      </el-form-item>
      <el-form-item label="经理岗位" prop="isManager" :error="serverErrors.isManager">
        <el-switch v-model="form.isManager" @change="clearServerError('isManager')" />
        <span class="role-hint">每个组织只能有一个经理岗位</span>
      </el-form-item>
      <el-form-item label="备注" prop="remark" :error="serverErrors.remark">
        <el-input v-model="form.remark" name="remark" type="textarea" :rows="3" maxlength="200" show-word-limit />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="requestClose">取消</el-button>
      <el-button type="primary" :loading="saving" @click="save">保存</el-button>
    </template>
  </el-dialog>
  <ConflictDialog
    v-model="conflict.open"
    :message="conflict.message"
    :fields="conflict.fields"
    @use-latest="useLatest"
    @keep-mine="keepMine"
  />
</template>

<style>
.role-hint {
  margin-left: var(--app-space-3);
  font-size: var(--app-font-sm);
  color: var(--el-text-color-secondary);
}
</style>
