<script setup lang="ts">
// 明细条：一张表的名称和行数、已选数、动作、全屏，左边可整块收起。单据明细和树右边的表都用它。
import { CaretBottom, FullScreen } from '@element-plus/icons-vue'

defineProps<{
  title: string
  count: number
  selected?: number
  /** 动作不能用的原因，写在动作左边 */
  reason?: string
}>()
const open = defineModel<boolean>('open', { default: true })
const full = defineModel<boolean>('full', { default: false })
</script>

<template>
  <div class="app-detail-bar">
    <button type="button" class="app-detail-caret" :aria-label="open ? `收起${title}` : `展开${title}`" :aria-expanded="open" @click="open = !open">
      <el-icon :class="{ 'is-closed': !open }"><CaretBottom /></el-icon>
    </button>
    <span class="app-detail-name">{{ title }} ({{ count }})</span>
    <span v-if="selected !== undefined">已选 {{ selected }} 条</span>
    <span class="app-detail-gap" />
    <span v-if="reason" class="app-detail-reason">{{ reason }}</span>
    <slot />
    <el-button class="app-icon-btn" :class="{ 'is-on': full }" :icon="FullScreen" :aria-label="full ? '退出全屏' : `全屏看${title}`" :title="full ? '退出全屏' : '全屏'" @click="full = !full" />
  </div>
</template>

<style>
.app-detail-bar {
  flex: none;
  height: var(--app-toolbar-height);
  display: flex;
  align-items: center;
  gap: var(--app-space-2);
  padding: 0 20px 0 12px;
}
.app-detail-bar .el-button + .el-button {
  margin-left: 0;
}
.app-detail-caret {
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  border-radius: 2px;
  background: var(--app-caret-bg);
  font-size: 12px;
  line-height: 1;
  color: var(--app-caret-fg);
  cursor: pointer;
}
.app-detail-caret .is-closed {
  transform: rotate(-90deg);
}
.app-detail-name {
  margin: 0 28px 0 10px;
  color: var(--app-caret-fg);
}
.app-detail-gap {
  flex: 1;
}
.app-detail-reason {
  color: var(--el-text-color-secondary);
}
.app-detail-bar .app-icon-btn.is-on {
  color: var(--el-color-primary);
}
</style>
