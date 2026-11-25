import { useRouter } from 'vue-router'
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
    const next = tabs.neighborOf(key)
    if (next) await router.push(next.fullPath)
    tabs.remove(key)
  }

  return { activate, close }
}
