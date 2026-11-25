import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getMe, login as loginApi, logout as logoutApi } from '@/api/generated/auth/auth'
import type { LoginBody, Me } from '@/api/generated/model'
import type { PermissionCode } from './permissions'

// 令牌放 sessionStorage：刷新还在、关窗即失效。后端若改用 HttpOnly Cookie，只改这里。
const TOKEN_KEY = 'erp.token'

export const useSessionStore = defineStore('session', () => {
  const token = ref<string | null>(sessionStorage.getItem(TOKEN_KEY))
  const me = ref<Me | null>(null)
  const permissions = computed(() => new Set(me.value?.permissions))
  const isLoggedIn = computed(() => token.value !== null)

  function setToken(value: string | null) {
    token.value = value
    if (value === null) sessionStorage.removeItem(TOKEN_KEY)
    else sessionStorage.setItem(TOKEN_KEY, value)
  }

  async function login(body: LoginBody) {
    const result = await loginApi(body)
    setToken(result.token)
    me.value = result.me
  }

  /** 刷新页面后用令牌换回用户信息 */
  async function restore() {
    if (token.value && !me.value) me.value = await getMe()
  }

  function clear() {
    setToken(null)
    me.value = null
  }

  async function logout() {
    try {
      await logoutApi()
    } finally {
      clear()
    }
  }

  function has(code: PermissionCode) {
    return permissions.value.has(code)
  }

  return { token, me, isLoggedIn, login, restore, logout, clear, has }
})
