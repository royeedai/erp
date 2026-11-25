<script setup lang="ts">
// 页签内容区：RouterView + KeepAlive，缓存名单就是当前打开的页签。
import { h, watch, type Component, type VNode } from 'vue'
import { RouterView, useRoute, type RouteLocationNormalizedLoaded } from 'vue-router'
import { createTabHost, type TabHost } from './tabHost'
import { tabKeyOf, useTabsStore } from './tabs.store'

const tabs = useTabsStore()
const route = useRoute()
const hosts = new Map<string, TabHost>()

// 页签关闭后丢掉外壳，否则外壳闭包会留住页面组件
watch(
  () => tabs.keys,
  (keys) => {
    for (const key of hosts.keys()) if (!keys.includes(key)) hosts.delete(key)
  },
  { flush: 'post' },
)

// 只把路由变化同步给当前页签
watch(
  () => route.fullPath,
  () => hosts.get(tabKeyOf(route))?.syncRoute({ ...route }),
)

function render(current: RouteLocationNormalizedLoaded, vnode: VNode | undefined) {
  if (!vnode) return null
  const key = tabKeyOf(current)
  if (!tabs.find(key)) return null
  let host = hosts.get(key)
  if (!host) {
    host = createTabHost(key, vnode.type as Component, current)
    hosts.set(key, host)
  }
  return h(host.component, { key })
}
</script>

<template>
  <RouterView v-slot="{ Component: page, route: current }">
    <KeepAlive :include="tabs.keys">
      <component :is="render(current, page)" />
    </KeepAlive>
  </RouterView>
</template>

<style>
.app-tab-page {
  height: 100%;
  overflow: auto;
}
</style>
