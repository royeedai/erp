<script lang="ts">
export interface StatusTab {
  key: string
  label: string
  /** 当前查询条件下的条数；不知道就不传 */
  count?: number
}
</script>

<script setup lang="ts">
// 状态页签：在表格上方，带条数，“全部”排最后；点了立即查。右侧插槽放主表、主子表切换。
defineProps<{ tabs: StatusTab[] }>()
const model = defineModel<string>({ required: true })
</script>

<template>
  <div class="app-status-tabs" role="tablist" aria-label="按状态查看">
    <button
      v-for="t in tabs"
      :key="t.key"
      type="button"
      role="tab"
      :class="{ 'is-on': model === t.key }"
      :aria-selected="model === t.key"
      @click="model = t.key"
    >
      {{ t.label }}<template v-if="t.count !== undefined"> ({{ t.count }})</template>
    </button>
    <span class="app-status-tabs-gap" />
    <slot />
  </div>
</template>

<style>
.app-status-tabs {
  flex: none;
  height: var(--app-status-tabs-height);
  display: flex;
  align-items: center;
  gap: var(--app-space-6);
  padding: 0 20px 0 18px;
}
.app-status-tabs-gap {
  flex: 1;
}
.app-status-tabs > button {
  position: relative;
  height: 100%;
  padding: 4px 0 0;
  border: none;
  background: none;
  font-size: 12px;
  color: var(--el-color-info);
  cursor: pointer;
  white-space: nowrap;
}
.app-status-tabs > button:hover {
  color: var(--el-text-color-primary);
}
.app-status-tabs > button.is-on {
  font-weight: var(--app-font-bold);
  color: var(--el-text-color-primary);
}
.app-status-tabs > button.is-on::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 24px;
  height: 2px;
  margin-left: -12px;
  background: var(--app-check);
}
.app-status-tabs > button:focus-visible {
  outline: 1px solid var(--app-focus);
}
</style>
