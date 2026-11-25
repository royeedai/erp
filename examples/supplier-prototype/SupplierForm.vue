<script setup lang="ts">
// 新增 / 编辑对话框。单列、控件定宽、决定项在前、从属字段放灰底块。
import { computed, nextTick, reactive, ref, useTemplateRef, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { Lock } from '@element-plus/icons-vue'
import AmountInput from '@/shared/ui/AmountInput.vue'
import { alertError, confirm, toast } from '@/shared/ui/feedback'
import {
  countries,
  FieldFail,
  kindText,
  nextCode,
  orgName,
  saveSupplier,
  type Supplier,
  type SupplierInput,
} from './data'
import OrgPicker from './OrgPicker.vue'
import RuleMark from './RuleMark.vue'

const props = defineProps<{ target: Supplier | null }>()
const visible = defineModel<boolean>({ required: true })
const emit = defineEmits<{ saved: [supplier: Supplier] }>()

const blank = (): SupplierInput => ({
  code: nextCode(),
  name: '',
  kind: 'domestic',
  creditCode: '',
  country: '',
  regNo: '',
  settle: 'monthly',
  termDays: '30',
  billDay: '25',
  creditLimit: null,
  scope: 'group',
  orgIds: [],
  remark: '',
})

const formRef = useTemplateRef<FormInstance>('formRef')
const form = reactive<SupplierInput>(blank())
const initial = ref('')
const saving = ref(false)
const pickerOpen = ref(false)
const serverErrors = reactive<Partial<Record<keyof SupplierInput, string>>>({})

const isEdit = computed(() => props.target !== null)
const dirty = computed(() => visible.value && JSON.stringify(form) !== initial.value)

function load(value: SupplierInput) {
  Object.assign(form, value)
  initial.value = JSON.stringify(form)
  for (const k of Object.keys(serverErrors) as (keyof SupplierInput)[]) delete serverErrors[k]
}
function pick(s: Supplier): SupplierInput {
  const { code, name, kind, creditCode, country, regNo, settle, termDays, billDay, creditLimit, scope, orgIds, remark } = s
  return { code, name, kind, creditCode, country, regNo, settle, termDays, billDay, creditLimit, scope, orgIds: [...orgIds], remark }
}

watch(visible, async (open) => {
  if (!open) return
  load(props.target ? pick(props.target) : blank())
  await nextTick()
  formRef.value?.clearValidate()
})

const rules: FormRules = {
  code: [
    { required: true, whitespace: true, message: '请填写供应商编码', trigger: 'blur' },
    { pattern: /^[A-Z0-9-]{4,20}$/, message: '4–20 位大写字母、数字或短横线', trigger: 'blur' },
  ],
  name: [{ required: true, whitespace: true, message: '请填写供应商名称', trigger: 'blur' }],
  creditCode: [
    { required: true, message: '请填写统一社会信用代码', trigger: 'blur' },
    { pattern: /^[0-9A-Z]{18}$/, message: '应为 18 位数字或大写字母', trigger: 'blur' },
  ],
  country: [{ required: true, message: '请选择国家或地区', trigger: 'change' }],
  regNo: [{ required: true, whitespace: true, message: '请填写当地注册号', trigger: 'blur' }],
  termDays: [{ required: true, pattern: /^[1-9]\d{0,2}$/, message: '填 1–999 的整数', trigger: 'blur' }],
  billDay: [{ required: true, pattern: /^([1-9]|1\d|2[0-8])$/, message: '填 1–28', trigger: 'blur' }],
  orgIds: [
    {
      required: true,
      trigger: 'change',
      validator: (_r, value: string[], done) => done(value.length === 0 ? new Error('请选择至少一个组织') : undefined),
    },
  ],
}

/** 改了字段就清掉它的服务端错误 */
function clearServer(field: keyof SupplierInput) {
  delete serverErrors[field]
}

/** 只提交当前看得见的字段；隐藏字段留在草稿里，切回来还在 */
function payload(): SupplierInput {
  const domestic = form.kind === 'domestic'
  const monthly = form.settle === 'monthly'
  return {
    ...form,
    name: form.name.trim(),
    creditCode: domestic ? form.creditCode : '',
    country: domestic ? '' : form.country,
    regNo: domestic ? '' : form.regNo,
    termDays: monthly ? form.termDays : '',
    billDay: monthly ? form.billDay : '',
    orgIds: form.scope === 'org' ? [...form.orgIds] : [],
  }
}

async function focusFirstError() {
  await nextTick()
  const el = document.querySelector<HTMLElement>('.supplier-form .is-error input, .supplier-form .is-error textarea, .supplier-form .is-error button')
  el?.scrollIntoView({ block: 'center' })
  el?.focus()
}

async function save(again: boolean) {
  if (saving.value) return
  if (!(await formRef.value?.validate().catch(() => false))) return focusFirstError()
  saving.value = true
  try {
    const saved = await saveSupplier(props.target?.id ?? null, payload())
    toast.success(isEdit.value ? `已保存 ${saved.code}` : `已新增 ${saved.code}`)
    emit('saved', saved)
    initial.value = JSON.stringify(form)
    if (again) {
      load(blank())
      await nextTick()
      formRef.value?.clearValidate()
      document.querySelector<HTMLElement>('.supplier-form [data-first] input')?.focus()
    } else {
      visible.value = false
    }
  } catch (e) {
    if (!(e instanceof FieldFail)) {
      await alertError('没有保存成功', e instanceof Error ? e.message : '未知错误')
      return
    }
    Object.assign(serverErrors, e.fields)
    await focusFirstError()
  } finally {
    saving.value = false
  }
}

async function beforeClose(done: () => void) {
  if (saving.value) return
  if (dirty.value) {
    const ok = await confirm({
      title: '放弃未保存的修改？',
      message: '关闭后，这次填写的内容会丢失。',
      confirmText: '放弃修改',
      cancelText: '继续填写',
      danger: true,
    })
    if (!ok) return
  }
  done()
}
const requestClose = () => beforeClose(() => (visible.value = false))

function onPicked(ids: string[]) {
  form.orgIds = ids
  void nextTick(() => formRef.value?.validateField('orgIds').catch(() => {}))
}
</script>

<template>
  <el-dialog
    v-model="visible"
    class="supplier-form"
    width="640"
    top="6vh"
    :close-on-click-modal="false"
    :before-close="beforeClose"
  >
    <template #header>
      <span class="el-dialog__title">{{ isEdit ? '编辑供应商' : '新增供应商' }}</span>
      <RuleMark rule="dialog" />
    </template>

    <div v-if="target && target.references.length > 0" class="form-note">
      已被 {{ target.references.length }} 张单据引用。改名称不影响这些单据，它们仍显示制单时的名称。
    </div>

    <el-form ref="formRef" :model="form" :rules="rules" label-width="116px" @submit.prevent>
      <el-form-item label="供应商类型">
        <template v-if="isEdit">
          <span class="locked">{{ kindText[form.kind] }}<el-icon><Lock /></el-icon></span>
        </template>
        <template v-else>
          <el-radio-group v-model="form.kind">
            <el-radio value="domestic">境内企业</el-radio>
            <el-radio value="overseas">境外企业</el-radio>
          </el-radio-group>
          <span class="lock-hint">保存后不能修改 <RuleMark rule="locked" /></span>
        </template>
        <div class="branch">
          <template v-if="form.kind === 'domestic'">
            <el-form-item label="统一社会信用代码" label-width="156px" prop="creditCode" :error="serverErrors.creditCode">
              <el-input v-model="form.creditCode" class="w-280" maxlength="18" @input="clearServer('creditCode')" />
            </el-form-item>
          </template>
          <template v-else>
            <el-form-item label="国家或地区" label-width="156px" prop="country">
              <el-select v-model="form.country" class="w-200" placeholder="请选择">
                <el-option v-for="c in countries" :key="c" :label="c" :value="c" />
              </el-select>
            </el-form-item>
            <el-form-item label="当地注册号" label-width="156px" prop="regNo">
              <el-input v-model="form.regNo" class="w-280" maxlength="40" />
            </el-form-item>
          </template>
          <RuleMark rule="branch" />
        </div>
      </el-form-item>

      <el-form-item label="供应商编码" prop="code" :error="serverErrors.code" :required="!isEdit">
        <span v-if="isEdit" class="locked">{{ form.code }}<el-icon><Lock /></el-icon></span>
        <template v-else>
          <el-input v-model="form.code" class="w-200" maxlength="20" @input="clearServer('code')" />
          <span class="lock-hint">保存后不能修改</span>
        </template>
      </el-form-item>

      <el-form-item label="供应商名称" prop="name" :error="serverErrors.name" data-first>
        <el-input v-model="form.name" class="w-400" maxlength="60" show-word-limit @input="clearServer('name')" />
      </el-form-item>

      <el-form-item label="结算方式">
        <el-radio-group v-model="form.settle">
          <el-radio value="monthly">月结</el-radio>
          <el-radio value="prepay">预付</el-radio>
          <el-radio value="delivery">货到付款</el-radio>
        </el-radio-group>
        <div v-if="form.settle === 'monthly'" class="branch is-inline">
          <el-form-item label="账期" label-width="64px" prop="termDays">
            <el-input v-model="form.termDays" class="w-110" maxlength="3"><template #append>天</template></el-input>
          </el-form-item>
          <el-form-item label="每月对账日" label-width="110px" prop="billDay">
            <el-input v-model="form.billDay" class="w-110" maxlength="2"><template #append>日</template></el-input>
          </el-form-item>
        </div>
      </el-form-item>

      <el-form-item label="信用额度">
        <AmountInput v-model="form.creditLimit" class="w-200" :allow-negative="false" />
        <span class="unit">元</span>
        <span class="field-hint">留空表示不设额度，填 0 表示不允许欠款</span>
      </el-form-item>

      <el-form-item label="适用范围">
        <el-radio-group v-model="form.scope">
          <el-radio value="group">集团通用</el-radio>
          <el-radio value="org">指定组织</el-radio>
        </el-radio-group>
        <div v-if="form.scope === 'org'" class="branch">
          <el-form-item prop="orgIds" label-width="0">
            <div class="tags">
              <el-tag v-for="id in form.orgIds" :key="id" type="info" closable @close="form.orgIds = form.orgIds.filter((x) => x !== id)">
                {{ orgName(id) }}
              </el-tag>
              <el-button size="small" @click="pickerOpen = true">{{ form.orgIds.length ? '修改组织' : '选择组织' }}</el-button>
              <RuleMark rule="picker" />
            </div>
          </el-form-item>
        </div>
      </el-form-item>

      <el-form-item label="备注">
        <el-input v-model="form.remark" type="textarea" class="w-400" :rows="2" maxlength="200" show-word-limit />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button :disabled="saving" @click="requestClose">取消</el-button>
      <el-button v-if="!isEdit" :disabled="saving" @click="save(true)">保存并继续新增</el-button>
      <el-button type="primary" :loading="saving" @click="save(false)">保存</el-button>
    </template>
  </el-dialog>

  <OrgPicker v-model="pickerOpen" :selected="form.orgIds" @confirm="onPicked" />
</template>
