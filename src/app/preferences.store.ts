import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { DENSITIES, type Density } from '@/shared/ui/columns'

// 界面偏好，按浏览器记。后端有用户偏好接口后改成按用户记，只改这里。
const KEY = 'erp.density'

function read(): Density {
  const saved = Number(localStorage.getItem(KEY))
  return DENSITIES.find((d) => d === saved) ?? 36
}

export const usePreferencesStore = defineStore('preferences', () => {
  const density = ref<Density>(read())
  watch(density, (v) => localStorage.setItem(KEY, String(v)))
  return { density }
})
