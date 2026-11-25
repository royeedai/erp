// 表格显示哪些列、按什么顺序：默认全部（hidden 的除外），用户改过的按用户的。
import { computed, inject, ref } from 'vue'
import { columnPrefsKey } from './columns'

interface Column {
  key: string
  hidden?: boolean
}

export function useShownColumns<C extends Column>(columns: () => C[], table: () => string | undefined) {
  const prefs = inject(columnPrefsKey, null)
  const local = ref<string[]>()
  const defaults = computed(() => columns().filter((c) => !c.hidden).map((c) => c.key))
  const shownKeys = computed(() => {
    const name = table()
    const saved = (name ? prefs?.get(name) : undefined) ?? local.value
    if (!saved) return defaults.value
    // 存的列可能已经下线
    const keys = saved.filter((k) => columns().some((c) => c.key === k))
    return keys.length > 0 ? keys : defaults.value
  })
  const shown = computed(() => shownKeys.value.flatMap((k) => columns().find((c) => c.key === k) ?? []))

  function save(keys: string[]) {
    const same = keys.join() === defaults.value.join()
    const name = table()
    if (name && prefs) prefs.set(name, same ? undefined : keys)
    else local.value = same ? undefined : keys
  }

  return { shown, shownKeys, defaults, save }
}
