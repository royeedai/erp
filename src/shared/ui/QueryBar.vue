<script setup lang="ts">
// 单行工具条：状态页签、搜索、视图、主动作。回车或点图标才查，点页签立即查。
import { inject, ref } from 'vue'
import { Operation, Refresh, Search } from '@element-plus/icons-vue'
import { DENSITIES, DENSITY_TEXT, densityKey, type Density } from './columns'

export interface QueryTab {
  key: string
  label: string
  /** 当前查询条件下的条数；不知道就不传 */
  count?: number
}

defineProps<{ tabs: QueryTab[]; placeholder: string }>()
const tab = defineModel<string>('tab', { required: true })
const keyword = defineModel<string>('keyword', { required: true })
const emit = defineEmits<{ search: []; refresh: [] }>()

const density = inject(densityKey, ref<Density>(36))

function onEnter(e: Event | KeyboardEvent) {
  // 输入法选词时的回车不算
  if (!(e as KeyboardEvent).isComposing) emit('search')
}
function onView(command: 'refresh' | Density) {
  if (command === 'refresh') emit('refresh')
  else density.value = command
}
</script>

<template>
  <div class="app-query-bar">
    <div class="app-query-tabs" role="tablist" aria-label="按状态查看">
      <button
        v-for="t in tabs"
        :key="t.key"
        type="button"
        role="tab"
        :class="{ 'is-on': tab === t.key }"
        :aria-selected="tab === t.key"
        @click="tab = t.key"
      >
        {{ t.label }}<i v-if="t.count !== undefined">{{ t.count }}</i>
      </button>
    </div>
    <span class="app-query-gap" />
    <el-input
      v-model="keyword"
      class="app-query-search"
      name="keyword"
      clearable
      :placeholder="`${placeholder}，回车查询`"
      :aria-label="placeholder"
      @keydown.enter="onEnter"
      @clear="emit('search')"
    >
      <template #suffix>
        <button type="button" class="app-query-icon" aria-label="查询" @click="emit('search')">
          <el-icon><Search /></el-icon>
        </button>
      </template>
    </el-input>
    <el-dropdown trigger="click" @command="onView">
      <el-button :icon="Operation">视图</el-button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="refresh" :icon="Refresh">刷新</el-dropdown-item>
          <el-dropdown-item v-for="(d, i) in DENSITIES" :key="d" :command="d" :divided="i === 0">
            行高 {{ DENSITY_TEXT[d] }}{{ density === d ? ' ✓' : '' }}
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
    <slot name="primary" />
  </div>
</template>

<style>
.app-query-bar {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--app-space-2);
  padding-bottom: var(--app-space-3);
}
.app-query-gap {
  flex: 1;
}
.app-query-tabs {
  display: inline-flex;
  padding: 2px;
  border-radius: var(--app-radius-panel);
  background: var(--app-status-draft-bg);
}
.app-query-tabs button {
  padding: 0 var(--app-space-3);
  border: none;
  border-radius: var(--app-radius-control);
  background: none;
  font: inherit;
  line-height: 28px;
  color: var(--el-text-color-regular);
  cursor: pointer;
  white-space: nowrap;
}
.app-query-tabs button:hover {
  color: var(--el-color-primary);
}
.app-query-tabs button.is-on {
  color: var(--el-text-color-primary);
  font-weight: var(--app-font-bold);
  background: var(--app-bg-container);
  box-shadow: 0 0 0 1px var(--app-divider);
}
.app-query-tabs button:focus-visible,
.app-query-icon:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 1px;
}
.app-query-tabs i {
  margin-left: 6px;
  font-style: normal;
  font-size: var(--app-font-sm);
  font-weight: 400;
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-secondary);
}
.app-query-search {
  width: 240px;
}
.app-query-icon {
  display: inline-flex;
  padding: 2px;
  border: none;
  background: none;
  color: inherit;
  cursor: pointer;
}
</style>
