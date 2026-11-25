<script setup lang="ts">
// 应用搜索：按应用名直达，也能按业务域、模块找。
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Search } from '@element-plus/icons-vue'
import { useApps, type AppEntry } from '../apps'

const router = useRouter()
const apps = useApps()
const keyword = ref('')
const count = ref(0)

const pathOf = (a: AppEntry) => [a.domain, a.module, a.group].join(' / ')

interface Hit {
  /** 选中后输入框里留的文字 */
  text: string
  /** 命中的关键字，用来标红 */
  query: string
  app?: AppEntry
}

/** 名称命中的排前面，其次是所在业务域、模块命中的 */
function suggest(input: string, show: (hits: Hit[]) => void) {
  const query = input.trim()
  if (query === '') return show([])
  const byName = apps.value.filter((a) => a.title.includes(query))
  const byPath = apps.value.filter((a) => !a.title.includes(query) && pathOf(a).includes(query))
  const hits = [...byName, ...byPath].slice(0, 20)
  count.value = hits.length
  show(hits.length > 0 ? hits.map((app) => ({ text: '', query, app })) : [{ text: input, query }])
}

/** 命中处前、中、后三段 */
function split(text: string, query: string) {
  const at = text.indexOf(query)
  return at < 0 ? [text, '', ''] : [text.slice(0, at), query, text.slice(at + query.length)]
}

function pick(hit: Record<string, unknown>) {
  const app = (hit as unknown as Hit).app
  if (app) void router.push(app.path)
}
</script>

<template>
  <el-autocomplete
    v-model="keyword"
    class="app-search"
    popper-class="app-search-popper"
    name="app-search"
    placeholder="请输入应用"
    aria-label="搜索应用"
    value-key="text"
    :debounce="0"
    :trigger-on-focus="false"
    :highlight-first-item="true"
    :fetch-suggestions="suggest"
    clearable
    @select="pick"
  >
    <template #prefix>
      <span class="app-search-kind">应用</span>
      <el-icon><Search /></el-icon>
    </template>
    <template #header>应用({{ count }})</template>
    <template #default="{ item }">
      <template v-if="item.app">
        <div>{{ split(item.app.title, item.query)[0] }}<b>{{ split(item.app.title, item.query)[1] }}</b>{{ split(item.app.title, item.query)[2] }}</div>
        <small>{{ pathOf(item.app) }}</small>
      </template>
      <span v-else class="app-search-none">没有叫“{{ item.query }}”的应用</span>
    </template>
  </el-autocomplete>
</template>

<style>
.app-search.el-autocomplete {
  width: 262px;
}
.app-search .el-input__wrapper {
  height: 28px;
  padding: 0 12px;
  border-radius: 14px;
}
.app-search-kind {
  margin-right: 7px;
  padding-right: 8px;
  border-right: 1px solid var(--app-divider);
  line-height: 16px;
  color: var(--el-text-color-secondary);
}
.app-search-popper .el-autocomplete-suggestion__header {
  margin: 4px 8px 0;
  padding: 0 6px;
  border: none;
  background: var(--app-bg-strip);
  line-height: 26px;
  font-weight: var(--app-font-bold);
}
.app-search-popper .el-autocomplete-suggestion li {
  padding: var(--app-space-1) var(--app-space-3);
  font-size: 12px;
  line-height: 20px;
}
.app-search-popper b {
  font-weight: 400;
  color: var(--el-color-primary);
}
.app-search-popper small {
  font-size: 12px;
  line-height: 18px;
  color: var(--el-text-color-secondary);
}
.app-search-none {
  color: var(--el-text-color-secondary);
}
</style>
