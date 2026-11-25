import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { DEFAULT_DENSITY, DENSITIES, type ColumnPrefs, type Density } from '@/shared/ui/columns'

// 界面偏好，按浏览器记。后端有用户偏好接口后改成按用户记，只改这里。
const DENSITY_KEY = 'erp.density'
const COLUMNS_KEY = 'erp.columns'
const SCHEMES_KEY = 'erp.schemes'
const APPS_KEY = 'erp.apps'
/** 最近访问留几个 */
const RECENT_MAX = 8

/** 用户自己存的查询方案：条件只放非敏感的 */
export interface SavedScheme {
  key: string
  label: string
  values: Record<string, unknown>
}

function readJson<T>(key: string): Record<string, T> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? '{}')
    return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, T>) : {}
  } catch {
    return {}
  }
}
function readDensity(): Density {
  const saved = Number(localStorage.getItem(DENSITY_KEY))
  return DENSITIES.find((d) => d === saved) ?? DEFAULT_DENSITY
}

export const usePreferencesStore = defineStore('preferences', () => {
  const density = ref<Density>(readDensity())
  watch(density, (v) => localStorage.setItem(DENSITY_KEY, String(v)))

  const columns = ref(readJson<string[]>(COLUMNS_KEY))
  watch(columns, (v) => localStorage.setItem(COLUMNS_KEY, JSON.stringify(v)))
  const columnPrefs: ColumnPrefs = {
    get: (table) => columns.value[table],
    set(table, keys) {
      const next = { ...columns.value }
      if (keys) next[table] = keys
      else delete next[table]
      columns.value = next
    },
  }

  const schemes = ref(readJson<SavedScheme[]>(SCHEMES_KEY))
  watch(schemes, (v) => localStorage.setItem(SCHEMES_KEY, JSON.stringify(v)))
  function schemesOf(page: string): SavedScheme[] {
    return schemes.value[page] ?? []
  }
  function saveScheme(page: string, label: string, values: Record<string, unknown>): string {
    const key = `own-${Date.now().toString(36)}`
    schemes.value = { ...schemes.value, [page]: [...schemesOf(page), { key, label, values }] }
    return key
  }
  function removeScheme(page: string, key: string) {
    schemes.value = { ...schemes.value, [page]: schemesOf(page).filter((s) => s.key !== key) }
  }

  // 常用应用：没挑过就是空的，由首页给默认
  const apps = ref(readJson<string[]>(APPS_KEY))
  watch(apps, (v) => localStorage.setItem(APPS_KEY, JSON.stringify(v)))
  function setFavorites(paths: string[]) {
    apps.value = { ...apps.value, favorites: paths }
  }
  function visit(path: string) {
    const recent = [path, ...(apps.value.recent ?? []).filter((p) => p !== path)].slice(0, RECENT_MAX)
    apps.value = { ...apps.value, recent }
  }

  return { density, columns, columnPrefs, schemes, schemesOf, saveScheme, removeScheme, apps, setFavorites, visit }
})
