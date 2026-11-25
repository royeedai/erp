// 应用目录：由路由表生成，没有权限的不出现。全部应用、应用搜索、首页都从这里取。
import { computed, type Component } from 'vue'
import { Document } from '@element-plus/icons-vue'
import type { AppTone } from '@/shared/ui/AppIcon.vue'
import { tabRoutes } from './router'
import { useSessionStore } from './session.store'

export interface AppEntry {
  path: string
  title: string
  icon: Component
  tone: AppTone
  /** 业务域 */
  domain: string
  /** 模块 */
  module: string
  /** 模块下的分组 */
  group: string
}

export function useApps() {
  const session = useSessionStore()
  return computed<AppEntry[]>(() =>
    tabRoutes.flatMap((r) => {
      if (!r.meta?.nav) return []
      if (r.meta.permission && !session.has(r.meta.permission)) return []
      const [domain, module, group] = r.meta.nav
      const { title = r.path, icon = Document, tone = 'blue' } = r.meta
      return [{ path: r.path, title, icon, tone, domain, module, group }]
    }),
  )
}

export function groupBy<T>(list: T[], keyOf: (item: T) => string): [key: string, items: T[]][] {
  const groups = new Map<string, T[]>()
  for (const item of list) {
    const key = keyOf(item)
    const items = groups.get(key)
    if (items) items.push(item)
    else groups.set(key, [item])
  }
  return [...groups]
}
