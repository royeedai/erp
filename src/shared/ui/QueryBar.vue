<script setup lang="ts">
// 查询条：Enter 或点“查询”才执行；条件放默认插槽。
defineProps<{ loading?: boolean }>()
const emit = defineEmits<{ search: []; reset: [] }>()
</script>

<template>
  <el-form class="app-query-bar" inline @submit.prevent="emit('search')" @keydown.enter.prevent="emit('search')">
    <slot />
    <el-form-item>
      <el-button type="primary" native-type="button" :loading="loading" @click="emit('search')">查询</el-button>
      <el-button native-type="button" @click="emit('reset')">重置</el-button>
    </el-form-item>
    <div class="app-query-extra"><slot name="extra" /></div>
  </el-form>
</template>

<style>
.app-query-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
}
.app-query-bar .el-form-item {
  margin: 0 var(--app-space-4) var(--app-space-3) 0;
}
.app-query-extra {
  margin-left: auto;
}
</style>
