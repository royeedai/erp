<script setup lang="ts">
import { reactive, ref, useTemplateRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { ApiError } from '@/api/http'
import { useSessionStore } from '../session.store'

const session = useSessionStore()
const route = useRoute()
const router = useRouter()
const formRef = useTemplateRef<FormInstance>('formRef')
const form = reactive({ username: '', password: '' })
const loading = ref(false)
const error = ref('')
const isMock = import.meta.env.VITE_MOCK === '1'

const rules: FormRules = {
  username: [{ required: true, message: '请输入账号' }],
  password: [{ required: true, message: '请输入密码' }],
}

async function submit() {
  if (loading.value) return
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  loading.value = true
  error.value = ''
  try {
    await session.login({ ...form })
    const redirect = route.query.redirect
    // 只接受站内地址，避免被拼接成外站跳转
    const target = typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/home'
    await router.replace(target)
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login">
    <el-form ref="formRef" class="login-card" :model="form" :rules="rules" label-position="top" @submit.prevent="submit">
      <h1>ERP 前端基座</h1>
      <el-form-item label="账号" prop="username">
        <el-input v-model="form.username" name="username" autocomplete="username" />
      </el-form-item>
      <el-form-item label="密码" prop="password">
        <el-input v-model="form.password" name="password" type="password" show-password autocomplete="current-password" />
      </el-form-item>
      <el-alert v-if="error" class="login-error" type="error" :title="error" :closable="false" />
      <el-button class="login-submit" type="primary" native-type="submit" :loading="loading">登录</el-button>
      <p v-if="isMock" class="login-note">当前是模拟接口，账号见 src/mocks/users.json</p>
    </el-form>
  </div>
</template>

<style>
.login {
  height: 100%;
  display: grid;
  place-items: center;
}
.login-card {
  width: 360px;
  padding: var(--app-space-6);
  background: var(--app-bg-container);
  border: 1px solid var(--app-divider);
  border-radius: var(--app-radius-card);
  --el-component-size: 32px;
}
.login-card h1 {
  margin: 0 0 var(--app-space-4);
  font-size: var(--app-font-page);
  line-height: 24px;
}
.login-card .el-input__wrapper {
  height: 32px;
  box-sizing: border-box;
}
.login-card .el-button {
  height: 32px;
}
.login-error {
  margin-bottom: var(--app-space-3);
}
.login-submit {
  width: 100%;
}
.login-note {
  margin: var(--app-space-3) 0 0;
  font-size: var(--app-font-sm);
  line-height: 18px;
  color: var(--el-text-color-secondary);
}
</style>
