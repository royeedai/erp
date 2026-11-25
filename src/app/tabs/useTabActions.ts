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

  /** 先离开再移除：离开被拦下时页签保留 */
  async function close(key: string) {
    const tab = tabs.find(key)
    if (!tab || !tab.closable) return
    if (tab.dirty) {
      const ok = await confirm({
        title: '关闭页签',
        message: `“${tab.title}”有未保存的内容，关闭后会丢失。`,
        confirmText: '仍然关闭',
        danger: true,
      })
      if (!ok) return
    }
    const next = tabs.neighborOf(key)
    if (next) await router.push(next.fullPath)
    tabs.remove(key)
  }

  return { activate, close }
}
