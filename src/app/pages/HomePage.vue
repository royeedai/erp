<script setup lang="ts">
import { useSessionStore } from '../session.store'

const session = useSessionStore()
</script>

<template>
  <div class="app-page">
    <div class="app-panel">
      <h1 class="app-page-title">{{ session.me?.name }}，你好</h1>
      <p class="home-note">待办中心在阶段 2 实现。现在可以从左侧菜单进入“项目岗位”。</p>
    </div>
  </div>
</template>

<style>
.home-note {
  margin: var(--app-space-2) 0 0;
  color: var(--el-text-color-secondary);
}
</style>
