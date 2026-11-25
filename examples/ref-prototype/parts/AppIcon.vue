<script setup lang="ts">
// 应用图标：自己的几何图形加 Element Plus 图标，没有用参照站的。
import type { Component } from 'vue'

withDefaults(defineProps<{ icon: Component; tone?: 'blue' | 'teal' | 'orange' | 'red' | 'violet' | 'slate'; size?: number }>(), { tone: 'blue', size: 22 })
</script>

<template>
  <span class="r-appicon" :class="`is-${tone}`" :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.6)}px` }">
    <el-icon><component :is="icon" /></el-icon>
  </span>
</template>

<style>
.r-appicon { flex: none; display: inline-flex; align-items: center; justify-content: center; border-radius: 4px; color: #FFFFFF; }
.r-appicon.is-blue { background: #3F7BE8; }
.r-appicon.is-teal { background: #16B8AE; }
.r-appicon.is-orange { background: #F29A2E; }
.r-appicon.is-red { background: #EC5A5A; }
.r-appicon.is-violet { background: #7E63D9; }
.r-appicon.is-slate { background: #55748F; }
</style>
