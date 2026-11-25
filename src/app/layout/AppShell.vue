<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Briefcase, Expand, Fold, House } from '@element-plus/icons-vue'
import { queryClient } from '../query'
import { tabRoutes } from '../router'
import { useSessionStore } from '../session.store'
import TabBar from '../tabs/TabBar.vue'
import TabPages from '../tabs/TabPages.vue'
import { useTabsStore } from '../tabs/tabs.store'
import { confirm } from '@/shared/ui/feedback'

const session = useSessionStore()
const tabs = useTabsStore()
const route = useRoute()
const router = useRouter()
const collapsed = ref(false)

/** 菜单由路由表生成，没有权限的不出现 */
const menu = computed(() => {
  const groups = new Map<string, { path: string; title: string }[]>()
  for (const r of tabRoutes) {
    const group = r.meta?.menuGroup
    if (group === undefined) continue
    if (r.meta?.permission && !session.has(r.meta.permission)) continue
    const list = groups.get(group) ?? []
    list.push({ path: r.path, title: r.meta?.title ?? r.path })
    groups.set(group, list)
  }
  return [...groups]
})

/** 菜单图标：折叠后只剩图标，没有登记的用公文包 */
const groupIcons: Record<string, typeof House> = { '': House }
const iconOf = (group: string) => groupIcons[group] ?? Briefcase

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
    <div class="app-header">
      <div class="app-brand">
        <el-button text :aria-label="collapsed ? '展开菜单' : '收起菜单'" @click="collapsed = !collapsed">
          <el-icon><Expand v-if="collapsed" /><Fold v-else /></el-icon>
        </el-button>
        <span class="app-brand-name">ERP 前端基座</span>
      </div>
      <el-dropdown trigger="click">
        <el-button text>{{ session.me?.name }}</el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="onLogout">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
    <div class="app-body">
      <div class="app-aside" :class="{ 'is-collapsed': collapsed }">
        <el-menu :default-active="route.path" :collapse="collapsed" :collapse-transition="false" router>
          <template v-for="[group, items] in menu" :key="group">
            <template v-if="group === ''">
              <el-menu-item v-for="m in items" :key="m.path" :index="m.path">
                <el-icon><component :is="iconOf(group)" /></el-icon>
                <template #title>{{ m.title }}</template>
              </el-menu-item>
            </template>
            <el-sub-menu v-else :index="group">
              <template #title>
                <el-icon><component :is="iconOf(group)" /></el-icon>
                <span>{{ group }}</span>
              </template>
              <el-menu-item v-for="m in items" :key="m.path" :index="m.path">{{ m.title }}</el-menu-item>
            </el-sub-menu>
          </template>
        </el-menu>
      </div>
      <div class="app-main">
        <TabBar />
        <div class="app-content">
          <div v-show="isTabRoute" class="app-content-tabs"><TabPages /></div>
          <RouterView v-if="!isTabRoute" />
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.app-shell {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.app-header,
.app-aside {
  box-sizing: border-box;
}
.app-header {
  height: var(--app-header-height);
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--app-space-4) 0 var(--app-space-2);
  background: var(--app-bg-container);
  border-bottom: 1px solid var(--app-divider);
}
.app-brand {
  display: flex;
  align-items: center;
  gap: var(--app-space-2);
}
.app-brand-name {
  font-size: var(--app-font-section);
  font-weight: var(--app-font-bold);
}
.app-body {
  flex: 1;
  min-height: 0;
  display: flex;
}
.app-aside {
  width: var(--app-aside-width);
  flex: none;
  overflow: hidden auto;
  background: var(--app-bg-container);
  border-right: 1px solid var(--app-divider);
}
.app-aside.is-collapsed {
  width: var(--app-aside-collapsed);
}
.app-aside .el-menu {
  border-right: none;
  --el-menu-item-height: 40px;
  --el-menu-sub-item-height: 40px;
}
.app-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.app-main > .app-tab-bar {
  flex: none;
  padding: var(--app-space-2) var(--app-page-padding) 0;
  background: var(--app-bg-container);
}
.app-content-tabs {
  height: 100%;
}
.app-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
</style>
