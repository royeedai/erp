<script setup lang="ts">
// 标题行：图标、标题，后面跟组织和“显示停用”；动作整组在右。
import type { Component } from 'vue'
import AppIcon from './AppIcon.vue'

defineProps<{ title: string; icon: Component; tone?: 'blue' | 'teal' | 'orange' | 'red' | 'violet' | 'slate' }>()
</script>

<template>
  <div class="r-title">
    <AppIcon :icon="icon" :tone="tone ?? 'blue'" />
    <h1>{{ title }}</h1>
    <slot name="after" />
    <span class="r-title-gap" />
    <div class="r-title-acts"><slot /></div>
  </div>
</template>

<style>
.r-title { flex: none; box-sizing: border-box; height: 42px; display: flex; align-items: center; padding: 0 20px; background: #FFFFFF; border-bottom: 1px solid var(--r-line-2); }
.r-title h1 { margin: 0 0 0 11px; font-size: 18px; line-height: 24px; font-weight: 700; color: #1C1C26; white-space: nowrap; }
.r-title-gap { flex: 1; }
.r-title-acts { display: flex; align-items: center; gap: 8px; }
.r-title-acts .el-button + .el-button { margin-left: 0; }
</style>
