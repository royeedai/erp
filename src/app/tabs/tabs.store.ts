import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { RouteLocationNormalizedLoaded } from 'vue-router'

export const MAX_TABS = 8

export interface AppTab {
  /** 页签唯一键，同时是 KeepAlive 的缓存名 */
  key: string
  title: string
  /** 最近一次的完整地址，切回时还原查询条件 */
  fullPath: string
  closable: boolean
  dirty: boolean
}

/** 同一页面开两张单据要占两个页签，所以按 path（含参数）区分，不按路由名 */
export function tabKeyOf(route: Pick<RouteLocationNormalizedLoaded, 'path'>): string {
  return route.path
}

export const useTabsStore = defineStore('tabs', () => {
  const tabs = ref<AppTab[]>([])
  const activeKey = ref('')
  const keys = computed(() => tabs.value.map((t) => t.key))
  const isFull = computed(() => tabs.value.length >= MAX_TABS)

  function find(key: string) {
    return tabs.value.find((t) => t.key === key)
  }

  function canOpen(key: string): boolean {
    return !!find(key) || !isFull.value
  }

  /** 固定页签（如首页）始终排在最前，且不受“从哪个地址进来”影响 */
  function pin(path: string, title: string) {
    if (find(path)) return
    const at = tabs.value.filter((t) => !t.closable).length
    tabs.value.splice(at, 0, { key: path, title, fullPath: path, closable: false, dirty: false })
  }

  /** 登记并激活；已存在则只更新地址。返回 false 表示已达上限 */
  function open(route: RouteLocationNormalizedLoaded): boolean {
    const key = tabKeyOf(route)
    const existing = find(key)
    if (existing) {
      existing.fullPath = route.fullPath
    } else {
      if (isFull.value) return false
      tabs.value.push({
        key,
        title: typeof route.meta.title === 'string' ? route.meta.title : key,
        fullPath: route.fullPath,
        closable: route.meta.affix !== true,
        dirty: false,
      })
    }
    activeKey.value = key
    return true
  }

  /** 关闭 key 之后应该激活谁；关的不是当前页时返回 null */
  function neighborOf(key: string): AppTab | null {
    if (activeKey.value !== key) return null
    const index = tabs.value.findIndex((t) => t.key === key)
    return tabs.value[index + 1] ?? tabs.value[index - 1] ?? null
  }

  function remove(key: string) {
    const index = tabs.value.findIndex((t) => t.key === key)
    if (index !== -1) tabs.value.splice(index, 1)
  }

  function setDirty(key: string, dirty: boolean) {
    const tab = find(key)
    if (tab) tab.dirty = dirty
  }

  function setTitle(key: string, title: string) {
    const tab = find(key)
    if (tab) tab.title = title
  }

  function reset() {
    tabs.value = []
    activeKey.value = ''
  }

  return { tabs, activeKey, keys, isFull, find, canOpen, pin, open, neighborOf, remove, setDirty, setTitle, reset }
})
