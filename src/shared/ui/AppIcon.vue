<script setup lang="ts">
// 应用图标：圆角底色加 Element Plus 图标。
import type { Component } from 'vue'

export type AppTone = 'blue' | 'teal' | 'orange' | 'red' | 'violet' | 'slate'

withDefaults(defineProps<{ icon: Component; tone?: AppTone; size?: number }>(), { tone: 'blue', size: 22 })
</script>

<template>
  <span class="app-app-icon" :class="`is-${tone}`" :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.6)}px` }">
    <el-icon><component :is="icon" /></el-icon>
  </span>
</template>

<style>
.app-app-icon {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: var(--app-bg-container);
}
.app-app-icon.is-blue {
  background: var(--app-tone-blue);
}
.app-app-icon.is-teal {
  background: var(--app-tone-teal);
}
.app-app-icon.is-orange {
  background: var(--app-tone-orange);
}
.app-app-icon.is-red {
  background: var(--app-tone-red);
}
.app-app-icon.is-violet {
  background: var(--app-tone-violet);
}
.app-app-icon.is-slate {
  background: var(--app-tone-slate);
}
</style>
