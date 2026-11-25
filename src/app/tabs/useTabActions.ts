import { useRouter } from 'vue-router'
import { confirm } from '@/shared/ui/feedback'
import { useTabsStore } from './tabs.store'

export function useTabActions() {
  const router = useRouter()
  const tabs = useTabsStore()

  function activate(key: string) {
    const tab = tabs.find(key)
    if (tab && key !== tabs.activeKey) return router.push(tab.fullPath)
  }

  /** 先离开再移除：离开被拦下时页签保留。返回是否关掉了 */
  async function close(key: string): Promise<boolean> {
    const tab = tabs.find(key)
    if (!tab || !tab.closable) return false
    if (tab.dirty) {
      const ok = await confirm({
        title: '关闭页签',
        message: `“${tab.title}”有未保存的内容，关闭后会丢失。`,
        confirmText: '仍然关闭',
        cancelText: '不关闭',
        danger: true,
      })
      if (!ok) return false
    }
    const next = tabs.neighborOf(key)
    if (next) await router.push(next.fullPath)
    tabs.remove(key)
    return true
  }

  /** 逐个关；未保存的逐个确认，选了不关就保留 */
  async function closeMany(keys: string[]) {
    for (const key of [...keys]) await close(key)
  }

  return { activate, close, closeMany }
}
