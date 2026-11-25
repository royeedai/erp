<script setup lang="ts">
// 项目岗位的新增 / 编辑表单
import type { FormRules } from 'element-plus'
import { createProjectRole, updateProjectRole } from '@/api/generated/project-role/project-role'
import type { ProjectRole } from '@/api/generated/model'
import FormDialog, { type SubmitContext } from '@/shared/ui/FormDialog.vue'

const props = defineProps<{
  /** 新增传 null */
  target: ProjectRole | null
  orgId: string
  orgName: string
}>()
const visible = defineModel<boolean>({ required: true })
const emit = defineEmits<{ saved: []; 'dirty-change': [dirty: boolean] }>()

interface RoleForm {
  code: string
  name: string
  isManager: boolean
  remark: string
}

const fromRole = (r: ProjectRole): RoleForm => ({ code: r.code, name: r.name, isManager: r.isManager, remark: r.remark ?? '' })
const initial = (): RoleForm => (props.target ? fromRole(props.target) : { code: '', name: '', isManager: false, remark: '' })

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

function submit(form: RoleForm, { version, idempotencyKey }: SubmitContext) {
  const remark = form.remark.trim()
  const body = { code: form.code.trim(), name: form.name.trim(), isManager: form.isManager, remark: remark === '' ? null : remark }
  return props.target
    ? updateProjectRole(props.target.id, { ...body, version })
    : createProjectRole({ ...body, orgId: props.orgId }, { 'Idempotency-Key': idempotencyKey })
}

const conflict = {
  toValues: (latest: Record<string, unknown>) => fromRole(latest as unknown as ProjectRole),
  fields: [
    { key: 'code' as const, label: '岗位编码' },
    { key: 'name' as const, label: '岗位名称' },
    { key: 'isManager' as const, label: '经理岗位', text: (f: RoleForm) => (f.isManager ? '是' : '否') },
    { key: 'remark' as const, label: '备注' },
  ],
}
</script>

<template>
  <FormDialog
    v-model="visible"
    :title="target ? `编辑岗位 ${target.code}` : '新增岗位'"
    :rules="rules"
    :initial="initial"
    :version="target?.version"
    :submit="submit"
    :saved-text="target ? '已保存' : '已新增'"
    :addable="!target"
    :conflict="conflict"
    @saved="emit('saved')"
    @dirty-change="(v) => emit('dirty-change', v)"
  >
    <template #default="{ form, errors }">
      <el-form-item label="所属组织">{{ target?.orgName ?? orgName }}</el-form-item>
      <el-form-item label="岗位编码" prop="code" :error="errors.code">
        <el-input v-model="form.code" class="app-w-sm" name="code" maxlength="20" />
      </el-form-item>
      <el-form-item label="岗位名称" prop="name" :error="errors.name">
        <el-input v-model="form.name" class="app-w-md" name="name" maxlength="30" />
      </el-form-item>
      <el-form-item label="经理岗位" prop="isManager" :error="errors.isManager">
        <el-switch v-model="form.isManager" aria-label="经理岗位" />
        <span class="app-form-hint">每个组织只能有一个经理岗位</span>
      </el-form-item>
      <el-form-item label="备注" prop="remark" :error="errors.remark">
        <el-input v-model="form.remark" class="app-w-lg" name="remark" type="textarea" :rows="3" maxlength="200" show-word-limit />
      </el-form-item>
    </template>
  </FormDialog>
</template>
