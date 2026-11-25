<script setup lang="ts">
// 外壳：顶栏（全部应用、面包屑、应用搜索、日期、用户）+ 页签条 + 页面。
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Calendar, Menu, UserFilled } from '@element-plus/icons-vue'
import { queryClient } from '../query'
import { useSessionStore } from '../session.store'
import TabBar from '../tabs/TabBar.vue'
import TabPages from '../tabs/TabPages.vue'
import { useTabsStore } from '../tabs/tabs.store'
import { confirm } from '@/shared/ui/feedback'
import AppNav from './AppNav.vue'
import AppSearch from './AppSearch.vue'

const session = useSessionStore()
const tabs = useTabsStore()
const route = useRoute()
const router = useRouter()

const navOpen = ref(false)
const headHidden = ref(false)
// 从搜索、页签、浏览器前进后退离开时，导航跟着收起
watch(() => route.path, () => (navOpen.value = false))

const isHome = computed(() => route.name === 'home')
const crumbs = computed(() => [...(route.meta.nav ?? []), ...(route.meta.title ? [route.meta.title] : [])])

const now = new Date()
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

/** 未登记为页签的路由（403、404）不走 KeepAlive */
const isTabRoute = computed(() => route.meta.tab === true)

async function onLogout() {
  const dirty = tabs.tabs.filter((t) => t.dirty)
  if (dirty.length > 0) {
    const ok = await confirm({
      title: '退出登录',
      message: `${dirty.map((t) => `“${t.title}”`).join('、')}有未保存的内容，退出后会丢失。`,
      confirmText: '仍然退出',
      danger: true,
    })
    if (!ok) return
  }
  await session.logout()
  tabs.reset()
  queryClient.clear()
  await router.replace({ name: 'login' })
}

function onBeforeUnload(e: BeforeUnloadEvent) {
  if (tabs.tabs.some((t) => t.dirty)) e.preventDefault()
}
onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))
</script>

<template>
  <div class="app-shell">
    <header v-show="!headHidden" class="app-header" :class="{ 'is-dim': navOpen }">
      <button
        type="button"
        class="app-nav-toggle"
        aria-label="全部应用"
        title="全部应用"
        aria-haspopup="dialog"
        :aria-expanded="navOpen"
        @click="navOpen = !navOpen"
      >
        <el-icon><Menu /></el-icon>
      </button>
      <span v-if="isHome" class="app-brand">ERP 前端基座</span>
      <el-breadcrumb v-else class="app-crumbs" separator="/">
        <el-breadcrumb-item to="/home">首页</el-breadcrumb-item>
        <el-breadcrumb-item v-for="(c, i) in crumbs" :key="i">{{ c }}</el-breadcrumb-item>
      </el-breadcrumb>
      <span class="app-header-gap" />
      <AppSearch />
      <span class="app-date"><el-icon :size="17"><Calendar /></el-icon>{{ today }}</span>
      <el-dropdown trigger="click">
        <button type="button" class="app-user" :aria-label="session.me?.name" :title="session.me?.name">
          <el-icon :size="18"><UserFilled /></el-icon>
        </button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item disabled>{{ session.me?.name }}</el-dropdown-item>
            <el-dropdown-item divided @click="onLogout">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </header>
    <TabBar v-model:head-hidden="headHidden" />
    <main class="app-content">
      <div v-show="isTabRoute" class="app-content-tabs"><TabPages /></div>
      <RouterView v-if="!isTabRoute" />
    </main>
    <AppNav v-model="navOpen" />
  </div>
</template>

<style>
.app-shell {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.app-header {
  position: relative;
  box-sizing: border-box;
  height: var(--app-header-height);
  flex: none;
  display: flex;
  align-items: center;
  padding-right: 28px;
  background: var(--app-bg-container);
  border-bottom: 1px solid var(--app-divider);
}
.app-header.is-dim::after {
  content: '';
  position: absolute;
  inset: 0 0 0 42px;
  background: var(--app-mask);
  pointer-events: none;
}
.app-header-gap {
  flex: 1;
}
.app-nav-toggle {
  width: 42px;
  height: 39px;
  padding: 0;
  border: none;
  background: none;
  font-size: 21px;
  line-height: 1;
  color: var(--el-color-primary);
  cursor: pointer;
}
.app-nav-toggle .el-icon {
  vertical-align: middle;
}
.app-nav-toggle:focus-visible,
.app-user:focus-visible {
  outline: 2px solid var(--app-focus);
  outline-offset: -2px;
}
.app-brand {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 17px;
  font-weight: var(--app-font-bold);
  letter-spacing: 1px;
  color: var(--el-color-primary);
}
.app-crumbs {
  margin-left: var(--app-space-4);
  font-size: var(--app-font-base);
}
.app-crumbs .el-breadcrumb__inner,
.app-crumbs .el-breadcrumb__inner.is-link {
  font-weight: 400;
  color: var(--el-text-color-secondary);
}
.app-crumbs .el-breadcrumb__inner.is-link:hover {
  color: var(--el-color-primary);
}
.app-crumbs .el-breadcrumb__separator {
  font-weight: 400;
  color: var(--el-border-color-hover);
}
.app-date {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin: 0 var(--app-space-4) 0 20px;
  color: var(--el-text-color-regular);
}
.app-user {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--app-avatar-bg);
  color: var(--app-avatar-fg);
  cursor: pointer;
}
.app-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.app-content-tabs {
  height: 100%;
}
</style>
