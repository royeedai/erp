<script setup lang="ts">
// 标题行：图标、标题，后面跟组织和“显示停用”（after 插槽）；动作整组在右（默认插槽）。
import type { Component } from 'vue'
import AppIcon, { type AppTone } from './AppIcon.vue'

defineProps<{ title: string; icon?: Component; tone?: AppTone }>()
</script>

<template>
  <div class="app-page-header">
    <AppIcon v-if="icon" :icon="icon" :tone="tone" />
    <h1>{{ title }}</h1>
    <slot name="after" />
    <span class="app-page-header-gap" />
    <div class="app-page-header-acts"><slot /></div>
  </div>
</template>

<style>
.app-page-header {
  box-sizing: border-box;
  height: var(--app-title-height);
  flex: none;
  display: flex;
  align-items: center;
  padding: 0 20px;
  background: var(--app-bg-container);
  border-bottom: 1px solid var(--app-divider);
}
.app-page-header h1 {
  margin: 0 var(--app-space-6) 0 11px;
  font-size: var(--app-font-page);
  line-height: 24px;
  font-weight: var(--app-font-bold);
  white-space: nowrap;
}
.app-page-header-gap {
  flex: 1;
}
.app-page-header-acts {
  display: flex;
  align-items: center;
  gap: var(--app-space-2);
}
.app-page-header-acts .el-button + .el-button {
  margin-left: 0;
}
</style>
